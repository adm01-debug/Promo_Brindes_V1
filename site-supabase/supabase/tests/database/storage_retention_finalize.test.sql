-- NOVO-DB-03: pgTAP de public.finalize_site_storage_retention.
-- Antes deste arquivo a funcao so era exercitada por Vitest com fetch mockado — nenhuma
-- prova de que as regras de negocio dela (allowlist de bucket, barreira de path traversal,
-- "so apaga o que ja expirou", idempotencia) realmente valiam no banco.
--
-- Funcao em 20260923120000_audit_security_reliability_hardening.sql:393.
-- Contrato: recebe a lista de objetos que a API ja removeu do Storage e so entao apaga os
-- metadados. Se a API falhar antes, os metadados continuam — por isso a exclusao de asset
-- e condicionada a expires_at <= now().

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(17);

-- Contrato de seguranca -------------------------------------------------------------
select ok(
  (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'finalize_site_storage_retention'),
  'finalize_site_storage_retention e SECURITY DEFINER');
select is(
  (select array_to_string(proconfig, ',') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'finalize_site_storage_retention'),
  'search_path=""',
  'search_path fixo e vazio (sem resolucao por nome de schema)');
select ok(
  not pg_catalog.has_function_privilege('anon', 'public.finalize_site_storage_retention(jsonb,integer)', 'execute'),
  'anon nao executa');
select ok(
  not pg_catalog.has_function_privilege('authenticated', 'public.finalize_site_storage_retention(jsonb,integer)', 'execute'),
  'authenticated nao executa');
select ok(
  pg_catalog.has_function_privilege('site_api', 'public.finalize_site_storage_retention(jsonb,integer)', 'execute'),
  'site_api executa (e a unica porta para a API)');

-- Rejeicoes de entrada --------------------------------------------------------------
select throws_ok(
  $$select public.finalize_site_storage_retention('[]'::jsonb, 0)$$,
  '22023', 'invalid_site_storage_retention_input', 'lote de tamanho 0 e rejeitado');
select throws_ok(
  $$select public.finalize_site_storage_retention('[]'::jsonb, 501)$$,
  '22023', 'invalid_site_storage_retention_input', 'lote acima de 500 e rejeitado');
select throws_ok(
  $$select public.finalize_site_storage_retention('{"bucket":"x"}'::jsonb, 10)$$,
  '22023', 'invalid_site_storage_retention_input', 'payload que nao e array e rejeitado');
select throws_ok(
  $$select public.finalize_site_storage_retention('[{"bucket":"outro-bucket","path":"a/b.png"}]'::jsonb, 10)$$,
  '22023', 'invalid_site_storage_retention_input', 'bucket fora da allowlist e rejeitado');
select throws_ok(
  $$select public.finalize_site_storage_retention('[{"bucket":"customer-briefing-assets","path":"../../etc/passwd"}]'::jsonb, 10)$$,
  '22023', 'invalid_site_storage_retention_input', 'path traversal e rejeitado');
select throws_ok(
  $$select public.finalize_site_storage_retention('[{"bucket":"customer-briefing-assets","path":"a"}]'::jsonb, 10)$$,
  '22023', 'invalid_site_storage_retention_input', 'path curto demais e rejeitado');
select throws_ok(
  format('select public.finalize_site_storage_retention(%L::jsonb, 10)',
         jsonb_build_array(jsonb_build_object('bucket','customer-briefing-assets','path',repeat('x',501)))),
  '22023', 'invalid_site_storage_retention_input', 'path longo demais e rejeitado');
select throws_ok(
  $$select public.finalize_site_storage_retention(
      '[{"bucket":"customer-briefing-assets","path":"a/b.png"},{"bucket":"customer-briefing-assets","path":"a/c.png"}]'::jsonb, 1)$$,
  '22023', 'invalid_site_storage_retention_input', 'lote maior que p_batch_size e rejeitado');

-- Regra de negocio: so apaga metadado de asset JA EXPIRADO --------------------------
create temporary table retention_fixture as
select
  'expirado'::text as rotulo,
  'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid as user_id,
  'customer-briefing-assets'::text as bucket,
  (repeat('e', 36) || '/logo/expirado.png')::text as storage_path,
  (now() - interval '1 hour')::timestamptz as expires_at
union all
select 'vigente', 'ffffffff-ffff-4fff-8fff-ffffffffffff', 'customer-briefing-assets',
       (repeat('f', 36) || '/logo/vigente.png'), (now() + interval '10 days');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-4fff-8fff-ffffffffffff',
   'authenticated', 'authenticated', 'retention@example.test', '', now(),
   '{}'::jsonb, '{}'::jsonb, now(), now());

insert into site_private.customer_briefing_assets
  (customer_user_id, kind, original_name, storage_bucket, storage_path, mime_type, size_bytes, expires_at)
select user_id, 'logo', rotulo || '.png', bucket, storage_path, 'image/png', 1024, expires_at
from retention_fixture;

insert into site_private.storage_deletion_queue (bucket, object_path)
select bucket, storage_path from retention_fixture;

create temporary table retention_result as
select public.finalize_site_storage_retention(
  (select jsonb_agg(jsonb_build_object('bucket', bucket, 'path', storage_path)) from retention_fixture),
  10
) as resultado;

select is(
  (select (resultado ->> 'assetsDeleted')::int from retention_result),
  1,
  'apenas o asset expirado teve metadado removido');
select is(
  (select (resultado ->> 'queueEntriesDeleted')::int from retention_result),
  2,
  'as duas entradas da fila foram confirmadas como removidas');
select is(
  (select count(*) from site_private.customer_briefing_assets
    where customer_user_id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'),
  1::bigint,
  'asset ainda vigente permanece (a API nao o removeu, os metadados ficam)');

-- Idempotencia: repetir a mesma chamada nao apaga nada a mais nem erra ---------------
select is(
  (public.finalize_site_storage_retention(
     (select jsonb_agg(jsonb_build_object('bucket', bucket, 'path', storage_path)) from retention_fixture), 10)
   ->> 'assetsDeleted')::int,
  0,
  'segunda chamada e idempotente (nao ha mais metadado expirado a apagar)');

select * from finish();

rollback;