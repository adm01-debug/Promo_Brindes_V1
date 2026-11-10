# 10 · ACESSO E SEGURANÇA — quem pode o quê

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `860a0a06be` · branch `main` · 2026-11-10 18:29 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Perfis / roles identificados

`anon`

- Tabelas de perfil/permissão: nenhuma
- Colunas de perfil: nenhuma
- Claims do JWT usados em políticas/funções: nenhum
- Funções usadas dentro de políticas RLS (a regra real está no corpo delas — veja `06`): `can_delete_my_unverified_briefing_asset_path`, `matches_my_briefing_asset_upload`, `owns_my_briefing_asset_path`

## Configuração de auth (supabase/config.toml)

| Chave | Valor |
|---|---|
| site_url | `"https://promo-brindes-v1.vercel.app"` |

## Matriz tabela × operação → quem pode (derivada das políticas RLS)

| Tabela | RLS | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `site_private.admin_audit_log` | forced | — | — | — | — |
| `site_private.admin_ddl_log` | forced | — | — | — | — |
| `site_private.consent_receipts` | forced | — | — | — | — |
| `site_private.contact_requests` | forced | — | — | — | — |
| `site_private.customer_briefing_assets` | forced | — | — | — | — |
| `site_private.customer_occasion_favorites` | forced | — | — | — | — |
| `site_private.customer_profiles` | forced | — | — | — | — |
| `site_private.customer_selections` | forced | — | — | — | — |
| `site_private.erased_customer_identities` | forced | — | — | — | — |
| `site_private.notification_deliveries` | forced | — | — | — | — |
| `site_private.notification_provider_events` | forced | — | — | — | — |
| `site_private.proposal_documents` | forced | — | — | — | — |
| `site_private.quote_adjustment_requests` | forced | — | — | — | — |
| `site_private.quote_items` | forced | — | — | — | — |
| `site_private.quote_request_events` | forced | — | — | — | — |
| `site_private.quote_requests` | forced | — | — | — | — |
| `site_private.rate_limit_buckets` | forced | — | — | — | — |
| `site_private.shared_selection_rate_limits` | forced | — | — | — | — |
| `site_private.shared_selections` | forced | — | — | — | — |
| `site_private.status_transitions` | forced | — | — | — | — |
| `site_private.storage_deletion_queue` | forced | — | — | — | — |

> `—` com RLS ligado = ninguém além de service_role. `sem RLS` = qualquer chave anon lê/escreve tudo.

## Onde o RLS é IGNORADO (service_role) — 67 arquivo(s)

