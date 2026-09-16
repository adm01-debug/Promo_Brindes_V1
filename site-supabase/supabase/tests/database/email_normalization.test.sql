-- Etapa 24 do plano de correções: e-mail sempre armazenado normalizado
-- (trim + lower) em quote_requests, contact_requests e customer_profiles.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

select is(site_private.normalize_email('  ANA@Empresa.TEST  '), 'ana@empresa.test', 'normalize_email tira espaços e baixa a caixa');
select is(site_private.normalize_email('ana@empresa.test'), 'ana@empresa.test', 'valor já normalizado permanece idêntico (idempotente)');

select throws_like(
  $$
    insert into site_private.quote_requests (
      client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at
    ) values (
      'email-norm-bad-1', repeat('9', 64), 'site-promo-brindes',
      'Cliente', 'Empresa', 'MAIUSCULO@EMPRESA.TEST', '(11) 90000-0000', now()
    )
  $$,
  '%quote_requests_email_normalized_check%',
  'quote_requests rejeita e-mail com maiúsculas não normalizado'
);

select throws_like(
  $$
    insert into site_private.quote_requests (
      client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at
    ) values (
      'email-norm-bad-2', repeat('8', 64), 'site-promo-brindes',
      'Cliente', 'Empresa', ' ana@empresa.test', '(11) 90000-0000', now()
    )
  $$,
  '%quote_requests_email_normalized_check%',
  'quote_requests rejeita e-mail com espaço não normalizado'
);

select lives_ok(
  $$
    insert into site_private.quote_requests (
      client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at
    ) values (
      'email-norm-ok-1', repeat('7', 64), 'site-promo-brindes',
      'Cliente', 'Empresa', 'ana@empresa.test', '(11) 90000-0000', now()
    )
  $$,
  'quote_requests aceita e-mail já normalizado'
);

select throws_like(
  $$
    insert into site_private.contact_requests (
      client_request_id, request_hash, source, contact_name, email, client_submitted_at
    ) values (
      'email-norm-contact-bad-1', repeat('6', 64), 'site-promo-brindes-contact',
      'Cliente', 'MAIUSCULO@EMPRESA.TEST', now()
    )
  $$,
  '%contact_requests_email_normalized_check%',
  'contact_requests rejeita e-mail não normalizado'
);

select lives_ok(
  $$
    insert into site_private.contact_requests (
      client_request_id, request_hash, source, contact_name, email, client_submitted_at
    ) values (
      'email-norm-contact-ok-1', repeat('5', 64), 'site-promo-brindes-contact',
      'Cliente', 'ana@empresa.test', now()
    )
  $$,
  'contact_requests aceita e-mail já normalizado'
);

select ok(not pg_catalog.has_function_privilege('anon', 'site_private.normalize_email(text)', 'execute'), 'anon não chama normalize_email diretamente');
select ok(pg_catalog.has_function_privilege('service_role', 'site_private.normalize_email(text)', 'execute'), 'backend chama normalize_email');

select * from finish();
rollback;
