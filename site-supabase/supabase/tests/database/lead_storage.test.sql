begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(63);

select is(
  (select count(*) from pg_catalog.pg_tables where schemaname = 'site_private'),
  16::bigint,
  'schema privado contém as dezesseis tabelas planejadas (Etapa 36 acrescenta admin_audit_log e admin_ddl_log)'
);

select has_table('site_private', 'shared_selections', 'seleções persistentes ficam no schema privado');
select has_table('site_private', 'shared_selection_rate_limits', 'criação de links recebe rate limit próprio');
select has_table('site_private', 'status_transitions', 'máquina de estados administrativa vive em tabela dedicada (Etapa 8)');
select has_table('site_private', 'admin_audit_log', 'trilha de escrita administrativa vive em tabela dedicada (Etapa 36)');
select ok(not pg_catalog.has_table_privilege('anon', 'site_private.shared_selections', 'select,insert,update,delete'), 'anon não lê nem altera links persistentes diretamente');
select ok(pg_catalog.has_function_privilege('service_role', 'public.create_site_shared_selection(jsonb,text,text)', 'execute'), 'somente o backend cria links persistentes');
select ok(not pg_catalog.has_function_privilege('anon', 'public.get_site_shared_selection(uuid)', 'execute'), 'anon não consulta links persistentes diretamente');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.revoke_site_shared_selection(uuid,text)', 'execute'), 'usuário autenticado não revoga links sem backend');
select ok(
  (select bool_and(array_to_string(p.proconfig, ',') = 'search_path=""')
   from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('create_site_shared_selection', 'get_site_shared_selection', 'revoke_site_shared_selection')),
  'RPCs de links persistentes fixam search_path vazio'
);
select ok(
  public.create_site_shared_selection(
    jsonb_build_array(jsonb_build_object('id', '77777777-7777-4777-8777-777777777777', 'q', 100, 'v', 'blue')),
    repeat('a', 64), repeat('b', 64)
  ) ? 'token',
  'criação retorna token opaco'
);
select throws_ok(
  $$select public.create_site_shared_selection(
    jsonb_build_array(
      jsonb_build_object('id', '88888888-8888-4888-8888-888888888888', 'q', 100, 'v', 'blue'),
      jsonb_build_object('id', '88888888-8888-4888-8888-888888888888', 'q', 250, 'v', 'blue')
    ),
    repeat('c', 64), repeat('d', 64)
  )$$,
  '22023',
  'duplicate_shared_selection_item',
  'banco rejeita referência e variante repetidas, mesmo com quantidade diferente'
);
select is(
  (select jsonb_array_length(public.get_site_shared_selection((select token from site_private.shared_selections order by created_at desc limit 1)) -> 'items')),
  1,
  'leitura retorna somente itens da seleção'
);
select ok(
  public.create_site_shared_selection(
    (select jsonb_agg(jsonb_build_object('id', lpad(value::text, 8, '0') || '-1111-4111-8111-111111111111', 'q', 100)) from generate_series(1, 50) value),
    repeat('e', 64), repeat('f', 64)
  ) ? 'token',
  'banco aceita cinquenta referências únicas no mesmo link'
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

select ok(to_regprocedure('site_private.get_expired_site_data_candidates(integer)') is not null, 'rotina privada de candidatos de retenção existe');
select ok(to_regprocedure('site_private.finalize_expired_site_data(uuid[],text[],integer)') is not null, 'rotina privada de finalização de retenção existe');
select ok(to_regprocedure('public.get_site_data_retention_candidates(integer)') is not null, 'ponto público controlado de candidatos existe');
select ok(to_regprocedure('public.finalize_site_data_retention(uuid[],text[],integer)') is not null, 'ponto público controlado de finalização existe');
select ok(not pg_catalog.has_function_privilege('anon', 'public.get_site_data_retention_candidates(integer)', 'execute'), 'anon não consulta candidatos de retenção');
select ok(not pg_catalog.has_function_privilege('anon', 'public.finalize_site_data_retention(uuid[],text[],integer)', 'execute'), 'anon não finaliza retenção');
select ok(pg_catalog.has_function_privilege('service_role', 'public.get_site_data_retention_candidates(integer)', 'execute'), 'service_role consulta candidatos de retenção');
select ok(pg_catalog.has_function_privilege('service_role', 'public.finalize_site_data_retention(uuid[],text[],integer)', 'execute'), 'service_role finaliza retenção');
select ok(
  not exists (
    select 1 from pg_catalog.pg_proc procedure
    join pg_catalog.pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'site_private'
      and procedure.proname = 'finalize_expired_site_data'
      and procedure.prosrc like '%storage.objects%'
  ),
  'finalização não manipula storage.objects por SQL'
);

insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, contact_name, company, email, phone,
  client_submitted_at, request_metadata, retention_until
) values (
  '55555555-5555-4555-8555-555555555555', 'expired-quote-test-1', repeat('2', 64), 'site-promo-brindes', 'Quote expirado',
  'Empresa expirada', 'quote-expirado@teste.com', '(11) 99999-9999', now() - interval '25 months', '{}'::jsonb, now() - interval '1 minute'
);

