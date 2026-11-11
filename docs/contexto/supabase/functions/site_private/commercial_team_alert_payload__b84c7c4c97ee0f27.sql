CREATE OR REPLACE FUNCTION site_private.commercial_team_alert_payload(p_delivery_id uuid)
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
    'attempt', delivery.attempts,
    'protocol', request.protocol,
    'recipientEmail', request.email,
    'recipientPhone', request.phone,
    'contactName', request.contact_name,
    'company', request.company,
    'submittedAt', request.client_submitted_at,
    'desiredDeadline', request.desired_deadline,
    'items', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'name', item.product_name_snapshot,
        'sku', item.sku_snapshot,
        'quantity', item.quantity,
        'colorName', item.color_name_snapshot
      )) order by item.position)
      from site_private.quote_items item
      where item.quote_request_id = request.id
    ), '[]'::jsonb)
  ))
  from site_private.notification_deliveries delivery
  join site_private.quote_requests request on request.id = delivery.request_id
  where delivery.id = p_delivery_id
    and delivery.request_kind = 'quote'
    and delivery.audience = 'commercial_team';
$function$
