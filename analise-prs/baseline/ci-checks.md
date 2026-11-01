# Baseline de CI — checks obrigatórios

**Gerado em:** 2026-11-01
**SHA main referência:** b19311989efe273e47dd8949ef126225206ad208
**Método:** leitura direta dos 12 arquivos em `.github/workflows/` no SHA base. Histórico de runs (`gh run list`) NÃO VERIFICADO nesta sessão — sem CLI disponível; seção 3 marcada como pendente.

## 1. Os 5 checks obrigatórios (o que cada um verifica)

| # | Check | Workflow | O que verifica |
|---|---|---|---|
| 1 | **validate** | `quality.yml` | Typecheck (`tsc`), lint (ESLint), testes Vitest com threshold de coverage (branches 70% em `api/**` e `src/lib/**` — PR #71), build Vite |
| 2 | **Build structural Graphify map** | `graphify.yml` | Reconstrói o grafo de código (`graphify-out/`); falha se o mapa estiver desatualizado ou se `graphify-quality` apontar gaps |
| 3 | **Migrations and pgTAP** | `database.yml` | Aplica as 65 migrations em banco local efêmero e roda os 28 arquivos pgTAP em `site-supabase/supabase/tests/database/`; valida contratos SQL sem tocar produção |
| 4 | **cross-browser** | (workflow cross-browser) | Playwright multi-navegador (smoke + axe em rotas públicas); garante que páginas críticas renderizam sem erro em Chromium/Firefox/WebKit |
| 5 | **CodeQL** | `codeql.yml` | Análise estática de segurança (CodeQL GitHub) + `dependency-review` bloqueando PRs com vulnerabilidades conhecidas |

Workflows auxiliares (não bloqueantes do merge, mas parte da operação): `release.yml` (candidato→smoke→promote→rollback + leitura do ledger), `catalog-contract.yml` (sonda diária das 36 colunas do contrato público), `production-drift.yml` (detector de drift main×produção), `ci-health.yml` (saúde do CI), `workflows-lint.yml` (lint dos próprios workflows), `secrets-rotation-reminder.yml` (lembrete trimestral de rotação), `stale-branches.yml` (limpeza de branches), `dependency-review.yml` (revisão de dependências).

## 2. Falhas recorrentes identificadas (via auditorias lidas)

1. **Release falhava em `vercel pull` ("Could not retrieve Project Settings")** — A-001; mitigado pelo fluxo candidato→promote→rollback (PRs #52 #55 #63 #65 #67 #68 #77 #78 #79).
2. **Runtime Node do release × lockfile** — `release.yml` fixava Node 22.13.1 contra `jsdom@30.1.0` exigindo `^22.22.2 || ^24.15.0`; EBADENGINE no log (A-002); alinhado para Node 24 depois.
3. **Analytics 404** — `_vercel/insights/script.js` responde 404 em produção (A-013); PR #66 rejeitada por isso, refeita como #72; contrato resolvido em #78.
4. **Bloqueio externo do Copilot na main** — registrado em PR #109 (quota 402); CI parado por falta de cota, não por falha de código.
5. **Bloqueio do PR #99** — registrado em PR #107 (diagnóstico da sonda do catálogo).

## 3. Histórico recente — NÃO VERIFICADO nesta sessão

> Pendente: rodar `gh run list --repo adm01-debug/Promo_Brindes_V1 --limit 20` em sessão com CLI disponível e anexar os 10 últimos runs (conclusão, SHA, duração) aqui.

Evidência indireta (auditorias): em 24/09 os checks validate, cross-browser, migrations/pgTAP, Graphify, dependency review e CodeQL estavam verdes na PR #47; retenção diária com logs 09–11/10; sonda do catálogo verde 02–11/10.
