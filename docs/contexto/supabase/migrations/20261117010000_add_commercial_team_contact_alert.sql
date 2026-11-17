-- Alerta comercial do CONTATO. Hoje o lead do formulário de contato entra em
-- site_private.contact_requests e ninguém é notificado: não há trigger de
-- enfileiramento, não há payload e as reivindicações do alerta comercial
-- filtram request_kind = 'quote' (20261106150448). Esta migration repete, para
-- o contato, exatamente o padrão já validado no orçamento (PF-01).
--
-- Escopo exclusivo do projeto isolado xlzmclcjdncjfdrjxclt.
--
-- Decisões de desenho (para não inventar schema):
--  * contact_requests NÃO tem company, protocol nem itens (verificado em
--    20260908230000:51-66 + os dois únicos add column posteriores,
--    20260910103000:6 `message` e 20260910120000:10-11 `preferred_channel`).
--    O envelope do contato por isso carrega preferred_channel/page_url e omite
--    protocolo, empresa e itens.
--  * O texto livre do lead (`message`) fica FORA do envelope, pela mesma
--    decisão de minimização do alerta de orçamento, que deliberadamente deixa
--    `notes` de fora (20261106150448:47-50 e :58-82). É justamente o campo
--    onde cai dado sensível de titular (customer_data_erasure.test.sql:24-29,
--    'Meu CPF é 000.000.000-00') e o destino do alerta é um webhook fora do
--    banco isolado, onde `erase_customer_data` não alcança. O time comercial
--    lê a mensagem na fonte; o alerta leva só o ponteiro do lead.
--  * channel = 'email' porque o CHECK só aceita 'email'|'whatsapp'
--    (20260908230000:88); a entrega real é o webhook comercial, igual ao
--    alerta de orçamento, que também usa 'email'.
--  * request_kind 'contact' e audience 'commercial_team' já são aceitos pelos
--    CHECKs originais (20260908230000:86 e :89) e a unicidade
--    (request_kind, request_id, channel, audience) (20260908230000:99) dá a
--    idempotência do `on conflict do nothing`.
--  * As duas reivindicações do alerta comercial são AMPLIADAS por
--    `create or replace` com a MESMA assinatura — nenhuma função nova em
--    public, nenhum overload órfão (function_catalog_hygiene.test.sql).

-- 1) Enfileiramento: todo contato novo gera um alerta comercial pendente na
--    mesma transação do lead (igual a quote_requests_enqueue_confirmations).
create or replace function site_private.enqueue_contact_commercial_alert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into site_private.notification_deliveries (
    request_kind, request_id, channel, audience, status, next_attempt_at
  ) values (
    'contact', new.id, 'email', 'commercial_team', 'pending', now()
  ) on conflict (request_kind, request_id, channel, audience) do nothing;

  return new;
end;
$$

comment on function site_private.enqueue_contact_commercial_alert() is
  'Enfileira o alerta comercial (commercial_team) de um novo lead de contato.'

drop trigger if exists contact_requests_enqueue_commercial_alert on site_private.contact_requests

create trigger contact_requests_enqueue_commercial_alert
after insert on site_private.contact_requests
for each row execute function site_private.enqueue_contact_commercial_alert()

-- 2) Envelope do contato. Não reaproveita commercial_team_alert_payload porque
--    aquele faz join obrigatório com quote_requests (20261106150448:85-87) e
--    exige protocolo/itens que o contato não tem. 'requestKind' é o
--    discriminador que a API usa para não renderizar texto de orçamento.
--    `volatile` é deliberado, não cosmético: é o que faz a função pegar um
--    snapshot novo e enxergar o lease gravado pela CTE data-modifying do claim
--    em lote (mesmo contrato de quote_notification_payload, 20260923200000:12,
--    provado por notification_outbox.test.sql:80-84).
create or replace function site_private.commercial_team_contact_alert_payload(p_delivery_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', delivery.id,
    'leaseToken', delivery.lease_token,
    'existingProvider', delivery.provider,
    'existingProviderMessageId', delivery.provider_message_id,
    'requestKind', 'contact',
    'requestId', request.id,
    'attempt', delivery.attempts,
    'recipientEmail', request.email,
    'recipientPhone', request.phone,
    'contactName', request.contact_name,
    'submittedAt', request.client_submitted_at,
    'preferredChannel', request.preferred_channel,
    'pageUrl', request.page_url
  ))
  from site_private.notification_deliveries delivery
  join site_private.contact_requests request on request.id = delivery.request_id
  where delivery.id = p_delivery_id
    and delivery.request_kind = 'contact'
    and delivery.audience = 'commercial_team';
$$

comment on function site_private.commercial_team_contact_alert_payload(uuid) is
  'Envelope do alerta comercial de um lead de contato (sem protocolo, empresa, itens nem o texto livre da mensagem).'

