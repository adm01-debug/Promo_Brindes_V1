-- Etapa 15 do plano de correções — comentário do índice único (ver 20260916120400).

comment on index site_private.notification_deliveries_provider_message_key is
  'Etapa 15: torna explícita a invariante que apply_site_notification_provider_event já presumia (limit 1). Substitui o índice não-único notification_deliveries_provider_lookup_idx com o mesmo shape de predicate.';
