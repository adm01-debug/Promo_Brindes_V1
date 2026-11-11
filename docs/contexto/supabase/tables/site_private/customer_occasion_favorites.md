# site_private.customer_occasion_favorites

> IDs de datas comemorativas escolhidas pelo titular. A lista editorial fica no frontend; a conta guarda somente o ID e o vínculo é apagado com auth.users.

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
| 1 | `customer_user_id` | `uuid` | não |  |  |  |
| 2 | `occasion_id` | `text` | não |  |  |  |
| 3 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 4 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| customer_occasion_favorites_customer_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (customer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| customer_occasion_favorites_occasion_id_check | CHECK | `CHECK (occasion_id ~ '^[a-z0-9]+(?:-[a-z0-9]+){0,15}$'::text AND length(occasion_id) <= 80)` |  |  | sim |
| customer_occasion_favorites_pkey | PRIMARY KEY | `PRIMARY KEY (customer_user_id, occasion_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| customer_occasion_favorites_owner_updated_idx | btree | customer_user_id, updated_at, occasion_id | não | sim |  | `CREATE INDEX customer_occasion_favorites_owner_updated_idx ON site_private.customer_occasion_favorites USING btree (customer_user_id, updated_at DESC, occasion_id)` |
| customer_occasion_favorites_pkey | btree | customer_user_id, occasion_id | sim | sim |  | `CREATE UNIQUE INDEX customer_occasion_favorites_pkey ON site_private.customer_occasion_favorites USING btree (customer_user_id, occasion_id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| customer_occasion_favorites_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
