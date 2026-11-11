# site_private.quote_adjustment_requests

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
| 3 | `requested_by` | `uuid` | não |  |  |  |
| 4 | `client_request_id` | `text` | não |  |  |  |
| 5 | `message` | `text` | não |  |  |  |
| 6 | `status` | `text` | não | `'new'::text` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_adjustment_requests_client_request_id_check | CHECK | `CHECK (client_request_id ~ '^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,99}$'::text)` |  |  | sim |
| quote_adjustment_requests_message_check | CHECK | `CHECK (length(TRIM(BOTH FROM message)) >= 2 AND length(TRIM(BOTH FROM message)) <= 800)` |  |  | sim |
| quote_adjustment_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_adjustment_requests_quote_request_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_request_id) REFERENCES site_private.quote_requests(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_adjustment_requests_quote_request_id_requested_by_cli_key | UNIQUE | `UNIQUE (quote_request_id, requested_by, client_request_id)` |  |  | sim |
| quote_adjustment_requests_requested_by_fkey | FOREIGN KEY | `FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_adjustment_requests_status_check | CHECK | `CHECK (status = ANY (ARRAY['new'::text, 'triaged'::text, 'resolved'::text, 'closed'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| quote_adjustment_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_adjustment_requests_pkey ON site_private.quote_adjustment_requests USING btree (id)` |
| quote_adjustment_requests_quote_request_id_requested_by_cli_key | btree | quote_request_id, requested_by, client_request_id | sim | sim |  | `CREATE UNIQUE INDEX quote_adjustment_requests_quote_request_id_requested_by_cli_key ON site_private.quote_adjustment_requests USING btree (quote_request_id, requested_by, client_request_id)` |
| quote_adjustment_requests_requested_by_idx | btree | requested_by | não | sim |  | `CREATE INDEX quote_adjustment_requests_requested_by_idx ON site_private.quote_adjustment_requests USING btree (requested_by)` |
| quote_adjustments_request_created_idx | btree | quote_request_id, created_at | não | sim |  | `CREATE INDEX quote_adjustments_request_created_idx ON site_private.quote_adjustment_requests USING btree (quote_request_id, created_at DESC)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| quote_adjustment_requests_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |
| quote_adjustment_requests_set_updated_at | BEFORE | UPDATE | ROW | enabled | site_private.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
