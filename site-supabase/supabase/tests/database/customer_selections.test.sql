begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(26);

select has_table('site_private', 'customer_selections', 'seleções privadas por titular existem');
select ok((select c.relrowsecurity and c.relforcerowsecurity from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'site_private' and c.relname = 'customer_selections'), 'RLS é forçada na tabela');
select ok(not pg_catalog.has_schema_privilege('authenticated', 'site_private', 'usage'), 'cliente não acessa o schema privado');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.customer_selections', 'select'), 'cliente não consulta tabela diretamente');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.list_my_selections(boolean)', 'execute'), 'conta autenticada pode listar pelo RPC');
select ok(not pg_catalog.has_function_privilege('anon', 'public.list_my_selections(boolean)', 'execute'), 'visitante anônimo não lista seleções');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.purge_archived_customer_selections(integer)', 'execute'), 'visitante não executa purga');
select ok(pg_catalog.has_function_privilege('site_api', 'public.purge_archived_customer_selections(integer)', 'execute'), 'tarefa limitada pode purgar arquivados');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'selecao-ana@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'selecao-bia@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
create temporary table saved_a as
select public.save_my_selection('Campanha de boas-vindas',
  '[{"id":"11111111-1111-4111-8111-111111111111","q":100,"d":"alternative"}]'::jsonb,
  '{"source":"finder","moment":"onboarding"}'::jsonb) as result;

select is((select (result ->> 'version')::integer from saved_a), 1, 'seleção começa na versão 1');
select is(jsonb_array_length(public.list_my_selections() -> 'items'), 1, 'titular lista a própria seleção');
select is(public.list_my_selections() #>> '{items,0,references,0,d}', 'alternative', 'grupo decisório persiste');
select is((public.save_my_selection('Campanha atualizada',
  '[{"id":"11111111-1111-4111-8111-111111111111","q":120}]'::jsonb,
  null, (select (result ->> 'id')::uuid from saved_a), 1) ->> 'version')::integer,
  2, 'salvamento exige versão atual e a incrementa');
select throws_ok(
  $$ select public.save_my_selection('Edição antiga', '[{"id":"11111111-1111-4111-8111-111111111111","q":1}]'::jsonb, null, (select (result ->> 'id')::uuid from saved_a), 1) $$,
  'P0001', 'selection_version_conflict', 'edição obsoleta não sobrescreve a nova');
select throws_ok(
  $$ select public.save_my_selection('Duplicada', '[{"id":"11111111-1111-4111-8111-111111111111","q":1},{"id":"11111111-1111-4111-8111-111111111111","q":2}]'::jsonb) $$,
  '22023', 'duplicate_selection_reference', 'referência repetida não é gravada');
select throws_ok(
  $$ select public.save_my_selection('Falsa', '[{"id":"../../segredo","q":1}]'::jsonb) $$,
  '22023', 'invalid_selection_reference', 'ID inválido não é gravado');

set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';
select is(jsonb_array_length(public.list_my_selections() -> 'items'), 0, 'outra conta não enxerga a seleção');
select throws_ok(
  $$ select public.set_my_selection_archived((select (result ->> 'id')::uuid from saved_a), 2, true) $$,
  'P0001', 'selection_version_conflict', 'outra conta não arquiva seleção alheia');
select throws_ok(
  $$ select public.delete_my_selection((select (result ->> 'id')::uuid from saved_a), 2) $$,
  'P0001', 'selection_version_conflict', 'outra conta não exclui seleção alheia');

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
select is((public.set_my_selection_archived((select (result ->> 'id')::uuid from saved_a), 2, true) ->> 'version')::integer,
  3, 'arquivar incrementa versão');
select is(jsonb_array_length(public.list_my_selections() -> 'items'), 0, 'arquivado some da lista ativa');
select is(jsonb_array_length(public.list_my_selections(true) -> 'items'), 1, 'arquivado continua recuperável');
select is((public.set_my_selection_archived((select (result ->> 'id')::uuid from saved_a), 3, false) ->> 'version')::integer,
  4, 'restaurar incrementa versão');
select is(jsonb_array_length(public.list_my_selections() -> 'items'), 1, 'restaurado reaparece na lista ativa');

insert into site_private.customer_profiles (user_id, verified_email)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'selecao-ana@example.test');
select is((public.erase_customer_data('selecao-ana@example.test') ->> 'profilesAnonymized')::integer, 1,
  'pedido de apagamento alcança o perfil');
select is((select count(*) from site_private.customer_selections
  where customer_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0::bigint,
  'pedido de apagamento remove todas as seleções da conta');

set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';
create temporary table saved_b as select public.save_my_selection('Arquivar depois',
  '[{"id":"22222222-2222-4222-8222-222222222222","q":20}]'::jsonb) as result;
select public.set_my_selection_archived((select (result ->> 'id')::uuid from saved_b), 1, true);
update site_private.customer_selections set archived_at = now() - interval '91 days'
where id = (select (result ->> 'id')::uuid from saved_b);
select is(public.purge_archived_customer_selections(100), 1, 'purga remove somente arquivados após 90 dias');

select * from finish();
rollback;