insert into site_private.proposal_documents (
  id, quote_request_id, version, title, storage_bucket, storage_path, published_at
) values (
  '66666666-6666-4666-8666-666666666666', '55555555-5555-4555-8555-555555555555',
  1, 'Proposta expirada', 'customer-proposals', 'retencao/proposta-expirada.pdf', now()
);

select ok(
  public.get_site_data_retention_candidates(10) -> 'quoteIds' ? '55555555-5555-4555-8555-555555555555',
  'candidatos incluem o orçamento expirado'
);
select ok(
  public.get_site_data_retention_candidates(10) -> 'storagePaths' ? 'retencao/proposta-expirada.pdf',
  'candidatos incluem o caminho a ser apagado pela Storage API'
);
select is(
  (public.finalize_site_data_retention(array['55555555-5555-4555-8555-555555555555']::uuid[], array['retencao/caminho-incorreto.pdf']::text[], 10) ->> 'quotesDeleted')::integer,
  0,
  'finalização não remove orçamento enquanto o documento correspondente não foi confirmado'
);
select is(
  (select count(*) from site_private.proposal_documents where id = '66666666-6666-4666-8666-666666666666'),
  1::bigint,
  'metadado da proposta permanece quando a Storage API não confirmou o caminho'
);
select is(
  (public.finalize_site_data_retention(array['55555555-5555-4555-8555-555555555555']::uuid[], array['retencao/proposta-expirada.pdf']::text[], 10) ->> 'proposalDocumentsDeleted')::integer,
  1,
  'finalização remove somente o metadado confirmado pela Storage API'
);
select is(
  (select count(*) from site_private.quote_requests where id = '55555555-5555-4555-8555-555555555555'),
  0::bigint,
  'orçamento expirado é removido após todos os documentos serem confirmados'
);

insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, contact_name, company, email, phone,
  client_submitted_at, request_metadata, retention_until
) values (
  '56565656-5656-4565-8565-565656565656', 'active-quote-retention-test-1', repeat('6', 64), 'site-promo-brindes', 'Quote vigente',
  'Empresa vigente', 'quote-vigente@teste.com', '(11) 99999-9999', now(), '{}'::jsonb, now() + interval '1 day'
);
insert into site_private.proposal_documents (
  id, quote_request_id, version, title, storage_bucket, storage_path, published_at
) values (
  '67676767-6767-4676-8676-676767676767', '56565656-5656-4565-8565-565656565656',
  1, 'Proposta vigente', 'customer-proposals', 'retencao/proposta-vigente.pdf', now()
);
select is(
  (public.finalize_site_data_retention(array['56565656-5656-4565-8565-565656565656']::uuid[], array['retencao/proposta-vigente.pdf']::text[], 10) ->> 'proposalDocumentsDeleted')::integer,
  0,
  'finalização não remove metadado de proposta antes do vencimento do orçamento'
);
select is(
  (select count(*) from site_private.proposal_documents where id = '67676767-6767-4676-8676-676767676767'),
  1::bigint,
  'proposta de orçamento vigente permanece íntegra'
);

insert into site_private.contact_requests (
  client_request_id, request_hash, source, contact_name, email, phone,
  client_submitted_at, request_metadata, retention_until
) values (
  'expired-contact-test-1', repeat('1', 64), 'site-promo-brindes-contact', 'Contato expirado',
  'expirado@teste.com', null, now() - interval '25 months', '{}'::jsonb, now() - interval '1 minute'
);

select is(
  (public.finalize_site_data_retention('{}'::uuid[], '{}'::text[], 1) ->> 'contactsDeleted')::integer,
  1,
  'rotina remove um contato vencido dentro do lote solicitado'
);

select is(
  (select count(*) from site_private.contact_requests where client_request_id = 'expired-contact-test-1'),
  0::bigint,
  'contato vencido não permanece após a retenção'
);

insert into site_private.shared_selections (token, management_token_hash, items, expires_at, created_at)
values ('99999999-9999-4999-8999-999999999999', repeat('9', 64), jsonb_build_array(jsonb_build_object('id', '77777777-7777-4777-8777-777777777777', 'q', 100)), now() - interval '1 minute', now() - interval '31 days');
insert into site_private.shared_selection_rate_limits (identifier_hash, window_started_at, request_count, updated_at)
values (repeat('8', 64), now() - interval '31 days', 1, now() - interval '31 days');

select is(
  (public.finalize_site_data_retention('{}'::uuid[], '{}'::text[], 1) ->> 'sharedSelectionsDeleted')::integer,
  1,
  'retenção remove links compartilhados expirados'
);
select is(
  (select count(*) from site_private.shared_selection_rate_limits where identifier_hash = repeat('8', 64)),
  0::bigint,
  'retenção remove limites de links compartilhados vencidos'
);

select * from finish();
rollback;
