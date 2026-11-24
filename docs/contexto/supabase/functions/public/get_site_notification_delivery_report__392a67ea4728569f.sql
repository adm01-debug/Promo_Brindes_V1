CREATE OR REPLACE FUNCTION public.get_site_notification_delivery_report(p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_limit integer := coalesce(p_limit, 50);
begin
  if v_limit not between 1 and 200 then
    raise exception using errcode = '22023', message = 'invalid_notification_report_input';
  end if;

  perform site_private.assert_site_operator();

  return jsonb_build_object(
    'exhausted', coalesce((
      select jsonb_agg(jsonb_build_object(
        'deliveryId', item.id,
        'requestKind', item.request_kind,
        'requestId', item.request_id,
        'protocol', item.protocol,
        'channel', item.channel,
        'attempts', item.attempts,
        'lastErrorCode', item.last_error_code,
        'lastErrorAt', item.last_error_at,
        'updatedAt', item.updated_at,
        'emailHashPrefix', left(item.email_hash, 12),
        'audience', item.audience,
        'suppressed', item.suppressed,
        'erased', item.erased,
        'reopenable', item.reopenable
      ) order by item.reopenable desc, item.suppressed, item.erased, item.updated_at, item.id)
      from (
        select delivery.id, delivery.request_kind, delivery.request_id, delivery.channel,
               delivery.attempts, delivery.last_error_code, delivery.last_error_at,
               delivery.updated_at, request.protocol,
               site_private.email_hash(request.email) as email_hash,
               (delivery.audience = 'customer'
                and site_private.notification_request_suppressed(delivery.request_kind, delivery.request_id)) as suppressed,
               site_private.notification_request_erased(delivery.request_kind, delivery.request_id) as erased,
               site_private.notification_delivery_is_reopenable(delivery.id) as reopenable,
               -- Coluna 14 (fora do order by): o painel precisa dizer se a linha é a
               -- confirmação do cliente ou o alerta comercial, senão as duas aparecem
               -- iguais — mesmo protocolo, mesmo canal — com estados diferentes.
               delivery.audience
        from site_private.notification_deliveries delivery
        join site_private.quote_requests request
          on delivery.request_kind = 'quote' and request.id = delivery.request_id
        where delivery.status = 'exhausted'
        union all
        select delivery.id, delivery.request_kind, delivery.request_id, delivery.channel,
               delivery.attempts, delivery.last_error_code, delivery.last_error_at,
               delivery.updated_at, null::text as protocol,
               site_private.email_hash(request.email) as email_hash,
               (delivery.audience = 'customer'
                and site_private.notification_request_suppressed(delivery.request_kind, delivery.request_id)) as suppressed,
               site_private.notification_request_erased(delivery.request_kind, delivery.request_id) as erased,
               site_private.notification_delivery_is_reopenable(delivery.id) as reopenable,
               delivery.audience
        from site_private.notification_deliveries delivery
        join site_private.contact_requests request
          on delivery.request_kind = 'contact' and request.id = delivery.request_id
        where delivery.status = 'exhausted'
        order by 13 desc, 11, 12, 8, 1
        limit v_limit
      ) item
    ), '[]'::jsonb),
    'orphanEventCount', (
      select count(*) from site_private.notification_provider_events event
      where event.delivery_id is null
    ),
    'reconcilableOrphanCount', (
      select count(*) from site_private.notification_provider_events event
      where event.delivery_id is null and event.provider_message_id is not null
    ),
    'orphanEventOldestAt', (
      select min(event.received_at) from site_private.notification_provider_events event
      where event.delivery_id is null
    )
  );
end;
$function$
