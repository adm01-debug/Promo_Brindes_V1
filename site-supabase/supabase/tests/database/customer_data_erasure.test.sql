-- Etapa 32 do plano de correções: apagamento de titular (LGPD art. 18).

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(28);

select ok(not pg_catalog.has_function_privilege('anon', 'public.erase_customer_data(text)', 'execute'), 'anon não apaga dados de titular');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.erase_customer_data(text)', 'execute'), 'authenticated não apaga dados de titular (operação administrativa)');
select ok(pg_catalog.has_function_privilege('service_role', 'public.erase_customer_data(text)', 'execute'), 'service_role executa o apagamento');

-- O e-mail já entra normalizado (Etapa 24 exige isso via constraint na própria
-- tabela); quem recebe o valor em maiúsculas/com espaço e precisa normalizar é o
-- PARÂMETRO de erase_customer_data, testado abaixo com 'Fulano@Example.TEST'.
insert into site_private.quote_requests (
  client_request_id, request_hash, source, contact_name, company, email, phone, city, notes, client_submitted_at
) values (
  'erasure-test-quote-1', repeat('9', 64), 'site-promo-brindes',
  'Fulano de Tal', 'Empresa Fulano', 'fulano@example.test', '11988887777', 'São Paulo', 'Nota pessoal', now()
);

insert into site_private.contact_requests (
  client_request_id, request_hash, source, contact_name, email, phone, message, client_submitted_at
) values (
  'erasure-test-contact-1', repeat('8', 64), 'site-promo-brindes-contact',
  'Fulano de Tal', 'fulano@example.test', '11977776666', 'Meu CPF é 000.000.000-00', now()
);

insert into site_private.proposal_documents (quote_request_id, version, title, storage_path, published_at)
select id, 1, 'Proposta Fulano', 'fulano/proposta-1.pdf', now()
from site_private.quote_requests where client_request_id = 'erasure-test-quote-1';

-- customer_profiles: cobre o ramo da função que o teste original nunca exercitava —
-- inclusive o fix de precedência de operador do idempotente (profile.verified_email
-- !~ '^titular-...' em vez de <> v_email or (...), que causava reprocessamento).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'authenticated', 'authenticated', 'fulano@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);
insert into site_private.customer_profiles (user_id, verified_email, display_name, company)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'fulano@example.test', 'Fulano de Tal', 'Empresa Fulano');
update site_private.quote_requests
set customer_user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
where client_request_id = 'erasure-test-quote-1';
insert into site_private.quote_adjustment_requests (
  quote_request_id, requested_by, client_request_id, message
)
select id, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'erasure-adjustment-001', 'Meu documento é 000.000.000-00'
from site_private.quote_requests where client_request_id = 'erasure-test-quote-1';
insert into site_private.customer_briefing_assets (
  customer_user_id, kind, original_name, storage_path, mime_type, size_bytes
) values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'logo', 'logo.png',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-logo.png',
  'image/png', 128
);

create temporary table erasure_result as select public.erase_customer_data('  Fulano@Example.TEST  ') as result;

select is((select (result ->> 'quotesAnonymized')::integer from erasure_result), 1, 'anonimiza 1 quote_request (e-mail com espaço/maiúsculas normalizado na entrada)');
select is((select (result ->> 'contactsAnonymized')::integer from erasure_result), 1, 'anonimiza 1 contact_request');
select is((select (result ->> 'profilesAnonymized')::integer from erasure_result), 1, 'anonimiza 1 customer_profiles');
select is((select (result ->> 'proposalDocumentsDeleted')::integer from erasure_result), 1, 'apaga 1 proposal_document');
select is((select (result ->> 'authUsersDeleted')::integer from erasure_result), 1, 'remove a conta Auth e invalida as sessões por cascade');
select is((select (result ->> 'storagePathsQueued')::integer from erasure_result), 1, 'enfileira o blob da proposta antes de apagar o metadado');
select is((select jsonb_array_length(result -> 'storagePathsToRemove') from erasure_result), 1, 'devolve 1 caminho de Storage para o chamador limpar');
select is(
  (select result -> 'storagePathsToRemove' -> 0 ->> 'path' from erasure_result),
  'fulano/proposta-1.pdf',
  'caminho de Storage devolvido é o correto'
);
select is(
  (select bucket from site_private.storage_deletion_queue where object_path = 'fulano/proposta-1.pdf'),
  'customer-proposals',
  'proposta fica na fila transacional de exclusão do bucket correto'
);

