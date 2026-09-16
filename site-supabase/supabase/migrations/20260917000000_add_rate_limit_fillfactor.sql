-- Etapa 40 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md):
-- auditoria em 16/09/2026 encontrou um desvio não documentado — a migration original
-- (20260916180000_tune_high_churn_tables.sql) aplicou `fillfactor = 80` só em
-- notification_deliveries, deixando rate_limit_buckets e
-- shared_selection_rate_limits de fora sem explicação. Confirmado lendo
-- site_private.consume_rate_limit e a inserção de shared_selection_rate_limits: as
-- duas tabelas usam `insert ... on conflict do update` — a MESMA linha (por
-- identifier_hash) é atualizada a cada requisição dentro da janela de rate limit,
-- exatamente o padrão de update repetido na mesma linha que justificou o fillfactor
-- menor em notification_deliveries.

alter table site_private.rate_limit_buckets set (fillfactor = 80);
alter table site_private.shared_selection_rate_limits set (fillfactor = 80);
