# site_private.consent_receipts

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
| 2 | `request_kind` | `text` | não |  |  |  |
| 3 | `quote_request_id` | `uuid` | sim |  |  |  |
| 4 | `contact_request_id` | `uuid` | sim |  |  |  |
| 5 | `purpose` | `text` | não | `'commercial_contact'::text` |  |  |
| 6 | `accepted` | `boolean` | não |  |  |  |
| 7 | `notice_version` | `text` | não |  |  |  |
| 8 | `client_accepted_at` | `timestamp with time zone` | não |  |  |  |
| 9 | `server_recorded_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| consent_receipts_accepted_check | CHECK | `CHECK (accepted IS TRUE)` |  |  | sim |
| consent_receipts_check | CHECK | `CHECK (request_kind = 'quote'::text AND quote_request_id IS NOT NULL AND contact_request_id IS NULL OR request_kind = 'contact'::text AND contact_request_id IS NOT NULL AND quote_request_id IS NULL)` |  |  | sim |
| consent_receipts_contact_request_id_fkey | FOREIGN KEY | `FOREIGN KEY (contact_request_id) REFERENCES site_private.contact_requests(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| consent_receipts_notice_version_check | CHECK | `CHECK (length(notice_version) >= 1 AND length(notice_version) <= 40)` |  |  | sim |
| consent_receipts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| consent_receipts_purpose_check | CHECK | `CHECK (purpose = 'commercial_contact'::text)` |  |  | sim |
| consent_receipts_quote_request_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_request_id) REFERENCES site_private.quote_requests(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| consent_receipts_request_kind_check | CHECK | `CHECK (request_kind = ANY (ARRAY['quote'::text, 'contact'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| consent_receipts_contact_request_id_idx | btree | contact_request_id | não | sim | `(contact_request_id IS NOT NULL)` | `CREATE INDEX consent_receipts_contact_request_id_idx ON site_private.consent_receipts USING btree (contact_request_id) WHERE (contact_request_id IS NOT NULL)` |
| consent_receipts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX consent_receipts_pkey ON site_private.consent_receipts USING btree (id)` |
| consent_receipts_quote_request_id_idx | btree | quote_request_id | não | sim | `(quote_request_id IS NOT NULL)` | `CREATE INDEX consent_receipts_quote_request_id_idx ON site_private.consent_receipts USING btree (quote_request_id) WHERE (quote_request_id IS NOT NULL)` |
| consent_receipts_server_recorded_at_idx | btree | server_recorded_at | não | sim |  | `CREATE INDEX consent_receipts_server_recorded_at_idx ON site_private.consent_receipts USING btree (server_recorded_at DESC)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| consent_receipts_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | INSERT, SELECT |
