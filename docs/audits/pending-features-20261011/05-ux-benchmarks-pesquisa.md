# E — Auditoria de funcionalidades prometidas em docs de produto/UX/benchmarks

- **Repositório:** `/home/user/Promo_Brindes_V1` · **HEAD auditado:** `3f82233` (11/10/2026) · árvore limpa (`git status --porcelain` vazio).
- **Método:** leitura integral dos 16 documentos do escopo; verificação no código (rotas em `src/App.tsx:110-127`, eventos em `src/lib/analytics.ts:4-35`, páginas, libs, `api/`, migrations, `e2e/`, workflows). Somente leitura: nenhum arquivo do repositório foi alterado.
- **Legenda:** CONCLUÍDA · PARCIAL (o que falta) · NÃO INICIADA · BLOQUEADA-EXTERNA (depende de credencial, material, decisão de negócio, pesquisa ou sistema de terceiros). “SUBSTITUÍDA” aparece como nota quando uma decisão posterior documentada tornou a recomendação obsoleta (contada como CONCLUÍDA/N.A.).
- **Limites:** estado remoto (Vercel, Supabase, painéis) não foi consultado; “CONCLUÍDA” significa presente e coerente no código/testes versionados, não homologação operacional.
- **Regra AGENTS.md:** qualquer item abaixo que implique mudança visual (F05, textos pequenos, posição de “Minhas datas”, rótulos, landings) exige proposta em imagem e aprovação explícita antes de implementar.

---

## 0. Achados mais relevantes (fora ou em divergência com a matriz)

| # | Achado | Fonte | Evidência |
|---|---|---|---|
| 1 | Não existe WhatsApp “iniciado pelo visitante” (click-to-chat). A matriz diz que existe (LK44). Só há preferência de canal no formulário de contato. | LUKKA:221, RELATORIO:315 | nenhuma ocorrência de `wa.me`/`api.whatsapp`/`whatsapp.com` em `src/`; `src/components/ConversationForm.tsx:13` |
| 2 | Produto inexistente ainda exibe “O catálogo fez uma pausa.” (mesma abertura de falha temporária). Achado do relatório Gen Z §23 não corrigido; matriz UX19 = I. | RELATORIO:377 | `src/components/CatalogFeedback.tsx:25` + `src/pages/ProductPage.tsx:133` |
| 3 | Rótulo “Em alta” é flag editorial `featured`, não telemetria — contraria guardrails Freeshop/Lukka. | FREESHOP:154,291; LUKKA:157 | `src/lib/catalogFilters.ts:10`; `src/lib/useCatalogPageState.ts:95` |
| 4 | Guia de voz violado em ações: “Explorar o radar”, “Afinar o radar”, “Radar completo” (radar só em títulos). | GUIA_DE_VOZ:17 | `src/pages/CustomerAccountPage.tsx:93`; `src/pages/CatalogPage.tsx:53`; `src/components/Layout.tsx:214` |
| 5 | F05 (padrão pontilhado atrás da foto do card) segue em `main`; correção `4f88d86` só no branch `origin/fix/product-card-clean-image-background` (não mesclado). | UX_AUDIT_REPORT:350,403 | `src/styles.css:4457-4460` |
| 6 | Nenhuma notificação ao time comercial: audiência `commercial_team` existe só no CHECK; nenhum produtor. | PLANO_UX:479 (UX70) | `site-supabase/supabase/migrations/20260908230000_create_site_lead_storage.sql:89`; nenhuma outra ocorrência de `commercial_team` |
| 7 | Aviso de privacidade não cobre “Minhas datas” (favoritos locais + sincronizados por conta). | RELATORIO:362; PLANO_UX:597 | `src/pages/PrivacyPage.tsx:11-12` (0 ocorrências de “favorit”/“ocasi”); tabela via `src/lib/customerOccasionFavorites.ts:31-39` |
| 8 | Matriz UX88 desatualizada: sincronização de favoritos por conta já existe. | — | `src/lib/customerOccasionFavorites.ts:31-39`; `migrations/20260923130000_add_customer_occasion_favorites.sql`; `src/pages/CommemorativeDatesPage.tsx:332` |
| 9 | Confirmação pós-envio sem resumo, impressão nem prazo de 1º retorno; branch `origin/feat/carnegie-briefing-confirmation` (854bf56 “adiciona resumo e confirmação”) não mesclado. | PLANO_UX:461 (UX67); RELATORIO:261 | `src/pages/QuotePage.tsx:348-372` |
| 10 | Métricas prometidas sem evento: remoção/limpeza da seleção, abertura de seleção compartilhada (retorno de compartilhamento), abandono por campo, tempo até 1ª seleção; busca sem resultado não separável de filtro vazio. | UX_STRATEGY:131-139; FREESHOP:261-267 | `src/lib/analytics.ts:4-35` (32 eventos, nenhum `*_removed`, `shared_selection_opened`; `catalog_result_viewed` sem `has_query`) |
| 11 | Comparação não pode ser salva em bloco nem compartilhada. | RELATORIO:210-213 | `src/components/CatalogComparisonTray.tsx:30-41` (só ocultar/limpar/remover) |
| 12 | Textos auxiliares de 9–11 px persistem (77 declarações `font-size` ≤ 0,69rem). | RELATORIO:400 (UX24) | `src/styles.css:68,109,118,123,140,169,1093,1144…` |
| 13 | BreadcrumbList, histórico de busca recente no dispositivo, “recentemente vistos” e landings `/datas/natal` não existem. | FREESHOP:122,174-175,182,203 | nenhuma ocorrência de `BreadcrumbList`/`recent`; rotas `src/App.tsx:110-127` |
| 14 | Cabeçalhos de `PLANO_100.md:5` e `plano-50-etapas.html:1055` ainda dizem “Nenhuma etapa executada” — desatualizados (17 de 22 e 32 de 50 etapas já concluídas no código). | — | ver §1 e §2 |

---

## 1. `PLANO_100.md` (22 etapas E-001…E-022, 24/09/2026)

