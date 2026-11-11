# site_private.storage_deletion_queue

> Fila mínima de objetos privados para remoção pela Storage API; não contém conteúdo do arquivo.

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
| 1 | `bucket` | `text` | não |  |  |  |
| 2 | `object_path` | `text` | não |  |  |  |
| 3 | `queued_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| storage_deletion_queue_bucket_check | CHECK | `CHECK (bucket = ANY (ARRAY['customer-briefing-assets'::text, 'customer-proposals'::text]))` |  |  | sim |
| storage_deletion_queue_object_path_check | CHECK | `CHECK (length(object_path) >= 2 AND length(object_path) <= 500 AND object_path !~ '(^\|/)\.\.(/\|$)'::text)` |  |  | sim |
| storage_deletion_queue_pkey | PRIMARY KEY | `PRIMARY KEY (bucket, object_path)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| storage_deletion_queue_pkey | btree | bucket, object_path | sim | sim |  | `CREATE UNIQUE INDEX storage_deletion_queue_pkey ON site_private.storage_deletion_queue USING btree (bucket, object_path)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| storage_deletion_queue_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |


## Grants

_nenhum_
