-- Etapa 16 do plano de correções — FKs sem índice de suporte, confirmadas por
-- consulta a pg_constraint/pg_index no banco local (a auditoria original supôs ~7
-- a partir de leitura estática das migrations; só 3 realmente carecem de índice, os
-- demais já cobertos nas migrations de 09-11/09). Statement único por arquivo (ver
-- 20260916120000).

create index concurrently if not exists consent_receipts_quote_request_id_idx
  on site_private.consent_receipts (quote_request_id)
  where quote_request_id is not null;
