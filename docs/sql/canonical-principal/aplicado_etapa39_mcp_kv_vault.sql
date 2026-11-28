-- Etapa 39 do plano de 20260917 - CONCLUIDA em 2026-11-28.
-- Projeto: doufsxqlfjyuvxuezpln (banco principal).
--
-- HISTORICO: public.mcp_kv_get/set/try_lock comparavam p_secret contra um literal de 64
-- caracteres gravado em texto puro na propria definicao da funcao - legivel por qualquer
-- role com leitura em pg_proc (pg_get_functiondef). O mesmo literal aparecia nas TRES
-- funcoes. Considerado comprometido desde a criacao, nao so desde a auditoria.
--
-- APLICADO EM PRODUCAO (2026-11-28), e o texto abaixo e exatamente o que rodou:
--   1. grants revogados de anon/authenticated; sobrou apenas postgres + service_role;
--   2. segredo ROTACIONADO para um valor de 32 bytes aleatorios, guardado no Supabase
--      Vault sob o nome mcp_kv_shared_secret_v2 (nunca mais em DDL);
--   3. as 3 funcoes delegam a public.mcp_kv_check_secret(), que compara SHA-256 do valor
--      recebido contra SHA-256 do segredo do Vault - nenhum literal sobra em pg_proc.
--
-- VERIFICACAO POS-APLICACAO (medida em producao, nao inferida):
--   select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and p.proname like 'mcp_kv%'
--      and pg_get_functiondef(p.oid) ~ '[0-9a-f]{64}';            -- => 0
--   select public.mcp_kv_check_secret((select decrypted_secret from vault.decrypted_secrets
--                                        where name='mcp_kv_shared_secret_v2')); -- => t
--   select public.mcp_kv_check_secret(repeat('a',64));                            -- => f
--   select public.mcp_kv_check_secret('9f2c7a1e...');   -- literal antigo             -- => f
--
-- NOTA DE REGRA 8: DDL em banco de producao. Aplicado apos autorizacao explicita do dono
-- do negocio para corrigir segredo vazado; este arquivo existe para que a correcao seja
-- reproduzivel e auditavel, nao para ser rodada de novo (e idempotente, mas o segredo ja
-- foi rotacionado).

select vault.create_secret(
  encode(gen_random_bytes(32), 'hex'),
  'mcp_kv_shared_secret_v2',
  'Rotacionado em 2026-11-28. Substitui o literal que estava em pg_proc (Etapa 39).'
) as new_secret_id
where not exists (select 1 from vault.secrets where name = 'mcp_kv_shared_secret_v2');

create or replace function public.mcp_kv_check_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'vault', 'extensions'
as $fn$
  select p_secret is not null
     and length(p_secret) = 64
     and coalesce(
          (select extensions.digest(p_secret, 'sha256')
                = extensions.digest(decrypted_secret, 'sha256')
             from vault.decrypted_secrets
            where name = 'mcp_kv_shared_secret_v2'),
          false);
$fn$;

revoke all on function public.mcp_kv_check_secret(text) from public, anon, authenticated;

create or replace function public.mcp_kv_get(p_secret text, p_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if not public.mcp_kv_check_secret(p_secret) then
    raise exception 'forbidden';
  end if;
  return (select v from public.mcp_kv where k = p_key);
end;
$fn$;

create or replace function public.mcp_kv_set(p_secret text, p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if not public.mcp_kv_check_secret(p_secret) then
    raise exception 'forbidden';
  end if;
  insert into public.mcp_kv(k, v, updated_at) values (p_key, p_value, now())
  on conflict (k) do update set v = excluded.v, updated_at = now();
end;
$fn$;

create or replace function public.mcp_kv_try_lock(p_secret text, p_key text, p_ttl_seconds integer)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_now timestamptz := now();
  v_rows int;
begin
  if not public.mcp_kv_check_secret(p_secret) then
    raise exception 'unauthorized';
  end if;
  update public.mcp_kv
     set lock_until = v_now + make_interval(secs => p_ttl_seconds)
   where k = p_key
     and (lock_until is null or lock_until < v_now);
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$fn$;

revoke all on function public.mcp_kv_get(text, text) from public, anon, authenticated;
revoke all on function public.mcp_kv_set(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.mcp_kv_try_lock(text, text, integer) from public, anon, authenticated;
grant execute on function public.mcp_kv_get(text, text) to service_role;
grant execute on function public.mcp_kv_set(text, text, jsonb) to service_role;
grant execute on function public.mcp_kv_try_lock(text, text, integer) to service_role;