# Dicionário de dados — site_private (Etapa 35)

Gerado por `npm run db:site:dictionary` a partir de `pg_description` no banco local, na versão do schema da migration mais recente (2026-11-22). Não editar à mão — a fonte de verdade é o comentário na migration (`comment on table`/`comment on column`); rode o script de novo depois de qualquer mudança de schema.

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

### `site_private.commercial_audit_log`

Trilha append-only das escritas feitas pelo back-office (F-03): quem mudou o quê e quando. Sem policy para anon/authenticated; leitura só por service_role.

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `bigint` | — |
| `actor_user_id` | `uuid` | — |
| `actor_label` | `text` | — |
| `action` | `text` | — |
| `quote_request_id` | `uuid` | — |
| `detail` | `jsonb` | — |
| `created_at` | `timestamp with time zone` | — |

### `site_private.commercial_operators`

Allowlist do back-office comercial (F-03). Só service_role escreve; as RPCs de escrita comercial recusam chamador fora daqui, mesmo com JWT válido.

| Coluna | Tipo | Comentário |
|---|---|---|
| `user_id` | `uuid` | — |
| `display_name` | `text` | — |
| `is_active` | `boolean` | — |
| `created_at` | `timestamp with time zone` | — |
| `updated_at` | `timestamp with time zone` | — |

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

### `site_private.cron_heartbeats`

Heartbeat dos crons do site (F-87). Uma linha por cron agendado em vercel.json; escrita so pela RPC record_cron_heartbeat.

| Coluna | Tipo | Comentário |
|---|---|---|
| `name` | `text` | — |
| `installed_at` | `timestamp with time zone` | — |
| `last_ok_at` | `timestamp with time zone` | — |
| `last_failed_at` | `timestamp with time zone` | — |
| `last_failure_detail` | `text` | — |
| `consecutive_failures` | `integer` | — |
| `updated_at` | `timestamp with time zone` | — |

### `site_private.customer_briefing_assets`

Logos e referências privadas em PNG, JPEG ou WebP. PDFs ficam bloqueados até existir análise estrutural/CDR isolada e antimalware.

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `uuid` | — |
| `customer_user_id` | `uuid` | — |
| `quote_request_id` | `uuid` | — |
| `kind` | `text` | — |
| `original_name` | `text` | — |
| `storage_bucket` | `text` | — |
| `storage_path` | `text` | — |
| `mime_type` | `text` | — |
| `size_bytes` | `integer` | — |
| `created_at` | `timestamp with time zone` | — |
| `expires_at` | `timestamp with time zone` | — |
| `verified_at` | `timestamp with time zone` | Preenchido somente pela API do site após ler o blob privado e validar sua assinatura binária. |

### `site_private.customer_occasion_favorites`

IDs de datas comemorativas escolhidas pelo titular. A lista editorial fica no frontend; a conta guarda somente o ID e o vínculo é apagado com auth.users.

| Coluna | Tipo | Comentário |
|---|---|---|
| `customer_user_id` | `uuid` | — |
| `occasion_id` | `text` | — |
| `created_at` | `timestamp with time zone` | — |
| `updated_at` | `timestamp with time zone` | — |

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

### `site_private.customer_selections`

Rascunhos privados do titular, sem preço nem estoque. A FK apaga ao excluir a conta; pedido de apagamento do titular remove via trigger do perfil; arquivados são purgados após 90 dias.

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `uuid` | — |
| `customer_user_id` | `uuid` | — |
| `title` | `text` | — |
| `product_references` | `jsonb` | IDs públicos, quantidade, variante, decisão e, quando aplicável, grupo/nome/quantidade/unidades por kit. Sem preço nem estoque. |
| `campaign` | `jsonb` | — |
| `version` | `integer` | — |
| `archived_at` | `timestamp with time zone` | — |
| `created_at` | `timestamp with time zone` | — |
| `updated_at` | `timestamp with time zone` | — |

### `site_private.erased_customer_identities`

Túmulos SHA-256 irreversíveis de identidades apagadas por solicitação LGPD; impedem a reapropriação posterior do histórico sem preservar o e-mail.

