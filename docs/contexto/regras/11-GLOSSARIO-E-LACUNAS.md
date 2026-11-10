# 11 · GLOSSÁRIO, DADOS DE REFERÊNCIA E LACUNAS

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `860a0a06be` · branch `main` · 2026-11-10 18:29 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Glossário do domínio (entidades do sistema)

| Termo | Significado / valores | Tamanho | Origem |
|---|---|---|---|
| `site_private.admin_audit_log` | Etapa 36: audita escritas em tabelas de negócio feitas por qualquer role além de site_api/service_role — ou seja, fora do caminho normal da API (Studio, SQL manual). Não registra o conteúdo da linha, só que uma escrita aconteceu, quem e quando. | 7 colunas | migration |
| `site_private.admin_ddl_log` | Etapa 36: DDL (create/alter/drop) fora do fluxo de migrations do CLI. Toda migration legítima também aparece aqui — não é um sinal de problema por si só, é o registro bruto para cruzar com o histórico de migrations quando precisar auditar. | 6 colunas | migration |
| `site_private.consent_receipts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `site_private.contact_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `site_private.customer_briefing_assets` | Logos e referências privadas em PNG, JPEG ou WebP. PDFs ficam bloqueados até existir análise estrutural/CDR isolada e antimalware. | 12 colunas | migration |
| `site_private.customer_occasion_favorites` | IDs de datas comemorativas escolhidas pelo titular. A lista editorial fica no frontend; a conta guarda somente o ID e o vínculo é apagado com auth.users. | 4 colunas | migration |
| `site_private.customer_profiles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `site_private.customer_selections` | Rascunhos privados do titular, sem preço nem estoque. A FK apaga ao excluir a conta; pedido de apagamento do titular remove via trigger do perfil; arquivados são purgados após 90 dias. | 9 colunas | migration |
| `site_private.erased_customer_identities` | Túmulos SHA-256 irreversíveis de identidades apagadas por solicitação LGPD; impedem a reapropriação posterior do histórico sem preservar o e-mail. | 3 colunas | migration |
| `site_private.notification_deliveries` | Auditoria de entregas futuras. WhatsApp exige consentimento específico antes da criação do registro. Etapa 40: fillfactor 80 deixa espaço para HOT updates nos vários updates por linha (claim, aceite, finalização, webhook); autovacuum mais agressivo que o padrão (20%) evita acúmulo de tuplas mortas. | 19 colunas | migration |
| `site_private.notification_provider_events` | Deduplicação de eventos de webhook de entrega/devolução (Etapa 30). Sem conteúdo pessoal — apenas ids de correlação do provedor. | 6 colunas | migration |
| `site_private.proposal_documents` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `site_private.quote_adjustment_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `site_private.quote_items` | Snapshot do produto no instante do briefing; sem FK entre projetos Supabase. | 17 colunas | migration |
| `site_private.quote_request_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `site_private.quote_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 20 colunas | migration |
| `site_private.rate_limit_buckets` | Etapa 30: UNLOGGED de propósito — só hash + contador efêmero, purgado pela retenção diária. Perda em crash reseta uma janela de rate limit, não é um problema de integridade. | 5 colunas | migration |
| `site_private.shared_selection_rate_limits` | Etapa 30: UNLOGGED de propósito — mesmo racional de rate_limit_buckets. | 4 colunas | migration |
| `site_private.shared_selections` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `site_private.status_transitions` | Transições administrativas válidas por entidade (Etapa 8). Fonte única de verdade para os triggers enforce_status_transition; qualquer update de status fora desta tabela é rejeitado com 22023. | 3 colunas | migration |
| `site_private.storage_deletion_queue` | Fila mínima de objetos privados para remoção pela Storage API; não contém conteúdo do arquivo. | 3 colunas | migration |
| `LeadKind` (TS) | quote \| contact |  | `api/_lib/contracts.ts` |
| `OperationalAlertEvent` (TS) | notification_queue_alert \| notification_cron_failed \| retention_cron_failed |  | `api/_lib/operationalAlerts.ts` |
| `ProviderEventApplyReason` (TS) | duplicate \| delivery_not_found \| delivery_state_already_set |  | `api/_lib/siteDatabase.ts` |
| `CatalogEditorialStatus` (TS) | published \| draft \| retired |  | `shared/catalogEditorial.ts` |
| `CampaignMoment` (TS) | onboarding \| evento \| relacionamento \| reconhecimento \| sazonal |  | `src/types.ts` |
| `CampaignAudience` (TS) | clientes \| colaboradores \| lideranca \| parceiros \| publico-evento |  | `src/types.ts` |
| `CampaignScale` (TS) | ate-50 \| 51-200 \| 201-500 \| 500-mais |  | `src/types.ts` |
| `CampaignMood` (TS) | util \| premium \| sustentavel \| tech \| afetivo \| divertido |  | `src/types.ts` |
| `QuoteBudgetRange` (TS) | ate-25 \| 26-50 \| 51-100 \| 101-200 \| acima-200 \| a-definir |  | `src/types.ts` |
| `QuoteBudgetScope` (TS) | por-pessoa \| total |  | `src/types.ts` |
| `QuoteResponseChannel` (TS) | whatsapp \| email \| telefone \| sem-preferencia |  | `src/types.ts` |
| `QuoteBrandAssetStatus` (TS) | logo-pronto \| identidade-em-criacao \| preciso-de-ajuda |  | `src/types.ts` |
| `QuoteDeadlineFlexibility` (TS) | flexivel \| data-fixa |  | `src/types.ts` |
| `BriefingAssetKind` (TS) | logo \| reference |  | `src/lib/briefingAssets.ts` |
| `BRIEFING_ASSET_MIME_TYPES` (TS) | 'image/png', 'image/jpeg', 'image/webp' |  | `src/lib/briefingAssets.ts` |
| `ProfileParam` (TS) | todos \| destaques \| novos \| kits |  | `src/lib/catalogFilters.ts` |
| `CatalogCollectionFormat` (TS) | online \| pdf \| digital |  | `src/lib/catalogLibrary.ts` |
| `CatalogCollectionTheme` (TS) | people \| events \| impact \| products |  | `src/lib/catalogLibrary.ts` |
| `OccasionAudience` (TS) | clientes \| colaboradores \| eventos \| comunidade |  | `src/lib/commemorativeDates.ts` |
| `OccasionKind` (TS) | relacionamento \| cultura \| impacto \| sazonal |  | `src/lib/commemorativeDates.ts` |
| `CustomerQuoteStatus` (TS) | new \| triaged \| in_progress \| quoted \| closed |  | `src/lib/customerQuoteContract.ts` |
| `ProductBadgeKind` (TS) | new \| kit \| personalizable |  | `src/lib/productBadges.ts` |
| `ConfirmationDeliveryStatus` (TS) | sent \| pending \| not_requested |  | `src/lib/quoteConfirmation.ts` |
| `DeliveryStatus` (TS) | sent \| pending |  | `tests/graphify-tools.node.mjs` |

