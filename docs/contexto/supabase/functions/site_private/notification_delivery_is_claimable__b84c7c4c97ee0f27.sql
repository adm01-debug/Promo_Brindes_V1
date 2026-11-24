CREATE OR REPLACE FUNCTION site_private.notification_delivery_is_claimable(p_delivery_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case
    when delivery.audience = 'customer'
      then not site_private.notification_request_erased(delivery.request_kind, delivery.request_id)
       and not site_private.notification_request_suppressed(delivery.request_kind, delivery.request_id)
    else not site_private.notification_request_erased(delivery.request_kind, delivery.request_id)
  end
  from site_private.notification_deliveries delivery
  where delivery.id = p_delivery_id;
$function$
