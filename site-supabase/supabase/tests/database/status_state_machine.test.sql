-- Etapas 7 e 8 do plano de correções: sequência monotônica dos eventos do pedido e
-- máquina de estados administrativa de quote_requests/contact_requests.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(19);

-- === Etapa 7: sequência monotônica =================================================

select has_column('site_private', 'quote_request_events', 'sequence', 'eventos têm coluna de ordem monotônica');
select col_is_unique('site_private', 'quote_request_events', array['sequence'], 'sequence é única (identity)');

insert into site_private.quote_requests (
  client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at
) values (
  'status-machine-quote-1', repeat('a', 64), 'site-promo-brindes',
  'Cliente Máquina', 'Empresa Máquina', 'maquina@example.test', '(11) 98888-7777', now()
);

-- Duas linhas inseridas na mesma transação (mesmo created_at possível): sequence
-- desempata de forma determinística mesmo que created_at empate.
insert into site_private.quote_request_events (quote_request_id, event_type, title, audience)
select id, 'message', 'Primeira mensagem', 'customer' from site_private.quote_requests
where client_request_id = 'status-machine-quote-1';

insert into site_private.quote_request_events (quote_request_id, event_type, title, audience)
select id, 'message', 'Segunda mensagem', 'customer' from site_private.quote_requests
where client_request_id = 'status-machine-quote-1';

select ok(
  (select min(sequence) from site_private.quote_request_events
   where quote_request_id = (select id from site_private.quote_requests where client_request_id = 'status-machine-quote-1')
     and title = 'Primeira mensagem')
  <
  (select min(sequence) from site_private.quote_request_events
   where quote_request_id = (select id from site_private.quote_requests where client_request_id = 'status-machine-quote-1')
     and title = 'Segunda mensagem'),
  'sequence preserva a ordem de inserção independentemente de created_at'
);

-- === Etapa 8: máquina de estados de quote_requests =================================

select has_table('site_private', 'status_transitions', 'tabela de transições existe');
select has_trigger('site_private', 'quote_requests', 'quote_requests_enforce_status_transition', 'quote_requests valida transição de status');
select has_trigger('site_private', 'contact_requests', 'contact_requests_enforce_status_transition', 'contact_requests valida transição de status');

select lives_ok(
  $$ update site_private.quote_requests set status = 'triaged' where client_request_id = 'status-machine-quote-1' $$,
  'new -> triaged é permitida'
);
select lives_ok(
  $$ update site_private.quote_requests set status = 'in_progress' where client_request_id = 'status-machine-quote-1' $$,
  'triaged -> in_progress é permitida'
);
select lives_ok(
  $$ update site_private.quote_requests set status = 'quoted' where client_request_id = 'status-machine-quote-1' $$,
  'in_progress -> quoted é permitida'
);
select lives_ok(
  $$ update site_private.quote_requests set status = 'closed' where client_request_id = 'status-machine-quote-1' $$,
  'quoted -> closed é permitida'
);
select throws_like(
  $$ update site_private.quote_requests set status = 'in_progress' where client_request_id = 'status-machine-quote-1' $$,
  '%invalid_status_transition%',
  'closed é terminal: closed -> in_progress é rejeitada'
);

insert into site_private.quote_requests (
  client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at
) values (
  'status-machine-quote-2', repeat('b', 64), 'site-promo-brindes',
  'Cliente Máquina 2', 'Empresa Máquina 2', 'maquina2@example.test', '(11) 97777-6666', now()
);
select throws_like(
  $$ update site_private.quote_requests set status = 'quoted' where client_request_id = 'status-machine-quote-2' $$,
  '%invalid_status_transition%',
  'new -> quoted (pulando triaged/in_progress) é rejeitada'
);
select lives_ok(
  $$ update site_private.quote_requests set status = 'new' where client_request_id = 'status-machine-quote-2' $$,
  'update que não muda o status (new -> new) é sempre permitido'
);
select lives_ok(
  $$ update site_private.quote_requests set status = 'spam' where client_request_id = 'status-machine-quote-2' $$,
  'new -> spam é permitida (moderação)'
);
select throws_like(
  $$ update site_private.quote_requests set status = 'triaged' where client_request_id = 'status-machine-quote-2' $$,
  '%invalid_status_transition%',
  'spam é terminal: spam -> triaged é rejeitada'
);

-- === Etapa 8: mesma máquina de estados em contact_requests ==========================

insert into site_private.contact_requests (
  client_request_id, request_hash, source, contact_name, email, client_submitted_at
) values (
  'status-machine-contact-1', repeat('c', 64), 'site-promo-brindes-contact',
  'Cliente Contato', 'contato@example.test', now()
);
select lives_ok(
  $$ update site_private.contact_requests set status = 'triaged' where client_request_id = 'status-machine-contact-1' $$,
  'contact_requests: new -> triaged é permitida'
);
select throws_like(
  $$ update site_private.contact_requests set status = 'quoted' where client_request_id = 'status-machine-contact-1' $$,
  '%invalid_status_transition%',
  'contact_requests não tem status quoted: rejeitado por valor (check), não chega a validar transição'
);

-- Ninguém além do backend enxerga a tabela de política de transições.
select ok(not pg_catalog.has_table_privilege('anon', 'site_private.status_transitions', 'select'), 'anon não lê as transições permitidas');
select ok(not pg_catalog.has_table_privilege('authenticated', 'site_private.status_transitions', 'select'), 'authenticated não lê as transições permitidas');

select * from finish();
rollback;
