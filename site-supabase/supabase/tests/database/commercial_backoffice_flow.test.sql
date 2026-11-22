-- F-03: back-office minimo — verificacao funcional das RPCs com dados reais.
--
-- O teste comercial_backoffice.test.sql cobre estrutura, privilegios e recusa de
-- chamador nao autenticado. Este cobre o CAMINHO FELIZ e as regras de negocio:
-- um operador cadastrado precisa conseguir listar, mudar status, publicar
-- proposta versionada e responder ajuste, respeitando a maquina de estados e
-- deixando trilha.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(47);

-- === Fixtures ====================================================================

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operador@promobrindes.com.br', crypt('senha-de-teste', gen_salt('bf')), now(), now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente@alfa.com.br', crypt('senha-de-teste', gen_salt('bf')), now(), now(), now());

insert into site_private.commercial_operators (user_id, display_name)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Comercial PB');

insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, status, contact_name, company, email, phone,
  city, desired_deadline, notes, client_submitted_at
) values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'f03-test-request', repeat('a', 64), 'site-promo-brindes',
  'new', 'Ana Souza', 'Metalurgica Alfa', 'cliente@alfa.com.br', '11999998888',
  'Sao Paulo', '2026-12-01', 'Logo em uma cor', now()
);

insert into site_private.quote_items (
  quote_request_id, position, source_product_id, item_key, product_slug, product_name_snapshot,
  sku_snapshot, quantity, minimum_quantity_snapshot
) values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc::sem-cor', 'garrafa-termica', 'Garrafa termica',
  'PB-100', 100, 50
);

