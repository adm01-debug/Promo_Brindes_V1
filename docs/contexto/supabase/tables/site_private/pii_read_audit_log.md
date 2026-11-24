# site_private.pii_read_audit_log

> PF-34: audita leituras (SELECT) de colunas de contato do titular em tabelas de PII. Não armazena o valor lido, só que uma leitura aconteceu, para quem, quando, quantas linhas e com qual filtro.

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
| 3 | `operation` | `text` | não | `'SELECT'::text` |  |  |
| 4 | `subject` | `uuid` | sim |  |  | Titular cuja PII foi lida. Fica nulo em leitura de operador: a fila comercial pagina muitos titulares de uma vez e só o row_count descreve o volume. |
| 5 | `performed_by` | `text` | não |  |  |  |
| 6 | `actor_kind` | `text` | não | `'titular'::text` |  | titular = o próprio dono leu seus dados; operador = alguém do back-office leu dados de outra pessoa. |
| 7 | `filter` | `text` | sim |  |  |  |
| 8 | `row_count` | `integer` | sim |  |  |  |
| 9 | `application_name` | `text` | sim |  |  |  |
| 10 | `occurred_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pii_read_audit_log_actor_kind_check | CHECK | `CHECK (actor_kind = ANY (ARRAY['titular'::text, 'operador'::text]))` |  |  | sim |
| pii_read_audit_log_operation_check | CHECK | `CHECK (operation = 'SELECT'::text)` |  |  | sim |
| pii_read_audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| pii_read_audit_log_occurred_idx | btree | occurred_at, id | não | sim |  | `CREATE INDEX pii_read_audit_log_occurred_idx ON site_private.pii_read_audit_log USING btree (occurred_at, id)` |
| pii_read_audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pii_read_audit_log_pkey ON site_private.pii_read_audit_log USING btree (id)` |
| pii_read_audit_log_subject_occurred_idx | btree | subject, occurred_at, id | não | sim |  | `CREATE INDEX pii_read_audit_log_subject_occurred_idx ON site_private.pii_read_audit_log USING btree (subject, occurred_at DESC, id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
