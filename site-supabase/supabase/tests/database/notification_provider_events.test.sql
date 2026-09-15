begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(27);

select has_column('site_private', 'notification_deliveries', 'delivery_state', 'entrega ganha estado terminal pós-aceite (Etapa 30)');
select has_column('site_private', 'notification_deliveries', 'bounce_reason', 'devolução guarda a categoria curta do provedor');
select has_column('site_private', 'notification_deliveries', 'complained_at', 'reclamação é rastreada independentemente da entrega');
select has_table('site_private', 'notification_provider_events', 'deduplicação de eventos de webhook fica em tabela própria');

select ok(
  not pg_catalog.has_function_privilege('anon', 'public.apply_site_notification_provider_event(text,text,text,text,timestamptz,text)', 'execute'),
  'anon não aplica eventos de webhook'
);
select ok(
  not pg_catalog.has_function_privilege('authenticated', 'public.apply_site_notification_provider_event(text,text,text,text,timestamptz,text)', 'execute'),
  'cliente autenticado não aplica eventos de webhook'
);
select ok(
  pg_catalog.has_function_privilege('service_role', 'public.apply_site_notification_provider_event(text,text,text,text,timestamptz,text)', 'execute'),
  'backend aplica eventos de webhook'
);
select ok(
  (select array_to_string(p.proconfig, ',') = 'search_path=""'
   from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'apply_site_notification_provider_event'),
  'função fixa search_path vazio'
);

-- Uma entrega real, aceita pelo provedor (status já avançou para 'sent' no
-- fluxo normal, mas a busca do webhook não filtra por status — ver comentário
-- na migration), serve de alvo para os eventos abaixo.
select is(
  (public.create_site_quote_request(
    jsonb_build_object(
      'source', 'site-promo-brindes', 'clientRequestId', 'provider-events-quote-1', 'submittedAt', now(),
      'pageUrl', 'https://promo.test/orcamento',
      'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
      'contact', jsonb_build_object('name', 'Cliente Eventos', 'company', 'Empresa Eventos', 'email', 'eventos@example.test', 'phone', '(11) 96666-6666', 'city', '', 'deadline', '', 'notes', ''),
      'items', jsonb_build_array(jsonb_build_object(
        'productId', '33333333-3333-4333-8333-333333333333', 'key', '33333333-3333-4333-8333-333333333333::sem-cor',
        'slug', 'produto-fila', 'name', 'Produto fila', 'sku', 'FILA-1', 'imageUrl', '/images/product-placeholder.svg',
        'quantity', 100, 'minQuantity', 50
      ))
    ),
    jsonb_build_object(
      'requestHash', repeat('7', 64), 'identifierHash', repeat('8', 64),
      'notificationPreferences', jsonb_build_object('emailCopy', true, 'whatsappCopy', false)
    )
  )) ->> 'duplicate',
  'false',
  'orçamento de teste foi criado'
);

update site_private.notification_deliveries delivery
set status = 'sent', provider = 'resend', provider_message_id = 'resend-msg-events-1'
from site_private.quote_requests request
where request.id = delivery.request_id and request.client_request_id = 'provider-events-quote-1' and delivery.channel = 'email';

select is(
  (select delivery.provider_message_id from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'provider-events-quote-1' and delivery.channel = 'email'),
  'resend-msg-events-1',
  'pré-condição: entrega aceita pelo provedor com provider_message_id conhecido'
);

-- Primeiro evento: aplica.
select is(
  public.apply_site_notification_provider_event('resend', 'resend-msg-events-1', 'delivered', 'evt-delivered-1', now()) ->> 'applied',
  'true',
  'primeiro evento de entrega aplica'
);
select is(
  (select delivery.delivery_state from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'provider-events-quote-1' and delivery.channel = 'email'),
  'delivered',
  'delivery_state grava delivered'
);
select isnt(
  (select delivery.delivery_state_at from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'provider-events-quote-1' and delivery.channel = 'email'),
  null,
  'delivery_state_at é preenchido'
);

