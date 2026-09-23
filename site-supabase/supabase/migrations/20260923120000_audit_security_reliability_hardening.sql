-- Hardening pós-auditoria de 23/09/2026.
-- Exclusivo do Supabase isolado xlzmclcjdncjfdrjxclt.
-- Não consulta nem altera o catálogo canônico do Promo Gifts.

-- 1. Novos objetos no schema public nasciam com privilégios amplos da plataforma.
-- RLS não protege TRUNCATE; por isso o default precisa ser deny-by-default.
alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from public, anon, authenticated;
-- EXECUTE em funções nasce concedido a PUBLIC pelo default global do PostgreSQL;
-- um REVOKE limitado ao schema não consegue subtrair esse default global.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- 2. A role real do chamador precisa ser capturada antes de SECURITY DEFINER
-- mascará-la como postgres. request.jwt.claims cobre PostgREST; setting role cobre
-- conexões diretas com SET ROLE; session_user é o fallback administrativo.
create or replace function site_private.audit_actor()
returns text
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_claims jsonb;
  v_actor text;
begin
  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    v_claims := null;
  end;
  v_actor := coalesce(
    nullif(v_claims ->> 'role', ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('role', true), 'none'),
    session_user::text
  );
  return coalesce(v_actor, 'unknown');
end;
$$;

create or replace function site_private.log_admin_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_id text;
  v_actor text := site_private.audit_actor();
begin
  if v_actor in ('site_api', 'service_role') then
    return coalesce(new, old);
  end if;
  begin
    v_row_id := to_jsonb(case when tg_op = 'DELETE' then old else new end) ->> 'id';
  exception when others then
    v_row_id := null;
  end;
  insert into site_private.admin_audit_log (table_name, operation, row_id, performed_by, application_name)
  values (tg_table_name, tg_op, v_row_id, v_actor, current_setting('application_name', true));
  return coalesce(new, old);
end;
$$;

create or replace function site_private.log_admin_ddl()
returns event_trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_object_type text;
  v_schema_name text;
begin
  select cmd.object_type, cmd.schema_name into v_object_type, v_schema_name
  from pg_event_trigger_ddl_commands() cmd
  limit 1;
  insert into site_private.admin_ddl_log (command_tag, object_type, schema_name, performed_by)
  values (tg_tag, v_object_type, v_schema_name, site_private.audit_actor());
end;
$$;

create index if not exists admin_audit_log_occurred_idx on site_private.admin_audit_log (occurred_at, id);
create index if not exists admin_ddl_log_occurred_idx on site_private.admin_ddl_log (occurred_at, id);

