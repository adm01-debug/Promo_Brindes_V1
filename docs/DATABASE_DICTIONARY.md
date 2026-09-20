# Dicionário de dados — site_private (Etapa 35)

Gerado por `npm run db:site:dictionary` a partir de `pg_description` no banco local, na versão do schema da migration mais recente (2026-09-17). Não editar à mão — a fonte de verdade é o comentário na migration (`comment on table`/`comment on column`); rode o script de novo depois de qualquer mudança de schema.

## Tabelas

### `site_private.admin_audit_log`

Etapa 36: audita escritas em tabelas de negócio feitas por qualquer role além de site_api/service_role — ou seja, fora do caminho normal da API (Studio, SQL manual). Não registra o conteúdo da linha, só que uma escrita aconteceu, quem e quando.

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `bigint` | — |
| `table_name` | `text` | — |
| `operation` | `text` | — |
| `row_id` | `text` | — |
| `performed_by` | `text` | — |
| `application_name` | `text` | — |
| `occurred_at` | `timestamp with time zone` | — |

### `site_private.admin_ddl_log`

Etapa 36: DDL (create/alter/drop) fora do fluxo de migrations do CLI. Toda migration legítima também aparece aqui — não é um sinal de problema por si só, é o registro bruto para cruzar com o histórico de migrations quando precisar auditar.

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `bigint` | — |
| `command_tag` | `text` | — |
| `object_type` | `text` | — |
| `schema_name` | `text` | — |
| `performed_by` | `text` | — |
| `occurred_at` | `timestamp with time zone` | — |

### `site_private.consent_receipts`

_Sem comment on table — considerar adicionar um na próxima migration que tocar esta tabela._

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `uuid` | — |
| `request_kind` | `text` | — |
| `quote_request_id` | `uuid` | — |
| `contact_request_id` | `uuid` | — |
| `purpose` | `text` | — |
| `accepted` | `boolean` | — |
| `notice_version` | `text` | — |
| `client_accepted_at` | `timestamp with time zone` | — |
| `server_recorded_at` | `timestamp with time zone` | — |

### `site_private.contact_requests`

_Sem comment on table — considerar adicionar um na próxima migration que tocar esta tabela._

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `uuid` | — |
| `client_request_id` | `text` | — |
| `request_hash` | `text` | — |
| `source` | `text` | — |
| `status` | `text` | — |
| `contact_name` | `text` | — |
| `email` | `text` | — |
| `phone` | `text` | — |
| `page_url` | `text` | — |
| `client_submitted_at` | `timestamp with time zone` | — |
| `request_metadata` | `jsonb` | — |
| `retention_until` | `timestamp with time zone` | — |
| `created_at` | `timestamp with time zone` | — |
| `updated_at` | `timestamp with time zone` | — |
| `message` | `text` | Contexto opcional da conversa, limitado a 800 caracteres e retido no banco isolado do site. |
| `preferred_channel` | `text` | Preferência opcional de retorno; não representa consentimento para disparo automático. |

### `site_private.customer_profiles`

_Sem comment on table — considerar adicionar um na próxima migration que tocar esta tabela._

| Coluna | Tipo | Comentário |
|---|---|---|
| `user_id` | `uuid` | — |
| `verified_email` | `text` | — |
| `display_name` | `text` | — |
| `company` | `text` | — |
| `created_at` | `timestamp with time zone` | — |
| `updated_at` | `timestamp with time zone` | — |

### `site_private.notification_deliveries`

