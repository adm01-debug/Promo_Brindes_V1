-- Alerta comercial do AJUSTE pedido pelo titular. Orçamento
-- (20261106150448) e contato (20261117010000) já notificam o time comercial;
-- o ajuste não notificava ninguém: `request_my_quote_adjustment`
-- (20260910130000) só grava a linha em quote_adjustment_requests e o evento
-- adjustment_requested. O comercial descobria o ajuste abrindo a tela.
-- Esta migration repete, para o ajuste, o padrão já validado nos outros dois.
--
-- Escopo exclusivo do projeto isolado xlzmclcjdncjfdrjxclt.
--
-- Decisões de desenho (para não inventar schema):
--  * `notification_deliveries.request_kind` nasceu com
--    check (request_kind in ('quote', 'contact')) (20260908230000:86) e nunca
--    foi ampliado — nem pelo 20260923120000, que só mexeu em
--    rate_limit_buckets:126. Sem ampliar o CHECK o enfileiramento falha.
--    A ampliação é aditiva: nenhuma linha deixa de valer.
--  * O texto livre do ajuste (`message`) fica FORA do envelope, pela mesma
--    minimização do alerta de orçamento (`notes`, 20261106150448:47-50) e do
--    contato (`message`, 20261117010000:13-22): é o campo onde cai PII de
--    titular e o destino é um webhook fora do banco isolado, onde
--    erase_customer_data não alcança. O alerta leva só o ponteiro
--    (quoteRequestId + adjustmentId) e o comercial lê o texto na tela.
--  * channel = 'email' pelo mesmo motivo do contato: é o valor que o CHECK
--    aceita (20260908230000:88); a entrega real é o webhook comercial.
--  * A unicidade (request_kind, request_id, channel, audience)
--    (20260908230000:99) dá a idempotência do `on conflict do nothing`.
--  * As duas reivindicações do alerta comercial são AMPLIADAS por
--    `create or replace` com a MESMA assinatura — nenhuma função nova em
--    public, nenhum overload órfão (function_catalog_hygiene.test.sql).

-- 1) Amplia o CHECK para aceitar 'adjustment'.
alter table site_private.notification_deliveries
  drop constraint if exists notification_deliveries_request_kind_check;
alter table site_private.notification_deliveries
  add constraint notification_deliveries_request_kind_check
  check (request_kind in ('quote', 'contact', 'adjustment'));

