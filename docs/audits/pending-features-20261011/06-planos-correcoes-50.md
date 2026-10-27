# F — Auditoria dos planos de correções/melhorias e suas revisões

**Base:** `HEAD = main = 3f82233` (06/10/2026), auditado em 11/10/2026. Somente leitura: nenhum arquivo do repositório foi alterado. Não reexecutei `npm test`/pgTAP; a verificação foi feita por leitura de código, migrations, testes e workflows, mais `git log`/`git ls-remote`, `gh run list` (runs do contrato do catálogo e do release) e leitura do projeto Vercel (`nodeVersion`). A listagem das variáveis da Vercel e a proteção de branch do GitHub retornaram 403 e não foram verificadas.

**Planos auditados:** P13 = `PLANO_CORRECOES_50_ETAPAS_20260913`, P16 = `..._20260916`, P17 = `..._20260917`, P23 = `PLANO_MELHORIAS_CORRECOES_50_ETAPAS_20260923`, P24 = `..._20260924`. A notação `P16:25` significa plano 16/09, etapa 25.

**Classificação:** CONCLUÍDA · PARCIAL (com o que falta) · NÃO INICIADA · BLOQUEADA-EXTERNA (credencial, decisão, conteúdo, pessoas ou homologação) · SUPERADA (uma alternativa registrada substituiu a etapa).

**Contexto de commits após as revisões em escopo** (o código atual difere dos SHAs revisados):
- #44–#47 e `f6afbd0`/`8b9afc0`/`f121670` corrigiram F24-01/02/03 e F28.
- #51 `fbaff1e` passou a rejeitar PDF em anexos.
- `a30bb07`/`5356251` criaram o release por candidato, com smoke e rollback.
- #82 `e64efd4` adicionou preflight de rate limit e corrigiu o ci-health.
- #83 `13c5238` criou a sonda viva do contrato do catálogo.
- #89 trata perdas em fluxos assíncronos; #95 endureceu o Graphify.

---

## 1. Pendências consolidadas (deduplicadas)

Só itens não concluídos. A coluna "Origens" junta todas as etapas equivalentes dos cinco planos. A tabela segue por prioridade: técnico possível → externo.

