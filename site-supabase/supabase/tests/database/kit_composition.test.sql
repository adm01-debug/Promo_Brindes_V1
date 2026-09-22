begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(13);

select has_column('site_private', 'quote_items', 'kit_group_id', 'item preserva o grupo do kit');
select has_column('site_private', 'quote_items', 'kit_name_snapshot', 'item preserva o nome do kit');
select has_column('site_private', 'quote_items', 'kit_quantity_snapshot', 'item preserva a quantidade de kits');
select has_column('site_private', 'quote_items', 'units_per_kit_snapshot', 'item preserva unidades por kit');
select ok(exists (select 1 from pg_catalog.pg_constraint
  where conrelid = 'site_private.quote_items'::regclass and conname = 'quote_items_kit_composition_check'),
  'banco protege a aritmética do kit');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'authenticated', 'authenticated', 'kit@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

create temporary table created_kit_quote as
select public.create_site_quote_request(
  jsonb_build_object(
    'source', 'site-promo-brindes', 'clientRequestId', 'kit-composition-0001', 'submittedAt', now(),
    'pageUrl', 'https://promo.test/montar-kit',
    'consent', jsonb_build_object('accepted', true, 'noticeVersion', '2026-09-08', 'acceptedAt', now()),
    'contact', jsonb_build_object('name', 'Cliente Kit', 'company', 'Empresa Kit', 'email', 'kit@example.test', 'phone', '(11) 99999-9999', 'city', '', 'deadline', '', 'notes', ''),
    'items', jsonb_build_array(
      jsonb_build_object('productId', '11111111-1111-4111-8111-111111111111', 'key', '11111111-1111-4111-8111-111111111111::sem-cor', 'slug', 'produto-a', 'name', 'Produto A', 'sku', 'KIT-A', 'imageUrl', '/a.png', 'quantity', 200, 'minQuantity', 100, 'kitGroupId', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'kitName', 'Kit Cultura', 'kitQuantity', 100, 'unitsPerKit', 2),
      jsonb_build_object('productId', '22222222-2222-4222-8222-222222222222', 'key', '22222222-2222-4222-8222-222222222222::sem-cor', 'slug', 'produto-b', 'name', 'Produto B', 'sku', 'KIT-B', 'imageUrl', '/b.png', 'quantity', 100, 'minQuantity', 50, 'kitGroupId', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'kitName', 'Kit Cultura', 'kitQuantity', 100, 'unitsPerKit', 1)
    )
  ),
  jsonb_build_object('requestHash', repeat('a', 64), 'identifierHash', repeat('b', 64))
) as result;

select ok((select result ->> 'requestId' from created_kit_quote) is not null, 'RPC aceita composição íntegra');
select is((select count(*) from site_private.quote_items item
  where item.quote_request_id = (select (result ->> 'requestId')::uuid from created_kit_quote)), 2::bigint, 'dois componentes são persistidos');
select is((select sum(item.kit_quantity_snapshot * item.units_per_kit_snapshot) from site_private.quote_items item
  where item.quote_request_id = (select (result ->> 'requestId')::uuid from created_kit_quote)), 300::bigint, 'snapshot preserva kits × unidades');

select throws_ok(
  $$ select public.create_site_quote_request(
    jsonb_build_object('source','site-promo-brindes','clientRequestId','kit-composition-bad1','submittedAt',now(),'pageUrl','https://promo.test/montar-kit','consent',jsonb_build_object('accepted',true,'noticeVersion','2026-09-08','acceptedAt',now()),'contact',jsonb_build_object('name','Cliente Kit','company','Empresa Kit','email','kit@example.test','phone','(11) 99999-9999','city','','deadline','','notes',''),'items',jsonb_build_array(jsonb_build_object('productId','11111111-1111-4111-8111-111111111111','key','11111111-1111-4111-8111-111111111111::sem-cor','slug','produto-a','name','Produto A','sku','KIT-A','imageUrl','/a.png','quantity',199,'minQuantity',100,'kitGroupId','cccccccc-cccc-4ccc-8ccc-cccccccccccc','kitName','Kit Cultura','kitQuantity',100,'unitsPerKit',2))),
    jsonb_build_object('requestHash',repeat('c',64),'identifierHash',repeat('d',64))) $$,
  '22023', 'invalid_kit_composition', 'RPC recusa aritmética adulterada');

