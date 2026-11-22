# Runbook — revisão mensal do banco do site (Etapa 18)

Escopo: projeto isolado `xlzmclcjdncjfdrjxclt`. Frequência: mensal, ou após qualquer
migration que adicione/remova índice. Requer acesso autenticado ao projeto (CLI logado
ou MCP dedicado — ver `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md`, etapa 6).

## 1. Índices sem uso

Primeiro o panorama, para saber o tamanho do universo antes de olhar os zerados:

```sql
select count(*) as total,
  count(*) filter (where idx_scan = 0) as zerados,
  count(*) filter (where idx_scan > 0) as usados
from pg_stat_user_indexes
where schemaname = 'site_private';
```

Só os zerados, do maior para o menor, para não gastar o topo da lista com os mais usados:

```sql
select relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) as size
from pg_stat_user_indexes
where schemaname = 'site_private' and idx_scan = 0
order by pg_relation_size(indexrelid) desc;
```

**`idx_scan = 0` só significa "não usado" se houve tráfego no período.** Confirmar o
recorte antes de concluir qualquer coisa — colunas `stats_reset` é o limite do que os
contadores enxergam:

```sql
select datname, stats_reset from pg_stat_database where datname = current_database();
```

O `stats_reset` do banco **não** prova a idade de cada índice: ele só diz desde quando os
contadores são acumulados. Um índice criado depois do reset tem `idx_scan = 0` porque
nunca existiu durante boa parte da janela. Antes de usar `idx_scan = 0` como sinal,
comparar a data de criação do índice com a janela analisada:

```sql
select s.relname as tabela,
       s.indexrelname as indice,
       s.idx_scan,
       t.seq_scan + t.idx_scan as uso_da_tabela,
       t.n_tup_ins + t.n_tup_upd + t.n_tup_del as escritas,
       t.last_autovacuum
from pg_stat_user_indexes s
join pg_stat_user_tables t on t.relid = s.relid
where s.schemaname = 'site_private' and s.idx_scan = 0
order by uso_da_tabela desc;
```

`uso_da_tabela` e `escritas` mostram se a tabela teve movimento — índice zerado numa tabela
também parada não prova nada. Mas são **contadores acumulados**: não delimitam janela.

**Como delimitar a janela (as duas regras abaixo são obrigatórias):**

1. **Tráfego real, não só acumulado.** `n_tup_ins/n_tup_upd/n_tup_del` também contam o
   que os testes pgTAP inserem antes de dar rollback. Guardar uma medição por revisão e
   comparar com a anterior: a diferença é o tráfego do mês, não o total desde o reset.
2. **Idade do índice em produção.** A data do commit da migration **não** é a data de
   aplicação — a migration só passa a valer depois do `release.yml` rodar em produção.
   A referência confiável é `site_private.admin_ddl_log` (`command_tag`, `object_type`,
   `schema_name`, `occurred_at`), que registra o que o release aplicou e quando. Se o
   `admin_ddl_log` não tiver o registro do índice, tratar como "idade desconhecida" e
   **não remover** — aguardar uma janela completa de 30 dias medida dentro do runbook.

```sql
select occurred_at, command_tag, schema_name, object_type
from site_private.admin_ddl_log
order by occurred_at desc
limit 50;
```

Só é candidato a remoção o índice que (a) apareceu como aplicado no `admin_ddl_log`
há pelo menos 30 dias, (b) teve a tabela com tráfego medido entre duas revisões
consecutivas nesse período e (c) continua com `idx_scan = 0`. Antes de remover:

1. Confirmar que nenhuma query no código (`api/`, `site-supabase/supabase/migrations/`)
   depende do plano que esse índice sustenta — buscar pelo nome da tabela/colunas, não
   só pelo nome do índice.
2. Registrar a decisão (manter com justificativa, ou migration de remoção) neste
   documento, na seção "Histórico" abaixo.

Candidato conhecido desde a Fase 2 do plano de correções:
`quote_items_product_id_idx (source_product_id)` — sem consumidor identificado no
código do site à data de 16/09/2026. Reavaliar na primeira revisão com tráfego real
antes de remover.

## 2. Consultas mais custosas

Requer a extensão `pg_stat_statements` habilitada no projeto (confirmar antes de
depender dela; nem todo plano Supabase a expõe por padrão da mesma forma).

```sql
select query, calls, mean_exec_time, total_exec_time
from pg_stat_statements
where query ilike '%site_private%' or query ilike '%notification_deliveries%'
order by total_exec_time desc
limit 20;
```

Qualquer consulta nova no top 20 que não existia na revisão anterior merece um
`explain (analyze, buffers)` registrado aqui antes de decidir se precisa de índice.

