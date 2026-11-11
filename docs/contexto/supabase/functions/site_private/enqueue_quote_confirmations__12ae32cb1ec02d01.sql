CREATE OR REPLACE FUNCTION site_private.enqueue_quote_confirmations()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  insert into site_private.notification_deliveries (
    request_kind, request_id, channel, audience, status, next_attempt_at
  ) values (
    'quote', new.id, 'email', 'customer', 'pending', now()
  ) on conflict (request_kind, request_id, channel, audience) do nothing;

  if new.request_metadata #> '{notificationPreferences,whatsappCopy}' = 'true'::jsonb then
    insert into site_private.notification_deliveries (
      request_kind, request_id, channel, audience, status, next_attempt_at
    ) values (
      'quote', new.id, 'whatsapp', 'customer', 'pending', now()
    ) on conflict (request_kind, request_id, channel, audience) do nothing;
  end if;

  insert into site_private.notification_deliveries (
    request_kind, request_id, channel, audience, status, next_attempt_at
  ) values (
    'quote', new.id, 'email', 'commercial_team', 'pending', now()
  ) on conflict (request_kind, request_id, channel, audience) do nothing;

  return new;
end;
$function$
