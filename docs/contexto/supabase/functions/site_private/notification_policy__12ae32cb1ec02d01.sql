CREATE OR REPLACE FUNCTION site_private.notification_policy()
 RETURNS TABLE(max_attempts smallint, lease_timeout interval, batch_max integer, retry_base_seconds integer, retry_cap_seconds integer)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select 5::smallint, interval '10 minutes', 25, 60, 3600;
$function$
