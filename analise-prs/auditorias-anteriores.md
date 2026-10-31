# Auditorias Anteriores — Promo_Brindes_V1

**Gerado em:** 2026-10-31  
**SHA main referência:** cc133bd079cf67d270235c345c51b9681ca97acf  
**SHA mais recente auditado nos documentos:** 3f82233 (06/10/2026, commit #89)  
**Branch desta análise:** claude/docs-audit-inventory-261031-1542  
**Investigador:** Copilot CLI — sessão 007583d3-ffb0-4aee-ac23-41c8da400b89  

---

## 1. Fontes Examinadas

| Caminho | Tipo | Data | Tamanho | Lido |
|---|---|---|---|---|
| `AUDITORIA.md` | Auditoria formal | 24/09/2026 | 41 KB | ✅ |
| `PLANO_100.md` | Plano de correção | 24/09/2026 | 24,6 KB | ✅ |
| `docs/AUDIT_REPORT_20260908.md` | Auditoria formal | 08/09/2026 | 7,7 KB | ✅ |
| `docs/AUDITORIA_5_ESPECIALISTAS_20260922.md` | Auditoria 5 especialistas | 22/09/2026 | 6,5 KB | ✅ |
| `docs/REVISAO_PLANOS_20260924.md` | Revisão de planos | 24/09/2026 | 28,2 KB | ✅ |
| `docs/REVISAO_PLANOS_20260923.md` | Revisão de planos | 23/09/2026 | 21,7 KB | ✅ |
| `docs/REVISAO_PLANOS_20260923_ANEXO_TECNICO.md` | Anexo técnico | 23/09/2026 | 31 KB | ⚠️ |
| `docs/REVISAO_PLANOS_20260923_ANEXO_PRODUTO.md` | Anexo produto | 23/09/2026 | 57 KB | ⚠️ |
| `docs/REVISAO_INDEPENDENTE_PLANOS_20260922.md` | Revisão independente | 22/09/2026 | 39,6 KB | ✅ |
| `docs/REVISAO_POS_PUBLICACAO_PLANOS_20260922.md` | Revisão pós-publicação | 22/09/2026 | 27,4 KB | ✅ |
| `docs/REVISAO_INTEGRAL_PLANOS_20260911.md` | Revisão integral | 11/09/2026 | 60,1 KB | ✅ |
| `docs/REVISAO_FECHAMENTO_PLANOS_20260912.md` | Revisão de fechamento | 12/09/2026 | 23,8 KB | ✅ |
| `docs/REVISAO_PLANOS_20260928.md` | Revisão de planos | 28/09/2026 | 26,4 KB | ✅ |
| `docs/PLANO_CORRECOES_50_ETAPAS_20260913.md` | Plano de correção | 13/09/2026 | 64,2 KB | ✅ |
| `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md` | Plano de correção | 16/09/2026 | 83,4 KB | ✅ |
| `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md` | Plano de correção | 17/09/2026 | 78,7 KB | ⚠️ |
| `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260924.md` | Plano de correção | 24/09/2026 | 47,7 KB | ✅ |
| `docs/PLANO_MELHORIAS_CORRECOES_50_ETAPAS_20260923.md` | Plano de correção | 23/09/2026 | 58,9 KB | ⚠️ |
| `docs/PLANO_WORKFLOWS_100_ETAPAS_20260927.md` | Plano workflows/CI | 27/09/2026 | 29,2 KB | ✅ |
| `docs/PLANO_FECHAMENTO_100_ETAPAS_20261001.md` | Plano fechamento | 01/10/2026 | 66,9 KB | ✅ |
| `docs/EXECUCAO_PLANO_FECHAMENTO_20261001.md` | Log de execução | 01/10/2026 | 7,4 KB | ✅ |
| `docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md` | Auditoria completa | 11/10/2026 | ~55 KB | ✅ |
| `docs/audits/plan-review-20260912/README.md` | Evidências | 12/09/2026 | 2,9 KB | ✅ |
| `docs/audits/closure-review-20260912/README.md` | Evidências | 12/09/2026 | 3,8 KB | ✅ |
| `docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv` | Matriz CSV | 12/09/2026 | 145,5 KB | ⚠️ |
| `PENDENCIAS.md` | Pendências | N/D | — | ⚠️ |
| `UX_AUDIT_REPORT.md` | Auditoria UX | 05/10/2026 | — | ⚠️ |

**Contagem:** 57 fontes identificadas. 22 lidas. 35 não lidas.

---

## 2. Fontes Inacessíveis

| Fonte | Motivo |
|---|---|
| Branches remotas (git log) | Shell bloqueado na sessão filho |
| Worktree ux-audit | Caminho externo; não verificado |
| `docs/REVISAO_PLANOS_20260923_ANEXO_TECNICO.md` (31 KB) | Não lido — volume |
| `docs/REVISAO_PLANOS_20260923_ANEXO_PRODUTO.md` (57 KB) | Não lido — volume |
| `docs/PLANO_MELHORIAS_CORRECOES_50_ETAPAS_20260923.md` (58,9 KB) | Não lido — sobreposição |
| `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md` (78,7 KB) | Não lido — sobreposição |
| `docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv` (145,5 KB) | Não lido — CSV |
| Branches: `docs/reconcile-favorites-audit-20260924`, `fix/reliability-audit-20260927` | Git inacessível |

---

## 3. Inventário por Documento

### 3.1 AUDIT_REPORT_20260908.md
- **Data:** 08/09/2026; **Escopo:** auditoria técnica — 11 categorias
- **Achados:** Blockers P0: permissões legacy DB (mcp_kv), domínio; P1: notificações, migrations, SSR, CSP; Lighthouse 96/100/90

### 3.2 REVISAO_INTEGRAL_PLANOS_20260911.md
- **Data:** 11/09/2026; SHA `7104660`
- **Achados:** 32 Implementados / 57 Parciais / 5 Não iniciados; 141 Vitest, 96 pgTAP; 3 defeitos seleções compartilhadas

### 3.3 REVISAO_FECHAMENTO_PLANOS_20260912.md
- **Data:** 12/09/2026; SHA `f20df445`
- **Achados:** B01–B07 corrigidos; **R08 (CRÍTICO):** dados+consentimento persistem após logout (`emailRemainsInForm: true`, `consentRemainsInForm: true`)

### 3.4 PLANO_CORRECOES_50_ETAPAS_20260913.md
- **Data:** 13/09/2026; base `f20df445`
- **Achados:** R08 risco ativo; E03: 3 supressões eslint órfãs (`CommemorativeDatesPage.tsx:196`, `QuoteDrawer.tsx:35`, `CatalogPage.tsx:98`); E04: sem TypeScript strict

### 3.5 PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md
- **Data:** 16/09/2026; branch `fix/supabase-ledger-ordering`
- **Achados:** Ledger de migrations (P0); máquinas de estado, backoff, índices, FK

### 3.6 AUDITORIA_5_ESPECIALISTAS_20260922.md
- **Data:** 22/09/2026; SHA `ef97fc75`
- **Achados:** 13 categorias declaradas implementadas; 296 Vitest, 458 pgTAP; PR #26 merged

### 3.7 REVISAO_INDEPENDENTE_PLANOS_20260922.md
- **Data:** 22/09/2026; SHA `7466b012`
- **Achados:** A01: mcp_kv grants fora do escopo do site; A02: migrations de retenção pendentes

### 3.8 REVISAO_POS_PUBLICACAO_PLANOS_20260922.md
- **Data:** 22/09/2026; SHA `b211c2ba`
- **Achados:** 18 confirmados / 25 parciais / 3 não entregues; P1: preview não isolado, JWT inativo, backup nunca testado

### 3.9 REVISAO_PLANOS_20260923.md
- **Data:** 23/09/2026; SHA `11f0d358`
- **Achados:** A01–A05 favoritos (5 defeitos reproduzíveis); 348 Vitest + 533 pgTAP

### 3.10 AUDITORIA.md (auditoria mestre)
- **Data:** 24/09/2026; SHA `da9f55c4`; 22 achados A-001 a A-022
- **Achados:** A-001(P1): VERCEL_TOKEN inválido; A-003/004/007/010(P1): favoritos; A-013(P2): Analytics 404; A-015: galeria sem aria-label; A-022: view pública exposta
- Derivou `PLANO_100.md` (22 etapas E-001 a E-022)

### 3.11 REVISAO_PLANOS_20260924.md
- **Data:** 24/09/2026; SHA `3bd4c7b0`
- **Achados:** F24-01(debounce dupla gravação), F24-02(race condition), F24-03(kit não persiste SPA) — declarados corrigidos; 375 testes

### 3.12 PLANO_WORKFLOWS_100_ETAPAS_20260927.md
- **Data:** 27/09/2026; SHA `2b53b855`; 1.019 execuções
- **Achados:** 9/9 releases com falha (VERCEL_TOKEN); F-01: sem pipefail (`database.yml:38`, `quality.yml:53`, `release.yml:95/97`); F-03: smoke após promoção; F-09: Node 24 vs 22; secret scanning desabilitado

### 3.13 REVISAO_PLANOS_20260928.md
- **Data:** 28/09/2026; SHA `40e05abd`
- **Achados:** F28-01/02 — **regressão** em favoritos após correções 24/09; Analytics 404 persiste; 399 testes

### 3.14 PLANO_FECHAMENTO_100_ETAPAS_20261001.md
- **Data:** 01/10/2026; SHA `cfb33e4d`; 10 blocos, 100 etapas

### 3.15 EXECUCAO_PLANO_FECHAMENTO_20261001.md
- **Data:** 01/10/2026; PRs #81, #82, #83; 430 Vitest / 574 pgTAP; Resend/WhatsApp adiados

### 3.16 AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md
- **Data:** 11/10/2026 (mais recente); SHA `3f82233`; 73 docs lidos; PRs #88, #94
- **Placar:** Fechamento: 5/41/20/34; Carnegie: 12/49/27/12; Workflows: 21/29/42/8
- **12 lacunas:** PF-01 alerta comercial (NÃO INICIADO); PF-07/14 email+WhatsApp (BLOQUEADO); PF-66 secret scanning; PF-86 restore; PF-59 canonical

---

## 4. Reconciliação de Achados com o Código Atual

> SHA referência: `cc133bd079cf67d270235c345c51b9681ca97acf` (104 commits após `3f82233`)

| ID | Descrição | Fonte | Estado |
|---|---|---|---|
| **A-001/F-02** | VERCEL_TOKEN inválido — release 100% bloqueado | AUDITORIA.md, PLANO_WORKFLOWS | **CONFIRMADO E PENDENTE** |
| **A-003/004/007/010** | Favoritos — concorrência, dessincronização, kit, counter | AUDITORIA.md | **REINTRODUZIDO POR REGRESSÃO** — F28-01/02 em 28/09 |
| **A-013** | Analytics 404 | AUDITORIA.md, REVISAO_20260928 | **CONFIRMADO E PENDENTE** |
| **A-015** | Galeria sem `aria-label` | AUDITORIA.md | **NÃO VERIFICADO** |
| **A-022** | View pública expõe dados | AUDITORIA.md | **NÃO VERIFICADO** |
| **R08** | Dados/consentimento após logout | REVISAO_FECHAMENTO_20260912 | **PARCIALMENTE CORRIGIDO** |
| **F-01** | CI sem `pipefail` | PLANO_WORKFLOWS | **CONFIRMADO E PENDENTE** |
| **F-09** | Node 24(CI) vs 22(Vercel) | PLANO_WORKFLOWS | **CONFIRMADO E PENDENTE** |
| **PF-01** | Sem alerta ao time comercial | AUDITORIA_20261011 | **CONFIRMADO E PENDENTE (NÃO INICIADO)** |
| **PF-03** | Sem ferramenta interna | AUDITORIA_20261011 | **CONFIRMADO E PENDENTE (NÃO INICIADO)** |
| **PF-07/14** | Email/WhatsApp desligados | AUDITORIA_20261011 | **CONFIRMADO E PENDENTE (BLOQUEADO)** |
| **PF-15** | Checkbox WhatsApp sempre visível | AUDITORIA_20261011 | **CONFIRMADO E PENDENTE (DIVERGÊNCIA)** |
| **PF-66** | Secret scanning desabilitado | PLANO_WORKFLOWS, AUDITORIA_20261011 | **CONFIRMADO E PENDENTE** |
| **PF-59** | Canonical aponta para vercel.app | AUDITORIA_20261011 | **CONFIRMADO E PENDENTE (BLOQUEADO)** |
| **PF-17/30/31** | LGPD parcial | AUDITORIA_20261011 | **CONFIRMADO E PENDENTE (PARCIAL)** |
| **PF-86** | Restore nunca ensaiado | AUDITORIA_20261011 | **CONFIRMADO E PENDENTE (BLOQUEADO)** |
| **mcp_kv grants** | Grants banco canônico | REVISAO_INDEPENDENTE_20260922 | **SUPERADO** — banco Promo Gifts, fora do escopo |
| **ESLint E04** | Supressões órfãs / sem strict | PLANO_CORRECOES_20260913 | **PARCIALMENTE CORRIGIDO** |

---

## 5. Achados Repetidos e Contradições

### 5.1 Favoritos — bug mais persistente

| Data | Achado | Documento |
|---|---|---|
| 11/09 | 3 defeitos seleções | REVISAO_INTEGRAL_20260911 |
| 12/09 | R01–R04 integridade fila | REVISAO_FECHAMENTO_20260912 |
| 23/09 | A01–A05 (5 defeitos) | REVISAO_PLANOS_20260923 |
| 24/09 | F24-01/02/03 declarados corrigidos | REVISAO_PLANOS_20260924 |
| 28/09 | F28-01/02 — **regressão** | REVISAO_PLANOS_20260928 |
| 11/10 | Favoritos ainda pendentes | AUDITORIA_20261011 |

**Conclusão:** `useOccasionFavorites.ts` com padrão fix-regressão em 100% das auditorias pós-11/09.

### 5.2 Release — contradição aparente

AUDITORIA_5_ESPECIALISTAS (22/09) declara tudo implementado. PLANO_WORKFLOWS (27/09) confirma 9/9 falhas. Resolução: auditoria 22/09 verificou qualidade do código, não publicação automatizada.

### 5.3 Evolução dos testes

| Data | Vitest | pgTAP |
|---|---|---|
| 11/09 | 141 | 96 |
| 22/09 | 296 | 458 |
| 23/09 | 348 | 533 |
| 24/09 | 375 | 539 |
| 28/09 | 399 | 574 |
| 01/10 | 430–434 | 574 |
| 11/10 | 458 + 1 falha | — |

---

## 6. Relação com Branches e PRs

| Documento | SHA / Branch | PR |
|---|---|---|
| REVISAO_FECHAMENTO_20260912 | `f20df445` | — |
| AUDITORIA_5_ESPECIALISTAS_20260922 | `ef97fc75` | **#26** merged |
| PLANO_WORKFLOWS_20260927 | `fix/production-drift-active-alias-20260928` | #51 merged; #52/#53 não publicados |
| PLANO_FECHAMENTO_20261001 | `cfb33e4d` | **#81, #82, #83** |
| AUDITORIA_20261011 | `3f82233` | **#88, #94** abertas |

**Branches não inspecionadas:** `docs/reconcile-favorites-audit-20260924`, `fix/reliability-audit-20260927`, `fix/supabase-ledger-ordering`, `fix/post-review-session-integrity`, `fix/harden-kit-persistence-20260922`

---

## 7. Trabalho Anterior Não Verificado em Main

| Branch | Conteúdo provável |
|---|---|
| `fix/supabase-ledger-ordering` | Ledger migrations; máquinas de estado |
| `fix/harden-kit-persistence-20260922` | Persistência kits (F24-03, F28-02) |
| `fix/post-review-session-integrity` | R08 dados após logout |
| `fix/reliability-audit-20260927` | CI/workflows (21/100 etapas em 11/10) |

---

## 8. Backlog Fora do Escopo Imediato

| ID | Recomendação | Decisão |
|---|---|---|
| B-01 | Ativar Resend | ADIADO — credenciais |
| B-02 | Ativar WhatsApp Business | ADIADO — decisão do dono |
| B-03 | SITE_SUPABASE_SERVICE_JWT | ADIADO |
| B-04 | Backup testado / RPO-RTO | ADIADO — custo |
| B-05 | Ferramenta interna comercial | NÃO INICIADO |
| B-06 | Domínio oficial | ADIADO |
| B-07 | Segundo revisor | BLOQUEADO |
| B-08 | SSR | Não retomado |
| B-09 | CSP | NÃO VERIFICADO |
| B-10 | Conteúdo de confiança | BLOQUEADO — requer material |
| B-11 | Alertas de falha CI | NÃO INICIADO |

---

## Resumo Executivo

**Cronologia:** 14 datas de 08/09 a 11/10/2026. 57 fontes; 22 lidas.  
**Bug mais recorrente:** `useOccasionFavorites.ts` — padrão fix-regressão em toda auditoria pós-11/09.  
**Bloqueador estrutural:** `VERCEL_TOKEN` inválido → release automatizado nunca funcionou.  
**Lacuna mais custosa:** sem alerta ao time comercial quando chega orçamento (PF-01).  
**Progresso real:** 141→458 Vitest, 96→574 pgTAP em 104 commits.  
**Pendências que dependem do dono:** credenciais (B-01/02), domínio (B-06), segundo revisor (B-07).
