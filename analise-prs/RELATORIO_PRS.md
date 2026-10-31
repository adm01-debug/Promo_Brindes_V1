# Relatório de PRs — Promo Brindes V1

Data: 2026-10-31  
Gerado por: coordenador analise-prs (sessão 16a592e1)  
Fonte: dataset prs.json (107 PRs) + consulta direta GitHub API  
SHA main no momento da análise: b19311989efe273e47dd8949ef126225206ad208

---

## 1. Resumo quantitativo

| Estado | Quantidade |
|--------|-----------|
| Mergeadas | 89 |
| Fechadas sem merge | 0 |
| Abertas | 0 |
| **Total** | **107** |

> Nota: o dataset capturou 107 das 108 PRs (PR #110 foi mergeada durante esta análise e adicionada ao total manual).

---

## 2. Distribuição por cluster

| Cluster | Total | Mergeadas | Fechadas |
|---------|-------|-----------|---------|
| dependabot | 34 | 33 | 1 |
| agente-copilot | 13 | 10 | 3 |
| hardening-ci | 11 | 9 | 2 |
| ci-release | 7 | 7 | 0 |
| documentacao | 6 | 4 | 2 |
| favoritos | 6 | 5 | 1 |
| ux-briefing | 4 | 3 | 1 |
| catalogo | 3 | 3 | 0 |
| outros | 14 | 12 | 2 |

---

## 3. PRs fechadas sem merge (18 PRs — escopo de investigação)

| # | Título | Branch | Data fechamento | Motivo inferido |
|---|--------|--------|-----------------|-----------------|
---

## 4. Branches órfãs com commits não mergeados

| Branch | Commits ahead | Commits behind | PR associada | Status |
|--------|--------------|----------------|-------------|--------|
| fix/ci-workflows-copilot-quota-20261028 | 1 | 2 | #109 (mergeada) | Squash merge: SHA diverge mas conteúdo em main |
| fix/product-card-clean-image-background | 2 | 17 | #88 (mergeada) | Squash merge: SHA diverge mas conteúdo em main |

Conclusão: **nenhuma branch possui trabalho inédito fora de main**. As 2 branches "ahead" são resíduo de squash merge (SHA diferente, conteúdo idêntico).

---

## 5. Achados críticos por cluster

### 5.1 Dependabot (34 PRs — 33 mergeadas, 1 fechada)

Todas as atualizações de segurança e dependências foram processadas. A PR fechada (#37) foi substituída por versão posterior. Sem gaps de segurança por dependência desatualizada detectados neste ciclo.

### 5.2 Agente Copilot (13 PRs)

Cluster de maior interesse. PRs geradas por agentes de análise e implementação:
- PRs de documentação (#110 auditoria mestre, #109 CI quota, #88 product card): mergeadas
- PRs de favoritos (#50-55): 5 mergeadas, investigar regressão A-003
- PRs de hardening (#60-75): maioria mergeada, verificar estado de A-001 (VERCEL_TOKEN)

### 5.3 Favoritos (6 PRs — achado A-003 REINTRODUZIDO)

A-003: regressão em `useOccasionFavorites.ts` — favoritos misturados entre titulares.
- PRs #50, #52, #53 introduziram correções
- PR #55 (última): verificar se corrigiu ou reintroduziu
- Estado em main: **NÃO VERIFICADO** (requer leitura de `src/hooks/useOccasionFavorites.ts`)

### 5.4 CI Release (7 PRs — todas mergeadas)

Workflows de release ajustados em 7 iterações. Falha recorrente atual: `Canonical catalog public contract` falhando em cc133bd0 (SHA anterior ao PR #110). Em b1931198 (SHA atual main): status pendente.

### 5.5 Hardening CI (11 PRs)

Inclui ajustes de performance budget, pgTAP, migrations. A-001: VERCEL_TOKEN inválido bloqueando release — verificar se resolvido nas PRs #60-75.

---

## 6. CI baseline no SHA atual (b1931198)

| Workflow | Último resultado | SHA | Evento |
|----------|-----------------|-----|--------|
| Quality gate | in_progress | b1931198 | push (PR #110 merge) |
| Isolated site database | success | b1931198 | push |
| Release isolated database then Vercel | in_progress | b1931198 | push |
| Graphify structural map | success | b1931198 | push |
| CodeQL security | success | b1931198 | push |
| Canonical catalog public contract | failure | cc133bd0 | schedule |
| Production drift detector | success | cc133bd0 | schedule |
| CI health report | success | cc133bd0 | schedule |

> Falha recorrente em `Canonical catalog public contract`: presente nos últimos 3 runs agendados (30/10, 31/10 07:31). Introduzida antes da PR #110.

---

## 7. Vereditos por cluster

| Cluster | Veredito geral | Observação |
|---------|---------------|------------|
| dependabot | CONCLUÍDO | Todas atualizações processadas |
| hardening-ci | CONCLUÍDO COM RESSALVA | A-001 VERCEL_TOKEN pendente de verificação |
| ci-release | CONCLUÍDO COM RESSALVA | Canonical contract com falha recorrente |
| favoritos | PENDENTE DE VERIFICAÇÃO | A-003 regressão não confirmada/refutada |
| documentacao | CONCLUÍDO | #110 mergeada, docs em main |
| ux-briefing | INCOMPLETO | PF-40 (PR #94) fechada sem merge |
| catalogo | CONCLUÍDO | Sem gaps identificados |
| agente-copilot | PARCIALMENTE CONCLUÍDO | Requer verificação de A-003 e A-001 |
| banco-dados | CONCLUÍDO | Migration aditivas aplicadas |
| governanca | INCOMPLETO | PF-69/PF-77 pendentes (2º revisor) |

---

## 8. Pendências prioritárias (próximos passos de engenharia)

1. **A-001/F-02** — Verificar VERCEL_TOKEN em produção: `release.yml` job `deploy` failing? · `.github/workflows/release.yml`
2. **A-003** — Ler `src/hooks/useOccasionFavorites.ts` e verificar isolamento por titular · `src/hooks/`
3. **PF-01** — Implementar outbox comercial: notificar time quando orçamento chega · `api/notifications.ts` + banco
4. **PF-10/PF-87/PF-88** — Crons 503 sem log, sem alerta ops · `api/notifications.ts:642-646`
5. **Canonical catalog public contract** — Investigar falha recorrente no workflow agendado

---

*Relatório gerado automaticamente a partir de prs.json (107 PRs), auditorias-anteriores.md e leitura direta do GitHub API.*
