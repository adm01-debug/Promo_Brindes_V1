-- F-12: supressão de bounce/complaint, re-vínculo de evento precoce, reprocessamento
-- auditado e purga de evento órfão.
--
-- O que protege o negócio aqui: um endereço que devolveu (bounce) ou reclamou de spam
-- não pode continuar recebendo, e o operador precisa conseguir reabrir uma entrega
-- esgotada sem UPDATE manual no Studio (docs/RUNBOOK_INCIDENTES.md). O teste cobre os
-- dois sentidos: a supressão aparece e o reprocessamento funciona, mas nada disso
-- vira caminho para vazar e-mail em claro ou burlar a máquina de estados.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(82);

-- === Estrutura ===================================================================

select has_column('site_private', 'notification_provider_events', 'provider_message_id',
  'evento guarda o id da mensagem no provedor para poder ser religado depois');
select has_column('site_private', 'notification_provider_events', 'bounce_reason',
  'evento guarda o motivo do bounce para o re-vínculo não perder a informação');

select has_function('site_private', 'email_hash', array['text'], 'pseudônimo do e-mail existe');
select has_function('public', 'get_site_notification_suppression', array['text'], 'consulta de supressão existe');
select has_function('public', 'reconcile_site_notification_provider_events', array['integer'], 're-vínculo existe');
select has_function('public', 'reprocess_site_notification_deliveries', array['uuid[]','text'], 'reprocessamento existe');
select has_function('public', 'get_site_notification_delivery_report', array['integer'], 'relatório operacional existe');
select has_function('public', 'purge_site_notification_provider_events', array['integer','integer'], 'purga de órfãos existe');
select has_function('site_private', 'notification_delivery_is_reopenable', array['uuid'],
  'critério único do que o painel pode reabrir existe');

-- === Permissões ==================================================================

select ok(not pg_catalog.has_function_privilege('anon', 'site_private.email_hash(text)', 'execute'),
  'anon não calcula o pseudônimo');
select ok(not pg_catalog.has_function_privilege('anon', 'public.get_site_notification_suppression(text)', 'execute'),
  'anon não consulta a lista de supressão');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.get_site_notification_suppression(text)', 'execute'),
  'cliente autenticado NÃO consulta a supressão: o hash é calculável e revelaria devoluções de terceiros');
select ok(pg_catalog.has_function_privilege('site_api', 'public.get_site_notification_suppression(text)', 'execute'),
  'backend consulta a supressão (é a porta de envio)');
select ok(not pg_catalog.has_function_privilege('anon', 'public.reprocess_site_notification_deliveries(uuid[],text)', 'execute'),
  'anon não reprocessa entrega');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.reconcile_site_notification_provider_events(integer)', 'execute'),
  'cliente autenticado não dispara re-vínculo');
select ok(pg_catalog.has_function_privilege('service_role', 'public.reconcile_site_notification_provider_events(integer)', 'execute'),
  'backend dispara re-vínculo');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.purge_site_notification_provider_events(integer,integer)', 'execute'),
  'cliente autenticado não expurga eventos');

-- === Pseudônimo ==================================================================

select is(
  site_private.email_hash('  Cliente.F12@Example.TEST '),
  site_private.email_hash('cliente.f12@example.test'),
  'hash normaliza caixa e espaços: o mesmo titular tem sempre o mesmo pseudônimo'
);
select ok(
  site_private.email_hash('cliente.f12@example.test') ~ '^[0-9a-f]{64}$',
  'pseudônimo é sha256 hex de 64 dígitos'
);
select isnt(
  site_private.email_hash('cliente.f12@example.test'),
  site_private.email_hash('outro@example.test'),
  'e-mails diferentes têm pseudônimos diferentes'
);

-- === Fixture: orçamento real com entrega ao titular ===============================

