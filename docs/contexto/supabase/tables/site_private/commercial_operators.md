# site_private.commercial_operators

> Allowlist do back-office comercial (F-03). Só service_role escreve; as RPCs de escrita comercial recusam chamador fora daqui, mesmo com JWT válido.

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
| 1 | `user_id` | `uuid` | não |  |  |  |
| 2 | `display_name` | `text` | não |  |  |  |
| 3 | `is_active` | `boolean` | não | `true` |  |  |
| 4 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| commercial_operators_display_name_check | CHECK | `CHECK (length(display_name) >= 2 AND length(display_name) <= 120)` |  |  | sim |
| commercial_operators_pkey | PRIMARY KEY | `PRIMARY KEY (user_id)` |  |  | sim |
| commercial_operators_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| commercial_operators_active_idx | btree | user_id | não | sim | `is_active` | `CREATE INDEX commercial_operators_active_idx ON site_private.commercial_operators USING btree (user_id) WHERE is_active` |
| commercial_operators_pkey | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX commercial_operators_pkey ON site_private.commercial_operators USING btree (user_id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| commercial_operators_set_updated_at | BEFORE | UPDATE | ROW | enabled | site_private.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
