# 07 · REGRAS DE NEGÓCIO

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `223e6558a8` · branch `main` · 2026-11-10 20:08 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## A. Regras escritas por humanos (`manual/` — prioridade máxima, nunca sobrescrito)

_Nenhum arquivo em `manual/`. Copie `manual/TEMPLATE-regras-de-negocio.md` para `manual/regras.md` e preencha._

## B. Quem pode ver/alterar o quê (RLS — conforme migrations do repo; schema real em `docs/contexto/supabase/` (snapshot do banco; se a pasta não existir, só há as migrations do repo))

| Tabela | Política | Comando | Roles | Modo | USING | WITH CHECK |
|---|---|---|---|---|---|---|
| `storage.objects` | customer_briefing_assets_select_own | SELECT | authenticated | permissive | `bucket_id = 'customer-briefing-assets' and public.owns_my_briefing_asset_path(name)` |  |
| `storage.objects` | customer_briefing_assets_insert_own | INSERT | authenticated | permissive |  | `bucket_id = 'customer-briefing-assets' and owner_id = auth.uid()::text and public.matches_my_briefing_asset_upload(name, metadata)` |
| `storage.objects` | customer_briefing_assets_delete_own | DELETE | authenticated | permissive | `bucket_id = 'customer-briefing-assets' and owner_id = auth.uid()::text and public.can_delete_my_unverified_briefing_asset_path(name)` |  |

## C. Restrições de dados (obrigatório / único / default / CHECK / FK / calculada)

| Tabela | Coluna | Regra |
|---|---|---|
| `site_private.quote_requests` | `id` | PK; default gen_random_uuid() |
| `site_private.quote_requests` | `client_request_id` | obrigatório; único; CHECK length(client_request_id) between 8 and 100 |
| `site_private.quote_requests` | `request_hash` | obrigatório; CHECK request_hash ~ '^[0-9a-f]{64}$' |
| `site_private.quote_requests` | `source` | obrigatório; CHECK source = 'site-promo-brindes' |
| `site_private.quote_requests` | `status` | default 'new'; CHECK status in ('new', 'triaged', 'in_progress', 'quoted', 'closed', 'spam') |
| `site_private.quote_requests` | `contact_name` | obrigatório; CHECK length(contact_name) between 2 and 100 |
| `site_private.quote_requests` | `company` | obrigatório; CHECK length(company) between 2 and 150 |
| `site_private.quote_requests` | `email` | obrigatório; CHECK length(email) between 5 and 160 |
| `site_private.quote_requests` | `phone` | obrigatório; CHECK length(phone) between 10 and 24 |
| `site_private.quote_requests` | `notes` | CHECK notes is null or length(notes) <= 800 |
| `site_private.quote_requests` | `page_url` | CHECK page_url is null or length(page_url) <= 500 |
| `site_private.quote_requests` | `client_submitted_at` | obrigatório |
| `site_private.quote_requests` | `request_metadata` | default '{}'::jsonb; CHECK jsonb_typeof(request_metadata) = 'object' |
| `site_private.quote_requests` | `retention_until` | default (now() + interval '24 months') |
| `site_private.quote_requests` | `created_at` | default now() |
| `site_private.quote_requests` | `updated_at` | default now() |
| `site_private.quote_requests` | `customer_user_id` | FK → users.id on delete set null |
| `site_private.quote_requests` | `protocol` | obrigatório |
| `site_private.quote_requests` | `(tabela)` | constraint quote_requests_protocol_key unique (protocol) |
| `site_private.quote_requests` | `(tabela)` | constraint quote_requests_protocol_format_check check (protocol ~ '^PB[0-9]{9}$') |
| `site_private.quote_requests` | `(tabela)` | constraint quote_requests_email_normalized_check check (email = site_private.normalize_email(email)) |
| `site_private.quote_items` | `id` | PK; default gen_random_uuid() |
| `site_private.quote_items` | `quote_request_id` | obrigatório; FK → quote_requests.id on delete cascade |
| `site_private.quote_items` | `position` | obrigatório; CHECK position between 1 and 50 |
| `site_private.quote_items` | `source_product_id` | obrigatório; CHECK length(source_product_id) between 8 and 100 |
| `site_private.quote_items` | `item_key` | obrigatório; CHECK length(item_key) between 1 and 220 |
| `site_private.quote_items` | `product_slug` | obrigatório; CHECK length(product_slug) between 1 and 180 |
| `site_private.quote_items` | `product_name_snapshot` | obrigatório; CHECK length(product_name_snapshot) between 1 and 240 |
| `site_private.quote_items` | `sku_snapshot` | obrigatório; CHECK length(sku_snapshot) between 1 and 120 |
| `site_private.quote_items` | `image_url_snapshot` | CHECK image_url_snapshot is null or length(image_url_snapshot) <= 1000 |
| `site_private.quote_items` | `quantity` | obrigatório; CHECK quantity between 1 and 999999 |
| `site_private.quote_items` | `minimum_quantity_snapshot` | obrigatório; CHECK minimum_quantity_snapshot between 1 and 999999 |
| `site_private.quote_items` | `color_name_snapshot` | CHECK color_name_snapshot is null or length(color_name_snapshot) <= 120 |
| `site_private.quote_items` | `color_hex_snapshot` | CHECK color_hex_snapshot is null or length(color_hex_snapshot) <= 32 |
| `site_private.quote_items` | `created_at` | default now() |
| `site_private.quote_items` | `variant_id_snapshot` | CHECK variant_id_snapshot is null or variant_id_snapshot ~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$' |
| `site_private.quote_items` | `decision_group_snapshot` | default 'primary'; CHECK decision_group_snapshot in ('primary', 'alternative') |
| `site_private.quote_items` | `kit_name_snapshot` | CHECK kit_name_snapshot is null or length(kit_name_snapshot) between 1 and 100 |
| `site_private.quote_items` | `kit_quantity_snapshot` | CHECK kit_quantity_snapshot is null or kit_quantity_snapshot between 1 and 999999 |
| `site_private.quote_items` | `units_per_kit_snapshot` | CHECK units_per_kit_snapshot is null or units_per_kit_snapshot between 1 and 100 |
| `site_private.quote_items` | `(tabela)` | unique (quote_request_id, position) |
| `site_private.quote_items` | `(tabela)` | check (quantity >= minimum_quantity_snapshot) |
| `site_private.quote_items` | `(tabela)` | constraint quote_items_kit_composition_check check ( (kit_group_id is null and kit_name_snapshot is null and kit_quantity_snapshot is null and units_per_kit_snapshot is null) or (kit_group_id is not null and kit_name_snapshot is not null and kit_quantity_snapshot is not null and units_per_kit_snapshot is not null and quantity = kit_quantity_snapshot * units_per_kit_snapshot) ) |
| `site_private.contact_requests` | `id` | PK; default gen_random_uuid() |
| `site_private.contact_requests` | `client_request_id` | obrigatório; único; CHECK length(client_request_id) between 8 and 100 |
| `site_private.contact_requests` | `request_hash` | obrigatório; CHECK request_hash ~ '^[0-9a-f]{64}$' |
| `site_private.contact_requests` | `source` | obrigatório; CHECK source = 'site-promo-brindes-contact' |
| `site_private.contact_requests` | `status` | default 'new'; CHECK status in ('new', 'triaged', 'in_progress', 'closed', 'spam') |
| `site_private.contact_requests` | `contact_name` | obrigatório; CHECK length(contact_name) between 2 and 100 |
| `site_private.contact_requests` | `email` | obrigatório; CHECK length(email) between 5 and 160 |
| `site_private.contact_requests` | `page_url` | CHECK page_url is null or length(page_url) <= 500 |
| `site_private.contact_requests` | `client_submitted_at` | obrigatório |
| `site_private.contact_requests` | `request_metadata` | default '{}'::jsonb; CHECK jsonb_typeof(request_metadata) = 'object' |
| `site_private.contact_requests` | `retention_until` | default (now() + interval '24 months') |
| `site_private.contact_requests` | `created_at` | default now() |
| `site_private.contact_requests` | `updated_at` | default now() |
| `site_private.contact_requests` | `message` | CHECK message is null or length(message) <= 800 |
| `site_private.contact_requests` | `preferred_channel` | CHECK preferred_channel is null or preferred_channel in ('email', 'telefone', 'whatsapp') |
| `site_private.contact_requests` | `(tabela)` | constraint contact_requests_email_normalized_check check (email = site_private.normalize_email(email)) |
| `site_private.consent_receipts` | `id` | PK; default gen_random_uuid() |
| `site_private.consent_receipts` | `request_kind` | obrigatório; CHECK request_kind in ('quote', 'contact') |
| `site_private.consent_receipts` | `quote_request_id` | FK → quote_requests.id on delete cascade |
| `site_private.consent_receipts` | `contact_request_id` | FK → contact_requests.id on delete cascade |
| `site_private.consent_receipts` | `purpose` | default 'commercial_contact'; CHECK purpose = 'commercial_contact' |
| `site_private.consent_receipts` | `accepted` | obrigatório; CHECK accepted is true |
| `site_private.consent_receipts` | `notice_version` | obrigatório; CHECK length(notice_version) between 1 and 40 |
| `site_private.consent_receipts` | `client_accepted_at` | obrigatório |
| `site_private.consent_receipts` | `server_recorded_at` | default now() |
| `site_private.consent_receipts` | `(tabela)` | check ( (request_kind = 'quote' and quote_request_id is not null and contact_request_id is null) or (request_kind = 'contact' and contact_request_id is not null and quote_request_id is null) ) |
| `site_private.notification_deliveries` | `id` | PK; default gen_random_uuid() |
| `site_private.notification_deliveries` | `request_kind` | obrigatório; CHECK request_kind in ('quote', 'contact') |
| `site_private.notification_deliveries` | `request_id` | obrigatório |
| `site_private.notification_deliveries` | `channel` | obrigatório; CHECK channel in ('email', 'whatsapp') |
| `site_private.notification_deliveries` | `audience` | obrigatório; CHECK audience in ('customer', 'commercial_team') |
| `site_private.notification_deliveries` | `status` | default 'pending' |
| `site_private.notification_deliveries` | `attempts` | default 0; CHECK attempts between 0 and 20 |
| `site_private.notification_deliveries` | `created_at` | default now() |
| `site_private.notification_deliveries` | `updated_at` | default now() |
| `site_private.notification_deliveries` | `next_attempt_at` | default now() |
| `site_private.notification_deliveries` | `delivery_state` | CHECK delivery_state in ('delivered', 'bounced') |
| `site_private.notification_deliveries` | `bounce_reason` | CHECK bounce_reason is null or length(bounce_reason) <= 200 |
| `site_private.notification_deliveries` | `delivery_state_source_event_id` | FK → notification_provider_events.id on delete set null |
| `site_private.notification_deliveries` | `(tabela)` | unique (request_kind, request_id, channel, audience) |
| `site_private.notification_deliveries` | `(tabela)` | constraint notification_deliveries_status_check check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled', 'exhausted')) |
| `site_private.notification_deliveries` | `(tabela)` | constraint notification_deliveries_lease_matches_status check ( (status = 'processing' and lease_token is not null and lease_expires_at is not null) or (status <> 'processing' and lease_token is null and lease_expires_at is null) ) |
| `site_private.notification_deliveries` | `(tabela)` | constraint notification_deliveries_delivery_state_source_event_id_fkey foreign key (delivery_state_source_event_id) references site_private.notification_provider_events(id) on delete set null |
| `site_private.rate_limit_buckets` | `request_kind` | obrigatório |
| `site_private.rate_limit_buckets` | `identifier_hash` | obrigatório; CHECK identifier_hash ~ '^[0-9a-f]{64}$' |
| `site_private.rate_limit_buckets` | `window_started_at` | obrigatório |
| `site_private.rate_limit_buckets` | `request_count` | obrigatório; CHECK request_count > 0 |
| `site_private.rate_limit_buckets` | `updated_at` | default now() |
| `site_private.rate_limit_buckets` | `(tabela)` | primary key (request_kind, identifier_hash) |
| `site_private.rate_limit_buckets` | `(tabela)` | constraint rate_limit_buckets_request_kind_check check (request_kind in ( 'quote', 'contact', 'quote_preflight', 'contact_preflight', 'adjustment', 'briefing_asset_verification', 'proposal_download' )) |
| `site_private.customer_profiles` | `user_id` | PK; FK → users.id on delete cascade |
| `site_private.customer_profiles` | `verified_email` | obrigatório; CHECK length(verified_email) between 5 and 160 |
| `site_private.customer_profiles` | `display_name` | CHECK display_name is null or length(display_name) between 2 and 100 |
| `site_private.customer_profiles` | `company` | CHECK company is null or length(company) between 2 and 150 |
| `site_private.customer_profiles` | `created_at` | default now() |
| `site_private.customer_profiles` | `updated_at` | default now() |
| `site_private.customer_profiles` | `(tabela)` | constraint customer_profiles_verified_email_normalized_check check (verified_email = site_private.normalize_email(verified_email)) |
| `site_private.quote_request_events` | `id` | PK; default gen_random_uuid() |
| `site_private.quote_request_events` | `quote_request_id` | obrigatório; FK → quote_requests.id on delete cascade |
| `site_private.quote_request_events` | `event_type` | obrigatório |
| `site_private.quote_request_events` | `status` | CHECK status is null or status in ('new', 'triaged', 'in_progress', 'quoted', 'closed') |
| `site_private.quote_request_events` | `title` | obrigatório; CHECK length(title) between 2 and 120 |
| `site_private.quote_request_events` | `description` | CHECK description is null or length(description) <= 500 |
| `site_private.quote_request_events` | `audience` | default 'customer'; CHECK audience in ('customer', 'internal') |
| `site_private.quote_request_events` | `created_at` | default now() |
| `site_private.quote_request_events` | `(tabela)` | constraint quote_request_events_event_type_check check (event_type in ('received', 'status_changed', 'message', 'proposal_published', 'adjustment_requested')) |
| `site_private.quote_request_events` | `(tabela)` | constraint quote_request_events_sequence_key unique (sequence) |
| `site_private.proposal_documents` | `id` | PK; default gen_random_uuid() |
| `site_private.proposal_documents` | `quote_request_id` | obrigatório; FK → quote_requests.id on delete cascade |
| `site_private.proposal_documents` | `version` | obrigatório; CHECK version between 1 and 999 |
| `site_private.proposal_documents` | `title` | obrigatório; CHECK length(title) between 2 and 160 |
| `site_private.proposal_documents` | `storage_bucket` | default 'customer-proposals'; CHECK storage_bucket = 'customer-proposals' |
| `site_private.proposal_documents` | `storage_path` | obrigatório; CHECK length(storage_path) between 2 and 500 and storage_path !~ '(^\|/)\.\.(/\|$)' |
| `site_private.proposal_documents` | `created_at` | default now() |
| `site_private.proposal_documents` | `(tabela)` | unique (quote_request_id, version) |
| `site_private.proposal_documents` | `(tabela)` | unique (storage_bucket, storage_path) |
| `site_private.quote_adjustment_requests` | `id` | PK; default gen_random_uuid() |
| `site_private.quote_adjustment_requests` | `quote_request_id` | obrigatório; FK → quote_requests.id on delete cascade |
| `site_private.quote_adjustment_requests` | `requested_by` | obrigatório; FK → users.id on delete cascade |
| `site_private.quote_adjustment_requests` | `client_request_id` | obrigatório; CHECK client_request_id ~ '^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,99}$' |
| `site_private.quote_adjustment_requests` | `message` | obrigatório; CHECK length(trim(message)) between 2 and 800 |
| `site_private.quote_adjustment_requests` | `status` | default 'new'; CHECK status in ('new', 'triaged', 'resolved', 'closed') |
| `site_private.quote_adjustment_requests` | `created_at` | default now() |
| `site_private.quote_adjustment_requests` | `updated_at` | default now() |
| `site_private.quote_adjustment_requests` | `(tabela)` | unique (quote_request_id, requested_by, client_request_id) |
| `site_private.shared_selections` | `token` | PK; default gen_random_uuid() |
| `site_private.shared_selections` | `management_token_hash` | obrigatório; CHECK management_token_hash ~ '^[0-9a-f]{64}$' |
| `site_private.shared_selections` | `items` | obrigatório; CHECK jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 8 |
| `site_private.shared_selections` | `expires_at` | default (now() + interval '30 days') |
| `site_private.shared_selections` | `created_at` | default now() |
| `site_private.shared_selections` | `updated_at` | default now() |
| `site_private.shared_selections` | `(tabela)` | check (expires_at > created_at) |
| `site_private.shared_selections` | `(tabela)` | check (expires_at <= created_at + interval '31 days') |
| `site_private.shared_selections` | `(tabela)` | constraint shared_selections_items_count_check check ( jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50 ) |
| `site_private.shared_selection_rate_limits` | `identifier_hash` | PK; CHECK identifier_hash ~ '^[0-9a-f]{64}$' |
| `site_private.shared_selection_rate_limits` | `window_started_at` | obrigatório |
| `site_private.shared_selection_rate_limits` | `request_count` | obrigatório; CHECK request_count > 0 |
| `site_private.shared_selection_rate_limits` | `updated_at` | default now() |
| `site_private.notification_provider_events` | `id` | PK; default gen_random_uuid() |
| `site_private.notification_provider_events` | `provider` | obrigatório; CHECK provider in ('resend', 'meta-whatsapp-cloud') |
| `site_private.notification_provider_events` | `provider_event_id` | obrigatório; CHECK length(provider_event_id) between 1 and 240 |
| `site_private.notification_provider_events` | `event_type` | obrigatório; CHECK event_type in ('delivered', 'bounced', 'complained') |
| `site_private.notification_provider_events` | `delivery_id` | FK → notification_deliveries.id on delete cascade |
| `site_private.notification_provider_events` | `received_at` | default now() |
| `site_private.notification_provider_events` | `(tabela)` | unique (provider, provider_event_id) |
| `site_private.notification_provider_events` | `(tabela)` | constraint notification_provider_events_delivery_id_fkey foreign key (delivery_id) references site_private.notification_deliveries(id) on delete cascade |
| `site_private.status_transitions` | `entity` | obrigatório |
| `site_private.status_transitions` | `from_status` | obrigatório |
| `site_private.status_transitions` | `to_status` | obrigatório |
| `site_private.status_transitions` | `(tabela)` | primary key (entity, from_status, to_status) |
| `site_private.status_transitions` | `(tabela)` | constraint status_transitions_entity_check check (entity in ('quote_requests', 'contact_requests', 'notification_deliveries')) |
| `site_private.admin_audit_log` | `id` | PK |
| `site_private.admin_audit_log` | `table_name` | obrigatório |
| `site_private.admin_audit_log` | `operation` | obrigatório; CHECK operation in ('INSERT', 'UPDATE', 'DELETE') |
| `site_private.admin_audit_log` | `performed_by` | obrigatório |
| `site_private.admin_audit_log` | `occurred_at` | default now() |
| `site_private.admin_ddl_log` | `id` | PK |
| `site_private.admin_ddl_log` | `command_tag` | obrigatório |
| `site_private.admin_ddl_log` | `performed_by` | obrigatório |
| `site_private.admin_ddl_log` | `occurred_at` | default now() |
| `site_private.customer_selections` | `id` | PK; default gen_random_uuid() |
| `site_private.customer_selections` | `customer_user_id` | obrigatório; FK → users.id on delete cascade |
| `site_private.customer_selections` | `title` | obrigatório; CHECK length(title) between 1 and 100 |
| `site_private.customer_selections` | `product_references` | obrigatório; CHECK jsonb_typeof(product_references) = 'array' |
| `site_private.customer_selections` | `version` | default 1; CHECK version > 0 |
| `site_private.customer_selections` | `created_at` | default now() |
| `site_private.customer_selections` | `updated_at` | default now() |
| `site_private.customer_briefing_assets` | `id` | PK; default gen_random_uuid() |
| `site_private.customer_briefing_assets` | `customer_user_id` | obrigatório; FK → users.id on delete cascade |
| `site_private.customer_briefing_assets` | `quote_request_id` | FK → quote_requests.id on delete cascade |
| `site_private.customer_briefing_assets` | `kind` | obrigatório; CHECK kind in ('logo', 'reference') |
| `site_private.customer_briefing_assets` | `original_name` | obrigatório; CHECK length(original_name) between 1 and 160 |
| `site_private.customer_briefing_assets` | `storage_bucket` | default 'customer-briefing-assets'; CHECK storage_bucket = 'customer-briefing-assets' |
| `site_private.customer_briefing_assets` | `storage_path` | obrigatório; único; CHECK length(storage_path) between 40 and 160 and storage_path !~ '(^\|/)\.\.(/\|$)' |
| `site_private.customer_briefing_assets` | `mime_type` | obrigatório |
| `site_private.customer_briefing_assets` | `size_bytes` | obrigatório; CHECK size_bytes between 1 and 10485760 |
| `site_private.customer_briefing_assets` | `created_at` | default now() |
| `site_private.customer_briefing_assets` | `expires_at` | default (now() + interval '30 days') |
| `site_private.customer_briefing_assets` | `(tabela)` | constraint customer_briefing_assets_mime_type_check check (mime_type in ('image/png', 'image/jpeg', 'image/webp')) |
| `site_private.storage_deletion_queue` | `bucket` | obrigatório |
| `site_private.storage_deletion_queue` | `object_path` | obrigatório; CHECK length(object_path) between 2 and 500 and object_path !~ '(^\|/)\.\.(/\|$)' |
| `site_private.storage_deletion_queue` | `queued_at` | default now() |
| `site_private.storage_deletion_queue` | `(tabela)` | primary key (bucket, object_path) |
| `site_private.storage_deletion_queue` | `(tabela)` | constraint storage_deletion_queue_bucket_check check (bucket in ('customer-briefing-assets', 'customer-proposals')) |
| `site_private.erased_customer_identities` | `email_sha256` | PK; CHECK email_sha256 ~ '^[0-9a-f]{64}$' |
| `site_private.erased_customer_identities` | `erased_at` | default now() |
| `site_private.erased_customer_identities` | `auth_users_deleted` | default 0; CHECK auth_users_deleted >= 0 |
| `site_private.customer_occasion_favorites` | `customer_user_id` | obrigatório; FK → users.id on delete cascade |
| `site_private.customer_occasion_favorites` | `occasion_id` | obrigatório; CHECK occasion_id ~ '^[a-z0-9]+(?:-[a-z0-9]+){0,15}$' and length(occasion_id) <= 80 |
| `site_private.customer_occasion_favorites` | `created_at` | default now() |
| `site_private.customer_occasion_favorites` | `updated_at` | default now() |
| `site_private.customer_occasion_favorites` | `(tabela)` | primary key (customer_user_id, occasion_id) |

