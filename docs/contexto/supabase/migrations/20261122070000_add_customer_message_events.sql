-- F-05: mensagem da equipe ao cliente na linha do tempo do pedido.
--
-- Estado anterior (auditado em docs/audits/planejado-x-implementado-20261120, PF-05):
-- o tipo 'message' existe no check de site_private.quote_request_events desde
-- 20260909180000, mas nenhum produtor o usava. O operador respondia um ajuste em
-- public.reply_site_quote_adjustment (F-03) e o texto ia APENAS para
-- site_private.commercial_audit_log — trilha interna. O cliente continuava sem ver
-- a resposta: public.get_my_quote_request filtra audience = 'customer' e nenhuma
-- linha com essa audiencia era criada.
--
-- O outro lado do PF-05 (evento de "proposta publicada") ja estava coberto e NAO
-- muda aqui: o trigger quote_requests_record_customer_event publica
-- 'Proposta disponível' ao mover o pedido para 'quoted', e o evento interno
-- 'proposal_published' guarda a versao na trilha do back-office sem duplicar o
-- anuncio nem copiar o titulo livre da proposta (LGPD, F-31).
--
-- A mensagem ao cliente introduz TEXTO LIVRE na linha do tempo. erase_customer_data
-- (F-31/F-30) anonimizava quote_requests, quote_items, contact_requests,
-- customer_profiles e quote_adjustment_requests, mas nao quote_request_events —
-- o texto da resposta sobreviveria ao pedido de exclusao. Esta migration fecha
-- esse vazamento junto com a abertura do canal.
--
-- ADITIVA, exclusiva do Supabase isolado do site xlzmclcjdncjfdrjxclt.

-- === 1. Resposta ao ajuste vira mensagem visivel ao cliente =====================

