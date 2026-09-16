-- Etapa 23 do plano de correções: convenção de versionamento de RPC. Um
-- create or replace function com assinatura diferente da anterior cria uma
-- SEGUNDA função em vez de substituir — a antiga fica órfã no catálogo. Este
-- teste falha se isso acontecer de novo (documentado em
-- docs/DATABASE_FUNCTION_CONTRACTS.md).

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(2);

select is(
  (
    select count(*) from (
      select proname from pg_proc
      where pronamespace = 'public'::regnamespace
      group by proname
      having count(*) > 1
    ) overloaded
  ),
  0::bigint,
  'nenhuma função pública tem duas assinaturas simultâneas (nenhum drop esquecido numa mudança de assinatura)'
);

select is(
  (
    select count(*) from (
      select proname from pg_proc
      where pronamespace = 'site_private'::regnamespace
      group by proname
      having count(*) > 1
    ) overloaded
  ),
  0::bigint,
  'idem para site_private'
);

select * from finish();
rollback;
