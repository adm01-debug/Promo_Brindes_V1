-- F-11 (PF-11): corte de backlog da fila de notificacoes.
--
-- Estado anterior (auditado em docs/audits/planejado-x-implementado-20261120/
-- 01-pf-01-22-comercial-confirmacoes-promessas.md): a fila de
-- site_private.notification_deliveries crescia sem limite e os 4 claims
-- (claim_site_notification_deliveries, claim_site_quote_notification,
-- claim_site_commercial_team_alert, claim_site_commercial_team_alerts) nao tinham
-- nenhum criterio de idade nem de relevancia. Consequencias reais:
--   a) entrega com mais de 30 dias continuava elegivel, mandando e-mail de
--      confirmacao de um orcamento que o cliente ja esqueceu;
--   b) pedido promovido a 'spam' continuava com entrega pendente — os triggers de
--      enfileiramento sao AFTER INSERT apenas, entao a promocao a spam nunca
--      cancelava o job (job orfao);
--   c) pedido apagado por direito ao esquecimento (F-30 grava
--      '<hash>@erased.invalid' em quote_requests.email) continuava com entrega
--      pendente e o worker seguiria tentando enviar para endereco invalido;
--   d) nao existia caminho auditado para limpar esse backlog — so UPDATE manual
--      no Studio, sem trilha de quem fez.
--
-- Esta migration entrega:
--   1. notification_policy() com max_age (janela de 30 dias).
--   2. site_private.notification_delivery_is_eligible() — criterio unico.
--   3. Os 4 claims ignoram entrega inelegivel e aposentam (exhausted) o que passou
--      da janela, sem tocar em attempts.
--   4. public.cancel_site_notification_backlog() — porta auditada do back-office.
--   5. update_site_quote_status() cancela as entregas quando o pedido vira spam.
--   6. site_notification_queue_health() separa "fora da janela" de "elegivel".
--
-- ADITIVA, exclusiva do Supabase isolado do site xlzmclcjdncjfdrjxclt.
-- PROIBIDO aplicar no catalogo canonico doufsxqlfjyuvxuezpln.

-- === 1. Politica com janela maxima ==============================================

-- notification_policy() nao tem dependentes (verificado em pg_depend) e os 5
-- chamadores usam `select * into v_policy`, entao acrescentar a coluna no fim nao
-- muda o contrato deles.
drop function if exists site_private.notification_policy();

create function site_private.notification_policy()
returns table (
  max_attempts smallint,
  lease_timeout interval,
  batch_max integer,
  retry_base_seconds integer,
  retry_cap_seconds integer,
  max_age interval
)
language sql
immutable
security invoker
set search_path = ''
as $fn$
  select 5::smallint, interval '10 minutes', 25, 60, 3600, interval '30 days';
$fn$;

revoke all on function site_private.notification_policy() from public, anon, authenticated;
grant execute on function site_private.notification_policy() to site_api, service_role;

comment on function site_private.notification_policy() is
  'F-11: parametros unicos da fila de notificacoes. max_age (30 dias) e o corte de idade a partir do qual a entrega deixa de ser elegivel e passa a ser aposentada.';

-- === 2. Criterio unico de elegibilidade =========================================

-- Security invoker de proposito: quem chama (site_api no worker, postgres nas RPCs
-- de operador) ja tem SELECT em quote_requests/contact_requests, entao o helper nao
-- precisa de security definer e nao amplia privilegio nenhum.
create or replace function site_private.notification_delivery_is_eligible(
  p_request_kind text,
  p_request_id uuid,
  p_created_at timestamptz,
  p_max_age interval
)
returns boolean
language sql
stable
set search_path = ''
as $fn$
  select p_created_at >= now() - p_max_age
    and case p_request_kind
      when 'quote' then exists (
        select 1
        from site_private.quote_requests request
        where request.id = p_request_id
          and request.status <> 'spam'
          and request.email not like '%@erased.invalid'
      )
      when 'contact' then exists (
        select 1
        from site_private.contact_requests request
        where request.id = p_request_id
          and request.status <> 'spam'
          and request.email not like '%@erased.invalid'
      )
      else false
    end;
$fn$;

