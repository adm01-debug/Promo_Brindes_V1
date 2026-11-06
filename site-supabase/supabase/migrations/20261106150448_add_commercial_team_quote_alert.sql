-- Alerta comercial (PF-01): quando um lead submete orçamento, a equipe
-- comercial precisa ser notificada. Sem esta mudança nenhum webhook/e-mail
-- comercial dispara — só o cliente recebe as confirmações (audience 'customer').
--
-- Escopo exclusivo do projeto isolado xlzmclcjdncjfdrjxclt. Não referencia
-- nem altera o catálogo canônico doufsxqlfjyuvxuezpln.

-- 1) O trigger que enfileira confirmações passa a enfileirar também um alerta
--    para o time comercial (canal 'email' = webhook comercial). A unicidade
--    (request_kind, request_id, channel, audience) e o CHECK de audience
--    ('customer'|'commercial_team') já existentes comportam o novo par; o
--    `on conflict do nothing` garante idempotência em retries da migration.
create or replace function site_private.enqueue_quote_confirmations()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into site_private.notification_deliveries (
    request_kind, request_id, channel, audience, status, next_attempt_at
  ) values (
    'quote', new.id, 'email', 'customer', 'pending', now()
  ) on conflict (request_kind, request_id, channel, audience) do nothing;

  if new.request_metadata #> '{notificationPreferences,whatsappCopy}' = 'true'::jsonb then
    insert into site_private.notification_deliveries (
      request_kind, request_id, channel, audience, status, next_attempt_at
    ) values (
      'quote', new.id, 'whatsapp', 'customer', 'pending', now()
    ) on conflict (request_kind, request_id, channel, audience) do nothing;
  end if;

  insert into site_private.notification_deliveries (
    request_kind, request_id, channel, audience, status, next_attempt_at
  ) values (
    'quote', new.id, 'email', 'commercial_team', 'pending', now()
  ) on conflict (request_kind, request_id, channel, audience) do nothing;

  return new;
end;
$$;

comment on function site_private.enqueue_quote_confirmations() is
  'Enefileira confirmacoes do cliente (customer) e o alerta comercial (commercial_team).';

-- 2) Payload do alerta comercial. O contrato de confirmação
--    (site_private.quote_notification_payload) filtra audience='customer',
--    então o alerta comercial monta o próprio envelope, sem dados que o time
--    comercial não precise (ex.: observações livres e cidade continuam fora).
create or replace function site_private.commercial_team_alert_payload(p_delivery_id uuid)
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
    'requestId', request.id,
    'attempt', delivery.attempts,
    'protocol', request.protocol,
    'recipientEmail', request.email,
    'recipientPhone', request.phone,
    'contactName', request.contact_name,
    'company', request.company,
    'submittedAt', request.client_submitted_at,
    'desiredDeadline', request.desired_deadline,
    'items', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'name', item.product_name_snapshot,
        'sku', item.sku_snapshot,
        'quantity', item.quantity,
        'colorName', item.color_name_snapshot
      )) order by item.position)
      from site_private.quote_items item
      where item.quote_request_id = request.id
    ), '[]'::jsonb)
  ))
  from site_private.notification_deliveries delivery
  join site_private.quote_requests request on request.id = delivery.request_id
  where delivery.id = p_delivery_id
    and delivery.request_kind = 'quote'
    and delivery.audience = 'commercial_team';
$$;

-- 3) Reivindicação específica para o orçamento que acabou de ser submetido
--    (fluxo síncrono do POST /api/quote-requests). Mesmo contrato de
--    lease/attempts da máquina de estados (20260916220000): ao entrar em
--    'processing' exige lease próprio e incrementa attempts em +1.
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
  where delivery.request_kind = 'quote'
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

  return site_private.commercial_team_alert_payload(v_delivery.id);
end;
$$;

-- 4) Reivindicação em lote para o cron /api/commercial-alerts. Mantém o mesmo
--    housekeeping de 'exhausted' e a mesma ordem de prioridade das
--    confirmações do cliente (20260923200000).
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
    where delivery.request_kind = 'quote'
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
    where delivery.request_kind = 'quote'
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
    returning delivery.id, delivery.created_at
  )
  select coalesce(jsonb_agg(site_private.commercial_team_alert_payload(claimed.id) order by claimed.created_at, claimed.id), '[]'::jsonb)
  into v_jobs
  from claimed;
  return v_jobs;
end;
$$;

revoke all on function site_private.commercial_team_alert_payload(uuid) from public, anon, authenticated;
grant execute on function site_private.commercial_team_alert_payload(uuid) to site_api, service_role;
revoke all on function public.claim_site_commercial_team_alert(uuid) from public, anon, authenticated;
grant execute on function public.claim_site_commercial_team_alert(uuid) to site_api, service_role;
revoke all on function public.claim_site_commercial_team_alerts(integer) from public, anon, authenticated;
grant execute on function public.claim_site_commercial_team_alerts(integer) to site_api, service_role;

comment on function site_private.commercial_team_alert_payload(uuid) is
  'Envelope do alerta comercial (audience commercial_team) para envio por webhook.';
comment on function public.claim_site_commercial_team_alert(uuid) is
  'Reivindica o alerta comercial de um orcamento especifico, sem filtrar por canal.';
comment on function public.claim_site_commercial_team_alerts(integer) is
  'Reivindica lotes de alertas comerciais pendentes para o cron de entrega.';
