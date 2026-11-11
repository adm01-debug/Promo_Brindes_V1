# site_private.admin_audit_log

> Etapa 36: audita escritas em tabelas de negócio feitas por qualquer role além de site_api/service_role — ou seja, fora do caminho normal da API (Studio, SQL manual). Não registra o conteúdo da linha, só que uma escrita aconteceu, quem e quando.

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
| 1 | `id` | `bigint` | não |  | a |  |
| 2 | `table_name` | `text` | não |  |  |  |
| 3 | `operation` | `text` | não |  |  |  |
| 4 | `row_id` | `text` | sim |  |  |  |
| 5 | `performed_by` | `text` | não |  |  |  |
| 6 | `application_name` | `text` | sim |  |  |  |
| 7 | `occurred_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| admin_audit_log_operation_check | CHECK | `CHECK (operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text]))` |  |  | sim |
| admin_audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| admin_audit_log_occurred_idx | btree | occurred_at, id | não | sim |  | `CREATE INDEX admin_audit_log_occurred_idx ON site_private.admin_audit_log USING btree (occurred_at, id)` |
| admin_audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX admin_audit_log_pkey ON site_private.admin_audit_log USING btree (id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