- `api/_lib/siteDatabase.ts`
- `docs/sql/canonical-principal/URGENTE_revogar_mcp_kv_get.sql`
- `scripts/ai-context/cenarios.mjs`
- `scripts/ai-context/gerar.unit.mjs`
- `scripts/generate-site-api-jwt.mjs`
- `scripts/graphify.mjs`
- `scripts/inventario/gerar-banco.mjs`
- `scripts/regras_negocio/generate.py`
- `scripts/supabase_snapshot/snapshot.py`
- `site-supabase/supabase/migrations/20260908230000_create_site_lead_storage.sql`
- `site-supabase/supabase/migrations/20260909103000_lock_down_rls_event_trigger.sql`
- `site-supabase/supabase/migrations/20260909180000_create_customer_quote_portal.sql`
- `site-supabase/supabase/migrations/20260910100000_expose_safe_quote_context_to_customer.sql`
- `site-supabase/supabase/migrations/20260910103000_store_contact_message.sql`
- `site-supabase/supabase/migrations/20260910110000_enrich_customer_history.sql`
- `site-supabase/supabase/migrations/20260910120000_preserve_variant_and_contact_preference.sql`
- `site-supabase/supabase/migrations/20260910130000_customer_adjustments_and_preferences.sql`
- `site-supabase/supabase/migrations/20260910140000_preserve_item_decision_group.sql`
- `site-supabase/supabase/migrations/20260911130000_add_site_data_retention.sql`
- `site-supabase/supabase/migrations/20260911150000_fix_retention_storage_orchestration.sql`
- `site-supabase/supabase/migrations/20260911170000_add_revocable_shared_selections.sql`
- `site-supabase/supabase/migrations/20260912170000_add_quote_notification_outbox.sql`
- `site-supabase/supabase/migrations/20260914120000_fix_notification_outbox_contract.sql`
- `site-supabase/supabase/migrations/20260915090000_add_notification_queue_health.sql`
- `site-supabase/supabase/migrations/20260915150000_add_notification_delivery_events.sql`
- `site-supabase/supabase/migrations/20260916100000_add_quote_event_sequence_and_status_state_machine.sql`
- `site-supabase/supabase/migrations/20260916110000_add_notification_queue_policy_lease_and_backoff.sql`
- `site-supabase/supabase/migrations/20260916130000_add_persisted_quote_protocol.sql`
- `site-supabase/supabase/migrations/20260916140000_add_provider_event_precedence.sql`
- `site-supabase/supabase/migrations/20260916150000_add_email_normalization.sql`
- `site-supabase/supabase/migrations/20260916160000_add_site_api_role.sql`
- `site-supabase/supabase/migrations/20260916170000_force_row_level_security.sql`
- `site-supabase/supabase/migrations/20260916200000_add_customer_data_erasure.sql`
- `site-supabase/supabase/migrations/20260916210000_add_admin_write_audit.sql`
- `site-supabase/supabase/migrations/20260916220000_add_notification_delivery_status_machine.sql`
- `site-supabase/supabase/migrations/20260922120000_skip_locked_exhausted_notification_housekeeping.sql`
- `site-supabase/supabase/migrations/20260922130000_add_customer_selections.sql`
- `site-supabase/supabase/migrations/20260922140000_reconcile_schema_drift.sql`
- `site-supabase/supabase/migrations/20260922150000_add_private_briefing_assets.sql`
- `site-supabase/supabase/migrations/20260922160000_preserve_kit_composition.sql`
- `site-supabase/supabase/migrations/20260922170000_preserve_kits_in_customer_selections.sql`
- `site-supabase/supabase/migrations/20260922180000_preserve_kits_in_shared_selections.sql`
- `site-supabase/supabase/migrations/20260922190000_harden_kit_reference_sets.sql`
- `site-supabase/supabase/migrations/20260922200000_preserve_shared_selection_priorities.sql`
- `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql`
- `site-supabase/supabase/migrations/20260922220000_verify_briefing_asset_content.sql`
- `site-supabase/supabase/migrations/20260922230000_lock_verified_briefing_assets.sql`
- `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql`
- `site-supabase/supabase/migrations/20260923130000_add_customer_occasion_favorites.sql`
- `site-supabase/supabase/migrations/20260923200000_enrich_quote_confirmation_contract.sql`
- `site-supabase/supabase/migrations/20260924130000_reject_invalid_verified_briefing_assets.sql`
- `site-supabase/supabase/migrations/20260927103000_harden_occasion_favorites_rpc_acl.sql`
- `site-supabase/supabase/migrations/20261001130320_preflight_lead_rate_limit.sql`
- `site-supabase/supabase/tests/database/admin_write_audit.test.sql`
- `site-supabase/supabase/tests/database/briefing_assets.test.sql`
- `site-supabase/supabase/tests/database/customer_data_erasure.test.sql`
- `site-supabase/supabase/tests/database/customer_occasion_favorites.test.sql`
- `site-supabase/supabase/tests/database/email_normalization.test.sql`
- `site-supabase/supabase/tests/database/lead_preflight_rate_limit.test.sql`
- `site-supabase/supabase/tests/database/lead_storage.test.sql`
- `site-supabase/supabase/tests/database/notification_outbox.test.sql`
- `site-supabase/supabase/tests/database/notification_provider_events.test.sql`
- `site-supabase/supabase/tests/database/notification_queue_policy.test.sql`
- `site-supabase/supabase/tests/database/site_api_privileges.test.sql`
- `src/lib/catalog.test.ts`
- `src/lib/siteSupabase.test.ts`
- `tests/catalog-public-contract.node.mjs`

## Funções SQL `SECURITY DEFINER` (rodam com privilégio do dono, ignoram RLS)

- `attach_my_briefing_assets_to_quote`
- `can_delete_my_unverified_briefing_asset_path`
- `claim_my_quote_requests`
- `confirm_site_briefing_asset_verification`
- `create_my_briefing_asset`
- `delete_my_briefing_asset`
- `delete_my_selection`
- `enforce_valid_kit_reference_set`
- `erase_customer_assets_on_profile_change`
- `erase_customer_data`
- `erase_customer_occasion_favorites_on_profile_change`
- `erase_customer_selections_on_profile_change`
- `finalize_briefing_asset_retention`
- `finalize_site_storage_retention`
- `get_briefing_asset_retention_candidates`
- `get_my_briefing_asset_verification`
- `get_my_proposal_document`
- `get_my_quote_request`
- `get_my_quote_requests`
- `list_my_briefing_assets`
- `list_my_occasion_favorites`
- `list_my_selections`
- `log_admin_ddl`
- `log_admin_write`
- `matches_my_briefing_asset_upload`
- `owns_my_briefing_asset_path`
- `purge_archived_customer_selections`
- `purge_site_admin_audit_logs`
- `queue_briefing_asset_deletion`
- `reject_site_briefing_asset_verification`
- `request_my_quote_adjustment`
- `require_verified_briefing_asset_attachment`
- `rls_auto_enable`
- `save_my_selection`
- `set_my_occasion_favorite`
- `set_my_selection_archived`

