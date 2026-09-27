# Plano de correções e melhorias — GitHub Actions (100 etapas)

Data: 27/09/2026. Escopo: os 6 workflows em `.github/workflows/`, `dependabot.yml`, a
proteção de `main`, os Environments do GitHub e a integração com Vercel/Supabase que eles
acionam. **Nenhuma etapa foi executada.** Somente leitura de código, logs de execução,
configuração do repositório e estado da Vercel.

## 1. Estado observado (evidência)

| Item | Valor observado |
|---|---|
| Workflows | `codeql.yml`, `database.yml`, `dependency-review.yml`, `graphify.yml`, `quality.yml`, `release.yml` + Dependabot |
| Execuções totais | 1019 desde 08/09; últimas 100 analisadas (24/09 → 27/09) |
| `Release isolated database then Vercel` | **9 execuções, 9 falhas (100 %)** — todas no passo 6 "Build the exact tested revision for production" |
| Causa atual do release (run 36343017779, 27/09 19:12) | `vercel project inspect` → `Error: Not able to load user because of unexpected error: User not found. (404)` — o `VERCEL_TOKEN` (atualizado 27/09 17:43) não pertence a um usuário válido do time `juca1` |
| Causa anterior (run 35997911789, 24/09) | `Could not retrieve Project Settings` — corrigida pela PR #52 (`--scope`/`--project`), mas o token continuou inválido |
| Tempo desperdiçado por release | ~7 min esperando gates (19:04:49 → 19:11:37) antes de descobrir o token quebrado |
| Produção real (Vercel) | Último deploy `7e0f18b` (PR #51), publicado **manualmente** pelo usuário `adm01-5665` às 17:37 de 27/09; `main` está em `398c875` (PRs #52 e #53 **não publicados**) |
| Node na Vercel | `nodeVersion: 22.x`; `package.json` exige `>=24.15.0 <25`; CI usa 24.15.0; `.nvmrc` diz 22.13.1 |
| Quality gate | 18 ✅ / 1 ❌ / 1 cancelado — falha por `npm@11.17.0` em Node 22 (`MODULE_NOT_FOUND promise-retry`), corrigida em `211f991` |
| Isolated site database | 18 ✅ / 1 ❌ — drift de `docs/DATABASE_DICTIONARY.md` exigiu commit extra (`2a4a213`) |
| Graphify | 19 ✅ / 1 ❌ — mesma causa do Node 22 |
| CodeQL / Dependency review | 20 ✅ / 11 ✅ |
| Proteção de `main` | checks obrigatórios: `validate`, `cross-browser`, `Migrations and pgTAP`, `Build structural Graphify map`; **sem PR obrigatória**, sem resolução de conversas, sem histórico linear; CodeQL não é obrigatório |
| Rulesets | nenhum |
| Segredos | `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN` no nível do repositório; Environments `Production` e `Preview` existem, **vazios e não referenciados** |
| Actions permissions | `allowed_actions: all`, `sha_pinning_required: false` (workflows já pinam SHA) |
| Segurança do repositório | secret scanning e push protection **desabilitados**; Dependabot security updates **desabilitado**; alerts habilitados |
| Repositório | público, `allow_merge_commit: true`, `delete_branch_on_merge: false`, `allow_update_branch: false` |

### Achados estruturais (não aparecem nos logs porque nunca falharam "de verdade")

- **F-01 · Crítico · pipes engolem falhas.** Nenhum workflow declara `shell: bash`; o padrão do
  GitHub para `run` sem `shell` é `bash -e {0}` **sem `pipefail`**. Todo passo `cmd | tee arquivo`
  devolve o exit code do `tee` (0). Afetados: `database.yml:38` (pgTAP), `database.yml:42`
  (lint do banco), `quality.yml:53` (orçamento de performance), `release.yml:95` (deploy),
  `release.yml:97` (smoke). Um pgTAP vermelho ou um smoke falho hoje deixam o job verde.
- **F-02 · Crítico · produção fora do pipeline.** O deploy manual de 27/09 pulou a verificação do
  ledger de migrations e o smoke; `main` e produção divergem em 2 PRs.
- **F-03 · Alto · smoke depois da promoção.** `vercel deploy --prod` troca a produção antes do
  smoke; rollback é manual (RUNBOOK_RELEASE).
- **F-04 · Alto · timeout aritmético.** Espera de gates (90 × 20 s = 30 min) + ledger (60 × 15 s
  = 15 min) = 45 min = `timeout-minutes: 45`. Em dia lento o job morre antes do build.
- **F-05 · Alto · nomes de job literais.** `release.yml:33` e a proteção de `main` dependem dos
  nomes `validate`, `cross-browser`, etc. Um rename quebra o release por timeout silencioso.
- **F-06 · Alto · sem alerta.** 9 falhas consecutivas de release em 3 dias sem notificação.
- **F-07 · Médio · trabalho duplicado.** `npm run check` roda `vitest run` e depois `test:coverage`
  roda de novo; `cross-browser` refaz `npm ci` + build; Playwright reinstala browsers a cada run.
- **F-08 · Médio · drift sem ajuda.** Passos de drift falham sem mostrar o diff nem entregar o
  arquivo regenerado.
- **F-09 · Médio · runtime inconsistente.** Node 24 no CI, 22.x na Vercel (funções `api/**` rodam
  em 22), `.nvmrc` 22.13.1, `engines` exige 24.
- **F-10 · Baixo · artefato de falha.** `graphify.yml` só sobe artefato `if: success()`;
  `database.yml` usa `if-no-files-found: error` com `if: always()` e pode mascarar a causa raiz.

Legenda: **[D]** = exige decisão de negócio do Joaquim antes de executar. Sem marcação = execução
autônoma via MCP em branch própria + PR.

---

## 2. Plano — Fase A · Destravar a publicação (P0)

### 1 · Emitir `VERCEL_TOKEN` válido para o time `juca1` **[D]**
Corrige: falha 100 % do release (`User not found (404)`).
Onde: secret `VERCEL_TOKEN` → Environment `Production` (etapa 38) · Vercel → Account Settings → Tokens.
Ação: gerar token na conta que hoje faz os deploys manuais (`adm01-5665`, membro do time) ou em conta de serviço do time; gravar no GitHub.
Decisão: conta pessoal vs. conta de serviço. Recomendação: conta de serviço com papel *Member*, sem 2FA compartilhado.
Verificação: `vercel whoami --token` e `vercel project inspect prj_LVKX7uhs1VhTjDDznD7KinvjgHXU --scope juca1` retornam 200 no runner; release verde no SHA de `main`.

### 2 · Preflight de credenciais como primeiro passo do release
Onde: `release.yml`, novo passo antes de "Wait for every protected main-branch gate".
Ação: `vercel whoami` + `GET https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF` com mensagens `::error::` em PT-BR distinguindo token ausente, inválido e sem acesso ao projeto.
Efeito: falha em ~20 s em vez de ~7 min.

### 3 · `defaults.run.shell: bash` em todos os 6 workflows
Corrige: F-01.
Onde: `codeql.yml`, `database.yml`, `dependency-review.yml`, `graphify.yml`, `quality.yml`, `release.yml`.
Verificação: passo temporário `false | tee /dev/null` deve falhar; remover após confirmar.

### 4 · Eliminar `| tee` nos passos críticos
Onde: `database.yml:38,42` · `quality.yml:53` · `release.yml:95,97`.
Ação: redirecionar com `> arquivo 2>&1; status=$?; cat arquivo; exit $status` ou `set -o pipefail` explícito no passo. Complementa a etapa 3 (defesa em profundidade).

### 5 · Capturar a URL do deployment sem pipe
Onde: `release.yml:95`.
Ação: `url="$(vercel deploy ...)"`; `test -n "$url"`; gravar em `$GITHUB_OUTPUT` e em `deployment-url.txt`.

### 6 · Deploy → smoke → promote (smoke antes da promoção)
Corrige: F-03.
Onde: `release.yml` passos 6–7 · `scripts/smoke-deployment.mjs` (aceitar `SMOKE_BASE_URL` da URL do deployment).
Ação: `vercel deploy --prebuilt` (sem `--prod`) → smoke na URL retornada → `vercel promote <url> --scope juca1`.
Risco: proteção de deployment da Vercel bloqueando a URL não promovida — hoje `passwordProtection`/`ssoProtection` estão desativados; ok.

### 7 · Rollback automático se o smoke pós-promoção falhar
Onde: `release.yml`, passo `if: failure() && steps.promote.outcome == 'success'`.
Ação: `vercel rollback --scope juca1 --yes` para o candidato anterior; job termina em falha com aviso.

### 8 · `workflow_dispatch` no release
Onde: `release.yml` `on:`.
Ação: input `ref` (default `main`) e input booleano `skip_gate_wait` (default `false`, só para reprocessar SHA já verde).
Efeito: republicar sem commit vazio; necessário para a etapa 10.

### 9 · Reconciliar produção com `main`
Depende de: 1–8.
Ação: disparar o release em `398c875` (ou HEAD atual); confirmar `latestDeployment.meta.githubCommitSha == main`.
Verificação: `vercel inspect` + smoke + `curl -I https://promo-brindes-v1.vercel.app`.

### 10 · Detector de drift produção × `main`
Corrige: F-02 (detecção; o bloqueio depende de papéis na Vercel).
Onde: novo `production-drift.yml` (`schedule` diário + `workflow_dispatch`).
Ação: comparar `githubCommitSha` do deployment de produção (API Vercel) com `main`; abrir/atualizar issue "Produção divergente de main" se diferente.

## 3. Fase B · Corretude dos workflows existentes

### 11 · Corrigir a aritmética de timeout do release
Corrige: F-04.
Onde: `release.yml:20,34,60`.
Ação: `timeout-minutes: 60` e espera de gates limitada a 20 min (ou substituída pela etapa 12).

### 12 · Substituir polling por `workflow_run`
Onde: `release.yml` `on:`.
Ação: `workflow_run: workflows: [Quality gate, Isolated site database, Graphify structural map], types: [completed], branches: [main]`; primeiro job verifica via API que os 3 concluíram `success` para o mesmo `head_sha` antes de prosseguir.
Efeito: zero minutos de runner ocioso; elimina o loop `sleep 20`.
Risco: `workflow_run` dispara 3× (uma por workflow) — usar `concurrency: production-release-${{ github.event.workflow_run.head_sha }}` e sair cedo se algum gate ainda estiver pendente.

### 13 · Ordenação robusta dos check-runs
Onde: `release.yml:38`.
Ação: `sort_by(.id)` em vez de `sort_by(.started_at)` (nulo em re-execuções) e filtrar `app.id == 15368` (GitHub Actions) para ignorar checks homônimos de outros apps.

### 14 · Tratar `neutral`, `skipped` e `stale` explicitamente
Onde: `release.yml:39–43`.
Ação: `skipped`/`neutral` de um gate obrigatório = falha imediata com mensagem; hoje ficam "pending" até o timeout.

### 15 · Ledger: erro legível quando a Management API nega acesso
Onde: `release.yml:66`.
Ação: validar `jq 'type == "array"'`; se objeto com `message`, imprimir a mensagem (sem token) e sair com código próprio.

### 16 · Ledger: `LC_ALL=C` no `sort`/`comm`
Onde: `release.yml:58,66,67`.
Ação: fixar locale para evitar divergência de ordenação entre runner e `comm`.

### 17 · `database.yml`: artefato não pode mascarar a causa raiz
Corrige: F-10.
Onde: `database.yml:64–70`.
Ação: `mkdir -p artifacts/database` como primeiro passo; `if-no-files-found: warn`.

### 18 · `database.yml`: porta do Postgres a partir do `config.toml`
Onde: `tests/queue-concurrency.node.mjs:16` (hard-code `56322`).
Ação: ler `supabase status -o env` ou `config.toml` (`[db] port`); falhar com mensagem clara se o serviço não subiu.

### 19 · Drift de docs/tipos: mostrar o diff e entregar o arquivo regenerado
Corrige: F-08.
Onde: `database.yml:43–63`.
Ação: `git --no-pager diff --stat` + `git diff > artifacts/database/drift.patch`; upload sempre; comentário no PR com instrução `git apply`.

### 20 · Política de auto-correção de drift **[D]**
Decisão: bot que commita `DATABASE_DICTIONARY.md`/tipos na branch do PR **vs.** apenas artefato (etapa 19).
Recomendação: apenas artefato. Um bot commitando em branch de agente viola a regra "só escreve em branch própria" e gera conflitos entre sessões.

### 21 · `graphify.yml`: artefato também em falha
Onde: `graphify.yml:61`.
Ação: `if: always()`, `if-no-files-found: warn`, incluir `graphify-out/*.log`.

### 22 · `graphify.yml`: dependências Python travadas com hash + cache pip
Onde: `graphify.yml:34–37` · novo `requirements-graphify.txt`.
Ação: `pip-compile --generate-hashes` para `graphifyy[sql]==0.9.48`; `pip install --require-hashes -r`; `setup-python` com `cache: pip`; adicionar ecossistema `pip` ao `dependabot.yml`.

### 23 · `graphify.yml`: guardar a comparação base×head
Onde: `graphify.yml:51–59`.
Ação: `test -f "$BASE_WORKTREE/scripts/graphify.mjs" || { echo '::warning::base sem Graphify'; exit 0; }`.

### 24 · `quality.yml`: parar de rodar o Vitest duas vezes
Corrige: F-07.
Onde: `package.json` script `check` · `quality.yml:46–48`.
Ação: em CI, `check` usa `test:coverage` (uma execução com cobertura) e o passo separado é removido.

### 25 · `quality.yml`: `npm audit` logo após `npm ci`
Onde: `quality.yml:49` → após linha 36.
Efeito: falha em segundos em vez de após ~6 min de testes.

### 26 · Cache dos browsers do Playwright
Onde: `quality.yml` (validate e cross-browser).
Ação: `actions/cache` em `~/.cache/ms-playwright` chaveado pela versão de `@playwright/test` no lockfile; `playwright install` só no miss; `install-deps` separado. Remove a necessidade do `sudo rm` dos repositórios apt do Google (`quality.yml:43–44`).

### 27 · `cross-browser` reaproveita o build do `validate`
Onde: `quality.yml:69–94` · `playwright.config.ts` (`webServer` condicional a `PLAYWRIGHT_SKIP_BUILD`).
Ação: `upload-artifact dist/` no validate; `download-artifact` no cross-browser; `vite preview` direto.

### 28 · Remover `pull-requests: read` não utilizado
Onde: `quality.yml:14`.

### 29 · CodeQL com `security-extended` e `paths-ignore`
Onde: `codeql.yml:36–38`.
Ação: `queries: security-extended`; ignorar `docs/**`, `**/*.md`, `tests/fixtures/**`.

### 30 · Dependency review com licenças e resumo no PR
Onde: `dependency-review.yml`.
Ação: `comment-summary-in-pr: on-failure`, `deny-licenses: GPL-3.0, AGPL-3.0`, `fail-on-scopes: runtime`; `permissions: pull-requests: write` só neste job.

## 4. Fase C · Cadeia de suprimento, segredos e permissões

### 31 · Exigir SHA pinning no repositório
Onde: Settings → Actions (`sha_pinning_required: true`).
Custo: zero — todos os workflows já pinam.

### 32 · `allowed_actions: selected`
Onde: Settings → Actions.
Ação: GitHub-owned + verified + lista: `gitleaks/gitleaks-action`, `github/codeql-action`, `actions/dependency-review-action`, `supabase/setup-cli`, `step-security/harden-runner`.

### 33 · Ativar secret scanning + push protection do GitHub
Onde: Settings → Code security (repo público: gratuito).
Efeito: bloqueia o push do segredo; Gitleaks continua cobrindo o histórico.

### 34 · Ativar Dependabot security updates
Onde: Settings → Code security (hoje `disabled`).

### 35 · `step-security/harden-runner` (egress)
Onde: quality, database, graphify em `egress-policy: block` após mapear hosts; release em `audit` por 2 semanas.
Hosts esperados: `registry.npmjs.org`, `cdn.playwright.dev`/`playwright.azureedge.net`, `ghcr.io`/`docker.io` (Supabase), `api.vercel.com`, `api.supabase.com`, `pypi.org`.

### 36 · Lint de workflows: `actionlint` + `zizmor`
Onde: novo `workflows-lint.yml` (em PRs que tocam `.github/**`).
Efeito: teria apontado F-01 (pipefail) e a permissão sobrando (etapa 28).

### 37 · CODEOWNERS para `.github/**` e `site-supabase/**`
Onde: novo `.github/CODEOWNERS`.
Efeito: mudanças de CI/DDL exigem revisão do responsável (regra 8 do fluxo Git).

### 38 · Segredos no Environment `Production` + `environment:` no job release
Onde: `release.yml` job `release` · Environment `Production` (existe, vazio).
Ação: mover `SUPABASE_ACCESS_TOKEN` e `VERCEL_TOKEN`; declarar `environment: { name: Production, url: ${{ steps.deploy.outputs.url }} }`.
Efeito: registro de Deployment no GitHub, escopo do segredo restrito ao job.

### 39 · Política de branch dos Environments
Onde: `Production` → somente `main`; `Preview` → `fix/**`, `feat/**`, `chore/**`, `claude/**`.

### 40 · Conta de serviço Supabase com acesso só ao projeto isolado **[D]**
Onde: `SUPABASE_ACCESS_TOKEN`.
Decisão: PAT da conta pessoal (acesso a todos os projetos, inclusive o canônico do Promo Gifts) vs. conta de serviço convidada só em `xlzmclcjdncjfdrjxclt`.
Recomendação: conta de serviço. Verificação: `GET /v1/projects` retorna apenas o projeto isolado.

### 41 · Lembrete trimestral de rotação de segredos
Onde: novo `secrets-rotation-reminder.yml` (`schedule` trimestral) que abre issue com checklist do `RUNBOOK_ROTACAO_SEGREDOS.md`.
Base: segredos criados em 23/09/2026.

### 42 · Limpar `.vercel/` após o deploy
Onde: `release.yml`, passo `if: always()` com `rm -rf .vercel`.
Motivo: `vercel pull` grava variáveis de produção em `.vercel/.env.production.local` no runner.

### 43 · `persist-credentials: false` em todos os `actions/checkout`
Onde: 6 workflows. Nenhum job faz push.

### 44 · `permissions: {}` no topo e permissões por job
Onde: 6 workflows.
Release: `actions: read, checks: read, contents: read, deployments: write` (para etapa 38).

### 45 · Dependabot: cooldown, grupo de majors, labels e prefixo PT-BR
Onde: `.github/dependabot.yml`.
Ação: `cooldown: default-days: 7` (npm); grupo `npm-major`; `labels: [dependencies]`; `commit-message.prefix: "chore(deps)"`; adicionar ecossistema `pip` (etapa 22).

### 46 · Reduzir carga do Dependabot
Onde: `open-pull-requests-limit: 3` por ecossistema.
Motivo: cada PR dispara 5 workflows (~15–25 min de runner).

### 47 · Auto-merge de Dependabot para GitHub Actions patch/minor **[D]**
Onde: novo `dependabot-automerge.yml` (`pull_request_target` + `dependabot/fetch-metadata`, `gh pr merge --auto --squash`).
Decisão: habilitar auto-merge no repo (`allow_auto_merge: false` hoje).
Recomendação: sim para `github-actions`, não para `npm`.

### 48 · `npm audit signatures` após `npm ci`
Onde: quality, graphify, release.
Efeito: verifica assinaturas/atestados do registry sem custo relevante.

### 49 · SBOM do release
Onde: `release.yml`.
Ação: `npm sbom --sbom-format cyclonedx > sbom.json`; incluir no artefato `production-release-*` (90 dias).

### 50 · Gitleaks: escopo por evento
Onde: `quality.yml:26–29` · `.gitleaks.toml`.
Ação: em `pull_request`, escanear só `base..head`; histórico completo em `push main` e em `schedule` semanal; `--redact` ativo.

## 5. Fase D · Performance, custo e DRY

### 51 · Composite action `setup-node-project`
Onde: novo `.github/actions/setup-node-project/action.yml`.
Conteúdo: `setup-node 24.15.0` + `cache: npm` + npm `11.17.0` + `npm ci`. Substitui 5 blocos repetidos em 4 workflows.

### 52 · Instalar o npm declarado sem `npm install -g`
Onde: composite da etapa 51.
Ação: avaliar `corepack` para `packageManager: npm@11.17.0`; se instável, manter `npm install -g` dentro do composite (um único lugar).

### 53 · Alinhar `.nvmrc`, `engines` e `.npmrc engine-strict`
Corrige: F-09 (parte local/CI).
Onde: `.nvmrc` (22.13.1 → 24.15.0) · novo `.npmrc` com `engine-strict=true`.
Evidência: runs 36322944308 e 36322944259 (`MODULE_NOT_FOUND promise-retry` em Node 22).

### 54 · `runs-on: ubuntu-24.04` fixo
Onde: 6 workflows.
Motivo: `ubuntu-latest` muda de imagem sem aviso (o workaround do espelho Chrome em `quality.yml:43` nasceu disso).

### 55 · `paths-ignore` para PRs só de documentação
Onde: quality, database, graphify, codeql.
Ação: ignorar `docs/**` exceto `docs/DATABASE_*.md` (são gerados e verificados), `*.md` na raiz, `plano-50-etapas.html`.
Evidência: PRs #27, #31, #34, #47 (docs) consumiram o pipeline completo.
Atenção: checks obrigatórios com `paths-ignore` ficam "pending" — usar job `no-op` que reporta sucesso quando pulado.

### 56 · Cache de browsers do Playwright (execução)
Executa a etapa 26 também no `cross-browser` (Firefox + WebKit ≈ 400 MB por run).

### 57 · Acelerar `supabase start`
Onde: `database.yml:31–32` · `site-supabase/supabase/config.toml`.
Ação: `supabase start -x studio,analytics,inbucket,imgproxy,vector,edge-runtime,realtime,storage-api` (só o que o pgTAP precisa); avaliar cache das imagens Docker com `docker save`/`actions/cache` chaveado por `2.115.0` + `major_version 17`.
Baseline: mediana 3,0 min.

### 58 · Supabase CLI via `supabase/setup-cli` pinado
Onde: `database.yml:29–30`.
Ação: substituir `npm install --global supabase@2.115.0` por `supabase/setup-cli@<sha>` com `version: 2.115.0`.

### 59 · Gitleaks só com o histórico necessário por evento
Executa a etapa 50 e ajusta `fetch-depth` do checkout do quality (0 apenas em `push main`/`schedule`).

### 60 · E2E Chromium em job paralelo ao `validate`
Onde: `quality.yml` · `package.json` (`check` sem `test:e2e` em CI).
Ação: job `e2e-chromium` (`needs: validate`, consome `dist/`) em paralelo ao `cross-browser`; caminho crítico cai de ~7,4 min.

### 61 · Sharding do Playwright
Onde: job `e2e-chromium`.
Ação: `--shard=1/2` e `2/2` com `blob` reporter + `merge-reports`; ativar quando o job passar de 6 min.

### 62 · Padronizar `concurrency`
Onde: `quality.yml:9` (`quality-${{ github.ref }}`) vs. demais (`<nome>-${{ github.workflow }}-${{ github.ref }}`).
Ação: um padrão único; `cancel-in-progress` continua `false` em `push main`.

### 63 · Política única de retenção de artefatos
Onde: quality 30, database 30, graphify 14, release 90.
Ação: PR = 7 dias; `push main` = 30; release = 90 (via expressão por evento).

### 64 · Alinhar Node da Vercel com `engines` **[D]**
Corrige: F-09 (parte produção).
Onde: projeto Vercel `promo-brindes-v1` (`nodeVersion: 22.x`) · `api/**` roda em 22 em produção enquanto testes rodam em 24.
Decisão: subir a Vercel para 24.x (recomendado, se disponível no plano) ou baixar `engines`/CI para 22 LTS.
Verificação: `vercel inspect` do deployment mostra runtime 24; smoke e testes de `api/**` verdes.

### 65 · `timeout-minutes` por passo nos passos de rede
Onde: `supabase start`, `playwright install`, `vercel build/deploy`, `pip install`.
Efeito: falha rápida em vez de esperar o timeout do job.

### 66 · Backoff exponencial nos loops do release
Onde: `release.yml:50,76` (`sleep 20`, `sleep 15`).
Ação: 5 s → 10 s → 20 s → 40 s (teto 60 s), mantendo o limite total.

### 67 · `$GITHUB_STEP_SUMMARY` em todos os workflows
Conteúdo: URL do deploy, versões do ledger, contagem de testes, bytes do bundle vs. orçamento, drift detectado.
Motivo: hoje é preciso baixar o artefato para saber o que aconteceu.

### 68 · Relatório Playwright no summary e anotações
Onde: `playwright.config.ts` (`github` já ativo) + upload de `blob` para shards (etapa 61).

### 69 · Cobertura no summary com delta vs. `main`
Onde: `quality.yml`.
Ação: `davelosert/vitest-coverage-report-action` pinado por SHA, sem serviço externo.

### 70 · Métricas de CI semanais
Onde: novo `ci-metrics.yml` (`schedule`).
Ação: `gh api runs` → duração mediana/p95, taxa de falha, minutos consumidos por workflow → `docs/CI_METRICS.md` ou summary. Base: 1019 runs desde 08/09.

## 6. Fase E · Governança e observabilidade

### 71 · Alerta de falha em `main` **[D]**
Corrige: F-06.
Onde: passo `if: failure()` em release, quality (push main) e database (push main).
Canal: WhatsApp via Evolution API (`wpp2`) para release; e-mail para os demais. Segredo `EVOLUTION_API_KEY` no Environment.
Decisão: canal e destinatário.

### 72 · Issue automática "Release quebrado"
Onde: `release.yml`, `actions/github-script` pinado, `issues: write`.
Ação: abrir/atualizar issue com run URL e passo falho; fechar automaticamente quando voltar a passar.

### 73 · Badges dos 6 workflows no README
Onde: `README.md` (hoje sem badge).

### 74 · Exigir PR para `main` **[D]**
Onde: branch protection (`required_pull_request_reviews`).
Decisão: 0 ou 1 aprovação humana. Recomendação: PR obrigatória com 0 aprovações + CODEOWNERS (etapa 37) para `.github/**` e `site-supabase/**`.

### 75 · Squash-only e histórico linear **[D]**
Onde: repo (`allow_merge_commit: false`, `allow_rebase_merge: false`) · proteção (`required_linear_history: true`, `required_conversation_resolution: true`).
Evidência: PRs #24–#53 entraram por merge commit apesar da regra 7 do fluxo Git (squash).

### 76 · `delete_branch_on_merge: true`
Onde: repo (hoje `false`); 53 PRs mergeadas acumulam branches.

### 77 · `allow_update_branch: true`
Onde: repo. `strict: true` exige branch atualizada; o botão "Update branch" evita rebase manual.

### 78 · Migrar branch protection para Ruleset
Onde: Settings → Rules (hoje `rulesets: []`).
Efeito: lista de bypass auditável, proteção de tags, regras por padrão de branch (`claude/**`).

### 79 · CodeQL e Dependency review como checks obrigatórios
Onde: proteção de `main`/ruleset.
Hoje só `validate`, `cross-browser`, `Migrations and pgTAP`, `Build structural Graphify map`.

### 80 · Nomes de job estáveis e explícitos
Corrige: F-05.
Onde: `quality.yml` (jobs `validate`/`cross-browser` sem `name:`), proteção, `release.yml:33`.
Ação: `name:` explícito em todos; documentar que renomear exige atualizar proteção + release no mesmo PR.

### 81 · Teste de contrato dos nomes de gate
Onde: novo `tests/workflow-gates.node.mjs` + passo no `workflows-lint.yml` (etapa 36).
Ação: ler `name:` dos jobs nos YAMLs e comparar com a lista `required` do release e com a proteção (`gh api`); falhar no PR se divergir.

### 82 · Template de PR
Onde: `.github/pull_request_template.md`.
Checklist: toca migration? docs gerados atualizados? evidência de verificação real? (regra 6 do fluxo).

### 83 · Templates de issue "CI vermelho" e "Release bloqueado"
Onde: `.github/ISSUE_TEMPLATE/`.
Campos: run URL, passo, causa provável, impacto no cliente.

### 84 · Deployment status com URL no GitHub
Depende de: 38.
Efeito: aba Deployments do repo passa a refletir o pipeline (hoje só recebe eventos dos deploys manuais da Vercel).

### 85 · Atualizar runbooks
Onde: `docs/RUNBOOK_RELEASE.md`, `docs/RUNBOOK_INCIDENTES.md`, `docs/RUNBOOK_ROTACAO_SEGREDOS.md`.
Conteúdo: fluxo deploy → smoke → promote → rollback; tabela de segredos por Environment; "release falhou: o que olhar primeiro" (token, ledger, gates).

## 7. Fase F · Preview, qualidade contínua e manutenção

### 86 · Preview deployment por PR **[D]**
Onde: novo `preview.yml` (Environment `Preview`, `vercel deploy` sem `--prod`, comentário com URL).
Contexto: Git integration desativada em `vercel.json` (`deploymentEnabled: false`) — hoje PR não tem preview. Usar `VITE_SITE_DEPLOYMENT_ENV=preview` e o banco de preview do `RUNBOOK_PREVIEW_ISOLADO.md`.
Decisão: custo de builds por PR. Recomendação: só em PRs com label `preview`.

### 87 · Smoke + Playwright `@smoke` contra o preview
Depende de: 86.
Motivo: `vite preview` local não exerce rewrites/headers/crons de `vercel.json` nem `api/**` em runtime real.

### 88 · Lighthouse CI com budgets de Web Vitals
Depende de: 86.
Onde: `treosh/lighthouse-ci-action` pinado; budgets LCP/CLS/INP.
Motivo: README reconhece que o orçamento de bytes não substitui Core Web Vitals.

### 89 · `supabase db push --dry-run` em PRs que tocam `site-supabase/**` **[D]**
Onde: `database.yml` job adicional; script `db:site:dry-run` já existe.
Requisito: link do projeto + `SUPABASE_DB_PASSWORD` no Environment `Preview`.
Decisão: expor senha do banco isolado ao CI (somente leitura de esquema). Recomendação: sim, com usuário dedicado de leitura.

### 90 · Validar ordem cronológica das migrations novas vs. ledger remoto
Onde: passo em `database.yml` (PR) lendo o ledger via Management API.
Motivo: incidente de 15/09 (ordenação) só é detectado hoje no release, depois do merge.

### 91 · Validar `vercel.json` no PR
Onde: `quality.yml`.
Ação: `vercel build` local (sem deploy) ou validação de schema (`$schema` já declarado) + teste unitário de rewrites/headers/crons/functions. Hoje um `vercel.json` inválido só aparece no release.

### 92 · Integridade do build publicado
Onde: `release.yml` após o deploy.
Ação: `vercel inspect <url>` → `githubCommitSha`/`meta` deve igualar `GITHUB_SHA`; falhar se divergir.

### 93 · Relatório semanal de branches órfãs
Onde: novo `stale-branches.yml` (`schedule`).
Ação: listar branches mergeadas há > 14 dias e abrir issue (sem apagar automaticamente).

### 94 · "CI health" mensal sem commit
Onde: novo `ci-health.yml` (`schedule` mensal) que dispara quality/database/graphify em `main`.
Motivo: quebra por drift externo (imagem do runner, CLI Supabase, Playwright) aparece hoje só no próximo PR.

### 95 · `npm run ci:local`
Onde: `package.json`.
Ação: mesma sequência do quality (lint → typecheck → coverage → build → budget → e2e) com as mesmas variáveis; reduz PRs que quebram só no CI (ex.: drift de docs).

### 96 · Hook de pré-commit leve
Onde: `simple-git-hooks` ou `lefthook` (opcional, não bloqueante).
Ação: `validate-migration-names`, `validate-error-catalog`, aviso quando `site-supabase/**` muda sem `docs/DATABASE_*.md`.

### 97 · Registrar este plano no ledger de fechamento
Onde: `docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv` (validado por `ledger:check`).
Ação: 100 linhas com estado `N`; atualizar conforme execução.

### 98 · Verificação automática de licenças de terceiros
Onde: `quality.yml` (`license-checker` ou `npm sbom` + allowlist).
Efeito: `THIRD_PARTY_NOTICES.md` deixa de ser manual; complementa a etapa 30.

### 99 · SLO de CI
Meta: PR verde < 12 min; release < 15 min; taxa de falha em `main` < 5 %/semana.
Medição: etapa 70; revisão mensal junto com a etapa 94.

### 100 · Fechamento
Critério: 7 workflows verdes em `main`; produção = SHA de `main`; ledger Supabase igual ao repo; Environments com segredos; proteção/ruleset aplicada; runbooks atualizados; ledger da etapa 97 com todas as linhas `I`.
Evidência: URLs dos runs, `vercel inspect`, `gh api` da proteção, anexadas em `docs/EXECUCAO_WORKFLOWS_<data>.md`.

---

## 8. Ordem recomendada e dependências

1. **Hoje**: etapas 1–9 (destravar a publicação; produção volta a acompanhar `main`).
2. **Semana 1**: 3–4 (pipefail) já entram junto com 1–9; depois 11–30.
3. **Semana 2**: 31–50 (segurança) e 51–70 (custo).
4. **Semana 3**: 71–85 (governança) — as decisões [D] 71, 74, 75 precisam de resposta antes.
5. **Semana 4**: 86–100.

Decisões pendentes do Joaquim: 1, 20, 40, 47, 64, 71, 74, 75, 86, 89.
