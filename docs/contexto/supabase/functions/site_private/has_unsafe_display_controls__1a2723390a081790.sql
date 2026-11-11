CREATE OR REPLACE FUNCTION site_private.has_unsafe_display_controls(p_value text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(p_value, '') ~ '[[:cntrl:]]'
    or strpos(coalesce(p_value, ''), chr(8203)) > 0
    or strpos(coalesce(p_value, ''), chr(8206)) > 0
    or strpos(coalesce(p_value, ''), chr(8207)) > 0
    or strpos(coalesce(p_value, ''), chr(8288)) > 0
    or strpos(coalesce(p_value, ''), chr(65279)) > 0
    or exists (select 1 from generate_series(8234, 8238) point where strpos(coalesce(p_value, ''), chr(point)) > 0)
    or exists (select 1 from generate_series(8294, 8297) point where strpos(coalesce(p_value, ''), chr(point)) > 0)
$function$
