# Revisão independente dos planos — 22/09/2026

> **Registro histórico.** Este parecer retrata a evidência observada em 22/09/2026;
> não descreve automaticamente o estado atual do produto. O diagnóstico reproduzível
> foi substituído por uma verificação de regressão em
> `docs/audits/plan-review-20260922/reproduce.mjs` após as correções posteriores.

## Parecer

**Não implementamos nem ativamos todas as melhorias.** O site tem uma base funcional
testada, mas o plano mistura implementação local, publicação, configuração de serviços,
decisões adiadas e aceite operacional. Os checkboxes não constituem evidência suficiente.

Esta revisão confronta o plano de 50 etapas de 17/09 com seus critérios herdados de
16/09, o plano de correções de 13/09 e o ledger de 230 referências dos planos UX,
Lukka, Graphify e Área do Cliente. Não soma esses planos como requisitos independentes:
há sobreposição significativa. As listas literais de 50 etapas de catálogos e de datas
comemorativas não foram recuperadas no repositório; seus módulos e os requisitos que
constam do ledger foram examinados, sem inventar os itens originais ausentes.

Escopo desta execução: **auditoria**, testes locais e consultas remotas de leitura.
Não houve correção de código de aplicação, merge, deploy, alteração de variável de
produção, aplicação/reparo de migration, envio de e-mail/WhatsApp ou alteração do
Promo Gifts. Foram criados somente este relatório e diagnósticos da auditoria.

## Referências e versões efetivamente verificadas

| Referência | Estado observado |
|---|---|
| Repositório do site | `adm01-debug/Promo_Brindes_V1` |
| Branch de trabalho | `fix/supabase-ledger-ordering` |
| Commit auditado | `7466b012380c10ecc62ba1cf72822f8f4ab12174` |
| GitHub `main` | `e3bfb4be142752b89c3c12c6d70a256e8e286bc4` |
| Publicação Production registrada no GitHub | `e3bfb4b`, deployment `6501390447`, estado `success`, de 17/09 |
| PR #14 | Aberto, head `7466b01`; o sucesso do preview não representa merge/produção |
| `main` local | 9 commits atrás de `origin/main`; a branch de trabalho já incorporou o `main` remoto |
| Supabase exclusivo do site | `xlzmclcjdncjfdrjxclt` |
| Migrations do site | 43 locais; 41 aplicadas; 2 pendentes; nenhuma versão remota órfã encontrada |
| Banco principal | `doufsxqlfjyuvxuezpln`, somente consultas de metadados explicitamente direcionadas |
| Graphify | CLI 0.9.48; mapa local reconstruído pelo wrapper: 1.483 nós / 2.916 relações |

O HEAD avançou de `15d441b` para `7466b01` durante o levantamento inicial, por merge
feito fora desta auditoria. Os testes foram executados depois desse avanço. Não foram
revertidas nem incorporadas alterações de terceiros por esta revisão.

> **Nota temporal:** as seções abaixo registram o estado observado no SHA auditado,
> antes da execução posterior. O fechamento atualizado desta rodada está no adendo
> ao fim do arquivo; o retrato histórico não foi reescrito.

