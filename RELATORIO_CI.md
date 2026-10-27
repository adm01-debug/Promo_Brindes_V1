# Relatório de CI — Promo Brindes V1

**Data da auditoria:** 27/10/2026

**Branch de trabalho:** `fix/ci-workflows` (criada a partir de `origin/main`)

**Commit-base:** `4c6095903b284e525a17a23683e3735c222176f3`
**Idioma:** pt-BR

## Escopo e segurança

- Repositório auditado: `adm01-debug/Promo_Brindes_V1`.
- O clone aberto inicialmente era `Promo_Gifts_V4`; suas alterações locais foram preservadas e não fazem parte deste trabalho.
- O clone original de `Promo_Brindes_V1` permaneceu na branch `feat/compact-product-detail`, com dois commits locais preexistentes. O trabalho de CI foi isolado neste worktree e não incorpora esses commits.
- A URL Supabase isolada `xlzmclcjdncjfdrjxclt` não foi consultada nem alterada: o workflow de banco isolado está verde. A única falha encontrada é uma sonda pública read-only configurada para o catálogo canônico `doufsxqlfjyuvxuezpln`.
- Nenhuma migration, DDL, dado operacional, segredo ou configuração remota foi alterado.

## Inventário inicial — último run de cada workflow na `main`

Critério: último run concluído por workflow, branch `main`, excluídos runs de PR.

| Workflow | Status inicial | Causa provável / observação | Última execução |
|---|---|---|---|
| Canonical catalog public contract | **failure** | A sonda read-only divergiu do contrato esperado ou ficou indisponível. O resumo do MCP aponta falha no passo de enforcement; o erro interno da sonda foi redirecionado para o resumo da execução e não está presente nos logs/artifacts acessíveis pelo MCP. Causa raiz ainda em diagnóstico; não presumir drift de schema. | [run 40468755170](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40468755170) |
| CI health report | success | Verde | [run 40461208115](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40461208115) |
| CodeQL security | success | Verde | [run 40270270370](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40270270370) |
| Isolated site database | success | Verde; nenhum acesso/mutação adicional ao projeto isolado necessário neste diagnóstico | [run 39462507044](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/39462507044) |
| Dependency review | sem execução na `main` | Nenhum run da branch `main` retornado; workflow normalmente é acionado por PR | — |
| Graphify structural map | success | Verde | [run 39462507171](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/39462507171) |
| Production drift detector | success | Verde | [run 40465842915](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40465842915) |
| Quality gate | success | Verde | [run 39462507109](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/39462507109) |
| Release isolated database then Vercel | success | Verde | [run 39462507057](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/39462507057) |
| Secrets rotation reminder | success | Verde | [run 36840808991](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/36840808991) |
| Stale branch cleanup | success | Verde | [run 40292946619](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40292946619) |
| Workflow lint | sem execução na `main` | Nenhum run da branch `main` retornado; workflow normalmente é acionado por PR | — |
| Dependabot Updates | success | Verde | [run 40259881151](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40259881151) |
| Dependency Graph | success | Verde | [run 37462096370](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/37462096370) |

Resumo: **1 falha**, **11 workflows verdes** e **2 sem execução na `main`** (não classificadas como falha).

## Baseline local — antes de correções

Executado em worktree limpo no commit-base acima, antes de alterar arquivos rastreados:

| Verificação | Resultado baseline |
|---|---|
| `npm ci` | PASSOU (exit 0); npm reportou 3 vulnerabilidades high na árvore instalada, sem aplicar correções automáticas |
| `npm run lint` | PASSOU (incluído em `npm run check`) |
| `npm run typecheck` | PASSOU (incluído em `npm run check`) |
| Vitest | PASSOU — 67 arquivos, 459 testes |
| Suítes Node adicionais | PASSOU — 60 testes combinados, incluindo nomes de migration, catálogo, release URL, segredos e CI health |
| `npm run build` | PASSOU (incluído em `npm run check`) |
| `npm run check:performance-budget` | PASSOU (incluído em `npm run check`) |
| Playwright E2E | PASSOU — 123 aprovados, 5 skips previstos, 128 casos totais |
| `npm run check` | **PASSOU — exit 0** |

Ambiente local observado: Node `v24.19.0`, npm `11.17.0`; `.nvmrc` declara Node `24.15.0`, usado pelo runner GitHub. `npm ci` indicou `eslint@9.39.5` fora de suporte e 3 alertas high; o lint, build e testes passaram mesmo assim. A causa foi confirmada depois no check `validate` do PR: o próprio gate `npm audit --audit-level=high` falhou nas resoluções de `vite`, `undici` e `zod`.