Auditoria de entregas futuras. WhatsApp exige consentimento específico antes da criação do registro. Etapa 40: fillfactor 80 deixa espaço para HOT updates nos vários updates por linha (claim, aceite, finalização, webhook); autovacuum mais agressivo que o padrão (20%) evita acúmulo de tuplas mortas.

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `uuid` | — |
| `request_kind` | `text` | — |
| `request_id` | `uuid` | — |
| `channel` | `text` | — |
| `audience` | `text` | — |
| `provider` | `text` | — |
| `provider_message_id` | `text` | — |
| `status` | `text` | — |
| `attempts` | `smallint` | — |
| `last_error_code` | `text` | — |
| `last_error_at` | `timestamp with time zone` | — |
| `sent_at` | `timestamp with time zone` | — |
| `created_at` | `timestamp with time zone` | — |
| `updated_at` | `timestamp with time zone` | — |
| `next_attempt_at` | `timestamp with time zone` | — |
| `lease_token` | `uuid` | Identifica a reivindicação corrente; finalize_site_notification_delivery só aceita o token da reivindicação ativa (R04). |
| `delivery_state` | `text` | Resultado terminal pós-aceite (Etapa 30): delivered ou bounced. Mutuamente exclusivos; só grava se ainda null (primeiro evento vence, sem depender de clock do provedor). |
| `delivery_state_at` | `timestamp with time zone` | — |
| `bounce_reason` | `text` | Categoria curta fornecida pelo provedor (ex. Resend bounce.type, Meta errors[].title) — não é texto livre do usuário. |
| `complained_at` | `timestamp with time zone` | Reclamação de spam (Etapa 30), independente de delivery_state: uma mensagem pode ser entregue e só depois reclamada. |
| `claimed_at` | `timestamp with time zone` | Instante da reivindicação corrente (Etapa 10). Histórico: não é limpo na finalização, só na próxima reivindicação. |
| `lease_expires_at` | `timestamp with time zone` | Prazo da reivindicação corrente (Etapa 10). Substitui a inferência antiga por updated_at, que record_site_notification_provider_acceptance prorrogava sem essa ser uma decisão explícita. Null sempre que status <> processing (Etapa 9). |
| `delivery_state_source_event_id` | `uuid` | Etapa 20: qual evento de webhook determinou o delivery_state atual — rastreabilidade quando um bounced tardio sobrescreve um delivered anterior. |

### `site_private.notification_provider_events`

Deduplicação de eventos de webhook de entrega/devolução (Etapa 30). Sem conteúdo pessoal — apenas ids de correlação do provedor.

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `uuid` | — |
| `provider` | `text` | — |
| `provider_event_id` | `text` | — |
| `event_type` | `text` | — |
| `delivery_id` | `uuid` | — |
| `received_at` | `timestamp with time zone` | — |

### `site_private.proposal_documents`

_Sem comment on table — considerar adicionar um na próxima migration que tocar esta tabela._

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `uuid` | — |
| `quote_request_id` | `uuid` | — |
| `version` | `integer` | — |
| `title` | `text` | — |
| `storage_bucket` | `text` | — |
| `storage_path` | `text` | — |
| `valid_until` | `date` | — |
| `published_at` | `timestamp with time zone` | — |
| `superseded_at` | `timestamp with time zone` | — |
| `created_at` | `timestamp with time zone` | — |

### `site_private.quote_adjustment_requests`

_Sem comment on table — considerar adicionar um na próxima migration que tocar esta tabela._

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `uuid` | — |
| `quote_request_id` | `uuid` | — |
| `requested_by` | `uuid` | — |
| `client_request_id` | `text` | — |
| `message` | `text` | — |
| `status` | `text` | — |
| `created_at` | `timestamp with time zone` | — |
| `updated_at` | `timestamp with time zone` | — |

### `site_private.quote_items`

Snapshot do produto no instante do briefing; sem FK entre projetos Supabase.

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `uuid` | — |
| `quote_request_id` | `uuid` | — |
| `position` | `smallint` | — |
| `source_product_id` | `text` | — |
| `item_key` | `text` | — |
| `product_slug` | `text` | — |
| `product_name_snapshot` | `text` | — |
| `sku_snapshot` | `text` | — |
| `image_url_snapshot` | `text` | — |
| `quantity` | `integer` | — |
| `minimum_quantity_snapshot` | `integer` | — |
| `color_name_snapshot` | `text` | — |
| `color_hex_snapshot` | `text` | — |
| `created_at` | `timestamp with time zone` | — |
| `variant_id_snapshot` | `text` | Identificador publicado da variante selecionada, preservado no retrato do briefing. |
| `decision_group_snapshot` | `text` | Indica se a referência foi enviada como principal ou alternativa; preserva a intenção no retrato do briefing. |