create or replace function public.reply_site_quote_adjustment(
  p_adjustment_id uuid,
  p_response text,
  p_status text default 'resolved'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_response text := nullif(btrim(coalesce(p_response, '')), '');
  v_status text := nullif(btrim(coalesce(p_status, 'resolved')), '');
  v_adjustment site_private.quote_adjustment_requests%rowtype;
begin
  if p_adjustment_id is null then
    raise exception using errcode = '22023', message = 'adjustment_id_required';
  end if;
  if v_response is null then
    raise exception using errcode = '22023', message = 'response_required';
  end if;
  -- A linha do tempo aceita ate 500 caracteres (check de
  -- site_private.quote_request_events). Recusar aqui e o que impede o cliente de
  -- receber a resposta pela metade sem ninguem saber: um corte silencioso em
  -- left() escondia a condicao comercial no fim do texto. O formulario do
  -- back-office usa o mesmo limite.
  if length(v_response) > 500 then
    raise exception using errcode = '22023', message = 'response_too_long';
  end if;
  -- Espelha o check da tabela (20260910130000): new/triaged/resolved/closed.
  if v_status not in ('triaged', 'resolved', 'closed') then
    raise exception using errcode = '22023', message = 'invalid_adjustment_status';
  end if;

  select * into v_adjustment
  from site_private.quote_adjustment_requests adjustment
  where adjustment.id = p_adjustment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'adjustment_not_found';
  end if;

  -- A resposta do operador é registrada como trilha: a tabela de ajustes guarda só o
  -- pedido do cliente e o estado do atendimento, não o texto da resposta.
  update site_private.quote_adjustment_requests adjustment
  set status = v_status
  where adjustment.id = p_adjustment_id;

  -- F-05: o mesmo texto vira mensagem na linha do tempo do cliente. O título é fixo
  -- (não copia o nome do titular nem o texto do ajuste). O texto entra integral: a
  -- validação acima já garante o limite da coluna, então cliente e trilha interna
  -- recebem exatamente a mesma resposta.
  insert into site_private.quote_request_events (quote_request_id, event_type, title, description, audience)
  values (
    v_adjustment.quote_request_id, 'message',
    'Resposta da equipe ao seu ajuste', v_response, 'customer'
  );

  insert into site_private.commercial_audit_log (actor_user_id, actor_label, action, quote_request_id, detail)
  values (auth.uid(), v_operator.display_name, 'adjustment_replied', v_adjustment.quote_request_id,
    jsonb_build_object('adjustmentId', p_adjustment_id, 'status', v_status, 'response', v_response));

  return jsonb_build_object('id', p_adjustment_id, 'status', v_status);
end;
$$

comment on function public.reply_site_quote_adjustment(uuid, text, text) is
  'Responde a um ajuste pedido pelo cliente (F-03, F-05): move o estado, grava o texto integral na trilha interna e publica a mesma resposta integral como mensagem (event_type message, audience customer) na linha do tempo do cliente. Recusa resposta acima de 500 caracteres com response_too_long em vez de cortar o texto. Trava a linha com FOR UPDATE para não sobrescrever uma resposta concorrente.'

-- === 2. Apagamento do titular alcanca a linha do tempo ==========================
--
-- Reemite erase_customer_data (vigente em 20261121110000) acrescentando a
-- anonimizacao das mensagens da equipe. Só eventos com texto livre do operador sao
-- tocados: 'received'/'status_changed' trazem titulos fixos e os 'adjustment_requested'
-- internos carregam o id do ajuste, sem dado pessoal.

create or replace function public.erase_customer_data(p_email text, p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := site_private.normalize_email(p_email);
  v_email_hash text;
  v_quote_ids uuid[];
  v_user_ids uuid[];
  v_storage_paths jsonb;
  v_quotes integer := 0;
  v_contacts integer := 0;
  v_profiles integer := 0;
  v_documents integer := 0;
  v_users integer := 0;
  v_kit_names integer := 0;
  v_notifications integer := 0;
  v_events integer := 0;
begin
  if length(v_email) not between 5 and 160 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception using errcode = '22023', message = 'invalid_erasure_email';
  end if;
  v_email_hash := encode(sha256(convert_to(v_email, 'UTF8')), 'hex');

  select coalesce(array_agg(distinct candidate.user_id), '{}'::uuid[]) into v_user_ids
  from (
    select profile.user_id from site_private.customer_profiles profile where profile.verified_email = v_email
    union
    select user_record.id from auth.users user_record where lower(user_record.email) = v_email
  ) candidate
  where p_user_id is null or candidate.user_id = p_user_id;
  select coalesce(array_agg(id), '{}'::uuid[]) into v_quote_ids
  from site_private.quote_requests
  where customer_user_id = any(v_user_ids)
     or (email = v_email and (p_user_id is null or customer_user_id is null));

  select coalesce(jsonb_agg(jsonb_build_object('bucket', document.storage_bucket, 'path', document.storage_path)), '[]'::jsonb)
  into v_storage_paths from site_private.proposal_documents document
  where document.quote_request_id = any(v_quote_ids);

  insert into site_private.storage_deletion_queue (bucket, object_path)
  select document.storage_bucket, document.storage_path
  from site_private.proposal_documents document
  where document.quote_request_id = any(v_quote_ids)
  on conflict (bucket, object_path) do update
    set queued_at = least(site_private.storage_deletion_queue.queued_at, excluded.queued_at);

  delete from site_private.proposal_documents where quote_request_id = any(v_quote_ids);
  get diagnostics v_documents = row_count;
  update site_private.quote_adjustment_requests
    set message = '[apagado a pedido do titular]', updated_at = now()
    where requested_by = any(v_user_ids);

  update site_private.notification_deliveries delivery set
    status = 'cancelled', lease_token = null, lease_expires_at = null, updated_at = now()
  where delivery.request_kind = 'quote'
    and delivery.request_id = any(v_quote_ids)
    and delivery.status in ('pending', 'failed', 'processing');
  get diagnostics v_notifications = row_count;

  update site_private.quote_requests request set
    contact_name = '[apagado a pedido do titular]', company = '[apagado a pedido do titular]',
    email = 'titular-' || left(md5(request.id::text), 16) || '@erased.invalid',
    phone = '00000000000', city = null, notes = null, customer_user_id = null,
    request_metadata = site_private.erase_titular_request_metadata(request.request_metadata),
    updated_at = now()
  where request.id = any(v_quote_ids) and request.contact_name <> '[apagado a pedido do titular]';
  get diagnostics v_quotes = row_count;

  update site_private.quote_items item set
    kit_name_snapshot = '[apagado a pedido do titular]'
  where item.quote_request_id = any(v_quote_ids)
    and item.kit_name_snapshot is not null
    and item.kit_name_snapshot <> '[apagado a pedido do titular]';
  get diagnostics v_kit_names = row_count;

  -- F-05: o texto que a equipe escreveu ao cliente pode citar nome, empresa ou
  -- qualquer dado que o titular informou. Sem esta linha a mensagem sobreviveria
  -- ao apagamento e continuaria sendo servida por get_my_quote_request.
  update site_private.quote_request_events event set
    description = '[apagado a pedido do titular]'
  where event.quote_request_id = any(v_quote_ids)
    and event.event_type = 'message'
    and event.audience = 'customer'
    and event.description is not null
    and event.description <> '[apagado a pedido do titular]';
  get diagnostics v_events = row_count;

  update site_private.contact_requests request set
    contact_name = '[apagado a pedido do titular]',
    email = 'titular-' || left(md5(request.id::text), 16) || '@erased.invalid',
    phone = null, message = '[apagado a pedido do titular]', updated_at = now()
  where request.email = v_email and request.contact_name <> '[apagado a pedido do titular]';
  get diagnostics v_contacts = row_count;
  update site_private.customer_profiles profile set
    display_name = null, company = null,
    verified_email = 'titular-' || left(md5(profile.user_id::text), 16) || '@erased.invalid', updated_at = now()
  where profile.user_id = any(v_user_ids)
    and profile.verified_email !~ '^titular-[0-9a-f]{16}@erased\.invalid$';
  get diagnostics v_profiles = row_count;

  insert into site_private.erased_customer_identities (email_sha256, auth_users_deleted)
  values (v_email_hash, cardinality(v_user_ids))
  on conflict (email_sha256) do update set erased_at = now(),
    auth_users_deleted = greatest(site_private.erased_customer_identities.auth_users_deleted, excluded.auth_users_deleted);
  delete from auth.users where id = any(v_user_ids);
  get diagnostics v_users = row_count;

  return jsonb_build_object(
    'quotesAnonymized', v_quotes, 'contactsAnonymized', v_contacts,
    'profilesAnonymized', v_profiles, 'proposalDocumentsDeleted', v_documents,
    'authUsersDeleted', v_users, 'storagePathsQueued', jsonb_array_length(v_storage_paths),
    'kitNamesAnonymized', v_kit_names, 'notificationsCancelled', v_notifications,
    'messagesAnonymized', v_events,
    'storagePathsToRemove', v_storage_paths
  );
end;
$$

comment on function public.erase_customer_data(text, uuid) is
  'Apagamento idempotente (F-31, F-30, F-05): anonimiza registros e texto livre do titular — inclusive as mensagens que a equipe escreveu na linha do tempo —, cancela entregas reivindicaveis, enfileira blobs, registra tombstone SHA-256 e remove Auth por cascade. Com p_user_id restringe ao auth.uid() do chamador (autoexclusao F-30); sem ele (service_role administrativo) reune todas as contas do e-mail.'
