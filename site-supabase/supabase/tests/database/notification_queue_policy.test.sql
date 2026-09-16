-- Etapas 9, 10, 11 e 12 do plano de correções: política única da fila, backoff
-- exponencial com jitter e a invariante declarativa lease <-> status.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(20);

-- === Etapa 12: política única =======================================================

select is(
  (select max_attempts from site_private.notification_policy()),
  5::smallint,
  'política: 5 tentativas máximas'
);
select is(
  (select batch_max from site_private.notification_policy()),
  25,
  'política: lote máximo de 25'
);
select is(
  (select lease_timeout from site_private.notification_policy()),
  interval '10 minutes',
  'política: lease de 10 minutos'
);
select ok(not pg_catalog.has_function_privilege('anon', 'site_private.notification_policy()', 'execute'), 'anon não lê a política');
select ok(not pg_catalog.has_function_privilege('authenticated', 'site_private.notification_policy()', 'execute'), 'authenticated não lê a política');
select ok(pg_catalog.has_function_privilege('service_role', 'site_private.notification_policy()', 'execute'), 'backend lê a política');

-- === Etapa 11: backoff exponencial com jitter =======================================

select is(
  site_private.next_retry_at(1::smallint, '2026-01-01 00:00:00+00'::timestamptz, 0::double precision),
  '2026-01-01 00:01:00+00'::timestamptz,
  'tentativa 1, sem jitter: 60s (retry_base_seconds)'
);
select is(
  site_private.next_retry_at(2::smallint, '2026-01-01 00:00:00+00'::timestamptz, 0::double precision),
  '2026-01-01 00:02:00+00'::timestamptz,
  'tentativa 2, sem jitter: 120s (dobro da anterior)'
);
select is(
  site_private.next_retry_at(4::smallint, '2026-01-01 00:00:00+00'::timestamptz, 0::double precision),
  '2026-01-01 00:08:00+00'::timestamptz,
  'tentativa 4, sem jitter: 480s'
);
select is(
  site_private.next_retry_at(1::smallint, '2026-01-01 00:00:00+00'::timestamptz, 0.5::double precision),
  '2026-01-01 00:01:06+00'::timestamptz,
  'tentativa 1, jitter 0.5: 60s + 10% = 66s'
);
select is(
  site_private.next_retry_at(20::smallint, '2026-01-01 00:00:00+00'::timestamptz, 0::double precision),
  '2026-01-01 01:00:00+00'::timestamptz,
  'tentativa muito alta é limitada por retry_cap_seconds (3600s = 1h), não cresce sem limite'
);
select throws_like(
  $$ select site_private.next_retry_at(0::smallint) $$,
  '%invalid_retry_attempts%',
  'attempts < 1 é rejeitado'
);
select throws_like(
  $$ select site_private.next_retry_at(1::smallint, now(), 1::double precision) $$,
  '%invalid_retry_jitter%',
  'jitter >= 1 é rejeitado (intervalo é [0,1))'
);
select throws_like(
  $$ select site_private.next_retry_at(1::smallint, now(), -0.1::double precision) $$,
  '%invalid_retry_jitter%',
  'jitter negativo é rejeitado'
);
select ok(not pg_catalog.has_function_privilege('anon', 'site_private.next_retry_at(smallint,timestamptz,double precision)', 'execute'), 'anon não calcula backoff');
select ok(pg_catalog.has_function_privilege('service_role', 'site_private.next_retry_at(smallint,timestamptz,double precision)', 'execute'), 'backend calcula backoff');

-- === Etapa 9: invariante declarativa lease <-> status ===============================

insert into site_private.quote_requests (
  client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at
) values (
  'queue-policy-quote-1', repeat('d', 64), 'site-promo-brindes',
  'Cliente Política', 'Empresa Política', 'politica@example.test', '(11) 96666-5555', now()
);

select throws_like(
  $$
    insert into site_private.notification_deliveries (request_kind, request_id, channel, audience, status)
    select 'quote', id, 'whatsapp', 'customer', 'processing' from site_private.quote_requests
    where client_request_id = 'queue-policy-quote-1'
  $$,
  '%notification_deliveries_lease_matches_status%',
  'processing sem lease_token/lease_expires_at viola a invariante (Etapa 9)'
);

select lives_ok(
  $$
    insert into site_private.notification_deliveries (
      request_kind, request_id, channel, audience, status, lease_token, lease_expires_at
    )
    select 'quote', id, 'whatsapp', 'customer', 'processing', gen_random_uuid(), now() + interval '10 minutes'
    from site_private.quote_requests where client_request_id = 'queue-policy-quote-1'
  $$,
  'processing com lease_token e lease_expires_at é aceito'
);

-- Desde a migration 20260916220000, o trigger de transição da Etapa 9 pega este
-- caso ANTES da constraint declarativa chegar a ser avaliada (processing -> pending
-- não está na matriz de transições permitidas, e mesmo se estivesse, o lease_token
-- não foi zerado) — a constraint continua existindo como defesa em profundidade,
-- mas o erro que a sessão realmente vê agora vem do trigger.
select throws_like(
  $$
    update site_private.notification_deliveries
    set status = 'pending'
    where request_id = (select id from site_private.quote_requests where client_request_id = 'queue-policy-quote-1')
      and channel = 'whatsapp'
  $$,
  '%lease_token deve ser zerado ao sair de processing%',
  'sair de processing sem limpar lease_token/lease_expires_at viola a invariante (Etapa 9)'
);

select lives_ok(
  $$
    update site_private.notification_deliveries
    set status = 'sent', lease_token = null, lease_expires_at = null
    where request_id = (select id from site_private.quote_requests where client_request_id = 'queue-policy-quote-1')
      and channel = 'whatsapp'
  $$,
  'sair de processing limpando lease_token e lease_expires_at juntos é aceito'
);

select * from finish();
rollback;
