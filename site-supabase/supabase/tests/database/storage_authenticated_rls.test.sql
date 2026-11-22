-- F-82 (achado PF-82): os testes de Storage so verificavam a existencia das
-- policies contando linhas em pg_policy, como postgres -- que tem BYPASSRLS e
-- portanto nunca exercita a policy. Aqui o papel `authenticated` entra de fato
-- (set local role), com request.jwt.claims de dois titulares distintos, para
-- provar isolamento cross-tenant no bucket privado. O rate limit e os privilegios
-- de DDL tambem sao exercitados de verdade, nao por grep em prosrc.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(42);

-- === A policy existe e e do papel certo (pre-condicao dos testes de comportamento) ===

select is(
  (select count(*) from pg_catalog.pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'customer_briefing_assets_%'),
  3::bigint,
  'bucket privado tem exatamente 3 policies próprias (leitura, upload, exclusão)'
);
select is(
  (select pg_catalog.array_agg(distinct role_name) from (
     select unnest(p.roles)::text as role_name
     from pg_catalog.pg_policies p
     where p.schemaname = 'storage' and p.tablename = 'objects'
       and p.policyname like 'customer_briefing_assets_%') expanded),
  array['authenticated']::text[],
  'as 3 policies valem só para authenticated (nem anon, nem service_role)'
);
select ok(
  (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'storage.objects'::regclass),
  'RLS está habilitada em storage.objects'
);
select ok(
  not (select rolbypassrls from pg_catalog.pg_roles where rolname = 'authenticated'),
  'authenticated não tem BYPASSRLS — o papel testado aqui é o que roda em produção'
);

-- === Fixtures (antes de trocar de papel: authenticated não escreve em auth.users) ===

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111111',
   'authenticated', 'authenticated', 'rls-ana@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b2222222-2222-4222-8222-222222222222',
   'authenticated', 'authenticated', 'rls-bia@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

-- pgTAP precisa continuar resolvível depois do `set local role`, e authenticated
-- precisa dos grants reais do Storage que a plataforma Supabase concede fora das
-- migrations deste repositório.
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;

-- Valor compartilhado entre os dois lados da troca de papel.
create temporary table rls_probe (path text not null, expired_path text not null, upload_path text not null);
grant select on rls_probe to authenticated;

-- Titular A cria duas reservas (uma delas vai expirar) e materializa os objetos.
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';
do $$
declare
  v_live jsonb := public.create_my_briefing_asset('logo.png', 'image/png', 2048, 'logo');
  v_dead jsonb := public.create_my_briefing_asset('velho.png', 'image/png', 2048, 'logo');
  v_up jsonb := public.create_my_briefing_asset('anexo.png', 'image/png', 2048, 'logo');
begin
  insert into rls_probe (path, expired_path, upload_path)
    values (v_live ->> 'path', v_dead ->> 'path', v_up ->> 'path');
  insert into storage.objects (id, bucket_id, name, owner_id, metadata) values
    (gen_random_uuid(), 'customer-briefing-assets', v_live ->> 'path',
     'a1111111-1111-4111-8111-111111111111', '{"size":2048,"mimetype":"image/png"}'::jsonb),
    (gen_random_uuid(), 'customer-briefing-assets', v_dead ->> 'path',
     'a1111111-1111-4111-8111-111111111111', '{"size":2048,"mimetype":"image/png"}'::jsonb);
  update site_private.customer_briefing_assets set expires_at = now() - interval '1 minute'
    where storage_path = v_dead ->> 'path';
end;
$$;

-- === Registro de DDL executado (event trigger log_admin_ddl) ===
-- PF-82 pede verificar o registro de DDL executado: aqui o event trigger é
-- exercitado de verdade, não por grep em prosrc.