## Diagnóstico e resultado final

- O run original terminou com falha no passo de enforcement porque `check-catalog-public-contract.mjs` retornou exit 1. O workflow redireciona o diagnóstico interno para `GITHUB_STEP_SUMMARY`; o MCP informou que os logs/artifacts disponíveis não continham esse trecho específico. Nenhum artifact foi publicado. Assim, a evidência não permite diferenciar a causa interna entre divergência transitória e indisponibilidade pontual.
- Reprodução read-only em 27/10/2026, com as mesmas variáveis públicas do repositório e contra o mesmo projeto canônico: **passou** — 36 colunas, 7.835 produtos inspecionados, nenhuma coluna proibida. Foram observados 2 swatches sem nome e 84 nomes duplicados; são avisos existentes de qualidade de dados, não falha do contrato.
- Rerun via MCP do GitHub: tentativa 2 da execução `40468755170`, em 27/10/2026, terminou com **`conclusion=success`**. Link: https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40468755170
- Conclusão operacional: a falha da `main` não foi reproduzida; o rerun passou sem alteração de aplicação, workflow, contrato ou banco. A evidência disponível não identifica a causa transitória exata.
- No PR #106, o check `validate` reproduziu uma falha distinta: `npm audit --audit-level=high` apontou três vulnerabilidades high corrigíveis dentro dos ranges existentes (`vite` 8.3.2, `undici` 8.10.2 e `zod` 4.6.5). A primeira atualização selecionou `vite` 8.3.5, `undici` 8.12.3 e `zod` 4.6.7; `npm ci` seguido de `npm audit --audit-level=high` terminou com zero vulnerabilidades. O orçamento dedicado revelou depois a necessidade comprovada de selecionar Vite `8.3.3`.
- A execução seguinte do PR falhou no passo separado `Record the performance budget evidence`: o build com as flags de produção (`VITE_CUSTOMER_ADJUSTMENTS_ENABLED`, `VITE_QUOTE_DECISION_GROUPS_ENABLED`, `VITE_PERSISTENT_SHARED_SELECTIONS_ENABLED` e endpoint de orçamento) resultou em **265,0 KiB Brotli**, acima do teto inalterado de 265 KiB. A falha foi reproduzida localmente, inclusive com Node `24.15.0` e as mesmas flags. O `npm run check` havia passado com 263,6 KiB por não ativar essas flags; esse resultado não representa o build de produção medido pelo gate dedicado.
- Teste de versões corrigidas de Vite, sempre com audit e build de produção: `8.3.4` também ultrapassou o teto; `8.3.3` passou com **264,9 KiB**. A faixa direta foi ajustada para `^8.3.3`, mantendo o lockfile em `8.3.3`; `npm ci` reproduz essa resolução e `npm audit --audit-level=high` permanece em zero vulnerabilidades. O limite e todos os checks foram mantidos.
- O check do Copilot pull request reviewer falhou por bloqueio externo de quota, HTTP 402: “You've reached your additional usage limit for your plan.” Na auditoria original, essa falha adiou o merge; depois o usuário autorizou mesclar com os checks obrigatórios verdes, e o PR #106 foi mesclado em 27/10/2026. A pendência opcional do Copilot segue em `PENDENCIAS.md`.

### Gaps conhecidos (não introduzidos por esta correção)

- Na auditoria original, `eslint@9.39.5` estava fora de suporte segundo o aviso do npm. A migração independente foi tratada posteriormente no PR #99; ver a atualização abaixo.
- O resumo de erro do workflow não preserva o log da sonda. A ocorrência foi recuperada por reprodução e rerun; como melhoria futura de observabilidade, avaliar publicar o diagnóstico sanitizado como artifact de curta retenção ou diretamente em `GITHUB_STEP_SUMMARY` (sem URL/key/secrets e sem linhas de dados de produto).

### Validação pós-commit e PR

