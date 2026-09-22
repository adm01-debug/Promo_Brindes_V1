-- URGENTE — Etapa 39 do plano de 20260917 (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md).
-- Projeto: doufsxqlfjyuvxuezpln (banco principal).
--
-- Achado original: public.mcp_kv_get(p_secret, p_key) compara p_secret contra uma string
-- fixa gravada em texto puro na própria definição da função (legível por qualquer role com
-- select em pg_proc via pg_get_functiondef) e estava liberada para "authenticated" — não
-- só service_role. Qualquer usuário autenticado do app podia ler qualquer chave da tabela
-- public.mcp_kv.
--
-- ATUALIZAÇÃO (verificação adversarial de 20/09/2026): public.mcp_kv_set(p_secret, p_key,
-- p_value) e public.mcp_kv_try_lock(p_secret, p_key, p_ttl_seconds) têm o MESMO segredo
-- hardcoded, idêntico nas 3 funções. Hoje nenhuma das duas tem execute liberado para
-- anon/authenticated (só quem já tinha grant direto, tipicamente service_role) — não são
-- exploráveis pelo mesmo caminho que mcp_kv_get. Revogadas aqui mesmo assim, por
-- consistência e defesa em profundidade (nenhuma delas deveria depender de um literal
-- reaproveitado em 3 lugares).
--
-- Esta migration só REVOGA excesso de privilégio (só mcp_kv_get tinha, na prática) — não
-- toca em dados, não pode quebrar nada que dependa de MENOS acesso. Bloqueada pelo
-- classificador de permissões do Claude Code (ação de escrita em recurso compartilhado/
-- produção), por isso não foi aplicada automaticamente. Rode manualmente com acesso de
-- superusuário ao projeto:
--
--   psql "$MAIN_DB_CONNECTION_STRING" -f docs/sql/canonical-principal/URGENTE_revogar_mcp_kv_get.sql
--
-- ou cole no SQL Editor do Supabase Studio do projeto doufsxqlfjyuvxuezpln.

revoke execute on function public.mcp_kv_get(text, text) from authenticated;
revoke execute on function public.mcp_kv_set(text, text, text) from authenticated, anon;
revoke execute on function public.mcp_kv_try_lock(text, text, integer) from authenticated, anon;

-- Verificação pós-execução (as 3 devem retornar false para authenticated/anon, true para
-- service_role — confira as assinaturas exatas antes de rodar, o revoke acima assume os
-- tipos de parâmetro confirmados na auditoria de 20/09; se algum revoke der erro de
-- "function does not exist", a assinatura real difere e precisa ser reconferida com
-- pg_get_function_identity_arguments antes de tentar de novo):
-- select has_function_privilege('authenticated', 'public.mcp_kv_get(text,text)'::regprocedure, 'execute');
-- select has_function_privilege('authenticated', 'public.mcp_kv_set(text,text,text)'::regprocedure, 'execute');
-- select has_function_privilege('authenticated', 'public.mcp_kv_try_lock(text,text,integer)'::regprocedure, 'execute');
-- -- esperado: false nas 3. service_role deve continuar true (dono/bypass).

-- AÇÃO SEPARADA, AINDA MAIS URGENTE, FORA DO ESCOPO DESTE ARQUIVO:
-- Rotacionar todo o conteúdo de public.mcp_kv — o literal comparado em texto puro nas 3
-- funções já deve ser considerado comprometido (visível a qualquer role com leitura de
-- catálogo desde que as funções foram criadas, não só desde esta auditoria). A rotação
-- precisa reescrever as 3 funções (get/set/try_lock) com o novo valor ao mesmo tempo —
-- rotacionar só uma delas deixa as outras duas comparando contra um segredo antigo,
-- dessincronizando os pontos de leitura/escrita/lock. Depois de rotacionar, considerar
-- mover o mecanismo para o Vault do Supabase em vez de uma tabela protegida por
-- comparação de string literal.
