# Anexos — auditoria de funcionalidades pendentes (11/10/2026)

Relatórios detalhados que sustentam o documento consolidado [`docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md`](../../AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md). Cada anexo cobre uma frente, lista etapa por etapa com classificação e evidência (`arquivo:linha` ou busca negativa reproduzível) e foi produzido em modo somente leitura sobre `main` = `3f82233`.

| Anexo | Frente | Fontes auditadas |
| --- | --- | --- |
| [01-matriz-230-requisitos.md](01-matriz-230-requisitos.md) | Matriz de fechamento (UX/LK/GR/AC) | `docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv`, `MATRIZ_INDEX.md`, `GOVERNANCA_FECHAMENTO.md` |
| [02-plano-fechamento-100.md](02-plano-fechamento-100.md) | Plano de fechamento em 100 etapas | `PLANO_FECHAMENTO_100_ETAPAS_20261001.md`, `EXECUCAO_PLANO_FECHAMENTO_20261001.md`, revisões de 28/09 |
| [03-plano-carnegie-ux-100.md](03-plano-carnegie-ux-100.md) | Plano Carnegie de UX em 100 etapas | `PLANO_CARNEGIE_UX_100_ETAPAS_20261005.md`, PR #94 (aberta) |
| [04-workflows-ci-operacao.md](04-workflows-ci-operacao.md) | CI/CD, runbooks, integrações adiadas, variáveis de ambiente, crons | `PLANO_WORKFLOWS_100_ETAPAS_20260927.md`, `REVISAO_WORKFLOWS_100_20260928.md`, `RUNBOOK_*.md`, `.github/`, `vercel.json` |
| [05-ux-benchmarks-pesquisa.md](05-ux-benchmarks-pesquisa.md) | Produto, UX, benchmarks e pesquisa | `PLANO_UX_100`, Lukka, Freeshop, Gen Z, `UX_STRATEGY`, `UX_AUDIT_REPORT`, `GUIA_DE_VOZ`, portal do cliente, `PLANO_100.md`, `plano-50-etapas.html` |
| [06-planos-correcoes-50.md](06-planos-correcoes-50.md) | Planos de correções de 13/09, 16/09, 17/09, 23/09 e 24/09 | Os 5 planos, revisões, auditoria de 5 especialistas e execuções |
| [07-banco-api-dados.md](07-banco-api-dados.md) | Banco, API e dados | 65 migrations, 28 arquivos pgTAP, `api/`, `DATABASE_*.md`, `AUDITORIA.md`, `AUDIT_REPORT_20260908.md` |
| [08-codigo-e-graphify.md](08-codigo-e-graphify.md) | Varredura do código-fonte e Graphify (50 etapas) | `src/`, `api/`, `shared/`, `scripts/`, `tests/`, `e2e/`, `PLANO_GRAPHIFY_50_ETAPAS_20260911.md`, `GRAPHIFY*.md` |

## Notas de consolidação

- Os anexos foram reconciliados entre si. Onde houve conflito, prevaleceu a evidência no código: LK10 (categorias fotográficas) está entregue em `src/pages/HomePage.tsx:60-93`, e o anexo 05 foi corrigido nesse ponto.
- O estado remoto (GitHub, Vercel) foi lido apenas onde a API permitiu. A listagem de variáveis da Vercel retornou 403; o que se diz sobre credenciais em produção é inferido por logs e por decisões registradas.
- Nenhum teste foi executado (clone sem `node_modules`). Contagens de testes vêm do código-fonte e dos runs do CI.