create or replace function public.purge_site_admin_audit_logs(
  p_retention_days integer default 400,
  p_batch_size integer default 1000
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_writes integer;
  v_ddl integer;
begin
  if p_retention_days not between 30 and 3650 or p_batch_size not between 1 and 5000 then
    raise exception using errcode = '22023', message = 'invalid_audit_retention_input';
  end if;
  with candidates as (
    select id from site_private.admin_audit_log
    where occurred_at < now() - make_interval(days => p_retention_days)
    order by occurred_at, id limit p_batch_size
  )
  delete from site_private.admin_audit_log log using candidates
  where log.id = candidates.id;
  get diagnostics v_writes = row_count;

  with candidates as (
    select id from site_private.admin_ddl_log
    where occurred_at < now() - make_interval(days => p_retention_days)
    order by occurred_at, id limit p_batch_size
  )
  delete from site_private.admin_ddl_log log using candidates
  where log.id = candidates.id;
  get diagnostics v_ddl = row_count;
  return jsonb_build_object('writesDeleted', v_writes, 'ddlDeleted', v_ddl);
end;
$$;

-- 3. Quota atômica e limite de pendências para pedidos de ajuste autenticados.
alter table site_private.rate_limit_buckets drop constraint if exists rate_limit_buckets_request_kind_check;
alter table site_private.rate_limit_buckets add constraint rate_limit_buckets_request_kind_check
  check (request_kind in ('quote', 'contact', 'adjustment'));

create or replace function site_private.consume_rate_limit(
  p_request_kind text,
  p_identifier_hash text,
  p_limit integer,
  p_window interval
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_count integer;
begin
  if p_request_kind not in ('quote', 'contact', 'adjustment')
    or p_identifier_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1 or p_window <= interval '0 seconds' then
    raise exception using errcode = '22023', message = 'invalid_rate_limit_input';
  end if;
  insert into site_private.rate_limit_buckets as bucket (
    request_kind, identifier_hash, window_started_at, request_count, updated_at
  ) values (p_request_kind, p_identifier_hash, now(), 1, now())
  on conflict (request_kind, identifier_hash) do update set
    request_count = case when bucket.window_started_at <= now() - p_window then 1 else bucket.request_count + 1 end,
    window_started_at = case when bucket.window_started_at <= now() - p_window then now() else bucket.window_started_at end,
    updated_at = now()
  returning request_count into v_count;
  if v_count > p_limit then
    raise exception using errcode = 'P0001', message = 'rate_limit_exceeded';
  end if;
end;
$$;

create or replace function public.request_my_quote_adjustment(
  p_request_id uuid,
  p_message text,
  p_client_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_adjustment_id uuid;
  v_created_at timestamptz;
  v_message text := left(trim(coalesce(p_message, '')), 800);
  v_client_request_id text := left(trim(coalesce(p_client_request_id, '')), 100);
  v_identifier_hash text;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  -- Serializa as decisões de idempotência/quota/limite do mesmo pedido. Sem o
  -- lock, duas transações poderiam observar apenas duas pendências e ambas
  -- inserir a quarta linha.
  perform 1 from site_private.quote_requests request
  where request.id = p_request_id and request.customer_user_id = v_user_id and request.status <> 'spam'
  for update;
  if p_request_id is null or not found then
    raise exception using errcode = '42501', message = 'quote_not_found';
  end if;
  if length(v_message) < 2 then raise exception using errcode = '22023', message = 'adjustment_message_required'; end if;
  if v_client_request_id !~ '^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,99}$' then
    raise exception using errcode = '22023', message = 'invalid_client_request_id';
  end if;

  select adjustment.id, adjustment.created_at into v_adjustment_id, v_created_at
  from site_private.quote_adjustment_requests adjustment
  where adjustment.quote_request_id = p_request_id
    and adjustment.requested_by = v_user_id
    and adjustment.client_request_id = v_client_request_id;
  if found then return jsonb_build_object('id', v_adjustment_id, 'createdAt', v_created_at); end if;

  if (select count(*) from site_private.quote_adjustment_requests adjustment
      where adjustment.quote_request_id = p_request_id and adjustment.requested_by = v_user_id
        and adjustment.status in ('new', 'triaged')) >= 3 then
    raise exception using errcode = 'P0001', message = 'too_many_pending_adjustments';
  end if;
  v_identifier_hash := encode(sha256(convert_to(v_user_id::text || ':' || p_request_id::text, 'UTF8')), 'hex');
  perform site_private.consume_rate_limit('adjustment', v_identifier_hash, 5, interval '1 hour');

  insert into site_private.quote_adjustment_requests (quote_request_id, requested_by, client_request_id, message)
  values (p_request_id, v_user_id, v_client_request_id, v_message)
  returning id, created_at into v_adjustment_id, v_created_at;

  insert into site_private.quote_request_events (quote_request_id, event_type, title, description, audience)
  values
    (p_request_id, 'adjustment_requested', 'Pedido de ajuste recebido', v_adjustment_id::text, 'internal'),
    (p_request_id, 'adjustment_requested', 'Pedido de ajuste enviado', 'Nosso time de especialistas vai considerar seu comentário na próxima atualização.', 'customer');
  return jsonb_build_object('id', v_adjustment_id, 'createdAt', v_created_at);
end;
$$;

-- 4. Apagamento do titular: tombstone não reversível por e-mail, remoção do Auth,
-- texto livre anonimizado e blobs enfileirados antes de apagar metadados.
create table site_private.erased_customer_identities (
  email_sha256 text primary key check (email_sha256 ~ '^[0-9a-f]{64}$'),
  erased_at timestamptz not null default now(),
  auth_users_deleted integer not null default 0 check (auth_users_deleted >= 0)
);
alter table site_private.erased_customer_identities enable row level security;
alter table site_private.erased_customer_identities force row level security;
revoke all on site_private.erased_customer_identities from public, anon, authenticated, site_api;
grant select, insert, update on site_private.erased_customer_identities to service_role;
comment on table site_private.erased_customer_identities is
  'Túmulos SHA-256 irreversíveis de identidades apagadas por solicitação LGPD; impedem a reapropriação posterior do histórico sem preservar o e-mail.';
comment on column site_private.erased_customer_identities.email_sha256 is
  'SHA-256 hexadecimal do e-mail normalizado; nunca armazena o endereço original.';
comment on column site_private.erased_customer_identities.auth_users_deleted is
  'Maior quantidade de contas Auth removidas nas execuções idempotentes deste apagamento.';

alter table site_private.storage_deletion_queue drop constraint if exists storage_deletion_queue_bucket_check;
alter table site_private.storage_deletion_queue add constraint storage_deletion_queue_bucket_check
  check (bucket in ('customer-briefing-assets', 'customer-proposals'));

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
  update site_private.quote_requests request set
    contact_name = '[apagado a pedido do titular]', company = '[apagado a pedido do titular]',
    email = 'titular-' || left(md5(request.id::text), 16) || '@erased.invalid',
    phone = '00000000000', city = null, notes = null, customer_user_id = null, updated_at = now()
  where request.id = any(v_quote_ids) and request.contact_name <> '[apagado a pedido do titular]';
  get diagnostics v_quotes = row_count;
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
    'storagePathsToRemove', v_storage_paths
  );
end;
$$;

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
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select lower(user_record.email), nullif(trim(user_record.raw_user_meta_data ->> 'name'), '')
    into v_email, v_name from auth.users user_record
    where user_record.id = v_user_id and user_record.email_confirmed_at is not null;
  if v_email is null then raise exception using errcode = '42501', message = 'verified_email_required'; end if;
  v_email_hash := encode(sha256(convert_to(v_email, 'UTF8')), 'hex');
  if exists (select 1 from site_private.erased_customer_identities erased where erased.email_sha256 = v_email_hash) then
    raise exception using errcode = '42501', message = 'identity_erased';
  end if;
  insert into site_private.customer_profiles (user_id, verified_email, display_name)
  values (v_user_id, v_email, v_name)
  on conflict (user_id) do update set verified_email = excluded.verified_email,
    display_name = coalesce(excluded.display_name, site_private.customer_profiles.display_name), updated_at = now();
  update site_private.quote_requests request set customer_user_id = v_user_id, updated_at = now()
  where request.customer_user_id is null and request.status <> 'spam' and lower(request.email) = v_email;
  get diagnostics v_claimed = row_count;
  return jsonb_build_object('claimed', v_claimed, 'email', v_email);
end;
$$;

-- A fila de Storage passa a drenar também propostas enfileiradas pelo apagamento.
create or replace function public.get_briefing_asset_retention_candidates(p_batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_items jsonb;
begin
  if p_batch_size not between 1 and 500 then raise exception using errcode = '22023', message = 'invalid_batch_size'; end if;
  with raw_candidates as (
    select queued.bucket, queued.object_path, queued.queued_at
    from site_private.storage_deletion_queue queued
    union all
    select asset.storage_bucket, asset.storage_path, asset.expires_at
    from site_private.customer_briefing_assets asset
    where asset.expires_at <= now()
  ), candidates as (
    select candidate.bucket, candidate.object_path, min(candidate.queued_at) as queued_at
    from raw_candidates candidate
    group by candidate.bucket, candidate.object_path
    order by min(candidate.queued_at), candidate.bucket, candidate.object_path
    limit p_batch_size
  )
  select coalesce(jsonb_agg(jsonb_build_object('bucket', candidate.bucket, 'path', candidate.object_path)
    order by candidate.queued_at, candidate.bucket, candidate.object_path), '[]'::jsonb)
  into v_items
  from candidates candidate;
  return jsonb_build_object('objects', v_items);
end;
$$;

create or replace function public.finalize_site_storage_retention(
  p_objects jsonb,
  p_batch_size integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assets integer := 0;
  v_queue integer := 0;
begin
  if p_batch_size not between 1 and 500
    or jsonb_typeof(coalesce(p_objects, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_objects, '[]'::jsonb)) > p_batch_size
    or exists (
      select 1
      from jsonb_array_elements(coalesce(p_objects, '[]'::jsonb)) item
      where jsonb_typeof(item) <> 'object'
        or item ->> 'bucket' not in ('customer-briefing-assets', 'customer-proposals')
        or length(coalesce(item ->> 'path', '')) not between 2 and 500
        or (item ->> 'path') ~ '(^|/)\.\.(/|$)'
    ) then
    raise exception using errcode = '22023', message = 'invalid_site_storage_retention_input';
  end if;

  delete from site_private.customer_briefing_assets asset
  using jsonb_array_elements(coalesce(p_objects, '[]'::jsonb)) item
  where item ->> 'bucket' = 'customer-briefing-assets'
    and asset.storage_bucket = item ->> 'bucket'
    and asset.storage_path = item ->> 'path'
    and asset.expires_at <= now();
  get diagnostics v_assets = row_count;

  delete from site_private.storage_deletion_queue queued
  using jsonb_array_elements(coalesce(p_objects, '[]'::jsonb)) item
  where queued.bucket = item ->> 'bucket'
    and queued.object_path = item ->> 'path';
  get diagnostics v_queue = row_count;

  return jsonb_build_object('assetsDeleted', v_assets, 'queueEntriesDeleted', v_queue);
end;
$$;

-- 5. Intenção durável antes do envio WhatsApp. A API da Meta não fornece uma
-- chave de idempotência: depois que a chamada externa começa, uma perda de rede
-- não permite distinguir aceite de rejeição. O marcador impede reenvio cego e
-- coloca o caso no alerta operacional para reconciliação humana.
create or replace function public.record_site_notification_dispatch_started(
  p_delivery_id uuid,
  p_lease_token uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare v_updated integer;
begin
  update site_private.notification_deliveries delivery
  set last_error_code = 'whatsapp_dispatch_started', last_error_at = now(), updated_at = now()
  where delivery.id = p_delivery_id
    and delivery.status = 'processing'
    and delivery.channel = 'whatsapp'
    and delivery.lease_token = p_lease_token
    and delivery.provider_message_id is null
    and delivery.last_error_code is distinct from 'whatsapp_dispatch_started';
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.claim_site_notification_deliveries(
  p_channels text[],
  p_batch_size integer default 10
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_policy record;
  v_jobs jsonb;
begin
  select * into v_policy from site_private.notification_policy();
  if p_batch_size not between 1 and v_policy.batch_max
    or p_channels is null
    or cardinality(p_channels) not between 1 and 2
    or exists (select 1 from unnest(p_channels) channel where channel not in ('email', 'whatsapp')) then
    raise exception using errcode = '22023', message = 'invalid_notification_claim_input';
  end if;

  with exhausted_candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(p_channels)
      and delivery.attempts >= v_policy.max_attempts
      and (delivery.last_error_code is distinct from 'whatsapp_dispatch_started' or delivery.provider_message_id is not null)
      and (
        delivery.status in ('pending', 'failed')
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now())
      )
    for update of delivery skip locked
  )
  update site_private.notification_deliveries delivery
  set status = 'exhausted', lease_token = null, lease_expires_at = null, updated_at = now()
  from exhausted_candidates
  where delivery.id = exhausted_candidates.id;

  with candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(p_channels)
      and delivery.attempts < v_policy.max_attempts
      and (delivery.last_error_code is distinct from 'whatsapp_dispatch_started' or delivery.provider_message_id is not null)
      and (
        (delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now())
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now())
      )
    order by delivery.next_attempt_at, delivery.created_at, delivery.id
    for update of delivery skip locked
    limit p_batch_size
  ), claimed as (
    update site_private.notification_deliveries delivery
    set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
        lease_token = gen_random_uuid(), claimed_at = now(),
        lease_expires_at = now() + v_policy.lease_timeout
    from candidates
    where delivery.id = candidates.id
    returning delivery.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', claimed.id, 'leaseToken', claimed.lease_token,
    'existingProvider', claimed.provider, 'existingProviderMessageId', claimed.provider_message_id,
    'requestId', request.id, 'channel', claimed.channel, 'attempt', claimed.attempts,
    'protocol', request.protocol, 'recipientEmail', request.email, 'recipientPhone', request.phone,
    'contactName', request.contact_name, 'company', request.company, 'submittedAt', request.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', item.product_name_snapshot, 'sku', item.sku_snapshot,
        'quantity', item.quantity, 'colorName', item.color_name_snapshot
      ) order by item.position)
      from site_private.quote_items item where item.quote_request_id = request.id
    ), '[]'::jsonb)
  ) order by claimed.created_at, claimed.id), '[]'::jsonb)
  into v_jobs
  from claimed
  join site_private.quote_requests request on request.id = claimed.request_id;
  return v_jobs;
