# Contexto do projeto para agentes de IA

GERADO AUTOMATICAMENTE por scripts/ai-context/gerar.mjs — não editar à mão; será sobrescrito.
Publicado em `docs/contexto/codigo/` na branch `contexto` (gerada, nunca abra PR dela) a cada push em `main` e a cada 10 minutos pelo workflow `contexto.yml`; índice único das três fontes em `docs/contexto/00-INDEX.md`. Gere local com `node scripts/ai-context/gerar.mjs`. Commit-base: `52aa025eb2d1e31a35a1dc5b11cf11a14a6001c1` (2026-11-11T17:29:41Z).

## Como usar (leia antes de planejar ou executar qualquer tarefa)
1. **Tela/rota/menu** → `rotas.json` (url/vista/menu → arquivo → hooks → tabelas → edges; `rotas_http_backend` para APIs) e `modulos.json` (módulo inteiro + dependências entre módulos).
2. **Hook/serviço/lógica** → `hooks.json`, `logica.json` (quem usa, o que toca, se tem teste).
3. **Edge function** → `edge-functions.json` (verify_jwt, tabelas, env, quem chama, órfãs). **Função serverless por arquivo** (Vercel `api/`) → `rotas.json → rotas_http_backend` (método, rpcs/tabelas/env do fecho e `diretos`, rewrites, cron, quem chama).
4. **Banco** → `banco.json` (colunas, RLS, policies, índices, FKs, triggers, cron jobs, buckets, drift migration×types, uso no código) — visão do código; para o banco vivo use o MCP.
5. **Antes de criar arquivo** → `convencoes.json` (onde ficam as coisas, nomenclatura, alias), `componentes.json` (nomes duplicados, órfãos), `grafo.json` (hubs, ciclos de import) e `grafo-graphify.json` (grafo por AST: comunidades, símbolos mais chamados, comunidade de cada arquivo).
6. **CI/scripts/deploy/env/integrações/permissões/flags** → `ferramentas.json` e `scripts.json`.
7. **Antes de abrir PR** → `testes.json` (o que tem e não tem teste, onde os testes ficam), `baseline.json` (alertas, TODOs, hotspots, últimos commits).
Os JSONs são grandes: filtre com `grep`/`jq` pelo caminho/arquivo/tabela da sua tarefa; não carregue tudo.

## Stack
- linguagens: TypeScript (200), Markdown (115), SQL (101), JavaScript (61), JSON (28), YAML (19), Python (8), CSS (4)
- linguagem_principal: TypeScript
- framework: React
- backend_http: vercel-functions
- bundler: Vite
- roteador: react-router
- banco: Supabase
- testes: vitest, playwright
- ui: n/d
- estado: n/d
- gerenciador_pacotes: npm
- node: 24.15.0
- python: n/d
- deploy: vercel
- monorepo: n/d
- pastas_fonte: src, api, shared

## Números
| item | qtd |
|---|---|
| arquivos_total | 676 |
| arquivos_codigo | 268 |
| linhas_codigo | 52664 |
| rotas | 31 |
| rotas_http_backend | 13 |
| vistas_por_id | 0 |
| itens_menu | 11 |
| modulos | 9 |
| componentes | 40 |
| hooks | 6 |
| edge_functions | 0 |
| tabelas | 22 |
| migrations | 65 |
| cron_jobs | 0 |
| testes | 131 |
| workflows | 15 |
| scripts | 35 |
| docs_md | 115 |

## Onde ficam as coisas
- telas: src/pages (18)
- componentes: src/components (19), src/pages (18), src/context (2)
- hooks: src/lib (4), src/context (2)
- servicos_logica: src/lib (43), api/_lib (13), src/context (3)
- testes: co-localizado (*.test) (51), tests/ (41), outro (9)
- edge_functions: n/d
- migrations: site-supabase/supabase/migrations
- scripts: scripts/maintenance (4), scripts/inventario (3), scripts/regras_negocio (3)
- docs: docs (69), (raiz) (9), .github (1)
- nomenclatura: {"componentes":"PascalCase (100%)","hooks":"use + PascalCase","servicos":"camelCase (87%)","edge_functions":null,"tabelas":"snake_case (95%)"}
- instruções para agentes no repo: AGENTS.md, CLAUDE.md

