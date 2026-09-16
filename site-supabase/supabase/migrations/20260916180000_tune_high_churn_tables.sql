-- Etapas 30 e 40 do plano de correções
-- (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md). Migration aditiva, exclusiva
-- de xlzmclcjdncjfdrjxclt.
--
-- Etapa 30 (escopo revisado): o plano original previa duas camadas — Vercel
-- Firewall/rate limit na borda como primeira linha, e ajuste de armazenamento no banco
-- como segunda. A camada de borda é configuração do painel da Vercel (Firewall/Edge
-- Config), fora deste repositório e sem uma forma segura de eu configurar por aqui —
-- fica documentada como pendência explícita, não implementada silenciosamente. Esta
-- migration cobre só o lado do banco: rate_limit_buckets e
-- shared_selection_rate_limits guardam só hash + contador, sem PII, de vida curta
-- (purgados pela retenção diária) — perder uma linha num crash só reseta uma janela de
-- rate limit, é aceitável marcar UNLOGGED (sem WAL, sem réplica física, updates mais
-- baratos).
--
-- Etapa 40: notification_deliveries sofre vários updates por linha (claim, aceite do
-- provedor, finalização, webhook) — fillfactor menor deixa espaço para HOT updates
-- (não precisam tocar índices). autovacuum mais agressivo nas duas tabelas de alta
-- rotatividade evita acúmulo de tuplas mortas entre execuções do autovacuum padrão.

alter table site_private.rate_limit_buckets set unlogged;
alter table site_private.shared_selection_rate_limits set unlogged;

comment on table site_private.rate_limit_buckets is
  'Etapa 30: UNLOGGED de propósito — só hash + contador efêmero, purgado pela retenção diária. Perda em crash reseta uma janela de rate limit, não é um problema de integridade.';
comment on table site_private.shared_selection_rate_limits is
  'Etapa 30: UNLOGGED de propósito — mesmo racional de rate_limit_buckets.';

alter table site_private.rate_limit_buckets set (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.02
);
alter table site_private.shared_selection_rate_limits set (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.02
);
alter table site_private.notification_deliveries set (
  fillfactor = 80,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

comment on table site_private.notification_deliveries is
  'Auditoria de entregas futuras. WhatsApp exige consentimento específico antes da criação do registro. Etapa 40: fillfactor 80 deixa espaço para HOT updates nos vários updates por linha (claim, aceite, finalização, webhook); autovacuum mais agressivo que o padrão (20%) evita acúmulo de tuplas mortas.';
