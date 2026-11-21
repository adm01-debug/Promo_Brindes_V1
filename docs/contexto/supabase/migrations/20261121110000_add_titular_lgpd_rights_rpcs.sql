-- F-30: direitos do titular LGPD (art. 18) na Area do Cliente — acesso,
-- exportacao, correcao e autoexclusao, todos registrados em uma trilha
-- subject_right_requests no schema privado.
--
-- Esta migration foi RECRIADA apos a perda do trabalho original (worktree nunca
-- comitado): o conteudo foi reconstruido a partir da especificacao registrada em
-- docs/ e dos padroes do repositorio, nao do arquivo original.
--
-- ADITIVA, exclusiva do Supabase isolado do site xlzmclcjdncjfdrjxclt.
-- PROIBIDO aplicar no catalogo canonico doufsxqlfjyuvxuezpln.
--
-- As RPCs seguem a convencao do portal (20260909180000): security definer,
-- set search_path = '', revoke de public/anon e grant de execute apenas para
-- authenticated e service_role. Mensagens de erro em snake_case documentadas em
-- docs/DATABASE_FUNCTION_CONTRACTS.md.

-- === Trilha de exercicio de direito ==============================================
--
-- Registra CADA exercicio: acesso, exportacao, correcao e pedido de autoexclusao.
-- Sem PII alem do vinculo com a conta, justamente para a linha poder sobreviver a
-- auditoria. No caso do delete, a linha e removida pelo cascade de auth.users; a
-- trilha juridica persistente do apagamento e o tombstone SHA-256 gravado por
-- public.erase_customer_data em site_private.erased_customer_identities.
create table if not exists site_private.subject_right_requests (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references auth.users(id) on delete cascade,
  right_type text not null check (right_type in ('access', 'export', 'correct', 'delete')),
  requested_at timestamptz not null default now()
)

create index if not exists subject_right_requests_subject_idx
  on site_private.subject_right_requests (subject_user_id, requested_at desc)

alter table site_private.subject_right_requests enable row level security

alter table site_private.subject_right_requests force row level security

revoke all on site_private.subject_right_requests from public, anon, authenticated

grant select, insert, update, delete on site_private.subject_right_requests to service_role

comment on table site_private.subject_right_requests is
  'Trilha do exercicio dos direitos do titular (LGPD art. 18) na Area do Cliente: access, export, correct e delete. Vinculada a conta e removida pelo cascade de auth.users; o registo persistente do apagamento e o tombstone irreversivel em erased_customer_identities.'

comment on column site_private.subject_right_requests.right_type is
  'Direito exercido: access (confirmacao de tratamento), export (portabilidade), correct (correcao de perfil) ou delete (autoexclusao).'

-- === Email verificado do titular ================================================
--
-- As quatro RPCs precisam do mesmo e-mail confirmado que claim_my_quote_requests usa
-- (20260909180000:149-210) e a mesma rejeicao explicita de conta sem e-mail
-- confirmado. Extrair para um helper evita divergencia de comportamento entre os
-- tres fluxos e da a uma unica linha o papel de "identidade do titular".
create or replace function site_private.current_titular_verified_email()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select lower(user_record.email) into v_email
  from auth.users user_record
  where user_record.id = v_user_id and user_record.email_confirmed_at is not null;

  if v_email is null then
    raise exception using errcode = '42501', message = 'verified_email_required';
  end if;

  return v_email;
end;
$$

comment on function site_private.current_titular_verified_email() is
  'F-30: e-mail confirmado da identidade autenticada, em lowercase, ou erro explicito quando nao autenticado (authentication_required) ou sem e-mail confirmado (verified_email_required). Mesma regra de claim_my_quote_requests.'

-- Helper interno, chamado apenas pelas RPCs security definer: nada de execute
-- publico, nem via browser.
revoke all on function site_private.current_titular_verified_email() from public, anon, authenticated, service_role, site_api

-- === 1. Direito de acesso: confirmacao de tratamento ============================
create or replace function public.get_my_data_access()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := site_private.current_titular_verified_email();
  v_display_name text;
  v_company text;
  v_quotes integer;
  v_selections integer;
  v_favorites integer;
  v_contacts integer;
