CREATE OR REPLACE FUNCTION site_private.log_admin_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row_id text;
  v_actor text := site_private.audit_actor();
begin
  if v_actor in ('site_api', 'service_role') then
    return coalesce(new, old);
  end if;
  begin
    v_row_id := to_jsonb(case when tg_op = 'DELETE' then old else new end) ->> 'id';
  exception when others then
    v_row_id := null;
  end;
  insert into site_private.admin_audit_log (table_name, operation, row_id, performed_by, application_name)
  values (tg_table_name, tg_op, v_row_id, v_actor, current_setting('application_name', true));
  return coalesce(new, old);
end;
$function$