select throws_ok(
  $$ select public.create_site_quote_request(
    jsonb_build_object('source','site-promo-brindes','clientRequestId','kit-composition-one1','submittedAt',now(),'pageUrl','https://promo.test/montar-kit','consent',jsonb_build_object('accepted',true,'noticeVersion','2026-09-08','acceptedAt',now()),'contact',jsonb_build_object('name','Cliente Kit','company','Empresa Kit','email','kit@example.test','phone','(11) 99999-9999','city','','deadline','','notes',''),'items',jsonb_build_array(jsonb_build_object('productId','11111111-1111-4111-8111-111111111111','key','11111111-1111-4111-8111-111111111111::sem-cor','slug','produto-a','name','Produto A','sku','KIT-A','imageUrl','/a.png','quantity',200,'minQuantity',100,'kitGroupId','cccccccc-cccc-4ccc-8ccc-cccccccccccc','kitName','Kit Cultura','kitQuantity',100,'unitsPerKit',2))),
    jsonb_build_object('requestHash',repeat('e',64),'identifierHash',repeat('f',64))) $$,
  '22023', 'invalid_kit_composition', 'RPC recusa kit com um único componente');

select throws_ok(
  $$ select public.create_site_quote_request(
    jsonb_build_object('source','site-promo-brindes','clientRequestId','kit-composition-mix1','submittedAt',now(),'pageUrl','https://promo.test/montar-kit','consent',jsonb_build_object('accepted',true,'noticeVersion','2026-09-08','acceptedAt',now()),'contact',jsonb_build_object('name','Cliente Kit','company','Empresa Kit','email','kit@example.test','phone','(11) 99999-9999','city','','deadline','','notes',''),'items',jsonb_build_array(jsonb_build_object('productId','11111111-1111-4111-8111-111111111111','key','11111111-1111-4111-8111-111111111111::sem-cor','slug','produto-a','name','Produto A','sku','KIT-A','imageUrl','/a.png','quantity',200,'minQuantity',100,'kitGroupId','cccccccc-cccc-4ccc-8ccc-cccccccccccc','kitName','Kit Cultura','kitQuantity',100,'unitsPerKit',2),jsonb_build_object('productId','22222222-2222-4222-8222-222222222222','key','22222222-2222-4222-8222-222222222222::sem-cor','slug','produto-b','name','Produto B','sku','KIT-B','imageUrl','/b.png','quantity',99,'minQuantity',50,'kitGroupId','cccccccc-cccc-4ccc-8ccc-cccccccccccc','kitName','Outro nome','kitQuantity',99,'unitsPerKit',1))),
    jsonb_build_object('requestHash',repeat('1',64),'identifierHash',repeat('2',64))) $$,
  '22023', 'invalid_kit_composition', 'RPC recusa componentes do mesmo grupo com metadados divergentes');

update site_private.quote_requests set customer_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
where id = (select (result ->> 'requestId')::uuid from created_kit_quote);
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
select is((public.get_my_quote_request((select (result ->> 'requestId')::uuid from created_kit_quote)) #>> '{items,0,kitName}'), 'Kit Cultura', 'histórico devolve a semântica do kit');

select is((public.save_my_selection('Kit salvo', jsonb_build_array(
  jsonb_build_object('id','11111111-1111-4111-8111-111111111111','q',200,'k','cccccccc-cccc-4ccc-8ccc-cccccccccccc','kn','Kit Cultura','kq',100,'ku',2),
  jsonb_build_object('id','22222222-2222-4222-8222-222222222222','q',100,'k','cccccccc-cccc-4ccc-8ccc-cccccccccccc','kn','Kit Cultura','kq',100,'ku',1)
)) ->> 'version')::integer, 1, 'rascunho sincronizado aceita a composição');

select * from finish();
rollback;
