-- Etapa 9 do plano de correções: matriz completa de transições de
-- notification_deliveries.status (36 combinações — 6 estados x 6 estados), mais
-- verificação direta dos valores de lease_token/attempts nas transições aceitas.
--
-- pg_temp.try_notification_transition(from, to) monta uma linha "bem-formada" no
-- estado de origem (lease_token/lease_expires_at/attempts plausíveis para aquele
-- estado — nunca um estado que a própria constraint declarativa
-- notification_deliveries_lease_matches_status já rejeitaria) e tenta a transição
-- com os valores que claim_site_notification_deliveries/
-- finalize_site_notification_delivery realmente usariam. Isola a pergunta "esta
-- transição está na matriz permitida?" de qualquer outro motivo de rejeição.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(42);

create or replace function pg_temp.try_notification_transition(p_from text, p_to text)
returns boolean
language plpgsql
as $$
declare
  v_id uuid;
  v_attempts smallint;
  v_lease_token uuid;
  v_lease_expires_at timestamptz;
  v_new_lease_token uuid;
  v_new_attempts smallint;
  v_new_lease_expires_at timestamptz;
begin
  v_attempts := case when p_from = 'pending' then 0 else 2 end;
  if p_from = 'processing' then
    v_lease_token := gen_random_uuid();
    v_lease_expires_at := now() + interval '10 minutes';
  else
    v_lease_token := null;
    v_lease_expires_at := null;
  end if;

  insert into site_private.notification_deliveries
    (request_kind, request_id, channel, audience, status, attempts, lease_token, lease_expires_at, claimed_at)
  values
    ('quote', gen_random_uuid(), 'email', 'customer', p_from, v_attempts, v_lease_token, v_lease_expires_at,
     case when p_from = 'processing' then now() else null end)
  returning id into v_id;

  if p_to = 'processing' then
    v_new_lease_token := gen_random_uuid();
    v_new_attempts := v_attempts + 1;
    v_new_lease_expires_at := now() + interval '10 minutes';
  elsif p_from = 'exhausted' and p_to = 'pending' then
    -- Reabertura administrativa (RUNBOOK_INCIDENTES.md): attempts sempre reseta a 0.
    v_new_lease_token := null;
    v_new_attempts := 0;
    v_new_lease_expires_at := null;
  else
    v_new_lease_token := null;
    v_new_attempts := v_attempts;
    v_new_lease_expires_at := null;
  end if;

  begin
    update site_private.notification_deliveries
    set status = p_to, lease_token = v_new_lease_token, attempts = v_new_attempts,
        lease_expires_at = v_new_lease_expires_at,
        claimed_at = case when p_to = 'processing' then now() else claimed_at end
    where id = v_id;
    return true;
  exception when sqlstate '22023' then
    return false;
  end;
end;
$$;

-- Matriz completa: 6 estados x 6 estados. 14 aceitas, 22 rejeitadas (ver cabeçalho
-- da migration 20260916220000 para o mapa de transições reais que justifica cada
-- valor abaixo).
select is(pg_temp.try_notification_transition('pending', 'pending'), true, 'pending -> pending (no-op)');
select is(pg_temp.try_notification_transition('pending', 'processing'), true, 'pending -> processing');
select is(pg_temp.try_notification_transition('pending', 'sent'), false, 'pending -> sent (rejeitado: pula processing)');
select is(pg_temp.try_notification_transition('pending', 'failed'), false, 'pending -> failed (rejeitado: pula processing)');
select is(pg_temp.try_notification_transition('pending', 'cancelled'), false, 'pending -> cancelled (rejeitado: pula processing)');
select is(pg_temp.try_notification_transition('pending', 'exhausted'), true, 'pending -> exhausted (housekeeping de claim)');

select is(pg_temp.try_notification_transition('processing', 'pending'), false, 'processing -> pending (rejeitado: não existe no sistema real)');
select is(pg_temp.try_notification_transition('processing', 'processing'), true, 'processing -> processing (recuperação de lease expirada)');
select is(pg_temp.try_notification_transition('processing', 'sent'), true, 'processing -> sent');
select is(pg_temp.try_notification_transition('processing', 'failed'), true, 'processing -> failed');
select is(pg_temp.try_notification_transition('processing', 'cancelled'), true, 'processing -> cancelled');
select is(pg_temp.try_notification_transition('processing', 'exhausted'), true, 'processing -> exhausted (housekeeping de claim)');

select is(pg_temp.try_notification_transition('sent', 'pending'), false, 'sent -> pending (rejeitado: terminal)');
select is(pg_temp.try_notification_transition('sent', 'processing'), false, 'sent -> processing (rejeitado: terminal)');
select is(pg_temp.try_notification_transition('sent', 'sent'), true, 'sent -> sent (no-op)');
select is(pg_temp.try_notification_transition('sent', 'failed'), false, 'sent -> failed (rejeitado: terminal)');
select is(pg_temp.try_notification_transition('sent', 'cancelled'), false, 'sent -> cancelled (rejeitado: terminal)');
select is(pg_temp.try_notification_transition('sent', 'exhausted'), false, 'sent -> exhausted (rejeitado: terminal)');

