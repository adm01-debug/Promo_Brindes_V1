# site_private.commercial_audit_log

> Trilha append-only das escritas feitas pelo back-office (F-03): quem mudou o quê e quando. Sem policy para anon/authenticated; leitura só por service_role.

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
| 2 | `actor_user_id` | `uuid` | sim |  |  |  |
| 3 | `actor_label` | `text` | não |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `quote_request_id` | `uuid` | não |  |  |  |
| 6 | `detail` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| commercial_audit_log_action_check | CHECK | `CHECK (action = ANY (ARRAY['status_changed'::text, 'adjustment_replied'::text, 'proposal_published'::text]))` |  |  | sim |
| commercial_audit_log_actor_label_check | CHECK | `CHECK (length(actor_label) >= 2 AND length(actor_label) <= 160)` |  |  | sim |
| commercial_audit_log_actor_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| commercial_audit_log_detail_check | CHECK | `CHECK (jsonb_typeof(detail) = 'object'::text)` |  |  | sim |
| commercial_audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| commercial_audit_log_quote_request_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_request_id) REFERENCES site_private.quote_requests(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| commercial_audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX commercial_audit_log_pkey ON site_private.commercial_audit_log USING btree (id)` |
| commercial_audit_log_request_created_idx | btree | quote_request_id, created_at | não | sim |  | `CREATE INDEX commercial_audit_log_request_created_idx ON site_private.commercial_audit_log USING btree (quote_request_id, created_at DESC)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | INSERT, SELECT |
