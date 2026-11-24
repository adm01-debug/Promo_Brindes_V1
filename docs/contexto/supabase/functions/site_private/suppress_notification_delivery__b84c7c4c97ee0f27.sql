CREATE OR REPLACE FUNCTION site_private.suppress_notification_delivery(p_delivery_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_delivery site_private.notification_deliveries%rowtype;
begin
  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.id = p_delivery_id
  for update;

  if not found then return false; end if;
  if v_delivery.status in ('sent', 'cancelled', 'exhausted') then return false; end if;
  if v_delivery.status = 'processing' and v_delivery.lease_expires_at > now() then return false; end if;
  -- Envio pode ter saido e o provedor nao confirmou. Cancelar aqui apagaria o
  -- marcador de reconciliacao do runbook; a duvida tem de continuar visivel.
  if v_delivery.last_error_code = 'whatsapp_dispatch_started'
    and v_delivery.provider_message_id is null then
    return false;
  end if;

  if site_private.notification_request_erased(v_delivery.request_kind, v_delivery.request_id) then
    update site_private.notification_deliveries delivery
    set status = 'cancelled', last_error_code = 'recipient_erased',
        lease_token = null, lease_expires_at = null, claimed_at = null, updated_at = now()
    where delivery.id = v_delivery.id;
    return true;
  end if;

  if v_delivery.audience = 'customer'
    and site_private.notification_request_suppressed(v_delivery.request_kind, v_delivery.request_id) then
    -- 'exhausted' (reabrivel pelo painel via reprocess_site_notification_deliveries),
    -- nao 'cancelled': 'cancelled' e terminal por omissao na matriz de transicoes e
    -- deixaria a confirmacao ao titular morta depois de um bounce temporario.
    update site_private.notification_deliveries delivery
    set status = 'exhausted', last_error_code = 'recipient_suppressed',
        lease_token = null, lease_expires_at = null, claimed_at = null, updated_at = now()
    where delivery.id = v_delivery.id;
    return true;
  end if;

  return false;
end;
$function$
