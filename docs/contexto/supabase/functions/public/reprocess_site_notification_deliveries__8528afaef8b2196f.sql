CREATE OR REPLACE FUNCTION public.reprocess_site_notification_deliveries(p_delivery_ids uuid[], p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
begin
  return site_private.reprocess_notification_deliveries_core(
    p_delivery_ids,
    p_reason,
    v_operator.display_name
  );
end;
$function$