create table public.ddl_probe_table (id int);
select ok(
  (select count(*) from site_private.admin_ddl_log
    where command_tag = 'CREATE TABLE' and schema_name = 'public') >= 1,
  'CREATE TABLE gera linha no registro de DDL com o schema alvo'
);
drop table public.ddl_probe_table;
select ok(
  (select count(*) from site_private.admin_ddl_log where command_tag = 'DROP TABLE') >= 1,
  'DROP TABLE também entra no registro de DDL'
);

-- === Storage com o papel `authenticated` (RLS de verdade) ===

select is(
  (select count(*) from storage.objects where bucket_id = 'customer-briefing-assets'),
  2::bigint,
  'pre-condicao como postgres: os 2 objetos de A existem na tabela'
);

set local role authenticated;

-- Achado PF-82/#227: se todos os uploads testados falhassem, uma policy que
-- rejeitasse TODO upload passaria. Este bloco prova o caminho feliz: reserva
-- valida + metadata igual ao registrado e aceita pelo with check.
set local storage.allow_delete_query = 'true';
insert into storage.objects (id, bucket_id, name, owner_id, metadata)
select gen_random_uuid(), 'customer-briefing-assets', upload_path,
       'a1111111-1111-4111-8111-111111111111', '{"size":2048,"mimetype":"image/png"}'::jsonb
from rls_probe;
select is(
  (select count(*) from storage.objects
    where bucket_id = 'customer-briefing-assets' and name = (select upload_path from rls_probe)),
  1::bigint,
  'upload legítimo com reserva válida passa pela policy (a policy não bloqueia todo upload)'
);
delete from storage.objects
  where bucket_id = 'customer-briefing-assets' and name = (select upload_path from rls_probe);
select is(
  (select count(*) from storage.objects
    where bucket_id = 'customer-briefing-assets' and name = (select upload_path from rls_probe)),
  0::bigint,
  'o upload de teste sai pela policy de delete do próprio titular'
);
select throws_ok(
  (select format('insert into storage.objects (id, bucket_id, name, owner_id, metadata)
    values (gen_random_uuid(), %L, %L, %L, %L::jsonb)',
    'customer-briefing-assets', (select upload_path from rls_probe),
    'a1111111-1111-4111-8111-111111111111', '{"size":999999,"mimetype":"image/png"}')),
  '42501', null,
  'upload com tamanho divergente da reserva é rejeitado'
);
select throws_ok(
  (select format('insert into storage.objects (id, bucket_id, name, owner_id, metadata)
    values (gen_random_uuid(), %L, %L, %L, %L::jsonb)',
    'customer-briefing-assets', (select upload_path from rls_probe),
    'a1111111-1111-4111-8111-111111111111', '{"size":2048,"mimetype":"text/html"}')),
  '42501', null,
  'upload com MIME diferente da reserva é rejeitado'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'customer-briefing-assets'),
  1::bigint,
  'A enxerga só o próprio objeto vigente: o expirado sai da policy pelo expires_at'
);
select is(
  (select name from storage.objects where bucket_id = 'customer-briefing-assets'),
  (select path from rls_probe),
  'o objeto visível é exatamente o do caminho de A'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'customer-briefing-assets' and owner_id <> auth.uid()::text),
  0::bigint,
  'policy nunca revela objeto de outro owner_id'
);
select throws_ok(
  $$insert into storage.objects (id, bucket_id, name, owner_id, metadata)
    values (gen_random_uuid(), 'customer-briefing-assets', 'a1111111-1111-4111-8111-111111111111/intruso.png',
            'a1111111-1111-4111-8111-111111111111', '{"size":10,"mimetype":"image/png"}'::jsonb)$$,
  '42501', null,
  'upload em caminho sem reserva prévia é barrado pela policy (não basta o namespace)'
);
select throws_ok(
  $$insert into storage.objects (id, bucket_id, name, owner_id, metadata)
    values (gen_random_uuid(), 'outro-bucket', 'a1111111-1111-4111-8111-111111111111/x.png',
            'a1111111-1111-4111-8111-111111111111', '{"size":10,"mimetype":"image/png"}'::jsonb)$$,
  '42501', null,
  'policy é restrita ao bucket customer-briefing-assets'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'customer-briefing-assets' and name = (select expired_path from rls_probe)),
  0::bigint,
  'objeto expirado deixa de ser acessível ao próprio dono'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'customer-briefing-assets' and name like 'b2222222-%'),
  0::bigint,
  'A não enxerga o namespace de B'
);