select is(
  (public.create_site_quote_request(
    jsonb_build_object(
      'source', 'site-promo-brindes', 'clientRequestId', 'f12-suppression-quote-1', 'submittedAt', now(),
      'pageUrl', 'https://promo.test/orcamento',
      'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
      'contact', jsonb_build_object('name', 'Cliente F12', 'company', 'Empresa F12', 'email', 'cliente.f12@example.test', 'phone', '(11) 95555-5555', 'city', '', 'deadline', '', 'notes', ''),
      'items', jsonb_build_array(jsonb_build_object(
        'productId', '44444444-4444-4444-8444-444444444444', 'key', '44444444-4444-4444-8444-444444444444::sem-cor',
        'slug', 'produto-f12', 'name', 'Produto F12', 'sku', 'F12-1', 'imageUrl', '/images/product-placeholder.svg',
        'quantity', 100, 'minQuantity', 50
      ))
    ),
    jsonb_build_object(
      'requestHash', repeat('9', 64), 'identifierHash', repeat('a', 64),
      'notificationPreferences', jsonb_build_object('emailCopy', true, 'whatsappCopy', false)
    )
  )) ->> 'duplicate',
  'false',
  'orçamento de teste criado'
);

select is(
  (select count(*) from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'f12-suppression-quote-1'
     and delivery.channel = 'email' and delivery.audience = 'customer'),
  1::bigint,
  'entrega ao titular foi enfileirada'
);

-- Estado inicial: nada suprimido.
select is(
  public.get_site_notification_suppression(site_private.email_hash('cliente.f12@example.test')) ->> 'suppressed',
  'false',
  'endereço sem bounce nem reclamação não está suprimido'
);
select is(
  public.get_site_notification_suppression(site_private.email_hash('cliente.f12@example.test')) ->> 'matchedDeliveries',
  '0',
  'nenhuma entrega suprimida ainda'
);

-- === Evento precoce vira órfão recuperável =======================================

-- Fixture: a entrega pula direto para "aceita pelo provedor" (mesmo padrão de
-- notification_provider_events.test.sql) — aqui interessa o comportamento dos eventos,
-- não a reivindicação, que é testada em notification_queue_policy.test.sql.
alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_status_transition;
alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_lease_and_attempts;
update site_private.notification_deliveries delivery
set status = 'sent', provider = 'resend', provider_message_id = 'resend-msg-f12-main'
from site_private.quote_requests request
where request.id = delivery.request_id and request.client_request_id = 'f12-suppression-quote-1'
  and delivery.channel = 'email' and delivery.audience = 'customer';
alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_status_transition;
alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_lease_and_attempts;

-- Primeiro um delivered normal na mensagem principal.
select is(
  public.apply_site_notification_provider_event('resend', 'resend-msg-f12-main', 'delivered', 'evt-f12-delivered-1', now()) ->> 'applied',
  'true',
  'evento de entrega aplica normalmente'
);

-- Um aceite ainda não registrado: a entrega existe mas o provider_message_id dela
-- é outro. Antes de F-12 esse evento ficava inútil (delivery_id NULL e nenhum dado
-- para religar depois).
select is(
  public.apply_site_notification_provider_event('resend', 'resend-msg-f12-orphan', 'bounced', 'evt-f12-orphan-1', now(), 'MailboxFull') ->> 'reason',
  'delivery_not_found',
  'evento de mensagem ainda não aceita não aplica (contrato original preservado)'
);
select is(
  (select event.provider_message_id from site_private.notification_provider_events event
   where event.provider = 'resend' and event.provider_event_id = 'evt-f12-orphan-1'),
  'resend-msg-f12-orphan',
  'o evento órfão guarda provider_message_id — é isso que permite religar depois'
);

-- Simula o aceite chegando: a entrega passa a apontar para a mensagem do evento órfão.
-- delivered -> bounced é a precedência correta (soft bounce tardio), nenhum trigger
-- de estado é tocado porque delivery_state não participa da máquina de status.
update site_private.notification_deliveries delivery
set provider_message_id = 'resend-msg-f12-orphan'
from site_private.quote_requests request
where request.id = delivery.request_id and request.client_request_id = 'f12-suppression-quote-1'
  and delivery.channel = 'email' and delivery.audience = 'customer';

select is(
  public.reconcile_site_notification_provider_events(100) ->> 'linked',
  '1',
  're-vínculo religa o evento órfão à entrega'
);
select is(
  (select delivery.delivery_state from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'f12-suppression-quote-1' and delivery.channel = 'email' and delivery.audience = 'customer'),
  'bounced',
  'bounced religado sobrescreve o delivered otimista (mesma precedência da função original)'
);
select is(
  (select delivery.bounce_reason from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'f12-suppression-quote-1' and delivery.channel = 'email' and delivery.audience = 'customer'),
  'MailboxFull',
  'o motivo do bounce sobreviveu no evento e chegou à entrega'
);
select is(
  public.reconcile_site_notification_provider_events(100) ->> 'linked',
  '0',
  're-vínculo é idempotente: evento já religado não é reprocessado'
);