-- 2) Duas funcoes de privacidade so conheciam 'quote' e 'contact', e sao
--    exatamente elas que o claim pontual consulta antes de reivindicar: sem o
--    ramo do ajuste, um ajuste de pedido apagado por direito ao esquecimento
--    (F-30) continuaria seguindo para o webhook comercial, e o backlog do
--    ajuste nunca seria cortado como inelegivel. A elegibilidade por idade e
--    por spam ja cobre o ajuste em (3); aqui entra o e-mail anonimizado.
create or replace function site_private.notification_request_erased(
  p_request_kind text,
  p_request_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select case p_request_kind
    when 'quote' then exists (
      select 1 from site_private.quote_requests request
      where request.id = p_request_id and request.email like '%@erased.invalid'
    )
    when 'contact' then exists (
      select 1 from site_private.contact_requests request
      where request.id = p_request_id and request.email like '%@erased.invalid'
    )
    when 'adjustment' then exists (
      select 1
      from site_private.quote_adjustment_requests adjustment
      join site_private.quote_requests request on request.id = adjustment.quote_request_id
      where adjustment.id = p_request_id and request.email like '%@erased.invalid'
    )
    else false
  end;
$fn$;

-- Mesma lacuna na supressao por bounce/complaint: o e-mail considerado e o do
-- pedido dono do ajuste, nao o do ajuste (o ajuste nao guarda e-mail).
create or replace function site_private.notification_request_suppressed(
  p_request_kind text,
  p_request_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from site_private.notification_deliveries delivery
    where delivery.audience = 'customer'
      and (delivery.delivery_state = 'bounced' or delivery.complained_at is not null)
      and site_private.email_hash(
        case p_request_kind
          when 'quote' then (
            select request.email from site_private.quote_requests request where request.id = p_request_id
          )
          when 'contact' then (
            select request.email from site_private.contact_requests request where request.id = p_request_id
          )
          when 'adjustment' then (
            select request.email
            from site_private.quote_adjustment_requests adjustment
            join site_private.quote_requests request on request.id = adjustment.quote_request_id
            where adjustment.id = p_request_id
          )
        end
      ) = case delivery.request_kind
        when 'quote' then site_private.email_hash((
          select request.email from site_private.quote_requests request where request.id = delivery.request_id
        ))
        when 'adjustment' then site_private.email_hash((
          select request.email
          from site_private.quote_adjustment_requests adjustment
          join site_private.quote_requests request on request.id = adjustment.quote_request_id
          where adjustment.id = delivery.request_id
        ))
        else site_private.email_hash((
          select request.email from site_private.contact_requests request where request.id = delivery.request_id
        ))
      end
  );
$fn$;

-- 2) Enfileiramento: todo ajuste novo gera um alerta comercial pendente na
--    mesma transação do pedido (igual a quote_requests_enqueue_confirmations
--    e a contact_requests_enqueue_commercial_alert).
create or replace function site_private.enqueue_adjustment_commercial_alert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into site_private.notification_deliveries (
    request_kind, request_id, channel, audience, status, next_attempt_at
  ) values (
    'adjustment', new.id, 'email', 'commercial_team', 'pending', now()
  ) on conflict (request_kind, request_id, channel, audience) do nothing;

  return new;
end;
$$;

comment on function site_private.enqueue_adjustment_commercial_alert() is
  'Enfileira o alerta comercial (commercial_team) de um novo ajuste pedido pelo titular.';

drop trigger if exists quote_adjustment_requests_enqueue_commercial_alert
  on site_private.quote_adjustment_requests;
create trigger quote_adjustment_requests_enqueue_commercial_alert
after insert on site_private.quote_adjustment_requests
for each row execute function site_private.enqueue_adjustment_commercial_alert();

-- 2) Elegibilidade: `notification_delivery_is_eligible`
--    (20261122060000:13-45) decide o que entra na fila e tem `else false` ?
--    sem este trecho toda entrega de ajuste seria cancelada como ineleg?vel
--    pelo pr?prio claim em lote, e o alerta nunca sairia. Mesma regra dos
--    outros tipos: pedido existente, n?o spam e e-mail n?o anonimizado.
create or replace function site_private.notification_delivery_is_eligible(
  p_request_kind text,
  p_request_id uuid,
  p_created_at timestamptz,
  p_max_age interval
)
returns boolean
language sql
stable
set search_path = ''
as $fn$
  select p_created_at >= now() - p_max_age
    and case p_request_kind
      when 'quote' then exists (
        select 1
        from site_private.quote_requests request
        where request.id = p_request_id
          and request.status <> 'spam'
          and request.email not like '%@erased.invalid'
      )
      when 'contact' then exists (
        select 1
        from site_private.contact_requests request
        where request.id = p_request_id
          and request.status <> 'spam'
          and request.email not like '%@erased.invalid'
      )
      when 'adjustment' then exists (
        select 1
        from site_private.quote_adjustment_requests adjustment
        join site_private.quote_requests request on request.id = adjustment.quote_request_id
        where adjustment.id = p_request_id
          and request.status <> 'spam'
          and request.email not like '%@erased.invalid'
      )
      else false
    end;
$fn$;

revoke all on function site_private.notification_delivery_is_eligible(text, uuid, timestamptz, interval) from public, anon, authenticated;
grant execute on function site_private.notification_delivery_is_eligible(text, uuid, timestamptz, interval) to site_api, service_role;