-- Titular B: isolamento cross-tenant.
set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

select is(
  (select count(*) from storage.objects where bucket_id = 'customer-briefing-assets'),
  0::bigint,
  'B não enxerga nenhum objeto de A, mesmo conhecendo o bucket'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'customer-briefing-assets' and name = (select path from rls_probe)),
  0::bigint,
  'B não enxerga o objeto de A nem informando o caminho exato'
);
select throws_ok(
  (select format('insert into storage.objects (id, bucket_id, name, owner_id, metadata)
    values (gen_random_uuid(), %L, %L, %L, %L::jsonb)',
    'customer-briefing-assets', (select path from rls_probe),
    'b2222222-2222-4222-8222-222222222222', '{"size":10,"mimetype":"image/png"}')),
  '42501', null,
  'B não sobrescreve o caminho de A (insert com check de owns_my_briefing_asset_path)'
);
select throws_ok(
  (select format('insert into storage.objects (id, bucket_id, name, owner_id, metadata)
    values (gen_random_uuid(), %L, %L, %L, %L::jsonb)',
    'customer-briefing-assets', (select path from rls_probe),
    'a1111111-1111-4111-8111-111111111111', '{"size":10,"mimetype":"image/png"}')),
  '42501', null,
  'B não grava forjando owner_id de A'
);
-- storage.allow_delete_query ja foi ligado acima (e o que a Storage API faz antes
-- de apagar); sem ele o DELETE falharia pelo trigger protect_objects_delete, por
-- motivo alheio a RLS.
delete from storage.objects where name = (select path from rls_probe);
select is(
  (select count(*) from storage.objects where name = (select path from rls_probe)),
  0::bigint,
  'delete de caminho alheio nao afeta linha alguma (DELETE 0)'
);

-- De volta a A: o objeto de A continua intacto depois da tentativa de delete de B
-- (a assercao imediatamente abaixo e a prova de que o DELETE 0 de B nao removeu a linha).
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

select is(
  (select count(*) from storage.objects where bucket_id = 'customer-briefing-assets' and name = (select path from rls_probe)),
  1::bigint,
  'objeto de A sobrevive às tentativas de B'
);
-- A exclui o proprio objeto vigente (o SET LOCAL ja foi feito acima e continua
-- valido ate o fim desta transacao).
delete from storage.objects where name = (select path from rls_probe);
select is(
  (select count(*) from storage.objects where name = (select path from rls_probe)),
  0::bigint,
  'A exclui o proprio objeto vigente pela policy de delete'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'customer-briefing-assets'),
  0::bigint,
  'após a exclusão o bucket voltou a ficar vazio para A'
);

-- === DDL real: authenticated não altera estrutura ===

select throws_ok(
  'create table public.rls_probe_table (id int)',
  '42501', null,
  'authenticated não cria tabela em public'
);
select throws_ok(
  'alter table site_private.quote_requests add column rls_probe_column int',
  '42501', null,
  'authenticated não altera tabela de negócio'
);
select throws_ok(
  'drop table site_private.admin_audit_log',
  '42501', null,
  'authenticated não derruba a tabela de auditoria real (admin_audit_log)'
);
select throws_ok(
  'delete from site_private.admin_ddl_log',
  '42501', null,
  'authenticated não apaga o registro de DDL executado'
);

reset role;

-- === Rate limit exercitado de verdade (site_api, o papel que a API usa) ===

