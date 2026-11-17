CREATE OR REPLACE FUNCTION site_private.enqueue_contact_commercial_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  insert into site_private.notification_deliveries (
    request_kind, request_id, channel, audience, status, next_attempt_at
  ) values (
    'contact', new.id, 'email', 'commercial_team', 'pending', now()
  ) on conflict (request_kind, request_id, channel, audience) do nothing;

  return new;
end;
$function$