## D. Automações no banco (triggers e funções — regras que rodam sozinhas)

| Trigger | Quando | Tabela | Executa | Condição |
|---|---|---|---|---|
| quote_requests_set_updated_at | BEFORE UPDATE | `site_private.quote_requests` | `set_updated_at` |  |
| contact_requests_set_updated_at | BEFORE UPDATE | `site_private.contact_requests` | `set_updated_at` |  |
| notification_deliveries_set_updated_at | BEFORE UPDATE | `site_private.notification_deliveries` | `set_updated_at` |  |
| customer_profiles_set_updated_at | BEFORE UPDATE | `site_private.customer_profiles` | `set_updated_at` |  |
| quote_requests_record_customer_event | AFTER INSERT OR UPDATE OF STATUS | `site_private.quote_requests` | `record_quote_status_event` |  |
| quote_adjustment_requests_set_updated_at | BEFORE UPDATE | `site_private.quote_adjustment_requests` | `set_updated_at` |  |
| shared_selections_set_updated_at | BEFORE UPDATE | `site_private.shared_selections` | `set_updated_at` |  |
| shared_selection_rate_limits_set_updated_at | BEFORE UPDATE | `site_private.shared_selection_rate_limits` | `set_updated_at` |  |
| quote_requests_enqueue_confirmations | AFTER INSERT | `site_private.quote_requests` | `enqueue_quote_confirmations` |  |
| quote_requests_enforce_status_transition | BEFORE UPDATE OF STATUS | `site_private.quote_requests` | `enforce_status_transition` |  |
| contact_requests_enforce_status_transition | BEFORE UPDATE OF STATUS | `site_private.contact_requests` | `enforce_status_transition` |  |
| quote_requests_assign_protocol | BEFORE INSERT | `site_private.quote_requests` | `assign_quote_protocol` |  |
| notification_deliveries_enforce_status_transition | BEFORE UPDATE OF STATUS | `site_private.notification_deliveries` | `enforce_status_transition` |  |
| notification_deliveries_enforce_lease_and_attempts | BEFORE UPDATE OF STATUS, ATTEMPTS | `site_private.notification_deliveries` | `enforce_notification_delivery_lease_and_attempts` |  |
| customer_profile_selection_erasure | AFTER UPDATE OF VERIFIED_EMAIL | `site_private.customer_profiles` | `erase_customer_selections_on_profile_change` |  |
| customer_briefing_assets_queue_deletion | BEFORE DELETE | `site_private.customer_briefing_assets` | `queue_briefing_asset_deletion` |  |
| customer_profile_asset_erasure | AFTER UPDATE OF VERIFIED_EMAIL | `site_private.customer_profiles` | `erase_customer_assets_on_profile_change` |  |
| customer_selections_validate_kit_insert | BEFORE INSERT | `site_private.customer_selections` | `enforce_valid_kit_reference_set` |  |
| customer_selections_validate_kit_update | BEFORE UPDATE OF PRODUCT_REFERENCES | `site_private.customer_selections` | `enforce_valid_kit_reference_set` |  |
| shared_selections_validate_kit_insert | BEFORE INSERT | `site_private.shared_selections` | `enforce_valid_kit_reference_set` |  |
| shared_selections_validate_kit_update | BEFORE UPDATE OF ITEMS | `site_private.shared_selections` | `enforce_valid_kit_reference_set` |  |
| customer_briefing_assets_require_verification | BEFORE UPDATE OF QUOTE_REQUEST_ID | `site_private.customer_briefing_assets` | `require_verified_briefing_asset_attachment` |  |
| customer_briefing_assets_require_verification_on_insert | BEFORE INSERT | `site_private.customer_briefing_assets` | `require_verified_briefing_asset_attachment` |  |
| customer_profile_occasion_favorite_erasure | AFTER UPDATE OF VERIFIED_EMAIL | `site_private.customer_profiles` | `erase_customer_occasion_favorites_on_profile_change` |  |

Erros lançados por funções SQL (`RAISE EXCEPTION` = regra de negócio no banco):

