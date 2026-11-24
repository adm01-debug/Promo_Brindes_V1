CREATE OR REPLACE FUNCTION site_private.reprocess_notification_deliveries_core(p_delivery_ids uuid[], p_reason text, p_actor_label text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_policy record;
  v_ids uuid[];
  v_reason text := btrim(coalesce(p_reason, ''));
  v_actor text := left(btrim(coalesce(p_actor_label, 'notification worker')), 160);
  v_reopened_ids uuid[] := array[]::uuid[];
  v_skipped jsonb;
begin
  select array_agg(distinct item.id) into v_ids
  from unnest(coalesce(p_delivery_ids, array[]::uuid[])) as item(id);

  if v_ids is null or cardinality(v_ids) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'invalid_notification_reprocessing_input';
  end if;
  if length(v_reason) not between 3 and 200 then
    raise exception using errcode = '22023', message = 'invalid_notification_reprocessing_input';
  end if;

  select * into v_policy from site_private.notification_policy();

  -- Reabrir o que o corte de backlog cancela deixa a fila inconsistente: o painel
  -- confirma "N entregas voltaram para a fila" e o cron as cancela minutos depois.
  -- Aqui a recusa acontece antes, com o motivo devolvido em skipped.
  with candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.id = any(v_ids)
      and delivery.status = 'exhausted'
      and not site_private.notification_request_erased(delivery.request_kind, delivery.request_id)
      -- Supressao NAO entra aqui: docs/RUNBOOK_INCIDENTES.md manda o operador
      -- reprocessar justamente depois de resolver o bounce, e o banco encerra a
      -- supressao antes ("UPDATE ... delivery_state = 'pending', complained_at = NULL").
      -- Recusar por supressao tiraria do painel o unico caminho de recuperacao.
      and site_private.notification_delivery_is_eligible(
        delivery.request_kind, delivery.request_id, delivery.created_at, v_policy.max_age)
    for update skip locked
  ), reopened as (
    update site_private.notification_deliveries delivery
    set status = 'pending', attempts = 0, next_attempt_at = now(),
        last_error_code = null, last_error_at = null,
        lease_token = null, lease_expires_at = null, claimed_at = null,
        updated_at = now()
    from candidates
    where delivery.id = candidates.id
    returning delivery.id
  )
  select coalesce(array_agg(reopened.id), array[]::uuid[]) into v_reopened_ids
  from reopened;

  if cardinality(v_reopened_ids) > 0 then
    insert into site_private.admin_audit_log (table_name, operation, row_id, performed_by, application_name)
    select 'notification_deliveries', 'UPDATE', item.id::text, v_actor,
           'reprocess_site_notification_deliveries: ' || v_reason
    from unnest(v_reopened_ids) as item(id);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'deliveryId', delivery.id,
    'status', delivery.status,
    'reason', case
      when delivery.status <> 'exhausted' then 'not_exhausted'
      when site_private.notification_request_erased(delivery.request_kind, delivery.request_id) then 'erased'
      when delivery.created_at < now() - v_policy.max_age then 'out_of_window'
      when not site_private.notification_delivery_is_eligible(
        delivery.request_kind, delivery.request_id, delivery.created_at, v_policy.max_age) then 'ineligible'
      else 'locked'
    end
  )), '[]'::jsonb)
  into v_skipped
  from site_private.notification_deliveries delivery
  where delivery.id = any(v_ids) and not (delivery.id = any(v_reopened_ids));

  return jsonb_build_object(
    'reopened', cardinality(v_reopened_ids),
    'reopenedIds', to_jsonb(v_reopened_ids),
    'skipped', v_skipped
  );
end;
$function$