begin
  insert into site_private.subject_right_requests (subject_user_id, right_type)
  values (v_user_id, 'access');

  select profile.display_name, profile.company
    into v_display_name, v_company
  from site_private.customer_profiles profile
  where profile.user_id = v_user_id;

  select count(*) into v_quotes
  from site_private.quote_requests request
  where request.customer_user_id = v_user_id and request.status <> 'spam';
  -- Todas as selecoes, inclusive as arquivadas: a exportacao (abaixo) as inclui,
  -- e o relatorio de acesso deve refletir o que esta armazenado para o titular.
  select count(*) into v_selections
  from site_private.customer_selections selection
  where selection.customer_user_id = v_user_id;
  select count(*) into v_favorites
  from site_private.customer_occasion_favorites favorite
  where favorite.customer_user_id = v_user_id;
  select count(*) into v_contacts
  from site_private.contact_requests contact
  where contact.email = v_email and contact.status <> 'spam';

  return jsonb_build_object(
    'profile', jsonb_build_object('displayName', v_display_name, 'company', v_company),
    'counts', jsonb_build_object(
      'quotes', v_quotes, 'selections', v_selections, 'favorites', v_favorites, 'contacts', v_contacts
    )
  );
end;
$$

comment on function public.get_my_data_access() is
  'F-30: confirmacao de tratamento — devolve ao titular autenticado um resumo do que o site guarda sobre ele (perfil e contagens), sem expor registros. Nenhum dado pessoal alem do do proprio titular.'

-- === 2. Direito de portabilidade: exportacao ====================================
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := site_private.current_titular_verified_email();
  v_display_name text;
  v_company text;
  v_quotes jsonb;
  v_selections jsonb;
  v_favorites jsonb;
  v_contacts jsonb;
  v_adjustments jsonb;
  v_rights jsonb;
begin
  insert into site_private.subject_right_requests (subject_user_id, right_type)
  values (v_user_id, 'export');

  select profile.display_name, profile.company
    into v_display_name, v_company
  from site_private.customer_profiles profile
  where profile.user_id = v_user_id;

  select coalesce(jsonb_agg(payload order by created_at desc), '[]'::jsonb) into v_quotes
  from (
    select request.created_at, jsonb_build_object(
      'id', request.id, 'protocol', request.protocol,
      'status', request.status, 'createdAt', request.created_at,
      'submittedAt', request.client_submitted_at, 'company', request.company,
      'contactName', request.contact_name, 'email', request.email, 'phone', request.phone,
      'city', request.city, 'desiredDeadline', request.desired_deadline, 'notes', request.notes,
      'retentionUntil', request.retention_until,
      'campaign', request.request_metadata -> 'campaign',
      'briefing', request.request_metadata -> 'briefing',
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'key', item.item_key, 'productId', item.source_product_id, 'slug', item.product_slug,
          'name', item.product_name_snapshot, 'sku', item.sku_snapshot,
          'imageUrl', item.image_url_snapshot, 'quantity', item.quantity,
          'minQuantity', item.minimum_quantity_snapshot, 'variantId', item.variant_id_snapshot,
          'colorName', item.color_name_snapshot, 'colorHex', item.color_hex_snapshot,
          'decisionGroup', item.decision_group_snapshot, 'kitGroupId', item.kit_group_id,
          'kitName', item.kit_name_snapshot, 'kitQuantity', item.kit_quantity_snapshot,
          'unitsPerKit', item.units_per_kit_snapshot
        ) order by item.position)
        from site_private.quote_items item
        where item.quote_request_id = request.id
      ), '[]'::jsonb),
      'events', coalesce((
        select jsonb_agg(jsonb_build_object(
          'type', event.event_type, 'status', event.status, 'title', event.title,
          'createdAt', event.created_at
        ) order by event.created_at desc)
        from site_private.quote_request_events event
        where event.quote_request_id = request.id and event.audience = 'customer'
      ), '[]'::jsonb),
      'proposals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'version', proposal.version, 'title', proposal.title,
          'validUntil', proposal.valid_until, 'publishedAt', proposal.published_at,
          'isCurrent', proposal.superseded_at is null
        ) order by proposal.version desc)
        from site_private.proposal_documents proposal
        where proposal.quote_request_id = request.id and proposal.published_at is not null
      ), '[]'::jsonb)
    ) as payload
    from site_private.quote_requests request
    where request.customer_user_id = v_user_id and request.status <> 'spam'
  ) quote_payload;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', selection.id, 'title', selection.title, 'references', selection.product_references,
      'campaign', selection.campaign, 'version', selection.version,
      'archivedAt', selection.archived_at, 'createdAt', selection.created_at,
      'updatedAt', selection.updated_at
    ) order by selection.updated_at desc), '[]'::jsonb)
  into v_selections
  from site_private.customer_selections selection
  where selection.customer_user_id = v_user_id;

  select coalesce(jsonb_agg(occasion_id), '[]'::jsonb)
  into v_favorites
  from site_private.customer_occasion_favorites favorite
  where favorite.customer_user_id = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', contact.id, 'clientRequestId', contact.client_request_id,
      'name', contact.contact_name, 'email', contact.email, 'phone', contact.phone,
      'message', contact.message, 'pageUrl', contact.page_url, 'source', contact.source
    ) order by contact.created_at desc), '[]'::jsonb)
  into v_contacts
  from site_private.contact_requests contact
  where contact.email = v_email and contact.status <> 'spam';

  select coalesce(jsonb_agg(jsonb_build_object(
      'requestId', adjustment.quote_request_id, 'clientRequestId', adjustment.client_request_id,
      'message', adjustment.message, 'createdAt', adjustment.created_at, 'status', adjustment.status
    ) order by adjustment.created_at desc), '[]'::jsonb)
  into v_adjustments
  from site_private.quote_adjustment_requests adjustment
  where adjustment.requested_by = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'rightType', right_request.right_type, 'requestedAt', right_request.requested_at
    ) order by right_request.requested_at desc), '[]'::jsonb)
  into v_rights
  from site_private.subject_right_requests right_request
  where right_request.subject_user_id = v_user_id;

  return jsonb_build_object(
    'exportedAt', now(), 'email', v_email,
    'profile', jsonb_build_object('displayName', v_display_name, 'company', v_company),
    'quotes', v_quotes, 'selections', v_selections, 'favorites', v_favorites,
    'contacts', v_contacts, 'adjustments', v_adjustments, 'rights', v_rights
  );