-- === Supressão ===================================================================

select is(
  public.get_site_notification_suppression(site_private.email_hash('cliente.f12@example.test')) ->> 'suppressed',
  'true',
  'endereço que devolveu passa a estar suprimido'
);
select is(
  public.get_site_notification_suppression(site_private.email_hash('cliente.f12@example.test')) ->> 'lastBounceReason',
  'MailboxFull',
  'consulta devolve o último motivo do bounce'
);
select ok(
  public.get_site_notification_suppression(site_private.email_hash('cliente.f12@example.test')) -> 'channels' @> '["email"]'::jsonb,
  'consulta diz em qual canal o endereço falhou'
);
select is(
  public.get_site_notification_suppression(site_private.email_hash('cliente.f12@example.test')) ->> 'matchedDeliveries',
  '1',
  'conta quantas entregas sustentam a supressão'
);
select ok(
  (public.get_site_notification_suppression(site_private.email_hash('cliente.f12@example.test'))::text) not like '%cliente.f12@example.test%',
  'resposta da supressão nunca traz o e-mail em claro'
);
select is(
  public.get_site_notification_suppression(site_private.email_hash(' OUTRO@example.test ')) ->> 'suppressed',
  'false',
  'supressão de um endereço não contamina outro'
);

select throws_ok(
  $$select public.get_site_notification_suppression('nao-e-hash')$$,
  '22023', 'invalid_notification_suppression_input',
  'hash fora do formato é rejeitado'
);

-- === Relatório operacional =======================================================

-- Sem JWT nem operador.
select throws_ok(
  $$select public.get_site_notification_delivery_report()$$,
  '42501', null,
  'relatório exige operador autenticado'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'operador.f12@promobrindes.com.br', crypt('senha-de-teste', gen_salt('bf')), now(), now(), now());

insert into site_private.commercial_operators (user_id, display_name)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Operador F12');

set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';

-- Marca a entrega como esgotada (fixture: os triggers de transição são desligados só
-- para o setup, mesmo padrão de notification_provider_events.test.sql).
alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_status_transition;
alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_lease_and_attempts;
update site_private.notification_deliveries delivery
set status = 'exhausted', attempts = 6, last_error_code = 'provider_unavailable'
from site_private.quote_requests request
where request.id = delivery.request_id and request.client_request_id = 'f12-suppression-quote-1'
  and delivery.channel = 'email' and delivery.audience = 'customer';
alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_status_transition;
alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_lease_and_attempts;

-- O relatório ordena por prioridade de reabertura (F-11), então o item do orçamento é
-- localizado pelo requestId: assumir a primeira posição quebra a cada mudança de ordem.
select is(
  (select item ->> 'lastErrorCode'
   from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestId' = (select request.id::text from site_private.quote_requests request
                                 where request.client_request_id = 'f12-suppression-quote-1')
     and item ->> 'channel' = 'email'),
  'provider_unavailable',
  'relatório lista a entrega esgotada com o último erro'
);
select is(
  (select item ->> 'suppressed'
   from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestId' = (select request.id::text from site_private.quote_requests request
                                 where request.client_request_id = 'f12-suppression-quote-1')
     and item ->> 'channel' = 'email'),
  'true',
  'relatório sinaliza que o endereço da entrega esgotada está suprimido'
);
select is(
  (select item ->> 'reopenable'
   from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestId' = (select request.id::text from site_private.quote_requests request
                                 where request.client_request_id = 'f12-suppression-quote-1')
     and item ->> 'channel' = 'email'),
  'false',
  'relatório não oferece reabrir a entrega cujo endereço continua bloqueado'
);
select is(
  (select length(item ->> 'emailHashPrefix')
   from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestId' = (select request.id::text from site_private.quote_requests request
                                 where request.client_request_id = 'f12-suppression-quote-1')
     and item ->> 'channel' = 'email'),
  12,
  'relatório expõe só um prefixo do pseudônimo, nunca o e-mail'
);
select ok(
  (public.get_site_notification_delivery_report(50)::text) not like '%cliente.f12@example.test%',
  'relatório não vaza e-mail em claro'
);

