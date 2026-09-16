begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(41);

select has_column('site_private', 'notification_deliveries', 'next_attempt_at', 'fila possui agenda de nova tentativa');
select has_column('site_private', 'notification_deliveries', 'lease_token', 'fila identifica a reivindicação ativa (R04)');
select has_trigger('site_private', 'quote_requests', 'quote_requests_enqueue_confirmations', 'novo orçamento alimenta a fila na mesma transação');
select ok(not pg_catalog.has_function_privilege('anon', 'public.claim_site_notification_deliveries(text[],integer)', 'execute'), 'anon não reivindica notificações');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.claim_site_notification_deliveries(text[],integer)', 'execute'), 'cliente autenticado não reivindica notificações');
select ok(pg_catalog.has_function_privilege('service_role', 'public.claim_site_notification_deliveries(text[],integer)', 'execute'), 'backend pode reivindicar notificações');
select ok(not pg_catalog.has_function_privilege('anon', 'public.finalize_site_notification_delivery(uuid,uuid,text,text,text,text,integer)', 'execute'), 'anon não finaliza notificações');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.claim_site_quote_notification(uuid,text)', 'execute'), 'cliente autenticado não reivindica comprovante imediato');
select ok(pg_catalog.has_function_privilege('service_role', 'public.claim_site_quote_notification(uuid,text)', 'execute'), 'backend pode reivindicar comprovante imediato');
select ok(
  (select bool_and(array_to_string(p.proconfig, ',') = 'search_path=""')
   from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where (n.nspname = 'public' and p.proname in ('claim_site_notification_deliveries', 'claim_site_quote_notification', 'finalize_site_notification_delivery', 'site_notification_queue_health'))
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
select isnt(
  (select job ->> 'leaseToken' from claimed_jobs, lateral jsonb_array_elements(payload) job where job ->> 'recipientEmail' = 'fila@example.test' limit 1),
  null,
  'reivindicação inclui lease_token (R04)'
);
select ok(
  (select delivery.claimed_at is not null and delivery.lease_expires_at > delivery.claimed_at
   from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'notification-outbox-quote-1' and delivery.channel = 'email'),
  'reivindicação grava claimed_at e lease_expires_at no futuro (Etapa 10)'
);

-- R04: um lease_token divergente (ex.: trabalhador antigo com reivindicação
-- expirada) não pode finalizar a reivindicação ativa.
select is(
  public.finalize_site_notification_delivery(
    (select (job ->> 'id')::uuid from claimed_jobs, lateral jsonb_array_elements(payload) job where job ->> 'recipientEmail' = 'fila@example.test' limit 1),
    gen_random_uuid(),
    'sent', 'provider-test', 'message-lease-errado', null, 300
  ),
  false,
  'lease_token divergente não finaliza (R04)'
);
select is(
  (select delivery.status from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'notification-outbox-quote-1' and delivery.channel = 'email'),
  'processing',
  'reivindicação ativa não é afetada por uma finalização com lease errado'
);

-- Finalização real, com o lease_token correto.
select ok(
  public.finalize_site_notification_delivery(
    (select (job ->> 'id')::uuid from claimed_jobs, lateral jsonb_array_elements(payload) job where job ->> 'recipientEmail' = 'fila@example.test' limit 1),
    (select (job ->> 'leaseToken')::uuid from claimed_jobs, lateral jsonb_array_elements(payload) job where job ->> 'recipientEmail' = 'fila@example.test' limit 1),
    'sent', 'provider-test', 'message-test', null, 300
  ),
  'worker finaliza a tentativa reivindicada com o lease correto'
);
select is(
  (select delivery.status from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'notification-outbox-quote-1' and delivery.channel = 'email'),
  'sent',
  'entrega finalizada permanece auditável'
);
select is(
  (select delivery.lease_expires_at from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'notification-outbox-quote-1' and delivery.channel = 'email'),
  null,
  'finalização limpa lease_expires_at junto com lease_token (Etapa 10)'
);
select ok(
  not public.finalize_site_notification_delivery(
    (select (job ->> 'id')::uuid from claimed_jobs, lateral jsonb_array_elements(payload) job where job ->> 'recipientEmail' = 'fila@example.test' limit 1),
    (select (job ->> 'leaseToken')::uuid from claimed_jobs, lateral jsonb_array_elements(payload) job where job ->> 'recipientEmail' = 'fila@example.test' limit 1),
    'sent', 'provider-test', 'message-repeticao', null, 300
  ),
  'reutilizar o mesmo lease_token após o job sair de processing não finaliza de novo'
);

-- R03: job preso em processing, com tentativas esgotadas, deve terminalizar
-- em vez de ficar preso indefinidamente. Cenário próprio, sem depender do
-- job de e-mail já finalizado acima.
select is(
  (public.create_site_quote_request(
    jsonb_build_object(
      'source', 'site-promo-brindes', 'clientRequestId', 'notification-outbox-quote-2', 'submittedAt', now(),
      'pageUrl', 'https://promo.test/orcamento',
      'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
      'contact', jsonb_build_object('name', 'Cliente Preso', 'company', 'Empresa Presa', 'email', 'preso@example.test', 'phone', '(11) 98888-8888', 'city', '', 'deadline', '', 'notes', ''),
      'items', jsonb_build_array(jsonb_build_object(
        'productId', '33333333-3333-4333-8333-333333333333', 'key', '33333333-3333-4333-8333-333333333333::sem-cor',
        'slug', 'produto-fila', 'name', 'Produto fila', 'sku', 'FILA-1', 'imageUrl', '/images/product-placeholder.svg',
        'quantity', 100, 'minQuantity', 50
      ))
    ),
    jsonb_build_object(
      'requestHash', repeat('3', 64), 'identifierHash', repeat('4', 64),
      'notificationPreferences', jsonb_build_object('emailCopy', true, 'whatsappCopy', false)
    )
  )) ->> 'duplicate',
  'false',
  'segundo orçamento de teste foi criado (cenário de recuperação)'
);

-- Simula um worker que reivindicou e travou: 5 tentativas, processing há
-- mais de 10 minutos, sem nunca finalizar. O trigger set_updated_at sobrescreve
-- updated_at incondicionalmente em todo UPDATE; desabilita só para este setup.
-- lease_expires_at no passado é o que a Etapa 10 usa para reconhecer o job como
-- preso (updated_at deixou de ter esse papel).
alter table site_private.notification_deliveries disable trigger notification_deliveries_set_updated_at;
update site_private.notification_deliveries delivery
set status = 'processing', attempts = 5, lease_token = gen_random_uuid(),
    claimed_at = now() - interval '20 minutes', lease_expires_at = now() - interval '10 minutes',
    updated_at = now() - interval '20 minutes'
from site_private.quote_requests request
where request.id = delivery.request_id and request.client_request_id = 'notification-outbox-quote-2' and delivery.channel = 'email';
alter table site_private.notification_deliveries enable trigger notification_deliveries_set_updated_at;

create temporary table claimed_jobs_2(payload jsonb);
insert into claimed_jobs_2 select public.claim_site_notification_deliveries(array['email'], 10);

select is(
  (select delivery.status from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'notification-outbox-quote-2' and delivery.channel = 'email'),
  'exhausted',
  'job preso com tentativas esgotadas termina em exhausted, não fica em processing (R03)'
);
select ok(
  not exists (
    select 1 from claimed_jobs_2, lateral jsonb_array_elements(payload) job
    where (job ->> 'id')::uuid = (
      select delivery.id from site_private.notification_deliveries delivery
      join site_private.quote_requests request on request.id = delivery.request_id
      where request.client_request_id = 'notification-outbox-quote-2' and delivery.channel = 'email'
    )
  ),
  'job exhausted não é devolvido como reivindicação nova'
);

-- Mesmo cenário, mas com tentativas restantes: deve ser reclamado de novo
-- (nova tentativa), não terminalizado.
alter table site_private.notification_deliveries disable trigger notification_deliveries_set_updated_at;
update site_private.notification_deliveries delivery
set status = 'processing', attempts = 3, lease_token = gen_random_uuid(),
    claimed_at = now() - interval '20 minutes', lease_expires_at = now() - interval '10 minutes',
    updated_at = now() - interval '20 minutes'
from site_private.quote_requests request
where request.id = delivery.request_id and request.client_request_id = 'notification-outbox-quote-2' and delivery.channel = 'email';
alter table site_private.notification_deliveries enable trigger notification_deliveries_set_updated_at;
select is(
  (select delivery.status from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'notification-outbox-quote-2' and delivery.channel = 'email'),
  'processing',
  'pré-condição: job preso com tentativas restantes'
);

create temporary table claimed_jobs_3(payload jsonb);
insert into claimed_jobs_3 select public.claim_site_notification_deliveries(array['email'], 10);

select is(
  (select delivery.status from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'notification-outbox-quote-2' and delivery.channel = 'email'),
  'processing',
  'job preso com tentativas restantes é reclamado (não exhausted) — recuperação real (R03)'
);
select is(
  (select delivery.attempts from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'notification-outbox-quote-2' and delivery.channel = 'email'),
  4::smallint,
  'reivindicação de recuperação conta como nova tentativa'
);
select ok(
  (select job ->> 'leaseToken' from claimed_jobs_3, lateral jsonb_array_elements(payload) job
   where (job ->> 'id')::uuid = (
     select delivery.id from site_private.notification_deliveries delivery
     join site_private.quote_requests request on request.id = delivery.request_id
     where request.client_request_id = 'notification-outbox-quote-2' and delivery.channel = 'email'
   )) is not null,
  'job recuperado recebe um lease_token novo'
);

-- Etapa 29: monitoramento de idade da fila. Cenário isolado — limpa o estado
-- acumulado dos cenários acima (já avaliados; apagar depois não invalida
-- assertions já registradas) para poder afirmar contagens exatas por canal,
-- em vez de "ao menos 1".
delete from site_private.notification_deliveries;

select is(
  (public.create_site_quote_request(
    jsonb_build_object(
      'source', 'site-promo-brindes', 'clientRequestId', 'notification-outbox-quote-3', 'submittedAt', now(),
      'pageUrl', 'https://promo.test/orcamento',
      'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
      'contact', jsonb_build_object('name', 'Cliente Fila 3', 'company', 'Empresa Fila 3', 'email', 'fila3@example.test', 'phone', '(11) 97777-7777', 'city', '', 'deadline', '', 'notes', ''),
      'items', jsonb_build_array(jsonb_build_object(
        'productId', '33333333-3333-4333-8333-333333333333', 'key', '33333333-3333-4333-8333-333333333333::sem-cor',
        'slug', 'produto-fila', 'name', 'Produto fila', 'sku', 'FILA-1', 'imageUrl', '/images/product-placeholder.svg',
        'quantity', 100, 'minQuantity', 50
      ))
    ),
    jsonb_build_object(
      'requestHash', repeat('5', 64), 'identifierHash', repeat('6', 64),
      'notificationPreferences', jsonb_build_object('emailCopy', true, 'whatsappCopy', true)
    )
  )) ->> 'duplicate',
  'false',
  'terceiro orçamento de teste foi criado (cenário de monitoramento)'
);

-- Envelhece o job de WhatsApp (ainda pending) para simular acúmulo real.
alter table site_private.notification_deliveries disable trigger notification_deliveries_set_updated_at;
update site_private.notification_deliveries
set created_at = now() - interval '20 minutes', next_attempt_at = now() - interval '19 minutes'
where channel = 'whatsapp';
-- A mecânica de exaustão (5 tentativas) já é coberta acima; aqui só
-- precisamos de um job exhausted real para testar a contagem por canal.
update site_private.notification_deliveries
set status = 'exhausted', lease_token = null, lease_expires_at = null
where channel = 'email';
alter table site_private.notification_deliveries enable trigger notification_deliveries_set_updated_at;

create temporary table queue_health(payload jsonb);
insert into queue_health select public.site_notification_queue_health();

select is(
  (select jsonb_array_length(payload) from queue_health),
  2,
  'devolve exatamente um objeto por canal (email, whatsapp), mesmo sem jobs elegíveis em um deles'
);
select is(
  (select (job ->> 'exhaustedCount')::int from queue_health, lateral jsonb_array_elements(payload) job where job ->> 'channel' = 'email'),
  1,
  'conta job esgotado no canal correto'
);
select is(
  (select (job ->> 'eligibleCount')::int from queue_health, lateral jsonb_array_elements(payload) job where job ->> 'channel' = 'email'),
  0,
  'job esgotado não é contado como elegível'
);
select is(
  (select (job ->> 'eligibleCount')::int from queue_health, lateral jsonb_array_elements(payload) job where job ->> 'channel' = 'whatsapp'),
  1,
  'job pendente e vencido é contado como elegível'
);
select ok(
  (select (job ->> 'oldestEligibleAgeSeconds')::int from queue_health, lateral jsonb_array_elements(payload) job where job ->> 'channel' = 'whatsapp') >= 1100,
  'idade do job mais antigo reflete o envelhecimento real (~20 minutos)'
);
select is(
  (select job -> 'oldestEligibleAgeSeconds' from queue_health, lateral jsonb_array_elements(payload) job where job ->> 'channel' = 'email'),
  'null'::jsonb,
  'sem jobs elegíveis, idade é null (não 0, que sugeriria um job recém-criado)'
);
select ok(not pg_catalog.has_function_privilege('anon', 'public.site_notification_queue_health()', 'execute'), 'anon não lê a saúde da fila');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.site_notification_queue_health()', 'execute'), 'cliente autenticado não lê a saúde da fila');
select ok(pg_catalog.has_function_privilege('service_role', 'public.site_notification_queue_health()', 'execute'), 'backend lê a saúde da fila');

select * from finish();
rollback;