| Funcionalidade | Fonte (doc:linha) | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| E-001 Respeitar proprietário do cache legado de favoritos | PLANO_100.md:13 | CONCLUÍDA | — | `src/lib/useOccasionFavorites.ts:11,38-60`; teste `useOccasionFavorites.test.tsx:109` |
| E-002 Semântica da galeria (grupo de controles) + axe em produto | :24 | CONCLUÍDA | — | `src/components/ProductGallery.tsx:81-82` (`role="group"`, `aria-pressed`); `e2e/product-detail.spec.ts:74,153` |
| E-003 Revisão monotônica de mutações de favoritos | :34 | CONCLUÍDA | — | `useOccasionFavorites.ts:120,160-201`; testes `:79,:407,:423` |
| E-004 Preservar ações durante importação anônima | :45 | CONCLUÍDA | — | `useOccasionFavorites.ts:269-276`; teste `:117` |
| E-005 Serializar escritas por conta/data | :56 | CONCLUÍDA | Concorrência multi-dispositivo = último commit (sem versão SQL), como previsto | `useOccasionFavorites.ts:208-224`; testes `:238,:255,:320` |
| E-006 Script do Web Analytics + smoke | :67 | CONCLUÍDA | Evento sintético no painel não verificável aqui | `scripts/smoke-deployment.mjs:47-49`; `src/App.tsx:103` |
| E-007 Acesso do release à Vercel (VERCEL_TOKEN) | :78 | BLOQUEADA-EXTERNA | Validade/escopo do secret só verificável no runner; código endurecido | `.github/workflows/release.yml:125-147` |
| E-008 Unificar Node | :89 | CONCLUÍDA | Desvio: adotado 24.15.0 (plano pedia 22.x) | `.nvmrc:1`; `package.json` engines; `quality.yml:34`, `database.yml:30`, `graphify.yml:34`, `release.yml:135` |
| E-009 Normalizar paginação do histórico | :99 | CONCLUÍDA | — | `src/lib/customerAccount.ts:118-121`; `src/pages/CustomerAccountPage.tsx:24-41,69-75`; `customerAccount.test.ts` |
| E-010 Senha: operação única | :109 | PARCIAL | Teste de componente prometido não existe; nenhum E2E de `/definir-senha` | `src/pages/SetPasswordPage.tsx:14-35`; nenhuma ocorrência de `SetPasswordPage.test`/`definir-senha` em `e2e/` |
| E-011 Validar shape dos webhooks | :119 | CONCLUÍDA | — | `api/notification-events-resend.ts:37-44,77-79`; `api/notification-events-whatsapp.ts:34-42`; `tests/api/notification-events-whatsapp.test.ts:168` |
| E-012 Redaction no Speed Insights | :130 | CONCLUÍDA | — | `src/App.tsx:104`; `src/lib/analytics.ts:93-110`; `analytics.test.ts` |
| E-013 ACL explícita das RPCs de favoritos | :140 | CONCLUÍDA | Aplicação remota não verificada | `migrations/20260927103000_harden_occasion_favorites_rpc_acl.sql`; `tests/database/customer_occasion_favorites.test.sql` |
| E-014 Índice da FK de titular (inclui spam) | :151 | CONCLUÍDA | Idem | `migrations/20260927200000_add_quote_requests_owner_fk_index.sql:1-7` |
| E-015 Cores sem variant_id pelo contrato público | :162 | CONCLUÍDA | — | `api/_lib/catalogValidation.ts:20,38-57,110-129` |
| E-016 Deadline durante consumo do corpo | :172 | CONCLUÍDA | — | `src/lib/http.ts:85-111`; `catalogValidation.ts:149`; `siteDatabase.ts:206,259`; `publicProductPage.ts:106`; `api/sitemap.ts:110` |
| E-017 Deadline no catálogo público | :182 | CONCLUÍDA | — | `src/lib/catalog.ts:301-318` |
| E-018 Prazo total do orçamento | :192 | CONCLUÍDA | — | `api/_lib/leadHandler.ts:85-95,128-132,144-149` |
| E-019 Shell HTML do próprio deployment | :202 | CONCLUÍDA | — | `vercel.json` (`includeFiles` app-shell); `api/_lib/publicProductPage.ts:118-119` |
| E-020 Validação integral de PDF | :213 | PARCIAL | PDF é recusado (quarentena); sem validação estrutural/CDR; política não decidida | `api/briefing-assets.ts:77-79`; `api/_lib/fileSignatures.ts:3-8`; `docs/EXECUCAO_LOTE_FAVORITOS_20260924.md:53` |
| E-021 Acesso legado ao catálogo canônico | :224 | BLOQUEADA-EXTERNA | Decisão do PO do Promo Gifts | `docs/DATABASE_PUBLIC_CONTRACT.md:23,60,68` |
| E-022 Estado vazio de `/ideias/:topic` | :235 | PARCIAL | Mensagem existe; teste E2E prometido não existe | `src/pages/IdeaLandingPage.tsx:21`; nenhuma ocorrência de `/ideias/` em `e2e/` |

**Totais:** 17 CONCLUÍDA · 3 PARCIAL · 2 BLOQUEADA-EXTERNA · 0 NÃO INICIADA.

---

## 2. `plano-50-etapas.html` (raiz; plano de 13/09, commit f20df44)

