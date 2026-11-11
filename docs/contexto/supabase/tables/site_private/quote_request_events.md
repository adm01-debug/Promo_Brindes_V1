# site_private.quote_request_events

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
| 2 | `quote_request_id` | `uuid` | não |  |  |  |
| 3 | `event_type` | `text` | não |  |  |  |
| 4 | `status` | `text` | sim |  |  |  |
| 5 | `title` | `text` | não |  |  |  |
| 6 | `description` | `text` | sim |  |  |  |
| 7 | `audience` | `text` | não | `'customer'::text` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `sequence` | `bigint` | não |  | a | Ordem de inserção monotônica (Etapa 7). Usar em vez de created_at para ordenar eventos do mesmo pedido: created_at é fixo por transação e não desempata eventos inseridos juntos. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_request_events_audience_check | CHECK | `CHECK (audience = ANY (ARRAY['customer'::text, 'internal'::text]))` |  |  | sim |
| quote_request_events_description_check | CHECK | `CHECK (description IS NULL OR length(description) <= 500)` |  |  | sim |
| quote_request_events_event_type_check | CHECK | `CHECK (event_type = ANY (ARRAY['received'::text, 'status_changed'::text, 'message'::text, 'proposal_published'::text, 'adjustment_requested'::text]))` |  |  | sim |
| quote_request_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_request_events_quote_request_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_request_id) REFERENCES site_private.quote_requests(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_request_events_sequence_key | UNIQUE | `UNIQUE (sequence)` |  |  | sim |
| quote_request_events_status_check | CHECK | `CHECK (status IS NULL OR (status = ANY (ARRAY['new'::text, 'triaged'::text, 'in_progress'::text, 'quoted'::text, 'closed'::text])))` |  |  | sim |
| quote_request_events_title_check | CHECK | `CHECK (length(title) >= 2 AND length(title) <= 120)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| quote_request_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_request_events_pkey ON site_private.quote_request_events USING btree (id)` |
| quote_request_events_request_sequence_idx | btree | quote_request_id, sequence | não | sim |  | `CREATE INDEX quote_request_events_request_sequence_idx ON site_private.quote_request_events USING btree (quote_request_id, sequence DESC)` |
| quote_request_events_sequence_key | btree | sequence | sim | sim |  | `CREATE UNIQUE INDEX quote_request_events_sequence_key ON site_private.quote_request_events USING btree (sequence)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| quote_request_events_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | disabled | site_private.log_admin_write |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | INSERT, SELECT |