-- === Reprocessamento =============================================================

-- Uma segunda entrega, ainda pendente, para provar que só esgotada é reaberta.
select is(
  (public.create_site_quote_request(
    jsonb_build_object(
      'source', 'site-promo-brindes', 'clientRequestId', 'f12-suppression-quote-2', 'submittedAt', now(),
      'pageUrl', 'https://promo.test/orcamento',
      'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
      'contact', jsonb_build_object('name', 'Cliente F12 B', 'company', 'Empresa F12 B', 'email', 'cliente.f12b@example.test', 'phone', '(11) 95555-5556', 'city', '', 'deadline', '', 'notes', ''),
      'items', jsonb_build_array(jsonb_build_object(
        'productId', '55555555-5555-4555-8555-555555555555', 'key', '55555555-5555-4555-8555-555555555555::sem-cor',
        'slug', 'produto-f12-b', 'name', 'Produto F12 B', 'sku', 'F12-2', 'imageUrl', '/images/product-placeholder.svg',
        'quantity', 100, 'minQuantity', 50
      ))
    ),
    jsonb_build_object(
      'requestHash', repeat('b', 64), 'identifierHash', repeat('c', 64),
      'notificationPreferences', jsonb_build_object('emailCopy', true, 'whatsappCopy', false)
    )
  )) ->> 'duplicate',
  'false',
  'segundo orçamento de teste criado'
);

select throws_ok(
  format($$select public.reprocess_site_notification_deliveries(array[%L]::uuid[], 'ab')$$,
    (select delivery.id from site_private.notification_deliveries delivery
     join site_private.quote_requests request on request.id = delivery.request_id
     where request.client_request_id = 'f12-suppression-quote-1' and delivery.channel = 'email' and delivery.audience = 'customer')),
  '22023', 'invalid_notification_reprocessing_input',
  'motivo curto demais é rejeitado (a trilha precisa explicar o reprocessamento)'
);
select throws_ok(
  $$select public.reprocess_site_notification_deliveries(array[]::uuid[], 'motivo valido')$$,
  '22023', 'invalid_notification_reprocessing_input',
  'lote vazio é rejeitado'
);

-- Lote misto: uma esgotada e uma pendente.
select is(
  public.reprocess_site_notification_deliveries(
    array[
      (select delivery.id from site_private.notification_deliveries delivery
       join site_private.quote_requests request on request.id = delivery.request_id
       where request.client_request_id = 'f12-suppression-quote-1' and delivery.channel = 'email' and delivery.audience = 'customer'),
      (select delivery.id from site_private.notification_deliveries delivery
       join site_private.quote_requests request on request.id = delivery.request_id
       where request.client_request_id = 'f12-suppression-quote-2' and delivery.channel = 'email' and delivery.audience = 'customer')
    ]::uuid[],
    'provedor de e-mail voltou ao ar'
  ) ->> 'reopened',
  '1',
  'só a entrega esgotada é reaberta'
);
select is(
  (select delivery.status from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'f12-suppression-quote-1' and delivery.channel = 'email' and delivery.audience = 'customer'),
  'pending',
  'entrega esgotada volta para pending'
);
select is(
  (select delivery.attempts::integer from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'f12-suppression-quote-1' and delivery.channel = 'email' and delivery.audience = 'customer'),
  0,
  'reabertura zera attempts, como a máquina de estados exige'
);
select is(
  (select delivery.last_error_code from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'f12-suppression-quote-1' and delivery.channel = 'email' and delivery.audience = 'customer'),
  null,
  'reabertura limpa o erro anterior'
);
select is(
  public.reprocess_site_notification_deliveries(
    array[
      (select delivery.id from site_private.notification_deliveries delivery
       join site_private.quote_requests request on request.id = delivery.request_id
       where request.client_request_id = 'f12-suppression-quote-2' and delivery.channel = 'email' and delivery.audience = 'customer')
    ]::uuid[],
    'tentativa em entrega nao esgotada'
  ) -> 'skipped' -> 0 ->> 'reason',
  'not_exhausted',
  'entrega que não está esgotada volta em skipped, sem abortar o lote'
);
select is(
  (select count(*) from site_private.admin_audit_log log
   where log.table_name = 'notification_deliveries'
     and log.operation = 'UPDATE'
     and log.performed_by = 'Operador F12'
     and log.application_name like 'reprocess_site_notification_deliveries:%'),
  1::bigint,
  'reprocessamento fica registrado na trilha com o operador e o motivo'
);

