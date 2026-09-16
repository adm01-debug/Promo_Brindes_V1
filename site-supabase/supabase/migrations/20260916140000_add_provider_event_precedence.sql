-- Etapa 20 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md).
-- Migration aditiva, exclusiva de xlzmclcjdncjfdrjxclt.
--
-- apply_site_notification_provider_event (20260915150000) grava delivery_state só se
-- ainda for null — "primeiro evento vence, sem depender do clock do provedor". Isso é
-- correto para dedupe, mas ignora um caso real: um 'bounced' que chega depois de um
-- 'delivered' já aplicado (soft bounce tardio, comum em provedores de e-mail) nunca
-- reflete no delivery_state — o operador vê "entregue" para uma mensagem que voltou. O
-- evento fica registrado na tabela de dedup (nunca reentregue à toa), mas o estado
-- visível da entrega não muda.
--
-- Nova precedência: bounced sempre pode sobrescrever delivered; delivered nunca
-- sobrescreve bounced; delivered -> delivered e bounced -> bounced continuam
-- idempotentes (a condição extra some não muda nada quando os dois lados já são
-- iguais, e o "primeiro evento vence" original permanece intacto para o caso comum de
-- delivery_state ainda null). complained continua independente e sem mudança.

alter table site_private.notification_deliveries
  add column if not exists delivery_state_source_event_id uuid references site_private.notification_provider_events(id);

comment on column site_private.notification_deliveries.delivery_state_source_event_id is
  'Etapa 20: qual evento de webhook determinou o delivery_state atual — rastreabilidade quando um bounced tardio sobrescreve um delivered anterior.';

create or replace function public.apply_site_notification_provider_event(
  p_provider text,
  p_provider_message_id text,
  p_event_type text,
  p_provider_event_id text,
  p_occurred_at timestamptz,
  p_bounce_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
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
$$;

revoke all on function public.apply_site_notification_provider_event(text, text, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.apply_site_notification_provider_event(text, text, text, text, timestamptz, text) to service_role;

comment on function public.apply_site_notification_provider_event(text, text, text, text, timestamptz, text) is
  'Aplica evento de webhook de forma idempotente (Etapa 30 do plano anterior). delivered só grava se delivery_state ainda for null; bounced grava se null OU se o estado atual for delivered — um bounce tardio corrige um delivered otimista (Etapa 20 do plano de correções). complained é independente e idempotente via coalesce.';
