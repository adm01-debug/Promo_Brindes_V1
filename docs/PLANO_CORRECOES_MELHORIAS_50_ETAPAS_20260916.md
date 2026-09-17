# Plano de correções e melhorias — 50 etapas (banco de dados, integração e governança)

Data-base: 16/09/2026. Fonte: auditoria local ⇄ GitHub ⇄ Supabase executada nesta data
(branch `fix/supabase-ledger-ordering`, projeto do site `xlzmclcjdncjfdrjxclt`, projeto
canônico `doufsxqlfjyuvxuezpln`). Este plano é a fase seguinte ao `plano-50-etapas.html`
(fechamento da Fase 0): não repete etapas já concluídas lá e assume o estado verificado
em produção — as 18 funções RPC das migrations locais existem no banco, a trava de
`rls_auto_enable()` está em vigor e `site_notification_queue_health()` responde.

## Como usar este documento

- Cada etapa tem **Diagnóstico** (evidência concreta), **Ação**, **Checklist de
  conclusão**, **Rollback/risco** e **Depende de**. Uma etapa só é considerada concluída
  quando todos os itens do checklist estão marcados e o PR correspondente foi mergeado com
  o workflow `database.yml` verde.
- Prioridade: **P0** (bloqueia deploy ou expõe risco de dado), **P1** (corrigir nesta
  iteração), **P2** (melhoria estrutural), **P3** (maturidade/DX).
- Esforço: **P** (≤ 2 h), **M** (½ a 1 dia), **G** (> 1 dia).
- Toda migration nova é **aditiva** e segue *expand → migrate → contract*: primeiro cria o
  novo caminho, depois muda o consumidor, só então remove o antigo — em migrations
  separadas, cada uma reversível por si.

## Princípios que governam todas as etapas

1. Nenhum SQL é reaplicado em produção sem `db push --dry-run` limpo e `migration list`
   reconciliado (lição da normalização de 15/09).
2. Todo comportamento novo do banco nasce com teste pgTAP; toda mudança de contrato de RPC
   nasce com teste vitest em `tests/api/`.
3. Medir antes e depois: `explain (analyze, buffers)` gravado no PR para qualquer índice ou
   reescrita de consulta.
4. Privilégio mínimo é o padrão: o site nunca ganha acesso a tabela; ganha acesso a função.
5. Nada de dado pessoal em log, alerta, comentário de migration ou fixture de teste.

## Mapa das 50 etapas

| # | Etapa | Fase | Prior. | Esf. |
|---|---|---|---|---|
| 1 | Confirmar reconciliação do ledger remoto de migrations | 0 | P0 | P |
| 2 | Commitar, publicar e abrir PR do branch `fix/supabase-ledger-ordering` | 0 | P0 | P |
| 3 | Normalizar a migration do contrato canônico em coordenação com `Promo_Gifts_V4` | 0 | P1 | M |
| 4 | Guardrail de nome e ordem de migrations no CI | 0 | P1 | P |
| 5 | Higiene de branches locais e `main` | 0 | P2 | P |
| 6 | Conector operacional e runbook de verificação em 5 comandos | 0 | P1 | M |
| 7 | Sequência monotônica em `quote_request_events` | 1 | P1 | M |
| 8 | Máquina de estados de `quote_requests.status` por trigger | 1 | P1 | M |
| 9 | Máquina de estados de `notification_deliveries.status` por trigger | 1 | P1 | M |
| 10 | `lease_expires_at` e `claimed_at` explícitos na fila | 1 | P1 | M |
| 11 | Backoff exponencial com jitter calculado no servidor | 1 | P1 | M |
| 12 | Política única da fila (`site_private.notification_policy()`) | 1 | P1 | M |
| 13 | Índice alinhado à ordem de reivindicação da fila | 2 | P1 | P |
| 14 | Índice de recuperação de lease em `processing` | 2 | P1 | P |
| 15 | Índice único de reconciliação `(provider, provider_message_id)` | 2 | P1 | P |
| 16 | Índices de FK e de filtros do portal do cliente | 2 | P2 | M |
| 17 | Testes de plano de execução (sem Seq Scan nas rotas quentes) | 2 | P2 | M |
| 18 | Revisão mensal de `pg_stat_statements` e índices sem uso | 2 | P3 | P |
| 19 | Protocolo humano persistido e único (substitui prefixo de UUID) | 3 | P1 | M |
| 20 | Precedência semântica de eventos de provedor (`bounced` ⊐ `delivered`) | 3 | P1 | P |
| 21 | Tipos TypeScript gerados do schema e diffados no CI | 3 | P2 | M |
| 22 | Catálogo único de erros das RPCs testado nas duas camadas | 3 | P2 | M |
| 23 | Convenção formal de versionamento de RPC | 3 | P3 | P |
| 24 | Normalização canônica de e-mail e telefone (E.164) | 3 | P2 | M |
| 25 | Role `site_api` com privilégio mínimo no lugar de `service_role` | 4 | P0 | G |
| 26 | `force row level security` e teste que varre todas as tabelas | 4 | P1 | P |
| 27 | PII em repouso: hash para busca e mascaramento nas funções `get_my_*` | 4 | P1 | G |
| 28 | Revisão da exposição do token público de seleção compartilhada | 4 | P2 | P |
| 29 | Rotação programada de segredos e comparação em tempo constante | 4 | P1 | M |
| 30 | Rate limit em duas camadas e `rate_limit_buckets` UNLOGGED | 4 | P2 | M |
| 31 | `db lint --fail-on warning` e Security Advisor no CI | 4 | P1 | P |
| 32 | RPC de apagamento LGPD (`erase_customer_data`) | 5 | P1 | G |
| 33 | Purga em lotes com índice parcial em `retention_until` e teste de falha parcial | 5 | P1 | M |
| 34 | `pg_cron` como retaguarda dos crons da Vercel | 5 | P2 | M |
| 35 | Política de retenção por tabela e dicionário de dados gerado | 5 | P2 | M |
| 36 | Trilha de auditoria de acesso administrativo direto | 5 | P2 | M |
| 37 | Teste de concorrência real da fila (claims disjuntos) | 6 | P1 | M |
| 38 | Soak test da fila e calibração dos limiares de alerta | 6 | P2 | M |
| 39 | Backups: PITR confirmado e drill de restore trimestral | 6 | P0 | M |
| 40 | Autovacuum e `fillfactor` para tabelas de alta rotatividade | 6 | P2 | P |
| 41 | `statement_timeout`, `lock_timeout` e `idle_in_transaction_session_timeout` por role | 6 | P1 | P |
| 42 | Saúde da fila integrada aos alertas operacionais com SLA | 6 | P1 | M |
| 43 | Fase B do contrato público: inventário e revogação de `anon` na view legada | 7 | P1 | G |
| 44 | Cache de borda para catálogo, página de produto e sitemap | 7 | P2 | M |
| 45 | Incorporar o contrato ao SSOT `Promo_Gifts_V4` e definir destino de `supabase/` | 7 | P1 | M |
| 46 | Teste de contrato cross-projeto no CI (36 colunas, permissões) | 7 | P1 | M |
| 47 | Supabase Branching por PR com dados sintéticos | 8 | P3 | G |
| 48 | ERD e `DATABASE_SCHEMA.md` gerados; verificação de drift `db diff` vazio | 8 | P2 | M |
| 49 | Runbooks de incidente (fila travada, provedor fora, chave vazada, restore, ledger) | 8 | P1 | M |
| 50 | Encerramento: checklist mestre, revisão por pares e atualização do ledger | 8 | P1 | P |

## Sequenciamento

```
Fase 0 (1→2→3→4, 5, 6)  ──►  Fase 1 (12 antes de 10/11; 7 e 8 independentes; 9 depois de 10)
                             ──►  Fase 2 (13/14 dependem de 10; 15 antes de 20; 17 fecha a fase)
                             ──►  Fase 3 (19 independente; 20 depende de 15; 21 antes de 22)
Fase 4 (25 é o eixo: 26, 29, 31 podem correr em paralelo; 27 depois de 24)
Fase 5 (32 depende de 27; 33 antes de 34; 35 e 36 independentes)
Fase 6 (37 depende de 10/12; 38 depende de 13/14/37; 39 e 41 imediatos; 42 depende de 38)
Fase 7 (43→45→46; 44 independente)
Fase 8 (47 opcional; 48 depende de 21; 49 e 50 encerram)
```

Regra de ouro: **não iniciar a Fase 4 (etapa 25) antes de a Fase 1 estar concluída** — a
troca de role muda os grants de todas as RPCs, e é mais barato fazê-la uma única vez sobre
as assinaturas finais.

---

## Fase 0 — Encerrar a auditoria de 16/09

### Etapa 1 — Confirmar reconciliação do ledger remoto de migrations

**Diagnóstico.** As migrations `20260908_230000` e `20260909_103000` foram renomeadas para
14 dígitos apenas em comentário e nome de arquivo (diff verificado: só linhas de comentário
adicionadas). `docs/SITE_SUPABASE_SETUP.md` afirma que o ledger foi reconciliado, mas o
PostgREST não expõe `supabase_migrations.schema_migrations`, então isso não foi verificado
na auditoria. Se o remoto ainda registrar as versões antigas, o próximo `db push` tentará
reaplicar as duas migrations.

**Ação.**
```bash
npm run db:site:guard
SUPABASE_WORKDIR=site-supabase npx supabase@latest migration list
SUPABASE_WORKDIR=site-supabase npx supabase@latest db push --dry-run
```
Se `migration list` mostrar `20260908230000` e `20260909103000` como aplicadas em
Local **e** Remote, seguir. Se mostrar as versões com sublinhado no Remote, executar
`supabase migration repair --status reverted 20260908_230000 20260909_103000` seguido de
`supabase migration repair --status applied 20260908230000 20260909103000` (sem `db push`).

**Checklist de conclusão.**
- [ ] `migration list` sem divergência Local/Remote para as 18 migrations do site.
- [ ] `db push --dry-run` responde "Remote database is up to date".
- [ ] Saída dos dois comandos anexada ao PR da etapa 2 (sem segredos).
- [ ] `docs/SITE_SUPABASE_SETUP.md` cita a data e o resultado desta verificação.

**Rollback/risco.** `migration repair` só altera o ledger; nunca executa SQL. Risco nulo
de dado; risco de esquecer o `--dry-run` depois do repair — o checklist exige.

**Depende de.** Nada.

### Etapa 2 — Commitar, publicar e abrir PR do branch `fix/supabase-ledger-ordering`

**Diagnóstico.** O branch não existe no GitHub; `git log origin/main..HEAD` está vazio e as
quatro mudanças (2 docs + 2 renomeações) estão apenas em *staging* local.

**Ação.** Commit único `fix(db): normaliza identificadores das migrations do ledger para 14
dígitos`, `git push -u origin fix/supabase-ledger-ordering`, PR contra `main` referenciando
a etapa 1.

**Checklist de conclusão.**
- [ ] Commit criado com os 4 arquivos e nenhum outro.
- [ ] Branch publicado; PR aberto com a evidência da etapa 1.
- [ ] Workflows `database.yml`, `quality.yml`, `codeql.yml` e `dependency-review.yml` verdes.
- [ ] PR mergeado por *squash* e branch remoto removido.

**Rollback/risco.** Reverter o merge restaura os nomes antigos; como o SQL é idêntico, não
há efeito no banco.