-- O detalhe precisa devolver o protocolo persistido (Etapa 19), nao derivado do UUID.
select matches(
  (select protocol from site_private.quote_requests where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  '^PB[0-9]{8}[0-9]$',
  'pedido de teste recebeu protocolo persistido no insert'
);

-- === Operador ativo consegue operar ==============================================

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select is(
  (select count(*) from pg_catalog.jsonb_array_elements(public.list_site_quote_requests(null, null, 10, 0) -> 'requests')),
  1::bigint,
  'operador ativo lista a fila'
);

select is(
  public.list_site_quote_requests(null, null, 10, 0) ->> 'operator',
  'Comercial PB',
  'fila identifica o operador que esta consultando'
);

select is(
  (public.list_site_quote_requests('new', null, 10, 0) -> 'requests') -> 0 ->> 'itemCount',
  '1',
  'fila informa a quantidade de itens do pedido'
);

select is(
  (public.list_site_quote_requests(null, 'Metalurgica', 10, 0) ->> 'total'),
  '1',
  'busca por empresa encontra o pedido'
);

select is(
  (public.list_site_quote_requests(null, 'INEXISTENTE-XYZ', 10, 0) ->> 'total'),
  '0',
  'busca sem correspondencia devolve fila vazia'
);

-- O protocolo (Etapa 19) e o identificador que o cliente cita no telefone; a busca
-- precisa encontra-lo mesmo sem o operador saber o UUID.
select is(
  (public.list_site_quote_requests(null,
    (select protocol from site_private.quote_requests where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
    10, 0) ->> 'total'),
  '1',
  'busca pelo protocolo encontra o pedido'
);

select is(
  (public.list_site_quote_requests(null, lower(
    (select protocol from site_private.quote_requests where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')),
    10, 0) ->> 'total'),
  '1',
  'busca pelo protocolo em minusculas tambem encontra'
);

-- O cliente ve o protocolo com '#' na Area do Cliente e vai citar exatamente
-- esse texto no telefone. Colar o codigo com o prefixo precisa funcionar.
select is(
  (public.list_site_quote_requests(null, '#'
    || (select protocol from site_private.quote_requests where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
    10, 0) ->> 'total'),
  '1',
  'busca pelo protocolo com # encontra o pedido'
);

select is(
  (public.list_site_quote_requests(null, ' #'
    || (select protocol from site_private.quote_requests where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    || ' ', 10, 0) ->> 'total'),
  '1',
  'busca tolera # e espacos ao redor do protocolo'
);

select is(
  public.get_site_quote_request('cccccccc-cccc-4ccc-8ccc-cccccccccccc') ->> 'protocol',
  (select protocol from site_private.quote_requests where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  'detalhe expoe o protocolo persistido'
);

select is(
  jsonb_array_length(public.get_site_quote_request('cccccccc-cccc-4ccc-8ccc-cccccccccccc') -> 'items'),
  1,
  'detalhe lista os itens'
);

-- new -> triaged e uma transicao valida da state machine.
select lives_ok(
  $$select public.update_site_quote_status('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'triaged')$$,
  'operador muda new para triaged'
);

select is(
  (select status from site_private.quote_requests where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  'triaged',
  'status persistido no banco'
);

-- closed nao e alcancavel a partir de triaged: nao existe essa linha em status_transitions.
select throws_ok(
  $$select public.update_site_quote_status('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'new')$$,
  '22023', null,
  'transicao inversa triaged -> new e recusada'
);

select is(
  (select count(*) from site_private.commercial_audit_log where action = 'status_changed'),
  1::bigint,
  'mudanca de status deixa exatamente uma linha de auditoria'
);

select is(
  (select detail ->> 'from' from site_private.commercial_audit_log where action = 'status_changed'),
  'new',
  'auditoria registra o status anterior'
);

-- === Publicacao de proposta ======================================================

-- Ainda nao esta em in_progress: a RPC precisa recusar com mensagem propria.
select throws_ok(
  $$select public.publish_site_quote_proposal('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Proposta PB', 'x/proposta.pdf', null)$$,
  '22023', null,
  'publicar proposta exige o pedido em curadoria'
);

select lives_ok(
  $$select public.update_site_quote_status('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'in_progress')$$,
  'operador move triaged para in_progress'
);

-- 'quoted' promete uma proposta no portal; so publish_site_quote_proposal chega la.
select is(
  public.get_site_quote_request('cccccccc-cccc-4ccc-8ccc-cccccccccccc') -> 'allowedStatuses' ? 'quoted',
  false,
  'quoted nao aparece como mudanca avulsa de estagio'
);

select throws_ok(
  $$select public.update_site_quote_status('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'quoted')$$,
  '22023', 'quoted_requires_proposal_publication',
  'mudanca avulsa para quoted e recusada mesmo sendo transicao valida'
);

-- Caminho invalido faria o cliente falhar no clique, depois do pedido ja anunciar
-- a proposta: a validacao acontece na publicacao.
-- '..' so sobe de pasta quando ocupa o segmento inteiro: dentro do nome do
-- arquivo e apenas parte do nome. O download aceita 'proposta..v2.pdf', entao a
-- publicacao nao pode recusar (o comercial nao deveria renomear o PDF).
select is(
  site_private.is_valid_proposal_storage_path('cliente/proposta..v2.pdf'),
  true,
  'caminho com dois pontos dentro do nome do arquivo e aceito'
);

select is(
  site_private.is_valid_proposal_storage_path('cliente/../outro.pdf'),
  false,
  'caminho com segmento de navegacao .. e recusado'
);

select is(
  site_private.is_valid_proposal_storage_path('/cliente/proposta.pdf'),
  false,
  'caminho com barra inicial e recusado'
);

select is(
  site_private.is_valid_proposal_storage_path('cliente//proposta.pdf'),
  false,
  'caminho com segmento vazio e recusado'
);

select throws_ok(
  $$select public.publish_site_quote_proposal('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Proposta', 'ccc/proposta-v1.txt', null)$$,
  '22023', 'invalid_storage_path',
  'publicar recusa caminho que nao termina em .pdf'
);

select throws_ok(
  $$select public.publish_site_quote_proposal('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Proposta', 'ccc/../outro.pdf', null)$$,
  '22023', 'invalid_storage_path',
  'publicar recusa caminho com ..'
);

select lives_ok(
  $$select public.publish_site_quote_proposal('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Proposta v1', 'ccc/proposta-v1.pdf', '2026-12-15')$$,
  'publicar proposta em in_progress funciona'
);

-- O trigger ja anuncia a proposta ao cliente; o evento interno extra nao pode
-- duplicar o anuncio nem copiar o titulo livre (LGPD, F-31).
select is(
  (select count(*) from site_private.quote_request_events
   where quote_request_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
     and audience = 'customer' and title = 'Proposta disponível'),
  1::bigint,
  'cliente recebe exatamente um anuncio de proposta disponivel'
);

select is(
  (select description from site_private.quote_request_events
   where quote_request_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
     and event_type = 'proposal_published'),
  'Versao 1 publicada pelo comercial.',
  'evento interno nao copia o titulo livre da proposta'
);

select is(
  (select status from site_private.quote_requests where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  'quoted',
  'publicar proposta move o pedido para quoted'
);

select is(
  (select version from site_private.proposal_documents where quote_request_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  1,
  'primeira proposta recebe versao 1'
);

select lives_ok(
  $$select public.update_site_quote_status('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'in_progress')$$,
  'operador reabre quoted para in_progress para revisar'
);

select lives_ok(
  $$select public.publish_site_quote_proposal('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Proposta v2', 'ccc/proposta-v2.pdf', null)$$,
  'segunda proposta e publicada'
);

select is(
  (select count(*) from site_private.proposal_documents
   where quote_request_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' and superseded_at is null),
  1::bigint,
  'apenas a versao nova fica vigente'
);

select is(
  (select count(*) from site_private.proposal_documents
   where quote_request_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  2::bigint,
  'a versao anterior e preservada no historico (F-23)'
);

select is(
  (select version from site_private.proposal_documents
   where quote_request_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' and superseded_at is null),
  2,
  'a versao vigente e a 2'
);

-- p_valid_until tem default null: omitir o argumento nao pode gerar erro nem
-- uma data inventada (a UI envia undefined quando o operador deixa em branco).
select lives_ok(
  $$select public.update_site_quote_status('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'in_progress')$$,
  'operador reabre quoted para in_progress pela terceira vez'
);

select lives_ok(
  $$select public.publish_site_quote_proposal('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Proposta v3', 'ccc/proposta-v3.pdf')$$,
  'publicar omitindo a validade usa o default da assinatura'
);

select ok(
  (select valid_until is null from site_private.proposal_documents
   where quote_request_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' and version = 3),
  'validade omitida fica nula, sem prazo inventado'
);

-- === Ajuste =======================================================================

insert into site_private.quote_adjustment_requests (
  id, quote_request_id, requested_by, client_request_id, message, status
) values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'f03-ajuste-1', 'Trocar a cor para azul', 'new'
);

select lives_ok(
  $$select public.reply_site_quote_adjustment('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Ajuste aplicado na v2.', 'resolved')$$,
  'operador responde o ajuste'
);

select is(
  (select status from site_private.quote_adjustment_requests where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
  'resolved',
  'ajuste fica com o estado informado'
);

select is(
  (select detail ->> 'response' from site_private.commercial_audit_log where action = 'adjustment_replied'),
  'Ajuste aplicado na v2.',
  'texto da resposta e registrado na trilha'
);

select is(
  (select count(*) from site_private.commercial_audit_log),
  8::bigint,
  'trilha acumula as escritas feitas pelo back-office (5 mudancas de status, 3 propostas e 1 ajuste)'
);

-- === Quem nao e operador nao opera ================================================

set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';

select throws_ok(
  $$select public.list_site_quote_requests()$$,
  '42501', null,
  'cliente autenticado sem allowlist nao lista a fila'
);

select throws_ok(
  $$select public.update_site_quote_status('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'closed')$$,
  '42501', null,
  'cliente autenticado sem allowlist nao muda status'
);

-- Desativar o operador revoga o acesso sem apagar o historico.
update site_private.commercial_operators set is_active = false
where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select throws_ok(
  $$select public.list_site_quote_requests()$$,
  '42501', null,
  'operador desativado perde o acesso imediatamente'
);

select * from finish();
rollback;