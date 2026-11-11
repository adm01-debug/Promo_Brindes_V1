CREATE OR REPLACE FUNCTION public.record_site_notification_dispatch_started(p_delivery_id uuid, p_lease_token uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_updated integer;
begin
  update site_private.notification_deliveries delivery
  set last_error_code = 'whatsapp_dispatch_started', last_error_at = now(), updated_at = now()
  where delivery.id = p_delivery_id
    and delivery.status = 'processing'
    and delivery.channel = 'whatsapp'
    and delivery.lease_token = p_lease_token
    and delivery.provider_message_id is null
    and delivery.last_error_code is distinct from 'whatsapp_dispatch_started';
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$function$
