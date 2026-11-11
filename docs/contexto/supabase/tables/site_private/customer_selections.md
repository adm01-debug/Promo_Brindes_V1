# site_private.customer_selections

> Rascunhos privados do titular, sem preço nem estoque. A FK apaga ao excluir a conta; pedido de apagamento do titular remove via trigger do perfil; arquivados são purgados após 90 dias.

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
| 3 | `title` | `text` | não |  |  |  |
| 4 | `product_references` | `jsonb` | não |  |  | IDs públicos, quantidade, variante, decisão e, quando aplicável, grupo/nome/quantidade/unidades por kit. Sem preço nem estoque. |
| 5 | `campaign` | `jsonb` | sim |  |  |  |
| 6 | `version` | `integer` | não | `1` |  |  |
| 7 | `archived_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| customer_selections_customer_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (customer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| customer_selections_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| customer_selections_product_references_check | CHECK | `CHECK (jsonb_typeof(product_references) = 'array'::text)` |  |  | sim |
| customer_selections_title_check | CHECK | `CHECK (length(title) >= 1 AND length(title) <= 100)` |  |  | sim |
| customer_selections_version_check | CHECK | `CHECK (version > 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| customer_selections_archived_idx | btree | archived_at | não | sim | `(archived_at IS NOT NULL)` | `CREATE INDEX customer_selections_archived_idx ON site_private.customer_selections USING btree (archived_at) WHERE (archived_at IS NOT NULL)` |
| customer_selections_owner_updated_idx | btree | customer_user_id, updated_at, id | não | sim |  | `CREATE INDEX customer_selections_owner_updated_idx ON site_private.customer_selections USING btree (customer_user_id, updated_at DESC, id)` |
| customer_selections_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX customer_selections_pkey ON site_private.customer_selections USING btree (id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| customer_selections_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |
| customer_selections_validate_kit_insert | BEFORE | INSERT | ROW | enabled | site_private.enforce_valid_kit_reference_set |
| customer_selections_validate_kit_update | BEFORE | UPDATE | ROW | enabled | site_private.enforce_valid_kit_reference_set |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
