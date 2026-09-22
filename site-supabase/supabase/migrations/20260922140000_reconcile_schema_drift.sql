-- Reconcilia objetos existentes no Supabase isolado com o histórico versionado.
-- Aplicar exclusivamente em xlzmclcjdncjfdrjxclt.
-- Nunca aplicar no catálogo canônico doufsxqlfjyuvxuezpln.

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
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
$$;

revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_event_trigger where evtname = 'ensure_rls'
  ) then
    create event trigger ensure_rls
      on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.rls_auto_enable();
  end if;
end;
$$;

alter event trigger ensure_rls enable;

-- Estas RPCs são caminhos do próprio titular. service_role não precisa nem deve
-- contornar o contrato de auth.uid() por meio delas.
revoke execute on function public.list_my_selections(boolean) from service_role;
revoke execute on function public.save_my_selection(text, jsonb, jsonb, uuid, integer) from service_role;
revoke execute on function public.set_my_selection_archived(uuid, integer, boolean) from service_role;
revoke execute on function public.delete_my_selection(uuid, integer) from service_role;

comment on function public.rls_auto_enable() is
  'Guarda DDL do banco isolado: novas tabelas no schema public nascem com RLS habilitada. Sem EXECUTE para roles da API.';
