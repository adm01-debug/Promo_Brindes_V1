# Runbook — revisão mensal do banco do site (Etapa 18)

Escopo: projeto isolado `xlzmclcjdncjfdrjxclt`. Frequência: mensal, ou após qualquer
migration que adicione/remova índice. Requer acesso autenticado ao projeto (CLI logado
ou MCP dedicado — ver `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md`, etapa 6).

## 1. Índices sem uso

```sql
select schemaname, relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) as size
from pg_stat_user_indexes
where schemaname = 'site_private'
order by idx_scan asc, pg_relation_size(indexrelid) desc;
```

Um índice com `idx_scan = 0` depois de pelo menos 30 dias de tráfego real é candidato a
remoção. Antes de remover:

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

Chamar `site_notification_queue_health()` (service_role) e comparar
`oldestEligibleAgeSeconds` com o SLA documentado (etapa 42 do plano de correções).

## Histórico

| Data | Achado | Decisão |
|---|---|---|
| 16/09/2026 | `quote_items_product_id_idx` sem `idx_scan` registrado (ambiente local, sem tráfego real) | Manter; reavaliar na primeira revisão com produção |
| 22/11/2026 | **Primeira execução real (F-90).** `pg_stat_statements` instalado e ativo (2.461 entradas), `stats_reset` em 15/07/2026. **Nenhum índice com uso real:** os 15 primeiros em `pg_stat_user_indexes` têm `idx_scan = 0` e 16 kB cada — o banco não recebe tráfego de produção (só migrations e fixtures), então `idx_scan = 0` aqui não prova índice inútil. **Nenhuma consulta de runtime no top 10:** as 10 mais custosas por `total_exec_time` são DDL/DO block de migration (77,9 ms a 15,2 ms, 1 chamada cada), não queries do site. **Bloat:** `notification_deliveries` 80% de tuplas mortas (32 mortas / 8 vivas, último autovacuum 11/11), `quote_requests` 80% (16/0), `shared_selection_rate_limits` e `customer_profiles` 100% (0 vivas). Todas as tabelas estão em volume de dezenas de linhas — o percentual é alto e o volume é irrelevante. `last_vacuum` nulo em todas (só autovacuum atuou). **Fila:** `site_notification_queue_health()` devolve `eligibleCount = 0`, `exhaustedCount = 0`, `uncertainCount = 0` nos canais `email` e `whatsapp` — fila vazia, sem atraso de SLA. | Nenhum índice removido: a premissa de "30 dias de tráfego real" não é satisfeita. Nenhum `VACUUM` manual: o volume é de dezenas de linhas e o autovacuum já atuou em `notification_deliveries`. `quote_items_product_id_idx` mantido pelos mesmos motivos de 16/09. Reexecutar quando houver tráfego real; aí sim `idx_scan = 0` significa algo. |
| 22/11/2026 | Coluna duplicada `last_autovacuum, last_autovacuum` na consulta de bloat da seção 3 | Corrigida para `last_vacuum, last_autovacuum` nesta mesma data |
