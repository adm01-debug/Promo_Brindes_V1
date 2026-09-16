-- Versão normalizada de 20260909 para 20260909103000 em 15/09/2026;
-- somente o identificador do ledger mudou, sem reaplicação deste SQL.
-- O helper é criado pela plataforma para ativar RLS automaticamente em novas
-- tabelas públicas. O event trigger não depende de EXECUTE concedido a clientes.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated, service_role';
  end if;
end;
$$;