- Commit documental inicial: `f5ef8b3` (`docs(ci): registra baseline e resultado da auditoria`).
- Repetição integral imediatamente após esse commit: `npm run check` **PASSOU (exit 0)**.
- Commit de correção da causa raiz do audit: `fa21a3d` (`fix(deps): atualiza pacotes com alertas high`). Somente `package-lock.json` foi alterado.
- Depois da correção e novamente após o commit: `npm ci`, `npm audit --audit-level=high` e `npm run check` **PASSARAM**. Auditoria final: zero vulnerabilidades; 67 arquivos/459 testes Vitest, 60 testes Node e 123 E2E passaram, com os mesmos 5 skips previstos no baseline; lint, typecheck, build e orçamento passaram.
- Comparação baseline × final: sem redução no número de testes aprovados, sem skips novos, sem erro de lint/typecheck/build e sem regressão de contrato ou comportamento.
- Após o novo achado do orçamento de produção, cobertura e suíte integral passaram também sob Node `24.15.0`; a medição dedicada com as flags de produção aprovou Vite `8.3.3` em 264,9 KiB Brotli. A validação remota correspondente concluiu com `success` em [Quality gate — run 40534110789](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40534110789), incluindo os jobs `validate` e `cross-browser`.
- No SHA validado `1c309bc9f1ddb4e509b405b20d46b6ef3f337685`, também passaram [Isolated site database — run 40534110741](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40534110741), [CodeQL security — run 40534110880](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40534110880), [Graphify structural map — run 40534110709](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40534110709) e [Dependency review — run 40534110963](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40534110963). O check do banco isolado executou apenas seu fluxo de CI local; nenhuma migration foi aplicada ao projeto Supabase.
- Os 11 workflows cujo último run na `main` estava verde permaneceram verdes na amostra consultada; dois seguem sem run na `main` e não foram classificados como falha. A falha catalogada na `main` foi reexecutada e a tentativa 2 concluiu com `success`.
- Na revisão documental final do SHA `7c9e4006fd17e573759cd3297929cc5994e8d7af`, os cinco workflows do PR — [Quality gate](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40537938425), [Isolated site database](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40537938375), [CodeQL](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40537938421), [Graphify](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40537938387) e [Dependency review](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40537938367) — concluíram com `success`.
- Histórico da primeira conclusão: o PR #106 aguardava a regularização da revisão automática do Copilot após o run [40537958327](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40537958327). Com nova autorização do usuário e todos os checks obrigatórios verdes, ele foi mesclado em 27/10/2026.

## Atualização — migração do ESLint 10 no PR #99

- **Causa reproduzida:** o `npm ci` do PR original falhava com `ERESOLVE` porque `eslint-plugin-jsx-a11y@6.10.2` admite ESLint até a versão 9. Os checks de [Quality gate](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40575238174) e [Graphify](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40575238036) falhavam antes dos testes.
- **Correção:** o PR usa `eslint-plugin-jsx-a11y-x@0.2.0`, publicado pelo ESLint Community com peer `eslint: ^9 || ^10`, e `@eslint/js@10.0.1` com `eslint@10.13.0`. O nome do plugin foi atualizado na configuração; nenhum lint de acessibilidade foi desativado.
- **Comparação estrutural:** os conjuntos `recommended` antigo e novo têm as mesmas 34 entradas, severidades e opções declaradas. A configuração efetiva mantém 31 regras habilitadas nas duas versões; nenhuma foi desativada. Uma simulação com JSX inválido produziu as mesmas três violações de acessibilidade em ambas as versões: `alt-text`, `click-events-have-key-events` e `no-static-element-interactions`.
- **Novas regras do core:** o `@eslint/js` 10 habilita `no-unassigned-vars`, `no-useless-assignment` e `preserve-caught-error`. Quatro achados reais desta última regra foram corrigidos preservando a causa original dos erros; nenhuma regra foi afrouxada.
- **Baseline da `main` antes da alteração:** `npm ci` e `npm run check` passaram; 70 arquivos/470 testes Vitest, 123 E2E e 5 skips previstos. O orçamento marcou CSS 179,9 KiB e JS 265,0 KiB Brotli.
- **Validação local após integrar a `main`:** `npm ci`, `npm audit --audit-level high` e `npm run check` passaram; zero vulnerabilidades, 70 arquivos/470 testes Vitest, 123 E2E, os mesmos 5 skips, lint, typecheck, build e orçamento aprovados. O JS mediu 265,1 KiB Brotli, abaixo do teto de 267 KiB; não houve redução de testes aprovados.
- **Outros navegadores:** `npm run test:e2e:cross-browser` passou com 116 testes em Firefox e WebKit e 12 skips previstos para cenários específicos de Chromium/celular.
- **Risco residual:** o plugin alternativo está em versão 0.2.0. A versão foi fixada exatamente no lockfile; a manutenção e a futura compatibilidade com atualizações de ESLint devem ser acompanhadas em revisões de dependências.
