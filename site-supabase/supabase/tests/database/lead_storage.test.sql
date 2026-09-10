begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(29);

select is(
  (select count(*) from pg_catalog.pg_tables where schemaname = 'site_private'),
  10::bigint,
  'schema privado contém as dez tabelas planejadas'
);

select has_column('site_private', 'contact_requests', 'message', 'contato inicial armazena o contexto opcional da conversa');
select has_column('site_private', 'contact_requests', 'preferred_channel', 'contato registra preferência de retorno sem disparar mensagem');
select has_column('site_private', 'quote_items', 'variant_id_snapshot', 'orçamento preserva identificador da variante escolhida');
select has_column('site_private', 'quote_items', 'decision_group_snapshot', 'orçamento preserva se a referência é principal ou alternativa');
select has_table('site_private', 'quote_adjustment_requests', 'pedido de ajuste fica em tabela privada própria');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.quote_adjustment_requests', 'select,insert,update,delete'), 'cliente não acessa ajustes diretamente');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.request_my_quote_adjustment(uuid,text,text)', 'execute'), 'cliente autenticado pode solicitar ajuste pelo RPC controlado');

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

select is(
  (public.create_site_quote_request(
    jsonb_build_object(
      'source', 'site-promo-brindes',
      'clientRequestId', 'variant-snapshot-test-1',
      'submittedAt', now(),
      'pageUrl', 'https://promo.test/orcamento',
      'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
      'contact', jsonb_build_object('name', 'Ana Teste', 'company', 'Empresa Teste', 'email', 'ana@teste.com', 'phone', '(11) 99999-9999', 'city', '', 'deadline', '', 'notes', ''),
      'items', jsonb_build_array(jsonb_build_object(
        'productId', '11111111-1111-4111-8111-111111111111', 'key', '11111111-1111-4111-8111-111111111111::variante-azul-1',
        'slug', 'produto-teste', 'name', 'Produto teste', 'sku', 'TESTE-1', 'imageUrl', '/images/product-placeholder.svg',
        'quantity', 100, 'minQuantity', 50, 'variantId', 'azul-1', 'colorName', 'Azul', 'colorHex', '#0047ab', 'decisionGroup', 'alternative'
      ))
    ),
    jsonb_build_object('requestHash', repeat('d', 64), 'identifierHash', repeat('e', 64))
  )) ->> 'duplicate',
  'false',
  'RPC de orçamento aceita e registra o retrato da variante'
);

select is(
  (select variant_id_snapshot from site_private.quote_items where item_key = '11111111-1111-4111-8111-111111111111::variante-azul-1'),
  'azul-1',
  'identificador da variante não se perde antes do histórico'
);

select is(
  (select decision_group_snapshot from site_private.quote_items where item_key = '11111111-1111-4111-8111-111111111111::variante-azul-1'),
  'alternative',
  'prioridade alternativa é preservada no retrato do briefing'
);

select throws_ok(
  $$select public.create_site_quote_request(
    jsonb_build_object(
      'source', 'site-promo-brindes', 'clientRequestId', 'invalid-decision-group-1', 'submittedAt', now(),
      'pageUrl', 'https://promo.test/orcamento',
      'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
      'contact', jsonb_build_object('name', 'Ana Teste', 'company', 'Empresa Teste', 'email', 'ana@teste.com', 'phone', '(11) 99999-9999', 'city', '', 'deadline', '', 'notes', ''),
      'items', jsonb_build_array(jsonb_build_object(
        'productId', '22222222-2222-4222-8222-222222222222', 'key', '22222222-2222-4222-8222-222222222222::sem-cor',
        'slug', 'produto-invalido', 'name', 'Produto inválido', 'sku', 'TESTE-2', 'imageUrl', '/images/product-placeholder.svg',
        'quantity', 100, 'minQuantity', 50, 'decisionGroup', 'forjado'
      ))
    ),
    jsonb_build_object('requestHash', repeat('b', 64), 'identifierHash', repeat('c', 64))
  )$$,
  '22023',
  'invalid_item_decision_group',
  'RPC do banco recusa prioridade forjada mesmo fora da API'
);

select is(
  (public.create_site_contact_request(
    jsonb_build_object(
      'source', 'site-promo-brindes-contact',
      'clientRequestId', 'contact-channel-test-1',
      'submittedAt', now(),
      'pageUrl', 'https://promo.test/contato',
      'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
      'contact', jsonb_build_object('name', 'Ana Teste', 'email', 'ana@teste.com', 'phone', '(11) 99999-9999', 'message', 'Quero conversar', 'responseChannel', 'whatsapp')
    ),
    jsonb_build_object('requestHash', repeat('f', 64), 'identifierHash', repeat('a', 64))
  )) ->> 'duplicate',
  'false',
  'RPC de contato registra preferência sem criar notificação'
);

select is(
  (select preferred_channel from site_private.contact_requests where client_request_id = 'contact-channel-test-1'),
  'whatsapp',
  'preferência de contato fica limitada ao registro privado'
);

select * from finish();
rollback;
