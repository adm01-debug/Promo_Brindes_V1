-- PF-34: auditoria de leitura (SELECT) de PII. A RPC get_my_quote_request, que
-- expõe as colunas de contato do titular autenticado, passa a registrar cada leitura
-- em site_private.pii_read_audit_log, sem armazenar o valor lido.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select plan(45);

-- A trilha é privada: só service_role lê; ninguém além do site grava.
select ok(not pg_catalog.has_table_privilege('anon', 'site_private.pii_read_audit_log', 'select'), 'anon não lê a trilha de leitura de PII');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.pii_read_audit_log', 'select'), 'authenticated não lê a trilha de leitura de PII');
select ok(not pg_catalog.has_table_privilege('site_api', 'site_private.pii_read_audit_log', 'select'), 'site_api não lê a trilha de leitura de PII (só grava via RPC)');
select ok(pg_catalog.has_table_privilege('service_role', 'site_private.pii_read_audit_log', 'select'), 'service_role lê a trilha de leitura de PII');

-- A função de log existe e é executável por authenticated (a RPC roda como o titular).
select ok(pg_catalog.has_function_privilege('authenticated', 'site_private.log_pii_read(text, uuid, integer, text, text)', 'execute'), 'authenticated executa log_pii_read');

-- A RPC pública continua exposta e com a mesma assinatura.
select ok(pg_catalog.has_function_privilege('authenticated', 'public.get_my_quote_request(uuid)', 'execute'), 'authenticated executa get_my_quote_request');
select ok(not pg_catalog.has_function_privilege('anon', 'public.get_my_quote_request(uuid)', 'execute'), 'anon não executa get_my_quote_request');

-- Setup: um titular autenticado e um pedido com PII associado a ele.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'titular@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

with inserted as (
  insert into site_private.quote_requests (
    client_request_id, request_hash, source, contact_name, company, email, phone,
    client_submitted_at, customer_user_id
  ) values (
    'pii-read-test-1', repeat('b', 64), 'site-promo-brindes',
    'Cliente PII', 'Empresa PII', 'titular@example.test', '11999998888', now(),
    '11111111-1111-4111-8111-111111111111'
  ) returning id
)
select set_config('pgtap.test_request_id', (select id::text from inserted), false);

select is(
  (select public.get_my_quote_request('00000000-0000-0000-0000-000000000000')),
  null::jsonb,
  'RPC devolve null para pedido inexistente e não audita'
);

select lives_ok(
  $$ select public.get_my_quote_request('00000000-0000-0000-0000-000000000000') $$,
  'RPC não lança para pedido inexistente do titular'
);

-- Leitura do próprio titular: resolve e audita exatamente 1 leitura.
select lives_ok(
  $$ select public.get_my_quote_request(current_setting('pgtap.test_request_id')::uuid) $$,
  'RPC lê o pedido do próprio titular'
);

-- O protocolo exibido no portal tem de ser o persistido (PB + 9 dígitos), nunca
-- o trecho do UUID que a Etapa 19 aposentou.
select matches(
  (select public.get_my_quote_request(current_setting('pgtap.test_request_id')::uuid) ->> 'protocol'),
  '^PB[0-9]{9}$',
  'portal devolve o protocolo persistido, não um trecho do UUID'
);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where table_name = 'quote_requests' and operation = 'SELECT'
     and subject = '11111111-1111-4111-8111-111111111111'::uuid),
  2::bigint,
  'RPC registra as 4 leituras (2 detalhe + 2 historico) de PII do titular'
);

-- === Historico do portal ====================================================
-- 2 leituras do detalhe + 2 do historico: o historico le company/protocol do
-- titular, entao precisa entrar na
-- trilha do PF-34 (migration 20261129100000).
select public.get_my_quote_requests(20, 0, null, null);
select public.get_my_quote_requests(20, 0, null, null);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where table_name = 'quote_requests' and operation = 'SELECT'
     and subject = '11111111-1111-4111-8111-111111111111'::uuid),
  4::bigint,
  'cada leitura do historico tambem entra na trilha'
);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where table_name = 'quote_requests' and performed_by = '11111111-1111-4111-8111-111111111111'
     and actor_kind = 'titular'),
  4::bigint,
  'a leitura do historico e atribuida ao titular autenticado'
);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where table_name = 'quote_requests' and row_count is not null),
  2::bigint,
  'cada leitura do historico registra quantos pedidos voltaram'
);

