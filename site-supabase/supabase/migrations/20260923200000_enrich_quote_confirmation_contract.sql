-- Confirmações do orçamento precisam refletir a seleção estruturada enviada,
-- sem transformar e-mail em uma cópia de todos os dados privados do portal.
--
-- Escopo exclusivo do projeto isolado xlzmclcjdncjfdrjxclt. Esta migration não
-- cria envio nem ativa provedores: apenas amplia o contrato interno consumido
-- pelo worker já existente. Observações livres, telefone, cidade, URL de origem
-- e outros metadados continuam fora do payload de confirmação.

create or replace function site_private.quote_notification_payload(p_delivery_id uuid)
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
    'channel', delivery.channel,
    'attempt', delivery.attempts,
    'protocol', request.protocol,
    'recipientEmail', request.email,
    'recipientPhone', request.phone,
    'contactName', request.contact_name,
    'company', request.company,
    'submittedAt', request.client_submitted_at,
    'desiredDeadline', request.desired_deadline,
    'campaign', case when jsonb_typeof(request.request_metadata -> 'campaign') = 'object'
      then request.request_metadata -> 'campaign' else null end,
    'briefing', case when jsonb_typeof(request.request_metadata -> 'briefing') = 'object'
      then request.request_metadata -> 'briefing' else null end,
    'items', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'name', item.product_name_snapshot,
        'sku', item.sku_snapshot,
        'quantity', item.quantity,
        'colorName', item.color_name_snapshot,
        'decisionGroup', item.decision_group_snapshot,
        'kitGroupId', item.kit_group_id,
        'kitName', item.kit_name_snapshot,
        'kitQuantity', item.kit_quantity_snapshot,
        'unitsPerKit', item.units_per_kit_snapshot
      )) order by item.position)
      from site_private.quote_items item
      where item.quote_request_id = request.id
    ), '[]'::jsonb)
  ))
  from site_private.notification_deliveries delivery
  join site_private.quote_requests request on request.id = delivery.request_id
  where delivery.id = p_delivery_id
    and delivery.request_kind = 'quote'
    and delivery.audience = 'customer';
$$;

create or replace function public.claim_site_notification_deliveries(
  p_channels text[],
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
  if p_batch_size not between 1 and v_policy.batch_max
    or p_channels is null
    or cardinality(p_channels) not between 1 and 2
    or exists (select 1 from unnest(p_channels) channel where channel not in ('email', 'whatsapp')) then
    raise exception using errcode = '22023', message = 'invalid_notification_claim_input';
  end if;

  with exhausted_candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(p_channels)
      and delivery.attempts >= v_policy.max_attempts
      and (delivery.last_error_code is distinct from 'whatsapp_dispatch_started' or delivery.provider_message_id is not null)
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
      and delivery.audience = 'customer'
      and delivery.channel = any(p_channels)
      and delivery.attempts < v_policy.max_attempts
      and (delivery.last_error_code is distinct from 'whatsapp_dispatch_started' or delivery.provider_message_id is not null)
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
  select coalesce(jsonb_agg(site_private.quote_notification_payload(claimed.id) order by claimed.created_at, claimed.id), '[]'::jsonb)
  into v_jobs
  from claimed;
  return v_jobs;
end;
$$;

create or replace function public.claim_site_quote_notification(
  p_request_id uuid,
  p_channel text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_policy record;
  v_delivery site_private.notification_deliveries%rowtype;
begin
  if p_channel not in ('email', 'whatsapp') then
    raise exception using errcode = '22023', message = 'invalid_notification_channel';
  end if;
  select * into v_policy from site_private.notification_policy();

  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.request_kind = 'quote'
    and delivery.request_id = p_request_id
    and delivery.channel = p_channel
    and delivery.audience = 'customer'
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

  return site_private.quote_notification_payload(v_delivery.id);
end;
$$;

revoke all on function site_private.quote_notification_payload(uuid) from public, anon, authenticated;
grant execute on function site_private.quote_notification_payload(uuid) to site_api, service_role;
revoke all on function public.claim_site_notification_deliveries(text[], integer) from public, anon, authenticated;
grant execute on function public.claim_site_notification_deliveries(text[], integer) to site_api, service_role;
revoke all on function public.claim_site_quote_notification(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_site_quote_notification(uuid, text) to site_api, service_role;

comment on function site_private.quote_notification_payload(uuid) is
  'Contrato privado da confirmação: inclui apenas seleção estruturada, campanha, briefing e data desejada; não expõe observações livres, telefone, cidade ou metadados do pedido.';
comment on function public.claim_site_notification_deliveries(text[], integer) is
  'Reivindica notificações com lease e devolve o contrato estruturado da confirmação, sem notas livres ou dados privados desnecessários ao e-mail.';
comment on function public.claim_site_quote_notification(uuid, text) is
  'Reivindicação imediata com o mesmo contrato estruturado da fila; não recupera jobs processing presos.';
