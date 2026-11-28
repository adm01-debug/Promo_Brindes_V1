begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(14);

-- Migration 20261128160000: o ajuste pedido pelo cliente tambem alimenta a
-- fila de alerta comercial (PF-01). Antes dela so orcamento e contato
-- geravam alerta, entao o comercial so descobria o ajuste se abrisse o painel.
select has_trigger('site_private', 'quote_adjustment_requests', 'quote_adjustment_requests_enqueue_commercial_alert',
  'novo ajuste alimenta a fila do alerta comercial na mesma transacao');

select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'site_private.notification_deliveries'::regclass
      and conname = 'notification_deliveries_request_kind_check'
      and pg_catalog.pg_get_constraintdef(oid) like '%adjustment%'
  ),
  'a fila de entregas aceita request_kind = adjustment'
);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'titular-ajuste@teste.com')
on conflict (id) do nothing;

insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, contact_name, company, email, phone,
  client_submitted_at, request_metadata, customer_user_id
) values (
  '00000000-0000-0000-0000-0000000000b1', 'quote-adjust-alert-1', repeat('c', 64), 'site-promo-brindes',
  'Titular Ajuste', 'Empresa Ajuste', 'titular-ajuste@teste.com', '(11) 97777-6666',
  now(), '{}'::jsonb, '00000000-0000-0000-0000-0000000000a1'
);

insert into site_private.quote_adjustment_requests (
  id, quote_request_id, requested_by, client_request_id, message
) values (
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000a1', 'adjust-commercial-alert-1', 'Quero trocar a cor do meu pedido'
);

select is(
  (select count(*) from site_private.notification_deliveries
   where request_kind = 'adjustment' and request_id = '00000000-0000-0000-0000-0000000000c1'),
  1::bigint,
  'o ajuste enfileira exatamente uma entrega'
);

select is(
  (select channel from site_private.notification_deliveries
   where request_kind = 'adjustment' and request_id = '00000000-0000-0000-0000-0000000000c1'),
  'email',
  'o ajuste usa o canal de e-mail do time comercial'
);

-- Reivindicacao: mesma RPC usada pelo cron /api/commercial-alerts.
create temp table adjustment_alert_job as
  select job as payload from jsonb_array_elements(public.claim_site_commercial_team_alerts(10)) job;

select is(
  (select count(*) from adjustment_alert_job where payload ->> 'requestKind' = 'adjustment'),
  1::bigint,
  'o claim em lote devolve o alerta de ajuste pendente junto dos outros tipos'
);
select is(
  (select payload ->> 'requestKind' from adjustment_alert_job where payload ->> 'requestKind' = 'adjustment' limit 1),
  'adjustment',
  'o job identifica o tipo do alerta como ajuste'
);
select is(
  (select payload ->> 'quoteRequestId' from adjustment_alert_job where payload ->> 'requestKind' = 'adjustment' limit 1),
  '00000000-0000-0000-0000-0000000000b1',
  'o job aponta para o orcamento dono do ajuste'
);
select is(
  (select payload ->> 'pendingAdjustments' from adjustment_alert_job where payload ->> 'requestKind' = 'adjustment' limit 1),
  '1',
  'o job informa quantos ajustes estao pendentes no orcamento'
);
select is(
  (select payload ? 'message' from adjustment_alert_job where payload ->> 'requestKind' = 'adjustment' limit 1),
  false,
  'o envelope NAO leva o texto livre do ajuste (minimizacao de dado pessoal)'
);
select is(
  (select (payload ->> 'leaseToken') is not null and (payload ->> 'attempt') = '1' from adjustment_alert_job where payload ->> 'requestKind' = 'adjustment' limit 1),
  true,
  'a reivindicacao devolve lease proprio e primeira tentativa'
);

select is(
  (select status from site_private.notification_deliveries
   where request_kind = 'adjustment' and request_id = '00000000-0000-0000-0000-0000000000c1'),
  'processing',
  'reivindicar move a entrega do ajuste para processing'
);

-- A reivindicacao nao pode reentregar o mesmo ajuste nem derrubar o alerta
-- de orcamento que ja existia na fila.
select is(
  (select count(*) from jsonb_array_elements(public.claim_site_commercial_team_alerts(10)) job
   where job ->> 'requestKind' = 'adjustment'),
  0::bigint,
  'segunda reivindicacao nao reentrega o alerta ja reservado'
);

select ok(
  not pg_catalog.has_function_privilege('anon', 'site_private.commercial_team_adjustment_alert_payload(uuid)', 'execute'),
  'anon nao monta o envelope do alerta de ajuste'
);
select ok(
  pg_catalog.has_function_privilege('service_role', 'site_private.commercial_team_adjustment_alert_payload(uuid)', 'execute'),
  'backend monta o envelope do alerta de ajuste'
);

select * from finish();
rollback;