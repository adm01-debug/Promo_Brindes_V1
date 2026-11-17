-- F-31: o apagamento LGPD era anunciado como completo e nao era. Tres lacunas, todas
-- no corpo de public.erase_customer_data (vigente em
-- 20260923120000_audit_security_reliability_hardening.sql:244-325):
--
--   (a) request_metadata nunca era tocado. Sobreviviam a anonimizacao:
--       - briefing.actionName (texto livre digitado no formulario de orcamento), lido
--         pelo historico do cliente em 20260916130000:199 (busca) e :215 (listagem) e
--         pelo detalhe em 20260922160000:191, e enviado na fila em 20260923200000:33-34;
--       - campaign.occasion.name (1 a 120 caracteres vindos do parametro de URL
--         ocasiao_nome, api/_lib/contracts.ts:210), no mesmo caminho via
--         20260923200000:31-32 e api/notifications.ts:266;
--       - campaign.occasion.id, que NAO e slug de catalogo: e texto do cliente de 2 a
--         80 caracteres validado somente por charset (api/_lib/contracts.ts:206-207,
--         regex /^[a-z0-9-]+$/ COM flag i; src/lib/campaignBrief.ts:26 idem), lido
--         direto da URL em src/lib/useCatalogPageState.ts:62. Com maiuscula permitida e
--         hifen no lugar do espaco, 'Fulana-de-Tal' e '11988887777' passam. Nenhuma
--         migration le campaign.occasion.id e o unico leitor em codigo
--         (api/notifications.ts:266) usa .name e .date, portanto apagar o id nao quebra
--         leitor nenhum e fecha o campo de texto livre que restava.
--   (b) site_private.quote_items.kit_name_snapshot (20260922160000:7) nunca era tocado
--       — texto de 1 a 100 caracteres digitado pelo cliente, devolvido como 'kitName'
--       no contrato de confirmacao/historico (20260923200000:43).
--   (c) entregas ainda reivindicaveis nao eram canceladas.
--       site_private.quote_notification_payload (20260923200000:25-28) le e-mail,
--       telefone, nome e empresa AO VIVO da linha no momento da reivindicacao: uma
--       entrega reivindicada depois do apagamento dispara de fato, contra o endereco
--       falso @erased.invalid.
--
-- Migration ADITIVA, exclusiva do Supabase isolado do site xlzmclcjdncjfdrjxclt.
-- PROIBIDO aplicar no catalogo canonico doufsxqlfjyuvxuezpln.
--
-- Assinatura preservada: public.erase_customer_data(p_email text), security definer,
-- set search_path = '' — igual ao original, para nao criar uma segunda entrada no
-- catalogo (function_catalog_hygiene.test.sql).

-- === Lacuna (c), parte 1: as duas transicoes que faltavam =========================
--
-- O conjunto REIVINDICAVEL da fila e exatamente {pending, failed, processing}: todos
-- os CTEs de claim aceitam `status in ('pending','failed') and next_attempt_at <= now()`
-- OU `status = 'processing' and lease_expires_at <= now()` — 20260916110000:175-176,
-- 20260922120000:54-55, 20260923200000:103-104 e 20261106150448:166-167 (mais os
-- pre-checks de claim imediato em 20260923200000:87 e 20261106150448:152). 'sent',
-- 'cancelled' e 'exhausted' nao sao reivindicados por nenhum caminho, por isso ficam
-- de fora do cancelamento abaixo (e 'exhausted' -> 'cancelled' nem existe na matriz).
--
-- notification_deliveries_enforce_status_transition (20260916220000:56-58) so aceita
-- as transicoes inseridas em site_private.status_transitions. Hoje existe apenas
-- processing -> cancelled (20260916220000:44). Um update pending -> cancelled levanta
-- 22023 e abortaria a funcao inteira, porque erase_customer_data e um bloco unico sem
-- EXCEPTION: qualquer titular com entrega na fila teria o apagamento FALHADO. Verificado
-- empiricamente em PG 16 com os dois triggers reais: antes destas duas linhas,
-- pending -> cancelled e rejeitado com 22023.
--
-- O caminho legitimo e o que 20260916100000:128-130 prescreve para reabrir estado
-- terminal: "nova migration aditiva na tabela acima, nao uma excecao silenciosa no
-- trigger". Cancelar por pedido do titular e um caso de primeira classe, do mesmo tipo
-- da reabertura administrativa exhausted -> pending.
insert into site_private.status_transitions (entity, from_status, to_status) values
  ('notification_deliveries', 'pending', 'cancelled'),
  ('notification_deliveries', 'failed', 'cancelled')
