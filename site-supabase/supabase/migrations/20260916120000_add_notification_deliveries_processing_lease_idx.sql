-- Etapa 14 do plano de correções
-- (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md). Migration aditiva,
-- exclusiva de xlzmclcjdncjfdrjxclt.
--
-- Recuperação de lease expirada (ramo raro).
--
-- Statement isolado em sua própria migration (e não agrupado com outras operações
-- CONCURRENTLY, ver 20260916120001 em diante): a seed inicial do `supabase start`
-- aplica os statements de um arquivo de migration em um pipeline libpq, e
-- `CREATE/DROP INDEX CONCURRENTLY` não pode ser executado dentro de um pipeline
-- (SQLSTATE 25001) quando coexiste com outro statement no mesmo arquivo — reproduzido
-- localmente com `supabase start` em volumes limpos (não acontecia com `db reset`,
-- que usa um caminho de aplicação diferente). Um statement `CONCURRENTLY` por
-- migration evita o problema independente do agrupamento interno do CLI.

create index concurrently if not exists notification_deliveries_processing_lease_idx
  on site_private.notification_deliveries (lease_expires_at)
  where status = 'processing';
