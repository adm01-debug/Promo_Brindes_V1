begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

-- Migration 20261117010000: o lead de contato passa a enfileirar alerta
-- comercial, reivindicado pelas mesmas RPCs do orcamento.
select has_trigger('site_private', 'contact_requests', 'contact_requests_enqueue_commercial_alert',
  'novo contato alimenta a fila do alerta comercial na mesma transação');

insert into site_private.contact_requests (
  client_request_id, request_hash, source, contact_name, email, phone, message, preferred_channel,
  page_url, client_submitted_at, request_metadata
) values (
  'contact-commercial-alert-1', repeat('a', 64), 'site-promo-brindes-contact', 'Contato Alerta',
  'contato-alerta@teste.com', '(11) 98888-7777', 'Meu CPF é 000.000.000-00', 'whatsapp',
  'https://www.promobrindes.com.br/contato', now(), '{}'::jsonb
);

select is(
  (select count(*) from site_private.notification_deliveries delivery
   join site_private.contact_requests request on request.id = delivery.request_id
   where request.client_request_id = 'contact-commercial-alert-1'),
  1::bigint,
  'contato enfileira exatamente uma entrega'
);

select is(
  (select delivery.request_kind || '/' || delivery.channel || '/' || delivery.audience || '/' || delivery.status
   from site_private.notification_deliveries delivery
   join site_private.contact_requests request on request.id = delivery.request_id
   where request.client_request_id = 'contact-commercial-alert-1'),
  'contact/email/commercial_team/pending',
  'a entrega é o alerta comercial pendente do contato'
);

create temp table contact_alert_job as
  select public.claim_site_commercial_team_alert(
    (select id from site_private.contact_requests where client_request_id = 'contact-commercial-alert-1')
  ) as payload;

select is(
  (select payload ->> 'requestKind' from contact_alert_job),
  'contact',
  'o envelope identifica o tipo do lead (a API não renderiza texto de orçamento)'
);
select is(
  (select payload ->> 'recipientEmail' from contact_alert_job),
  'contato-alerta@teste.com',
  'envelope leva o e-mail do lead'
);
select is(
  (select payload ->> 'preferredChannel' from contact_alert_job),
  'whatsapp',
  'envelope leva o canal preferido do lead'
);
-- Minimização: o texto livre do lead é o campo onde cai dado sensível de
-- titular (customer_data_erasure.test.sql:24-29) e o destino do alerta é um
-- webhook fora do banco isolado. Mesma decisão do orçamento, que mantém
-- `notes` fora do envelope (20261106150448:47-50).
select is(
  (select payload ? 'message' from contact_alert_job),
  false,
  'envelope NÃO leva o texto livre da mensagem (minimização de dado pessoal)'
);
select is(
  (select (payload ->> 'leaseToken') is not null and (payload ->> 'attempt') = '1' from contact_alert_job),
  true,
  'a reivindicação devolve lease próprio e primeira tentativa'
);
select is(
  (select delivery.status from site_private.notification_deliveries delivery
   join site_private.contact_requests request on request.id = delivery.request_id
   where request.client_request_id = 'contact-commercial-alert-1'),
  'processing',
  'reivindicar move a entrega do contato para processing'
);

-- Lote do cron: o contato entra na mesma fila drenada por /api/commercial-alerts.
-- O payload é montado no SELECT externo de uma query cuja CTE data-modifying
-- acabou de gravar o lease, então o lote prova lease e tentativa, não só o tipo.
insert into site_private.contact_requests (
  client_request_id, request_hash, source, contact_name, email,
  client_submitted_at, request_metadata
) values (
  'contact-commercial-alert-2', repeat('b', 64), 'site-promo-brindes-contact', 'Contato Lote',
  'contato-lote@teste.com', now(), '{}'::jsonb
);

create temp table contact_batch_job as
  select job as payload
  from jsonb_array_elements(public.claim_site_commercial_team_alerts(5)) job;

select is(
  (select count(*) from contact_batch_job),
  1::bigint,
  'o claim em lote do cron devolve exatamente o alerta de contato pendente'
);
select is(
  (select payload ->> 'requestKind' from contact_batch_job),
  'contact',
  'o job do lote identifica o tipo do lead'
);
select is(
  (select payload ->> 'recipientEmail' from contact_batch_job),
  'contato-lote@teste.com',
  'o job do lote aponta para o lead certo'
);
select ok(
  (select (payload ->> 'leaseToken') is not null from contact_batch_job),
  'o job do lote carrega o lease_token gravado na própria query (sem isso o worker descarta o payload)'
);
select is(
  (select payload ->> 'attempt' from contact_batch_job),
  '1',
  'o job do lote carrega a tentativa já incrementada'
);

select ok(
  not pg_catalog.has_function_privilege('anon', 'site_private.commercial_team_contact_alert_payload(uuid)', 'execute'),
  'anon não monta o envelope do alerta de contato'
);
select ok(
  pg_catalog.has_function_privilege('service_role', 'site_private.commercial_team_contact_alert_payload(uuid)', 'execute'),
  'backend monta o envelope do alerta de contato'
);

select * from finish();
rollback;
