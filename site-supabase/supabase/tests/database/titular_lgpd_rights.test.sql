-- F-30: direitos do titular LGPD — acesso, exportacao, correcao e autoexclusao.
-- Espelha os fixtures de customer_portal.test.sql e customer_data_erasure.test.sql.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(61);

-- === Estrutura da trilha =========================================================
select has_table('site_private', 'subject_right_requests', 'trilha de exercicio de direito existe');
select has_column('site_private', 'subject_right_requests', 'subject_user_id', 'trilha vincula a conta');
select has_column('site_private', 'subject_right_requests', 'right_type', 'trilha registra o tipo de direito');
select col_has_check('site_private', 'subject_right_requests', 'right_type', 'coluna right_type tem constraint check');
select ok(
  (select string_agg(pg_get_constraintdef(c.oid), ' ') from pg_catalog.pg_constraint c
    join pg_catalog.pg_class r on r.oid = c.conrelid
    join pg_catalog.pg_namespace ns on ns.oid = r.relnamespace
    where ns.nspname = 'site_private' and r.relname = 'subject_right_requests' and c.contype = 'c')
   ilike '%access%export%correct%delete%',
  'right_type so permite access, export, correct e delete'
);

-- === Grants e hardening ==========================================================
select ok(not pg_catalog.has_schema_privilege('authenticated', 'site_private', 'usage'), 'authenticated nao acessa schema privado');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.subject_right_requests', 'select'), 'authenticated nao le trilha diretamente');
select ok(pg_catalog.has_table_privilege('service_role', 'site_private.subject_right_requests', 'select'), 'service_role le a trilha');

select ok(pg_catalog.has_function_privilege('authenticated', 'public.get_my_data_access()', 'execute'), 'authenticated confere tratamento');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.export_my_data()', 'execute'), 'authenticated exporta seus dados');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.correct_my_data(text,text)', 'execute'), 'authenticated corrige perfil');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.delete_my_data()', 'execute'), 'authenticated autoexclui');
select ok(not pg_catalog.has_function_privilege('anon', 'public.get_my_data_access()', 'execute'), 'anon nao confere tratamento');
select ok(not pg_catalog.has_function_privilege('anon', 'public.export_my_data()', 'execute'), 'anon nao exporta');
select ok(not pg_catalog.has_function_privilege('anon', 'public.correct_my_data(text,text)', 'execute'), 'anon nao corrige');
select ok(not pg_catalog.has_function_privilege('anon', 'public.delete_my_data()', 'execute'), 'anon nao autoexclui');

select ok(
  (select bool_and(p.prosecdef and array_to_string(p.proconfig, ',') = 'search_path=""')
   from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('get_my_data_access', 'export_my_data', 'correct_my_data', 'delete_my_data')),
  'as 4 RPCs sao security definer com search_path vazio'
);

-- === Fixtures ====================================================================
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'fulano@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'nao-confirmado@example.test', '', null, '{}'::jsonb, '{}'::jsonb, now(), now());

insert into site_private.customer_profiles (user_id, verified_email, display_name, company)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'fulano@example.test', 'Fulano de Tal', 'Empresa Fulano');

insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, contact_name, company, email, phone, city,
  client_submitted_at, request_metadata, customer_user_id
) values (
  '11111111-1111-4111-8111-111111111111', 'lgpd-test-quote-1', repeat('a', 64), 'site-promo-brindes',
  'Fulano de Tal', 'Empresa Fulano', 'fulano@example.test', '11988887777', 'Sao Paulo', now(),
  jsonb_build_object('campaign', jsonb_build_object('source', 'commemorative_date', 'moment', 'onboarding'), 'briefing', jsonb_build_object('actionName', 'Kit de boas-vindas', 'budgetRange', 'ate-25')),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

insert into site_private.quote_items (
  quote_request_id, position, source_product_id, item_key, product_slug, product_name_snapshot,
  sku_snapshot, image_url_snapshot, quantity, minimum_quantity_snapshot, variant_id_snapshot,
  color_name_snapshot, color_hex_snapshot, decision_group_snapshot, kit_group_id,
  kit_name_snapshot, kit_quantity_snapshot, units_per_kit_snapshot
) values (
  '11111111-1111-4111-8111-111111111111', 1, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa::sem-cor', 'produto-a', 'Produto A',
  'KIT-A', 'https://img.test/produto-a.png', 200, 100, 'azul-1', 'Azul', '#0000ff',
  'primary', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Kit da Fulana de Tal', 100, 2
);

insert into site_private.quote_request_events (
  quote_request_id, event_type, status, title, audience, created_at
) values (
  '11111111-1111-4111-8111-111111111111', 'received', 'new', 'Solicitacao recebida', 'customer', now()
);

insert into site_private.proposal_documents (
  id, quote_request_id, version, title, storage_bucket, storage_path, published_at
) values (
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  1, 'Proposta Fulano', 'customer-proposals', 'fulano/proposta-1.pdf', now()
);

insert into site_private.contact_requests (
  client_request_id, request_hash, source, contact_name, email, phone, message, client_submitted_at
) values (
  'lgpd-test-contact-1', repeat('8', 64), 'site-promo-brindes-contact',
  'Fulano de Tal', 'fulano@example.test', '11977776666', 'Quero conhecer o catalogo', now()
);

insert into site_private.customer_selections (customer_user_id, title, product_references, campaign, version)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Minha selecao', '[{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","q":20}]'::jsonb, '{"source":"commemorative_date"}'::jsonb, 1);

insert into site_private.customer_occasion_favorites (customer_user_id, occasion_id)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'natal-2026');

insert into site_private.quote_adjustment_requests (
  quote_request_id, requested_by, client_request_id, message
) values (
  '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'lgpd-adjustment-001', 'Quero mais 100 unidades'
);

-- === Sem autenticacao ===========================================================
select throws_ok('select public.get_my_data_access()', '42501', 'authentication_required', 'sem sessao nao confere tratamento');
select throws_ok('select public.export_my_data()', '42501', 'authentication_required', 'sem sessao nao exporta');
select throws_ok('select public.correct_my_data(''Novo'', ''Empresa X'')', '42501', 'authentication_required', 'sem sessao nao corrige');
select throws_ok('select public.delete_my_data()', '42501', 'authentication_required', 'sem sessao nao autoexclui');

-- === E-mail nao confirmado ======================================================
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';
select throws_ok('select public.get_my_data_access()', '42501', 'verified_email_required', 'e-mail nao confirmado nao confere tratamento');
select throws_ok('select public.export_my_data()', '42501', 'verified_email_required', 'e-mail nao confirmado nao exporta');
select throws_ok('select public.correct_my_data(''Novo'', ''Empresa X'')', '42501', 'verified_email_required', 'e-mail nao confirmado nao corrige');
select throws_ok('select public.delete_my_data()', '42501', 'verified_email_required', 'e-mail nao confirmado nao autoexclui');

-- === Titular confirmado: acesso =================================================
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
select is(public.get_my_data_access() #>> '{profile,displayName}', 'Fulano de Tal', 'acesso devolve display_name do titular');
select is(public.get_my_data_access() #>> '{profile,company}', 'Empresa Fulano', 'acesso devolve a empresa do titular');
select is((public.get_my_data_access() #>> '{counts,quotes}')::integer, 1, 'acesso conta os 1 orcamento do titular');
select is((public.get_my_data_access() #>> '{counts,selections}')::integer, 1, 'acesso conta as 1 selecao do titular');
select is((public.get_my_data_access() #>> '{counts,favorites}')::integer, 1, 'acesso conta o 1 favorito do titular');
select is((public.get_my_data_access() #>> '{counts,contacts}')::integer, 1, 'acesso conta o 1 contato do titular pelo e-mail');

-- === Exportacao =================================================================
select is(public.export_my_data() ->> 'email', 'fulano@example.test', 'export devolve o e-mail do proprio titular');
select ok(public.export_my_data() ? 'profile', 'export tem bloco de perfil');
select is((public.export_my_data() #>> '{profile,displayName}'), 'Fulano de Tal', 'export inclui display_name');
select is(jsonb_array_length(public.export_my_data() -> 'quotes'), 1, 'export inclui 1 orcamento');
select is((public.export_my_data() #>> '{quotes,0,items,0,kitName}'), 'Kit da Fulana de Tal', 'export inclui kit_name_snapshot do item');
select is((public.export_my_data() #>> '{quotes,0,items,0,variantId}'), 'azul-1', 'export inclui a variante exata do item');
select is(jsonb_array_length(public.export_my_data() -> 'quotes' -> 0 -> 'events'), 1, 'export inclui evento da linha do tempo');
select is(jsonb_array_length(public.export_my_data() -> 'quotes' -> 0 -> 'proposals'), 1, 'export inclui proposta publicada');
select is(jsonb_array_length(public.export_my_data() -> 'selections'), 1, 'export inclui a selecao salva');
select is((public.export_my_data() #>> '{selections,0,references,0,id}'), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'export inclui reference da selecao');
select is(jsonb_array_length(public.export_my_data() -> 'favorites'), 1, 'export inclui os favoritos');
select is((public.export_my_data() -> 'favorites' -> 0)::text, '"natal-2026"', 'favorito exportado e o id estavel');
select is(jsonb_array_length(public.export_my_data() -> 'contacts'), 1, 'export inclui o contato pelo e-mail');
select is((public.export_my_data() #>> '{contacts,0,message}'), 'Quero conhecer o catalogo', 'export inclui o texto do contato');
select is(jsonb_array_length(public.export_my_data() -> 'adjustments'), 1, 'export inclui o pedido de ajuste');
select ok(not (public.export_my_data() ? 'requestMetadata'), 'export nao expoe request_metadata bruto');
select ok(
  (public.export_my_data() #>> '{quotes,0,briefing}') is null,
  'export nao repete briefing dentro do orcamento (ja exposto no retorno proprio)'
);

-- Sem autenticacao nao ha trilha ainda: export de rights deve ser array vazio
select is(jsonb_array_length(public.export_my_data() -> 'rights'), 0, 'antes de corrigir/excluir, a trilha de direitos esta vazia');

-- === Correcao ===================================================================
select is((public.correct_my_data('Nome Atualizado', null) ->> 'updated')::boolean, true, 'corrige somente display_name');
select is((select display_name from site_private.customer_profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'Nome Atualizado', 'display_name persistido');
select is((select company from site_private.customer_profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'Empresa Fulano', 'company preservada quando nao informada');
select is((public.correct_my_data(null, 'Empresa Renomeada') ->> 'updated')::boolean, true, 'corrige somente company');
select is((select company from site_private.customer_profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'Empresa Renomeada', 'company persistida');
select throws_ok('select public.correct_my_data(null, null)', '22023', 'invalid_profile_fields', 'ambos os campos em branco sao rejeitados');
select throws_ok('select public.correct_my_data(''A'', null)', '22023', 'invalid_profile_fields', 'display_name abaixo de 2 caracteres e rejeitado');
select throws_ok('select public.correct_my_data(null, ''x'')', '22023', 'invalid_profile_fields', 'company abaixo de 2 caracteres e rejeitado');
select is(
  (select count(*) from site_private.subject_right_requests where subject_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and right_type = 'correct'),
  2::bigint,
  'trilha registra os 2 exercicios de correcao'
);

-- === Autoexclusao ===============================================================
select is((public.delete_my_data() ->> 'authUsersDeleted')::integer, 1, 'autoexclusao remove a conta Auth por cascade');
select ok(
  exists (select 1 from site_private.erased_customer_identities where email_sha256 = encode(sha256(convert_to('fulano@example.test', 'UTF8')), 'hex')),
  'autoexclusao grava tombstone SHA-256 do e-mail'
);
select is(
  (select count(*) from auth.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  0::bigint,
  'apos a autoexclusao a conta Auth nao existe mais'
);

select * from finish();
rollback;