## Edge functions públicas (sem JWT — qualquer um chama)

_nenhuma declarada em config.toml_

## Rotas protegidas no front

| Rota | Guard | Roles | Arquivo |
|---|---|---|---|
| /app | ProtectedRoute |  | `scripts/ai-context/gerar.unit.mjs` |

Guards usados: Protected, ProtectedRoute

Middleware matcher (Next.js): nenhum

## Grants / Revokes (agrupados por role e privilégio)

| Ação | Para/De | Privilégios | Objetos |
|---|---|---|---|
| grant | authenticated | execute | `list_my_selections`, `save_my_selection`, `set_my_selection_archived`, `delete_my_selection`, `create_my_briefing_asset`, `list_my_briefing_assets`, `owns_my_briefing_asset_path`, `delete_my_briefing_asset`, `attach_my_briefing_assets_to_quote`, `save_my_selection`, `save_my_selection`, `matches_my_briefing_asset_upload`, `get_my_briefing_asset_verification`, `can_delete_my_unverified_briefing_asset_path`, `list_my_occasion_favorites` … +3 |
| grant | authenticated, service_role | execute | `claim_my_quote_requests`, `get_my_quote_requests`, `get_my_quote_request`, `get_my_proposal_document`, `get_my_quote_request`, `get_my_quote_requests`, `get_my_quote_request`, `request_my_quote_adjustment`, `get_my_quote_request`, `get_my_quote_request`, `get_my_quote_request`, `get_my_quote_requests`, `get_my_quote_request` |
| grant | service_role | execute | `create_site_quote_request`, `create_site_contact_request`, `site_private.consume_rate_limit`, `site_private.set_updated_at`, `site_private.record_quote_status_event`, `create_site_contact_request`, `create_site_quote_request`, `create_site_contact_request`, `create_site_quote_request`, `site_private.purge_expired_site_data`, `run_site_data_retention`, `create_site_shared_selection`, `get_site_shared_selection`, `revoke_site_shared_selection`, `claim_site_notification_deliveries` … +18 |
| grant | service_role | select | `site_private.status_transitions`, `site_private.admin_audit_log`, `site_private.admin_ddl_log` |
| grant | service_role | select, insert, update | `site_private.erased_customer_identities` |
| grant | service_role | select, insert, update, delete | `site_private`, `site_private.quote_adjustment_requests`, `site_private.notification_provider_events`, `site_private.customer_selections`, `site_private.customer_occasion_favorites` |
| grant | service_role | usage | `site_private.quote_protocol_seq` |
| grant | service_role, site_api | execute | `claim_site_notification_deliveries` |
| grant | site_api | delete | `site_private.quote_requests`, `site_private.notification_deliveries`, `site_private.rate_limit_buckets`, `site_private.shared_selections`, `site_private.shared_selection_rate_limits` |
| grant | site_api | execute | `apply_site_notification_provider_event`, `claim_site_notification_deliveries`, `claim_site_quote_notification`, `create_site_contact_request`, `create_site_quote_request`, `create_site_shared_selection`, `finalize_site_data_retention`, `finalize_site_notification_delivery`, `get_site_data_retention_candidates`, `get_site_shared_selection`, `record_site_notification_provider_acceptance`, `revoke_site_shared_selection`, `site_notification_queue_health`, `site_private.consume_rate_limit`, `site_private.notification_policy` … +10 |
| grant | site_api | select | `site_private.status_transitions` |
| grant | site_api | select, delete | `site_private.proposal_documents` |
| grant | site_api | select, insert | `site_private.quote_requests`, `site_private.quote_items`, `site_private.consent_receipts`, `site_private.notification_provider_events`, `site_private.quote_request_events` |
| grant | site_api | select, insert, delete | `site_private.contact_requests` |
| grant | site_api | select, insert, update | `site_private.notification_deliveries`, `site_private.rate_limit_buckets`, `site_private.shared_selections`, `site_private.shared_selection_rate_limits` |
| grant | site_api | usage | `site_private.quote_protocol_seq` |
| grant | site_api, service_role | execute | `purge_archived_customer_selections`, `get_briefing_asset_retention_candidates`, `finalize_briefing_asset_retention`, `create_site_quote_request`, `create_site_shared_selection`, `create_site_shared_selection`, `site_private.normalize_selection_references`, `site_private.has_unsafe_display_controls`, `site_private.consume_shared_selection_action_limit`, `get_site_shared_selection`, `revoke_site_shared_selection`, `confirm_site_briefing_asset_verification`, `purge_site_admin_audit_logs`, `record_site_notification_dispatch_started`, `finalize_site_storage_retention` … +5 |
| revoke | public, anon | all | `claim_my_quote_requests`, `get_my_quote_requests`, `get_my_quote_request`, `get_my_proposal_document`, `get_my_quote_request`, `get_my_quote_requests`, `get_my_quote_request`, `request_my_quote_adjustment`, `get_my_quote_request`, `get_my_quote_request`, `get_my_quote_request`, `get_my_quote_requests`, `list_my_selections`, `save_my_selection`, `set_my_selection_archived` … +4 |
| revoke | public, anon, authenticated | all | `site_private`, `create_site_quote_request`, `create_site_contact_request`, `create_site_contact_request`, `create_site_quote_request`, `create_site_contact_request`, `site_private.quote_adjustment_requests`, `create_site_quote_request`, `site_private.purge_expired_site_data`, `run_site_data_retention`, `create_site_shared_selection`, `get_site_shared_selection`, `revoke_site_shared_selection`, `site_private.enqueue_quote_confirmations`, `claim_site_notification_deliveries` … +41 |
| revoke | public, anon, authenticated, service_role | all | `rls_auto_enable` |
| revoke | public, anon, authenticated, service_role, site_api | all | `site_private.queue_briefing_asset_deletion`, `site_private.erase_customer_assets_on_profile_change`, `site_private.enforce_valid_kit_reference_set`, `site_private.has_unsafe_display_controls`, `site_private.normalize_selection_references`, `site_private.require_verified_briefing_asset_attachment`, `site_private.audit_actor`, `site_private.erase_customer_occasion_favorites_on_profile_change`, `list_my_occasion_favorites`, `set_my_occasion_favorite` |
| revoke | public, anon, authenticated, site_api | all | `site_private.admin_audit_log`, `site_private.admin_ddl_log`, `site_private.erased_customer_identities`, `erase_customer_data` |
| revoke | public, anon, service_role | all | `save_my_selection`, `save_my_selection` |
| revoke | public, anon, service_role, site_api | all | `create_my_briefing_asset`, `list_my_briefing_assets`, `owns_my_briefing_asset_path`, `delete_my_briefing_asset`, `attach_my_briefing_assets_to_quote`, `matches_my_briefing_asset_upload`, `get_my_briefing_asset_verification`, `can_delete_my_unverified_briefing_asset_path` |
| revoke | service_role | execute | `list_my_selections`, `save_my_selection`, `set_my_selection_archived`, `delete_my_selection` |