## 3. Bloat e autovacuum

```sql
select relname, n_dead_tup, n_live_tup,
  round(100.0 * n_dead_tup / greatest(n_live_tup + n_dead_tup, 1), 1) as dead_pct,
  last_vacuum, last_autovacuum
from pg_stat_user_tables
where schemaname = 'site_private'
order by n_dead_tup desc;
```

`notification_deliveries` e `rate_limit_buckets` são as tabelas de maior rotatividade
(etapa 40 do plano de correções ajusta `autovacuum_vacuum_scale_factor` para elas).
`dead_pct` consistentemente acima de 20% nelas é sinal de que o ajuste não está
acompanhando o volume real — revisar os parâmetros antes de considerar um `VACUUM`
manual.

## 4. Saúde da fila

Chamar `public.site_notification_queue_health()` (service_role — a função é pública, não
`site_private`) e comparar `oldestEligibleAgeSeconds` com o SLA documentado (etapa 42 do
plano de correções).

A função filtra `request_kind = 'quote'` e `audience = 'customer'`; ela **não** cobre a
fila do time comercial. Para ver o quadro completo, medir direto na tabela:

```sql
select request_kind, audience, channel, status, count(*)
from site_private.notification_deliveries
group by 1, 2, 3, 4
order by 1, 2, 3, 4;
```

`eligibleCount = 0` na função significa "nenhum envio ao cliente elegível agora", não
"a fila inteira está vazia". Entrega `exhausted` de `audience = 'commercial_team'` não
aparece no retorno e precisa ser lida na consulta acima.

## Histórico

| Data | Achado | Decisão |
|---|---|---|
| 16/09/2026 | `quote_items_product_id_idx` sem `idx_scan` registrado (ambiente local, sem tráfego real) | Manter; reavaliar na primeira revisão com produção |
| 22/11/2026 | **Primeira execução real (F-90).** `pg_stat_statements` instalado e ativo (2.461 entradas), `stats_reset` em 15/07/2026. **Índices:** `site_private` tem 69 índices, dos quais **29 com `idx_scan = 0` e 40 com uso registrado** — o banco recebe tráfego, então `idx_scan = 0` aqui tem peso. Os mais usados são da fila: `notification_deliveries_pkey` (9.790), `admin_ddl_log_pkey` (129), `notification_deliveries_request_kind_request_id_channel_aud_key` (125) e `notification_deliveries_processing_lease_idx` (122). **Nenhuma consulta de runtime no top 10:** as 10 mais custosas por `total_exec_time` são DDL/DO block de migration (77,9 ms a 15,2 ms, 1 chamada cada), não queries do site — os índices são exercitados por volume, não por consulta caro. **Bloat:** `notification_deliveries` 80% (32 mortas / 8 vivas), `quote_requests` 80% (16 mortas / 4 vivas), `shared_selection_rate_limits` 100% (15/0) e `customer_profiles` 100% (12/0). Todas as tabelas estão em volume de dezenas de linhas — o percentual é alto e o volume é irrelevante. `last_vacuum` nulo em todas (só autovacuum atuou). **Fila:** `public.site_notification_queue_health()` (a função é pública, não `site_private`) devolve `eligibleCount = 0`, `exhaustedCount = 0`, `uncertainCount = 0` nos canais `email` e `whatsapp`. Essa leitura cobre **apenas `audience = 'customer'`**; o banco tem 4 entregas `status = 'exhausted'` de `request_kind = 'quote'` / `audience = 'commercial_team'` no canal `email`, que a função não conta. Registro correto: nenhum envio **ao cliente** estava elegível naquele momento, e a fila do **time comercial** tem 4 itens esgotados, não cobertos pela função de saúde. | Nenhum índice removido: a premissa de "30 dias de tráfego real" **não** é satisfeita — o banco tem tráfego, mas o `stats_reset` de 15/07/2026 é anterior ao lançamento e os 29 zerados podem simplesmente nunca ter casado com um filtro real. Nenhum `VACUUM` manual: o volume é de dezenas de linhas e o autovacuum já atuou em `notification_deliveries`. `quote_items_product_id_idx` mantido pelos mesmos motivos de 16/09. Reexecutar depois de 30 dias contínuos de tráfego real; aí `idx_scan = 0` significa algo. **Lembrete recorrente: não criado** (a etapa 18 pede um lembrete no sistema de tarefas do time, que o projeto não tem); a recorrência hoje depende deste documento e do checklist abaixo. |
| 22/11/2026 | Coluna duplicada `last_autovacuum, last_autovacuum` na consulta de bloat da seção 3 | Corrigida para `last_vacuum, last_autovacuum` nesta mesma data |
