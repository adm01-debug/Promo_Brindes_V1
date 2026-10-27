# Auditoria D — Operação, CI/CD, runbooks e integrações (Promo Brindes V1)

Data da auditoria: 11/10/2026. Base: `main` em `3f82233` (06/10/2026). Modo: **somente leitura** — nenhum arquivo do repositório foi alterado, nenhum commit.

## 0. Método e fontes

- Leitura integral de: `docs/PLANO_WORKFLOWS_100_ETAPAS_20260927.md`, `docs/REVISAO_WORKFLOWS_100_20260928.md`, os 11 `docs/RUNBOOK_*.md`, `docs/RELATORIO_SOAK_TEST_FILA_20260916.md`, `docs/GOVERNANCA_FECHAMENTO.md`, `vercel.json`, os 12 `.github/workflows/*.yml`, `.github/{dependabot.yml,CODEOWNERS,pull_request_template.md,ISSUE_TEMPLATE/*,actions/setup-node-project/action.yml}`, `scripts/*.mjs`, `package.json`, `.env.example`, `api/notifications.ts`, `api/notification-events-{resend,whatsapp}.ts`, `api/retention.ts`, `api/_lib/operationalAlerts.ts`, `api/_lib/siteDatabase.ts`, migrations relevantes.
- **Verificação remota somente leitura (11/10/2026)** para itens que não vivem no repositório:
  - GitHub API: repo (`security_and_analysis`, merge settings), proteção de `main`, rulesets, Actions permissions, Environments e seus secrets, variáveis de Actions, execuções de `release.yml`, `production-drift.yml`, `ci-health.yml`, `catalog-contract.yml`, `secrets-rotation-reminder.yml`, issues abertas.
  - Vercel API: projeto `prj_LVKX7uhs1VhTjDDznD7KinvjgHXU` (nodeVersion), deployment de produção `dpl_9UnjdtnaetTGJ4XNM62x6eMriq1D` (SHA), runtime logs de produção (72 h).
  - **Não foi possível** listar as variáveis de ambiente da Vercel (`403 forbidden` em `GET /v10/projects/{id}/env`). Portanto, a presença/ausência real de `RESEND_*`, `WHATSAPP_*`, `OPERATIONS_ALERT_*`, `SITE_SUPABASE_SERVICE_JWT` em produção é **inferida** (logs + documentos de decisão), não lida.
- Comparação com a revisão de 28/09 (`REVISAO_WORKFLOWS_100_20260928.md`: 11 T / 38 P / 43 N / 6 E / 2 D). Desde então `release.yml` foi reescrito (commits `a30bb07`…`9ee6487`, 28–30/09) e a Vercel passou a Node 24.

Legenda de classificação: **CONCLUÍDA** (entregue e verificável) · **PARCIAL** (existe, mas incompleto/defeituoso) · **NÃO INICIADA** · **BLOQUEADA-EXTERNA** (depende de decisão [D] do responsável, provedor ou outra etapa bloqueada).

---

## 1. As 100 etapas do plano de workflows — estado real

**Contagem atual: 21 CONCLUÍDAS · 29 PARCIAIS · 42 NÃO INICIADAS · 8 BLOQUEADAS-EXTERNAS.**
(Das 42 não iniciadas, 9 são apenas cliques em Settings do GitHub, custo ~zero: 31, 32, 33, 34, 39, 76, 77, 78, 79.)

### Fase A — Destravar a publicação (1–10)

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| 01 · `VERCEL_TOKEN` válido [D] | CONCLUÍDA | Recomendação era conta de serviço; deploys são criados pelo usuário pessoal `adm01-5665` (decisão de identidade não registrada). | Últimos 7 runs de `release.yml` = success (06/10, ex. run 37488430448); deployment `dpl_9Unj…` `source: cli`, `creator: adm01-5665` (API Vercel). |
| 02 · Preflight de credenciais como 1º passo | PARCIAL | `SUPABASE_ACCESS_TOKEN` só é testado após até 30 min de espera de gates; `VERCEL_TOKEN` só no job `deploy-vercel` (após gates+ledger); não há `vercel whoami`/GET projeto antes dos gates. | `release.yml:48-76` (gates primeiro), `:82` (teste do token Supabase), `:144` e `:164` (teste do token Vercel). |
| 03 · `defaults.run.shell: bash` | CONCLUÍDA | — | Todos os 12 workflows declaram `defaults.run.shell: bash` (ex. `release.yml:12-14`, `quality.yml:12-14`). |
| 04 · Eliminar `| tee` crítico | CONCLUÍDA | Efeito colateral: logs do pgTAP/lint só vão para artefato (não aparecem no console em falha). | `database.yml:44,48` (redirecionamento sem pipe); `quality.yml:64-67` (`set -o pipefail` + `tee`); `release.yml` sem `tee`. |
| 05 · Capturar URL do deploy sem pipe | CONCLUÍDA | — | `release.yml:173-189` (`--json` → `jq -er` → `$GITHUB_OUTPUT`). |
| 06 · Deploy → smoke → promote | CONCLUÍDA | — | `release.yml:158-208` (`--prod --skip-domain`, smoke do candidato `:190-196`, `vercel promote` `:207`). |
| 07 · Rollback automático | CONCLUÍDA | Nunca exercitado em produção (sem evidência de execução real). | `release.yml:262-292` (`if: failure() && steps.promote.outputs.attempted == 'true'`, restaura alias público e git-main). |
| 08 · `workflow_dispatch` com `ref`/`skip_gate_wait` | PARCIAL | Dispatch existe sem inputs; `authorize-main` só aceita `refs/heads/main` (republicar SHA antigo impossível; sem `skip_gate_wait`). | `release.yml:6`, `:22-35`. |
| 09 · Produção = `main` | CONCLUÍDA | — | Vercel `dpl_9Unj…` `meta.githubCommitSha = 3f82233…` = HEAD de `main`; drift detector success 07–11/10. |
| 10 · Detector de drift | CONCLUÍDA | — | `production-drift.yml:4-6` (diário 07:00 UTC) + issues de drift/falha; runs 38120521025 (11/10) success. |