### `site_private.quote_request_events`

_Sem comment on table — considerar adicionar um na próxima migration que tocar esta tabela._

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `uuid` | — |
| `quote_request_id` | `uuid` | — |
| `event_type` | `text` | — |
| `status` | `text` | — |
| `title` | `text` | — |
| `description` | `text` | — |
| `audience` | `text` | — |
| `created_at` | `timestamp with time zone` | — |
| `sequence` | `bigint` | Ordem de inserção monotônica (Etapa 7). Usar em vez de created_at para ordenar eventos do mesmo pedido: created_at é fixo por transação e não desempata eventos inseridos juntos. |

### `site_private.quote_requests`

_Sem comment on table — considerar adicionar um na próxima migration que tocar esta tabela._

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `uuid` | — |
| `client_request_id` | `text` | — |
| `request_hash` | `text` | — |
| `source` | `text` | — |
| `status` | `text` | — |
| `contact_name` | `text` | — |
| `company` | `text` | — |
| `email` | `text` | — |
| `phone` | `text` | — |
| `city` | `text` | — |
| `desired_deadline` | `date` | — |
| `notes` | `text` | — |
| `page_url` | `text` | — |
| `client_submitted_at` | `timestamp with time zone` | — |
| `request_metadata` | `jsonb` | — |
| `retention_until` | `timestamp with time zone` | — |
| `created_at` | `timestamp with time zone` | — |
| `updated_at` | `timestamp with time zone` | — |
| `customer_user_id` | `uuid` | — |
| `protocol` | `text` | Etapa 19: protocolo público persistido (PB + ano 2 dígitos + sequência 6 dígitos + dígito verificador mod 11). Substitui upper(left(id::text,8)), que não tinha garantia de unicidade nem verificação. |

### `site_private.rate_limit_buckets`

Etapa 30: UNLOGGED de propósito — só hash + contador efêmero, purgado pela retenção diária. Perda em crash reseta uma janela de rate limit, não é um problema de integridade.

| Coluna | Tipo | Comentário |
|---|---|---|
| `request_kind` | `text` | — |
| `identifier_hash` | `text` | — |
| `window_started_at` | `timestamp with time zone` | — |
| `request_count` | `integer` | — |
| `updated_at` | `timestamp with time zone` | — |

### `site_private.shared_selection_rate_limits`

Etapa 30: UNLOGGED de propósito — mesmo racional de rate_limit_buckets.

| Coluna | Tipo | Comentário |
|---|---|---|
| `identifier_hash` | `text` | — |
| `window_started_at` | `timestamp with time zone` | — |
| `request_count` | `integer` | — |
| `updated_at` | `timestamp with time zone` | — |

### `site_private.shared_selections`

_Sem comment on table — considerar adicionar um na próxima migration que tocar esta tabela._

| Coluna | Tipo | Comentário |
|---|---|---|
| `token` | `uuid` | — |
| `management_token_hash` | `text` | — |
| `items` | `jsonb` | — |
| `expires_at` | `timestamp with time zone` | — |
| `revoked_at` | `timestamp with time zone` | — |
| `created_at` | `timestamp with time zone` | — |
| `updated_at` | `timestamp with time zone` | — |

### `site_private.status_transitions`

Transições administrativas válidas por entidade (Etapa 8). Fonte única de verdade para os triggers enforce_status_transition; qualquer update de status fora desta tabela é rejeitado com 22023.

| Coluna | Tipo | Comentário |
|---|---|---|
| `entity` | `text` | — |
| `from_status` | `text` | — |
| `to_status` | `text` | — |

## Funções públicas (`public`)