| # | Pendência | Origens (plano:etapa) | Classificação | O que falta | Evidência |
|---|---|---|---|---|---|
| 1 | Reconciliação semântica da matriz/ledger dos 230 requisitos | P13:50, P17:48, P23:02, P23:50, P24:02, P24:50 | NÃO INICIADA | Aplicar à matriz as correções propostas pelas revisões de 23/09, 24/09 e 28/09: LK10 deixar de ser N, UX88 e UX35 com texto atual, UX03/UX02/LK37 etc. Incluir no template de PR o item "atualizar a matriz", exigido pela governança. | O CSV não muda desde `dafd3d9` (22/09). `MATRIZ_FECHAMENTO_PLANOS_20260912.csv` ainda traz LK10=`N` ("Categorias principais continuam iconográficas"), UX88 ("sincronização por conta ainda ausente") e UX35 ("ranking… não comprovado"). Distribuição ainda 118I/100P/11E/1N. Nenhuma ocorrência de "matriz" em `.github/pull_request_template.md`. |
| 2 | Observador independente de "cron silencioso" (heartbeat/`lastRunAt` por origem, alerta de não execução) | P13:27, P13:29, P13:41, P16:34 (sub-item), P16:42, P17:30, P17:35, P23:39, P24:24 | NÃO INICIADA (técnico); o canal real é BLOQUEADA-EXTERNA | Registrar a última execução de `/api/retention` e `/api/notifications`. Criar um observador fora do cron monitorado (por exemplo, um workflow agendado que consulte a saúde da fila) com limiar e escalonamento. | Nenhuma ocorrência de `heartbeat\|lastRunAt\|last_run_at` em `api/`, `src/`, `scripts/`, migrations ou `.github/`. `vercel.json:6-9` tem só 2 crons. Os workflows agendados (`catalog-contract`, `ci-health`, `codeql`, `production-drift`, `secrets-rotation-reminder`, `stale-branches`) não consultam a fila. |
| 3 | Diff integral de schema/ACL remoto (`pg_catalog`, `db diff --linked`): grants extras/default privileges de `service_role` e inventário remoto de policies/grants | P16:26 (inventário remoto), P16:48, P23:36, P24:20 | PARCIAL | Só as RPCs de favoritos foram corrigidas. Falta um retrato completo de grants, default privileges, triggers e policies do projeto `xlzmclcjdncjfdrjxclt`, com cada diferença justificada. Isso é viável: o CI já usa `SUPABASE_ACCESS_TOKEN`. | `20260927103000_harden_occasion_favorites_rpc_acl.sql:6-10` revoga e concede só nas 2 RPCs. `release.yml:77-101` compara apenas versões do ledger. Nenhum `db diff` em workflows. |
| 4 | Security Advisor/lint remoto recorrente | P16:31 | NÃO INICIADA | Rodar o advisor/lint `--linked` periodicamente. O token já está disponível no CI. | `database.yml:48` roda só `db lint --local`. Nenhuma ocorrência de "advisor" em `.github/`. |
| 5 | Adoção dos tipos gerados nos contratos da API e inventário das fronteiras JSON manuais | P16:21, P17:23, P23:21, P24:19 | PARCIAL | Fazer `api/` consumir `site-database.types.ts` (ou validação equivalente) nas RPCs. Inventariar e depreciar estruturas manuais. | Apenas `src/lib/siteSupabase.ts:9` (`SupabaseClient<Database>`) e `src/lib/customerSelections.ts` importam os tipos. Nenhuma ocorrência em `api/`. `api/_lib/contracts.ts` (416 linhas) é manual. |
| 6 | Comentário de retenção/finalidade por tabela | P16:35, P17:31 | PARCIAL | Faltam `comment on table` em 8 tabelas. Depois, regenerar o dicionário. | `docs/DATABASE_DICTIONARY.md:36,52,105,187,204,246,262,312` registram "_Sem comment on table_" para `consent_receipts`, `contact_requests`, `customer_profiles`, `proposal_documents`, `quote_adjustment_requests`, `quote_request_events`, `quote_requests` e `shared_selections`. |
| 7 | Decisão formal do alcance do ranking (local à página) e da paginação | P23:13, P24:27 | NÃO INICIADA (documento; aceite de Produto) | Registrar o limite "curadoria só sobre a página recebida", a estabilidade multipágina e a decisão sobre relevância global. | `src/lib/useCatalogPageState.ts:112-113` aplica o ranking só em `curadoria`, sobre `catalog.data.products`. Fora dos planos e revisões, nenhum documento de decisão. |
| 8 | Política de filtros (aplicação imediata × rascunho+Aplicar) | P23:29, P24:30 | NÃO INICIADA (decisão documental); a homologação é externa | Registrar e aprovar a política atual, incluindo foco e cancelar/limpar. | Fora de PLANO_UX/planos/revisões, nenhuma ocorrência de "aplicação imediata"/"rascunho+Aplicar". |
| 9 | Avaliação isolada de majors (ESLint 10, TypeScript 7), matriz de peers e proteção contra majors automáticos do Dependabot | P13:43 (ondas b/c), P17:06 (changelog), P17:07, P17:08, P23:47, P24:46 | NÃO INICIADA | Documentar a matriz de compatibilidade e a decisão de adiar ou avançar. Adicionar `ignore`/política de majors no Dependabot (incompatibilidades já quebraram `main` duas vezes). | `package.json`: `eslint ^9.39.5`, `@eslint/js ^9.39.5`, `typescript ^5.9.3`. `.github/dependabot.yml` sem `ignore`. Nenhum documento de decisão fora dos planos/revisões. |
| 10 | Favoritos: E2E/ensaio autenticado multi-aba, promoção anônima no limite de 100/falha parcial/repetição, troca direta A→B em E2E | P13:13 (cenário b), P23:07, P23:10, P24:11, P24:12, P24:15 (sub-aceites) | PARCIAL | O lote técnico está corrigido (F24/F28, 24 testes do hook). Faltam: um E2E Playwright de favoritos (visitante→conta, A→B, duas abas), teste de promoção excedendo 100 ou com falha parcial e o cenário A→B direto. | Nenhuma ocorrência de `favorit` em `e2e/`. A promoção só tem o caso básico (`src/pages/CommemorativeDatesPage.test.tsx:42`). O limite só aparece em pgTAP (`customer_occasion_favorites.test.sql:48-51`). Os E2E de sessão (`e2e/smoke.spec.ts:751,784,817`) não cobrem A→B direto. |
| 11 | Decomposição de páginas >300 linhas e CSS monolítico | P13:35, P13:48, P23:33, P24:43 | PARCIAL (regrediu) | `QuotePage` cresceu de 348 (22/09) e 412 (24/09) para 467 linhas. Ainda acima de 300: Home 370, Datas 350, Catálogos 303. O CSS é um arquivo único de 6.783 linhas. | `wc -l src/pages/*.tsx` e `src/styles.css`. |
| 12 | Core Web Vitals de campo (baseline p75 antes/depois) | P13:37, P23:33, P24:43 | PARCIAL | A coleta está instalada. Falta a linha de base p75 documentada e a comparação. | `src/App.tsx:104` (`<SpeedInsights beforeSend={redactTelemetryUrl} />`). Nenhum registro de baseline. |
| 13 | Funil, relato de erros e métricas operacionais: recepção, deduplicação e painel | P13:42, P17:47 (métricas), P23:34, P24:39 | PARCIAL; a parte de métricas do carrinho é BLOQUEADA-EXTERNA (decisão de Produto) | Analytics habilitado (o smoke exige o script com 200). Falta provar a recepção de `frontend_error`/eventos, a deduplicação e o painel, e decidir quais métricas são acionáveis. | `src/lib/clientObservability.ts:12-14`, `scripts/smoke-deployment.mjs:47-49`. O checklist de P17:47 ("decisão de produto… não tomada") continua aberto. |
| 14 | Contrato cross-projeto: permissões/grants da origem | P16:46, P17:37, P23:40 | PARCIAL; a parte de permissões é BLOQUEADA-EXTERNA | As colunas, tipos e campos proibidos são verificados diariamente (runs com sucesso de 07 a 11/10). Falta certificar grants/permissões (`anon` na view legada), o que exige `pg_catalog` do Promo Gifts. | `.github/workflows/catalog-contract.yml`, `scripts/check-catalog-public-contract.mjs` (36 colunas; nenhuma ocorrência de `grant\|privilege`), `tests/catalog-public-contract.node.mjs:55` (coluna a mais/a menos). |
| 15 | Política formal de anexos | P23:23, P24:16, P24:17 | PARCIAL | PDF é recusado (falha fechada) e imagens têm verificação de assinatura com dupla leitura. Faltam o aceite formal de Segurança/Produto, cotas e limites de CPU/tempo e, se o PDF voltar a ser aceito, CDR/quarentena. | `api/briefing-assets.ts:77-79` ("PDFs ficam em quarentena até existir parser estrutural/CDR"). Dicionário: `customer_briefing_assets` → "PDFs ficam bloqueados". |
| 16 | Ciclo LGPD: evento `erased`/decisão sobre trilha e homologação do apagamento | P16:32, P23:25, P24:18 | PARCIAL | Existem tombstone e fila de remoção. Falta decidir se o evento `erased` na timeline será criado ou formalmente dispensado, e o aceite do responsável por privacidade com ensaio de retomada. | `20260923120000_audit_security_reliability_hardening.sql:224` (`erased_customer_identities`). Nenhuma ocorrência de evento `'erased'` em `quote_request_events`. |
| 17 | Encerramento formal: checklist mestre, tag de release, revisão por pares | P16:50, P17:50, P23:50, P24:50 | PARCIAL | Não existe tag de release. O checklist mestre de P16 mantém `[ ]` em etapas implementadas. | `git ls-remote --tags origin` traz só `backup/recovered-*`. Exemplo: `PLANO_..._20260916.md:289-292` (Etapa 7, implementada) ainda com `[ ]`. |
| 18 | Regressão integrada e observação de produção com janela acordada | P23:46, P23:49, P24:47, P24:49 | PARCIAL | O release do HEAD passou (candidato, smoke, promoção). Faltam a janela operacional, os limiares e os fluxos autenticados e controlados observados. | `gh run list release.yml`: sucesso em `3f82233` (06/10). Nenhum documento de janela/limiares. |
| 19 | Higiene de branches e disciplina de sincronização | P16:05, P17:02 (disciplina) | PARCIAL (baixa) | Há 34 heads remotos. `stale-branches.yml` só rotula. | `git ls-remote --heads origin \| wc -l` = 34. |
| 20 | Convenção de RPC referenciada no template de PR | P16:23 | PARCIAL (baixa) | Item do checklist não cumprido. | `.github/pull_request_template.md` não cita a convenção (`DATABASE_FUNCTION_CONTRACTS.md:214`). |
| 21 | Recertificação dos `catch`, correlação ponta a ponta no worker do cron, ensaio Windows do `.editorconfig`, inspeção do chunk lucide | P13:06, P13:36, P13:39, P13:40 | PARCIAL (baixa) | 73 blocos `catch {` sem recertificação individual. A correlação chega à confirmação imediata, mas o worker do cron loga só `requestId`. | `api/notifications.ts:588-624`, `api/_lib/leadHandler.ts:151`. `lucide-react ^1.49.0` já sem pin exato. |
| 22 | Cache de borda para dados do catálogo consultados no cliente e TTFB antes/depois | P16:44 | PARCIAL (baixa) | O HTML e o sitemap têm `s-maxage`. As consultas client-side ao Supabase não têm cache de borda. O TTFB não foi medido. | `api/site-page.ts:114`, `api/product-page.ts:64`, `api/sitemap.ts:130`. |
| 23 | Preview autenticado realmente isolado (banco, credenciais, CSP e callbacks por PR) | P13:46, P16:47, P17:38, P23:37, P24:22 | BLOQUEADA-EXTERNA (decisão de custo/infra) | Provisionar a branch ou projeto de preview, atribuir `VITE_SITE_PREVIEW_PROJECT_REF`/`SITE_PREVIEW_SUPABASE_PROJECT_REF` e chaves próprias, CSP por ref, e ensaiar com 2 contas sintéticas. | As guardas falham fechado em `src/lib/siteSupabaseConfig.ts:8-13` e `api/_lib/siteDatabase.ts:71-73`. `docs/RUNBOOK_PREVIEW_ISOLADO.md` ("decidir explicitamente custo, retenção e dono"). |
| 24 | Backup/PITR e drill de restore com RPO/RTO medidos | P16:39, P17:33, P17:49 (restore), P23:38, P24:23 | BLOQUEADA-EXTERNA (decisão RPO/RTO/custo; destino descartável) | Decidir RPO/RTO e PITR (último estado conhecido: `pitr_enabled=false`). Executar "Restore to a New Project" e registrar tempos. | `docs/RUNBOOK_RESTORE_SITE.md:3` ("não executa restauração"). Não há registro de drill. `RUNBOOK_BACKUP_RESTORE.md` (nome previsto em P16:39) inexistente. |
| 25 | Ativação/homologação de Resend, WhatsApp, webhooks e alertas (envio real, bounce, exactly-once WhatsApp, `OPERATIONS_ALERT_WEBHOOK_URL`) | P13:19, P13:29, P13:30, P13:41, P16:20 (recebimento), P16:42, P17:35, P23:20, P24:38 | BLOQUEADA-EXTERNA (adiado por decisão do usuário) | Domínio/remetente, template Meta, segredos de webhook, URL de alerta e ensaio aceito→entregue→bounce com destinatário controlado. A parte técnica está concluída. | `api/notifications.ts` (`configuredChannels`). `EXECUCAO_PLANO_FECHAMENTO_20261001.md` ("Canais adiados: Resend, WhatsApp, webhooks, alertas…"). |
| 26 | Cutover `site_api` (`SITE_SUPABASE_SERVICE_JWT`) e caminho mínimo de Storage | P16:25, P17:25, P23:39, P24:25 | BLOQUEADA-EXTERNA (adiado); a parte técnica de Storage é PARCIAL | Ativar o JWT, definir privilégio mínimo para a remoção no Storage (hoje feita com a chave ampla), validar negações e retirar `SITE_SUPABASE_SECRET_KEY`. | `api/_lib/siteDatabase.ts:58-59` (`storageDeleteCredential = SITE_SUPABASE_SECRET_KEY`). |
| 27 | Encaminhamento ao comercial (destino/CRM, outbox idempotente) | P23:18, P24:35, P24:36 | BLOQUEADA-EXTERNA (decisão de destino) | Escolher o destino e o responsável e implementar o adaptador separado de `audience=customer`. | A única ocorrência de `commercial_team` é um CHECK sem consumidor em `20260908230000_create_site_lead_storage.sql:89`. Nenhum adaptador em `api/`. |
| 28 | Responsável, estados operacionais e prazo/SLA de atendimento | P13:27 (SLA), P23:19, P24:37 | BLOQUEADA-EXTERNA (decisão Produto/Operação) | Atribuição, metas aprovadas, fuso/feriados. | `site_private.quote_requests` não tem coluna de responsável nem de prazo (dicionário). Nenhuma ocorrência de `assigned\|sla\|due_at` em migrations. |
| 29 | Aceite editorial da cópia de solicitação (resumo × integral; template WhatsApp) | P13:31, P23:16, P23:17, P24:34 | BLOQUEADA-EXTERNA (aceite editorial/Meta) | A parte técnica está enriquecida. Falta a aprovação de conteúdo e a leitura em clientes reais. | `20260923200000_enrich_quote_confirmation_contract.sql`. |
| 30 | Rotinas operacionais recorrentes: revisão mensal `pg_stat_statements`, observação de `n_dead_tup`, rotação de segredos executada, revisão da trilha administrativa, soak sob cron/provedor real | P16:18, P16:29, P16:36, P16:38, P16:40, P17:19, P17:20, P17:29, P17:32, P23:39, P24:25 | BLOQUEADA-EXTERNA (responsável/operação) | Designar um dono e executar com tráfego real, registrando data e resultado. | `RUNBOOK_REVISAO_MENSAL_BANCO.md:72` tem um único registro local de 16/09. `secrets-rotation-reminder.yml` é só lembrete. Não há registro de rotação. O soak foi com provedor simulado (`RELATORIO_SOAK_TEST_FILA_20260916.md`). |
| 31 | Revisão por pares e ensaio dos runbooks | P16:49, P17:49 | BLOQUEADA-EXTERNA (segunda pessoa) | Revisor nominal com data em cada runbook e ensaio completo de incidente. | Nenhuma ocorrência de `revisado por\|revisor:` em `docs/RUNBOOK_*.md` (11 arquivos). |
| 32 | Responsáveis, lotes e invariantes aprovados; revisor elegível | P23:04, P24:05 | BLOQUEADA-EXTERNA | Designar donos e aprovações de Produto. O CODEOWNERS de pessoa única bloqueia a revisão independente. | `.github/CODEOWNERS`: `* @adm01-debug`. |
| 33 | Corpus julgado de relevância (≥30 intenções com IDs/SKUs, P@5/nDCG) | P23:14, P24:26 | BLOQUEADA-EXTERNA (julgamento humano); o corpus técnico NÃO INICIADO | Hoje há 20 julgamentos lexicais por conceito, sem produto/SKU nem métrica. | `src/lib/searchRelevance.ts:16+` (campos `expectedConcepts`). Nenhuma ocorrência de `ndcg`. |
| 34 | Dados comerciais/kits (múltiplos, técnicas, áreas) e telefone E.164 | P16:24 (telefone), P23:22, P24:28 | BLOQUEADA-EXTERNA (dados/decisão) | Fontes aprovadas por família. A decisão sobre E.164/país foi adiada formalmente. | `DATABASE_FUNCTION_CONTRACTS.md:170-190` ("Decisão… telefone, adiada"). |
| 35 | Acervo aprovado: localizar e catalogar direitos, PDFs/revistas, três cases, fotos de produção | P13:49 (UX84/LK10), P23:26, P23:27, P23:28, P24:31, P24:32, P24:33 | BLOQUEADA-EXTERNA (material) | O usuário declarou que o material existe, mas os arquivos e direitos não foram localizados. | `src/lib/catalogLibrary.ts:42-146`: as 10 coleções são `format: 'online'`. Nenhum `*.pdf` em `public/`. |
| 36 | Homologação de home/fotos/repertório, marca/SEO/prévias por coleção/data e ICS em calendários reais | P23:15, P23:30, P23:35, P24:29, P24:40 | BLOQUEADA-EXTERNA; a imagem social por página é PARCIAL (técnico) | Prévia social específica por coleção/data (hoje institucional); crawler/canais; importação ICS em 2 clientes. | `api/site-page.ts:86` (`imageUrl: heroImage()` para todas as páginas curadas). |
| 37 | Acessibilidade manual (leitor de tela, zoom/reflow, dispositivos) | P13:47, P23:31, P24:41 | BLOQUEADA-EXTERNA | Roteiro humano documentado. | Só existe automação: `AxeBuilder` em `e2e/smoke.spec.ts` (6) e `e2e/product-detail.spec.ts` (3). |
| 38 | Pesquisa com compradores e dispositivos físicos | P23:32, P24:42 | BLOQUEADA-EXTERNA | Rodada formativa de 5 a 8 participantes, iOS/Android físicos. | Nenhum registro de sessões. |
| 39 | Homologação real de Auth/sessão, propostas privadas e links (criar→abrir→revogar) | P23:24, P24:13, P24:14 | BLOQUEADA-EXTERNA (ambiente/contas controladas) | E-mail Auth real, expiração/refresh, PDF privado publicado em ensaio. | Código e testes existem; não há ensaio real registrado. |
| 40 | Graphify: corpus documental e vínculo requisito→fonte→teste; ensaios adversariais; precisão semântica | P23:41, P23:42, P23:43, P23:44, P24:44, P24:45 | PARCIAL (41 e P24:44 NÃO INICIADAS) | Corpus documental allowlist e vínculos com procedência. Testes de timeout, interrupção, lock órfão, disco cheio, symlink externo e HTML hostil. Amostra julgada. | `tests/graphify-tools.node.mjs` (17 testes; homônimos, fingerprint, promoção atômica e tokens cobertos; nenhum de timeout/interrupção/symlink/HTML). Nenhuma extração documental em `scripts/graphify.mjs`. |
| 41 | Itens do Promo Gifts: SSOT do contrato, Fase B (`anon` na view legada), SECURITY DEFINER (`mcp_kv_get`), `pg_graphql`, FKs de kits, policy `system_settings`, inventário, advisor do banco principal | P16:03, P16:43, P16:45 (SSOT), P17:05, P17:36, P17:39, P17:40, P17:41, P17:42, P17:43, P17:44 | BLOQUEADA-EXTERNA (fora do escopo; o AGENTS.md proíbe alterar o Promo Gifts) | Autorização e execução pelo dono do repositório/banco interno. O achado crítico `mcp_kv_get` não tem evidência de correção. | `docs/sql/canonical-principal/URGENTE_revogar_mcp_kv_get.sql` e 3 arquivos `pendente_*.sql` sem recibo de aplicação. `docs/DATABASE_PUBLIC_CONTRACT.md:27` ("decisão pendente do PO"). |

