CREATE OR REPLACE FUNCTION site_private.normalize_email(p_email text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select lower(btrim(p_email));
$function$
