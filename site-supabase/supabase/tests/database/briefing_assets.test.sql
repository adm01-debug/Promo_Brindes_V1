begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(28);

select has_table('site_private', 'customer_briefing_assets', 'metadados privados de arquivos existem');
select has_table('site_private', 'storage_deletion_queue', 'fila de exclusão de Storage existe');
select ok((select not public and file_size_limit = 10485760
  from storage.buckets where id = 'customer-briefing-assets'), 'bucket é privado e limitado a 10 MB');
select ok((select c.relrowsecurity and c.relforcerowsecurity from pg_catalog.pg_class c
  where c.oid = 'site_private.customer_briefing_assets'::regclass), 'arquivos têm RLS forçada');
select ok((select c.relrowsecurity and c.relforcerowsecurity from pg_catalog.pg_class c
  where c.oid = 'site_private.storage_deletion_queue'::regclass), 'fila tem RLS forçada');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.create_my_briefing_asset(text,text,integer,text)', 'execute'), 'titular cria metadado pelo RPC');
select ok(not pg_catalog.has_function_privilege('anon', 'public.create_my_briefing_asset(text,text,integer,text)', 'execute'), 'anônimo não cria arquivo');
select ok(not pg_catalog.has_function_privilege('service_role', 'public.create_my_briefing_asset(text,text,integer,text)', 'execute'), 'service_role não usa caminho do titular');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.list_my_briefing_assets()', 'execute'), 'titular lista seus arquivos');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.owns_my_briefing_asset_path(text)', 'execute'), 'policy pode validar propriedade');
select ok(not pg_catalog.has_function_privilege('service_role', 'public.list_my_selections(boolean)', 'execute'), 'drift de grant das seleções foi removido');
select is((select count(*) from pg_catalog.pg_policy policy
  where policy.polrelid = 'storage.objects'::regclass
    and policy.polname like 'customer_briefing_assets_%'), 3::bigint, 'Storage possui policies próprias de leitura, upload e exclusão');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'asset-ana@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'asset-bia@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
create temporary table asset_a as
select public.create_my_briefing_asset(' logo/primária.png ', 'image/png', 2048, 'logo') as result;

select ok((select result ->> 'id' from asset_a) ~ '^[0-9a-f-]{36}$', 'RPC devolve identificador opaco');
select ok((select result ->> 'path' from asset_a) like 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/%', 'caminho nasce no namespace do titular');
select is(jsonb_array_length(public.list_my_briefing_assets()), 1, 'titular lista o próprio arquivo');
select ok(public.owns_my_briefing_asset_path((select result ->> 'path' from asset_a)), 'titular possui o caminho exato');

set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';
select is(jsonb_array_length(public.list_my_briefing_assets()), 0, 'outra conta não vê o arquivo');
select ok(not public.owns_my_briefing_asset_path((select result ->> 'path' from asset_a)), 'outra conta não possui o caminho');
select throws_ok(
  format('select public.delete_my_briefing_asset(%L::uuid)', (select result ->> 'id' from asset_a)),
  'P0001', 'briefing_asset_not_deletable', 'outra conta não exclui o arquivo');

insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, contact_name, company, email, phone,
  client_submitted_at, customer_user_id
) values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'asset-quote-0001', repeat('a', 64),
  'site-promo-brindes', 'Ana Asset', 'Empresa Asset', 'asset-ana@example.test', '(11) 99999-9999',
  now(), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
select is(public.attach_my_briefing_assets_to_quote(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  array[(select (result ->> 'id')::uuid from asset_a)]
), 1, 'titular anexa o arquivo ao próprio briefing');
select is((select quote_request_id from site_private.customer_briefing_assets
  where id = (select (result ->> 'id')::uuid from asset_a)),
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid, 'vínculo fica persistido');
select throws_ok(
  format('select public.delete_my_briefing_asset(%L::uuid)', (select result ->> 'id' from asset_a)),
  'P0001', 'briefing_asset_not_deletable', 'arquivo anexado não some do briefing');

create temporary table asset_expired as
select public.create_my_briefing_asset('referencia.pdf', 'application/pdf', 4096, 'reference') as result;
select is(jsonb_array_length(public.list_my_briefing_assets()), 2, 'biblioteca mostra logo e referência');
update site_private.customer_briefing_assets set expires_at = now() - interval '1 minute'
where id = (select (result ->> 'id')::uuid from asset_expired);
select is(jsonb_array_length(public.get_briefing_asset_retention_candidates(100) -> 'objects'), 1, 'retenção encontra arquivo expirado');
select is(public.finalize_briefing_asset_retention(
  array[(select result ->> 'path' from asset_expired)], 100
), 1, 'finalização remove a pendência depois do Storage');
select is(jsonb_array_length(public.list_my_briefing_assets()), 1, 'arquivo vigente permanece');

insert into site_private.customer_profiles (user_id, verified_email)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'asset-ana@example.test');
update site_private.customer_profiles
set verified_email = 'titular-aaaaaaaaaaaaaaaa@erased.invalid'
where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is((select count(*) from site_private.customer_briefing_assets
  where customer_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0::bigint, 'apagamento do titular remove metadados');
select ok(exists (select 1 from site_private.storage_deletion_queue
  where object_path = (select result ->> 'path' from asset_a)), 'apagamento enfileira o blob para exclusão');

select * from finish();
rollback;