-- Reentrega do mesmo provider_event_id (ex.: Svix reenviando antes da 2xx
-- chegar): é uma duplicata conhecida, não reaplica.
select is(
  public.apply_site_notification_provider_event('resend', 'resend-msg-events-1', 'delivered', 'evt-delivered-1', now()) ->> 'reason',
  'duplicate',
  'reentrega do mesmo provider_event_id é no-op'
);

-- Um bounced atrasado, com provider_event_id novo, chega depois de um
-- delivered já aplicado: não deve regredir o estado terminal.
select is(
  public.apply_site_notification_provider_event('resend', 'resend-msg-events-1', 'bounced', 'evt-bounced-1', now(), 'HardBounce') ->> 'applied',
  'false',
  'bounced após delivered já aplicado não é reaplicado'
);
select is(
  public.apply_site_notification_provider_event('resend', 'resend-msg-events-1', 'bounced', 'evt-bounced-2', now(), 'HardBounce') ->> 'reason',
  'delivery_state_already_set',
  'motivo do não-reaplicação é o estado terminal já definido'
);
select is(
  (select delivery.delivery_state from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'provider-events-quote-1' and delivery.channel = 'email'),
  'delivered',
  'delivery_state não regride de delivered para bounced'
);
select is(
  (select delivery.bounce_reason from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'provider-events-quote-1' and delivery.channel = 'email'),
  null,
  'bounce_reason não é gravado quando o bounced é ignorado'
);

-- Reclamação é independente de delivery_state: uma mensagem entregue pode
-- ser reclamada depois, e ambos os campos coexistem.
select is(
  public.apply_site_notification_provider_event('resend', 'resend-msg-events-1', 'complained', 'evt-complained-1', now()) ->> 'applied',
  'true',
  'evento de reclamação aplica mesmo com delivery_state já definido'
);
select isnt(
  (select delivery.complained_at from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'provider-events-quote-1' and delivery.channel = 'email'),
  null,
  'complained_at é preenchido'
);
select is(
  (select delivery.delivery_state from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'provider-events-quote-1' and delivery.channel = 'email'),
  'delivered',
  'delivery_state permanece delivered após a reclamação'
);

-- provider_message_id desconhecido: não aplica, mas grava o evento (para que
-- uma reentrega futura do mesmo id seja reconhecida como duplicata).
select is(
  public.apply_site_notification_provider_event('resend', 'resend-msg-desconhecido', 'delivered', 'evt-desconhecido-1', now()) ->> 'reason',
  'delivery_not_found',
  'provider_message_id desconhecido não aplica'
);
select is(
  public.apply_site_notification_provider_event('resend', 'resend-msg-desconhecido', 'delivered', 'evt-desconhecido-1', now()) ->> 'reason',
  'duplicate',
  'evento de entrega desconhecida ainda assim é deduplicado numa reentrega'
);

-- Validação de entrada.
select throws_ok(
  $$select public.apply_site_notification_provider_event('sendgrid', 'msg-1', 'delivered', 'evt-x', now())$$,
  '22023',
  'invalid_notification_provider_event_input',
  'provider fora do conjunto aceito é rejeitado'
);
select throws_ok(
  $$select public.apply_site_notification_provider_event('resend', 'msg-1', 'opened', 'evt-x', now())$$,
  '22023',
  'invalid_notification_provider_event_input',
  'event_type fora do conjunto aceito é rejeitado'
);
select throws_ok(
  $$select public.apply_site_notification_provider_event('resend', '', 'delivered', 'evt-x', now())$$,
  '22023',
  'invalid_notification_provider_event_input',
  'provider_message_id vazio é rejeitado'
);
select throws_ok(
  $$select public.apply_site_notification_provider_event('resend', 'msg-1', 'bounced', 'evt-x', now(), repeat('a', 201))$$,
  '22023',
  'invalid_notification_provider_event_input',
  'bounce_reason acima de 200 caracteres é rejeitado'
);

select * from finish();
rollback;
