-- Etapa 29 (revisão de fechamento de 12/09/2026): monitoramento de idade da
-- fila de notificações. Migration aditiva, exclusiva de xlzmclcjdncjfdrjxclt.
-- Não referencia nem altera o catálogo canônico doufsxqlfjyuvxuezpln.
--
-- Antes, o único sinal de observabilidade era `site_notifications_completed`
-- (api/notifications.ts), que só registra contagens do lote processado na
-- invocação atual. Sem isso, um acúmulo — cron parado, provedor fora do ar,
-- lote sempre reivindicando os mesmos jobs sem nunca esvaziar — passa
-- despercebido até alguém notar manualmente. Esta função devolve, por canal,
-- a idade do job elegível mais antigo e a contagem de jobs esgotados
-- (`exhausted`, Etapa 18), para que o handler emita um alerta ativo (Etapa
-- 29) em vez de depender de descoberta manual.
--
-- Escopo idêntico ao de claim_site_notification_deliveries: apenas
-- request_kind = 'quote' e audience = 'customer', os únicos valores hoje
-- produzidos por site_private.enqueue_quote_confirmations() (as demais
-- combinações do CHECK constraint são reservadas, não usadas).

create function public.site_notification_queue_health()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'channel', c.channel,
    'oldestEligibleAgeSeconds', case when stats.eligible_count > 0
      then extract(epoch from (now() - stats.oldest_eligible_created_at))::bigint
      else null end,
    'eligibleCount', coalesce(stats.eligible_count, 0),
    'exhaustedCount', coalesce(stats.exhausted_count, 0)
  ) order by c.channel), '[]'::jsonb)
  from unnest(array['email', 'whatsapp']) as c(channel)
  left join lateral (
    select
      min(delivery.created_at) filter (
        where delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now()
      ) as oldest_eligible_created_at,
      count(*) filter (
        where delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now()
      ) as eligible_count,
      count(*) filter (where delivery.status = 'exhausted') as exhausted_count
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = c.channel
  ) stats on true;
$$;

revoke all on function public.site_notification_queue_health() from public, anon, authenticated;
grant execute on function public.site_notification_queue_health() to service_role;

comment on function public.site_notification_queue_health() is
  'Idade do job elegível mais antigo e contagem de exhausted por canal (Etapa 29); devolve só contagens e canais, sem conteúdo pessoal.';
