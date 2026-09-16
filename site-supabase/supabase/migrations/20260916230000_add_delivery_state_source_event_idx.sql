-- Etapa 16 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md):
-- auditoria em 16/09/2026 (a mesma consulta a pg_constraint/pg_index que a própria
-- etapa 16 documentou) encontrou uma FK sem índice de suporte que não existia quando a
-- etapa foi originalmente fechada: notification_deliveries.delivery_state_source_event_id
-- -> notification_provider_events(id), adicionada pela Etapa 20 (20260916140000,
-- depois de 20260916120000, onde a etapa 16 foi fechada) e nunca revalidada contra a
-- invariante "toda FK tem índice". Statement único por arquivo (mesmo motivo do
-- incidente de CI documentado em 20260916120000_*): CONCURRENTLY não pode coexistir
-- com outro statement no mesmo pipeline durante a seed do `supabase start`.

create index concurrently if not exists notification_deliveries_delivery_state_source_event_idx
  on site_private.notification_deliveries (delivery_state_source_event_id)
  where delivery_state_source_event_id is not null;
