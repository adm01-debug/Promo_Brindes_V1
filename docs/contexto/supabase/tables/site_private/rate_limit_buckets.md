# site_private.rate_limit_buckets

> Etapa 30: UNLOGGED de propósito — só hash + contador efêmero, purgado pela retenção diária. Perda em crash reseta uma janela de rate limit, não é um problema de integridade.

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
| 1 | `request_kind` | `text` | não |  |  |  |
| 2 | `identifier_hash` | `text` | não |  |  |  |
| 3 | `window_started_at` | `timestamp with time zone` | não |  |  |  |
| 4 | `request_count` | `integer` | não |  |  |  |
| 5 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| rate_limit_buckets_identifier_hash_check | CHECK | `CHECK (identifier_hash ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| rate_limit_buckets_pkey | PRIMARY KEY | `PRIMARY KEY (request_kind, identifier_hash)` |  |  | sim |
| rate_limit_buckets_request_count_check | CHECK | `CHECK (request_count > 0)` |  |  | sim |
| rate_limit_buckets_request_kind_check | CHECK | `CHECK (request_kind = ANY (ARRAY['quote'::text, 'contact'::text, 'quote_preflight'::text, 'contact_preflight'::text, 'adjustment'::text, 'briefing_asset_verification'::text, 'proposal_download'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| rate_limit_buckets_pkey | btree | request_kind, identifier_hash | sim | sim |  | `CREATE UNIQUE INDEX rate_limit_buckets_pkey ON site_private.rate_limit_buckets USING btree (request_kind, identifier_hash)` |
| rate_limit_buckets_updated_at_idx | btree | updated_at | não | sim |  | `CREATE INDEX rate_limit_buckets_updated_at_idx ON site_private.rate_limit_buckets USING btree (updated_at)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | DELETE, INSERT, SELECT, UPDATE |
