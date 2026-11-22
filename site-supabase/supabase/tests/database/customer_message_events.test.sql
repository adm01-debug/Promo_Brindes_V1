-- F-05: mensagem da equipe ao cliente na linha do tempo.
--
-- Cobre o produtor do evento 'message' (resposta ao ajuste), o truncamento em 500
-- caracteres imposto pelo check da coluna, a leitura pelo portal do titular e a
-- anonimizacao desse texto livre no apagamento (F-31/F-30).

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(24);

-- === Fixtures ====================================================================

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'equipe-f05@promobrindes.com.br', crypt('senha-de-teste', gen_salt('bf')), now(), now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'titular-f05@exemplo.com.br', crypt('senha-de-teste', gen_salt('bf')), now(), now(), now());

insert into site_private.commercial_operators (user_id, display_name)
values ('11111111-1111-4111-8111-111111111111', 'Comercial F05');

insert into site_private.quote_requests (
  id, client_request_id, request_hash, source, status, contact_name, company, email, phone,
  city, desired_deadline, notes, client_submitted_at, customer_user_id
) values (
  '33333333-3333-4333-8333-333333333333', 'f05-mensagem-1', repeat('b', 64), 'site-promo-brindes',
  'new', 'Marina Lopes', 'Lopes Presentes', 'titular-f05@exemplo.com.br', '11988887777',
  'Campinas', '2026-12-20', 'Canecas com a marca', now(), '22222222-2222-4222-8222-222222222222'
);

insert into site_private.quote_adjustment_requests (
  id, quote_request_id, requested_by, client_request_id, message, status
) values
  ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333',
   '22222222-2222-4222-8222-222222222222', 'f05-ajuste-curto', 'Trocar a cor para verde', 'new'),
  ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333',
   '22222222-2222-4222-8222-222222222222', 'f05-ajuste-longo', 'Pedir prazo menor', 'new');

-- === 1. O canal existe e o evento e produzido =====================================

select ok(
  (select pg_get_constraintdef(oid) like '%message%'
   from pg_constraint
   where conrelid = 'site_private.quote_request_events'::regclass
     and conname = 'quote_request_events_event_type_check'),
  'check de event_type aceita message'
);

set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select lives_ok(
  $$select public.reply_site_quote_adjustment('44444444-4444-4444-8444-444444444444', 'Cor alterada para verde na proposta v2.', 'resolved')$$,
  'operador responde o ajuste'
);

select is(
  (select count(*) from site_private.quote_request_events
   where quote_request_id = '33333333-3333-4333-8333-333333333333'
     and event_type = 'message'),
  1::bigint,
  'a resposta produziu exatamente um evento de mensagem'
);

select is(
  (select title from site_private.quote_request_events
   where quote_request_id = '33333333-3333-4333-8333-333333333333' and event_type = 'message'),
  'Resposta da equipe ao seu ajuste',
  'o titulo da mensagem e fixo, sem copiar o texto do cliente'
);

select is(
  (select audience from site_private.quote_request_events
   where quote_request_id = '33333333-3333-4333-8333-333333333333' and event_type = 'message'),
  'customer',
  'a mensagem e direcionada ao cliente'
);

select is(
  (select description from site_private.quote_request_events
   where quote_request_id = '33333333-3333-4333-8333-333333333333' and event_type = 'message'),
  'Cor alterada para verde na proposta v2.',
  'a descricao carrega o texto escrito pelo operador'
);

select is(
  (select status from site_private.quote_adjustment_requests where id = '44444444-4444-4444-8444-444444444444'),
  'resolved',
  'o ajuste continua mudando de estado'
);

select is(
  (select detail ->> 'response' from site_private.commercial_audit_log
   where action = 'adjustment_replied' and detail ->> 'adjustmentId' = '44444444-4444-4444-8444-444444444444'),
  'Cor alterada para verde na proposta v2.',
  'a trilha interna permanece com o texto'
);

-- === 2. Texto acima do limite da linha do tempo e recusado, nao cortado ===========

-- 600 caracteres: acima do limite de 500 da coluna e do maxLength do formulario.
-- Cortar em left() entregava ao cliente o inicio da resposta sem a condicao que
-- costuma vir no fim ("a nova data vale se o layout for aprovado ate sexta").
-- O cliente recebia texto incompleto e a equipe via o ajuste como resolvido.
select throws_ok(
  $$select public.reply_site_quote_adjustment(
      '55555555-5555-4555-8555-555555555555',
      repeat('detalhe ', 75),
      'triaged'
    )$$,
  '22023',
  'response_too_long',
  'resposta acima de 500 caracteres e recusada em vez de truncada'
);

select is(
  (select count(*)::integer from site_private.quote_request_events
   where quote_request_id = '33333333-3333-4333-8333-333333333333'
     and event_type = 'message'),
  1,
  'a resposta recusada nao cria mensagem parcial na linha do tempo'
);

