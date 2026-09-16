begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(40);

select has_column('site_private', 'quote_requests', 'customer_user_id', 'orçamento possui titular autenticado opcional');
select has_table('site_private', 'customer_profiles', 'perfil do cliente existe no schema privado');
select has_table('site_private', 'quote_request_events', 'linha do tempo existe no schema privado');
select has_table('site_private', 'proposal_documents', 'metadados de propostas existem no schema privado');
select ok(
  exists (select 1 from storage.buckets where id = 'customer-proposals'),
  'bucket privado de propostas existe'
);
select ok(
  (select not public and file_size_limit = 20971520 from storage.buckets where id = 'customer-proposals'),
  'bucket de propostas permanece privado e limitado a 20 MB'
);

select ok(not pg_catalog.has_schema_privilege('authenticated', 'site_private', 'usage'), 'authenticated não acessa schema privado');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.quote_requests', 'select'), 'authenticated não lê tabela de orçamentos');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.customer_profiles', 'select'), 'authenticated não lê perfis diretamente');

select ok(pg_catalog.has_function_privilege('authenticated', 'public.claim_my_quote_requests()', 'execute'), 'authenticated pode reivindicar seu histórico');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.get_my_quote_requests(integer,integer,text,text)', 'execute'), 'authenticated pode listar seu histórico');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.get_my_quote_request(uuid)', 'execute'), 'authenticated pode abrir seu orçamento');
select ok(not pg_catalog.has_function_privilege('anon', 'public.claim_my_quote_requests()', 'execute'), 'anon não reivindica históricos');
select ok(not pg_catalog.has_function_privilege('anon', 'public.get_my_quote_requests(integer,integer,text,text)', 'execute'), 'anon não lista históricos');
select ok(not pg_catalog.has_function_privilege('anon', 'public.get_my_quote_request(uuid)', 'execute'), 'anon não abre orçamento');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.get_my_proposal_document(uuid)', 'execute'), 'authenticated solicita documento próprio');
select ok(not pg_catalog.has_function_privilege('anon', 'public.get_my_proposal_document(uuid)', 'execute'), 'anon não solicita documentos');

select ok(
  (select bool_and(p.prosecdef and array_to_string(p.proconfig, ',') = 'search_path=""')
   from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('claim_my_quote_requests', 'get_my_quote_requests', 'get_my_quote_request', 'get_my_proposal_document')),
  'RPCs autenticados são security definer com search_path vazio'
);