### Fase B — Corretude dos workflows (11–30)

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| 11 · Aritmética de timeout | CONCLUÍDA | — | `release.yml:41-43` (`timeout-minutes: 55` para 30+15 min lógicos). |
| 12 · `workflow_run` no lugar de polling | NÃO INICIADA | Continua polling de 90×20 s ocupando runner. | `release.yml:3-6` (só `push`/`workflow_dispatch`), `:54-76`. |
| 13 · Ordenação robusta dos check-runs | PARCIAL | Ainda `sort_by(.started_at)`; não filtra `app.id == 15368`; não pagina (só avisa > 100). | `release.yml:55-60`, `:63`. |
| 14 · `neutral`/`skipped`/`stale` explícitos | PARCIAL | Esses estados continuam "pending" até o timeout de 30 min. | `release.yml:64-68`. |
| 15 · Erro legível da Management API | CONCLUÍDA | — | `release.yml:88-95` (`curl --fail` + `jq` `type == "array"`). |
| 16 · `LC_ALL=C` em `sort`/`comm` | NÃO INICIADA | Locale não fixado. | `release.yml:85,95,96`. |
| 17 · Artefato do DB não mascara causa | CONCLUÍDA | — | `database.yml:43` (`mkdir -p`), `:73-80` (`if: always()`, `if-no-files-found: warn`). |
| 18 · Porta do Postgres derivada do `config.toml` | NÃO INICIADA | Porta fixa (também no soak test). | `tests/queue-concurrency.node.mjs:16`; `scripts/soak-test-notification-queue.mjs:23`; `site-supabase/supabase/config.toml:11`. |
| 19 · Drift de gerados: diff + arquivo regenerado | PARCIAL | Diff só no log; nenhum `drift.patch` no artefato; sem comentário no PR. | `database.yml:49-72`; upload só de `artifacts/database/` (`:78`). |
| 20 · Política de auto-correção [D] | BLOQUEADA-EXTERNA | Decisão não registrada (na prática: nenhum bot). | Ausência de workflow que commite gerados. |
| 21 · Graphify: artefato em falha | CONCLUÍDA | — | `graphify.yml:73-80` (`if: always()`, `warn`, `graphify-out/` inteiro). |
| 22 · Pip com hashes + cache | PARCIAL | Sem `--require-hashes`/transitivas; cache pip e Dependabot pip existem. | `requirements-graphify.txt:4-5` (sem hashes); `graphify.yml:36-43`; `.github/dependabot.yml` (ecossistema pip). |
| 23 · Guarda de base Graphify ausente | NÃO INICIADA | Sem `test -f "$BASE_WORKTREE/scripts/graphify.mjs"` (há guarda só para o grafo de banco). | `graphify.yml:63-72`. |
| 24 · Não rodar Vitest 2× | NÃO INICIADA | Pior que o plano: `validate` roda Vitest 2× e **build 3×** (check, webServer do Playwright, passo de performance). | `quality.yml:51,53,66`; `package.json:24`; `playwright.config.ts:21`. |
| 25 · `npm audit` logo após `npm ci` | CONCLUÍDA | — | `quality.yml:38-39`. |
| 26 · Cache dos browsers Playwright | NÃO INICIADA | Instala Chromium a cada run; o `sudo rm` do repositório do Chrome continua. | `quality.yml:46-50`. |
| 27 · `cross-browser` reaproveita build | NÃO INICIADA | `npm ci` + build próprio via `webServer`. | `quality.yml:114-117`; `playwright.config.ts:20-26`. |
| 28 · Remover permissão não usada | CONCLUÍDA | — | `quality.yml:16-17` (`contents: read`). |
| 29 · CodeQL `security-extended` + `paths-ignore` | PARCIAL | `security-extended` ok; `paths-ignore` não é input documentado de `codeql-action/init` (deveria ir em `config:`), e `'**/*.md'` dentro de bloco `|` leva as aspas literais — exclusão provavelmente ineficaz. | `codeql.yml:45-49`. |
| 30 · Dependency review com licenças | PARCIAL | Falta `fail-on-scopes: runtime`; `pull-requests: write` está no topo do workflow, não no job. | `dependency-review.yml:10-12,26-29`. |

