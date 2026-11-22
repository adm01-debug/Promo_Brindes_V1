-- PF-34: auditoria de leitura (SELECT) de PII. A RPC get_my_quote_request, que
-- expõe as colunas de contato do titular autenticado, passa a registrar cada leitura
-- em site_private.pii_read_audit_log, sem armazenar o valor lido.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select plan(13);

-- A trilha é privada: só service_role lê; ninguém além do site grava.
select ok(not pg_catalog.has_table_privilege('anon', 'site_private.pii_read_audit_log', 'select'), 'anon não lê a trilha de leitura de PII');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.pii_read_audit_log', 'select'), 'authenticated não lê a trilha de leitura de PII');
select ok(not pg_catalog.has_table_privilege('site_api', 'site_private.pii_read_audit_log', 'select'), 'site_api não lê a trilha de leitura de PII (só grava via RPC)');
select ok(pg_catalog.has_table_privilege('service_role', 'site_private.pii_read_audit_log', 'select'), 'service_role lê a trilha de leitura de PII');

-- A função de log existe e é executável por authenticated (a RPC roda como o titular).
select ok(pg_catalog.has_function_privilege('authenticated', 'site_private.log_pii_read(text, uuid)', 'execute'), 'authenticated executa log_pii_read');

-- A RPC pública continua exposta e com a mesma assinatura.
select ok(pg_catalog.has_function_privilege('authenticated', 'public.get_my_quote_request(uuid)', 'execute'), 'authenticated executa get_my_quote_request');
select ok(not pg_catalog.has_function_privilege('anon', 'public.get_my_quote_request(uuid)', 'execute'), 'anon não executa get_my_quote_request');

-- Setup: um titular autenticado e um pedido com PII associado a ele.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'titular@example.test');

with inserted as (
  insert into site_private.quote_requests (
    client_request_id, request_hash, source, contact_name, company, email, phone,
    client_submitted_at, customer_user_id
  ) values (
    'pii-read-test-1', repeat('b', 64), 'site-promo-brindes',
    'Cliente PII', 'Empresa PII', 'titular@example.test', '11999998888', now(),
    '11111111-1111-1111-1111-111111111111'
  ) returning id
)
select set_config('pgtap.test_request_id', (select id::text from inserted), false);

select is(
  (select public.get_my_quote_request('00000000-0000-0000-0000-000000000000')),
  null::jsonb,
  'RPC devolve null para pedido inexistente e não audita'
);

select lives_ok(
  $$ select public.get_my_quote_request('00000000-0000-0000-0000-000000000000') $$,
  'RPC não lança para pedido inexistente do titular'
);

-- Leitura do próprio titular: resolve e audita exatamente 1 leitura.
select lives_ok(
  $$ select public.get_my_quote_request(current_setting('pgtap.test_request_id')::uuid) $$,
  'RPC lê o pedido do próprio titular'
);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where table_name = 'quote_requests' and operation = 'SELECT'
     and subject = '11111111-1111-1111-1111-111111111111'::uuid),
  1::bigint,
  'RPC registra 1 leitura de PII do titular'
);

-- Leitura de outro titular: RLS devolve null e não audita.
insert into auth.users (id, email) values
  ('22222222-2222-2222-2222-222222222222', 'outro@example.test');
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select is(
  (select public.get_my_quote_request(current_setting('pgtap.test_request_id')::uuid)),
  null::jsonb,
  'RPC devolve null para pedido de outro titular'
);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where table_name = 'quote_requests' and operation = 'SELECT'
     and subject = '11111111-1111-1111-1111-111111111111'::uuid),
  1::bigint,
  'Leitura de outro titular não gera novo registro de auditoria'
);
