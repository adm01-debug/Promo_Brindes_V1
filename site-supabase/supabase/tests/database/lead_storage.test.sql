begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

select is(
  (select count(*) from pg_catalog.pg_tables where schemaname = 'site_private'),
  9::bigint,
  'schema privado contém as nove tabelas planejadas'
);

select ok(
  (select bool_and(c.relrowsecurity)
   from pg_catalog.pg_class c
   join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'site_private' and c.relkind = 'r'),
  'RLS está ativo em todas as tabelas privadas'
);

select ok(not pg_catalog.has_schema_privilege('anon', 'site_private', 'usage'), 'anon não usa o schema privado');
select ok(not pg_catalog.has_schema_privilege('authenticated', 'site_private', 'usage'), 'authenticated não usa o schema privado');
select ok(pg_catalog.has_schema_privilege('service_role', 'site_private', 'usage'), 'service_role usa o schema privado');

select ok(
  not pg_catalog.has_function_privilege('anon', 'public.create_site_quote_request(jsonb,jsonb)', 'execute'),
  'anon não executa o RPC de orçamento'
);
select ok(
  not pg_catalog.has_function_privilege('authenticated', 'public.create_site_quote_request(jsonb,jsonb)', 'execute'),
  'authenticated não executa o RPC de orçamento'
);
select ok(
  pg_catalog.has_function_privilege('service_role', 'public.create_site_quote_request(jsonb,jsonb)', 'execute'),
  'service_role executa o RPC de orçamento'
);
select ok(
  not pg_catalog.has_function_privilege('anon', 'public.create_site_contact_request(jsonb,jsonb)', 'execute'),
  'anon não executa o RPC de contato'
);
select ok(
  pg_catalog.has_function_privilege('service_role', 'public.create_site_contact_request(jsonb,jsonb)', 'execute'),
  'service_role executa o RPC de contato'
);

select ok(
  (select bool_and(not p.prosecdef)
   from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('create_site_quote_request', 'create_site_contact_request')),
  'RPCs públicos usam security invoker'
);

select ok(
  (select bool_and(array_to_string(p.proconfig, ',') = 'search_path=""')
   from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where (n.nspname = 'public' and p.proname in ('create_site_quote_request', 'create_site_contact_request'))
      or (n.nspname = 'site_private' and p.proname in ('consume_rate_limit', 'set_updated_at'))),
  'todas as funções fixam search_path vazio'
);

select is(
  (select count(*) from pg_catalog.pg_policies where schemaname = 'site_private'),
  0::bigint,
  'nenhuma policy concede acesso direto a clientes'
);

select ok(
  not pg_catalog.has_table_privilege('anon', 'site_private.quote_requests', 'select,insert,update,delete'),
  'anon não possui privilégios na tabela de orçamentos'
);

select ok(
  to_regprocedure('public.rls_auto_enable()') is null
    or not pg_catalog.has_function_privilege('anon', 'public.rls_auto_enable()', 'execute'),
  'anon não executa o helper automático de RLS'
);

select ok(
  to_regprocedure('public.rls_auto_enable()') is null
    or not pg_catalog.has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute'),
  'authenticated não executa o helper automático de RLS'
);

select * from finish();
rollback;
