-- Etapa 15 do plano de correções — índice único que substitui
-- notification_deliveries_provider_lookup_idx (removido em 20260916120300).
-- Statement único por arquivo (ver 20260916120000).

create unique index concurrently if not exists notification_deliveries_provider_message_key
  on site_private.notification_deliveries (provider, provider_message_id)
  where provider_message_id is not null;
