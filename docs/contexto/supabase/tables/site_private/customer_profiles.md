# site_private.customer_profiles

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
| 2 | `verified_email` | `text` | não |  |  |  |
| 3 | `display_name` | `text` | sim |  |  |  |
| 4 | `company` | `text` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| customer_profiles_company_check | CHECK | `CHECK (company IS NULL OR length(company) >= 2 AND length(company) <= 150)` |  |  | sim |
| customer_profiles_display_name_check | CHECK | `CHECK (display_name IS NULL OR length(display_name) >= 2 AND length(display_name) <= 100)` |  |  | sim |
| customer_profiles_pkey | PRIMARY KEY | `PRIMARY KEY (user_id)` |  |  | sim |
| customer_profiles_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| customer_profiles_verified_email_check | CHECK | `CHECK (length(verified_email) >= 5 AND length(verified_email) <= 160)` |  |  | sim |
| customer_profiles_verified_email_normalized_check | CHECK | `CHECK (verified_email = site_private.normalize_email(verified_email))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| customer_profiles_pkey | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX customer_profiles_pkey ON site_private.customer_profiles USING btree (user_id)` |
| customer_profiles_verified_email_idx | btree |  | sim | sim |  | `CREATE UNIQUE INDEX customer_profiles_verified_email_idx ON site_private.customer_profiles USING btree (lower(verified_email))` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| customer_profile_asset_erasure | AFTER | UPDATE | ROW | enabled | site_private.erase_customer_assets_on_profile_change |
| customer_profile_occasion_favorite_erasure | AFTER | UPDATE | ROW | enabled | site_private.erase_customer_occasion_favorites_on_profile_change |
| customer_profile_selection_erasure | AFTER | UPDATE | ROW | enabled | site_private.erase_customer_selections_on_profile_change |
| customer_profiles_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |
| customer_profiles_set_updated_at | BEFORE | UPDATE | ROW | enabled | site_private.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
