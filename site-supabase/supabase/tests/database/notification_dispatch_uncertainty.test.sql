-- WhatsApp não possui chave de idempotência. Uma intenção gravada antes da chamada
-- externa impede reenvio cego se a resposta da Meta ou a confirmação no DB se perder.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

select ok(
  not pg_catalog.has_function_privilege('anon', 'public.record_site_notification_dispatch_started(uuid,uuid)', 'execute'),
  'anon não marca intenção de disparo'
);
select ok(
  pg_catalog.has_function_privilege('site_api', 'public.record_site_notification_dispatch_started(uuid,uuid)', 'execute'),
  'worker limitado pode marcar a intenção antes de chamar a Meta'
);

select is(
  public.create_site_quote_request(
    jsonb_build_object(
      'source', 'site-promo-brindes', 'clientRequestId', 'dispatch-uncertain-quote-1', 'submittedAt', now(),
      'pageUrl', 'https://promo.test/orcamento',
      'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
      'contact', jsonb_build_object('name', 'Cliente Incerteza', 'company', 'Empresa Incerteza', 'email', 'incerteza@example.test', 'phone', '(11) 99999-0000', 'city', '', 'deadline', '', 'notes', ''),
      'items', jsonb_build_array(jsonb_build_object(
        'productId', '33333333-3333-4333-8333-333333333333', 'key', '33333333-3333-4333-8333-333333333333::sem-cor',
        'slug', 'produto-fila', 'name', 'Produto fila', 'sku', 'FILA-1', 'imageUrl', '/images/product-placeholder.svg',
        'quantity', 100, 'minQuantity', 50
      ))
    ),
    jsonb_build_object(
      'requestHash', repeat('5', 64), 'identifierHash', repeat('6', 64),
      'notificationPreferences', jsonb_build_object('emailCopy', false, 'whatsappCopy', true)
    )
  ) ->> 'duplicate',
  'false',
  'orçamento com opt-in WhatsApp é criado'
);

create temporary table uncertain_claim as
select public.claim_site_notification_deliveries(array['whatsapp'], 10) as payload;
select is((select jsonb_array_length(payload) from uncertain_claim), 1, 'worker reivindica o WhatsApp');
select ok(
  public.record_site_notification_dispatch_started(
    (select (job ->> 'id')::uuid from uncertain_claim, lateral jsonb_array_elements(payload) job limit 1),
    (select (job ->> 'leaseToken')::uuid from uncertain_claim, lateral jsonb_array_elements(payload) job limit 1)
  ),
  'intenção pré-disparo é persistida com o lease corrente'
);

update site_private.notification_deliveries
set lease_expires_at = now() - interval '1 minute'
where id = (select (job ->> 'id')::uuid from uncertain_claim, lateral jsonb_array_elements(payload) job limit 1);
create temporary table blocked_reclaim as
select public.claim_site_notification_deliveries(array['whatsapp'], 10) as payload;
select is((select jsonb_array_length(payload) from blocked_reclaim), 0, 'lease expirado incerto não é reenviado automaticamente');
select is(
  (select (channel ->> 'uncertainCount')::integer from jsonb_array_elements(public.site_notification_queue_health()) channel where channel ->> 'channel' = 'whatsapp'),
  1,
  'saúde da fila expõe o caso incerto para alerta operacional'
);
select is(
  (select status from site_private.notification_deliveries where id = (select (job ->> 'id')::uuid from uncertain_claim, lateral jsonb_array_elements(payload) job limit 1)),
  'processing',
  'caso incerto permanece congelado em processing até reconciliação'
);

select ok(
  public.record_site_notification_provider_acceptance(
    (select (job ->> 'id')::uuid from uncertain_claim, lateral jsonb_array_elements(payload) job limit 1),
    (select (job ->> 'leaseToken')::uuid from uncertain_claim, lateral jsonb_array_elements(payload) job limit 1),
    'meta-whatsapp-cloud', 'wamid-recuperado-manualmente'
  ),
  'aceite posteriormente confirmado pode ser reconciliado sem novo envio'
);
create temporary table reconciled_claim as
select public.claim_site_notification_deliveries(array['whatsapp'], 10) as payload;
select is(
  (select job ->> 'existingProviderMessageId' from reconciled_claim, lateral jsonb_array_elements(payload) job limit 1),
  'wamid-recuperado-manualmente',
  'reivindicação seguinte carrega o ID confirmado e apenas finaliza'
);

select * from finish();
rollback;
