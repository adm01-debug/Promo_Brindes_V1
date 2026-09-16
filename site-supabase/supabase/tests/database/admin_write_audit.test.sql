-- Etapa 36 do plano de correções: escritas fora do caminho normal da API (Studio, SQL
-- manual) são auditadas; escritas de site_api/service_role não geram ruído.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

select ok(not pg_catalog.has_table_privilege('anon', 'site_private.admin_audit_log', 'select'), 'anon não lê a trilha de auditoria');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.admin_audit_log', 'select'), 'authenticated não lê a trilha de auditoria');
select ok(not pg_catalog.has_table_privilege('site_api', 'site_private.admin_audit_log', 'select'), 'site_api não lê a própria trilha de auditoria (não precisa para operar)');
select ok(pg_catalog.has_table_privilege('service_role', 'site_private.admin_audit_log', 'select'), 'service_role lê a trilha de auditoria');

-- current_user nesta sessão de teste é o superusuário local (postgres) — simula
-- exatamente o cenário real que a etapa audita: alguém escrevendo fora de
-- site_api/service_role.
insert into site_private.quote_requests (
  client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at
) values (
  'admin-audit-test-1', repeat('a', 64), 'site-promo-brindes',
  'Cliente Auditoria', 'Empresa Auditoria', 'auditoria@example.test', '11966665555', now()
);

select is(
  (select count(*) from site_private.admin_audit_log
   where table_name = 'quote_requests' and operation = 'INSERT'
     and row_id = (select id::text from site_private.quote_requests where client_request_id = 'admin-audit-test-1')),
  1::bigint,
  'insert fora de site_api/service_role é registrado (Etapa 36)'
);

update site_private.quote_requests set city = 'Rio de Janeiro' where client_request_id = 'admin-audit-test-1';

select is(
  (select count(*) from site_private.admin_audit_log
   where table_name = 'quote_requests' and operation = 'UPDATE'
     and row_id = (select id::text from site_private.quote_requests where client_request_id = 'admin-audit-test-1')),
  1::bigint,
  'update fora de site_api/service_role é registrado'
);

select is(
  (select performed_by from site_private.admin_audit_log where table_name = 'quote_requests' and operation = 'INSERT'
   and row_id = (select id::text from site_private.quote_requests where client_request_id = 'admin-audit-test-1')),
  current_user::text,
  'performed_by registra a role que escreveu, não uma role genérica'
);

-- DDL simples (usado em toda migration deste plano) fica na trilha de DDL — só
-- confirma que o event trigger não quebra uma operação de DDL comum.
select lives_ok(
  $$ create table site_private.admin_write_audit_test_scratch (id int) $$,
  'DDL comum continua funcionando com o event trigger instalado (Etapa 36)'
);

select * from finish();
rollback;
