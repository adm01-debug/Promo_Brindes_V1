-- Novos objetos públicos precisam nascer deny-by-default. RLS não cobre TRUNCATE,
-- sequências nem EXECUTE, portanto este contrato é validado criando objetos futuros.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(7);

-- As migrations do produto são aplicadas pela role postgres. A plataforma mantém
-- defaults próprios de supabase_admin para objetos internos; eles não são alteráveis
-- pela role de migration e não fazem parte do schema versionado deste site.
set local role postgres;
create table public.default_acl_future_table (id bigint generated always as identity primary key);
create sequence public.default_acl_future_sequence;
create function public.default_acl_future_function() returns integer language sql as $$ select 1 $$;

select ok(
  not pg_catalog.has_table_privilege('anon', 'public.default_acl_future_table', 'select,insert,update,delete,truncate,references,trigger'),
  'anon não recebe nenhum privilégio implícito em futura tabela pública'
);
select ok(
  not pg_catalog.has_table_privilege('authenticated', 'public.default_acl_future_table', 'select,insert,update,delete,truncate,references,trigger'),
  'authenticated não recebe nenhum privilégio implícito em futura tabela pública'
);
select ok(
  not pg_catalog.has_sequence_privilege('anon', 'public.default_acl_future_sequence', 'usage,select,update'),
  'anon não recebe privilégio implícito em futura sequência pública'
);
select ok(
  not pg_catalog.has_sequence_privilege('authenticated', 'public.default_acl_future_sequence', 'usage,select,update'),
  'authenticated não recebe privilégio implícito em futura sequência pública'
);
select ok(
  not pg_catalog.has_function_privilege('anon', 'public.default_acl_future_function()', 'execute'),
  'anon não executa futura função pública sem grant explícito'
);
select ok(
  not pg_catalog.has_function_privilege('authenticated', 'public.default_acl_future_function()', 'execute'),
  'authenticated não executa futura função pública sem grant explícito'
);
select ok(
  pg_catalog.has_table_privilege(current_user, 'public.default_acl_future_table', 'select,insert,update,delete,truncate,references,trigger'),
  'o proprietário administrativo conserva controle do objeto futuro'
);

select * from finish();
rollback;
