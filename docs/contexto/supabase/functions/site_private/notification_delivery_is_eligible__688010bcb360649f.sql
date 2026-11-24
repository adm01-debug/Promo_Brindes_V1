CREATE OR REPLACE FUNCTION site_private.notification_delivery_is_eligible(p_request_kind text, p_request_id uuid, p_created_at timestamp with time zone, p_max_age interval)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select p_created_at >= now() - p_max_age
    and case p_request_kind
      when 'quote' then exists (
        select 1
        from site_private.quote_requests request
        where request.id = p_request_id
          and request.status <> 'spam'
          and request.email not like '%@erased.invalid'
      )
      when 'contact' then exists (
        select 1
        from site_private.contact_requests request
        where request.id = p_request_id
          and request.status <> 'spam'
          and request.email not like '%@erased.invalid'
      )
      else false
    end;
$function$
