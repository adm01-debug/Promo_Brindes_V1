-- Etapa 26 do plano de correções: toda tabela de site_private tem RLS habilitada E
-- forçada, e nenhum grant para public/anon/authenticated. Varre pg_tables/pg_class em
-- vez de listar tabelas uma a uma — pega automaticamente qualquer tabela nova que
-- esqueça o padrão, sem precisar lembrar de atualizar este teste.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(3);

select is(
  (select count(*) from pg_tables where schemaname = 'site_private'),
  (
    select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'site_private' and c.relkind = 'r' and c.relrowsecurity
  ),
  'toda tabela de site_private tem row level security habilitada (rowsecurity)'
);

select is(
  (select count(*) from pg_tables where schemaname = 'site_private'),
  (
    select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'site_private' and c.relkind = 'r' and c.relforcerowsecurity
  ),
  'toda tabela de site_private tem row level security FORÇADA (Etapa 26) — nem o dono bypassa sem bypassrls explícito'
);

select is(
  (
    select count(*) from pg_tables t
    where t.schemaname = 'site_private'
      and (
        has_table_privilege('public', format('%I.%I', t.schemaname, t.tablename), 'select,insert,update,delete')
        or has_table_privilege('anon', format('%I.%I', t.schemaname, t.tablename), 'select,insert,update,delete')
        or has_table_privilege('authenticated', format('%I.%I', t.schemaname, t.tablename), 'select,insert,update,delete')
      )
  ),
  0::bigint,
  'nenhuma tabela de site_private concede select/insert/update/delete a public, anon ou authenticated'
);

select * from finish();
rollback;