-- Leitura de outro titular: RLS devolve null e não audita.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'outro@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select is(
  (select public.get_my_quote_request(current_setting('pgtap.test_request_id')::uuid)),
  null::jsonb,
  'RPC devolve null para pedido de outro titular'
);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where table_name = 'quote_requests' and operation = 'SELECT'
     and subject = '11111111-1111-4111-8111-111111111111'::uuid),
  4::bigint,
  'Leitura do titular registra o subject dele nas 4 leituras'
);

-- Contagem global: nenhum registro indevido pode ter sido atribuído a outro titular.
-- A conta acima, sozinha, esconderia um registro criado para o segundo usuário.
select is(
  (select count(*) from site_private.pii_read_audit_log
   where table_name = 'quote_requests' and operation = 'SELECT'),
  4::bigint,
  'Nenhuma leitura indevida e atribuida a outro titular não gera nenhum registro de auditoria'
);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where subject = '22222222-2222-4222-8222-222222222222'::uuid),
  0::bigint,
  'o titular recusado nunca vira subject de auditoria'
);

-- === Leitura pelo back-office ==================================================

insert into site_private.commercial_operators (user_id, display_name, is_active)
values ('22222222-2222-4222-8222-222222222222', 'Operadora PII', true);

select is(
  (select count(*) from site_private.pii_read_audit_log where actor_kind = 'operador'),
  0::bigint,
  'nenhuma leitura de operador antes de o operador agir'
);

select is(
  (select bool_and(provolatile = 'v') from pg_catalog.pg_proc
   where proname in ('list_site_quote_requests', 'get_site_quote_request')
     and pronamespace = 'public'::regnamespace),
  true,
  'RPCs comerciais que auditam sao VOLATILE, nao STABLE (PostgREST abriria transacao read-only)'
);

select lives_ok(
  $$ select public.list_site_quote_requests(null, null, 10, 0) $$,
  'operador ativo consulta a fila comercial'
);

-- A busca aceita e-mail e telefone exatos: o termo livre nunca pode ir para a trilha.
-- Dois pedidos com o mesmo contato: assim o volume entregue (limite 1) diverge do
-- total casado (2), e a trilha precisa gravar o que saiu, nao o que casou.
insert into site_private.quote_requests (
  client_request_id, request_hash, source, contact_name, company, email, phone,
  client_submitted_at, customer_user_id
) values (
  'pii-read-test-2', repeat('c', 64), 'site-promo-brindes',
  'Cliente PII 2', 'Empresa PII', 'titular@example.test', '11999998888', now(),
  '11111111-1111-4111-8111-111111111111'
);

-- A mesma resposta e reusada: nenhuma chamada extra pode inflar a contagem da trilha.
create temp table pii_search_page on commit drop as
select public.list_site_quote_requests(null, 'titular@example.test', 1, 0) as page;

select is(
  (select (page ->> 'total')::integer from pii_search_page),
  2,
  'a busca por e-mail do titular casa os 2 pedidos, entregando 1'
);

select is(
  (select jsonb_array_length(page -> 'requests') from pii_search_page),
  1,
  'a pagina entregue traz exatamente 1 pedido, nao o total casado'
);

select is(
  (select row_count from site_private.pii_read_audit_log
   where actor_kind = 'operador' and filter like '%search%'
   order by occurred_at desc, id desc limit 1),
  1,
  'a trilha grava o volume entregue (1), nao o total casado (2)'
);

-- O volume da trilha tem de bater com o tamanho da pagina devolvida na mesma chamada.
select is(
  (select row_count from site_private.pii_read_audit_log
   where actor_kind = 'operador' and filter like '%search%'
   order by occurred_at desc, id desc limit 1),
  (select jsonb_array_length(page -> 'requests') from pii_search_page),
  'a linha de trilha e a pagina devolvida descrevem o mesmo volume (1 pedido)'
);

-- A trilha da busca tem de ser exatamente o status nulo + offset + marcador: nada do contato.
select is(
  (select filter from site_private.pii_read_audit_log
   where actor_kind = 'operador' and filter like '%search%'
   order by occurred_at desc, id desc limit 1),
  'offset=0 search',
  'o filtro auditado e exatamente offset=0 search, sem fragmento do e-mail'
);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where filter ilike '%titular@example.test%' or filter ilike '%11999998888%'),
  0::bigint,
  'o termo buscado (e-mail ou telefone) nunca e copiado para a trilha'
);

