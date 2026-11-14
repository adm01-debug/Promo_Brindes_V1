# Prod Readiness — Promo_Brindes_V1

**Main final verificado:** `8a810bd` (squash-merge da PR #137)
**Data da execução:** 13-14/11/2026
**Base de regressão:** main `7347bd4` (pré-merge), `npm run check` exit 0 (123 passed / 5 skipped condicionais).

## Inventário (item 1) — linha de base de funcionalidades

### Rotas front (18) — `src/App.tsx:110-127`
| Rota | Componente | Status |
|---|---|---|
| `/` | HomePage | OK |
| `/catalogo` | CatalogPage | OK |
| `/catalogos` | CatalogsPage | OK |
| `/montar-kit` | KitBuilderPage | OK |
| `/datas-comemorativas` | CommemorativeDatesPage | OK |
| `/produto/:identifier` | ProductPage | OK |
| `/orcamento` | QuotePage | OK |
| `/selecoes/compartilhada` | SharedSelectionPage | OK |
| `/ideias/:topic` | IdeaLandingPage | OK |
| `/sobre` | AboutPage | OK |
| `/contato` | ContactPage | OK |
| `/privacidade` | PrivacyPage | OK |
| `/entrar` | CustomerLoginPage | OK |
| `/auth/confirm` | AuthConfirmPage | OK |
| `/definir-senha` | SetPasswordPage | OK |
| `/minha-conta` | CustomerAccountPage | OK |
| `/minha-conta/orcamentos/:id` | CustomerQuotePage | OK |
| `*` | NotFoundPage | OK |

### Edge functions (14) — `api/*.ts`, registradas em `vercel.json:functions`
briefing-assets, commercial-alerts, contact-requests, customer-proposals, not-found, notification-events-resend, notification-events-whatsapp, notifications, product-page, quote-requests, retention, shared-selections, site-page, sitemap. Todas com handler exportado.
Status: **OK** (registradas em `functions` + rewrites no `vercel.json`).

### Rotas/rewrites e crons — `vercel.json`
Rewrites: sitemap.xml, /→site-page, /catalogo, /catalogos, /montar-kit, /datas-comemorativas, /produto/:identifier, /orcamento, /selecoes/compartilhada, /ideias/:topic, /sobre, /contato, /privacidade (site-page), + fallback `api/not-found`.
Crons: `/api/retention` (0 3 * * *), `/api/notifications` (*/15), `/api/commercial-alerts` (*/5).
Status: **OK**.

### Workflows (15) — `.github/workflows`
automation-local, catalog-contract, ci-health, codeql, contexto, database, dependency-review, graphify, inventario-estado-semanal, production-drift, quality, release, secrets-rotation-reminder, stale-branches, workflows-lint.

**Auditoria item 4** (última execução por workflow no main `8a810bd`, após o merge da PR #137):
| Workflow | Última execução | Status |
|---|---|---|
| Quality gate | push 8a810bd | SUCCESS ✅ |
| Release isolated database then Vercel | push 8a810bd | SUCCESS ✅ |
| CodeQL security | push 8a810bd | SUCCESS ✅ |
| Automação local | push 8a810bd | SUCCESS ✅ |
| Graphify structural map | push 8a810bd | SUCCESS ✅ |
| Isolated site database | push 8a810bd | SUCCESS ✅ |
| Canonical catalog public contract | schedule 8a810bd | **FAILURE** (BLOQUEADO — ver item 9) |

Observação: os demais workflows (ci-health, dependency-review, database, contexto, inventario-estado-semanal, production-drift, secrets-rotation-reminder, stale-branches, workflows-lint) são disparados por schedule/push de dependências/PR; o merge `8a810bd` só dispara os 6 de push acima (todos verdes). O `Canonical catalog public contract` (schedule) está vermelho no main atual — ver BLOQUEADO.

### Banco (item 6)
- 66 migrations em `site-supabase/supabase/migrations`.
- 21 tabelas `site_private` — **todas** com `enable row level security` (verificado arquivo a arquivo).
- **Zero grants diretos a anon/authenticated** em tabelas (acesso só via RPC `security definer` + roles `site_api`/`service_role`).
Status: **OK (estático)**. Auditoria ao vivo: **BLOQUEADO** — keys `sb_secret_/sb_publishable_` só alcançam a Auth API (GoTrue health 200); PostgREST e pg/query retornam 401/404. Requer `SUPABASE_ACCESS_TOKEN` ou JWT service_role legado.

## Qualidade (item 3)
- `npm run check` (lint+typecheck+build+testes) no branch da PR #137: **exit 0, 123 passed / 5 skipped** (skips condicionais por projeto mobile/chromium — legítimos, não removidos).
- Sem remoção/afrouxamento de teste: total estável em relação ao baseline.
- O Quality gate do merge `8a810bd` também passou (SUCCESS), confirmando que o main final fecha verde.

## Sem meio-termo (item 5)
Varredura em `src/` e `api/`: zero `TODO`/`FIXME`/`WIP`, zero `export default {}`, sem mocks/handlers vazios. Os dois `return {}` encontrados são fallback/validação legítimos (`src/lib/http.ts:88` catch do JSON parse; `api/notification-events-whatsapp.ts:36` validação de payload).
Status: **OK**.

## Produção (item 7)
- `https://www.promobrindes.com.br/` responsivo: **HTTP 200** (HTML ~564KB).
- Deploy Vercel do merge `8a810bd`: **READY** (13/11 20:13 UTC).
- Fluxo orçamento→alerta→comercial (#116): **BLOQUEADO** — requer env vars `COMMERCIAL_TEAM_WEBHOOK_URL`/`TOKEN` na Vercel (configuração de segredo — Regra 8).

## Entrega (item 8)
- **PR #137** (fix lint `**/.tools/**` no eslint.config.js): squash-merged em `8a810bd`, branch deletada. CI verde.

## Correções nesta rodada
1. **PR #137** — adicionado `'**/.tools/**'` ao array `ignores` do `eslint.config.js` para `npm run check` local terminar com exit 0 (espelha a CI, que não varre o diretório não-tracked `/.tools/`). Evidência: `npm run lint` e `npm run check` → exit 0; CI verde; merge confirmado por `git ls-remote refs/heads/main` = `8a810bd`.

## BLOQUEADO / aguardando dono (item 9)
| Item | Status | Erro exato / o que falta |
|---|---|---|
| Auditoria de banco ao vivo (RLS/migrations no ar) | BLOQUEADO | PostgREST e `/pg/query` → 401/404 com keys `sb_*` (só Auth API). Requer `SUPABASE_ACCESS_TOKEN` ou JWT service_role legado |
| Alerta comercial #116 ponta a ponta | BLOQUEADO | Faltam env vars `COMMERCIAL_TEAM_WEBHOOK_URL`/`TOKEN` na Vercel (segredo — Regra 8) |
| Workflow `Canonical catalog public contract` | BLOQUEADO | run 43571471934 (schedule, sha 8a810bd), job `Check read-only product contract` → `failure`. Exige leitura do log do job (retrieval por API retornou vazio nesta sessão) para classificar causa exata; verificação de workflow/contrato — Regra 8 |