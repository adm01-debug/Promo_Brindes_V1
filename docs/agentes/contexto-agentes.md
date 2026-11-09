# Contexto automático para agentes — o que é, como ler, como mexer

Referência longa dos scripts autônomos que mantêm o repositório descrevendo o **estado real** do
projeto, para um agente não gastar token redescobrindo o que já é fato. Portado do Zapp Web V2
(`scripts/{ai-context,supabase_snapshot,regras_negocio,inventario}` + `contexto.yml` +
`inventario-estado-semanal.yml`), adaptado a este repo. Regras curtas ficam no `AGENTS.md`.

## Ler antes de qualquer tarefa

```sh
git fetch origin contexto
git show origin/contexto:docs/contexto/00-INDEX.md
```

Ou, sem clone:
`https://raw.githubusercontent.com/adm01-debug/Promo_Brindes_V1/contexto/docs/contexto/00-INDEX.md`
(MCP do GitHub: `github_get_file` com `ref=contexto`).

O `00-INDEX.md` diz o estado de cada fonte (`ok`, `parcial`, `desatualizado`, `ainda não gerado`) e
manda direto para o arquivo certo. **Nunca abra PR da branch `contexto`**: ela é gerada e reescrita a
cada 10 minutos.

## Um sistema, três fontes, um dono por fato

| Preciso de… | Fonte | Onde | Produtor |
|---|---|---|---|
| Tabela, coluna, RLS, policy, função, trigger, cron, lint — **como está no banco agora** | banco real | `docs/contexto/supabase/` | `scripts/supabase_snapshot/snapshot.py` |
| Rota, tela, menu, módulo, hook, rota HTTP de `api/`, grafo, teste, convenção, baseline | código | `docs/contexto/codigo/` | `scripts/ai-context/gerar.mjs` |
| O que pode/não pode: RLS por operação, estados e transições, validações, fórmulas, prazos, erros de negócio, lacunas | regras de negócio | `docs/contexto/regras/` | `scripts/regras_negocio/generate.py` |
| Estado vivo do banco **com alertas** (sem RLS, RLS sem policy, órfã, fila travada, cron falhando, RPC exposta sem uso) | inventário | `inventario/estado/banco.json` | `scripts/inventario/gerar-banco.mjs` |

Se duas fontes discordarem, vale o dono do fato. Migration no repo é histórico, não estado.

## Como é atualizado

| Workflow | Quando | O que faz |
|---|---|---|
| `.github/workflows/contexto.yml` | push em `main` que toque código/banco/automação, a cada 10 min (minuto 7) e dispatch | 3 produtores independentes (um job cada) + índice; publica na branch `contexto` com `[skip ci]`. Só comita quando algo mudou; métricas voláteis esperam 60 min |
| `.github/workflows/inventario-estado-semanal.yml` | segunda 10:23 UTC e dispatch | regera `inventario/estado/banco.json` e abre PR em `automation/inventario-estado` se o conteúdo mudou |

O `contexto.yml` nunca faz push na `main` (branch protection) e nunca abre PR — publica numa branch
gerada, sem disparar CI nem deploy. O inventário nunca faz push na `main`: entrega por PR.

## Secrets

| Secret | Quem usa | Estado |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | `inventario-estado-semanal.yml` (Management API, somente leitura) | **já existe** (o `release.yml` usa o mesmo) |
| `SITE_SUPABASE_DB_URL` | job `banco` do `contexto.yml` (snapshot completo) | **falta**. Sem ele o job sai verde com aviso e `docs/contexto/supabase/` fica como está; `codigo/` e `regras/` continuam publicando. Como montar: `scripts/supabase_snapshot/README.md` |

Os dois apontam para o Supabase **isolado do site** (`xlzmclcjdncjfdrjxclt`). O catálogo canônico
(`doufsxqlfjyuvxuezpln`) não é coletado: é externo e somente leitura
(`docs/RUNBOOK_BANCO_PRINCIPAL.md`). O `gerar-banco.mjs` recusa o ref canônico por construção.

## Rodar na mão

```sh
npm run contexto:ia          # docs/contexto/codigo/   (zero dependência, segundos)
npm run contexto:regras      # docs/contexto/regras/ + 00-INDEX.md
npm run inventario:banco     # inventario/estado/banco.json (precisa de SUPABASE_ACCESS_TOKEN)
npm run contexto:test        # as três suítes dos geradores
npm run test:inventario      # funções puras do inventário
```

A saída de `contexto:ia`/`contexto:regras` é ignorada pelo git (`.gitignore`): o lugar dela é a branch
`contexto`. Só `docs/contexto/regras/manual/` vive na `main`.

## Regras humanas (o único arquivo que um humano escreve)

`docs/contexto/regras/manual/*.md` entra na seção A do `07-REGRAS-DE-NEGOCIO.md` com prioridade máxima
e nunca é sobrescrito. Comece copiando `TEMPLATE-regras-de-negocio.md` para `regras.md`. Editar
`manual/` na `main` dispara o `contexto.yml`.

## Ao mexer nos geradores

- Cada produtor tem README na própria pasta (`scripts/ai-context/`, `scripts/supabase_snapshot/`,
  `scripts/regras_negocio/`, `scripts/inventario/`) com entradas, saídas, variáveis e limites.
- Antes da PR: `npm run contexto:test` e `npm run test:inventario`. O gate `check` já inclui os dois.
- `scripts/ai-context/gerar.mjs`, `snapshot.py`, `generate.py` e `indice.py` são **genéricos** (não
  citam este repo); o que é deste repo mora em `ai-context.config.json`, no `contexto.yml` e no
  `scripts/inventario/`. Mantenha assim: facilita trazer correção do Zapp Web V2 e levar a daqui.
- O grafo do graphify entra no contexto só no dispatch com `graphify=true` (exige `npm ci` + `pip`);
  no agendamento o gerador roda sem dependência nenhuma.

## O que do Zapp Web V2 **não** foi portado, e por quê

| Lá | Por que não aqui |
|---|---|
| `types-sync.yml` | depende de `supabase/migrations`, `schema-manifest.json` e `scripts/db-audit/` do Zapp; aqui os tipos saem de `npm run db:site:types` e o ledger é conferido pelo `release.yml` |
| `scripts/ci/render-workflow-docs.mjs` (gera `docs/ci/README.md` dos blocos `# docs:`) | exige bloco `# docs:` em **todos** os workflows, e `quality.yml` está numa PR aberta de outro agente (regra 3 do Fluxo Git). Os workflows novos já nascem com o bloco |
| `talkx-status-regen.yml` | Talk X é produto do Zapp; não existe aqui |
| `branch-hygiene-audit.yml` / `branch-podaveis.mjs` | já coberto por `stale-branches.yml` |
| `scripts/db-audit/check-*-fresh.mjs` | conferem manifests que só existem no Zapp (`grants-baseline.json`, `manifest.sql`) |
| `scripts/inventario/gerar-rotas.mjs` e `gerar-repo.mjs` | rotas/módulos aqui são do `docs/contexto/codigo/rotas.json`; um segundo dono do mesmo fato é exatamente o que este sistema evita |
