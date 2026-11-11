CREATE OR REPLACE FUNCTION site_private.consume_shared_selection_action_limit(p_identifier_hash text, p_limit integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_count integer;
begin
  if coalesce(p_identifier_hash, '') !~ '^[0-9a-f]{64}$' or p_limit not between 1 and 240 then
    raise exception using errcode = '22023', message = 'invalid_shared_selection_rate_limit';
  end if;
  insert into site_private.shared_selection_rate_limits as bucket (identifier_hash, window_started_at, request_count, updated_at)
  values (p_identifier_hash, now(), 1, now())
  on conflict (identifier_hash) do update
  set request_count = case when bucket.window_started_at <= now() - interval '1 hour' then 1 else bucket.request_count + 1 end,
      window_started_at = case when bucket.window_started_at <= now() - interval '1 hour' then now() else bucket.window_started_at end,
      updated_at = now()
  returning request_count into v_count;
  if v_count > p_limit then raise exception using errcode = 'P0001', message = 'shared_selection_rate_limit_exceeded'; end if;
end;
$function$