### Fase C — Cadeia de suprimento, segredos e permissões (31–50)

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| 31 · SHA pinning obrigatório | NÃO INICIADA | Settings → Actions. | API: `sha_pinning_required: false` (11/10). |
| 32 · `allowed_actions: selected` | NÃO INICIADA | Settings → Actions. | API: `allowed_actions: all`. |
| 33 · Secret scanning + push protection | NÃO INICIADA | Settings → Code security (repo público, gratuito). | API: `secret_scanning` e `push_protection` `disabled`. |
| 34 · Dependabot security updates | NÃO INICIADA | Settings → Code security. | API `automated-security-fixes`: `enabled: false`. |
| 35 · `harden-runner` | NÃO INICIADA | — | Nenhuma ocorrência em `.github/workflows/`. |
| 36 · `actionlint` + `zizmor` | PARCIAL | Sem `zizmor`; `actionlint` baixado via `curl` sem checksum. | `workflows-lint.yml:29-37`. |
| 37 · CODEOWNERS | CONCLUÍDA | Cobre `*` com um único dono → ver item 74. | `.github/CODEOWNERS:3`. |
| 38 · Segredos no Environment `Production` + `environment:` | NÃO INICIADA | Secrets seguem no nível do repo; jobs sem `environment:`. | API: Environment `Production` com 0 secrets; `release.yml:37-128` sem `environment`. |
| 39 · Política de branch dos Environments | NÃO INICIADA | — | API: `deployment_branch_policy: null` em `Production` e `Preview`. |
| 40 · Conta de serviço Supabase [D] | BLOQUEADA-EXTERNA | PAT pessoal com acesso a todos os projetos (inclusive o canônico) executa SQL via Management API no release. | `release.yml:79-92` (endpoint `/database/query`); RUNBOOK_RELEASE:22-23. |
| 41 · Lembrete trimestral de rotação | PARCIAL | Workflow roda (01/10) mas: sem deduplicação; checklist cobre só `VERCEL_TOKEN`/`SUPABASE_ACCESS_TOKEN` (não os segredos do RUNBOOK); issue #80 (Q4/2026) aberta desde 01/10 sem nenhum item marcado/comentário → rotação não executada. | `secrets-rotation-reminder.yml:6,28-44`; run 36840808991; issue #80. |
| 42 · Limpar `.vercel/` | CONCLUÍDA | — | `release.yml:306-308`. |
| 43 · `persist-credentials: false` | PARCIAL | Faltam `release.yml` (job `verify-db`) e `stale-branches.yml` (explicitamente `true`). | `release.yml:47`; `stale-branches.yml:22-25`. |
| 44 · `permissions: {}` + por job | NÃO INICIADA | Permissões no topo em todos; release sem `deployments: write`. | ex. `release.yml:16-19`; `stale-branches.yml:13-14` (`contents: write` só para listar). |
| 45 · Dependabot refinado | PARCIAL | Faltam `cooldown` e grupo `npm-major`. | `.github/dependabot.yml`. |
| 46 · Limite de PRs Dependabot | CONCLUÍDA | — | `open-pull-requests-limit: 3` nos 3 ecossistemas. |
| 47 · Auto-merge Dependabot [D] | BLOQUEADA-EXTERNA | — | API: `allow_auto_merge: false`; sem workflow. |
| 48 · `npm audit signatures` | PARCIAL | Só no quality e `continue-on-error: true`; ausente em graphify/release. | `quality.yml:40-41`. |
| 49 · SBOM do release | NÃO INICIADA | — | Sem `npm sbom` em `release.yml`. |
| 50 · Gitleaks por evento | PARCIAL | `fetch-depth: 0` sempre; sem varredura semanal agendada. | `quality.yml:24-31`. |

### Fase D — Performance, custo e DRY (51–70)

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| 51 · Composite `setup-node-project` | PARCIAL | Arquivo existe, **nenhum workflow usa**. | `.github/actions/setup-node-project/action.yml`; `grep setup-node-project .github/workflows` = vazio. |
| 52 · npm sem `install -g` | PARCIAL | `npm install --global npm@11.17.0` repetido em 4 lugares; sem corepack. | `quality.yml:37,113`; `graphify.yml:47`; `release.yml:165`. |
| 53 · `.nvmrc`/`engines`/`.npmrc` | PARCIAL | `.nvmrc` = 24.15.0 e `engines` alinhados; `.npmrc` (`engine-strict`) ausente. | `.nvmrc`; `package.json:7-9`. |
| 54 · `ubuntu-24.04` fixo | CONCLUÍDA | — | Todos os 12 workflows (incl. release `:24,40,122`). |
| 55 · `paths-ignore` docs-only + no-op | NÃO INICIADA | PRs só de docs rodam pipeline completo. | `quality.yml:3-6`, `database.yml:3-6`, `graphify.yml:3-6`. |
| 56 · Cache Firefox/WebKit | NÃO INICIADA | — | `quality.yml:115-116`. |
| 57 · `supabase start` mínimo | NÃO INICIADA | Sem `-x` e sem cache Docker. | `database.yml:37-38`. |
| 58 · `supabase/setup-cli` pinado | NÃO INICIADA | — | `database.yml:35-36` (`npm install --global supabase@2.115.0`). |
| 59 · `fetch-depth` por evento | NÃO INICIADA | — | `quality.yml:26`; `graphify.yml:30`. |
| 60 · E2E Chromium em job paralelo | NÃO INICIADA | — | E2E dentro de `npm run check` (`package.json:24`) no job `validate`. |
| 61 · Sharding Playwright (condicional) | NÃO INICIADA | Só se job > 6 min (depende de 60). | — |
| 62 · `concurrency` padronizada | PARCIAL | Padrões diferentes; `dependency-review`, `ci-health`, `stale-branches`, `secrets-rotation` sem `concurrency`. | `quality.yml:9`; `database.yml:9`; `graphify.yml:9`. |
| 63 · Retenção de artefatos por evento | NÃO INICIADA | Fixos 30/30/14/90. | `quality.yml:98,127`; `database.yml:80`; `graphify.yml:80`; `release.yml:117,331`. |
| 64 · Node da Vercel = engines [D] | CONCLUÍDA | — | API Vercel: `nodeVersion: "24.x"`; logs `runtime=nodejs24.x` (11/10). |
| 65 · `timeout-minutes` por passo de rede | NÃO INICIADA | Só timeouts de job. | Nenhum `timeout-minutes` em nível de step nos 12 workflows. |
| 66 · Backoff exponencial | NÃO INICIADA | — | `release.yml:75` (`sleep 20`), `:105` (`sleep 15`). |
| 67 · `$GITHUB_STEP_SUMMARY` em todos | PARCIAL | database, graphify, codeql sem summary; quality repete `${{ job.status }}` para todas as linhas (enganoso). | `quality.yml:70-85`; `release.yml:293-305`. |
| 68 · Relatório Playwright no summary | PARCIAL | Só reporter `github` + HTML em artefato. | `playwright.config.ts:13-15`. |
| 69 · Cobertura com delta vs `main` | NÃO INICIADA | — | — |
| 70 · Métricas de CI semanais | PARCIAL | Diário, últimos 50 runs; sem mediana/p95/minutos; sem `docs/CI_METRICS.md`. | `ci-health.yml:4-6,34-37`; `scripts/ci-health-metrics.mjs`. |

