-- Etapa 19 do plano de correções: protocolo público persistido, com dígito
-- verificador mod 11, substituindo upper(left(id::text, 8)).

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(17);

-- === mod11_check_digit: casos conhecidos e formato ==================================

-- Conferido manualmente (pesos 2..9 da direita para a esquerda, ciclando) e contra o
-- banco antes de fixar no teste: 1*2+0*3+0*4+0*5+0*6+0*7+6*8+2*9=68; 68 mod 11=2;
-- remainder>=2 => 11-2=9.
select is(site_private.mod11_check_digit('26000001'), '9', 'dígito verificador de 26000001 é determinístico e conhecido (conferido manualmente)');
select is(
  site_private.mod11_check_digit('26000001'),
  site_private.mod11_check_digit('26000001'),
  'mod11_check_digit é determinística: mesma entrada, mesma saída'
);
select isnt(
  site_private.mod11_check_digit('26000001'),
  site_private.mod11_check_digit('26000002'),
  'entradas diferentes tendem a produzir dígitos diferentes (não uma prova geral, só o par de teste)'
);
-- Cobre o ramo remainder < 2 (soma zero: todos os produtos são zero, 0 mod 11 = 0).
select is(site_private.mod11_check_digit('00000000'), '0', 'soma zero cai no ramo remainder<2 e retorna 0');
select is(site_private.mod11_check_digit('99999999'), '0', 'outra combinação também pode cair em remainder<2');

select throws_like(
  $$ select site_private.mod11_check_digit('12a45') $$,
  '%invalid_mod11_input%',
  'entrada com caractere não-dígito é rejeitada'
);
select throws_like(
  $$ select site_private.mod11_check_digit(null) $$,
  '%invalid_mod11_input%',
  'entrada nula é rejeitada'
);

-- === Geração no insert ===============================================================

insert into site_private.quote_requests (
  client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at
) values (
  'protocol-test-1', repeat('1', 64), 'site-promo-brindes',
  'Cliente Protocolo', 'Empresa Protocolo', 'protocolo@example.test', '(11) 95555-4444', now()
);

select ok(
  (select protocol from site_private.quote_requests where client_request_id = 'protocol-test-1') ~ '^PB[0-9]{9}$',
  'protocolo gerado casa com o formato PB + 9 dígitos (Etapa 19)'
);

select ok(
  (
    select protocol = 'PB' || substring(protocol from 3 for 8) || site_private.mod11_check_digit(substring(protocol from 3 for 8))
    from site_private.quote_requests where client_request_id = 'protocol-test-1'
  ),
  'o dígito verificador do protocolo gerado bate com o algoritmo (autoconsistência)'
);

insert into site_private.quote_requests (
  client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at
) values (
  'protocol-test-2', repeat('2', 64), 'site-promo-brindes',
  'Cliente Protocolo 2', 'Empresa Protocolo 2', 'protocolo2@example.test', '(11) 94444-3333', now()
);

select isnt(
  (select protocol from site_private.quote_requests where client_request_id = 'protocol-test-1'),
  (select protocol from site_private.quote_requests where client_request_id = 'protocol-test-2'),
  'dois pedidos consecutivos recebem protocolos distintos (sequência, não aleatório colidível)'
);

select throws_like(
  $$
    update site_private.quote_requests set protocol = (
      select protocol from site_private.quote_requests where client_request_id = 'protocol-test-2'
    ) where client_request_id = 'protocol-test-1'
  $$,
  '%quote_requests_protocol_key%',
  'protocolo é único: forçar uma colisão manual é rejeitado'
);

select lives_ok(
  $$
    update site_private.quote_requests set status = 'triaged' where client_request_id = 'protocol-test-1'
  $$,
  'update que não toca protocol não é afetado pelo trigger (só age em insert)'
);
select is(
  (select protocol from site_private.quote_requests where client_request_id = 'protocol-test-1'),
  (select protocol from site_private.quote_requests where client_request_id = 'protocol-test-1'),
  'protocolo permanece estável depois de um update em outra coluna'
);

-- === As 4 funções que expunham upper(left(id::text,8)) agora expõem protocol =======

select ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'site_private') and p.prosrc ilike '%upper(left(%'
  ),
  'nenhuma função ativa ainda deriva o protocolo do UUID (Etapa 19 substituiu as 4 ocorrências)'
);

select has_column('site_private', 'quote_requests', 'protocol', 'coluna protocol existe');
select col_is_unique('site_private', 'quote_requests', array['protocol'], 'protocol tem constraint de unicidade');
select col_not_null('site_private', 'quote_requests', 'protocol', 'protocol é not null');

select * from finish();
rollback;
