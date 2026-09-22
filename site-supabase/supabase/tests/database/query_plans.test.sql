-- Etapa 17 do plano de correções: testes de plano de execução. Constrói uma fixture
-- sintética com a distribuição de regime permanente de uma fila real (grande maioria
-- 'sent', fração elegível pequena) e falha se a consulta de reivindicação da fila
-- regredir para Seq Scan — exatamente o que a auditoria de 16/09/2026 mediu antes de
-- existirem os índices das etapas 13/14 (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md).
--
-- Sem esta fixture (poucas linhas, todas recentes), qualquer teste de plano seria
-- frágil: o planner prefere Seq Scan em tabelas pequenas mesmo com o índice certo, o
-- que é comportamento correto do Postgres, não uma regressão a detectar.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

-- Conta sintética usada apenas por seis pedidos, para a consulta de histórico ter
-- seletividade real. O rollback final remove a identidade e todos os pedidos.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'authenticated', 'authenticated', 'query-plan@example.test', '', now(),
  '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into site_private.quote_requests (
  client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at
)
select
  'query-plan-fixture-' || g, repeat('e', 64), 'site-promo-brindes',
  'Fixture', 'Fixture Co', 'fixture' || g || '@example.test', '11999999999', now()
from generate_series(1, 6000) g;

update site_private.quote_requests request
set customer_user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    retention_until = now() - interval '1 day'
where request.client_request_id in (
  select 'query-plan-fixture-' || g from generate_series(1000, 6000, 1000) g
);

-- Distribuição de regime permanente: ~99,7% sent (histórico), fração pequena elegível.
-- Reaproveita as linhas 'email'/'pending' que o trigger enqueue_quote_confirmations já
-- criou automaticamente para cada quote_request acima. Redistribuição direta de status
-- para simular regime permanente (não uma sequência real de transições) — desabilita os
-- dois triggers da Etapa 9 só para este setup, mesmo padrão de notification_outbox.test.sql.
alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_status_transition;
alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_lease_and_attempts;
with numbered as (
  select delivery.id, row_number() over (order by delivery.id) as g
  from site_private.notification_deliveries delivery
  join site_private.quote_requests request on request.id = delivery.request_id
  where request.client_request_id like 'query-plan-fixture-%'
)
update site_private.notification_deliveries delivery
set
  status = case
    when numbered.g % 1000 = 3 then 'processing'
    when numbered.g % 500 = 7 then 'failed'
    when numbered.g % 300 = 11 then 'pending'
    else 'sent'
  end,
  attempts = case when numbered.g % 300 = 11 or numbered.g % 500 = 7 then 2::smallint else 5::smallint end,
  next_attempt_at = now() - interval '1 hour' + (numbered.g % 3600) * interval '1 second',
  lease_expires_at = case when numbered.g % 1000 = 3 then now() - interval '20 minutes' else null end,
  lease_token = case when numbered.g % 1000 = 3 then gen_random_uuid() else null end,
  claimed_at = case when numbered.g % 1000 = 3 then now() - interval '25 minutes' else null end,
  provider = case when numbered.g % 1000 in (3, 7, 11) then null else 'resend' end,
  provider_message_id = case when numbered.g % 1000 in (3, 7, 11) then null else 'plan-event-' || numbered.g end,
  created_at = now() - interval '90 days' + (numbered.g % 7776000) * interval '1 second'
from numbered
where delivery.id = numbered.id;
alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_status_transition;
alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_lease_and_attempts;

analyze site_private.notification_deliveries;
analyze site_private.quote_requests;

-- EXPLAIN é um comando utilitário, não uma expressão: a função temporária obtém
-- FORMAT JSON sem executar a consulta nem depender da indentação do plano textual.
-- Some com o rollback desta transação.
create function pg_temp.explain_plan_json(p_query text) returns jsonb
language plpgsql as $body$
declare
  v_result json;
begin
  execute 'explain (format json) ' || p_query into v_result;
  return v_result::jsonb;
end;
$body$;

select ok(
  pg_temp.explain_plan_json($sql$
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(array['email', 'whatsapp'])
      and delivery.attempts < 5
      and (
        (delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now())
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now())
      )
    order by delivery.next_attempt_at, delivery.created_at, delivery.id
    limit 10
  $sql$)::text not like '%"Node Type": "Seq Scan"%',
  'consulta de reivindicação da fila não usa Seq Scan em notification_deliveries com distribuição de regime permanente (Etapa 17)'
);

select ok(
  pg_temp.explain_plan_json($sql$
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.status = 'processing' and delivery.lease_expires_at <= now()
    order by delivery.lease_expires_at, delivery.id
    limit 10
  $sql$)::text not like '%"Node Type": "Seq Scan"%',
  'recuperação de leases expiradas usa acesso indexado'
);

select ok(
  pg_temp.explain_plan_json($sql$
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.provider = 'resend' and delivery.provider_message_id = 'plan-event-100'
    limit 1
  $sql$)::text not like '%"Node Type": "Seq Scan"%',
  'reconciliação de webhook pelo identificador do provedor usa acesso indexado'
);

select ok(
  pg_temp.explain_plan_json($sql$
    select request.id
    from site_private.quote_requests request
    where request.customer_user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      and request.status <> 'spam'
    order by request.created_at desc
    limit 10
  $sql$)::text not like '%"Node Type": "Seq Scan"%',
  'histórico do cliente usa acesso indexado por titular e data'
);

select ok(
  pg_temp.explain_plan_json($sql$
    select request.id
    from site_private.quote_requests request
    where request.retention_until <= now()
    order by request.retention_until, request.id
    limit 10
  $sql$)::text not like '%"Node Type": "Seq Scan"%',
  'seleção de pedidos expirados para retenção usa acesso indexado'
);

select ok(
  (
    select count(*) > 0
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(array['email', 'whatsapp'])
      and delivery.attempts < 5
      and (
        (delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now())
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now())
      )
  ),
  'pré-condição: fixture realmente contém jobs elegíveis (o teste anterior não passa por vacuidade)'
);

select ok(
  (select count(*) from site_private.notification_deliveries
   where request_id in (select id from site_private.quote_requests where client_request_id like 'query-plan-fixture-%')
     and status = 'sent') > 5000,
  'pré-condição: fixture reproduz o regime permanente (grande maioria sent)'
);

select is(
  (select count(*)::integer from site_private.notification_deliveries
   where status = 'processing' and lease_expires_at <= now()
     and request_id in (select id from site_private.quote_requests where client_request_id like 'query-plan-fixture-%')),
  6,
  'pré-condição: seis leases sintéticas realmente expiraram'
);

select is(
  (select count(*)::integer from site_private.notification_deliveries
   where provider = 'resend' and provider_message_id = 'plan-event-100'),
  1,
  'pré-condição: o identificador de webhook existe na fixture'
);

select is(
  (select count(*)::integer from site_private.quote_requests
   where customer_user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' and status <> 'spam'),
  6,
  'pré-condição: histórico sintético pertence à conta de teste'
);

select is(
  (select count(*)::integer from site_private.quote_requests
   where client_request_id like 'query-plan-fixture-%' and retention_until <= now()),
  6,
  'pré-condição: seis pedidos sintéticos estão vencidos para retenção'
);

select * from finish();
rollback;
