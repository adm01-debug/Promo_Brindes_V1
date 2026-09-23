-- Limites anti-spam do pedido de ajuste: idempotência não consome quota, três
-- pendências no máximo e cinco novas solicitações por hora/titular/orçamento.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

select ok(
  pg_catalog.pg_get_functiondef('public.request_my_quote_adjustment(uuid,text,text)'::regprocedure)
    ~* 'for[[:space:]]+update',
  'limite de pendências serializa transações concorrentes no mesmo orçamento'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000', 'abababab-abab-4aba-8aba-abababababab',
  'authenticated', 'authenticated', 'limites@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);
insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, contact_name, company, email, phone,
  customer_user_id, client_submitted_at
) values (
  'cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'adjustment-limits-quote', repeat('7', 64),
  'site-promo-brindes', 'Cliente Limites', 'Empresa Limites', 'limites@example.test',
  '11999990000', 'abababab-abab-4aba-8aba-abababababab', now()
);
set local request.jwt.claims = '{"sub":"abababab-abab-4aba-8aba-abababababab","role":"authenticated"}';

create temporary table first_adjustment as
select public.request_my_quote_adjustment(
  'cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'Primeiro ajuste', 'adjustment-limit-001'
) as result;
select ok((select result ->> 'id' from first_adjustment) is not null, 'primeiro pedido é criado');
select is(
  public.request_my_quote_adjustment('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'Replay', 'adjustment-limit-001') ->> 'id',
  (select result ->> 'id' from first_adjustment),
  'replay idempotente devolve o mesmo pedido'
);
select is(
  (select count(*) from site_private.quote_adjustment_requests where quote_request_id = 'cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd'),
  1::bigint,
  'replay não duplica a linha'
);
select is(
  (select request_count from site_private.rate_limit_buckets where request_kind = 'adjustment'),
  1,
  'replay idempotente não consome quota adicional'
);

select lives_ok(
  $$ select public.request_my_quote_adjustment('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'Segundo ajuste', 'adjustment-limit-002') $$,
  'segundo pedido pendente é aceito'
);
select lives_ok(
  $$ select public.request_my_quote_adjustment('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'Terceiro ajuste', 'adjustment-limit-003') $$,
  'terceiro pedido pendente é aceito'
);
select throws_ok(
  $$ select public.request_my_quote_adjustment('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'Quarto pendente', 'adjustment-limit-004') $$,
  'P0001', 'too_many_pending_adjustments',
  'quarto pedido simultaneamente pendente é recusado'
);

update site_private.quote_adjustment_requests set status = 'resolved'
where quote_request_id = 'cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd';
select lives_ok(
  $$ select public.request_my_quote_adjustment('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'Quarto válido', 'adjustment-limit-004') $$,
  'novo pedido após resolver pendências consome a quarta vaga da janela'
);
select lives_ok(
  $$ select public.request_my_quote_adjustment('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'Quinto válido', 'adjustment-limit-005') $$,
  'quinto pedido da janela ainda é aceito'
);
select throws_ok(
  $$ select public.request_my_quote_adjustment('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'Sexto na janela', 'adjustment-limit-006') $$,
  'P0001', 'rate_limit_exceeded',
  'sexta criação dentro de uma hora é recusada atomicamente'
);

select * from finish();
rollback;
