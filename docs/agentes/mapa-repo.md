# Mapa do repositório — referência para agentes

Ler quando precisar saber onde fica algo antes de buscar por texto.

## Onde olhar primeiro

| Precisa de | Leia |
|---|---|
| O que o site é e não é (sem preço, sem pedido), como rodar local | `README.md` |
| Estado dos requisitos dos planos (ledger único) | `docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv` + regras em `docs/GOVERNANCA_FECHAMENTO.md` (`npm run ledger:check`) |
| Pendências externas (conta, limite de serviço, homologação) | `PENDENCIAS.md` |
| Histórico de CI vermelha e causa de cada falha | `RELATORIO_CI.md` |
| Qual banco, migration, GitHub/CI, Vercel | `AGENTS.md` + `docs/agentes/*.md` (`banco.md`, `github-ci.md`, `vercel-deploy.md`) |
| Regra visual antes de mexer em design | `docs/agentes/aprovacao-visual-design.md` |
| Procedimento de operação (release, restore, incidente, rotação, ledger) | `docs/RUNBOOK_*.md` |
| Estrutura real do banco do site e do catálogo | `docs/DATABASE_DICTIONARY.md`, `docs/DATABASE_SCHEMA.md` (gerados), `docs/DATABASE_PUBLIC_CONTRACT.md`, `docs/DATABASE_INVENTORY_PRINCIPAL.md` |
| Índice de planos e auditorias | `docs/MATRIZ_INDEX.md` |
| Planos, auditorias, benchmarks e revisões antigas | `docs/PLANO_*`, `docs/REVISAO_*`, `docs/AUDITORIA*`, `AUDITORIA.md`, `PLANO_100.md`, `UX_AUDIT_REPORT.md`, `analise-prs/` — contexto, **não** fonte de verdade |

## Mapa rápido

| Onde | O que tem |
|---|---|
| `src/` | front React 19 + Vite: `pages/` (uma tela por arquivo `PascalCase.tsx`), `components/`, `context/`, `lib/` (regras de catálogo, kit, briefing, cliente, analytics — teste ao lado em `*.test.ts`), `types/` (inclui `site-database.types.ts`, gerado), `styles.css` |
| `api/` | funções serverless da Vercel, uma por rota (`quote-requests.ts`, `notifications.ts`, `product-page.ts`, `site-page.ts`, `shared-selections.ts`, `sitemap.ts`, `retention.ts`…); helpers em `api/_lib/` (`siteDatabase.ts`, `leadHandler.ts`, `webhookSignature.ts`, `pageShell.ts`…). **Não existe Supabase Edge Function neste projeto.** |
| `shared/` | código usado pelo front e pelas funções (`campaignYears.ts`, `catalogEditorial.ts`) |
| `site-supabase/supabase/` | banco isolado do site: `migrations/*.sql` (65 arquivos), `tests/database/*.test.sql` (28 testes pgTAP), `config.toml` |
| `scripts/` | validadores e geradores em Node, chamados por `npm run` (`validate-*.mjs`, `generate-*.mjs`, `smoke-deployment.mjs`, `graphify.mjs`, `graphify-quality.mjs`); SQL de apoio em `scripts/sql/`, helpers em `scripts/_lib/` |
| `tests/` | guardas `node --test` (`tests/*.node.mjs`) e testes das funções serverless (`tests/api/*.test.ts`, Vitest); fixtures em `tests/fixtures/` |
| `e2e/` | specs Playwright (`smoke.spec.ts`, `product-detail.spec.ts`); projetos e viewports em `playwright.config.ts` |
| `docs/` | runbooks, dicionários de banco, planos, auditorias, mockups e `agentes/` (esta pasta) |
| `docs/sql/` | SQL de referência: `canonical/` (contrato público aplicado no banco canônico) e `canonical-principal/` (pendências de hardening no banco canônico — não aplicar sem o dono) |
| `.github/` | 12 workflows, `CODEOWNERS`, `dependabot.yml`, `pull_request_template.md`, `ISSUE_TEMPLATE/` |
| `graphify-out/`, `.graphify-work/` | grafo de código gerado — ignorados pelo Git, cada clone gera o seu |

## Comandos

O repo usa **npm** (`package-lock.json`, `npm ci`), Node 24.15.0 e npm 11.17.0 (`.nvmrc`, `engines`).

- `npm run dev` · `lint` · `typecheck` · `test` · `test:e2e` · `build`;
- `npm run check` é o gate completo que o `quality.yml` roda: lint, typecheck, Vitest, os guardas
  `node --test` (nomes de migration, catálogo de erros, JWT do site, comparação de segredos,
  `supabaseDbQuery`, saúde de CI, URL de release, contrato do catálogo), build e E2E;
- só o que você tocou: `npx vitest run <caminho>` · `node --test tests/<arquivo>.node.mjs` ·
  `npx eslint <arquivos>`;
- banco do site: `npm run db:site:guard` → `db:site:dry-run` → push (ver `docs/agentes/banco.md`);
- grafo: `npm run graph:status` → `graph:query -- "<pergunta>"` (ver abaixo).

## Grafo de código (graphify) — detalhes

Wrapper obrigatório: `scripts/graphify.mjs`, exposto como `npm run graph:*`. Ele valida a raiz
(`package.json` + `.graphify.project.json` com `project: Promo_Brindes_V1`), separa o corpus de código do
corpus de banco, roda extração local (sem IA, sem rede, sem Supabase) e grava em `graphify-out/`.
**Não chame `graphify update .` direto** — fura as travas do projeto (regra em
`docs/agentes/graphify-regras-agentes.md`; runbook em `docs/GRAPHIFY.md`).

- Versão do CLI fixada em `requirements-graphify.txt` (`graphifyy[sql]` + `tree_sitter_sql`) e repetida em
  `graphifyVersion` de `.graphify.project.json` — `npm run graph:doctor` falha se o binário divergir.
  Ao bumpar uma, bumpe a outra no mesmo PR.
- `graphify-out/` é gerado e ignorado (~4,4 MB no commit atual, código + banco). Frescura: `npm run graph:status` (ou `graph:check`, que
  falha quando está defasado); reconstrução atômica: `npm run graph:update`.
- Perguntas de banco (migrations e pgTAP) usam o corpus separado: `npm run graph:db:query -- "<pergunta>"`.
- Em sessão de nuvem, `.claude/hooks/session-start.sh` instala o CLI fixado, roda `npm ci` se faltar
  `node_modules`, e gera o grafo em segundo plano (log em `graphify-out/.session-start.log`; pula se o
  grafo já é do commit atual). Os hooks `PreToolUse` em `.claude/settings.json` chamam
  `graphify hook-guard` e não fazem nada onde o CLI não estiver instalado.
