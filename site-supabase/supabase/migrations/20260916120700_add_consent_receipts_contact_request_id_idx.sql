-- Etapa 16 do plano de correções — ver 20260916120600.

create index concurrently if not exists consent_receipts_contact_request_id_idx
  on site_private.consent_receipts (contact_request_id)
  where contact_request_id is not null;
