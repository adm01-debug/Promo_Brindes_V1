CREATE OR REPLACE FUNCTION public.finalize_site_notification_delivery(p_delivery_id uuid, p_lease_token uuid, p_status text, p_provider text DEFAULT NULL::text, p_provider_message_id text DEFAULT NULL::text, p_error_code text DEFAULT NULL::text, p_retry_after_seconds integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_updated integer;
begin
  if p_status not in ('sent', 'failed', 'cancelled')
    or (p_retry_after_seconds is not null and p_retry_after_seconds not between 0 and 86400)
    or length(coalesce(p_provider, '')) > 80
    or length(coalesce(p_provider_message_id, '')) > 240
    or length(coalesce(p_error_code, '')) > 120 then
    raise exception using errcode = '22023', message = 'invalid_notification_finalize_input';
  end if;

  update site_private.notification_deliveries delivery
  set
    status = p_status,
    -- provider_message_id é preservado mesmo em falha/cancelamento: se o
    -- provedor já aceitou a mensagem antes de a finalização falhar, o ID
    -- permite reconciliar em vez de reenviar na próxima recuperação (R01/R02).
    provider = coalesce(nullif(p_provider, ''), delivery.provider),
    provider_message_id = coalesce(nullif(p_provider_message_id, ''), delivery.provider_message_id),
    last_error_code = case when p_status = 'failed' then coalesce(nullif(p_error_code, ''), 'provider_error') else null end,
    last_error_at = case when p_status = 'failed' then now() else null end,
    sent_at = case when p_status = 'sent' then now() else null end,
    -- Backoff exponencial com jitter (Etapa 11) é o piso; um Retry-After do
    -- provedor maior que o backoff calculado prevalece, nunca o contrário.
    next_attempt_at = case when p_status = 'failed' then greatest(
        site_private.next_retry_at(delivery.attempts, now()),
        now() + make_interval(secs => coalesce(p_retry_after_seconds, 0))
      ) else delivery.next_attempt_at end,
    lease_token = null,
    lease_expires_at = null,
    updated_at = now()
  where delivery.id = p_delivery_id and delivery.status = 'processing' and delivery.lease_token = p_lease_token;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$function$