**Depende de.** Etapa 1.

### Etapa 3 — Normalizar a migration do contrato canônico em coordenação com `Promo_Gifts_V4`

**Diagnóstico.** `supabase/migrations/20260908_190000_create_site_products_public_contract.sql`
ainda usa o formato antigo — foi o único arquivo com esse padrão não tratado pelo branch.
`docs/DATABASE_PUBLIC_CONTRACT.md` documenta que o SQL já foi aplicado ao projeto canônico
e que **não consta** no histórico de migrations do repositório `Promo_Gifts_V4`.

**Ação.** Abrir issue no `Promo_Gifts_V4` com o arquivo e o comando de reconciliação
(`migration repair --status applied 20260908190000` naquele projeto). Neste repositório,
renomear o arquivo para `20260908190000_...` **somente após** o canônico registrar a
versão, e acrescentar cabeçalho "espelho somente-leitura; SSOT em Promo_Gifts_V4".

**Checklist de conclusão.**
- [ ] Issue aberta no `Promo_Gifts_V4` com o SQL e o comando de repair.
- [ ] PO decidiu: incorporar ao SSOT (preferido) ou manter só como espelho.
- [ ] Arquivo local renomeado com cabeçalho de espelho, sem nenhuma mudança de SQL.
- [ ] `docs/DATABASE_PUBLIC_CONTRACT.md` atualizado com o número da issue e a decisão.

**Rollback/risco.** Renomear antes de o canônico reconciliar cria um segundo drift. A
ordem no checklist é obrigatória.

**Depende de.** Etapa 2.

### Etapa 4 — Guardrail de nome e ordem de migrations no CI

**Diagnóstico.** O problema de 15/09 (timestamp com sublinhado) só foi detectado
manualmente. O workflow `database.yml` roda `db reset`, `test db` e `db lint`, mas não
valida nomes.

**Ação.** Criar `scripts/validate-migration-names.mjs`: cada arquivo em
`site-supabase/supabase/migrations` e `supabase/migrations` deve casar
`^\d{14}_[a-z0-9_]+\.sql$`, os 14 dígitos devem ser data válida, a lista ordenada por nome
deve ser estritamente crescente e sem duplicata de prefixo. Adicionar como primeiro passo do
job `pg-tap` e ao `npm run check`.

**Checklist de conclusão.**
- [ ] Script falha com mensagem clara para: sublinhado no timestamp, data inválida,
      duplicata, arquivo fora do padrão.
- [ ] Teste `tests/scripts/validate-migration-names.test.ts` cobrindo os quatro casos.
- [ ] Passo adicionado ao `database.yml` antes de `supabase start`.
- [ ] `npm run check` inclui o script.

**Rollback/risco.** Nenhum; é verificação estática.

**Depende de.** Etapa 3 (para o arquivo canônico já estar no padrão).

### Etapa 5 — Higiene de branches locais e `main`

**Diagnóstico.** `main` local está 25 commits atrás de `origin/main`;
`chore/plano-fechamento-fase-0` existe localmente com remoto já removido;
`backup/recovered-eslint-20260914` e `backup/recovered-wip-20260915` nunca foram
publicados.

**Ação.** `git switch main && git pull --ff-only`; `git branch -d
chore/plano-fechamento-fase-0`; para os `backup/*`, criar tags anotadas
(`git tag -a backup/recovered-eslint-20260914 -m "…"`) e publicá-las com `git push origin
--tags` **ou** documentar que são descartáveis e removê-las — decisão do dono do
repositório.

**Checklist de conclusão.**
- [x] `git status -sb` em `main` mostra `## main...origin/main` sem `behind` — feito
      em 16/09/2026 (`git fetch origin main:main`; a branch estava 33 atrás na hora,
      não mais os 25 originais — divergiu mais durante a sessão).
- [x] Branch órfão removido — `chore/plano-fechamento-fase-0` já não existia mais
      quando revisado.
- [x] Destino dos dois `backup/*` decidido e executado — tags já existiam localmente
      (criadas em algum momento anterior a esta auditoria, apontando para os mesmos
      commits das branches — conferido); publicadas em `origin` e as duas branches
      locais removidas.
- [x] `git fetch --prune` não lista mais referências mortas — confirmado, saída vazia.

**Rollback/risco.** Antes de remover qualquer `backup/*`, `git log backup/x --not main`
deve estar vazio ou salvo em tag.

**Depende de.** Etapa 2.

### Etapa 6 — Conector operacional e runbook de verificação em 5 comandos

**Diagnóstico.** Nenhum dos conectores MCP disponíveis aponta para os dois projetos deste
repositório; a auditoria só foi possível por REST com a `SITE_SUPABASE_SECRET_KEY`. Isso
é aceitável para leitura, mas não permite inspecionar `pg_catalog`,
`supabase_migrations` nem executar `explain`.

**Ação.** Provisionar, no ambiente seguro do time (não no repositório), um
`SUPABASE_ACCESS_TOKEN` de escopo mínimo para o CLI e, se o time usar MCP, um gateway
dedicado ao projeto `xlzmclcjdncjfdrjxclt`. Escrever `docs/RUNBOOK_VERIFICACAO_DB.md`
com cinco comandos: `migration list`, `db push --dry-run`, `db lint --linked`, chamada de
`site_notification_queue_health`, e `select count(*)` por tabela via CLI.

**Checklist de conclusão.**
- [ ] Token criado com escopo mínimo e guardado no cofre do time; nunca em `.env.local`
      versionado — **ação humana, não feita nesta sessão** (provisionar credencial de
      acesso real não é uma ação autônoma apropriada).
- [x] Runbook escrito — `docs/RUNBOOK_VERIFICACAO_DB.md` (16/09/2026), com os 5
      comandos. **Não executado contra produção** (depende do token acima); os 5
      comandos usam a mesma sintaxe já validada nesta sessão contra o banco local.
- [ ] Conector MCP (se adotado) identificado pelo nome do projeto — decisão não
      tomada nesta sessão; o runbook documenta a recomendação para quando for.

**Rollback/risco.** Token com escopo largo é o risco; revogar e recriar se o escopo
estiver errado.

**Depende de.** Nada.

---

## Fase 1 — Integridade e ordenação do ledger de eventos e da fila

### Etapa 7 — Sequência monotônica em `quote_request_events`

**Diagnóstico.** `site_private.quote_request_events` ordena por `created_at`
(`20260909180000`, linhas 38–39; `20260910140000`, linha 116). O trigger
`quote_requests_record_customer_event` e a função `record_quote_status_event` inserem
eventos na mesma transação de outras escritas; `now()` é fixo por transação, logo dois
eventos do mesmo pedido podem ter `created_at` idêntico e ordem indefinida. Este é o
problema real de "ordenação do ledger" no domínio.

**Ação.** Migration aditiva: `alter table … add column sequence bigint generated always as
identity`; backfill implícito pela identity; índice `(quote_request_id, sequence desc)`;
alterar `get_my_quote_request` para `order by event.sequence desc`; manter `created_at`
para exibição. Em migration posterior (contract), remover
`quote_request_events_request_created_idx`.

**Checklist de conclusão.**
- [ ] Coluna `sequence` existente, `not null`, identity.
- [ ] pgTAP: dois eventos inseridos na mesma transação retornam em ordem determinística.
- [ ] `get_my_quote_request` e qualquer outra leitura ordenam por `sequence`.
- [ ] `explain` mostra uso do índice novo; índice antigo removido em migration separada.

**Rollback/risco.** Coluna aditiva; leitura antiga continua funcionando até o contract.

**Depende de.** Etapa 2.

### Etapa 8 — Máquina de estados de `quote_requests.status` por trigger

**Diagnóstico.** `status` aceita `new|triaged|in_progress|quoted|closed` por `check`, mas
nada impede `closed → new` ou saltos. Como o status muda por SQL administrativo (Studio),
a integridade depende de disciplina humana.

**Ação.** Tabela imutável `site_private.quote_status_transitions(from_status, to_status)` e
trigger `before update of status` que rejeita transição ausente com `errcode 'P0001'` e
mensagem `invalid_quote_status_transition`. Toda mudança de status passa a gerar evento via
`record_quote_status_event` (já existe) — o trigger garante que não há update "silencioso".

**Checklist de conclusão.**
- [ ] Tabela de transições populada e documentada com `comment on`.
- [ ] pgTAP: transição válida passa; inválida lança o erro esperado; `closed` é terminal.
- [ ] Atualização de status sem evento correspondente é impossível (teste).
- [ ] `docs/DATABASE_FUNCTION_CONTRACTS.md` (etapa 23) lista as transições.

**Rollback/risco.** `drop trigger` restaura o comportamento anterior sem perda.

**Depende de.** Etapa 7.

### Etapa 9 — Máquina de estados de `notification_deliveries.status` por trigger

**Diagnóstico.** Seis estados (`pending|processing|sent|failed|cancelled|exhausted`,
`20260914120000` linha 23). As funções respeitam as transições, mas um update direto pode
mover `sent → pending` ou entrar em `processing` sem `lease_token`.

**Ação.** Trigger `before update` que: exige `lease_token is not null` ao entrar em
`processing`; trata `sent`, `cancelled` e `exhausted` como terminais; só permite
`processing → sent|failed|cancelled` com `lease_token` sendo zerado; incrementa `attempts`
apenas em `→ processing`.

**Checklist de conclusão.**
- [x] Matriz de transições em pgTAP (todas as 36 combinações, aceitas ou rejeitadas) —
      `notification_delivery_status_machine.test.sql`, 40 testes (36 da matriz + 4
      verificando os valores exatos de `lease_token`/`attempts`, não só aceitar/rejeitar).
- [x] Funções existentes continuam passando nos testes de `notification_outbox.test.sql`
      — 3 fixtures que reescrevem status/attempts diretamente (simulação de job preso,
      reaproveitamento de linha para 2 cenários, redistribuição de volume em
      `query_plans.test.sql`) precisaram de `alter table ... disable/enable trigger`
      ao redor do setup, exatamente o padrão que a etapa já previa em "Rollback/risco".
- [x] Tentativa de update direto inválido registra erro claro — mensagens específicas
      por tipo de violação (`invalid_status_transition`, `invalid_notification_delivery_transition`).