| Função | Mensagem | Origem |
|---|---|---|
| `create_site_contact_request` | invalid_contact_payload | `site-supabase/supabase/migrations/20260910120000_preserve_variant_and_contact_preference.sql` |
| `create_site_contact_request` | client_request_id_conflict | `site-supabase/supabase/migrations/20260910120000_preserve_variant_and_contact_preference.sql` |
| `get_expired_site_data_candidates` | invalid_retention_batch_size | `site-supabase/supabase/migrations/20260911150000_fix_retention_storage_orchestration.sql` |
| `finalize_expired_site_data` | invalid_retention_finalize_input | `site-supabase/supabase/migrations/20260911190000_harden_retention_metadata.sql` |
| `record_site_notification_provider_acceptance` | invalid_notification_acceptance_input | `site-supabase/supabase/migrations/20260914120000_fix_notification_outbox_contract.sql` |
| `enforce_status_transition` | (dinâmica) format('invalid_status_transition: %s.%s -> %s not allowed for %s', tg_table_name, old.status, new.status, old.id) | `site-supabase/supabase/migrations/20260916100000_add_quote_event_sequence_and_status_state_machine.sql` |
| `next_retry_at` | invalid_retry_attempts | `site-supabase/supabase/migrations/20260916110000_add_notification_queue_policy_lease_and_backoff.sql` |
| `next_retry_at` | invalid_retry_jitter | `site-supabase/supabase/migrations/20260916110000_add_notification_queue_policy_lease_and_backoff.sql` |
| `finalize_site_notification_delivery` | invalid_notification_finalize_input | `site-supabase/supabase/migrations/20260916110000_add_notification_queue_policy_lease_and_backoff.sql` |
| `mod11_check_digit` | invalid_mod11_input | `site-supabase/supabase/migrations/20260916130000_add_persisted_quote_protocol.sql` |
| `get_my_quote_requests` | authentication_required | `site-supabase/supabase/migrations/20260916130000_add_persisted_quote_protocol.sql` |
| `get_my_quote_requests` | invalid_status_filter | `site-supabase/supabase/migrations/20260916130000_add_persisted_quote_protocol.sql` |
| `apply_site_notification_provider_event` | invalid_notification_provider_event_input | `site-supabase/supabase/migrations/20260916140000_add_provider_event_precedence.sql` |
| `enforce_notification_delivery_lease_and_attempts` | (dinâmica) format('invalid_notification_delivery_transition: lease_token obrigatório ao entrar em processing (id=%s)', old.id) | `site-supabase/supabase/migrations/20260916220000_add_notification_delivery_status_machine.sql` |
| `enforce_notification_delivery_lease_and_attempts` | (dinâmica) format('invalid_notification_delivery_transition: lease_token deve ser zerado ao sair de processing para %s (id=%s)', new.status, old.id) | `site-supabase/supabase/migrations/20260916220000_add_notification_delivery_status_machine.sql` |
| `enforce_notification_delivery_lease_and_attempts` | (dinâmica) format('invalid_notification_delivery_transition: attempts deve incrementar em exatamente 1 ao entrar em processing (id=%s, old=%s, new=%s)', old.id, old.attemp … | `site-supabase/supabase/migrations/20260916220000_add_notification_delivery_status_machine.sql` |
| `enforce_notification_delivery_lease_and_attempts` | (dinâmica) format('invalid_notification_delivery_transition: reabertura de exhausted exige attempts = 0 (id=%s, new=%s)', old.id, new.attempts) | `site-supabase/supabase/migrations/20260916220000_add_notification_delivery_status_machine.sql` |
| `enforce_notification_delivery_lease_and_attempts` | (dinâmica) format('invalid_notification_delivery_transition: attempts só muda ao entrar em processing ou ao reabrir de exhausted (id=%s)', old.id) | `site-supabase/supabase/migrations/20260916220000_add_notification_delivery_status_machine.sql` |
| `list_my_selections` | authentication_required | `site-supabase/supabase/migrations/20260922130000_add_customer_selections.sql` |
| `set_my_selection_archived` | authentication_required | `site-supabase/supabase/migrations/20260922130000_add_customer_selections.sql` |
| `set_my_selection_archived` | selection_version_conflict | `site-supabase/supabase/migrations/20260922130000_add_customer_selections.sql` |
| `delete_my_selection` | authentication_required | `site-supabase/supabase/migrations/20260922130000_add_customer_selections.sql` |
| `delete_my_selection` | selection_version_conflict | `site-supabase/supabase/migrations/20260922130000_add_customer_selections.sql` |
| `purge_archived_customer_selections` | invalid_batch_size | `site-supabase/supabase/migrations/20260922130000_add_customer_selections.sql` |
| `delete_my_briefing_asset` | authentication_required | `site-supabase/supabase/migrations/20260922150000_add_private_briefing_assets.sql` |
| `delete_my_briefing_asset` | briefing_asset_not_deletable | `site-supabase/supabase/migrations/20260922150000_add_private_briefing_assets.sql` |
| `finalize_briefing_asset_retention` | invalid_briefing_asset_retention_input | `site-supabase/supabase/migrations/20260922150000_add_private_briefing_assets.sql` |
| `create_site_quote_request` | invalid_quote_payload | `site-supabase/supabase/migrations/20260922160000_preserve_kit_composition.sql` |
| `create_site_quote_request` | client_request_id_conflict | `site-supabase/supabase/migrations/20260922160000_preserve_kit_composition.sql` |
| `create_site_quote_request` | invalid_item_decision_group | `site-supabase/supabase/migrations/20260922160000_preserve_kit_composition.sql` |
| `create_site_quote_request` | invalid_kit_composition | `site-supabase/supabase/migrations/20260922160000_preserve_kit_composition.sql` |
| `get_my_quote_request` | authentication_required | `site-supabase/supabase/migrations/20260922160000_preserve_kit_composition.sql` |
| `normalize_selection_references` | invalid_selection_reference_set | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `normalize_selection_references` | invalid_selection_reference | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `normalize_selection_references` | invalid_kit_reference_set | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `normalize_selection_references` | duplicate_selection_reference | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `enforce_valid_kit_reference_set` | invalid_kit_reference_set | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `create_site_shared_selection` | invalid_shared_selection_payload | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `create_site_shared_selection` | duplicate_shared_selection_item | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `create_site_shared_selection` | invalid_kit_reference_set | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `create_site_shared_selection` | invalid_shared_selection_item | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `create_site_shared_selection` | shared_selection_rate_limit_exceeded | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `consume_shared_selection_action_limit` | invalid_shared_selection_rate_limit | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `consume_shared_selection_action_limit` | shared_selection_rate_limit_exceeded | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `save_my_selection` | authentication_required | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `save_my_selection` | invalid_selection_payload | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `save_my_selection` | duplicate_selection_reference | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `save_my_selection` | invalid_kit_reference_set | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `save_my_selection` | invalid_selection_reference | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `save_my_selection` | invalid_selection_version | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `save_my_selection` | selection_limit_reached | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `save_my_selection` | selection_version_conflict | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `revoke_site_shared_selection` | invalid_shared_selection_management_token | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `confirm_site_briefing_asset_verification` | briefing_asset_verification_conflict | `site-supabase/supabase/migrations/20260922220000_verify_briefing_asset_content.sql` |
| `confirm_site_briefing_asset_verification` | invalid_briefing_asset_verification | `site-supabase/supabase/migrations/20260922220000_verify_briefing_asset_content.sql` |
| `require_verified_briefing_asset_attachment` | briefing_asset_not_verified | `site-supabase/supabase/migrations/20260922220000_verify_briefing_asset_content.sql` |
| `purge_site_admin_audit_logs` | invalid_audit_retention_input | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `request_my_quote_adjustment` | authentication_required | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `request_my_quote_adjustment` | quote_not_found | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `request_my_quote_adjustment` | adjustment_message_required | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `request_my_quote_adjustment` | invalid_client_request_id | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `request_my_quote_adjustment` | too_many_pending_adjustments | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `erase_customer_data` | invalid_erasure_email | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `claim_my_quote_requests` | authentication_required | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `claim_my_quote_requests` | verified_email_required | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `claim_my_quote_requests` | identity_erased | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `get_briefing_asset_retention_candidates` | invalid_batch_size | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `finalize_site_storage_retention` | invalid_site_storage_retention_input | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `list_my_occasion_favorites` | authentication_required | `site-supabase/supabase/migrations/20260923130000_add_customer_occasion_favorites.sql` |
| `claim_site_notification_deliveries` | invalid_notification_claim_input | `site-supabase/supabase/migrations/20260923200000_enrich_quote_confirmation_contract.sql` |
| `claim_site_quote_notification` | invalid_notification_channel | `site-supabase/supabase/migrations/20260923200000_enrich_quote_confirmation_contract.sql` |
| `create_my_briefing_asset` | authentication_required | `site-supabase/supabase/migrations/20260927161243_harden_briefing_assets_and_audits.sql` |
| `create_my_briefing_asset` | invalid_briefing_asset | `site-supabase/supabase/migrations/20260927161243_harden_briefing_assets_and_audits.sql` |
| `create_my_briefing_asset` | briefing_asset_limit_reached | `site-supabase/supabase/migrations/20260927161243_harden_briefing_assets_and_audits.sql` |
| `get_my_briefing_asset_verification` | authentication_required | `site-supabase/supabase/migrations/20260927161243_harden_briefing_assets_and_audits.sql` |
| `get_my_proposal_document` | authentication_required | `site-supabase/supabase/migrations/20260927161243_harden_briefing_assets_and_audits.sql` |
| `set_my_occasion_favorite` | authentication_required | `site-supabase/supabase/migrations/20260928174000_reject_null_occasion_favorite_state.sql` |
| `set_my_occasion_favorite` | invalid_favorite_state | `site-supabase/supabase/migrations/20260928174000_reject_null_occasion_favorite_state.sql` |
| `set_my_occasion_favorite` | invalid_occasion_id | `site-supabase/supabase/migrations/20260928174000_reject_null_occasion_favorite_state.sql` |
| `set_my_occasion_favorite` | occasion_favorite_limit_reached | `site-supabase/supabase/migrations/20260928174000_reject_null_occasion_favorite_state.sql` |
| `consume_rate_limit` | invalid_rate_limit_input | `site-supabase/supabase/migrations/20261001130320_preflight_lead_rate_limit.sql` |
| `consume_rate_limit` | rate_limit_exceeded | `site-supabase/supabase/migrations/20261001130320_preflight_lead_rate_limit.sql` |
| `preflight_site_lead_request` | invalid_lead_preflight_input | `site-supabase/supabase/migrations/20261001130320_preflight_lead_rate_limit.sql` |
| `attach_my_briefing_assets_to_quote` | authentication_required | `site-supabase/supabase/migrations/20261006134751_make_briefing_asset_attachment_idempotent.sql` |
| `attach_my_briefing_assets_to_quote` | invalid_briefing_asset_attachment | `site-supabase/supabase/migrations/20261006134751_make_briefing_asset_attachment_idempotent.sql` |
| `attach_my_briefing_assets_to_quote` | briefing_asset_attachment_conflict | `site-supabase/supabase/migrations/20261006134751_make_briefing_asset_attachment_idempotent.sql` |

## E. Estados, máquinas de estado e transições

### E.1 Colunas de status no banco

| Tabela | Coluna | Valores permitidos (enum/CHECK) | Default |
|---|---|---|---|
| `site_private.quote_requests` | `status` | `closed`, `in_progress`, `new`, `quoted`, `spam`, `triaged` | `new` |
| `site_private.contact_requests` | `status` | `closed`, `in_progress`, `new`, `spam`, `triaged` | `new` |
| `site_private.notification_deliveries` | `status` | `cancelled`, `exhausted`, `failed`, `pending`, `processing`, `sent` | `pending` |
| `site_private.notification_deliveries` | `delivery_state` | `bounced`, `delivered` |  |
| `site_private.quote_request_events` | `status` | `closed`, `in_progress`, `new`, `quoted`, `triaged` |  |
| `site_private.quote_adjustment_requests` | `status` | `closed`, `new`, `resolved`, `triaged` | `new` |
| `site_private.status_transitions` | `from_status` | **livre (sem enum/CHECK)** |  |
| `site_private.status_transitions` | `to_status` | **livre (sem enum/CHECK)** |  |

### E.2 Transições permitidas (tabela de transições no banco e mapas declarados no código)

Transições declaradas no banco — linhas que as migrations inserem em tabela de transições. Quem as impõe é o trigger/função que consulta essa tabela (seção D); par de/para ausente aqui não foi declarado:

| Tabela de transições | Escopo | De | Para (permitidos) | Migration |
|---|---|---|---|---|
| `site_private.status_transitions` | `entity=quote_requests` | `new` | `triaged`, `in_progress`, `spam`, `closed` | `site-supabase/supabase/migrations/20260916100000_add_quote_event_sequence_and_status_state_machine.sql` |
| `site_private.status_transitions` | `entity=quote_requests` | `triaged` | `in_progress`, `spam`, `closed` | `site-supabase/supabase/migrations/20260916100000_add_quote_event_sequence_and_status_state_machine.sql` |
| `site_private.status_transitions` | `entity=quote_requests` | `in_progress` | `quoted`, `spam`, `closed` | `site-supabase/supabase/migrations/20260916100000_add_quote_event_sequence_and_status_state_machine.sql` |
| `site_private.status_transitions` | `entity=quote_requests` | `quoted` | `in_progress`, `closed` | `site-supabase/supabase/migrations/20260916100000_add_quote_event_sequence_and_status_state_machine.sql` |
| `site_private.status_transitions` | `entity=contact_requests` | `new` | `triaged`, `in_progress`, `spam`, `closed` | `site-supabase/supabase/migrations/20260916100000_add_quote_event_sequence_and_status_state_machine.sql` |
| `site_private.status_transitions` | `entity=contact_requests` | `triaged` | `in_progress`, `spam`, `closed` | `site-supabase/supabase/migrations/20260916100000_add_quote_event_sequence_and_status_state_machine.sql` |
| `site_private.status_transitions` | `entity=contact_requests` | `in_progress` | `spam`, `closed` | `site-supabase/supabase/migrations/20260916100000_add_quote_event_sequence_and_status_state_machine.sql` |
| `site_private.status_transitions` | `entity=notification_deliveries` | `pending` | `processing`, `exhausted` | `site-supabase/supabase/migrations/20260916220000_add_notification_delivery_status_machine.sql` |
| `site_private.status_transitions` | `entity=notification_deliveries` | `processing` | `sent`, `failed`, `cancelled`, `exhausted` | `site-supabase/supabase/migrations/20260916220000_add_notification_delivery_status_machine.sql` |
| `site_private.status_transitions` | `entity=notification_deliveries` | `failed` | `processing`, `exhausted` | `site-supabase/supabase/migrations/20260916220000_add_notification_delivery_status_machine.sql` |
| `site_private.status_transitions` | `entity=notification_deliveries` | `exhausted` | `pending` | `site-supabase/supabase/migrations/20260916220000_add_notification_delivery_status_machine.sql` |

_nenhum mapa explícito encontrado no código — fora da tabela acima (se houver), transições só existem implicitamente nos `if`s (veja E.3)_

### E.3 Valores de status usados no código (escreve / compara / filtra)

| Campo | Valor | Uso | Onde |
|---|---|---|---|
| `status` | `attached` | compara, escreve | `src/pages/QuotePage.tsx` |
| `status` | `closed` | compara | `src/lib/customerAccount.ts` |
| `status` | `delivered` | compara | `api/notification-events-whatsapp.ts` |
| `status` | `failed` | compara | `api/notification-events-whatsapp.ts` |
| `status` | `in_progress` | compara | `src/lib/customerAccount.ts` |
| `status` | `pending` | compara, escreve | `src/lib/quoteConfirmation.ts`<br>`src/pages/QuotePage.tsx` |
| `status` | `published` | compara, escreve | `shared/catalogEditorial.ts` |
| `status` | `quoted` | compara | `src/lib/customerAccount.ts` |
| `status` | `sent` | compara, escreve | `api/notifications.ts`<br>`src/lib/quoteConfirmation.ts`<br>`src/pages/QuotePage.tsx` |
| `status` | `triaged` | compara | `src/lib/customerAccount.ts` |
| `type` | `add` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `body` | escreve | `api/notifications.ts` |
| `type` | `campaign` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `clear` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `decision-group` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `delete` | compara | `src/components/SavedSelections.tsx` |
| `type` | `easter` | escreve | `src/lib/commemorativeDates.ts` |
| `type` | `email` | escreve | `src/pages/CustomerLoginPage.tsx` |
| `type` | `fixed` | compara, escreve | `src/lib/commemorativeDates.ts` |
| `type` | `kit-quantity` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `list` | compara | `src/components/ProductDescription.tsx` |
| `type` | `nth-weekday` | compara, escreve | `src/lib/commemorativeDates.ts` |
| `type` | `occasion` | escreve | `src/lib/analytics.ts` |
| `type` | `paragraph` | escreve | `src/components/ProductDescription.tsx` |
| `type` | `quantity` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `remove` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `replace` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `replace-selection` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `reset` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `restore` | compara, escreve | `src/components/SavedSelections.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `restore-saved-selection` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `restore-selection` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `selection-title` | compara, escreve | `src/context/QuoteCartContext.tsx`<br>`src/context/quoteCartReducer.ts` |
| `type` | `template` | escreve | `api/notifications.ts` |
| `type` | `text` | escreve | `api/notifications.ts` |
| `role` | `anon` | compara | `api/_lib/publicProductPage.ts`<br>`api/sitemap.ts`<br>`src/lib/catalog.ts`<br>`src/lib/siteSupabaseConfig.ts` |

### E.4 Enums e listas de valores

| Nome | Valores | Onde |
|---|---|---|
| LeadKind | quote \| contact | `api/_lib/contracts.ts` |
| OperationalAlertEvent | notification_queue_alert \| notification_cron_failed \| retention_cron_failed | `api/_lib/operationalAlerts.ts` |
| ProviderEventApplyReason | duplicate \| delivery_not_found \| delivery_state_already_set | `api/_lib/siteDatabase.ts` |
| CatalogEditorialStatus | published \| draft \| retired | `shared/catalogEditorial.ts` |
| CampaignMoment | onboarding \| evento \| relacionamento \| reconhecimento \| sazonal | `src/types.ts` |
| CampaignAudience | clientes \| colaboradores \| lideranca \| parceiros \| publico-evento | `src/types.ts` |
| CampaignScale | ate-50 \| 51-200 \| 201-500 \| 500-mais | `src/types.ts` |
| CampaignMood | util \| premium \| sustentavel \| tech \| afetivo \| divertido | `src/types.ts` |
| QuoteBudgetRange | ate-25 \| 26-50 \| 51-100 \| 101-200 \| acima-200 \| a-definir | `src/types.ts` |
| QuoteBudgetScope | por-pessoa \| total | `src/types.ts` |
| QuoteResponseChannel | whatsapp \| email \| telefone \| sem-preferencia | `src/types.ts` |
| QuoteBrandAssetStatus | logo-pronto \| identidade-em-criacao \| preciso-de-ajuda | `src/types.ts` |
| QuoteDeadlineFlexibility | flexivel \| data-fixa | `src/types.ts` |
| BriefingAssetKind | logo \| reference | `src/lib/briefingAssets.ts` |
| BRIEFING_ASSET_MIME_TYPES | 'image/png', 'image/jpeg', 'image/webp' | `src/lib/briefingAssets.ts` |
| ProfileParam | todos \| destaques \| novos \| kits | `src/lib/catalogFilters.ts` |
| CatalogCollectionFormat | online \| pdf \| digital | `src/lib/catalogLibrary.ts` |
| CatalogCollectionTheme | people \| events \| impact \| products | `src/lib/catalogLibrary.ts` |
| OccasionAudience | clientes \| colaboradores \| eventos \| comunidade | `src/lib/commemorativeDates.ts` |
| OccasionKind | relacionamento \| cultura \| impacto \| sazonal | `src/lib/commemorativeDates.ts` |
| CustomerQuoteStatus | new \| triaged \| in_progress \| quoted \| closed | `src/lib/customerQuoteContract.ts` |
| ProductBadgeKind | new \| kit \| personalizable | `src/lib/productBadges.ts` |
| ConfirmationDeliveryStatus | sent \| pending \| not_requested | `src/lib/quoteConfirmation.ts` |

## F. Validações de entrada

### F.1 Schemas Zod

_nenhum_

### F.2 react-hook-form (register/rules)

_nenhum item encontrado_

### F.3 Restrições em inputs HTML (required/min/max/pattern)

| Campo | Restrições | Arquivo |
|---|---|---|
| `conversation-name` | max | `src/components/ConversationForm.tsx` |
| `conversation-email` | type=email, max | `src/components/ConversationForm.tsx` |
| `conversation-phone` | type=tel, max | `src/components/ConversationForm.tsx` |
| `conversation-message` | max | `src/components/ConversationForm.tsx` |
| `dates-search` | max | `src/pages/CommemorativeDatesPage.tsx` |
| `customer-email` | type=email, required | `src/pages/CustomerLoginPage.tsx` |
| `customer-password` | type=passwordVisible ? , min, required | `src/pages/CustomerLoginPage.tsx` |
| `customer-code` | max | `src/pages/CustomerLoginPage.tsx` |
| `customer-adjustment-message` | disabled=adjustmentState === , max | `src/pages/CustomerQuotePage.tsx` |
| `product-quantity` | type=number, min=product.minQuantity, max=999999, min | `src/pages/ProductPage.tsx` |
| `name` | max | `src/pages/QuotePage.tsx` |
| `company` | max | `src/pages/QuotePage.tsx` |
| `email` | type=email, max | `src/pages/QuotePage.tsx` |
| `phone` | type=tel, max | `src/pages/QuotePage.tsx` |
| `city` | max | `src/pages/QuotePage.tsx` |
| `deadline` | type=date, min=minimumDeadline | `src/pages/QuotePage.tsx` |
| `actionName` | max | `src/pages/QuotePage.tsx` |
| `eventDate` | type=date, min=minimumDeadline | `src/pages/QuotePage.tsx` |
| `notes` | max | `src/pages/QuotePage.tsx` |
| `new-password` | type=passwordVisible ? , min, disabled=pending | `src/pages/SetPasswordPage.tsx` |
| `confirm-password` | type=passwordVisible ? , min, disabled=pending | `src/pages/SetPasswordPage.tsx` |

## G. Fórmulas e derivações (como valores são calculados)

### G.1 Colunas calculadas no banco

_nenhum item encontrado_

### G.2 Views (consultas derivadas)

_nenhum item encontrado_

### G.3 Funções de cálculo/decisão no código

- **validateStoredAsset(baseUrl: string, credential: string, candidate: { path: string; mimeType: string; sizeBytes: number }, signal: AbortSign)** — `api/briefing-assets.ts`
  ```
  // PDFs ficam em quarentena até existir parser estrutural/CDR isolado. Não // aceite uma blacklist textual como prova de que um documento é inerte. if (candidate.mimeType === 'application/pdf') { return 'invalid'; } const prefix = await readStoredSignature(baseUrl, credential, candidate.path, signal); if (!prefix) return 'missing'; return matchesDeclaredFileSignature(candidate.mimeType, prefix) ? 'valid' : 'invalid';
  ```
- **applyStatus(status: WhatsAppStatus)** — `api/notification-events-whatsapp.ts`
  ```
  const eventType = status.status ? eventTypeFor(status.status) : null; if (!eventType || !status.id) return 'ignored'; let occurredAt = new Date().toISOString(); if (status.timestamp !== undefined) { if (!/^\d{1,12}$/.test(status.timestamp)) return 'ignored'; const milliseconds = Number(status.timestamp) * 1000; const parsed = new Date(milliseconds); if (!Number.isFinite(milliseconds) || Number.isNaN(parsed.getTime())) return 'ignored'; occurredAt = parsed.toISOString(); } const controller = new …
  ```
- **validCalendarDate(value: string, field: string)** — `api/_lib/contracts.ts`
  ```
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RequestValidationError(`O campo ${field} é inválido.`); const date = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) { throw new RequestValidationError(`O campo ${field} é inválido.`); } return value;
  ```
- **validateOrigin(request: ApiRequest)** — `api/_lib/leadHandler.ts`
  ```
  const origin = header(request, 'origin'); const allowedOrigins = allowedSiteOrigins(); if (!allowedOrigins.size) { throw new RequestValidationError('O recebimento online ainda não está configurado.', 503, 'origin_not_configured'); } if (!allowedOrigins.has(origin)) { throw new RequestValidationError('Origem não autorizada.', 403, 'origin_not_allowed'); }
  ```
- **validProductIdentifier(value: string)** — `api/_lib/publicProductPage.ts`
  ```
  return UUID_PATTERN.test(value) || SLUG_PATTERN.test(value);
  ```
- **validDate(value: string)** — `shared/catalogEditorial.ts`
  ```
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const [year, month, day] = value.split('-').map(Number); const candidate = new Date(Date.UTC(year!, month! - 1, day!)); return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month! - 1 && candidate.getUTCDate() === day;
  ```
- **validate(lead: ContactLead)** — `src/components/ConversationForm.tsx`
  ```
  const errors: Partial<Record<keyof ContactLead, string>> = {}; if (lead.name.trim().length < 2) errors.name = 'Conte para a gente como chamar você.'; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.email = 'Informe um e-mail válido.'; if (lead.phone && lead.phone.replace(/\D/g, '').length < 10) errors.phone = 'Inclua o DDD ou deixe o telefone em branco.'; if (!lead.privacyAccepted) errors.privacyAccepted = 'Autorize o contato para continuar.'; return errors;
  ```
- **campaignScore(product: CatalogProduct, campaign?: CampaignSelection)** — `src/lib/catalogRanking.ts`
  ```
  if (!campaign) return 0; let score = 0; const haystack = searchableProductText(product); if (campaign.audience === 'publico-evento' && product.allowsPersonalization) score += 6; if (campaign.scale === '500-mais' && product.minQuantity <= 500) score += 6; if (campaign.scale === '201-500' && product.minQuantity <= 500) score += 4; if (campaign.scale === '51-200' && product.minQuantity <= 200) score += 4; if (campaign.scale === 'ate-50' && product.minQuantity <= 50) score += 4; if (campaign.mood == …
  ```
- **scoreProduct(product: CatalogProduct, context: CatalogRankingContext)** — `src/lib/catalogRanking.ts`
  ```
  const haystack = searchableProductText(product); const matches = queryTokens(context.query).reduce((total, token) => total + (haystack.includes(token) ? 12 : 0), 0); return matches + (product.isFeatured ? 5 : 0) + (product.isBestseller ? 3 : 0) + (product.isNew ? 2 : 0) + (product.isKit ? 1 : 0) + campaignScore(product, context.campaign);
  ```
- **rankCatalogProducts(products: CatalogProduct[], context: CatalogRankingContext = {})** — `src/lib/catalogRanking.ts`
  ```
  return rankProducts(products, context);
  ```
- **rankProducts(products: CatalogProduct[], context: CatalogRankingContext, adjustment: (product: CatalogProduct)** — `src/lib/catalogRanking.ts`
  ```
  number = () => 0): CatalogProduct[] {
  ```
- **rankRelatedProducts(products: CatalogProduct[], product: CatalogProduct)** — `src/lib/catalogRanking.ts`
  ```
  const anchorMaterials = new Set(product.materials.map(normalizeSearchText).filter(Boolean)); // Afinidade e diversidade participam da mesma ordenação. Um segundo sort // após diversify() parecia inocente, mas recolocava materiais/famílias // repetidos no topo e anulava a escolha de descoberta. return rankProducts(products.filter((candidate) => candidate.id !== product.id), { query: product.name, }, (candidate) => Number(candidate.mainCategoryId === product.mainCategoryId) * 10 + Number(candidate …
  ```
- **invalid()** — `src/lib/customerQuoteContract.ts`
  ```
  throw new Error('invalid_customer_quote_response');
  ```
- **validHttpsEndpoint(endpoint: string, label: string)** — `src/lib/http.ts`
  ```
  const isRelativeApiRoute = SITE_API_ROUTES.has(endpoint); if (isRelativeApiRoute) return endpoint; try { const url = new URL(endpoint); const currentOrigin = typeof window === 'undefined' ? '' : window.location.origin; if (url.protocol !== 'https:' || !url.hostname || url.origin !== currentOrigin || !SITE_API_ROUTES.has(url.pathname)) throw new Error(); return url.href; } catch { throw new Error(`O endpoint de ${label} precisa ser uma URL HTTPS válida.`); }
  ```
- **kitTotalUnits(quantity: number, components: KitComponent[])** — `src/lib/kitBuilder.ts`
  ```
  return components.reduce((total, component) => total + quantity * component.unitsPerKit, 0);
  ```
- **validateQuoteBriefing(value: QuoteBriefingForm, desiredDeadline?: string, minimumDate?: string)** — `src/lib/quoteBriefing.ts`
  ```
  return getQuoteBriefingValidationError(value, desiredDeadline, minimumDate)?.message || null;
  ```
- **validProfile(value: string | null)** — `src/lib/useCatalogPageState.ts`
  ```
  return value === 'destaques' || value === 'novos' || value === 'kits' ? value : 'todos';
  ```
- **validSort(value: string | null)** — `src/lib/useCatalogPageState.ts`
  ```
  return value === 'recentes' || value === 'nome' ? value : 'curadoria';
  ```
- **applyIntents(confirmed: Set<string>, intents: Map<string, FavoriteIntent>)** — `src/lib/useOccasionFavorites.ts`
  ```
  const next = new Set(confirmed); for (const [occasionId, { saved }] of intents) { saved ? next.add(occasionId) : next.delete(occasionId); } return next;
  ```
- **validTheme(value: string | null)** — `src/pages/CatalogsPage.tsx`
  ```
  return catalogThemeOptions.some((option) => option.id === value) ? value as CatalogThemeFilter : 'all';
  ```
- **apply(next: { q?: string; status?: string; page?: number })** — `src/pages/CustomerAccountPage.tsx`
  ```
  const updated = new URLSearchParams(params); if (next.q !== undefined) next.q ? updated.set('q', next.q) : updated.delete('q'); if (next.status !== undefined) next.status ? updated.set('status', next.status) : updated.delete('status'); if (next.page !== undefined && next.page > 1) updated.set('page', String(next.page)); else updated.delete('page'); setParams(updated, { replace: true });
  ```
- **validate(contact: QuoteContact)** — `src/pages/QuotePage.tsx`
  ```
  const errors: Partial<Record<keyof QuoteContact, string>> = {}; if (contact.name.trim().length < 2) errors.name = 'Informe seu nome.'; if (contact.company.trim().length < 2) errors.company = 'Informe o nome da empresa.'; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errors.email = 'Informe um e-mail válido.'; if (contact.phone.replace(/\D/g, '').length < 10) errors.phone = 'Informe um telefone com DDD.'; if (contact.deadline && contact.deadline < localDateInputValue()) errors.deadline = …
  ```
- **operationIsStale()** — `src/pages/QuotePage.tsx`
  ```
  controller.signal.aborted
  ```
- **totalUnits(items: QuoteItem[])** — `src/pages/SharedSelectionPage.tsx`
  ```
  return items.reduce((total, item) => total + item.quantity, 0);
  ```
- **applyDuplicate()** — `src/pages/SharedSelectionPage.tsx`
  ```
  if (visibleLoading || visibleError || !visibleItems.length || requiresSelectionReview) return; cart.replaceSelection(visibleItems); setDuplicateConfirmationOpen(false); cart.setDrawerOpen(true);
  ```

### G.4 Percentuais e multiplicadores no código

| Trecho | Arquivo |
|---|---|
| `// 1000 jobs sintéticos, 10% de falha injetada, duas rodadas) — p95 real de tempo de` | `api/notifications.ts` |
| `'--glitch-before-duration': `${speed * 0.85}s`,` | `src/components/GlitchText.tsx` |

## H. Parâmetros de negócio (constantes, prazos, limites)

### H.1 Constantes

| Constante | Valor | Arquivo |
|---|---|---|
| `REQUEST_TIMEOUT_MS` | `10_000` | `api/briefing-assets.ts` |
| `MAX_BODY_BYTES` | `4 * 1024` | `api/briefing-assets.ts` |
| `MAX_ASSET_BYTES` | `10 * 1024 * 1024` | `api/briefing-assets.ts` |
| `BUCKET` | `'customer-briefing-assets'` | `api/briefing-assets.ts` |
| `PROPOSAL_BUCKET` | `'customer-proposals'` | `api/customer-proposals.ts` |
| `REQUEST_TIMEOUT_MS` | `10_000` | `api/customer-proposals.ts` |
| `MAX_PROPOSAL_BODY_BYTES` | `4 * 1024` | `api/customer-proposals.ts` |
| `REQUEST_TIMEOUT_MS` | `10_000` | `api/notification-events-resend.ts` |
| `MAX_WEBHOOK_BODY_BYTES` | `256 * 1024` | `api/notification-events-resend.ts` |
| `REQUEST_TIMEOUT_MS` | `10_000` | `api/notification-events-whatsapp.ts` |
| `MAX_WEBHOOK_BODY_BYTES` | `256 * 1024` | `api/notification-events-whatsapp.ts` |
| `MAX_STATUSES_PER_WEBHOOK` | `100` | `api/notification-events-whatsapp.ts` |
| `BATCH_SIZE` | `10` | `api/notifications.ts` |
| `OVERALL_TIME_BUDGET_MS` | `25_000` | `api/notifications.ts` |
| `MIN_TIME_PER_JOB_MS` | `8_000` | `api/notifications.ts` |
| `QUEUE_HEALTH_TIMEOUT_MS` | `3_000` | `api/notifications.ts` |
| `QUEUE_AGE_ALERT_SECONDS` | `45 * 60` | `api/notifications.ts` |
| `REQUEST_TIMEOUT_MS` | `10_000` | `api/retention.ts` |
| `RETENTION_BATCH_SIZE` | `100` | `api/retention.ts` |
| `PROPOSAL_BUCKET` | `'customer-proposals'` | `api/retention.ts` |
| `BRIEFING_ASSET_BUCKET` | `'customer-briefing-assets'` | `api/retention.ts` |
| `MAX_SHARED_SELECTION_BODY_BYTES` | `32 * 1024` | `api/shared-selections.ts` |
| `REQUEST_TIMEOUT_MS` | `8_000` | `api/sitemap.ts` |
| `REQUEST_TIMEOUT_MS` | `5_000` | `api/_lib/catalogValidation.ts` |
| `LEAD_TOTAL_TIME_BUDGET_MS` | `24_000` | `api/_lib/leadHandler.ts` |
| `MIN_CONFIRMATION_WINDOW_MS` | `8_000` | `api/_lib/leadHandler.ts` |
| `OPERATIONAL_ALERT_TIMEOUT_MS` | `1_000` | `api/_lib/operationalAlerts.ts` |
| `DEFAULT_TITLE` | `'Promo Brindes \| Brindes corporativos personalizados'` | `api/_lib/pageShell.ts` |
| `NETWORK_TIMEOUT_MS` | `8_000` | `api/_lib/publicProductPage.ts` |
| `TIMEOUT_MS` | `10_000` | `api/_lib/sharedSelections.ts` |
| `MAX_SHARED_SELECTION_ITEMS` | `50` | `api/_lib/sharedSelections.ts` |
| `SITE_DATABASE_PROJECT` | `'xlzmclcjdncjfdrjxclt'` | `api/_lib/siteDatabase.ts` |
| `INTERNAL_DATABASE_PROJECT` | `'doufsxqlfjyuvxuezpln'` | `api/_lib/siteDatabase.ts` |
| `REQUEST_TIMEOUT_MS` | `10_000` | `api/_lib/siteDatabase.ts` |
| `LEAD_PREFLIGHT_TIMEOUT_MS` | `2_500` | `api/_lib/siteDatabase.ts` |
| `SVIX_TIMESTAMP_TOLERANCE_SECONDS` | `300` | `api/_lib/webhookSignature.ts` |
| `CAMPAIGN_TIME_ZONE` | `'America/Sao_Paulo'` | `shared/campaignYears.ts` |
| `EDITORIAL_TIME_ZONE` | `'America/Sao_Paulo'` | `shared/catalogEditorial.ts` |
| `BRIEFING_ASSET_BUCKET` | `'customer-briefing-assets'` | `src/lib/briefingAssets.ts` |
| `MAX_BRIEFING_ASSET_BYTES` | `10 * 1024 * 1024` | `src/lib/briefingAssets.ts` |
| `MAX_BRIEFING_ASSETS` | `10` | `src/lib/briefingAssets.ts` |
| `LEGACY_PRODUCT_RESOURCE` | `'v_products_public'` | `src/lib/catalog.ts` |
| `PUBLIC_PRODUCT_RESOURCE` | `'v_site_products_public'` | `src/lib/catalog.ts` |
| `CATALOG_REQUEST_TIMEOUT_MS` | `12_000` | `src/lib/catalog.ts` |
| `MAX_COMPARISON_ITEMS` | `3` | `src/lib/catalogComparison.ts` |
| `MAX_CATALOG_PAGE` | `10_000` | `src/lib/catalogFilters.ts` |
| `DEFAULT_CONTACT_EMAIL` | `'adm01@promobrindes.com.br'` | `src/lib/contactRequest.ts` |
| `CANONICAL_PUBLIC_ORIGIN` | `'https://promo-brindes-v1.vercel.app'` | `src/lib/customerAuthRedirect.ts` |
| `REQUEST_TIMEOUT_MS` | `28_000` | `src/lib/http.ts` |
| `PRODUCT_PLACEHOLDER` | `'/images/product-placeholder.svg'` | `src/lib/images.ts` |
| `NOVELTY_WINDOW_DAYS` | `30` | `src/lib/productBadges.ts` |
| `MS_PER_DAY` | `86_400_000` | `src/lib/productBadges.ts` |
| `MAX_AGE_MS` | `24 * 60 * 60 * 1_000` | `src/lib/quoteDraft.ts` |
| `QUOTE_DRAFT_RETENTION_LABEL` | `'24 horas nesta aba do navegador'` | `src/lib/quoteDraft.ts` |
| `MAX_QUOTE_ITEMS` | `50` | `src/lib/quoteItems.ts` |
| `MAX_QUANTITY` | `999_999` | `src/lib/quoteItems.ts` |
| `MAX_AGE_MS` | `30 * 60 * 1_000` | `src/lib/quoteRepeat.ts` |
| `DEFAULT_CONTACT_EMAIL` | `'adm01@promobrindes.com.br'` | `src/lib/quoteRequest.ts` |
| `DEFAULT_MAX_WAIT_MS` | `1_500` | `src/lib/scrollRestoration.ts` |
| `POSITION_TOLERANCE_PX` | `2` | `src/lib/scrollRestoration.ts` |
| `VERSION` | `2` | `src/lib/sharedSelection.ts` |
| `MAX_SHARED_SELECTION_ITEMS` | `50` | `src/lib/sharedSelection.ts` |
| `MAX_LEGACY_SHARED_SELECTION_PAYLOAD_LENGTH` | `8_000` | `src/lib/sharedSelection.ts` |
| `SITE_RPC_TIMEOUT_MS` | `12_000` | `src/lib/siteRpc.ts` |
| `PAGE_SIZE` | `12` | `src/pages/CustomerAccountPage.tsx` |

### H.2 Prazos, expirações e janelas de tempo

| Trecho | Arquivo |
|---|---|
| `body: JSON.stringify({ expiresIn: 60 }),` | `api/customer-proposals.ts` |
| `if (difference > 10 * 60_000 \|\| difference < -7 * 24 * 60 * 60_000) {` | `api/_lib/contracts.ts` |
| `or p_window <= interval '0 seconds' then` | `site-supabase/supabase/migrations/20260908230000_create_site_lead_storage.sql` |
| `perform site_private.consume_rate_limit('contact', p_request_meta ->> 'identifierHash', 8, interval '15 minutes');` | `site-supabase/supabase/migrations/20260908230000_create_site_lead_storage.sql` |
| `perform site_private.consume_rate_limit('quote', p_request_meta ->> 'identifierHash', 5, interval '15 minutes');` | `site-supabase/supabase/migrations/20260908230000_create_site_lead_storage.sql` |
| `retention_until timestamptz not null default (now() + interval '24 months'),` | `site-supabase/supabase/migrations/20260908230000_create_site_lead_storage.sql` |
| `perform site_private.consume_rate_limit('contact', p_request_meta ->> 'identifierHash', 8, interval '15 minutes');` | `site-supabase/supabase/migrations/20260910103000_store_contact_message.sql` |
| `perform site_private.consume_rate_limit('contact', p_request_meta ->> 'identifierHash', 8, interval '15 minutes');` | `site-supabase/supabase/migrations/20260910120000_preserve_variant_and_contact_preference.sql` |
| `perform site_private.consume_rate_limit('quote', p_request_meta ->> 'identifierHash', 5, interval '15 minutes');` | `site-supabase/supabase/migrations/20260910120000_preserve_variant_and_contact_preference.sql` |
| `perform site_private.consume_rate_limit('quote', p_request_meta ->> 'identifierHash', 5, interval '15 minutes');` | `site-supabase/supabase/migrations/20260910140000_preserve_item_decision_group.sql` |
| `where bucket.updated_at <= p_now - interval '30 days';` | `site-supabase/supabase/migrations/20260911130000_add_site_data_retention.sql` |
| `where bucket.updated_at <= now() - interval '30 days';` | `site-supabase/supabase/migrations/20260911150000_fix_retention_storage_orchestration.sql` |
| `check (expires_at <= created_at + interval '31 days')` | `site-supabase/supabase/migrations/20260911170000_add_revocable_shared_selections.sql` |
| `expires_at timestamptz not null default (now() + interval '30 days'),` | `site-supabase/supabase/migrations/20260911170000_add_revocable_shared_selections.sql` |
| `return jsonb_build_object('token', v_token, 'expiresAt', now() + interval '30 days');` | `site-supabase/supabase/migrations/20260911170000_add_revocable_shared_selections.sql` |
| `set request_count = case when bucket.window_started_at <= now() - interval '1 hour' then 1 else bucket.request_count + 1 end,` | `site-supabase/supabase/migrations/20260911170000_add_revocable_shared_selections.sql` |
| `window_started_at = case when bucket.window_started_at <= now() - interval '1 hour' then now() else bucket.window_started_at end,` | `site-supabase/supabase/migrations/20260911170000_add_revocable_shared_selections.sql` |
| `delete from site_private.rate_limit_buckets bucket where bucket.updated_at <= now() - interval '30 days';` | `site-supabase/supabase/migrations/20260911180000_expand_shared_selection_retention.sql` |
| `delete from site_private.shared_selection_rate_limits bucket where bucket.updated_at <= now() - interval '30 days';` | `site-supabase/supabase/migrations/20260911180000_expand_shared_selection_retention.sql` |
| `delete from site_private.shared_selections selection where selection.expires_at <= now() or (selection.revoked_at is not null and selection.revoked_at <= now() …` | `site-supabase/supabase/migrations/20260911180000_expand_shared_selection_retention.sql` |
| `return jsonb_build_object('token', v_token, 'expiresAt', now() + interval '30 days');` | `site-supabase/supabase/migrations/20260911180000_expand_shared_selection_retention.sql` |
| `set request_count = case when bucket.window_started_at <= now() - interval '1 hour' then 1 else bucket.request_count + 1 end,` | `site-supabase/supabase/migrations/20260911180000_expand_shared_selection_retention.sql` |
| `window_started_at = case when bucket.window_started_at <= now() - interval '1 hour' then now() else bucket.window_started_at end,` | `site-supabase/supabase/migrations/20260911180000_expand_shared_selection_retention.sql` |
| `delete from site_private.rate_limit_buckets bucket where bucket.updated_at <= now() - interval '30 days';` | `site-supabase/supabase/migrations/20260911190000_harden_retention_metadata.sql` |
| `delete from site_private.shared_selection_rate_limits bucket where bucket.updated_at <= now() - interval '30 days';` | `site-supabase/supabase/migrations/20260911190000_harden_retention_metadata.sql` |
| `delete from site_private.shared_selections selection where selection.expires_at <= now() or (selection.revoked_at is not null and selection.revoked_at <= now() …` | `site-supabase/supabase/migrations/20260911190000_harden_retention_metadata.sql` |
| `or (delivery.status = 'processing' and delivery.updated_at <= now() - interval '10 minutes')` | `site-supabase/supabase/migrations/20260912170000_add_quote_notification_outbox.sql` |
| `or (delivery.status = 'processing' and delivery.updated_at <= now() - interval '10 minutes')` | `site-supabase/supabase/migrations/20260914120000_fix_notification_outbox_contract.sql` |
| `-- Etapa 10 — a lease era inferida por updated_at <= now() - interval '10 minutes', e` | `site-supabase/supabase/migrations/20260916110000_add_notification_queue_policy_lease_and_backoff.sql` |
| `select 5::smallint, interval '10 minutes', 25, 60, 3600;` | `site-supabase/supabase/migrations/20260916110000_add_notification_queue_policy_lease_and_backoff.sql` |
| `where archived_at < now() - interval '90 days'` | `site-supabase/supabase/migrations/20260922130000_add_customer_selections.sql` |
| `'expiresAt', now() + interval '30 days'` | `site-supabase/supabase/migrations/20260922150000_add_private_briefing_assets.sql` |
| `expires_at timestamptz not null default (now() + interval '30 days')` | `site-supabase/supabase/migrations/20260922150000_add_private_briefing_assets.sql` |
| `perform site_private.consume_rate_limit('quote', p_request_meta ->> 'identifierHash', 5, interval '15 minutes');` | `site-supabase/supabase/migrations/20260922160000_preserve_kit_composition.sql` |
| `return jsonb_build_object('token', v_token, 'expiresAt', now() + interval '30 days');` | `site-supabase/supabase/migrations/20260922180000_preserve_kits_in_shared_selections.sql` |
| `set request_count = case when bucket.window_started_at <= now() - interval '1 hour' then 1 else bucket.request_count + 1 end,` | `site-supabase/supabase/migrations/20260922180000_preserve_kits_in_shared_selections.sql` |
| `window_started_at = case when bucket.window_started_at <= now() - interval '1 hour' then now() else bucket.window_started_at end,` | `site-supabase/supabase/migrations/20260922180000_preserve_kits_in_shared_selections.sql` |
| `return jsonb_build_object('token', v_token, 'expiresAt', now() + interval '30 days');` | `site-supabase/supabase/migrations/20260922200000_preserve_shared_selection_priorities.sql` |
| `set request_count = case when bucket.window_started_at <= now() - interval '1 hour' then 1 else bucket.request_count + 1 end,` | `site-supabase/supabase/migrations/20260922200000_preserve_shared_selection_priorities.sql` |
| `window_started_at = case when bucket.window_started_at <= now() - interval '1 hour' then now() else bucket.window_started_at end,` | `site-supabase/supabase/migrations/20260922200000_preserve_shared_selection_priorities.sql` |
| `return pg_catalog.jsonb_build_object('token', v_token, 'expiresAt', now() + interval '30 days');` | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `set request_count = case when bucket.window_started_at <= now() - interval '1 hour' then 1 else bucket.request_count + 1 end,` | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `window_started_at = case when bucket.window_started_at <= now() - interval '1 hour' then now() else bucket.window_started_at end,` | `site-supabase/supabase/migrations/20260922210000_close_selection_and_asset_integrity_gaps.sql` |
| `or p_limit < 1 or p_window <= interval '0 seconds' then` | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `perform site_private.consume_rate_limit('adjustment', v_identifier_hash, 5, interval '1 hour');` | `site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql` |
| `'expiresAt', now() + interval '30 days'` | `site-supabase/supabase/migrations/20260927161243_harden_briefing_assets_and_audits.sql` |
| `interval '15 minutes'` | `site-supabase/supabase/migrations/20260927161243_harden_briefing_assets_and_audits.sql` |
| `or p_limit < 1 or p_window <= interval '0 seconds' then` | `site-supabase/supabase/migrations/20260927161243_harden_briefing_assets_and_audits.sql` |
| `interval '15 minutes'` | `site-supabase/supabase/migrations/20261001130320_preflight_lead_rate_limit.sql` |
| `or p_limit < 1 or p_window <= interval '0 seconds' then` | `site-supabase/supabase/migrations/20261001130320_preflight_lead_rate_limit.sql` |
| `const MAX_AGE_MS = 24 * 60 * 60 * 1_000;` | `src/lib/quoteDraft.ts` |

### H.3 Limites de paginação

_nenhum item encontrado_

## I. Regras implícitas em mensagens de erro/validação

| Mensagem | Arquivo |
|---|---|
| briefing_asset_rejection_failed | `api/briefing-assets.ts` |
| storage_credential_missing | `api/briefing-assets.ts` |
| verification_confirmation_failed | `api/briefing-assets.ts` |
| proposal_storage_credential_missing | `api/customer-proposals.ts` |
| sign_failed | `api/customer-proposals.ts` |
| unsafe_signed_url | `api/customer-proposals.ts` |
| email_provider_${response.status \|\|  | `api/notifications.ts` |
| email_provider_not_configured | `api/notifications.ts` |
| invalid_notification_${name}_response | `api/notifications.ts` |
| invalid_notification_item | `api/notifications.ts` |
| invalid_notification_job | `api/notifications.ts` |
| invalid_notification_jobs | `api/notifications.ts` |
| invalid_notification_queue_health | `api/notifications.ts` |
| notification_${name}_failed | `api/notifications.ts` |
| whatsapp_provider_${response.status \|\|  | `api/notifications.ts` |
| whatsapp_provider_not_configured | `api/notifications.ts` |
| invalid_retention_candidates | `api/retention.ts` |
| rpc_${name}_failed | `api/retention.ts` |
| storage_delete_credential_not_configured | `api/retention.ts` |
| storage_delete_failed | `api/retention.ts` |
| unsafe_storage_bucket | `api/retention.ts` |
| A solicitação ultrapassa o limite permitido. | `api/shared-selections.ts` |
| Ação de compartilhamento inválida. | `api/shared-selections.ts` |
| Envie o conteúdo como application/json. | `api/shared-selections.ts` |
| Envie uma solicitação válida. | `api/shared-selections.ts` |
| Origem não autorizada. | `api/shared-selections.ts` |
| empty_body | `api/shared-selections.ts` |
| A quantidade do produto ${index + 1} está abaixo do mínimo atual. | `api/_lib/catalogValidation.ts` |
| A validação do catálogo está indisponível. Tente novamente em alguns instantes. | `api/_lib/catalogValidation.ts` |
| A variante do produto ${index + 1} não está mais disponível. Revise a cor escolhida. | `api/_lib/catalogValidation.ts` |
| Não foi possível validar os produtos agora. Tente novamente em alguns instantes. | `api/_lib/catalogValidation.ts` |
| O produto ${index + 1} não está mais disponível para briefing. Atualize sua seleção. | `api/_lib/catalogValidation.ts` |
| A aritmética do kit no produto ${index + 1} é inválida. | `api/_lib/contracts.ts` |
| A composição do produto ${index + 1} é inválida. | `api/_lib/contracts.ts` |
| A cópia de confirmação por e-mail é obrigatória para este fluxo. | `api/_lib/contracts.ts` |
| A data de recebimento não pode ficar depois da data do evento. | `api/_lib/contracts.ts` |
| A origem da solicitação é inválida. | `api/_lib/contracts.ts` |
| A quantidade do produto ${index + 1} está abaixo do mínimo. | `api/_lib/contracts.ts` |
| A seleção contém o mesmo produto e variante mais de uma vez. | `api/_lib/contracts.ts` |
| A versão do aviso de privacidade é inválida. | `api/_lib/contracts.ts` |
| Cada kit precisa ter pelo menos dois componentes. | `api/_lib/contracts.ts` |
| Escolha uma faixa de investimento para o contexto informado. | `api/_lib/contracts.ts` |
| Informe se a faixa de investimento é por pessoa ou para o total da ação. | `api/_lib/contracts.ts` |
| Informe um e-mail válido. | `api/_lib/contracts.ts` |
| Informe um telefone com DDD válido. | `api/_lib/contracts.ts` |
| Informe um telefone válido. | `api/_lib/contracts.ts` |
| O campo ${field} deve ter entre ${min} e ${max} caracteres. | `api/_lib/contracts.ts` |
| O campo ${field} está fora da janela permitida. | `api/_lib/contracts.ts` |
| O campo ${field} é inválido. | `api/_lib/contracts.ts` |
| O campo campaign.occasion.id é inválido. | `api/_lib/contracts.ts` |
| O campo campaign.source é inválido. | `api/_lib/contracts.ts` |
| O campo clientRequestId é inválido. | `api/_lib/contracts.ts` |
| O campo pageUrl é inválido. | `api/_lib/contracts.ts` |
| O campo prazo é inválido. | `api/_lib/contracts.ts` |
| O complemento do briefing está vazio. | `api/_lib/contracts.ts` |
| O consentimento de privacidade é obrigatório. | `api/_lib/contracts.ts` |
| O contexto da campanha está vazio. | `api/_lib/contracts.ts` |
| O instante do consentimento não corresponde ao envio. | `api/_lib/contracts.ts` |
| O orçamento deve conter entre 1 e 50 produtos. | `api/_lib/contracts.ts` |
| O prazo não pode estar no passado. | `api/_lib/contracts.ts` |
| O produto ${index + 1} é inválido. | `api/_lib/contracts.ts` |
| Os componentes do kit precisam usar o mesmo nome e a mesma quantidade de conjuntos. | `api/_lib/contracts.ts` |
| A chave de idempotência não corresponde à solicitação. | `api/_lib/leadHandler.ts` |
| A solicitação ultrapassa o limite permitido. | `api/_lib/leadHandler.ts` |
| Envie o conteúdo como application/json. | `api/_lib/leadHandler.ts` |
| O corpo da solicitação não contém JSON válido. | `api/_lib/leadHandler.ts` |
| O recebimento online ainda não está configurado. | `api/_lib/leadHandler.ts` |
| Origem não autorizada. | `api/_lib/leadHandler.ts` |
| unserializable_body | `api/_lib/leadHandler.ts` |
| invalid app shell | `api/_lib/publicProductPage.ts` |
| A composição de kit da seleção é inválida. | `api/_lib/sharedSelections.ts` |
| A seleção contém referências repetidas. | `api/_lib/sharedSelections.ts` |
| Escolha entre 1 e ${MAX_SHARED_SELECTION_ITEMS} referências para compartilhar. | `api/_lib/sharedSelections.ts` |
| Este link não está disponível. | `api/_lib/sharedSelections.ts` |
| Este link não é válido. | `api/_lib/sharedSelections.ts` |
| Muitas tentativas em pouco tempo. Aguarde alguns minutos. | `api/_lib/sharedSelections.ts` |
| Não conseguimos preparar este link agora. | `api/_lib/sharedSelections.ts` |
| Não foi possível confirmar a propriedade deste link. | `api/_lib/sharedSelections.ts` |
| O serviço não confirmou um link válido. | `api/_lib/sharedSelections.ts` |
| Revise os componentes e as quantidades do kit antes de compartilhar. | `api/_lib/sharedSelections.ts` |
| Uma referência da seleção é inválida. | `api/_lib/sharedSelections.ts` |
| Configuração do banco do site inválida. | `api/_lib/siteDatabase.ts` |
| Credenciais server-side do site inválidas. | `api/_lib/siteDatabase.ts` |
| Destino isolado do banco do site inválido. | `api/_lib/siteDatabase.ts` |
| Esta solicitação entrou em conflito com uma tentativa anterior. Atualize a página. | `api/_lib/siteDatabase.ts` |
| Muitas tentativas em pouco tempo. Aguarde alguns minutos. | `api/_lib/siteDatabase.ts` |
| Não conseguimos registrar sua solicitação agora. Tente novamente. | `api/_lib/siteDatabase.ts` |
| Não conseguimos validar sua solicitação agora. Tente novamente. | `api/_lib/siteDatabase.ts` |
| O banco devolveu uma resposta inválida. | `api/_lib/siteDatabase.ts` |
| O banco não devolveu um protocolo de evento válido. | `api/_lib/siteDatabase.ts` |
| O banco não devolveu um protocolo válido. | `api/_lib/siteDatabase.ts` |
| O recebimento online ainda não está configurado. | `api/_lib/siteDatabase.ts` |
| site_rpc_${name}_failed | `api/_lib/siteDatabase.ts` |
| Unexpected mocked transport | `docs/audits/closure-review-20260912/notifications.mjs` |
| Este diagnóstico só pode usar um servidor local. | `docs/audits/plan-review-20260912/reproduce.mjs` |
| Contrato inconclusivo: ${resource} respondeu HTTP ${response.status}. | `scripts/check-catalog-public-contract.mjs` |
| Contrato inconclusivo: catálogo mudou durante duas varreduras (${lastDrift}). | `scripts/check-catalog-public-contract.mjs` |
| Contrato inconclusivo: paginação não terminou após ${requests} requisições para ${siteTotal ?? baselineTotal} linhas observadas. | `scripts/check-catalog-public-contract.mjs` |
| Contrato indisponível: falha de rede ao consultar ${resource} após ${attempt + 1} tentativa(s) (${describeNetworkFailure(failure)}). | `scripts/check-catalog-public-contract.mjs` |
| Contrato indisponível: v_site_products_public respondeu HTTP ${response.status}. | `scripts/check-catalog-public-contract.mjs` |
| Drift no contrato público: ausentes [${missing.join( | `scripts/check-catalog-public-contract.mjs` |
| VITE_SUPABASE_URL inválida: não é uma URL absoluta. | `scripts/check-catalog-public-contract.mjs` |
| ${label}: ${(value / 1024).toFixed(1)} KiB excede o limite de ${(maximum / 1024).toFixed(0)} KiB. | `scripts/check-performance-budget.mjs` |
| Chunk  | `scripts/check-performance-budget.mjs` |
| Manifest do Vite sem entrada principal. | `scripts/check-performance-budget.mjs` |
| dist/.vite/manifest.json não existe: rode  | `scripts/check-performance-budget.mjs` |
| dist/.vite/manifest.json não tem o formato de manifest do Vite. | `scripts/check-performance-budget.mjs` |
| dist/.vite/manifest.json não é um JSON válido: ${error.message} | `scripts/check-performance-budget.mjs` |
| dist/assets não existe: rode  | `scripts/check-performance-budget.mjs` |
| A lista de execuções do CI deve ser um array. | `scripts/ci-health-metrics.mjs` |
| Este comando recebe o JSON exclusivamente por stdin. | `scripts/ci-health-metrics.mjs` |
| JSON inválido em stdin: ${error instanceof Error ? error.message : String(error)} | `scripts/ci-health-metrics.mjs` |
| Nenhum JSON recebido por stdin: esperado o array de execuções do CI. | `scripts/ci-health-metrics.mjs` |
| nenhuma migration <14 dígitos>_<descrição>.sql em ${MIGRATIONS_DIR}; não há versão de schema para registrar. | `scripts/generate-database-dictionary.mjs` |
| nenhuma migration <14 dígitos>_<descrição>.sql em ${MIGRATIONS_DIR}; não há versão de schema para registrar. | `scripts/generate-database-schema-doc.mjs` |
| Corpus Graphify inválido: caminho fora do diretório de staging (${relative}). | `scripts/graphify-quality.mjs` |
| Mapa de banco contém ${nonSqlInDatabase.length} nó(s) fora de SQL. | `scripts/graphify-quality.mjs` |
| Mapa principal contém ${sqlInMain.length} nó(s) SQL. | `scripts/graphify-quality.mjs` |
| ${command} ${args[0] ??  | `scripts/graphify.mjs` |
| ${command} falhou com ${result.signal ?  | `scripts/graphify.mjs` |
| Arquivo ${label} inválido: ${candidate} | `scripts/graphify.mjs` |
| Benchmark Graphify falhou: ${failed.map((result) => result.id).join( | `scripts/graphify.mjs` |
| Benchmark Graphify inválido no cenário ${index + 1}. | `scripts/graphify.mjs` |
| Benchmark Graphify inválido: são exigidos exatamente 10 cenários versionados. | `scripts/graphify.mjs` |
| Caminho fora da raiz recusado: ${candidate} | `scripts/graphify.mjs` |
| Comando Graphify desconhecido: ${COMMAND}. | `scripts/graphify.mjs` |
| Configuração Graphify inválida: ${field} deve ser um subdiretório relativo dentro da raiz do projeto. | `scripts/graphify.mjs` |
| Configuração Graphify inválida: ${field}. | `scripts/graphify.mjs` |
| Configuração Graphify inválida: databaseSourceRoots. | `scripts/graphify.mjs` |
| Configuração Graphify inválida: maxWorkers deve estar entre 1 e 8. | `scripts/graphify.mjs` |
| Configuração Graphify inválida: somente mode=code-only é permitido na automação. | `scripts/graphify.mjs` |
| Configuração Graphify inválida: sourceRoots. | `scripts/graphify.mjs` |
| Corpus Graphify inválido: mapas principal e de banco exigem arquivos. | `scripts/graphify.mjs` |
| Grafo ausente. Execute  | `scripts/graphify.mjs` |
| Informe o ID ou nome exato de um nó. | `scripts/graphify.mjs` |
| Informe o arquivo ${label}. | `scripts/graphify.mjs` |
| Informe um símbolo ou arquivo com até 300 caracteres. | `scripts/graphify.mjs` |
| Informe uma pergunta para o grafo. | `scripts/graphify.mjs` |
| Mapa de banco ausente. Execute  | `scripts/graphify.mjs` |
| Nenhum nó corresponde a  | `scripts/graphify.mjs` |
| Nome ambíguo: ${subject}. Use um ID: ${matches.map((node) => node.id).join( | `scripts/graphify.mjs` |
| Nó não encontrado: ${subject}. Consulte graph:query. | `scripts/graphify.mjs` |
| Pergunta recusada: máximo de 500 caracteres. | `scripts/graphify.mjs` |
| Promoção bloqueada: conteúdo sensível ou caminho pessoal detectado em ${sensitive.map((item) =>  | `scripts/graphify.mjs` |
| Raiz inválida: package.json e .graphify.project.json são obrigatórios. | `scripts/graphify.mjs` |
| Recusado: Graphify só pode operar a raiz explícita Promo_Brindes_V1. | `scripts/graphify.mjs` |
| Use graph:path --  | `scripts/graphify.mjs` |
| Versão incompatível: esperado graphify ${config.graphifyVersion}, recebido ${version}. | `scripts/graphify.mjs` |
| graph.json inválido: ${dangling} relação(ões) apontam para nós ausentes. | `scripts/graphify.mjs` |
| graph.json inválido: grafo vazio não pode ser promovido. | `scripts/graphify.mjs` |
| graph.json inválido: id duplicado ${node.id}. | `scripts/graphify.mjs` |
| graph.json inválido: nodes e links são obrigatórios. | `scripts/graphify.mjs` |
| graph.json inválido: nó sem id. | `scripts/graphify.mjs` |
| graph.json inválido: source_file fora da raiz (${node.source_file}). | `scripts/graphify.mjs` |
| metadados do mapa de banco não conferem | `scripts/graphify.mjs` |
| URL do deployment Vercel ausente. | `scripts/normalize-vercel-deployment-url.mjs` |
| URL do deployment Vercel fora do domínio ou formato permitido. | `scripts/normalize-vercel-deployment-url.mjs` |
| URL do deployment Vercel inválida. | `scripts/normalize-vercel-deployment-url.mjs` |
| Uso: node scripts/normalize-vercel-deployment-url.mjs <url-ou-hostname> (exatamente um argumento). | `scripts/normalize-vercel-deployment-url.mjs` |
| ${lastError?.message \|\|  | `scripts/smoke-deployment.mjs` |
| SMOKE_BASE_URL ausente. | `scripts/smoke-deployment.mjs` |
| SMOKE_BASE_URL deve usar https (ou http em teste local); recebido  | `scripts/smoke-deployment.mjs` |
| SMOKE_BASE_URL inválida: informe a URL completa do deployment, começando por https://. | `scripts/smoke-deployment.mjs` |
| Não foi possível conectar ao Postgres local do Supabase em 127.0.0.1:56322. Suba o stack e recrie o banco antes do soak test: npm run db:site:reset | `scripts/soak-test-notification-queue.mjs` |
| SOAK_FAILURE_RATE deve ser um número entre 0 e 1 (ex.: 0.1 para 10%). | `scripts/soak-test-notification-queue.mjs` |
| SOAK_JOB_COUNT deve ser um inteiro entre 1 e ${MAX_JOB_COUNT}. | `scripts/soak-test-notification-queue.mjs` |
| pré-condição falhou: esperava ${JOB_COUNT} jobs semeados, encontrou ${seeded} | `scripts/soak-test-notification-queue.mjs` |
| psql falhou (código ${error.status ?? error.signal ?? error.code}; a mensagem do banco está acima). | `scripts/soak-test-notification-queue.mjs` |
| psql não encontrado no PATH: instale o cliente do PostgreSQL para rodar o soak test. | `scripts/soak-test-notification-queue.mjs` |
| psql não respondeu em ${PSQL_TIMEOUT_MS / 1000}s e foi interrompido. | `scripts/soak-test-notification-queue.mjs` |
| Não foi possível gravar api/_lib/app-shell.generated.html (${error.code ?? error.message}): execute na raiz do repositório, onde api/_lib existe. | `scripts/stage-app-shell.mjs` |
| Não foi possível ler dist/index.html (${error.code ?? error.message}): rode \ | `scripts/stage-app-shell.mjs` |
| O build não gerou um app shell válido para as funções serverless. | `scripts/stage-app-shell.mjs` |
| ref inválida ( | `scripts/validate-agent-instructions.mjs` |
| Ledger CSV inválido: aspas não fechadas. | `scripts/validate-closure-ledger.mjs` |
| Ledger CSV inválido: cabeçalhos duplicados. | `scripts/validate-closure-ledger.mjs` |
| Ledger CSV inválido: quantidade de colunas divergente no registro ${index + 2} (esperado ${headers.length}, recebido ${values.length}). | `scripts/validate-closure-ledger.mjs` |
| Ledger CSV vazio. | `scripts/validate-closure-ledger.mjs` |
| Ledger inválido: commit auditado ausente ou inválido em ${row.id}. | `scripts/validate-closure-ledger.mjs` |
| Ledger inválido: esperado 230 referências, recebido ${rows.length}. | `scripts/validate-closure-ledger.mjs` |
| Ledger inválido: estado ${row.estado_revisado \|\|  | `scripts/validate-closure-ledger.mjs` |
| Ledger inválido: evidência incompleta em ${row.id}. | `scripts/validate-closure-ledger.mjs` |
| Ledger inválido: fonte ${source} não existe no commit auditado de ${id}. | `scripts/validate-closure-ledger.mjs` |
| Ledger inválido: fonte aponta para fora do projeto em ${row.id}. | `scripts/validate-closure-ledger.mjs` |
| Ledger inválido: fonte ausente ${source} em ${row.id}. | `scripts/validate-closure-ledger.mjs` |
| Ledger inválido: fonte fora do projeto em ${row.id}. | `scripts/validate-closure-ledger.mjs` |
| Ledger inválido: id ${row.id \|\|  | `scripts/validate-closure-ledger.mjs` |
| Ledger inválido: id duplicado ${row.id}. | `scripts/validate-closure-ledger.mjs` |
| Ledger inválido: id fora dos planos ${row.id}. | `scripts/validate-closure-ledger.mjs` |
| Ledger não verificável: git não encontrado no PATH; o validador confere cada fonte no commit auditado. | `scripts/validate-closure-ledger.mjs` |
| Nenhuma migration .sql encontrada em ${migrationsDir} — nada foi verificado. | `scripts/validate-error-catalog.mjs` |
| ${relativePath} não é um JSON válido: ${error.message} | `scripts/verify-vercel-artifact.mjs` |
| A função ${name}, que exige o app shell, não foi encontrada no artefato Vercel. | `scripts/verify-vercel-artifact.mjs` |
| Diretório ${functionsRoot}/ ausente no artefato. ${buildHint} | `scripts/verify-vercel-artifact.mjs` |
| Nenhuma função declarou ${expected} em vercel.json. | `scripts/verify-vercel-artifact.mjs` |
| Nenhuma função encontrada em .vercel/output/functions/api/ | `scripts/verify-vercel-artifact.mjs` |
| Não foi possível ler ${relativePath} (${error.code ?? error.message}). ${hint} | `scripts/verify-vercel-artifact.mjs` |
| O app shell das funções diverge do HTML publicado estaticamente. | `scripts/verify-vercel-artifact.mjs` |
| O app shell não foi incluído no artefato da função ${name}. | `scripts/verify-vercel-artifact.mjs` |
| vercel.json declara ${expected} pelo padrão  | `scripts/verify-vercel-artifact.mjs` |
| Nenhuma lista de linhas encontrada na saída do supabase CLI: ${shown} | `scripts/_lib/supabaseDbQuery.mjs` |
| runSupabaseDbQuery: SQL vazio. | `scripts/_lib/supabaseDbQuery.mjs` |
| runSupabaseDbQuery: o SQL não pode começar com  | `scripts/_lib/supabaseDbQuery.mjs` |
| ${msg}: esperado ${JSON.stringify(b)} obtido ${JSON.stringify(a)} | `scripts/ai-context/cenarios.mjs` |
| Management API ${caminho}: ${falha} em ${TENTATIVAS} tentativas | `scripts/inventario/gerar-banco.mjs` |
| SUPABASE_ACCESS_TOKEN ausente. | `scripts/inventario/gerar-banco.mjs` |
| SUPABASE_ACCESS_TOKEN tem espaco, quebra de linha ou caractere fora do ASCII no meio; confira o secret. | `scripts/inventario/gerar-banco.mjs` |
| SUPABASE_API_URL aponta para ${url.host}: o token so e enviado a api.supabase.com ou a um servidor local de teste. | `scripts/inventario/gerar-banco.mjs` |
| SUPABASE_API_URL nao e uma URL valida. | `scripts/inventario/gerar-banco.mjs` |
| SUPABASE_PROJECT_REF nao tem formato de ref do Supabase (20 letras minusculas ou digitos). | `scripts/inventario/gerar-banco.mjs` |
| SUPABASE_PROJECT_REF=${PROJETO_CATALOGO_CANONICO} e o catalogo canonico (somente leitura, sem migrations deste repo). | `scripts/inventario/gerar-banco.mjs` |
| SUPABASE_PROJECT_REF=${ref} nao e o banco do site (${PROJETO_SITE}). | `scripts/inventario/gerar-banco.mjs` |
| a consulta rodou com um papel sujeito a RLS em ${sobRls} relacao(oes): contagens e filas  | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao parece ser do banco do site: ${comuns} de ${esperadas.size} tabelas das  | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao parece ser do banco do site: ledger com ${registros} registros e maior versao ${max};  | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao parece ser do banco do site: o banco consultado nao tem ledger de migrations  | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao traz resumo.ledger_versao_max/ledger_registros; rode o banco.sql atual. | `scripts/inventario/gerar-banco.mjs` |
| a saida tem algo com cara de credencial; nada foi gravado. Revise banco.sql. | `scripts/inventario/gerar-banco.mjs` |
| argumento desconhecido: ${argv[i]} (use --help) | `scripts/inventario/gerar-banco.mjs` |
| entrada com secao faltando ou malformada: ${ruim.join( | `scripts/inventario/gerar-banco.mjs` |
| entrada nao e JSON valido (esperado a resposta do banco.sql:  | `scripts/inventario/gerar-banco.mjs` |
| entrada sem as chaves: ${faltando.join( | `scripts/inventario/gerar-banco.mjs` |
| entrada sem tabelas | `scripts/inventario/gerar-banco.mjs` |
| envelope MCP inesperado: content[0] sem campo  | `scripts/inventario/gerar-banco.mjs` |
| format_version ${dado.format_version} desconhecido (esperado 1) | `scripts/inventario/gerar-banco.mjs` |
| sem --entrada e sem SUPABASE_ACCESS_TOKEN: nada para ler (veja o cabecalho do script). | `scripts/inventario/gerar-banco.mjs` |
| nao consegui rodar o git para ler HEAD:${noRepo} (${error.code ?? error.message}) | `scripts/inventario/mudou-conteudo.mjs` |
| Erro do toast | `scripts/regras_negocio/test_generate.py` |
| Falha ao salvar o item | `scripts/regras_negocio/test_generate.py` |
| Outra falha aqui | `scripts/regras_negocio/test_generate.py` |
| O teste offline não permite consultas ao banco | `scripts/supabase_snapshot/test_snapshot.py` |
| banco indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| catálogo indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| disco cheio na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| permission denied | `scripts/supabase_snapshot/test_snapshot.py` |
| permission denied for schema auth | `scripts/supabase_snapshot/test_snapshot.py` |
| permission denied for schema storage | `scripts/supabase_snapshot/test_snapshot.py` |
| relation  | `scripts/supabase_snapshot/test_snapshot.py` |
| statement timeout simulado | `scripts/supabase_snapshot/test_snapshot.py` |
| view removida depois da consulta ao catálogo | `scripts/supabase_snapshot/test_snapshot.py` |
| view sem permissão na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| Elemento #root não encontrado. | `src/main.tsx` |
| Etapa de briefing inválida. | `src/components/CampaignFinder.tsx` |
| legacy_link_too_large | `src/components/QuoteDrawer.tsx` |
| not_revoked | `src/components/QuoteDrawer.tsx` |
| Site Supabase client unavailable during auth initialization | `src/context/CustomerAuthContext.tsx` |
| useCustomerAuth must be used inside CustomerAuthProvider | `src/context/customerAuth.ts` |
| useQuoteCart precisa estar dentro de QuoteCartProvider. | `src/context/quoteCart.ts` |
| Entre na sua conta para enviar arquivos. | `src/lib/briefingAssets.ts` |
| Este arquivo já faz parte de um briefing e não pode ser removido por aqui. | `src/lib/briefingAssets.ts` |
| Não foi possível transferir o arquivo. Ele não foi anexado. | `src/lib/briefingAssets.ts` |
| O arquivo não recebeu um identificador válido. | `src/lib/briefingAssets.ts` |
| Sua sessão expirou. Entre novamente. | `src/lib/briefingAssets.ts` |
| Não foi possível consultar o catálogo. | `src/lib/catalog.ts` |
| O catálogo demorou além do esperado. Tente novamente. | `src/lib/catalog.ts` |
| Agenda de datas comemorativas indisponível. | `src/lib/commemorativeDates.ts` |
| adjustment_message_required | `src/lib/customerAccount.ts` |
| customer_area_not_configured | `src/lib/customerAccount.ts` |
| customer_area_unavailable | `src/lib/customerAccount.ts` |
| quote_not_found | `src/lib/customerAccount.ts` |
| customer_area_not_configured | `src/lib/customerOccasionFavorites.ts` |
| invalid_occasion_id | `src/lib/customerOccasionFavorites.ts` |
| occasion_favorite_limit_reached | `src/lib/customerOccasionFavorites.ts` |
| occasion_favorites_unavailable | `src/lib/customerOccasionFavorites.ts` |
| invalid_customer_quote_response | `src/lib/customerQuoteContract.ts` |
| customer_area_not_configured | `src/lib/customerSelections.ts` |
| selection_catalog_changed | `src/lib/customerSelections.ts` |
| selection_limit_reached | `src/lib/customerSelections.ts` |
| selection_version_conflict | `src/lib/customerSelections.ts` |
| Não conseguimos conectar ao serviço de envio. Verifique sua conexão e tente novamente. | `src/lib/http.ts` |
| O endpoint de ${label} precisa ser uma URL HTTPS válida. | `src/lib/http.ts` |
| O envio demorou além do esperado. Tente novamente. | `src/lib/http.ts` |
| O envio foi cancelado. | `src/lib/http.ts` |
| O serviço não confirmou um protocolo válido. Sua seleção foi preservada. | `src/lib/http.ts` |
| A seleção contém itens inválidos, repetidos ou uma composição inválida. Revise antes de continuar. | `src/lib/quoteItems.ts` |
| A seleção contém uma referência de produto inválida. | `src/lib/sharedSelection.ts` |
| Este dispositivo não possui a chave para revogar o link. | `src/lib/sharedSelection.ts` |
| Não há referências válidas para compartilhar. | `src/lib/sharedSelection.ts` |
| O serviço não confirmou um link válido. | `src/lib/sharedSelection.ts` |
| stale_favorite_session | `src/lib/useOccasionFavorites.ts` |

## J. Controle de acesso no código (checagens de perfil/permissão)

| Valor comparado | Arquivo |
|---|---|
| `anon` | `api/sitemap.ts` |
| `anon` | `api/_lib/publicProductPage.ts` |
| `anon` | `src/lib/catalog.ts` |
| `anon` | `src/lib/siteSupabaseConfig.ts` |

## K. Testes como especificação (1499 testes em 122 arquivos — nomes completos em `context.json`)

| Arquivo | Testes | Exemplos do que o sistema DEVE fazer |
|---|---|---|
| `site-supabase/supabase/tests/database/lead_storage.test.sql` | 68 | schema privado contém as vinte e uma tabelas planejadas, incluindo favoritos de datas sem PII · seleções persistentes ficam no schema privado · criação de links recebe rate limit próprio · máquina de estados administrativa vive em tabela dedicada (Etapa 8) … |
| `tests/inventario-estado.node.mjs` | 63 | extrairInventario aceita objeto direto, envelope do PostgREST e envelope do MCP · extrairInventario recusa entrada sem as chaves obrigatórias, sem tabelas ou de outra versão · conferirOrigem aprova a resposta que cobre as tabelas das migrations e o ledger · conferirOrigem recusa um banco irmão: as tabelas das migrations não estão lá … |
| `site-supabase/supabase/tests/database/briefing_assets.test.sql` | 57 | metadados privados de arquivos existem · assinatura binária possui recibo de verificação · fila de exclusão de Storage existe · bucket é privado e limitado a 10 MB … |
| `e2e/smoke.spec.ts` | 56 | headline principal usa Fold Text sem perder acessibilidade · categorias usam fotografia de produto publicado como ponto de descoberta · rotas públicas essenciais não introduzem violações automáticas de acessibilidade · montador de kits preserva componentes e calcula a quantidade completa … |
| `site-supabase/supabase/tests/database/notification_outbox.test.sql` | 47 | fila possui agenda de nova tentativa · fila identifica a reivindicação ativa (R04) · novo orçamento alimenta a fila na mesma transação · anon não reivindica notificações … |
| `site-supabase/supabase/tests/database/customer_portal.test.sql` | 41 | orçamento possui titular autenticado opcional · perfil do cliente existe no schema privado · linha do tempo existe no schema privado · metadados de propostas existem no schema privado … |
| `site-supabase/supabase/tests/database/notification_delivery_status_machine.test.sql` | 40 | pending -> pending (no-op) · pending -> processing · pending -> sent (rejeitado: pula processing) · pending -> failed (rejeitado: pula processing) … |
| `tests/api/lead-requests.test.ts` | 36 | APIs de leads isoladas · registra contato normalizado pelo RPC server-side · rejeita resposta malformada do banco: %s · persiste orçamento e devolve 200 em repetição idempotente … |
| `tests/graphify-tools.node.mjs` | 31 | path encontra menor caminho, identidade e nós desconectados sem inventar relações · explain preserva fonte e confiança e identifica conexões de entrada · nomes ambíguos e símbolos ausentes não escolhem um resultado arbitrário · fingerprint muda ao mudar conteúdo e preserva ordem determinística … |
| `site-supabase/supabase/tests/database/notification_provider_events.test.sql` | 30 | entrega ganha estado terminal pós-aceite (Etapa 30) · devolução guarda a categoria curta do provedor · reclamação é rastreada independentemente da entrega · deduplicação de eventos de webhook fica em tabela própria … |
| `site-supabase/supabase/tests/database/customer_data_erasure.test.sql` | 28 | anon não apaga dados de titular · authenticated não apaga dados de titular (operação administrativa) · service_role executa o apagamento · anonimiza 1 quote_request (e-mail com espaço/maiúsculas normalizado na entrada) … |
| `tests/validate-agent-instructions.node.mjs` | 28 | aceita AGENTS.md com todas as seções obrigatórias · acusa seção obrigatória apagada por outra sessão · ${CLAUDE_FILE} precisa ser exatamente o import do ${AGENTS_FILE} · acusa referência quebrada e referência órfã em docs/agentes … |
| `tests/api/notifications.test.ts` | 27 | worker de comprovantes do orçamento · recusa chamada sem o segredo agendado · não reivindica a fila enquanto nenhum provedor estiver configurado · Preview não envia mensagens reais mesmo se herdar credenciais dos provedores … |
| `site-supabase/supabase/tests/database/customer_selections.test.sql` | 26 | seleções privadas por titular existem · RLS é forçada na tabela · cliente não acessa o schema privado · cliente não consulta tabela diretamente … |
| `src/lib/useOccasionFavorites.test.tsx` | 25 | useOccasionFavorites · preserva uma adição confirmada quando uma leitura iniciada antes dela retorna vazia · preserva uma remoção enquanto uma leitura antiga ainda contém o favorito · não deixa uma leitura antiga apagar a escrita anterior quando a intenção seguinte falha … |
| `tests/catalog-public-contract.node.mjs` | 25 | aceita somente o contrato público exato de 36 colunas · falha se uma coluna esperada sumir ou uma coluna nova aparecer · falha explicitamente se preço, estoque ou fornecedor forem expostos · recusa identificador, arrays e swatches incompatíveis … |
| `src/lib/catalog.test.ts` | 24 | catálogo público · normaliza apenas os dados necessários para a experiência do cliente · marca como novidade um produto dentro da janela canônica mesmo sem flag explícita · não confirma personalização quando o dado público ainda é desconhecido … |
| `site-supabase/supabase/tests/database/customer_occasion_favorites.test.sql` | 22 | favoritos de datas existem no schema privado · RLS é forçada nos favoritos de datas · cliente não recebe uso do schema privado · cliente não lê a tabela diretamente … |
| `site-supabase/supabase/tests/database/lead_preflight_rate_limit.test.sql` | 20 | preflight distribuído existe · anon não executa preflight · authenticated não executa preflight · service_role executa preflight … |
| `site-supabase/supabase/tests/database/notification_queue_policy.test.sql` | 20 | política: 5 tentativas máximas · política: lote máximo de 25 · política: lease de 10 minutos · anon não lê a política … |
| `tests/supabase-db-query.node.mjs` | 20 | extrai de objeto { · extrai de array top-level sem wrapper (formato observado no CI) · ignora banner de conexão (texto solto) antes do JSON · ignora banner de conexão antes de um array top-level … |
| `site-supabase/supabase/tests/database/status_state_machine.test.sql` | 19 | eventos têm coluna de ordem monotônica · sequence é única (identity) · sequence preserva a ordem de inserção independentemente de created_at · tabela de transições existe … |
| `src/context/QuoteCartContext.test.ts` | 19 | seleção para orçamento · adiciona e mantém uma linha por produto e cor · respeita a quantidade mínima do item · limita quantidades acidentalmente excessivas … |
| `tests/validate-migration-names.node.mjs` | 18 | aceita nomes de 14 dígitos em ordem estritamente crescente · rejeita o formato antigo com underscore no timestamp (regressão do incidente de 15/09) · rejeita data de calendário inválida · rejeita versão duplicada dentro do mesmo diretório … |
| `tests/api/notification-events-whatsapp.test.ts` | 18 | api/notification-events-whatsapp (Etapa 30) · rejeita método diferente de GET/POST · handshake GET · responde 503 quando o token de verificação não está configurado … |
| `site-supabase/supabase/tests/database/quote_protocol.test.sql` | 17 | dígito verificador de 26000001 é determinístico e conhecido (conferido manualmente) · mod11_check_digit é determinística: mesma entrada, mesma saída · entradas diferentes tendem a produzir dígitos diferentes (não uma prova geral, só o par de teste) · soma zero cai no ramo remainder<2 e retorna 0 … |
| `site-supabase/supabase/tests/database/selection_asset_integrity.test.sql` | 17 | leitura limitada recebe hash do solicitante · revogação limitada recebe hash do solicitante · site_api usa leitura limitada · anônimo não chama leitura limitada diretamente … |
| `site-supabase/supabase/tests/database/site_api_privileges.test.sql` | 17 | anon continua sem create_site_quote_request · authenticated continua sem create_site_quote_request · site_api não tem acesso a customer_profiles (fora do escopo das 13 RPCs) · site_api não insere proposal_documents (isso é fluxo administrativo) … |
| `tests/smoke-deployment.node.mjs` | 17 | aprova um deployment saudável consultando cada rota uma única vez · reprova status inesperado sem repetir a rota · reprova header de segurança ausente ou divergente em qualquer rota HTML · reprova corpo errado no sitemap e content-type errado no Analytics … |
| `tests/api/maxDuration.test.ts` | 15 | Etapa 24: maxDuration em vercel.json cobre o pior caso real de cada rota · api/quote-requests.ts: catalogValidation + siteDatabase + confirmação (canais em paralelo) · api/contact-requests.ts: apenas siteDatabase (sem catalogValidation nem confirmação) · api/notification-events-resend.ts (Etapa 30): apenas uma chamada de RPC (callSiteRpc) … |
| `src/lib/sharedSelection.test.ts` | 14 | sharedSelection · preserva prioridade alternativa no link e na seleção reconstruída · preserva cor sem variantId e bloqueia fallback ambíguo ou removido · aceita nomes Unicode e mantém links Latin-1 antigos legíveis … |
| `tests/api/notification-events-resend.test.ts` | 14 | api/notification-events-resend (Etapa 30) · rejeita método diferente de POST · responde 503 quando o segredo do webhook não está configurado · rejeita assinatura ausente ou inválida sem chamar o banco … |
| `tests/scripts/verify-vercel-artifact.test.ts` | 14 | verificador do artefato Vercel · exige o app shell somente das funções de página declaradas em vercel.json · aceita includeFiles como lista sem perder o contrato do app shell · falha quando uma função de página declarada não existe no artefato … |
| `site-supabase/supabase/tests/database/kit_composition.test.sql` | 13 | item preserva o grupo do kit · item preserva o nome do kit · item preserva a quantidade de kits · item preserva unidades por kit … |
| `tests/closure-ledger.node.mjs` | 13 | ledger atual contém todos os IDs, commits e fontes locais · não aceita trocar uma referência por um ID inexistente mantendo o total · fontes inexistentes e caminhos fora do site não passam como evidência · fonte atual que não existia no commit auditado não passa como evidência histórica … |
| `tests/session-start-hook.node.mjs` | 13 | hook: fora da sessão remota sai com 0 sem saída e sem criar nada · hook: grafo já carimbado no commit atual responde async e não instala nem gera · hook: grafo de outro commit dispara o build e carimba o commit novo · hook: carimbo sem o mapa de banco não conta como grafo pronto … |
| `tests/api/retention.test.ts` | 13 | tarefa de retenção · recusa chamadas sem o segredo da tarefa agendada · remove blobs pela Storage API e finaliza somente os metadados confirmados · usa a role limitada para RPC e a chave de Storage separada ao migrar a autenticação … |
| `tests/api/webhookSignature.test.ts` | 13 | verifySvixSignature (Etapa 30, Resend) · aceita uma assinatura válida · aceita quando o header traz múltiplas assinaturas e uma delas bate (rotação de segredo) · rejeita corpo adulterado … |
| `site-supabase/supabase/tests/database/admin_write_audit.test.sql` | 12 | anon não lê a trilha de auditoria · authenticated não lê a trilha de auditoria · site_api não lê a própria trilha de auditoria (não precisa para operar) · service_role lê a trilha de auditoria … |
| `site-supabase/supabase/tests/database/kit_persistence_guards.test.sql` | 12 | guarda estrutural de kits existe no schema privado · rascunho valida kits no insert · rascunho valida kits no update · link compartilhado valida kits no insert … |
| `tests/api/briefing-assets.test.ts` | 12 | inspeção server-side de anexos privados · confirma um PNG somente depois de ler a assinatura no Storage privado · remove blob e metadado pelo caminho server-side quando o conteúdo contradiz o MIME declarado · descarta uma reserva PDF legada sem sequer interpretar o conteúdo … |
| `site-supabase/supabase/tests/database/adjustment_limits.test.sql` | 11 | limite de pendências serializa transações concorrentes no mesmo orçamento · primeiro pedido é criado · replay idempotente devolve o mesmo pedido · replay não duplica a linha … |
| `site-supabase/supabase/tests/database/query_plans.test.sql` | 11 | consulta de reivindicação da fila não usa Seq Scan em notification_deliveries com distribuição de regime permanente (Etapa 17) · recuperação de leases expiradas usa acesso indexado · reconciliação de webhook pelo identificador do provedor usa acesso indexado · histórico do cliente usa acesso indexado por titular e data … |
| `tests/ci-health-metrics.node.mjs` | 11 | não contabiliza cancelamento, timeout ou execução pendente como sucesso · separa conclusões neutras e ignoradas do denominador terminal · amostra sem conclusão terminal permanece inconclusiva · taxas arredondadas continuam somando exatamente 100 … |
| `tests/validate-error-catalog.node.mjs` | 11 | extrai mensagens literais (message = \ · extrai o prefixo de mensagens via format() (message = format(\ · ignora texto solto que não segue nenhum dos dois padrões (acentos/espaços quebram o casamento) · acusa mensagem de migration que não está no catálogo … |
| `site-supabase/supabase/tests/database/notification_dispatch_uncertainty.test.sql` | 10 | anon não marca intenção de disparo · worker limitado pode marcar a intenção antes de chamar a Meta · orçamento com opt-in WhatsApp é criado · worker reivindica o WhatsApp … |
| `src/components/ProductDescription.test.tsx` | 10 | descrição compacta e segura do produto · preserva texto curto sem exigir expansão · usa o resumo editorial no estado compacto e revela a descrição integral · limita um resumo longo antes de revelar a descrição integral … |
| `src/lib/search.test.ts` | 10 | busca assistida · normaliza acentos, caixa e espaços sem transportar operadores · expande sinônimos como alternativas da mesma dimensão · descarta linguagem de preço e contexto quando há um objeto pesquisável … |
| `tests/generate-site-api-jwt.node.mjs` | 10 | falha com mensagem clara quando SITE_SUPABASE_JWT_SECRET não está definido · gera um JWT HS256 válido com role:site_api, verificável com o mesmo segredo (nunca um segredo real: fixture de teste) · permite TTL explícito apenas dentro do teto operacional de 90 dias · segredos diferentes produzem assinaturas diferentes para o mesmo payload (não é uma constante disfarçada) … |
| `tests/api/shared-selections.test.ts` | 10 | links persistentes de seleção · cria link opaco, sem dados de produto ou contato no banco público · preserva a composição do kit e rejeita aritmética adulterada · preserva alternativas no envio e na leitura, sem incluir campos privados … |
| `site-supabase/supabase/tests/database/email_normalization.test.sql` | 9 | normalize_email tira espaços e baixa a caixa · valor já normalizado permanece idêntico (idempotente) · quote_requests rejeita e-mail com maiúsculas não normalizado · quote_requests rejeita e-mail com espaço não normalizado … |
| `src/lib/catalogLibrary.test.ts` | 9 | biblioteca de catálogos · combina tema e busca sem depender de acentos · não inventa resultados quando os termos não aparecem juntos · usa o nome atual em links novos e mantém links antigos da coleção … |
| `src/lib/http.test.ts` | 9 | transporte dos formulários · recusa endpoint malformado antes de chamar fetch · envia JSON com chave de idempotência apenas para a API do site · aceita rota server-side de mesma origem sem expor outro host … |
| `tests/check-performance-budget.node.mjs` | 9 | aprova um dist coerente e imprime o resumo em uma linha de stdout · é determinístico e funciona em caminho com espaço e acento · mede a entrada declarada no manifest mesmo quando ela não se chama index-* · não confunde um chunk lazy chamado index-* com a entrada … |
| `tests/generate-database-docs.node.mjs` | 9 | ida e volta: com as mesmas linhas do banco, o dicionário gerado é idêntico ao versionado · ida e volta: com as mesmas linhas do banco, o ERD gerado é idêntico ao versionado · gerar duas vezes produz o mesmo arquivo e a data vem da migration mais recente, não do relógio · comentário com quebra de linha ou barra vertical não parte a tabela Markdown … |
| `tests/normalize-vercel-deployment-url.node.mjs` | 9 | adiciona https somente quando a CLI devolve hostname · preserva URL https já completa sem duplicar o protocolo · recusa protocolo, credencial, porta, caminho e domínio inesperados · CLI imprime exatamente uma origem normalizada … |
| `tests/stage-app-shell.node.mjs` | 9 | copia o HTML do build byte a byte e não deixa arquivo temporário · aceita as variações de marcação que a função serverless aceita · reprova build sem root ou sem script de /assets e não grava o destino · reprova página de proteção da Vercel, que a função recusaria com 503 … |
| `e2e/product-detail.spec.ts` | 8 | ficha compacta reúne seleção e especificações ao lado da galeria no desktop · galeria permite todas as fotos, volta ao início e amplia com foco contido · descrição completa formata marcadores sem perder conteúdo nem esconder especificações · cor e quantidade seguem para o orçamento, sem preço ou bloqueio por estoque … |
| `tests/inventario-banco-sql.node.mjs` | 8 | banco.sql roda inteiro em transação somente leitura e passa na prova de origem · banco.sql: a transação somente leitura barra escrita, e a consulta não muda nada no banco · banco.sql: fila travada conta só o que ainda vai ser tentado; erro sai como código, nunca como texto · banco.sql: pg_cron sai com nome estável, só o nome das funções chamadas e as contas certas … |
| `tests/validate-site-supabase-target.node.mjs` | 8 | aprova somente o projeto isolado do site, com código 0 e o ref em stdout · independe do diretório de onde é chamado · bloqueia o catálogo canônico e diz como refazer o vínculo · bloqueia qualquer conteúdo que não seja exatamente o ref do site … |
| `tests/api/customer-proposals.test.ts` | 8 | download autenticado de propostas · assina por 60 segundos somente o documento autorizado pelo RPC · usa o JWT limitado no RPC e a credencial de Storage somente para a assinatura · rejeita origem, sessão e identificador inválidos antes do banco … |
| `tests/api/sitemap.test.ts` | 8 | sitemap público · nunca ultrapassa 50 mil URLs incluindo páginas estáticas · mantém o ano das datas no fuso editorial durante a virada UTC · prioriza o host público configurado e remove a barra final … |
| `site-supabase/supabase/tests/database/default_privileges.test.sql` | 7 | anon não recebe nenhum privilégio implícito em futura tabela pública · authenticated não recebe nenhum privilégio implícito em futura tabela pública · anon não recebe privilégio implícito em futura sequência pública · authenticated não recebe privilégio implícito em futura sequência pública … |
| `site-supabase/supabase/tests/database/storage_tuning.test.sql` | 7 | rate_limit_buckets é UNLOGGED (Etapa 30) · shared_selection_rate_limits é UNLOGGED (Etapa 30) · notification_deliveries continua persistente (não é efêmera como as tabelas de rate limit) · notification_deliveries tem fillfactor 80 (Etapa 40, espaço para HOT updates) … |
| `src/lib/analytics.test.ts` | 7 | instrumentação segura · remove query string e fragmento antes de enviar pageview · normaliza identificadores da área privada antes do pageview · aplica a mesma minimização de URL aos eventos de desempenho … |
| `src/lib/commemorativeDates.test.ts` | 7 | commemorativeDates · calcula datas móveis brasileiras sem depender do fuso do navegador · mantém todas as ocasiões ordenadas e com identificadores únicos · filtra por mês, público e busca sem exigir acentos … |
| `src/lib/contactRequest.test.ts` | 7 | contato rápido · separa o consentimento do contato e registra sua versão · não transmite query ou fragmento da página de contato · prepara fallback de e-mail sem depender de infraestrutura … |
| `src/lib/kitBuilder.test.ts` | 7 | composição de kits · permite omitir extras, mas exige os dois componentes obrigatórios · recusa estouro de unidades sem degradar o kit para itens avulsos · calcula o mínimo pelo componente mais restritivo … |
| `src/lib/quoteItems.test.ts` | 7 | revalidação de itens históricos · preserva referência removida como bloqueio visível · marca produto removido sem apagá-lo silenciosamente · mantém os marcadores ao normalizar armazenamento local … |
| `src/lib/quoteRequest.test.ts` | 7 | solicitação de orçamento · separa o consentimento do contato e registra versão e instante · gera um e-mail com produtos, quantidade, cor e contato · não transmite um complemento opcional vazio ou manipulado … |
| `src/lib/quoteSubmission.test.ts` | 7 | reconciliação da seleção após o envio · considera inalterada uma seleção recriada por render sem edição · distingue edição de produto ou contexto da seleção enviada · remove somente os snapshots efetivamente enviados … |
| `tests/soak-test-notification-queue.node.mjs` | 7 | percentile usa o método nearest-rank e devolve null para lista vazia · parseSoakConfig aplica os padrões e recusa valores fora do contrato · isTerminalDelivery reconhece sent, exhausted e failed com tentativas esgotadas · drena a fila sem falhas, só fala com o banco local e escreve o relatório com os padrões reais … |
| `tests/api/product-page.test.ts` | 7 | HTML inicial de fichas de produto · escapa conteúdo de catálogo no head e no JSON-LD · entrega produto com metadados específicos e schema sem virar checkout · responde 404 e noindex para um identificador inválido sem consultar o catálogo … |
| `tests/api/site-page.test.ts` | 7 | HTML inicial das páginas estáticas · entrega metadados específicos para catálogo e não indexa o detalhe privado · preserva 404 real para uma landing editorial desconhecida · publica o montador de kits com rewrite e metadados indexáveis próprios … |
| `src/context/CustomerAuthContext.test.tsx` | 6 | inicialização da autenticação do cliente · sai do carregamento infinito, informa a falha e permite tentar novamente · trata o erro retornado pelo SDK mesmo quando a Promise é resolvida · não apaga a falha quando INITIAL_SESSION chega vazio após getSession falhar … |
| `src/lib/campaignPresets.test.ts` | 6 | ache pelo briefing · gera URL compartilhável somente com escolhas válidas · expõe escolhas como contexto removível sem duplicar critérios ocultos · traduz apenas sinais confiáveis para o contrato público … |
| `src/lib/catalogFilters.test.ts` | 6 | estado do superfiltro público · apresenta o perfil de novidades como Tendências · aceita apenas IDs conhecidos e remove repetições da URL · traduz IDs amigáveis para as grafias existentes no catálogo … |
| `src/lib/catalogRanking.test.ts` | 6 | catalog ranking · prioriza intenção pesquisada sem usar preço ou estoque · intercala famílias equivalentes nos primeiros resultados · considera somente atributos publicados ao responder a um briefing … |
| `src/lib/customerOccasionFavorites.test.ts` | 6 | favoritos de datas na conta · lê apenas IDs editoriais e elimina duplicidades · normaliza a escrita e exige confirmação idempotente do servidor · rejeita payloads e identificadores que não podem representar uma data editorial … |
| `src/lib/customerSelections.test.ts` | 6 | seleções privadas da conta · envia somente referências públicas e preserva o grupo alternativo · preserva o nome da cor quando o catálogo não fornece variantId · lista, cria e atualiza usando a versão recebida do servidor … |
| `src/lib/quoteBriefing.test.ts` | 6 | contexto opcional do briefing · preserva apenas escolhas reconhecidas e texto limitado · descarta briefing vazio ou valores manipulados · gera um resumo humano para e-mail e área do cliente … |
| `site-supabase/supabase/tests/database/shared_selection_priorities.test.sql` | 5 | criar e ler preserva prioridade alternativa · referência sem prioridade continua compatível como principal · recusa prioridade desconhecida · recusa null explícito … |
| `src/components/BriefingAssetUploader.test.tsx` | 5 | privacidade de anexos durante troca de sessão · ignora upload da sessão anterior após %s · mantém o upload da sessão atual disponível para selecionar · não restaura anexos da sessão anterior após renovar a mesma conta … |
| `src/components/SavedSelections.test.tsx` | 5 | seleções salvas na Área do Cliente · mostra as seleções sem copiar automaticamente o carrinho para a conta · exige confirmação antes de substituir o carrinho e preserva a seleção ao cancelar · compara conflito entre dispositivos e permite preservar as duas versões … |
| `src/lib/customerAccount.rpc.test.ts` | 5 | RPCs da Área do Cliente · aceita somente o contrato de leitura esperado para o histórico · não mascara JSON malformado como um histórico vazio · rejeita detalhe e confirmação de ajuste com identificadores ou datas inválidas … |
| `src/lib/customerAccount.test.ts` | 5 | contrato da Área do Cliente · traduz somente estados operacionais reais · aceita retorno apenas para dentro da Área do Cliente · distingue a versão mais recente de uma proposta ainda válida … |
| `src/pages/AuthConfirmPage.test.tsx` | 5 | confirmação de acesso do cliente · não anuncia identidade verificada enquanto a sessão ainda está carregando · expõe uma recuperação real quando a inicialização falha · só anuncia a identidade depois de receber um usuário autenticado … |
| `src/pages/CommemorativeDatesPage.test.tsx` | 5 | favoritos de datas comemorativas por titular · promove favoritos anônimos depois do login sem perdê-los · não exibe cache da conta anterior se o carregamento da nova conta falhar · ignora rollback tardio de uma mutação da conta anterior … |
| `tests/api/catalog-validation.test.ts` | 5 | reconcileQuoteItems · reconcilia a cor legada pelo nome e a converte para o ID canônico publicado · não aceita uma cor legada que não está mais publicada · reconcilia swatch público sem variant_id por nome inequívoco … |
| `tests/scripts/release-workflow.test.ts` | 5 | workflow de release Vercel · valida Web Analytics no candidato sem chamar endpoint privado de configuração · faz smoke do candidato antes de promover e mantém rollback pós-promoção · sincroniza, verifica e testa o alias git-main depois da promoção … |
| `src/components/CampaignFinder.test.tsx` | 4 | resumo editável do briefing · resume as quatro respostas antes de abrir a curadoria · remove só a escolha solicitada e volta à etapa correspondente · permite revisar todas as respostas sem apagar o que já foi escolhido |
| `src/lib/briefingAssets.test.ts` | 4 | arquivos privados do briefing · aceita somente os formatos publicados dentro de 10 MB · recusa arquivos vazios e nomes maiores que o contrato do banco · revoga o metadado e delega a remoção física à fila protegida |
| `src/lib/customerQuoteContract.test.ts` | 4 | contrato runtime do histórico de orçamentos · aceita o formato público da RPC e remove somente imagens opcionais inseguras · rejeita status, identificadores e quantidades fora do contrato em vez de renderizar JSON arbitrário · mantém campanha e briefing legados opacos até a normalização de consumo, sem relaxar o snapshot de produtos |
| `src/lib/productBadges.test.ts` | 4 | badges de produto · replica a janela de 30 dias do Promo Gifts sem aceitar datas futuras · prioriza is_kit e usa categoria ou prefixo somente como fallback legado · resolve exatamente um badge na ordem Novidade, Kit e Sua marca aqui |
| `src/lib/quoteConfirmation.test.ts` | 4 | confirmação honesta do orçamento · usa apenas o primeiro nome informado e flexiona produto no singular · mantém uma mensagem neutra quando não há nome e flexiona no plural · não apresenta uma confirmação pendente ou não solicitada como enviada |
| `src/lib/scrollRestoration.test.ts` | 4 | restauração de rolagem · aguarda uma rota assíncrona crescer antes de concluir a posição salva · para no limite de tempo quando a página não alcança a altura anterior · cancela frames pendentes quando a rota muda ou a pessoa interage |
| `src/lib/siteRpc.test.ts` | 4 | deadline das RPCs do site · aborta a consulta no deadline padrão · propaga o aborto externo para a consulta · limpa o timer quando a consulta termina |
| `src/lib/siteSupabase.test.ts` | 4 | configuração pública da Área do Cliente · aceita somente o projeto Supabase isolado do site · recusa secret key no bundle e aceita somente chave pública · em Preview recusa o banco de produção e o banco interno, inclusive sem configuração explícita |
| `site-supabase/supabase/tests/database/force_rls_hygiene.test.sql` | 3 | toda tabela de site_private tem row level security habilitada (rowsecurity) · toda tabela de site_private tem row level security FORÇADA (Etapa 26) — nem o dono bypassa sem bypassrls explícito · nenhuma tabela de site_private concede select/insert/update/delete a public, anon ou authenticated |
| `site-supabase/supabase/tests/database/site_api_timeouts.test.sql` | 3 | site_api tem statement_timeout de 8s · site_api tem lock_timeout de 2s · site_api tem idle_in_transaction_session_timeout de 10s |
| `src/components/SearchAutocomplete.test.tsx` | 3 | SearchAutocomplete · nomeia o landmark de busca %s de forma única · remove a opção ativa do leitor de tela quando o campo perde foco |
| `src/lib/campaignBrief.test.ts` | 3 | contexto de campanha · transforma uma data comemorativa em URL de catálogo sem perder o contexto · recusa dados de ocasião manipulados antes de gravá-los na seleção |
| `src/lib/catalogComparison.test.ts` | 3 | comparação persistente · remove dados inválidos, duplicados e respeita o limite de três produtos · salva identificadores estáveis junto de um retrato local para sobreviver à navegação |
| `src/lib/clientObservability.test.ts` | 3 | telemetria de erro da interface · envia apenas classe do erro e pathname, nunca mensagem ou query pessoal · não envia o identificador privado nem rotas arbitrárias ao reportar erros |
| `src/lib/quoteDraft.test.ts` | 3 | rascunho do briefing · mantém o briefing na sessão para a pessoa voltar ao catálogo · remove o rascunho vencido em vez de reapresentar dados pessoais antigos |
| `src/lib/quoteRepeat.test.ts` | 3 | repetição de orçamento · preserva apenas contexto de campanha e briefing por uma janela curta · não restaura briefing do titular anterior após a limpeza de sessão |
| `src/lib/searchRelevance.test.ts` | 3 | baseline editorial de relevância · mantém cobertura integral do corpus versionado · expõe falhas em vez de arredondar a métrica |
| `src/lib/useCatalogPageState.test.tsx` | 3 | useCatalogPageState · preserva a resposta da API quando a ordem explícita é %s · aplica curadoria somente quando ela é a ordem escolhida |
| `src/lib/useInitialSuccessScroll.test.tsx` | 3 | rolagem inicial da confirmação · reposiciona apenas na entrada do sucesso, não em atualizações posteriores · respeita a interação %s antes das tentativas atrasadas |
| `src/pages/QuotePage.test.ts` | 3 | data mínima do briefing · usa o calendário comercial brasileiro em vez de converter o instante para UTC · permanece no dia de São Paulo durante a virada UTC |
| `tests/queue-concurrency.node.mjs` | 3 | duas reivindicações concorrentes da fila obtêm conjuntos disjuntos de jobs · recuperação de lease expirada: duas conexões disputam o MESMO job preso, só uma vence · exhausted sob concorrência: duas conexões terminalizam o mesmo job preso, nenhuma o reivindica como novo |
| `tests/verify-shared-selection-contract.node.mjs` | 3 | o ensaio é transacional, com timeouts, e termina em rollback sem commit · cada RPC é chamada com a aridade definida na migration mais recente · o leitor de argumentos não se confunde com vírgulas e parênteses dentro de chamadas aninhadas e strings |
| `tests/api/campaign-years.test.ts` | 3 | anos editoriais da agenda · usa o calendário de São Paulo mesmo quando UTC já virou o ano · aceita somente o ano corrente e o próximo, normalizando os demais |
| `tests/api/curated-page-previews.test.ts` | 3 | previews das rotas editoriais · mantém todas as coleções públicas sincronizadas com a biblioteca · mantém todas as datas públicas sincronizadas com a agenda |
| `tests/api/operationalAlerts.test.ts` | 3 | alertas operacionais · não abre conexão sem endpoint HTTPS explicitamente configurado · envia somente o envelope técnico ao endpoint HTTPS configurado |
| `site-supabase/supabase/tests/database/function_catalog_hygiene.test.sql` | 2 | nenhuma função pública tem duas assinaturas simultâneas (nenhum drop esquecido numa mudança de assinatura) · idem para site_private |
| `src/components/AppErrorBoundary.test.tsx` | 2 | recuperação global da interface · mostra uma recuperação compreensível quando um componente falha |
| `src/components/CatalogFeedback.test.tsx` | 2 | ProductGridSkeleton · anuncia o carregamento com um papel ARIA compatível |
| `src/components/ConversationForm.test.tsx` | 2 | formulário de conversa · congela os dados enquanto o envio está em andamento para não apagar edições tardias |
| `src/components/QuoteDrawer.test.tsx` | 2 | QuoteDrawer · deixa substituir a quantidade inteira antes de aplicar o mínimo no blur |
| `src/pages/CustomerLoginPage.test.tsx` | 2 | redirects da Área do Cliente · mantém links de autenticação na origem pública canônica |
| `tests/timing-safe-secret-comparisons.node.mjs` | 2 | nenhuma comparação de segredo em api/ usa === fora dos helpers timing-safe estabelecidos · a heurística do teste acima realmente detecta uma comparação insegura (não é sempre-verde) |

## L. Eventos de webhook tratados (contratos com sistemas externos)

| Evento | Arquivo |
|---|---|
| `email.bounced` | `api/notification-events-resend.ts` |
| `email.complained` | `api/notification-events-resend.ts` |
| `email.delivered` | `api/notification-events-resend.ts` |

## M. Efeitos colaterais (e-mail, SMS, cobrança, fila — não são idempotentes por padrão)

| Chamada | Arquivo |
|---|---|
| `sendEmail` | `api/notifications.ts` |
| `sendWhatsApp` | `api/notifications.ts` |

## N. Regras citadas em comentários do código

| Comentário | Arquivo |
|---|---|
| desestruturação); a regra padrão não reconhece essa convenção. | `eslint.config.js` |
| Somente as duas regras de correção de hooks. A v7 do plugin também empacota | `eslint.config.js` |
| Vercel não prefixa VERCEL_ENV com VITE_. Expomos somente o nome do ambiente, | `vite.config.ts` |
| A validação abaixo continua recusando PDF antes de qualquer leitura. | `api/briefing-assets.ts` |
| a leitura de propostas após o corte do privilégio mínimo. | `api/customer-proposals.ts` |
| da entrega e nunca deve competir pelo tempo reservado a ela. | `api/notifications.ts` |
| justifica o limite de 5 tentativas antes de "exhausted" (Etapa 18). | `api/notifications.ts` |
| particular, a string "false" é truthy no JavaScript e não pode jamais | `api/notifications.ts` |
| linha não foi atualizada (lease expirado ou status já mudou) e nunca deve | `api/notifications.ts` |
| provedor; sem esse header, a função usa apenas a política do banco. | `api/notifications.ts` |
| não concluiu a finalização. Não reenvia a mensagem — apenas finaliza. | `api/notifications.ts` |
| chamada. `console.error` funciona como o sinal mínimo (visível em log); | `api/notifications.ts` |
| um e-mail lento não pode consumir o tempo do WhatsApp até zero, como | `api/notifications.ts` |
| Cinquenta referências válidas com variantes e nomes de kit no limite ocupam | `api/shared-selections.ts` |
| * O contrato público pode expor apenas o swatch, sem um ID interno. */ | `api/_lib/catalogValidation.ts` |
| tiver nome. Um objeto sem nenhum identificador não pode ser conciliado. | `api/_lib/catalogValidation.ts` |
| mensagens de negócio: não os esconda atrás de uma falha genérica. | `api/_lib/catalogValidation.ts` |
| bucket de rate limit; fora da Vercel, usamos somente o endereço do socket. | `api/_lib/leadHandler.ts` |
| O caminho alternativo existe somente sob Vitest e aponta para uma | `api/_lib/publicProductPage.ts` |
| Allowlist exata: por definição, o catálogo canônico não pode receber escritas do site. | `api/_lib/siteDatabase.ts` |
| mínimo — ver docs/RUNBOOK_SITE_API_CUTOVER.md) tem prioridade sobre | `api/_lib/siteDatabase.ts` |
| PostgREST. Uma resposta 200 malformada não pode confirmar para Resend ou | `api/_lib/siteDatabase.ts` |
| >> '{contact,deadline}', '')::date, | `site-supabase/supabase/migrations/20260908230000_create_site_lead_storage.sql` |
| >> '{contact,city}', ''), nullif(p_payload #>> '{contact,deadline}', '')::date, nullif(p_payload #>> '{contact,notes}', ''), | `site-supabase/supabase/migrations/20260910120000_preserve_variant_and_contact_preference.sql` |
| >> '{contact,city}', ''), nullif(p_payload #>> '{contact,deadline}', '')::date, nullif(p_payload #>> '{contact,notes}', ''), | `site-supabase/supabase/migrations/20260910140000_preserve_item_decision_group.sql` |
| , housekeeping: attempts já no limite sem nunca ter sido marcado) | `site-supabase/supabase/migrations/20260916220000_add_notification_delivery_status_machine.sql` |
| , housekeeping: lease expirada e attempts no limite) | `site-supabase/supabase/migrations/20260916220000_add_notification_delivery_status_machine.sql` |
| ): CONCURRENTLY não pode coexistir | `site-supabase/supabase/migrations/20260916230000_add_delivery_state_source_event_idx.sql` |
| >> '{contact,city}', ''), nullif(p_payload #>> '{contact,deadline}', '')::date, nullif(p_payload #>> '{contact,notes}', ''), | `site-supabase/supabase/migrations/20260922160000_preserve_kit_composition.sql` |
| capturá-lo aqui é equivalente a lê-lo no cleanup — mas satisfaz a regra, | `src/App.tsx` |
| * A variante referenciada pelo link não está mais publicada; não deve ser enviada sem revisão. */ | `src/types.ts` |
| no coletor registramos apenas classe e rota; o detalhe fica no ambiente | `src/components/AppErrorBoundary.tsx` |
| decorativo: carregá-lo somente depois da pintura remove a biblioteca do | `src/components/FoldText.tsx` |
| excluímos somente os modificadores/targets que o React Router deixa o | `src/components/Layout.tsx` |
| Catálogo é conteúdo externo: apenas texto e negrito, nunca HTML executável. | `src/components/ProductDescription.tsx` |
| Move apenas a faixa de miniaturas, sem puxar a rolagem da página. | `src/components/ProductGallery.tsx` |
| A regra sugere incluir `cart` (não apenas setDrawerOpen, que é estável | `src/components/QuoteDrawer.tsx` |
| Só a rota deve fechar o drawer. | `src/components/QuoteDrawer.tsx` |
| A sugestão automática da regra é incluir o objeto `cart` inteiro. Ele vem | `src/components/QuoteDrawer.tsx` |
| campanha, limite...) — uma nova referência a cada edição de item. Incluí-lo | `src/components/QuoteDrawer.tsx` |
| pessoa e não deve apagar seu rascunho. Depois dela, toda mudança de | `src/context/CustomerAuthContext.tsx` |
| mas a falha não pode desaparecer sem telemetria (Etapa 39). | `src/context/CustomerAuthContext.tsx` |
| Private browsing or a full storage quota must not block the quote journey. | `src/context/QuoteCartContext.tsx` |
| compensatória não deve esconder o erro original do upload. | `src/lib/briefingAssets.ts` |
| A reserva expira automaticamente; esta limpeza é apenas compensatória. | `src/lib/briefingAssets.ts` |
| Browsing in a restricted storage context must not block comparison. | `src/lib/catalogComparison.ts` |
| * Consulta pública usada para uma prévia real, carregada somente quando a capa aparece. */ | `src/lib/catalogLibrary.ts` |
| apenas na busca, sem reaparecer no conteúdo apresentado ao cliente. | `src/lib/catalogLibrary.ts` |
| * Camada determinística de curadoria do cliente. Ela somente reorganiza | `src/lib/catalogRanking.ts` |
| produtos já publicados pela API: não infere preço, estoque, prazo, técnica | `src/lib/catalogRanking.ts` |
| * Envia somente metadados não pessoais para o painel de Analytics da Vercel. */ | `src/lib/clientObservability.ts` |
| Uma leitura remota inválida não deve ser confundida com erro de digitação | `src/lib/customerOccasionFavorites.ts` |
| * Lista somente IDs editoriais; título e descrição continuam no catálogo estático do site. */ | `src/lib/customerOccasionFavorites.ts` |
| consumidor deve normalizá-los antes de usar. Itens, status e identificadores | `src/lib/customerQuoteContract.ts` |
| Um armazenamento indisponível não pode impedir o envio do formulário. | `src/lib/http.ts` |
| Estruturas neutras de briefing: não recomendam SKU, preço, embalagem ou regra | `src/lib/kitBuilder.ts` |
| Um mesmo produto/variante não pode representar simultaneamente um item | `src/lib/kitBuilder.ts` |
| * O campo canônico continua soberano; a taxonomia é apenas um fallback para | `src/lib/productBadges.ts` |
| * O rascunho vive somente nesta aba e expira em 24 horas. */ | `src/lib/quoteDraft.ts` |
| recuperar referências avulsas de dados antigos, mas uma transmissão nunca deve | `src/lib/quoteItems.ts` |
| Nothing else is required when browser storage is unavailable. | `src/lib/quoteRepeat.ts` |
| altura do documento. O primeiro scroll usa o máximo disponível e os frames | `src/lib/scrollRestoration.ts` |
| * Sugere somente correções inequívocas de termos editoriais. Códigos e consultas | `src/lib/search.ts` |
| O moodboard aceita até 50 referências; o link persistente deve representar a | `src/lib/sharedSelection.ts` |
| opaco e não pode herdar essa limitação de transporte. | `src/lib/sharedSelection.ts` |
| * Nome da cor legado, usado somente quando o fornecedor não publica variantId. */ | `src/lib/sharedSelection.ts` |
| * Executa uma consulta PostgREST com deadline real. O AbortSignal chega até o | `src/lib/siteRpc.ts` |
| apenas quando essa é a ordem selecionada. | `src/lib/useCatalogPageState.ts` |
| Um storage bloqueado não pode impedir a consulta pública do calendário. | `src/lib/useOccasionFavorites.ts` |
| Intenções pertencem somente à sessão de sincronização do titular atual. | `src/lib/useOccasionFavorites.ts` |
| Atualiza a identidade somente quando o render foi efetivamente commitado. | `src/lib/useOccasionFavorites.ts` |
| ainda não estava confirmada. Esse snapshot não pode substituir a | `src/lib/useOccasionFavorites.ts` |
| Somente uma escrita já concluída pode ser liberada por uma observação | `src/lib/useOccasionFavorites.ts` |
| `storage` é emitido somente nas outras abas do mesmo navegador. A ação | `src/lib/useOccasionFavorites.ts` |
| Uma âncora só desloca a mesma página; ela não pode invalidar uma | `src/pages/QuotePage.tsx` |
| A navegação não pode deixar uma solicitação antiga concluir em segundo | `src/pages/QuotePage.tsx` |
| deve invalidar os dados pessoais ativos deste formulário. Sem isto, o | `src/pages/QuotePage.tsx` |
| efeitos deste projeto); só a troca de titular deve disparar este reset. | `src/pages/QuotePage.tsx` |
| Estas linhas espelham apenas o estado devolvido pela API; não | `src/pages/QuotePage.tsx` |