-- 3) Reivindicação síncrona (POST /api/contact-requests e /api/quote-requests):
--    mesma assinatura, agora cobrindo os dois tipos de lead. request_id é uuid
--    de tabelas distintas, então não há ambiguidade entre quote e contato.
create or replace function public.claim_site_commercial_team_alert(p_request_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_policy record;
  v_delivery site_private.notification_deliveries%rowtype;
begin
  select * into v_policy from site_private.notification_policy();
  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.request_kind in ('quote', 'contact')
    and delivery.request_id = p_request_id
    and delivery.audience = 'commercial_team'
    and delivery.status in ('pending', 'failed')
    and delivery.next_attempt_at <= now()
    and delivery.attempts < v_policy.max_attempts
  for update skip locked;
  if not found then return null; end if;

  update site_private.notification_deliveries delivery
  set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
      lease_token = gen_random_uuid(), claimed_at = now(), lease_expires_at = now() + v_policy.lease_timeout
  where delivery.id = v_delivery.id
  returning * into v_delivery;

  if v_delivery.request_kind = 'contact' then
    return site_private.commercial_team_contact_alert_payload(v_delivery.id);
  end if;
  return site_private.commercial_team_alert_payload(v_delivery.id);
end;
$$

-- 4) Reivindicação em lote do cron /api/commercial-alerts: mesmo housekeeping
--    de 'exhausted' e mesma ordem de prioridade, agora drenando orçamento e
--    contato na mesma fila (um único cron, nenhuma rota nova).
create or replace function public.claim_site_commercial_team_alerts(
  p_batch_size integer default 10
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_policy record;
  v_jobs jsonb;
begin
  select * into v_policy from site_private.notification_policy();
  if p_batch_size not between 1 and v_policy.batch_max then
    raise exception using errcode = '22023', message = 'invalid_notification_claim_input';
  end if;

  with exhausted_candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind in ('quote', 'contact')
      and delivery.audience = 'commercial_team'
      and delivery.attempts >= v_policy.max_attempts
      and (delivery.status in ('pending', 'failed') or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
    for update of delivery skip locked
  )
  update site_private.notification_deliveries delivery
  set status = 'exhausted', lease_token = null, lease_expires_at = null, updated_at = now()
  from exhausted_candidates
  where delivery.id = exhausted_candidates.id;

  with candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind in ('quote', 'contact')
      and delivery.audience = 'commercial_team'
      and delivery.attempts < v_policy.max_attempts
      and ((delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now())
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
    order by delivery.next_attempt_at, delivery.created_at, delivery.id
    for update of delivery skip locked
    limit p_batch_size
  ), claimed as (
    update site_private.notification_deliveries delivery
    set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
        lease_token = gen_random_uuid(), claimed_at = now(), lease_expires_at = now() + v_policy.lease_timeout
    from candidates
    where delivery.id = candidates.id
    returning delivery.id, delivery.created_at, delivery.request_kind
  )
  select coalesce(jsonb_agg(
    case when claimed.request_kind = 'contact'
      then site_private.commercial_team_contact_alert_payload(claimed.id)
      else site_private.commercial_team_alert_payload(claimed.id)
    end
    order by claimed.created_at, claimed.id), '[]'::jsonb)
  into v_jobs
  from claimed;
  return v_jobs;
end;
$$

-- ACL: mesmo padrão do alerta de orçamento (20261106150448:186-191) e do
-- trigger de confirmações (20260912170000:204 + 20260916160000:72) — nada para
-- public/anon/authenticated, execute só para site_api e service_role. As duas
-- funções de claim mantêm o ACL por `create or replace`, mas os grants são
-- reafirmados para a migration ser auditável sozinha.
revoke all on function site_private.enqueue_contact_commercial_alert() from public, anon, authenticated

grant execute on function site_private.enqueue_contact_commercial_alert() to site_api, service_role

revoke all on function site_private.commercial_team_contact_alert_payload(uuid) from public, anon, authenticated

grant execute on function site_private.commercial_team_contact_alert_payload(uuid) to site_api, service_role

revoke all on function public.claim_site_commercial_team_alert(uuid) from public, anon, authenticated

grant execute on function public.claim_site_commercial_team_alert(uuid) to site_api, service_role

revoke all on function public.claim_site_commercial_team_alerts(integer) from public, anon, authenticated

grant execute on function public.claim_site_commercial_team_alerts(integer) to site_api, service_role

comment on function public.claim_site_commercial_team_alert(uuid) is
  'Reivindica o alerta comercial de um lead especifico (orcamento ou contato), sem filtrar por canal.'

comment on function public.claim_site_commercial_team_alerts(integer) is
  'Reivindica lotes de alertas comerciais pendentes (orcamento e contato) para o cron de entrega.'