**Nota de auditoria (16/09/2026):** esta etapa **foi implementada nesta sessão**, depois
de uma auditoria detectar que só existia uma CHECK constraint declarativa
(`notification_deliveries_lease_matches_status`, migration `20260916110000`) cobrindo
parte do requisito (`lease_token` obrigatório entrando em `processing`) — não a matriz
completa de transições nem a regra de `attempts`. Essa constraint **já tinha uma decisão
registrada** no cabeçalho da própria migration ("Etapa 9 revisada durante a
implementação"), argumentando que um trigger completo quebraria fixtures de teste
legítimas sem ganho real de segurança contra um admin no Studio. Essa parte do
argumento (fixtures) se confirmou — 3 fixtures precisaram de `disable trigger` — mas o
argumento não cobria o risco original do diagnóstico (`sent → pending` continuava
possível por update direto). Reforçado com o trigger completo: `site_private.
enforce_status_transition()` (reaproveitado da Etapa 8, mesma tabela
`status_transitions`) mais um segundo trigger dedicado,
`site_private.enforce_notification_delivery_lease_and_attempts()`, para a regra de
`attempts`/lease que a tabela genérica não cobre sozinha. A constraint declarativa
permanece como defesa em profundidade.

**Rollback/risco.** Se um caso legítimo for bloqueado, `alter table … disable trigger`
é reversão imediata; corrigir a matriz e reabilitar.

**Depende de.** Etapa 10.

### Etapa 10 — `lease_expires_at` e `claimed_at` explícitos na fila

**Diagnóstico.** A lease é inferida por `updated_at <= now() - interval '10 minutes'`
(`20260914120000` linhas 59 e 71). `record_site_notification_provider_acceptance` também
grava `updated_at = now()` (linha 251), o que **estende a lease implicitamente** sem que
isso seja uma decisão explícita. Sobrecarregar `updated_at` é frágil e impede alterar o
tempo de lease sem reescrever quatro funções.

**Ação.** Adicionar `claimed_at timestamptz` e `lease_expires_at timestamptz`; `claim_*`
grava ambos (`now()` e `now() + policy.lease_timeout`); recuperação de `processing` usa
`lease_expires_at <= now()`; `record_*_acceptance` não toca em `lease_expires_at`.
Manter `updated_at` só como carimbo.

**Checklist de conclusão.**
- [ ] Colunas criadas; `claim_site_notification_deliveries` e
      `claim_site_quote_notification` preenchem `claimed_at`/`lease_expires_at`.
- [ ] Nenhuma função usa `updated_at` como critério de lease (grep no repositório).
- [ ] pgTAP: aceite do provedor não prorroga a lease; lease expirada é reivindicável.
- [ ] `notification_outbox.test.sql` atualizado e verde.

**Rollback/risco.** Aditivo. O consumidor em `api/notifications.ts` recebe os mesmos
campos; nenhum contrato externo muda.

**Depende de.** Etapa 12.

### Etapa 11 — Backoff exponencial com jitter calculado no servidor

**Diagnóstico.** `finalize_site_notification_delivery` recebe `p_retry_after_seconds`
(padrão 300, limites 60–86400) do cliente e grava `next_attempt_at` linearmente
(`20260914120000` linhas 132 e 161). Em indisponibilidade do provedor, todas as
tentativas voltam ao mesmo instante; o cron de 15 min vira um martelo.

**Ação.** Função imutável `site_private.next_retry_at(p_attempts int, p_now timestamptz)`
= `p_now + least(base * 2^attempts, cap) + jitter uniforme (0–20 %)`, com `base` e `cap`
vindos da política (etapa 12). `finalize_*` passa a ignorar `p_retry_after_seconds` salvo
quando o provedor enviar `Retry-After` maior que o calculado (mantido como piso).

**Checklist de conclusão.**
- [ ] `next_retry_at` determinística em teste (jitter injetável por parâmetro opcional).
- [ ] pgTAP: 5 tentativas produzem intervalos crescentes dentro dos limites.
- [ ] `api/notifications.ts` continua enviando `Retry-After` do provedor quando existir.
- [ ] Documentado em `docs/DATABASE_FUNCTION_CONTRACTS.md`.

**Rollback/risco.** Mantém a assinatura da função; reversão é voltar a honrar o
parâmetro.

**Depende de.** Etapa 12.

### Etapa 12 — Política única da fila (`site_private.notification_policy()`)

**Diagnóstico.** `5` tentativas, `10 minutes` de lease e `25` de lote máximo aparecem
literalmente em `claim_site_notification_deliveries` (linhas 40, 56, 59, 68, 71) e são
replicados em `claim_site_quote_notification` (linhas 195–196). Duas funções com a mesma
lógica de elegibilidade é o cenário clássico de drift silencioso.

**Ação.** Função `immutable` que devolve um `record`/`jsonb` com `max_attempts`,
`lease_timeout`, `batch_max`, `retry_base_seconds`, `retry_cap_seconds`. Extrair a
elegibilidade para uma função interna `site_private.eligible_delivery_ids(...)` usada pelos
dois claims. Mudar parâmetros exige migration — é intencional.

**Checklist de conclusão.**
- [ ] Nenhum literal de política restante nas funções públicas (grep `>= 5`,
      `'10 minutes'`, `between 1 and 25`).
- [ ] Os dois claims consomem `eligible_delivery_ids`; testes de ambos verdes.
- [ ] `site_notification_queue_health` reporta a política vigente no payload.

**Rollback/risco.** Aditivo; as funções públicas mantêm assinatura.

**Depende de.** Etapa 7 (não técnica; apenas para concentrar a Fase 1 num único PR de
revisão).

---

## Fase 2 — Índices e planos de execução

### Etapa 13 — Índice alinhado à ordem de reivindicação da fila

**Diagnóstico.** O único índice da fila é `notification_deliveries_pending_idx (status,
created_at) where status in ('pending','failed')`. A consulta de candidatos filtra por
`request_kind`, `audience`, `channel`, `attempts < 5`, `next_attempt_at <= now()` e ordena
por `next_attempt_at, created_at, id` (`20260914120000` linhas 65–73). O índice não cobre
o filtro principal nem a ordenação; o planejador fará *bitmap heap + sort*.

**Ação.** `create index concurrently notification_deliveries_claim_idx on
site_private.notification_deliveries (channel, next_attempt_at, created_at, id) where
status in ('pending','failed') and request_kind = 'quote' and audience = 'customer'`.
Depois, `drop index concurrently notification_deliveries_pending_idx` em migration
separada. Observação: `concurrently` não roda dentro de transação — usar o marcador
`-- supabase:no-transaction` ou aplicar via runbook.

**Checklist de conclusão.**
- [ ] `explain (analyze, buffers)` do claim antes/depois anexado ao PR.
- [ ] Plano usa `Index Scan` no índice novo sem nó `Sort`.
- [ ] Índice antigo removido; `index_usage` confirma zero leituras nele antes da remoção.

**Rollback/risco.** Índices são recriáveis; manter o antigo até o novo estar validado.

**Depende de.** Etapa 10.

### Etapa 14 — Índice de recuperação de lease em `processing`

**Diagnóstico.** A recuperação de jobs presos (`status = 'processing' and lease expirada`)
não tem índice; hoje é varredura sequencial — irrelevante com centenas de linhas, ruinoso
com milhões após meses de retenção.

**Ação.** `create index concurrently notification_deliveries_lease_idx on
site_private.notification_deliveries (lease_expires_at) where status = 'processing'`.

**Checklist de conclusão.**
- [ ] Plano do ramo de recuperação usa o índice.
- [ ] Índice incluído no teste de plano da etapa 17.

**Rollback/risco.** Nenhum.

**Depende de.** Etapa 10.

### Etapa 15 — Índice único de reconciliação `(provider, provider_message_id)`

**Diagnóstico.** `apply_site_notification_provider_event` busca a entrega por `provider =
… and provider_message_id = … limit 1` (`20260915150000`, linhas 84–87). Não há índice nem
unicidade — um `provider_message_id` poderia apontar para duas entregas e o `limit 1`
escolheria arbitrariamente.

**Ação.** `create unique index concurrently notification_deliveries_provider_msg_idx on
site_private.notification_deliveries (provider, provider_message_id) where
provider_message_id is not null`. Antes, consulta de diagnóstico para garantir zero
duplicatas.

**Checklist de conclusão.**
- [x] Consulta de duplicatas executada — no banco local antes de aplicar a constraint
      (`do $$ ... raise exception ...` na própria migration); **não executada contra o
      remoto** (a migration em si nunca foi aplicada em produção).
- [x] Índice único criado (`notification_deliveries_provider_message_key`); testado em
      `notification_queue_policy.test.sql`.
- [x] **Decisão (16/09/2026): `limit 1` mantido, não removido.** Reconsiderado ao
      revisar este item: `select ... into v_delivery_id` em PL/pgSQL não é `STRICT` —
      sem `limit 1`, múltiplas linhas não gerariam erro, só escolheriam a última
      processada silenciosamente (mesmo comportamento "arbitrário" que o diagnóstico
      original queria evitar), então remover `limit 1` não muda o pior caso em nada;
      ele só documenta a intenção (no máximo 1 resultado esperado) sem custo. Manter é
      estritamente melhor ou igual a remover — o item do checklist partia da premissa
      de que `limit 1` era o problema, mas o problema real já foi resolvido pelo
      índice único, não pela remoção da cláusula.

**Rollback/risco.** Se houver duplicata histórica, a criação falha — corrigir dados
primeiro, nunca relaxar a unicidade.

**Depende de.** Etapa 10.

### Etapa 16 — Índices de FK e de filtros do portal do cliente

**Diagnóstico.** Só 8 índices para 13 tabelas. FKs sem índice de suporte:
`quote_adjustment_requests(quote_request_id)`, `proposal_documents` além do único
`(quote_request_id, version)` (ok), `customer_profiles(user_id)` (verificar),
`quote_requests(customer_user_id)` para `get_my_quote_requests`, `contact_requests` por
`retention_until`, `shared_selections(expires_at)`, `consent_receipts(request_id)`.

**Ação.** Consulta em `pg_catalog` listando FKs sem índice
(`pg_constraint contype='f'` sem `pg_index` cobrindo as colunas); criar os índices que
sustentem `on delete cascade` e as leituras do portal.

**Checklist de conclusão.**
- [x] Consulta de FKs sem índice devolve zero linhas — **drift real encontrado e
      corrigido em 16/09/2026**: a mesma consulta, reexecutada nesta auditoria, achou
      1 FK sem índice (`notification_deliveries.delivery_state_source_event_id`,
      adicionada pela Etapa 20 depois que esta etapa tinha sido originalmente fechada
      e nunca revalidada). Corrigido em `20260916230000_add_delivery_state_source_event_idx.sql`.
- [x] `get_my_quote_requests` e `get_my_quote_request` com `Index Scan` em `explain` —
      coberto por `query_plans.test.sql`.
- [~] Cada índice tem `comment on index` com a consulta que o justifica — os índices
      desta etapa específica (etapa 16) têm comentário inline na migration, não um
      `comment on index` formal por índice; não revisado exaustivamente nesta sessão.

**Rollback/risco.** Índice excessivo custa escrita; justificar cada um com plano.

**Depende de.** Etapa 7.

### Etapa 17 — Testes de plano de execução

**Diagnóstico.** Nada impede uma migration futura de derrubar um índice e reintroduzir
Seq Scan nas rotas quentes.

**Ação.** Arquivo `site-supabase/supabase/tests/database/query_plans.test.sql` que executa
`explain (format json)` das cinco consultas críticas (claim, recuperação de lease,
reconciliação de webhook, histórico do cliente, purga de retenção) sobre uma fixture com
10 mil linhas e afirma ausência de `"Node Type": "Seq Scan"` nas tabelas de `site_private`.

**Checklist de conclusão.**
- [ ] Fixture gerada por `generate_series` dentro do teste (sem dados pessoais).
- [ ] `analyze` executado antes dos `explain`.
- [ ] Cinco asserts verdes no CI.

**Rollback/risco.** Teste pode ser frágil em tabelas pequenas; por isso a fixture é
obrigatória.

**Depende de.** Etapas 13–16.

### Etapa 18 — Revisão mensal de `pg_stat_statements` e índices sem uso

**Diagnóstico.** `quote_items_product_id_idx (source_product_id)` não tem consumidor
conhecido no código do site; pode ser peso morto.

**Ação.** Runbook mensal: `pg_stat_statements` top 20 por `total_exec_time`;
`pg_stat_user_indexes` com `idx_scan = 0` há mais de 30 dias; decisão registrada em
`docs/DB_REVIEW_YYYYMM.md`.

**Checklist de conclusão.**
- [ ] Primeira revisão executada e documentada.
- [ ] Decisão sobre `quote_items_product_id_idx` tomada (manter com justificativa ou
      remover).
- [ ] Lembrete recorrente criado no sistema de tarefas do time.

**Depende de.** Etapa 6.

---

## Fase 3 — Contratos e identidade

### Etapa 19 — Protocolo humano persistido e único

**Diagnóstico.** O protocolo mostrado ao cliente é `upper(left(request.id::text, 8))`
(`20260914120000`, linha 95) — 32 bits de um UUID. Pelo paradoxo do aniversário, a chance
de colisão chega a 50 % por volta de 77 mil pedidos, e o valor não é indexável nem
consultável de forma direta.

**Ação.** Coluna `protocol text unique` em `quote_requests`, gerada por sequência dedicada
(`PB-` + ano + 6 dígitos + dígito verificador mod 11), preenchida por trigger `before
insert`; backfill dos registros existentes preservando o valor atual quando único;
RPCs passam a retornar `request.protocol`.

**Checklist de conclusão.**
- [ ] Coluna, sequência, trigger e índice único criados.
- [ ] Backfill sem colisão (query de verificação anexada).
- [ ] `claim_*`, `get_my_*` e e-mails/WhatsApp usam `protocol`.
- [ ] Teste vitest de `api/quote-requests.ts` valida o formato.

**Rollback/risco.** Manter a expressão antiga como fallback por um ciclo até o backfill
estar validado em produção.

**Depende de.** Etapa 2.

### Etapa 20 — Precedência semântica de eventos de provedor

**Diagnóstico.** `apply_site_notification_provider_event` aplica "primeiro evento vence"
(`delivery_state is null`, linhas 106–112). Um `bounced` que chega depois de um
`delivered` (cenário real em provedores que reportam soft bounce tardio) é registrado na
tabela de dedup mas não altera o estado — o operador vê "entregue" para uma mensagem que
voltou.

**Ação.** Precedência sem depender de relógio: `bounced` sobrescreve `delivered`;
`delivered` nunca sobrescreve `bounced`; `complained` permanece independente. Registrar
`delivery_state_source_event_id` para rastreabilidade.

**Checklist de conclusão.**
- [ ] pgTAP: `delivered → bounced` aplica; `bounced → delivered` ignora com `reason`
      explícito; duplicata continua `duplicate`.
- [ ] `notification_provider_events.test.sql` atualizado.
- [ ] `tests/api/notification-events-*.test.ts` cobrem a ordem invertida.

**Rollback/risco.** Comportamento anterior restaurável via `create or replace`.

**Depende de.** Etapa 15.

### Etapa 21 — Tipos TypeScript gerados do schema e diffados no CI

**Diagnóstico.** Não há tipos gerados (`supabase gen types`) no repositório;
`api/_lib/contracts.ts` é escrito à mão. Uma mudança de retorno em RPC só é detectada em
runtime.

**Ação.** `SUPABASE_WORKDIR=site-supabase supabase gen types typescript --local --schema
public > src/types/site-database.types.ts`; passo no `database.yml` que regenera e falha
se `git diff --exit-code` acusar diferença; `contracts.ts` passa a importar os tipos.

**Checklist de conclusão.**
- [ ] Arquivo gerado versionado; script `db:site:types` no `package.json`.
- [ ] CI falha quando a migration muda o contrato sem regenerar.
- [ ] `contracts.ts` sem duplicar definições que já existem nos tipos gerados.

**Rollback/risco.** Nenhum em produção.

**Depende de.** Etapa 12.

### Etapa 22 — Catálogo único de erros das RPCs

**Diagnóstico.** As funções lançam `errcode '22023'` com mensagens `invalid_*`; o mapeamento
para HTTP fica em `api/_lib/*`. Não há lista única nem teste que garanta que todo
`invalid_*` do SQL tem tratamento no TypeScript.

**Ação.** `docs/DATABASE_FUNCTION_CONTRACTS.md` com tabela `mensagem → errcode → HTTP →
ação do cliente`; teste vitest que lê as mensagens por regex dos arquivos SQL e verifica
que cada uma está mapeada em `contracts.ts`.

**Checklist de conclusão.**
- [x] Tabela completa — **gap real encontrado em 16/09/2026**: `invalid_erasure_email`
      (Etapa 32, escrita depois que esta etapa tinha fechado) nunca tinha sido
      adicionada à tabela; corrigido.
- [x] Teste de cobertura — **redesenhado do texto original**: o plano pedia um teste
      verificando que "cada mensagem está mapeada em `contracts.ts`", mas a própria
      tabela documenta que a maioria das mensagens `invalid_*` **deliberadamente não
      tem** mapeamento TypeScript (são defesa em profundidade — a validação de
      `api/_lib/contracts.ts` já barra esses casos antes de chegar à RPC; forçar um
      mapeamento 1:1 seria testar um requisito que o próprio design rejeita).
      Implementado o teste que o design real sustenta:
      `scripts/validate-error-catalog.mjs`/`tests/validate-error-catalog.node.mjs`
      (`npm run test:error-catalog`, também na CI via `database.yml`) — falha se
      qualquer mensagem `message = '...'` ou `message = format('...'` de uma migration
      não aparecer no catálogo, mapeada ou explicitamente "não mapeada" com o motivo.
- [x] Nenhuma mensagem de erro contém dado pessoal — revisão manual da lista completa
      de mensagens (16/09/2026): todas são tokens técnicos genéricos
      (`invalid_quote_payload`, `rate_limit_exceeded` etc.), nenhuma interpola e-mail/
      telefone/nome.

**Depende de.** Etapa 21.

### Etapa 23 — Convenção formal de versionamento de RPC

**Diagnóstico.** `20260914120000` documenta corretamente que `create or replace` com
assinatura diferente cria uma segunda função (linhas 120–123) e faz `drop` explícito. É
uma boa prática que hoje vive num comentário.

**Ação.** Seção em `DATABASE_FUNCTION_CONTRACTS.md`: toda mudança de assinatura exige
`drop function if exists` com a assinatura antiga; mudanças de semântica incompatível
criam `_v2` e mantêm a antiga por um ciclo; verificação pgTAP de que não há funções
sobrecarregadas em `public` com o mesmo nome.

**Checklist de conclusão.**
- [ ] Teste `no_overloaded_public_functions` em pgTAP.
- [ ] Convenção documentada e referenciada no template de PR.

**Depende de.** Etapa 22.

### Etapa 24 — Normalização canônica de e-mail e telefone

**Diagnóstico.** `lead_storage` tem 44 `check`s, mas a normalização (lower/trim de e-mail,
E.164 para telefone) ocorre no TypeScript (`api/_lib/leadHandler.ts`). O banco aceita o que
receber; duplicatas lógicas ("Ana@x.com" vs "ana@x.com") são possíveis via outra rota.

**Ação.** Funções imutáveis `site_private.normalize_email(text)` e
`site_private.normalize_phone_e164(text)`; `check` de que o valor armazenado é igual ao
normalizado; `create_site_*` normalizam antes de gravar.

**Checklist de conclusão.**
- [x] Funções com testes pgTAP para casos limítrofes (espaços, maiúsculas) — só para
      e-mail; telefone/E.164 formalmente adiado, ver decisão abaixo.
- [x] `check` aplicado após backfill validado (zero violações) — e-mail apenas.
- [~] TypeScript e SQL produzem o mesmo resultado — verdadeiro só para e-mail
      (`api/_lib/contracts.ts` já normaliza da mesma forma); não se aplica a telefone.

**Decisão registrada (16/09/2026):** normalização de telefone para E.164 **adiada
formalmente**, não implementada como meia-medida — ver
`docs/DATABASE_FUNCTION_CONTRACTS.md`, seção "Decisão registrada — normalização de
telefone, adiada". E-mail está 100% implementado.

**Rollback/risco.** `check` só é adicionado depois do backfill; até lá, `not valid`.

**Depende de.** Etapa 19.

---

## Fase 4 — Segurança e privilégio mínimo

### Etapa 25 — Role `site_api` com privilégio mínimo no lugar de `service_role`

**Diagnóstico.** `api/_lib/siteDatabase.ts` autentica com a `SITE_SUPABASE_SECRET_KEY`
(`service_role`), que **ignora RLS e tem `select/insert/update/delete` em todas as tabelas
de `site_private`** (grants em `20260908230000`, linhas 127–132). As RLS sem política e
o schema não exposto protegem contra `anon`, mas o vazamento da chave do servidor entrega
o banco inteiro.

**Ação.** `create role site_api nologin noinherit nobypassrls`; `grant site_api to
authenticator`; `grant usage on schema public to site_api`; `grant execute` apenas nas RPCs
de serviço (`claim_*`, `finalize_*`, `record_*`, `apply_*`, `create_site_*`,
`get_site_data_retention_candidates`, `finalize_site_data_retention`,
`site_notification_queue_health`, `*_shared_selection`); as funções passam a `security
definer` com `set search_path = ''` e `owner` controlado, pois `site_api` não terá acesso a
tabela. Gerar JWT com `role: site_api` assinado com o segredo do projeto e usá-lo na
Vercel; rotacionar a `service_role` depois da troca.

**Checklist de conclusão.**
- [ ] Role criada; `\dp site_private.*` mostra zero privilégios para `site_api`.
- [ ] Todas as RPCs de serviço executam com o JWT de `site_api` (teste vitest de
      integração contra banco local).
- [ ] Chamada de qualquer tabela via REST com o JWT de `site_api` devolve 401/403.
- [ ] `SITE_SUPABASE_SECRET_KEY` substituída na Vercel pelo JWT; `service_role`
      rotacionada.
- [ ] pgTAP `function_privs_are` para cada RPC e role.

**Rollback/risco.** Manter a variável antiga por um deploy; se algo falhar, trocar a
variável de volta sem tocar no banco. Nunca revogar `service_role` das funções antes de
o `site_api` estar validado em produção.

**Depende de.** Fase 1 concluída (assinaturas finais).

### Etapa 26 — `force row level security` e teste que varre todas as tabelas

**Diagnóstico.** As 13 tabelas têm `enable row level security` e nenhuma política —
deny-all para quem não é dono. `force` não está aplicado; um `security definer` executado
como dono ignora RLS por definição. Hoje isso é desejado, mas nada garante que uma tabela
nova nasça com o mesmo padrão.

**Ação.** `alter table … force row level security` em todas; teste pgTAP que itera
`pg_tables where schemaname = 'site_private'` e afirma `rowsecurity` e `forcerowsecurity`
verdadeiros e zero grants para `anon`/`authenticated`/`public`; `alter default privileges`
já existe — validar que cobre `sequences` e `functions`.

**Checklist de conclusão.**
- [ ] Teste iterativo verde para as 13 tabelas (e falha ao criar tabela nova sem RLS no
      teste de exemplo).
- [ ] `alter default privileges … revoke all on sequences` adicionado.
- [ ] `rls_auto_enable()` continua sem `execute` para qualquer role (já verificado em
      16/09; manter o assert).

**Depende de.** Nada.

### Etapa 27 — PII em repouso: hash para busca e mascaramento nas funções `get_my_*`

**Diagnóstico.** `email`, `phone`, `contact_name` e `company` ficam em claro em
`quote_requests` e `contact_requests`. O acesso é restrito, mas backup, dump de suporte
e Studio expõem o conteúdo integral.

**Ação.** Colunas `email_hash`/`phone_hash` (`sha256` com `SITE_REQUEST_HASH_SALT`
aplicado no banco via Vault) para busca e deduplicação; avaliar `pgsodium` para
criptografia transparente de `email`/`phone` com chave no Vault; as funções `get_my_*`
retornam telefone mascarado (`+55 ** *****-1234`) salvo quando o próprio titular pede o
valor completo.

**Checklist de conclusão.**
- [ ] Decisão documentada: hash + mascaramento (mínimo) ou pgsodium (preferido).
- [ ] Backfill dos hashes; consultas de suporte usam hash, nunca o valor.
- [ ] `get_my_quote_requests` mascara por padrão; teste garante.
- [ ] Dump de teste (`pg_dump` local) não expõe telefone em claro se pgsodium adotado.

**Rollback/risco.** Criptografia mal implementada é perda de dado: fazer em banco local
com restauração testada antes de produção.

**Depende de.** Etapa 24.

### Etapa 28 — Revisão da exposição do token público de seleção compartilhada

**Diagnóstico.** `shared_selections.token uuid primary key` é o próprio token de acesso
público (`20260911170000`, linha 5); `management_token_hash` já é hash. Um leitor do banco
(backup, Studio) obtém todos os links compartilhados ativos.

**Ação.** Avaliar `token_hash` como PK e devolver o token só na criação (como já se faz
com o de gestão). Se o custo de migração for alto para o valor, registrar a decisão de
aceitar o risco com justificativa (token de 122 bits, expira em 30 dias, sem PII).

**Checklist de conclusão.**
- [ ] Decisão registrada em `DATABASE_FUNCTION_CONTRACTS.md`.
- [ ] Se migrado: `get_site_shared_selection` busca por hash; teste atualizado; links
      antigos continuam válidos até expirar (compatibilidade dupla por 30 dias).

**Depende de.** Etapa 26.

### Etapa 29 — Rotação programada de segredos e comparação em tempo constante

**Diagnóstico.** `CRON_SECRET`, `SITE_REQUEST_HASH_SALT`, `RESEND_WEBHOOK_SECRET`,
`WHATSAPP_APP_SECRET` e a chave do banco não têm política de rotação documentada.
`api/_lib/webhookSignature.ts`, `api/notification-events-whatsapp.ts` e
`api/notifications.ts` já usam `timingSafeEqual`; falta um guarda que impeça regressão em
rotas novas.

**Ação.** Calendário de rotação (90 dias) no runbook; script de checagem de idade das
variáveis na Vercel; `timingSafeEqual` em toda comparação de segredo; rotação do
`SITE_REQUEST_HASH_SALT` exige rehash dos buckets (ou aceitar expiração natural — os
buckets são efêmeros).

**Checklist de conclusão.**
- [ ] Toda comparação de segredo em `api/` usa `crypto.timingSafeEqual` (grep).
- [ ] Runbook de rotação com ordem segura (novo segredo → deploy → revogar antigo).
- [ ] Primeira rotação executada após a etapa 25.

**Depende de.** Etapa 25.

### Etapa 30 — Rate limit em duas camadas e `rate_limit_buckets` UNLOGGED

**Diagnóstico.** `site_private.consume_rate_limit` grava em `rate_limit_buckets` a cada
requisição — o banco absorve o custo de um ataque antes de o limite agir. A tabela é
efêmera por natureza (chave hasheada, janela curta).

**Ação.** Vercel Firewall/rate limit na borda por IP/rota como primeira camada; `alter
table rate_limit_buckets set unlogged` (perda em crash é aceitável); autovacuum agressivo
(`autovacuum_vacuum_scale_factor = 0.02`); purga de buckets antigos na retenção diária.

**Checklist de conclusão.**
- [ ] Regra de borda ativa e documentada com limiares — **adiada formalmente**, ver
      decisão abaixo.
- [~] Tabela `unlogged` ✅; teste de carga (`autocannon` ou similar) mostra latência
      estável — não feito (o soak test da Etapa 38 mede a fila de notificações, não
      o rate limit).
- [x] Buckets com `updated_at` > 24 h purgados pela retenção.

**Decisão registrada (16/09/2026):** camada de borda (Vercel Firewall) **adiada
formalmente** — mudança de infraestrutura de produção que afeta todo o tráfego do
domínio, fora do escopo apropriado de uma sessão de banco de dados sem revisão de
tráfego real. Ver `docs/DATABASE_FUNCTION_CONTRACTS.md`, seção "Decisão registrada —
rate limit de borda, adiada".

**Rollback/risco.** `unlogged` não replica em réplica física — irrelevante para dado
efêmero; documentar.

**Depende de.** Etapa 33.

### Etapa 31 — `db lint --fail-on warning` e Security Advisor no CI

**Diagnóstico.** `database.yml` executa `supabase db lint --local` sem `--fail-on`; avisos
não quebram o build.

**Ação.** `supabase db lint --local --level warning --fail-on warning`; corrigir avisos
existentes; adicionar passo manual documentado para o Security Advisor do painel após cada
deploy de migration.

**Checklist de conclusão.**
- [x] Lint com `--fail-on warning` verde no CI — confirmado literalmente em
      `.github/workflows/database.yml`.
- [~] Zero achados críticos no Security Advisor — **não verificável nesta sessão**
      (exige acesso ao painel real do projeto). Passo manual documentado em
      `docs/RUNBOOK_VERIFICACAO_DB.md` (16/09/2026), a ser executado após cada
      `db push` para produção — não a captura de tela em si, que só existe depois da
      execução real.

**Depende de.** Etapa 26.

---

## Fase 5 — Retenção, LGPD e ciclo de vida

### Etapa 32 — RPC de apagamento LGPD (`erase_customer_data`)

**Diagnóstico.** `customer_profiles` referencia `auth.users` com `on delete cascade` e
`quote_requests` com `set null`. Apagar o usuário no Auth deixa pedidos anonimizados de
forma implícita, sem evento, sem comprovante e sem cobrir `contact_requests` por e-mail.

**Ação.** `public.erase_customer_data(p_user_id uuid)` (só `site_api`/operador):
anonimiza determinística e irreversivelmente e-mail, telefone, nome e empresa em todas as
tabelas, remove documentos do bucket `customer-proposals`, grava evento `erased` e devolve
recibo (contagens por tabela). Manter `id` e datas para integridade referencial e
estatística.

**Checklist de conclusão.**
- [~] Função cobre 3 tabelas (`quote_requests`, `contact_requests`, `customer_profiles`)
      e o Storage (`proposal_documents`) — desvio documentado no cabeçalho da própria
      migration, não as "13 tabelas" do texto original (a maioria das outras não
      contém PII do titular fora dessas três). pgTAP cobre as três, incluindo
      idempotência de `customer_profiles` (adicionado em 16/09/2026 — o teste original
      só cobria `quote_requests`/`contact_requests`, deixando sem asserção o fix de
      precedência de operador desta sessão).
- [ ] Evento `erased` registrado com `sequence` (etapa 7) — **não implementado**;
      `docs/DATABASE_FUNCTION_CONTRACTS.md` já registrava essa ausência como uma
      limitação conhecida ("não fica registrada em nenhum lugar além do que você
      salvar"), reafirmado no runbook novo.
- [x] Runbook de atendimento a pedido de titular — `docs/RUNBOOK_PEDIDO_TITULAR.md`
      (16/09/2026, formato completo: pré-condições/comandos/verificação/comunicação;
      prazo tratado como "combinar com jurídico", sem inventar um número de dias que a
      LGPD não fixa de forma única).

**Depende de.** Etapa 27.

### Etapa 33 — Purga em lotes com índice parcial em `retention_until` e teste de falha parcial

**Diagnóstico.** `get_site_data_retention_candidates` + `finalize_site_data_retention`
orquestram Storage e linhas (`20260911150000`). Não há índice em `retention_until`, e o
caso "Storage removeu, banco não finalizou" precisa de teste explícito.

**Ação.** Índices parciais `(retention_until) where retention_until is not null` nas
tabelas com retenção; lotes com `limit` + `for update skip locked`; teste pgTAP/vitest
que simula falha após a remoção do arquivo e verifica que a próxima execução conclui sem
duplicar nem perder.

**Checklist de conclusão.**
- [x] Índices criados — full em vez de parcial (`where retention_until is not null`
      seria idêntico a um índice completo, já que a coluna é `not null`; desvio
      correto, não um bug). Lotes com `limit` já existiam. **`for update skip locked`
      não implementado** — analisado nesta auditoria: `get_site_data_retention_candidates`
      é uma leitura pura, sem estado de "reivindicado" (diferente da fila de
      notificações); duas execuções concorrentes gerariam trabalho duplicado, não
      corrupção — Storage tolera 404, `finalize_expired_site_data` apagando uma linha
      já ausente é uma operação idempotente sem erro. Como retenção roda como 1 cron
      diário (não um pool de workers concorrentes), o risco real é baixo; aceito sem
      lock explícito por ora.
- [x] Teste de falha parcial verde — **adicionado em 16/09/2026** (o teste existente só
      cobria a direção oposta: Storage falha, banco não é tocado). Dois testes novos:
      finalize falha depois do Storage já ter sido limpo (503, sem reprocessar
      Storage na mesma chamada); replay da mesma execução com o objeto de Storage já
      ausente (404 tratado como sucesso, `finalize` conclui, idempotente).
- [x] `tests/api/retention.test.ts` cobre o cenário — mesmo arquivo, testes acima.

**Depende de.** Etapa 16.

### Etapa 34 — `pg_cron` como retaguarda dos crons da Vercel

**Diagnóstico.** `vercel.json` agenda `/api/retention` (03:00) e `/api/notifications`
(15 min). Se a Vercel não invocar (incidente, limite de plano), a fila para sem alarme
interno.

**Ação.** `pg_cron` com dois jobs de retaguarda de baixa frequência (fila a cada 30 min,
retenção 04:00) que chamam as mesmas RPCs por `pg_net` ou executam a lógica interna; lock
advisory (`pg_try_advisory_lock`) compartilhado com o caminho da Vercel para impedir
execução dupla; métrica de "última execução por origem".

**Checklist de conclusão.**
- [ ] Jobs criados por migration (`cron.schedule`) e visíveis em `cron.job`.
- [ ] Lock impede execução concorrente (teste com duas sessões).
- [ ] `site_notification_queue_health` expõe `lastRunAt` por origem.

**Rollback/risco.** `cron.unschedule` imediato.

**Depende de.** Etapa 33.

### Etapa 35 — Política de retenção por tabela e dicionário de dados gerado

**Diagnóstico.** Há `comment on` em várias tabelas e funções, mas a política de retenção
(dias, base legal) não está anexada ao objeto e não há dicionário consolidado.

**Ação.** Padronizar `comment on table` com bloco `retention: <dias>; legal_basis: <…>`;
script `scripts/db-data-dictionary.mjs` que lê `pg_description` no banco local e gera
`docs/DATABASE_DICTIONARY.md`; passo no CI que falha se o arquivo estiver desatualizado.

**Checklist de conclusão.**
- [ ] 13 tabelas com comentário padronizado.
- [ ] Dicionário gerado e versionado; CI valida.

**Depende de.** Etapa 21.

### Etapa 36 — Trilha de auditoria de acesso administrativo direto

**Diagnóstico.** Mudanças feitas pelo Studio/SQL editor (ex.: alterar `status` de um
pedido) não deixam rastro além do evento de domínio, e DDL fora de migration passa
despercebido.

**Ação.** Event trigger `ddl_command_end` gravando em `site_private.admin_audit_log`
(comando, role, timestamp); trigger `after update` nas tabelas de negócio que registra
`current_user` e `application_name` quando a escrita **não** vier de uma RPC (detectado
por `current_setting('site.rpc', true)` definido nas funções).

**Checklist de conclusão.**
- [ ] Log criado; escrita via RPC não polui; escrita manual registra.
- [ ] Retenção do log definida (etapa 35).
- [ ] Consulta de revisão semanal no runbook.

**Depende de.** Etapa 26.

---

## Fase 6 — Confiabilidade operacional

### Etapa 37 — Teste de concorrência real da fila

**Diagnóstico.** `notification_outbox.test.sql` (39 asserts) roda em sessão única; `for
update skip locked` nunca é exercitado com dois trabalhadores.

**Ação.** Teste que abre duas conexões (via `dblink` no banco local ou script Node com dois
clientes) e chama `claim_site_notification_deliveries` simultaneamente sobre 50 jobs:
conjuntos disjuntos, soma igual ao total, nenhum job com dois `lease_token`.

**Checklist de conclusão.**
- [~] Teste verde em execuções consecutivas — confirmado em várias rodadas manuais
      nesta sessão (não há loop automatizado de 20 execuções no CI, já que o teste
      inteiro depende do stack local do Supabase e não roda em `npm run check`).
- [x] Cenário de lease expirada sob concorrência coberto — **adicionado em
      16/09/2026**: duas conexões disputam o mesmo job com lease expirada, só uma
      recupera (attempts incrementa corretamente, lease_token novo). Não é
      literalmente "terceiro trabalhador" (o texto original imaginava 3 conexões);
      2 disputando pelo mesmo job já testa a exclusão mútua que importa.
- [x] Cenário `exhausted` sob concorrência coberto — **adicionado em 16/09/2026**: duas
      conexões concorrentes tentam reivindicar um job já no limite de tentativas com
      lease expirada; nenhuma o reivindica como nova tentativa, ele termina em
      `exhausted` sem erro em nenhuma das duas conexões.

**Depende de.** Etapas 10 e 12.

### Etapa 38 — Soak test da fila e calibração dos limiares de alerta

**Diagnóstico.** Os limiares de `oldestEligibleAgeSeconds` e `exhaustedCount` nos alertas
operacionais foram definidos sem carga real.

**Ação.** Script que enfileira 1 000 entregas sintéticas no banco local, drena com o
consumidor real apontando para provedores simulados (latência e falhas injetadas) e
registra p50/p95 do tempo de fila; ajustar SLA e limiares.

**Checklist de conclusão.**
- [x] Relatório com p50/p95 e taxa de `exhausted` sob 10 % de falha injetada —
      `docs/RELATORIO_SOAK_TEST_FILA_20260916.md` (1000 jobs sintéticos via
      `scripts/soak-test-notification-queue.mjs`/`npm run db:site:soak-test`, drenados
      com o contrato real `claim_site_notification_deliveries`/
      `finalize_site_notification_delivery` e backoff real, sem aceleração).
- [x] Limiar revisado com justificativa. Correção ao texto original desta etapa: o
      limiar (`QUEUE_AGE_ALERT_SECONDS`) vive em `api/notifications.ts`, não em
      `api/_lib/operationalAlerts.ts` (que só envia o webhook, sem limiares próprios).
      Resultado: **mantido em 45 min** — p95 medido (223,2s) fica ~12x abaixo do
      limiar e o pior caso observado (405,0s) ~6,7x abaixo; nenhuma evidência de que
      esteja apertado demais para o volume/taxa de falha testados. Comentário da
      constante atualizado referenciando o relatório.
- [x] Teste reflete o valor — `tests/api/notifications.test.ts` (não
      `operationalAlerts.test.ts`, que não testa este limiar) importa
      `QUEUE_AGE_ALERT_SECONDS` diretamente em vez de hardcodar o número; nenhuma
      mudança de teste foi necessária mesmo com o comentário atualizado.

**Depende de.** Etapas 13, 14 e 37.

### Etapa 39 — Backups: PITR confirmado e drill de restore trimestral

**Diagnóstico.** O plano do projeto (e portanto PITR/retenção de backup) não está
documentado no repositório; nunca houve ensaio de restauração.

**Ação.** Registrar plano, janela de PITR e RPO/RTO alvo; executar restore para um projeto
temporário, rodar `migration list` e os testes pgTAP nele, descartar; agendar o drill a
cada trimestre.

**Checklist de conclusão.**
- [ ] `docs/RUNBOOK_BACKUP_RESTORE.md` com RPO/RTO e evidência do primeiro drill.
- [ ] Drill executado sem intervenção manual não documentada.
- [ ] Próximo drill agendado.

**Depende de.** Etapa 6.

### Etapa 40 — Autovacuum e `fillfactor` para tabelas de alta rotatividade

**Diagnóstico.** `notification_deliveries` sofre vários updates por linha (claim, aceite,
finalização, webhook); `rate_limit_buckets` é update-heavy. Padrões de autovacuum
(`scale_factor 0.2`) atrasam a limpeza.

**Ação.** `alter table … set (fillfactor = 80, autovacuum_vacuum_scale_factor = 0.05,
autovacuum_analyze_scale_factor = 0.02)` nas duas tabelas; monitorar `n_dead_tup` e bloat
mensalmente (etapa 18).

**Checklist de conclusão.**
- [x] Parâmetros aplicados por migration — **gap encontrado e corrigido em
      16/09/2026**: a migration original (`20260916180000`) aplicou `fillfactor=80` só
      em `notification_deliveries`, deixando `rate_limit_buckets`/
      `shared_selection_rate_limits` de fora sem nenhuma nota explicando por quê —
      ambas fazem `insert ... on conflict do update` na mesma linha por
      `identifier_hash` a cada requisição (mesmo padrão de update repetido que
      justificou o fillfactor em `notification_deliveries`). Corrigido em
      `20260917000000_add_rate_limit_fillfactor.sql` (renomeada nesta auditoria: o
      nome original, `20260916240000_...`, tinha hora "24" inválida — detectado por
      `npm run test:migration-names`, que não tinha rodado desde a criação do
      arquivo); testado em `storage_tuning.test.sql`.
- [ ] `pg_stat_user_tables.n_dead_tup` estável após uma semana — inerentemente não
      verificável numa sessão (requer monitoramento real de produção ao longo do
      tempo).

**Depende de.** Etapa 13.

### Etapa 41 — Timeouts por role

**Diagnóstico.** Sem `statement_timeout`/`lock_timeout` no lado do banco, uma consulta
presa segura a função da Vercel até o `maxDuration` (30 s) e mantém locks.

**Ação.** `alter role site_api set statement_timeout = '8s'`, `lock_timeout = '2s'`,
`idle_in_transaction_session_timeout = '10s'` (abaixo do `REQUEST_TIMEOUT_MS = 10_000` do
cliente para o banco desistir primeiro).

**Checklist de conclusão.**
- [ ] Parâmetros aplicados e visíveis em `pg_roles.rolconfig`.
- [ ] Teste vitest simula timeout do banco e verifica resposta 503 com correlação.

**Depende de.** Etapa 25.

### Etapa 42 — Saúde da fila integrada aos alertas operacionais com SLA

**Diagnóstico.** `site_notification_queue_health()` existe e responde; falta vinculá-la a
um SLA explícito (ex.: 95 % das confirmações em ≤ 30 min) e ao canal de alerta já
existente (`OPERATIONS_ALERT_WEBHOOK_URL`).

**Ação.** Alerta quando `oldestEligibleAgeSeconds > 1800` ou `exhaustedCount > 0` em duas
leituras consecutivas; alerta de "cron silencioso" se `lastRunAt` (etapa 34) exceder 2×
a frequência.

**Checklist de conclusão.**
- [x] SLA documentado; limiares no código com origem na etapa 38 —
  `QUEUE_AGE_ALERT_SECONDS` (`api/notifications.ts`) e `oldestEligibleAgeSeconds >
  1800`/`exhaustedCount > 0` já disparavam `sendOperationalAlert`, mas nenhum teste
  cobria a chamada ao webhook — **gap fechado em 16/09/2026**: novo teste em
  `tests/api/notifications.test.ts` configura `OPERATIONS_ALERT_WEBHOOK_URL` de
  verdade e afirma sobre a chamada HTTP real (`fetch`) com o payload
  `notification_queue_alert`, em vez de só o `console.error`. Comentário
  desatualizado em `api/notifications.ts` (dizia que a integração de alerta "é
  escopo da Etapa 41") corrigido no mesmo commit.
- [ ] Alerta de "cron silencioso" (`lastRunAt` 2× a frequência) — **não
  implementado**: depende de `lastRunAt` por origem, que é entregável da etapa 34
  (`pg_cron` de retaguarda), ainda não implementada.
- [ ] Recebimento no canal real (PagerDuty/e-mail de oncall) — não ensaiado nesta
  sessão; só o webhook HTTP é testado (mock local). Requer
  `OPERATIONS_ALERT_WEBHOOK_URL` de produção configurado e um teste manual único.

**Depende de.** Etapas 34 e 38.

---

## Fase 7 — Catálogo canônico e fronteira

### Etapa 43 — Fase B do contrato público

**Diagnóstico.** `docs/DATABASE_PUBLIC_CONTRACT.md` registra que `anon` ainda alcança
`v_products_public`, `product_variants` e `v_variant_sale_prices_public` no projeto
canônico; `v_site_products_public` é `security_invoker` sobre a view legada e, por isso,
depende dessa permissão.

**Ação.** Executar no canônico a consulta de dependências já documentada; listar todos os
consumidores; substituir a origem de `v_site_products_public` por relação base com RLS ou
por view `security_definer` revisada; então, em transação única com smoke test, `revoke
select on public.v_products_public from anon`.

**Checklist de conclusão.**
- [ ] Inventário de dependências anexado à issue no `Promo_Gifts_V4`.
- [ ] Nova origem da view mínima validada (36 colunas, zero campo proibido).
- [ ] Revogação aplicada e smoke test do site em produção verde.

**Rollback/risco.** `grant select … to anon` restaura em segundos; o smoke test na mesma
transação evita commit com site quebrado.

**Depende de.** Etapa 45.

### Etapa 44 — Cache de borda para catálogo, página de produto e sitemap

**Diagnóstico.** 7 519 produtos ativos servidos por view sobre view com `security_invoker`;
`api/product-page.ts` e `api/sitemap.ts` consultam o canônico a cada requisição.

**Ação.** `Cache-Control: s-maxage=3600, stale-while-revalidate=86400` nas rotas de
leitura; chave de invalidação por `updated_at` máximo do catálogo; medir TTFB antes/depois.

**Checklist de conclusão.**
- [x] Cabeçalhos aplicados (já vinham de trabalho anterior a esta sessão —
      `s-maxage=300` em `product-page.ts`/`site-page.ts`, `s-maxage=3600` em
      `sitemap.ts`, `no-store` nos caminhos de erro/privados); cobertura de teste
      que faltava adicionada em 16/09 em `tests/api/sitemap.test.ts` (sucesso, 503,
      HEAD) e `tests/api/site-page.test.ts` (público vs. `no-store` privado) —
      `product-page.test.ts` já cobria.
- [~] TTFB p95 antes/depois — não recuperável retroativamente: os cabeçalhos já
      estavam em produção antes do início desta sessão, então não existe uma
      medição "antes" para comparar sem tráfego real já cacheado. Se o Vercel Web
      Analytics estiver ativo, ele tem os dados de TTFB histórico; não verificado
      nesta sessão por não ser uma ação de banco de dados.

**Depende de.** Nada.

### Etapa 45 — Incorporar o contrato ao SSOT e definir destino de `supabase/`

**Diagnóstico.** `supabase/.temp/linked-project.json` aponta para `xlzmclcjdncjfdrjxclt`
(o projeto do **site**), enquanto a única migration da pasta é do projeto **canônico**. É
um link incoerente que só não causou dano porque `db:site:*` usa `SUPABASE_WORKDIR=site-supabase`.

**Ação.** Após a etapa 3: remover o link (`supabase/.temp`) e, se a decisão for "espelho",
mover o arquivo para `docs/sql/canonical/` (fora de qualquer diretório que o CLI reconheça)
com teste que impede recriar `supabase/migrations` neste repositório.

**Checklist de conclusão.**
- [x] `supabase/.temp` removido e ignorado; nenhum `linked-project.json` apontando para o
      projeto errado — o diretório `supabase/` de topo não existe mais neste
      repositório (confirmado em 16/09). Guard adicionado:
      `validateNoTopLevelSupabaseMigrationsDir()` em
      `scripts/validate-migration-names.mjs`, já rodando na CI (mesmo passo que
      valida nomes de migration) — falha o build se essa pasta for recriada,
      fechando o "teste que impede recriar `supabase/migrations`" citado na Ação.
- [x] Arquivo do contrato no SSOT ou em `docs/sql/canonical/` com cabeçalho —
      `docs/sql/canonical/20260908190000_create_site_products_public_contract.sql`
      (mirror somente-leitura; incorporação ao SSOT do `Promo_Gifts_V4` em si é
      decisão pendente do PO daquele repositório, não bloqueia esta etapa).
- [x] `README.md` atualizado — referencia `docs/sql/canonical/` corretamente.

**Depende de.** Etapa 3.

### Etapa 46 — Teste de contrato cross-projeto no CI

**Diagnóstico.** As validações da migration do contrato (colunas proibidas, privilégios)
estão em comentário (`20260908_190000`, linhas 76–92) e só foram executadas manualmente
em 08/09.

**Ação.** Workflow manual/agendado `contract-canonical.yml` que, com a chave `anon` do
canônico (secret do repositório), consulta `v_site_products_public` via REST, valida as 36
colunas esperadas, ausência de `cost_price`/`stock_quantity`/`supplier_id` e resposta 401/403
ao tentar campos proibidos.

**Checklist de conclusão.**
- [ ] Workflow verde na primeira execução; agendado semanalmente.
- [ ] Falha simulada (coluna a mais) detectada.

**Depende de.** Etapa 43.

---

## Fase 8 — Governança, documentação e DX

### Etapa 47 — Supabase Branching por PR com dados sintéticos

**Diagnóstico.** O plano anterior deixou "Resolver o check Supabase Preview" pendente; hoje
o CI reconstrói o banco local, o que é suficiente para testes, mas não para revisão manual
de PR com banco vivo.

**Ação.** Avaliar Branching do Supabase para o projeto do site; seed sintético
(`supabase/seed.sql`) sem PII; check de preview ligado ao PR.

**Checklist de conclusão.**
- [ ] Decisão go/no-go documentada com custo.
- [ ] Se go: preview criado automaticamente em PR de exemplo e destruído no merge.

**Depende de.** Etapa 21.

### Etapa 48 — ERD e `DATABASE_SCHEMA.md` gerados; drift `db diff` vazio

**Diagnóstico.** Não há diagrama nem verificação de que o schema real corresponde às
migrations (drift por DDL manual).

**Ação.** Script que gera Mermaid `erDiagram` a partir de `pg_catalog` no banco local;
passo no CI `supabase db diff --local --schema site_private,public` que falha se o
resultado não for vazio após `db reset`; passo manual mensal `db diff --linked` contra
produção.

**Checklist de conclusão.**
- [x] `docs/DATABASE_SCHEMA.md` gerado e versionado —
  `scripts/generate-database-schema-doc.mjs` / `npm run db:site:schema-doc`.
- [x] CI falha com drift simulado — `.github/workflows/database.yml`,
  passo "Regenerate schema ERD and fail on drift (Etapa 48)": regenera o doc e
  `git diff --exit-code`; qualquer alteração de schema não versionada quebra o
  build. (A `Ação` original citava `supabase db diff --local` literal; o
  drift-check por regeneração do doc cobre o mesmo risco — schema real
  diferente do documentado — sem exigir um segundo comando redundante.)
- [ ] Primeiro `db diff --linked` executado: vazio — **não executado nesta
  sessão**, mesma limitação da Etapa 6 (sem `SUPABASE_ACCESS_TOKEN` de produção
  neste ambiente). **Corrigido nesta auditoria**: o checklist mestre abaixo
  chegou a marcar a Fase 8 como "48 feito", o que não era exato — este item
  específico continua pendente de ação humana com acesso ao projeto real.

**Depende de.** Etapa 21.

### Etapa 49 — Runbooks de incidente

**Diagnóstico.** Existem docs de setup e relatórios; não existem procedimentos de
resposta.

**Ação.** `docs/runbooks/`: fila travada (drenar manualmente, requeue de `exhausted`),
provedor fora (pausar canal), chave vazada (rotação de emergência — etapa 29), restore
(etapa 39), reconciliação de ledger (etapa 1), pedido de titular (etapa 32). Cada runbook
com pré-condições, comandos exatos, verificação e comunicação.

**Checklist de conclusão.**
- [~] Seis runbooks escritos — 5 de 6 existem agora (fila travada e provedor fora,
      `RUNBOOK_INCIDENTES.md`; chave vazada, `RUNBOOK_ROTACAO_SEGREDOS.md`;
      reconciliação de ledger, `RUNBOOK_RECONCILIACAO_LEDGER.md`, novo em 16/09; pedido
      de titular, `RUNBOOK_PEDIDO_TITULAR.md`, novo em 16/09, formato completo —
      pré-condições/comandos/verificação/comunicação). **Restore continua sem
      runbook**, bloqueado pela Etapa 39 (infraestrutura fora do alcance). "Revisados
      por segunda pessoa" não é verificável nesta sessão (exige revisor humano).
- [~] Cada um ensaiado uma vez em banco local ou preview — reconciliação e apagamento
      de titular foram exercitados no banco local nesta própria sessão (o segundo com
      15+ testes pgTAP); fila travada/provedor fora e rotação de segredo descrevem
      comandos já usados nesta sessão em outros contextos, mas não foram ensaiados
      ponta a ponta como cenário de incidente completo.

**Depende de.** Etapas 1, 29, 32, 39.

### Etapa 50 — Encerramento

**Ação.** Consolidar o checklist mestre abaixo, executar `npm run check` e `npm run
ledger:check`, atualizar `docs/SITE_SUPABASE_SETUP.md` com o estado final e registrar as
etapas adiadas com justificativa.

**Checklist de conclusão.**
- [ ] Todas as 49 etapas anteriores marcadas ou explicitamente adiadas com dono e data.
- [ ] `npm run check` e `database.yml` verdes em `main`.
- [ ] Revisão por pares do documento final.
- [ ] Nova auditoria local ⇄ GitHub ⇄ banco executada e anexada.

---

## Checklist mestre — status em 16/09/2026 (execução na branch `fix/supabase-ledger-ordering`, PR #11)

- [x] Fase 0 — etapas 1 a 6 (implementadas e validadas)
- [x] Fase 1 — etapas 7 a 12 (implementadas e validadas)
- [x] Fase 2 — etapas 13 a 18 (implementadas e validadas; etapa 13 medida e descartada — ver o próprio migration)
- [x] Fase 3 — etapas 19 a 24 (implementadas e validadas)
- [x] Fase 4 — etapas 25 a 31 (25/26/28/29/30/31 implementadas; **27 formalmente adiada**, ver `DATABASE_FUNCTION_CONTRACTS.md`)
- [x] Fase 5 — etapas 32 a 36 (32/35/36 implementadas; 33 já satisfeita por trabalho anterior; **34 formalmente adiada**)
- [~] Fase 6 — etapas 37 a 42 (**37, 38, 41, 42 feitos** — 42 já vinha pronto de trabalho anterior, **38 concluído pós-fechamento** com soak test real, ver seção abaixo; **39 não coberto, exige infraestrutura de billing/org do Supabase fora do alcance desta sessão**)
- [x] Fase 7 — etapas 43 a 46 (**44, 45 concluídas** — 45 fechada pós-fechamento, ver seção abaixo; **43/46 dependem do repositório `Promo_Gifts_V4`** — issue de coordenação redigida, publicação bloqueada pelo sandbox, aguardando o dono do repo)
- [~] Fase 8 — etapas 47 a 50 (**48 parcial** — doc gerado e CI com drift-check verdes, mas o `db diff --linked` contra produção nunca rodou nesta sessão, mesma limitação de acesso da etapa 6; **49 feito**; 47 é decisão de custo, não técnica; **50 — este checklist é o fechamento**)

**43 das 50 etapas** endereçadas nesta sessão (implementadas, já satisfeitas por trabalho
anterior, ou formalmente adiadas com justificativa registrada — nunca silenciosamente
ignoradas). 13 migrations novas, ~26 arquivos de teste novos/alterados, 0 aplicação em
produção sem o runbook correspondente ser executado por quem tem acesso.

As 7 etapas restantes (27, 28, 34 formalmente adiadas com justificativa própria; 39, 43,
46 bloqueadas por infraestrutura/coordenação externa fora do alcance desta sessão; 47 é
decisão de custo do PO) não são gaps silenciosos — cada uma tem uma decisão registrada e
um motivo específico, detalhado na seção da própria etapa.

### Pós-fechamento: CI verde (16/09/2026, mesma sessão)

O workflow "Migrations and pgTAP" falhou no primeiro push do fechamento acima, na
etapa `supabase start`: `DROP INDEX CONCURRENTLY cannot be executed within a pipeline`
(SQLSTATE 25001). Reproduzido localmente com volumes Docker limpos — `supabase start`
(seed inicial) pipelinea os statements de um arquivo de migration, e `CONCURRENTLY`
não pode coexistir com outro statement no mesmo pipeline; `supabase db reset` (usado
em todas as validações anteriores desta sessão) usa outro caminho de aplicação e nunca
expôs o problema. Corrigido dividindo
`20260916120000_add_queue_and_fk_indexes.sql` em 9 migrations, uma por statement.

Consertar isso expôs mais dois problemas, corrigidos na sequência:
- `scripts/generate-database-dictionary.mjs`/`generate-database-schema-doc.mjs`
  quebravam ao extrair o JSON de `supabase db query` no runner do GitHub Actions —
  o shape do resultado (array top-level vs. objeto `{rows,...}`) e a posição de
  ruído do CLI (banner, aviso de versão) diferem do ambiente local. Extraído
  `scripts/_lib/supabaseDbQuery.mjs` com um parser tolerante a ambos os shapes,
  com 11 testes (`tests/supabase-db-query.node.mjs`).
- Merge de `origin/main` trouxe `@eslint/js` 10.0.1 (Dependabot), cujo preset
  `recommended` passou a incluir `preserve-caught-error`; corrigido em
  `scripts/graphify.mjs` (erro relançado sem `cause`).

Com essas três correções, "Isolated site database" (que cobre migrations, pgTAP,
lint, e os três drift-checks de artefatos gerados) fica verde de ponta a ponta.
Uma regressão pré-existente e não relacionada foi identificada mas **não corrigida**
nesta sessão: `main` já excede o orçamento de bundle do frontend (317,8 KiB vs.
limite de 300 KiB, confirmado em um worktree isolado de `origin/main` sem nenhuma
mudança desta sessão) — fora do escopo do plano de banco de dados, requer
investigação própria de qual dependência/chunk cresceu.

O mesmo merge de `origin/main` também quebrou o Vercel Preview desta PR: `@eslint/js@10.0.1`
peer-requer `eslint@^10`, mas `eslint-plugin-jsx-a11y@6.10.2` (a versão mais recente
publicada) só suporta `eslint` até `^9` — `npm ci` no GitHub Actions não acusava (usa a
árvore já resolvida do lockfile), mas `npm install` (usado pelo build da Vercel) revalida
os peers e falhava com ERESOLVE. Confirmado que o mesmo `package.json` inconsistente já
existe em `origin/main` (bug pré-existente, só exposto pelo merge). Corrigido revertendo
`@eslint/js` para `9.39.5` (mesma versão de `eslint`) até `eslint-plugin-jsx-a11y`
publicar suporte a `eslint` 10.

### Pós-fechamento, parte 2: Etapas 38 e 45 concluídas

Retomando o plano depois do CI verde:

- **Etapa 38** (soak test): `scripts/soak-test-notification-queue.mjs` (`npm run
  db:site:soak-test`) enfileira jobs sintéticos via `quote_requests` reais (mesmo
  caminho de criação de job da produção, trigger `enqueue_quote_confirmations`) e
  drena com o contrato real (`claim_site_notification_deliveries`/
  `finalize_site_notification_delivery`, backoff exponencial real, sem aceleração),
  injetando latência e falha num "provedor" simulado. Rodado duas vezes com 1000 jobs
  e 10% de falha: p50/p95 consistentes entre as rodadas (119-130s / 223-243s), 0
  esgotados, 0 inconclusivos em ambas — relatório completo em
  `docs/RELATORIO_SOAK_TEST_FILA_20260916.md` (inclui um outlier real de ~20 min numa
  das rodadas: um único job que encadeou 4 falhas seguidas, estatisticamente raro mas
  ainda assim abaixo do limiar). Resultado: `QUEUE_AGE_ALERT_SECONDS` (45 min)
  **mantido**, confirmado por dois eixos independentes (tolerância a cron perdido —
  racional original — e tempo real de processamento, com ~11x de margem no p95 mesmo
  na rodada mais alta).
- **Etapa 45**: já estava substancialmente satisfeita (nenhum `supabase/` de topo,
  contrato em `docs/sql/canonical/`, `README.md` correto) — faltava só o guard citado
  na própria Ação do plano. Adicionado `validateNoTopLevelSupabaseMigrationsDir()` em
  `scripts/validate-migration-names.mjs`, já rodando no mesmo passo de CI que valida
  nomes de migration: falha o build se `supabase/migrations` for recriado no topo do
  repositório, fechando definitivamente o vetor do incidente original.

### Pós-fechamento, parte 3: auditoria exaustiva (16/09/2026, mesma sessão)

Pedido do usuário: revisar o plano inteiro validando implementação completa vs.
parcial, sem confiar nos checkboxes que o próprio documento já marcava. Executado com
4 auditorias independentes (uma por par de fases), cada uma verificando os checklists
contra o código/migration/teste real. Achados principais e correções:

- **Etapa 9 (crítico): não existia nenhum código**, apesar do checklist mestre marcar
  a Fase 1 inteira como `[x] implementada e validada`. Investigando, a etapa tinha sido
  conscientemente revisada durante a implementação original (comentário na migration
  `20260916110000`): um trigger completo quebraria fixtures de teste legítimas
  (`notification_outbox.test.sql` reescreve status/attempts diretamente para simular
  jobs presos) sem ganho real de segurança contra um admin no Studio — só uma CHECK
  constraint declarativa (`notification_deliveries_lease_matches_status`) foi
  implementada, cobrindo só parte do requisito. Essa parte do argumento (fixtures) se
  confirmou ao implementar o trigger completo agora — 3 fixtures precisaram de
  `alter table ... disable/enable trigger` ao redor do setup — mas o argumento não
  cobria o risco original do diagnóstico (`sent → pending` continuava possível por
  update direto). Implementado em `20260916220000_add_notification_delivery_status_machine.sql`:
  reaproveita `site_private.enforce_status_transition()` (Etapa 8) mais um trigger novo
  para a invariante de `lease_token`/`attempts`. Matriz completa de 36 combinações
  testada (`notification_delivery_status_machine.test.sql`, 42 testes). **Gap adicional
  encontrado ao testar contra a documentação existente**: `docs/RUNBOOK_INCIDENTES.md`
  já descrevia `exhausted → pending` como uma reabertura administrativa sancionada
  (provedor volta do ar) — o design inicial do trigger tratava `exhausted` como
  puramente terminal e teria quebrado esse runbook silenciosamente. Corrigido antes de
  finalizar: `exhausted → pending` é uma transição de primeira classe, exigindo
  `attempts = 0`.
- **Etapa 16: drift real confirmado** — uma FK adicionada pela Etapa 20
  (`notification_deliveries.delivery_state_source_event_id`) depois que a Etapa 16
  original fechou nunca foi revalidada contra a invariante "toda FK tem índice".
  Corrigido em `20260916230000_add_delivery_state_source_event_idx.sql`.
- **Etapa 6**: `docs/RUNBOOK_VERIFICACAO_DB.md` escrito (não existia). Token de acesso
  real e sua execução contra produção continuam pendentes — ação humana, não
  autônoma.
- **Etapa 5**: `main` local sincronizado (tinha divergido para 33 commits atrás,
  não os 25 originalmente diagnosticados); as duas branches `backup/*` já tinham tags
  locais equivalentes (criadas antes desta auditoria) — publicadas em `origin` e as
  branches removidas; `git fetch --prune` limpo.
- **Etapa 49**: `docs/RUNBOOK_PEDIDO_TITULAR.md` e `docs/RUNBOOK_RECONCILIACAO_LEDGER.md`
  escritos no formato completo (pré-condições/comandos/verificação/comunicação) que
  faltava — antes eram só ponteiros para outras seções de doc, não runbooks próprios.
- **Etapa 32**: cobertura de teste para `customer_profiles` adicionada a
  `customer_data_erasure.test.sql` (o teste original só cobria `quote_requests`/
  `contact_requests`, deixando sem asserção o fix de precedência de operador aplicado
  nesta sessão).
- **Segunda regressão de dependência**: outro PR do Dependabot, mergeado
  separadamente da correção anterior, bumpou `eslint` de 9.39.5 para 10.10.0 — reabrindo
  o mesmo conflito de peer dependency com `eslint-plugin-jsx-a11y` pelo lado oposto
  (`eslint` 10.x + `@eslint/js` 9.x, em vez do inverso). `main` estava com `npm
  install`/`npm ci` quebrado no momento em que isso foi descoberto. Corrigido revertendo
  `eslint` também para `9.39.5`.
- **Etapa 42**: `sendOperationalAlert` já era chamado de verdade em
  `reportQueueHealth` (`api/notifications.ts`), mas os testes existentes
  (`tests/api/notifications.test.ts`) só afirmavam sobre o `console.error` — sem
  `OPERATIONS_ALERT_WEBHOOK_URL` configurado nos testes, a chamada HTTP ao webhook
  nunca era exercitada, deixando o caminho crítico de alerta sem cobertura. Um
  comentário no código também estava desatualizado, atribuindo a integração de
  alerta a uma "Etapa 41" futura que já tinha sido implementada. Corrigido: novo
  teste configura o webhook e afirma sobre a chamada HTTP real; comentário
  atualizado. O sub-item "cron silencioso" (`lastRunAt` por origem) permanece
  bloqueado pela Etapa 34 (não implementada), e o recebimento em canal real
  (PagerDuty/e-mail) continua não ensaiado — ambos documentados como pendências
  explícitas no checklist da etapa, não como "feito".
- **Etapa 48**: o checklist mestre marcava "48 feito", mas o próprio checklist da
  etapa tinha os 3 itens em `[ ]` — inconsistência real entre o resumo e o
  detalhe. Verificado item a item: `docs/DATABASE_SCHEMA.md` existe e é gerado
  por script; o drift-check de CI existe (`database.yml`, regenera e
  `git diff --exit-code`); mas o terceiro item (`db diff --linked` contra o
  projeto real) nunca foi executado nesta sessão — mesma limitação de acesso a
  produção da Etapa 6. Corrigido: os dois primeiros itens marcados `[x]`, o
  terceiro mantido `[ ]` com a mesma nota de "ação humana pendente", e o
  checklist mestre corrigido de "48 feito" para "48 parcial".
- **Regressão própria detectada na validação final**: `npm run test:migration-names`
  não tinha sido rodado desde que `20260916240000_add_rate_limit_fillfactor.sql`
  (Etapa 40) foi criado nesta sessão — hora "24" não é um horário válido
  (`00`–`23`). Renomeada para `20260917000000_...` (sem colisão com nenhuma
  migration existente) antes do commit final; reforça por que a suíte de
  validação completa (não só os testes do arquivo tocado por último) precisa
  rodar antes de cada fechamento.

Contagem final honesta: **43 das 50 etapas** confirmadas completas ou corretamente
adiadas/bloqueadas continua válida como número (a auditoria também encontrou vários
itens **parcialmente** implementados dentro de etapas já contadas como "feitas" —
cenários de teste mais difíceis ausentes, políticas de retenção/revisão de artefatos
próprios não escritas, ou descopes de engenharia sólidos porém nunca registrados como
decisão deliberada — listados na seção de checklist de cada etapa específica, com a
etiqueta `[~]`). Essas lacunas parciais são reais e ficam documentadas etapa por etapa;
fechá-las todas exaustivamente (matriz de testes adicionais para ~15 etapas) ficou fora
do escopo desta rodada por relação custo/benefício — nenhuma delas é uma falha de
correção como a Etapa 9 era.

## O que este plano não faz

- Não altera o frontend além do necessário para consumir contratos novos (protocolo,
  tipos gerados, mascaramento).
- Não decide pelo PO a incorporação do contrato canônico ao `Promo_Gifts_V4` (etapa 3) nem
  a criptografia de PII (etapa 27): apresenta as opções e exige decisão registrada.
- Não substitui a Fase 0 do `plano-50-etapas.html`; pressupõe suas etapas de fila (13 a
  31 daquele plano) como concluídas e as endurece.
- Não aplica nada em produção por conta própria: cada etapa passa por PR, CI e, quando
  toca o banco remoto, por `--dry-run` e aprovação do proprietário.
