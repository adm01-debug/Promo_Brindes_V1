CREATE OR REPLACE FUNCTION site_private.enforce_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if not exists (
    select 1 from site_private.status_transitions t
    where t.entity = tg_table_name and t.from_status = old.status and t.to_status = new.status
  ) then
    raise exception using errcode = '22023',
      message = format('invalid_status_transition: %s.%s -> %s not allowed for %s', tg_table_name, old.status, new.status, old.id);
  end if;
  return new;
end;
$function$
