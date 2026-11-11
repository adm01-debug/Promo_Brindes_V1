# site_private.shared_selection_rate_limits

> Etapa 30: UNLOGGED de propósito — mesmo racional de rate_limit_buckets.

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
| 1 | `identifier_hash` | `text` | não |  |  |  |
| 2 | `window_started_at` | `timestamp with time zone` | não |  |  |  |
| 3 | `request_count` | `integer` | não |  |  |  |
| 4 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| shared_selection_rate_limits_identifier_hash_check | CHECK | `CHECK (identifier_hash ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| shared_selection_rate_limits_pkey | PRIMARY KEY | `PRIMARY KEY (identifier_hash)` |  |  | sim |
| shared_selection_rate_limits_request_count_check | CHECK | `CHECK (request_count > 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| shared_selection_rate_limits_pkey | btree | identifier_hash | sim | sim |  | `CREATE UNIQUE INDEX shared_selection_rate_limits_pkey ON site_private.shared_selection_rate_limits USING btree (identifier_hash)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| shared_selection_rate_limits_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |
| shared_selection_rate_limits_set_updated_at | BEFORE | UPDATE | ROW | enabled | site_private.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | DELETE, INSERT, SELECT, UPDATE |