-- === Pedido apagado (LGPD) recusado no reprocessamento ==========================

-- Um terceiro orçamento, esgotado, mas apagado pela autoexclusão do titular.
select public.create_site_quote_request(
  jsonb_build_object(
    'source', 'site-promo-brindes', 'clientRequestId', 'f12-suppression-quote-erased', 'submittedAt', now(),
    'pageUrl', 'https://promo.test/orcamento',
    'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
    'contact', jsonb_build_object('name', 'Cliente F12 C', 'company', 'Empresa F12 C', 'email', 'cliente.f12c@example.test', 'phone', '(11) 95555-5557', 'city', '', 'deadline', '', 'notes', ''),
    'items', jsonb_build_array(jsonb_build_object(
      'productId', '66666666-6666-4666-8666-666666666666', 'key', '66666666-6666-4666-8666-666666666666::sem-cor',
      'slug', 'produto-f12-c', 'name', 'Produto F12 C', 'sku', 'F12-3', 'imageUrl', '/images/product-placeholder.svg',
      'quantity', 100, 'minQuantity', 50
    ))
  ),
  jsonb_build_object(
    'requestHash', repeat('d', 64), 'identifierHash', repeat('e', 64),
    'notificationPreferences', jsonb_build_object('emailCopy', true, 'whatsappCopy', false)
  )
);

alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_status_transition;
alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_lease_and_attempts;
update site_private.notification_deliveries delivery
set status = 'exhausted', attempts = 6, last_error_code = 'provider_unavailable'
from site_private.quote_requests request
where request.id = delivery.request_id and request.client_request_id = 'f12-suppression-quote-erased'
  and delivery.channel = 'email' and delivery.audience = 'customer';
alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_status_transition;
alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_lease_and_attempts;

-- Atalho de fixture: é o estado que erase_customer_data deixa (e-mail fictício).
update site_private.quote_requests request
set email = 'erased-' || request.id || '@erased.invalid'
where request.client_request_id = 'f12-suppression-quote-erased';

select is(
  public.reprocess_site_notification_deliveries(
    array[
      (select delivery.id from site_private.notification_deliveries delivery
       join site_private.quote_requests request on request.id = delivery.request_id
       where request.client_request_id = 'f12-suppression-quote-erased' and delivery.channel = 'email' and delivery.audience = 'customer')
    ]::uuid[],
    'cliente pediu exclusao'
  ) -> 'skipped' -> 0 ->> 'reason',
  'erased',
  'entrega de pedido apagado pela autoexclusão não volta para a fila'
);
select is(
  (select delivery.status from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'f12-suppression-quote-erased' and delivery.channel = 'email' and delivery.audience = 'customer'),
  'exhausted',
  'entrega de pedido apagado continua esgotada depois da recusa'
);

-- === Alerta de contato esgotado aparece no relatório ============================

-- O cron comercial esgota alerta de contato também (claim_site_commercial_team_alerts);
-- antes de F-12 o relatório só olhava orçamento e o operador não conseguia reabrir
-- esses alertas pelo painel.
select public.create_site_contact_request(
  jsonb_build_object(
    'source', 'site-promo-brindes-contact', 'clientRequestId', 'f12-suppression-contact-1',
    'submittedAt', now(), 'pageUrl', 'https://promo.test/contato',
    'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
    'contact', jsonb_build_object('name', 'Contato F12', 'email', 'contato.f12@example.test',
      'phone', '(11) 95555-5558', 'message', 'Quero brindes personalizados')
  ),
  jsonb_build_object('requestHash', repeat('f', 64), 'identifierHash', repeat('1', 64),
    'notificationPreferences', jsonb_build_object('emailCopy', false, 'whatsappCopy', false))
);

alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_status_transition;
alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_lease_and_attempts;
update site_private.notification_deliveries delivery
set status = 'exhausted', attempts = 6, last_error_code = 'provider_unavailable'
from site_private.contact_requests request
where request.id = delivery.request_id and request.email = 'contato.f12@example.test'
  and delivery.audience = 'commercial_team';
alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_status_transition;
alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_lease_and_attempts;

select is(
  (select count(*) from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestKind' = 'contact'),
  1::bigint,
  'relatório lista alerta de contato esgotado (antes ficava invisível no painel)'
);
select is(
  (select item ->> 'protocol'
   from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestKind' = 'contact'),
  null,
  'contato não tem protocolo: o campo vai nulo, sem inventar valor'
);

-- === A supressão barra o envio (imediato e cron) =================================

-- Endereço suprimido também não é reivindicado: era o furo original — a lista existia
-- mas nenhuma claim a consultava. O orçamento 2 ainda está pendente (nunca foi enviado).
update site_private.quote_requests request
set email = 'cliente.f12@example.test'
where request.client_request_id = 'f12-suppression-quote-2';

select is(
  public.claim_site_notification_deliveries(array['email'], 10)::text,
  '[]',
  'cron não reivindica entrega de endereço suprimido'
);
select is(
  (select delivery.status from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'f12-suppression-quote-2' and delivery.channel = 'email' and delivery.audience = 'customer'),
  'exhausted',
  'entrega de endereço suprimido é encerrada como exhausted (reabrível pelo painel), com motivo registrado'
);
select is(
  (select delivery.last_error_code from site_private.notification_deliveries delivery
   join site_private.quote_requests request on request.id = delivery.request_id
   where request.client_request_id = 'f12-suppression-quote-2' and delivery.channel = 'email' and delivery.audience = 'customer'),
  'recipient_suppressed',
  'motivo do cancelamento fica visível na entrega'
);

-- Supressão não é falha: contá-la em exhaustedCount fazia o alerta de fila disparar em
-- todo ciclo por um bloqueio que o sistema mantém de propósito. Contador separado. E o
-- esgotamento que o painel não deixa reabrir (fora da janela, spam, pedido apagado) sai do
-- alerta para expiredExhaustedCount: alertar sobre fila que ninguém pode limpar é ruído.
select is(
  (select (item ->> 'exhaustedCount')::int from jsonb_array_elements(public.site_notification_queue_health()) item where item ->> 'channel' = 'email')
  + (select (item ->> 'suppressedCount')::int from jsonb_array_elements(public.site_notification_queue_health()) item where item ->> 'channel' = 'email')
  + (select (item ->> 'expiredExhaustedCount')::int from jsonb_array_elements(public.site_notification_queue_health()) item where item ->> 'channel' = 'email'),
  (select count(*)::int
   from site_private.notification_deliveries delivery
   where delivery.request_kind = 'quote' and delivery.audience = 'customer'
     and delivery.channel = 'email' and delivery.status = 'exhausted'),
  'saúde da fila separa bloqueio deliberado, esgotamento acionável e o que o painel não reabre (a soma bate com o total de esgotadas)'
);
select cmp_ok(
  (select (item ->> 'suppressedCount')::int from jsonb_array_elements(public.site_notification_queue_health()) item where item ->> 'channel' = 'email'),
  '>', 0,
  'saúde da fila expõe a supressão em contador próprio, fora do que dispara alerta'
);

-- Mesmo critério no envio imediato: o POST do orçamento não pode entregar no ato.
update site_private.quote_requests request
set email = 'cliente.f12@example.test'
where request.client_request_id = 'f12-suppression-quote-erased';

select is(
  public.claim_site_quote_notification(
    (select request.id from site_private.quote_requests request where request.client_request_id = 'f12-suppression-quote-erased'),
    'email'
  ),
  null,
  'envio imediato devolve null para pedido apagado (não há destinatário válido)'
);

-- === Reprocessamento também é negado sem operador ================================

set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}';
select throws_ok(
  $$select public.reprocess_site_notification_deliveries(array['00000000-0000-4000-8000-000000000000'::uuid], 'motivo valido')$$,
  '42501', null,
  'quem não está na allowlist não reprocessa entrega'
);

-- === Purga de eventos órfãos =====================================================

set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';

select is(
  public.purge_site_notification_provider_events(180, 1000) ->> 'orphanEventsDeleted',
  '0',
  'órfão recente não é expurgado (ainda pode ser religado)'
);

insert into site_private.notification_provider_events
  (provider, provider_event_id, event_type, delivery_id, provider_message_id, received_at)
values ('resend', 'evt-f12-old-orphan', 'delivered', null, 'resend-msg-f12-old', now() - interval '400 days');

select is(
  public.purge_site_notification_provider_events(180, 1000) ->> 'orphanEventsDeleted',
  '1',
  'órfão mais antigo que a retenção é expurgado'
);
select is(
  (select count(*) from site_private.notification_provider_events event
   where event.provider_event_id = 'evt-f12-old-orphan'),
  0::bigint,
  'o órfão antigo saiu da tabela de dedupe'
);

update site_private.notification_provider_events event
set received_at = now() - interval '400 days'
where event.provider_event_id = 'evt-f12-orphan-1';

select is(
  public.purge_site_notification_provider_events(180, 1000) ->> 'orphanEventsDeleted',
  '0',
  'evento vinculado nunca é expurgado, mesmo antigo (é a fonte de delivery_state_source_event_id)'
);
select is(
  (select count(*) from site_private.notification_provider_events event
   where event.provider_event_id = 'evt-f12-orphan-1'),
  1::bigint,
  'evento vinculado permanece depois da purga'
);

select throws_ok(
  $$select public.purge_site_notification_provider_events(3, 1000)$$,
  '22023', 'invalid_notification_event_purge_input',
  'retenção abaixo do mínimo é rejeitada'
);
select throws_ok(
  $$select public.purge_site_notification_provider_events(180, 0)$$,
  '22023', 'invalid_notification_event_purge_input',
  'lote zerado é rejeitado'
);

-- === Desbloqueio do RUNBOOK aparece no mesmo tick (predicado vivo) ================

-- O RUNBOOK manda limpar o bounce em notification_deliveries. Saúde da fila e painel têm de
-- ler o predicado de supressão, não o last_error_code gravado na hora do bloqueio: a entrega
-- liberada volta a contar como esgotamento por falha (o que dispara alerta) e volta a ser
-- reabrível, mesmo com recipient_suppressed ainda no histórico do erro.
update site_private.notification_deliveries delivery
set delivery_state = null, delivery_state_at = null,
    delivery_state_source_event_id = null, complained_at = null, updated_at = now()
where delivery.audience = 'customer'
  and delivery.delivery_state = 'bounced'
  and delivery.complained_at is null;

select is(
  (select (item ->> 'suppressedCount')::int
   from jsonb_array_elements(public.site_notification_queue_health()) item
   where item ->> 'channel' = 'email'),
  0,
  'sem bloqueio ativo, suppressedCount zera mesmo com recipient_suppressed gravado no erro'
);
select cmp_ok(
  (select (item ->> 'exhaustedCount')::int
   from jsonb_array_elements(public.site_notification_queue_health()) item
   where item ->> 'channel' = 'email'),
  '>', 0,
  'a entrega liberada volta para exhaustedCount, que é o contador que alerta o operador'
);
select is(
  (select item ->> 'reopenable'
   from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestId' = (select request.id::text from site_private.quote_requests request
                                 where request.client_request_id = 'f12-suppression-quote-1')
     and item ->> 'channel' = 'email'),
  'true',
  'painel volta a oferecer a reabertura da entrega desbloqueada'
);