end;
$$

comment on function public.export_my_data() is
  'F-30: portabilidade — devolve ao titular autenticado um JSON completo dos registros que o site guarda sobre ele (perfil, orcamentos com itens/eventos/propostas, selecoes, favoritos, contatos, pedidos de ajuste e trilha de direitos). O email retornado e o do proprio titular confirmado.'

-- === 3. Direito de correcao: perfil =============================================
create or replace function public.correct_my_data(p_display_name text, p_company text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := site_private.current_titular_verified_email();
  v_display_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_company text := nullif(trim(coalesce(p_company, '')), '');
begin
  if v_display_name is null and v_company is null then
    raise exception using errcode = '22023', message = 'invalid_profile_fields';
  end if;
  if v_display_name is not null and length(v_display_name) not between 2 and 100 then
    raise exception using errcode = '22023', message = 'invalid_profile_fields';
  end if;
  if v_company is not null and length(v_company) not between 2 and 150 then
    raise exception using errcode = '22023', message = 'invalid_profile_fields';
  end if;

  insert into site_private.customer_profiles (user_id, verified_email, display_name, company)
  values (v_user_id, v_email, v_display_name, v_company)
  on conflict (user_id) do update
    set display_name = coalesce(excluded.display_name, site_private.customer_profiles.display_name),
        company = coalesce(excluded.company, site_private.customer_profiles.company),
        updated_at = now();

  insert into site_private.subject_right_requests (subject_user_id, right_type)
  values (v_user_id, 'correct');

  return jsonb_build_object('updated', true, 'displayName', v_display_name, 'company', v_company);
end;
$$

comment on function public.correct_my_data(text, text) is
  'F-30: correcao — atualiza display_name (2 a 100) e/ou company (2 a 150) do perfil do titular autenticado; campos em branco preservam o valor anterior. Pelo menos um campo deve ser fornecido; entradas invalidas levantam invalid_profile_fields. Registra o exercicio do direito na trilha.'

-- === 4. Direito de eliminacao: autoexclusao =====================================
create or replace function public.delete_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := site_private.current_titular_verified_email();
begin
  -- Trilha efemera: a linha some pelo cascade do auth.users dentro de
  -- erase_customer_data. A trilha persistente do pedido e o tombstone SHA-256
  -- gravado na mesma transacao. Registrar antes nao muda o resultado, mas deixa
  -- explicito no codigo que o direito foi exercido por autoexclusao (nao por
  -- apagamento administrativo).
  insert into site_private.subject_right_requests (subject_user_id, right_type)
  values (v_user_id, 'delete');

  return public.erase_customer_data(v_email, v_user_id);
end;
$$

comment on function public.delete_my_data() is
  'F-30: autoexclusao — entrega o e-mail verificado do titular a erase_customer_data restrita ao auth.uid() (segundo argumento), que anonimiza registros do proprio titular, remove a conta Auth por cascade e grava o tombstone SHA-256 irreversivel. O JSON devolvido e o mesmo de erase_customer_data (contagens e storagePathsToRemove).'

-- === Hardening: autoexclusao restrita ao titular atual ============================
--
-- SEC 0001 (review Devin): a forma original de erase_customer_data(p_email)
-- reunia TODAS as contas com o mesmo e-mail (customer_profiles.verified_email
-- UNION auth.users.email). Se o e-mail fosse reutilizado por outro titular, uma
-- autoexclusao apagaria a conta alheia. O parametro opcional p_user_id restringe
-- o alvo ao auth.uid() do chamador; sem ele (uso administrativo via service_role)
-- o comportamento historico e preservado.
--
-- A assinatura original (text) e substituida pela variante (text, uuid default
-- null): manter as duas simultaneamente violaria a convencao de versionamento
-- (Etapa 23, function_catalog_hygiene). O default preserva a chamada de 1 arg.
drop function if exists public.erase_customer_data(text)

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
$$

comment on function public.erase_customer_data(text, uuid) is
  'Apagamento idempotente (F-31): anonimiza registros e texto livre do titular, cancela entregas reivindicaveis, enfileira blobs, registra tombstone SHA-256 e remove Auth por cascade. Com p_user_id restringe ao auth.uid() do chamador (autoexclusao F-30); sem ele (service_role administrativo) reune todas as contas do e-mail.'

-- === Fix BUG 0002 (review Devin): contas recriadas apos autoexclusao ==============
--
-- claim_my_quote_requests (20260923120000:341-352) rejeitava TODO e-mail com
-- tombstone em erased_customer_identities, ignorando a data do pedido. Uma conta
-- recriada com o mesmo e-mail ficava bloqueada mesmo com pedidos NOVOS
-- (created_at > erased_at). A barreira juridica contra recuperar o historico
-- ANTERIOR ao apagamento permanece: pedidos criados antes do erased_at continuam
-- inalcancaveis (o claim atual os deixa sem dono, e a assinatura abaixo so alcança
-- os posteriores ao tombstone). Usa created_at (server-side) em vez de
-- client_submitted_at (navegador) para nao ocultar pedidos por relogio atrasado.
create or replace function public.claim_my_quote_requests()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_claimed integer := 0;
  v_email_hash text;
  v_erased_at timestamptz;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select lower(user_record.email), nullif(trim(user_record.raw_user_meta_data ->> 'name'), '')
    into v_email, v_name from auth.users user_record
    where user_record.id = v_user_id and user_record.email_confirmed_at is not null;
  if v_email is null then raise exception using errcode = '42501', message = 'verified_email_required'; end if;
  v_email_hash := encode(sha256(convert_to(v_email, 'UTF8')), 'hex');
  select erased.erased_at into v_erased_at
  from site_private.erased_customer_identities erased
  where erased.email_sha256 = v_email_hash;
  -- Conta recriada apos autoexclusao (BUG 0002): pedidos enviados DEPOIS do
  -- erased_at sao legitimamente do novo titular e podem ser associados. A barreira
  -- juridica contra recuperar o historico anterior ao apagamento permanece: os
  -- pedidos com created_at <= v_erased_at nao sao tocados (ficam sem dono).
  -- created_at e preenchido pelo banco (server-side, imutavel); client_submitted_at
  -- vem do navegador e a API aceita ate 7 dias no passado, entao um relogio atrasado
  -- ocultaria pedidos legitimamente posteriores ao apagamento (BUG 0002/Dev).
  insert into site_private.customer_profiles (user_id, verified_email, display_name)
  values (v_user_id, v_email, v_name)
  on conflict (user_id) do update set verified_email = excluded.verified_email,
    display_name = coalesce(excluded.display_name, site_private.customer_profiles.display_name), updated_at = now();
  update site_private.quote_requests request set customer_user_id = v_user_id, updated_at = now()
  where request.customer_user_id is null and request.status <> 'spam' and lower(request.email) = v_email
    and (v_erased_at is null or request.created_at > v_erased_at);
  get diagnostics v_claimed = row_count;
  return jsonb_build_object('claimed', v_claimed, 'email', v_email);
end;
$$

-- === Grants ======================================================================
revoke all on function public.get_my_data_access() from public, anon

revoke all on function public.export_my_data() from public, anon

revoke all on function public.correct_my_data(text, text) from public, anon

revoke all on function public.delete_my_data() from public, anon

grant execute on function public.get_my_data_access() to authenticated, service_role

grant execute on function public.export_my_data() to authenticated, service_role

grant execute on function public.correct_my_data(text, text) to authenticated, service_role

grant execute on function public.delete_my_data() to authenticated, service_role

-- A variante restrita ao titular continua sendo operacao administrativa: so o
-- service_role a executa diretamente; authenticated a alcanca apenas via
-- delete_my_data (security definer).
revoke all on function public.erase_customer_data(text, uuid) from public, anon, authenticated, site_api

grant execute on function public.erase_customer_data(text, uuid) to service_role

alter default privileges in schema site_private revoke all on tables from public, anon, authenticated
