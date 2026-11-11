# site_private.contact_requests

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
| 7 | `email` | `text` | não |  |  |  |
| 8 | `phone` | `text` | sim |  |  |  |
| 9 | `page_url` | `text` | sim |  |  |  |
| 10 | `client_submitted_at` | `timestamp with time zone` | não |  |  |  |
| 11 | `request_metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 12 | `retention_until` | `timestamp with time zone` | não | `(now() + '2 years'::interval)` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `message` | `text` | sim |  |  | Contexto opcional da conversa, limitado a 800 caracteres e retido no banco isolado do site. |
| 16 | `preferred_channel` | `text` | sim |  |  | Preferência opcional de retorno; não representa consentimento para disparo automático. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contact_requests_client_request_id_check | CHECK | `CHECK (length(client_request_id) >= 8 AND length(client_request_id) <= 100)` |  |  | sim |
| contact_requests_client_request_id_key | UNIQUE | `UNIQUE (client_request_id)` |  |  | sim |
| contact_requests_contact_name_check | CHECK | `CHECK (length(contact_name) >= 2 AND length(contact_name) <= 100)` |  |  | sim |
| contact_requests_email_check | CHECK | `CHECK (length(email) >= 5 AND length(email) <= 160)` |  |  | sim |
| contact_requests_email_normalized_check | CHECK | `CHECK (email = site_private.normalize_email(email))` |  |  | sim |
| contact_requests_message_check | CHECK | `CHECK (message IS NULL OR length(message) <= 800)` |  |  | sim |
| contact_requests_page_url_check | CHECK | `CHECK (page_url IS NULL OR length(page_url) <= 500)` |  |  | sim |
| contact_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contact_requests_preferred_channel_check | CHECK | `CHECK (preferred_channel IS NULL OR (preferred_channel = ANY (ARRAY['email'::text, 'telefone'::text, 'whatsapp'::text])))` |  |  | sim |
| contact_requests_request_hash_check | CHECK | `CHECK (request_hash ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| contact_requests_request_metadata_check | CHECK | `CHECK (jsonb_typeof(request_metadata) = 'object'::text)` |  |  | sim |
| contact_requests_source_check | CHECK | `CHECK (source = 'site-promo-brindes-contact'::text)` |  |  | sim |
| contact_requests_status_check | CHECK | `CHECK (status = ANY (ARRAY['new'::text, 'triaged'::text, 'in_progress'::text, 'closed'::text, 'spam'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| site_private.consent_receipts | consent_receipts_contact_request_id_fkey | contact_request_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contact_requests_client_request_id_key | btree | client_request_id | sim | sim |  | `CREATE UNIQUE INDEX contact_requests_client_request_id_key ON site_private.contact_requests USING btree (client_request_id)` |
| contact_requests_created_at_idx | btree | created_at | não | sim |  | `CREATE INDEX contact_requests_created_at_idx ON site_private.contact_requests USING btree (created_at DESC)` |
| contact_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contact_requests_pkey ON site_private.contact_requests USING btree (id)` |
| contact_requests_retention_idx | btree | retention_until | não | sim |  | `CREATE INDEX contact_requests_retention_idx ON site_private.contact_requests USING btree (retention_until)` |
| contact_requests_status_created_at_idx | btree | status, created_at | não | sim |  | `CREATE INDEX contact_requests_status_created_at_idx ON site_private.contact_requests USING btree (status, created_at DESC)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| contact_requests_enforce_status_transition | BEFORE | UPDATE | ROW | enabled | site_private.enforce_status_transition |
| contact_requests_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |
| contact_requests_set_updated_at | BEFORE | UPDATE | ROW | enabled | site_private.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | DELETE, INSERT, SELECT |