### Fase E — Governança e observabilidade (71–85)

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| 71 · Alerta de falha em `main` [D] | BLOQUEADA-EXTERNA | Canal/destinatário não decididos; só issues GitHub (ci-health/drift). | Sem passo `if: failure()` com canal externo; sem `EVOLUTION_API_KEY`. |
| 72 · Issue automática "Release quebrado" | NÃO INICIADA | Release não tem `issues: write` nem `github-script`. | `release.yml:16-19`. |
| 73 · Badges no README | PARCIAL | 5 de 12 workflows (falta dependency-review dos 6 originais). | `README.md:3-7`. |
| 74 · PR obrigatória [D] | PARCIAL | Proteção exige 1 review de code-owner com `enforce_admins: true`, mas CODEOWNERS tem um único dono (o próprio autor) → viabilidade depende de 2º revisor. | API proteção `main`; `.github/CODEOWNERS:3`. |
| 75 · Squash-only + histórico linear [D] | PARCIAL | `allow_merge_commit`/`allow_rebase_merge` `true`; `required_linear_history: false` (só conversa resolvida ativa). | API repo/proteção. |
| 76 · `delete_branch_on_merge` | NÃO INICIADA | — | API: `false`. |
| 77 · `allow_update_branch` | NÃO INICIADA | Também `strict: false` (RUNBOOK_RELEASE afirma o contrário). | API: `allow_update_branch: false`, `required_status_checks.strict: false`. |
| 78 · Ruleset | NÃO INICIADA | — | API: `rulesets: []`. |
| 79 · CodeQL/Dependency review obrigatórios | NÃO INICIADA | — | API: contexts = `validate`, `Build structural Graphify map`, `Migrations and pgTAP`, `cross-browser`. |
| 80 · Nomes de job estáveis | PARCIAL | `validate`/`cross-browser` sem `name:`; release hard-coda a lista. | `quality.yml:20,100`; `release.yml:53`. |
| 81 · Teste de contrato dos nomes de gate | NÃO INICIADA | `tests/workflow-gates.node.mjs` inexistente; `tests/scripts/release-workflow.test.ts` não compara nomes com a proteção. | `ls tests/`. |
| 82 · Template de PR | CONCLUÍDA | — | `.github/pull_request_template.md`. |
| 83 · Templates de issue | PARCIAL | Existem; usam labels `ci`, `release`, `priority:high` cuja existência não foi verificada. | `.github/ISSUE_TEMPLATE/ci-broken.yml:3-5`, `release-blocked.yml:3-6`. |
| 84 · Deployment status no GitHub | NÃO INICIADA | Depende de 38. | `release.yml` sem `environment:`/`deployments: write`. |
| 85 · Atualizar runbooks | NÃO INICIADA | RUNBOOK_RELEASE/INCIDENTES/ROTACAO não foram tocados desde 23/09 — anteriores ao novo fluxo candidato→smoke→promote→rollback (ver seção 2). | `git log` desses arquivos: último `fd58a5d` (23/09). |

### Fase F — Preview, qualidade contínua e manutenção (86–100)

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| 86 · Preview por PR [D] | BLOQUEADA-EXTERNA | `preview.yml` inexistente; Git integration desligada; banco de preview não provisionado. | `vercel.json:3-5`; RUNBOOK_PREVIEW_ISOLADO:16-18. |
| 87 · Smoke/`@smoke` no preview | BLOQUEADA-EXTERNA | Depende de 86 (poderia ao menos rodar `@smoke` contra o candidato do release). | — |
| 88 · Lighthouse CI | BLOQUEADA-EXTERNA | Depende de 86 (alternativa: rodar contra o candidato não promovido). | — |
| 89 · `db push --dry-run` no PR [D] | BLOQUEADA-EXTERNA | Requer credencial dedicada; `db:site:dry-run` usa `supabase@latest`. | `package.json:43`. |
| 90 · Ordem das migrations vs ledger remoto no PR | NÃO INICIADA | Comparação remota só no release (pós-merge). | `database.yml:31-32` (só nomes locais); `release.yml:77-106`. |
| 91 · Validar `vercel.json` no PR | PARCIAL | `maxDuration` testado; artefato só no release; rewrites/headers/crons sem teste de contrato no PR. | `tests/api/maxDuration.test.ts`; `release.yml:170`. |
| 92 · SHA do build publicado | CONCLUÍDA | — | `release.yml:183-186`, `:218-221`, `:242-245`. |
| 93 · Relatório de branches órfãs | PARCIAL | Lista > 60 dias sem commit (não "mergeadas > 14 dias"); não abre issue; `contents: write` desnecessário. | `stale-branches.yml:13-14,26-36`. |
| 94 · "CI health" que dispara pipelines | PARCIAL | Só lê histórico; não dispara quality/database/graphify em `main`. | `ci-health.yml:29-38`. |
| 95 · `npm run ci:local` | NÃO INICIADA | — | `package.json:11-66` (script ausente). |
| 96 · Hook de pré-commit (opcional) | NÃO INICIADA | Formalmente dispensável: decisão GR30 de não instalar hooks. | `docs/GOVERNANCA_FECHAMENTO.md:32`. |
| 97 · Registrar plano no ledger | NÃO INICIADA | Validador aceita somente 230 IDs UX/LK/GR/AC; WF exigiria mudar o validador. | `scripts/validate-closure-ledger.mjs:35-42`. |
| 98 · Licenças de todo o inventário | NÃO INICIADA | `THIRD_PARTY_NOTICES.md` segue manual. | — |
| 99 · SLO de CI | NÃO INICIADA | Só existe alerta de taxa de falha > 30 % (meta era < 5 %); sem p95/duração. | `ci-health.yml:83-114`. |
| 100 · Fechamento | NÃO INICIADA | `docs/EXECUCAO_WORKFLOWS_<data>.md` inexistente; Environments sem segredos; ruleset ausente; runbooks desatualizados. Parte do critério está cumprida (produção = `main`, release verde). | `ls docs/`. |

