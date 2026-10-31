# CI Baseline — Promo Brindes V1

Data: 2026-10-31  
SHA main: b19311989efe273e47dd8949ef126225206ad208 (merge squash PR #110)  
SHA anterior: cc133bd079cf67d270235c345c51b9681ca97acf

---

## 1. Workflows registrados no repositório

| Workflow | Trigger | Propósito |
|----------|---------|-----------|
| Quality gate | push, pull_request | TypeScript, lint, Vitest (459 testes), build |
| Isolated site database | push, pull_request | pgTAP no banco isolado |
| Release isolated database then Vercel | push em main | Migrations + deploy Vercel |
| Graphify structural map | push, pull_request | Mapa de grafo do código (1.491 nós) |
| CodeQL security | push, pull_request, schedule | SAST (JavaScript/TypeScript) |
| Dependency review | pull_request | Auditoria de dependências |
| Canonical catalog public contract | schedule (diário) | Verifica contrato do catálogo canônico |
| Production drift detector | schedule (diário) | Detecta desvio produção vs main |
| CI health report | schedule (diário) | Relatório de saúde do CI |
| Copilot | pull_request (dynamic) | Code review automático (não obrigatório) |

---

## 2. Estado no SHA main atual (b1931198) — 2026-10-31 19:10

| Workflow | Estado | Resultado |
|----------|--------|-----------|
| Quality gate | in_progress | — |
| Isolated site database | completed | ✅ success |
| Release isolated database then Vercel | in_progress | — |
| Graphify structural map | completed | ✅ success |
| CodeQL security | completed | ✅ success |

> Quality gate e Release ainda em execução no momento da captura (PR #110 mergeada às 19:10).

---

## 3. Estado nos últimos runs agendados (cc133bd0)

| Workflow | Data | Resultado |
|----------|------|-----------|
| Canonical catalog public contract | 2026-10-31 07:31 | ❌ failure |
| Production drift detector | 2026-10-31 07:04 | ✅ success |
| CI health report | 2026-10-31 06:15 | ✅ success |
| Canonical catalog public contract | 2026-10-30 07:31 | ❌ failure |
| Production drift detector | 2026-10-30 07:04 | ✅ success |
| CI health report | 2026-10-30 06:20 | ✅ success |

---

## 4. Falhas recorrentes

### 4.1 Canonical catalog public contract

- **Status:** FAILURE em todos os runs recentes (30/10, 31/10)
- **SHA afetado:** cc133bd0 (anterior à PR #110)
- **Introduzida por:** desconhecido — presente antes desta análise
- **Impacto:** alerta diário falso; risco de ignorar falhas reais
- **Ação recomendada:** ler workflow + logs para identificar causa

### 4.2 Copilot Code Review

- **Status:** FAILURE em PRs #110 (bf1ea38c) e #109 (4d3620ed)
- **Motivo conhecido:** quota de Copilot atingida (documentado em PR #109 e RELATORIO_CI.md)
- **É check obrigatório?** Não — não bloqueia merge
- **Ação:** aguardar renovação de quota

---

## 5. Checks obrigatórios para merge (branch protection main)

Verificado via PR #110 (branch protection exigiu):

1. Quality gate
2. Isolated site database  
3. Release isolated database then Vercel
4. Graphify structural map
5. CodeQL security
6. Dependency review (para PRs)
7. Todos os review threads resolvidos

---

## 6. Tempos aproximados de CI (base PR #110)

| Workflow | Duração aprox. |
|----------|---------------|
| Quality gate | ~3-4 min |
| Isolated site database | ~2-3 min |
| Graphify structural map | ~1-2 min |
| CodeQL security | ~2-3 min |
| Release (com deploy) | ~5-8 min |
| Total (paralelo) | ~8-10 min |