-- O helper acima e security invoker de proposito (20261122060000:66-67): quem
-- chama ja enxerga as tabelas do lead. `quote_adjustment_requests` nasceu sem
-- grant para site_api (20260910130000 so deu service_role), entao o ramo novo
-- estouraria 42501 dentro do claim do worker. So leitura: o worker nunca grava
-- ajuste, quem grava e a RPC do titular (security definer).
grant select on site_private.quote_adjustment_requests to site_api;

-- 3) Envelope do ajuste. `volatile` é deliberado: é o que faz a função pegar
--    um snapshot novo e enxergar o lease gravado pela CTE data-modifying do
--    claim em lote (mesmo contrato de quote_notification_payload,
--    20260923200000:12, provado por notification_outbox.test.sql:80-84).
create or replace function site_private.commercial_team_adjustment_alert_payload(p_delivery_id uuid)
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
    'requestKind', 'adjustment',
    'requestId', adjustment.id,
    'adjustmentId', adjustment.id,
    'quoteRequestId', request.id,
    'protocol', request.protocol,
    'company', request.company,
    'attempt', delivery.attempts,
    'recipientEmail', request.email,
    'recipientPhone', request.phone,
    'contactName', request.contact_name,
    'submittedAt', adjustment.created_at,
    'pendingAdjustments', (
      select count(*)
      from site_private.quote_adjustment_requests sibling
      where sibling.quote_request_id = request.id
        and sibling.status = 'new'
    )
  ))
  from site_private.notification_deliveries delivery
  join site_private.quote_adjustment_requests adjustment on adjustment.id = delivery.request_id
  join site_private.quote_requests request on request.id = adjustment.quote_request_id
  where delivery.id = p_delivery_id
    and delivery.request_kind = 'adjustment'
    and delivery.audience = 'commercial_team';
$$;

comment on function site_private.commercial_team_adjustment_alert_payload(uuid) is
  'Envelope do alerta comercial de um ajuste pedido pelo titular (sem o texto livre da mensagem).';

-- 4) Reivindicação síncrona: mesma assinatura, agora cobrindo os três tipos de
--    lead. request_id é uuid de tabelas distintas, então não há ambiguidade.
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
  where delivery.request_kind in ('quote', 'contact', 'adjustment')
    and delivery.request_id = p_request_id
    and delivery.audience = 'commercial_team'
    and delivery.status in ('pending', 'failed')
    and delivery.next_attempt_at <= now()
    and delivery.attempts < v_policy.max_attempts
  order by delivery.created_at, delivery.id
  limit 1;

  if not found then return null; end if;
  if site_private.suppress_notification_delivery(v_delivery.id) then return null; end if;

  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.id = v_delivery.id
  for update skip locked;
  if not found then return null; end if;
  if v_delivery.status not in ('pending', 'failed')
    or v_delivery.next_attempt_at > now()
    or v_delivery.attempts >= v_policy.max_attempts then
    return null;
  end if;

  if not site_private.notification_delivery_is_eligible(
    v_delivery.request_kind, v_delivery.request_id, v_delivery.created_at, v_policy.max_age) then
    perform site_private.cancel_ineligible_notification_backlog(
      v_delivery.request_kind, v_delivery.request_id, 'notification worker',
      'claim pontual de entrega inelegivel', v_policy.max_age);
    return null;
  end if;

  update site_private.notification_deliveries delivery
  set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
      lease_token = gen_random_uuid(), claimed_at = now(), lease_expires_at = now() + v_policy.lease_timeout
  where delivery.id = v_delivery.id
  returning * into v_delivery;

  if v_delivery.request_kind = 'contact' then
    return site_private.commercial_team_contact_alert_payload(v_delivery.id);
  end if;
  if v_delivery.request_kind = 'adjustment' then
    return site_private.commercial_team_adjustment_alert_payload(v_delivery.id);
  end if;
  return site_private.commercial_team_alert_payload(v_delivery.id);
end;
$$;