**Progresso desde 28/09:** passaram a CONCLUÍDA: 03, 05, 06, 07, 10, 11, 42, 54, 64, 92 (e 09 reconfirmada). A 64 foi resolvida fora do repositório (Vercel 24.x).

---

## 2. Runbooks — procedimentos/automação descritos que não existem ou estão desatualizados

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| RUNBOOK_RELEASE — "proteção exige branch atualizada" | Falso hoje | API: `strict: false`; ou ativar strict ou corrigir texto. | `docs/RUNBOOK_RELEASE.md:9-10`; API proteção. |
| RUNBOOK_RELEASE — rollback manual pós-smoke | Desatualizado | O workflow já faz candidato → smoke → promote → smoke → rollback automático dos dois aliases; runbook descreve rollback manual e não cita alias git-main nem `workflow_dispatch`. | `RUNBOOK_RELEASE.md:15-16,36-38` vs `release.yml:158-292`. |
| RUNBOOK_RELEASE — "integração Supabase aplica migrations" | Automação fora do repo, não verificável | Nenhum workflow aplica migrations; depende da integração GitHub↔Supabase (não documentada/configurada aqui). O release só **verifica** o ledger. | `RUNBOOK_RELEASE.md:11`; `release.yml:77-106`. |
| RUNBOOK_RELEASE — PAT "somente projetos autorizados" | Não implementado | Etapa 40 bloqueada: PAT pessoal com acesso amplo. | `RUNBOOK_RELEASE.md:22-23`. |
| RUNBOOK_RESTORE_SITE — ensaio | **Nunca executado** | Sem registro de drill, RPO/RTO não definidos, responsável/custo não aprovados; nenhum script; PITR não ativo; **Storage (PDFs/anexos) sem qualquer backup** (o runbook admite que a cópia física não inclui Storage). | `RUNBOOK_RESTORE_SITE.md:3,10`; `RUNBOOK_INCIDENTES.md:12-14` ("runbook não é prova de recuperação executada"). |
| RUNBOOK_RESTORE_SITE — "19 tabelas privadas" | Desatualizado | Dicionário atual tem 21 tabelas `site_private`. | `RUNBOOK_RESTORE_SITE.md:15`; `docs/DATABASE_DICTIONARY.md` (21 seções `site_private.*`). |
| RUNBOOK_ROTACAO_SEGREDOS — automação | Inexistente | Rotação 100 % manual; o lembrete (`secrets-rotation-reminder.yml`) lista outros segredos (`VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`) que **o runbook não cobre**, e o runbook cobre segredos que o lembrete não lista (`CRON_SECRET`, `SITE_REQUEST_HASH_SALT`, webhooks). Também não cobre `RESEND_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, `OPERATIONS_ALERT_WEBHOOK_TOKEN`. Issue Q4 #80 sem ação. | `RUNBOOK_ROTACAO_SEGREDOS.md:17-40`; `secrets-rotation-reminder.yml:37-40`; issue #80. |
| RUNBOOK_ROTACAO_SEGREDOS — "CRON_SECRET não precisa de redeploy" | Provavelmente incorreto (verificar) | Na Vercel, variáveis só entram em deployments novos; a função compara com `process.env.CRON_SECRET` do deployment ativo. Trocar sem redeploy tende a gerar 401 no cron. Exigir redeploy (ou `workflow_dispatch` do release). | `RUNBOOK_ROTACAO_SEGREDOS.md:19-22`; `api/notifications.ts:637-641`; `api/retention.ts:108-112`. |
| RUNBOOK_PREVIEW_ISOLADO | Procedimento sem infraestrutura | Não há Preview deploy (git integration off, `preview.yml` inexistente), nem branch Supabase de preview, nem CSP por ref; ensaio autenticado A/B não executado. | `RUNBOOK_PREVIEW_ISOLADO.md:16-18`; `vercel.json:3-5,83`. |
| RUNBOOK_INCIDENTES — alerta de SLA "já dispara" | Não funciona hoje | `OPERATIONS_ALERT_WEBHOOK_URL` adiado; e com provedores desligados o worker retorna 503 **antes** de `reportQueueHealth()` → nenhum cálculo de saúde, nenhum log, nenhum alerta. | `RUNBOOK_INCIDENTES.md:111-116`; `api/notifications.ts:642-646` vs `:689`. |
| RUNBOOK_INCIDENTES — "confirme que o cron está rodando ... logs da função" | Não confirmável | O caminho 503 não emite log; nos últimos 72 h não há nenhum log de `/api/notifications` em produção. | Vercel runtime logs (consulta 11/10); `api/notifications.ts:642-646`. |
| RUNBOOK_INCIDENTES — reprocessar `exhausted` | Manual (SQL direto) | Sem RPC/script dedicado; depende de Studio `service_role`. | `RUNBOOK_INCIDENTES.md:62-67`. |
| RUNBOOK_PEDIDO_TITULAR | Parcialmente automatizado | Remoção de Storage depende do cron de retenção (confirmado rodando diariamente). Ensaio só em banco local; nunca em produção. `DATABASE_FUNCTION_CONTRACTS.md` ainda manda remover objetos manualmente (contradição). | `RUNBOOK_PEDIDO_TITULAR.md:40-44,84-86`; `docs/DATABASE_FUNCTION_CONTRACTS.md:105-121`. |
| RUNBOOK_RECONCILIACAO_LEDGER | Manual + CLI não pinado | `npx supabase@latest` (CI usa 2.115.0); exige link local `.temp/project-ref` (gitignored). Detecção automática existe só no release. Ensaio apenas local (16/09). | `RUNBOOK_RECONCILIACAO_LEDGER.md:13-14,29,43,47,65-69`; `package.json:43`; `.gitignore:16`. |
| RUNBOOK_REVISAO_MENSAL_BANCO | **Nunca executado em produção; sem agendamento** | Nenhum workflow/lembrete mensal; histórico tem 1 linha (16/09, local, sem tráfego). Bug na query: `last_autovacuum` duplicado (deveria incluir `last_vacuum`/`last_autoanalyze`). `pg_stat_statements` não confirmado. | `RUNBOOK_REVISAO_MENSAL_BANCO.md:3,32-33,51,70-72`. |
| RUNBOOK_SITE_API_CUTOVER | Adiado por decisão | Script gerador existe; cutover nunca executado. JWT com TTL 30 d (máx. 90) **sem automação de renovação nem alerta de expiração** — se ativado e expirar, todas as RPCs (inclusive recebimento de orçamento) falham. Storage continua exigindo `SITE_SUPABASE_SECRET_KEY` (menor privilégio incompleto). Dependência do "Legacy JWT Secret" pode ser descontinuada pelo Supabase (verificar). | `RUNBOOK_SITE_API_CUTOVER.md:21-31,59-70`; `scripts/generate-site-api-jwt.mjs`; `api/_lib/siteDatabase.ts:58-59`. |
| RUNBOOK_VERIFICACAO_DB | Manual; credenciais mínimas inexistentes | Pressupõe token "de escopo restrito ao projeto" (não existe — etapa 40) e `SUPABASE_DB_PASSWORD` no cofre; lista "17 tabelas" (hoje 21); passo Security Advisor "não ensaiado". Nenhum desses 5 comandos roda em CI/agenda. | `RUNBOOK_VERIFICACAO_DB.md:10-13,19-27,91-96,113-114`. |
| RUNBOOK_BANCO_PRINCIPAL | Sem fallback de acesso | Acesso só via gateway MCP; achado `mcp_kv_get` segue como "URGENTE" em `docs/sql/canonical-principal/URGENTE_revogar_mcp_kv_get.sql`. Passo 2 (contrato público) agora tem automação diária (`catalog-contract.yml`, verde 07–11/10). | `RUNBOOK_BANCO_PRINCIPAL.md:14-19,76-78`; `catalog-contract.yml:4-5`. |
| RELATORIO_SOAK_TEST_FILA | Validade limitada | Só banco local, nunca em CI; drena com polling de 3 s e lote 25 (o worker real roda a cada 15 min, lote ≤ 10, orçamento 25 s, 8 s/job) → a "margem de ~11×" ignora a cadência real do cron; o script sobrescreve o relatório datado de 16/09 a cada execução. | `scripts/soak-test-notification-queue.mjs:23,26,30,174`; `api/notifications.ts:7,16-17`. |
| GOVERNANCA_FECHAMENTO | Ledger não cobre workflows | Validador fixa 230 IDs (UX/LK/GR/AC); plano de workflows e plano de fechamento 01/10 fora do ledger. | `scripts/validate-closure-ledger.mjs:35-42`. |

---

## 3. Integrações adiadas — código existe? como liga? o que falta?

Decisão registrada: "Resend, WhatsApp, webhooks, alertas e `SITE_SUPABASE_SERVICE_JWT` continuam bloqueados pela decisão registrada" (`docs/EXECUCAO_PLANO_FECHAMENTO_20261001.md:65-66`; `docs/MATRIZ_INDEX.md:35`). **Não há feature flag dedicada: a ativação é implícita pela presença das variáveis de ambiente.**

| Item | Classificação | O que falta para ligar | Evidência |
|---|---|---|---|
| Resend (e-mail de confirmação) | Código pronto, desativado por ausência de env | 1) `RESEND_API_KEY` **e** `SITE_EMAIL_FROM` em Production (Preview é bloqueado por `VERCEL_ENV`); 2) domínio remetente verificado no Resend (SPF/DKIM) — `.env.example` ainda usa `seudominio.com.br`; 3) redeploy; 4) **decidir o backlog**: jobs `pending` não expiram (claim sem corte de idade) → ao ligar, confirmações antigas de todos os orçamentos ainda retidos serão enviadas com atraso; 5) homologação com caixa real; 6) ligar webhook e alertas junto. | `api/notifications.ts:292-320` (envio, `Idempotency-Key`), `:376-386` (`configuredChannels`), `:588-626` (envio imediato no POST do orçamento), `:642-646`; claim sem filtro de idade em `site-supabase/supabase/migrations/20260923200000_enrich_quote_confirmation_contract.sql` (função `claim_site_notification_deliveries`). |
| WhatsApp Cloud API | Código pronto, desativado | 4 variáveis obrigatórias: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_QUOTE_TEMPLATE`, `WHATSAPP_GRAPH_API_VERSION`; template aprovado pela Meta com parâmetros (nome, protocolo, empresa); token de *system user* permanente (token de usuário expira); verificação do Business; só dispara com checkbox de consentimento do cliente. Operação at-most-once exige reconciliação manual (`uncertainCount`). | `api/notifications.ts:322-374`, `:382-383`; `.env.example:56-61`; `RUNBOOK_INCIDENTES.md:80-109`. |
| Webhook Resend (entrega/bounce/complaint) | Código pronto; responde 503 | `RESEND_WEBHOOK_SECRET` (`whsec_…`) + cadastrar `https://<domínio>/api/notification-events-resend` no painel; redeploy. Smoke não cobre o endpoint. | `api/notification-events-resend.ts:58-59,69-71`; `vercel.json:13`. |
| Webhook WhatsApp (delivered/failed) | Código pronto; responde 503 | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (handshake GET) e `WHATSAPP_APP_SECRET` (HMAC `X-Hub-Signature-256`); cadastrar URL no app Meta; rotacionar App Secret afeta outras integrações do mesmo app. | `api/notification-events-whatsapp.ts:79-80,132-133,141`. |
| Alertas operacionais (crons) | Código pronto, desativado; **cobertura incompleta** | `OPERATIONS_ALERT_WEBHOOK_URL` (só HTTPS) e opcional `OPERATIONS_ALERT_WEBHOOK_TOKEN`. Faltam: (a) payload é JSON genérico `{event, occurredAt, details}` — **Slack Incoming Webhook e PagerDuty Events v2 rejeitam esse formato**; precisa de um relay (ex.: n8n) ou adaptador; (b) nenhum alerta quando nenhum provedor está configurado (503 silencioso); (c) sem alerta para falha de webhook (500), falha de recebimento de orçamento, rate limit; (d) sem heartbeat "cron não rodou". | `api/_lib/operationalAlerts.ts:5,7-16,24-32`; `api/notifications.ts:549-581,691-696`; `api/retention.ts:183-187`. |
| Alertas de CI (etapa 71) | Não implementado [D] | Canal/destinatário; hoje só issues GitHub (ci-health > 30 %, drift). | `ci-health.yml:83-114`; `production-drift.yml:71-197`. |
| JWT de role limitada `site_api` | Código pronto, desativado | Gerar com `SITE_SUPABASE_JWT_SECRET` (legacy) via `npm run db:site:generate-site-api-jwt`; setar `SITE_SUPABASE_SERVICE_JWT` (tem precedência); **manter** `SITE_SUPABASE_SECRET_KEY` para Storage; criar rotina de renovação antes do `exp` (30 d padrão) e alerta de expiração — inexistentes. | `api/_lib/siteDatabase.ts:56-88`; `scripts/generate-site-api-jwt.mjs`; `.env.example:40-46`; `RUNBOOK_SITE_API_CUTOVER.md`. |
| Notificação ao time comercial | **Não existe** (não é só "adiada") | O schema prevê `audience in ('customer','commercial_team')`, mas nenhum código enfileira/envia aviso interno de novo orçamento. Confirmar como o comercial descobre leads hoje. | `site-supabase/supabase/migrations/20260908230000_create_site_lead_storage.sql:89`; `grep commercial_team` em `api/`/`src/` = vazio. |

