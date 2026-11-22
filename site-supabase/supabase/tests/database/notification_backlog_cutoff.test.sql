-- F-11 (PF-11): corte de backlog da fila de notificacoes.
--
-- Cobre o que a migration 20261122060000 entrega e que nenhum teste anterior
-- verificava: a janela de 30 dias, a recusa de entrega de pedido em spam ou
-- anonimizado por direito ao esquecimento (F-30), o cancelamento auditado pelo
-- back-office e o cancelamento automatico quando o pedido vira spam.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(42);

-- === Fixtures ====================================================================

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operador-f11@promobrindes.com.br', crypt('senha-de-teste', gen_salt('bf')), now(), now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente-f11@alfa.com.br', crypt('senha-de-teste', gen_salt('bf')), now(), now(), now());

insert into site_private.commercial_operators (user_id, display_name)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Operador F11');

insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, status, contact_name, company, email, phone,
  city, desired_deadline, notes, client_submitted_at
) values
  ('c0000000-0000-4000-8000-000000000001', 'f11-quote-ok', repeat('1', 64), 'site-promo-brindes',
   'new', 'Ana Normal', 'Alfa', 'ana@alfa.test', '11999990000', 'Sao Paulo', '2026-12-01', null, now()),
  ('c0000000-0000-4000-8000-000000000002', 'f11-quote-spam', repeat('2', 64), 'site-promo-brindes',
   'spam', 'Spam Bot', 'Spam Ltda', 'spam@spam.test', '11999990001', null, null, null, now()),
  ('c0000000-0000-4000-8000-000000000003', 'f11-quote-erased', repeat('3', 64), 'site-promo-brindes',
   'new', '[apagado a pedido do titular]', 'Apagado', 'titular-0123456789abcdef@erased.invalid', '11999990009',
   null, null, null, now()),
  ('c0000000-0000-4000-8000-000000000004', 'f11-quote-antigo', repeat('4', 64), 'site-promo-brindes',
   'new', 'Cliente Antigo', 'Antiga', 'antigo@alfa.test', '11999990002', null, null, null, now()),
  ('c0000000-0000-4000-8000-000000000005', 'f11-quote-vira-spam', repeat('5', 64), 'site-promo-brindes',
   'new', 'Vai Virar Spam', 'Beta', 'beta@alfa.test', '11999990003', null, null, null, now()),
  ('c0000000-0000-4000-8000-000000000006', 'f11-quote-spam-lote', repeat('6', 64), 'site-promo-brindes',
   'spam', 'Spam Lote', 'Spam Ltda', 'lote@spam.test', '11999990006', null, null, null, now()),
  ('c0000000-0000-4000-8000-000000000007', 'f11-quote-antigo-lote', repeat('7', 64), 'site-promo-brindes',
   'new', 'Antigo Lote', 'Antiga', 'lote-antigo@alfa.test', '11999990007', null, null, null, now());

insert into site_private.contact_requests (
  id, client_request_id, request_hash, source, status, contact_name, email, phone,
  message, client_submitted_at
) values
  ('d0000000-0000-4000-8000-000000000001', 'f11-contact-ok', repeat('8', 64), 'site-promo-brindes-contact',
   'new', 'Contato Normal', 'contato@alfa.test', '11999990004', 'Quero um orcamento', now()),
  ('d0000000-0000-4000-8000-000000000002', 'f11-contact-spam', repeat('9', 64), 'site-promo-brindes-contact',
   'spam', 'Contato Spam', 'contato@spam.test', '11999990005', 'spam', now()),
  ('d0000000-0000-4000-8000-000000000003', 'f11-contact-spam-lote', repeat('a', 64), 'site-promo-brindes-contact',
   'spam', 'Contato Spam Lote', 'contato-lote@spam.test', '11999990008', 'spam', now());

-- Os triggers AFTER INSERT dos pedidos ja enfileiram entregas sozinhos; o fixture
-- controlado abaixo substitui esse enfileiramento para fixar idade/canal/audiencia.
delete from site_private.notification_deliveries;

