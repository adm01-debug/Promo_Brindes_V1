begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(17);

select has_function('public', 'get_site_shared_selection', array['uuid', 'text'], 'leitura limitada recebe hash do solicitante');
select has_function('public', 'revoke_site_shared_selection', array['uuid', 'text', 'text'], 'revogação limitada recebe hash do solicitante');
select ok(pg_catalog.has_function_privilege('site_api', 'public.get_site_shared_selection(uuid,text)', 'execute'), 'site_api usa leitura limitada');
select ok(not pg_catalog.has_function_privilege('anon', 'public.get_site_shared_selection(uuid,text)', 'execute'), 'anônimo não chama leitura limitada diretamente');

select is(
  site_private.normalize_selection_references('[{"id":"11111111-1111-4111-8111-111111111111","q":100,"c":"Azul petróleo"}]') #>> '{0,c}',
  'Azul petróleo', 'fallback de cor é preservado'
);
select throws_ok(
  $$select site_private.normalize_selection_references('[{"id":"11111111-1111-4111-8111-111111111111","q":100,"v":"blue","c":"Azul"}]')$$,
  '22023', 'invalid_selection_reference', 'variante estável e fallback não podem coexistir'
);
select throws_ok(
  $$select site_private.normalize_selection_references(jsonb_build_array(jsonb_build_object('id','11111111-1111-4111-8111-111111111111','q',100,'c','Azul' || chr(8238) || 'gpj.exe')))$$,
  '22023', 'invalid_selection_reference', 'controle bidi é recusado'
);
select throws_ok(
  $$select site_private.normalize_selection_references('[{"id":"11111111-1111-4111-8111-111111111111","q":999999999999999999999}]')$$,
  '22023', 'invalid_selection_reference', 'overflow recebe erro contratual'
);
select throws_ok(
  $$select site_private.normalize_selection_references('[{"id":"11111111-1111-4111-8111-111111111111","q":100,"d":null}]')$$,
  '22023', 'invalid_selection_reference', 'prioridade nula é recusada na defesa comum'
);

create temporary table limited_link as
select public.create_site_shared_selection(
  '[{"id":"11111111-1111-4111-8111-111111111111","q":100,"c":"Azul"}]',
  repeat('a', 64), repeat('b', 64)
) result;
select is(
  public.get_site_shared_selection((select (result->>'token')::uuid from limited_link), repeat('c',64)) #>> '{items,0,c}',
  'Azul', 'roundtrip limitado preserva fallback de cor'
);
select is(
  public.revoke_site_shared_selection((select (result->>'token')::uuid from limited_link), repeat('a',64), repeat('d',64))->>'revoked',
  'true', 'revogação limitada preserva posse do link'
);
select is((select request_count from site_private.shared_selection_rate_limits where identifier_hash = repeat('c',64)), 1, 'leitura consome bucket próprio');
select is((select request_count from site_private.shared_selection_rate_limits where identifier_hash = repeat('d',64)), 1, 'revogação consome bucket próprio');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'asset-integrity@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
create temporary table integrity_asset as
select public.create_my_briefing_asset('logo.png', 'image/png', 2048, 'logo') result;
select ok(public.matches_my_briefing_asset_upload(
  (select result->>'path' from integrity_asset), '{"size":2048,"mimetype":"image/png"}'
), 'upload confere tamanho e MIME esperados');
select ok(not public.matches_my_briefing_asset_upload(
  (select result->>'path' from integrity_asset), '{"size":1,"mimetype":"image/png"}'
), 'upload recusa tamanho diferente do metadado reservado');
select ok(not public.matches_my_briefing_asset_upload(
  (select result->>'path' from integrity_asset), '{"size":2048,"mimetype":"application/pdf"}'
), 'upload recusa MIME diferente do metadado reservado');
select ok((select pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid) like '%matches_my_briefing_asset_upload%'
  from pg_catalog.pg_policy policy where policy.polrelid = 'storage.objects'::regclass
    and policy.polname = 'customer_briefing_assets_insert_own'), 'policy de Storage exige metadado real');

select * from finish();
rollback;
