# site_private.admin_ddl_log

> Etapa 36: DDL (create/alter/drop) fora do fluxo de migrations do CLI. Toda migration legítima também aparece aqui — não é um sinal de problema por si só, é o registro bruto para cruzar com o histórico de migrations quando precisar auditar.

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
| 2 | `command_tag` | `text` | não |  |  |  |
| 3 | `object_type` | `text` | sim |  |  |  |
| 4 | `schema_name` | `text` | sim |  |  |  |
| 5 | `performed_by` | `text` | não |  |  |  |
| 6 | `occurred_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| admin_ddl_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| admin_ddl_log_occurred_idx | btree | occurred_at, id | não | sim |  | `CREATE INDEX admin_ddl_log_occurred_idx ON site_private.admin_ddl_log USING btree (occurred_at, id)` |
| admin_ddl_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX admin_ddl_log_pkey ON site_private.admin_ddl_log USING btree (id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