| Coluna | Tipo | Comentário |
|---|---|---|
| `email_sha256` | `text` | SHA-256 hexadecimal do e-mail normalizado; nunca armazena o endereço original. |
| `erased_at` | `timestamp with time zone` | — |
| `auth_users_deleted` | `integer` | Maior quantidade de contas Auth removidas nas execuções idempotentes deste apagamento. |

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
| `provider_message_id` | `text` | F-12: id da mensagem no provedor, preservado no evento para o re-vínculo de evento que chegou antes do aceite. Eventos anteriores a esta migration não têm o valor e só podem ser expurgados. |
| `bounce_reason` | `text` | F-12: motivo do bounce tal como o webhook enviou, preservado no evento para o re-vínculo (antes só existia em notification_deliveries, o que exigia a entrega já vinculada). |

### `site_private.pii_read_audit_log`

PF-34: audita leituras (SELECT) de colunas de contato do titular em tabelas de PII. Não armazena o valor lido, só que uma leitura aconteceu, para quem, quando, quantas linhas e com qual filtro.

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `bigint` | — |
| `table_name` | `text` | — |
| `operation` | `text` | — |
| `subject` | `uuid` | Titular cuja PII foi lida. Fica nulo em leitura de operador: a fila comercial pagina muitos titulares de uma vez e só o row_count descreve o volume. |
| `performed_by` | `text` | — |
| `actor_kind` | `text` | titular = o próprio dono leu seus dados; operador = alguém do back-office leu dados de outra pessoa. |
| `filter` | `text` | — |
| `row_count` | `integer` | — |
| `application_name` | `text` | — |
| `occurred_at` | `timestamp with time zone` | — |

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
| `kit_group_id` | `uuid` | Identificador do kit configurado pelo cliente; agrupa componentes no snapshot do briefing. |
| `kit_name_snapshot` | `text` | — |
| `kit_quantity_snapshot` | `integer` | Quantidade de kits usada na aritmética do componente. |
| `units_per_kit_snapshot` | `integer` | Unidades deste componente por kit; quantity deve ser o produto dos dois campos. |

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
| `items` | `jsonb` | Referências compartilhadas por link; preserva prioridade, grupo, nome e multiplicadores de kit. Nomes escolhidos pelo cliente também ficam visíveis ao destinatário. |
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

### `site_private.storage_deletion_queue`

Fila mínima de objetos privados para remoção pela Storage API; não contém conteúdo do arquivo.

| Coluna | Tipo | Comentário |
|---|---|---|
| `bucket` | `text` | — |
| `object_path` | `text` | — |
| `queued_at` | `timestamp with time zone` | — |

### `site_private.subject_right_requests`

Trilha do exercicio dos direitos do titular (LGPD art. 18) na Area do Cliente: access, export, correct e delete. Vinculada a conta e removida pelo cascade de auth.users; o registo persistente do apagamento e o tombstone irreversivel em erased_customer_identities.

| Coluna | Tipo | Comentário |
|---|---|---|
| `id` | `uuid` | — |
| `subject_user_id` | `uuid` | — |
| `right_type` | `text` | Direito exercido: access (confirmacao de tratamento), export (portabilidade), correct (correcao de perfil) ou delete (autoexclusao). |
| `requested_at` | `timestamp with time zone` | — |

## Funções públicas (`public`)

