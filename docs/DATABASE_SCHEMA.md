# Diagrama entidade-relacionamento — site_private (Etapa 48)

Gerado por `npm run db:site:schema-doc` a partir de `pg_constraint` no banco local, na versão do schema da migration mais recente (2026-09-17). Complementa `docs/DATABASE_DICTIONARY.md` (colunas e comentários) com as relações entre tabelas.

```mermaid
erDiagram
  admin_audit_log
  admin_ddl_log
  consent_receipts
  contact_requests
  customer_profiles
  notification_deliveries
  notification_provider_events
  proposal_documents
  quote_adjustment_requests
  quote_items
  quote_request_events
  quote_requests
  rate_limit_buckets
  shared_selection_rate_limits
  shared_selections
  status_transitions
  consent_receipts }o--|| contact_requests : references
  consent_receipts }o--|| quote_requests : references
  customer_profiles }o--|| users : references
  notification_deliveries }o--|| notification_provider_events : references
  notification_provider_events }o--|| notification_deliveries : references
  proposal_documents }o--|| quote_requests : references
  quote_adjustment_requests }o--|| users : references
  quote_adjustment_requests }o--|| quote_requests : references
  quote_items }o--|| quote_requests : references
  quote_request_events }o--|| quote_requests : references
  quote_requests }o--|| users : references
```

## Verificação de drift

CI (`database.yml`) roda `supabase db diff --local` implicitamente via `db reset` a partir das migrations — se o schema real não corresponder ao que as migrations descrevem, `db reset` falha antes mesmo de chegar neste script. Este arquivo, por sua vez, falha o build se estiver desatualizado em relação ao que `db reset` produziu (mesmo padrão de `src/types/site-database.types.ts` e `docs/DATABASE_DICTIONARY.md`).