-- 5) Reivindicação em lote do cron /api/commercial-alerts: mesmo housekeeping
--    de 'exhausted' e mesma ordem de prioridade, agora drenando orçamento,
--    contato e ajuste na mesma fila (um único cron, nenhuma rota nova).
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

  perform site_private.suppress_notification_delivery(blocked.id)
  from (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind in ('quote', 'contact', 'adjustment')
      and delivery.audience = 'commercial_team'
      and delivery.status in ('pending', 'failed', 'processing')
      and not site_private.notification_delivery_is_claimable(delivery.id)
    order by delivery.created_at, delivery.id
    limit p_batch_size
    for update of delivery skip locked
  ) blocked;

  with retired_candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind in ('quote', 'contact', 'adjustment')
      and delivery.audience = 'commercial_team'
      and (delivery.status in ('pending', 'failed') or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
      and (delivery.last_error_code is distinct from 'whatsapp_dispatch_started' or delivery.provider_message_id is not null)
      and not site_private.notification_delivery_is_eligible(
        delivery.request_kind, delivery.request_id, delivery.created_at, v_policy.max_age)
      and site_private.notification_delivery_is_claimable(delivery.id)
    for update of delivery skip locked
  )
  update site_private.notification_deliveries delivery
  set status = 'cancelled', lease_token = null, lease_expires_at = null, updated_at = now()
  from retired_candidates
  where delivery.id = retired_candidates.id;

  with exhausted_candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind in ('quote', 'contact', 'adjustment')
      and delivery.audience = 'commercial_team'
      and delivery.attempts >= v_policy.max_attempts
      and (delivery.status in ('pending', 'failed') or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
      and site_private.notification_delivery_is_claimable(delivery.id)
    for update of delivery skip locked
  )
  update site_private.notification_deliveries delivery
  set status = 'exhausted', lease_token = null, lease_expires_at = null, updated_at = now()
  from exhausted_candidates
  where delivery.id = exhausted_candidates.id;

  with candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind in ('quote', 'contact', 'adjustment')
      and delivery.audience = 'commercial_team'
      and delivery.attempts < v_policy.max_attempts
      -- F-11: revalidacao obrigatoria ? o cancelamento acima roda com outro snapshot.
      and site_private.notification_delivery_is_eligible(
        delivery.request_kind, delivery.request_id, delivery.created_at, v_policy.max_age)
      -- F-12: endereco suprimido ou pedido apagado nunca e reivindicado.
      and site_private.notification_delivery_is_claimable(delivery.id)
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
      when claimed.request_kind = 'adjustment'
      then site_private.commercial_team_adjustment_alert_payload(claimed.id)
      else site_private.commercial_team_alert_payload(claimed.id)
    end
    order by claimed.created_at, claimed.id), '[]'::jsonb)
  into v_jobs
  from claimed;
  return v_jobs;
end;
$$;

-- ACL: mesmo padrão dos alertas de orçamento e contato — nada para
-- public/anon/authenticated, execute só para site_api e service_role.
revoke all on function site_private.enqueue_adjustment_commercial_alert() from public, anon, authenticated;
grant execute on function site_private.enqueue_adjustment_commercial_alert() to site_api, service_role;
revoke all on function site_private.commercial_team_adjustment_alert_payload(uuid) from public, anon, authenticated;
grant execute on function site_private.commercial_team_adjustment_alert_payload(uuid) to site_api, service_role;
revoke all on function public.claim_site_commercial_team_alert(uuid) from public, anon, authenticated;
grant execute on function public.claim_site_commercial_team_alert(uuid) to site_api, service_role;
revoke all on function public.claim_site_commercial_team_alerts(integer) from public, anon, authenticated;
grant execute on function public.claim_site_commercial_team_alerts(integer) to site_api, service_role;

comment on function public.claim_site_commercial_team_alert(uuid) is
  'Reivindica o alerta comercial de um lead específico (orçamento, contato ou ajuste), sem filtrar por canal.';
comment on function public.claim_site_commercial_team_alerts(integer) is
  'Reivindica lotes de alertas comerciais pendentes (orçamento, contato e ajuste) para o cron de entrega.';