Fontes remotas: [PR #14](https://github.com/adm01-debug/Promo_Brindes_V1/pull/14),
[Quality gate](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35721407804),
[banco local no CI](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35721407740),
[Graphify no CI](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35721407774).

## Achados prioritários

### A01 — Segurança do banco principal continua pendente — prioridade imediata

Consulta a `pg_catalog.pg_proc`, `pg_namespace` e `has_function_privilege`, em 22/09:

| Função | SECURITY DEFINER | anon EXECUTE | authenticated EXECUTE | Comparação com literal detectada |
|---|---|---|---|---|
| `mcp_kv_get` | sim | não | **sim** | sim |
| `mcp_kv_set` | sim | não | não | sim |
| `mcp_kv_try_lock` | sim | não | não | sim |

A consulta devolveu apenas nomes, privilégios e booleanos; não devolveu o literal,
não invocou as funções e não leu `mcp_kv`. Confirma a permanência do achado anterior,
não prova exploração ou comprometimento. A leitura completa de todas as funções
SECURITY DEFINER exigida pela etapa 39 continua sem evidência de conclusão.

**Aceite restante:** corrigir os grants e o mecanismo de segredo no projeto responsável,
coordenar a rotação das integrações afetadas e repetir a auditoria de privilégios.
O SQL em `docs/sql/canonical-principal/` é proposta, não prova de aplicação.

### A02 — Correções de retenção estão no PR, mas faltam no banco remoto — P1

`migration list --linked` e `db push --linked --dry-run` confirmaram pendentes:

- `20260920100000_cascade_notification_provider_events_on_delivery_delete.sql`;
- `20260920110000_set_null_delivery_state_source_event_on_delete.sql`.

O catálogo PostgreSQL remoto confirma ambas as FKs ainda sem a ação corretiva:

- `notification_provider_events.delivery_id → notification_deliveries.id`: sem `ON DELETE CASCADE`;
- `notification_deliveries.delivery_state_source_event_id → notification_provider_events.id`: sem `ON DELETE SET NULL`.

Portanto, o cenário de retenção que depende da primeira correção ainda pode falhar
em produção quando existir evento associado à entrega. A segunda corrige a referência
inversa. Os 349 testes pgTAP passam **no banco local já corrigido**; não certificam o
estado remoto antigo. O lint remoto passa mesmo com essas FKs: não detecta esse defeito
de regra de negócio.

**Aceite restante:** publicar as duas migrations pelo fluxo do site; repetir list/dry-run
e consultar as FKs remotas. Não requer novo token nesta sessão: o acesso atual funcionou.

### A03 — A versão corrigida ainda não está em produção — P1

O PR #14 contém, entre outras mudanças, lazy-loading da home, correção de ordenação na
saída da conta e os fixes de retenção. Production aponta ao commit de 17/09.
`Vercel = pass` no PR é o **preview**. Essa diferença invalida a afirmação de que todas
as correções locais já estão online.

**Aceite restante:** resolver os itens de publicação, mergear pelo fluxo aprovado,
confirmar o SHA de Production e refazer os smoke tests pertinentes. O `main` local
atrasado é higiene de workspace; por si só não significa corrupção do código remoto.

### A04 — Limpeza de sessão não elimina contexto de repetição — P1

Fontes: `src/lib/personalDataReset.ts:19`, `src/lib/quoteRepeat.ts:18` e
`src/pages/QuotePage.tsx:45`.

`clearPersonalQuoteStorage()` limpa o rascunho e a tentativa de envio, mas não remove
`promo-brindes:quote-repeat:v1`. Esse contexto contém `quoteId`, campanha e briefing
anterior. A página o restaura por `?repetir=...`, antes de qualquer validação de
titularidade desse dado local. Expira em 30 minutos, mas não é vinculado ao usuário.

**Reprodução:** salvar repetição sintética → executar a função real de limpeza → chamar
`loadQuoteRepeat` com o mesmo ID. O briefing continua disponível. A simulação usa os
módulos reais transpilados em memória, sem rede. Não foi realizado um teste com contas
reais de clientes.

**Aceite restante:** integrar repetição à limpeza e ao reset de estado; testar
logout/troca A→B, recarga e retorno pela URL de repetição. Os testes existentes de
rascunho não cobrem essa chave. Não confundir com apagar a seleção anônima de produtos,
que o contrato atual preserva deliberadamente.

### A05 — Telemetria de erros conserva identificador privado — P1

Fonte: `src/lib/clientObservability.ts:13`. O evento `frontend_error` envia
`window.location.pathname` como propriedade `route`. Em `/minha-conta/orcamentos/<id>`,
o identificador privado é enviado literalmente. `redactAnalyticsUrl` protege a URL
de pageview, mas não sanitiza essa propriedade criada separadamente.

**Reprodução:** função real executada com `track` interceptado e UUID sintético; a
propriedade contém o UUID completo. Nenhum evento foi enviado a um provedor.

**Aceite restante:** reutilizar uma normalização de rota para pageviews e eventos de
erro, com teste de ID privado e de URLs fora da allowlist. Não é necessário remover
a observabilidade; é necessário cumprir a minimização já prevista.

### A06 — O cutover `site_api` tem uma lacuna de Storage — P1

Fontes: migration `20260916160000_add_site_api_role.sql`,
`api/_lib/siteDatabase.ts:53`, `api/retention.ts:52` e
`docs/RUNBOOK_SITE_API_CUTOVER.md`.

A role está criada no remoto, com `BYPASSRLS` e os timeouts previstos. A API prefere
`SITE_SUPABASE_SERVICE_JWT` quando presente, ao contrário da afirmação desatualizada
do passo 3 do runbook. Porém, a mesma credencial é usada pela retenção para apagar
arquivos na API do Storage. `pg_catalog` remoto confirmou:

| Privilégio de `site_api` | Resultado |
|---|---|
| USAGE em `storage` | false |
| SELECT em `storage.objects` | false |
| DELETE em `storage.objects` | false |

**Simulação HTTP local:** JWT sintético dessa role acessa a saúde da fila com HTTP 200,
mas a leitura de `customer-proposals` recebe HTTP 400 com `AccessDenied` / status interno
403. A simulação foi somente leitura, não apagou arquivos. Os pgTAP de RPC e os testes
mockados de Storage não exercitam esse caminho HTTP completo.

O teste local aceitou tanto JWT nos dois headers quanto `apikey` separado do JWT;
**não foi demonstrada falha do header `apikey`**. A documentação distingue chave de
aplicação e JWT de autorização, que devem ser avaliados no cutover real:
[API keys](https://supabase.com/docs/guides/getting-started/api-keys) e
[JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys).

**Aceite restante:** definir acesso mínimo para a operação de Storage, validar
remoção autorizada e negação fora do bucket/escopo, depois ativar a variável e observar
um ciclo completo. Não basta trocar a variável de produção.

### A07 — Teste de “concorrência real” é serial — P1

Fonte: `tests/queue-concurrency.node.mjs:40-56`, com o mesmo padrão em `:102` e `:158`.
O executor de `new Promise(...)` chama `execFileSync`. Ao avaliar
`Promise.all([claim(), claim()])`, a primeira chamada termina antes da segunda começar.
São duas conexões, mas não simultâneas. A mensagem de teste e a conclusão da etapa
37/16-09 superestimam a evidência obtida.

**Reprodução isolada:** dois subprocessos de 100 ms, usando o mesmo padrão, apresentam
`second.start >= first.end`, sem sobreposição. Não foi necessário escrever no banco.

**Aceite restante:** usar I/O assíncrono/conexões persistentes, barreira que mantenha a
primeira transação aberta e prova da disputa, assertar cobertura dos 50 jobs e limpar
fixtures. Integrar ao job de banco, que já possui PostgreSQL local. Este achado é
sobre a validade do teste; não prova defeito no `SKIP LOCKED` implementado.

### A08 — Confirmações e alertas têm código, mas não ativação comprovada — P1

`vercel env ls production` mostrou `CRON_SECRET` e as variáveis de banco, mas não:

- `RESEND_API_KEY`, `SITE_EMAIL_FROM`, `RESEND_WEBHOOK_SECRET`;
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_QUOTE_TEMPLATE`,
  `WHATSAPP_GRAPH_API_VERSION`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`;
- `OPERATIONS_ALERT_WEBHOOK_URL`, `SITE_SUPABASE_SERVICE_JWT`.

Os nomes dos segredos de webhook correspondem aos handlers do repositório; o relatório
não contém valores. A ausência dos provedores faz `configuredChannels()` não habilitar
os envios nesse ambiente. Não há prova de recebimento real de confirmação por nenhum
canal. A consulta de saúde remota retornou zero elegíveis e zero esgotados nos dois
canais; isso não comprova que mensagens foram entregues.

E-mail continua sendo resumo com itens; WhatsApp transmite nome/protocolo/empresa ao
template. A fila automática tem público `customer`; o encaminhamento operacional ao
comercial e o SLA de atendimento continuam sem aceite completo.

**Aceite restante:** configurar remetente/domínio, canais e callbacks; validar aceite,
entrega, bounce, falha e recuperação com destinatários autorizados; definir resumo ou
cópia integral e provar que o especialista recebe/trata a solicitação.

### A09 — Backups existem; PITR e ensaio de restauração não estão concluídos — P1

`supabase backups list --project-ref xlzmclcjdncjfdrjxclt` retornou
`walg_enabled=true`, **`pitr_enabled=false`** e oito backups físicos `COMPLETED`, de
15/09 a 22/09. O mais recente foi criado em `2026-09-22T09:16:00.910Z`.

Não se deve afirmar “sem backup”; também não se deve afirmar “PITR confirmado”.
O runbook de restore previsto não existe e não há evidência de drill com RPO/RTO.
Habilitar serviço pago ou restaurar produção não fez parte da auditoria.

**Aceite restante:** decidir o RPO/RTO, adequar a infraestrutura e realizar restauração
em destino isolado, com procedimento e resultado documentados.

### A10 — Graphify local e CI não cobrem o mesmo corpus — P2

O Graphify foi usado para localizar módulos, seguido de leitura de código e testes.
Ele ajudou a revelar a diferença de cobertura, não serviu como certificador do banco.

- Local: 1.483 nós, 2.916 relações, `graph:check` aprovado; benchmark **9/10**, falha
  `GR40-03` (confirmações por e-mail/WhatsApp). Busca direta encontra a implementação.
- CI do mesmo PR: 1.250 nós, 2.749 relações e benchmark 10/10, mas o log registra
  **65 arquivos SQL que não contribuíram ao grafo porque falta `tree_sitter_sql`**.
- Na base do PR, o mesmo log registra 59 SQL ignorados. O workflow instala
  `graphifyy==0.9.48` sem o extra SQL.

O resultado verde do CI não prova mapeamento de migrations/RPCs. A causa exata da falha
de recuperação local não foi isolada; a diferença de corpus está comprovada, mas não
é apresentada como causa única do 9/10. O mapa é não direcionado por decisão registrada.

**Aceite restante:** alinhar parsers/ambientes, exigir cobertura SQL relevante e
estabilizar recuperação das dez perguntas sem reduzir o corpus para fazê-las passar.

### A11 — Existem testes/limiares que não são gates efetivos — P2

- Cobertura: `test:coverage` tem thresholds e passou manualmente. `npm run check` usa
  apenas `vitest run`; `.github/workflows/quality.yml:46` chama `check`, não cobertura.
  Portanto queda de cobertura, isoladamente, não bloqueia PR hoje.
- Planos SQL: `query_plans.test.sql` contém **um EXPLAIN de claim + duas pré-condições**;
  não as cinco consultas exigidas na etapa 17/16-09: claim, lease, webhook, histórico
  e retenção. Três asserts não equivalem a cinco planos protegidos.
- Tipos gerados: arquivo e gate de drift existem, mas não há importação de
  `site-database.types.ts` pela aplicação/API; `siteSupabase` continua sem
  `SupabaseClient<Database>`. O arquivo não impõe sozinho tipos às chamadas RPC.
- `Dependency review` falha: “Dependency graph” não habilitado. CodeQL, `npm audit`
  e os checks obrigatórios verdes não tornam esse controle funcional.
- `Supabase Preview` está **skipped**, não aprovado por execução de uma branch
  isolada. `supabase branches list` retornou somente `main`.

**Aceite restante:** transformar os critérios pretendidos em gates executados e
documentar honestamente controles opcionais, desativados ou limitados.

### A12 — Os registros de conclusão ainda contradizem o código — P2

Exemplos reconferidos:

1. Etapas 3/4 e `RUNBOOK_VERIFICACAO_DB.md` alegam ausência de acesso administrativo;
   nesta auditoria list, dry-run, lint, queries, backups e branches funcionaram no site.
2. Etapa 48 diz não existir convenção de matriz vigente; `GOVERNANCA_FECHAMENTO.md`
   já nomeia o ledger único e há `ledger:check` no CI. O problema real é conteúdo
   desatualizado e critérios não validados, não só ausência de `MATRIZ_INDEX.md`.
3. Plano de 13/09 diz `noUncheckedIndexedAccess` adiado; está ativo nos dois tsconfigs,
   e o typecheck passou. Não deve voltar a entrar como trabalho inexistente.
4. O resumo de 17/09 declara fase 3 “integralmente fechada” apesar da revisão mensal
   pendente; a etapa 6 é chamada “fechada” com revisão de changelog ainda em aberto.
5. `scripts/generate-database-schema-doc.mjs:74` afirma que `db reset` faz um
   `db diff` implicitamente. Reset reconstrói o banco local; não compara o remoto.
6. O plano infere falta de governança do banco principal a partir da ausência de
   migrations dele no repositório **do site**. O repositório protegido
   `Promo_Gifts_V4` contém 3.006 arquivos SQL em `supabase/migrations` e
   `docs/SCHEMA_REFERENCE.md` auditado em 16/09. Isso não comprova aplicação dessas
   3.006 versões, mas refuta “não existe artefato/SSOT”. Não se deve duplicar toda a
   governança do banco interno no site nem aplicar esses arquivos em lote.

**Aceite restante:** atualizar a fonte vigente por evidência e responsabilidade,
preservando snapshots históricos e distinguindo dado local, remoto e configuração.

## Matriz das 50 etapas do plano de 17/09

Legenda: **T** = entrega técnica no escopo indicado confirmada; **P** = parcial,
incluindo publicação/aceite faltante; **N** = entrega proposta não localizada/ativada;
**D** = alternativa ou adiamento de engenharia documentado, sem cumprimento literal.
T não certifica todo o produto e D não significa funcionalidade implementada.
Os critérios herdados que desapareceram do resumo novo continuam relevantes.

| # | Tema | Estado | Evidência atual e aceite restante |
|---|---|---|---|
| 1 | Bundle de entrada | P | Lazy home e orçamento passam local/CI; Production ainda no SHA anterior. Publicar e confirmar assets da versão nova. |
| 2 | Sincronização de branches | P | PR #13 já mergeado; branch atual incorpora `main`; `main` local ainda 9 commits atrás. Registrar procedimento, sem confundir branch de trabalho com `main`. |
| 3 | Ledger remoto | P | Acesso funcionou; 41/43 aplicadas, somente as duas FKs de 20/09 pendentes. Fechar aplicação e evidência remota. |
| 4 | Acesso administrativo | P | Acesso de CLI comprovado nesta rodada. Faltam atualização do runbook, dono, cofre/escopo e mapa operacional; não está bloqueado por ausência de token. |
| 5 | Contrato no SSOT | P | SQL espelho existe. Conciliação de ownership/versão com o repositório interno não demonstrada. Não criar segundo SSOT. |
| 6 | Dependências menores | P | Versões-alvo presentes e testes passam. Changelog/aceite documental e publicação do PR pendentes. |
| 7 | Avaliação ESLint 10 | N | ESLint 9.39.5; PRs automáticos não substituem matriz de compatibilidade/decisão. |
| 8 | Avaliação TypeScript 7 | N | TypeScript 5.9.3; não localizada avaliação isolada com erros e tempos comparáveis. |
| 9 | Gate npm audit | T | `quality.yml` executa audit; execução atual: zero vulnerabilidades. |
| 10 | Nomes de migrations | T | Validador, 11 testes Node e execução prévia ao banco no CI. |
| 11 | Sequência de eventos | T | Migration `20260916100000`, testes de estado/portal; versão aplicada remotamente. |
| 12 | Estados de orçamento | T | Trigger/tabela de transições e testes positivos/negativos, mesma migration. |
| 13 | Lease explícita | T | `20260916110000`, contratos de lease/backoff e pgTAP aprovados. |
| 14 | Backoff/jitter | P | Implementação SQL testada; contrato herdado ainda prevê `Retry-After` do provedor, não capturado pela API atual. |
| 15 | Política central da fila | T | `notification_policy()` e uso SQL presentes/testados; não equivale a SLA comercial homologado. |
| 16 | Índice do claim | D | Novo índice liderado por canal foi medido e descartado; justificativa no cabeçalho de `20260916120000`. Não contar como criação do índice originalmente pedido. |
| 17 | Índice de lease | T | Índice parcial em `lease_expires_at`, migration aplicada e presença coberta pelos contratos locais. |
| 18 | Planos de execução | P | Um EXPLAIN + duas pré-condições. Faltam quatro consultas do aceite herdado, ver A11. |
| 19 | Revisão mensal | P | Runbook existe; único registro localizado é local, de 16/09. Falta ciclo real de produção e responsável/recorrência. |
| 20 | Tuning/autovacuum | P | Reloptions e fillfactor implementados/testados. Observação semanal com tráfego real, exigida pelo plano anterior, não comprovada. |
| 21 | Protocolo persistido | T | Coluna/geração/uniqueness e contratos `quote_protocol.test.sql` aprovados; migration aplicada. |
| 22 | Precedência de webhooks | T | `20260916140000` + testes de eventos; entrega real de provedores permanece em A08. |
| 23 | Tipos gerados | P | Geração e drift no CI concluídos; adoção no cliente/RPC não localizada. Ver A11. |
| 24 | Versionamento de RPC | T | Convenção documentada e higiene de catálogo testada; não há obrigação de criar v2 sem mudança incompatível. |
| 25 | Role `site_api` | P | Role/grants SQL presentes; variável ausente em Production; lacuna de Storage reproduzida, A06. |
| 26 | FORCE RLS | T | pgTAP aprovado; `pg_catalog` remoto confirmou as 16 tabelas com RLS e FORCE RLS. |
| 27 | PII/criptografia | D | Adiamento fundamentado em `DATABASE_FUNCTION_CONTRACTS.md`; criptografia de coluna não entregue. |
| 28 | Token compartilhado | D | Risco do UUID público aceito; token administrativo hasheado. Não afirmar que todos os tokens estão hasheados. |
| 29 | Rotação/tempo constante | P | Dois testes de comparação aprovados; não localizada agenda de rotação/primeira execução controlada. |
| 30 | Retaguarda pg_cron | D | Adiada com pré-condições; nenhum heartbeat independente foi implementado. |
| 31 | Retenção/dicionário | P | Correções locais testadas; faltam duas migrations remotas, comentários específicos e política de logs. Não é apenas documentação, A02. |
| 32 | Auditoria administrativa | P | Logs de escrita/DDL implementados e testados; retenção/revisão operacional pendentes. Não representa auditoria de SELECT. |
| 33 | Backup/PITR/restore | P | Oito backups completos; PITR false; falta drill/runbook/RPO/RTO. Acesso de leitura disponível. |
| 34 | Timeouts por role | T | `8s/2s/10s` confirmados no remoto e pgTAP local aprovado. |
| 35 | Saúde e alertas | P | Consulta e webhook implementados; URL ausente em Production; heartbeat/cron silencioso e ensaio real faltantes. |
| 36 | Fase B do catálogo | N | Revogação/reestruturação da origem legada não comprovada. Mudança pertence ao SSOT e precisa inventário de consumidores. |
| 37 | Contrato cross-projeto | N | Não localizado workflow que valide periodicamente o contrato remoto mínimo. Tests com mocks não substituem esse aceite. |
| 38 | Branching por PR | N | Só branch Supabase `main`; preview skipped. Falta decisão de custo e execução real de PR sintético. |
| 39 | SECURITY DEFINER principal | P | Amostra/inventário e SQL proposto existem; risco de `mcp_kv_get` revalidado em 22/09. Auditoria completa/correção pendentes. |
| 40 | GraphQL principal | P | Proposta existe; `pg_graphql` 1.5.11 permanece instalado. Exige decisão por consumidores, não remoção cega. |
| 41 | FKs do módulo de kits interno | P | SQL proposto existe; não foi validada aplicação dos índices nesta rodada. Ausência de recibo de aplicação não prova ausência dos índices. |
| 42 | Políticas system_settings | P | Remoto ainda possui duas policies; equivalência e aplicação da proposta não certificadas. Quantidade, sozinha, não comprova defeito. |
| 43 | Inventário principal | P | Inventário resumido no site; fonte detalhada já existe no Promo Gifts. Falta reconciliar os documentos e ownership, não iniciar schema do zero. |
| 44 | Advisor principal no CI | N | Workflow periódico pretendido não existe no site. Coordenar com CI do repositório responsável antes de replicar controles. |
| 45 | Runbook principal | T | Documento de procedimento/escalonamento presente; não autoriza DDL no sistema interno. |
| 46 | B01–B07 e logout | P | Cenários corrigidos passam nos quatro projetos Playwright; fix recente ainda no PR. Novo gap de repetição impede afirmar encerramento geral de privacidade. |
| 47 | Continuidade e métricas | P | Carrinho local/eventos existem. Faltam campanhas versionadas, sincronização entre dispositivos, conflito e recepção operacional de métricas. |
| 48 | Matriz vigente | P | Convenção e validador já existem. Conteúdo segue obsoleto; não resolver apenas criando outro índice de documentos. |
| 49 | Runbooks/drills | P | Procedimentos parciais existentes; restore, revisão por pares e ensaios completos não comprovados. |
| 50 | Encerramento/release | P | PR aberto; Production anterior; Dependency review falha; novas lacunas impedem certificado 10/10. |

Contagem deste critério: **13 T, 27 P, 6 N e 4 D**. Isso é classificação das etapas,
não percentual de produto pronto. A classificação é mais restritiva que a do resumo
antigo por considerar ativação, aceites herdados e evidências descobertas nesta rodada.

## Planos anteriores: entregas que não podem desaparecer do backlog

O ledger vigente tem 230 IDs únicos e todas as fontes nele citadas existem. Sua
distribuição **registrada**, anterior a esta revisão, é:

| Plano | I | P | N | E | Total |
|---|---:|---:|---:|---:|---:|
| UX | 41 | 50 | 5 | 4 | 100 |
| Lukka | 12 | 26 | 5 | 7 | 50 |
| Graphify | 24 | 26 | 0 | 0 | 50 |
| Área do Cliente | 23 | 7 | 0 | 0 | 30 |
| Total registrado | 100 | 109 | 10 | 11 | 230 |

Esses números são o estado do CSV, **não uma reaprovação de 100 entregas nesta sessão**.
`ledger:check` valida IDs/estados/campos, não executa os critérios das 230 linhas.
Exemplos de textos obsoletos: ainda descreve webhooks como inexistentes, cron diário,
15 migrations, 118 pgTAP e R08 original sem correção; o código atual contradiz isso.
GR40 está marcado I, mas o benchmark local falhou nesta rodada. Reescrever os estados
automaticamente a partir de presença de arquivos repetiria o erro anterior.

### Dez referências ausentes, agrupadas em nove entregas

| IDs | Entrega ainda ausente | Evidência/limite do que já existe | Aceite necessário |
|---|---|---|---|
| UX34 | Dataset julgado de relevância | Dicionário/testes de sinônimos existem; julgamentos comerciais não localizados | Consultas reais, resultado esperado, avaliação repetível e responsável |
| UX59 | Seleções por conta entre dispositivos | `QuoteCartContext` usa localStorage e evento storage do navegador | Persistência por titular, consentimento, merge e teste de dois dispositivos |
| UX60 | Várias campanhas/conflitos | Uma seleção ativa com título; substituição local sem versões | Criar, arquivar/restaurar, resolver concorrência e evitar perda silenciosa |
| UX65 / LK43 | Upload privado de logo/referências | Campo `brandAssetStatus` não é upload; bucket de propostas é outro fluxo | Validar tipo/tamanho, autorização, vínculo ao pedido e remoção/retencão |
| UX84 | Catálogos PDF/revista operacionais | Dez coleções `online`; suporte de label a `pdf/digital` sem acervo publicado | Arquivos autorizados, edição, revisão, validade e links verificados |
| LK10 | Categorias fotográficas | Entradas iconográficas presentes | Fotos autorizadas, fallback, correspondência com categoria e performance |
| LK27 | Modelos de kits compostos | Flag/badge de kit identifica SKU, não estrutura de componentes | Modelos de composição com itens reais e opções substituíveis |
| LK28 | Configurador de kits | Seleção individual/grupos de decisão não compõem kits | Trocar componentes e preservar consistência do conjunto |
| LK29 | Aritmética de kits | Quantidades por SKU, sem multiplicador de composição | Ex.: 100 kits × 2 cadernos = 200, com mínimos/múltiplos reais |

### Funcionalidades presentes, com aceite parcial

| Área / IDs | Confirmado | Falta para o aceite completo |
|---|---|---|
| Home/marca — UX21/23/24, LK06/09/17 | Frases, Fold Text, vitrines e catálogo real; E2E de manifesto passa | Hierarquia/curadoria validadas com compradores, acervo autorizado e diversidade por campanha |
| Busca — UX31/32/35/40, LK20 | Briefing, sinônimos, sugestões, filtros/URL e testes | Dataset julgado, pertinência/diversidade e critérios comerciais de ranking |
| Produto — UX41/43/47/49, LK22/23/25 | Um badge por card, mínimos, galeria, relacionados/FAQ; produto sem estoque pode ser selecionado | Revisão por família, múltiplos e áreas/técnicas comprovadas, relacionados por intenção |
| Compartilhamento — UX54/55/57/58, LK37/38 | Links persistentes/revogação, limites e testes de hidratação | Ciclo real no deployment, PDF extenso e semântica de título/grupo/composição; payload hoje só ID/quantidade/variante |
| Briefing — UX06/07/64/67/79/80, LK42 | Validação/idempotência e reset original cobertos | A04/A05, anexos e comprovação de encaminhamento comercial |
| Confirmações — UX68/69, LK45 | Outbox, lease, recuperação, webhooks assinados e precedência | A08; recuperação de incerteza com provedor real, conteúdo pactuado e recebimento controlado |
| Atendimento — UX70/75/77 | Histórico, timeline e pedido de ajuste | Responsável/SLA, notificação do comercial e ciclo pedido → proposta → ajuste com operação real |
| Conta — AC04/06/07/10/24/29/30, UX73/76 | Login/recuperação/propostas versionadas, proteção e E2E | Recepção real de e-mail de Auth, refresh/troca A→B, A04 e publicação/download controlado de PDF |
| Catálogos — UX83/84, LK14/15/36 | Biblioteca de dez coleções online com busca e filtros | Acervo PDF/revista, dono editorial, revisão/validade e curadoria distinta |
| Datas — UX86/88/89 | Lista/calendário, filtros, favoritos locais e ICS | Importação/reimportação em calendários reais, revisão de datas/viabilidade e continuidade por conta |
| Marketing — UX26/28/30, LK03/31–35/39/40 | Conteúdo de processo/redes/contato existe | Cases/fotos autorizados, titularidade/canais/horários e comprovação das capacidades anunciadas |
| Métricas/SEO — UX92/93/97, LK47–49 | Eventos tipados, metadados, URLs públicas e 404; Speed Insights incluído | A05, recepção/deduplicação efetiva, CWV de campo e previews específicos por coleção/data |
| Qualidade — UX94/95/98/99, LK46/50 | Suítes automáticas, axe, pgTAP e orçamento passam | Leitor de tela, dispositivos físicos, restore, concorrência efetiva e gates do A11 |
| Graphify — GR03/08/18/21/31–37/40/43–50 | Wrapper, mapa, comparação base/head e oito testes de ferramenta | A10, comandos path/explain do wrapper, documentação semântica, rastreio requisito→deploy, falhas/recuperação e precisão |

As onze referências externas (UX20/26/28/91 e LK02/03/31/32/33/34/40) continuam
dependendo de pesquisa, material autorizado ou confirmação comercial. Uma auditoria
automatizada não substitui esses aceites.

### Aceites herdados especificamente reabertos ou esclarecidos

- **13/09 etapa 5:** `noUncheckedIndexedAccess` já existe nos dois projetos. Documento
  antigo precisa ser corrigido; não há trabalho de ativação a repetir.
- **13/09 etapa 8:** limiares de cobertura funcionam manualmente, mas não no CI padrão.
- **13/09 etapas 9–13:** reset original passou; repetição introduz lacuna não coberta.
- **13/09 etapa 19:** WhatsApp não tem exactly-once comprovado na janela em que o
  provedor aceita e a persistência do aceite falha. Há mitigação, não garantia absoluta.
- **13/09 etapas 27/31:** frequência de 15 minutos e linguagem de confirmação são
  decisões técnicas provisórias; SLA e conteúdo integral não homologados.
- **13/09 etapa 42:** telemetria existe, mas a minimização de rota não está completa.
- **13/09 etapas 45/46:** Dependency review falha e Supabase Preview está skipped.
- **13/09 etapa 47:** axe/teclado automatizados não fecham o roteiro assistivo/manual.
- **13/09 etapa 48:** `CatalogPage` foi reduzida a 87 linhas; home (334), datas (358)
  e orçamento (348) ainda ultrapassam o limite literal de 300. O hook extraído é
  excluído da cobertura de lógica pura e depende de E2E, sem teste isolado. Rever o
  valor do critério antes de refatorar apenas para reduzir linhas.
- **16/09 etapa 24:** normalização canônica está entregue para e-mail; telefone não
  foi normalizado de forma equivalente SQL/TypeScript.
- **16/09 etapa 32:** apagamento retorna caminhos para limpeza manual de Storage;
  não grava o evento `erased` previsto. Runbook e recibo não são orquestração completa.
- **16/09 etapa 37:** reabrir o aceite de concorrência real, A07.
- **16/09 etapa 38:** soak usa provedor simulado e polling de 3 segundos, sem reproduzir
  o ciclo Vercel de 15 minutos/25 segundos por invocação. É evidência útil de banco,
  não medição do SLA real do cliente. Não foi repetido nesta auditoria.
- **16/09 etapa 48:** reconstrução local/dicionário gerado não certificam drift remoto;
  as duas FKs diferentes demonstram a distinção nesta rodada.

## Validações executadas nesta revisão

| Verificação | Resultado | Limite |
|---|---|---|
| `npm run check` | aprovado | Lint, TS, Vitest, testes Node de contratos, build/budget e Chromium |
| Vitest | 41 arquivos / 241 testes aprovados | Transportes de API simulados |
| Testes Node no check | 33 aprovados | 11 migrations + 6 catálogo de erros + 3 JWT + 2 segredo + 11 parsing SQL |
| Chromium desktop/mobile | 80 aprovados / 4 skips | Fixtures e respostas controladas |
| Firefox/WebKit | 74 aprovados / 10 skips | Projetos desktop; não dispositivos físicos |
| Cobertura | thresholds aprovados | 46,28% statements / 50,95% lines no agregado Vitest; páginas têm cobertura E2E separada, não somada |
| pgTAP local | 17 arquivos / 349 testes aprovados | Banco local já contém as duas correções pendentes remotamente |
| Lint SQL local e remoto | zero achados, `--fail-on warning` | Lint não prova regra de negócio nem substitui Security Advisor |
| `npm audit --audit-level=high` | zero vulnerabilidades | Snapshot das dependências, não auditoria completa da aplicação |
| Budget | CSS 157,5 KiB / 24,5 Brotli; JS 864,7 / 244,3; entrada 276,2 / 75,0 | Build local de teste; não CWV de campo |
| Graphify guardas | 8 testes aprovados; mapa atual | Benchmark real separado falhou em 1/10 localmente |
| Ledger | 230 referências, IDs únicos, fontes existentes | Validação estrutural, não cumprimento dos aceites |
| Produção HTTP | 11 rotas conhecidas com 200; rota inexistente com 404 | Não houve envio de formulários nem uso de contas reais |
| Fila remota | 0 elegíveis / 0 esgotados por canal | Sem comprovação de recebimento real |
| FORCE RLS remoto | 16/16 tabelas de `site_private` | Roles BYPASSRLS continuam fora da proteção de policies |
| Backups/branches | 8 backups; PITR false; apenas main | Nenhum restore nem branch paga criada |
| Diagnósticos A04/A05/A07 | três lacunas reproduzidas | Simulações locais sem rede/DB; exit 0 significa defeito confirmado |

As rotas HTTP verificadas foram `/`, `/catalogo`, `/catalogos`,
`/datas-comemorativas`, `/sobre`, `/contato`, `/privacidade`, `/entrar`, `/minha-conta`,
`/orcamento` e `/sitemap.xml`. Login/conta/orçamento devolveram `noindex`.
200 indica disponibilidade da resposta; não certifica todo o fluxo daquela página.

CI do PR #14 no head auditado: `validate`, `cross-browser`, `Migrations and pgTAP`,
Graphify e CodeQL aprovados; Vercel Preview aprovado; **Dependency review falhou**;
**Supabase Preview skipped**. Os checks de IA que registram “skipped/manual review”
não foram contados como revisão humana realizada.

## Ordem proposta para fechar as pendências

1. Tratar A01 no SSOT do banco principal com o responsável; manter o site fora de DDL
   do sistema interno.
2. Corrigir os dois gaps de privacidade A04/A05 e adicionar regressões específicas.
3. Publicar as duas correções de retenção e o código pendente, validando o SHA e o
   catálogo remoto depois da publicação.
4. Fechar o contrato HTTP/Storage de `site_api` antes do cutover.
5. Corrigir o teste de concorrência, ampliar planos SQL e tornar cobertura um gate.
6. Alinhar o corpus Graphify local/CI e habilitar a revisão de dependências de fato.
7. Configurar/ensaiar provedores e alertas; homologar conteúdo, SLA e fluxo comercial.
8. Definir RPO/RTO e executar restore isolado; observar cron/retencão com tráfego real.
9. Implementar os nove blocos de produto ainda ausentes, com aceites de negócio onde
   necessário, sem apagá-los ao criar outro plano de infraestrutura.
10. Atualizar a matriz vigente com provas de código, teste, publicação e operação;
    somente então avaliar encerramento e release.

Não há base para declarar 10/10. Há base para uma lista verificável de fechamento,
com prioridade e critérios claros, preservando as entregas que já funcionam.

## Adendo de execução — 22/09/2026, após a auditoria

Esta seção atualiza somente os itens comprovados nesta rodada. O relatório acima
continua sendo o retrato do SHA `7466b01`, não um estado corrente reclassificado
automaticamente.

- PR [#14](https://github.com/adm01-debug/Promo_Brindes_V1/pull/14) mesclado em
  `57dbfda`: A04/A05 corrigidos com testes de privacidade; A07 substituído por disputa
  real de duas sessões PostgreSQL e a migration de `SKIP LOCKED`; `Retry-After` aplicado
  à fila; A10 corrigido com parser SQL no Graphify e benchmark 10/10; gate de cobertura
  e Dependency Review aprovados. A06 ganhou separação de credencial para retenção em
  Storage, mas o cutover mínimo `site_api` **não** foi declarado completo.
- As migrations `20260920100000`, `20260920110000` e `20260922120000` foram aplicadas
  automaticamente pela integração GitHub do **Supabase isolado do site**. Verificação
  posterior: 44 versões locais/remotas, zero pendentes, zero remotas órfãs; dump de
  schema remoto confirmou `ON DELETE CASCADE`, `ON DELETE SET NULL` e os dois
  `FOR UPDATE SKIP LOCKED` na função de claim. O banco principal ficou intocado.
- Dependabot e merges administrativos subsequentes introduziram ESLint 10,
  `@eslint/js` 10 e TypeScript 7 sem suporte nos peers atuais, fazendo `npm ci` falhar.
  PR [#21](https://github.com/adm01-debug/Promo_Brindes_V1/pull/21) mesclado em
  `b211c2b` restaurou versões compatíveis sem ignorar peers. A11/etapa 17 ganhou
  cinco `EXPLAIN (FORMAT JSON)` não vacuosos (claim, lease, webhook, histórico e
  retenção), com 357 pgTAP aprovados. Corrigida também a afirmação falsa de que
  `db reset` faz `db diff` remoto.
- `npm ci`, `npm run check` (247 Vitest, 80 Chromium, 4 skips), cobertura,
  `db:site:test` (357 pgTAP), Firefox/WebKit (74 passes, 10 skips), Graphify 10/10,
  Vercel Preview e Supabase Preview passaram. GitHub Production/Vercel confirmaram
  `b211c2b` em estado `success`; 11 rotas públicas deram 200 e uma inexistente 404.
  O `main` local foi atualizado para o mesmo SHA.

**Ainda não concluído:** A01 pertence ao banco principal protegido e exige autorização
específica; A06 exige ensaio real de privilégio mínimo/Storage antes de ativar
`SITE_SUPABASE_SERVICE_JWT`; A08 depende de domínio/remetente e credenciais de
Resend/WhatsApp ainda ausentes na Vercel e de aceite operacional; A09 depende de
decisão de RPO/RTO/custo e drill de restauração; a revisão manual assistiva,
curadoria/licenças de PDFs e fotografias, kits configuráveis e continuidade
multidispositivo permanecem sem aceite. A proteção de `main` ainda não impõe checks
a administradores (`enforce_admins=false`); alteração consultada ao proprietário,
não aplicada sem a escolha. Este adendo **não** declara 10/10.

## Reprodução e evidências

- [Diagnósticos locais A04/A05/A07](audits/plan-review-20260922/reproduce.mjs).
- [Snapshot estruturado desta auditoria](audits/plan-review-20260922/evidence.json).
- [Plano principal auditado](PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md).
- [Critérios herdados de banco](PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md).
- [Critérios herdados de aplicação](PLANO_CORRECOES_50_ETAPAS_20260913.md).
- [Ledger de 230 referências](MATRIZ_FECHAMENTO_PLANOS_20260912.csv).

Os planos e o ledger históricos foram preservados. Este relatório é a revisão de
22/09 para o SHA indicado; não altera silenciosamente o status de produção.
