-- Etapa 25 do plano de correções: validação empírica de que a role site_api tem
-- exatamente os grants necessários para as 13 RPCs de serviço — nem mais (privilégio
-- excessivo) nem menos (quebraria em produção). `set role` troca o papel efetivo desta
-- sessão de teste para site_api antes de cada chamada; qualquer grant faltando aparece
-- como "permission denied" aqui, não silenciosamente em produção.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(17);

-- Confirma primeiro que anon/authenticated continuam sem acesso a nenhuma das 13
-- (site_api substitui service_role só para a API, nunca amplia o que o navegador vê).
select ok(not pg_catalog.has_function_privilege('anon', 'public.create_site_quote_request(jsonb,jsonb)', 'execute'), 'anon continua sem create_site_quote_request');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.create_site_quote_request(jsonb,jsonb)', 'execute'), 'authenticated continua sem create_site_quote_request');
select ok(not pg_catalog.has_table_privilege('site_api', 'site_private.customer_profiles', 'select'), 'site_api não tem acesso a customer_profiles (fora do escopo das 13 RPCs)');
select ok(not pg_catalog.has_table_privilege('site_api', 'site_private.proposal_documents', 'insert'), 'site_api não insere proposal_documents (isso é fluxo administrativo)');

-- Grants só-de-teste, dentro desta transação que é sempre revertida no rollback final:
-- pgTAP (lives_ok, ok, etc.) precisa continuar resolvível depois do `set local role`
-- abaixo. Não é assim que site_api existe fora deste arquivo — a migration real não
-- concede nada em extensions.
grant usage on schema extensions to site_api;
grant execute on all functions in schema extensions to site_api;

set local role site_api;

select lives_ok(
  $$
    select public.create_site_quote_request(
      jsonb_build_object(
        'source', 'site-promo-brindes', 'clientRequestId', 'site-api-quote-1', 'submittedAt', now(),
        'pageUrl', 'https://promo.test/orcamento',
        'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
        'contact', jsonb_build_object('name', 'Cliente Site Api', 'company', 'Empresa Site Api', 'email', 'siteapi@example.test', 'phone', '(11) 95555-1111', 'city', '', 'deadline', '', 'notes', ''),
        'items', jsonb_build_array(jsonb_build_object(
          'productId', '33333333-3333-4333-8333-333333333333', 'key', '33333333-3333-4333-8333-333333333333::sem-cor',
          'slug', 'produto-site-api', 'name', 'Produto site api', 'sku', 'SITEAPI-1', 'imageUrl', '/images/product-placeholder.svg',
          'quantity', 100, 'minQuantity', 50
        ))
      ),
      jsonb_build_object(
        'requestHash', repeat('e', 64), 'identifierHash', repeat('f', 64),
        'notificationPreferences', jsonb_build_object('emailCopy', true, 'whatsappCopy', true)
      )
    )
  $$,
  'site_api executa create_site_quote_request de ponta a ponta (insere quote_requests/quote_items/consent_receipts, dispara os 3 triggers de insert, chama consume_rate_limit)'
);

select lives_ok(
  $$
    select public.create_site_contact_request(
      jsonb_build_object(
        'source', 'site-promo-brindes-contact', 'clientRequestId', 'site-api-contact-1', 'submittedAt', now(),
        'pageUrl', 'https://promo.test/contato',
        'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
        'contact', jsonb_build_object('name', 'Cliente Contato', 'email', 'contatositeapi@example.test', 'phone', '(11) 94444-2222', 'message', 'Quero conversar', 'responseChannel', 'email')
      ),
      jsonb_build_object('requestHash', repeat('a', 64), 'identifierHash', repeat('b', 64))
    )
  $$,
  'site_api executa create_site_contact_request de ponta a ponta'
);

select lives_ok(
  $$ select public.claim_site_notification_deliveries(array['email', 'whatsapp'], 10) $$,
  'site_api executa claim_site_notification_deliveries (lê notification_policy, atualiza notification_deliveries)'
);

select lives_ok(
  $$
    select public.claim_site_quote_notification(
      (select request.id from site_private.quote_requests request where client_request_id = 'site-api-quote-1'), 'whatsapp'
    )
  $$,
  'site_api executa claim_site_quote_notification'
);

select lives_ok(
  $$
    select public.finalize_site_notification_delivery(
      (select delivery.id from site_private.notification_deliveries delivery
       join site_private.quote_requests request on request.id = delivery.request_id
       where request.client_request_id = 'site-api-quote-1' and delivery.channel = 'email'),
      (select lease_token from site_private.notification_deliveries delivery
       join site_private.quote_requests request on request.id = delivery.request_id
       where request.client_request_id = 'site-api-quote-1' and delivery.channel = 'email'),
      'sent', 'resend', 'site-api-msg-1', null, null
    )
  $$,
  'site_api executa finalize_site_notification_delivery (usa next_retry_at internamente no ramo failed, aqui sent)'
);

select lives_ok(
  $$
    select public.record_site_notification_provider_acceptance(
      (select delivery.id from site_private.notification_deliveries delivery
       join site_private.quote_requests request on request.id = delivery.request_id
       where request.client_request_id = 'site-api-quote-1' and delivery.channel = 'whatsapp'),
      (select lease_token from site_private.notification_deliveries delivery
       join site_private.quote_requests request on request.id = delivery.request_id
       where request.client_request_id = 'site-api-quote-1' and delivery.channel = 'whatsapp'),
      'meta-whatsapp-cloud', 'site-api-wamid-1'
    )
  $$,
  'site_api executa record_site_notification_provider_acceptance'
);

select lives_ok(
  $$
    select public.apply_site_notification_provider_event(
      'resend', 'site-api-msg-1', 'delivered', 'site-api-evt-1', now()
    )
  $$,
  'site_api executa apply_site_notification_provider_event (insere notification_provider_events, atualiza notification_deliveries)'
);

select lives_ok(
  $$ select public.site_notification_queue_health() $$,
  'site_api executa site_notification_queue_health'
);

select lives_ok(
  $$
    select public.create_site_shared_selection(
      jsonb_build_array(jsonb_build_object('id', '11111111-1111-4111-8111-111111111111', 'q', 5)),
      repeat('c', 64), repeat('d', 64)
    )
  $$,
  'site_api executa create_site_shared_selection'
);

create temporary table site_api_shared_selection_result as
select public.create_site_shared_selection(
  jsonb_build_array(jsonb_build_object('id', '22222222-2222-4222-8222-222222222222', 'q', 3)),
  repeat('1', 64), repeat('2', 64)
) as result;

select lives_ok(
  $$ select public.get_site_shared_selection((select (result ->> 'token')::uuid from site_api_shared_selection_result), repeat('3', 64)) $$,
  'site_api executa get_site_shared_selection'
);

select lives_ok(
  $$
    select public.revoke_site_shared_selection(
      (select (result ->> 'token')::uuid from site_api_shared_selection_result), repeat('1', 64), repeat('4', 64)
    )
  $$,
  'site_api executa revoke_site_shared_selection'
);

select lives_ok(
  $$ select public.get_site_data_retention_candidates(10) $$,
  'site_api executa get_site_data_retention_candidates (chama site_private.get_expired_site_data_candidates internamente)'
);

select lives_ok(
  $$ select public.finalize_site_data_retention(array[]::uuid[], array[]::text[], 10) $$,
  'site_api executa finalize_site_data_retention (chama site_private.finalize_expired_site_data internamente)'
);

reset role;

select * from finish();
rollback;