-- Mesmo motivo do grant para authenticated: as funcoes do pgTAP vivem em
-- `extensions`, e site_api nao tem uso do schema por padrao (a migration real
-- nao concede nada em extensions). Este grant e so-de-teste e cai no rollback.
grant usage on schema extensions to site_api;
grant execute on all functions in schema extensions to site_api;

set local role site_api;

-- Agora que site_api alcanca extensions, o caminho felizes volta a ser provado
-- pelo helper idiomatico, e o efeito (contador do balde) tem assercao propria.
select lives_ok(
  $$select site_private.consume_rate_limit('contact_preflight', repeat('a', 64), 2, interval '1 hour')$$,
  'primeira leitura dentro da janela passa'
);
select is(
  (select request_count from site_private.rate_limit_buckets
    where identifier_hash = repeat('a', 64) and request_kind = 'contact_preflight'),
  1,
  'primeira leitura gravou 1 uso no balde'
);
select lives_ok(
  $$select site_private.consume_rate_limit('contact_preflight', repeat('a', 64), 2, interval '1 hour')$$,
  'segunda leitura no limite passa'
);
select is(
  (select request_count from site_private.rate_limit_buckets
    where identifier_hash = repeat('a', 64) and request_kind = 'contact_preflight'),
  2,
  'segunda leitura incrementou o mesmo balde para 2'
);
select throws_ok(
  $$select site_private.consume_rate_limit('contact_preflight', repeat('a', 64), 2, interval '1 hour')$$,
  'P0001', 'rate_limit_exceeded',
  'terceira leitura na mesma janela é bloqueada'
);
select lives_ok(
  $$select site_private.consume_rate_limit('contact_preflight', repeat('b', 64), 2, interval '1 hour')$$,
  'hash distinto tem balde próprio e não é afetado pelo limite anterior'
);
select is(
  (select count(*) from site_private.rate_limit_buckets where identifier_hash = repeat('b', 64)),
  1::bigint,
  'balde do hash distinto existe separado do balde estourado'
);
select throws_ok(
  $$select site_private.consume_rate_limit('kind_inexistente', repeat('a', 64), 2, interval '1 hour')$$,
  '22023', 'invalid_rate_limit_input',
  'request_kind fora da allowlist é recusado'
);
select throws_ok(
  $$select site_private.consume_rate_limit('contact_preflight', 'nao-e-sha256', 2, interval '1 hour')$$,
  '22023', 'invalid_rate_limit_input',
  'identificador sem hash hex de 64 caracteres é recusado (não grava PII em claro)'
);
select is(
  (select count(*) from site_private.rate_limit_buckets where identifier_hash = 'nao-e-sha256'),
  0::bigint,
  'identificador recusado não deixou linha no balde'
);

-- === Bloqueio por excesso de acessos a seleções compartilhadas ===
-- PF-82 também pede este critério. get_site_shared_selection consome o limite de
-- 120 leituras por hash/hora; o 121º acesso precisa falhar.

create temporary table shared_probe (allowed integer, blocked boolean);
grant insert on shared_probe to site_api;

do $$
declare
  v_allowed integer := 0;
  v_blocked boolean := false;
begin
  for i in 1..125 loop
    begin
      perform public.get_site_shared_selection(gen_random_uuid(), repeat('c', 64));
      v_allowed := v_allowed + 1;
    exception when others then
      if sqlerrm = 'shared_selection_rate_limit_exceeded' then
        v_blocked := true;
        exit;
      end if;
      raise;
    end;
  end loop;
  insert into shared_probe (allowed, blocked) values (v_allowed, v_blocked);
end;
$$;

select is(
  (select allowed from shared_probe),
  120,
  'as 120 primeiras leituras de seleção compartilhada passam'
);
select ok(
  (select blocked from shared_probe),
  'o 121º acesso do mesmo hash é bloqueado pelo limite'
);

reset role;

select * from finish();

rollback;
