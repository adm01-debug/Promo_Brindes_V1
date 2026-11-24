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
    'expiredExhaustedCount', coalesce(stats.expired_exhausted_count, 0),
    'suppressedCount', coalesce(stats.suppressed_count, 0),
    'uncertainCount', coalesce(stats.uncertain_count, 0),
    'outOfWindowCount', coalesce(stats.out_of_window_count, 0)
  ) order by c.channel), '[]'::jsonb)
  from unnest(array['email', 'whatsapp']) as c(channel)
  cross join lateral (select policy.max_age from site_private.notification_policy() policy) as policy
  left join lateral (
    select
      -- "Elegivel" tem de usar o mesmo criterio do claim: status pronto para
      -- tentativa, dentro da janela e com pedido existente/nao spam/nao anonimizado.
      -- Antes so olhava status e next_attempt_at, entao uma entrega vencida e uma
      -- de pedido em spam entravam em eligibleCount e ainda definiam a idade que
      -- dispara o alerta de fila parada — o alarme apontava para job que o proximo
      -- claim cancelaria.
      min(delivery.created_at) filter (
        where delivery.status in ('pending', 'failed')
          and delivery.next_attempt_at <= now()
          and site_private.notification_delivery_is_eligible(
            delivery.request_kind, delivery.request_id, delivery.created_at, policy.max_age)
      ) as oldest_eligible_created_at,
      count(*) filter (
        where delivery.status in ('pending', 'failed')
          and delivery.next_attempt_at <= now()
          and site_private.notification_delivery_is_eligible(
            delivery.request_kind, delivery.request_id, delivery.created_at, policy.max_age)
      ) as eligible_count,
      -- Bloqueio ativo é o que o predicado de supressão diz AGORA, não o motivo gravado no
      -- passado: depois do desbloqueio do RUNBOOK a entrega continua com
      -- last_error_code = 'recipient_suppressed' até ser reprocessada, e ler o código antigo
      -- a manteria classificada como bloqueada (escondendo do operador que ela voltou a ser
      -- acionável). Com o predicado vivo, a entrega liberada volta para exhaustedCount.
      count(*) filter (where delivery.status = 'exhausted'
        and coalesce(site_private.notification_request_suppressed(delivery.request_kind, delivery.request_id), false)) as suppressed_count,
      -- Só o que o operador consegue reabrir dispara alerta: a entrega esgotada que o
      -- painel desabilita (fora da janela de 30 dias, pedido em spam ou apagado) nao e
      -- acionavel, entao o alerta apontava para uma fila que ninguem podia limpar. Ela
      -- some do alerta e passa a expiredExhaustedCount, que o log e o webhook ainda veem.
      count(*) filter (where delivery.status = 'exhausted'
        and site_private.notification_delivery_is_reopenable(delivery.id)) as exhausted_count,
      count(*) filter (where delivery.status = 'exhausted'
        and not site_private.notification_delivery_is_reopenable(delivery.id)
        and not coalesce(site_private.notification_request_suppressed(delivery.request_kind, delivery.request_id), false)) as expired_exhausted_count,
      count(*) filter (
        where delivery.last_error_code = 'whatsapp_dispatch_started'
          and delivery.provider_message_id is null
      ) as uncertain_count,
      count(*) filter (
        where delivery.status in ('pending', 'failed')
          and not site_private.notification_delivery_is_eligible(
            delivery.request_kind, delivery.request_id, delivery.created_at, policy.max_age)
      ) as out_of_window_count
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = c.channel
  ) stats on true;
$function$