revoke all on function site_private.notification_delivery_is_eligible(text, uuid, timestamptz, interval) from public, anon, authenticated;
grant execute on function site_private.notification_delivery_is_eligible(text, uuid, timestamptz, interval) to site_api, service_role;

comment on function site_private.notification_delivery_is_eligible(text, uuid, timestamptz, interval) is
  'F-11: criterio unico de elegibilidade de uma entrega — idade dentro de max_age, pedido existente e nao marcado como spam, e e-mail nao anonimizado por direito ao esquecimento (F-30).';
-- === 3. Núcleo de cancelamento do backlog ========================================
--
-- Um único núcleo para os dois casos de uso (backlog inteiro pelo back-office e
-- cancelamento pontual quando o pedido vira spam). Security definer porque o worker
-- (site_api) não tem UPDATE em notification_deliveries — só a porta do operador e as
-- RPCs de status precisam desta escrita.
create or replace function site_private.cancel_ineligible_notification_backlog(
  p_request_kind text,
  p_request_id uuid,
  p_actor_label text,
  p_reason text,
  p_max_age interval
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_actor text := left(btrim(coalesce(p_actor_label, 'notification worker')), 160);
  -- 200 acompanha o teto que a porta publica aceita: cortar em 160 aqui perdia os
  -- ultimos 40 caracteres de um motivo valido, e era justamente onde o operador
  -- costuma dizer de qual campanha ou cliente estava falando.
  v_reason text := left(btrim(coalesce(p_reason, 'backlog inelegivel')), 200);
  v_cancelled_ids uuid[] := array[]::uuid[];
  v_scanned integer;
begin
  with ineligible as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where (p_request_kind is null or delivery.request_kind = p_request_kind)
      and (p_request_id is null or delivery.request_id = p_request_id)
      and (delivery.status in ('pending', 'failed')
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
      and (delivery.last_error_code is distinct from 'whatsapp_dispatch_started' or delivery.provider_message_id is not null)
      and not site_private.notification_delivery_is_eligible(
        delivery.request_kind, delivery.request_id, delivery.created_at, p_max_age)
    order by delivery.created_at, delivery.id
    for update of delivery skip locked
  ), cancelled as (
    update site_private.notification_deliveries delivery
    set status = 'cancelled', lease_token = null, lease_expires_at = null, updated_at = now()
    from ineligible
    where delivery.id = ineligible.id
    returning delivery.id
  )
  select coalesce(array_agg(cancelled.id), array[]::uuid[]) into v_cancelled_ids
  from cancelled;

  -- O trigger log_admin_write não registra a chamada quando o ator é site_api, e não
  -- conhece o nome do operador; a trilha explícita garante "quem cancelou e por quê".
  if cardinality(v_cancelled_ids) > 0 then
    insert into site_private.admin_audit_log (table_name, operation, row_id, performed_by, application_name)
    select 'notification_deliveries', 'UPDATE', item.id::text, v_actor,
           'cancel_ineligible_notification_backlog: ' || v_reason
    from unnest(v_cancelled_ids) as item(id);
  end if;

  select count(*)::integer into v_scanned
  from site_private.notification_deliveries delivery
  where (p_request_kind is null or delivery.request_kind = p_request_kind)
    and (p_request_id is null or delivery.request_id = p_request_id);

  return jsonb_build_object(
    'cancelled', cardinality(v_cancelled_ids),
    'cancelledIds', to_jsonb(v_cancelled_ids),
    'scanned', v_scanned
  );
end;
$fn$;

revoke all on function site_private.cancel_ineligible_notification_backlog(text, uuid, text, text, interval) from public, anon, authenticated;
grant execute on function site_private.cancel_ineligible_notification_backlog(text, uuid, text, text, interval) to site_api, service_role;

comment on function site_private.cancel_ineligible_notification_backlog(text, uuid, text, text, interval) is
  'F-11: núcleo do corte de backlog. Cancela (pending/failed/processing com lease expirado) as entregas inelegíveis — pedido em spam, e-mail anonimizado ou idade acima de max_age — e grava a trilha em admin_audit_log. Filtros nulos significam "todas".';

-- === 4. Porta pública do back-office ============================================

create or replace function public.cancel_site_notification_backlog(p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_policy record;
  v_result jsonb;
begin
  if length(v_reason) not between 3 and 200 then
    raise exception using errcode = '22023', message = 'invalid_notification_backlog_input';
  end if;

  select * into v_policy from site_private.notification_policy();
  v_result := site_private.cancel_ineligible_notification_backlog(
    null, null, v_operator.display_name, v_reason, v_policy.max_age);

  return v_result || jsonb_build_object('reason', v_reason);
end;
$fn$;

revoke all on function public.cancel_site_notification_backlog(text) from public, anon;
grant execute on function public.cancel_site_notification_backlog(text) to authenticated, service_role;

comment on function public.cancel_site_notification_backlog(text) is
  'F-11: porta do back-office para cortar o backlog inelegível da fila de notificações. Exige operador ativo (assert_site_operator) e motivo de 3 a 200 caracteres, que vai para admin_audit_log junto com o nome do operador. Devolve cancelled/scanned/cancelledIds.';
-- === 5. Os 4 claims passam a respeitar o corte ==================================
--
-- Cada claim tinha a mesma dupla: (1) aposentar quem passou do limite de tentativas
-- e (2) reivindicar o elegível. O corte de janela entra nos dois lugares — a
-- aposentadoria usa `not is_eligible` para que um job antigo, de spam ou anonimizado
-- saia da fila em vez de ficar preso em attempts < max_attempts para sempre.
-- `attempts` não é tocado: só entra em processing (+1) ou reabre de exhausted (=0),
-- pela regra do trigger enforce_notification_delivery_lease_and_attempts.

create or replace function public.claim_site_notification_deliveries(p_channels text[], p_batch_size integer default 10)
returns jsonb
language plpgsql
set search_path = ''
as $fn$
declare
  v_policy record;
  v_jobs jsonb;
begin
  select * into v_policy from site_private.notification_policy();
  if p_batch_size not between 1 and v_policy.batch_max
    or p_channels is null
    or cardinality(p_channels) not between 1 and 2
    or exists (select 1 from unnest(p_channels) channel where channel not in ('email', 'whatsapp')) then
    raise exception using errcode = '22023', message = 'invalid_notification_claim_input';
  end if;

  with retired_candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(p_channels)
      and (delivery.status in ('pending', 'failed') or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
      and (delivery.last_error_code is distinct from 'whatsapp_dispatch_started' or delivery.provider_message_id is not null)
      and not site_private.notification_delivery_is_eligible(
        delivery.request_kind, delivery.request_id, delivery.created_at, v_policy.max_age)
    for update of delivery skip locked
  )
  update site_private.notification_deliveries delivery
  set status = 'cancelled', lease_token = null, lease_expires_at = null, updated_at = now()
  from retired_candidates
  where delivery.id = retired_candidates.id;

  with exhausted_candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(p_channels)
      and delivery.attempts >= v_policy.max_attempts
      and (delivery.last_error_code is distinct from 'whatsapp_dispatch_started' or delivery.provider_message_id is not null)
      and (delivery.status in ('pending', 'failed') or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
    for update of delivery skip locked
  )
  update site_private.notification_deliveries delivery
  set status = 'exhausted', lease_token = null, lease_expires_at = null, updated_at = now()
  from exhausted_candidates
  where delivery.id = exhausted_candidates.id;

  with candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(p_channels)
      and delivery.attempts < v_policy.max_attempts
      and (delivery.last_error_code is distinct from 'whatsapp_dispatch_started' or delivery.provider_message_id is not null)
      -- Revalidar aqui e obrigatorio: o comando acima rodou com outro snapshot, e
      -- uma autoexclusao (F-30) que commitou no intervalo tornaria esta entrega
      -- inelegivel. Sem a checagem, o webhook sai com contato anonimizado.
      and site_private.notification_delivery_is_eligible(
        delivery.request_kind, delivery.request_id, delivery.created_at, v_policy.max_age)
      and ((delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now())
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
    order by delivery.next_attempt_at, delivery.created_at, delivery.id
    for update of delivery skip locked
    limit p_batch_size
  ), claimed as (
    update site_private.notification_deliveries delivery
    set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
        lease_token = gen_random_uuid(), claimed_at = now(), lease_expires_at = now() + v_policy.lease_timeout
    from candidates
    where delivery.id = candidates.id
    returning delivery.id, delivery.created_at
  )
  select coalesce(jsonb_agg(site_private.quote_notification_payload(claimed.id) order by claimed.created_at, claimed.id), '[]'::jsonb)
  into v_jobs
  from claimed;
  return v_jobs;
end;
$fn$;

comment on function public.claim_site_notification_deliveries(text[], integer) is
  'F-11: claim em lote das confirmações ao cliente. Antes de reivindicar, cancela as entregas inelegíveis (pedido em spam, e-mail anonimizado, idade acima de max_age) e aposenta as que estouraram as tentativas.';

create or replace function public.claim_site_quote_notification(p_request_id uuid, p_channel text)
returns jsonb
language plpgsql
set search_path = ''
as $fn$
declare
  v_policy record;
  v_delivery site_private.notification_deliveries%rowtype;
begin
  if p_channel not in ('email', 'whatsapp') then
    raise exception using errcode = '22023', message = 'invalid_notification_channel';
  end if;
  select * into v_policy from site_private.notification_policy();

  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.request_kind = 'quote'
    and delivery.request_id = p_request_id
    and delivery.channel = p_channel
    and delivery.audience = 'customer'
    and delivery.status in ('pending', 'failed')
    and delivery.next_attempt_at <= now()
    and delivery.attempts < v_policy.max_attempts
    and site_private.notification_delivery_is_eligible(
      delivery.request_kind, delivery.request_id, delivery.created_at, v_policy.max_age)
  for update skip locked;
  if not found then return null; end if;

  update site_private.notification_deliveries delivery
  set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
      lease_token = gen_random_uuid(), claimed_at = now(), lease_expires_at = now() + v_policy.lease_timeout
  where delivery.id = v_delivery.id
  returning * into v_delivery;

  return site_private.quote_notification_payload(v_delivery.id);
end;
$fn$;

comment on function public.claim_site_quote_notification(uuid, text) is
  'F-11: claim pontual de uma confirmação ao cliente. Não reivindica entrega inelegível (pedido em spam, e-mail anonimizado, idade acima de max_age) — devolve null.';
create or replace function public.claim_site_commercial_team_alert(p_request_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $fn$
declare
  v_policy record;
  v_delivery site_private.notification_deliveries%rowtype;
begin
  select * into v_policy from site_private.notification_policy();
  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.request_kind in ('quote', 'contact')
    and delivery.request_id = p_request_id
    and delivery.audience = 'commercial_team'
    and delivery.status in ('pending', 'failed')
    and delivery.next_attempt_at <= now()
    and delivery.attempts < v_policy.max_attempts
    and site_private.notification_delivery_is_eligible(
      delivery.request_kind, delivery.request_id, delivery.created_at, v_policy.max_age)
  for update skip locked;
  if not found then return null; end if;

  update site_private.notification_deliveries delivery
  set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
      lease_token = gen_random_uuid(), claimed_at = now(), lease_expires_at = now() + v_policy.lease_timeout
  where delivery.id = v_delivery.id
  returning * into v_delivery;

  if v_delivery.request_kind = 'contact' then
    return site_private.commercial_team_contact_alert_payload(v_delivery.id);
  end if;
  return site_private.commercial_team_alert_payload(v_delivery.id);
end;
$fn$;

comment on function public.claim_site_commercial_team_alert(uuid) is
  'F-11: claim pontual do alerta ao comercial. Não reivindica entrega inelegível (pedido em spam, e-mail anonimizado, idade acima de max_age) — devolve null.';

create or replace function public.claim_site_commercial_team_alerts(p_batch_size integer default 10)
returns jsonb
language plpgsql
set search_path = ''
as $fn$
declare
  v_policy record;
  v_jobs jsonb;
begin
  select * into v_policy from site_private.notification_policy();
  if p_batch_size not between 1 and v_policy.batch_max then
    raise exception using errcode = '22023', message = 'invalid_notification_claim_input';
  end if;

  with retired_candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind in ('quote', 'contact')
      and delivery.audience = 'commercial_team'
      and (delivery.status in ('pending', 'failed') or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
      and (delivery.last_error_code is distinct from 'whatsapp_dispatch_started' or delivery.provider_message_id is not null)
      and not site_private.notification_delivery_is_eligible(
        delivery.request_kind, delivery.request_id, delivery.created_at, v_policy.max_age)
    for update of delivery skip locked
  )
  update site_private.notification_deliveries delivery
  set status = 'cancelled', lease_token = null, lease_expires_at = null, updated_at = now()
  from retired_candidates
  where delivery.id = retired_candidates.id;

  with exhausted_candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind in ('quote', 'contact')
      and delivery.audience = 'commercial_team'
      and delivery.attempts >= v_policy.max_attempts
      and (delivery.status in ('pending', 'failed') or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
    for update of delivery skip locked
  )
  update site_private.notification_deliveries delivery
  set status = 'exhausted', lease_token = null, lease_expires_at = null, updated_at = now()
  from exhausted_candidates
  where delivery.id = exhausted_candidates.id;

  with candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind in ('quote', 'contact')
      and delivery.audience = 'commercial_team'
      and delivery.attempts < v_policy.max_attempts
      -- Mesma revalidacao do claim de confirmacoes: o SPAM/anonymize pode ter
      -- commitado depois do comando de cancelamento e antes desta selecao.
      and site_private.notification_delivery_is_eligible(
        delivery.request_kind, delivery.request_id, delivery.created_at, v_policy.max_age)
      and ((delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now())
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
    order by delivery.next_attempt_at, delivery.created_at, delivery.id
    for update of delivery skip locked
    limit p_batch_size
  ), claimed as (
    update site_private.notification_deliveries delivery
    set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
        lease_token = gen_random_uuid(), claimed_at = now(), lease_expires_at = now() + v_policy.lease_timeout
    from candidates
    where delivery.id = candidates.id
    returning delivery.id, delivery.created_at, delivery.request_kind
  )
  select coalesce(jsonb_agg(
    case when claimed.request_kind = 'contact'
      then site_private.commercial_team_contact_alert_payload(claimed.id)
      else site_private.commercial_team_alert_payload(claimed.id)
    end
    order by claimed.created_at, claimed.id), '[]'::jsonb)
  into v_jobs
  from claimed;
  return v_jobs;
end;
$fn$;

comment on function public.claim_site_commercial_team_alerts(integer) is
  'F-11: claim em lote dos alertas ao comercial. Antes de reivindicar, cancela as entregas inelegíveis (pedido em spam, e-mail anonimizado, idade acima de max_age) e aposenta as que estouraram as tentativas.';
-- === 6. Promoção a spam cancela as entregas do pedido ===========================
--
-- site_private.quote_requests_enqueue_confirmations é AFTER INSERT apenas, então
-- mudar o status para 'spam' deixava a entrega pendente na fila. update_site_quote_status
-- é o único caminho de escrita de status do orçamento na UI, e é onde o job órfão
-- pode ser encerrado no mesmo instante da mudança.
create or replace function public.update_site_quote_status(p_request_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_target text := nullif(btrim(coalesce(p_status, '')), '');
  v_previous text;
begin
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;
  if v_target is null then
    raise exception using errcode = '22023', message = 'status_required';
  end if;

  select request.status into v_previous
  from site_private.quote_requests request where request.id = p_request_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'quote_request_not_found';
  end if;

  -- Reaproveita a state machine: o trigger BEFORE UPDATE rejeita com 22023, mas aqui
  -- antecipamos o erro para devolver mensagem específica e não deixar o cliente
  -- adivinhar quais transições existem.
  if v_target <> v_previous and not exists (
    select 1 from site_private.status_transitions transition
    where transition.entity = 'quote_requests'
      and transition.from_status = v_previous
      and transition.to_status = v_target
  ) then
    raise exception using errcode = '22023',
      message = format('invalid_status_transition: %s -> %s', v_previous, v_target);
  end if;

  -- 'quoted' promete uma proposta no portal. Só `publish_site_quote_proposal` pode
  -- levar o pedido até lá; senão o cliente veria o evento "Proposta disponível" sem
  -- nenhuma versão para abrir.
  if v_target = 'quoted' then
    raise exception using errcode = '22023', message = 'quoted_requires_proposal_publication';
  end if;

  update site_private.quote_requests request
  set status = v_target
  where request.id = p_request_id and request.status = v_previous;

  if not found then
    raise exception using errcode = '40001', message = 'quote_request_changed_concurrently';
  end if;

  if v_target <> v_previous then
    insert into site_private.commercial_audit_log (actor_user_id, actor_label, action, quote_request_id, detail)
    values (auth.uid(), v_operator.display_name, 'status_changed', p_request_id,
      jsonb_build_object('from', v_previous, 'to', v_target));
  end if;

  -- F-11: spam não recebe confirmação nem alerta. O cancelamento é pontual e auditado.
  if v_target = 'spam' and v_target <> v_previous then
    perform site_private.cancel_ineligible_notification_backlog(
      'quote', p_request_id, v_operator.display_name,
      'pedido marcado como spam', interval '100 years');
  end if;

  return jsonb_build_object('id', p_request_id, 'previousStatus', v_previous, 'status', v_target);
end;
$fn$;

comment on function public.update_site_quote_status(uuid, text) is
  'F-03/F-11: muda o status do orçamento respeitando status_transitions. Ao entrar em spam, cancela as entregas pendentes do pedido (o trigger de enfileiramento é AFTER INSERT, então sem isso o job ficaria órfão na fila).';

-- === 7. Saúde da fila separa "fora da janela" ==================================

-- O contrato TS (api/notifications.ts:parseQueueHealth) ignora campo desconhecido,
-- então outOfWindowCount é aditivo e não quebra o consumidor atual.
create or replace function public.site_notification_queue_health()
returns jsonb
language sql
stable
set search_path = ''
as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
    'channel', c.channel,
    'oldestEligibleAgeSeconds', case when stats.eligible_count > 0
      then extract(epoch from (now() - stats.oldest_eligible_created_at))::bigint else null end,
    'eligibleCount', coalesce(stats.eligible_count, 0),
    'exhaustedCount', coalesce(stats.exhausted_count, 0),
    'uncertainCount', coalesce(stats.uncertain_count, 0),
    'outOfWindowCount', coalesce(stats.out_of_window_count, 0)
  ) order by c.channel), '[]'::jsonb)
  from unnest(array['email', 'whatsapp']) as c(channel)
  cross join lateral (select policy.max_age from site_private.notification_policy() policy) as policy
  left join lateral (
    select
      -- "Elegivel" tem de usar o mesmo criterio do claim: status pronto para
      -- tentativa, dentro da janela e com pedido existente/nao spam/nao anonimizado.
      -- Antes so olhava status e next_attempt_at, entao uma entrega vencida e uma
      -- de pedido em spam entravam em eligibleCount e ainda definiam a idade que
      -- dispara o alerta de fila parada — o alarme apontava para job que o proximo
      -- claim cancelaria.
      min(delivery.created_at) filter (
        where delivery.status in ('pending', 'failed')
          and delivery.next_attempt_at <= now()
          and site_private.notification_delivery_is_eligible(
            delivery.request_kind, delivery.request_id, delivery.created_at, policy.max_age)
      ) as oldest_eligible_created_at,
      count(*) filter (
        where delivery.status in ('pending', 'failed')
          and delivery.next_attempt_at <= now()
          and site_private.notification_delivery_is_eligible(
            delivery.request_kind, delivery.request_id, delivery.created_at, policy.max_age)
      ) as eligible_count,
      count(*) filter (where delivery.status = 'exhausted') as exhausted_count,
      count(*) filter (
        where delivery.last_error_code = 'whatsapp_dispatch_started'
          and delivery.provider_message_id is null
      ) as uncertain_count,
      count(*) filter (
        where delivery.status in ('pending', 'failed')
          and not site_private.notification_delivery_is_eligible(
            delivery.request_kind, delivery.request_id, delivery.created_at, policy.max_age)
      ) as out_of_window_count
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = c.channel
  ) stats on true;
$fn$;

comment on function public.site_notification_queue_health() is
  'F-11: saúde da fila por canal. eligibleCount usa o mesmo critério do claim (status pronto, dentro da janela, pedido não spam e não anonimizado); outOfWindowCount conta o pending/failed que o próximo claim vai cancelar.';