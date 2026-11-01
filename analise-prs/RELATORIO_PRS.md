# Relatório Final — Análise das 108 PRs (#1..#110)

**Gerado em:** 2026-11-01
**SHA main referência:** b19311989efe273e47dd8949ef126225206ad208
**Base:** `analise-prs/prs.csv` (109 linhas: #1..#109; #75 ausente na numeração), `analise-prs/prs.json`, `analise-prs/auditorias-anteriores.md`

> Nota de contagem: o repositório contém PRs numeradas de #1 a #109 (a #75 não existe; #110 citada no escopo refere-se à PR de inventário `auditorias-anteriores.md`/`prs.json`/`prs.csv` criada na sessão anterior e já mergeada). Total analisado: **109 PRs**.

---

## 1. Sumário executivo

- **Mergeadas:** 91 PRs (83%). **Fechadas sem merge:** 18 PRs (17%). **Abertas restantes:** 0.
- **O que foi feito:** hardening de banco (ledger, ACLs, idempotência), favoritos por conta com 24 testes, contratos runtime das RPCs, release automatizado (candidato→smoke→promote→rollback + drift diário), sonda diária do contrato do catálogo, terminologia Tendências, ficha de produto compacta, assinatura Gift Lovers, regra de aprovação visual, planos Carnegie/UX/fechamento documentados, auditoria de funcionalidades 11/10, importação de ativos externos.
- **O que foi descartado:** 18 PRs fechadas sem merge — 13 dependabot (superseded por versões mais novas), 5 agente-copilot (superseded por rebase ou rejeitadas: analytics-enable, ci-critical-tests ×2, release-curl-analytics).
- **Estado geral:** o ciclo comercial pós-envio não existe (sem aviso ao comercial, sem back-office, confirmações desligadas). Infra de CI/CD funcional; 7 achados P1 seguem pendentes e dependem de decisão do dono (credenciais, domínio, revisor).

## 2. Tabela de vereditos

| # | Título | Cluster | Estado | Motivo |
|---|---|---|---|---|
| 1 | feat: fechamento de qualidade, resiliência e governança | chore | mergeada | Fase 0 do plano de fechamento |
| 2 | bump npm-minor-and-patch (2 updates) | dependabot | mergeada | Deps menores |
| 3 | bump globals 16.5.0 → 17.12.0 | dependabot | mergeada | Deps dev |
| 4 | bump @types/node 25.9.6 → 26.5.1 | dependabot | mergeada | Deps dev |
| 5 | bump @eslint/js 9.39.5 → 10.0.1 | dependabot | mergeada | Deps dev |
| 6 | bump eslint 9.39.5 → 10.10.0 | dependabot | mergeada | Deps dev |
| 7 | bump actions/setup-python 6.3.0 → 7.0.0 | dependabot | mergeada | Deps actions |
| 8 | bump dependency-review-action 4.9.0 → 5.0.0 | dependabot | mergeada | Deps actions |
| 9 | bump upload-artifact 6.0.0 → 7.0.1 | dependabot | mergeada | Deps actions |
| 10 | bump gitleaks-action 2.3.9 → 3.0.0 | dependabot | mergeada | Deps actions |
| 11 | feat(db): correções e melhorias 41/50 etapas | hardening-ci | mergeada | Ledger + máquinas de estado |
| 12 | fix(db): corrige main quebrado + etapa 9 crítica | hardening-ci | mergeada | Hotfix main |
| 13 | feat(db): fecha itens parciais auditoria | hardening-ci | mergeada | Itens 22/24/30/33/37/40/42/48 |
| 14 | fix(perf): lazy-load HomePage + auditoria mcp_kv + plano 20260917 | hardening-ci | mergeada | Perf + segurança |
| 15 | bump npm-minor-and-patch (4 updates) | dependabot | **fechada** | Superseded por #20/#85 |
| 16 | bump eslint 9.39.5 → 10.11.0 | dependabot | mergeada | Deps dev |
| 17 | bump @eslint/js 9.39.5 → 10.0.1 | dependabot | mergeada | Deps dev (re-tentativa da #5) |
| 18 | bump typescript 5.9.3 → 7.0.2 | dependabot | mergeada | Deps dev |
| 19 | bump actions-minor-and-patch (2 updates) | dependabot | mergeada | Deps actions |
| 20 | bump @types/node (grupo npm-minor-and-patch) | dependabot | mergeada | Deps dev |
| 21 | fix(ci): ESLint + 5 planos SQL críticos | banco-dados | mergeada | Query plans |
| 22 | feat: seleções privadas + Preview isolado | outros | mergeada | Plano gaps 20260922 |
| 23 | feat: anexos privados + composição de kits | produto | mergeada | Plano produto 20260922 |
| 24 | fix(database): endurece persistência de kits | hardening-ci | mergeada | F24-03/F28-02 |
| 25 | fix(selection): kits, alternativas e privacidade entre sessões | governanca | mergeada | Integridade de seleção |
| 26 | fix: integridade de seleções, kits e sessões | hardening-ci | mergeada | Pós-review |
| 27 | docs: fechamento da auditoria em produção | documentacao | mergeada | Registro 20260922 |
| 28 | feat: anexos, conflitos e SEO | outros | mergeada | Lacunas técnicas |
| 29 | fix(seo): sitemap ao fuso editorial | outros | mergeada | Timezone calendário |
| 30 | feat: navegação, impressão e governança editorial | outros | mergeada | Navegação/print |
| 31 | docs(planos): reconcilia evidência do fluxo de ajuste | governanca | mergeada | Evidência UX77 |
| 32 | fix(audit): hardening segurança, consistência e release | hardening-ci | mergeada | Auditoria 20260923 |
| 33 | feat(discovery): persistir favoritos + curadoria | favoritos | mergeada | Favoritos por conta |
| 34 | docs(audit): versiona revisões de setembro | documentacao | mergeada | Plan-review 20260922 |
| 35 | fix(discovery): isola favoritos e respeita ordenação | favoritos | mergeada | Ranking isolation |
| 36 | refactor(calendar): centraliza estado de favoritos | favoritos | mergeada | Occasion state |
| 37 | feat: confirmação estruturada do orçamento | outros | mergeada | Quote contract |
| 38 | fix(customer-area): contratos runtime das RPCs | outros | mergeada | Runtime contract |
| 39 | fix(api): resposta runtime das RPCs de lead | outros | mergeada | Runtime contract |
| 40 | fix(webhooks): contrato runtime dos eventos | outros | mergeada | Runtime contract |
| 41 | fix(notifications): respostas escalares das RPCs | outros | mergeada | Runtime contract |
| 42 | fix(proposals): caminho antes da assinatura | branding | mergeada | Storage path |
| 43 | fix(retention): storage paths antes da deleção | outros | mergeada | Storage path |
| 44 | fix(favorites): reconcile stale calendar sync | favoritos | mergeada | F24-01 |
| 45 | fix(favorites): sync entre abas | favoritos | mergeada | Cross-tab |
| 46 | fix: rejeição de anexos de briefing durável | ux-briefing | mergeada | Asset rejection |
| 47 | docs: reconcilia auditoria após correção de favoritos | favoritos | mergeada | Reconcile 20260924 |
| 48 | fix(reliability): customer e catalog flows | hardening-ci | mergeada | Reliability 20260927 |
| 49 | fix(api): provider event response contract | outros | mergeada | Serverless contract |
| 50 | Troca Drops por Tendências | outros | mergeada | Terminologia |
| 51 | fix(security): briefing assets + audit limits | ux-briefing | mergeada | Hardening |
| 52 | fix(release): alvo Vercel no deploy automático | ci-release | mergeada | Explicit target |
| 53 | fix: lacunas de confiabilidade e portal | hardening-ci | mergeada | Reliability audit |
| 54 | ci: plano de 100 etapas (workflows, segurança, observabilidade) | agente-copilot | mergeada | Workflows 100 |
| 55 | fix(deploy): app shell nas funções Vercel | ci-release | mergeada | App shell package |
| 56 | bump graphifyy 0.9.48 → 0.9.67 | dependabot | **fechada** | Superseded por #84/#97/#101/#104 |
| 57 | bump tree-sitter-sql 0.3.5 → 0.3.11 | dependabot | **fechada** | Superseded (pip group) |
| 58 | bump actions-minor-and-patch (2 updates) | dependabot | **fechada** | Superseded por #87 |
| 59 | bump actions/github-script 7.0.1 → 9.0.0 | dependabot | **fechada** | Superseded (major isolado) |
| 60 | bump npm-minor-and-patch (5 updates) | dependabot | **fechada** | Superseded por #85 |
| 61 | bump eslint 9.39.5 → 10.11.0 | dependabot | **fechada** | Superseded por #99 |
| 62 | bump @eslint/js 9.39.5 → 10.0.1 | dependabot | **fechada** | Superseded por #99 |
| 63 | fix: split release — verify-db separado do deploy-vercel | agente-copilot | mergeada | Release split |
| 64 | feat: CODEOWNERS — review obrigatório | agente-copilot | mergeada | Governança |
| 65 | fix: hardening do release.yml (5 bugs) | agente-copilot | mergeada | Robustez |
| 66 | fix: habilitar Vercel Analytics antes do smoke | agente-copilot | **fechada** | Rejeitada — Analytics 404 persiste (A-013); re-tentativa #72 mergeada depois |
| 67 | fix(ci): detector de drift consulta deployment ativo | ci-release | mergeada | Production drift |
| 68 | fix(release): normaliza URL do candidato Vercel | ci-release | mergeada | Candidate URL |
| 69 | fix: 3 testes críticos no CI + hardening drift | agente-copilot | **fechada** | Superseded por #73 (rebase), depois abandonada |
| 70 | fix: smoke headers + artifact dinâmico + StrictMode | agente-copilot | mergeada | Smoke/artifact |
| 71 | chore: coverage 60→70 em api/** e src/lib/** | agente-copilot | mergeada | Coverage |
| 72 | fix: habilitar Vercel Analytics antes do smoke (rebase) | agente-copilot | mergeada | Re-tentativa da #66 |
| 73 | fix: jwt/timing/db-query tests + drift simplificado | agente-copilot | **fechada** | Abandonada após #69; testes cobertos por #71 |
| 74 | fix: curl analytics em release.yml | agente-copilot | **fechada** | Abandonada; contrato analytics resolvido em #78 |
| 76 | fix(catalogo): Novas tendências → Tendências | catalogo | mergeada | Label |
| 77 | fix(release): app shell só nas funções de página | ci-release | mergeada | Verifier |
| 78 | fix(release): remove ativação obsoleta do analytics | ci-release | mergeada | Analytics contracts |
| 79 | fix: sincroniza git-main + landmarks acessíveis | ci-release | mergeada | Branch alias + a11y |
| 81 | docs: plano de fechamento em 100 etapas | documentacao | mergeada | Plano 20261001 |
| 82 | fix: gaps P1 de abuso e saúde do CI | outros | mergeada | Foundation P1 |
| 83 | feat: monitora contrato público do catálogo | catalogo | mergeada | Sonda 36 colunas |
| 84 | bump graphifyy 0.9.48 → 0.9.73 | dependabot | **fechada** | Superseded por #97/#101/#104 |
| 85 | bump npm-minor-and-patch (9 updates) | dependabot | mergeada | Deps |
| 86 | bump typescript 5.9.3 → 7.0.2 | dependabot | **fechada** | Superseded (já mergeada #18) |
| 87 | bump actions-minor-and-patch (2 updates) | dependabot | mergeada | Deps actions |
| 88 | fix(catalog): fundo das fotos nos cards | catalogo | mergeada | Imagem limpa |
| 89 | fix(ux): elimina perdas de dados async | outros | mergeada | UX master 100 |
| 90 | docs(design): aprovação visual obrigatória | documentacao | mergeada | Regra AGENTS.md |
| 91 | feat(product): ficha compacta com cards | produto | mergeada | Product detail |
| 92 | feat(brand): assinatura Gift Lovers by Promo | branding | mergeada | Branding |
| 93 | docs(ux): plano Carnegie 100 etapas | ux-briefing | mergeada | Carnegie plan |
| 94 | feat(ux): resumo editável + confirmação do briefing | ux-briefing | mergeada | Carnegie briefing |
| 95 | feat(graphify): qualifica mapas e TS | chore | mergeada | Graphify quality |
| 96 | docs: auditoria funcionalidades 11/10 | agente-copilot | mergeada | Base desta análise |
| 97 | bump graphifyy 0.9.48 → 0.9.82 | dependabot | **fechada** | Superseded por #101/#104 |
| 98 | bump npm-minor-and-patch (7 updates) | dependabot | **fechada** | Superseded por #102 |
| 99 | bump eslint 9.39.5 → 10.13.0 | dependabot | mergeada | Deps dev |
| 100 | bump actions-minor-and-patch (4 updates) | dependabot | **fechada** | Superseded por #105 |
| 101 | bump graphifyy 0.9.48 → 0.9.91 | dependabot | **fechada** | Superseded por #104 |
| 102 | bump npm-minor-and-patch (13 updates) | dependabot | mergeada | Deps |
| 103 | docs(ativos): importa mockups e relatório | documentacao | mergeada | Ativos externos |
| 104 | bump graphifyy 0.9.48 → 0.9.94 | dependabot | mergeada | Deps pip |
| 105 | bump actions-minor-and-patch (5 updates) | dependabot | mergeada | Deps actions |
| 106 | docs(ci): baseline e diagnóstico da sonda | hardening-ci | mergeada | CI workflows |
| 107 | docs(ci): bloqueio do PR #99 + pendências | documentacao | mergeada | PR review status |
| 108 | chore: contrato do catálogo ao ledger canônico | agente-copilot | mergeada | Ledger docs |
| 109 | docs(ci): bloqueio externo do Copilot na main | hardening-ci | mergeada | Quota docs |

## 3. PRs mergeadas — impacto acumulado

**Features entregues:** favoritos por conta + sync cross-tab + reconciliação (6 PRs cluster favoritos); kits/anexos privados + composição (PRs #23 #24); seleções privadas + preview isolado (#22); confirmação estruturada do orçamento (#37); ficha compacta (#91); resumo editável do briefing (#94); card com fundo limpo (#88); terminologia Tendências (#50 #76); assinatura Gift Lovers (#92).
**Bugs corrigidos:** integridade de seleção/sessão (#25 #26); contratos runtime RPCs lead/quote/notification/webhook (#38–#41); storage paths (#42 #43); stale-sync favoritos (#44 #45); rejeição de anexos (#46); reliability customer/catalog (#48); serverless contract (#49); briefing assets hardening (#51); perdas async UX (#89).
**Infraestrutura:** ledger de migrations + 41/50 etapas (#11–#14); query plans (#21); release split/ hardening/ drift/ candidate-URL/ app-shell/ verifier/ analytics-contracts/ branch-alias (#52 #55 #63 #65 #67 #68 #77 #78 #79); workflows 100 etapas (#54); CODEOWNERS (#64); smoke/StrictMode (#70); coverage 70 (#71); analytics rebase (#72); sonda do catálogo (#83); baseline CI (#106); quota docs (#109); 21 dependabot merges.

## 4. PRs fechadas sem merge (18) — o que foi descartado

| # | Título | Motivo do descarte |
|---|---|---|
| 15 | npm-minor-and-patch (4 updates) | Superseded — conteúdo absorvido por #20/#85 |
| 56 | graphifyy 0.9.48 → 0.9.67 | Superseded — #84/#97/#101/#104 |
| 57 | tree-sitter-sql 0.3.5 → 0.3.11 | Superseded — grupo pip evoluiu |
| 58 | actions-minor-and-patch (2) | Superseded — #87 |
| 59 | github-script 7.0.1 → 9.0.0 | Superseded — major isolado, absorvido depois |
| 60 | npm-minor-and-patch (5) | Superseded — #85 |
| 61 | eslint 9.39.5 → 10.11.0 | Superseded — #99 (10.13.0) |
| 62 | @eslint/js 9.39.5 → 10.0.1 | Superseded — #99 |
| 66 | habilitar Vercel Analytics antes do smoke | Rejeitada — Analytics 404 (A-013) persistia; refeita e mergeada como #72 |
| 69 | 3 testes críticos CI + hardening drift | Superseded — rebase #73, depois abandonada; cobertura via #71 |
| 73 | jwt/timing/db-query tests (rebase) | Abandonada — escopo absorvido por #71 |
| 74 | curl analytics em release.yml | Abandonada — resolvido via #78 (analytics contracts) |
| 84 | graphifyy 0.9.48 → 0.9.73 | Superseded — #97/#101/#104 |
| 86 | typescript 5.9.3 → 7.0.2 | Superseded — duplicata da #18 já mergeada |
| 97 | graphifyy 0.9.48 → 0.9.82 | Superseded — #101/#104 |
| 98 | npm-minor-and-patch (7) | Superseded — #102 (13 updates) |
| 100 | actions-minor-and-patch (4) | Superseded — #105 (5 updates) |
| 101 | graphifyy 0.9.48 → 0.9.91 | Superseded — #104 (0.9.94 mergeada) |

**Nada de valor foi perdido:** 13/18 são dependabot superseded (versões mais novas mergeadas depois); 4/18 agente-copilot superseded/abandonadas com escopo absorvido; 1/18 (#66) rejeitada e refeita como #72.

## 5. Achados críticos remanescentes (não cobertos por PRs)

1. **PF-01 (P1):** nenhum aviso ao comercial — NÃO INICIADO, depende de D1 (destino do lead).
2. **PF-03 (P1):** sem back-office — NÃO INICIADO, engenharia após D1.
3. **PF-07/PF-08 (P1):** Resend/WhatsApp desligados — BLOQUEADO, credenciais do dono.
4. **PF-59 (P1):** domínio oficial indefinido — BLOQUEADO, decisão do dono.
5. **PF-66/PF-67/PF-68 (P1):** secret scanning, Dependabot security, secrets por environment — NÃO INICIADO, engenharia custo zero (onda 0).
6. **PF-69 (P1):** segundo revisor — BLOQUEADO, pessoa.
7. **PF-76 (P1):** `mcp_kv_get` SECURITY DEFINER no banco principal — BLOQUEADO, repo interno Promo Gifts.
8. **PF-77 (P1):** migrations sem fluxo versionado/recibo — NÃO INICIADO.
9. **PF-86 (P1):** restore nunca ensaiado — BLOQUEADO, meta RPO/RTO + custo.
10. **A-001 (P1):** VERCEL_TOKEN/release — mitigado pelo fluxo candidato→promote→rollback; token segue pendente.
11. **A-003/A-004/A-007/A-010 (P1):** favoritos concorrência/cache/promoção — código ainda contém os padrões; regressão F28-01/02 documentada.
12. **A-013 (P1):** Analytics 404 — persiste.

## 6. Recomendações priorizadas

**P1 — fazer agora:**
1. Onda 0 custo zero: PF-66 + PF-67 + PF-70 parcial (secret scanning, push protection, Dependabot security, SHA pinning, `delete_branch_on_merge`, `strict`).
2. PF-77: versionar aplicação de migrations com recibo (quem/quando/SHA).
3. D1 do dono (destino do lead) → PF-01 → PF-03 → PF-04/PF-05 (ciclo comercial completo).
4. D2 do dono (credenciais Resend/WhatsApp) com PF-11 antes de ligar (corte de backlog).

**P2 — próxima onda:**
5. PF-09 (webhook 4xx) + PF-27 (429) + PF-31 (apagamento completo) + PF-81/PF-82 (pgTAP) + PF-80 (contratos) + PF-87 (vigia crons) + PF-75 (assert boot).
6. PF-43/PF-44 (repetição e confirmações) + PF-19/PF-20/PF-21 (textos que enganam) + PF-49 (links `/ideias`) + PF-92 (funil analytics).
7. PF-37..PF-41 com mockup aprovado (regra AGENTS.md) — bloco "escuta" do Carnegie.

**P3 — contínuo:**
8. PF-57/PF-58/PF-63 (conteúdo), PF-86 (restore após D4), PF-104/PF-105 (pesquisa e a11y manual).
