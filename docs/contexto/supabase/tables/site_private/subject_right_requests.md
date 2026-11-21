# site_private.subject_right_requests

> Trilha do exercicio dos direitos do titular (LGPD art. 18) na Area do Cliente: access, export, correct e delete. Vinculada a conta e removida pelo cascade de auth.users; o registo persistente do apagamento e o tombstone irreversivel em erased_customer_identities.

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
| 2 | `subject_user_id` | `uuid` | não |  |  |  |
| 3 | `right_type` | `text` | não |  |  | Direito exercido: access (confirmacao de tratamento), export (portabilidade), correct (correcao de perfil) ou delete (autoexclusao). |
| 4 | `requested_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| subject_right_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| subject_right_requests_right_type_check | CHECK | `CHECK (right_type = ANY (ARRAY['access'::text, 'export'::text, 'correct'::text, 'delete'::text]))` |  |  | sim |
| subject_right_requests_subject_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (subject_user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| subject_right_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX subject_right_requests_pkey ON site_private.subject_right_requests USING btree (id)` |
| subject_right_requests_subject_idx | btree | subject_user_id, requested_at | não | sim |  | `CREATE INDEX subject_right_requests_subject_idx ON site_private.subject_right_requests USING btree (subject_user_id, requested_at DESC)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
