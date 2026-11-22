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

### Edge functions (16) — `api/*.ts`, registradas em `vercel.json:functions`
briefing-assets, commercial-alerts, cron-watchdog, contact-requests, customer-proposals, health, not-found, notification-events-resend, notification-events-whatsapp, notifications, product-page, quote-requests, retention, shared-selections, site-page, sitemap. Todas com handler exportado.
`/api/health` (PF-75) chama `getSiteDatabaseConfig()` e devolve 200 ou 503 com apenas o código do problema (`backend_not_configured`, `backend_misconfigured`, `unsafe_database_target`), sem URL, projeto, credencial ou salt.
Status: **OK** (registradas em `functions` + rewrites no `vercel.json`).

### Rotas/rewrites e crons — `vercel.json`
Rewrites: sitemap.xml, / → /index.html (SPA estático, não passa por `site-page`), /catalogo, /catalogos, /montar-kit, /datas-comemorativas, /produto/:identifier, /orcamento, /selecoes/compartilhada, /ideias/:topic, /sobre, /contato, /privacidade (site-page), + fallback `api/not-found`.
Crons: `/api/retention` (0 3 * * *), `/api/notifications` (*/15), `/api/commercial-alerts` (*/5), `/api/cron-watchdog` (*/30).
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
| Canonical catalog public contract | schedule (últimos: 14:01/14:06/14:08 UTC) | SUCCESS ✅ (7/7 verde pós-rotação da key em 14/11 13:21Z) |

Observação: os demais workflows (ci-health, dependency-review, database, contexto, inventario-estado-semanal, production-drift, secrets-rotation-reminder, stale-branches, workflows-lint) são disparados por schedule/push de dependências/PR; o merge `8a810bd` só dispara os 6 de push acima (todos verdes). O `Canonical catalog public contract` (schedule) está verde nas execuções mais recentes (7/7 pós-rotação).

### Banco (item 6)
- 66 migrations em `site-supabase/supabase/migrations`.
- 21 tabelas `site_private` — **todas** com `enable row level security` (verificado arquivo a arquivo).
- **Zero grants diretos a anon/authenticated** em tabelas (acesso só via RPC `security definer` + roles `site_api`/`service_role`).
Status: **OK (estático)**. Auditoria ao vivo: **OK** — alerta `Canonical catalog public contract` (que reprovou no run schedule 43571471934 de 07:31, anterior à rotação) está verde desde a rotação da key `VITE_SUPABASE_PUBLISHABLE_KEY` das Actions em 14/11 13:21Z (7 execuções consecutivas SUCCESS); RPCs do site validadas ao vivo com secret key (preflight rejeita hash inválido e aplica rate limit de 8/15min; `create_site_quote_request` cria, deduplica e rejeita `client_request_id_conflict`).

## Qualidade (item 3)
- `npm run check` (lint+typecheck+build+testes) no branch da PR #137: **exit 0, 123 passed / 5 skipped** (skips condicionais por projeto mobile/chromium — legítimos, não removidos).
- Sem remoção/afrouxamento de teste: total estável em relação ao baseline.
- O Quality gate do merge `8a810bd` também passou (SUCCESS), confirmando que o main final fecha verde.

## Sem meio-termo (item 5)
Varredura em `src/` e `api/`: zero `TODO`/`FIXME`/`WIP`, zero `export default {}`, sem mocks/handlers vazios. Os dois `return {}` encontrados são fallback/validação legítimos (`src/lib/http.ts:88` catch do JSON parse; `api/notification-events-whatsapp.ts:36` validação de payload).
Status: **OK**.

## Produção (item 7)
- `https://www.promobrindes.com.br/` responsivo: **HTTP 200** (HTML ~564KB); smoke em produção 14/11: sitemap 200, `/` 200, `/api/quote-requests` rejeita origin inválida (403) — validação de origem ativa.
- Deploy Vercel do merge `8a810bd`: **READY** (`dpl_G7iNeDrkcwXeodKVZy6t5MgAEG5C`); deploy de produção vigente READY.
- Fluxo orçamento→alerta→comercial (#116): **BLOQUEADO apenas o elo final** — o pipeline banco foi provado ao vivo nesta rodada (orçamento de teste criou `quote_requests` + enfileirou audience `commercial_team`; `claim_site_commercial_team_alert` retornou envelope completo com protocolo `PB260000108`). Falta `COMMERCIAL_TEAM_WEBHOOK_URL`/`TOKEN` na Vercel (segredo — Regra 8), sem as quais `commercialAlertsEnabled()` retorna falso e o job fica `pending` aguardando o cron `*/5`.

## Entrega (item 8)
- **PR #137** (fix lint `**/.tools/**` no eslint.config.js): squash-merged em `8a810bd`, branch deletada. CI verde.
- **PR #138** (este relatório): aberta, 9 checks verdes, aguardando o estado de merge do GitHub destravar (`mergeable_state blocked` transitório apesar de `mergeable: true`).

## Correções nesta rodada
1. **PR #137** — adicionado `'**/.tools/**'` ao array `ignores` do `eslint.config.js` para `npm run check` local terminar com exit 0 (espelha a CI, que não varre o diretório não-tracked `/.tools/`). Evidência: `npm run lint` e `npm run check` → exit 0; CI verde; merge confirmado por `git ls-remote refs/heads/main` = `8a810bd`.

## BLOQUEADO / aguardando dono (item 9)
| Item | Status | Erro exato / o que falta |
|---|---|---|
| Alerta comercial #116 — elo do webhook | BLOQUEADO | Env vars `COMMERCIAL_TEAM_WEBHOOK_URL`/`TOKEN` ausentes na Vercel (nenhuma env `COMMERCIAL_*` no projeto). Sem elas `commercialAlertsEnabled()` (api/_lib/commercialTeamAlerts.ts:31) retorna false e o job permanece `pending`; configuração de segredo — Regra 8 |
| PR #139 (`chore(ci): expoe o log da sonda`) | ABERTA (sem merge) | Workflow — Regra 8. mergeable_state clean, 10 checks verdes |