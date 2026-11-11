# site_private.proposal_documents

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
| 2 | `quote_request_id` | `uuid` | não |  |  |  |
| 3 | `version` | `integer` | não |  |  |  |
| 4 | `title` | `text` | não |  |  |  |
| 5 | `storage_bucket` | `text` | não | `'customer-proposals'::text` |  |  |
| 6 | `storage_path` | `text` | não |  |  |  |
| 7 | `valid_until` | `date` | sim |  |  |  |
| 8 | `published_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `superseded_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| proposal_documents_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| proposal_documents_quote_request_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_request_id) REFERENCES site_private.quote_requests(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| proposal_documents_quote_request_id_version_key | UNIQUE | `UNIQUE (quote_request_id, version)` |  |  | sim |
| proposal_documents_storage_bucket_check | CHECK | `CHECK (storage_bucket = 'customer-proposals'::text)` |  |  | sim |
| proposal_documents_storage_bucket_storage_path_key | UNIQUE | `UNIQUE (storage_bucket, storage_path)` |  |  | sim |
| proposal_documents_storage_path_check | CHECK | `CHECK (length(storage_path) >= 2 AND length(storage_path) <= 500 AND storage_path !~ '(^\|/)\.\.(/\|$)'::text)` |  |  | sim |
| proposal_documents_title_check | CHECK | `CHECK (length(title) >= 2 AND length(title) <= 160)` |  |  | sim |
| proposal_documents_version_check | CHECK | `CHECK (version >= 1 AND version <= 999)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| proposal_documents_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX proposal_documents_pkey ON site_private.proposal_documents USING btree (id)` |
| proposal_documents_published_idx | btree | quote_request_id, published_at | não | sim | `(published_at IS NOT NULL)` | `CREATE INDEX proposal_documents_published_idx ON site_private.proposal_documents USING btree (quote_request_id, published_at DESC) WHERE (published_at IS NOT NULL)` |
| proposal_documents_quote_request_id_version_key | btree | quote_request_id, version | sim | sim |  | `CREATE UNIQUE INDEX proposal_documents_quote_request_id_version_key ON site_private.proposal_documents USING btree (quote_request_id, version)` |
| proposal_documents_storage_bucket_storage_path_key | btree | storage_bucket, storage_path | sim | sim |  | `CREATE UNIQUE INDEX proposal_documents_storage_bucket_storage_path_key ON site_private.proposal_documents USING btree (storage_bucket, storage_path)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| proposal_documents_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | DELETE, SELECT |