## Módulos (menu → domínio)
| módulo | itens de menu | telas/rotas | arquivos | hooks locais | edges | tabelas |
|---|---|---|---|---|---|---|
| api | 0 | 13 | 13 | 0 | 0 | 0 |
| api/_lib | 0 | 0 | 13 | 0 | 0 | 0 |
| components | 0 | 0 | 20 | 6 | 0 | 0 |
| context | 0 | 0 | 5 | 2 | 0 | 0 |
| lib | 0 | 0 | 43 | 8 | 0 | 0 |
| pages | 7 | 18 | 18 | 9 | 0 | 0 |

## Rotas (url → arquivo)
- `/` [tela] → src/pages/HomePage.tsx
- `/*` [tela] → src/pages/NotFoundPage.tsx
- `/api/briefing-assets` [api] → api/briefing-assets.ts
- `/api/contact-requests` [api] → api/contact-requests.ts
- `/api/customer-proposals` [api] → api/customer-proposals.ts
- `/api/not-found` [api] → api/not-found.ts
- `/api/notification-events-resend` [api] → api/notification-events-resend.ts
- `/api/notification-events-whatsapp` [api] → api/notification-events-whatsapp.ts
- `/api/notifications` [api] → api/notifications.ts
- `/api/product-page` [api] → api/product-page.ts
- `/api/quote-requests` [api] → api/quote-requests.ts
- `/api/retention` [api] → api/retention.ts
- `/api/shared-selections` [api] → api/shared-selections.ts
- `/api/site-page` [api] → api/site-page.ts
- `/api/sitemap` [api] → api/sitemap.ts
- `/auth/confirm` [tela] → src/pages/AuthConfirmPage.tsx
- `/catalogo` [tela] → src/pages/CatalogPage.tsx
- `/catalogos` [tela] → src/pages/CatalogsPage.tsx
- `/contato` [tela] → src/pages/ContactPage.tsx
- `/datas-comemorativas` [tela] → src/pages/CommemorativeDatesPage.tsx
- `/definir-senha` [tela] → src/pages/SetPasswordPage.tsx
- `/entrar` [tela] → src/pages/CustomerLoginPage.tsx
- `/ideias/:topic` [tela] → src/pages/IdeaLandingPage.tsx
- `/minha-conta` [tela] → src/pages/CustomerAccountPage.tsx
- `/minha-conta/orcamentos/:id` [tela] → src/pages/CustomerQuotePage.tsx
- `/montar-kit` [tela] → src/pages/KitBuilderPage.tsx
- `/orcamento` [tela] → src/pages/QuotePage.tsx
- `/privacidade` [tela] → src/pages/PrivacyPage.tsx
- `/produto/:identifier` [tela] → src/pages/ProductPage.tsx
- `/selecoes/compartilhada` [tela] → src/pages/SharedSelectionPage.tsx
- `/sobre` [tela] → src/pages/AboutPage.tsx

## Rotas HTTP de backend
- `POST /api/briefing-assets` → api/briefing-assets.ts
- `POST /api/contact-requests` → api/contact-requests.ts
- `POST /api/customer-proposals` → api/customer-proposals.ts
- `GET,HEAD /api/not-found` → api/not-found.ts (rewrites: /:path((?!api/|_vercel/|assets/|images/|brand/|sitemap\.xml$|robots\.txt$|favicon\.svg$).*))
- `POST /api/notification-events-resend` → api/notification-events-resend.ts
- `GET,POST /api/notification-events-whatsapp` → api/notification-events-whatsapp.ts
- `GET /api/notifications` → api/notifications.ts (cron */15 * * * *)
- `GET,HEAD /api/product-page` → api/product-page.ts (rewrites: /produto/:identifier)
- `POST /api/quote-requests` → api/quote-requests.ts
- `GET /api/retention` → api/retention.ts (cron 0 3 * * *)
- `POST /api/shared-selections` → api/shared-selections.ts
- `GET,HEAD /api/site-page` → api/site-page.ts (rewrites: /catalogo, /catalogos, /montar-kit, /datas-comemorativas, /orcamento +10)
- `GET,HEAD /api/sitemap` → api/sitemap.ts (rewrites: /sitemap.xml)

## Vistas por id (menu/ViewRouter → arquivo)
- (nenhum)

## Edge functions
- (nenhum)

## Cron jobs (pg_cron / vercel)
- 0 3 * * * /api/retention
- */15 * * * * /api/notifications

