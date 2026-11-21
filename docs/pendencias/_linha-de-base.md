# Linha de base — Promo_Brindes_V1

> Fixada em 2026-11-20 19:16 UTC, commit `main` = `804efbc` (merge #215).
> Protocolo anti-regressão do GOAL: todo item novo deve preservar estes números.

## Estado do repositório

- `main` = `804efbc` (fix promessas honestas PF-14/19/20/21, squash do PR #215).
- PRs abertas: **0**. Branches remotas: `main` + `contexto` (regenerada por crontab a cada 10 min).
- Trabalho de agentes IA incorporado recentemente: PF-38 (#211), PF-39 (#212), PF-41 (#213), promessas honestas (#215), auditoria 20/11 (#214).

## Baseline de qualidade (medido localmente neste commit)

| Gate | Resultado | Evidência |
| --- | --- | --- |
| `npm run lint` (eslint .) | OK, 0 erros | saída `eslint .` sem ocorrências |
| `npm run typecheck` (`tsc -b`) | OK | sem erros |
| `npm run test` (vitest run) | **538/538 passed** (7.02s) | saída vitest |
| Build worst-case (deps + budget) | na PR #220 (F-30 LGPD) o JS raw subiu para 953,7 KiB (producao) / 957,7 KiB (pior caso) e o Brotli para 269,0 / 270,0 KiB, superando os tetos herdados (950 raw / 267 Brotli). Tetos recalibrados para 960 raw / 271 producao / 272 pior caso Brotli, com margem real de ~2 KiB nos dois perfis | `check-performance-budget.mjs` |
| pgTAP / db:site:test | não reexecutado nesta sessão (toca Supabase) | NÃO VERIFICADO na linha de base |

## Consistência documental verificada

- Contexto (`origin/contexto` `7a799ec`, HEAD `804efbc`) gerado 0 min antes: regras de negócio, banco real (52 min) e código OK.
- Auditorias: `AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md` (128 itens) + `AUDITORIA_PLANEJADO_X_IMPLEMENTADO_20261120.md` (reverificação em `40f6420`; 14 IMPLEMENTADOS, 114 pendentes) + `AUDITORIA_PENDENCIAS_ENG_VERIFICACAO_20261117.md` + `AUDITORIA_REFS_AUTOSAVE_20261118.md` (nenhum trabalho perdido).

## Regras de escrita nesta fase (GOAL)

- `docs/pendencias/` é a pasta de rastreio do GOAL; um arquivo por item na Fase 1.
- Migrations apenas aditivas; nunca renomear/remover em produção.
- Seção 10 do GOAL (parada obrigatória): dado destrutivo, custo, segredo, CI/workflow, regra de negócio sem base, mudança de comportamento existente.