---

## 4. Variáveis de ambiente: código × `.env.example`

### 4.1 Referenciadas no código e ausentes do `.env.example`

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| `CATALOG_SUPABASE_PUBLISHABLE_KEY` | Não documentada (runtime server) | Documentar (override server-side da chave do catálogo; cai para `VITE_SUPABASE_PUBLISHABLE_KEY`). | `api/_lib/catalogValidation.ts:66`. |
| `SITE_PREVIEW_SUPABASE_PROJECT_REF` | Só citada em comentário | Incluir linha comentada explícita (exigida em Preview; sem ela backend falha fechado). | `api/_lib/siteDatabase.ts:71-74`; `.env.example:36`. |
| `VITE_SITE_PREVIEW_PROJECT_REF` | Comentada | OK como está (linha comentada). | `src/lib/siteSupabaseConfig.ts:8`; `.env.example:23`. |
| `VITE_SITE_DEPLOYMENT_ENV` | Injetada no build | Não deve ser setada manualmente — OK. | `vite.config.ts:9`; `src/lib/siteSupabaseConfig.ts:7`. |
| `VERCEL_ENV`, `VERCEL_URL` | Plataforma | OK. | `api/notifications.ts:379`; `api/_lib/siteOrigin.ts:4`. |
| `SITE_SUPABASE_JWT_SECRET`, `SITE_SUPABASE_JWT_TTL_DAYS` | Script local | Documentadas só no runbook de cutover — aceitável. | `scripts/generate-site-api-jwt.mjs`. |
| `SMOKE_BASE_URL`, `SOAK_JOB_COUNT`, `SOAK_FAILURE_RATE`, `GRAPHIFY_BIN` | Scripts/CI | Aceitável; não vão para Vercel. | `scripts/smoke-deployment.mjs:1`; `scripts/soak-test-notification-queue.mjs:24-25`; `scripts/graphify.mjs`. |
| `VITE_BUILD_SOURCEMAP`, `ANALYZE` | Flags de build | Não documentadas em lugar nenhum do `.env.example`. | `vite.config.ts:15,29`. |
| `PLAYWRIGHT_PORT`, `CI`, `NODE_ENV`, `SITE_TEST_APP_SHELL` | Testes | OK. | `playwright.config.ts:3,12-13`; `api/_lib/publicProductPage.ts:117`. |
| CI: `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN` (secrets), `vars.VITE_SUPABASE_URL`, `vars.VITE_SUPABASE_PUBLISHABLE_KEY`, `vars.CODE_SCANNING_ENABLED` | Fora do `.env.example` (esperado) | `vars.CODE_SCANNING_ENABLED` não existe (irrelevante: repo público). | `release.yml:79,140`; `catalog-contract.yml:46-47`; `codeql.yml:32`; API variáveis. |
| GitHub vars `VERCEL_PROJECT_ID`, `VERCEL_SCOPE` | **Configuração morta** | Existem como variáveis do repositório, mas `release.yml` usa literais; usar `vars.*` ou remover. | API variáveis (criadas 29/09); `release.yml:125-128`. |
| `SUPABASE_DB_PASSWORD` | Só em runbook | Necessária para `db lint/query --linked`; sem cofre definido. | `RUNBOOK_VERIFICACAO_DB.md:19-27`. |

