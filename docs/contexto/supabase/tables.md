# Tabelas

Um arquivo por tabela em `tables/<schema>/<tabela>.md` (colunas, constraints, índices, RLS/policies, triggers, grants). Métricas de volume em `stats.md`.

| tabela | tipo | RLS | policies | colunas | realtime | comentário |
|---|---|---|---|---|---|---|
| [site_private.admin_audit_log](tables/site_private/admin_audit_log.md) | table | sim | 0 | 7 | não | Etapa 36: audita escritas em tabelas de negócio feitas por qualquer role além de site_api/service_role — ou seja, fora do caminho normal da API (Studio, SQL manual). Não registra o conteúdo da linha, só que uma escrita aconteceu, quem e quando. |
| [site_private.admin_ddl_log](tables/site_private/admin_ddl_log.md) | table | sim | 0 | 6 | não | Etapa 36: DDL (create/alter/drop) fora do fluxo de migrations do CLI. Toda migration legítima também aparece aqui — não é um sinal de problema por si só, é o registro bruto para cruzar com o histórico de migrations quando precisar auditar. |
| [site_private.consent_receipts](tables/site_private/consent_receipts.md) | table | sim | 0 | 9 | não |  |
| [site_private.contact_requests](tables/site_private/contact_requests.md) | table | sim | 0 | 16 | não |  |
| [site_private.customer_briefing_assets](tables/site_private/customer_briefing_assets.md) | table | sim | 0 | 12 | não | Logos e referências privadas em PNG, JPEG ou WebP. PDFs ficam bloqueados até existir análise estrutural/CDR isolada e antimalware. |
| [site_private.customer_occasion_favorites](tables/site_private/customer_occasion_favorites.md) | table | sim | 0 | 4 | não | IDs de datas comemorativas escolhidas pelo titular. A lista editorial fica no frontend; a conta guarda somente o ID e o vínculo é apagado com auth.users. |
| [site_private.customer_profiles](tables/site_private/customer_profiles.md) | table | sim | 0 | 6 | não |  |
| [site_private.customer_selections](tables/site_private/customer_selections.md) | table | sim | 0 | 9 | não | Rascunhos privados do titular, sem preço nem estoque. A FK apaga ao excluir a conta; pedido de apagamento do titular remove via trigger do perfil; arquivados são purgados após 90 dias. |
| [site_private.erased_customer_identities](tables/site_private/erased_customer_identities.md) | table | sim | 0 | 3 | não | Túmulos SHA-256 irreversíveis de identidades apagadas por solicitação LGPD; impedem a reapropriação posterior do histórico sem preservar o e-mail. |
| [site_private.notification_deliveries](tables/site_private/notification_deliveries.md) | table | sim | 0 | 23 | não | Auditoria de entregas futuras. WhatsApp exige consentimento específico antes da criação do registro. Etapa 40: fillfactor 80 deixa espaço para HOT updates nos vários updates por linha (claim, aceite, finalização, webhook); autovacuum mais agressivo que o padrão (20%) evita acúmulo de tuplas mortas. |
| [site_private.notification_provider_events](tables/site_private/notification_provider_events.md) | table | sim | 0 | 6 | não | Deduplicação de eventos de webhook de entrega/devolução (Etapa 30). Sem conteúdo pessoal — apenas ids de correlação do provedor. |
| [site_private.proposal_documents](tables/site_private/proposal_documents.md) | table | sim | 0 | 10 | não |  |
| [site_private.quote_adjustment_requests](tables/site_private/quote_adjustment_requests.md) | table | sim | 0 | 8 | não |  |
| [site_private.quote_items](tables/site_private/quote_items.md) | table | sim | 0 | 20 | não | Snapshot do produto no instante do briefing; sem FK entre projetos Supabase. |
| [site_private.quote_request_events](tables/site_private/quote_request_events.md) | table | sim | 0 | 9 | não |  |
| [site_private.quote_requests](tables/site_private/quote_requests.md) | table | sim | 0 | 20 | não |  |
| [site_private.rate_limit_buckets](tables/site_private/rate_limit_buckets.md) | table | sim | 0 | 5 | não | Etapa 30: UNLOGGED de propósito — só hash + contador efêmero, purgado pela retenção diária. Perda em crash reseta uma janela de rate limit, não é um problema de integridade. |
| [site_private.shared_selection_rate_limits](tables/site_private/shared_selection_rate_limits.md) | table | sim | 0 | 4 | não | Etapa 30: UNLOGGED de propósito — mesmo racional de rate_limit_buckets. |
| [site_private.shared_selections](tables/site_private/shared_selections.md) | table | sim | 0 | 7 | não |  |
| [site_private.status_transitions](tables/site_private/status_transitions.md) | table | sim | 0 | 3 | não | Transições administrativas válidas por entidade (Etapa 8). Fonte única de verdade para os triggers enforce_status_transition; qualquer update de status fora desta tabela é rejeitado com 22023. |
| [site_private.storage_deletion_queue](tables/site_private/storage_deletion_queue.md) | table | sim | 0 | 3 | não | Fila mínima de objetos privados para remoção pela Storage API; não contém conteúdo do arquivo. |
