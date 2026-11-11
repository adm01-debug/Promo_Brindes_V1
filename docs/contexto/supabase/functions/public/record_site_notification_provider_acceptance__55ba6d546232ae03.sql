CREATE OR REPLACE FUNCTION public.record_site_notification_provider_acceptance(p_delivery_id uuid, p_lease_token uuid, p_provider text, p_provider_message_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_updated integer;
begin
  if length(coalesce(p_provider, '')) not between 1 and 80
    or length(coalesce(p_provider_message_id, '')) not between 1 and 240 then
    raise exception using errcode = '22023', message = 'invalid_notification_acceptance_input';
  end if;

  update site_private.notification_deliveries delivery
  set provider = p_provider, provider_message_id = p_provider_message_id, updated_at = now()
  where delivery.id = p_delivery_id and delivery.status = 'processing' and delivery.lease_token = p_lease_token;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$function$
