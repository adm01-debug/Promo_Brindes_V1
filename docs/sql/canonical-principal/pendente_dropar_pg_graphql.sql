-- Etapa 40 do plano de 20260917. Projeto: doufsxqlfjyuvxuezpln (banco principal).
--
-- pg_graphql 1.5.11 está instalada (schema graphql) e expõe automaticamente qualquer
-- tabela do schema public via /graphql/v1, independentemente de RLS estar correto (RLS
-- ainda protege os dados, mas a superfície de descoberta do schema fica exposta).
-- pg_graphql_anon_table_exposed (59) + pg_graphql_authenticated_table_exposed (457) = 516
-- dos 623 WARN de segurança do projeto — maior fonte isolada de ruído do advisor.
--
-- NÃO RODAR SEM CONFIRMAR ANTES: `grep -r graphql src api` neste repositório (Promo_Brindes_V1)
-- não encontra nenhum uso, mas este repositório é só UM consumidor do banco principal — o
-- sistema de gestão de produtos/catálogo (magazine_*, fn_get_reposicao_*, etc.) tem uma
-- aplicação própria fora deste repositório, e ela pode usar a API GraphQL sem que isso
-- apareça em nenhum grep daqui. Confirme com quem mantém esse outro app antes de rodar.
--
-- Bloqueada pelo classificador de permissões do Claude Code (escrita em banco de produção
-- compartilhado) e, mais importante, pela limitação de escopo acima. Rode manualmente,
-- só depois da confirmação:
--   psql "$MAIN_DB_CONNECTION_STRING" -f docs/sql/canonical-principal/pendente_dropar_pg_graphql.sql

drop extension if exists pg_graphql cascade;

-- Verificação pós-execução: get_advisors(type="security") deve cair de 623 para ~107
-- avisos (623 - 516), sem os pg_graphql_*_table_exposed.
