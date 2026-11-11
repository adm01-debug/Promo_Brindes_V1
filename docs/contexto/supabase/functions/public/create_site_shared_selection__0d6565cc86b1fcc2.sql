CREATE OR REPLACE FUNCTION public.create_site_shared_selection(p_items jsonb, p_management_token_hash text, p_identifier_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_clean_items jsonb;
  v_token uuid;
  v_count integer;
begin
  if coalesce(p_management_token_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_identifier_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_shared_selection_payload';
  end if;
  begin
    v_clean_items := site_private.normalize_selection_references(p_items);
  exception when sqlstate '22023' then
    if sqlerrm = 'duplicate_selection_reference' then
      raise exception using errcode = '22023', message = 'duplicate_shared_selection_item';
    elsif sqlerrm = 'invalid_kit_reference_set' then
      raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
    end if;
    raise exception using errcode = '22023', message = 'invalid_shared_selection_item';
  end;

  insert into site_private.shared_selection_rate_limits as bucket (identifier_hash, window_started_at, request_count, updated_at)
  values (p_identifier_hash, now(), 1, now())
  on conflict (identifier_hash) do update
  set request_count = case when bucket.window_started_at <= now() - interval '1 hour' then 1 else bucket.request_count + 1 end,
      window_started_at = case when bucket.window_started_at <= now() - interval '1 hour' then now() else bucket.window_started_at end,
      updated_at = now()
  returning request_count into v_count;
  if v_count > 12 then raise exception using errcode = 'P0001', message = 'shared_selection_rate_limit_exceeded'; end if;

  insert into site_private.shared_selections (management_token_hash, items)
  values (p_management_token_hash, v_clean_items) returning token into v_token;
  return pg_catalog.jsonb_build_object('token', v_token, 'expiresAt', now() + interval '30 days');
end;
$function$
