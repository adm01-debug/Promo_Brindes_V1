CREATE OR REPLACE FUNCTION site_private.notification_request_suppressed(p_request_kind text, p_request_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from site_private.notification_deliveries delivery
    where delivery.audience = 'customer'
      and (delivery.delivery_state = 'bounced' or delivery.complained_at is not null)
      and site_private.email_hash(
        case p_request_kind
          when 'quote' then (
            select request.email from site_private.quote_requests request where request.id = p_request_id
          )
          when 'contact' then (
            select request.email from site_private.contact_requests request where request.id = p_request_id
          )
        end
      ) = case delivery.request_kind
        when 'quote' then site_private.email_hash((
          select request.email from site_private.quote_requests request where request.id = delivery.request_id
        ))
        else site_private.email_hash((
          select request.email from site_private.contact_requests request where request.id = delivery.request_id
        ))
      end
  );
$function$