insert into site_private.notification_deliveries (request_kind, request_id, channel, audience, status, created_at, next_attempt_at)
values
  ('quote', 'c0000000-0000-4000-8000-000000000001', 'email', 'customer', 'pending', now(), now() - interval '1 minute'),
  ('quote', 'c0000000-0000-4000-8000-000000000002', 'email', 'customer', 'pending', now(), now() - interval '1 minute'),
  ('quote', 'c0000000-0000-4000-8000-000000000003', 'email', 'customer', 'pending', now(), now() - interval '1 minute'),
  ('quote', 'c0000000-0000-4000-8000-000000000004', 'email', 'customer', 'pending', now() - interval '40 days', now() - interval '1 minute'),
  -- agendada para o futuro de proposito: a secao 4 prova que o claim em lote so
  -- cancela o que e inelegivel, sem antecipar job agendado
  ('quote', 'c0000000-0000-4000-8000-000000000005', 'email', 'customer', 'pending', now(), now() + interval '1 hour'),
  ('quote', 'c0000000-0000-4000-8000-000000000006', 'email', 'customer', 'pending', now(), now() - interval '1 minute'),
  ('quote', 'c0000000-0000-4000-8000-000000000007', 'email', 'customer', 'pending', now() - interval '40 days', now() - interval '1 minute'),
  ('contact', 'd0000000-0000-4000-8000-000000000001', 'email', 'commercial_team', 'pending', now(), now() - interval '1 minute'),
  ('contact', 'd0000000-0000-4000-8000-000000000002', 'email', 'commercial_team', 'pending', now(), now() - interval '1 minute'),
  ('contact', 'd0000000-0000-4000-8000-000000000003', 'email', 'commercial_team', 'pending', now(), now() + interval '1 hour');

-- === 1. Politica e criterio unico ================================================

select is(
  (select max_age from site_private.notification_policy()),
  interval '30 days',
  'politica da fila publica a janela maxima de 30 dias'
);
select is(
  (select max_attempts from site_private.notification_policy()),
  5::smallint,
  'politica da fila preserva max_attempts (contrato anterior intacto)'
);
select ok(
  site_private.notification_delivery_is_eligible('quote', 'c0000000-0000-4000-8000-000000000001', now(), interval '30 days'),
  'entrega de pedido normal dentro da janela e elegivel'
);
select ok(
  not site_private.notification_delivery_is_eligible('quote', 'c0000000-0000-4000-8000-000000000002', now(), interval '30 days'),
  'entrega de pedido marcado como spam nao e elegivel'
);
select ok(
  not site_private.notification_delivery_is_eligible('quote', 'c0000000-0000-4000-8000-000000000003', now(), interval '30 days'),
  'entrega de pedido anonimizado por direito ao esquecimento nao e elegivel'
);
select ok(
  not site_private.notification_delivery_is_eligible('quote', 'c0000000-0000-4000-8000-000000000004', now() - interval '40 days', interval '30 days'),
  'entrega acima da janela nao e elegivel'
);
select ok(
  not site_private.notification_delivery_is_eligible('quote', 'c0000000-0000-4000-8000-000000000001', now() - interval '1 second', interval '0 days'),
  'janela zero torna toda entrega inelegivel (parametro respeitado)'
);
select ok(
  not site_private.notification_delivery_is_eligible('bogus', 'c0000000-0000-4000-8000-000000000001', now(), interval '30 days'),
  'request_kind desconhecido nunca e elegivel'
);
select ok(
  not site_private.notification_delivery_is_eligible('quote', gen_random_uuid(), now(), interval '30 days'),
  'pedido inexistente nao e elegivel'
);

-- === 2. Claims pontuais respeitam o criterio =====================================

