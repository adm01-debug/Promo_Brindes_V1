CREATE OR REPLACE FUNCTION site_private.log_admin_ddl()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_object_type text;
  v_schema_name text;
begin
  select cmd.object_type, cmd.schema_name into v_object_type, v_schema_name
  from pg_event_trigger_ddl_commands() cmd
  limit 1;
  insert into site_private.admin_ddl_log (command_tag, object_type, schema_name, performed_by)
  values (tg_tag, v_object_type, v_schema_name, site_private.audit_actor());
end;
$function$
