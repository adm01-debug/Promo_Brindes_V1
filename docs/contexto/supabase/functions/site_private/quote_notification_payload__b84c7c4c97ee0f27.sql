CREATE OR REPLACE FUNCTION site_private.quote_notification_payload(p_delivery_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
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
$function$
