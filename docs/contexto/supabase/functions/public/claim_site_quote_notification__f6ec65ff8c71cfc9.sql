CREATE OR REPLACE FUNCTION public.claim_site_quote_notification(p_request_id uuid, p_channel text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_policy record;
  v_delivery site_private.notification_deliveries%rowtype;
begin
  if p_channel not in ('email', 'whatsapp') then
    raise exception using errcode = '22023', message = 'invalid_notification_channel';
  end if;
  select * into v_policy from site_private.notification_policy();

  -- Sem o predicado de elegibilidade no SELECT: o candidato bloqueado precisa ser
  -- visto para poder ser encerrado. Filtrar aqui deixava a entrega pending para sempre,
  -- porque o chamador (api/notifications.ts) tenta uma unica vez por job.
  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.request_kind = 'quote'
    and delivery.request_id = p_request_id
    and delivery.channel = p_channel
    and delivery.audience = 'customer'
    and delivery.status in ('pending', 'failed')
    and delivery.next_attempt_at <= now()
    and delivery.attempts < v_policy.max_attempts
  order by delivery.created_at, delivery.id
  limit 1;

  if not found then return null; end if;
  if site_private.suppress_notification_delivery(v_delivery.id) then return null; end if;

  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.id = v_delivery.id
  for update skip locked;
  if not found then return null; end if;
  if v_delivery.status not in ('pending', 'failed')
    or v_delivery.next_attempt_at > now()
    or v_delivery.attempts >= v_policy.max_attempts then
    return null;
  end if;

  if not site_private.notification_delivery_is_eligible(
    v_delivery.request_kind, v_delivery.request_id, v_delivery.created_at, v_policy.max_age) then
    -- Spam, anonimizacao ou idade acima de max_age: encerra com trilha em vez de
    -- deixar o job voltando em todo tick. O nucleo preserva o envio incerto.
    perform site_private.cancel_ineligible_notification_backlog(
      v_delivery.request_kind, v_delivery.request_id, 'notification worker',
      'claim pontual de entrega inelegivel', v_policy.max_age);
    return null;
  end if;

  update site_private.notification_deliveries delivery
  set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
      lease_token = gen_random_uuid(), claimed_at = now(), lease_expires_at = now() + v_policy.lease_timeout
  where delivery.id = v_delivery.id
  returning * into v_delivery;

  return site_private.quote_notification_payload(v_delivery.id);
end;
$function$
