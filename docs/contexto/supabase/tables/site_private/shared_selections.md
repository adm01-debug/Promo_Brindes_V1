# site_private.shared_selections

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
| 1 | `token` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `management_token_hash` | `text` | não |  |  |  |
| 3 | `items` | `jsonb` | não |  |  | Referências compartilhadas por link; preserva prioridade, grupo, nome e multiplicadores de kit. Nomes escolhidos pelo cliente também ficam visíveis ao destinatário. |
| 4 | `expires_at` | `timestamp with time zone` | não | `(now() + '30 days'::interval)` |  |  |
| 5 | `revoked_at` | `timestamp with time zone` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| shared_selections_check | CHECK | `CHECK (expires_at > created_at)` |  |  | sim |
| shared_selections_check1 | CHECK | `CHECK (expires_at <= (created_at + '31 days'::interval))` |  |  | sim |
| shared_selections_items_count_check | CHECK | `CHECK (jsonb_typeof(items) = 'array'::text AND jsonb_array_length(items) >= 1 AND jsonb_array_length(items) <= 50)` |  |  | sim |
| shared_selections_management_token_hash_check | CHECK | `CHECK (management_token_hash ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| shared_selections_pkey | PRIMARY KEY | `PRIMARY KEY (token)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| shared_selections_active_idx | btree | expires_at | não | sim | `(revoked_at IS NULL)` | `CREATE INDEX shared_selections_active_idx ON site_private.shared_selections USING btree (expires_at) WHERE (revoked_at IS NULL)` |
| shared_selections_pkey | btree | token | sim | sim |  | `CREATE UNIQUE INDEX shared_selections_pkey ON site_private.shared_selections USING btree (token)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| shared_selections_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |
| shared_selections_set_updated_at | BEFORE | UPDATE | ROW | enabled | site_private.set_updated_at |
| shared_selections_validate_kit_insert | BEFORE | INSERT | ROW | enabled | site_private.enforce_valid_kit_reference_set |
| shared_selections_validate_kit_update | BEFORE | UPDATE | ROW | enabled | site_private.enforce_valid_kit_reference_set |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | DELETE, INSERT, SELECT, UPDATE |
