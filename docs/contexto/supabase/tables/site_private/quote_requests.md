# site_private.quote_requests

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | sim |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `client_request_id` | `text` | não |  |  |  |
| 3 | `request_hash` | `text` | não |  |  |  |
| 4 | `source` | `text` | não |  |  |  |
| 5 | `status` | `text` | não | `'new'::text` |  |  |
| 6 | `contact_name` | `text` | não |  |  |  |
| 7 | `company` | `text` | não |  |  |  |
| 8 | `email` | `text` | não |  |  |  |
| 9 | `phone` | `text` | não |  |  |  |
| 10 | `city` | `text` | sim |  |  |  |
| 11 | `desired_deadline` | `date` | sim |  |  |  |
| 12 | `notes` | `text` | sim |  |  |  |
| 13 | `page_url` | `text` | sim |  |  |  |
| 14 | `client_submitted_at` | `timestamp with time zone` | não |  |  |  |
| 15 | `request_metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 16 | `retention_until` | `timestamp with time zone` | não | `(now() + '2 years'::interval)` |  |  |
| 17 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `customer_user_id` | `uuid` | sim |  |  |  |
| 20 | `protocol` | `text` | não |  |  | Etapa 19: protocolo público persistido (PB + ano 2 dígitos + sequência 6 dígitos + dígito verificador mod 11). Substitui upper(left(id::text,8)), que não tinha garantia de unicidade nem verificação. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_requests_client_request_id_check | CHECK | `CHECK (length(client_request_id) >= 8 AND length(client_request_id) <= 100)` |  |  | sim |
| quote_requests_client_request_id_key | UNIQUE | `UNIQUE (client_request_id)` |  |  | sim |
| quote_requests_company_check | CHECK | `CHECK (length(company) >= 2 AND length(company) <= 150)` |  |  | sim |
| quote_requests_contact_name_check | CHECK | `CHECK (length(contact_name) >= 2 AND length(contact_name) <= 100)` |  |  | sim |
| quote_requests_customer_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (customer_user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| quote_requests_email_check | CHECK | `CHECK (length(email) >= 5 AND length(email) <= 160)` |  |  | sim |
| quote_requests_email_normalized_check | CHECK | `CHECK (email = site_private.normalize_email(email))` |  |  | sim |
| quote_requests_notes_check | CHECK | `CHECK (notes IS NULL OR length(notes) <= 800)` |  |  | sim |
| quote_requests_page_url_check | CHECK | `CHECK (page_url IS NULL OR length(page_url) <= 500)` |  |  | sim |
| quote_requests_phone_check | CHECK | `CHECK (length(phone) >= 10 AND length(phone) <= 24)` |  |  | sim |
| quote_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_requests_protocol_format_check | CHECK | `CHECK (protocol ~ '^PB[0-9]{9}$'::text)` |  |  | sim |
| quote_requests_protocol_key | UNIQUE | `UNIQUE (protocol)` |  |  | sim |
| quote_requests_request_hash_check | CHECK | `CHECK (request_hash ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| quote_requests_request_metadata_check | CHECK | `CHECK (jsonb_typeof(request_metadata) = 'object'::text)` |  |  | sim |
| quote_requests_source_check | CHECK | `CHECK (source = 'site-promo-brindes'::text)` |  |  | sim |
| quote_requests_status_check | CHECK | `CHECK (status = ANY (ARRAY['new'::text, 'triaged'::text, 'in_progress'::text, 'quoted'::text, 'closed'::text, 'spam'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| site_private.consent_receipts | consent_receipts_quote_request_id_fkey | quote_request_id | CASCADE |
| site_private.customer_briefing_assets | customer_briefing_assets_quote_request_id_fkey | quote_request_id | CASCADE |
| site_private.proposal_documents | proposal_documents_quote_request_id_fkey | quote_request_id | CASCADE |
| site_private.quote_adjustment_requests | quote_adjustment_requests_quote_request_id_fkey | quote_request_id | CASCADE |
| site_private.quote_items | quote_items_quote_request_id_fkey | quote_request_id | CASCADE |
| site_private.quote_request_events | quote_request_events_quote_request_id_fkey | quote_request_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| quote_requests_client_request_id_key | btree | client_request_id | sim | sim |  | `CREATE UNIQUE INDEX quote_requests_client_request_id_key ON site_private.quote_requests USING btree (client_request_id)` |
| quote_requests_created_at_idx | btree | created_at | não | sim |  | `CREATE INDEX quote_requests_created_at_idx ON site_private.quote_requests USING btree (created_at DESC)` |
| quote_requests_customer_created_idx | btree | customer_user_id, created_at | não | sim | `((customer_user_id IS NOT NULL) AND (status <> 'spam'::text))` | `CREATE INDEX quote_requests_customer_created_idx ON site_private.quote_requests USING btree (customer_user_id, created_at DESC) WHERE ((customer_user_id IS NOT NULL) AND (status <> 'spam'::text))` |
| quote_requests_customer_owner_idx | btree | customer_user_id | não | sim | `(customer_user_id IS NOT NULL)` | `CREATE INDEX quote_requests_customer_owner_idx ON site_private.quote_requests USING btree (customer_user_id) WHERE (customer_user_id IS NOT NULL)` |
| quote_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_requests_pkey ON site_private.quote_requests USING btree (id)` |
| quote_requests_protocol_key | btree | protocol | sim | sim |  | `CREATE UNIQUE INDEX quote_requests_protocol_key ON site_private.quote_requests USING btree (protocol)` |
| quote_requests_retention_idx | btree | retention_until | não | sim |  | `CREATE INDEX quote_requests_retention_idx ON site_private.quote_requests USING btree (retention_until)` |
| quote_requests_status_created_at_idx | btree | status, created_at | não | sim |  | `CREATE INDEX quote_requests_status_created_at_idx ON site_private.quote_requests USING btree (status, created_at DESC)` |
| quote_requests_unclaimed_email_idx | btree | created_at | não | sim | `((customer_user_id IS NULL) AND (status <> 'spam'::text))` | `CREATE INDEX quote_requests_unclaimed_email_idx ON site_private.quote_requests USING btree (lower(email), created_at DESC) WHERE ((customer_user_id IS NULL) AND (status <> 'spam'::text))` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| quote_requests_assign_protocol | BEFORE | INSERT | ROW | enabled | site_private.assign_quote_protocol |
| quote_requests_enforce_status_transition | BEFORE | UPDATE | ROW | enabled | site_private.enforce_status_transition |
| quote_requests_enqueue_confirmations | AFTER | INSERT | ROW | enabled | site_private.enqueue_quote_confirmations |
| quote_requests_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | disabled | site_private.log_admin_write |
| quote_requests_record_customer_event | AFTER | INSERT OR UPDATE | ROW | enabled | site_private.record_quote_status_event |
| quote_requests_set_updated_at | BEFORE | UPDATE | ROW | enabled | site_private.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | DELETE, INSERT, SELECT |
