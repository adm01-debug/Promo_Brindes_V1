-- Etapa 41 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md).
-- Migration aditiva, exclusiva de xlzmclcjdncjfdrjxclt.
--
-- Sem statement_timeout/lock_timeout no lado do banco, uma consulta presa segura a
-- função da Vercel até o maxDuration declarado em vercel.json (30s nas rotas que usam
-- site_api) e mantém locks o tempo todo. Os valores abaixo ficam abaixo do
-- REQUEST_TIMEOUT_MS do cliente (api/_lib/siteDatabase.ts, 10s) para o banco desistir
-- primeiro — o cliente então recebe um erro do Postgres em vez de só estourar o próprio
-- AbortController sem explicação.

alter role site_api set statement_timeout = '8s';
alter role site_api set lock_timeout = '2s';
alter role site_api set idle_in_transaction_session_timeout = '10s';

comment on role site_api is
  'Etapa 25: role de privilégio mínimo para api/_lib/siteDatabase.ts. Só EXECUTE nas 13 RPCs de serviço e os grants de tabela/sequência estritamente necessários para elas (SECURITY INVOKER). Etapa 41: statement/lock/idle-in-transaction timeouts abaixo do REQUEST_TIMEOUT_MS do cliente (10s), para o banco desistir antes do cliente estourar o próprio AbortController sem explicação.';
