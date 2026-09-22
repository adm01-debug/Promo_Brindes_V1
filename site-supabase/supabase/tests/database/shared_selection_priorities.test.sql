begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(5);

create temporary table shared_result as
select public.create_site_shared_selection(
  '[{"id":"11111111-1111-4111-8111-111111111111","q":100},
    {"id":"22222222-2222-4222-8222-222222222222","q":200,"d":"alternative"}]'::jsonb,
  repeat('a', 64), repeat('b', 64)
) as result;

select is(
  public.get_site_shared_selection((select (result->>'token')::uuid from shared_result))->'items'->1->>'d',
  'alternative', 'criar e ler preserva prioridade alternativa'
);
select ok(
  not ((public.get_site_shared_selection((select (result->>'token')::uuid from shared_result))->'items'->0) ? 'd'),
  'referência sem prioridade continua compatível como principal'
);
select throws_ok(
  $$select public.create_site_shared_selection('[{"id":"11111111-1111-4111-8111-111111111111","q":100,"d":"urgent"}]', repeat('c',64),repeat('d',64))$$,
  '22023', 'invalid_shared_selection_item', 'recusa prioridade desconhecida'
);
select throws_ok(
  $$select public.create_site_shared_selection('[{"id":"11111111-1111-4111-8111-111111111111","q":100,"d":null}]', repeat('e',64),repeat('f',64))$$,
  '22023', 'invalid_shared_selection_item', 'recusa null explícito'
);
select is(
  (select count(*)::integer from site_private.shared_selection_rate_limits where identifier_hash in (repeat('d',64),repeat('f',64))),
  0, 'payload inválido não consome limite de criação'
);
select * from finish();
rollback;
