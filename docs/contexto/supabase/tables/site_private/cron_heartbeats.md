# site_private.cron_heartbeats

> Heartbeat dos crons do site (F-87). Uma linha por cron agendado em vercel.json; escrita so pela RPC record_cron_heartbeat.

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
| 1 | `name` | `text` | não |  |  |  |
| 2 | `installed_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `last_ok_at` | `timestamp with time zone` | sim |  |  |  |
| 4 | `last_failed_at` | `timestamp with time zone` | sim |  |  |  |
| 5 | `last_failure_detail` | `text` | sim |  |  |  |
| 6 | `consecutive_failures` | `integer` | não | `0` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cron_heartbeats_consecutive_failures_check | CHECK | `CHECK (consecutive_failures >= 0)` |  |  | sim |
| cron_heartbeats_last_failure_detail_check | CHECK | `CHECK (last_failure_detail IS NULL OR length(last_failure_detail) <= 240)` |  |  | sim |
| cron_heartbeats_name_check | CHECK | `CHECK (name = ANY (ARRAY['retention'::text, 'notifications'::text, 'commercial-alerts'::text]))` |  |  | sim |
| cron_heartbeats_pkey | PRIMARY KEY | `PRIMARY KEY (name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cron_heartbeats_pkey | btree | name | sim | sim |  | `CREATE UNIQUE INDEX cron_heartbeats_pkey ON site_private.cron_heartbeats USING btree (name)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | SELECT |
