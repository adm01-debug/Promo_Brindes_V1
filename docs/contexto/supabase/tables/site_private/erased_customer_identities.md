# site_private.erased_customer_identities

> Túmulos SHA-256 irreversíveis de identidades apagadas por solicitação LGPD; impedem a reapropriação posterior do histórico sem preservar o e-mail.

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
| 1 | `email_sha256` | `text` | não |  |  | SHA-256 hexadecimal do e-mail normalizado; nunca armazena o endereço original. |
| 2 | `erased_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `auth_users_deleted` | `integer` | não | `0` |  | Maior quantidade de contas Auth removidas nas execuções idempotentes deste apagamento. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| erased_customer_identities_auth_users_deleted_check | CHECK | `CHECK (auth_users_deleted >= 0)` |  |  | sim |
| erased_customer_identities_email_sha256_check | CHECK | `CHECK (email_sha256 ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| erased_customer_identities_pkey | PRIMARY KEY | `PRIMARY KEY (email_sha256)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| erased_customer_identities_pkey | btree | email_sha256 | sim | sim |  | `CREATE UNIQUE INDEX erased_customer_identities_pkey ON site_private.erased_customer_identities USING btree (email_sha256)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| erased_customer_identities_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
