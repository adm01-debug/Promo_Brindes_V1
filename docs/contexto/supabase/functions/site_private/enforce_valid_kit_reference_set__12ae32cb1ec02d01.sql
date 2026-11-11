CREATE OR REPLACE FUNCTION site_private.enforce_valid_kit_reference_set()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform site_private.normalize_selection_references(pg_catalog.to_jsonb(new) -> tg_argv[0]);
  return new;
exception when sqlstate '22023' then
  raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
end;
$function$
