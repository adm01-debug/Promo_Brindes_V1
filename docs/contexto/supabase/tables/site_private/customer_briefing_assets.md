# site_private.customer_briefing_assets

> Logos e referências privadas em PNG, JPEG ou WebP. PDFs ficam bloqueados até existir análise estrutural/CDR isolada e antimalware.

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
| 2 | `customer_user_id` | `uuid` | não |  |  |  |
| 3 | `quote_request_id` | `uuid` | sim |  |  |  |
| 4 | `kind` | `text` | não |  |  |  |
| 5 | `original_name` | `text` | não |  |  |  |
| 6 | `storage_bucket` | `text` | não | `'customer-briefing-assets'::text` |  |  |
| 7 | `storage_path` | `text` | não |  |  |  |
| 8 | `mime_type` | `text` | não |  |  |  |
| 9 | `size_bytes` | `integer` | não |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `expires_at` | `timestamp with time zone` | não | `(now() + '30 days'::interval)` |  |  |
| 12 | `verified_at` | `timestamp with time zone` | sim |  |  | Preenchido somente pela API do site após ler o blob privado e validar sua assinatura binária. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| customer_briefing_assets_customer_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (customer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| customer_briefing_assets_kind_check | CHECK | `CHECK (kind = ANY (ARRAY['logo'::text, 'reference'::text]))` |  |  | sim |
| customer_briefing_assets_mime_type_check | CHECK | `CHECK (mime_type = ANY (ARRAY['image/png'::text, 'image/jpeg'::text, 'image/webp'::text]))` |  |  | sim |
| customer_briefing_assets_original_name_check | CHECK | `CHECK (length(original_name) >= 1 AND length(original_name) <= 160)` |  |  | sim |
| customer_briefing_assets_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| customer_briefing_assets_quote_request_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_request_id) REFERENCES site_private.quote_requests(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| customer_briefing_assets_size_bytes_check | CHECK | `CHECK (size_bytes >= 1 AND size_bytes <= 10485760)` |  |  | sim |
| customer_briefing_assets_storage_bucket_check | CHECK | `CHECK (storage_bucket = 'customer-briefing-assets'::text)` |  |  | sim |
| customer_briefing_assets_storage_path_check | CHECK | `CHECK (length(storage_path) >= 40 AND length(storage_path) <= 160 AND storage_path !~ '(^\|/)\.\.(/\|$)'::text)` |  |  | sim |
| customer_briefing_assets_storage_path_key | UNIQUE | `UNIQUE (storage_path)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| customer_briefing_assets_expiry_idx | btree | expires_at, id | não | sim |  | `CREATE INDEX customer_briefing_assets_expiry_idx ON site_private.customer_briefing_assets USING btree (expires_at, id)` |
| customer_briefing_assets_owner_created_idx | btree | customer_user_id, created_at, id | não | sim |  | `CREATE INDEX customer_briefing_assets_owner_created_idx ON site_private.customer_briefing_assets USING btree (customer_user_id, created_at DESC, id)` |
| customer_briefing_assets_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX customer_briefing_assets_pkey ON site_private.customer_briefing_assets USING btree (id)` |
| customer_briefing_assets_quote_idx | btree | quote_request_id | não | sim | `(quote_request_id IS NOT NULL)` | `CREATE INDEX customer_briefing_assets_quote_idx ON site_private.customer_briefing_assets USING btree (quote_request_id) WHERE (quote_request_id IS NOT NULL)` |
| customer_briefing_assets_storage_path_key | btree | storage_path | sim | sim |  | `CREATE UNIQUE INDEX customer_briefing_assets_storage_path_key ON site_private.customer_briefing_assets USING btree (storage_path)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| customer_briefing_assets_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |
| customer_briefing_assets_queue_deletion | BEFORE | DELETE | ROW | enabled | site_private.queue_briefing_asset_deletion |
| customer_briefing_assets_require_verification | BEFORE | UPDATE | ROW | enabled | site_private.require_verified_briefing_asset_attachment |
| customer_briefing_assets_require_verification_on_insert | BEFORE | INSERT | ROW | enabled | site_private.require_verified_briefing_asset_attachment |


## Grants

_nenhum_
