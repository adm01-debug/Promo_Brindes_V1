CREATE OR REPLACE FUNCTION site_private.commercial_team_contact_alert_payload(p_delivery_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', delivery.id,
    'leaseToken', delivery.lease_token,
    'existingProvider', delivery.provider,
    'existingProviderMessageId', delivery.provider_message_id,
    'requestKind', 'contact',
    'requestId', request.id,
    'attempt', delivery.attempts,
    'recipientEmail', request.email,
    'recipientPhone', request.phone,
    'contactName', request.contact_name,
    'submittedAt', request.client_submitted_at,
    'preferredChannel', request.preferred_channel,
    'pageUrl', request.page_url
  ))
  from site_private.notification_deliveries delivery
  join site_private.contact_requests request on request.id = delivery.request_id
  where delivery.id = p_delivery_id
    and delivery.request_kind = 'contact'
    and delivery.audience = 'commercial_team';
$function$