select is(
  (select contact_name from site_private.quote_requests where client_request_id = 'erasure-test-quote-1'),
  '[apagado a pedido do titular]',
  'quote_requests.contact_name anonimizado'
);
select is(
  (select city from site_private.quote_requests where client_request_id = 'erasure-test-quote-1'),
  null,
  'quote_requests.city removido (não é preservado, ao contrário de id/protocol/created_at)'
);
select ok(
  (select protocol from site_private.quote_requests where client_request_id = 'erasure-test-quote-1') is not null,
  'protocol é preservado (integridade referencial / evidência de conformidade, não é PII)'
);
select is(
  (select customer_user_id from site_private.quote_requests where client_request_id = 'erasure-test-quote-1'),
  null,
  'vínculo reversível com a conta apagada é removido'
);
select is(
  (select count(*) from site_private.proposal_documents document
   join site_private.quote_requests request on request.id = document.quote_request_id
   where request.client_request_id = 'erasure-test-quote-1'),
  0::bigint,
  'proposal_documents da linha foi apagado'
);

select is(
  (select message from site_private.contact_requests where client_request_id = 'erasure-test-contact-1'),
  '[apagado a pedido do titular]',
  'texto livre do contato é removido'
);
select is(
  (select count(*) from site_private.quote_adjustment_requests where client_request_id = 'erasure-adjustment-001'),
  0::bigint,
  'pedido de ajuste e seu texto livre desaparecem pelo cascade da conta Auth'
);
select is(
  (select count(*) from auth.users where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
  0::bigint,
  'conta Auth foi apagada'
);
select is(
  (select count(*) from site_private.customer_profiles where user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
  0::bigint,
  'perfil desaparece pelo cascade do Auth sem deixar vínculo reversível'
);
select is(
  (select bucket from site_private.storage_deletion_queue where object_path like 'dddddddd-dddd-4ddd-8ddd-dddddddddddd/%'),
  'customer-briefing-assets',
  'anexo privado fica enfileirado antes do cascade'
);
select is(
  (select count(*) from site_private.erased_customer_identities),
  1::bigint,
  'tombstone irreversível do e-mail normalizado é preservado sem guardar o e-mail'
);

-- Idempotência: reexecutar para o mesmo e-mail não reprocessa linhas já anonimizadas.
create temporary table erasure_result_2 as select public.erase_customer_data('fulano@example.test') as result;
select is((select (result ->> 'quotesAnonymized')::integer from erasure_result_2), 0, 'segunda execução é idempotente: 0 quotes reprocessadas');
select is((select (result ->> 'contactsAnonymized')::integer from erasure_result_2), 0, 'segunda execução é idempotente: 0 contacts reprocessados');
select is(
  (select (result ->> 'profilesAnonymized')::integer from erasure_result_2), 0,
  'segunda execução é idempotente: 0 profiles reprocessados (cobre o fix de precedência do operador nesta sessão)'
);

select throws_like(
  $$ select public.erase_customer_data('nao-e-email') $$,
  '%invalid_erasure_email%',
  'e-mail fora do formato mínimo é rejeitado'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'authenticated', 'authenticated', 'fulano@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);
set local request.jwt.claims = '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","role":"authenticated"}';
select throws_ok(
  $$ select public.claim_my_quote_requests() $$,
  '42501',
  'identity_erased',
  'nova conta com o mesmo e-mail não consegue reverter o apagamento reivindicando histórico'
);

select * from finish();
rollback;
