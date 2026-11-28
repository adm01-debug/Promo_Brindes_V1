-- NOVO-FE-10: o kit montado precisa chegar ao cliente depois do envio.
--
-- O banco ja guardava a composicao desde 20260922160000, mas as duas RPCs do
-- portal do cliente entregavam o item sem nenhum campo de kit. Aqui se prova o
-- contrato: detalhe com kitGroupId/kitName/kitQuantity/unitsPerKit, sem perder o
-- que ja existia no historico (nome, quantidade, totalUnits) e sem vazar o kit
-- de outro titular. O historico entrega os nomes dos componentes em
-- productNames, nao um campo de kit proprio. A ultima assercao e a guarda de
-- regressao do PF-34: quem reescrever get_my_quote_request nao pode soltar o
-- log_pii_read pelo caminho.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(15);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'c1c1c1c1-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'kit-ana@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd2d2d2d2-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'kit-bia@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, status, contact_name, company, email, phone,
  client_submitted_at, protocol, customer_user_id
) values
  ('e3e3e3e3-3333-4333-8333-333333333333', 'kit-request-ana', repeat('a', 64), 'site-promo-brindes', 'new',
   'Ana', 'Marca Ana', 'kit-ana@example.test', '11999999999', now(), 'PB000009001',
   'c1c1c1c1-1111-4111-8111-111111111111'),
  ('f4f4f4f4-4444-4444-8444-444444444444', 'kit-request-bia', repeat('b', 64), 'site-promo-brindes', 'new',
   'Bia', 'Marca Bia', 'kit-bia@example.test', '11999999998', now(), 'PB000009002',
   'd2d2d2d2-2222-4222-8222-222222222222');

-- Dois componentes do MESMO kit (Kit Conexao, 100 kits de 2 un. cada = 200 un.)
-- mais um produto avulso, para provar que o avulso continua sem campos de kit.
insert into site_private.quote_items (
  id, quote_request_id, position, source_product_id, item_key, product_slug,
  product_name_snapshot, sku_snapshot, quantity, minimum_quantity_snapshot,
  decision_group_snapshot, kit_group_id, kit_name_snapshot, kit_quantity_snapshot, units_per_kit_snapshot
) values
  (gen_random_uuid(), 'e3e3e3e3-3333-4333-8333-333333333333', 1, 'prod-0001', 'prod-0001::sem-cor', 'caneca',
   'Caneca', 'CA-01', 200, 100, 'primary', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Kit Conexao', 100, 2),
  (gen_random_uuid(), 'e3e3e3e3-3333-4333-8333-333333333333', 2, 'prod-0002', 'prod-0002::sem-cor', 'garrafa',
   'Garrafa', 'GA-02', 200, 100, 'primary', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Kit Conexao', 100, 2),
  (gen_random_uuid(), 'e3e3e3e3-3333-4333-8333-333333333333', 3, 'prod-0003', 'prod-0003::sem-cor', 'caderno',
   'Caderno', 'CD-03', 150, 50, 'primary', null, null, null, null),
  (gen_random_uuid(), 'f4f4f4f4-4444-4444-8444-444444444444', 1, 'prod-0009', 'prod-0009::sem-cor', 'porta-caneta',
   'Porta-caneta', 'PC-09', 60, 30, 'primary', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Kit Bia', 60, 1);

set local request.jwt.claims = '{"sub":"c1c1c1c1-1111-4111-8111-111111111111","role":"authenticated"}';

create temporary table kit_detail as
select public.get_my_quote_request('e3e3e3e3-3333-4333-8333-333333333333') as body;

select is(jsonb_array_length((select body -> 'items' from kit_detail)), 3, 'detalhe devolve os 3 itens da selecao');
select is(
  (select body -> 'items' -> 0 ->> 'kitGroupId' from kit_detail),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'detalhe entrega o identificador do kit no primeiro componente'
);
select is((select body -> 'items' -> 0 ->> 'kitName' from kit_detail), 'Kit Conexao', 'detalhe entrega o nome do kit');
select is((select body -> 'items' -> 0 ->> 'kitQuantity' from kit_detail), '100', 'detalhe entrega quantos kits foram pedidos');
select is((select body -> 'items' -> 0 ->> 'unitsPerKit' from kit_detail), '2', 'detalhe entrega as unidades por kit');
select is(
  (select body -> 'items' -> 1 ->> 'kitName' from kit_detail),
  'Kit Conexao',
  'o segundo componente carrega o mesmo kit'
);
select is(
  (select body -> 'items' -> 2 ->> 'kitGroupId' from kit_detail),
  null,
  'produto fora do kit continua sem identificador de kit'
);
select is((select body -> 'items' -> 2 ->> 'name' from kit_detail), 'Caderno', 'o item avulso nao perde o nome');

select is(
  (select public.get_my_quote_request('f4f4f4f4-4444-4444-8444-444444444444')),
  null,
  'o detalhe do pedido de outro titular continua invisivel'
);

create temporary table kit_history as
select public.get_my_quote_requests(20, 0, null, null) as body;

select is((select body ->> 'total' from kit_history), '1', 'historico so conta o pedido do proprio titular');
select is(
  (select count(*) from site_private.quote_items item
   join site_private.quote_requests request on request.id = item.quote_request_id
   where request.customer_user_id = 'c1c1c1c1-1111-4111-8111-111111111111'
     and item.kit_group_id is not null),
  2::bigint,
  'historico continua guardando a composicao do kit que o detalhe entrega'
);
select is(
  (select body -> 'items' -> 0 -> 'productNames' from kit_history),
  '["Caneca", "Garrafa", "Caderno"]'::jsonb,
  'historico continua entregando todos os nomes de produto'
);
select is((select body -> 'items' -> 0 ->> 'totalUnits' from kit_history), '550', 'totalUnits soma os componentes do kit e o avulso');

set local request.jwt.claims = '{"sub":"d2d2d2d2-2222-4222-8222-222222222222","role":"authenticated"}';
select is(
  (select public.get_my_quote_requests(20, 0, null, null) -> 'items' -> 0 -> 'productNames'),
  '["Porta-caneta"]'::jsonb,
  'o segundo titular ve os proprios itens e nao os do primeiro'
);
select is(
  (select count(*) from site_private.pii_read_audit_log log
   where log.subject = 'c1c1c1c1-1111-4111-8111-111111111111'
     and log.table_name = 'quote_requests'),
  1::bigint,
  'a leitura do detalhe continua registrada na auditoria de PII'
);

select * from finish();
rollback;
