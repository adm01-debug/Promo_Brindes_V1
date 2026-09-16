-- Etapa 41 do plano de correções: site_api tem statement_timeout, lock_timeout e
-- idle_in_transaction_session_timeout configurados, todos abaixo do
-- REQUEST_TIMEOUT_MS do cliente (api/_lib/siteDatabase.ts, 10s).

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(3);

select ok(
  exists (
    select 1 from pg_roles, unnest(rolconfig) as cfg
    where rolname = 'site_api' and cfg = 'statement_timeout=8s'
  ),
  'site_api tem statement_timeout de 8s'
);
select ok(
  exists (
    select 1 from pg_roles, unnest(rolconfig) as cfg
    where rolname = 'site_api' and cfg = 'lock_timeout=2s'
  ),
  'site_api tem lock_timeout de 2s'
);
select ok(
  exists (
    select 1 from pg_roles, unnest(rolconfig) as cfg
    where rolname = 'site_api' and cfg = 'idle_in_transaction_session_timeout=10s'
  ),
  'site_api tem idle_in_transaction_session_timeout de 10s'
);

select * from finish();
rollback;