on conflict do nothing;
-- processing -> cancelled nao e inserida: ja existe (20260916220000:44).

-- === Lacuna (a): remocao cirurgica do texto do titular em request_metadata =======
--
-- request_metadata e NOT NULL, default '{}' e tem CHECK jsonb_typeof = 'object'
-- (20260908230000:26 e :62): e proibido gravar NULL, escalar ou array. Esta funcao
-- devolve sempre um objeto e nunca levanta excecao — inclusive quando 'campaign' ou
-- 'briefing' valem JSON null, que e o caso comum (api/_lib/siteDatabase.ts:234-235
-- grava `payload.campaign || null`). Por isso cada nivel e checado com jsonb_typeof
-- antes de ser reescrito, em vez de usar o operador #- sobre um caminho que pode
-- atravessar um escalar. Verificado empiricamente em PG 16 com objeto completo,
-- campaign/briefing = JSON null, '{}' e campaign/occasion escalares.
--
-- Apaga EXATAMENTE as tres chaves de texto fornecido pelo cliente. Preserva as chaves
-- operacionais (os enums fechados de campaign/briefing, as duas datas de calendario,
-- userAgent, origin e notificationPreferences), de modo que nenhum leitor identificado
-- quebra: get_my_quote_requests (20260916130000:199/:215) recebe NULL ja protegido por
-- coalesce/nullif, get_my_quote_request (20260922160000:191) e
-- quote_notification_payload (20260923200000:31-34) continuam recebendo objetos, e
-- enqueue_quote_confirmations (20261106150448:20-39) e AFTER INSERT — nunca disparado
-- por um update.
create or replace function site_private.erase_titular_request_metadata(p_metadata jsonb)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb := p_metadata;
  v_briefing jsonb;
  v_campaign jsonb;
  v_occasion jsonb;
begin
  if jsonb_typeof(v_result) <> 'object' then
    return v_result;
  end if;

  v_briefing := v_result -> 'briefing';
  if jsonb_typeof(v_briefing) = 'object' then
    v_result := jsonb_set(v_result, '{briefing}', v_briefing - 'actionName');
  end if;

  v_campaign := v_result -> 'campaign';
  if jsonb_typeof(v_campaign) = 'object' then
    v_occasion := v_campaign -> 'occasion';
    if jsonb_typeof(v_occasion) = 'object' then
      v_result := jsonb_set(v_result, '{campaign,occasion}', (v_occasion - 'name') - 'id');
    end if;
  end if;

  return v_result;
end;
$$;

comment on function site_private.erase_titular_request_metadata(jsonb) is
  'F-31: remove de request_metadata as tres chaves de texto fornecido pelo cliente (briefing.actionName, campaign.occasion.name e campaign.occasion.id, que e texto de ate 80 caracteres validado so por charset, nao slug de catalogo) e preserva as operacionais. Sempre devolve objeto (CHECK jsonb_typeof) e nunca levanta excecao, mesmo com campaign/briefing valendo JSON null.';

-- Helper puramente interno: quem chama e o SECURITY DEFINER abaixo, que roda como
-- proprietario. Mesma convencao de 20260922210000:102-103.
revoke all on function site_private.erase_titular_request_metadata(jsonb)
  from public, anon, authenticated, service_role, site_api;

