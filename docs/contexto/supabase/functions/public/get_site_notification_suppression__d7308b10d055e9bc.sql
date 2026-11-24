CREATE OR REPLACE FUNCTION public.get_site_notification_suppression(p_email_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_hash text := lower(btrim(coalesce(p_email_hash, '')));
  v_result jsonb;
begin
  if v_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_notification_suppression_input';
  end if;

  with matches as (
    select delivery.channel, delivery.delivery_state, delivery.delivery_state_at,
           delivery.complained_at, delivery.bounce_reason
    from site_private.notification_deliveries delivery
    join site_private.quote_requests request
      on delivery.request_kind = 'quote' and request.id = delivery.request_id
    where delivery.audience = 'customer'
      and site_private.email_hash(request.email) = v_hash
    union all
    select delivery.channel, delivery.delivery_state, delivery.delivery_state_at,
           delivery.complained_at, delivery.bounce_reason
    from site_private.notification_deliveries delivery
    join site_private.contact_requests request
      on delivery.request_kind = 'contact' and request.id = delivery.request_id
    where delivery.audience = 'customer'
      and site_private.email_hash(request.email) = v_hash
  ), relevant as (
    select * from matches
    where delivery_state = 'bounced' or complained_at is not null
  )
  select jsonb_build_object(
    'emailHash', v_hash,
    'suppressed', exists (select 1 from relevant),
    'bouncedAt', (select max(delivery_state_at) from relevant where delivery_state = 'bounced'),
    'complainedAt', (select max(complained_at) from relevant),
    'lastBounceReason', (
      select reason from (
        select bounce_reason as reason from relevant
        where delivery_state = 'bounced' and bounce_reason is not null
        order by delivery_state_at desc nulls last
        limit 1
      ) last
    ),
    'channels', coalesce(
      (select jsonb_agg(distinct channel) from relevant), '[]'::jsonb
    ),
    'matchedDeliveries', (select count(*) from relevant)
  )
  into v_result;

  return v_result;
end;
$function$
