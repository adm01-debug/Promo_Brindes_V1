begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(17);

select has_column('site_private', 'notification_deliveries', 'next_attempt_at', 'fila possui agenda de nova tentativa');
select has_trigger('site_private', 'quote_requests', 'quote_requests_enqueue_confirmations', 'novo orçamento alimenta a fila na mesma transação');
select ok(not pg_catalog.has_function_privilege('anon', 'public.claim_site_notification_deliveries(text[],integer)', 'execute'), 'anon não reivindica notificações');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.claim_site_notification_deliveries(text[],integer)', 'execute'), 'cliente autenticado não reivindica notificações');
select ok(pg_catalog.has_function_privilege('service_role', 'public.claim_site_notification_deliveries(text[],integer)', 'execute'), 'backend pode reivindicar notificações');
select ok(not pg_catalog.has_function_privilege('anon', 'public.finalize_site_notification_delivery(uuid,text,text,text,text,integer)', 'execute'), 'anon não finaliza notificações');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.claim_site_quote_notification(uuid,text)', 'execute'), 'cliente autenticado não reivindica comprovante imediato');
select ok(pg_catalog.has_function_privilege('service_role', 'public.claim_site_quote_notification(uuid,text)', 'execute'), 'backend pode reivindicar comprovante imediato');
select ok(
  (select bool_and(array_to_string(p.proconfig, ',') = 'search_path=""')
   from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where (n.nspname = 'public' and p.proname in ('claim_site_notification_deliveries', 'claim_site_quote_notification', 'finalize_site_notification_delivery'))
      or (n.nspname = 'site_private' and p.proname = 'enqueue_quote_confirmations')),
  'funções da fila fixam search_path vazio'
);

select is(
  (public.create_site_quote_request(
    jsonb_build_object(
      'source', 'site-promo-brindes', 'clientRequestId', 'notification-outbox-quote-1', 'submittedAt', now(),
      'pageUrl', 'https://promo.test/orcamento',
      'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
      'contact', jsonb_build_object('name', 'Cliente Fila', 'company', 'Empresa Fila', 'email', 'fila@example.test', 'phone', '(11) 99999-9999', 'city', '', 'deadline', '', 'notes', ''),
      'items', jsonb_build_array(jsonb_build_object(
        'productId', '33333333-3333-4333-8333-333333333333', 'key', '33333333-3333-4333-8333-333333333333::sem-cor',
        'slug', 'produto-fila', 'name', 'Produto fila', 'sku', 'FILA-1', 'imageUrl', '/images/product-placeholder.svg',
        'quantity', 100, 'minQuantity', 50
      ))
    ),
    jsonb_build_object(
      'requestHash', repeat('1', 64), 'identifierHash', repeat('2', 64),
      'notificationPreferences', jsonb_build_object('emailCopy', true, 'whatsappCopy', true)
    )
  )) ->> 'duplicate',
  'false',
  'orçamento de teste foi criado'
);

select is(
  (select count(*) from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'notification-outbox-quote-1'),
  2::bigint,
  'opt-in explícito cria e-mail e WhatsApp'
);
select is(
  (select count(*) from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'notification-outbox-quote-1' and delivery.channel = 'email'),
  1::bigint,
  'cópia por e-mail é única'
);
select is(
  (select count(*) from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'notification-outbox-quote-1' and delivery.channel = 'whatsapp'),
  1::bigint,
  'WhatsApp só foi enfileirado pelo opt-in'
);

create temporary table claimed_jobs(payload jsonb);
insert into claimed_jobs select public.claim_site_notification_deliveries(array['email'], 10);

select ok((select jsonb_array_length(payload) from claimed_jobs) >= 1, 'worker reivindica ao menos o e-mail pendente');
select is(
  (select job ->> 'recipientEmail' from claimed_jobs, lateral jsonb_array_elements(payload) job where job ->> 'recipientEmail' = 'fila@example.test' limit 1),
  'fila@example.test',
  'job contém o destinatário esperado somente para o backend'
);
select ok(
  public.finalize_site_notification_delivery(
    (select (job ->> 'id')::uuid from claimed_jobs, lateral jsonb_array_elements(payload) job where job ->> 'recipientEmail' = 'fila@example.test' limit 1),
    'sent', 'provider-test', 'message-test', null, 300
  ),
  'worker finaliza a tentativa reivindicada'
);
select is(
  (select delivery.status from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'notification-outbox-quote-1' and delivery.channel = 'email'),
  'sent',
  'entrega finalizada permanece auditável'
);

select * from finish();
rollback;
