CREATE OR REPLACE FUNCTION site_private.cancel_ineligible_notification_backlog(p_request_kind text, p_request_id uuid, p_actor_label text, p_reason text, p_max_age interval)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor text := left(btrim(coalesce(p_actor_label, 'notification worker')), 160);
  -- 200 acompanha o teto que a porta publica aceita: cortar em 160 aqui perdia os
  -- ultimos 40 caracteres de um motivo valido, e era justamente onde o operador
  -- costuma dizer de qual campanha ou cliente estava falando.
  v_reason text := left(btrim(coalesce(p_reason, 'backlog inelegivel')), 200);
  v_cancelled_ids uuid[] := array[]::uuid[];
  v_scanned integer;
begin
  with ineligible as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where (p_request_kind is null or delivery.request_kind = p_request_kind)
      and (p_request_id is null or delivery.request_id = p_request_id)
      and (delivery.status in ('pending', 'failed')
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
      and (delivery.last_error_code is distinct from 'whatsapp_dispatch_started' or delivery.provider_message_id is not null)
      and not site_private.notification_delivery_is_eligible(
        delivery.request_kind, delivery.request_id, delivery.created_at, p_max_age)
    order by delivery.created_at, delivery.id
    for update of delivery skip locked
  ), cancelled as (
    update site_private.notification_deliveries delivery
    set status = 'cancelled', lease_token = null, lease_expires_at = null, updated_at = now()
    from ineligible
    where delivery.id = ineligible.id
    returning delivery.id
  )
  select coalesce(array_agg(cancelled.id), array[]::uuid[]) into v_cancelled_ids
  from cancelled;

  -- O trigger log_admin_write não registra a chamada quando o ator é site_api, e não
  -- conhece o nome do operador; a trilha explícita garante "quem cancelou e por quê".
  if cardinality(v_cancelled_ids) > 0 then
    insert into site_private.admin_audit_log (table_name, operation, row_id, performed_by, application_name)
    select 'notification_deliveries', 'UPDATE', item.id::text, v_actor,
           'cancel_ineligible_notification_backlog: ' || v_reason
    from unnest(v_cancelled_ids) as item(id);
  end if;

  select count(*)::integer into v_scanned
  from site_private.notification_deliveries delivery
  where (p_request_kind is null or delivery.request_kind = p_request_kind)
    and (p_request_id is null or delivery.request_id = p_request_id);

  return jsonb_build_object(
    'cancelled', cardinality(v_cancelled_ids),
    'cancelledIds', to_jsonb(v_cancelled_ids),
    'scanned', v_scanned
  );
end;
$function$
