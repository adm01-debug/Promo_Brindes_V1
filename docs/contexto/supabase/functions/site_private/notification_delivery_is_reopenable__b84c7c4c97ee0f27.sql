CREATE OR REPLACE FUNCTION site_private.notification_delivery_is_reopenable(p_delivery_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    site_private.notification_delivery_is_eligible(
      delivery.request_kind, delivery.request_id, delivery.created_at, policy.max_age)
    and not site_private.notification_request_erased(delivery.request_kind, delivery.request_id)
    and (delivery.audience <> 'customer'
      or not site_private.notification_request_suppressed(delivery.request_kind, delivery.request_id)),
    false)
  from site_private.notification_deliveries delivery
  cross join lateral (select policy.max_age from site_private.notification_policy() policy) as policy
  where delivery.id = p_delivery_id;
$function$
