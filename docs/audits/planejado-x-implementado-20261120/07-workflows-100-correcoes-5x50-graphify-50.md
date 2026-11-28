# Auditoria "planejado × implementado" — lote Workflows (WF 1–100) · Planos de correções (P13/P16/P17/P23/P24) · Graphify (GR 1–50)

Base: `main` = `40f6420` (2026-11-19). Somente leitura. Desde a auditoria de 11/10 (`3f82233`) entraram 111 commits (PRs #85…#210; os relevantes para este lote: #116, #131, #133, #147–#150, #152–#154, #158, #161–#165, #179, #184, #186, #188–#198, #202–#204, #208, #210). Estado remoto do GitHub/Vercel/Supabase não foi consultado; onde o item só existe lá, está marcado "depende de estado remoto" e, quando `docs/agentes/github-ci.md` (lido em 08/11, `75ba0fa`) afirma o valor, cito a linha como declaração, não como prova.

---

## 1. PLANO_WORKFLOWS_100_ETAPAS_20260927 (+ REVISAO_WORKFLOWS_100_20260928) — 100 etapas, linha a linha

| ID | Funcionalidade planejada | Estado HOJE | O que falta (concreto) | Evidência (arquivo:linha ou grep=0) | Mudou desde 11/10? | Quem destrava |
|---|---|---|---|---|---|---|
| WF01 | `VERCEL_TOKEN` válido [D] | IMPLEMENTADO (depende de estado remoto) | Identidade da conta de serviço não registrada no repo | `release.yml:167,188` usa `secrets.VERCEL_TOKEN`; validade do segredo só verificável na Vercel | não | DONO |
| WF02 | Preflight de credenciais como 1º passo | PARCIAL | Gates (até 40 min) continuam antes de qualquer teste de credencial; `SITE_SUPABASE_DB_URL` só em `:84`, `SUPABASE_ACCESS_TOKEN` só em `:109`, `VERCEL_TOKEN` só em `:171` (job `deploy-vercel`) | `release.yml:48-76` (espera), `:84`, `:109`, `:171` | sim (#165 adicionou a 3ª credencial depois dos gates; #210 alongou a espera para 120×20 s) | ENG |
| WF03 | `defaults.run.shell: bash` em todos | PARCIAL (regrediu) | 14/15 workflows declaram; `automation-local.yml` (criado por #131) não tem `defaults:` | `grep -c 'defaults:' .github/workflows/automation-local.yml` = 0; ex. `release.yml:12-14` | sim (#131 introduziu o workflow sem o padrão) | ENG |
| WF04 | Eliminar `\| tee` crítico | IMPLEMENTADO | — | `database.yml:44,48` (redireção); `quality.yml:103-106` (`set -o pipefail`+tee); `catalog-contract.yml:49-50`; `release.yml` sem `tee` | não | — |
| WF05 | URL do deployment sem pipe | IMPLEMENTADO | — | `release.yml:200-206` (`--json` → `jq -er` → `normalize-vercel-deployment-url.mjs`) | não | — |
| WF06 | Deploy → smoke → promote | IMPLEMENTADO | — | `release.yml:185-235` (`--skip-domain` `:200`, smoke `:217-223`, `vercel promote` `:234`) | não | — |
| WF07 | Rollback automático | PARCIAL-VALIDAÇÃO (= PF-93) | Nunca exercitado em produção; sem ensaio registrado | `release.yml:289-319` (`if: failure() && steps.promote.outputs.attempted`) ; `ls docs \| grep -i ROLLBACK` = 0 | não | ENG |
| WF08 | `workflow_dispatch` com `ref`/`skip_gate_wait` | PARCIAL | Dispatch sem `inputs`; `authorize-main` só aceita `refs/heads/main` | `release.yml:6` (sem inputs: `grep -n inputs release.yml` = 0), `:27-35` | não | ENG |
| WF09 | Produção = `main` | IMPLEMENTADO (depende de estado remoto) | — | Mecanismo: `release.yml:245-248` verifica `meta.githubCommitSha == $sha`; `production-drift.yml:3-7` diário | não | — |
| WF10 | Detector de drift | IMPLEMENTADO | — | `production-drift.yml:3-7` (cron 07:00 UTC + dispatch), `:17-19` `issues: write`, `:73,123,155` github-script | não | — |
| WF11 | Aritmética de timeout | IMPLEMENTADO | — | `release.yml:41-43` (`timeout-minutes: 70` para 40 + 15 min lógicos), `:54,71` (120×20 s), `:114,132` (60×15 s) | sim (#210) | — |
| WF12 | `workflow_run` em vez de polling | NÃO INICIADO | Continua polling (agora 120×20 s) ocupando runner | `release.yml:3-6` (só `push`/`workflow_dispatch`), `:54-76` | sim, mas no sentido contrário (#210 aumentou o polling) | ENG |
| WF13 | Ordenação robusta dos check-runs | PARCIAL (= PF-96) | `sort_by(.started_at)`; sem filtro `app.id`; sem paginação (só warning) | `release.yml:55-63` | não | ENG |
| WF14 | `neutral`/`skipped`/`stale` explícitos | PARCIAL (= PF-96) | Esses estados ficam "pending" até o timeout de 40 min | `release.yml:64-68` | não | ENG |
| WF15 | Erro legível da Management API | IMPLEMENTADO | — | `release.yml:115-121` (`curl --fail` + `jq -er 'if type == "array"'`) | não | — |
| WF16 | `LC_ALL=C` em `sort`/`comm` | NÃO INICIADO (= PF-96) | Locale não fixado | `release.yml:112,122,123`; `grep -n LC_ALL .github/workflows/*.yml` = 0 | não | ENG |
| WF17 | Artefato do DB não mascara causa | IMPLEMENTADO | — | `database.yml:43` (`mkdir -p`), `:73-80` (`if: always()`, `warn`) | não | — |
| WF18 | Porta do Postgres a partir do `config.toml` | NÃO INICIADO | Porta fixa nos dois scripts | `tests/queue-concurrency.node.mjs:16` e `scripts/soak-test-notification-queue.mjs:23,69` (`127.0.0.1:56322` literal); `site-supabase/supabase/config.toml:11` (`port = 56322`) | não | ENG |
| WF19 | Drift de gerados: diff + arquivo regenerado | PARCIAL | Diff só no log; nenhum `.patch`/arquivo regenerado no artefato; sem comentário no PR | `database.yml:49-72` (`git diff` para stdout), `:78` (artefato só `artifacts/database/`) | não | ENG |
| WF20 | Política de auto-correção de drift [D] | BLOQUEADO (decisão do dono) | Decisão não registrada; nenhum workflow commita gerados (o `inventario-estado-semanal.yml` abre PR só do inventário) | `grep -rn 'git commit' .github/workflows/database.yml` = 0 | não | DONO |
| WF21 | Graphify: artefato também em falha | IMPLEMENTADO | — | `graphify.yml:73-80` | não | — |
| WF22 | Pip com hashes + cache pip | PARCIAL | Cache pip ok; `.in` criado (#197); **hashes não aplicados** — o próprio arquivo registra que `--generate-hashes` quebraria o leitor `graphifyy\[sql\]==` de `session-start.sh:73` e que é decisão do dono | `requirements-graphify.txt:6-16,17-18`; `requirements-graphify.in:1-5`; `graphify.yml:36-43` | sim (#197) | DONO (decidir) → ENG |
| WF23 | Guarda de base Graphify ausente | NÃO INICIADO | Sem `test -f "$BASE_WORKTREE/scripts/graphify.mjs"`; o `npm run graph:build` na base falha cru se o wrapper não existir | `graphify.yml:64-67` | não | ENG |
| WF24 | Não rodar Vitest 2× (= PF-95) | NÃO INICIADO | `validate` roda Vitest em `npm run check` e de novo em `test:coverage`; build 3× (check → `build`, webServer do Playwright, passo de performance) | `quality.yml:86,89,105`; `package.json:92` (`check` inclui `test`, `build`, `test:e2e`); `playwright.config.ts:21` | não | ENG |
| WF25 | `npm audit` logo após `npm ci` | IMPLEMENTADO | — | `quality.yml:38,45-53` (bloqueante `--omit=dev`, informativo completo) | sim (#188) | — |
| WF26 | Cache dos browsers Playwright (validate) | NÃO INICIADO (= PF-95) | Chromium instalado a cada run (#133 só adicionou retry) | `quality.yml:68-83` | sim (#133, sem cache) | ENG |
| WF27 | `cross-browser` reaproveita build do `validate` | NÃO INICIADO (= PF-95) | `npm ci` + build próprio via `webServer` | `quality.yml:164-173`; `playwright.config.ts:20-26` | sim (#204 só separou passos e subiu teto para 35 min) | ENG |
| WF28 | Remover `pull-requests: read` não usado | IMPLEMENTADO | — | `quality.yml:16-17` | não | — |
| WF29 | CodeQL `security-extended` + `paths-ignore` | PARCIAL-VALIDAÇÃO | Aspas literais corrigidas (#154); eficácia (alertas em `docs/` deixarem de abrir) depende de estado remoto; não verifiquei se `paths-ignore` é input aceito pela `init` nesse SHA (gh api indisponível nesta sessão) | `codeql.yml:45,50-53` | sim (#154) | ENG (conferir alertas) |
| WF30 | Dependency review com licenças | PARCIAL | Falta `fail-on-scopes: runtime`; `pull-requests: write` no topo, não no job | `dependency-review.yml:10-12,27-29` | não | ENG |
| WF31 | SHA pinning obrigatório | IMPLEMENTADO (depende de estado remoto) | — | AGENTS.md (seção Serviços) declara `sha_pinning_required: true`; todas as `uses:` nos 15 workflows são SHA de 40 chars (ex. `release.yml:47,136,160`) | sim (#149, 16/11) | — |
| WF32 | `allowed_actions: selected` | BLOQUEADO (descartada por decisão do dono) | Não aplicar: travou o CI em 14–16/11 | AGENTS.md (seção Serviços: "nunca `local_only` nem `selected`"); anexo 04 item 32 atualizado por #149 | sim (#149) | — |
| WF33 | Secret scanning + push protection | IMPLEMENTADO (depende de estado remoto) | — | `docs/agentes/github-ci.md:39` declara ligados (leitura de 08/11) | sim (segundo doc) | — |
| WF34 | Dependabot security updates | NÃO VERIFICADO | Setting remoto; `github-ci.md` não cita | — | ? | ENG |
| WF35 | `harden-runner` | NÃO INICIADO (= PF-74) | — | `grep -rn harden-runner .github` = 0 | não | ENG |
| WF36 | `actionlint` + `zizmor` | PARCIAL (= PF-74) | `zizmor` não roda no CI (só comentários `# zizmor: ignore[...]` em `contexto.yml:311`, `inventario-estado-semanal.yml:46`); actionlint baixado via `curl` sem checksum; lint só em PR que toca `.github/**` | `workflows-lint.yml:3-7,29-37` | não | ENG |
| WF37 | CODEOWNERS para `.github/**` e `site-supabase/**` | PARCIAL | Só `* @adm01-debug`; comentário do arquivo diz "requer aprovação", mas `github-ci.md:33,37` declara `require_code_owner_reviews=false`/0 aprovações → DIVERGÊNCIA interna | `.github/CODEOWNERS:1-3`; `docs/agentes/github-ci.md:33,37` | não | DONO |
| WF38 | Segredos no Environment `Production` + `environment:` (= PF-68) | NÃO INICIADO | Nenhum job declara `environment:` | `grep -rn '^\s*environment:' .github/workflows` = 0; `release.yml:146-156` | não | ENG |
| WF39 | Política de branch dos Environments (= PF-68) | NÃO INICIADO (depende de estado remoto) | Sem `environment:` nos jobs, a política não teria efeito | mesmo grep acima | não | ENG |
| WF40 | Conta de serviço Supabase [D] (= PF-71) | BLOQUEADO (dono) | Release usa PAT (`SUPABASE_ACCESS_TOKEN`) **e agora** `SITE_SUPABASE_DB_URL` (string de conexão com DDL) | `release.yml:81,106,115-119` | sim (#165 adicionou a credencial de DDL) | DONO |
| WF41 | Lembrete trimestral de rotação (= PF-72) | PARCIAL | Sem dedupe; checklist só `VERCEL_TOKEN`/`SUPABASE_ACCESS_TOKEN`; não lista `SITE_SUPABASE_DB_URL` (novo), `CRON_SECRET`, `COMMERCIAL_TEAM_WEBHOOK_URL`, webhooks | `secrets-rotation-reminder.yml:28-45` (último commit `a8000ad` 27/09) | não | ENG |
| WF42 | Limpar `.vercel/` | IMPLEMENTADO | — | `release.yml:333-335` | não | — |
| WF43 | `persist-credentials: false` em todos | PARCIAL (= PF-74) | Falta em `release.yml` job `verify-db` e `stale-branches.yml` (`true`) | `release.yml:47` (sem `with`); `stale-branches.yml:22-25` | não | ENG |
| WF44 | `permissions: {}` no topo + por job (= PF-74) | NÃO INICIADO | Todos os 15 têm permissões no topo; só `contexto.yml:311` e `inventario-estado-semanal.yml:46` adicionam por job | `grep -nE '^permissions:' .github/workflows/*.yml` = 15 linhas | não | ENG |
| WF45 | Dependabot refinado (cooldown, grupo major, labels, prefixo) | PARCIAL | Faltam `cooldown`, grupo/`ignore` de majors (ver PC-9) | `.github/dependabot.yml:1-40` (`grep -c 'ignore\|cooldown'` = 0); último commit `a8000ad` 27/09 | não | ENG |
| WF46 | Limite de PRs Dependabot | IMPLEMENTADO | — | `.github/dependabot.yml:8,22,36` (`open-pull-requests-limit: 3`) | não | — |
| WF47 | Auto-merge Dependabot [D] | NÃO INICIADO | `github-ci.md:36` declara `allow_auto_merge=true`, mas não há workflow que habilite auto-merge | `grep -rn automerge .github/workflows` = 0 | parcialmente (setting remoto, segundo doc) | DONO → ENG |
| WF48 | `npm audit signatures` | PARCIAL (= PF-74) | Bloqueante no quality (#150); ausente em `graphify.yml` e `release.yml` | `quality.yml:54-56` (sem `continue-on-error`); `grep -n 'audit signatures' graphify.yml release.yml` = 0 | sim (#150) | ENG |
| WF49 | SBOM do release | NÃO INICIADO (= PF-74) | — | `grep -rni sbom package.json .github/workflows` = 0 | não | ENG |
| WF50 | Gitleaks por evento | PARCIAL | `fetch-depth: 0` sempre; sem varredura agendada | `quality.yml:24-31` | não | ENG |
| WF51 | Composite `setup-node-project` (= PF-95) | PARCIAL | Existe e **nenhum workflow usa**; pin interno (`setup-node` v7.0.0) já diverge dos workflows (v7.1.0) | `.github/actions/setup-node-project/action.yml:15`; `grep -rn setup-node-project .github/workflows` = 0 | não | ENG |
| WF52 | npm sem `install -g` | PARCIAL | `npm install --global npm@11.17.0` em 4 lugares + composite; `packageManager` declarado mas sem corepack | `quality.yml:37,163`; `graphify.yml:47`; `release.yml:192`; `action.yml:21`; `package.json:74` | não | ENG |
| WF53 | `.nvmrc`/`engines`/`.npmrc engine-strict` (= PF-98) | PARCIAL | `.npmrc` ausente | `.nvmrc` = 24.15.0; `package.json:71-74`; `ls .npmrc` → inexistente | não | ENG |
| WF54 | `runs-on: ubuntu-24.04` fixo | PARCIAL (regrediu) | `automation-local.yml` usa `ubuntu-latest` e `setup-node` com pin diferente (`# v6`) | `automation-local.yml:25,33`; demais 14 workflows ok | sim (#131) | ENG |
| WF55 | `paths-ignore` docs-only (= PF-95) | NÃO INICIADO | PR só de docs roda quality, database, graphify, codeql, automation-local | `quality.yml:3-6`; `database.yml:3-6`; `graphify.yml:3-7`; só `contexto.yml:34-47` e `workflows-lint.yml:5-7` têm `paths` | não | ENG |
| WF56 | Cache Firefox/WebKit (= PF-95) | NÃO INICIADO | Instala a cada run; #204 só separou em 2 passos e subiu o teto para 35 min | `quality.yml:146-153,169-172` | sim (#204, sem cache) | ENG |
| WF57 | `supabase start` mínimo | NÃO INICIADO | Sem `-x` nem cache Docker | `database.yml:38` | não | ENG |
| WF58 | `supabase/setup-cli` pinado | NÃO INICIADO | `npm install --global supabase@2.115.0` em 2 workflows | `database.yml:36`; `release.yml:78` | não | ENG |
| WF59 | `fetch-depth` por evento | NÃO INICIADO | `0` fixo | `quality.yml:26`; `graphify.yml:30` | não | ENG |
| WF60 | E2E Chromium em job paralelo | NÃO INICIADO | E2E dentro de `npm run check` no `validate` | `package.json:92`; `quality.yml:84-86` | não | ENG |
| WF61 | Sharding Playwright | NÃO INICIADO | Depende de 60 | — | não | ENG |
| WF62 | `concurrency` padronizada | PARCIAL | `dependency-review`, `ci-health`, `stale-branches`, `secrets-rotation-reminder` sem `concurrency`; grupos com padrões distintos | `grep -nE '^concurrency:' .github/workflows/*.yml` → 11 de 15 | não | ENG |
| WF63 | Retenção de artefatos por evento | NÃO INICIADO | Fixos: 30/30/14/90/1/14 | `quality.yml:141,183`; `database.yml:80`; `graphify.yml:80`; `release.yml:144,358`; `contexto.yml:173` | não | ENG |
| WF64 | Node da Vercel = engines [D] | IMPLEMENTADO (depende de estado remoto) | — | `package.json:71-73` (`>=24.15.0 <25`); `.nvmrc`; anexo 06 P24:03 (nodeVersion 24.x via API, 11/10) | não | — |
| WF65 | `timeout-minutes` por passo de rede (= PF-96) | NÃO INICIADO | Só timeouts de job | `grep -nE '^\s{8,}timeout-minutes' .github/workflows/*.yml` = 0 | não | ENG |
| WF66 | Backoff exponencial (= PF-96) | NÃO INICIADO | `sleep 20` / `sleep 15` constantes | `release.yml:75,132` | não | ENG |
| WF67 | `$GITHUB_STEP_SUMMARY` em todos (= PF-97) | PARCIAL | Quality corrigido (#162: resultado por passo); release, ci-health, catalog-contract têm; **database, graphify, codeql, dependency-review, workflows-lint, stale-branches não** | `quality.yml:109-128`; `release.yml:320-332`; `grep -L STEP_SUMMARY .github/workflows/*.yml` | sim (#162) | ENG |
| WF68 | Relatório Playwright no summary (= PF-97) | PARCIAL | Reporter `github` + HTML em artefato; sem summary | `playwright.config.ts:13-15` | não | ENG |
| WF69 | Cobertura com delta vs `main` (= PF-97) | NÃO INICIADO | Só threshold | `quality.yml:87-89`; `grep -nE 'delta|coverage.*main' quality.yml` = 0 | não | ENG |
| WF70 | Métricas de CI semanais (= PF-97) | PARCIAL | Diário, 50 runs, só taxas; sem p50/p95/minutos; sem `docs/CI_METRICS.md` | `ci-health.yml:4-6,34-37`; `scripts/ci-health-metrics.mjs` (`grep -nE 'p95|median|duration'` = 0); `ls docs \| grep CI_METRICS` = 0 | não | ENG |
| WF71 | Alerta de falha em `main` [D] (= PF-88) | BLOQUEADO (dono: canal) | Só issues GitHub | `grep -rn 'slack\|EVOLUTION_API\|WHATSAPP' .github/workflows` = 0 | não | DONO |
| WF72 | Issue automática "Release quebrado" (= PF-96) | NÃO INICIADO | Release sem `issues: write` nem github-script | `release.yml:16-19` | não | ENG |
| WF73 | Badges no README | PARCIAL | 5 de 15 workflows | `README.md:3-7` | não | ENG |
| WF74 | Exigir PR para `main` [D] (= PF-69) | BLOQUEADO (dono/pessoas) | Proteção existe (segundo doc) mas com **0 aprovações** e revisor único | `docs/agentes/github-ci.md:29-33,37`; `.github/CODEOWNERS:3` | sim (doc 08/11: review deixou de ser exigida) | DONO + PESSOAS |
| WF75 | Squash-only + histórico linear [D] (= PF-70) | NÃO INICIADO (depende de estado remoto) | Doc declara `allow_merge_commit=true`, `allow_rebase_merge=true`, linear `false` | `docs/agentes/github-ci.md:34-36` | não | DONO |
| WF76 | `delete_branch_on_merge` (= PF-70) | IMPLEMENTADO (depende de estado remoto) | — | `docs/agentes/github-ci.md:36` declara `true`; `git ls-remote --heads` = 5 heads (eram 34) | sim (segundo doc) | — |
| WF77 | `allow_update_branch` + `strict` (= PF-70) | PARCIAL (depende de estado remoto) | Doc declara `strict=true` (era `false` em 11/10); `allow_update_branch` não documentado | `docs/agentes/github-ci.md:31,43-44` | sim (strict, segundo doc) | ENG |
| WF78 | Ruleset (= PF-70) | NÃO INICIADO (depende de estado remoto) | Doc descreve branch protection clássica, nenhum ruleset | `docs/agentes/github-ci.md:28-37` | não | ENG |
| WF79 | CodeQL/Dependency review obrigatórios (= PF-70) | NÃO INICIADO | Só 4 checks obrigatórios; o release espera exatamente os mesmos 4 | `docs/agentes/github-ci.md:29,46-47`; `release.yml:53` | não | ENG |
| WF80 | Nomes de job estáveis | PARCIAL | `validate`/`cross-browser` sem `name:`; release hard-coda a lista | `quality.yml:20,143`; `release.yml:53` | não | ENG |
| WF81 | Teste de contrato dos nomes de gate | NÃO INICIADO | `release-workflow.test.ts` tem 4 testes, nenhum compara `required=(...)` com a proteção/quality.yml | `tests/scripts/release-workflow.test.ts:9,15,25,39`; `ls tests/workflow-gates.node.mjs` → inexistente | não | ENG |
| WF82 | Template de PR | IMPLEMENTADO | — | `.github/pull_request_template.md` | não | — |
| WF83 | Templates de issue | PARCIAL-VALIDAÇÃO | Labels `ci`, `release`, `priority:high`, `ci-health`, `security`, `maintenance` dependem de existir no repositório (remoto) | `.github/ISSUE_TEMPLATE/ci-broken.yml:3-5`; `release-blocked.yml:3-6`; `ci-health.yml:113`; `secrets-rotation-reminder.yml:44` | não | ENG |
| WF84 | Deployment status no GitHub (= PF-68) | NÃO INICIADO | Sem `environment:`/`deployments: write` | `release.yml:16-19,146-156` | não | ENG |
| WF85 | Atualizar runbooks (= PF-91) | DIVERGÊNCIA | `RUNBOOK_RELEASE.md:11` diz "integração Supabase aplica migrations" — hoje é o **release.yml** (#165); `:9-10` "proteção exige branch atualizada" voltou a ser verdade segundo `github-ci.md:31`; rollback manual descrito vs automático; RESTORE/VERIFICACAO com 19/17 tabelas | `git log -1 -- docs/RUNBOOK_RELEASE.md` = `fd58a5d` 23/09; INCIDENTES 23/09; ROTACAO 16/09; RESTORE 22/09; `release.yml:79-103` | sim (código mudou, runbooks não) | ENG |
| WF86 | Preview por PR [D] (= PF-89) | BLOQUEADO (dono/custo) | Sem `preview.yml`; Git integration desligada | `vercel.json:3-5`; `ls .github/workflows/preview.yml` → inexistente | não | DONO |
| WF87 | Smoke/`@smoke` no preview | BLOQUEADO (depende de 86) | Nenhum teste marcado `@smoke` | `grep -rn '@smoke' e2e` = 0 | não | DONO → ENG |
| WF88 | Lighthouse CI (= PF-98) | NÃO INICIADO | — | `grep -rni 'lighthouse\|lhci' package.json .github/workflows` = 0 | não | ENG |
| WF89 | `db push --dry-run` em PRs [D] | PARCIAL | Dry-run **existe no release** (pós-merge), não no PR; exige `SITE_SUPABASE_DB_URL` | `release.yml:102-103`; `package.json:124` (`db:site:dry-run` ainda `npx supabase@latest`) | sim (#165) | DONO (credencial p/ PR) |
| WF90 | Ordem das migrations vs ledger remoto no PR (= PF-77) | PARCIAL | Comparação remota só no release; PR valida só nomes | `release.yml:104-133`; `database.yml:31-32` | sim (#165: release agora **aplica** e depois confere o ledger) | ENG |
| WF91 | Validar `vercel.json` no PR | PARCIAL | `maxDuration` e `rewrites` testados; `crons` e `headers` sem teste de contrato | `tests/api/maxDuration.test.ts:48-90`; `tests/api/site-page.test.ts:91-94`; `grep -rn crons tests` → só mensagem do smoke | sim (#116 adicionou `api/commercial-alerts.ts` ao teste) | ENG |
| WF92 | SHA do build publicado | IMPLEMENTADO | — | `release.yml:201,210-213,245-248,269-272` | não | — |
| WF93 | Relatório semanal de branches órfãs | PARCIAL | Só lista > 60 dias; não abre issue; `contents: write` e `persist-credentials: true` desnecessários | `stale-branches.yml:13-14,22-36` | não | ENG |
| WF94 | "CI health" que dispara pipelines | PARCIAL | Só lê histórico | `ci-health.yml:29-38` | não | ENG |
| WF95 | `npm run ci:local` (= PF-98) | PARCIAL | Alias inexistente; `npm run check` é o que o `validate` roda, e `automation:check`/`maintenance:check` (#131) cobrem contratos locais; faltam audit, coverage, performance e banco no mesmo comando | `package.json:92,157-166`; `grep -n 'ci:local' package.json` = 0 | sim (#131) | ENG |
| WF96 | Hook de pré-commit leve (opcional) | IMPLEMENTADO (opt-in, não instalado por padrão) | Decisão GR30 (não instalar) mantida; existe `automation:install-hooks` com pre-commit/pre-push | `package.json:164-165`; `scripts/automation.mjs:1069-1077`; `docs/GOVERNANCA_FECHAMENTO.md:32` | sim (#131) | — |
| WF97 | Registrar plano no ledger (= PF-110) | NÃO INICIADO | Validador aceita só UX/LK/GR/AC | `scripts/validate-closure-ledger.mjs:68,75` | não | DONO + ENG |
| WF98 | Licenças do inventário | NÃO INICIADO | `THIRD_PARTY_NOTICES.md` manual (27/09); só `deny-licenses` no dependency-review | `git log -1 -- THIRD_PARTY_NOTICES.md` = `7c1c50e` 27/09; `grep -rni license package.json scripts .github/workflows` → só `dependency-review.yml:28` | não | ENG |
| WF99 | SLO de CI (= PF-97) | NÃO INICIADO | Só alerta > 30 % | `ci-health.yml:83-114` | não | ENG |
| WF100 | Fechamento (`docs/EXECUCAO_WORKFLOWS_*`) | NÃO INICIADO | — | `ls docs \| grep EXECUCAO` → 7 arquivos, nenhum de workflows | não | ENG |

**Placar WF (100 etapas, HOJE):** IMPLEMENTADO 21 (01, 04, 05, 06, 09, 10, 11, 15, 17, 21, 25, 28, 31, 33, 42, 46, 64, 76, 82, 92, 96 — 01/09/31/33/64/76 dependem de estado remoto) · PARCIAL-VALIDAÇÃO 3 (07, 29, 83) · PARCIAL 32 · NÃO INICIADO 35 · BLOQUEADO 7 (20, 32, 40, 71, 74, 86, 87) · DIVERGÊNCIA 1 (85) · NÃO VERIFICADO 1 (34). Em 11/10 era 21/29/42/8. Movimentos reais: 25, 31, 33, 76 subiram; 03 e 54 **regrediram** (automation-local.yml); 11/22/48/67/89/90/95/96 melhoraram sem fechar; 12/26/27/56 mudaram sem resolver.

---

## 2. Planos de correções P13/P16/P17/P23/P24 — 41 pendências deduplicadas + 8 adiamentos + achados dos revisores

### 2.1 As 41 pendências (numeração do anexo 06 §1)

| ID | Funcionalidade planejada | Estado HOJE | O que falta | Evidência | Mudou desde 11/10? | Quem destrava |
|---|---|---|---|---|---|---|
| PC-01 (= PF-109) | Reconciliação da matriz dos 230 requisitos | PARCIAL (só o cabeçalho) | CSV intocado desde 22/09; `MATRIZ_INDEX.md` passou a datar a distribuição (#208) mas nada foi reconciliado; template de PR sem item "matriz" | `git log -1 -- docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv` = `dafd3d9` 22/09; `docs/MATRIZ_INDEX.md:15,19`; `grep -ni matriz .github/pull_request_template.md` = 0 | sim (#208, só texto) | ENG |
| PC-02 (= PF-87) | Observador de cron silencioso (heartbeat/`lastRunAt`) | PARCIAL | #190 faz `reportQueueHealth()` **antes** do 503 sem provedor (fila agora é medida); continua sem `lastRunAt` por cron, sem observador externo; agora são 3 crons | `api/notifications.ts:662-670`; `vercel.json:6-10`; `grep -rniE 'heartbeat\|lastRunAt\|last_run_at' api src scripts site-supabase/supabase/migrations .github/workflows` → só `scripts/supabase_snapshot/test_snapshot.py` (outro assunto) | sim (#190) | ENG |
| PC-03 (= PF-78) | Diff integral de schema/ACL remoto | NÃO INICIADO | Nenhum `db diff`/inventário de grants remoto em workflow | `grep -rniE 'db diff' .github/workflows scripts package.json` → só texto em `generate-database-schema-doc.mjs:81` | não | ENG |
| PC-04 (= PF-78) | Security Advisor/lint remoto recorrente | PARCIAL | `contexto.yml` coleta "lints" do banco do site ao vivo a cada hora para a branch `contexto` (sem gate nem alerta); `database.yml:48` continua só local | `.github/workflows/contexto.yml:17` (cabeçalho: "tabelas, RLS, funções, triggers, cron, lints"), `:48-50` | sim (#131/#140) | ENG |
| PC-05 (= PF-79) | API usando os tipos gerados | PARCIAL (quase fechado) | #192 tipa nome e argumentos de toda RPC pelo catálogo gerado; falta o inventário/depreciação dos contratos JSON manuais | `api/_lib/siteRpcContract.ts:1-16` (importa `Database`); `api/_lib/contracts.ts` = 416 linhas manuais | sim (#192) | ENG |
| PC-06 (= PF-32) | `comment on table` nas 8 tabelas | NÃO INICIADO | — | `grep -c 'Sem comment on table' docs/DATABASE_DICTIONARY.md` = 8 | não | ENG |
| PC-07 (= PF-40) | Decisão formal do alcance do ranking/paginação | NÃO INICIADO | Documento de decisão inexistente | `ls docs \| grep -iE 'DECIS\|RANKING'` = 0 | não | DONO |
| PC-08 | Política de filtros (imediata × rascunho) | NÃO INICIADO | Idem | `ls docs \| grep -iE 'FILTRO'` = 0 | não | DONO |
| PC-09 (= PF-98) | Majors ESLint 10 / TS, matriz de peers, `ignore` de majors no Dependabot | PARCIAL | Os majors **foram adotados** (ESLint 10 em `e7ebf1b`/#148, TypeScript 6 em #153); não há matriz de compatibilidade nem `ignore`/`cooldown` no Dependabot | `package.json:182,191,198` (`@eslint/js 10.0.1`, `eslint ^10.15.0`, `typescript ^6.0.3`); `.github/dependabot.yml` sem `ignore` | sim (#148, #153) | ENG |
| PC-10 (= PF-53) | Favoritos: E2E multi-aba, A→B, limite 100 | PARCIAL | #193 cobre reload e duas abas; faltam A→B direto, promoção no limite 100/falha parcial e offline | `e2e/favorites.spec.ts:14,30`; `grep -rnE '100\|limite' e2e/favorites.spec.ts` = 0 (só a chave); `grep -rn onLine src` = 0 | sim (#193) | ENG |
| PC-11 (= PF-113) | Decomposição de páginas > 300 linhas e CSS | PARCIAL (regrediu de novo) | `QuotePage` 502 (era 467), `HomePage` 379, `CommemorativeDatesPage` 350, `CatalogsPage` 303; `styles.css` 6 793 | `wc -l src/pages/*.tsx src/styles.css` | sim (piorou) | ENG |
| PC-12 (= PF-92) | CWV de campo (baseline p75) | NÃO INICIADO | Nenhum registro de baseline | `grep -rln p75 docs/*.md` → só auditorias/plano | não | ENG |
| PC-13 (= PF-92) | Funil/erros/métricas: recepção, dedupe, painel | PARCIAL | `frontend_error` fora do contrato tipado; sem evento de contato/upload de anexo; #168 adicionou funil das landings de ideias; recepção/painel não comprovados | `src/lib/clientObservability.ts:12`; `src/lib/analytics.ts:36-80` (`grep -nE 'contact\|upload\|asset' analytics.ts` = 0) | sim (#168, #172, #175) | ENG |
| PC-14 | Contrato cross-projeto: grants da origem | PARCIAL (parte BLOQUEADA) | Sonda não certifica grants/privileges | `grep -cE 'grant\|privilege' scripts/check-catalog-public-contract.mjs` = 0; #202 só tolera 401 transitório | sim (#202) | ENG + DONO (Promo Gifts) |
| PC-15 (= PF-35) | Política formal de anexos / PDF | PARCIAL | PDF recusado; sem aceite formal, cotas de CPU, CDR | `api/briefing-assets.ts:14,78-80` | não | ENG + DONO |
| PC-16 (= PF-33) | Ciclo LGPD: evento `erased` e homologação | PARCIAL | #161 completa o apagamento (migrations `20261117030000_complete_customer_data_erasure.sql`, `…_repair_incomplete_customer_data_erasure.sql`) e #184 expõe resíduo; evento `'erased'` na timeline continua sem decisão | `grep -rn "'erased'" site-supabase/supabase/migrations` = 0 | sim (#161, #184) | DONO (decisão) |
| PC-17 (= PF-99) | Tag de release | NÃO INICIADO | — | `git ls-remote --tags origin \| grep -v backup` = 0 | não | ENG |
| PC-18 | Janela operacional/limiares/observação | BLOQUEADO (dono) | Nenhum documento | — | não | DONO |
| PC-19 | Higiene de branches | PARCIAL | Heads remotos caíram de 34 para 5 (disciplina cumprida); automação continua só listando | `git ls-remote --heads origin \| wc -l` = 5; `stale-branches.yml:26-36` | sim (limpeza) | ENG |
| PC-20 | Convenção de RPC no template de PR | NÃO INICIADO | — | `grep -niE 'rpc\|convenç' .github/pull_request_template.md` = 0 | não | ENG |
| PC-21 | Recertificação dos `catch`, correlação no worker, lucide | PARCIAL (baixa) | 82 `catch {`; worker loga `requestId` por job; `lucide-react ^1.72.0` | `grep -rn 'catch {' api src --include=*.ts --include=*.tsx \| wc -l` = 82; `api/notifications.ts:201`; `package.json:175` | não | ENG |
| PC-22 | Cache de borda para dados consultados no cliente | PARCIAL (baixa) | HTML/sitemap com `s-maxage`; consultas client-side sem; TTFB não medido | `api/product-page.ts:114`; `api/site-page.ts:122`; `api/sitemap.ts:130,191` | não | ENG |
| PC-23 (= PF-89) | Preview autenticado isolado | BLOQUEADO (custo) | — | `vercel.json:3-5`; `.env.example:41` | não | DONO |
| PC-24 (= PF-86) | Backup/PITR e drill de restore | BLOQUEADO (dono) | `RUNBOOK_BACKUP_RESTORE.md` inexistente; nenhum drill | `ls docs \| grep -iE 'BACKUP\|RESTORE'` → só `RUNBOOK_RESTORE_SITE.md` (22/09) | não | DONO |
| PC-25 (= PF-07) | Ativação Resend/WhatsApp/webhooks/alertas | BLOQUEADO (adiado pelo dono) | Código pronto; `.env.example` ainda com remetente fictício | `.env.example:60` (`atendimento@seudominio.com.br`), `:84-85`; `api/notifications.ts:385` | não | DONO |
| PC-26 (= PF-73) | Cutover `site_api` + Storage mínimo | BLOQUEADO + PARCIAL | Storage continua exigindo `SITE_SUPABASE_SECRET_KEY` | `api/_lib/siteDatabase.ts:59-60,84` | não | DONO + ENG |
| PC-27 (= PF-01) | Encaminhamento ao comercial | PARCIAL-VALIDAÇÃO (depende de estado remoto) | Implementado por #116 (orçamento) e #158 (contato): outbox `commercial_team`, cron `/api/commercial-alerts` a cada 5 min, webhook HTTPS; só funciona com `COMMERCIAL_TEAM_WEBHOOK_URL` em Production (não verificável aqui) | `api/commercial-alerts.ts:32-43`; `api/_lib/commercialTeamAlerts.ts:4-22`; `vercel.json:9,18`; migration `20261106150448_add_commercial_team_quote_alert.sql`; `.env.example:90` | sim (#116, #158) | DONO (URL) |
| PC-28 (= PF-02) | Responsável/estados/SLA por pedido | BLOQUEADO (dono) | — | `grep -rniE 'assigned_to\|\bsla\b\|due_at' site-supabase/supabase/migrations` = 0 | não | DONO |
| PC-29 (= PF-13) | Aceite editorial da cópia de confirmação | BLOQUEADO (dono) | — | `src/pages/QuotePage.tsx` vs `api/notifications.ts` (inalterados no tema; #181/#160 só ajustaram a promessa de WhatsApp) | sim (#160, #181 — texto, não decisão) | DONO |
| PC-30 (= PF-90, PF-72) | Rotinas operacionais recorrentes | NÃO INICIADO | Revisão mensal nunca em produção e **a query continua com `last_autovacuum` duplicado**; rotação sem registro; soak não refeito | `docs/RUNBOOK_REVISAO_MENSAL_BANCO.md:51,72`; `secrets-rotation-reminder.yml`; `scripts/soak-test-notification-queue.mjs:28,32` | não | ENG + DONO |
| PC-31 (= PF-91) | Revisão por pares dos runbooks | NÃO INICIADO | — | `grep -rniE 'revisado por\|revisor:' docs/RUNBOOK_*.md` = 0 | não | PESSOAS |
| PC-32 (= PF-69) | Responsáveis/revisor elegível | BLOQUEADO | Revisor único | `.github/CODEOWNERS:3` | não | DONO |
| PC-33 (= PF-63) | Corpus julgado de relevância (≥30, por SKU, P@5/nDCG) | PARCIAL | #163 levou a 33 intenções (≥30 cumprido); continua por conceito (`expectedConcepts`), sem SKU nem métrica | `src/lib/searchRelevance.ts:6,17-20` (`grep -c 'query:'` = 34; `grep -nE 'sku\|ndcg\|P@5'` = 0) | sim (#163) | DONO + ENG |
| PC-34 (= PF-36) | Dados comerciais/kits e telefone E.164 | BLOQUEADO (decisão) | — | `grep -rniE 'e\.?164' api shared src` = 0 | não | DONO |
| PC-35 (= PF-57) | Acervo (PDFs, revistas, cases) | BLOQUEADO (conteúdo) | — | `ls public/*.pdf` → nenhum; `src/lib/catalogLibrary.ts` → 10 × `format: 'online'`, 0 × `'pdf'` | não | CONTEÚDO |
| PC-36 | Imagem social por coleção/data | PARCIAL | Prévia institucional para todas as páginas curadas | `api/site-page.ts:94,104` (`imageUrl: heroImage()`) | não | ENG + CONTEÚDO |
| PC-37 | Acessibilidade manual | BLOQUEADO (pessoas) | Só axe automatizado | `grep -rl AxeBuilder e2e` | não | PESSOAS |
| PC-38 | Pesquisa com compradores | BLOQUEADO (pessoas) | — | — | não | PESSOAS |
| PC-39 | Homologação real Auth/propostas/links | BLOQUEADO (ambiente) | #200/#201/#206/#199 ampliaram E2E sintético; ensaio real não registrado | `e2e/` (PRs citadas) | sim (E2E, não homologação) | DONO |
| PC-40 (= PF-107/108) | Graphify: corpus documental, vínculo requisito→teste, ensaios adversariais | PARCIAL | Adversarial avançou (36 testes: timeout de subprocesso, trava órfã, falha de tmpdir, EPIPE, `.graphifyignore`); documental e requisito→teste continuam sem código | `tests/graphify-tools.node.mjs` (36 `test(`); `.graphify.project.json` sem `.md` em `sourceRoots` | sim (#194, #196, #198) | ENG |
| PC-41 (= PF-76, PF-83) | Itens do Promo Gifts (`mcp_kv_get`, Fase B, pg_graphql, FKs, policy) | 3 APLICADOS, 1 bloqueado | `mcp_kv` (segredo rotacionado p/ Vault), FKs de kit e policy `system_settings` aplicados e medidos em 2026-11-28; `pg_graphql` segue pendente de confirmação do app de catálogo | `ls docs/sql/canonical-principal/` → `aplicado_etapa39_mcp_kv_vault.sql` + `pendente_*.sql` | sim | — |

### 2.2 Os 8 adiamentos formais (anexo 06 §1b)

| ID | Etapa | Estado HOJE | Evidência | Mudou? |
|---|---|---|---|---|
| PC-A1 | P13:05/06 `noUnused*`/Prettier; `noUncheckedIndexedAccess` | IMPLEMENTADO (flag ativa) + DIVERGÊNCIA documental | `tsconfig.app.json:11`, `tsconfig.node.json:6` = `true`; `docs/PLANO_CORRECOES_50_ETAPAS_20260913.md:100` ainda diz "medida e adiada" | não |
| PC-A2 | P13:19 idempotência WhatsApp | SUPERADA (reconciliação no banco) | `api/notifications.ts` (`dispatch_started`) | não |
| PC-A3 | P16:13/P17:16 índice de claim | SUPERADA | cabeçalho `20260916120000` | não |
| PC-A4 | P16:28/P17:28 token compartilhado | SUPERADA | `docs/DATABASE_FUNCTION_CONTRACTS.md:145` | não |
| PC-A5 | P16:27/P17:27 criptografia de PII (= PF-36) | BLOQUEADO (decisão) | `DATABASE_FUNCTION_CONTRACTS.md:122-143` | não |
| PC-A6 | P16:30 rate limit de borda (= PF-36) | BLOQUEADO (decisão) | `DATABASE_FUNCTION_CONTRACTS.md:192` | não |
| PC-A7 | P16:34/P17:30 `pg_cron` retaguarda | BLOQUEADO (decisão) | `grep -ln 'cron.schedule' site-supabase/supabase/migrations/*.sql` = 0 | não |
| PC-A8 | P13:50 desvios GR14/24/26/30 | SUPERADA | `docs/GOVERNANCA_FECHAMENTO.md:29-32` | não |

### 2.3 Achados dos revisores "nunca corrigidos" (anexo 06 §3) — estado HOJE

| # | Achado | Estado HOJE | Evidência |
|---|---|---|---|
| R1 | Matriz/ledger desatualizada | PARCIAL (só cabeçalho datado, #208) | ver PC-01 |
| R2 | `mcp_kv_get` SECURITY DEFINER | BLOQUEADO (sem recibo) | `docs/sql/canonical-principal/aplicado_etapa39_mcp_kv_vault.sql` |
| R3 | Preview não isolado | BLOQUEADO | PC-23 |
| R4 | Privilégio mínimo / Storage | BLOQUEADO + PARCIAL | `siteDatabase.ts:59-60` |
| R5 | Backup ≠ recuperação | BLOQUEADO | PC-24 |
| R6 | Confirmações/alertas sem ativação | BLOQUEADO | PC-25 |
| R7 | Cron silencioso | PARCIAL (#190) | PC-02 |
| R8 | Diff ACL remoto / default privileges | NÃO INICIADO | PC-03 |
| R9 | Planos contraditórios (= PF-111) | DIVERGÊNCIA persiste | `PLANO_…20260913.md:100` ("adiada", flag ativa); `PLANO_…20260916.md:288-292` checklist `[ ]` em etapa implementada; `PLANO_…20260917.md:500` "✅ integralmente fechada" com Etapa 19 aberta |
| R10 | Gates contornáveis / revisão | PARCIAL | CodeQL fora dos obrigatórios (`release.yml:53`; `github-ci.md:46-47`); revisão com 0 aprovações (`github-ci.md:33`) |
| R11 | Sensibilidade adversarial dos testes de plano SQL | NÃO INICIADO | `grep -rln 'DROP INDEX\|drop index' site-supabase/supabase/tests/database` = 0 |
| R12 | Soak não representa cron real (= PF-94) | NÃO INICIADO | `scripts/soak-test-notification-queue.mjs:28` (lote 25), `:32` (poll 3 s), `:216` (sobrescreve o relatório de 16/09) |
| R13 | Imagem social institucional | PARCIAL | `api/site-page.ts:94,104` |
| R14 | Decomposição por linhas | PARCIAL (regrediu) | PC-11 |
| R15 | Majors ESLint/TS e proteção de peers | PARCIAL (majors adotados; sem matriz/ignore) | PC-09 |
| R16 | Contratos de tipos na API | PARCIAL (quase fechado, #192) | PC-05 |
| R17 | Evento `erased` | PARCIAL (apagamento completo #161; evento sem decisão) | PC-16 |
| R18 | Comercial/SLA/relevância/acervo/pesquisa/a11y | Comercial → PARCIAL-VALIDAÇÃO (#116/#158); relevância → PARCIAL (#163); restante BLOQUEADO | PC-27, PC-33, PC-28, PC-35, PC-37, PC-38 |

**Placar PC (41 pendências):** IMPLEMENTADO 0 · PARCIAL-VALIDAÇÃO 1 (PC-27) · PARCIAL 17 (02, 04, 05, 09, 10, 11, 13, 14, 15, 16, 19, 21, 22, 26, 33, 36, 40) · NÃO INICIADO 8 (03, 06, 07, 08, 12, 17, 20, 30, 31 → 9 contando PC-31) — correção: NÃO INICIADO 9 · BLOQUEADO 14 (18, 23, 24, 25, 28, 29, 32, 34, 35, 37, 38, 39, 41 + PC-26 parte) → 13 puros + 1 misto. Em 11/10: 1 NI/… ; avanço real desde então: PC-02, PC-05, PC-09, PC-10, PC-16, PC-19, PC-27, PC-33, PC-40 (9 itens mexidos, nenhum fechado por completo). Por plano (etapas que ainda têm pendência, contadas pelo mapa §2 do anexo 06 reavaliado hoje): P13 → 17 etapas abertas (13, 27, 29, 30, 31, 35, 36, 37, 39, 40, 41, 42, 43, 46, 47, 48, 49, 50 = 18); P16 → 24 abertas (03, 05, 18, 21, 23, 24, 25, 27, 29, 30, 31, 32, 34, 35, 36, 38, 39, 42, 43, 44, 46, 47, 48, 49, 50 = 25); P17 → 19 abertas (05, 07, 08, 19, 23, 25, 27, 29, 30, 31, 32, 33, 35, 36, 37, 38, 39–44, 47, 48, 49, 50 = 24); P23 → 36 abertas (02, 04, 07, 10, 13–44 exceto 45/48, 46, 47, 49, 50); P24 → 37 abertas (02, 05, 11–47 exceto 21/48, 49, 50). Nenhuma etapa desses cinco planos passou de aberta para CONCLUÍDA desde 11/10; 9 avançaram.

---

## 3. PLANO_GRAPHIFY_50_ETAPAS_20260911 (+ GRAPHIFY.md, IMPLEMENTATION, 09105_EVALUATION, regras-agentes) — 50 etapas

| ID | Etapa | Estado HOJE | O que falta | Evidência | Mudou desde 11/10? | Quem |
|---|---|---|---|---|---|---|
| GR01 | Delimitar a integração | IMPLEMENTADO | — | `scripts/graphify.mjs` `assertSafeRoot`; teste `configuração recusa diretório de saída ou de trabalho fora da raiz` (`tests/graphify-tools.node.mjs`) | sim (teste adicionado) | — |
| GR02 | Linha de base | IMPLEMENTADO | — | `writeProjectMeta` `graphify.mjs:483`; `docs/GRAPHIFY_09105_EVALUATION_20261117.md` | sim (#176) | — |
| GR03 | Perguntas de valor (= PF-108) | PARCIAL | 10 casos cobrem 3 dos 9 temas (sessão, filtros, seleção compartilhada); faltam impacto de QuoteItem, variantes, ajustes, busca, sitemap, isolamento; GR40-10 autorreferente | `docs/graphify-benchmark.json` (10 `id`; perguntas listadas: orçamento, validação, confirmações, sessão, filtro, seleção, Resend, retenção, portal, Graphify) | não | ENG |
| GR04 | Responsabilidades nomeadas | BLOQUEADO (pessoas) | Sem nomes | plano `:43-45` | não | DONO |
| GR05 | Decisão de arquitetura | IMPLEMENTADO | — | `.graphify.project.json` (`automation`), `GOVERNANCA_FECHAMENTO.md:29-32` | não | — |
| GR06 | Fixar ferramenta e ambiente (= PF-106) | PARCIAL | Pin 0.9.105 alinhado em 3 lugares e homologado (#176); `.in` criado (#197); **hashes/transitivas não fixados** — decisão do dono registrada no próprio arquivo | `.graphify.project.json` `graphifyVersion 0.9.105`; `requirements-graphify.txt:6-18`; `requirements-graphify.in` | sim (#147, #176, #197) | DONO → ENG |
| GR07 | Configuração versionada | IMPLEMENTADO (ressalva) | `ciArtifactRetentionDays` nunca é lido | `grep -n ciArtifactRetentionDays scripts/graphify.mjs .github/workflows/graphify.yml` = 0; `graphify.yml:80` fixo 14 | não | ENG |
| GR08 | Corpus inicial | PARCIAL | Documentação fora por decisão | `.graphify.project.json` `sourceRoots`/`databaseSourceRoots` | não | — |
| GR09 | Exclusões e proteção de caminhos (= PF-108) | IMPLEMENTADO | — | #198: `loadGraphIgnorePatterns` `graphify.mjs:183-203`, aplicado em `listSourceFiles` `:223-240`; 3 testes `.graphifyignore …` | sim (#198) | — |
| GR10 | Armazenamento e retenção | IMPLEMENTADO | — | `.gitignore`; `graphify.yml:77-80` | não | — |
| GR11 | Comando de diagnóstico (= PF-106) | PARCIAL (pequeno) | `graph:status` já roda sem `node_modules` (#196: `typescript` sob demanda); `doctor` ainda não checa Python/`tree_sitter_sql` (o CI faz isso fora do wrapper) | `scripts/graphify-quality.mjs:5-21`; `graphify.mjs:890-902`; `graphify.yml:44`; teste `CLI ausente gera instrução de instalação` | sim (#196) | ENG |
| GR12 | Geração estrutural sem IA | IMPLEMENTADO | — | `graphify.mjs:102` (`mode==='code-only'` obrigatório), `:567,582` (`--code-only`) | não | — |
| GR13 | Reconstruir o mapa | IMPLEMENTADO | — | `build()` `:545+`; CI `graphify.yml:53-57` | não | — |
| GR14 | Direção das relações | PARCIAL (substituída por decisão GR14) | Grafo não direcionado | `.graphify.project.json` `limitations.graphDirection`; `GOVERNANCA:29` | não | DONO (decidido) |
| GR15 | Identidades e caminhos | PARCIAL | — | teste `nomes ambíguos … não escolhem resultado arbitrário` | não | ENG |
| GR16 | Evidência por relação | PARCIAL | — | teste `explain preserva fonte e confiança` | não | ENG |
| GR17 | Integridade | IMPLEMENTADO (ressalva: colapso não medido) | — | `validateGraph`; teste `validação do grafo rejeita endpoints ausentes` | não | — |
| GR18 | Comunidades nomeadas | PARCIAL | `cluster-only --no-label` | `graphify.mjs:574,584` | não | ENG |
| GR19 | Saídas úteis | IMPLEMENTADO | — | `graphify-out/{graph.json,GRAPH_REPORT.md,…}` gerados em `build()` | não | — |
| GR20 | Promoção atômica | PARCIAL (melhorou) | Sem simulação de concorrência real; trava órfã e tmpdir cobertos | `graphify.mjs:459-481,510-545`; testes `trava de build órfã…`, `falha ao criar o diretório temporário…` | sim | ENG |
| GR21 | Consultas simples | IMPLEMENTADO | — | `query/path/explain` `:753+` | não | — |
| GR22 | Vocabulário PT-BR | IMPLEMENTADO | — | teste `consulta em português expande termos` | não | — |
| GR23 | Limites de contexto | IMPLEMENTADO | — | `queryTokenBudget 1600`; `DEFAULT_COMMAND_TIMEOUT_MS` `graphify.mjs:55,115-118` | sim (timeout de subprocesso) | — |
| GR24 | Análise de impacto | PARCIAL (decisão GR24) | Vizinhança de 2 saltos com aviso | `graphify.mjs:761-800` (aviso `:772`) | não | DONO (decidido) |
| GR25 | Impacto → testes (= PF-107) | NÃO INICIADO | `impact()` não associa testes | `graphify.mjs:761-863` (`grep -n 'test\|spec'` no corpo = 0) | não | ENG |
| GR26 | Atualização incremental | IMPLEMENTADO por decisão (`update` = rebuild) | — | `GOVERNANCA:31` | não | — |
| GR27 | Renomes/exclusões/branches | PARCIAL | Sem testes dedicados | teste `status sobrevive a arquivo rastreado apagado` cobre parte | sim | ENG |
| GR28 | Verificação de atualidade | IMPLEMENTADO | Não registra árvore suja | `status()` `:618`; `grep -n 'porcelain\|dirty' graphify.mjs` = 0 | não | — |
| GR29 | Instruções aos agentes | IMPLEMENTADO | — | `AGENTS.md` seção "Grafo de código"; `docs/agentes/graphify-regras-agentes.md` | sim (#117–#120) | — |
| GR30 | Fluxo Git local | IMPLEMENTADO por decisão (não instalar) | Hooks do `automation.mjs` são opt-in e não os nativos do Graphify | `GOVERNANCA:32`; `package.json:164` | sim (#131) | — |
| GR31 | Selecionar documentação (= PF-107) | NÃO INICIADO | Nenhum `.md` no corpus | `grep -c '\.md' .graphify.project.json` = 0 | não | ENG |
| GR32 | Separar estrutural/semântico (= PF-107) | PARCIAL | Só estrutural | `graphify.mjs:567` | não | ENG |
| GR33 | Contratos de dados | PARCIAL | SQL em mapa separado | `validateSeparatedCorpora` | não | ENG |
| GR34 | Fronteiras entre bancos (= PF-107) | NÃO INICIADO | — | `grep -ni 'fronteira\|boundary' scripts/graphify.mjs` = 0 | não | ENG |
| GR35 | Implementação × ativação × deploy | PARCIAL | Só avisos textuais | `docs/GRAPHIFY.md:5-14`; regras-agentes | não | ENG |
| GR36 | Requisitos → implementação | PARCIAL | Ledger CSV manual, sem grafo | `scripts/validate-closure-ledger.mjs` | não | ENG |
| GR37 | Memória técnica (= PF-107) | NÃO INICIADO | — | `grep -nci memor scripts/graphify.mjs` = 0 | não | ENG |
| GR38 | Instruções para o time (= PF-106) | PARCIAL | `docs/GRAPHIFY.md` não tem passo de instalação (`pip install -r requirements-graphify.txt`); o hook de sessão instala sozinho e o wrapper orienta em erro | `grep -niE '\bpip\b\|python' docs/GRAPHIFY.md README.md` = 0; `.claude/hooks/session-start.sh:71-82`; `graphify.mjs:138` | sim (#171 declarou o pin) | ENG |
| GR39 | Visualização local | PARCIAL | HTML nativo; filtros/acessibilidade não testados | `graph.html`/`GRAPH_TREE.html` | não | ENG |
| GR40 | Métricas de utilidade | PARCIAL | `directFound` trivial; sem tempo/contexto | `graphify.mjs:721,735` | não | ENG |
| GR41 | Workflow no GitHub | IMPLEMENTADO | — | `graphify.yml` | sim (#179 rótulos) | — |
| GR42 | Permissões e artefatos (= PF-108) | IMPLEMENTADO | — | #194: scanner cobre `sb_secret_`, `re_`, `whsec_`, JWT (`graphify.mjs:64-71`); 3 testes `varredura …`; `graphify.yml:16-17,28-31,77-80` | sim (#194) | — |
| GR43 | Gatilhos e cache (= PF-108) | PARCIAL | Sem `paths:` (roda em PR só de docs); sem cache do grafo | `graphify.yml:3-7,35,39-40` | não | ENG |
| GR44 | Relatório base/head (= PF-108) | PARCIAL | Sem módulos afetados/testes sugeridos; não vai ao `$GITHUB_STEP_SUMMARY` | `graphify.mjs:351-379`; `graphify.yml:58-72` | não | ENG |
| GR45 | Conteúdo hostil | PARCIAL | Scanner e symlink cobertos; sem fixtures de HTML/comentários hostis | testes `varredura …` (4), `CLI chamado por caminho com symlink …` | sim (#194) | ENG |
| GR46 | Falhas e concorrência | PARCIAL (melhorou) | Timeout, trava órfã, tmpdir, EPIPE cobertos; disco cheio e interrupção não | testes `subprocesso travado …`, `trava de build órfã …`, `saída cortada … EPIPE` | sim | ENG |
| GR47 | Cobertura e precisão | PARCIAL | Sem auditoria de precisão/aliases | benchmark 10/10 apenas | não | ENG |
| GR48 | Desempenho | PARCIAL | Sem cronometragem registrada; `timeout-minutes: 10` e timeout de 10 min por subprocesso sem base | `graphify.yml:23`; `graphify.mjs:55` | sim | ENG |
| GR49 | Recuperação e atualização | PARCIAL | Avaliações 0.9.68/0.9.94/0.9.105 feitas; `.previous` apagado após sucesso; restauração não ensaiada | `docs/GRAPHIFY_0968_…`, `_0994_…`, `_09105_EVALUATION_20261117.md`; `graphify.mjs:514-545` | sim (#176) | ENG |
| GR50 | Publicar e acompanhar | PARCIAL | Lote 4 ainda aberto | — | — | ENG |

**Placar GR (50 etapas, HOJE):** IMPLEMENTADO 19 (01, 02, 05, 07, 09, 10, 12, 13, 17, 19, 21, 22, 23, 26, 28, 29, 30, 41, 42) · PARCIAL 26 · NÃO INICIADO 4 (25, 31, 34, 37) · BLOQUEADO 1 (04). Em 11/10 era 17/29/4. Fechadas desde então: GR09 (#198) e GR42 (#194); avançaram sem fechar: 06, 11, 20, 23, 38, 45, 46, 49.

---

## 4. Novos itens não cobertos por PF-xx

| ID | Funcionalidade/regra planejada | Estado HOJE | O que falta | Evidência | Mudou? | Quem |
|---|---|---|---|---|---|---|
| NOVO-WF-01 | Padrão dos workflows (`ubuntu-24.04`, `defaults.run.shell: bash`, pins unificados) aplicado ao workflow novo | DIVERGÊNCIA (regressão de WF03/WF54) | `automation-local.yml` usa `ubuntu-latest`, `setup-node` pinado em SHA diferente (`# v6`) e sem `defaults:`; #179 unificou só o rótulo do `checkout` | `automation-local.yml:25,33`; `grep -c defaults: automation-local.yml` = 0 | sim (#131) | ENG |
| NOVO-WF-02 | Release aplica migrations com credencial de DDL (`SITE_SUPABASE_DB_URL`) — lembrete de rotação, runbooks e preflight ignoram a nova credencial | PARCIAL | Incluir em `secrets-rotation-reminder.yml`, `RUNBOOK_ROTACAO_SEGREDOS.md`, `RUNBOOK_RELEASE.md`; preflight (WF02) | `release.yml:79-103`; `secrets-rotation-reminder.yml:37-40`; `RUNBOOK_RELEASE.md:11` | sim (#165) | ENG |
| NOVO-WF-03 | Composite `setup-node-project` com pin próprio (`setup-node` v7.0.0) divergente dos workflows (v7.1.0) — Dependabot não atualiza porque ninguém o usa | DIVERGÊNCIA | Usar ou remover | `.github/actions/setup-node-project/action.yml:15` vs `quality.yml:32` | não | ENG |
| NOVO-WF-04 | `release.yml` espera 4 gates hard-coded; o check `Contratos da automação local` (novo) e CodeQL não entram nem na espera nem na proteção | PARCIAL | Decidir se `automation-local` vira obrigatório; alinhar `release.yml:53`, proteção e `github-ci.md:29` | `release.yml:53`; `automation-local.yml:23-24` | sim (#131) | ENG + DONO |
| NOVO-WF-05 | `.github/CODEOWNERS` afirma "requer aprovação de @adm01-debug"; `github-ci.md:33,37` e AGENTS.md dizem que a aprovação não é exigida | DIVERGÊNCIA (comentário) | Corrigir o comentário do arquivo | `.github/CODEOWNERS:1-2` | não | ENG |
| NOVO-WF-06 | `db:site:dry-run` usa `npx supabase@latest` enquanto CI/release fixam `2.115.0` | DIVERGÊNCIA | Pinar | `package.json:124`; `database.yml:36`; `release.yml:78` | não | ENG |
| NOVO-PC-01 | Soak test sobrescreve relatório datado (`RELATORIO_SOAK_TEST_FILA_20260916.md`) a cada execução | DIVERGÊNCIA | Datar a saída | `scripts/soak-test-notification-queue.mjs:216-217` | não | ENG |
| NOVO-PC-02 | `RUNBOOK_REVISAO_MENSAL_BANCO.md` — bug `last_autovacuum, last_autovacuum` na query (deveria incluir `last_vacuum`/`last_autoanalyze`) | DIVERGÊNCIA | Corrigir query | `docs/RUNBOOK_REVISAO_MENSAL_BANCO.md:51` | não | ENG |
| NOVO-PC-03 | Alerta comercial exige `COMMERCIAL_TEAM_WEBHOOK_URL`; sem ela o job fica na outbox e `commercialAlertsEnabled()` retorna false silenciosamente — mesmo padrão do "silêncio operacional" de PF-88 | PARCIAL | Alerta/medição quando a URL está ausente em Production | `api/_lib/commercialTeamAlerts.ts:20-22`; `.env.example:90` | sim (#116) | ENG + DONO |
| NOVO-GR-01 | `requirements-graphify.txt` com hashes depende de ajustar o leitor `sed` de `session-start.sh:73` (`graphifyy\[sql\]==`) | BLOQUEADO (decisão do dono, registrada no arquivo) | Decidir e aplicar junto | `requirements-graphify.txt:6-16`; `.claude/hooks/session-start.sh:73` | sim (#197) | DONO |
| NOVO-GR-02 | `graphify.yml` instala CLI e valida `tree_sitter_sql` fora do wrapper; `doctor` não repete a checagem localmente | PARCIAL | `doctor` checar `python -c 'import tree_sitter_sql'` | `graphify.yml:44`; `graphify.mjs:890-902` | não | ENG |

---

## 5. Divergências documento × código

1. `docs/RUNBOOK_RELEASE.md:11` ("A integração Supabase aplica migrations") × `release.yml:79-103` (o workflow aplica, com dry-run e guard de ref) — runbook de 23/09 nunca atualizado após #165.
2. `docs/RUNBOOK_RELEASE.md:15-16,36-38` rollback manual × `release.yml:289-319` rollback automático dos dois aliases.
3. `.github/CODEOWNERS:1-2` ("requer aprovação") × `docs/agentes/github-ci.md:33,37` (0 aprovações; `require_code_owner_reviews=false`).
4. `docs/PLANO_CORRECOES_50_ETAPAS_20260913.md:100` (`noUncheckedIndexedAccess` "adiada") × `tsconfig.app.json:11`/`tsconfig.node.json:6` (`true`).
5. `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md:500` ("Fase 3 integralmente fechada") × Etapa 19 (revisão mensal) sem execução (`RUNBOOK_REVISAO_MENSAL_BANCO.md:72`).
6. `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md:288-292` checklist `[ ]` em etapa implementada (`20260916100000`).
7. `docs/RUNBOOK_RESTORE_SITE.md:15` ("19 tabelas") e `RUNBOOK_VERIFICACAO_DB.md` ("17 tabelas") × dicionário com 21 `site_private.*` (não recontado hoje; arquivos inalterados desde 22/09 e 30/09).
8. `docs/RUNBOOK_ROTACAO_SEGREDOS.md` (16/09) não cita `SITE_SUPABASE_DB_URL`, `COMMERCIAL_TEAM_WEBHOOK_URL`, `RESEND_WEBHOOK_SECRET`, `WHATSAPP_*`; `secrets-rotation-reminder.yml:37-40` cita só 2 segredos.
9. `docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv` (22/09) × 111 commits posteriores; GR03/06/11/38 marcados "I" na matriz continuam PARCIAL; GR14/24/40/44 "I" valem como atendidos no escopo estrutural que `docs/GOVERNANCA_FECHAMENTO.md:22-34` adota como especificação (as linhas GR14/GR24/GR40/GR44 da tabela §3 registram só melhorias além desse escopo); GR09 e GR42 agora de fato I; GR25/31/34/37 marcados "P" estão NÃO INICIADO.
10. `docs/PLANO_WORKFLOWS_100_ETAPAS_20260927.md:75` ("6 workflows") × 15 workflows hoje; o plano não cobre `contexto.yml`, `inventario-estado-semanal.yml`, `automation-local.yml`, `catalog-contract.yml`, `ci-health.yml`, `production-drift.yml`, `secrets-rotation-reminder.yml`, `stale-branches.yml`, `workflows-lint.yml`.
11. `docs/audits/pending-features-20261011/04-workflows-ci-operacao.md` item 29 afirma que `paths-ignore` "não é input documentado de `codeql-action/init`"; #154 manteve o input e só corrigiu as aspas — a eficácia não foi comprovada em nenhum dos dois documentos (ver Não verificado).
12. `scripts/soak-test-notification-queue.mjs:216` regrava `docs/RELATORIO_SOAK_TEST_FILA_20260916.md` — a data do nome não corresponde ao conteúdo após qualquer nova execução.

---

## 6. Não verificado (motivo)

- **WF01, WF09, WF31, WF33, WF34, WF39, WF47, WF64, WF74–WF79, WF83 (labels)**: dependem de Settings do GitHub/Vercel; não consultei API. Para 31/33/76/77 usei a declaração de `docs/agentes/github-ci.md` (leitura de 08/11) e do AGENTS.md (#149) como referência, não como prova.
- **WF29**: se `paths-ignore` é input aceito pela `codeql-action/init@33d7b85…` e se os alertas em `docs/` deixaram de abrir após #154 — `gh api` ao repositório upstream não respondeu nesta sessão; alertas são estado remoto.
- **WF07/PF-93 (rollback) e WF100**: ausência de ensaio só pode ser confirmada por histórico de runs (remoto).
- **PC-27/PF-01**: presença de `COMMERCIAL_TEAM_WEBHOOK_URL` em Production e entregas reais do cron `/api/commercial-alerts` (logs Vercel).
- **PC-02/PF-87**: efeito do #190 em produção (logs do cron sem provedor) — remoto.
- **PC-04**: conteúdo real dos "lints" publicados na branch `contexto` (não fiz `git fetch origin contexto`; o brief limitou o escopo a HEAD).
- **PC-17**: `git ls-remote --tags origin` retornou vazio após filtrar `backup/`; não distingui "sem tags" de falha de rede silenciosa (o `--heads` na mesma sessão retornou 5, então a rede funcionou).
- **Divergência 7**: não recontei as tabelas `site_private.*` no dicionário hoje; baseio-me nos arquivos de runbook inalterados desde 22/09 e 30/09.
- **Suítes**: nenhum teste foi executado; contagens (`36 test(` em `tests/graphify-tools.node.mjs`, `34 query:` em `searchRelevance.ts`) são por `grep`, não por run.