### 1b. Decisões de alternativa/adiamento registradas

Estas etapas não devem ser reimplementadas sem nova decisão.

| Etapa | Classificação | Registro |
|---|---|---|
| P13:05 (`noUnused*` via ESLint) e P13:06 (Prettier) | SUPERADA | Plano P13:96-100 e 118-120. `noUncheckedIndexedAccess` já está ativo (`tsconfig.node.json:6`, `tsconfig.app.json:11`), embora o texto do plano ainda diga "adiada". |
| P13:19 (chave de idempotência WhatsApp) | SUPERADA (reconciliação no banco/`dispatch_started`) | Exactly-once externo não é garantido; ver #25. |
| P16:13 / P17:16 (índice de claim) | SUPERADA | Medido e descartado; cabeçalho de `20260916120000`. |
| P16:28 / P17:28 (token compartilhado) | SUPERADA | `DATABASE_FUNCTION_CONTRACTS.md:145`. |
| P16:27 / P17:27 (criptografia de PII em repouso) | BLOQUEADA-EXTERNA (decisão: adiada) | `DATABASE_FUNCTION_CONTRACTS.md:122-143`. |
| P16:30 (rate limit de borda/Vercel Firewall) | BLOQUEADA-EXTERNA (decisão: adiada) | `DATABASE_FUNCTION_CONTRACTS.md:192`. A camada de banco/API está concluída; o preflight `20261001130320` foi adicionado. |
| P16:34 / P17:30 (pg_cron como retaguarda) | BLOQUEADA-EXTERNA (decisão: adiada) | `DATABASE_FUNCTION_CONTRACTS.md:82`. A detecção de cron silencioso continua aberta (#2). |
| P13:50 (desvios Graphify GR14/24/26/30) | SUPERADA | `docs/GOVERNANCA_FECHAMENTO.md:29+`. |

---

## 2. Lista compacta por plano

**C** = CONCLUÍDA · **Pa** = PARCIAL · **NI** = NÃO INICIADA · **BE** = BLOQUEADA-EXTERNA · **S** = SUPERADA. "#n" aponta a linha da seção 1.

### P13 — Plano de 13/09

- **01–02 C:** artefatos versionados (`git status` limpo); `eslint.config.js`.
- **03 C:** 10 supressões, todas com justificativa adjacente.
- **04 C:** `tsconfig.node.json:5`.
- **05 S/C:** `noUncheckedIndexedAccess` ativo; o texto da linha 100 do plano está desatualizado.
- **06 C/S:** `.editorconfig`/`.gitattributes`; Prettier substituído. Falta o ensaio Windows (#21).
- **07 C:** `check` começa por `lint`.
- **08 C:** `quality.yml:52-53`.
- **09–12 C:** `personalDataReset.ts:24` agora limpa também a repetição.
- **13 Pa:** falta E2E A→B direto (#10).
- **14–18 C.**
- **19 S** (#25).
- **20–26 C:** `vercel.json` `functions`; `tests/api/maxDuration.test.ts`.
- **27 Pa:** `*/15` aplicado; SLA BE (#28); cron silencioso NI (#2).
- **28 C.**
- **29 Pa** (#2, #25).
- **30 BE** (#25).
- **31 BE** (#29).
- **32 C:** `FoldText.tsx:132`.
- **33–34 C:** orçamento Brotli em `check-performance-budget.mjs`.
- **35 Pa** (#11).
- **36 Pa (baixa)** (#21).
- **37 Pa** (#12).
- **38 C:** `leadHandler.ts:151`.
- **39–40 Pa** (#21).
- **41 Pa/BE** (#2, #25).
- **42 Pa** (#13).
- **43 Pa:** onda (a) feita; majors NI (#9).
- **44–45 C:** dependabot, CodeQL, dependency-review, `concurrency`.
- **46 BE** (#23).
- **47 BE** (#37).
- **48 Pa** (#11).
- **49 Pa:** upload, kits e sincronização entregues; acervo BE (#35), relevância (#33).
- **50 Pa** (#1).

### P16 — Plano de 16/09

- **01 C:** o release compara o ledger (`release.yml:77-101`).
- **02 C.**
- **03 BE** (#41): espelho local renomeado e com cabeçalho.
- **04 C.**
- **05 Pa (baixa)** (#19).
- **06 C:** acesso administrativo usado no CI.
- **07 C:** `20260916100000:27` remove o índice antigo.
- **08–12 C.**
- **13 S.**
- **14–16 C.**
- **17 C:** 5 EXPLAIN; fixture de 6.000 linhas em vez de 10.000 (desvio menor).
- **18 BE** (#30).
- **19–20 C.**
- **21 Pa** (#5).
- **22 C.**
- **23 Pa (baixa)** (#20).
- **24 Pa:** e-mail C; telefone BE (#34).
- **25 BE** (#26).
- **26 C:** inventário remoto (#3).
- **27 BE (decisão).**
- **28 S.**
- **29 Pa:** comparação em tempo constante C; rotação BE (#30).
- **30 C:** borda BE (decisão).
- **31 Pa** (#4).
- **32 Pa** (#16).
- **33 C.**
- **34 BE (decisão):** heartbeat NI (#2).
- **35 Pa** (#6).
- **36 Pa/BE** (#30).
- **37 C:** `spawn` assíncrono; `database.yml:46`.
- **38 BE** (#30).
- **39 BE** (#24).
- **40 C/BE:** observação operacional (#30).
- **41 C.**
- **42 Pa** (#2, #25).
- **43 BE** (#41).
- **44 Pa (baixa)** (#22).
- **45 C (site)/BE (SSOT)** (#41).
- **46 Pa** (#14).
- **47 BE** (#23).
- **48 Pa** (#3).
- **49 Pa/BE** (#31).
- **50 Pa** (#17).

### P17 — Plano de 17/09

- **01 C.**
- **02 C:** disciplina de sincronização (#19).
- **03–04 C.**
- **05 BE** (#41).
- **06 C:** sem registro de changelog (#9).
- **07–08 NI** (#9).
- **09–15 C.**
- **16 S.**
- **17–18 C.**
- **19 BE** (#30).
- **20 C/BE** (#30).
- **21–22 C.**
- **23 Pa** (#5).
- **24 C:** só falta referência no template (#20).
- **25 BE** (#26).
- **26 C.**
- **27 BE (decisão).**
- **28 S.**
- **29 Pa** (#30).
- **30 BE (decisão):** heartbeat NI (#2).
- **31 Pa** (#6).
- **32 Pa** (#30).
- **33 BE** (#24).
- **34 C.**
- **35 Pa** (#2, #25).
- **36 BE** (#41).
- **37 Pa** (#14).
- **38 BE** (#23).
- **39–44 BE** (#41).
- **45–46 C.**
- **47 BE:** conflito guiado entregue em `SavedSelections.tsx`; decisão de métricas (#13).
- **48 Pa** (#1).
- **49 Pa/BE:** restore runbook C, revisão por pares (#31), drill (#24).
- **50 Pa** (#17).

### P23 — Plano de 23/09

- **01 C.**
- **02 NI** (#1).
- **03 C:** A01–A05, F24 e F28 com regressões permanentes.
- **04 BE** (#32).
- **05 C:** PRs pequenos; release com candidato e rollback (`release.yml:137-272`).
- **06 C.**
- **07 Pa** (#10).
- **08–09 C.**
- **10 Pa** (#10).
- **11 C:** `useCatalogPageState.ts:112`.
- **12 C:** `catalogRanking.ts:116-119`.
- **13 NI** (#7).
- **14 BE** (#33).
- **15 BE** (#36).
- **16 BE** (#29).
- **17 BE** (#29).
- **18–19 BE** (#27, #28).
- **20 BE** (#25).
- **21 Pa** (#5).
- **22 BE** (#34).
- **23 Pa** (#15).
- **24 BE** (#39).
- **25 Pa** (#16).
- **26–28 BE** (#35).
- **29 NI** (#8).
- **30 BE/Pa** (#36).
- **31–32 BE** (#37, #38).
- **33 Pa** (#11, #12).
- **34 Pa** (#13).
- **35 BE/Pa** (#36).
- **36 Pa** (#3).
- **37 BE** (#23).
- **38 BE** (#24).
- **39 Pa/NI** (#2, #30).
- **40 Pa** (#14).
- **41 NI** (#40).
- **42–44 Pa** (#40).
- **45 C:** fingerprint, promoção atômica, avaliação da versão 0.9.68 (`GRAPHIFY_0968_EVALUATION_20261005.md`).
- **46 Pa** (#18).
- **47 Pa** (#9).
- **48 C:** release por candidato.
- **49 Pa** (#18).
- **50 Pa** (#1, #17).

### P24 — Plano de 24/09

- **01 C.**
- **02 NI** (#1).
- **03 C:** Node 24.x alinhado em `engines`, `.nvmrc`, CI e projeto Vercel (`nodeVersion: 24.x` via API).
- **04 C:** probes F24 e F28 preservados e promovidos.
- **05 BE** (#32).
- **06–10 C:** `useOccasionFavorites.test.tsx`, 24 testes.
- **11–12 Pa** (#10).
- **13–14 BE** (#39).
- **15 Pa:** hotfix C; subaceites (#10).
- **16–17 Pa** (#15).
- **18 Pa** (#16).
- **19 Pa** (#5).
- **20 Pa** (#3).
- **21 C:** sonda diária de 36 colunas; o próprio aceite admite que PostgREST não certifica grants.
- **22 BE** (#23).
- **23 BE** (#24).
- **24 NI** (#2).
- **25 BE** (#26, #30).
- **26 BE** (#33).
- **27 NI** (#7).
- **28 BE** (#34).
- **29 BE** (#36).
- **30 NI** (#8).
- **31–33 BE** (#35).
- **34 BE** (#29).
- **35–37 BE** (#27, #28).
- **38 BE** (#25).
- **39 Pa** (#13).
- **40 Pa/BE** (#36).
- **41–42 BE** (#37, #38).
- **43 Pa** (#11).
- **44 NI** (#40).
- **45 Pa** (#40).
- **46 Pa** (#9).
- **47 Pa** (#18).
- **48 C.**
- **49 Pa** (#18).
- **50 Pa** (#1, #17).

---

## 3. Achados dos revisores que nunca foram corrigidos (estado em `3f82233`)

### Corrigidos depois das revisões, para não reabrir

- REVISAO_INDEPENDENTE A04 (repetição não limpa): `personalDataReset.ts:24`.
- A05 (rota privada na telemetria): `clientObservability.ts:14`.
- A07 (concorrência serial): `queue-concurrency.node.mjs:39` com `spawn`.
- A10 (SQL fora do Graphify): corpus SQL separado em #95.
- A11: gate de cobertura (`quality.yml:52`), 5 EXPLAIN, cliente tipado no frontend.
- A12.5: `generate-database-schema-doc.mjs:74`.
- REVISAO 23/09 A01–A05 e REVISAO 24/09 F24-01/02/03: corrigidos com testes.
- ACL extra de `service_role` nas RPCs de favoritos: `20260927103000`.
- Divergência de runtime Node 22×24: resolvida.
- Inspeção binária (AUDITORIA_5): `verified_at` em `20260922220000`/`230000`.

### Não corrigidos

**1. Matriz/ledger semanticamente desatualizada — nunca corrigido**

Origens: REVISAO_PLANOS_20260923 §7, REVISAO_PLANOS_20260924 ("Correções necessárias na leitura"), REVISAO_POS_PUBLICACAO P2, REVISAO_INDEPENDENTE A12, ANEXO_PRODUTO.

O ANEXO_PRODUTO propôs 114I/105P/11E/0N e retirou o N de LK10. O CSV continua em 118I/100P/11E/1N, sem commit desde 22/09 (`dafd3d9`). LK10, UX88, UX35, UX03 e UX02 mantêm notas vencidas. Ver #1.

**2. Banco principal: `mcp_kv_get` SECURITY DEFINER executável por `authenticated`, com literal de segredo**

Origens: REVISAO_INDEPENDENTE A01; P17:39 "🚨 urgente".

Não há evidência de correção. O SQL de revogação continua só como proposta em `docs/sql/canonical-principal/URGENTE_revogar_mcp_kv_get.sql`. É BLOQUEADA-EXTERNA: exige o dono do Promo Gifts, e o AGENTS.md proíbe a ação a partir do site. É o item de maior severidade sem rastreio de fechamento.

**3. Preview não isolado ponta a ponta**

Origens: REVISAO_POS_PUBLICACAO P1; REVISAO_INDEPENDENTE A11 ("Supabase Preview skipped").

As guardas fail-closed e o escopo Production das variáveis foram aplicados (`RUNBOOK_PREVIEW_ISOLADO.md`, "Condição de publicação"). O isolamento real e o ensaio autenticado nunca foram feitos. Ver #23.

**4. Privilégio mínimo não ativado e lacuna de Storage do `site_api`**

Origens: REVISAO_INDEPENDENTE A06; REVISAO_POS_PUBLICACAO P1.

Só a separação de credencial foi feita (`siteDatabase.ts:58-59`). O Storage continua dependente da chave ampla. Ver #26.

**5. Backup ≠ recuperação comprovada**

Origens: REVISAO_INDEPENDENTE A09; REVISAO_POS_PUBLICACAO P1.

O runbook foi criado, mas não houve drill nem decisão de PITR/RPO/RTO. Ver #24.

**6. Confirmações e alertas sem ativação**

Origens: REVISAO_INDEPENDENTE A08; POS_PUBLICACAO P1.

Continuam adiados. Ver #25.

**7. Cron silencioso sem detecção independente**

Origens: ANEXO_TECNICO (T13-27, T16-34, T16-42, T17-30, T17-35); REVISAO 23/09 §5; REVISAO 24/09 ("Lacunas técnicas").

Nunca implementado. Ver #2.

**8. Diff integral de schema/ACL remoto e default privileges de `service_role`**

Origens: REVISAO 23/09 §1; REVISAO 24/09 (Evidência administrativa); ANEXO_TECNICO T16-26/48.

Só a ACL dos favoritos foi tratada. Não há investigação registrada das default privileges amplas de `service_role`. Ver #3.

**9. Documentação de planos contraditória**

Origem: REVISAO_INDEPENDENTE A12. Persiste, apesar das notas de cabeçalho em P17:
- P13 linha 100 ainda diz "`noUncheckedIndexedAccess` … revertida", mas está ativo.
- P16 mantém checklists `[ ]` em etapas implementadas (por exemplo, linhas 289-292 da Etapa 7).
- P17 linha 500 diz "Fase 3 — ✅ integralmente fechada", embora a Etapa 19 (revisão mensal) siga aberta.

**10. Gates contornáveis/governança de revisão**

Origens: REVISAO_POS_PUBLICACAO P1 (`enforce_admins=false`); AUDITORIA_5 ("proteção não exige revisão humana nem CodeQL").

- CODEOWNERS foi adicionado (`a7f843e`), mas com revisor único (`* @adm01-debug`).
- CodeQL continua fora da lista exigida pelo release (`release.yml:53`: `validate`, `cross-browser`, `Migrations and pgTAP`, Graphify).
- O estado real da proteção não é verificável daqui (a API retornou 403).

**11. Sensibilidade adversarial dos testes de plano SQL**

Origem: REVISAO_POS_PUBLICACAO, experimento inconclusivo.

Só a remoção do índice de histórico foi provada como detectada. Não foi localizado ensaio que remova os índices de retenção, lease ou webhook.

**12. Soak test não representa cron/provedor real**

Origens: REVISAO_INDEPENDENTE (16/09 etapa 38); ANEXO_TECNICO T16-38.

Não foi refeito. Ver #30.

**13. Imagem social institucional para coleções/datas**

Origem: limite de EXECUCAO_FECHAMENTO_TECNICO_20260922.

Persiste em `api/site-page.ts:86`. Ver #36.

**14. Decomposição por linhas**

Origens: REVISAO_INDEPENDENTE (13/09 etapa 48); REVISAO 24/09 (etapa 33).

Não foi corrigida e piorou: `QuotePage` foi de 348 para 467 linhas. Ver #11.

**15. Avaliação de majors ESLint 10 / TS 7 e proteção contra regressão de peers**

Origens: REVISAO_INDEPENDENTE (etapas 7/8 = N); POS_PUBLICACAO.

Nenhuma matriz ou decisão registrada. Dependabot sem `ignore` de majors. Ver #9.

**16. Contratos de tipos na API**

Origens: REVISAO_INDEPENDENTE A11; REVISAO 24/09 (etapa 21).

O frontend está tipado, mas `api/` não usa os tipos gerados. Ver #5.

**17. Evento `erased` e cobertura de texto livre no apagamento**

Origens: REVISAO_POS_PUBLICACAO ("Critérios herdados"); ANEXO_TECNICO T16-32.

Sem decisão nem implementação. Ver #16.

**18. Passagem ao comercial, SLA, relevância julgada, acervo, pesquisa e acessibilidade manual**

Origens: todas as revisões; AUDITORIA_5 ("Limites").

Permanecem dependentes de decisão ou pessoas. Ver #27, #28, #33, #35, #37 e #38.
