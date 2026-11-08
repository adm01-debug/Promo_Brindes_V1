# Vercel e deploy — referência para agentes

Ler quando for confirmar um deploy, mexer em env var do Vercel, domínio, cron ou função serverless.

| O que | Valor |
|---|---|
| Projeto | `promo-brindes-v1` (team/scope `juca1`) — IDs reais em `.github/workflows/release.yml` (`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) |
| Domínio de produção | https://promo-brindes-v1.vercel.app |
| Alias da `main` | `promo-brindes-v1-git-main-juca1.vercel.app` (sincronizado pelo release) |
| Framework / build / output | Vite + React 19 · `npm run build` (`tsc -b` + `vite build` + `scripts/stage-app-shell.mjs`) · `dist/` · Node 24 |
| Back-end | funções serverless em `api/*.ts`, `maxDuration` declarado por rota em `vercel.json` (teste: `tests/api/maxDuration.test.ts`) |
| Crons da Vercel | `/api/retention` `0 3 * * *` · `/api/notifications` `*/15 * * * *` (`vercel.json`) |
| MCP Vercel | ferramentas `mcp__Vercel__*` — escrita é ação de produção |

## Deploy: quem publica o quê

- **Deploy Git da Vercel está DESLIGADO** (`vercel.json` → `"git": { "deploymentEnabled": false }`). Push
  não publica nada sozinho.
- Quem publica é o **`release.yml`**, no push da `main`, nesta ordem: autoriza (só `main`) → espera todos
  os gates obrigatórios da `main` → confere o **ledger de migrations** do banco isolado → `vercel build` +
  `node scripts/verify-vercel-artifact.mjs` → `vercel deploy --prebuilt --prod --skip-domain` (candidato
  **não promovido**) → `npm run smoke:deployment` no candidato → `vercel promote` → confere que o alias de
  produção aponta para o SHA → sincroniza o alias `git-main` → smoke no domínio público e no alias →
  **rollback automático** para o deployment anterior se qualquer validação pós-promoção falhar.
- Portanto: merge em `main` = produção, mas só depois do smoke. Falha ou rollback →
  `docs/RUNBOOK_RELEASE.md`; incidente → `docs/RUNBOOK_INCIDENTES.md`.
- Nunca rode `vercel deploy`/`vercel promote` à mão para publicar: confirme o run do `release.yml`.

## Como confirmar o deploy depois do merge

1. Run do `release.yml` para o SHA do merge: verde até "Smoke the public production domain after promotion".
2. SHA em produção: `production-drift.yml` compara diariamente (`0 7 * * *`) o deployment de
   `promo-brindes-v1.vercel.app` com o HEAD da `main` e abre alerta na divergência; para checar na hora, use
   `mcp__Vercel__list_deployments` / `get_deployment` no scope `juca1`.
3. Comportamento: `npm run smoke:deployment` com `SMOKE_BASE_URL=https://promo-brindes-v1.vercel.app`, ou
   um request real na rota afetada. "Deveria funcionar" não conta.

## Regras de env var no Vercel

- `VITE_*` vai para o bundle e é **público** — nunca segredo com prefixo `VITE_`.
- Segredo de servidor (`SITE_SUPABASE_SECRET_KEY`, `SITE_SUPABASE_SERVICE_JWT`, `CRON_SECRET`,
  `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `WHATSAPP_*`, `SITE_REQUEST_HASH_SALT`,
  `OPERATIONS_ALERT_WEBHOOK_*`) só como env var de servidor do projeto na Vercel ou secret do GitHub —
  nunca em código, commit, log ou resposta. Nomes esperados: `.env.example`.
- `.env.local` nunca é commitado (`.gitignore`); `gitleaks` roda em toda PR no `quality.yml`.
- Preview usa projeto Supabase próprio — `docs/RUNBOOK_PREVIEW_ISOLADO.md`.
- Rotação de segredo: `docs/RUNBOOK_ROTACAO_SEGREDOS.md` (lembrete trimestral por
  `secrets-rotation-reminder.yml`).

## Limites

- Mexer em env var, domínio ou projeto na Vercel é mudança de produção: item de "chame o dono" (regra 8 do
  Fluxo Git).
- `VERCEL_TOKEN` é secret do GitHub usado pelo `release.yml` e pelo `production-drift.yml`; não o replique
  em outro lugar.