| Função | Argumentos | Comentário |
|---|---|---|
| `apply_site_notification_provider_event` | `p_provider text, p_provider_message_id text, p_event_type text, p_provider_event_id text, p_occurred_at timestamp with time zone, p_bounce_reason text` | Aplica evento de webhook de forma idempotente (Etapa 30 do plano anterior). delivered só grava se delivery_state ainda for null; bounced grava se null OU se o estado atual for delivered — um bounce tardio corrige um delivered otimista (Etapa 20 do plano de correções). complained é independente e idempotente via coalesce. |
| `claim_my_quote_requests` | `` | Associa solicitações sem titular somente após confirmação do e-mail da identidade autenticada. |
| `claim_site_notification_deliveries` | `p_channels text[], p_batch_size integer` | Reivindica lote da fila assíncrona; lê limites de site_private.notification_policy() (Etapa 12), grava lease_expires_at explícito (Etapa 10) e expõe o protocolo persistido (Etapa 19). |
| `claim_site_quote_notification` | `p_request_id uuid, p_channel text` | Reivindicação síncrona imediata (não recupera processing preso). Lê limites de site_private.notification_policy() (Etapa 12) e expõe o protocolo persistido (Etapa 19). |
| `create_site_contact_request` | `p_payload jsonb, p_request_meta jsonb` | — |
| `create_site_quote_request` | `p_payload jsonb, p_request_meta jsonb` | — |
| `create_site_shared_selection` | `p_items jsonb, p_management_token_hash text, p_identifier_hash text` | — |
| `erase_customer_data` | `p_email text` | Etapa 32: apagamento de titular (LGPD art. 18). Anonimiza quote_requests/contact_requests/customer_profiles em vez de apagar (preserva id/datas/protocolo para integridade referencial e evidência de conformidade); apaga proposal_documents (o PDF pode conter PII no conteúdo, não só nos metadados) e devolve os caminhos de Storage para o chamador limpar. Idempotente: reexecutar para o mesmo e-mail não reprocessa linhas já anonimizadas. Não cobre texto livre (message de contact_requests/quote_adjustment_requests) — sem análise de conteúdo não dá para distinguir PII digitada de conteúdo legítimo. |
| `finalize_site_data_retention` | `p_quote_ids uuid[], p_storage_paths text[], p_batch_size integer` | — |
| `finalize_site_notification_delivery` | `p_delivery_id uuid, p_lease_token uuid, p_status text, p_provider text, p_provider_message_id text, p_error_code text, p_retry_after_seconds integer` | Finaliza uma tentativa previamente reivindicada; exige o lease_token da reivindicação ativa (R04). Backoff exponencial com jitter via site_private.next_retry_at (Etapa 11); p_retry_after_seconds é só um piso opcional do provedor. |
| `get_my_proposal_document` | `p_proposal_id uuid` | Entrega o local de um documento somente ao cliente proprietário para assinatura server-side. |
| `get_my_quote_request` | `p_request_id uuid` | Retorna detalhe e contexto de curadoria somente ao auth.uid() proprietário, sem metadados operacionais. |
| `get_my_quote_requests` | `p_limit integer, p_offset integer, p_status text, p_search text` | Lista solicitações do auth.uid() com título de ação, miniaturas e última movimentação visível ao cliente. |
| `get_site_data_retention_candidates` | `p_batch_size integer` | — |
| `get_site_shared_selection` | `p_token uuid` | — |
| `record_site_notification_provider_acceptance` | `p_delivery_id uuid, p_lease_token uuid, p_provider text, p_provider_message_id text` | Registra o aceite do provedor antes da finalização, para reconciliação em caso de falha na etapa seguinte (R01, R02). |
| `request_my_quote_adjustment` | `p_request_id uuid, p_message text, p_client_request_id text` | Registra um pedido de ajuste somente para o titular autenticado da solicitação, mantendo o texto no schema privado. |
| `revoke_site_shared_selection` | `p_token uuid, p_management_token_hash text` | — |
| `site_notification_queue_health` | `` | Idade do job elegível mais antigo e contagem de exhausted por canal (Etapa 29); devolve só contagens e canais, sem conteúdo pessoal. |
