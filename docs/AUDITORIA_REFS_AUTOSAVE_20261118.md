# Auditoria do namespace `refs/autosave/*` — 18/11/2026

## Por que esta auditoria existe

A auditoria anterior de recuperação de trabalho cobriu `refs/pull/*` (203 heads,
que preservam todo PR mesmo depois de a branch ser apagada), `refs/heads/*` e
`refs/tags/*`. Ela **não** cobria `refs/autosave/*`, um namespace com 49 refs
neste repositório: autosaves de worktrees, um stash e branches de sessões de
outros agentes. Um desses refs guardava correção pronta que nunca virou PR.

Listar o namespace: `git ls-remote origin | awk '{print $2}' | grep ^refs/autosave | wc -l`

## Método

1. Snapshot de todos os objetos alcançáveis da `main`:
   `git rev-list --objects origin/main | awk 'NF>=2{print $1}' | sort -u`
2. Para cada ref de autosave, os blobs do topo da árvore:
   `git ls-tree -r <ref> | awk '$2=="blob"{print $3"\t"$4}'`
3. Blobs do ref ausentes do conjunto da `main` = candidatos a trabalho perdido.
4. Para cada candidato: o caminho existe na `main`? Em caso afirmativo, cada
   identificador presente só na versão do autosave foi buscado em **todos** os
   arquivos da `main` (snapshot via `git archive origin/main`), para separar
   renomeação de classe e revisão antiga de funcionalidade realmente ausente.

Objetos de árvore (diretório) são excluídos da contagem: uma árvore difere
sempre que qualquer filho difere, então contá-la infla o resultado sem apontar
conteúdo perdido.

## Resultado

- 14 dos 49 refs têm blob cujo conteúdo não existe em nenhum ponto do histórico
  da `main`.
- **Todos os 14 caminhos existem na `main`** — nenhum arquivo inteiro se perdeu.
- 41 identificadores exclusivos de versões de autosave não aparecem na `main`.
  Triados um por um, caem em cinco grupos, e só o primeiro era trabalho perdido:

| Grupo | Refs | Veredito |
| --- | --- | --- |
| Repetição de 401 na sonda do contrato (`retryOnAuth401`, `badRequest`) | `claude/fix-contract-401-retry-261114-1605` | **Trabalho real, nunca mergeado — recuperado neste PR** |
| Nomes de classe CSS (`success-page__panel`, `success-page__next`, `success-page__confirmations`, `hero__proof`, `search__hint`) e cores hex | `feat/carnegie-briefing-confirmation`, `fix/product-card-clean-image-background` | Funcionalidade presente na `main` com outra nomenclatura: o painel de confirmação existe em `src/pages/QuotePage.tsx` (títulos "O que acontece agora" e "Confirmações") e é coberto por `e2e/smoke.spec.ts` |
| Trava de manutenção (`acquire`, `recovering`, `adquiriu`) | `claude/chore-manutencao-local-261110-0831` | A `main` tem a versão evoluída em `scripts/graphify-local.mjs:234`, com o mesmo diretório `.recovery` **mais** verificação de dono por PID e renomeação da trava morta, além de teste em `scripts/graphify-local.unit.mjs` |
| `RECENT_INSTANT`, `Calculado` | `stash/085205b8ecf5` | Descartado pelo próprio autor, com motivo registrado na mensagem do stash: "RECENT_INSTANT quebra 9 testes (relógio já é congelado no describe)" |
| `contendido` | `claude/feat-prod-readiness-261113-2010` | Palavra de um relatório datado de 13/11 cujo sucessor na `main` é de 13-14/11 e resolve os itens que estavam "aguardando" |

Casos verificados individualmente e também superados pela `main`:

- `scripts/automation.mjs`: a `main` tem `statePath(root, bridgeStatePath)` com
  suporte a `REPO_AUTOMATION_STATE`; o autosave tem a assinatura antiga de um
  argumento e timeouts menores.
- `src/lib/useInitialSuccessScroll.ts`: a `main` acrescenta a guarda
  `readerTookControl`, ausente no autosave.
- `src/components/CampaignFinder.tsx`: a `main` mantém o título "O que
  entendemos da sua campanha" com `summaryHeadingRef` e `tabIndex={-1}` para
  foco, com três asserções em `src/components/CampaignFinder.test.tsx`.
- `docs/PLANO_CORRECOES_50_ETAPAS_20260913.md` em
  `backup/recovered-wip-20260915`: três linhas exclusivas descrevem a assimetria
  entre os webhooks, que a versão da `main` registra como eliminada.

## Branches e tags: o que pode ser apagado

Nada. Inventário dos `refs/heads` do remoto nesta data: `main`, `contexto`
(regenerada pela automação a cada 10 minutos) e `computador_local`, mais as
branches desta sessão. `computador_local` está em `2a09509`, ancestral direto da
`main`, 0 commits à frente e 0 blobs únicos: é a máquina local acompanhando a
`main`, não trabalho abandonado. As branches dos PRs mergeados já foram apagadas
no squash-merge e seus commits seguem em `refs/pull/<n>/head`, que é somente
leitura. As três tags `backup/*` custam nada e são a rede de segurança: duas têm
0 blobs únicos e a terceira só a revisão superada citada acima.

Verificação reproduzível:

```bash
git ls-remote --heads origin
git merge-base --is-ancestor origin/computador_local origin/main && echo ancestral
git rev-list --count origin/main..origin/computador_local   # 0
```
