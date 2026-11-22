CREATE OR REPLACE FUNCTION public.record_cron_heartbeat(p_name text, p_ok boolean, p_detail text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_name not in ('retention', 'notifications', 'commercial-alerts') then
    raise exception 'unknown_cron_name' using errcode = '22023';
  end if;
  if p_ok is null then
    raise exception 'invalid_cron_outcome' using errcode = '22023';
  end if;

  insert into site_private.cron_heartbeats (name) values (p_name)
  on conflict (name) do nothing;

  update site_private.cron_heartbeats
     set last_ok_at = case when p_ok then now() else last_ok_at end,
         last_failed_at = case when p_ok then last_failed_at else now() end,
         last_failure_detail = case when p_ok then null else left(coalesce(p_detail, 'unknown'), 240) end,
         consecutive_failures = case when p_ok then 0 else consecutive_failures + 1 end,
         updated_at = now()
   where name = p_name;
end;
$function$
