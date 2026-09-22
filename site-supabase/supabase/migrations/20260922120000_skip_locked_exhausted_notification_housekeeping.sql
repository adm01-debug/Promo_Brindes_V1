-- No banco exclusivo do site, dois workers podem tentar terminalizar a mesma
-- delivery esgotada. O UPDATE anterior esperava o lock do primeiro worker,
-- impedindo que o segundo avançasse até o timeout da função serverless.
-- A seleção de jobs esgotados agora usa o mesmo SKIP LOCKED do claim normal.

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
      and (
        delivery.status in ('pending', 'failed')
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now())
      )
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
      and (
        (delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now())
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now())
      )
    order by delivery.next_attempt_at, delivery.created_at, delivery.id
    for update of delivery skip locked
    limit p_batch_size
  ), claimed as (
    update site_private.notification_deliveries delivery
    set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
        lease_token = gen_random_uuid(), claimed_at = now(),
        lease_expires_at = now() + v_policy.lease_timeout
    from candidates
    where delivery.id = candidates.id
    returning delivery.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', claimed.id,
    'leaseToken', claimed.lease_token,
    'existingProvider', claimed.provider,
    'existingProviderMessageId', claimed.provider_message_id,
    'requestId', request.id,
    'channel', claimed.channel,
    'attempt', claimed.attempts,
    'protocol', request.protocol,
    'recipientEmail', request.email,
    'recipientPhone', request.phone,
    'contactName', request.contact_name,
    'company', request.company,
    'submittedAt', request.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', item.product_name_snapshot,
        'sku', item.sku_snapshot,
        'quantity', item.quantity,
        'colorName', item.color_name_snapshot
      ) order by item.position)
      from site_private.quote_items item
      where item.quote_request_id = request.id
    ), '[]'::jsonb)
  ) order by claimed.created_at, claimed.id), '[]'::jsonb)
  into v_jobs
  from claimed
  join site_private.quote_requests request on request.id = claimed.request_id;

  return v_jobs;
end;
$$;

revoke all on function public.claim_site_notification_deliveries(text[], integer) from public, anon, authenticated;
grant execute on function public.claim_site_notification_deliveries(text[], integer) to service_role, site_api;

comment on function public.claim_site_notification_deliveries(text[], integer) is
  'Reivindica notificações com lease e protocolo persistido; terminaliza jobs esgotados com SKIP LOCKED para não bloquear workers simultâneos.';
