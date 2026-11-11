# site_private.notification_deliveries

> Auditoria de entregas futuras. WhatsApp exige consentimento específico antes da criação do registro. Etapa 40: fillfactor 80 deixa espaço para HOT updates nos vários updates por linha (claim, aceite, finalização, webhook); autovacuum mais agressivo que o padrão (20%) evita acúmulo de tuplas mortas.

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
| 3 | `request_id` | `uuid` | não |  |  |  |
| 4 | `channel` | `text` | não |  |  |  |
| 5 | `audience` | `text` | não |  |  |  |
| 6 | `provider` | `text` | sim |  |  |  |
| 7 | `provider_message_id` | `text` | sim |  |  |  |
| 8 | `status` | `text` | não | `'pending'::text` |  |  |
| 9 | `attempts` | `smallint` | não | `0` |  |  |
| 10 | `last_error_code` | `text` | sim |  |  |  |
| 11 | `last_error_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `sent_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `next_attempt_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `lease_token` | `uuid` | sim |  |  | Identifica a reivindicação corrente; finalize_site_notification_delivery só aceita o token da reivindicação ativa (R04). |
| 17 | `delivery_state` | `text` | sim |  |  | Resultado terminal pós-aceite (Etapa 30): delivered ou bounced. Mutuamente exclusivos; só grava se ainda null (primeiro evento vence, sem depender de clock do provedor). |
| 18 | `delivery_state_at` | `timestamp with time zone` | sim |  |  |  |
| 19 | `bounce_reason` | `text` | sim |  |  | Categoria curta fornecida pelo provedor (ex. Resend bounce.type, Meta errors[].title) — não é texto livre do usuário. |
| 20 | `complained_at` | `timestamp with time zone` | sim |  |  | Reclamação de spam (Etapa 30), independente de delivery_state: uma mensagem pode ser entregue e só depois reclamada. |
| 21 | `claimed_at` | `timestamp with time zone` | sim |  |  | Instante da reivindicação corrente (Etapa 10). Histórico: não é limpo na finalização, só na próxima reivindicação. |
| 22 | `lease_expires_at` | `timestamp with time zone` | sim |  |  | Prazo da reivindicação corrente (Etapa 10). Substitui a inferência antiga por updated_at, que record_site_notification_provider_acceptance prorrogava sem essa ser uma decisão explícita. Null sempre que status <> processing (Etapa 9). |
| 23 | `delivery_state_source_event_id` | `uuid` | sim |  |  | Etapa 20: qual evento de webhook determinou o delivery_state atual — rastreabilidade quando um bounced tardio sobrescreve um delivered anterior. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| notification_deliveries_attempts_check | CHECK | `CHECK (attempts >= 0 AND attempts <= 20)` |  |  | sim |
| notification_deliveries_audience_check | CHECK | `CHECK (audience = ANY (ARRAY['customer'::text, 'commercial_team'::text]))` |  |  | sim |
| notification_deliveries_bounce_reason_check | CHECK | `CHECK (bounce_reason IS NULL OR length(bounce_reason) <= 200)` |  |  | sim |
| notification_deliveries_channel_check | CHECK | `CHECK (channel = ANY (ARRAY['email'::text, 'whatsapp'::text]))` |  |  | sim |
| notification_deliveries_delivery_state_check | CHECK | `CHECK (delivery_state = ANY (ARRAY['delivered'::text, 'bounced'::text]))` |  |  | sim |
| notification_deliveries_delivery_state_source_event_id_fkey | FOREIGN KEY | `FOREIGN KEY (delivery_state_source_event_id) REFERENCES site_private.notification_provider_events(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| notification_deliveries_lease_matches_status | CHECK | `CHECK (status = 'processing'::text AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL OR status <> 'processing'::text AND lease_token IS NULL AND lease_expires_at IS NULL)` |  |  | sim |
| notification_deliveries_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| notification_deliveries_request_kind_check | CHECK | `CHECK (request_kind = ANY (ARRAY['quote'::text, 'contact'::text]))` |  |  | sim |
| notification_deliveries_request_kind_request_id_channel_aud_key | UNIQUE | `UNIQUE (request_kind, request_id, channel, audience)` |  |  | sim |
| notification_deliveries_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text, 'cancelled'::text, 'exhausted'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| site_private.notification_provider_events | notification_provider_events_delivery_id_fkey | delivery_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| notification_deliveries_delivery_state_source_event_idx | btree | delivery_state_source_event_id | não | sim | `(delivery_state_source_event_id IS NOT NULL)` | `CREATE INDEX notification_deliveries_delivery_state_source_event_idx ON site_private.notification_deliveries USING btree (delivery_state_source_event_id) WHERE (delivery_state_source_event_id IS NOT NULL)` |
| notification_deliveries_pending_idx | btree | status, created_at | não | sim | `(status = ANY (ARRAY['pending'::text, 'failed'::text]))` | `CREATE INDEX notification_deliveries_pending_idx ON site_private.notification_deliveries USING btree (status, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]))` |
| notification_deliveries_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX notification_deliveries_pkey ON site_private.notification_deliveries USING btree (id)` |
| notification_deliveries_processing_lease_idx | btree | lease_expires_at | não | sim | `(status = 'processing'::text)` | `CREATE INDEX notification_deliveries_processing_lease_idx ON site_private.notification_deliveries USING btree (lease_expires_at) WHERE (status = 'processing'::text)` |
| notification_deliveries_provider_message_key | btree | provider, provider_message_id | sim | sim | `(provider_message_id IS NOT NULL)` | `CREATE UNIQUE INDEX notification_deliveries_provider_message_key ON site_private.notification_deliveries USING btree (provider, provider_message_id) WHERE (provider_message_id IS NOT NULL)` |
| notification_deliveries_request_kind_request_id_channel_aud_key | btree | request_kind, request_id, channel, audience | sim | sim |  | `CREATE UNIQUE INDEX notification_deliveries_request_kind_request_id_channel_aud_key ON site_private.notification_deliveries USING btree (request_kind, request_id, channel, audience)` |
| notification_deliveries_retry_idx | btree | next_attempt_at, created_at | não | sim | `(status = ANY (ARRAY['pending'::text, 'failed'::text, 'processing'::text]))` | `CREATE INDEX notification_deliveries_retry_idx ON site_private.notification_deliveries USING btree (next_attempt_at, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text, 'processing'::text]))` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| notification_deliveries_enforce_lease_and_attempts | BEFORE | UPDATE | ROW | enabled | site_private.enforce_notification_delivery_lease_and_attempts |
| notification_deliveries_enforce_status_transition | BEFORE | UPDATE | ROW | enabled | site_private.enforce_status_transition |
| notification_deliveries_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | disabled | site_private.log_admin_write |
| notification_deliveries_set_updated_at | BEFORE | UPDATE | ROW | enabled | site_private.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | DELETE, INSERT, SELECT, UPDATE |
