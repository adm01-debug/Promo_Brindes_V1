CREATE OR REPLACE FUNCTION public.site_notification_queue_health()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'channel', c.channel,
    'oldestEligibleAgeSeconds', case when stats.eligible_count > 0
      then extract(epoch from (now() - stats.oldest_eligible_created_at))::bigint else null end,
    'eligibleCount', coalesce(stats.eligible_count, 0),
    'exhaustedCount', coalesce(stats.exhausted_count, 0),
    'uncertainCount', coalesce(stats.uncertain_count, 0)
  ) order by c.channel), '[]'::jsonb)
  from unnest(array['email', 'whatsapp']) as c(channel)
  left join lateral (
    select
      min(delivery.created_at) filter (
        where delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now()
      ) as oldest_eligible_created_at,
      count(*) filter (
        where delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now()
      ) as eligible_count,
      count(*) filter (where delivery.status = 'exhausted') as exhausted_count,
      count(*) filter (
        where delivery.last_error_code = 'whatsapp_dispatch_started'
          and delivery.provider_message_id is null
      ) as uncertain_count
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = c.channel
  ) stats on true;
$function$
