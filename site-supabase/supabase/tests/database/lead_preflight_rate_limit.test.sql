begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

select has_function(
  'public', 'preflight_site_lead_request', array['text', 'text', 'text'],
  'preflight distribuído existe'
);
select ok(not pg_catalog.has_function_privilege('anon', 'public.preflight_site_lead_request(text,text,text)', 'execute'), 'anon não executa preflight');
select ok(not pg_catalog.has_function_privilege('authenticated', 'public.preflight_site_lead_request(text,text,text)', 'execute'), 'authenticated não executa preflight');
select ok(pg_catalog.has_function_privilege('service_role', 'public.preflight_site_lead_request(text,text,text)', 'execute'), 'service_role executa preflight');
select ok(pg_catalog.has_function_privilege('site_api', 'public.preflight_site_lead_request(text,text,text)', 'execute'), 'site_api executa preflight');
select ok(
  (select not p.prosecdef and array_to_string(p.proconfig, ',') = 'search_path=""'
   from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'preflight_site_lead_request'),
  'preflight usa invoker e search_path vazio'
);
select ok(
  (select position('quote_preflight' in pg_catalog.pg_get_constraintdef(c.oid)) > 0
       and position('contact_preflight' in pg_catalog.pg_get_constraintdef(c.oid)) > 0
   from pg_catalog.pg_constraint c
   where c.conrelid = 'site_private.rate_limit_buckets'::regclass
     and c.conname = 'rate_limit_buckets_request_kind_check'),
  'constraint aceita os dois buckets de preflight'
);
select throws_ok(
  $$select public.preflight_site_lead_request('other', repeat('a', 64), 'request-123')$$,
  '22023', 'invalid_lead_preflight_input', 'kind inválido falha fechado'
);
select throws_ok(
  $$select public.preflight_site_lead_request('quote', 'raw-ip', 'request-123')$$,
  '22023', 'invalid_lead_preflight_input', 'IP em claro não entra no bucket'
);

select ok(public.preflight_site_lead_request('quote', repeat('b', 64), 'request-001'), 'primeira tentativa é aceita');
select ok(public.preflight_site_lead_request('quote', repeat('b', 64), 'request-002'), 'segunda tentativa é aceita');
select ok(public.preflight_site_lead_request('quote', repeat('b', 64), 'request-002'), 'retry idempotente também é aceito e limitado');
select is(
  (select request_count from site_private.rate_limit_buckets where request_kind = 'quote_preflight' and identifier_hash = repeat('b', 64)),
  3,
  'tentativas e retries compartilham bucket persistente por identificador'
);

select is(
  (select count(*)::integer from site_private.quote_requests where client_request_id = 'request-002'),
  0,
  'preflight não persiste solicitação nem usa existência prévia para liberar o catálogo'
);

select lives_ok(
  $$select public.preflight_site_lead_request('quote', repeat('c', 64), 'burst-' || lpad(value::text, 4, '0'))
    from generate_series(1, 8) value$$,
  'oito orçamentos entram na janela'
);
select throws_ok(
  $$select public.preflight_site_lead_request('quote', repeat('c', 64), 'burst-0999')$$,
  'P0001', 'rate_limit_exceeded', 'nona tentativa é bloqueada antes do catálogo'
);

select ok(
  (select bool_and(request_kind in ('quote_preflight', 'contact_preflight'))
   from site_private.rate_limit_buckets
   where identifier_hash in (repeat('b', 64), repeat('c', 64))),
  'preflight não consome os buckets transacionais finais'
);

-- Prova operacional do menor privilégio: não basta o catálogo declarar o
-- GRANT; a role usada pela API precisa atravessar a função de ponta a ponta.
grant usage on schema extensions to site_api;
grant execute on all functions in schema extensions to site_api;
set local role site_api;
select lives_ok(
  $$select public.preflight_site_lead_request('contact', repeat('d', 64), 'site-api-request-0001')$$,
  'site_api executa o preflight de ponta a ponta'
);
reset role;

select * from finish();
rollback;
