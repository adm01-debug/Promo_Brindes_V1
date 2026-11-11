# site_private.status_transitions

> Transições administrativas válidas por entidade (Etapa 8). Fonte única de verdade para os triggers enforce_status_transition; qualquer update de status fora desta tabela é rejeitado com 22023.

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
| 1 | `entity` | `text` | não |  |  |  |
| 2 | `from_status` | `text` | não |  |  |  |
| 3 | `to_status` | `text` | não |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| status_transitions_entity_check | CHECK | `CHECK (entity = ANY (ARRAY['quote_requests'::text, 'contact_requests'::text, 'notification_deliveries'::text]))` |  |  | sim |
| status_transitions_pkey | PRIMARY KEY | `PRIMARY KEY (entity, from_status, to_status)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| status_transitions_pkey | btree | entity, from_status, to_status | sim | sim |  | `CREATE UNIQUE INDEX status_transitions_pkey ON site_private.status_transitions USING btree (entity, from_status, to_status)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | SELECT |
