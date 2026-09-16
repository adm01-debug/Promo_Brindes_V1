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
--
-- Etapa 13 (vizinha, nenhum índice deste arquivo — nota restaurada em 16/09/2026
-- depois que a divisão acima apagou o comentário original): um índice liderado por
-- `channel` (`channel, next_attempt_at, created_at, id`) foi medido e descartado antes
-- desta migration existir. Com uma fixture de 120.000 linhas em distribuição de regime
-- permanente (99,6% sent, fração elegível pequena — um teste inicial de 22.500 linhas
-- majoritariamente 'pending' mascarava isso), o índice novo nunca foi escolhido pelo
-- planner: em produção o worker chama `claim_site_notification_deliveries` com os DOIS
-- canais de uma vez (`api/notifications.ts`, `configuredChannels()`), então
-- `channel = any(...)` praticamente não filtra nada — um índice liderado por essa
-- coluna não ganha seletividade. `notification_deliveries_pending_idx` (status,
-- created_at) combinado com `notification_deliveries_processing_lease_idx` (abaixo,
-- Etapa 14) já produz um Bitmap Or eficiente (~1ms mesmo com 120k linhas). Criar o
-- índice liderado por channel só acrescentaria custo de escrita sem ganho de
-- leitura — não incluído.

create index concurrently if not exists notification_deliveries_processing_lease_idx
  on site_private.notification_deliveries (lease_expires_at)
  where status = 'processing';