### 4.2 No `.env.example` e não referenciadas no código

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| (nenhuma) | OK | Todas as 29 variáveis do `.env.example` têm consumidor em `src/`, `api/` ou `scripts/`. | Varredura `process.env.*`/`import.meta.env.*` (11/10). |

Observação: `VITE_SUPABASE_URL/PUBLISHABLE_KEY/PRODUCT_CATALOG_RESOURCE/PUBLIC_URL` também são lidas **em runtime pelas funções** (`api/sitemap.ts:135-139`, `api/_lib/publicProductPage.ts:63-96`) — precisam existir no ambiente de runtime da Vercel, não só no build. O `.env.example` não menciona isso.

---

## 5. Scripts do `package.json`

### 5.1 Arquivos referenciados

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| 40 referências a `scripts/*.mjs` / `tests/*.node.mjs` | OK | Todas existem. | Verificação programática 11/10. |
| `scripts/sql/verify-shared-selection-contract.sql` | Órfão | Nenhum script/workflow/doc o referencia. | `grep -r verify-shared-selection-contract` = vazio. |
| `db:site:reset/test/lint/types/stop` | Dependência implícita | Exigem binário `supabase` global (não está em `devDependencies`). | `package.json:42-47`. |
| `db:site:dry-run` | Versão não pinada | `npx supabase@latest` vs CI `2.115.0`. | `package.json:43`; `database.yml:36`. |

