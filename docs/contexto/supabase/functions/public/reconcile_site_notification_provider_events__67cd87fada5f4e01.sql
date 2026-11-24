CREATE OR REPLACE FUNCTION public.reconcile_site_notification_provider_events(p_batch_size integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_event record;
  v_delivery_id uuid;
  v_linked integer := 0;
  v_applied integer := 0;
  v_unmatched integer := 0;
  v_unmatched_ids uuid[] := array[]::uuid[];
  v_updated integer;
begin
  if p_batch_size is null or p_batch_size not between 1 and 500 then
    raise exception using errcode = '22023', message = 'invalid_notification_reconciliation_input';
  end if;

  -- O lote é escolhido DEPOIS do join: órfão sem entrega correspondente (a mensagem nunca
  -- foi aceita) é contado em "unmatched" e não consome vaga. Antes, `limit` sobre os órfãos
  -- brutos fazia 500 eventos sem correspondência ocuparem o lote inteiro e travarem a
  -- reconciliação dos mais novos até a purga liberar espaço.
  for v_event in
    select event.id, event.provider, event.provider_message_id, event.event_type,
           event.received_at, event.bounce_reason, matched.id as delivery_id
    from site_private.notification_provider_events event
    left join lateral (
      select delivery.id
      from site_private.notification_deliveries delivery
      where delivery.provider = event.provider
        and delivery.provider_message_id = event.provider_message_id
      order by delivery.created_at desc, delivery.id
      limit 1
    ) matched on true
    where event.delivery_id is null and event.provider_message_id is not null
    order by event.received_at, event.id
    limit p_batch_size
    for update of event skip locked
  loop
    v_delivery_id := v_event.delivery_id;

    if v_delivery_id is null then
      v_unmatched := v_unmatched + 1;
      v_unmatched_ids := v_unmatched_ids || v_event.id;
      continue;
    end if;

    update site_private.notification_provider_events
    set delivery_id = v_delivery_id
    where id = v_event.id;
    v_linked := v_linked + 1;

    if v_event.event_type in ('delivered', 'bounced') then
      update site_private.notification_deliveries delivery
      set delivery_state = v_event.event_type,
          delivery_state_at = v_event.received_at,
          bounce_reason = case
            when v_event.event_type = 'bounced' and v_event.bounce_reason is not null then v_event.bounce_reason
            else delivery.bounce_reason
          end,
          delivery_state_source_event_id = v_event.id,
          updated_at = now()
      where delivery.id = v_delivery_id
        and (
          delivery.delivery_state is null
          or (v_event.event_type = 'bounced' and delivery.delivery_state = 'delivered')
        );
      get diagnostics v_updated = row_count;
      v_applied := v_applied + v_updated;
    else
      update site_private.notification_deliveries delivery
      set complained_at = coalesce(delivery.complained_at, v_event.received_at), updated_at = now()
      where delivery.id = v_delivery_id and delivery.complained_at is null;
      get diagnostics v_updated = row_count;
      v_applied := v_applied + v_updated;
    end if;
  end loop;

  return jsonb_build_object(
    'linked', v_linked,
    'appliedToDeliveryState', v_applied,
    'unmatched', v_unmatched,
    'unmatchedEventIds', to_jsonb(v_unmatched_ids)
  );
end;
$function$
