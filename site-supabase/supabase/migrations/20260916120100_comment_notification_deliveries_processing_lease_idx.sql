-- Etapa 14 do plano de correções — comentário do índice, em migration própria por
-- coexistir com um `CREATE INDEX CONCURRENTLY` na aplicação inicial (ver
-- 20260916120000 para o motivo do statement único por arquivo).

comment on index site_private.notification_deliveries_processing_lease_idx is
  'Etapa 14: recuperação de jobs presos em processing com lease expirada. Cardinalidade típica é pequena (só jobs realmente travados), então não precisa de channel/request_kind na predicate.';
