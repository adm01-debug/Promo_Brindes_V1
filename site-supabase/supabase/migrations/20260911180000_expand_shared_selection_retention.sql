-- Mantém o link persistente equivalente ao limite de 50 itens do moodboard e
-- elimina referências expostas depois do prazo. Aplicar SOMENTE ao projeto
-- isolado xlzmclcjdncjfdrjxclt; nunca ao catálogo canônico.

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_catalog.pg_constraint con
  where con.conrelid = 'site_private.shared_selections'::pg_catalog.regclass
    and con.contype = 'c'
    and pg_catalog.pg_get_constraintdef(con.oid) like '%jsonb_array_length(items)%';

  if constraint_name is not null then
    execute pg_catalog.format('alter table site_private.shared_selections drop constraint %I', constraint_name);
  end if;
end;
$$;

alter table site_private.shared_selections
  add constraint shared_selections_items_count_check check (
    jsonb_typeof(items) = 'array'
    and jsonb_array_length(items) between 1 and 50
  );

create or replace function public.create_site_shared_selection(
  p_items jsonb,
  p_management_token_hash text,
  p_identifier_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_clean_items jsonb := '[]'::jsonb;
  v_token uuid;
  v_count integer;
begin
  if jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) not between 1 and 50
    or coalesce(p_management_token_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_identifier_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_shared_selection_payload';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(v_item ->> 'q', '') !~ '^\d+$'
      or (v_item ->> 'q')::integer not between 1 and 999999
      or (v_item ? 'v' and coalesce(v_item ->> 'v', '') !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$') then
      raise exception using errcode = '22023', message = 'invalid_shared_selection_item';
    end if;

    v_clean_items := v_clean_items || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', lower(v_item ->> 'id'), 'q', (v_item ->> 'q')::integer, 'v', nullif(v_item ->> 'v', '')
    )));
  end loop;

  if (select count(*) from (select distinct value ->> 'id' || ':' || coalesce(value ->> 'v', '') as reference_key from jsonb_array_elements(v_clean_items)) unique_items) <> jsonb_array_length(v_clean_items) then
    raise exception using errcode = '22023', message = 'duplicate_shared_selection_item';
  end if;

  insert into site_private.shared_selection_rate_limits as bucket (identifier_hash, window_started_at, request_count, updated_at)
  values (p_identifier_hash, now(), 1, now())
  on conflict (identifier_hash) do update
  set request_count = case when bucket.window_started_at <= now() - interval '1 hour' then 1 else bucket.request_count + 1 end,
      window_started_at = case when bucket.window_started_at <= now() - interval '1 hour' then now() else bucket.window_started_at end,
      updated_at = now()
  returning request_count into v_count;

  if v_count > 12 then raise exception using errcode = 'P0001', message = 'shared_selection_rate_limit_exceeded'; end if;

  insert into site_private.shared_selections (management_token_hash, items) values (p_management_token_hash, v_clean_items) returning token into v_token;
  return jsonb_build_object('token', v_token, 'expiresAt', now() + interval '30 days');
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
  v_shared_selections_deleted integer := 0;
  v_shared_rate_limits_deleted integer := 0;
  v_deleted integer := 0;
begin
  if p_batch_size not between 1 and 100
    or coalesce(cardinality(p_quote_ids), 0) > p_batch_size
    or coalesce(cardinality(p_storage_paths), 0) > p_batch_size * 20
    or exists (select 1 from unnest(coalesce(p_storage_paths, '{}'::text[])) path where length(path) not between 2 and 500 or path ~ '(^|/)\.\.(/|$)') then
    raise exception using errcode = '22023', message = 'invalid_retention_finalize_input';
  end if;

  delete from site_private.proposal_documents document where document.quote_request_id = any(coalesce(p_quote_ids, '{}'::uuid[])) and document.storage_bucket = 'customer-proposals' and document.storage_path = any(coalesce(p_storage_paths, '{}'::text[]));
  get diagnostics v_documents_deleted = row_count;

  with deleted_quotes as (delete from site_private.quote_requests request where request.id = any(coalesce(p_quote_ids, '{}'::uuid[])) and request.retention_until <= now() and not exists (select 1 from site_private.proposal_documents document where document.quote_request_id = request.id) returning request.id)
  select coalesce(array_agg(id), '{}'::uuid[]) into v_deleted_quote_ids from deleted_quotes;
  v_quotes_deleted := coalesce(cardinality(v_deleted_quote_ids), 0);

  delete from site_private.notification_deliveries delivery where delivery.request_kind = 'quote' and delivery.request_id = any(v_deleted_quote_ids);
  get diagnostics v_notifications_deleted = row_count;

  select coalesce(array_agg(expired.id), '{}'::uuid[]) into v_contact_ids from (select request.id from site_private.contact_requests request where request.retention_until <= now() order by request.retention_until, request.id limit p_batch_size) expired;
  delete from site_private.notification_deliveries delivery where delivery.request_kind = 'contact' and delivery.request_id = any(v_contact_ids);
  get diagnostics v_deleted = row_count;
  v_notifications_deleted := v_notifications_deleted + v_deleted;
  delete from site_private.contact_requests request where request.id = any(v_contact_ids);
  get diagnostics v_contacts_deleted = row_count;

  delete from site_private.rate_limit_buckets bucket where bucket.updated_at <= now() - interval '30 days';
  get diagnostics v_rate_limits_deleted = row_count;
  delete from site_private.shared_selections selection where selection.expires_at <= now() or (selection.revoked_at is not null and selection.revoked_at <= now() - interval '30 days');
  get diagnostics v_shared_selections_deleted = row_count;
  delete from site_private.shared_selection_rate_limits bucket where bucket.updated_at <= now() - interval '30 days';
  get diagnostics v_shared_rate_limits_deleted = row_count;

  return jsonb_build_object('quotesDeleted', v_quotes_deleted, 'proposalDocumentsDeleted', v_documents_deleted, 'contactsDeleted', v_contacts_deleted, 'notificationsDeleted', v_notifications_deleted, 'rateLimitBucketsDeleted', v_rate_limits_deleted, 'sharedSelectionsDeleted', v_shared_selections_deleted, 'sharedSelectionRateLimitsDeleted', v_shared_rate_limits_deleted);
end;
$$;
