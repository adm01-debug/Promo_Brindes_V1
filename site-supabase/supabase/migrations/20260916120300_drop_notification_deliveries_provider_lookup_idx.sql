-- Etapa 15 do plano de correções — remove o índice não-único, substituído pelo
-- índice único em 20260916120400. Statement único por arquivo (ver 20260916120000).

drop index concurrently if exists site_private.notification_deliveries_provider_lookup_idx;
