CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  command record;
begin
  for command in
    select *
    from pg_catalog.pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if command.schema_name = 'public' then
      begin
        execute pg_catalog.format('alter table if exists %s enable row level security', command.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', command.object_identity;
      exception when others then
        raise log 'rls_auto_enable: failed to enable RLS on %', command.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skipped % in schema %', command.object_identity, command.schema_name;
    end if;
  end loop;
end;
$function$
