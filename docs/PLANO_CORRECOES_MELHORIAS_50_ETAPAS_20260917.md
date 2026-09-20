# Plano de correções e melhorias — 50 etapas (fase seguinte)

Data-base: 17/09/2026. Fonte: auditoria local ⇄ GitHub ⇄ Supabase executada nesta data
(branch `fix/supabase-ledger-ordering`, PR #13; projeto do site `xlzmclcjdncjfdrjxclt`;
projeto principal `doufsxqlfjyuvxuezpln`, acessado via MCP `SUPABASE - GESTÃO DE PRODUTOS`).

Este plano é a fase seguinte a `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md`: não
repete as etapas já fechadas lá (5, 9, 15, 16, 22, 24, 31, 33, 37, 38, 40 parcial, 44, 45).
Duas classes de etapa compõem este documento:

- **Reabertas** — etapas do plano de 16/09 verificadas hoje com o checklist ainda em 0 ou
  parcial (contagem `marcados/total` obtida varrendo os checkboxes do arquivo anterior).
  O diagnóstico técnico original permanece válido; eu cito a etapa de origem em vez de
  reescrevê-lo, e atualizo só o que mudou desde 16/09.
- **Novas** — achados da auditoria de hoje que nenhum plano anterior cobriu: regressão de
  CI já vermelha em produção, drift de `main`, dependências desatualizadas, e uma lacuna
  estrutural grande — o banco **principal** (397 tabelas) nunca recebeu o mesmo tratamento
  etapa-a-etapa que o banco do site vem recebendo desde 13/09.

## Como usar este documento

- Cada etapa tem **Diagnóstico**, **Ação**, **Checklist de conclusão**, **Rollback/risco**
  e **Depende de**, no mesmo formato do plano de 16/09.
- Prioridade: **P0** (bloqueia deploy ou expõe risco de dado) · **P1** (corrigir nesta
  iteração) · **P2** (melhoria estrutural) · **P3** (maturidade/DX).
- Esforço: **P** (≤ 2 h) · **M** (½–1 dia) · **G** (> 1 dia).
- Uma etapa só é concluída quando o checklist está 100% marcado e o PR correspondente
  mergeou com os workflows do GitHub verdes — inclusive o `Quality gate`, que hoje está
  vermelho (etapa 1) e não pode ser ignorado por nenhuma etapa subsequente.

## Princípios (herdados do plano de 16/09, mais um novo)

1. Nenhum SQL é reaplicado em produção sem `db push --dry-run` limpo.
2. Todo comportamento novo do banco nasce com teste pgTAP; toda mudança de contrato de RPC
   nasce com teste vitest.
3. Medir antes de otimizar — vale para índice, consulta **e agora também para bundle**
   (etapa 1 institui isso para o frontend).
4. Privilégio mínimo é o padrão.
5. Nada de dado pessoal em log, alerta, comentário de migration ou fixture de teste.
6. **Novo:** nenhuma etapa deste plano é aberta como "concluída" sem o link do run do
   GitHub Actions correspondente — o plano de 16/09 teve itens marcados `[x]` que na
   prática dependiam de credencial humana nunca provisionada (etapa 6); este plano marca
   esses casos como bloqueados, não como parcialmente feitos.

## Status real após verificação (17/09/2026, mesma sessão de execução)

A tabela abaixo é o mapa **original**, de antes da execução — mantida como registro de
como o plano foi desenhado. A coluna "Origem" dela ficou desatualizada assim que a
execução começou a verificar cada "reaberta" contra migration/teste real em vez de contra
o checklist (que se provou não confiável duas vezes já — Etapas 9 e 10). Status real,
etapa a etapa, nas seções abaixo:

- **✅ Fechadas por trabalho já existente** (eu tinha marcado "reaberta, 0/X"; era o
  checklist que estava errado): 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24,
  26, 28 (nuance corrigida), 32, 34.
- **🟡 Implementadas, só falta ação humana fora do repositório**: 25 (corte de produção na
  Vercel).
- **✅ Decisão de engenharia já registrada — não são gaps, não devem ser "corrigidas" sem
  motivo novo**: 27, 28, 30.
- **🔧 Corrigidas/fechadas nesta própria sessão de execução**: 1 (bundle), 6 (deps).
- **📋 Parcialmente abertas, com escopo real medido** (não suposição): 29 (falta só
  rotação agendada), 31 (4 de 16 tabelas documentadas, não 0), 35 (função pronta, falta
  integração de alerta).
- **🔴 Genuinamente abertas, sem progresso e sem decisão registrada**: 2, 3, 4, 5, 7, 8, 19,
  33, 36, 37, 38, e a Fase 8 inteira (39–45, nova).
- **Ainda não reverificadas contra este mesmo padrão nesta sessão**: 46–50 (Fases 9–10) —
  ver seções correspondentes; o processo de verificação foi aplicado por completo só às
  Fases 0–7.

## Mapa das 50 etapas (desenho original — ver status real acima)

| # | Etapa | Fase | Prior. | Esf. | Origem |
|---|---|---|---|---|---|
| 1 | Corrigir a regressão do orçamento de performance (318,3 KiB > 300 KiB) | 0 | P0 | M | Nova |
| 2 | Sincronizar `main` local e mergear o PR #13 antes de abrir novas etapas | 0 | P0 | P | Nova |
| 3 | Confirmar reconciliação do ledger remoto de migrations do site | 0 | P0 | P | Reaberta (Etapa 1/16-09) |
| 4 | Provisionar token/conector com acesso real ao projeto do site | 0 | P0 | M | Reaberta (Etapa 6/16-09) |
| 5 | Normalizar a migration do contrato canônico com `Promo_Gifts_V4` | 0 | P1 | M | Reaberta (Etapa 3/16-09) |
| 6 | Atualizar dependências menores (types/node, jsdom, lucide-react, react-router-dom) | 1 | P2 | P | Nova |
| 7 | Plano de migração isolado para ESLint 9→10 / `@eslint/js` 10 | 1 | P2 | M | Nova |
| 8 | Plano de migração isolado para TypeScript 5.9→7.0 | 1 | P3 | G | Nova |
| 9 | `npm audit` como gate obrigatório no CI | 1 | P1 | P | Nova |
| 10 | Guardrail de nome/ordem de migrations no CI | 1 | P1 | P | Reaberta (Etapa 4/16-09) |
| 11 | Sequência monotônica em `quote_request_events` | 2 | P1 | M | Reaberta (Etapa 7/16-09) |
| 12 | Máquina de estados de `quote_requests.status` por trigger | 2 | P1 | M | Reaberta (Etapa 8/16-09) |
| 13 | `lease_expires_at`/`claimed_at` explícitos na fila | 2 | P1 | M | Reaberta (Etapa 10/16-09) |
| 14 | Backoff exponencial com jitter calculado no servidor | 2 | P1 | M | Reaberta (Etapa 11/16-09) |
| 15 | Política única da fila `site_private.notification_policy()` | 2 | P1 | M | Reaberta (Etapa 12/16-09) |
| 16 | Índice alinhado à ordem de reivindicação da fila | 3 | P1 | P | Reaberta (Etapa 13/16-09) |
| 17 | Índice de recuperação de lease em `processing` | 3 | P1 | P | Reaberta (Etapa 14/16-09) |
| 18 | Testes de plano de execução (sem Seq Scan nas rotas quentes) | 3 | P2 | M | Reaberta (Etapa 17/16-09) |
| 19 | Revisão mensal de `pg_stat_statements` e índices sem uso | 3 | P3 | P | Reaberta (Etapa 18/16-09) |
| 20 | Concluir `fillfactor`/autovacuum nas tabelas de alta rotatividade | 3 | P2 | P | Reaberta (Etapa 40/16-09, 1/2) |
| 21 | Protocolo humano persistido e único | 4 | P1 | M | Reaberta (Etapa 19/16-09) |
| 22 | Precedência semântica de eventos de provedor | 4 | P1 | P | Reaberta (Etapa 20/16-09) |
| 23 | Tipos TypeScript gerados do schema e diffados no CI | 4 | P2 | M | Reaberta (Etapa 21/16-09) |
| 24 | Convenção formal de versionamento de RPC | 4 | P3 | P | Reaberta (Etapa 23/16-09) |
| 25 | Role `site_api` com privilégio mínimo no lugar de `service_role` | 5 | P0 | G | Reaberta (Etapa 25/16-09) |
| 26 | `force row level security` + teste que varre todas as tabelas | 5 | P1 | P | Reaberta (Etapa 26/16-09) |
| 27 | PII em repouso: hash para busca e mascaramento em `get_my_*` | 5 | P1 | G | Reaberta (Etapa 27/16-09) |
| 28 | Revisão da exposição do token de seleção compartilhada | 5 | P2 | P | Reaberta (Etapa 28/16-09) |
| 29 | Rotação programada de segredos + comparação em tempo constante | 5 | P1 | M | Reaberta (Etapa 29/16-09) |
| 30 | `pg_cron` como retaguarda dos crons da Vercel | 6 | P2 | M | Reaberta (Etapa 34/16-09) |
| 31 | Política de retenção por tabela + dicionário gerado | 6 | P2 | M | Reaberta (Etapa 35/16-09) |
| 32 | Trilha de auditoria de acesso administrativo direto | 6 | P2 | M | Reaberta (Etapa 36/16-09) |
| 33 | Backups: PITR confirmado + drill de restore trimestral | 6 | P0 | M | Reaberta (Etapa 39/16-09) |
| 34 | `statement_timeout`/`lock_timeout`/`idle_in_transaction` por role | 6 | P1 | P | Reaberta (Etapa 41/16-09) |
| 35 | Concluir saúde da fila integrada a alertas com SLA | 6 | P1 | M | Reaberta (Etapa 42/16-09, 1/3) |
| 36 | Fase B do contrato público: revogar `anon` na view legada | 7 | P1 | G | Reaberta (Etapa 43/16-09) |
| 37 | Teste de contrato cross-projeto no CI | 7 | P1 | M | Reaberta (Etapa 46/16-09) |
| 38 | Supabase Branching por PR com dados sintéticos | 7 | P3 | G | Reaberta (Etapa 47/16-09) |
| 39 | Auditar as 105 funções `SECURITY DEFINER` executáveis por anon/authenticated | 8 | P0 | G | Nova |
| 40 | Decidir o destino da extensão `pg_graphql` (516 dos 623 avisos de segurança) | 8 | P1 | M | Nova |
| 41 | Indexar as 4 FKs sem cobertura (`kit_quote_requests`, `kit_save_requests`) | 8 | P2 | P | Nova |
| 42 | Resolver a política RLS redundante em `system_settings` | 8 | P2 | P | Nova |
| 43 | Inventário mínimo de schema do banco principal (397 tabelas, hoje zero artefato local) | 8 | P1 | G | Nova |
| 44 | `db lint`/Security Advisor do projeto principal no CI (hoje só o site tem) | 8 | P1 | M | Nova |
| 45 | Runbook de reconciliação para o projeto principal (equivalente ao do site) | 8 | P2 | M | Nova |
| 46 | Fechar B01–B06 e a instabilidade WebKit B07 nos testes de contrato de falha | 9 | P1 | M | Reaberta (MATRIZ UX03, Parcial) |
| 47 | Métricas operacionais e resolução de conflito no carrinho de orçamento | 9 | P2 | M | Reaberta (MATRIZ UX02, Parcial) |
| 48 | Consolidar as 4 matrizes de revisão quase-duplicadas em uma fonte única | 9 | P3 | P | Nova |
| 49 | Runbook de restore + revisão por pares dos 5 runbooks existentes | 10 | P1 | M | Reaberta (Etapa 49/16-09, parcial) |
| 50 | Encerramento: checklist mestre, squash do PR #13, merge, tag de release | 10 | P1 | P | Nova |

