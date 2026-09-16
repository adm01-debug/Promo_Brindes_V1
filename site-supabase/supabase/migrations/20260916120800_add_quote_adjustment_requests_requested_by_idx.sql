-- Etapa 16 do plano de correções — ver 20260916120600.

create index concurrently if not exists quote_adjustment_requests_requested_by_idx
  on site_private.quote_adjustment_requests (requested_by);