## Integrações externas
- SDKs: Supabase, Vercel Analytics
- hosts mais citados: promo-brindes-v1.vercel.app, cliente.sebraees.com.br, www.un.org, api.resend.com, br.pinterest.com, doufsxqlfjyuvxuezpln.supabase.co, facebook.com, graph.facebook.com, instagram.com, promo-brindes.invalid, vercel.com, www.sitemaps.org, youtube.com
- webhooks recebidos: GET,POST /api/notification-events-whatsapp, POST /api/notification-events-resend
- env de integração (só nomes): CRON_SECRET, OPERATIONS_ALERT_WEBHOOK_TOKEN, OPERATIONS_ALERT_WEBHOOK_URL, RESEND_API_KEY, RESEND_WEBHOOK_SECRET, SITE_SUPABASE_SECRET_KEY, WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_GRAPH_API_VERSION, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_QUOTE_TEMPLATE, WHATSAPP_WEBHOOK_VERIFY_TOKEN

## Permissões / papéis
- papéis no código: anon (4)
- enums de papel: nenhum
- guards: nenhum · rotas protegidas: 0 · públicas: /, /*, /auth/confirm, /catalogo, /catalogos, /contato, /datas-comemorativas, /definir-senha, /entrar, /ideias/:topic, /minha-conta, /minha-conta/orcamentos/:id, /montar-kit, /orcamento, /privacidade, /produto/:identifier, /selecoes/compartilhada, /sobre
- feature flags: CUSTOMER_ADJUSTMENTS_ENABLED, PERSISTENT_SHARED_SELECTIONS_ENABLED, QUOTE_DECISION_GROUPS_ENABLED

## Alertas (baseline.json → alertas)
- rotas_sem_arquivo: 0
- componentes_ambiguos: 0
- menu_sem_destino: 0
- edges_orfas: 0
- edges_chamadas_sem_pasta: 0
- tabelas_sem_rls: 0
- tabelas_usadas_sem_definicao: 0
- tabelas_com_drift_migration_vs_types: 0
- rpcs_sem_definicao: 0
- componentes_orfaos: 0
- componentes_com_nome_duplicado: 0
- scripts_orfaos: 0
- env_usadas_nao_declaradas: 3 — ex.: CATALOG_SUPABASE_PUBLISHABLE_KEY, SITE_TEST_APP_SHELL, VITE_SITE_DEPLOYMENT_ENV
- ciclos_de_import: 1
- possiveis_segredos_no_codigo: 0

## Grafo de código (graphify)
- não gerado neste run. npm run graph:update (wrapper do repositório; não rode o CLI do graphify direto); saída em graphify-out/, não versionada

## Hotspots (arquivos mais alterados, 90 dias)
- package.json (58)
- e2e/smoke.spec.ts (53)
- src/styles.css (33)
- package-lock.json (31)
- vercel.json (24)
- src/components/Layout.tsx (22)
- src/pages/QuotePage.tsx (22)
- .github/workflows/quality.yml (21)
- site-supabase/supabase/tests/database/lead_storage.test.sql (21)
- docs/DATABASE_DICTIONARY.md (20)
- tests/api/lead-requests.test.ts (19)
- .github/workflows/release.yml (18)
- src/App.tsx (17)
- .github/workflows/database.yml (16)
- api/_lib/siteDatabase.ts (16)

## Workflows
- `automation-local.yml` — Automação local (pull_request, push, workflow_dispatch)
- `catalog-contract.yml` — Canonical catalog public contract (schedule, workflow_dispatch; cron 30 7 * * *)
- `ci-health.yml` — CI health report (schedule, workflow_dispatch; cron 0 6 * * *)
- `codeql.yml` — CodeQL security (pull_request, push, schedule; cron 23 4 * * 1)
- `contexto.yml` — Contexto para agentes de IA (10 min) (push, schedule, workflow_dispatch; cron 7-57/10 * * * *)
- `database.yml` — Isolated site database (pull_request, push)
- `dependency-review.yml` — Dependency review (pull_request)
- `graphify.yml` — Graphify structural map (pull_request, push)
- `inventario-estado-semanal.yml` — Inventário do estado real (semanal) (schedule, workflow_dispatch; cron 23 10 * * 1)
- `production-drift.yml` — Production drift detector (schedule, workflow_dispatch; cron 0 7 * * *)
- `quality.yml` — Quality gate (pull_request, push)
- `release.yml` — Release isolated database then Vercel (push, workflow_dispatch)
- `secrets-rotation-reminder.yml` — Secrets rotation reminder (schedule, workflow_dispatch; cron 0 9 1 1,4,7,10 *)
- `stale-branches.yml` — Stale branch cleanup (schedule, workflow_dispatch; cron 0 8 * * 1)
- `workflows-lint.yml` — Workflow lint (pull_request)

## Scripts npm
- `maintenance:doctor`: `sh scripts/maintenance/run.sh doctor --root .`
- `maintenance:check`: `sh scripts/maintenance/run.sh check --root . --ref origin/main`
- `maintenance:heal`: `sh scripts/maintenance/run.sh heal --root . --ref origin/main`
- `test:maintenance`: `node --test scripts/maintenance/maintenance.unit.mjs`
- `dev`: `vite`
- `lint`: `eslint .`
- `build`: `tsc -b && vite build && node scripts/stage-app-shell.mjs`
- `check:performance-budget`: `node scripts/check-performance-budget.mjs`
- `smoke:deployment`: `node scripts/smoke-deployment.mjs`
- `preview`: `vite preview`
- `typecheck`: `tsc -b --pretty false`
- `test`: `vitest run`
- `test:coverage`: `vitest run --coverage`
- `test:watch`: `vitest`
- `test:e2e`: `playwright test --project=desktop-chromium --project=mobile-chromium`
- `test:e2e:cross-browser`: `playwright test --project=desktop-firefox --project=desktop-webkit --workers=1`
- `check`: `npm run lint && npm run typecheck && npm run test && npm run agents:instructions:check && npm run test:agent-instructions && npm run test:migration-names && npm run test:error-catalog && npm run test:site-api-jwt && npm run test:timing-safe-secrets && npm run test:supabase-db-query && npm run test:ci-health && npm run test:release-url && npm run test:smoke-deployment && npm run test:stage-app-shell && npm run test:performance-budget && npm run test:site-guard && npm run test:database-docs && npm run test:soak-queue && npm run test:shared-selection-sql && npm run test:catalog-contract && npm run test:inventario && npm run contexto:test && npm run build && npm run check:performance-budget && npm run test:e2e`
- `db:migration-names:check`: `node scripts/validate-migration-names.mjs`
- `test:migration-names`: `node --test tests/validate-migration-names.node.mjs`
- `db:site:error-catalog:check`: `node scripts/validate-error-catalog.mjs`
- `test:error-catalog`: `node --test tests/validate-error-catalog.node.mjs`
- `test:site-api-jwt`: `node --test tests/generate-site-api-jwt.node.mjs`
- `test:timing-safe-secrets`: `node --test tests/timing-safe-secret-comparisons.node.mjs`
- `test:supabase-db-query`: `node --test tests/supabase-db-query.node.mjs`
- `test:ci-health`: `node --test tests/ci-health-metrics.node.mjs`
- `test:release-url`: `node --test tests/normalize-vercel-deployment-url.node.mjs`
- `test:smoke-deployment`: `node --test tests/smoke-deployment.node.mjs`
- `test:stage-app-shell`: `node --test tests/stage-app-shell.node.mjs`
- `test:performance-budget`: `node --test tests/check-performance-budget.node.mjs`
- `test:site-guard`: `node --test tests/validate-site-supabase-target.node.mjs`
- `test:database-docs`: `node --test tests/generate-database-docs.node.mjs`
- `test:soak-queue`: `node --test tests/soak-test-notification-queue.node.mjs`
- `test:shared-selection-sql`: `node --test tests/verify-shared-selection-contract.node.mjs`
- `test:catalog-contract`: `node --test tests/catalog-public-contract.node.mjs`
- `check:catalog-contract`: `node scripts/check-catalog-public-contract.mjs`
- `agents:instructions:check`: `node scripts/validate-agent-instructions.mjs`
- `test:agent-instructions`: `node --test tests/validate-agent-instructions.node.mjs`
- `db:site:generate-site-api-jwt`: `node scripts/generate-site-api-jwt.mjs`
- `db:site:dictionary`: `node scripts/generate-database-dictionary.mjs`
- `db:site:schema-doc`: `node scripts/generate-database-schema-doc.mjs`
- `test:queue-concurrency`: `node --test tests/queue-concurrency.node.mjs`
- `db:site:soak-test`: `node scripts/soak-test-notification-queue.mjs`
- `db:site:guard`: `node scripts/validate-site-supabase-target.mjs`
- `db:site:reset`: `SUPABASE_WORKDIR=site-supabase supabase db reset`
- `db:site:dry-run`: `npm run db:site:guard && SUPABASE_WORKDIR=site-supabase npx supabase@latest db push --dry-run`
- `db:site:test`: `SUPABASE_WORKDIR=site-supabase supabase test db`
- `db:site:lint`: `SUPABASE_WORKDIR=site-supabase supabase db lint --local --level warning --fail-on warning`
- `db:site:types`: `SUPABASE_WORKDIR=site-supabase supabase gen types typescript --local --schema public,site_private > src/types/site-database.types.ts`
- `db:site:stop`: `SUPABASE_WORKDIR=site-supabase supabase stop`
- `ledger:check`: `node scripts/validate-closure-ledger.mjs && node --test tests/closure-ledger.node.mjs`
- `graph:doctor`: `node scripts/graphify.mjs doctor`
- `graph:build`: `node scripts/graphify.mjs build`
- `graph:update`: `node scripts/graphify.mjs update`
- `graph:status`: `node scripts/graphify.mjs status`
- `graph:check`: `node scripts/graphify.mjs check`
- `graph:query`: `node scripts/graphify.mjs query`
- `graph:path`: `node scripts/graphify.mjs path`
- `graph:explain`: `node scripts/graphify.mjs explain`
- `graph:impact`: `node scripts/graphify.mjs impact`
- `graph:tree`: `node scripts/graphify.mjs tree`
- `graph:db:query`: `node scripts/graphify.mjs db-query`
- `graph:db:path`: `node scripts/graphify.mjs db-path`
- `graph:db:explain`: `node scripts/graphify.mjs db-explain`
- `graph:db:tree`: `node scripts/graphify.mjs db-tree`
- `graph:benchmark`: `node scripts/graphify.mjs benchmark`
- `graph:compare`: `node scripts/graphify.mjs compare`
- `test:graphify`: `node --test tests/graphify-tools.node.mjs`
- `contexto:ia`: `node scripts/ai-context/gerar.mjs --out docs/contexto/codigo`
- `contexto:ia:test`: `node --test scripts/ai-context/gerar.unit.mjs`
- `contexto:ia:cenarios`: `node scripts/ai-context/cenarios.mjs`
- `contexto:regras`: `python3 scripts/regras_negocio/generate.py --repo . --out docs/contexto/regras --profile regras --schema-snapshot docs/contexto/supabase --index-path docs/contexto/00-INDEX.md --no-pointer && python3 scripts/regras_negocio/indice.py --repo . --out docs/contexto/00-INDEX.md --remote adm01-debug/Promo_Brindes_V1 --fonte "banco real=docs/contexto/supabase" --fonte "código=docs/contexto/codigo" --fonte "regras de negócio=docs/contexto/regras"`
- `contexto:regras:test`: `python3 scripts/regras_negocio/test_generate.py`
- `contexto:banco:test`: `python3 scripts/supabase_snapshot/test_snapshot.py`
- `contexto:test`: `npm run contexto:ia:test && npm run contexto:regras:test && npm run contexto:banco:test`
- `inventario:banco`: `node scripts/inventario/gerar-banco.mjs`
- `inventario:mudou`: `node scripts/inventario/mudou-conteudo.mjs`
- `test:inventario`: `node --test tests/inventario-estado.node.mjs`
- `automation:doctor`: `node scripts/automation.mjs doctor`
- `automation:test`: `node scripts/automation.mjs test`
- `automation:check`: `node scripts/automation.mjs check --ref HEAD`
- `automation:heal`: `node scripts/automation.mjs heal --ref origin/main`
- `automation:nightly`: `node scripts/automation.mjs nightly --ref origin/main`
- `automation:graph`: `node scripts/automation.mjs graph`
- `automation:status`: `node scripts/automation.mjs graph status`
- `automation:install-hooks`: `node scripts/automation.mjs install-hooks`
- `automation:uninstall-hooks`: `node scripts/automation.mjs uninstall-hooks`
- `test:inventario:banco-sql`: `node --test tests/inventario-banco-sql.node.mjs`

## Documentos (raiz e docs/)
- `.github/pull_request_template.md` (20 linhas)
- `AGENTS.md` — AGENTS.md — Promo_Brindes_V1 (79 linhas)
- `AUDITORIA.md` — Auditoria técnica — Promo Brindes V1 (343 linhas)
- `CLAUDE.md` (2 linhas)
- `PENDENCIAS.md` — Pendências de integração — Promo Brindes V1 (24 linhas)
- `PLANO_100.md` — Plano de correções — Promo Brindes V1 (254 linhas)
- `README.md` — Site Promo Brindes (26 linhas)
- `RELATORIO_CI.md` — Relatório de CI — Promo Brindes V1 (140 linhas)
- `THIRD_PARTY_NOTICES.md` — Créditos de terceiros (14 linhas)
- `UX_AUDIT_REPORT.md` — Auditoria total de design, layout e UX (409 linhas)
- `docs/AUDITORIA_5_ESPECIALISTAS_20260922.md` — Auditoria técnica dos cinco especialistas — 22/09/2026 (65 linhas)
- `docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md` — Auditoria de funcionalidades planejadas e não executadas — 11/10/2026 (364 linhas)
- `docs/AUDIT_REPORT_20260908.md` — Auditoria técnica consolidada — 08–09/09/2026 (75 linhas)
- `docs/AUTOMACAO_LOCAL.md` — Automação local — Promo_Brindes_V1 (104 linhas)
- `docs/CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md` — Área do Cliente — implementação e critérios de aceite (91 linhas)
- `docs/DATABASE_DICTIONARY.md` — Dicionário de dados — site_private (Etapa 35) (391 linhas)
- `docs/DATABASE_FUNCTION_CONTRACTS.md` — Contratos das funções do banco do site (Etapas 22 e 23) (236 linhas)
- `docs/DATABASE_INVENTORY_PRINCIPAL.md` — Inventário de tabelas — banco principal (`doufsxqlfjyuvxuezpln`) (415 linhas)
- `docs/DATABASE_PUBLIC_CONTRACT.md` — Contrato público de dados do Site Promo Brindes (82 linhas)
- `docs/DATABASE_SCHEMA.md` — Diagrama entidade-relacionamento — site_private (Etapa 48) (48 linhas)
- `docs/EXECUCAO_COMPLEMENTAR_20260922.md` — Execução complementar e correção das evidências — 22/09/2026 (50 linhas)
- `docs/EXECUCAO_CORRECOES_20260912.md` — Execução das correções prioritárias — 12/09/2026 (68 linhas)
- `docs/EXECUCAO_FECHAMENTO_TECNICO_20260922.md` — Fechamento das lacunas técnicas priorizadas — 22/09/2026 (54 linhas)
- `docs/EXECUCAO_LOTE_FAVORITOS_20260924.md` — Execução — lote de favoritos — 24/09/2026 (60 linhas)
- `docs/EXECUCAO_PLANO_FECHAMENTO_20261001.md` — Execução controlada do plano de fechamento — 01/10/2026 (81 linhas)
- `docs/EXECUCAO_UX_20260910.md` — Execução UX — 10 de setembro de 2026 (55 linhas)
- `docs/EXECUCAO_VALIDACOES_UX_EDITORIAL_20260922.md` — Fechamento de navegação, impressão e governança editorial — 22/09/2026 (48 linhas)
- `docs/FREESHOP_BENCHMARK_20260909.md` — Benchmark estratégico — Free Shop × Promo Brindes (322 linhas)
- `docs/GEN_Z_RESEARCH.md` — Pesquisa de audiência — Geração Z no marketing B2B (180 linhas)
- `docs/GOVERNANCA_FECHAMENTO.md` — Governança do fechamento técnico (35 linhas)
- `docs/GRAPHIFY.md` — Graphify no Promo Brindes (88 linhas)
- `docs/GRAPHIFY_0968_EVALUATION_20261005.md` — Avaliação isolada do Graphify 0.9.68 (65 linhas)
- `docs/GRAPHIFY_0994_EVALUATION_20261027.md` — Avaliação isolada do Graphify 0.9.94 — 27/10/2026 (21 linhas)
- `docs/GRAPHIFY_IMPLEMENTATION_20260911.md` — Execução da integração Graphify — 11/09/2026 (32 linhas)
- `docs/GUIA_DE_VOZ.md` — Guia de voz da Promo Brindes (43 linhas)
- `docs/LUKKA_BENCHMARK_PLANO_50_ETAPAS_20260909.md` — Promo Brindes: análise da Lukka e plano de melhorias em 50 etapas (335 linhas)
- `docs/MATRIZ_INDEX.md` — Índice de planos e aceites (59 linhas)
- `docs/PLANO_CARNEGIE_UX_100_ETAPAS_20261005.md` — Plano em 100 etapas para aplicar os princípios de Carnegie à experiência da Promo Brindes (832 linhas)
- `docs/PLANO_CORRECOES_50_ETAPAS_20260913.md` — Plano de melhorias e correções — 50 etapas — 13/09/2026 (770 linhas)
- `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md` — Plano de correções e melhorias — 50 etapas (banco de dados, integração e governança) (1518 linhas)
- `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md` — Plano de correções e melhorias — 50 etapas (fase seguinte) (1291 linhas)
- `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260924.md` — Plano de melhorias e correções — 50 etapas — 24/09/2026 (505 linhas)
- `docs/PLANO_FECHAMENTO_100_ETAPAS_20261001.md` — Plano de fechamento da implantação em 100 etapas (981 linhas)
- `docs/PLANO_GRAPHIFY_50_ETAPAS_20260911.md` — Plano de integração Graphify — Promo_Brindes_V1 (286 linhas)
- `docs/PLANO_MELHORIAS_CORRECOES_50_ETAPAS_20260923.md` — Plano de melhorias e correções — 50 etapas — 23/09/2026 (604 linhas)
- `docs/PLANO_UX_100_ETAPAS_20260909.md` — Promo Brindes — plano de evolução da experiência em 100 etapas (757 linhas)
- `docs/PLANO_WORKFLOWS_100_ETAPAS_20260927.md` — Plano de correções e melhorias — GitHub Actions (100 etapas) (505 linhas)
- `docs/REACT_BITS_MOTION_AUDIT.md` — Auditoria de movimento — React Bits para Promo Brindes (97 linhas)
- `docs/RELATORIO_EXPERIENCIA_MARKETING_GEN_Z_20260909.md` — Promo Brindes — experiência de uma pessoa de marketing (514 linhas)
- `docs/RELATORIO_SOAK_TEST_FILA_20260916.md` — Relatório do soak test da fila de notificações (Etapa 38) (46 linhas)
- `docs/REVISAO_50_ETAPAS_20260928.md` — Revisão das 50 etapas de 24/09 — posição em 28/09/2026 (116 linhas)
- `docs/REVISAO_FECHAMENTO_PLANOS_20260912.md` — Revisão de fechamento dos planos — 12/09/2026 (231 linhas)
- `docs/REVISAO_IMPLEMENTACAO_ATUAL_20260911.md` — Revisão de completude — estado atual do Promo Brindes (286 linhas)
- `docs/REVISAO_IMPLEMENTACAO_ATUAL_20260912.md` — Revisão de implementação — Promo Brindes — 12/09/2026 (264 linhas)
- `docs/REVISAO_INDEPENDENTE_PLANOS_20260922.md` — Revisão independente dos planos — 22/09/2026 (542 linhas)
- `docs/REVISAO_INTEGRAL_PLANOS_20260911.md` — Revisão integral de implementação — Promo Brindes (566 linhas)
- `docs/REVISAO_PLANOS_20260923.md` — Revisão dos planos — Promo Brindes — 23/09/2026 (233 linhas)
- `docs/REVISAO_PLANOS_20260923_ANEXO_PRODUTO.md` — Anexo — revisão das 230 referências de produto (269 linhas)
- `docs/REVISAO_PLANOS_20260923_ANEXO_TECNICO.md` — Anexo — revisão das 150 referências dos planos técnicos (185 linhas)
- `docs/REVISAO_PLANOS_20260924.md` — Revisão dos planos — 24/09/2026 (215 linhas)
- `docs/REVISAO_PLANOS_20260928.md` — Revisão dos planos — 28/09/2026 (236 linhas)
- `docs/REVISAO_POS_MIGRATIONS_20260912.md` — Revisão dos planos — após reconciliação das migrations (290 linhas)
- `docs/REVISAO_POS_PUBLICACAO_PLANOS_20260922.md` — Revisão dos planos após publicação — 22/09/2026 (241 linhas)
- `docs/REVISAO_PRODUTO_230_20260928.md` — Rastreabilidade das 230 referências de produto — revisão 28/09/2026 (241 linhas)
- `docs/REVISAO_WORKFLOWS_100_20260928.md` — Revisão das 100 etapas de workflows — 28/09/2026 (111 linhas)
- `docs/RUNBOOK_BANCO_PRINCIPAL.md` — Runbook — banco principal (`doufsxqlfjyuvxuezpln`) (79 linhas)
- `docs/RUNBOOK_INCIDENTES.md` — Runbooks de incidente (Etapa 49) (123 linhas)
- `docs/RUNBOOK_PEDIDO_TITULAR.md` — Runbook — pedido de apagamento do titular (LGPD art. 18, Etapa 32) (87 linhas)
- `docs/RUNBOOK_PREVIEW_ISOLADO.md` — Preview isolado do Site Promo Brindes (19 linhas)
- `docs/RUNBOOK_RECONCILIACAO_LEDGER.md` — Runbook — reconciliação do ledger de migrations (Etapa 1 / Etapa 49) (70 linhas)
- `docs/RUNBOOK_RELEASE.md` — Runbook — release banco isolado → aplicação → smoke (39 linhas)
- `docs/RUNBOOK_RESTORE_SITE.md` — Ensaio de recuperação — banco isolado do Site Promo Brindes (20 linhas)
- `docs/RUNBOOK_REVISAO_MENSAL_BANCO.md` — Runbook — revisão mensal do banco do site (Etapa 18) (73 linhas)
- `docs/RUNBOOK_ROTACAO_SEGREDOS.md` — Runbook — rotação de segredos (Etapa 29) (49 linhas)
- `docs/RUNBOOK_SITE_API_CUTOVER.md` — Runbook — cutover para a role `site_api` (Etapa 25) (101 linhas)
- `docs/RUNBOOK_VERIFICACAO_DB.md` — Runbook — verificação em 5 comandos do banco isolado do site (Etapa 6) (124 linhas)
- `docs/SITE_SUPABASE_IMPLEMENTATION_REPORT_20260908.md` — Relatório de implementação — Supabase exclusivo do site (67 linhas)
- `docs/SITE_SUPABASE_SETUP.md` — Supabase exclusivo do Site Promo Brindes (117 linhas)
- `docs/UX_STRATEGY.md` — Estratégia de experiência — Site Promo Brindes (154 linhas)
- subpastas de docs/: docs/audits (13), docs/agentes (9), docs/contexto (2)


## Últimos commits
- 2026-11-11 `52aa025` chore(automacao): conecta testes, grafo e manutenção aos gatilhos (#131)
- 2026-11-10 `49fc2af` docs: corrige fatos da analise analise-prs para o main d312cad (#132)
- 2026-11-10 `d312cad` docs: análise complementar analise-prs (#112)
- 2026-11-10 `432582a` chore(deps): bump jsdom from 30.1.3 to 31.0.0 (#128)
- 2026-11-10 `223e655` fix: endurece e cobre com testes todos os scripts do repositório (#130)
- 2026-11-10 `860a0a0` infra: liga a comparação real do guard de instruções no CI (#121)
- 2026-11-10 `af5cfd1` chore(deps): bump the actions-minor-and-patch group with 2 updates (#125)
- 2026-11-09 `7eb1b5d` chore(deps): bump graphifyy para 0.9.97 com o companheiro casado (#123)
- 2026-11-09 `713ebe4` feat(scripts): porta scripts autônomos de contexto de IA do Zapp Web V2
- 2026-11-09 `d44baf5` security: guard falha fechado, sem injeção de arg e regex de backtick (#124)
- 2026-11-08 `3c3cc11` chore: iguala a forma do AGENTS.md à do Zapp Web V2 (#120)
- 2026-11-08 `75ba0fa` chore: replica o padrão de instruções para agentes do Zapp Web V2 (#119)
- 2026-11-07 `cae3b2e` fix: correções da revisão de fidelidade (instruções) (#118)
- 2026-11-07 `e676bb3` chore(deps): bump the npm-minor-and-patch group with 4 updates (#114)
- 2026-11-07 `ae62613` chore: instruções enxutas para agentes (AGENTS.md único, CLAUDE.md importa) (#117)

## Arquivos deste diretório
- `docs/contexto/codigo/rotas.json`
- `docs/contexto/codigo/modulos.json`
- `docs/contexto/codigo/componentes.json`
- `docs/contexto/codigo/hooks.json`
- `docs/contexto/codigo/edge-functions.json`
- `docs/contexto/codigo/banco.json`
- `docs/contexto/codigo/ferramentas.json`
- `docs/contexto/codigo/scripts.json`
- `docs/contexto/codigo/testes.json`
- `docs/contexto/codigo/logica.json`
- `docs/contexto/codigo/grafo.json`
- `docs/contexto/codigo/grafo-arestas.json`
- `docs/contexto/codigo/convencoes.json`
- `docs/contexto/codigo/grafo-graphify.json`
- `docs/contexto/codigo/baseline.json`
- `docs/contexto/codigo/manifest.json` (commit, data, hashes, erros — único arquivo com data/hora)
