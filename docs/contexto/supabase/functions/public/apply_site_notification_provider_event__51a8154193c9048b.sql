CREATE OR REPLACE FUNCTION public.apply_site_notification_provider_event(p_provider text, p_provider_message_id text, p_event_type text, p_provider_event_id text, p_occurred_at timestamp with time zone, p_bounce_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_event_id uuid;
  v_delivery_id uuid;
  v_updated integer;
begin
  if p_provider not in ('resend', 'meta-whatsapp-cloud')
    or p_event_type not in ('delivered', 'bounced', 'complained')
    or length(coalesce(p_provider_message_id, '')) not between 1 and 240
    or length(coalesce(p_provider_event_id, '')) not between 1 and 240
    or p_occurred_at is null
    or length(coalesce(p_bounce_reason, '')) > 200 then
    raise exception using errcode = '22023', message = 'invalid_notification_provider_event_input';
  end if;

  select delivery.id into v_delivery_id
  from site_private.notification_deliveries delivery
  where delivery.provider = p_provider and delivery.provider_message_id = p_provider_message_id
  limit 1;

  insert into site_private.notification_provider_events (provider, provider_event_id, event_type, delivery_id)
  values (p_provider, p_provider_event_id, p_event_type, v_delivery_id)
  on conflict (provider, provider_event_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('applied', false, 'deliveryId', v_delivery_id, 'reason', 'duplicate');
  end if;

  if v_delivery_id is null then
    return jsonb_build_object('applied', false, 'deliveryId', null, 'reason', 'delivery_not_found');
  end if;

  if p_event_type in ('delivered', 'bounced') then
    update site_private.notification_deliveries delivery
    set delivery_state = p_event_type, delivery_state_at = p_occurred_at,
        bounce_reason = case when p_event_type = 'bounced' then p_bounce_reason else delivery.bounce_reason end,
        delivery_state_source_event_id = v_event_id,
        updated_at = now()
    where delivery.id = v_delivery_id
      and (
        delivery.delivery_state is null
        -- Etapa 20: bounced sobrescreve um delivered anterior (soft bounce tardio);
        -- delivered nunca sobrescreve bounced (o inverso não existe nesta condição).
        or (p_event_type = 'bounced' and delivery.delivery_state = 'delivered')
      );
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      return jsonb_build_object('applied', false, 'deliveryId', v_delivery_id, 'reason', 'delivery_state_already_set');
    end if;
  else
    update site_private.notification_deliveries delivery
    set complained_at = coalesce(delivery.complained_at, p_occurred_at), updated_at = now()
    where delivery.id = v_delivery_id;
  end if;

  return jsonb_build_object('applied', true, 'deliveryId', v_delivery_id, 'reason', null);
end;
$function$