## Riscos de acesso detectados

| Tabela | Problema | Arquivos |
|---|---|---|
| `quote_requests` | RLS ligado sem nenhuma política → só service_role acessa | `tests/inventario-estado.node.mjs` |

## Multi-tenancy

_nenhuma coluna de tenant identificada — sistema single-tenant ou isolamento por usuário (auth.uid())_

## Soft delete (registros 'apagados' continuam na tabela — filtre!)

| Tabela | Coluna |
|---|---|
| `site_private.customer_selections` | `archived_at` |

## Auditoria (colunas de rastreio)

| Tabela | Colunas |
|---|---|
| `site_private.quote_requests` | `created_at`, `updated_at` |
| `site_private.quote_items` | `created_at` |
| `site_private.contact_requests` | `created_at`, `updated_at` |
| `site_private.notification_deliveries` | `created_at`, `updated_at` |
| `site_private.rate_limit_buckets` | `updated_at` |
| `site_private.customer_profiles` | `created_at`, `updated_at` |
| `site_private.quote_request_events` | `created_at` |
| `site_private.proposal_documents` | `created_at` |
| `site_private.quote_adjustment_requests` | `created_at`, `updated_at` |
| `site_private.shared_selections` | `created_at`, `updated_at` |
| `site_private.shared_selection_rate_limits` | `updated_at` |
| `site_private.customer_selections` | `created_at`, `updated_at` |
| `site_private.customer_briefing_assets` | `created_at` |
| `site_private.customer_occasion_favorites` | `created_at`, `updated_at` |

## Dados pessoais / sensíveis (LGPD — cuidado em logs, exports, prompts de IA)

| Tabela | Coluna |
|---|---|
| `site_private.quote_requests` | `email` |
| `site_private.quote_requests` | `phone` |
| `site_private.contact_requests` | `email` |
| `site_private.contact_requests` | `phone` |

## Colunas de dinheiro (tipo importa: numeric ✅ / float ❌)

_nenhum item encontrado_