Execução registrada em `docs/PLANO_CORRECOES_50_ETAPAS_20260913.md` e anexo `docs/REVISAO_PLANOS_20260923_ANEXO_TECNICO.md:21-70`; estado abaixo reverificado no HEAD.

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| 01 Versionar artefatos de auditoria | plano-50-etapas.html:439 | CONCLUÍDA | — | `git status --porcelain` vazio |
| 02 ESLint 9 flat config | :449 | CONCLUÍDA | — | `eslint.config.js:1-80`; `package.json` script `lint` |
| 03 Supressões órfãs de exhaustive-deps | :460 | CONCLUÍDA | — | 10 supressões, todas com justificativa (ex.: `CatalogFilterPanel.tsx:85-88`, `QuoteDrawer.tsx:36-39,77-80`, `QuotePage.tsx:137-140`) |
| 04 strict no tsconfig.node | :471 | CONCLUÍDA | — | `tsconfig.node.json` (`"strict": true`) |
| 05 Endurecer tsconfig.app | :482 | CONCLUÍDA | Desvio: `noUnused*` substituídos por regra ESLint | `tsconfig.app.json` (`noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`); `eslint.config.js:42-47` |
| 06 Prettier + .editorconfig | :493 | PARCIAL | Prettier descartado (sem `.prettierrc`, sem dependência) | `.editorconfig`; `.gitattributes`; `docs/PLANO_CORRECOES_50_ETAPAS_20260913.md:118` |
| 07 Lint no check e CI | :503 | CONCLUÍDA | Sem `prettier --check` (coerente com 06) | `package.json` `check` inicia por `lint`; `.github/workflows/quality.yml:51` |
| 08 Cobertura com limiar | :513 | CONCLUÍDA | — | `vite.config.ts` (`coverage.thresholds`); `quality.yml:53` |
| 09 Contrato único de limpeza de dados pessoais | :535 | CONCLUÍDA | — | `src/lib/personalDataReset.ts` |
| 10 identityEpoch no contexto | :545 | CONCLUÍDA | — | `src/context/CustomerAuthContext.tsx:102` |
| 11 Reset do QuotePage no logout | :555 | CONCLUÍDA | — | `src/pages/QuotePage.tsx:111,137-140`; `e2e/smoke.spec.ts:751` |
| 12 Abortar envio no logout | :565 | CONCLUÍDA | — | `e2e/smoke.spec.ts:817` |
| 13 Regressões E2E de troca de sessão (4 cenários) | :575 | PARCIAL | Troca direta A→B ausente no E2E | `e2e/smoke.spec.ts:751,784,817`; nenhuma ocorrência de “outra conta/conta B” em `e2e/` |
| 14 Booleano da finalização (R01) | :597 | CONCLUÍDA | — | `api/notifications.ts`; `tests/api/notifications.test.ts` |
| 15 Lease token na reivindicação (R04) | :607 | CONCLUÍDA | — | `api/notifications.ts`; `tests/database/notification_outbox.test.sql` |
| 16 Exigir lease na finalização | :618 | CONCLUÍDA | — | idem |
| 17 Recuperação de processing ≠ limite de tentativas (R03) | :629 | CONCLUÍDA | — | `tests/database/notification_queue_policy.test.sql` |
| 18 Estado terminal `exhausted` | :639 | CONCLUÍDA | — | `api/notifications.ts`; migration de status |
| 19 Idempotência no WhatsApp (R02) | :649 | PARCIAL | Só marcação `dispatch_started`/bloqueio no inconclusivo; sem garantia do provedor; ensaio real adiado | `tests/database/notification_dispatch_uncertainty.test.sql` |
| 20 Resultado inconclusivo | :660 | CONCLUÍDA | — | `api/notifications.ts` (`inconclusive`) |
| 21 Reconciliação por provider_message_id | :670 | CONCLUÍDA | — | `tests/api/notifications.test.ts` |
| 22 Matriz pgTAP de retomadas | :680 | CONCLUÍDA | — | 28 arquivos em `site-supabase/supabase/tests/database/` |
| 23 Testes de API dos novos contratos | :690 | CONCLUÍDA | — | `tests/api/notifications.test.ts`, `webhookSignature.test.ts` |
| 24 maxDuration por função | :712 | CONCLUÍDA | — | `vercel.json` `functions`; `tests/api/maxDuration.test.ts` |
| 25 Orçamento de tempo por job | :724 | CONCLUÍDA | — | `api/notifications.ts:16,24` |
| 26 Timeout por canal | :734 | CONCLUÍDA | — | `api/notifications.ts` (`Promise.allSettled`) |
| 27 Cron compatível com SLA | :745 | PARCIAL | Cadência `*/15` provisória; SLA comercial não definido | `vercel.json` `crons` |
| 28 Drenagem de múltiplos lotes | :755 | CONCLUÍDA | — | `api/notifications.ts` |
| 29 Monitoramento de idade da fila | :765 | PARCIAL | Canal de alerta real (`OPERATIONS_ALERT_WEBHOOK_URL`) não configurado | `migrations/20260915090000_add_notification_queue_health.sql`; `api/_lib/operationalAlerts.ts:7-12` |
| 30 Webhooks de entrega/devolução | :775 | PARCIAL | Ciclo real com destinatários controlados (externo) | `api/notification-events-resend.ts`, `-whatsapp.ts`; `tests/database/notification_provider_events.test.sql` |
| 31 Conteúdo do comprovante | :785 | PARCIAL | Decisão resumo × cópia integral pendente; comentário obsoleto na UI | `migrations/20260923200000_enrich_quote_confirmation_contract.sql:171`; `src/pages/QuotePage.tsx:357-364` (diz que e-mail não traz ação/prazo — desatualizado) |
| 32 GSAP sob demanda | :807 | CONCLUÍDA | — | `src/components/FoldText.tsx:132` |
| 33 Folga no bundle de entrada | :817 | CONCLUÍDA | — | `scripts/check-performance-budget.mjs:56,66` |
| 34 Orçamento Brotli | :827 | CONCLUÍDA | — | `scripts/check-performance-budget.mjs:2-68` |
| 35 Peso do CSS | :837 | PARCIAL | `src/styles.css` único com 213.519 bytes/6.783 linhas; sem divisão por rota | `src/styles.css` |
| 36 Tree-shaking do lucide | :847 | CONCLUÍDA | Pin removido (`^1.49.0`), imports nomeados | `package.json`; `src/components/ProductCard.tsx:1` |
| 37 Core Web Vitals de campo | :857 | PARCIAL | Coletor montado; baseline p75 não documentado | `src/App.tsx:104` |
| 38 Erro 500 com log | :879 | CONCLUÍDA | — | `api/_lib/leadHandler.ts:151` |
| 39 Instrumentar catches silenciosos | :889 | PARCIAL | Catches só-comentário sem log persistem | `src/lib/clientObservability.ts:16-18`; `api/_lib/operationalAlerts.ts:36` |
| 40 Correlação fim a fim | :899 | CONCLUÍDA | Ensaio real ponta-a-ponta pendente | `api/_lib/leadHandler.ts:129,151`; `api/notifications.ts` |
| 41 Alertas do cron | :909 | PARCIAL | Sem alerta de “ausência de execução” (dead-man); webhook não configurado | `api/_lib/operationalAlerts.ts:5`; `api/notifications.ts:572,694` |
| 42 Relato de erros do frontend | :919 | PARCIAL | Recepção em painel não certificada | `src/lib/clientObservability.ts:9-19`; `src/components/AppErrorBoundary.tsx:24` |
| 43 Atualização escalonada de deps | :941 | PARCIAL | Onda (c) TypeScript 7 não feita | `package.json` (`typescript ^5.9.3`; React 19.3, Vite 8.3, Vitest 5, jsdom 30 já feitos) |
| 44 Dependabot | :952 | CONCLUÍDA | — | `.github/dependabot.yml` |
| 45 CodeQL + dependency-review + concurrency | :962 | CONCLUÍDA | — | `.github/workflows/codeql.yml`, `dependency-review.yml`; concurrency em `database.yml`, `graphify.yml` |
| 46 Check Supabase Preview | :972 | BLOQUEADA-EXTERNA | Integração Supabase↔GitHub | — |
| 47 Acessibilidade além do axe | :983 | PARCIAL | Roteiro NVDA/VoiceOver inexistente | axe em `e2e/smoke.spec.ts:187,532,1051,1351,1368`; nenhuma ocorrência de NVDA/VoiceOver em `docs/` fora de planos |
| 48 Decompor módulos > 300 linhas | :1005 | PARCIAL | QuotePage 467, HomePage 370, CommemorativeDatesPage 350, CatalogsPage 303 | `wc -l src/pages/*.tsx` (CatalogPage já 87) |
| 49 Fechar 12 referências ausentes | :1016 | PARCIAL | LK10 entregue no código (matriz desatualizada); LK27/UX59 parciais | ver matriz; `src/lib/kitBuilder.ts`, `src/components/BriefingAssetUploader.tsx` |
| 50 Governança do ledger | :1026 | PARCIAL | Matriz com linhas semanticamente desatualizadas (§0 #1, #8) | `scripts/validate-closure-ledger.mjs`; `docs/GOVERNANCA_FECHAMENTO.md` |

**Totais:** 32 CONCLUÍDA · 17 PARCIAL · 1 BLOQUEADA-EXTERNA · 0 NÃO INICIADA.

---

## 3. `docs/PLANO_UX_100_ETAPAS_20260909.md` — sub-funcionalidades esquecidas ou divergentes da matriz

(As 100 etapas têm linha na matriz; aqui só o que ficou de fora ou está classificado de forma otimista.)

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| UX19 — 404/erro distinto de “produto inexistente” | PLANO_UX:151 | PARCIAL | Título “O catálogo fez uma pausa” também no produto inexistente | `CatalogFeedback.tsx:25`; `ProductPage.tsx:133` |
| UX12 — mesmo nome funcional em ações | :111 | PARCIAL | “Explorar o radar”, “Afinar o radar”, “Radar completo”; “Em alta” | `CustomerAccountPage.tsx:93`; `CatalogPage.tsx:53`; `Layout.tsx:214`; `catalogFilters.ts:10` |
| UX14/UX24 — textos auxiliares legíveis | :121, :733 | PARCIAL | 77 `font-size` ≤ 0,69rem (requer proposta visual) | `src/styles.css:68,109,169…` |
| UX30 — horários reais de atendimento | :221 | BLOQUEADA-EXTERNA | Nenhum horário publicado (depende de operação) | nenhuma ocorrência de “horário” em `src/` |
| UX67 — confirmação com resumo, impressão e prazo de 1º retorno | :459 | PARCIAL | Sem resumo/impressão na tela de sucesso; prazo depende de COM; branch Carnegie não mesclado | `QuotePage.tsx:348-372` |
| UX70 — briefing chega ao responsável comercial | :477 | NÃO INICIADA | Nenhuma notificação/encaminhamento interno | `migrations/20260908230000_create_site_lead_storage.sql:89` (enum sem uso) |
| UX73 — reenvio e correção de e-mail evidentes | :499 | PARCIAL | Sem ação “Reenviar”/“Usar outro e-mail”; reenvio implícito pelo mesmo botão | `src/pages/CustomerLoginPage.tsx:95-137` |
| UX80 — controle de preferências/dados na conta | :541 | PARCIAL | Conta não tem seção de preferências/exclusão; só runbook | `CustomerAccountPage.tsx:76-98`; `docs/RUNBOOK_PEDIDO_TITULAR.md` |
| UX80/UX88 — favoritos sob o mesmo contrato de privacidade | :597 | PARCIAL | Aviso de privacidade não menciona “Minhas datas” | `PrivacyPage.tsx:11-12` |
| UX88 — “Minhas datas” em posição acessível | :595 | PARCIAL | Seção segue após toda a agenda, sem atalho; sync por conta já existe (matriz desatualizada) | `CommemorativeDatesPage.tsx:307,330-336` |
| UX92 — funil: resultado vazio de busca, remoção | :623 | PARCIAL | Sem evento de remoção/limpeza; vazio de busca não distinguível | `analytics.ts:7` (sem `has_query`), sem `*_removed` |
| UX54/UX57/UX77 — ativação por flags | :379,:397,:525 | CONCLUÍDA (código) | Flags padrão `false`; ativação em produção só declarada | `src/lib/siteFeatureFlags.ts:5-7`; `.env.example:25-30`; `docs/EXECUCAO_UX_20260910.md:50-52` |

---

## 4. `docs/LUKKA_BENCHMARK_PLANO_50_ETAPAS_20260909.md` — fora da matriz / divergências

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| LK44 — WhatsApp contextual iniciado pelo visitante | LUKKA:221 | NÃO INICIADA | Nenhum link click-to-chat; matriz diz “existe” | nenhuma ocorrência de `wa.me`; só `ConversationForm.tsx:13` |
| Cenário “visitante apenas abre WhatsApp → evento distinto” | :270 | NÃO INICIADA | Sem evento de abertura de WhatsApp | `analytics.ts:4-35` |
| LK17 — nenhuma etiqueta de popularidade sem dado | :157 | PARCIAL | “Em alta” baseado em flag | `catalogFilters.ts:10` |
| LK21 — trocar cor atualiza a foto | :167 | CONCLUÍDA | — | `ProductPage.tsx:97` |
| LK37 — token de seleção fora de analytics | :205, :267 | CONCLUÍDA | — | `analytics.ts:88-110` |
| LK07 — controles de carrossel | :111, :133 | CONCLUÍDA (N.A.) | Hero estático, sem rotação | `HomePage.tsx:151-177` |
| LK10 — categorias fotográficas | :139 | CONCLUÍDA (código) | Fotos curadas/autorizadas: hoje usa a foto do primeiro produto da categoria. A matriz ainda marca N (desatualizada) | `src/pages/HomePage.tsx:60-93,314` (`CategoryPhotoCard`) |
| LK23 — múltiplo de compra confirmado | :171 | BLOQUEADA-EXTERNA | Dados comerciais | matriz LK23=P |
| Decisões pendentes (acervo, clientes, serviços, identidade jurídica, provedores, domínio, analytics) | :292 | BLOQUEADA-EXTERNA | Decisões de negócio | — |

---

## 5. `docs/FREESHOP_BENCHMARK_20260909.md` (não coberto pela matriz)

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| 5.1 “Ache pelo briefing” (4 etapas, pular, URL) | FREESHOP:103-114 | CONCLUÍDA | — | `src/components/CampaignFinder.tsx:50-99`; `src/lib/campaignPresets.ts` |
| 5.1/Cenário A — ampliar automaticamente e explicar o que foi relaxado | :112, :216 | PARCIAL | Só remoção manual de chips e texto genérico | `CatalogPage.tsx:44,67,76` |
| 5.2 Sugestões após 2 caracteres | :118 | CONCLUÍDA | — | `src/lib/search.ts:163` |
| 5.2 Sinônimos curados | :119 | CONCLUÍDA | — | `search.ts:14-20` |
| 5.2 Acentos e tolerância a erros; código preservado | :120-121 | CONCLUÍDA | — | `search.ts:59-61,149-152`; `CatalogFeedback.tsx:38` |
| 5.2 Histórico recente apenas no dispositivo | :122 | NÃO INICIADA | — | nenhuma ocorrência de `recent`/histórico de busca em `src/` |
| 5.2 Zero resultado com correções/atalhos | :123 | CONCLUÍDA | — | `CatalogFeedback.tsx:32-40` |
| 5.3 “Mín. N un.” no card | :131 | CONCLUÍDA | — | `src/components/ProductCard.tsx:60` |
| 5.3 Até dois badges com “+1” | :132 | CONCLUÍDA (SUBSTITUÍDA) | Decisão posterior: badge único | `PLANO_UX:19`; `src/lib/productBadges.ts` |
| 5.3 Segunda imagem no card | :133 | NÃO INICIADA | Opcional | `ProductCard.tsx` (uma imagem) |
| 5.4 FAQ contextual catálogo/produto/briefing | :140-144 | CONCLUÍDA | — | `src/components/ContextualFaq.tsx:18,44` |
| 5.4 SLA publicado | :146 | BLOQUEADA-EXTERNA | Validação operacional | `QuotePage.tsx:355` (texto factual) |
| 5.5 Eventos de funil sem PII | :152 | CONCLUÍDA | — | `analytics.ts:4-80` |
| 5.5 “Em alta” só com telemetria / fallback “Sugestões” | :154 | PARCIAL | Rótulo “Em alta” sem telemetria | `catalogFilters.ts:10` |
| 5.6 Moodboard compartilhável + “Duplicar e ajustar” | :160 | CONCLUÍDA | — | `src/pages/SharedSelectionPage.tsx:185,193`; `api/shared-selections.ts` |
| 5.7 Comparador 2–4 dentro do moodboard | :164 | CONCLUÍDA | Desvio: até 3, no catálogo | `src/lib/catalogComparison.ts`; `CatalogComparisonTray.tsx` |
| 5.8 `/ideias/onboarding, eventos, clientes-vip, sustentaveis` | :170-173 | CONCLUÍDA | — | `src/lib/ideaLandings.ts:4,16-42`; `api/site-page.ts:45-48` |
| 5.8 `/datas/natal`, `/datas/dia-do-cliente` | :174-175 | PARCIAL | Só `?data=` com meta SSR; sem landing dedicada (FAQ, seleção) | `api/site-page.ts:68-75`; sem rota `/datas/:slug` em `App.tsx` |
| 5.9 SSR de produto (meta + JSON-LD) | :181 | CONCLUÍDA | — | `api/_lib/publicProductPage.ts:128-150` |
| 5.9 SSR de categoria/intenção (conteúdo) | :181 | PARCIAL | Apenas metadados; corpo é SPA | `api/site-page.ts:33-75` |
| 5.9 BreadcrumbList | :182 | NÃO INICIADA | — | nenhuma ocorrência de `BreadcrumbList` |
| 5.9 Product sem Offer | :183 | CONCLUÍDA | — | `publicProductPage.ts:140-149` |
| 5.9 ItemList só se a lista estiver no HTML inicial | :184 | PARCIAL | ItemList injetado no cliente | `CommemorativeDatesPage.tsx:272-274` |
| 5.10 Prova social governada | :188-196 | BLOQUEADA-EXTERNA | Cases/logos autorizados | matriz LK31/32, UX26 |
| P2 Coleções sazonais com validade/responsável | :202 | CONCLUÍDA | — | `shared/catalogEditorial.ts:7-19` |
| P2 Recentemente vistos no dispositivo | :203 | NÃO INICIADA | — | nenhuma ocorrência |
| P2 Recomendações complementares (material/ocasião/kit) | :204 | PARCIAL | Relacionados só por categoria | `ProductPage.tsx:31-32` |
| P2 Quadro com comentários | :205 | NÃO INICIADA | Condicional à demanda | — |
| P2 Conteúdo editorial vinculado a buscas/saves | :207 | PARCIAL | Sem vínculo mensurável | `shared/catalogEditorial.ts` |
| §7 Métricas (medianas, taxas, dashboards) | :261-267 | NÃO INICIADA | Sem dashboards/derivações | — |
| §7 “Compartilhamentos que retornam ao site” | :267 | NÃO INICIADA | Sem evento na abertura de seleção compartilhada | `analytics.ts:4-35`; `SharedSelectionPage.tsx` |
| §9 Guardrail sem chat/pop-up/newsletter/WhatsApp flutuante | :293 | CONCLUÍDA | — | nenhuma ocorrência de newsletter/flutuante |

---

## 6. `docs/RELATORIO_EXPERIENCIA_MARKETING_GEN_Z_20260909.md` — recomendações não absorvidas

(UX-01…UX-28 mapeiam para a matriz UX; abaixo, sub-recomendações esquecidas.)

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| Explicar onde os itens são guardados (local × conta) no fluxo | RELATORIO:91, :229 | PARCIAL | Só na privacidade e no rótulo de salvar na conta | `PrivacyPage.tsx:11`; `SavedSelections.tsx:183`; `QuoteDrawer.tsx:201-208` sem explicação |
| Explicar por que cada grupo combina com a campanha | :121 | PARCIAL | Texto genérico | `CatalogPage.tsx:44` |
| Comparação: salvar itens sem desmontar + resumo compartilhável | :213 | NÃO INICIADA | — | `CatalogComparisonTray.tsx:30-41` |
| Pós-envio: resumo, canal e prazo de retorno | :261 | PARCIAL | Sem resumo; prazo externo | `QuotePage.tsx:348-372` |
| “Minhas datas” acessível sem rolar a agenda | :296 | PARCIAL | Posição inalterada | `CommemorativeDatesPage.tsx:307,330` |
| WhatsApp comercial oficial | :315-318 | BLOQUEADA-EXTERNA | Número verificado | nenhuma ocorrência de `wa.me` |
| Horário/prazo de resposta no contato | :317 | BLOQUEADA-EXTERNA | Dado operacional | `src/pages/ContactPage.tsx:18-20` |
| Canal de e-mail dedicado (não `adm01`) | :316 | NÃO INICIADA | Percepção registrada | `ContactPage.tsx:19`; `.env.example:15` |
| Forma evidente de corrigir e-mail após solicitar acesso | :327 | PARCIAL | Sem ação dedicada | `CustomerLoginPage.tsx:95-137` |
| Histórico: “próximo passo” no card | :138 | PARCIAL | Status + última atualização; sem próximo passo | `CustomerAccountPage.tsx:94` |
| Privacidade: favoritos de datas e remoção por tipo | :362 | PARCIAL | Favoritos ausentes | `PrivacyPage.tsx:11-12` |
| Domínio próprio | :369 | BLOQUEADA-EXTERNA | Decisão de domínio (F08) | `src/lib/customerAuthRedirect.ts:1` |
| Produto inexistente ≠ indisponibilidade temporária | :377 | PARCIAL | Mesmo título | `CatalogFeedback.tsx:25`; `ProductPage.tsx:133` |
| Textos auxiliares de 10–11 px | :400 | PARCIAL | 77 declarações | `src/styles.css` |
| Sessões com compradores reais | :465-482 | BLOQUEADA-EXTERNA | Recrutamento | matriz UX20/UX91 |

---

## 7. `docs/GEN_Z_RESEARCH.md`

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| Atalhos wearables/kits/tech/menor impacto | GEN_Z:42, :140 | CONCLUÍDA | — | `HomePage.tsx:198-200`; `search.ts:43-47` |
| Sustentabilidade só com comprovação | :43 | CONCLUÍDA | — | `src/lib/ideaLandings.ts:42` |
| Analytics apenas eventos e IDs | :156 | CONCLUÍDA | — | `analytics.ts:39-80` (allowlist) |
| “Meus saves”/“moodboard” como nome de tarefa | :100, :107 | CONCLUÍDA (SUBSTITUÍDA) | Guia de voz adotou “Minha seleção” | `docs/GUIA_DE_VOZ.md:10` |
| Hero fotográfico de equipe real | :129, :164 | PARCIAL | Hero é imagem gerada por IA; acervo real pendente | `public/images/hero-gen-z-v2*.webp`; matriz LK06=P |
| Hipóteses e 2 rodadas de validação (5–8 pessoas) | :136-160 | BLOQUEADA-EXTERNA | Pesquisa não realizada | nenhum registro de sessões em `docs/` |

---

## 8. `docs/UX_STRATEGY.md`

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| Seleção persistente e sincronizada entre abas | UX_STRATEGY:31 | CONCLUÍDA | — | `src/context/QuoteCartContext.tsx:77` (evento `storage`) |
| Breadcrumb nomeado | :85 | CONCLUÍDA | Só no produto | `ProductPage.tsx:140` |
| “Pular para o conteúdo” | :86 | CONCLUÍDA | — | `Layout.tsx:142` |
| Orçamento noindex | :105 | CONCLUÍDA | Bloqueio em robots SUBSTITUÍDO por `X-Robots-Tag` (correto) | `vercel.json:68`; `public/robots.txt` (`Allow: /`) |
| “Dados pessoais não gravados no navegador” | :122 | CONCLUÍDA (SUBSTITUÍDA) | Rascunho com contato em sessionStorage 24 h (UX07), divulgado | `PrivacyPage.tsx:11` |
| WCAG 2.2 AA validada com leitor de tela | :95 | PARCIAL | Revisão manual não feita | ver plano-50 #47 |
| CWV p75 por template | :107, :139 | PARCIAL | Coleta sem baseline | `App.tsx:104` |
| Métrica: adição e **remoção** da seleção | :134 | PARCIAL | Sem evento de remoção | `analytics.ts:4-35` |
| Métrica: abandono por campo | :136 | NÃO INICIADA | — | nenhuma ocorrência |
| Métrica: tempo até a primeira seleção | :137 | NÃO INICIADA | — | nenhuma ocorrência |
| Métrica: busca sem resultado | :131 | PARCIAL | Não separada de filtro vazio | `analytics.ts:7` |
| Texto de privacidade aprovado pelo jurídico | :125, :149 | BLOQUEADA-EXTERNA | Aprovação | — |
| Telefone/e-mail/domínio/redes confirmados | :148 | BLOQUEADA-EXTERNA | Domínio pendente | `.env.example:14` |
| Lighthouse + dados de campo no aceite | :152 | NÃO INICIADA | Sem Lighthouse em CI | nenhuma ocorrência em `.github/`/`scripts/` |

---

## 9. `UX_AUDIT_REPORT.md` (raiz, 05/10/2026)

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| F04 Resposta tardia apagava seleção | UX_AUDIT_REPORT:314 | CONCLUÍDA | — | `QuotePage.tsx:49`; `e2e/smoke.spec.ts:562` |
| F01 Callback “verificada” antes da verificação | :323 | CONCLUÍDA | — | `src/pages/AuthConfirmPage.tsx:29-37`; `AuthConfirmPage.test.tsx` |
| F02 Auth infinita em falha do SDK | :332 | CONCLUÍDA | — | `CustomerAuthContext.tsx:12,75` |
| F03 Edições descartadas durante envio | :341 | CONCLUÍDA | — | `ConversationForm.tsx:96`; `CustomerLoginPage.tsx:120`; `QuotePage.tsx:413,436`; `SavedSelections.tsx:182-185` |
| F05 Padrão pontilhado atrás da foto | :350, :403 | PARCIAL | Mesclar branch após aprovação visual | `src/styles.css:4457-4460`; `origin/fix/product-card-clean-image-background` (4f88d86) |
| F06 Swatches sem nome/duplicados na origem | :359, :404 | BLOQUEADA-EXTERNA | Higienização no canônico | `scripts/check-catalog-public-contract.mjs` (warning) |
| F07 Entrega real e-mail/WhatsApp | :368, :405 | BLOQUEADA-EXTERNA | Segredos e canário | `api/notifications.ts` |
| F08 Domínio canônico | :377, :406 | BLOQUEADA-EXTERNA | Decisão de domínio | `src/lib/customerAuthRedirect.ts:1` |

---

## 10. `docs/REACT_BITS_MOTION_AUDIT.md`

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| Fold Text só na headline, uma vez | REACT_BITS:9, :81 | CONCLUÍDA | — | `HomePage.tsx:151,162`; `FoldText.tsx:132` |
| Glitch Text só em “Tendências da vez”, sem loop | :10, :82 | CONCLUÍDA | — | `HomePage.tsx:221`; `GlitchText.css` |
| `prefers-reduced-motion` entrega estado final | :24, :93 | CONCLUÍDA | — | `src/styles.css:3967-3972` |
| Nenhum loop decorativo | :23 | CONCLUÍDA | Loops restantes são estados de carregamento | `src/styles.css:1021,1847,1917,3188` |
| Count Up/Stroke/Masked reservados | :12 | CONCLUÍDA (N.A.) | Não entram por decisão | — |
| Revisar orçamento de movimento com público 20–30 | :85 | BLOQUEADA-EXTERNA | Pesquisa | — |

---

## 11. `docs/GUIA_DE_VOZ.md`

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| Nomes funcionais (Catálogo, Minha seleção, Seleção salva, Solicitar orçamento, Meus orçamentos, Montar kit) | GUIA:7-14 | CONCLUÍDA | — | `Layout.tsx:146,197,220`; `QuoteDrawer.tsx` |
| “nosso time de especialistas” | :15 | CONCLUÍDA | — | nenhuma ocorrência de “nossa equipe/equipe comercial” em `src/` |
| Radar/tendências/moodboard só em títulos; botões dizem a ação | :17 | PARCIAL | 3 ações com “radar” | `CustomerAccountPage.tsx:93`; `CatalogPage.tsx:53`; `Layout.tsx:214` |
| Validação dos exemplos pelo marketing e testes de compreensão | :3, :42 | BLOQUEADA-EXTERNA | Aprovação/pesquisa | — |

---

## 12. `docs/CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md` — prometido × existente

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| 1 Primeiro envio sem cadastro | PORTAL:17 | CONCLUÍDA | — | `App.tsx:116` (sem `CustomerRoute`) |
| 2 “Meus orçamentos” no cabeçalho, menu móvel e rodapé | :18 | CONCLUÍDA | — | `Layout.tsx:146,197,220` |
| 3 Tela de acesso responsiva | :19 | CONCLUÍDA | — | `src/pages/CustomerLoginPage.tsx` |
| 4 Link/código por e-mail | :20 | CONCLUÍDA | Entrega real não reexecutada | `CustomerLoginPage.tsx:52,59` |
| 5 Senha | :21 | CONCLUÍDA | — | `CustomerLoginPage.tsx:69` |
| 6 Criar senha + confirmar e-mail | :22 | CONCLUÍDA | — | `CustomerLoginPage.tsx:76` |
| 7 Recuperar/redefinir | :23 | CONCLUÍDA | Sem teste de `/definir-senha` (ver E-010) | `CustomerLoginPage.tsx:89`; `SetPasswordPage.tsx:28` |
| 8 Redirect interno restrito | :24 | CONCLUÍDA | — | `customerAccount.ts:113`; `AuthConfirmPage.tsx:14` |
| 9 Callback inválido recuperável | :25 | CONCLUÍDA | — | `AuthConfirmPage.tsx:29-37` |
| 10 Sessão persistente/refresh | :26 | CONCLUÍDA | Expiração real não testada | `CustomerAuthContext.tsx` |
| 11 Recusar secret key no bundle | :27 | CONCLUÍDA | — | `src/lib/siteSupabaseConfig.ts:26` |
| 12 Auth fixado no projeto isolado | :28 | CONCLUÍDA | — | `siteSupabaseConfig.ts:1-2` |
| 13–15 Titular opcional, associação por e-mail confirmado, idempotente | :29-31 | CONCLUÍDA | — | `migrations/20260909180000_create_customer_quote_portal.sql:149-168,385`; `tests/database/customer_portal.test.sql` |
| 16 RPC de listagem por `auth.uid()` | :32 | CONCLUÍDA | — | `customerAccount.ts:65-78` |
| 17 RPC de detalhe do titular | :33 | CONCLUÍDA | — | `customerAccount.ts:85` |
| 18 Snapshot imutável | :34 | CONCLUÍDA | — | `CustomerQuotePage.tsx:232` |
| 19–20 Timeline pública separada; eventos reais | :35-36 | CONCLUÍDA | Operação humana não comprovada | `create_customer_quote_portal.sql:34`; `CustomerQuotePage.tsx:236` |
| 21 Painel com busca/filtros/paginação/estados | :37 | CONCLUÍDA | — | `CustomerAccountPage.tsx:86-95` |
| 22 Detalhe com produtos, quantidades, contato, prazo, contexto | :38 | CONCLUÍDA | Anexos do briefing não aparecem no detalhe | `CustomerQuotePage.tsx:231-232` |
| 23 “Solicitar novamente” | :39 | CONCLUÍDA | — | `CustomerQuotePage.tsx:13,228,238`; `src/lib/quoteRepeat.ts` |
| 24 Propostas versionadas após publicação | :40 | CONCLUÍDA | Ciclo comercial real pendente | `CustomerQuotePage.tsx:233` |
| 25 Bucket privado PDF ≤ 20 MB | :41 | CONCLUÍDA | — | `create_customer_quote_portal.sql:43-47` |
| 26 URL assinada de 60 s | :42 | CONCLUÍDA | — | `api/customer-proposals.ts:125` |
| 27 Recusa origem/UUID/bucket/host | :43 | CONCLUÍDA | — | `api/customer-proposals.ts:9,17,59,75,93`; `tests/api/customer-proposals.test.ts` |
| 28 noindex + analytics sem protocolo | :44 | CONCLUÍDA | — | `vercel.json:49-57`; `analytics.ts:95` |
| 29 Aviso de privacidade | :45 | PARCIAL | Não cobre favoritos de datas; aprovação jurídica pendente | `PrivacyPage.tsx:11-17` |
| 30 Cobertura automatizada | :46 | PARCIAL | Sem teste de `/definir-senha`; sem A→B direto em E2E | ver E-010 e plano-50 #13 |
| Ativação remota e smoke (09/09) | :77-88 | CONCLUÍDA (declarado) | Não verificável no repositório | — |
| Extras do bloco 8 (UX71–80): ajuste, preferências | PLANO_UX:525,541 | PARCIAL | Ajuste atrás de flag; sem preferências na conta | `siteFeatureFlags.ts:6`; `CustomerAccountPage.tsx` |

---

## 13. `docs/EXECUCAO_UX_20260910.md`

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| Filtro “Novos drops” corrigido | EXEC_UX:7 | CONCLUÍDA | — | `useCatalogPageState.ts:95` |
| Autocomplete fechado não intercepta | :8 | CONCLUÍDA | — | `src/components/SearchAutocomplete.tsx` |
| Comparação em sessionStorage (3) | :9 | CONCLUÍDA | — | `src/lib/catalogComparison.ts` |
| Rascunho 24 h na sessão | :10 | CONCLUÍDA | — | `src/lib/quoteDraft.ts`; `PrivacyPage.tsx:11` |
| Contexto de campanha + nome da seleção | :11 | CONCLUÍDA | — | `QuoteCartContext.tsx` |
| Evento × recebimento × verba | :12 | CONCLUÍDA | — | `QuotePage.tsx:446-448` |
| Contato com mensagem e preferência | :13 | CONCLUÍDA | — | `ConversationForm.tsx:13,110` |
| Desfazer 8 s e confirmação de limpeza | :14 | CONCLUÍDA | — | `QuoteCartContext.tsx:31,37`; `QuoteDrawer.tsx:279` |
| Linguagem “Minha seleção/Solicitar orçamento” | :15 | PARCIAL | Resíduos “radar” em ações | ver §11 |
| Zoom e variante estável | :16 | CONCLUÍDA | — | `ProductGallery.tsx:79-93` |
| Sugestão de digitação | :17 | CONCLUÍDA | — | `search.ts:149-152` |
| Histórico com título, miniaturas, última movimentação | :18 | CONCLUÍDA | — | `CustomerAccountPage.tsx:94` |
| Agenda futura + ocasião ao orçamento | :19 | CONCLUÍDA | — | `analytics.ts:34` (`occasion_catalog_opened`) |
| Validação de e-mail + mostrar senha | :20 | CONCLUÍDA | — | `CustomerLoginPage.tsx`; `SetPasswordPage.tsx:40` |
| SSR de produto + 404 noindex | :21 | CONCLUÍDA | — | `api/product-page.ts`; `api/not-found.ts` |
| Rolagem/foco preservados | :22 | CONCLUÍDA | — | `src/lib/scrollRestoration.ts` |
| Flags remotas ativas em Production/Preview | :50-52 | CONCLUÍDA (declarado) | Não verificável localmente | `siteFeatureFlags.ts:5-7` |
| E-mail/WhatsApp automáticos | :54 | BLOQUEADA-EXTERNA | Provedores/templates/opt-in | — |

---

## 14. `docs/EXECUCAO_LOTE_FAVORITOS_20260924.md`

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| Projeção vazia em identidade carregando/divergente (F24-03) | LOTE:9 | CONCLUÍDA | — | `useOccasionFavorites.test.tsx:94,131` |
| Intenções sobre snapshots antigos (F24-01/02) | :10 | CONCLUÍDA | — | testes `:33,:45` |
| Última intenção vence respostas fora de ordem | :11 | CONCLUÍDA | — | teste `:79` |
| Descartar intenções na troca de sessão | :12 | CONCLUÍDA | — | testes `:255,:273` |
| Sincronização entre abas via `storage` | :13 | CONCLUÍDA | — | testes `:150-217` |
| Rejeição de anexo alterado remove metadado e enfileira blob | :14 | CONCLUÍDA | — | `migrations/20260924130000_reject_invalid_verified_briefing_assets.sql` |
| Toolbar de datas sem ícones extras | :15 | CONCLUÍDA | — | `CommemorativeDatesPage.tsx:317` |
| Política completa de PDF | :53 | PARCIAL | Decisão rejeição/quarentena/sanitização | `api/briefing-assets.ts:77-79` |
| Dados comerciais, kits, múltiplos, técnicas, área | :54 | BLOQUEADA-EXTERNA | Dados comerciais | — |
| Encaminhamento comercial, SLA, envio real, alertas | :55 | BLOQUEADA-EXTERNA | Destino/segredos | `operationalAlerts.ts:7-12` |
| Preview DB, restore, pesquisa, dispositivos, CWV | :56 | BLOQUEADA-EXTERNA | Ambiente/participantes | — |
| Contrato vivo de leitura do catálogo | :57 | CONCLUÍDA | Entregue depois (#83) | `.github/workflows/catalog-contract.yml`; `scripts/check-catalog-public-contract.mjs` |

---

## 15. `docs/EXECUCAO_VALIDACOES_UX_EDITORIAL_20260922.md`

| Funcionalidade | Fonte | Classificação | O que falta | Evidência |
|---|---|---|---|---|
| Restauração progressiva de posição (1,5 s, cancelável) | VALID:13-15 | CONCLUÍDA | — | `src/lib/scrollRestoration.ts`; `scrollRestoration.test.ts` |
| PDF A4 multipágina da seleção | :16 | CONCLUÍDA | — | `src/styles.css:6763` (`@page A4`) |
| Coleção em rascunho/retirada/expirada fora da biblioteca, metadados e sitemap | :17 | CONCLUÍDA | — | `shared/catalogEditorial.ts`; `tests/api/curated-page-previews.test.ts` |
| Teste de governança falha com revisão vencida | :18 | CONCLUÍDA | — | `src/lib/catalogLibrary.test.ts` |
| UX84 PDFs/revistas reais | :38 | BLOQUEADA-EXTERNA | Material autorizado | — |
| LK10 fotografias de categorias | :39 | CONCLUÍDA (código; entregue em 23/09) | Curadoria de fotos autorizadas | `src/pages/HomePage.tsx:60-93` |
| UX77 ajuste chegando a responsável | :45 | PARCIAL | Ciclo operacional | `siteFeatureFlags.ts:6` |

---

## 16. `docs/audits/marketing-20260909/README.md`

Índice de evidências (capturas, `.ics`, PDF) do relatório Gen Z; não promete funcionalidade própria. Os achados correspondentes estão nas §3 e §6. Classificação: N.A.

---

## 17. Divergências para o auditor da matriz

| Linha | Estado na matriz | Constatação no código |
|---|---|---|
| LK44 | P — “WhatsApp iniciado pelo visitante existe” | Não existe click-to-chat (nenhuma ocorrência de `wa.me`) |
| UX88 | P — “sincronização por conta ainda ausente” | Sincronização implementada (`customerOccasionFavorites.ts:31-39`, migrations 20260923130000/20260927103000) |
| UX12 | I | “Explorar/Afinar o radar”, “Radar completo”, “Em alta” sem dado |
| UX19 | I | Produto inexistente com título de falha temporária |
| UX14 | I | 77 tamanhos de fonte ≤ 0,69rem (achado UX24) |
| T13-31 | — | Comentário em `QuotePage.tsx:357-364` contradiz o contrato enriquecido (`20260923200000`) |
| AC29 | P | Aviso de privacidade sem favoritos de datas |

---

## Totais consolidados (linhas das tabelas §1–§15)

| Classificação | Quantidade |
|---|---:|
| CONCLUÍDA (inclui SUBSTITUÍDA/N.A. e “declarado”) | 145 |
| PARCIAL | 59 |
| NÃO INICIADA | 15 |
| BLOQUEADA-EXTERNA | 25 |
| **Total de linhas** | **244** |

Contagem exata por linha de tabela das §1–§15 (as duas linhas LK10 foram reclassificadas para CONCLUÍDA na consolidação, após conferência de `HomePage.tsx:60-93`); itens repetidos entre documentos (ex.: “Em alta”, radar, privacidade de favoritos) aparecem em mais de uma seção de propósito, para rastreabilidade por fonte.
