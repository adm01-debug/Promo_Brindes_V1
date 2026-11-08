# GitHub (perímetro, CI, workflows) — referência para agentes

Ler quando mexer em branch protection, settings do repo, `.github/workflows/`, ou quando um merge ou um
workflow falhar de forma estranha.

## Escrita no GitHub

- Repo `adm01-debug/Promo_Brindes_V1`, branch `main`, **público**. Produção:
  https://promo-brindes-v1.vercel.app.
- **Escrita: somente MCP `GITHUB - MCP - FOREVER`** (`github_push_files`). O MCP padrão do GitHub retorna
  403 em write. `github_push_files` sobrescreve o arquivo — mande o conteúdo integral com apenas a mudança
  semântica e confira depois que o arquivo remoto bate com o que você testou; ele aceita `files` e `delete`
  no mesmo commit (1 commit atômico).
- Em sessão de nuvem `git clone` e leitura funcionam (repo público), mas `git push` volta 403 do proxy
  quando o repo não está entre as fontes autorizadas da sessão — escreva pelo MCP.
- Para listar PRs abertas com os arquivos que elas tocam numa chamada só, use `github_graphql`
  (`pullRequests(states:OPEN){ nodes { number files { nodes { path } } } }`);
  `github_list_pull_requests` devolve o repositório inteiro em cada nó e estoura o contexto.
- Commits em PT-BR, `<tipo>: <assunto>` ou `<tipo>(<escopo>): <assunto>`; tipos do `AGENTS.md` (`fix`,
  `feat`, `chore`, `infra`) mais `docs`, `ci` e `test`, já usados na `main`. **Não há hook `commit-msg`
  neste repo** — o padrão é convenção, não script.

## Perímetro — estado canônico

Lido em 2026-11-08 com `github_get_branch_protection` e `github_get_repo`. Qualquer mudança nestes campos
atualiza **esta tabela no mesmo PR**.

| Campo | Estado canônico |
|---|---|
| Branch protection — required checks | **4**: `validate` · `cross-browser` (quality.yml) · `Migrations and pgTAP` (database.yml) · `Build structural Graphify map` (graphify.yml) |
| Branch protection — `strict` | `true` (a PR precisa estar em cima da `main` atual) |
| Branch protection — `enforce_admins` | `true` |
| Branch protection — review obrigatório | **0 aprovações**; `require_code_owner_reviews=false`, `dismiss_stale_reviews=true` |
| Branch protection — conversas resolvidas | **`required_conversation_resolution=true`** — thread de review aberta bloqueia o merge |
| Branch protection — histórico linear · force push · deleção | `false` · bloqueado · bloqueado |
| Merge | `allow_squash_merge=true` · `allow_merge_commit=true` · `allow_rebase_merge=true` · `allow_auto_merge=true` · `delete_branch_on_merge=true` |
| Squash | `squash_merge_commit_title=COMMIT_OR_PR_TITLE` · `squash_merge_commit_message=COMMIT_MESSAGES` |
| CODEOWNERS | `* @adm01-debug` — o GitHub **pede** o review automaticamente, mas ele **não** é obrigatório para mergear |
| Secret scanning | `secret_scanning` e `push protection` ligados; `non_provider_patterns` desligado (exige plano pago) |

Fatos que custam retrabalho:

- **Sintoma de `strict=true`:** merge responde 405 "required status checks are expected" com o CI verde — a
  PR ficou `BEHIND`. Atualize a branch (rebase em `main`); **não** mexa no `strict`.
- Antes de qualquer `github_update_branch_protection`, leia o estado com `github_get_branch_protection`:
  PUT incompleto regride campos. Para um campo só, use `github_update_required_status_checks`.
- Como só 4 checks são obrigatórios, `CodeQL`, `Dependency review`, `Workflow lint` e `CI health` podem
  estar vermelhos sem travar o merge — leia o resumo da falha antes de decidir se é seu.
- Revisão automática do Copilot já falhou com HTTP 402 (limite da conta), não com erro de código:
  `PENDENCIAS.md`.

## Workflows (12 arquivos em `.github/workflows/`)

| Arquivo | Job / check | Quando roda |
|---|---|---|
| `quality.yml` | `validate` (gitleaks, `npm ci`, `npm audit`, `ledger:check`, `npm run check`, cobertura, budget de performance, rejeita sourcemap) e `cross-browser` (Firefox + WebKit) | PR e push na `main` |
| `database.yml` | `Migrations and pgTAP` | PR e push na `main` |
| `graphify.yml` | `Build structural Graphify map` (doctor, build, check, benchmark, compara base↔head na PR) | PR e push na `main` |
| `release.yml` | `Authorize production release from main` → `Verify DB migration and gates` → `Build and deploy to Vercel production` | push na `main` + `workflow_dispatch` |
| `codeql.yml` | `Analyze JavaScript and TypeScript` | PR, push e `23 4 * * 1` |
| `workflows-lint.yml` | `Lint GitHub Actions workflows` (actionlint) | PR |
| `dependency-review.yml` | `Review dependency changes` | PR |
| `catalog-contract.yml` | `Check read-only product contract` | `30 7 * * *` + dispatch |
| `production-drift.yml` | `Compare Vercel production SHA with main` | `0 7 * * *` + dispatch |
| `ci-health.yml` | `Summarize recent CI runs` | `0 6 * * *` + dispatch |
| `stale-branches.yml` | `Label stale branches (>60 days sem commit)` | `0 8 * * 1` + dispatch |
| `secrets-rotation-reminder.yml` | `Create rotation reminder issue` | `0 9 1 1,4,7,10 *` + dispatch |

- Todas as actions são fixadas por SHA; `workflows-lint.yml` (actionlint) roda em toda PR.
- Dependabot: npm, github-actions e pip, semanal, segunda-feira (`.github/dependabot.yml`). PR de bump do
  `graphifyy` precisa do bump casado em `.graphify.project.json` — ver `docs/agentes/mapa-repo.md`.
- Templates: `.github/pull_request_template.md`, `ISSUE_TEMPLATE/ci-broken.yml`,
  `ISSUE_TEMPLATE/release-blocked.yml`.

## Guardas que você pode rodar antes da PR

- `npm run check` — o mesmo gate do `validate` (demorado; rode ao menos `lint`, `typecheck` e os testes dos
  arquivos tocados);
- `node scripts/validate-agent-instructions.mjs` (ou `npm run agents:instructions:check`) se mexer em
  `AGENTS.md`, `CLAUDE.md`, `docs/agentes/*.md` ou nos skills — exige as seções do `AGENTS.md`, proíbe
  referência órfã em `docs/agentes/` e barra o encolhimento do conjunto de instruções;
- `npm run ledger:check` · `npm run db:migration-names:check` · `npm run check:catalog-contract` ·
  `npm run graph:doctor` conforme o que você tocou.

## Regras de merge deste repo

Mergeie você mesmo (squash, apagando a branch) a PR que **você** criou e que está pronta: os 4 checks
obrigatórios verdes, sem conflito, escopo comum (front, função serverless, workflow de leitura, config).
**Deixe aberta e chame o dono** quando envolver DDL/migration em produção, CI/workflows, segredos,
deleção de dado, arquitetura ou custo, ou conflito com PR de outro agente (regra 8 do Fluxo Git em
`AGENTS.md`). Merge em `main` dispara o `release.yml` — é produção: confirme o deploy
(`docs/agentes/vercel-deploy.md`).
