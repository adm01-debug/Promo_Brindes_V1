-- Etapa 41 do plano de 20260917. Projeto: doufsxqlfjyuvxuezpln (banco principal).
-- Achado do performance advisor (get_advisors, 17/09/2026): 4 foreign keys sem índice
-- de cobertura em kit_quote_requests e kit_save_requests — penaliza DELETE/UPDATE na
-- tabela pai (scan completo para checar a FK) e joins por essas colunas.
--
-- CONCURRENTLY: não bloqueia escrita nas tabelas durante a criação. Bloqueada pelo
-- classificador de permissões do Claude Code (escrita em banco de produção
-- compartilhado) — não aplicada automaticamente. Rode manualmente:
--   psql "$MAIN_DB_CONNECTION_STRING" -f docs/sql/canonical-principal/pendente_indices_fk_kit.sql
-- (CONCURRENTLY não pode rodar dentro de uma transação — cada CREATE INDEX é uma
-- statement própria, sem BEGIN/COMMIT em volta.)

create index concurrently if not exists kit_quote_requests_quote_id_idx
  on public.kit_quote_requests (quote_id);

create index concurrently if not exists kit_quote_requests_user_id_idx
  on public.kit_quote_requests (user_id);

create index concurrently if not exists kit_save_requests_kit_id_idx
  on public.kit_save_requests (kit_id);

create index concurrently if not exists kit_save_requests_user_id_idx
  on public.kit_save_requests (user_id);

-- Verificação pós-execução: get_advisors(type="performance") não deve mais listar
-- unindexed_foreign_keys para estas 4 colunas.