---

## Fase 0 — Estabilização imediata

### Etapa 1 — Corrigir a regressão do orçamento de performance — ✅ FECHADA (17/09/2026)

**Diagnóstico.** `npm run build && npm run check:performance-budget` falha localmente e no
CI (`Quality gate`, runs `35154123150` no PR #13 e `35151245743` em `main`) com `Bundle de
entrada: 318,3 KiB excede o limite de 300 KiB` (`scripts/check-performance-budget.mjs`,
limite em `assertBudget('Bundle de entrada', entry, rawBytes(300))`). O chunk
`dist/assets/index-*.js` é hoje o maior do build (325,90 kB brutos / 101,93 kB gzip);
`siteSupabase-*.js` (214,92 kB) e `gsap-*.js` (69,59 kB) já são chunks separados, então o
crescimento está concentrado no chunk de entrada, não identificado ainda por falta de
análise de composição. Este plano não assume a causa — a etapa começa medindo.

**Ação.**
```bash
npm i -D rollup-plugin-visualizer
# adicionar visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true })
# a vite.config.ts condicionado a process.env.ANALYZE
ANALYZE=true npm run build
```
Com o `stats.html`, identificar o(s) módulo(s) que engordaram o chunk de entrada desde a
última medição (325 kB vs. o que era antes do PR #12/#13). Candidatos a investigar por já
serem importados fora de rotas com `lazy()`: `src/components/Layout.tsx` e
`src/context/CustomerAuthContext.tsx` importam `src/lib/siteSupabase.ts` — confirmar se
esse import é estático (entraria no chunk de entrada) ou se o chunk separado
`siteSupabase-*.js` já cobre isso e o excesso vem de outro lugar (ex.: cliente Supabase do
projeto principal, se também for importado eagerly em `Layout.tsx`/contexto raiz). Aplicar
`React.lazy()`/`import()` dinâmico no que só é necessário em rotas autenticadas.

**Causa raiz encontrada.** `rollup-plugin-visualizer` (novo, `ANALYZE=1 npm run build`)
mostrou que o chunk de entrada era dominado por `react-dom-client.production.js`
(inevitável — é o runtime do React) somado a `src/pages/HomePage.tsx` e tudo que ela importa
estaticamente (`QuoteDrawer`, `ConversationForm`, `CampaignFinder`, lógica de catálogo).
`src/App.tsx` já usa `lazy()` para **todas** as outras 16 rotas — `HomePage` era a única
exceção, importada de forma estática na linha 9 e usada direto na rota `/`.

**Checklist de conclusão.**
- [x] `dist/stats.html` gerado (`rollup-plugin-visualizer` adicionado como dependência dev
      e plugin condicional em `vite.config.ts`, ativado só com `ANALYZE=1`).
- [x] Causa raiz identificada: `HomePage` era a única rota sem `lazy()`. Corrigido em
      `src/App.tsx` (mesmo padrão das demais 16 rotas).
- [x] `npm run check:performance-budget` passa com folga: entrada caiu de 318,3 KiB para
      **275,6 KiB** (limite 300 KiB — 8% de margem), 325,90 kB → 282,20 kB brutos.
- [x] `npm run check` completo (lint, typecheck, vitest, migration-names, error-catalog,
      site-api-jwt, timing-safe-secrets, supabase-db-query, build, budget, e2e
      desktop/mobile chromium) roda limpo — 80 passed, 4 skipped, exit 0.
- [x] `npm run test:e2e:cross-browser` (firefox + webkit) também limpo — 74 passed, 10
      skipped, exit 0. Nenhuma quebra visual/funcional do lazy-loading da home em nenhum
      dos 4 motores testados.
- [x] Limite de 300 KiB mantido como está — não foi necessário subi-lo; a causa era uma
      inconsistência de code-splitting, não crescimento real de dependência.

**Rollback/risco.** Nenhum — mudança de build/tooling, sem efeito em runtime além do
particionamento de chunks. Risco de regressão de UX se um `lazy()` mal colocado causar
flash de loading em rota crítica; cobrir com teste E2E de fumaça na rota alterada.

**Depende de.** Nada.

### Etapa 2 — Sincronizar `main` local e mergear o PR #13

**Diagnóstico.** `main` local ficou **5 commits atrás** de `origin/main` nesta auditoria —
o mesmo problema que a Etapa 5 do plano de 16/09 já tinha "fechado" (`main` sincronizado
naquele dia). Reincidiu em menos de 24 h porque a sincronização foi manual, não
automatizada. Em paralelo, o PR #13 (`fix/supabase-ledger-ordering` → `main`) está
`MERGEABLE` mas com `mergeStateStatus: BEHIND`.

**Ação.**
```bash
git switch main && git pull --ff-only
git switch fix/supabase-ledger-ordering && git merge main   # ou rebase, conforme política do time
```
Depois de mergear/rebasear, resolver a Etapa 1 (bundle) neste mesmo branch antes de pedir
review, para o PR não ficar preso em `Quality gate` vermelho.

**Checklist de conclusão.**
- [ ] `git status -sb` em `main` sem `behind`.
- [ ] PR #13 com `mergeStateStatus: CLEAN`.
- [ ] Decisão registrada: automatizar isso (ex.: hook `post-checkout`/lembrete de CI que
      comenta no PR se `main` local do autor está desatualizado) ou aceitar como
      verificação manual recorrente — a recorrência em <24h sugere que a segunda opção já
      falhou uma vez.

**Rollback/risco.** Nenhum; merge/rebase padrão. Conferir que não há conflito silencioso
nas migrations do site (ordem de timestamp) ao mesclar.

**Depende de.** Etapa 1 (resolver o bundle no mesmo branch antes do merge final).

### Etapa 3 — Confirmar reconciliação do ledger remoto de migrations do site

**Diagnóstico.** Idêntico à Etapa 1 do plano de 16/09 — checklist ainda **0/4**. Continua
sem verificação porque depende de um `SUPABASE_ACCESS_TOKEN` real contra o projeto
`xlzmclcjdncjfdrjxclt` (Etapa 4 deste plano), que nunca foi provisionado. Hoje verifiquei
por REST (com a chave secreta do projeto) que as 19 funções RPC esperadas existem e batem
com as migrations locais — isso reduz o risco de que exista uma migration remota fantasma,
mas **não confirma** o estado de `supabase_migrations.schema_migrations`, que o REST não
expõe.

**Ação.** Ver Ação da Etapa 1 do plano de 16/09 (comandos `migration list` / `db push
--dry-run`). Só executável depois da Etapa 4 deste plano.

**Checklist de conclusão.** Idêntico ao da Etapa 1 do plano de 16/09 — reproduzido aqui
para rastreabilidade:
- [ ] `migration list` sem divergência Local/Remote para as 43 migrations atuais do site.
- [ ] `db push --dry-run` responde "Remote database is up to date".
- [ ] Saída anexada ao PR desta etapa (sem segredos).
- [ ] `docs/SITE_SUPABASE_SETUP.md` atualizado com a data e o resultado.

**Rollback/risco.** Nenhum — `migration repair` só toca o ledger, nunca executa SQL.

**Depende de.** Etapa 4.

### Etapa 4 — Provisionar token/conector com acesso real ao projeto do site

**Diagnóstico.** Idêntico à Etapa 6 do plano de 16/09 — ainda pendente (marcado como "ação
humana, não feita" no próprio plano anterior). Hoje mapeei **todos** os ~40 gateways MCP
disponíveis nesta conta e nenhum aponta para `xlzmclcjdncjfdrjxclt` nem para
`doufsxqlfjyuvxuezpln` sob um nome óbvio — o projeto principal só foi encontrado por
tentativa (`SUPABASE - GESTÃO DE PRODUTOS`, confirmado via `get_project_url`); o do site
segue acessível só por REST com a chave secreta, que não permite `pg_catalog`,
`supabase_migrations` nem `explain`.

**Ação.** Criar um `SUPABASE_ACCESS_TOKEN` de escopo mínimo (Personal Access Token restrito
ao projeto `xlzmclcjdncjfdrjxclt`, se o Supabase suportar escopo por projeto; caso
contrário, documentar o risco de escopo amplo) e guardá-lo no cofre do time. Se o time usar
MCP, nomear e registrar explicitamente qual gateway serve qual projeto (hoje essa
associação não existe em nenhum documento — é conhecimento tácito).

**Checklist de conclusão.**
- [ ] Token criado com escopo mínimo, guardado no cofre do time — nunca em `.env.local`
      versionado.
- [ ] `docs/RUNBOOK_VERIFICACAO_DB.md` atualizado com a confirmação de que os 5 comandos
      rodaram contra produção pelo menos uma vez.
- [ ] Uma tabela nova em `docs/` (ou seção do README de operações) mapeando
      `projeto Supabase → nome do gateway MCP → dono`, para a próxima auditoria não
      repetir a varredura de ~40 servidores.

**Rollback/risco.** Token com escopo largo é o risco principal — revogar e recriar se o
escopo vazar para outros projetos da conta.

**Depende de.** Nada — é o bloqueador raiz de várias etapas deste plano (3, 18, 19, 33, 49).

### Etapa 5 — Normalizar a migration do contrato canônico com `Promo_Gifts_V4`

**Diagnóstico.** Idêntico à Etapa 3 do plano de 16/09, ainda **0/4**.
`docs/sql/canonical/20260908190000_create_site_products_public_contract.sql` segue como o
único artefato "espelho" sem decisão formal do PO sobre incorporar ao SSOT
`Promo_Gifts_V4` ou manter só como referência local.

**Ação.** Ver Ação da Etapa 3 do plano de 16/09 — abrir a issue no `Promo_Gifts_V4`, obter
decisão do PO, só então renomear/anotar o arquivo local.

**Checklist de conclusão.** Idêntico ao da Etapa 3 do plano de 16/09.

**Rollback/risco.** Renomear antes de o canônico reconciliar cria um segundo drift.

**Depende de.** Etapa 2 (branch sincronizado).

---

## Fase 1 — Ferramental e dependências

### Etapa 6 — Atualizar dependências menores

**Diagnóstico.** `npm outdated` (17/09) mostra atualizações sem mudança de major:
`@types/node` 26.5.1→26.6.1, `jsdom` 30.0.1→30.1.0, `lucide-react` 1.46.0→1.47.0,
`react-router-dom` 7.18.3→7.18.4. `npm audit --omit=dev` está limpo (0 vulnerabilidades),
então isso é manutenção preventiva, não correção de segurança urgente.

**Ação.** `npm update @types/node jsdom lucide-react react-router-dom`, rodar suíte
completa (`npm run check`, `npm run test:e2e`), revisar changelog de `react-router-dom`
7.18.4 por qualquer mudança de comportamento de rota antes de mergear.

**Checklist de conclusão.**
- [ ] `npm outdated` sem essas quatro entradas.
- [ ] `npm run check` e `npm run test:e2e` verdes.
- [ ] Changelog do `react-router-dom` revisado, sem breaking change relevante ao app.

**Rollback/risco.** Baixo — patch/minor. Reverter o commit se algum teste E2E quebrar.

**Depende de.** Etapa 2.

### Etapa 7 — Plano de migração isolado para ESLint 9→10

**Diagnóstico.** `eslint` e `@eslint/js` estão presos em 9.39.5 enquanto a major 10 já
está disponível (10.10.0 / 10.0.1). O commit `5c5083a` ("reverte eslint para 9.39.5, main
quebrado por dois bumps conflitantes") mostra que uma tentativa anterior de subir essas
duas dependências **juntas** quebrou `main` por conflito de peer-dependency
(`eslint-plugin-jsx-a11y` exigindo `eslint@^3...^9`, incompatível com `eslint@10`).

**Ação.** Não repetir o bump simultâneo. Isolar em um branch dedicado: (1) verificar se
`eslint-plugin-jsx-a11y` e os demais plugins já suportam `eslint@10` na versão mais recente
antes de tentar; (2) se não suportam, este item fica bloqueado até os plugins
atualizarem — registrar isso explicitamente em vez de tentar de novo e reverter de novo.

**Checklist de conclusão.**
- [ ] Compatibilidade de todos os plugins ESLint do projeto com a v10 verificada (matriz
      de versões, não só "tentei e funcionou").
- [ ] Se compatível: PR isolado, só o bump de lint, `Quality gate` verde.
- [ ] Se não compatível: decisão documentada de esperar, com issue de acompanhamento.

**Rollback/risco.** Já se provou capaz de quebrar `main` — por isso branch isolado e sem
combinar com nenhuma outra mudança de dependência.

**Depende de.** Etapa 6 (não competir com outras atualizações no mesmo PR).

### Etapa 8 — Plano de migração isolado para TypeScript 5.9→7.0

**Diagnóstico.** `typescript` está em 5.9.3, major mais recente é 7.0.2 — um salto de duas
majors. Nenhuma tentativa registrada até hoje.

**Ação.** Levantar breaking changes das majors 6 e 7 (changelog oficial), rodar `tsc
--noEmit` em branch isolado, medir tempo de build antes/depois. Não é uma etapa de
"atualizar", é uma etapa de **avaliar o custo** antes de decidir quando fazer.

**Checklist de conclusão.**
- [ ] Lista de breaking changes relevantes ao código deste repositório (não a lista
      genérica do changelog).
- [ ] `tsc --noEmit` rodado em branch isolado com a v7; contagem de erros novos registrada.
- [ ] Decisão: fazer agora (se baixo custo) ou agendar (se alto) — registrada com
      estimativa de esforço real, não a categoria genérica G deste plano.

**Rollback/risco.** Branch descartável; nenhum risco ao `main` enquanto não mergear.

**Depende de.** Nada.

### Etapa 9 — `npm audit` como gate obrigatório no CI — ✅ JÁ EXISTIA (verificado 17/09/2026)

**Diagnóstico original.** Eu tinha assumido, por não ter confirmado o workflow linha a
linha na auditoria anterior, que o gate não existia.

**Verificação de hoje.** `.github/workflows/quality.yml`, job `validate`, já roda
`npm audit --audit-level=high` logo após `npm run check`. Gate real, não snapshot manual.

**Checklist de conclusão.**
- [x] Passo já existe no workflow.
- [~] Não testado nesta sessão com vulnerabilidade simulada — mecanismo padrão e bem
      conhecido do `npm` (exit code não-zero em `high`/`critical`), risco de falso
      "passou" considerado baixo o suficiente para não gastar uma vulnerabilidade forjada
      só para provar isso.
- [x] Documentado em `README.md` (seção "Verificações"): como interpretar o gate e as três
      opções de resposta (`npm update`, `npm audit fix`, aceitar com prazo documentado).

**Rollback/risco.** Nenhum.

**Depende de.** Nada.

### Etapa 10 — Guardrail de nome/ordem de migrations no CI — ✅ FECHADA (17/09/2026)

**Diagnóstico original (Etapa 4/16-09).** O checklist da Etapa 4 do plano de 16/09 estava
com 0/4 — mas isso era o próprio checklist desatualizado, não a realidade do código.

**Verificação de hoje.** `scripts/validate-migration-names.mjs` existe,
`tests/validate-migration-names.node.mjs` cobre os 4 casos exigidos (underscore/formato
antigo, data de calendário inválida, versão duplicada, ordem não crescente) **mais dois
adicionais** (rejeita `supabase/migrations` no topo do repo — Etapa 45; varredura real do
repositório sem falso positivo). O script já é o **primeiro passo** do job `pg-tap` em
`database.yml`, antes até de `supabase start`. `npm run check` já executa
`test:migration-names`.

**Checklist de conclusão.**
- [x] Script falha com mensagem clara para os 4 casos — confirmado pelos testes.
- [x] Teste dedicado cobrindo os 4 casos (e mais 2) — `tests/validate-migration-names.node.mjs`.
- [x] Passo adicionado ao `database.yml` antes de `supabase start` — confirmado, é o
      primeiro passo do job.
- [x] `npm run check` inclui o script — confirmado via `package.json`.

**Nota de higiene.** O checklist da Etapa 4 no arquivo `PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md`
não reflete isso — deveria ser corrigido lá também (ação de baixo esforço, ver Etapa 48
deste plano sobre consolidar artefatos de rastreamento desatualizados).

**Depende de.** Nada — já resolvido.

---

## ⚠️ Correção geral das Fases 2–7 (17/09/2026, mesma sessão)

As etapas 11–38 abaixo tinham sido classificadas como "reabertas, checklist 0/X" com base
nos checkboxes do plano de 16/09 — **esse checklist estava desatualizado, não o código**.
Antes de escrever qualquer migration nova, rodei `SUPABASE_WORKDIR=site-supabase supabase
db reset --local` e `supabase test db`: **344/344 testes pgTAP passam em 17 arquivos**, e
inspeção das migrations `20260916*`/`20260917000000` (as mais recentes, aplicadas depois
da última atualização de checklist) mostra que a maior parte do trabalho técnico já existe.
Cada etapa abaixo foi reverificada individualmente contra migration + teste reais antes de
mudar de status — nenhuma foi marcada fechada só por suposição.

## Fase 2 — Fila de notificações e máquina de estados (site DB) — ✅ integralmente fechada

### Etapa 11 — Sequência monotônica em `quote_request_events` — ✅ FECHADA
Migration `20260916100000_add_quote_event_sequence_and_status_state_machine.sql`; teste
`status_state_machine.test.sql` (passa nos 344).

### Etapa 12 — Máquina de estados de `quote_requests.status` por trigger — ✅ FECHADA
Mesma migration/teste da Etapa 11 — sequência e máquina de estados vieram juntas.

### Etapa 13 — `lease_expires_at`/`claimed_at` explícitos na fila — ✅ FECHADA
`20260916110000_add_notification_queue_policy_lease_and_backoff.sql` +
`20260916120000_add_notification_deliveries_processing_lease_idx.sql`; teste
`notification_queue_policy.test.sql`.

### Etapa 14 — Backoff exponencial com jitter calculado no servidor — ✅ FECHADA
Mesma migration da Etapa 13 (`site_private.next_retry_at`, grantada a `site_api` na
Etapa 25).

### Etapa 15 — Política única da fila `site_private.notification_policy()` — ✅ FECHADA
Mesma migration da Etapa 13; `site_private.notification_policy()` existe e está nos grants
de `site_api`.

---

## Fase 3 — Índices e desempenho (site DB) — ✅ integralmente fechada

### Etapa 16 — Índice alinhado à ordem de reivindicação da fila — ✅ FECHADA
`notification_deliveries_pending_idx (status, created_at) where status in ('pending',
'failed')` — `20260908230000_create_site_lead_storage.sql`.

### Etapa 17 — Índice de recuperação de lease em `processing` — ✅ FECHADA
`notification_deliveries_processing_lease_idx` (`create index concurrently`) —
`20260916120000_...`.

### Etapa 18 — Testes de plano de execução (sem Seq Scan nas rotas quentes) — ✅ FECHADA
`tests/database/query_plans.test.sql` existe e passa.

### Etapa 19 — Revisão mensal de `pg_stat_statements` e índices sem uso — permanece aberta

**Diagnóstico.** A única etapa genuinamente aberta desta fase — é processo recorrente, não
migration; não há artefato de código que a feche de uma vez.

**Ação.** Ver Ação da Etapa 18 do plano de 16/09. Precisa de tráfego real de produção para
ter sentido.

**Checklist de conclusão.** Idêntico ao original — nenhum item marcável sem acesso de
produção.

**Depende de.** Etapa 4.

### Etapa 20 — Concluir `fillfactor`/autovacuum nas tabelas de alta rotatividade — ✅ FECHADA
`tune_high_churn_tables.sql` (16/09) **+** `20260917000000_add_rate_limit_fillfactor.sql`
(17/09, mais recente que o plano anterior) — `storage_tuning.test.sql` passa.

---

## Fase 4 — Contrato e tipos — ✅ integralmente fechada (4/4, incluindo a convenção de RPC que eu tinha classificado errado)

### Etapa 21 — Protocolo humano persistido e único — ✅ FECHADA
`20260916130000_add_persisted_quote_protocol.sql` (419 linhas); `quote_protocol.test.sql`.

### Etapa 22 — Precedência semântica de eventos de provedor — ✅ FECHADA
`20260916140000_add_provider_event_precedence.sql`; `notification_provider_events.test.sql`.

### Etapa 23 — Tipos TypeScript gerados do schema e diffados no CI — ✅ FECHADA
`src/types/site-database.types.ts`, gerado por `npm run db:site:types`;
`database.yml` falha explicitamente ("está desatualizado... rode e commite") se o arquivo
divergir do schema local — job `pg-tap`, confirmado lendo o workflow.

### Etapa 24 — Convenção formal de versionamento de RPC — ✅ FECHADA

**Correção.** Meu primeiro grep (`grep -r "versionamento" docs/`) listou
`DATABASE_FUNCTION_CONTRACTS.md` entre os resultados e eu descartei como menção de
passagem, sem abrir o arquivo — erro meu. `docs/DATABASE_FUNCTION_CONTRACTS.md:190`,
seção "Convenção de versionamento de RPC", tem as 5 regras completas: assinatura igual
(`create or replace`), assinatura diferente (`drop` explícito do nome antigo antes,
com exemplo real citado), mudança de semântica incompatível (`nome_v2`), revoke-then-grant
explícito em toda função pública, e uma query de verificação
(`pg_proc ... having count(*) > 1` deve retornar zero linhas) — que é exatamente o tipo de
guarda que eu teria proposto escrever do zero.

---

## Fase 5 — Segurança e privilégio mínimo (site DB) — 2 fechadas, 2 com decisão registrada (não gaps), 1 só falta corte de produção, 1 parcial

### Etapa 25 — Role `site_api` com privilégio mínimo no lugar de `service_role` — 🟡 IMPLEMENTADA, corte de produção pendente

**Correção importante.** Eu tinha classificado como "0/5, P0, sem nenhum progresso" —
**errado**. `20260916160000_add_site_api_role.sql` (103 linhas) cria a role com grants
`EXECUTE`/tabela precisos para as 13 RPCs de serviço (as outras 5 funções — `get_my_*` —
já rodam com o JWT do próprio cliente via `authenticated`, não `service_role`, confirmado
lendo `api/customer-proposals.ts`), decisão documentada de `SECURITY INVOKER` vs.
`DEFINER`, e `site_api_privileges.test.sql` valida as 13 funções de ponta a ponta com `set
role site_api` (passa nos 344). `docs/RUNBOOK_SITE_API_CUTOVER.md` já existe.

**O que falta de verdade.** Só o corte de produção: trocar a variável de ambiente na
Vercel para gerar o JWT com `role: site_api` em vez de usar `SITE_SUPABASE_SECRET_KEY`
(`service_role`) — deliberadamente um passo manual, fora do alcance desta sessão (exige o
painel da Vercel).

**Checklist de conclusão.**
- [x] Role criada com grants mínimos e documentados (13 RPCs + funções internas
      `SECURITY INVOKER` acionadas em cascata + sequência).
- [x] Teste `site_api_privileges.test.sql` cobrindo as 13 funções — passa.
- [x] Runbook de corte escrito (`RUNBOOK_SITE_API_CUTOVER.md`).
- [ ] Corte executado em produção (variável da Vercel trocada) — **ação humana**.
- [ ] `SITE_SUPABASE_SECRET_KEY` deixa de ser usada em runtime depois do corte confirmado —
      só então para de ser um risco de vazamento total do banco.

**Rollback/risco.** Reverter a variável de ambiente na Vercel é instantâneo se o corte
causar erro em produção — sem migration a desfazer.

**Depende de.** Acesso ao painel da Vercel.

### Etapa 26 — `force row level security` + teste que varre todas as tabelas — ✅ FECHADA
`20260916170000_force_row_level_security.sql` — as 14 tabelas de `site_private`;
`force_rls_hygiene.test.sql` passa. Migration também fecha `default privileges` em
sequences futuras.

### Etapa 27 — PII em repouso: hash para busca e mascaramento em `get_my_*` — ✅ DECISÃO REGISTRADA, não é gap

**Correção importante.** Eu tinha descrito isto como "o item de segurança mais
substancial genuinamente aberto do plano" — errado, e o erro importa: `grep` só confirma
ausência de código, não confirma ausência de decisão. `docs/DATABASE_FUNCTION_CONTRACTS.md:98`
("Decisão registrada — PII em repouso, adiada") documenta que a divisão original do plano
("hash para busca + mascaramento em `get_my_*`") **não sobrevive ao exame técnico**:

1. Mascarar em `get_my_*` não reduz exposição nenhuma — essas funções devolvem os dados do
   próprio titular autenticado (`auth.uid()`); mascarar o e-mail dele para ele mesmo só
   piora a UX.
2. Um hash ao lado não impede que a coluna original continue em texto puro (`site_api` e o
   worker de notificação precisam do valor real para enviar e-mail) — não reduz exposição
   num backup/dump, que era o objetivo real.
3. A mitigação genuína é criptografia de coluna (pgsodium + Vault), corretamente escopada
   como spike de design separado, não algo para decidir no meio de um lote de 50 etapas.

**Ação.** Nenhuma nesta sessão — implementar a meia-medida original seria pior que a
decisão já tomada (dado sensível pareceria "protegido" sem estar). Se isto voltar à pauta,
o ponto de partida já está escrito no documento: pgsodium com chave no Vault, avaliando
rotação de chave e custo de decriptar em toda leitura.

**Checklist de conclusão.**
- [x] Decisão de engenharia registrada e tecnicamente sólida — nada a corrigir.
- [ ] Se o negócio decidir que criptografia de coluna vale o custo, abrir uma etapa nova
      dedicada (spike de design, não uma linha deste plano).

### Etapa 28 — Revisão da exposição do token de seleção compartilhada — ✅ DECISÃO REGISTRADA (correção da minha primeira leitura)

**Correção.** Eu tinha marcado como "FECHADA" só olhando `management_token_hash`
(hasheado, correto) — mas não é o único token da tabela. `shared_selections.token uuid
primary key` é o próprio token de acesso público ao link, e **esse fica em texto plano**
(é literalmente a chave primária). `DATABASE_FUNCTION_CONTRACTS.md:121` documenta a
decisão de aceitar esse risco, não de tê-lo eliminado: 122 bits de aleatoriedade (UUID v4),
expira em até 31 dias, não carrega PII (só `id`/`q`/`v` de produto), e o acesso à tabela já
ficou bem mais restrito depois da Etapa 25 (só `site_api` via JWT server-side e
`service_role`, não mais qualquer coisa com a chave antiga). Migrar para `token_hash`
exigiria período de compatibilidade dupla e mudar 3 funções simultaneamente — custo
desproporcional ao risco real descrito.

**Ação.** Nenhuma nesta sessão — decisão registrada e proporcional. Reavaliar só se o
conteúdo de uma seleção compartilhada passar a incluir dado pessoal, ou se o prazo de
expiração for estendido.

### Etapa 29 — Rotação programada de segredos + comparação em tempo constante — parcialmente aberta

**Diagnóstico.** A comparação em tempo constante já existe e está sob teste
(`test:timing-safe-secrets` no `package.json`, roda em `npm run check`). A **rotação
programada** (agendamento recorrente) não tem evidência de existir — é operacional, não
código.

**Ação.** Ver Ação da Etapa 29 do plano de 16/09, restrita à parte de agendamento.

**Checklist de conclusão.**
- [x] Comparação em tempo constante — já em `npm run check`.
- [ ] Rotação programada — ainda não existe.

**Depende de.** Nada.

---

## Fase 6 — Retenção, auditoria e operação (site DB) — 2 fechadas, 1 com decisão registrada, 1 parcial (medida), 2 abertas (infraestrutura)

### Etapa 30 — `pg_cron` como retaguarda dos crons da Vercel — ✅ DECISÃO REGISTRADA, não é gap

**Correção.** `grep -rl "pg_cron\|cron.schedule"` nas migrations confirma zero
ocorrências, mas isso é ausência de código, não de decisão.
`DATABASE_FUNCTION_CONTRACTS.md:58` ("Decisão registrada — retaguarda pg_cron, adiada")
documenta uma avaliação real, não um esquecimento: `pg_cron`/`pg_net` estão disponíveis no
projeto mas implementar a retaguarda direito exige (1) lock advisory compartilhado com o
cron da Vercel para as duas origens nunca rodarem juntas — sem isso a "retaguarda" pode
duplicar entregas em vez de só cobrir falha; (2) reautenticação como `site_api`/`service_role`
de dentro de um `cron.job`, superfície nova de exposição de segredo; (3)
`site_notification_queue_health` ganhar `lastRunAt` por origem antes de fazer sentido
alertar sobre isso. Dado o volume atual do site e a Vercel Cron sendo confiável hoje, a
decisão foi não implementar às pressas.

**Ação.** Nenhuma nesta sessão — respeitar a decisão. Fica como item de backlog explícito
(as 3 pré-condições já estão escritas no documento), não como falha oculta.

### Etapa 31 — Política de retenção por tabela + dicionário gerado — parcialmente aberta (dado real, não suposição)

**Diagnóstico.** A lógica de retenção está extensivamente implementada e testada
(`add_site_data_retention.sql`, `harden_retention_metadata.sql`,
`fix_retention_storage_orchestration.sql`, `expand_shared_selection_retention.sql`;
`notification_outbox.test.sql` e outros passam) — é **centralizada**, via
`get_site_data_retention_candidates`/`finalize_site_data_retention`, que iteram as tabelas
configuradas, não uma política redigida tabela a tabela. Medi a cobertura real no
dicionário: de 16 seções `site_private.*` em `DATABASE_DICTIONARY.md`, só **3 mencionam
retenção/expiração/purga explicitamente no texto** (`contact_requests`, `quote_requests`,
`rate_limit_buckets`). *(Correção de 20/09/2026, achado do agente de auditoria de
documentação: eu tinha incluído `status_transitions` nessa lista de 4 — errado, a seção
dela em `DATABASE_DICTIONARY.md:264-273` não cita retenção/expiração/purga em lugar
nenhum; ela pertence é ao grupo "não precisa de retenção" descrito mais abaixo, não ao
grupo "documenta retenção".)* As outras 13 — incluindo `consent_receipts`, `quote_items`,
`notification_provider_events`, `shared_selection_rate_limits` — não citam retenção na
própria seção, ainda que algumas participem do mecanismo centralizado (ver abaixo quais).

**🐛 Achado crítico ao investigar (20/09/2026), corrigido.** Rastreei exatamente quais
tabelas `finalize_expired_site_data` toca (leitura de
`harden_retention_metadata.sql`, a versão vigente da função) e testei no banco local:
`quote_items`, `quote_adjustment_requests`, `quote_request_events` e `consent_receipts`
**cascateiam automaticamente via FK** quando o `quote_requests`/`contact_requests` pai é
apagado (`on delete cascade` já presente) — não precisam de menção própria, o cascade já
é a documentação correta. Mas `notification_provider_events.delivery_id` referenciava
`notification_deliveries` **sem** `on delete cascade` — reproduzi no banco local e
`finalize_expired_site_data` **falhava com violação de FK** sempre que a delivery sendo
purgada tinha um evento de provedor associado (o caso comum: qualquer notificação que
recebeu webhook de `delivered`/`bounced`/`complained`). Sem tratamento de exceção por
linha, a falha abortava a transação inteira — nenhuma deleção do lote era aplicada,
incluindo `contact_requests`/`rate_limit_buckets`/`shared_selections` que vêm depois no
mesmo statement. Corrigido em
`20260920100000_cascade_notification_provider_events_on_delivery_delete.sql`.

**Verificação adversarial (5 agentes, 20/09/2026), reforço do teste.** O primeiro teste de
regressão só cobria o caso mínimo (1 evento `delivered`, 1 delivery de quote). Um agente
dedicado atacou o fix com o cenário real de produção — 3 eventos na mesma delivery
(`delivered`→`bounced`→`complained`, a precedência da Etapa 20) com
`notification_deliveries.delivery_state_source_event_id` apontando de volta para um dos
próprios eventos que seriam cascade-deletados (referência circular real, gravada sempre
que `apply_site_notification_provider_event` aplica `delivered`/`bounced`) — e confirmou
que o fix se sustenta mesmo nesse caso mais agressivo. Reforcei o teste em
`lead_storage.test.sql` para cobrir exatamente isso, mais o cenário de `contact_requests`
(que não tem delivery auto-criada por trigger). O mesmo agente também achou **outra FK do
mesmo tipo**, ainda sem exploração ativa hoje:
`notification_deliveries.delivery_state_source_event_id → notification_provider_events`
também sem cascade — nada apaga essa tabela diretamente hoje (só via cascade a partir da
delivery, caminho já testado), mas é frágil para uma rotina futura. Blindado
preventivamente em `20260920110000_set_null_delivery_state_source_event_on_delete.sql`
(`on delete set null`, não cascade — apagar o evento não deveria apagar a delivery
inteira). 349/349 pgTAP local depois dos dois fixes e do teste reforçado.

**Tabelas genuinamente sem política de retenção** (confirmado, não presumido):
`admin_audit_log`, `admin_ddl_log` (trilhas de auditoria — retenção própria é decisão de
compliance, não teto técnico), `customer_profiles` (ciclo de vida ligado a `auth.users`
via cascade, não ao job de retenção do site), `notification_provider_events` (agora
cascateia com a delivery, corrigido acima), `status_transitions` (tabela de configuração
estática — transições válidas do state machine, nunca teve dado de titular, não deveria
mesmo ter retenção).

**Checklist de conclusão.**
- [x] Confirmado quais das 12 tabelas participam do mecanismo centralizado (4 via cascade
      de FK, já corretas) e quais genuinamente não têm política (5, listadas acima, com
      razão específica cada uma).
- [x] Bug de FK sem cascade encontrado e corrigido — valor real desta investigação.
- [ ] `comment on table` nas 4 que cascateiam, citando explicitamente "retenção via
      cascade do pai" — ainda não escrito (baixo risco, só clareza de documentação).
- [ ] `npm run db:site:dictionary` re-executado depois desses comentários.

**Depende de.** Nada.

### Etapa 32 — Trilha de auditoria de acesso administrativo direto — ✅ FECHADA
`20260916210000_add_admin_write_audit.sql`; `admin_write_audit.test.sql` passa.

### Etapa 33 — Backups: PITR confirmado + drill de restore trimestral — permanece aberta
Infraestrutura fora do alcance desta sessão — ver Etapa 39 do plano de 16/09.

### Etapa 34 — Timeouts por role — ✅ FECHADA
`20260916190000_add_site_api_timeouts.sql` (`statement_timeout '8s'`, `lock_timeout '2s'`,
`idle_in_transaction_session_timeout '10s'`, abaixo do `REQUEST_TIMEOUT_MS` do cliente);
`site_api_timeouts.test.sql` passa.

### Etapa 35 — Concluir saúde da fila integrada a alertas com SLA — parcialmente aberta

**Diagnóstico.** `add_notification_queue_health.sql` existe;
`site_notification_queue_health()` responde (confirmado por REST na auditoria de 17/09).
Não há evidência de integração com um sistema de alertas externo nem SLA formal — esperado,
é operacional (Vercel cron + destino de alerta), não SQL.

**Ação.** Ver Ação da Etapa 42 do plano de 16/09 para os itens de integração/SLA.

**Checklist de conclusão.** Os itens não-SQL do checklist original (a função em si já está
pronta).

**Depende de.** Nada.

---

## Fase 7 — Contrato público e cache — 2 confirmadas abertas, 1 sem mudança

### Etapa 36 — Fase B do contrato público: revogar `anon` na view legada — permanece aberta
Sobre o banco **principal**, não tem migration local do site para reverificar — status
inalterado desde a auditoria.

### Etapa 37 — Teste de contrato cross-projeto no CI — permanece aberta

**Diagnóstico confirmado.** Nenhum artefato desse tipo existe neste repositório (busca por
nome de arquivo em todo `Promo_Brindes_V1`, não confundir com o `contract-cross-endpoint.test.ts`
de outros projetos irmãos no mesmo diretório pai — repositório diferente, não conta).

**Ação/Checklist/Depende de.** Idênticos à Etapa 46 do plano de 16/09.

### Etapa 38 — Supabase Branching por PR com dados sintéticos — permanece aberta
Infraestrutura/billing do Supabase, fora do alcance desta sessão.

---

## Fase 8 — Governança do banco principal (`doufsxqlfjyuvxuezpln`) — NOVA

Nenhum plano anterior tratou o banco principal etapa a etapa; toda a disciplina de
migrations versionadas, testes pgTAP e CI de drift construída para o site (fases 0–7 acima
e nos planos anteriores) não existe aqui. Esta fase abre essa frente com os achados
concretos da auditoria de hoje (via MCP `SUPABASE - GESTÃO DE PRODUTOS`).

### Etapa 39 — Auditar as funções `SECURITY DEFINER` executáveis por anon/authenticated — 🔴 ACHADO CRÍTICO (ampliado em 20/09/2026)

**🚨 `public.mcp_kv_get(p_secret text, p_key text)` — vazamento de segredo, ação humana urgente fora deste plano. Ainda ativo em produção (confirmado ao vivo em 20/09/2026).**
Extraí as funções via `execute_sql` (11 com `anon`, 94 só `authenticated` — bate
exatamente com o advisor). Ao classificar, `mcp_kv_get` se destacou pelo nome (parece
backend de armazenamento de segredos para integrações MCP) e pela leitura do corpo via
`pg_get_functiondef` confirmou um problema real: o "controle de acesso" é comparar
`p_secret` contra **uma string fixa gravada em texto puro dentro da definição da
função**, e a função está `grant execute ... to authenticated` — qualquer usuário logado
do app, não só admin. Qualquer role com leitura em `pg_proc`/`information_schema.routines`
(padrão do Postgres) lê essa string com o mesmo `pg_get_functiondef` que eu usei. Não
consultei `public.mcp_kv` (seria explorar a falha, não auditá-la), mas o padrão de nome
sugere segredos reais de integrações.

**Achado adicional (auditoria adversarial de 5 agentes, 20/09/2026): `public.mcp_kv_set(p_secret, p_key, p_value)` e `public.mcp_kv_try_lock(p_secret, p_key, p_ttl_seconds)` têm o MESMO literal hardcoded, idêntico nas 3 funções.**
Hoje nenhuma das duas tem `execute` liberado para `anon`/`authenticated` (só grant direto,
tipicamente `service_role`) — não são exploráveis pelo mesmo caminho que `mcp_kv_get`
(que é o único com o grant indevido). Mas a rotação de segredo recomendada abaixo precisa
cobrir as 3 funções ao mesmo tempo — rotacionar só `mcp_kv_get` deixa `mcp_kv_set`/
`mcp_kv_try_lock` comparando contra o literal antigo potencialmente comprometido, e os 3
pontos de leitura/escrita/lock ficam dessincronizados. `docs/sql/canonical-principal/URGENTE_revogar_mcp_kv_get.sql`
já foi atualizado para revogar as 3.

**Reportado ao usuário diretamente no chat desta sessão, fora do arquivo, por ser
urgente e envolver rotação de credencial** — não é algo para esperar o resto do plano.

**Correção de contagem (achado do mesmo agente adversarial):** a soma "11 + 94 = 105"
bate exatamente com os dois contadores crus do advisor, mas **superestima o total de
funções distintas** — 9 funções aparecem nas duas listas ao mesmo tempo (ex.:
`get_catalog_bestseller_page`, `fn_global_search`, `fn_super_filtro`,
`check_login_rate_limit`). O total real de funções `SECURITY DEFINER` distintas expostas
a pelo menos um desses dois roles é **96**, não 105. Os números individuais (11 e 94)
continuam corretos — só a soma como "total de funções" estava enganosa.

**Diagnóstico geral (as outras 104 funções).** `get_advisors(type=security)` retorna
`anon_security_definer_function_executable` (11) e
`authenticated_security_definer_function_executable` (94). Classificação por amostra dos
nomes/assinaturas (não li o corpo de todas as 105 — só de `mcp_kv_get`, por ser a única
com nome/padrão que justificou a checagem):
- As 11 com `anon`: login/rate-limit (`check_login_rate_limit`, `fn_check_login_allowed`),
  catálogo público (`fn_global_search`, `fn_super_filtro*`, `get_catalog_bestseller_page`,
  `get_sitemap_public`, `fn_product_active_for_rls` — provável helper de política RLS),
  e ações por token público (`get_quote_token_public`, `submit_quote_response`) — todas
  plausivelmente intencionais, no mesmo padrão das views `v_*_public`. `get_quote_token_public`
  e `submit_quote_response` merecem uma segunda olhada (o corpo, não só a assinatura) para
  confirmar que o token é rate-limited/não enumerável — mesmo padrão de cuidado que o
  site já tem com `shared_selections`.
- Das 94 só-`authenticated`: a maioria se agrupa em famílias claramente legítimas —
  helpers de RLS/autorização (`is_admin_or_above`, `is_org_member`, `can_access_quote`,
  etc. — padrão padrão do Postgres para evitar recursão de RLS), o módulo de revistas/
  catálogo (`magazine_*`, 16 funções, concorrência otimista via `expected_edit_version`),
  e dashboards/operação interna (`fn_get_reposicao_*`, `fn_rupture_*`,
  `registrar_entrada_estoque`/`registrar_saida_estoque`, etc.). Nenhuma teve o corpo lido
  nesta sessão — a classificação por nome é um primeiro filtro, não uma auditoria de
  código completa.

**Ação restante.**
1. **Urgente, fora deste plano**: rotacionar o conteúdo de `mcp_kv` e corrigir o controle
   de acesso de `mcp_kv_get` (tirar `authenticated`, restringir a `service_role`, não
   comparar segredo como literal — usar Supabase Vault).
2. Ler o corpo das ~15 funções de dashboard/admin interno (`fn_get_reposicao_*`,
   `fn_rupture_*`, `registrar_*_estoque`, `fn_products_quality_dashboard`) para confirmar
   que cada uma checa papel/role internamente (já que `authenticated` sozinho não deveria
   bastar para dado operacional sensível) — não assumido nesta sessão, só a classificação
   por nome foi feita.
3. Ler `get_quote_token_public`/`submit_quote_response` para confirmar rate limit no token.

**Checklist de conclusão.**
- [x] Lista completa das 105 extraída e classificada por nome/assinatura.
- [ ] `mcp_kv_get` corrigido — **bloqueado em ação humana urgente** (rotação de segredo).
- [ ] Corpo das funções de dashboard/admin interno revisado (não feito nesta sessão).
- [ ] Funções fora do padrão esperado corrigidas (revogado `execute` de `anon` ou removido
      `SECURITY DEFINER`).
- [ ] Contagem do advisor após a correção anexada ao PR (baseline: 11 anon + 94
      authenticated).

**Rollback/risco.** Alto se revogar acesso de uma função que o frontend usa ativamente —
testar em preview/branch antes de aplicar em produção; a lista de 105 é grande demais para
revisar sem esse ambiente.

**Depende de.** Nada, mas se beneficia de um ambiente de preview (análogo à Etapa 38, mas
para o projeto principal).

### Etapa 40 — Decidir o destino da extensão `pg_graphql` — SQL pronto, decisão de escopo pendente

**Diagnóstico confirmado (20/09/2026).** `list_extensions` do MCP confirma
`pg_graphql 1.5.11` instalada no schema `graphql`. `pg_graphql_anon_table_exposed` (59) +
`pg_graphql_authenticated_table_exposed` (457) = 516 dos 623 `WARN` de segurança — maior
fonte isolada de ruído do advisor. `grep -r graphql src api` neste repositório: zero
ocorrências.

**Limite importante desta verificação, para não recomendar às cegas.** Este repositório
(`Promo_Brindes_V1`) é só **um** consumidor do banco principal `doufsxqlfjyuvxuezpln` — o
grep confirma que *este app* não usa GraphQL, mas não prova que **nenhum** consumidor usa
(o sistema de gestão de produtos/catálogo em si, as 397 tabelas, claramente tem uma
aplicação própria fora deste repositório — não teria como ter `magazine_*`,
`fn_get_reposicao_*` etc. sem uma). Recomendar `drop extension pg_graphql cascade` sem
confirmar com quem tem visão desse outro app seria a mesma classe de erro que já cometi
duas vezes nesta sessão (agir sobre suposição em vez de verificação).

**Ação.** SQL preparado em
`docs/sql/canonical-principal/pendente_dropar_pg_graphql.sql`, **não aplicado** —
bloqueado pelo classificador de permissões do Claude Code (escrita em banco de produção
compartilhado) e, mais importante, pela limitação de escopo acima: precisa de confirmação
humana de que nenhum outro consumidor usa GraphQL antes de rodar.

*(Correção de 20/09/2026, achado do agente de auditoria de documentação: eu tinha citado
esse caminho de arquivo dentro de um bloco de código como se ele já existisse, no mesmo
estilo das Etapas 41/42 — mas só existia como texto no markdown, o arquivo real nunca
tinha sido criado. Criado agora de verdade, para consistência com o padrão das outras
etapas "SQL pronto, não aplicado".)*

**Checklist de conclusão.**
- [x] Uso confirmado como ausente **neste repositório** (grep, sem ocorrência).
- [x] SQL escrito (`pendente_dropar_pg_graphql.sql`).
- [ ] Uso confirmado como ausente em **todos** os consumidores do banco principal — não
      verificável a partir deste repositório sozinho.
- [ ] SQL aplicado, depois da confirmação acima.
- [ ] Decisão executada: extensão desabilitada, ou exposição restringida tabela a tabela.
- [ ] Contagem do advisor de segurança caiu de 623 para o valor esperado após a mudança.

**Rollback/risco.** Baixo se realmente não houver consumidor GraphQL — reversível
reabilitando a extensão. Verificar antes com um `grep` amplo, incluindo o app mobile/outros
consumidores fora deste repositório, se existirem.

**Depende de.** Nada.

### Etapa 41 — Indexar as 4 FKs sem cobertura

**Diagnóstico.** `get_advisors(type=performance)`, achado `unindexed_foreign_keys` (count
4): `kit_quote_requests_quote_id_fkey`, `kit_quote_requests_user_id_fkey`,
`kit_save_requests_kit_id_fkey`, `kit_save_requests_user_id_fkey` — nenhuma das quatro tem
índice de cobertura, o que penaliza `DELETE`/`UPDATE` na tabela pai (lock scan completo
para verificar FK) e joins nessas colunas.

**Ação.** `create index concurrently` para as quatro colunas de FK, medindo antes/depois
com `explain (analyze, buffers)` nas consultas que fazem join por `quote_id`/`user_id`/
`kit_id` nessas duas tabelas.

**SQL pronto, não aplicado (20/09/2026).**
`docs/sql/canonical-principal/pendente_indices_fk_kit.sql` — 4×
`create index concurrently if not exists`. Bloqueado pelo classificador de permissões do
Claude Code (escrita em banco de produção compartilhado); risco real da mudança em si é
baixo (aditiva, `CONCURRENTLY`, reversível com `DROP INDEX`).

**Checklist de conclusão.**
- [x] SQL escrito e revisado.
- [ ] 4 índices criados via `CREATE INDEX CONCURRENTLY` — pendente de execução manual.
- [ ] `explain analyze` antes/depois anexado ao PR.
- [ ] Advisor de performance sem esse achado após a mudança.

**Rollback/risco.** Baixo — `DROP INDEX` reverte sem afetar dados. `CONCURRENTLY` evita
lock em tabela de produção.

**Depende de.** Nada.

### Etapa 42 — Resolver a política RLS redundante em `system_settings`

**Diagnóstico.** `get_advisors(type=performance)`, achado `multiple_permissive_policies`:
a tabela `public.system_settings` tem duas políticas permissivas para `authenticated`/
`SELECT` (`system_settings_admin_all` e `system_settings_public_read_maintenance`) — o
Postgres avalia as duas em toda leitura, custo desnecessário quando uma política única e
bem desenhada bastaria.

**Definições lidas (20/09/2026, via `pg_policies`):**
- `system_settings_admin_all` — `ALL`, `{authenticated}`, `is_admin(auth.uid())`.
- `system_settings_public_read_maintenance` — `SELECT`, `{anon,authenticated}`,
  `key = 'maintenance_mode'`.

**SQL pronto, não aplicado.** `docs/sql/canonical-principal/pendente_consolidar_policy_system_settings.sql`
— divide a política `ALL` do admin em `INSERT`/`UPDATE`/`DELETE` (deixa de cobrir
`SELECT`) e unifica o `SELECT` numa única política com `key = 'maintenance_mode' OR
is_admin(auth.uid())` para `anon`+`authenticated`. Equivalência comportamental por
(role, comando) documentada linha a linha no próprio arquivo SQL — `anon` continua vendo
só a linha de manutenção (`is_admin` com `auth.uid()` nulo nunca concede nada extra a
`anon`). Bloqueado pelo classificador de permissões **e**, à parte disso, é mudança de
controle de acesso — deveria ter revisão humana antes de rodar de qualquer forma, não só
a trava automática.

**Checklist de conclusão.**
- [x] Definições das duas políticas atuais documentadas (acima e no arquivo SQL).
- [x] SQL de consolidação escrito com equivalência comportamental justificada.
- [ ] Revisão humana da equivalência antes de aplicar — é o item que mais importa aqui.
- [ ] Política consolidada aplicada; teste confirmando que o conjunto de linhas visível
      para `authenticated` não mudou.
- [ ] Advisor sem esse achado após a mudança.

**Rollback/risco.** Médio — erro na consolidação pode restringir acesso legítimo de admin
ou vazar linhas que deveriam ficar ocultas em modo manutenção; testar os dois papéis
(`admin` e `authenticated` comum) antes de mergear.

**Depende de.** Nada.

### Etapa 43 — Inventário mínimo de schema do banco principal

**Diagnóstico.** O banco principal tem **397 tabelas, 100% com RLS habilitado** (bom sinal
de disciplina de segurança), mas **zero artefato local versionado** — sem migrations no
repositório, sem `DATABASE_SCHEMA.md`/dicionário equivalente ao que existe para o site, sem
CI de drift. Toda mudança de schema nesse banco hoje é invisível para quem só olha o
repositório.

**Ação.** Não é viável (nem desejável) replicar 397 tabelas em migrations retroativas numa
etapa. Ação mínima e de alto valor: gerar um dump de schema somente-leitura
(`pg_dump --schema-only` ou `supabase db dump`, sem dados) versionado em
`docs/sql/canonical-principal/`, com um script `npm run db:principal:schema-doc` análogo ao
`db:site:schema-doc` já existente, rodando sob demanda (não bloqueando CI ainda — isso é a
Etapa 44).

**Feito parcialmente (20/09/2026).** `docs/DATABASE_INVENTORY_PRINCIPAL.md` — 397 tabelas,
RLS por tabela, linhas estimadas, com as 11 tabelas `_archive_`/`_bkp_` separadas como
candidatas a revisão de retenção. **Não** inclui colunas/tipos/FKs (o `list_tables`
verbose retornou 929 mil caracteres, grande demais para trazer ao contexto desta sessão
de forma segura) — é inventário de tabelas, não schema completo.

**Checklist de conclusão.**
- [x] Inventário de tabelas gerado e versionado (nomes, RLS, linhas).
- [ ] Schema completo (colunas/tipos/FKs) — não gerado; precisaria de processamento fora
      desta sessão de chat (o dump bruto excede o limite de contexto de uma resposta).
- [x] Script de geração é manual via MCP, documentado no cabeçalho do arquivo — não é
      repetível por CI (sem credencial do projeto principal no repositório).
- [ ] Decisão registrada sobre se este banco algum dia terá migrations versionadas no
      repositório ou se continuará gerenciado só pelo dashboard/Lovable — ainda não
      decidido, é decisão do dono do produto, não técnica.

**Rollback/risco.** Nenhum — é só documentação/leitura.

**Depende de.** Nada.

### Etapa 44 — `db lint`/Security Advisor do projeto principal no CI

**Diagnóstico.** O workflow `database.yml` roda `db lint` e checks de segurança para o
projeto do **site**; não há equivalente para o projeto **principal** neste repositório (que
nem tem migrations locais para o CI rodar contra). Os 623 avisos de segurança e os achados
de performance hoje só foram vistos porque esta auditoria chamou `get_advisors`
manualmente.

**Ação.** Job novo e independente no CI (agendado, não por PR, já que não há mudança de
schema local que dispare) chamando os mesmos advisors via MCP/API do Supabase e falhando
(ou abrindo issue automaticamente) se o número de achados `ERROR` subir em relação ao
baseline desta auditoria (8 `security_definer_view`, todos intencionais).

**Bloqueio real, não só o classificador de permissões (20/09/2026).** Esse job precisaria
de um `SUPABASE_ACCESS_TOKEN`/service key do projeto principal como secret do GitHub
Actions — não existe hoje neste repositório (só uso o MCP, que não é algo que o runner do
CI consiga chamar). Provisionar esse secret é a mesma classe de ação humana da Etapa 4
(token do site) — não escrevi um workflow inerte só para existir; sem o secret, ele nunca
rodaria de verdade, e um workflow que sempre falha por falta de credencial é pior que
nenhum workflow.

**Checklist de conclusão.**
- [ ] Secret do projeto principal provisionado no GitHub Actions — ação humana, não feita.
- [ ] Job agendado (ex.: diário) chamando `get_advisors` para o projeto principal.
- [ ] Baseline de achados aceitos documentado (os 8 `ERROR` das views públicas — já
      levantado nesta sessão, pronto para usar assim que o job existir).
- [ ] Alerta configurado para qualquer achado novo de nível `ERROR`.

**Rollback/risco.** Nenhum — só observabilidade.

**Depende de.** Secret provisionado; Etapas 39, 40, 41, 42 (baseline limpo antes de travar
o gate — hoje ainda não estão aplicadas em produção).

### Etapa 45 — Runbook de reconciliação para o projeto principal — ✅ FECHADA (17/09/2026)

`docs/RUNBOOK_BANCO_PRINCIPAL.md` criado: pré-condições (acesso ao gateway MCP, único
canal disponível), verificação de saúde (contagem de tabelas, baseline de advisors),
verificação do contrato público (`v_products_public`/`v_site_products_public`), fluxo
para quando uma mudança de schema for necessária (feita fora deste repositório, dump de
schema re-executado depois), e escalonamento explícito (sem acesso de escrita por design;
documenta o que verificar e para quem escalar).

**Checklist de conclusão.**
- [x] Runbook escrito com pré-condições, comandos, verificação e comunicação.
- [x] Caminho de escalonamento explícito — sem acesso de escrita a partir deste
      repositório, por desenho; correções (ex.: `mcp_kv_get`, Etapa 39) precisam de
      alguém com acesso direto ao projeto.

**Rollback/risco.** Nenhum — documentação.

**Depende de.** Etapa 43.

---

## Fase 9 — Frontend/UX e testes

### Etapa 46 — Fechar a instabilidade WebKit/Firefox — ✅ causa raiz encontrada e corrigida (20/09/2026)

**Correção do diagnóstico.** Não era instabilidade específica do WebKit — reproduzi rodando
`test:e2e:cross-browser` duas vezes (uma limpa, uma com falha) e o teste que falhou
("sair encerra a sessão e o próximo briefing aberto começa limpo") falhou em
**desktop-firefox e desktop-webkit ao mesmo tempo**, não só WebKit.

**Causa raiz real**: `CustomerAuthContext.signOut()` fazia `await
siteSupabase.auth.signOut()` (round-trip de rede) **antes** de `await
import('../lib/personalDataReset')` + `clearPersonalQuoteStorage()` — apesar do próprio
comentário do código dizer que a limpeza local não deveria esperar o round-trip. Se
alguém navega logo após clicar "Sair" (o teste faz `page.goto('/orcamento')` logo depois),
a navegação encerra o contexto JS antes do `import()` dinâmico + limpeza pendentes
rodarem — o e-mail do titular anterior fica no rascunho de orçamento da próxima sessão,
em um navegador potencialmente compartilhado. Corrida genuína (por isso intermitente:
passou limpo no CI do PR #14, falhou 2x numa rodada local minutos depois) — não WebKit-
specific, os dois motores mais lentos que Chromium só expunham a janela de corrida com
mais frequência.

**Correção.** `src/context/CustomerAuthContext.tsx`: os dois `import()` dinâmicos rodam em
paralelo (`Promise.all`), a limpeza local + `setIdentityEpoch` acontecem **antes** do
`await siteSupabase.auth.signOut()`, não depois — alinha o código à intenção que já
estava documentada no comentário.

**Checklist de conclusão.**
- [x] Causa raiz identificada — corrida de ordenação, não flakiness de engine.
- [x] Corrigido em `CustomerAuthContext.tsx`.
- [x] `--repeat-each=5` em desktop-firefox + desktop-webkit no teste específico: 10/10
      passando (antes do fix, falhou em ambos os motores numa rodada normal).
- [x] `npm run check` completo (inclui e2e chromium) verde.
- [x] `test:e2e:cross-browser` (firefox+webkit) verde depois do fix.
- [ ] B01–B06 da matriz de 12/09 — não localizei o conteúdo desses rótulos nesta sessão
      (arquivo de origem `docs/audits/plan-review-20260912/` não revisado); item genuíno
      restante, mas não bloqueia o fechamento da instabilidade em si.

**Rollback/risco.** Nenhum — é fechamento de cobertura de teste.

**Depende de.** Nada.

### Etapa 47 — Métricas operacionais e resolução de conflito no carrinho de orçamento

**Diagnóstico.** `docs/MATRIZ_REVISAO_ATUAL_20260912.csv`, item UX02 (estado `P`,
parcial): "Persistência local e eventos existem; faltam métricas operacionais e resolução
de conflitos entre campanhas/dispositivos" — evidência em
`src/context/QuoteCartContext.tsx`, `src/lib/analytics.ts`.

**Por que não implementei nesta sessão.** As duas partes desta etapa (last-write-wins vs.
merge entre dispositivos; quais métricas operacionais importam) são decisão de produto,
não técnica — inventar um comportamento de resolução de conflito ou um conjunto de
métricas sem alguém validar o UX seria exatamente o tipo de escopo que não me cabe decidir
sozinho. Diferente das etapas de segurança/performance deste plano, aqui não há uma
resposta "correta" verificável por teste sem essa decisão vir primeiro.

**Ação.** Levar para quem decide produto: (1) duas abas/dispositivos editando o mesmo
carrinho — avisar e deixar o usuário escolher, ou last-write-wins silencioso? (2) que
métrica operacional é acionável (taxa de abandono por etapa do formulário? tamanho médio
do carrinho na submissão?) — sem consumidor definido para o dado, instrumentar é trabalho
descartável.

**Checklist de conclusão.**
- [ ] Decisão de produto sobre comportamento de conflito — não tomada nesta sessão.
- [ ] Decisão de produto sobre quais métricas instrumentar — não tomada nesta sessão.
- [ ] Comportamento de conflito implementado e testado, depois da decisão.
- [ ] Métricas emitidas, depois da decisão.

**Rollback/risco.** Baixo — mudança aditiva de instrumentação; a resolução de conflito
precisa de teste de regressão para não quebrar o fluxo atual de carrinho single-device.

**Depende de.** Nada.

### Etapa 48 — Matrizes de revisão: não são duplicatas, são um rastro de revisões — diagnóstico corrigido

**Correção.** Eu tinha suposto "quase-duplicadas" sem ter comparado — errado. `diff` real
mostra que os 4 CSVs (231 linhas cada) têm **462 linhas diferentes cada par** (ou seja,
toda linha mudou, não só algumas): cada arquivo é uma revisão completa com colunas de
status próprias da rodada (`status_base_7104660`, `status_revisao`,
`verificacao_nesta_rodada`, evidência textual por item) — é um rastro histórico legítimo
de auditorias sucessivas de UX (`REVISAO_ATUAL_20260911` → `_20260912` →
`POS_MIGRATIONS_20260912` → `FECHAMENTO_PLANOS_20260912`), não a mesma varredura
copiada e esquecida.

**Ação revisada.** O ponto fraco real não é duplicação de conteúdo, é falta de uma
convenção que diga qual arquivo é "o atual" sem ter que abrir os 4 e comparar timestamps
do nome — isso sim vale a pena resolver, com esforço bem menor que uma consolidação:

**Checklist de conclusão.**
- [ ] Adicionar ao topo do CSV mais recente (`MATRIZ_FECHAMENTO_PLANOS_20260912.csv`, a
      última da cadeia por enquanto) uma nota — ou um `docs/MATRIZ_INDEX.md` — dizendo
      "esta é a revisão vigente; as anteriores são histórico, preservadas para
      rastreabilidade, não editar".
- [ ] Convenção registrada para a próxima revisão: nomear com a data e linkar da anterior
      para a nova (não o contrário), para a cadeia ficar navegável sem precisar do
      histórico do Git.
      arquivo existente, não copiar).

**Rollback/risco.** Nenhum — reorganização de documentação, histórico preservado no Git.

**Depende de.** Nada.

---

## Fase 10 — Encerramento

### Etapa 49 — Runbook de restore + revisão por pares dos runbooks existentes

**Diagnóstico.** Etapa 49 do plano de 16/09 está parcial (`[~]`): 5 de 6 runbooks
planejados existem (fila travada/provedor fora, chave vazada, reconciliação de ledger,
pedido de titular); **restore continua sem runbook**, bloqueado pela mesma dependência de
infraestrutura da Etapa 33 deste plano. Revisão por segunda pessoa não é verificável sem
um revisor humano.

**Ação.** Escrever o runbook de restore assim que a Etapa 33 confirmar PITR; agendar
revisão por pares dos 5 runbooks existentes (checklist de revisor, não reescrita).

**Checklist de conclusão.**
- [ ] Runbook de restore escrito no mesmo padrão dos outros 5.
- [ ] Os 6 runbooks revisados por uma segunda pessoa, com data e nome do revisor
      registrados no próprio arquivo.
- [ ] Fila travada/provedor fora e rotação de segredo ensaiados ponta a ponta como
      cenário de incidente completo (hoje só os comandos foram usados isoladamente).

**Rollback/risco.** Nenhum — documentação e simulação.

**Depende de.** Etapa 33.

### Etapa 50 — Encerramento: checklist mestre, merge do PR #14, tag de release

**Atualizado (20/09/2026).** PR #13 já mergeou (antes do fix do bundle chegar no branch —
ver nota da Etapa 1/2). **PR #14** é o que carrega o trabalho real desta sessão:
https://github.com/adm01-debug/Promo_Brindes_V1/pull/14 — `Quality gate`,
`Isolated site database`, `Graphify structural map` e `cross-browser` todos verdes
confirmados nesta sessão.

**Ação.** Merge do PR #14 **não executado por mim** — é uma ação visível/de estado
compartilhado (afeta `main` e o deploy da Vercel), do tipo que peço confirmação antes de
fazer, mesmo com autorização geral para executar o plano. Deixado para decisão explícita.

**Checklist de conclusão.**
- [x] Checklist mestre desta sessão: ver o sumário "Status real após verificação" no topo
      deste arquivo — 1, 6, 9, 10, 11–24, 26, 28, 32, 34, 39 (parte), 40 (parte), 43
      (parte), 45, 46 fechados ou avançados nesta execução; 2–5, 19, 29 (parte), 30, 31,
      33, 35 (parte), 36–38, 41, 42, 44, 47, 49 permanecem abertos, a maioria por
      dependerem de credencial/decisão humana, não de mais trabalho técnico possível
      nesta sessão.
- [ ] `Quality gate`, `Isolated site database`, `Graphify structural map` verdes no PR
      #14 — confirmado nos checks do PR, não ainda no commit de merge em si.
- [ ] `CodeQL security` e `Dependency review` — `CodeQL` passou; `Dependency review`
      segue falhando por "Dependency graph" não habilitado no repositório. Confirmado por
      um agente adversarial (20/09/2026) por duas vias independentes (GraphQL
      `hasVulnerabilityAlertsEnabled: false`; REST `dependency-graph/sbom` → 404 contra um
      repo público de controle que retorna 200): **não existe endpoint de API para
      habilitar isso num repositório pessoal** — é Settings → Security → Code security na
      UI, ou política de organização/enterprise. Confirmado também que **não é required
      check** em `main` (só `validate`/`Graphify`/`Migrations and pgTAP` bloqueiam merge),
      então não trava nada — mas fica como gate permanentemente vermelho/inerte
      ("security theater": quando ele realmente pegar algo um dia, vai passar
      despercebido no meio do ruído esperado). Não é sobre o código deste PR; só o dono da
      conta resolve, pela UI.
- [ ] PR #14 mergeado, branch remoto removido — pendente de confirmação humana.
- [ ] Tag de release criada — depois do merge.

**Rollback/risco.** Reverter o merge é possível até haver deploy em produção depois dele;
depois disso, seguir o runbook de restore (Etapa 49) se necessário.

**Depende de.** Todas as etapas P0/P1 deste plano (1–5, 9, 10, 25, 33, 39, 40, 43, 44).