-- === Alerta comercial não é bloqueado pelo bounce do cliente =====================

-- A supressão vale para o endereço do titular; o alerta comercial do mesmo pedido vai para
-- o webhook do time, não para o endereço que devolveu. Reabrir esse alerta é legítimo, então
-- a supressão não pode desabilitar a linha dele no painel.
insert into site_private.notification_deliveries (request_kind, request_id, channel, audience)
select 'quote', request.id, 'email', 'commercial_team'
from site_private.quote_requests request
where request.client_request_id = 'f12-suppression-quote-1'
on conflict (request_kind, request_id, channel, audience) do nothing;

alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_status_transition;
alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_lease_and_attempts;
update site_private.notification_deliveries delivery
set status = 'exhausted', attempts = 6, last_error_code = 'provider_unavailable'
from site_private.quote_requests request
where request.id = delivery.request_id and request.client_request_id = 'f12-suppression-quote-1'
  and delivery.channel = 'email' and delivery.audience = 'commercial_team';
alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_status_transition;
alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_lease_and_attempts;

select is(
  (select item ->> 'reopenable'
   from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestId' = (select request.id::text from site_private.quote_requests request
                                 where request.client_request_id = 'f12-suppression-quote-1')
     and item ->> 'channel' = 'email' and item ->> 'audience' = 'commercial_team'),
  'true',
  'supressão do endereço do titular não desabilita a reabertura do alerta comercial do mesmo pedido'
);
select is(
  (select item ->> 'audience'
   from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestId' = (select request.id::text from site_private.quote_requests request
                                 where request.client_request_id = 'f12-suppression-quote-1')
     and item ->> 'channel' = 'email' and item ->> 'audience' = 'commercial_team'),
  'commercial_team',
  'relatório identifica a linha do alerta comercial (mesmo protocolo e canal do aviso ao cliente)'
);

