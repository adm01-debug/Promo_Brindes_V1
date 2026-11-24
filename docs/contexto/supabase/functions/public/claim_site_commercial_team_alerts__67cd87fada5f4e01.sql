CREATE OR REPLACE FUNCTION public.claim_site_commercial_team_alerts(p_batch_size integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
    where delivery.request_kind in ('quote', 'contact')
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
    where delivery.request_kind in ('quote', 'contact')
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
    where delivery.request_kind in ('quote', 'contact')
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
    where delivery.request_kind in ('quote', 'contact')
      and delivery.audience = 'commercial_team'
      and delivery.attempts < v_policy.max_attempts
      -- F-11: revalidacao obrigatoria — o cancelamento acima roda com outro snapshot.
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
      else site_private.commercial_team_alert_payload(claimed.id)
    end
    order by claimed.created_at, claimed.id), '[]'::jsonb)
  into v_jobs
  from claimed;
  return v_jobs;
end;
$function$
