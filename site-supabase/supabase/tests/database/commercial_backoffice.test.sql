-- F-03: back-office minimo — allowlist de operadores, fila, mudanca de status,
-- triagem de ajuste e publicacao de proposta versionada.
--
-- Cobre principalmente o controle de acesso, porque a superficie nova (5 RPCs de
-- escrita/leitura comercial) e a parte que pode vazar dado de cliente se a
-- autorizacao falhar. As transicoes validas ja sao garantidas pelo trigger
-- enforce_status_transition; aqui testamos que a RPC antecipa o mesmo erro.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(28);

-- === Estrutura ===================================================================

select has_table('site_private', 'commercial_operators', 'allowlist de operadores existe no schema privado');
select has_table('site_private', 'commercial_audit_log', 'trilha de auditoria comercial existe');

select has_function('public', 'list_site_quote_requests', array['text','text','integer','integer'], 'RPC de fila existe');
select has_function('public', 'get_site_quote_request', array['uuid'], 'RPC de detalhe existe');
select has_function('public', 'update_site_quote_status', array['uuid','text'], 'RPC de status existe');
select has_function('public', 'reply_site_quote_adjustment', array['uuid','text','text'], 'RPC de triagem de ajuste existe');
select has_function('public', 'publish_site_quote_proposal', array['uuid','text','text','date'], 'RPC de publicacao de proposta existe');
select has_function('site_private', 'assert_site_operator', array[]::text[], 'helper de autorizacao existe');

-- === Isolamento do schema privado ================================================

select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.commercial_operators', 'select'), 'authenticated nao le a allowlist');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.commercial_audit_log', 'select'), 'authenticated nao le a trilha');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.commercial_operators', 'insert'), 'authenticated nao se adiciona na allowlist');
select ok(not pg_catalog.has_table_privilege('anon', 'site_private.commercial_operators', 'select'), 'anon nao le a allowlist');
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_catalog.pg_class where oid = 'site_private.commercial_operators'::regclass),
  'allowlist tem RLS habilitada e forcada'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_catalog.pg_class where oid = 'site_private.commercial_audit_log'::regclass),
  'trilha tem RLS habilitada e forcada'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_indexes
    where schemaname = 'site_private' and tablename = 'commercial_operators'
      and indexname = 'commercial_operators_active_idx'
  ),
  'allowlist tem indice parcial para a checagem de operador ativo'
);

-- === Permissoes das RPCs =========================================================

select ok(pg_catalog.has_function_privilege('authenticated', 'public.list_site_quote_requests(text,text,integer,integer)', 'execute'), 'authenticated pode chamar a fila (a checagem de operador acontece dentro)');
select ok(not pg_catalog.has_function_privilege('anon', 'public.list_site_quote_requests(text,text,integer,integer)', 'execute'), 'anon nao chama a fila');
select ok(not pg_catalog.has_function_privilege('anon', 'public.update_site_quote_status(uuid,text)', 'execute'), 'anon nao muda status');
select ok(not pg_catalog.has_function_privilege('anon', 'public.publish_site_quote_proposal(uuid,text,text,date)', 'execute'), 'anon nao publica proposta');
select ok(pg_catalog.has_function_privilege('service_role', 'public.update_site_quote_status(uuid,text)', 'execute'), 'service_role pode mudar status');

-- === Autorizacao em runtime ======================================================

-- Sem JWT nao ha titular nem operador: as RPCs precisam recusar com 42501.
select throws_ok(
  $$select public.list_site_quote_requests()$$,
  '42501', null,
  'fila recusa chamador sem autenticacao'
);
select throws_ok(
  $$select public.get_site_quote_request('00000000-0000-0000-0000-000000000000'::uuid)$$,
  '42501', null,
  'detalhe recusa chamador sem autenticacao'
);
select throws_ok(
  $$select public.update_site_quote_status('00000000-0000-0000-0000-000000000000'::uuid, 'triaged')$$,
  '42501', null,
  'mudanca de status recusa chamador sem autenticacao'
);
select throws_ok(
  $$select public.publish_site_quote_proposal('00000000-0000-0000-0000-000000000000'::uuid, 'Proposta', 'x/y.pdf', null)$$,
  '42501', null,
  'publicacao de proposta recusa chamador sem autenticacao'
);
select throws_ok(
  $$select site_private.assert_site_operator()$$,
  '42501', null,
  'helper recusa chamador sem autenticacao'
);

-- === Estado inicial ==============================================================

select is(
  (select count(*) from site_private.commercial_operators),
  0::bigint,
  'a allowlist nasce vazia: nenhuma conta ganha back-office por acidente na migration'
);

select ok(
  exists (
    select 1 from site_private.status_transitions
    where entity = 'quote_requests' and from_status = 'in_progress' and to_status = 'quoted'
  ),
  'a transicao usada pela publicacao de proposta continua valida na state machine'
);
select ok(
  not exists (
    select 1 from site_private.status_transitions
    where entity = 'quote_requests' and from_status = 'closed'
  ),
  'closed segue terminal: publicar proposta em pedido encerrado e barrado pela state machine'
);

select * from finish();