-- === Esgotada fora da janela sai do alerta =======================================

-- Entrega acima de max_age não é reabrível (o painel desabilita e a claim aposenta), então
-- contá-la em exhaustedCount fazia o alerta apontar para uma fila sem ação possível.
update site_private.notification_deliveries delivery
set created_at = now() - interval '40 days'
from site_private.quote_requests request
where request.id = delivery.request_id and request.client_request_id = 'f12-suppression-quote-1'
  and delivery.channel = 'email' and delivery.audience = 'customer';

select is(
  (select item ->> 'reopenable'
   from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestId' = (select request.id::text from site_private.quote_requests request
                                 where request.client_request_id = 'f12-suppression-quote-1')
     and item ->> 'channel' = 'email' and item ->> 'audience' = 'customer'),
  'false',
  'entrega acima da janela de 30 dias não é oferecida para reabertura'
);
select cmp_ok(
  (select (item ->> 'expiredExhaustedCount')::int
   from jsonb_array_elements(public.site_notification_queue_health()) item
   where item ->> 'channel' = 'email'),
  '>', 0,
  'a esgotada fora da janela passa a ter contador próprio, visível sem disparar alerta'
);

-- === Guarda por audiência com a supressão do titular ativa =======================

-- O bloco do RUNBOOK limpou o bounce; reaplicar o evento devolve a supressão ao endereço
-- do titular. A guarda por audiência só fica provada com ela ativa: o aviso ao cliente
-- (audience = customer) continua suprimido e o alerta comercial do MESMO pedido, no mesmo
-- canal, continua reabrível. Sem a supressão ativa a asserção passaria com qualquer
-- implementação, porque nada estaria bloqueando ninguém.
select is(
  public.apply_site_notification_provider_event('resend', 'resend-msg-f12-orphan', 'bounced', 'evt-f12-rebounce-1', now(), 'MailboxFull') ->> 'applied',
  'true',
  'bounce reaplicado volta a suprimir o endereço do titular'
);
select is(
  (select item ->> 'suppressed'
   from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestId' = (select request.id::text from site_private.quote_requests request
                                 where request.client_request_id = 'f12-suppression-quote-1')
     and item ->> 'channel' = 'email' and item ->> 'audience' = 'customer'),
  'true',
  'com a supressão ativa, a linha do aviso ao cliente aparece suprimida'
);
select is(
  (select item ->> 'suppressed'
   from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestId' = (select request.id::text from site_private.quote_requests request
                                 where request.client_request_id = 'f12-suppression-quote-1')
     and item ->> 'channel' = 'email' and item ->> 'audience' = 'commercial_team'),
  'false',
  'a supressão do titular não alcança a linha do alerta comercial'
);
select is(
  (select item ->> 'reopenable'
   from jsonb_array_elements(public.get_site_notification_delivery_report(50) -> 'exhausted') item
   where item ->> 'requestId' = (select request.id::text from site_private.quote_requests request
                                 where request.client_request_id = 'f12-suppression-quote-1')
     and item ->> 'channel' = 'email' and item ->> 'audience' = 'commercial_team'),
  'true',
  'alerta comercial do mesmo pedido segue reabrível com a supressão do titular ativa'
);

select * from finish();
rollback;