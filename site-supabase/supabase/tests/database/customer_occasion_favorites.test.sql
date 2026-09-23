begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

select has_table('site_private', 'customer_occasion_favorites', 'favoritos de datas existem no schema privado');
select ok((select c.relrowsecurity and c.relforcerowsecurity from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'site_private' and c.relname = 'customer_occasion_favorites'), 'RLS é forçada nos favoritos de datas');
select ok(not pg_catalog.has_schema_privilege('authenticated', 'site_private', 'usage'), 'cliente não recebe uso do schema privado');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.customer_occasion_favorites', 'select'), 'cliente não lê a tabela diretamente');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.list_my_occasion_favorites()', 'execute'), 'cliente autenticado lista favoritos pelo RPC');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.set_my_occasion_favorite(text,boolean)', 'execute'), 'cliente autenticado altera favoritos pelo RPC');
select ok(not pg_catalog.has_function_privilege('anon', 'public.list_my_occasion_favorites()', 'execute'), 'anon não lista favoritos');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'abababab-abab-4bab-8bab-abababababab', 'authenticated', 'authenticated', 'datas-ana@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc', 'authenticated', 'authenticated', 'datas-bia@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

set local request.jwt.claims = '{"sub":"abababab-abab-4bab-8bab-abababababab","role":"authenticated"}';
select is((public.set_my_occasion_favorite('Dia-do-Cliente', true) ->> 'occasionId'), 'dia-do-cliente', 'ID é normalizado antes de persistir');
select is(jsonb_array_length(public.list_my_occasion_favorites() -> 'items'), 1, 'titular lista sua data salva');
select is((public.set_my_occasion_favorite('dia-do-cliente', true) ->> 'saved')::boolean, true, 'salvar novamente é idempotente');
select is(jsonb_array_length(public.list_my_occasion_favorites() -> 'items'), 1, 'idempotência não duplica favoritos');
select throws_ok(
  $$ select public.set_my_occasion_favorite('../../segredo', true) $$,
  '22023', 'invalid_occasion_id', 'ID de data inválido é rejeitado');

set local request.jwt.claims = '{"sub":"bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc","role":"authenticated"}';
select is(jsonb_array_length(public.list_my_occasion_favorites() -> 'items'), 0, 'outra conta não lê favoritos alheios');
select is((public.set_my_occasion_favorite('natal', false) ->> 'saved')::boolean, false, 'remoção ausente é idempotente');

set local request.jwt.claims = '{"sub":"abababab-abab-4bab-8bab-abababababab","role":"authenticated"}';
select is((public.set_my_occasion_favorite('dia-do-cliente', false) ->> 'saved')::boolean, false, 'titular remove sua data');
select is(jsonb_array_length(public.list_my_occasion_favorites() -> 'items'), 0, 'data removida some da lista');
select public.set_my_occasion_favorite('natal', true);
insert into site_private.customer_profiles (user_id, verified_email)
values ('abababab-abab-4bab-8bab-abababababab', 'datas-ana@example.test');
select is((public.erase_customer_data('datas-ana@example.test') ->> 'profilesAnonymized')::integer, 1,
  'pedido de apagamento alcança o perfil titular');
select is((select count(*) from site_private.customer_occasion_favorites
  where customer_user_id = 'abababab-abab-4bab-8bab-abababababab'), 0::bigint,
  'pedido de apagamento remove favoritos de datas');

select * from finish();
rollback;