-- A busca por contato precisa ser auditada: provar que a leitura existe, sem o termo.
select is(
  (select count(*) from site_private.pii_read_audit_log
   where actor_kind = 'operador' and filter like '%search%'),
  1::bigint,
  'a busca por e-mail gerou registro de leitura com o marcador search, sem o valor'
);

-- O telefone e outro caminho de busca: precisa achar o pedido sem gravar o numero.
select is(
  (public.list_site_quote_requests(null, '11999998888', 10, 0) ->> 'total')::integer,
  2,
  'a busca por telefone do titular encontra os pedidos'
);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where filter ilike '%11999998888%'),
  0::bigint,
  'telefone buscado pelo operador nao e copiado para a trilha'
);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where actor_kind = 'operador' and filter like '%search%'),
  2::bigint,
  'as duas buscas por contato geraram registro de leitura com o marcador search'
);

-- A segunda busca (telefone) tambem tem de gravar o mesmo formato canonico.
select is(
  (select filter from site_private.pii_read_audit_log
   where actor_kind = 'operador' and filter like '%search%'
   order by occurred_at desc, id desc limit 1),
  'offset=0 search',
  'a busca por telefone audita o mesmo filtro canonico, sem o numero'
);

-- Busca sem resultado tambem registra a tentativa, com volume zero.
select lives_ok(
  $$ select public.list_site_quote_requests(null, 'nao-existe@example.test', 10, 0) $$,
  'operacao busca por e-mail inexistente sem falhar'
);

select is(
  (select row_count from site_private.pii_read_audit_log
   where actor_kind = 'operador' and filter like '%search%'
   order by occurred_at desc, id desc limit 1),
  0,
  'busca sem resultado registra a leitura com row_count = 0'
);

select is(
  (select filter from site_private.pii_read_audit_log
   where actor_kind = 'operador' and filter like '%search%'
   order by occurred_at desc, id desc limit 1),
  'offset=0 search',
  'busca sem resultado audita o mesmo filtro canonico, sem o termo'
);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where filter ilike '%nao-existe%'),
  0::bigint,
  'busca sem resultado tambem nao copia o termo para a trilha'
);

-- A consulta sem filtro e a unica dessa forma ate aqui: o marcador search fica de
-- fora, senao a busca adicionada acima entraria nesta contagem.
select is(
  (select count(*) from site_private.pii_read_audit_log
   where actor_kind = 'operador' and performed_by is not null
     and row_count >= 1 and filter is not null and filter not like '%search%'),
  1::bigint,
  'fila comercial registra 1 leitura de operador com volume e filtro'
);

select lives_ok(
  $$ select public.get_site_quote_request(current_setting('pgtap.test_request_id')::uuid) $$,
  'operador ativo abre o detalhe do orçamento'
);

select is(
  (select count(*) from site_private.pii_read_audit_log
   where actor_kind = 'operador' and filter = current_setting('pgtap.test_request_id')),
  1::bigint,
  'detalhe do back-office registra a leitura com o id do orçamento'
);

-- === Retenção ==================================================================
select throws_ok(
  $$ select public.purge_site_pii_read_audit_log(1, 100) $$,
  '22023', 'invalid_pii_read_retention_input',
  'purga recusa janela de retenção fora de 30..3650 dias'
);

select throws_ok(
  $$ select public.purge_site_pii_read_audit_log(400, 0) $$,
  '22023', 'invalid_pii_read_retention_input',
  'purga recusa lote fora de 1..5000'
);

select is(
  (select public.purge_site_pii_read_audit_log(400, 1000) ->> 'readsDeleted')::integer,
  0,
  'purga com janela válida preserva trilha recente'
);

update site_private.pii_read_audit_log set occurred_at = now() - interval '500 days';

select is(
  (select public.purge_site_pii_read_audit_log(400, 1000) ->> 'readsDeleted')::integer,
  (select count(*) from site_private.pii_read_audit_log)::integer,
  'purga remove toda a trilha mais antiga que a janela'
);

select is(
  (select count(*) from site_private.pii_read_audit_log),
  0::bigint,
  'trilha fica vazia depois da purga'
);

select * from finish();
rollback;
