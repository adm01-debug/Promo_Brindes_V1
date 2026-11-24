CREATE OR REPLACE FUNCTION site_private.notification_request_erased(p_request_kind text, p_request_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case p_request_kind
    when 'quote' then exists (
      select 1 from site_private.quote_requests request
      where request.id = p_request_id and request.email like '%@erased.invalid'
    )
    when 'contact' then exists (
      select 1 from site_private.contact_requests request
      where request.id = p_request_id and request.email like '%@erased.invalid'
    )
    else false
  end;
$function$