end;
$$;

create or replace function public.site_notification_queue_health()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'channel', c.channel,
    'oldestEligibleAgeSeconds', case when stats.eligible_count > 0
      then extract(epoch from (now() - stats.oldest_eligible_created_at))::bigint else null end,
    'eligibleCount', coalesce(stats.eligible_count, 0),
    'exhaustedCount', coalesce(stats.exhausted_count, 0),
    'uncertainCount', coalesce(stats.uncertain_count, 0)
  ) order by c.channel), '[]'::jsonb)
  from unnest(array['email', 'whatsapp']) as c(channel)
  left join lateral (
    select
      min(delivery.created_at) filter (
        where delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now()
      ) as oldest_eligible_created_at,
      count(*) filter (
        where delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now()
      ) as eligible_count,
      count(*) filter (where delivery.status = 'exhausted') as exhausted_count,
      count(*) filter (
        where delivery.last_error_code = 'whatsapp_dispatch_started'
          and delivery.provider_message_id is null
      ) as uncertain_count
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = c.channel
  ) stats on true;
$$;

-- 6. Least privilege explícito para funções de trigger/event trigger. Permissão
-- de EXECUTE não é reavaliada durante o disparo de um trigger já criado.
do $$
declare v_function regprocedure;
begin
  for v_function in
    select p.oid::regprocedure from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'site_private' and p.prorettype in ('trigger'::regtype, 'event_trigger'::regtype)
  loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role, site_api', v_function);
  end loop;