select is(pg_temp.try_notification_transition('failed', 'pending'), false, 'failed -> pending (rejeitado: não existe no sistema real)');
select is(pg_temp.try_notification_transition('failed', 'processing'), true, 'failed -> processing');
select is(pg_temp.try_notification_transition('failed', 'sent'), false, 'failed -> sent (rejeitado: pula processing)');
select is(pg_temp.try_notification_transition('failed', 'failed'), true, 'failed -> failed (no-op)');
select is(pg_temp.try_notification_transition('failed', 'cancelled'), false, 'failed -> cancelled (rejeitado: pula processing)');
select is(pg_temp.try_notification_transition('failed', 'exhausted'), true, 'failed -> exhausted (housekeeping de claim)');

select is(pg_temp.try_notification_transition('cancelled', 'pending'), false, 'cancelled -> pending (rejeitado: terminal)');
select is(pg_temp.try_notification_transition('cancelled', 'processing'), false, 'cancelled -> processing (rejeitado: terminal)');
select is(pg_temp.try_notification_transition('cancelled', 'sent'), false, 'cancelled -> sent (rejeitado: terminal)');
select is(pg_temp.try_notification_transition('cancelled', 'failed'), false, 'cancelled -> failed (rejeitado: terminal)');
select is(pg_temp.try_notification_transition('cancelled', 'cancelled'), true, 'cancelled -> cancelled (no-op)');
select is(pg_temp.try_notification_transition('cancelled', 'exhausted'), false, 'cancelled -> exhausted (rejeitado: terminal)');

select is(pg_temp.try_notification_transition('exhausted', 'pending'), true, 'exhausted -> pending (reabertura administrativa, RUNBOOK_INCIDENTES.md)');
select is(pg_temp.try_notification_transition('exhausted', 'processing'), false, 'exhausted -> processing (rejeitado: terminal)');
select is(pg_temp.try_notification_transition('exhausted', 'sent'), false, 'exhausted -> sent (rejeitado: terminal)');
select is(pg_temp.try_notification_transition('exhausted', 'failed'), false, 'exhausted -> failed (rejeitado: terminal)');
select is(pg_temp.try_notification_transition('exhausted', 'cancelled'), false, 'exhausted -> cancelled (rejeitado: terminal)');
select is(pg_temp.try_notification_transition('exhausted', 'exhausted'), true, 'exhausted -> exhausted (no-op)');

-- Além da matriz: os valores exatos de lease_token/attempts, não só aceitar/rejeitar.

insert into site_private.notification_deliveries (request_kind, request_id, channel, audience, status)
values ('quote', gen_random_uuid(), 'email', 'customer', 'pending')
returning id as fresh_id \gset

select throws_like(
  format($$update site_private.notification_deliveries set status = 'processing', attempts = 1 where id = '%s'$$, :'fresh_id'),
  '%lease_token obrigatório ao entrar em processing%',
  'entrar em processing sem lease_token é rejeitado com mensagem clara'
);

update site_private.notification_deliveries
set status = 'processing', attempts = 1, lease_token = gen_random_uuid(), lease_expires_at = now() + interval '10 minutes'
where id = :'fresh_id'::uuid;

select is(
  (select attempts from site_private.notification_deliveries where id = :'fresh_id'::uuid),
  1::smallint,
  'attempts incrementa para 1 na primeira reivindicação (0 -> 1)'
);

select throws_like(
  format($$update site_private.notification_deliveries set status = 'processing', attempts = 9 where id = '%s'$$, :'fresh_id'),
  '%attempts deve incrementar em exatamente 1%',
  'entrar em processing incrementando attempts por mais de 1 é rejeitado'
);

update site_private.notification_deliveries
set status = 'sent', lease_token = null, lease_expires_at = null
where id = :'fresh_id'::uuid;

select throws_like(
  format($$update site_private.notification_deliveries set attempts = 3 where id = '%s'$$, :'fresh_id'),
  '%attempts só muda ao entrar em processing%',
  'mudar attempts sem entrar em processing (linha já sent) é rejeitado, mesmo sem tocar status'
);

-- Reabertura administrativa (RUNBOOK_INCIDENTES.md): exhausted -> pending exige
-- attempts = 0; qualquer outro valor é rejeitado com mensagem específica.
insert into site_private.notification_deliveries (request_kind, request_id, channel, audience, status, attempts)
values ('quote', gen_random_uuid(), 'email', 'customer', 'exhausted', 5)
returning id as exhausted_id \gset

select throws_like(
  format($$update site_private.notification_deliveries set status = 'pending', attempts = 3 where id = '%s'$$, :'exhausted_id'),
  '%reabertura de exhausted exige attempts = 0%',
  'reabrir exhausted sem zerar attempts é rejeitado com mensagem clara'
);

update site_private.notification_deliveries
set status = 'pending', attempts = 0
where id = :'exhausted_id'::uuid;

select is(
  (select attempts from site_private.notification_deliveries where id = :'exhausted_id'::uuid),
  0::smallint,
  'reabertura de exhausted com attempts = 0 é aceita (mesmo comando do runbook de incidente)'
);

select * from finish();
rollback;
