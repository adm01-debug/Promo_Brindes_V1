-- F-05: mensagem da equipe ao cliente na linha do tempo.
--
-- Cobre o produtor do evento 'message' (resposta ao ajuste), o truncamento em 500
-- caracteres imposto pelo check da coluna, a leitura pelo portal do titular e a
-- anonimizacao desse texto livre no apagamento (F-31/F-30).

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

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

-- === 2. Texto maior que a coluna continua sendo aceito ============================

-- 600 caracteres: acima do limite de 500 da coluna e do maxLength da UI.
select lives_ok(
  $$select public.reply_site_quote_adjustment(
      '55555555-5555-4555-8555-555555555555',
      repeat('detalhe ', 75),
      'triaged'
    )$$,
  'resposta acima de 500 caracteres nao quebra a RPC'
);

select is(
  (select length(description) from site_private.quote_request_events
   where quote_request_id = '33333333-3333-4333-8333-333333333333'
     and event_type = 'message' and description like 'detalhe%'),
  500,
  'a mensagem ao cliente e truncada no limite da coluna'
);

select is(
  (select length(detail ->> 'response') from site_private.commercial_audit_log
   where action = 'adjustment_replied' and detail ->> 'adjustmentId' = '55555555-5555-4555-8555-555555555555'),
  599,
  'a trilha interna guarda o texto integral, sem truncar'
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

select ok(
  not jsonb_path_exists(
    public.get_my_quote_request('33333333-3333-4333-8333-333333333333') -> 'events',
    '$[*] ? (@.audience == "internal")'
  ),
  'o portal continua sem expor a audiencia interna'
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
     and event_type in ('received', 'status_changed')),
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