### 5.2 Scripts que nunca rodam no CI

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| `db:site:soak-test` | Manual | Último registro 16/09, local. | `package.json:40`. |
| `db:site:dry-run`, `db:site:guard` | Manual | Etapa 89 bloqueada. | `package.json:41,43`. |
| `db:site:generate-site-api-jwt` | Manual | Cutover adiado. | `package.json:36`. |
| `db:site:reset/test/lint/stop`, `db:migration-names:check`, `db:site:error-catalog:check`, `check:catalog-contract` | Aliases não exercitados | O CI chama o comando equivalente diretamente; o alias pode divergir sem ser detectado. | `database.yml:32,34,40,44,48`; `catalog-contract.yml:50`. |
| `graph:update/status/query/path/explain/impact/tree/db:*` | Ferramentas locais | Esperado. | `package.json:51-62`. |
| `dev`, `preview`, `test:watch` | Dev | Esperado. | — |
| `ci:local` | Inexistente | Etapa 95. | — |
| Duplicação | Custo | `check` já faz build+budget+e2e; quality repete Vitest (`test:coverage`) e build+budget. | `package.json:24`; `quality.yml:51-67`. |

Scripts usados pelo CI e fora do `package.json` (OK): `ci-health-metrics.mjs` (`ci-health.yml:44`), `normalize-vercel-deployment-url.mjs` (`release.yml:179`), `verify-vercel-artifact.mjs` (`release.yml:170`), `graphify-quality.mjs` (importado por `graphify.mjs`).

---

## 6. Crons, retenção e fila de notificação — está agendado de fato?

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| Cron `/api/retention` (diário 03:00 UTC) | **Agendado e executando** | Nada para agendar; sem alerta ativo em falha (alertas adiados). Todas as contagens = 0 (sem dados expirados ainda). | `vercel.json:7`; logs de produção `site_retention_completed` em 09/10, 10/10 e 11/10 às 03:00:10Z (`dpl_9Unj…`, `nodejs24.x`). |
| Cron `/api/notifications` (`*/15`) | **Declarado; invocações silenciosamente inúteis** | Sem provedor configurado, cada invocação (96/dia) retorna 503 `notification_provider_not_configured` sem log, sem `reportQueueHealth`, sem alerta. Zero logs em 72 h. Fila de confirmações `pending` cresce sem visibilidade. Sugerido: logar/medir saúde da fila mesmo sem provedor. | `vercel.json:8`; `api/notifications.ts:642-646`; Vercel runtime logs (consulta 11/10). |
| Crons em Preview | Não existem | Git integration desligada; crons só no deploy de produção via CLI (release). | `vercel.json:3-5`. |
| Retaguarda `pg_cron` | Adiada formalmente | Backlog explícito; sem `lastRunAt` por origem. | `docs/DATABASE_FUNCTION_CONTRACTS.md:82-103`; nenhuma migration com `cron.schedule`. |
| Heartbeat / verificação de que o cron rodou | Inexistente | Smoke só testa 401 sem segredo; nenhum monitor externo verifica execução. | `scripts/smoke-deployment.mjs:51-54`. |
| Fila: alerta de idade 45 min | Lógica existe, inoperante | Requer provedor + `OPERATIONS_ALERT_WEBHOOK_URL` + formato compatível com destino. | `api/notifications.ts:35,549-581`. |
| Soak test da fila | Local, pontual | Não modela cadência de 15 min nem o orçamento da função. | Seção 2 (último item de soak). |
| Retenção: lote fixo de 100 por execução, timeout 10 s compartilhado | Risco de acúmulo | Se o volume diário expirado > 100 ou a Storage API ficar lenta, acumula (uma execução/dia); sem loop de drenagem. | `api/retention.ts:7-8,119-170`. |
| Monitores agendados do GitHub | Agendados e verdes | ci-health (06:00), production-drift (07:00), catalog-contract (07:30), codeql (seg 04:23), stale-branches (seg 08:00), secrets-rotation (trimestral). | Runs 07–11/10 success (API); `codeql.yml:7-8`; `stale-branches.yml:4-6`. |

---

## 7. Riscos prioritizados (síntese)

1. **Silêncio operacional**: com provedores e alertas adiados, o cron de notificações falha 96×/dia sem log nem alerta, a fila cresce sem medição, e ninguém (nem o comercial) é avisado de novos orçamentos por canal automatizado (`commercial_team` não implementado). Ao ligar o Resend, confirmações antigas serão disparadas em lote (sem corte de idade).
2. **Recuperação não comprovada**: restore nunca ensaiado; Storage sem backup; RPO/RTO indefinidos.
3. **Segredos**: rotação nunca executada (issue #80 parada); lembrete e runbook cobrem conjuntos diferentes; PAT Supabase pessoal com acesso a todos os projetos roda SQL no release; secret scanning/push protection desligados num repositório **público**.
4. **Governança GitHub**: 9 ajustes de Settings de custo ~zero pendentes (31–34, 39, 76–79); runbooks de release/incidentes/rotação desatualizados frente ao `release.yml` atual.
5. **Custo de CI**: Vitest 2× e build 3× por PR, sem cache de browsers, composite não usado, PRs de docs rodando tudo.
