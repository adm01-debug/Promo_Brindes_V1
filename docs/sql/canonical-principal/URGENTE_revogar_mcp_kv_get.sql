-- URGENTE — Etapa 39 do plano de 20260917 (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md).
-- Projeto: doufsxqlfjyuvxuezpln (banco principal).
--
-- Achado: public.mcp_kv_get(p_secret, p_key) compara p_secret contra uma string fixa
-- gravada em texto puro na própria definição da função (legível por qualquer role com
-- select em pg_proc via pg_get_functiondef) e está liberada para "authenticated" — não
-- só service_role. Qualquer usuário autenticado do app pode ler qualquer chave da tabela
-- public.mcp_kv.
--
-- Esta migration só REVOGA o excesso de privilégio — não toca em dados, não pode quebrar
-- nada que dependa de MENOS acesso. Bloqueada pelo classificador de permissões do Claude
-- Code (ação de escrita em recurso compartilhado/produção), por isso não foi aplicada
-- automaticamente. Rode manualmente com acesso de superusuário ao projeto:
--
--   psql "$MAIN_DB_CONNECTION_STRING" -f docs/sql/canonical-principal/URGENTE_revogar_mcp_kv_get.sql
--
-- ou cole no SQL Editor do Supabase Studio do projeto doufsxqlfjyuvxuezpln.

revoke execute on function public.mcp_kv_get(text, text) from authenticated;

-- Verificação pós-execução (deve retornar false / true):
-- select has_function_privilege('authenticated', 'public.mcp_kv_get(text,text)'::regprocedure, 'execute'); -- esperado: false
-- select has_function_privilege('service_role', 'public.mcp_kv_get(text,text)'::regprocedure, 'execute');  -- esperado: true (dono/bypass)

-- AÇÃO SEPARADA, AINDA MAIS URGENTE, FORA DO ESCOPO DESTE ARQUIVO:
-- Rotacionar todo o conteúdo de public.mcp_kv — a string comparada em texto puro na
-- função já deve ser considerada comprometida (visível a qualquer role com leitura de
-- catálogo desde que a função foi criada, não só desde esta auditoria). Depois de
-- rotacionar, considerar mover o mecanismo para o Vault do Supabase em vez de uma tabela
-- protegida por comparação de string literal.