| Função | Argumentos | Comentário |
|---|---|---|
| `apply_site_notification_provider_event` | `p_provider text, p_provider_message_id text, p_event_type text, p_provider_event_id text, p_occurred_at timestamp with time zone, p_bounce_reason text` | Aplica evento de webhook de forma idempotente. delivered só grava se delivery_state ainda for null; bounced grava se null OU se o estado atual for delivered (bounce tardio corrige delivered otimista). complained é independente e idempotente via coalesce. F-12: o evento também guarda provider_message_id e bounce_reason, para o re-vínculo de evento precoce. |
| `attach_my_briefing_assets_to_quote` | `p_request_id uuid, p_asset_ids uuid[]` | — |
| `can_delete_my_unverified_briefing_asset_path` | `p_path text` | Permite limpeza direta somente antes da verificação; depois dela a exclusão ocorre pela fila server-side. |
| `cancel_site_notification_backlog` | `p_reason text` | F-11: porta do back-office para cortar o backlog inelegível da fila de notificações. Exige operador ativo (assert_site_operator) e motivo de 3 a 200 caracteres, que vai para admin_audit_log junto com o nome do operador. Devolve cancelled/scanned/cancelledIds. |
| `check_cron_heartbeats` | `` | Devolve o estado de cada cron do site e se ele esta atrasado segundo o intervalo esperado mais a tolerancia (F-87). |
| `claim_my_quote_requests` | `` | Associa solicitações sem titular somente após confirmação do e-mail da identidade autenticada. |
| `claim_site_commercial_team_alert` | `p_request_id uuid` | F-11/F-12: claim pontual do alerta ao comercial. Devolve null quando o pedido foi apagado (F-30) — suppression por bounce/complaint NAO se aplica aqui: notification_request_suppressed so considera audience = customer e o alerta vai para commercial_team, entao o caminho e so o pedido apagado. Cancela a entrega sem trilha em admin_audit_log (motivo fica em last_error_code). Quando o job e inelegivel por spam, anonimizacao ou idade acima de max_age, cancela COM trilha em admin_audit_log via cancel_ineligible_notification_backlog. A entrega nunca fica pending para sempre. |
| `claim_site_commercial_team_alerts` | `p_batch_size integer` | F-11/F-12: claim em lote dos alertas ao comercial. Antes de reivindicar, cancela as entregas de pedido apagado (F-12), as inelegíveis por spam/anonimização/idade acima de max_age (F-11) e aposenta as que estouraram as tentativas. |
| `claim_site_notification_deliveries` | `p_channels text[], p_batch_size integer` | F-11/F-12: claim em lote das confirmações ao cliente. Antes de reivindicar, cancela as entregas de destinatário suprimido ou pedido apagado (F-12), as inelegíveis por spam/anonimização/idade acima de max_age (F-11) e aposenta as que estouraram as tentativas. |
| `claim_site_quote_notification` | `p_request_id uuid, p_channel text` | F-11/F-12: claim pontual de uma confirmacao ao cliente. Devolve null quando o destinatario esta suprimido (bounce/complaint) ou o pedido foi apagado — cancela a entrega sem trilha em admin_audit_log (motivo fica em last_error_code). Quando o job e inelegivel por spam, anonimizacao ou idade acima de max_age, cancela COM trilha em admin_audit_log via cancel_ineligible_notification_backlog. A entrega nunca fica pending para sempre. |
| `confirm_site_briefing_asset_verification` | `p_id uuid, p_storage_path text, p_mime_type text, p_size_bytes integer` | — |
| `correct_my_data` | `p_display_name text, p_company text` | F-30: correcao — atualiza display_name (2 a 100) e/ou company (2 a 150) do perfil do titular autenticado; campos em branco preservam o valor anterior. Pelo menos um campo deve ser fornecido; entradas invalidas levantam invalid_profile_fields. Registra o exercicio do direito na trilha. |
| `create_my_briefing_asset` | `p_original_name text, p_mime_type text, p_size_bytes integer, p_kind text` | — |
| `create_site_contact_request` | `p_payload jsonb, p_request_meta jsonb` | — |
| `create_site_quote_request` | `p_payload jsonb, p_request_meta jsonb` | — |
| `create_site_shared_selection` | `p_items jsonb, p_management_token_hash text, p_identifier_hash text` | — |
| `delete_my_briefing_asset` | `p_id uuid` | — |
| `delete_my_data` | `` | F-30: autoexclusao — entrega o e-mail verificado do titular a erase_customer_data restrita ao auth.uid() (segundo argumento), que anonimiza registros do proprio titular, remove a conta Auth por cascade e grava o tombstone SHA-256 irreversivel. O JSON devolvido e o mesmo de erase_customer_data (contagens e storagePathsToRemove). |
| `delete_my_selection` | `p_id uuid, p_expected_version integer` | — |
| `erase_customer_data` | `p_email text, p_user_id uuid` | Apagamento idempotente (F-31, F-30, F-05): anonimiza registros e texto livre do titular — inclusive as mensagens que a equipe escreveu na linha do tempo —, cancela entregas reivindicaveis, enfileira blobs, registra tombstone SHA-256 e remove Auth por cascade. Com p_user_id restringe ao auth.uid() do chamador (autoexclusao F-30); sem ele (service_role administrativo) reune todas as contas do e-mail. |
| `export_my_data` | `` | F-30: portabilidade — devolve ao titular autenticado um JSON completo dos registros que o site guarda sobre ele (perfil, orcamentos com itens/eventos/propostas, selecoes, favoritos, contatos, pedidos de ajuste e trilha de direitos). Desde a F-05 cada evento inclui description, o texto visivel na linha do tempo; eventos de audiencia internal continuam fora. O email retornado e o do proprio titular confirmado. |
| `finalize_briefing_asset_retention` | `p_storage_paths text[], p_batch_size integer` | — |
| `finalize_site_data_retention` | `p_quote_ids uuid[], p_storage_paths text[], p_batch_size integer` | — |
| `finalize_site_notification_delivery` | `p_delivery_id uuid, p_lease_token uuid, p_status text, p_provider text, p_provider_message_id text, p_error_code text, p_retry_after_seconds integer` | Finaliza uma tentativa previamente reivindicada; exige o lease_token da reivindicação ativa (R04). Backoff exponencial com jitter via site_private.next_retry_at (Etapa 11); p_retry_after_seconds é só um piso opcional do provedor. |
| `finalize_site_storage_retention` | `p_objects jsonb, p_batch_size integer` | Finaliza metadados somente depois que a API removeu, por bucket, todos os objetos privados informados. |
| `get_briefing_asset_retention_candidates` | `p_batch_size integer` | — |
| `get_my_briefing_asset_verification` | `p_id uuid` | — |
| `get_my_data_access` | `` | F-30: confirmacao de tratamento — devolve ao titular autenticado um resumo do que o site guarda sobre ele (perfil e contagens), sem expor registros. Nenhum dado pessoal alem do do proprio titular. |
| `get_my_proposal_document` | `p_proposal_id uuid` | Entrega o local de um documento somente ao cliente proprietário para assinatura server-side. |
| `get_my_quote_request` | `p_request_id uuid` | Retorna detalhe e contexto de curadoria somente ao auth.uid() proprietário, sem metadados operacionais. |
| `get_my_quote_requests` | `p_limit integer, p_offset integer, p_status text, p_search text` | Lista solicitações do auth.uid() com título de ação, miniaturas e última movimentação visível ao cliente. |
| `get_site_data_retention_candidates` | `p_batch_size integer` | — |
| `get_site_notification_delivery_report` | `p_limit integer` | F-12: visão operacional da fila para o back-office — entregas esgotadas com pseudônimo do e-mail (12 hex), se o endereço está suprimido, e contagem/idade dos eventos órfãos. Exige operador ativo. |
| `get_site_notification_suppression` | `p_email_hash text` | F-12: lista de supressão consultável por sha256 do e-mail normalizado. Diz se o endereço já deu bounce ou reclamou de spam, quando, em quais canais e o último motivo — sem devolver o e-mail em claro. |
| `get_site_quote_request` | `p_request_id uuid` | Detalhe interno do orçamento para o back-office (F-03), com itens, eventos de ambas as audiências, propostas, ajustes, status permitidos pela state machine e trilha de auditoria. |
| `get_site_shared_selection` | `p_token uuid, p_identifier_hash text` | — |
| `list_my_briefing_assets` | `` | — |
| `list_my_occasion_favorites` | `` | Lista IDs editoriais do titular autenticado. EXECUTE somente para authenticated. |
| `list_my_selections` | `p_include_archived boolean` | — |
| `list_site_quote_requests` | `p_status text, p_search text, p_limit integer, p_offset integer` | Fila paginada do back-office (F-03): filtro por status e busca por protocolo, empresa, contato, e-mail ou telefone. Só operador ativo. |
| `matches_my_briefing_asset_upload` | `p_path text, p_metadata jsonb` | Autoriza apenas o primeiro upload de uma reserva ainda não verificada; conteúdo validado não pode ser substituído pelo titular. |
| `owns_my_briefing_asset_path` | `p_path text` | — |
| `preflight_site_lead_request` | `p_request_kind text, p_identifier_hash text, p_client_request_id text` | Primeira camada distribuída de rate limit para leads, executada antes da consulta ao catálogo. Repetições idempotentes também consomem o bucket para impedir bypass por client_request_id conhecido. |
| `publish_site_quote_proposal` | `p_request_id uuid, p_title text, p_storage_path text, p_valid_until date` | Publica uma proposta versionada e move o pedido para quoted (F-03, produtor que faltava para F-23). Exige status in_progress; a versão anterior vira histórica por superseded_at. |
| `purge_archived_customer_selections` | `p_batch_size integer` | — |
| `purge_site_admin_audit_logs` | `p_retention_days integer, p_batch_size integer` | Remove em lotes trilhas administrativas além da janela configurada; padrão 400 dias. |
| `purge_site_notification_provider_events` | `p_retention_days integer, p_batch_size integer` | F-12: expurga eventos de webhook órfãos (delivery_id NULL) mais antigos que a retenção, em lote. Chamada por api/retention.ts depois da reconciliação — órfão recente ainda pode ser religado. |
| `purge_site_pii_read_audit_log` | `p_retention_days integer, p_batch_size integer` | PF-34: purga em lote a trilha de leitura de PII. Mesma janela e mesmo teto de lote que purge_site_admin_audit_logs. |
| `reconcile_site_notification_provider_events` | `p_batch_size integer` | F-12: religa eventos de webhook que chegaram antes do aceite do provedor (delivery_id NULL) e reaplica delivery_state/complained_at com a mesma precedência de apply_site_notification_provider_event. Idempotente: evento já vinculado nunca é reprocessado. |
| `record_cron_heartbeat` | `p_name text, p_ok boolean, p_detail text` | Grava o desfecho de uma rodada de cron (F-87). Chamada com a credencial de servico no fim de cada execucao. |
| `record_site_notification_dispatch_started` | `p_delivery_id uuid, p_lease_token uuid` | Persiste intenção WhatsApp antes da chamada externa; sem confirmação do marcador, a Meta não é chamada. Um envio incerto exige reconciliação humana e nunca é reenviado cegamente. |
| `record_site_notification_provider_acceptance` | `p_delivery_id uuid, p_lease_token uuid, p_provider text, p_provider_message_id text` | Registra o aceite do provedor antes da finalização, para reconciliação em caso de falha na etapa seguinte (R01, R02). |
| `reject_site_briefing_asset_verification` | `p_id uuid, p_storage_path text` | Caminho server-side idempotente para remover uma reserva não vinculada cuja verificação de conteúdo falhou; o trigger enfileira a exclusão do blob privado. |
| `reply_site_quote_adjustment` | `p_adjustment_id uuid, p_response text, p_status text` | Responde a um ajuste pedido pelo cliente (F-03, F-05): move o estado, grava o texto integral na trilha interna e publica a mesma resposta integral como mensagem (event_type message, audience customer) na linha do tempo do cliente. Recusa resposta acima de 500 caracteres com response_too_long em vez de cortar o texto. Trava a linha com FOR UPDATE para não sobrescrever uma resposta concorrente. |
| `reprocess_site_notification_deliveries` | `p_delivery_ids uuid[], p_reason text` | F-12: porta do back-office para reprocessar entregas esgotadas. Exige operador ativo (assert_site_operator) e motivo de 3 a 200 caracteres; o motivo vai para admin_audit_log junto com o nome do operador. Só aceita entregas de fato esgotadas — as demais voltam em "skipped" sem abortar o lote. |
| `request_my_quote_adjustment` | `p_request_id uuid, p_message text, p_client_request_id text` | Registra um pedido de ajuste somente para o titular autenticado da solicitação, mantendo o texto no schema privado. |
| `revoke_site_shared_selection` | `p_token uuid, p_management_token_hash text, p_identifier_hash text` | — |
| `rls_auto_enable` | `` | Guarda DDL do banco isolado: novas tabelas no schema public nascem com RLS habilitada. Sem EXECUTE para roles da API. |
| `save_my_selection` | `p_title text, p_references jsonb, p_campaign jsonb, p_id uuid, p_expected_version integer` | — |
| `set_my_occasion_favorite` | `p_occasion_id text, p_saved boolean` | Adiciona ou remove data favorita da conta autenticada; rejeita estado ausente. |
| `set_my_selection_archived` | `p_id uuid, p_expected_version integer, p_archived boolean` | — |
| `site_notification_queue_health` | `` | F-11: saúde da fila por canal. eligibleCount usa o mesmo critério do claim (status pronto, dentro da janela, pedido não spam e não anonimizado); outOfWindowCount conta o pending/failed que o próximo claim vai cancelar; suppressedCount separa o bloqueio deliberado (recipient_suppressed) do esgotamento por falha, que é o único que dispara alerta. |
| `update_site_quote_status` | `p_request_id uuid, p_status text` | F-03/F-11: muda o status do orçamento respeitando status_transitions. Ao entrar em spam, cancela as entregas pendentes do pedido (o trigger de enfileiramento é AFTER INSERT, então sem isso o job ficaria órfão na fila). |
