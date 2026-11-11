CREATE OR REPLACE FUNCTION site_private.get_expired_site_data_candidates(p_batch_size integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