select ok(
  (select p.prosecdef and array_to_string(p.proconfig, ',') = 'search_path=""'
   from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'request_my_quote_adjustment'),
  'RPC de ajuste é security definer com search_path vazio'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'ana@empresa.test', '', now(), '{}'::jsonb, '{"name":"Ana"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'bia@empresa.test', '', now(), '{}'::jsonb, '{"name":"Bia"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'authenticated', 'authenticated', 'nao-confirmado@empresa.test', '', null, '{}'::jsonb, '{}'::jsonb, now(), now());

insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, contact_name, company, email, phone,
  client_submitted_at, request_metadata
) values
  -- Etapa 24 do plano de correções: quote_requests.email agora tem uma constraint
  -- exigindo o valor já normalizado (trim + lower) na escrita, então este fixture não
  -- pode mais testar "e-mail cru em maiúsculas foi persistido assim". O teste abaixo
  -- continua validando o casamento por e-mail e a idempotência da reivindicação; o
  -- ramo de comparação case-insensitive da própria função de reivindicação (para
  -- linhas históricas anteriores à constraint, se existirem em produção) não é mais
  -- alcançável a partir deste fixture, mas a função não foi alterada.
  ('11111111-1111-4111-8111-111111111111', 'portal-test-ana-1', repeat('a', 64), 'site-promo-brindes', 'Ana', 'Empresa A', 'ana@empresa.test', '(11) 99999-9999', now(), '{"campaign":{"source":"finder","moment":"onboarding"},"briefing":{"actionName":"Boas-vindas","budgetRange":"51-100"},"origin":"https://www.promobrindes.com.br","userAgent":"privado"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'portal-test-ana-2', repeat('b', 64), 'site-promo-brindes', 'Ana', 'Empresa A', 'ana@empresa.test', '(11) 99999-9999', now(), '{}'::jsonb),
  ('33333333-3333-4333-8333-333333333333', 'portal-test-bia-1', repeat('c', 64), 'site-promo-brindes', 'Bia', 'Empresa B', 'bia@empresa.test', '(11) 98888-8888', now(), '{}'::jsonb);

insert into site_private.quote_items (
  quote_request_id, position, source_product_id, item_key, product_slug, product_name_snapshot,
  sku_snapshot, quantity, minimum_quantity_snapshot, variant_id_snapshot, color_name_snapshot, decision_group_snapshot
) values (
  '11111111-1111-4111-8111-111111111111', 1, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa::variante-azul-1', 'produto-teste', 'Produto teste',
  'TESTE-1', 100, 50, 'azul-1', 'Azul', 'alternative'
);

insert into site_private.proposal_documents (
  id, quote_request_id, version, title, storage_bucket, storage_path, published_at
) values (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  1, 'Proposta Ana', 'customer-proposals', 'ana/proposta-1.pdf', now()
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
select is((public.claim_my_quote_requests() ->> 'claimed')::integer, 2, 'e-mail confirmado reivindica todos os orçamentos ainda sem titular');
select is((public.claim_my_quote_requests() ->> 'claimed')::integer, 0, 'reivindicação repetida é idempotente');
select is((public.get_my_quote_requests(20, 0, null, null) ->> 'total')::integer, 2, 'cliente lista somente seus dois orçamentos');
select ok(public.get_my_quote_request('11111111-1111-4111-8111-111111111111') is not null, 'cliente abre orçamento próprio');
select ok(public.get_my_quote_request('33333333-3333-4333-8333-333333333333') is null, 'cliente não descobre orçamento alheio');
select is(public.get_my_proposal_document('44444444-4444-4444-8444-444444444444') ->> 'path', 'ana/proposta-1.pdf', 'titular autenticada recebe somente o caminho de sua proposta publicada');
select is(public.get_my_quote_request('11111111-1111-4111-8111-111111111111') #>> '{campaign,moment}', 'onboarding', 'cliente recebe somente o contexto de campanha do próprio briefing');
select is(public.get_my_quote_request('11111111-1111-4111-8111-111111111111') #>> '{items,0,variantId}', 'azul-1', 'cliente recebe a variante exata do item que selecionou');
select is(public.get_my_quote_request('11111111-1111-4111-8111-111111111111') #>> '{items,0,decisionGroup}', 'alternative', 'cliente recebe a prioridade da referência sem metadados internos');
select ok(not (public.get_my_quote_request('11111111-1111-4111-8111-111111111111') ? 'requestMetadata'), 'metadados operacionais não são expostos ao cliente');
select ok(
  (public.request_my_quote_adjustment('11111111-1111-4111-8111-111111111111', 'Trocar para uma cor mais vibrante.', 'adjustment-ana-001') ->> 'id') is not null,
  'titular autenticada envia um pedido de ajuste'
);
select is(
  public.request_my_quote_adjustment('11111111-1111-4111-8111-111111111111', 'Trocar para uma cor mais vibrante.', 'adjustment-ana-001') ->> 'id',
  public.request_my_quote_adjustment('11111111-1111-4111-8111-111111111111', 'Trocar para uma cor mais vibrante.', 'adjustment-ana-001') ->> 'id',
  'pedido de ajuste é idempotente por cliente e solicitação'
);
select is(
  (select count(*) from site_private.quote_adjustment_requests where quote_request_id = '11111111-1111-4111-8111-111111111111' and client_request_id = 'adjustment-ana-001'),
  1::bigint,
  'repetição não cria um segundo pedido de ajuste'
);
select ok(jsonb_path_exists(public.get_my_quote_request('11111111-1111-4111-8111-111111111111') -> 'events', '$[*] ? (@.title == "Pedido de ajuste enviado")'), 'linha do tempo mostra confirmação segura do ajuste');
select ok(position('Trocar para uma cor mais vibrante.' in public.get_my_quote_request('11111111-1111-4111-8111-111111111111')::text) = 0, 'texto privado do ajuste não vaza ao histórico da cliente');

set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';
select is((public.claim_my_quote_requests() ->> 'claimed')::integer, 1, 'segunda conta reivindica somente o próprio e-mail');
select is((public.get_my_quote_requests(20, 0, null, null) ->> 'total')::integer, 1, 'segunda conta não enxerga histórico da primeira');
select is(public.get_my_proposal_document('44444444-4444-4444-8444-444444444444'), null, 'segunda conta não descobre o documento da primeira');
select throws_ok('select public.request_my_quote_adjustment(''11111111-1111-4111-8111-111111111111'', ''Tentar alterar o orçamento alheio.'', ''adjustment-bia-001'')', '42501', 'quote_not_found', 'outra conta não solicita ajuste de orçamento alheio');

set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';
select throws_ok('select public.claim_my_quote_requests()', '42501', 'verified_email_required', 'e-mail não confirmado não reivindica histórico');
select ok(public.get_my_proposal_document('44444444-4444-4444-8444-444444444444') is null, 'conta sem proposta não descobre documento alheio');

select * from finish();
rollback;
