-- Etapa 36 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md).
-- Migration aditiva, exclusiva de xlzmclcjdncjfdrjxclt.
--
-- Escopo revisado durante a implementação: o plano original previa marcar cada uma das
-- 18 RPCs com um `set_config('site.rpc', ...)` para o trigger distinguir escrita via
-- RPC de escrita direta. Isso exigiria reabrir e reeditar todas as funções já
-- testadas (Fases 1-5), com risco real de regressão para um ganho que uma abordagem
-- mais simples já entrega: depois da Etapa 25 (site_api) e 26 (force RLS), só duas
-- roles têm grant de escrita nas tabelas de negócio — site_api e service_role
-- (confirmado consultando information_schema.role_table_grants). Qualquer escrita de
-- QUALQUER OUTRA role (postgres via Studio, ou uma role futura por engano) já é, por
-- definição, fora do caminho normal da aplicação. O trigger abaixo audita
-- exatamente isso, sem tocar em nenhuma função existente.

create table site_private.admin_audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  row_id text,
  performed_by text not null,
  application_name text,
  occurred_at timestamptz not null default now()
);

comment on table site_private.admin_audit_log is
  'Etapa 36: audita escritas em tabelas de negócio feitas por qualquer role além de site_api/service_role — ou seja, fora do caminho normal da API (Studio, SQL manual). Não registra o conteúdo da linha, só que uma escrita aconteceu, quem e quando.';

alter table site_private.admin_audit_log enable row level security;
alter table site_private.admin_audit_log force row level security;
revoke all on site_private.admin_audit_log from public, anon, authenticated, site_api;
grant select on site_private.admin_audit_log to service_role;

create or replace function site_private.log_admin_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_id text;
begin
  if current_user in ('site_api', 'service_role') then
    return coalesce(new, old);
  end if;

  begin
    v_row_id := to_jsonb(case when tg_op = 'DELETE' then old else new end) ->> 'id';
  exception when others then
    v_row_id := null;
  end;

  insert into site_private.admin_audit_log (table_name, operation, row_id, performed_by, application_name)
  values (tg_table_name, tg_op, v_row_id, current_user, current_setting('application_name', true));

  return coalesce(new, old);
end;
$$;

comment on function site_private.log_admin_write() is
  'Etapa 36: SECURITY DEFINER de propósito — postgres via Studio não tem grant em admin_audit_log, então sem elevar privilégio aqui a própria auditoria falharia por falta de permissão exatamente na escrita que deveria auditar.';

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'quote_requests', 'quote_items', 'contact_requests', 'notification_deliveries',
    'notification_provider_events', 'customer_profiles', 'quote_request_events',
    'proposal_documents', 'quote_adjustment_requests', 'consent_receipts',
    'shared_selections', 'shared_selection_rate_limits'
  ]
  loop
    execute format(
      'drop trigger if exists %I_log_admin_write on site_private.%I',
      v_table, v_table
    );
    execute format(
      'create trigger %I_log_admin_write after insert or update or delete on site_private.%I for each row execute function site_private.log_admin_write()',
      v_table, v_table
    );
  end loop;
end;
$$;

-- rate_limit_buckets e status_transitions ficam de fora de propósito: a primeira é
-- UNLOGGED e de altíssima rotatividade (Etapa 30) — auditar cada write duplicaria o
-- volume de escrita numa tabela já otimizada para ser barata; a segunda é a própria
-- tabela de política, sem grants de escrita para ninguém além de quem roda migrations.

-- === Event trigger de DDL (parte aditiva original, sem revisão de escopo) ==========

create table site_private.admin_ddl_log (
  id bigint generated always as identity primary key,
  command_tag text not null,
  object_type text,
  schema_name text,
  performed_by text not null,
  occurred_at timestamptz not null default now()
);

comment on table site_private.admin_ddl_log is
  'Etapa 36: DDL (create/alter/drop) fora do fluxo de migrations do CLI. Toda migration legítima também aparece aqui — não é um sinal de problema por si só, é o registro bruto para cruzar com o histórico de migrations quando precisar auditar.';

alter table site_private.admin_ddl_log enable row level security;
alter table site_private.admin_ddl_log force row level security;
revoke all on site_private.admin_ddl_log from public, anon, authenticated, site_api;
grant select on site_private.admin_ddl_log to service_role;

create or replace function site_private.log_admin_ddl()
returns event_trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_object_type text;
  v_schema_name text;
begin
  -- GRANT/REVOKE não populam pg_event_trigger_ddl_commands() com uma linha por objeto
  -- do mesmo jeito que CREATE/ALTER/DROP; agrega para não perder o registro quando a
  -- lista vier vazia — melhor uma linha com detalhe nulo do que nenhuma linha.
  select cmd.object_type, cmd.schema_name into v_object_type, v_schema_name
  from pg_event_trigger_ddl_commands() cmd
  limit 1;

  insert into site_private.admin_ddl_log (command_tag, object_type, schema_name, performed_by)
  values (tg_tag, v_object_type, v_schema_name, current_user);
end;
$$;

drop event trigger if exists log_admin_ddl_trigger;
create event trigger log_admin_ddl_trigger on ddl_command_end
  when tag in (
    'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE FUNCTION', 'ALTER FUNCTION',
    'DROP FUNCTION', 'CREATE INDEX', 'DROP INDEX', 'CREATE TRIGGER', 'DROP TRIGGER',
    'GRANT', 'REVOKE'
  )
  -- CREATE/ALTER/DROP ROLE não são suportados por event trigger (comandos de role são
  -- cluster-wide, fora do framework normal de DDL) — mudanças de role (ex.: a própria
  -- criação de site_api na Etapa 25) não aparecem aqui; só em admin_audit_log se
  -- alguém usar a role para escrever, e no histórico de migrations do CLI.
  execute function site_private.log_admin_ddl();