select is(
  public.claim_site_quote_notification('c0000000-0000-4000-8000-000000000002', 'email'),
  null,
  'claim pontual nao reivindica confirmacao de pedido em spam'
);
select is(
  public.claim_site_quote_notification('c0000000-0000-4000-8000-000000000003', 'email'),
  null,
  'claim pontual nao reivindica confirmacao de pedido anonimizado'
);
select is(
  public.claim_site_quote_notification('c0000000-0000-4000-8000-000000000004', 'email'),
  null,
  'claim pontual nao reivindica confirmacao acima da janela'
);
select is(
  public.claim_site_quote_notification('c0000000-0000-4000-8000-000000000001', 'email') ->> 'requestId',
  'c0000000-0000-4000-8000-000000000001',
  'claim pontual reivindica confirmacao normal'
);
select is(
  public.claim_site_commercial_team_alert('c0000000-0000-4000-8000-000000000002'),
  null,
  'claim pontual do comercial ignora pedido em spam'
);
select is(
  public.claim_site_commercial_team_alert('d0000000-0000-4000-8000-000000000002'),
  null,
  'claim pontual do comercial ignora contato em spam'
);
select isnt(
  public.claim_site_commercial_team_alert('d0000000-0000-4000-8000-000000000001'),
  null,
  'claim pontual do comercial reivindica contato normal'
);

-- === 3. Porta publica do back-office ============================================

select throws_ok(
  $$ select public.cancel_site_notification_backlog('xy') $$,
  '42501',
  'authentication_required',
  'cancel_site_notification_backlog exige autenticacao'
);

set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1","role":"authenticated"}';
select throws_ok(
  $$ select public.cancel_site_notification_backlog('limpeza de backlog') $$,
  '42501',
  'not_a_site_operator',
  'cancel_site_notification_backlog recusa usuario fora da allowlist'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1","role":"authenticated"}';
select throws_ok(
  $$ select public.cancel_site_notification_backlog('ab') $$,
  '22023',
  'invalid_notification_backlog_input',
  'cancel_site_notification_backlog exige motivo de 3 a 200 caracteres'
);

select is(
  (public.cancel_site_notification_backlog('limpeza de backlog de teste') ->> 'cancelled')::integer,
  7,
  'porta publica cancela as sete entregas inelegiveis (spam, anonimizada, fora da janela e contato spam)'
);
select is(
  (select status from site_private.notification_deliveries
   where request_kind = 'quote' and request_id = 'c0000000-0000-4000-8000-000000000001' and audience = 'customer'),
  'processing',
  'porta publica preserva a entrega elegivel ja reivindicada'
);
select is(
  (select count(*) from site_private.admin_audit_log
   where table_name = 'notification_deliveries'
     and performed_by = 'Operador F11'
     and application_name like 'cancel_ineligible_notification_backlog: limpeza de backlog de teste%'),
  7::bigint,
  'porta publica grava a trilha do operador com o motivo'
);
select is(
  (public.cancel_site_notification_backlog('segunda limpeza sem backlog') ->> 'cancelled')::integer,
  0,
  'porta publica e idempotente quando nao ha backlog inelegivel'
);

-- === 4. Claims em lote cancelam o que nao e elegivel =============================
--
-- Pedidos novos de proposito: a secao 3 ja cancelou as entregas do fixture pelo
-- caminho manual, e verificar 'cancelled' nelas provaria apenas o que a porta
-- publica fez. O trigger de status nao deixa cancelled voltar a pending, entao o
-- par inelegivel/elegivel de cada fila nasce aqui.
insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, status, contact_name, company, email, phone,
  city, desired_deadline, notes, client_submitted_at
) values
  ('c0000000-0000-4000-8000-000000000008', 'f11-quote-spam-claim', repeat('b', 64), 'site-promo-brindes',
   'spam', 'Spam Claim', 'Spam Ltda', 'claim@spam.test', '11999990011', null, null, null, now()),
  ('c0000000-0000-4000-8000-000000000009', 'f11-quote-antigo-claim', repeat('c', 64), 'site-promo-brindes',
   'new', 'Antigo Claim', 'Antiga', 'claim-antigo@alfa.test', '11999990012', null, null, null, now());

