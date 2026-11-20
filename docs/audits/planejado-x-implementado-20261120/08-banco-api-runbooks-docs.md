## Lote H — banco, API, runbooks, docs novos (confirma PFs; só novos abaixo)
Confirmações relevantes do lote H (coincidem com A–D): PF-01 PARCIAL (ajuste não enfileira; `request_kind` só quote|contact), PF-03/04/05 NÃO INICIADO/DIVERGÊNCIA, PF-06 feito código (#158), PF-09 PARCIAL (RPC inválida → 500 loop; doc alinhado ao bug), PF-10/27/31/77/80/85/102/103/112 IMPLEMENTADO, PF-11 PARCIAL, PF-12 NÃO INICIADO, PF-14/15 PARCIAL, PF-17/30 NÃO INICIADO, PF-23/24/25 PARCIAL, PF-32 PARCIAL (órfãos provider_events nunca purgados: `grep delete from site_private.notification_provider_events` = 0; 8 tabelas sem comment), PF-34 NÃO INICIADO, PF-35 PARCIAL, PF-73 PARCIAL, PF-75 removido (preflight inexistente), PF-76 BLOQUEADO sem recibo (`RUNBOOK_BANCO_PRINCIPAL.md:76-78`), PF-78 PARCIAL, PF-79 PARCIAL (retorno Json manual), PF-81 NÃO INICIADO, PF-82 NÃO INICIADO (`set local role` só site_api/postgres), PF-83 BLOQUEADO (+`publicProductPage.ts:96`), PF-84 NÃO INICIADO, PF-87 NÃO INICIADO, PF-88 PARCIAL, PF-90 NÃO INICIADO+DIVERGÊNCIA, PF-91 DIVERGÊNCIA, PF-92 PARCIAL, PF-93 NÃO INICIADO, PF-94 PARCIAL, PF-100/101 PARCIAL, PF-106/108/109 PARCIAL, PF-114 PARCIAL, PF-120/125 NÃO INICIADO, PF-49 IMPLEMENTADO, PF-53 PARCIAL, PF-63 PARCIAL-VALIDAÇÃO.

| ID | Funcionalidade | Estado | O que falta | Evidência | Quem |
|---|---|---|---|---|---|
| NOVO-DB-01 | Alerta comercial para pedido de ajuste | NÃO INICIADO | Ampliar CHECK `request_kind`; trigger em `quote_adjustment_requests`; claim filtra só quote/contact | `20260908230000:86`; `20261117010000:116,161`; `request_my_quote_adjustment` `20260923120000:162-215` sem enqueue | ENG |
| NOVO-DB-02 | Apagamento LGPD cobre alertas comerciais pendentes de contato | PARCIAL | `erase_customer_data` cancela só `request_kind='quote'`; `20261117030100` afirma "nada enfileira contact" mas `20261117010000` enfileira (payload sem PII → consistência) | `20261117030000:127-136,205-209` | ENG |
| NOVO-DB-03 | pgTAP de `finalize_site_storage_retention` | NÃO INICIADO | só Vitest mock | `tests/api/retention.test.ts`; grep tests/ = 0 | ENG |
| NOVO-DB-04 | `allowedSiteOrigins` multi-domínio sem teste direto | PARCIAL | sem teste importando `siteOrigin.ts` | `api/_lib/siteOrigin.ts:1-20`; `grep allowedSiteOrigins tests` = 0 | ENG |
| NOVO-RB-01 | RUNBOOK_RELEASE "integração Supabase aplica migrations" | DIVERGÊNCIA | release.yml aplica (#165) | `RUNBOOK_RELEASE.md:11`; `release.yml:79-103` | ENG |
| NOVO-RB-02 | RUNBOOK_INCIDENTES "503 sem processar" / "alerta já dispara" | DIVERGÊNCIA (leve) | mede antes do 503; alerta depende de webhook | `RUNBOOK_INCIDENTES.md:24-27,108-112` | ENG |
| NOVO-RB-03 | RUNBOOK_VERIFICACAO_DB "17 tabelas" | DIVERGÊNCIA | 21 | `:93-99` | ENG |
| NOVO-RB-04 | RUNBOOK_PEDIDO_TITULAR "28/513 contratos", função `20260923120000` | DIVERGÊNCIA | `plan(43)`; soma 608; vigente `20261117030000` | `:22,30,84-86` | ENG |
| NOVO-RB-05 | RUNBOOK_ROTACAO "CRON_SECRET sem redeploy" | DIVERGÊNCIA | contradiz `RUNBOOK_SITE_API_CUTOVER.md:67-68` | `:19-22` | ENG |
| NOVO-RB-06 | RUNBOOK_REVISAO_MENSAL sem automação/execução | NÃO INICIADO | — | grep workflows = 0 | ENG + DONO |
| NOVO-DOC-01 | AGENTS.md/docs: contexto "a cada 10 min" | DIVERGÊNCIA | cron horário desde #140 | `AGENTS.md:15,74`; `contexto-agentes.md:21,38`; `contexto.yml:48-49` | ENG |
| NOVO-DOC-02 | vercel-deploy.md lista 2 crons | DIVERGÊNCIA | falta `/api/commercial-alerts` */5 | `vercel-deploy.md:12`; `vercel.json:8` | ENG |
| NOVO-DOC-03 | MATRIZ_RISCO vazios | PARCIAL (3/5 fechados) | restam Firefox/WebKit só CI, alerta sem destino, `/montar-kit` só smoke, `/minha-conta` sem spec; diz 3 arquivos → 6 | — | ENG/DONO |
| NOVO-DOC-04 | REFS_AUTOSAVE `retryOnAuth401` | IMPLEMENTADO | — | `check-catalog-public-contract.mjs:217-223` (#202) | — |
| NOVO-DOC-05 | prod-readiness: `www.promobrindes.com.br` 200 mas canonical/sitemap/robots em vercel.app | DIVERGÊNCIA (reforça PF-59) | — | `prod-readiness.md:72`; `robots.txt:4`; `Seo.tsx:35` | DONO |
| NOVO-DOC-06 | prod-readiness/AUTOMACAO_LOCAL contagens (66 migrations/14 workflows) | DIVERGÊNCIA leve | 69/15 | — | ENG |
| NOVO-DOC-07 | AUTOMACAO_LOCAL timer 04:30/hooks | BLOQUEADO (máquina do dono) | — | `:29-31` | DONO |
| NOVO-DOC-08 | funcionalidades.csv defasado em ≥11 linhas | DIVERGÊNCIA | F-06, F-10, F-27, F-31, F-75, F-80, F-85, F-98 fechados; F-01, F-09, F-14/15, F-63, F-77, F-79, F-96, F-101 avançaram; 15 COMPLETA amostradas confirmadas (F-108 remoto) | — | ENG |
| NOVO-DOC-09 | regras-de-negocio.md RNs vencidas | DIVERGÊNCIA | RN-ORC-12, RN-NOT-02, RN-NOT-04, RN-AUTH-04, RN-AUTH-09, RN-FIN-02, RN-FIN-04 | — | ENG |
| NOVO-DOC-10 | PENDENCIAS.md | PARCIAL | #99 resolvido (`eslint-plugin-jsx-a11y-x@0.2.0`); Copilot 402 externo | `package.json:128` | DONO |
| NOVO-DOC-11 | RELATORIO_CI "publicar diagnóstico da sonda" | IMPLEMENTADO | — | #139 | — |
| NOVO-DOC-12 | AUDITORIA.md A-01..A-22 | — | A-018 ABERTO (shell monta URL com `VITE_PUBLIC_URL`/`SITE_PUBLIC_ORIGIN` `publicProductPage.ts:63`); A-022 BLOQUEADO; A-013 remoto; demais fechados | — | ENG/DONO |
| NOVO-TODO-01 | `catalog.ts:329` "Compatibilidade temporária" (= PF-83) | PARCIAL | único marcador real | — | DONO |