## Dados de referência (seed — planos, categorias, perfis fixos)

_nenhum item encontrado_

## Auditoria de consistência (código × schema) — trate como NÃO VERIFICADO

> `status`: inclui estados só de UI/realtime (ex.: `uploading`, `SUBSCRIBED`) que nunca vão ao banco — confira o arquivo antes de concluir que falta valor no enum.

| Tipo | Problema | Onde |
|---|---|---|
| status | valor `object` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:api/notification-events-whatsapp.ts` |
| status | valor `delivered` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:api/notification-events-whatsapp.ts` |
| status | valor `fulfilled` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:api/notifications.ts` |
| status | valor `attached` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/QuotePage.tsx`<br>`escreve:src/pages/QuotePage.tsx` |
| tabela | tabela `a` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `contacts` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `dashboard_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `emails` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `fantasma` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `fixture_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `ghost_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `payments` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `runtime_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `so_teste` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `t` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `t1` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `tabela` usada no código não existe nas migrations/types do repo | `scripts/inventario/gerar-banco.mjs` |
| tabela | tabela `tools_runtime` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `tx` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| rls | `quote_requests`: RLS ligado sem nenhuma política → só service_role acessa | `tests/inventario-estado.node.mjs` |
| edge | edge function `dashboard-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `fixture-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `ghost-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `inexistente` invocada mas não existe em supabase/functions/ | `scripts/ai-context/cenarios.mjs` |
| edge | edge function `orphan-fn` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `other` invocada mas não existe em supabase/functions/ | `scripts/ai-context/cenarios.mjs` |
| edge | edge function `runtime-fn` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `runtime-missing` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `send-email` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `tools-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `dashboard_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `demo` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/test_snapshot.py` |
| rpc | RPC `fixture_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `fn` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/snapshot.py` |
| rpc | RPC `ghost_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `is_admin` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `nome` chamada mas não definida nas migrations/types | `scripts/inventario/gerar-banco.mjs`<br>`scripts/supabase_snapshot/snapshot.py` |
| rpc | RPC `nunca_contada` chamada mas não definida nas migrations/types | `tests/inventario-estado.node.mjs` |
| rpc | RPC `r1` chamada mas não definida nas migrations/types | `scripts/ai-context/cenarios.mjs` |
| rpc | RPC `runtime_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `tools_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `scripts/inventario/gerar-banco.mjs` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `scripts/regras_negocio/generate.py` |

## Lacunas — o que este contexto NÃO consegue responder (perguntas para o dono do negócio)

- Nenhuma regra manual em `manual/`: prazos, limites, exceções comerciais, quem aprova o quê — só o negócio sabe.
- `site_private.notification_deliveries.delivery_state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `site_private.notification_deliveries.delivery_state_source_event_id` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `site_private.status_transitions.from_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `site_private.status_transitions.to_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- 8/21 tabelas sem `COMMENT ON TABLE` — o significado de negócio não está no schema: `site_private.quote_requests`, `site_private.contact_requests`, `site_private.consent_receipts`, `site_private.customer_profiles`, `site_private.quote_request_events`, `site_private.proposal_documents`, `site_private.quote_adjustment_requests`, `site_private.shared_selections`
- Há tabelas usadas no código sem migration no repo — o schema real pode ter sido alterado pelo painel.

## Regras manuais presentes

_nenhuma — copie `manual/TEMPLATE-regras-de-negocio.md`_