select is(
  (select count(*)::integer from site_private.commercial_audit_log
   where action = 'adjustment_replied' and detail ->> 'adjustmentId' = '55555555-5555-4555-8555-555555555555'),
  0,
  'a resposta recusada tambem nao entra na trilha interna'
);

-- Exatamente no limite: 500 caracteres entram integralmente, sem corte.
select lives_ok(
  $$select public.reply_site_quote_adjustment(
      '55555555-5555-4555-8555-555555555555',
      rpad('limite', 500, '.'),
      'resolved'
    )$$,
  'resposta com exatamente 500 caracteres e aceita'
);

select is(
  (select length(description) from site_private.quote_request_events
   where quote_request_id = '33333333-3333-4333-8333-333333333333'
     and event_type = 'message' and description like 'limite%'),
  500,
  'o cliente recebe os 500 caracteres integrais'
);

select is(
  (select detail ->> 'response' from site_private.commercial_audit_log
   where action = 'adjustment_replied' and detail ->> 'adjustmentId' = '55555555-5555-4555-8555-555555555555'),
  rpad('limite', 500, '.'),
  'a trilha interna guarda o mesmo texto que o cliente recebeu'
);

-- === 3. O titular enxerga a mensagem no portal ====================================

set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';

select ok(
  jsonb_path_exists(
    public.get_my_quote_request('33333333-3333-4333-8333-333333333333') -> 'events',
    '$[*] ? (@.type == "message" && @.title == "Resposta da equipe ao seu ajuste")'
  ),
  'o titular recebe a mensagem na linha do tempo'
);

select is(
  (public.get_my_quote_request('33333333-3333-4333-8333-333333333333') #>> '{events,0,title}'),
  'Resposta da equipe ao seu ajuste',
  'a mensagem mais recente aparece no topo da linha do tempo'
);

-- Evento interno com titulo distinto: a checagem anterior procurava o campo
-- 'audience', que get_my_quote_request nem devolve, entao passava mesmo que o
-- portal expusesse a linha interna (os dois lados eram null).
insert into site_private.quote_request_events (quote_request_id, event_type, title, description, audience)
values (
  '33333333-3333-4333-8333-333333333333', 'status_changed',
  'NOTA INTERNA: negociacao de desconto', 'nao deve sair do back-office', 'internal'
);

select ok(
  not jsonb_path_exists(
    public.get_my_quote_request('33333333-3333-4333-8333-333333333333') -> 'events',
    '$[*] ? (@.title == "NOTA INTERNA: negociacao de desconto")'
  ),
  'o portal nao expoe evento de audiencia interna'
);

select is(
  (select count(*)::integer
   from jsonb_array_elements(public.get_my_quote_request('33333333-3333-4333-8333-333333333333') -> 'events') item
   where item ->> 'title' = 'NOTA INTERNA: negociacao de desconto'),
  0,
  'o texto da nota interna nao aparece na linha do tempo do titular'
);

-- === 3b. A exportacao do titular entrega o texto da mensagem ======================

select ok(
  jsonb_path_exists(
    public.export_my_data() -> 'quotes',
    '$[*].events[*] ? (@.type == "message" && @.description == "Cor alterada para verde na proposta v2.")'
  ),
  'Baixar meus dados inclui o texto da mensagem, nao so o titulo'
);

select ok(
  not jsonb_path_exists(
    public.export_my_data() -> 'quotes',
    '$[*].events[*] ? (@.title == "NOTA INTERNA: negociacao de desconto")'
  ),
  'a exportacao tambem nao vaza o evento interno'
);

-- === 4. O apagamento alcanca a mensagem ===========================================

set local request.jwt.claims = '';

create temp table f05_erasure as
select public.erase_customer_data('titular-f05@exemplo.com.br') as result;

select is(
  (select (result ->> 'messagesAnonymized')::integer from f05_erasure),
  2,
  'o apagamento conta as duas mensagens anonimizadas'
);

select is(
  (select count(*) from site_private.quote_request_events
   where quote_request_id = '33333333-3333-4333-8333-333333333333'
     and event_type = 'message'
     and description = '[apagado a pedido do titular]'),
  2::bigint,
  'nenhuma mensagem com texto livre sobrevive ao apagamento'
);

select is(
  (select count(*) from site_private.quote_request_events
   where quote_request_id = '33333333-3333-4333-8333-333333333333'
     and event_type in ('received', 'status_changed')
     -- a nota interna criada acima tambem e status_changed; o assert fala dos
     -- eventos que o titular ve, entao restringe a audiencia.
     and audience = 'customer'),
  1::bigint,
  'os eventos de estado, que nao tem texto livre, sao preservados'
);

create temp table f05_erasure_2 as
select public.erase_customer_data('titular-f05@exemplo.com.br') as result;

select is(
  (select (result ->> 'messagesAnonymized')::integer from f05_erasure_2),
  0,
  'a segunda execucao e idempotente: nenhuma mensagem reprocessada'
);

select * from finish();
rollback;