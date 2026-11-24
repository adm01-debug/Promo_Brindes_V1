CREATE OR REPLACE FUNCTION site_private.email_hash(p_email text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select encode(
    sha256(
      convert_to(site_private.normalize_email(coalesce(p_email, '')), 'UTF8')
    ),
    'hex'
  );
$function$
