# Prod Readiness — Promo_Brindes_V1

**Main final verificado:** `8a810bd` (squash-merge da PR #137)
**Data:** 13/11/2026
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
Status: **OK** (registradas/functions + rewrites no vercel.json).

### Rotas/rewrites e crons — `vercel.json`
- Rewrites: sitemap.xml, /→site-page, /catalogo, /catalogos, /montar-kit, /datas-comemorativas, /produto/:identifier, /orcamento, /selecoes/compartilhada, /ideias/:topic, /sobre, /contato, /privacidade (site-page), + fallback not-found.
- Crons: `/api/retention` (0 3 * * *), `/api/notifications` (*/15), `/api/commercial-alerts` (*/5).
Status: **OK**.

### Workflows (15) — `.github/workflows`
automation-local, catalog-contract, ci-health, codeql, contexto, database, dependency-review, graphify, inventario-estado-semanal, production-drift, quality, release, secrets-rotation-reminder, stale-branches, workflows-lint.
**Auditoria item 4** (última execução após último merge `8a810bd`):
- CodeQL security: SUCCESS ✅
- Automação local: SUCCESS ✅
- Graphify structural map: SUCCESS ✅
- Isolated site database: SUCCESS ✅
- Quality gate: **aguardando** (queued — runner contendido)
- Release isolated database then Vercel: **aguardando** (in_progress — deploy/migrations)
- Contexto para agentes de IA (10 min): cancelado (agendado, fora do merge)

### Banco (item 6)
- 66 migrations em `site-supabase/supabase/migrations`.
- 21 tabelas `site_private` — todas com `enable row level security` (cada uma verificada).
- Zero grants diretos a anon/authenticated em tabelas (acesso só via RPC security definer + roles site_api/service_role).
Status: **OK (estático)**. Auditoria ao vivo: **BLOQUEADO** — keys `sb_secret_/sb_publishable_` só alcançam a Auth API (GoTrue health OK); PostgREST e pg/query retornam 401/404. Requer `SUPABASE_ACCESS_TOKEN` ou JWT service_role legado.

## Qualidade (item 3)
- `npm run check` (lint+typecheck+build+testes) no branch da PR #137: **exit 0, 123 passed / 5 skipped** (skips condicionais por projeto mobile/chromium). 
- Sem remoção de teste: total estável em relação ao baseline.
- Confirmação final no main após deploy: **BLOQUEADO/aguardando** conclusão do Quality gate no merge `8a810bd`.

## Sem meio-termo (item 5)
Varredura em `src/` e `api/`: zero `TODO`/`FIXME`/`WIP`, zero `export default {}`, sem mocks/handlers vazios. Os dois `return {}` encontrados são fallback/validação legítimos (`src/lib/http.ts:88` JSON parse catch; `api/notification-events-whatsapp.ts:36` validação de payload).
Status: **OK**.

## Produção (item 7)
- `https://www.promobrindes.com.br/` responde **200** (HTML servido, ~564KB).
- Deploy mais recente no merge `8a810bd`: **aguardando** workflow Release→Vercel (último READY era `7347bd4`).
- Teste de fluxo lead→alerta→canal comercial (#116): **BLOQUEADO** — requer env vars `COMMERCIAL_TEAM_WEBHOOK_URL`/`TOKEN` na Vercel (configuração de segredo, Regra 8: PR/aguardando dono).

## Entrega (item 8)
- PR #137 (fix lint `**/.tools/**` no eslint.config.js): **squash-merged** em `8a810bd`, branch deletada.

## Correções nesta rodada
1. **PR #137** — adicionado `'**/.tools/**'` ao array `ignores` do `eslint.config.js` para `npm run check` local terminar com exit 0 (espelha a CI, que não varre o diretório não-tracked `/.tools/`). Evidência: `npm run lint` e `npm run check` → exit 0; CI verde; merge confirmado por `git ls-remote refs/heads/main` = `8a810bd`.

## BLOQUEADO / aguardando dono (item 9)
| Item | Status | Erro exato / o que falta |
|---|---|---|
| CI Quality gate no merge | aguardando | queued (runner GitHub contendido por outras suítes adm01-debug) |
| CI Release→Vercel no merge | aguardando | in_progress (job de migrations + deploy) |
| Auditoria de banco ao vivo | BLOQUEADO | PostgREST/pg-query 401/404 com keys sb_*; requer SUPABASE_ACCESS_TOKEN ou service_role JWT |
| Alerta comercial #116 ponta a ponta | BLOQUEADO | faltam env vars COMMERCIAL_TEAM_WEBHOOK_URL/TOKEN na Vercel (segredo — Regra 8) |