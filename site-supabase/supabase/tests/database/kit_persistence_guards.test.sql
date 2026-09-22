begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(12);

select ok(
  pg_catalog.to_regprocedure('site_private.enforce_valid_kit_reference_set()') is not null,
  'guarda estrutural de kits existe no schema privado'
);
select has_trigger('site_private', 'customer_selections', 'customer_selections_validate_kit_insert', 'rascunho valida kits no insert');
select has_trigger('site_private', 'customer_selections', 'customer_selections_validate_kit_update', 'rascunho valida kits no update');
select has_trigger('site_private', 'shared_selections', 'shared_selections_validate_kit_insert', 'link compartilhado valida kits no insert');
select has_trigger('site_private', 'shared_selections', 'shared_selections_validate_kit_update', 'link compartilhado valida kits no update');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'authenticated', 'authenticated', 'kit-guard@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$ select public.save_my_selection('Kit íntegro', '[
    {"id":"11111111-1111-4111-8111-111111111111","q":200,"k":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","kn":"Kit Cultura","kq":100,"ku":2},
    {"id":"22222222-2222-4222-8222-222222222222","q":100,"k":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","kn":"Kit Cultura","kq":100,"ku":1}
  ]'::jsonb) $$,
  'rascunho aceita kit íntegro'
);

select throws_ok(
  $$ select public.save_my_selection('Kit unitário', '[
    {"id":"33333333-3333-4333-8333-333333333333","q":100,"k":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","kn":"Kit Incompleto","kq":100,"ku":1}
  ]'::jsonb) $$,
  '22023', 'invalid_kit_reference_set', 'rascunho recusa kit com um componente'
);

select throws_ok(
  $$ select public.save_my_selection('Kit divergente', '[
    {"id":"33333333-3333-4333-8333-333333333333","q":100,"k":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","kn":"Kit A","kq":100,"ku":1},
    {"id":"44444444-4444-4444-8444-444444444444","q":50,"k":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","kn":"Kit B","kq":50,"ku":1}
  ]'::jsonb) $$,
  '22023', 'invalid_kit_reference_set', 'rascunho recusa nome ou quantidade divergente no grupo'
);

select throws_ok(
  $$ select public.save_my_selection('Colisão avulso e kit', '[
    {"id":"55555555-5555-4555-8555-555555555555","q":100},
    {"id":"55555555-5555-4555-8555-555555555555","q":100,"k":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","kn":"Kit Colisão","kq":100,"ku":1},
    {"id":"66666666-6666-4666-8666-666666666666","q":100,"k":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","kn":"Kit Colisão","kq":100,"ku":1}
  ]'::jsonb) $$,
  '22023', 'invalid_kit_reference_set', 'rascunho recusa o mesmo produto e variante como avulso e componente'
);

select lives_ok(
  $$ select public.create_site_shared_selection('[
    {"id":"77777777-7777-4777-8777-777777777777","q":200,"k":"ffffffff-ffff-4fff-8fff-ffffffffffff","kn":"Kit Compartilhado","kq":100,"ku":2},
    {"id":"88888888-8888-4888-8888-888888888888","q":100,"k":"ffffffff-ffff-4fff-8fff-ffffffffffff","kn":"Kit Compartilhado","kq":100,"ku":1}
  ]'::jsonb, repeat('1', 64), repeat('2', 64)) $$,
  'link compartilhado aceita kit íntegro'
);

select throws_ok(
  $$ select public.create_site_shared_selection('[
    {"id":"99999999-9999-4999-8999-999999999999","q":100,"k":"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee","kn":"Kit Incompleto","kq":100,"ku":1}
  ]'::jsonb, repeat('3', 64), repeat('4', 64)) $$,
  '22023', 'invalid_kit_reference_set', 'link compartilhado recusa kit com um componente'
);

select throws_ok(
  $$ select public.create_site_shared_selection('[
    {"id":"99999999-9999-4999-8999-999999999999","q":100,"k":"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee","kn":"Kit A","kq":100,"ku":1},
    {"id":"aaaaaaaa-1111-4111-8111-111111111111","q":50,"k":"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee","kn":"Kit B","kq":50,"ku":1}
  ]'::jsonb, repeat('5', 64), repeat('6', 64)) $$,
  '22023', 'invalid_kit_reference_set', 'link compartilhado recusa metadados divergentes'
);

select * from finish();
rollback;
