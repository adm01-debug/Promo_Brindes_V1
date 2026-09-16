-- Etapas 30 e 40 do plano de correções: tabelas de rate limit são UNLOGGED e as três
-- tabelas de alta rotatividade têm autovacuum mais agressivo que o padrão.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(5);

select is(
  (select relpersistence from pg_class where oid = 'site_private.rate_limit_buckets'::regclass),
  'u',
  'rate_limit_buckets é UNLOGGED (Etapa 30)'
);
select is(
  (select relpersistence from pg_class where oid = 'site_private.shared_selection_rate_limits'::regclass),
  'u',
  'shared_selection_rate_limits é UNLOGGED (Etapa 30)'
);
select is(
  (select relpersistence from pg_class where oid = 'site_private.notification_deliveries'::regclass),
  'p',
  'notification_deliveries continua persistente (não é efêmera como as tabelas de rate limit)'
);
select ok(
  (select reloptions from pg_class where oid = 'site_private.notification_deliveries'::regclass)::text ilike '%fillfactor=80%',
  'notification_deliveries tem fillfactor 80 (Etapa 40, espaço para HOT updates)'
);
select ok(
  (select reloptions from pg_class where oid = 'site_private.rate_limit_buckets'::regclass)::text ilike '%autovacuum_vacuum_scale_factor=0.02%',
  'rate_limit_buckets tem autovacuum mais agressivo que o padrão (Etapa 30)'
);

select * from finish();
rollback;
