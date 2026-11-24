CREATE OR REPLACE FUNCTION public.claim_site_commercial_team_alert(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  return site_private.commercial_team_alert_payload(v_delivery.id);
end;
$function$