-- === A funcao de apagamento, com as tres lacunas fechadas ========================
--
-- contact_requests fica fora de (a) e (c) de proposito, nao por esquecimento:
-- contact_requests.request_metadata guarda apenas {userAgent, origin} — campaign,
-- briefing e notificationPreferences so entram em p_request_meta quando
-- `payload.source === 'site-promo-brindes'` (api/_lib/siteDatabase.ts:233-237) e o
-- contato usa 'site-promo-brindes-contact' (20260908230000:55), e a RPC de contato
-- grava `p_request_meta - 'identifierHash' - 'requestHash'` (20260910103000:56).
-- userAgent/origin sao preservados tambem em quote_requests, por politica. E nenhum
-- gravador enfileira entrega com request_kind = 'contact': os unicos inserts em
-- notification_deliveries sao 20260912170000:19 e :26 e 20261106150448:20, :27 e :34,
-- todos 'quote'. Por isso nao ha chamada do helper em contact_requests nem ramo
-- 'contact' no cancelamento — e o bloco de reparo no fim fica simetrico com a funcao.
create or replace function public.erase_customer_data(p_email text)
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
  ) candidate;
  select coalesce(array_agg(id), '{}'::uuid[]) into v_quote_ids
  from site_private.quote_requests
  where email = v_email or customer_user_id = any(v_user_ids);

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

  -- Lacuna (c): tira da fila TUDO o que ainda pode ser reivindicado — os tres estados
  -- dos CTEs de claim, 'processing' incluido. 'processing' com lease vencido volta a ser
  -- reivindicado (20260922120000:55), e 'processing' com lease vivo cai no mesmo caso
  -- assim que o lease vence ou a tentativa termina em 'failed' (20260916110000:264) —
  -- em qualquer um dos dois o envelope e remontado AO VIVO da linha ja anonimizada
  -- (20260923200000:25-28). Cancelar com lease vivo nao arranca nada de quem esta
  -- despachando: finalize_site_notification_delivery devolve false em vez de levantar
  -- (20260916110000:272-274) e o chamador ja trata false como 'inconclusive', sem
  -- reenvio automatico (api/notifications.ts:84-90 e :397-402). Vem antes das
  -- anonimizacoes para que nenhuma entrega reivindicavel sobreviva a transacao.
  -- attempts NAO e tocado (enforce_notification_delivery_lease_and_attempts
  -- 20260916220000:99-101 so permite mudanca de attempts entrando em processing ou
  -- reabrindo de exhausted) e lease_token/lease_expires_at vao a null para satisfazer
  -- 20260916220000:84-87 e o CHECK notification_deliveries_lease_matches_status
  -- (20260916110000:119-124).
  update site_private.notification_deliveries delivery set
    status = 'cancelled', lease_token = null, lease_expires_at = null, updated_at = now()
  where delivery.request_kind = 'quote'
    and delivery.request_id = any(v_quote_ids)
    and delivery.status in ('pending', 'failed', 'processing');
  get diagnostics v_notifications = row_count;

  -- Lacuna (a) no mesmo update que ja anonimiza a linha: a guarda de idempotencia
  -- por contact_name continua valendo para o conjunto inteiro.
  update site_private.quote_requests request set
    contact_name = '[apagado a pedido do titular]', company = '[apagado a pedido do titular]',
    email = 'titular-' || left(md5(request.id::text), 16) || '@erased.invalid',
    phone = '00000000000', city = null, notes = null, customer_user_id = null,
    request_metadata = site_private.erase_titular_request_metadata(request.request_metadata),
    updated_at = now()
  where request.id = any(v_quote_ids) and request.contact_name <> '[apagado a pedido do titular]';
  get diagnostics v_quotes = row_count;

  -- Lacuna (b): placeholder de texto, nunca null. Anular so kit_name_snapshot violaria
  -- quote_items_kit_composition_check (20260922160000:11-17), que exige as quatro
  -- colunas de kit em conjunto. O literal e o mesmo para todas as linhas, o que mantem
  -- a invariante de "um nome por kit_group" imposta na criacao (20260922160000:127-136).
  -- quote_items nao tem updated_at; o unico trigger e o de auditoria administrativa
  -- (20260916210000:65-82, quote_items_log_admin_write), que nao valida nada e nunca
  -- levanta excecao.
  update site_private.quote_items item set
    kit_name_snapshot = '[apagado a pedido do titular]'
  where item.quote_request_id = any(v_quote_ids)
    and item.kit_name_snapshot is not null
    and item.kit_name_snapshot <> '[apagado a pedido do titular]';
  get diagnostics v_kit_names = row_count;

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
    'storagePathsToRemove', v_storage_paths
  );
end;
$$;

comment on function public.erase_customer_data(text) is
  'Apagamento administrativo idempotente (F-31): anonimiza registros e texto livre — inclusive briefing.actionName, campaign.occasion.name/id em request_metadata e kit_name_snapshot dos itens —, cancela as entregas ainda reivindicaveis da fila (pending/failed/processing), enfileira blobs, registra tombstone SHA-256, remove Auth/sessoes por cascade e impede novo claim do mesmo e-mail.';