end;
$$;

revoke all on function site_private.audit_actor() from public, anon, authenticated, service_role, site_api;
revoke all on function public.purge_site_admin_audit_logs(integer, integer) from public, anon, authenticated;
grant execute on function public.purge_site_admin_audit_logs(integer, integer) to site_api, service_role;
revoke all on function public.record_site_notification_dispatch_started(uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_site_notification_dispatch_started(uuid, uuid) to site_api, service_role;
revoke all on function public.finalize_site_storage_retention(jsonb, integer) from public, anon, authenticated;
grant execute on function public.finalize_site_storage_retention(jsonb, integer) to site_api, service_role;
revoke all on function public.erase_customer_data(text) from public, anon, authenticated, site_api;
grant execute on function public.erase_customer_data(text) to service_role;

comment on function public.erase_customer_data(text) is
  'Apagamento administrativo idempotente: anonimiza registros e texto livre, enfileira blobs, registra tombstone SHA-256, remove Auth/sessões por cascade e impede novo claim do mesmo e-mail.';
comment on function public.purge_site_admin_audit_logs(integer, integer) is
  'Remove em lotes trilhas administrativas além da janela configurada; padrão 400 dias.';
comment on function public.record_site_notification_dispatch_started(uuid, uuid) is
  'Persiste intenção WhatsApp antes da chamada externa; sem confirmação do marcador, a Meta não é chamada. Um envio incerto exige reconciliação humana e nunca é reenviado cegamente.';
comment on function public.finalize_site_storage_retention(jsonb, integer) is
  'Finaliza metadados somente depois que a API removeu, por bucket, todos os objetos privados informados.';
