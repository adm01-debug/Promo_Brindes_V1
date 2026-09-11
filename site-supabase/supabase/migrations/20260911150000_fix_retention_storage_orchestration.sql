-- A Storage API, e não SQL direto, é a única autoridade para excluir objetos.
-- Aplicar exclusivamente no Supabase isolado: xlzmclcjdncjfdrjxclt.
-- Nunca aplicar no catálogo canônico: doufsxqlfjyuvxuezpln.

drop function if exists public.run_site_data_retention(integer);
drop function if exists site_private.purge_expired_site_data(timestamptz, integer);

create or replace function site_private.get_expired_site_data_candidates(
  p_batch_size integer default 100
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quote_ids uuid[] := '{}'::uuid[];
  v_storage_paths text[] := '{}'::text[];
begin
  if p_batch_size not between 1 and 100 then
    raise exception using errcode = '22023', message = 'invalid_retention_batch_size';
  end if;

  select coalesce(array_agg(expired.id order by expired.retention_until, expired.id), '{}'::uuid[])
    into v_quote_ids
  from (
    select request.id, request.retention_until
    from site_private.quote_requests request
    where request.retention_until <= now()
    order by request.retention_until, request.id
    limit p_batch_size
  ) expired;

  select coalesce(array_agg(pending.storage_path order by pending.storage_path), '{}'::text[])
    into v_storage_paths
  from (
    select document.storage_path
    from site_private.proposal_documents document
    where document.quote_request_id = any(v_quote_ids)
      and document.storage_bucket = 'customer-proposals'
    order by document.storage_path
    limit p_batch_size * 20
  ) pending;

  return jsonb_build_object(
    'quoteIds', to_jsonb(v_quote_ids),
    'storagePaths', to_jsonb(v_storage_paths)
  );
end;
$$;

create or replace function site_private.finalize_expired_site_data(
  p_quote_ids uuid[] default '{}'::uuid[],
  p_storage_paths text[] default '{}'::text[],
  p_batch_size integer default 100
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted_quote_ids uuid[] := '{}'::uuid[];
  v_contact_ids uuid[] := '{}'::uuid[];
  v_quotes_deleted integer := 0;
  v_documents_deleted integer := 0;
  v_contacts_deleted integer := 0;
  v_notifications_deleted integer := 0;
  v_rate_limits_deleted integer := 0;
  v_deleted integer := 0;
begin
  if p_batch_size not between 1 and 100
    or coalesce(cardinality(p_quote_ids), 0) > p_batch_size
    or coalesce(cardinality(p_storage_paths), 0) > p_batch_size * 20
    or exists (select 1 from unnest(coalesce(p_storage_paths, '{}'::text[])) path where length(path) not between 2 and 500 or path ~ '(^|/)\.\.(/|$)') then
    raise exception using errcode = '22023', message = 'invalid_retention_finalize_input';
  end if;

  -- Os caminhos só chegam aqui depois de a rota server-side obter sucesso na Storage API.
  -- Os blobs são removidos pelo serviço de retenção via Storage API; esta função só finaliza metadados confirmados.
  delete from site_private.proposal_documents document
  where document.quote_request_id = any(coalesce(p_quote_ids, '{}'::uuid[]))
    and document.storage_bucket = 'customer-proposals'
    and document.storage_path = any(coalesce(p_storage_paths, '{}'::text[]));
  get diagnostics v_documents_deleted = row_count;

  with deleted_quotes as (
    delete from site_private.quote_requests request
    where request.id = any(coalesce(p_quote_ids, '{}'::uuid[]))
      and request.retention_until <= now()
      and not exists (
        select 1
        from site_private.proposal_documents document
        where document.quote_request_id = request.id
      )
    returning request.id
  )
  select coalesce(array_agg(id), '{}'::uuid[]) into v_deleted_quote_ids from deleted_quotes;
  v_quotes_deleted := coalesce(cardinality(v_deleted_quote_ids), 0);

  delete from site_private.notification_deliveries delivery
  where delivery.request_kind = 'quote'
    and delivery.request_id = any(v_deleted_quote_ids);
  get diagnostics v_notifications_deleted = row_count;

  select coalesce(array_agg(expired.id), '{}'::uuid[]) into v_contact_ids
  from (
    select request.id
    from site_private.contact_requests request
    where request.retention_until <= now()
    order by request.retention_until, request.id
    limit p_batch_size
  ) expired;

  delete from site_private.notification_deliveries delivery
  where delivery.request_kind = 'contact'
    and delivery.request_id = any(v_contact_ids);
  get diagnostics v_deleted = row_count;
  v_notifications_deleted := v_notifications_deleted + v_deleted;

  delete from site_private.contact_requests request
  where request.id = any(v_contact_ids);
  get diagnostics v_contacts_deleted = row_count;

  delete from site_private.rate_limit_buckets bucket
  where bucket.updated_at <= now() - interval '30 days';
  get diagnostics v_rate_limits_deleted = row_count;

  return jsonb_build_object(
    'quotesDeleted', v_quotes_deleted,
    'proposalDocumentsDeleted', v_documents_deleted,
    'contactsDeleted', v_contacts_deleted,
    'notificationsDeleted', v_notifications_deleted,
    'rateLimitBucketsDeleted', v_rate_limits_deleted
  );
end;
$$;

create or replace function public.get_site_data_retention_candidates(p_batch_size integer default 100)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select site_private.get_expired_site_data_candidates(p_batch_size);
$$;

create or replace function public.finalize_site_data_retention(
  p_quote_ids uuid[],
  p_storage_paths text[],
  p_batch_size integer default 100
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select site_private.finalize_expired_site_data(p_quote_ids, p_storage_paths, p_batch_size);
$$;

revoke all on function site_private.get_expired_site_data_candidates(integer), site_private.finalize_expired_site_data(uuid[], text[], integer) from public, anon, authenticated;
revoke all on function public.get_site_data_retention_candidates(integer), public.finalize_site_data_retention(uuid[], text[], integer) from public, anon, authenticated;
grant execute on function site_private.get_expired_site_data_candidates(integer), site_private.finalize_expired_site_data(uuid[], text[], integer) to service_role;
grant execute on function public.get_site_data_retention_candidates(integer), public.finalize_site_data_retention(uuid[], text[], integer) to service_role;

revoke all on function site_private.consume_rate_limit(text, text, integer, interval), site_private.set_updated_at(), site_private.record_quote_status_event() from public, anon, authenticated;
grant execute on function site_private.consume_rate_limit(text, text, integer, interval), site_private.set_updated_at(), site_private.record_quote_status_event() to service_role;

comment on function site_private.get_expired_site_data_candidates(integer) is
  'Lista identificadores e caminhos expirados para exclusão obrigatória pela Storage API server-side.';
comment on function site_private.finalize_expired_site_data(uuid[], text[], integer) is
  'Remove apenas metadados cujos objetos já foram excluídos pela Storage API e preserva quotes com documentos pendentes.';
