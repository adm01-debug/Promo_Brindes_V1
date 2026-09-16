-- Etapa 9 do plano de correções
-- (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md): a máquina de estados de
-- notification_deliveries.status era garantida só pelas funções (claim_*, finalize_*),
-- nunca por um trigger — um update direto (Studio, service_role, bug futuro) podia
-- mover sent -> pending ou entrar em processing sem lease_token. Achado por auditoria
-- em 16/09/2026: o checklist mestre do plano marcava a Fase 1 inteira como "[x]
-- implementada e validada" sem que esta etapa tivesse qualquer código.
--
-- Estados (constraint em 20260914120000): pending, processing, sent, failed,
-- cancelled, exhausted. Mapa de transições reais, confirmado lendo toda função que
-- toca a coluna status nas migrations existentes (nenhuma delas muda depois desta
-- migration), MAIS uma transição administrativa já documentada e sancionada antes
-- desta migration existir (docs/RUNBOOK_INCIDENTES.md, seção "provedor fora do ar",
-- passo 3): reabrir jobs esgotados depois que o provedor volta do ar é um
-- `update` direto de `service_role` propositalmente fora de qualquer RPC — não é
-- uma exceção a ser tratada com `disable trigger`, é um caso de primeira classe:
--   pending    -> processing  (claim_site_notification_deliveries / claim_site_quote_notification)
--   pending    -> exhausted   (claim_*, housekeeping: attempts já no limite sem nunca ter sido marcado)
--   processing -> processing (claim_*, recuperação de lease expirada: nova tentativa)
--   processing -> sent        (finalize_site_notification_delivery)
--   processing -> failed      (finalize_site_notification_delivery)
--   processing -> cancelled   (finalize_site_notification_delivery)
--   processing -> exhausted   (claim_*, housekeeping: lease expirada e attempts no limite)
--   failed     -> processing  (claim_*)
--   failed     -> exhausted   (claim_*, housekeeping)
--   exhausted  -> pending     (admin: reabertura manual pós-incidente, RUNBOOK_INCIDENTES.md;
--                              exige attempts = 0, ver segundo trigger abaixo)
-- sent/cancelled são terminais por omissão (nenhuma linha abaixo parte delas) — mesmo
-- padrão de "terminal por omissão" já usado para quote_requests/contact_requests
-- (Etapa 8, 20260916100000). exhausted é terminal só para o sistema automático:
-- nenhuma função de claim/finalize sai dele, mas um humano pode, deliberadamente.

alter table site_private.status_transitions
  drop constraint status_transitions_entity_check;
alter table site_private.status_transitions
  add constraint status_transitions_entity_check
  check (entity in ('quote_requests', 'contact_requests', 'notification_deliveries'));

insert into site_private.status_transitions (entity, from_status, to_status) values
  ('notification_deliveries', 'pending', 'processing'),
  ('notification_deliveries', 'pending', 'exhausted'),
  ('notification_deliveries', 'processing', 'sent'),
  ('notification_deliveries', 'processing', 'failed'),
  ('notification_deliveries', 'processing', 'cancelled'),
  ('notification_deliveries', 'processing', 'exhausted'),
  ('notification_deliveries', 'failed', 'processing'),
  ('notification_deliveries', 'failed', 'exhausted'),
  ('notification_deliveries', 'exhausted', 'pending')
on conflict do nothing;
-- Não inclui ('processing','processing'): a mesma origem e destino faz
-- site_private.enforce_status_transition() retornar cedo (new.status is not distinct
-- from old.status), sem consultar esta tabela — o caso de recuperação de lease
-- expirada (que É uma transição real, com novo lease_token e attempts+1) é validado
-- pelo segundo trigger abaixo, não por este.

drop trigger if exists notification_deliveries_enforce_status_transition on site_private.notification_deliveries;
create trigger notification_deliveries_enforce_status_transition
  before update of status on site_private.notification_deliveries
  for each row execute function site_private.enforce_status_transition();

-- Invariantes de negócio da Etapa 9 que a tabela de transições, sozinha, não cobre:
-- lease_token obrigatório entrando em processing, zerado saindo dela; attempts só
-- incrementa entrando em processing (inclusive na recuperação de lease expirada,
-- onde from=to='processing' e por isso o trigger acima nem consulta a tabela) ou
-- reseta para 0 na reabertura administrativa exhausted -> pending (RUNBOOK_INCIDENTES.md);
-- qualquer outra mudança de attempts é rejeitada.

create or replace function site_private.enforce_notification_delivery_lease_and_attempts()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status and new.attempts is not distinct from old.attempts then
    return new;
  end if;

  if new.status = 'processing' and new.lease_token is null then
    raise exception using errcode = '22023',
      message = format('invalid_notification_delivery_transition: lease_token obrigatório ao entrar em processing (id=%s)', old.id);
  end if;

  if old.status = 'processing' and new.status <> 'processing' and new.lease_token is not null then
    raise exception using errcode = '22023',
      message = format('invalid_notification_delivery_transition: lease_token deve ser zerado ao sair de processing para %s (id=%s)', new.status, old.id);
  end if;

  if new.status = 'processing' then
    if new.attempts is distinct from old.attempts + 1 then
      raise exception using errcode = '22023',
        message = format('invalid_notification_delivery_transition: attempts deve incrementar em exatamente 1 ao entrar em processing (id=%s, old=%s, new=%s)', old.id, old.attempts, new.attempts);
    end if;
  elsif old.status = 'exhausted' and new.status = 'pending' then
    if new.attempts <> 0 then
      raise exception using errcode = '22023',
        message = format('invalid_notification_delivery_transition: reabertura de exhausted exige attempts = 0 (id=%s, new=%s)', old.id, new.attempts);
    end if;
  elsif new.attempts is distinct from old.attempts then
    raise exception using errcode = '22023',
      message = format('invalid_notification_delivery_transition: attempts só muda ao entrar em processing ou ao reabrir de exhausted (id=%s)', old.id);
  end if;

  return new;
end;
$$;

-- `of status, attempts` (não só status): um update direto que só mexe em attempts,
-- sem tocar status, também precisa cair sob a invariante — senão bastaria omitir
-- status do SET para escapar da validação.
drop trigger if exists notification_deliveries_enforce_lease_and_attempts on site_private.notification_deliveries;
create trigger notification_deliveries_enforce_lease_and_attempts
  before update of status, attempts on site_private.notification_deliveries
  for each row execute function site_private.enforce_notification_delivery_lease_and_attempts();

comment on function site_private.enforce_notification_delivery_lease_and_attempts() is
  'Etapa 9: exige lease_token ao entrar em processing, exige que seja zerado ao sair, e que attempts só mude entrando em processing (+1) ou reabrindo de exhausted (= 0, RUNBOOK_INCIDENTES.md). Roda ao lado de enforce_status_transition() (mesma tabela site_private.status_transitions, entity=notification_deliveries) — juntos cobrem a matriz completa da Ação da Etapa 9.';