insert into site_private.contact_requests (
  id, client_request_id, request_hash, source, status, contact_name, email, phone,
  message, client_submitted_at
) values
  ('d0000000-0000-4000-8000-000000000004', 'f11-contact-spam-claim', repeat('d', 64), 'site-promo-brindes-contact',
   'spam', 'Contato Spam Claim', 'contato-claim@spam.test', '11999990013', 'spam', now());

delete from site_private.notification_deliveries
 where request_id in (
   'c0000000-0000-4000-8000-000000000008',
   'c0000000-0000-4000-8000-000000000009',
   'd0000000-0000-4000-8000-000000000004'
 );

insert into site_private.notification_deliveries (request_kind, request_id, channel, audience, status, created_at, next_attempt_at)
values
  ('quote', 'c0000000-0000-4000-8000-000000000008', 'email', 'customer', 'pending', now(), now() - interval '1 minute'),
  ('quote', 'c0000000-0000-4000-8000-000000000009', 'email', 'customer', 'pending', now() - interval '40 days', now() - interval '1 minute'),
  ('contact', 'd0000000-0000-4000-8000-000000000004', 'email', 'commercial_team', 'pending', now(), now() - interval '1 minute');

select is(
  jsonb_array_length(public.claim_site_notification_deliveries(array['email'], 10)),
  0,
  'claim em lote nao reivindica confirmacao inelegivel (spam e fora da janela)'
);
select is(
  (select status from site_private.notification_deliveries
   where request_kind = 'quote' and request_id = 'c0000000-0000-4000-8000-000000000008' and audience = 'customer'),
  'cancelled',
  'claim em lote cancela a entrega do pedido em spam'
);
select is(
  (select status from site_private.notification_deliveries
   where request_kind = 'quote' and request_id = 'c0000000-0000-4000-8000-000000000009' and audience = 'customer'),
  'cancelled',
  'claim em lote cancela a entrega acima da janela'
);
select is(
  (select attempts from site_private.notification_deliveries
   where request_kind = 'quote' and request_id = 'c0000000-0000-4000-8000-000000000008' and audience = 'customer')::integer,
  0,
  'cancelar nao consome tentativa (attempts continua 0)'
);
select is(
  jsonb_array_length(public.claim_site_commercial_team_alerts(10)),
  0,
  'claim em lote do comercial nao reivindica alerta inelegivel'
);
select is(
  (select status from site_private.notification_deliveries
   where request_kind = 'contact' and request_id = 'd0000000-0000-4000-8000-000000000004' and audience = 'commercial_team'),
  'cancelled',
  'claim em lote do comercial cancela o alerta de contato em spam'
);

-- === 5. Entrega incerta nunca e cancelada =======================================

insert into site_private.notification_deliveries (
  request_kind, request_id, channel, audience, status, created_at, next_attempt_at,
  last_error_code, provider_message_id
) values (
  'quote', 'c0000000-0000-4000-8000-000000000002', 'whatsapp', 'customer', 'failed',
  now(), now() - interval '1 minute', 'whatsapp_dispatch_started', null
);

select is(
  (site_private.cancel_ineligible_notification_backlog(
    'quote', 'c0000000-0000-4000-8000-000000000002', 'teste', 'limpeza pontual', interval '0 days')
    || jsonb_build_object('survivor', (
      select status from site_private.notification_deliveries
      where request_kind = 'quote' and request_id = 'c0000000-0000-4000-8000-000000000002' and channel = 'whatsapp'
    ))) ->> 'survivor',
  'failed',
  'entrega incerta (dispatch iniciado sem provider id) sobrevive ao corte'
);

-- === 6. Promocao a spam cancela as entregas do pedido ==========================

select public.update_site_quote_status('c0000000-0000-4000-8000-000000000005', 'spam');

select is(
  (select status from site_private.quote_requests where id = 'c0000000-0000-4000-8000-000000000005'),
  'spam',
  'pedido promovido a spam'
);
select is(
  (select count(*) from site_private.notification_deliveries
   where request_kind = 'quote' and request_id = 'c0000000-0000-4000-8000-000000000005'
     and status in ('pending', 'failed', 'processing')),
  0::bigint,
  'promocao a spam nao deixa entrega orfa na fila'
);
select is(
  (select count(*) from site_private.admin_audit_log
   where table_name = 'notification_deliveries'
     and application_name like 'cancel_ineligible_notification_backlog: pedido marcado como spam%'),
  1::bigint,
  'cancelamento por spam fica auditado com motivo explicito'
);

