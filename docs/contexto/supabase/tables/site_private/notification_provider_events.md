# site_private.notification_provider_events

> Deduplicação de eventos de webhook de entrega/devolução (Etapa 30). Sem conteúdo pessoal — apenas ids de correlação do provedor.

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
| 2 | `provider` | `text` | não |  |  |  |
| 3 | `provider_event_id` | `text` | não |  |  |  |
| 4 | `event_type` | `text` | não |  |  |  |
| 5 | `delivery_id` | `uuid` | sim |  |  |  |
| 6 | `received_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `provider_message_id` | `text` | sim |  |  | F-12: id da mensagem no provedor, preservado no evento para o re-vínculo de evento que chegou antes do aceite. Eventos anteriores a esta migration não têm o valor e só podem ser expurgados. |
| 8 | `bounce_reason` | `text` | sim |  |  | F-12: motivo do bounce tal como o webhook enviou, preservado no evento para o re-vínculo (antes só existia em notification_deliveries, o que exigia a entrega já vinculada). |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| notification_provider_events_bounce_reason_check | CHECK | `CHECK (bounce_reason IS NULL OR length(bounce_reason) <= 200)` |  |  | sim |
| notification_provider_events_delivery_id_fkey | FOREIGN KEY | `FOREIGN KEY (delivery_id) REFERENCES site_private.notification_deliveries(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| notification_provider_events_event_type_check | CHECK | `CHECK (event_type = ANY (ARRAY['delivered'::text, 'bounced'::text, 'complained'::text]))` |  |  | sim |
| notification_provider_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| notification_provider_events_provider_check | CHECK | `CHECK (provider = ANY (ARRAY['resend'::text, 'meta-whatsapp-cloud'::text]))` |  |  | sim |
| notification_provider_events_provider_event_id_check | CHECK | `CHECK (length(provider_event_id) >= 1 AND length(provider_event_id) <= 240)` |  |  | sim |
| notification_provider_events_provider_message_id_check | CHECK | `CHECK (provider_message_id IS NULL OR length(provider_message_id) >= 1 AND length(provider_message_id) <= 240)` |  |  | sim |
| notification_provider_events_provider_provider_event_id_key | UNIQUE | `UNIQUE (provider, provider_event_id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| site_private.notification_deliveries | notification_deliveries_delivery_state_source_event_id_fkey | delivery_state_source_event_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| notification_provider_events_delivery_id_idx | btree | delivery_id | não | sim | `(delivery_id IS NOT NULL)` | `CREATE INDEX notification_provider_events_delivery_id_idx ON site_private.notification_provider_events USING btree (delivery_id) WHERE (delivery_id IS NOT NULL)` |
| notification_provider_events_orphan_idx | btree | provider, provider_message_id | não | sim | `(delivery_id IS NULL)` | `CREATE INDEX notification_provider_events_orphan_idx ON site_private.notification_provider_events USING btree (provider, provider_message_id) WHERE (delivery_id IS NULL)` |
| notification_provider_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX notification_provider_events_pkey ON site_private.notification_provider_events USING btree (id)` |
| notification_provider_events_provider_provider_event_id_key | btree | provider, provider_event_id | sim | sim |  | `CREATE UNIQUE INDEX notification_provider_events_provider_provider_event_id_key ON site_private.notification_provider_events USING btree (provider, provider_event_id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| notification_provider_events_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | site_private.log_admin_write |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | INSERT, SELECT |
