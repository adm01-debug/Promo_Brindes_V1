# 10 · ACESSO E SEGURANÇA — quem pode o quê

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `ad825772b1` · branch `main` · 2026-11-12 15:45 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Perfis / roles identificados

`anon`

- Tabelas de perfil/permissão: nenhuma
- Colunas de perfil: nenhuma
- Claims do JWT usados em políticas/funções: nenhum
- Roles do banco citadas em políticas/grants: `anon`, `authenticated`, `service_role`, `site_api`
- Funções usadas dentro de políticas RLS (a regra real está no corpo delas — veja `docs/contexto/supabase/` (snapshot do banco; se a pasta não existir, só há as migrations do repo) ou `schema.functions` em `context.json`): `can_delete_my_unverified_briefing_asset_path`, `matches_my_briefing_asset_upload`, `owns_my_briefing_asset_path`

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
| `storage.objects` | tabela de fora do repo | authenticated: bucket_id = 'customer-briefing-assets' and public.owns_my_briefing_asset_path(name) | authenticated: bucket_id = 'customer-briefing-assets' and owner_id = auth.uid()::text and public.matches_my_briefing_asset_upload(name, meta | sem política no repo | authenticated: bucket_id = 'customer-briefing-assets' and owner_id = auth.uid()::text and public.can_delete_my_unverified_briefing_asset_pat |

> `—` com RLS ligado = nenhuma política libera a operação: só role com BYPASSRLS (service_role, site_api) ou função SECURITY DEFINER acessa. `sem RLS` = qualquer chave anon lê/escreve tudo. `sem política no repo` = tabela criada fora das migrations (ex.: `storage.objects`); o repo só declara as políticas listadas.

## Roles com BYPASSRLS declaradas nas migrations (ignoram RLS em qualquer tabela)

- `site_api` — `site-supabase/supabase/migrations/20260916160000_add_site_api_role.sql`
- `service_role` — padrão do Supabase (não é criada pelas migrations)

## Onde o RLS é IGNORADO (service_role) — 1 arquivo(s) do sistema que citam a chave/role

- `api/_lib/siteDatabase.ts`

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

## Funções serverless HTTP (Vercel `api/`) — 14

> Toda função em `api/` é alcançável pela internet. A exigência de segredo, JWT ou assinatura fica no código de cada arquivo e NÃO é inferida aqui — leia o arquivo antes de assumir que a rota é protegida.

| Rota | Arquivo | Métodos citados no código | Cron (vercel.json) |
|---|---|---|---|
| /api/briefing-assets | `api/briefing-assets.ts` | POST |  |
| /api/commercial-alerts | `api/commercial-alerts.ts` | GET | `*/5 * * * *` |
| /api/contact-requests | `api/contact-requests.ts` |  |  |
| /api/customer-proposals | `api/customer-proposals.ts` | POST |  |
| /api/not-found | `api/not-found.ts` | HEAD |  |
| /api/notification-events-resend | `api/notification-events-resend.ts` | POST |  |
| /api/notification-events-whatsapp | `api/notification-events-whatsapp.ts` | GET, POST |  |
| /api/notifications | `api/notifications.ts` | GET | `*/15 * * * *` |
| /api/product-page | `api/product-page.ts` | HEAD |  |
| /api/quote-requests | `api/quote-requests.ts` |  |  |
| /api/retention | `api/retention.ts` | GET | `0 3 * * *` |
| /api/shared-selections | `api/shared-selections.ts` | POST |  |
| /api/site-page | `api/site-page.ts` | HEAD |  |
| /api/sitemap | `api/sitemap.ts` | HEAD |  |

## Rotas protegidas no front

_nenhum item encontrado_

Guards usados: nenhum

Middleware matcher (Next.js): nenhum

## Grants / Revokes (agrupados por role e privilégio)

> Histórico das migrations, não o estado final: um `revoke` posterior anula o `grant` do mesmo objeto, e a mesma função aparece uma vez por migration que a recriou. Privilégio vigente: `docs/contexto/supabase/` (snapshot do banco; se a pasta não existir, só há as migrations do repo).

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
| grant | site_api, service_role | execute | `purge_archived_customer_selections`, `get_briefing_asset_retention_candidates`, `finalize_briefing_asset_retention`, `create_site_quote_request`, `create_site_shared_selection`, `create_site_shared_selection`, `site_private.normalize_selection_references`, `site_private.has_unsafe_display_controls`, `site_private.consume_shared_selection_action_limit`, `get_site_shared_selection`, `revoke_site_shared_selection`, `confirm_site_briefing_asset_verification`, `purge_site_admin_audit_logs`, `record_site_notification_dispatch_started`, `finalize_site_storage_retention` … +8 |
| revoke | public, anon | all | `claim_my_quote_requests`, `get_my_quote_requests`, `get_my_quote_request`, `get_my_proposal_document`, `get_my_quote_request`, `get_my_quote_requests`, `get_my_quote_request`, `request_my_quote_adjustment`, `get_my_quote_request`, `get_my_quote_request`, `get_my_quote_request`, `get_my_quote_requests`, `list_my_selections`, `save_my_selection`, `set_my_selection_archived` … +4 |
| revoke | public, anon, authenticated | all | `site_private`, `create_site_quote_request`, `create_site_contact_request`, `create_site_contact_request`, `create_site_quote_request`, `create_site_contact_request`, `site_private.quote_adjustment_requests`, `create_site_quote_request`, `site_private.purge_expired_site_data`, `run_site_data_retention`, `create_site_shared_selection`, `get_site_shared_selection`, `revoke_site_shared_selection`, `site_private.enqueue_quote_confirmations`, `claim_site_notification_deliveries` … +44 |
| revoke | public, anon, authenticated, service_role | all | `rls_auto_enable` |
| revoke | public, anon, authenticated, service_role, site_api | all | `site_private.queue_briefing_asset_deletion`, `site_private.erase_customer_assets_on_profile_change`, `site_private.enforce_valid_kit_reference_set`, `site_private.has_unsafe_display_controls`, `site_private.normalize_selection_references`, `site_private.require_verified_briefing_asset_attachment`, `site_private.audit_actor`, `site_private.erase_customer_occasion_favorites_on_profile_change`, `list_my_occasion_favorites`, `set_my_occasion_favorite` |
| revoke | public, anon, authenticated, site_api | all | `site_private.admin_audit_log`, `site_private.admin_ddl_log`, `site_private.erased_customer_identities`, `erase_customer_data` |
| revoke | public, anon, service_role | all | `save_my_selection`, `save_my_selection` |
| revoke | public, anon, service_role, site_api | all | `create_my_briefing_asset`, `list_my_briefing_assets`, `owns_my_briefing_asset_path`, `delete_my_briefing_asset`, `attach_my_briefing_assets_to_quote`, `matches_my_briefing_asset_upload`, `get_my_briefing_asset_verification`, `can_delete_my_unverified_briefing_asset_path` |
| revoke | service_role | execute | `list_my_selections`, `save_my_selection`, `set_my_selection_archived`, `delete_my_selection` |

## Riscos de acesso detectados

_nenhum item encontrado_

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