-- === 7. Saude da fila ===========================================================

select is(
  (select (item ->> 'outOfWindowCount')::integer
   from jsonb_array_elements(public.site_notification_queue_health()) item
   where item ->> 'channel' = 'email'),
  0,
  'saude da fila conta zero fora da janela depois do corte'
);
select is(
  (select count(*) from jsonb_array_elements(public.site_notification_queue_health()) item
   where item ? 'outOfWindowCount'),
  2::bigint,
  'saude da fila publica outOfWindowCount nos dois canais'
);
select ok(
  public.site_notification_queue_health() @> '[{"channel":"email","eligibleCount":0,"exhaustedCount":0}]'::jsonb,
  'saude da fila continua devolvendo o contrato anterior (channel/eligibleCount/exhaustedCount)'
);

-- Fila com entrega pronta para tentativa, dentro da janela, mas de pedido em spam:
-- nao e trabalho pendente de verdade, e o proximo claim a cancela. Se eligibleCount
-- voltar a medir so status/next_attempt_at, ela aparece como fila parada e o alerta
-- de saude dispara por um job que nao existe.
insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, status, contact_name, company, email, phone,
  city, desired_deadline, notes, client_submitted_at
) values
  ('c0000000-0000-4000-8000-00000000000a', 'f11-quote-spam-saude', repeat('e', 64), 'site-promo-brindes',
   'spam', 'Spam Saude', 'Spam Ltda', 'saude@spam.test', '11999990014', null, null, null, now());

delete from site_private.notification_deliveries
 where request_id = 'c0000000-0000-4000-8000-00000000000a';

insert into site_private.notification_deliveries (request_kind, request_id, channel, audience, status, created_at, next_attempt_at)
values ('quote', 'c0000000-0000-4000-8000-00000000000a', 'email', 'customer', 'pending', now(), now() - interval '1 minute');

select is(
  (select (item ->> 'eligibleCount')::integer
   from jsonb_array_elements(public.site_notification_queue_health()) item
   where item ->> 'channel' = 'email'),
  0,
  'saude da fila nao conta como elegivel a entrega de pedido em spam'
);
select is(
  (select (item ->> 'outOfWindowCount')::integer
   from jsonb_array_elements(public.site_notification_queue_health()) item
   where item ->> 'channel' = 'email'),
  1,
  'saude da fila denuncia como fora da janela a entrega de pedido em spam'
);

-- === 8. Privilegios =============================================================

select ok(
  not pg_catalog.has_function_privilege('anon', 'public.cancel_site_notification_backlog(text)', 'execute'),
  'anon nao corta o backlog'
);
select ok(
  pg_catalog.has_function_privilege('authenticated', 'public.cancel_site_notification_backlog(text)', 'execute'),
  'authenticated pode chamar a porta (a checagem real e a allowlist)'
);
select ok(
  not pg_catalog.has_function_privilege('authenticated', 'site_private.notification_delivery_is_eligible(text,uuid,timestamp with time zone,interval)', 'execute'),
  'cliente autenticado nao executa o criterio interno'
);
select ok(
  (select bool_and(array_to_string(p.proconfig, ',') = 'search_path=""')
   from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where (n.nspname = 'public' and p.proname in (
      'claim_site_notification_deliveries', 'claim_site_quote_notification',
      'claim_site_commercial_team_alert', 'claim_site_commercial_team_alerts',
      'cancel_site_notification_backlog', 'site_notification_queue_health', 'update_site_quote_status'))
      or (n.nspname = 'site_private' and p.proname in (
      'notification_policy', 'notification_delivery_is_eligible', 'cancel_ineligible_notification_backlog'))),
  'funcoes do corte fixam search_path vazio'
);

select * from finish();
rollback;