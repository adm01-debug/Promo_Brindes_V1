-- F-12 (PF-12, docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md): a fila de
-- notificações não tinha lista de supressão, o reprocessamento pós-incidente era SQL
-- manual (docs/RUNBOOK_INCIDENTES.md, "provedor fora do ar", passo 3), um evento de
-- webhook que chegava antes do aceite do provedor ficava órfão para sempre
-- (apply_site_notification_provider_event grava delivery_id = NULL e devolve
-- 'delivery_not_found') e esses órfãos nunca eram expurgados.
--
-- Migration ADITIVA, exclusiva do projeto isolado xlzmclcjdncjfdrjxclt:
--   1. Hash de e-mail (pseudônimo), base da lista de supressão sem PII, e índices.
--   2. O evento de webhook passa a guardar o que precisa para ser religado depois
--      (provider_message_id) e o motivo do bounce — sem isso o órfão é irrecuperável:
--      a tabela só tinha (provider, provider_event_id, event_type, delivery_id).
--   3. Lista de supressão consultável por hash (bounce/complaint), sem e-mail em claro.
--   4. Re-vínculo dos eventos que chegaram antes do aceite.
--   5. Reprocessamento controlado exhausted -> pending (substitui o SQL manual).
--   6. Relatório operacional da fila (esgotados de orçamento E de contato, suprimidos,
--      órfãos) para o back-office.
--   7. Purga dos eventos órfãos, chamada por api/retention.ts.
--   8. O envio passa a respeitar a supressão: as quatro claims (envio imediato e cron)
--      barram destinatário suprimido e pedido apagado pela autoexclusão do titular.
--
-- Nenhuma função existente muda de assinatura; nenhuma coluna nova é NOT NULL, então
-- nenhum insert existente quebra. As claims são redefinidas com corpo idêntico ao vigente,
-- apenas com o predicado site_private.notification_delivery_is_claimable a mais.

-- === 1. Pseudônimo do e-mail ======================================================

-- sha256 hex do e-mail normalizado (site_private.normalize_email = btrim + lower). É o
-- único identificador de titular que a lista de supressão expõe: o e-mail em claro não
-- sai do banco por estas RPCs e o hash não é reversível sem o endereço original.
-- SECURITY DEFINER porque normalize_email só tem grant para service_role e esta função
-- também é usada por operador no back-office; search_path vazio fecha o risco.
create or replace function site_private.email_hash(p_email text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select encode(
    sha256(
      convert_to(site_private.normalize_email(coalesce(p_email, '')), 'UTF8')
    ),
    'hex'
  );
$$;

comment on function site_private.email_hash(text) is
  'F-12: sha256 hex do e-mail normalizado. Identificador pseudônimo da lista de supressão — nunca expõe o e-mail em claro.';

revoke all on function site_private.email_hash(text) from public, anon, authenticated;
grant execute on function site_private.email_hash(text) to site_api, service_role;

-- Índices funcionais: a consulta de supressão é "alguma entrega deste e-mail deu bounce
-- ou complaint?" e não pode virar varredura de quote_requests/contact_requests.
create index if not exists quote_requests_email_hash_idx
  on site_private.quote_requests (site_private.email_hash(email));
create index if not exists contact_requests_email_hash_idx
  on site_private.contact_requests (site_private.email_hash(email));

-- === 2. Dados do evento necessários para religar depois ===========================

-- notification_provider_events guardava apenas (provider, provider_event_id,
-- event_type, delivery_id). Como o delivery_id de um evento precoce é NULL e o
-- provider_message_id era descartado, não existia nenhuma informação no evento capaz de
-- religá-lo quando o aceite chegasse: o evento ficava inútil para sempre, ocupando a
-- chave de dedupe.
alter table site_private.notification_provider_events
  add column if not exists provider_message_id text
    check (provider_message_id is null or length(provider_message_id) between 1 and 240),
  add column if not exists bounce_reason text
    check (bounce_reason is null or length(bounce_reason) <= 200);

comment on column site_private.notification_provider_events.provider_message_id is
  'F-12: id da mensagem no provedor, preservado no evento para o re-vínculo de evento que chegou antes do aceite. Eventos anteriores a esta migration não têm o valor e só podem ser expurgados.';
comment on column site_private.notification_provider_events.bounce_reason is
  'F-12: motivo do bounce tal como o webhook enviou, preservado no evento para o re-vínculo (antes só existia em notification_deliveries, o que exigia a entrega já vinculada).';

create index if not exists notification_provider_events_orphan_idx
  on site_private.notification_provider_events (provider, provider_message_id)
  where delivery_id is null;

create or replace function public.apply_site_notification_provider_event(
  p_provider text,
  p_provider_message_id text,
  p_event_type text,
  p_provider_event_id text,
  p_occurred_at timestamptz,
  p_bounce_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_delivery_id uuid;
  v_updated integer;
begin
  if p_provider not in ('resend', 'meta-whatsapp-cloud')
    or p_event_type not in ('delivered', 'bounced', 'complained')
    or length(coalesce(p_provider_message_id, '')) not between 1 and 240
    or length(coalesce(p_provider_event_id, '')) not between 1 and 240
    or p_occurred_at is null
    or length(coalesce(p_bounce_reason, '')) > 200 then
    raise exception using errcode = '22023', message = 'invalid_notification_provider_event_input';
  end if;

  select delivery.id into v_delivery_id
  from site_private.notification_deliveries delivery
  where delivery.provider = p_provider and delivery.provider_message_id = p_provider_message_id
  limit 1;

  -- F-12: provider_message_id e bounce_reason passam a ser gravados no evento. É o que
  -- permite a reconcile_site_notification_provider_events() religar depois o evento que
  -- chegou antes do aceite. O comportamento devolvido aqui continua idêntico ao anterior.
  insert into site_private.notification_provider_events
    (provider, provider_event_id, event_type, delivery_id, provider_message_id, bounce_reason)
  values (p_provider, p_provider_event_id, p_event_type, v_delivery_id, p_provider_message_id, p_bounce_reason)
  on conflict (provider, provider_event_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('applied', false, 'deliveryId', v_delivery_id, 'reason', 'duplicate');
  end if;

  if v_delivery_id is null then
    return jsonb_build_object('applied', false, 'deliveryId', null, 'reason', 'delivery_not_found');
  end if;

  if p_event_type in ('delivered', 'bounced') then
    update site_private.notification_deliveries delivery
    set delivery_state = p_event_type, delivery_state_at = p_occurred_at,
        bounce_reason = case when p_event_type = 'bounced' then p_bounce_reason else delivery.bounce_reason end,
        delivery_state_source_event_id = v_event_id,
        updated_at = now()
    where delivery.id = v_delivery_id
      and (
        delivery.delivery_state is null
        -- bounced sobrescreve um delivered anterior (soft bounce tardio); delivered
        -- nunca sobrescreve bounced (esse sentido não existe nesta condição).
        or (p_event_type = 'bounced' and delivery.delivery_state = 'delivered')
      );
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      return jsonb_build_object('applied', false, 'deliveryId', v_delivery_id, 'reason', 'delivery_state_already_set');
    end if;
  else
    update site_private.notification_deliveries delivery
    set complained_at = coalesce(delivery.complained_at, p_occurred_at), updated_at = now()
    where delivery.id = v_delivery_id;
  end if;

  return jsonb_build_object('applied', true, 'deliveryId', v_delivery_id, 'reason', null);
end;
$$;

revoke all on function public.apply_site_notification_provider_event(text, text, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.apply_site_notification_provider_event(text, text, text, text, timestamptz, text) to service_role;

comment on function public.apply_site_notification_provider_event(text, text, text, text, timestamptz, text) is
  'Aplica evento de webhook de forma idempotente. delivered só grava se delivery_state ainda for null; bounced grava se null OU se o estado atual for delivered (bounce tardio corrige delivered otimista). complained é independente e idempotente via coalesce. F-12: o evento também guarda provider_message_id e bounce_reason, para o re-vínculo de evento precoce.';

-- === 2b. Predicados reutilizáveis (supressão e pedido apagado) ====================

-- A supressão só vale para o negócio se o envio a consultar. Antes disso ela era um
-- relatório: nenhuma das quatro funções que reivindicam entrega olhava a lista, então
-- um endereço que devolveu continuava recebendo. Concentrar o critério aqui garante que
-- envio imediato (claim_site_quote_notification, claim_site_commercial_team_alert) e
-- cron (claim_site_notification_deliveries, claim_site_commercial_team_alerts) usem a
-- MESMA definição — inclusive para o alerta da equipe, cujo destinatário é fixo mas o
-- assunto é o titular do pedido.
create or replace function site_private.notification_request_erased(
  p_request_kind text,
  p_request_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_request_kind
    when 'quote' then exists (
      select 1 from site_private.quote_requests request
      where request.id = p_request_id and request.email like '%@erased.invalid'
    )
    when 'contact' then exists (
      select 1 from site_private.contact_requests request
      where request.id = p_request_id and request.email like '%@erased.invalid'
    )
    else false
  end;
$$;

comment on function site_private.notification_request_erased(text, uuid) is
  'F-12: pedido apagado pela autoexclusão do titular (F-30). Entrega cujo pedido foi apagado não é elegível para envio nem para reabertura.';

create or replace function site_private.notification_request_suppressed(
  p_request_kind text,
  p_request_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from site_private.notification_deliveries delivery
    where delivery.audience = 'customer'
      and (delivery.delivery_state = 'bounced' or delivery.complained_at is not null)
      and site_private.email_hash(
        case p_request_kind
          when 'quote' then (
            select request.email from site_private.quote_requests request where request.id = p_request_id
          )
          when 'contact' then (
            select request.email from site_private.contact_requests request where request.id = p_request_id
          )
        end
      ) = case delivery.request_kind
        when 'quote' then site_private.email_hash((
          select request.email from site_private.quote_requests request where request.id = delivery.request_id
        ))
        else site_private.email_hash((
          select request.email from site_private.contact_requests request where request.id = delivery.request_id
        ))
      end
  );
$$;

comment on function site_private.notification_request_suppressed(text, uuid) is
  'F-12: o e-mail do pedido já devolveu (bounce) ou reclamou de spam em alguma entrega ao titular. Usado no claim das quatro filas para não reenviar a endereço suprimido.';

revoke all on function site_private.notification_request_erased(text, uuid) from public, anon, authenticated;
revoke all on function site_private.notification_request_suppressed(text, uuid) from public, anon, authenticated;
grant execute on function site_private.notification_request_erased(text, uuid) to site_api, service_role;
grant execute on function site_private.notification_request_suppressed(text, uuid) to site_api, service_role;

-- === 3. Lista de supressão =======================================================

-- O chamador calcula site_private.email_hash(e-mail do pedido) e pergunta; o banco
-- responde sem devolver o e-mail. Suprimido = aquele endereço já deu bounce ou já
-- reclamou de spam em pelo menos uma entrega ao titular.
create or replace function public.get_site_notification_suppression(p_email_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hash text := lower(btrim(coalesce(p_email_hash, '')));
  v_result jsonb;
begin
  if v_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_notification_suppression_input';
  end if;

  with matches as (
    select delivery.channel, delivery.delivery_state, delivery.delivery_state_at,
           delivery.complained_at, delivery.bounce_reason
    from site_private.notification_deliveries delivery
    join site_private.quote_requests request
      on delivery.request_kind = 'quote' and request.id = delivery.request_id
    where delivery.audience = 'customer'
      and site_private.email_hash(request.email) = v_hash
    union all
    select delivery.channel, delivery.delivery_state, delivery.delivery_state_at,
           delivery.complained_at, delivery.bounce_reason
    from site_private.notification_deliveries delivery
    join site_private.contact_requests request
      on delivery.request_kind = 'contact' and request.id = delivery.request_id
    where delivery.audience = 'customer'
      and site_private.email_hash(request.email) = v_hash
  ), relevant as (
    select * from matches
    where delivery_state = 'bounced' or complained_at is not null
  )
  select jsonb_build_object(
    'emailHash', v_hash,
    'suppressed', exists (select 1 from relevant),
    'bouncedAt', (select max(delivery_state_at) from relevant where delivery_state = 'bounced'),
    'complainedAt', (select max(complained_at) from relevant),
    'lastBounceReason', (
      select reason from (
        select bounce_reason as reason from relevant
        where delivery_state = 'bounced' and bounce_reason is not null
        order by delivery_state_at desc nulls last
        limit 1
      ) last
    ),
    'channels', coalesce(
      (select jsonb_agg(distinct channel) from relevant), '[]'::jsonb
    ),
    'matchedDeliveries', (select count(*) from relevant)
  )
  into v_result;

  return v_result;
end;
$$;

-- Sem grant para authenticated: o hash é determinístico e calculável por qualquer um que
-- conheça o endereço, então expor a consulta permitiria a um cliente logado descobrir
-- devoluções e reclamações de terceiros. É consulta operacional/de backend: o
-- back-office lê a supressão pelo relatório da fila (get_site_notification_delivery_report),
-- que exige operador ativo.
revoke all on function public.get_site_notification_suppression(text) from public, anon, authenticated;
grant execute on function public.get_site_notification_suppression(text) to site_api, service_role;

comment on function public.get_site_notification_suppression(text) is
  'F-12: lista de supressão consultável por sha256 do e-mail normalizado. Diz se o endereço já deu bounce ou reclamou de spam, quando, em quais canais e o último motivo — sem devolver o e-mail em claro.';

-- === 4. Re-vínculo de evento que chegou antes do aceite ===========================

-- apply_site_notification_provider_event grava delivery_id NULL quando o webhook chega
-- antes de record_site_notification_provider_acceptance: o evento entra na dedupe mas
-- nunca influencia o estado da entrega. Esta RPC religa esses eventos pelo par
-- (provider, provider_message_id) e aplica a MESMA precedência da função original:
-- bounced sobrescreve delivered, delivered nunca sobrescreve bounced, complained é
-- coalesce. Restringe-se a órfãos que já têm provider_message_id (os anteriores a esta
-- migration não têm o dado e só podem ser expurgados).
create or replace function public.reconcile_site_notification_provider_events(
  p_batch_size integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event record;
  v_delivery_id uuid;
  v_linked integer := 0;
  v_applied integer := 0;
  v_unmatched integer := 0;
  v_unmatched_ids uuid[] := array[]::uuid[];
  v_updated integer;
begin
  if p_batch_size is null or p_batch_size not between 1 and 500 then
    raise exception using errcode = '22023', message = 'invalid_notification_reconciliation_input';
  end if;

  -- O lote é escolhido DEPOIS do join: órfão sem entrega correspondente (a mensagem nunca
  -- foi aceita) é contado em "unmatched" e não consome vaga. Antes, `limit` sobre os órfãos
  -- brutos fazia 500 eventos sem correspondência ocuparem o lote inteiro e travarem a
  -- reconciliação dos mais novos até a purga liberar espaço.
  for v_event in
    select event.id, event.provider, event.provider_message_id, event.event_type,
           event.received_at, event.bounce_reason, matched.id as delivery_id
    from site_private.notification_provider_events event
    left join lateral (
      select delivery.id
      from site_private.notification_deliveries delivery
      where delivery.provider = event.provider
        and delivery.provider_message_id = event.provider_message_id
      order by delivery.created_at desc, delivery.id
      limit 1
    ) matched on true
    where event.delivery_id is null and event.provider_message_id is not null
    order by event.received_at, event.id
    limit p_batch_size
    for update of event skip locked
  loop
    v_delivery_id := v_event.delivery_id;

    if v_delivery_id is null then
      v_unmatched := v_unmatched + 1;
      v_unmatched_ids := v_unmatched_ids || v_event.id;
      continue;
    end if;

    update site_private.notification_provider_events
    set delivery_id = v_delivery_id
    where id = v_event.id;
    v_linked := v_linked + 1;

    if v_event.event_type in ('delivered', 'bounced') then
      update site_private.notification_deliveries delivery
      set delivery_state = v_event.event_type,
          delivery_state_at = v_event.received_at,
          bounce_reason = case
            when v_event.event_type = 'bounced' and v_event.bounce_reason is not null then v_event.bounce_reason
            else delivery.bounce_reason
          end,
          delivery_state_source_event_id = v_event.id,
          updated_at = now()
      where delivery.id = v_delivery_id
        and (
          delivery.delivery_state is null
          or (v_event.event_type = 'bounced' and delivery.delivery_state = 'delivered')
        );
      get diagnostics v_updated = row_count;
      v_applied := v_applied + v_updated;
    else
      update site_private.notification_deliveries delivery
      set complained_at = coalesce(delivery.complained_at, v_event.received_at), updated_at = now()
      where delivery.id = v_delivery_id and delivery.complained_at is null;
      get diagnostics v_updated = row_count;
      v_applied := v_applied + v_updated;
    end if;
  end loop;

  return jsonb_build_object(
    'linked', v_linked,
    'appliedToDeliveryState', v_applied,
    'unmatched', v_unmatched,
    'unmatchedEventIds', to_jsonb(v_unmatched_ids)
  );
end;
$$;

revoke all on function public.reconcile_site_notification_provider_events(integer) from public, anon, authenticated;
grant execute on function public.reconcile_site_notification_provider_events(integer) to site_api, service_role;

comment on function public.reconcile_site_notification_provider_events(integer) is
  'F-12: religa eventos de webhook que chegaram antes do aceite do provedor (delivery_id NULL) e reaplica delivery_state/complained_at com a mesma precedência de apply_site_notification_provider_event. Idempotente: evento já vinculado nunca é reprocessado.';

-- === 5. Reprocessamento controlado (exhausted -> pending) ========================

-- Substitui o UPDATE manual de docs/RUNBOOK_INCIDENTES.md. A máquina de estados já
-- aceita exhausted -> pending desde que attempts volte a 0
-- (site_private.status_transitions + enforce_notification_delivery_lease_and_attempts);
-- o que faltava era um caminho auditado, limitado por lote e sem SQL manual.
--
-- Duas funções de propósito: o núcleo não checa operador (é chamado pelo worker e pela
-- própria porta) e a porta pública exige operador ativo. Assim não há heurística sobre
-- session_user/current_user, que muda conforme o PostgREST faz `set role`.
create or replace function site_private.reprocess_notification_deliveries_core(
  p_delivery_ids uuid[],
  p_reason text,
  p_actor_label text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_reason text := btrim(coalesce(p_reason, ''));
  v_actor text := left(btrim(coalesce(p_actor_label, 'notification worker')), 160);
  v_reopened_ids uuid[] := array[]::uuid[];
  v_skipped jsonb;
begin
  select array_agg(distinct item.id) into v_ids
  from unnest(coalesce(p_delivery_ids, array[]::uuid[])) as item(id);

  if v_ids is null or cardinality(v_ids) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'invalid_notification_reprocessing_input';
  end if;
  if length(v_reason) not between 3 and 200 then
    raise exception using errcode = '22023', message = 'invalid_notification_reprocessing_input';
  end if;

  -- Pedido apagado pela autoexclusão do titular (F-30) não volta para a fila: o e-mail
  -- virou @erased.invalid, então reabrir só produziria uma tentativa de entrega para um
  -- endereço que não existe. A autoexclusão preservou a entrega justamente por ela já
  -- não ser elegível; o botão não pode desfazer isso.
  with candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.id = any(v_ids)
      and delivery.status = 'exhausted'
      and not site_private.notification_request_erased(delivery.request_kind, delivery.request_id)
    for update skip locked
  ), reopened as (
    update site_private.notification_deliveries delivery
    set status = 'pending', attempts = 0, next_attempt_at = now(),
        last_error_code = null, last_error_at = null,
        lease_token = null, lease_expires_at = null, claimed_at = null,
        updated_at = now()
    from candidates
    where delivery.id = candidates.id
    returning delivery.id
  )
  select coalesce(array_agg(reopened.id), array[]::uuid[]) into v_reopened_ids
  from reopened;

  if cardinality(v_reopened_ids) > 0 then
    insert into site_private.admin_audit_log (table_name, operation, row_id, performed_by, application_name)
    select 'notification_deliveries', 'UPDATE', item.id::text, v_actor,
           'reprocess_site_notification_deliveries: ' || v_reason
    from unnest(v_reopened_ids) as item(id);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'deliveryId', delivery.id,
    'status', delivery.status,
    'reason', case
      when delivery.status <> 'exhausted' then 'not_exhausted'
      when site_private.notification_request_erased(delivery.request_kind, delivery.request_id) then 'erased'
      else 'locked'
    end
  )), '[]'::jsonb)
  into v_skipped
  from site_private.notification_deliveries delivery
  where delivery.id = any(v_ids) and not (delivery.id = any(v_reopened_ids));

  return jsonb_build_object(
    'reopened', cardinality(v_reopened_ids),
    'reopenedIds', to_jsonb(v_reopened_ids),
    'skipped', v_skipped
  );
end;
$$;

revoke all on function site_private.reprocess_notification_deliveries_core(uuid[], text, text) from public, anon, authenticated;
grant execute on function site_private.reprocess_notification_deliveries_core(uuid[], text, text) to site_api, service_role;

comment on function site_private.reprocess_notification_deliveries_core(uuid[], text, text) is
  'F-12: núcleo do reprocessamento (exhausted -> pending, attempts = 0, trilha em admin_audit_log). Sem checagem de operador — chamado pelo worker e pela porta pública.';

create or replace function public.reprocess_site_notification_deliveries(
  p_delivery_ids uuid[],
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
begin
  return site_private.reprocess_notification_deliveries_core(
    p_delivery_ids,
    p_reason,
    v_operator.display_name
  );
end;
$$;

revoke all on function public.reprocess_site_notification_deliveries(uuid[], text) from public, anon;
grant execute on function public.reprocess_site_notification_deliveries(uuid[], text) to authenticated, service_role;

comment on function public.reprocess_site_notification_deliveries(uuid[], text) is
  'F-12: porta do back-office para reprocessar entregas esgotadas. Exige operador ativo (assert_site_operator) e motivo de 3 a 200 caracteres; o motivo vai para admin_audit_log junto com o nome do operador. Só aceita entregas de fato esgotadas — as demais voltam em "skipped" sem abortar o lote.';

-- === 6. Relatório operacional da fila ============================================

-- O back-office não tinha como ver o que está esgotado nem se o endereço está
-- suprimido. Devolve só os 12 primeiros dígitos do sha256, nunca o e-mail.
create or replace function public.get_site_notification_delivery_report(
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := coalesce(p_limit, 50);
begin
  if v_limit not between 1 and 200 then
    raise exception using errcode = '22023', message = 'invalid_notification_report_input';
  end if;

  perform site_private.assert_site_operator();

  return jsonb_build_object(
    'exhausted', coalesce((
      select jsonb_agg(jsonb_build_object(
        'deliveryId', item.id,
        'requestKind', item.request_kind,
        'requestId', item.request_id,
        'protocol', item.protocol,
        'channel', item.channel,
        'attempts', item.attempts,
        'lastErrorCode', item.last_error_code,
        'lastErrorAt', item.last_error_at,
        'updatedAt', item.updated_at,
        'emailHashPrefix', left(item.email_hash, 12),
        'suppressed', item.suppressed,
        'erased', item.erased
      ) order by item.updated_at desc, item.id)
      from (
        -- Alerta da equipe comercial também esgota (claim_site_commercial_team_alerts),
        -- então orçamento E contato precisam aparecer: sem isso o operador não conseguia
        -- reabrir um alerta de contato pelo painel. Contato não guarda protocolo.
        select delivery.id, delivery.request_kind, delivery.request_id, delivery.channel,
               delivery.attempts, delivery.last_error_code, delivery.last_error_at,
               delivery.updated_at, request.protocol,
               site_private.email_hash(request.email) as email_hash,
               site_private.notification_request_suppressed(delivery.request_kind, delivery.request_id) as suppressed,
               site_private.notification_request_erased(delivery.request_kind, delivery.request_id) as erased
        from site_private.notification_deliveries delivery
        join site_private.quote_requests request
          on delivery.request_kind = 'quote' and request.id = delivery.request_id
        where delivery.status = 'exhausted'
        union all
        select delivery.id, delivery.request_kind, delivery.request_id, delivery.channel,
               delivery.attempts, delivery.last_error_code, delivery.last_error_at,
               delivery.updated_at, null::text as protocol,
               site_private.email_hash(request.email) as email_hash,
               site_private.notification_request_suppressed(delivery.request_kind, delivery.request_id) as suppressed,
               site_private.notification_request_erased(delivery.request_kind, delivery.request_id) as erased
        from site_private.notification_deliveries delivery
        join site_private.contact_requests request
          on delivery.request_kind = 'contact' and request.id = delivery.request_id
        where delivery.status = 'exhausted'
        -- Bloqueio deliberado (supressão/anonimização) não é recuperável pelo painel:
        -- vai para o fim da lista para não consumir as vagas do limite com entrega que
        -- o operador não pode reabrir. O mais antigo recuperável aparece primeiro.
        order by 11, 12, 9 desc, 1
        limit v_limit
      ) item
    ), '[]'::jsonb),
    'orphanEventCount', (
      select count(*) from site_private.notification_provider_events event
      where event.delivery_id is null
    ),
    'reconcilableOrphanCount', (
      select count(*) from site_private.notification_provider_events event
      where event.delivery_id is null and event.provider_message_id is not null
    ),
    'orphanEventOldestAt', (
      select min(event.received_at) from site_private.notification_provider_events event
      where event.delivery_id is null
    )
  );
end;
$$;

revoke all on function public.get_site_notification_delivery_report(integer) from public, anon;
grant execute on function public.get_site_notification_delivery_report(integer) to authenticated, service_role;

comment on function public.get_site_notification_delivery_report(integer) is
  'F-12: visão operacional da fila para o back-office — entregas esgotadas com pseudônimo do e-mail (12 hex), se o endereço está suprimido, e contagem/idade dos eventos órfãos. Exige operador ativo.';

-- === 6a. Claims passam a barrar supressão e pedido apagado ======================

-- Redefinições completas (mesmo corpo da versão vigente) com dois acréscimos por
-- consulta: (1) o housekeeping de 'exhausted' ignora quem está suprimido/apagado, e
-- (2) o candidato precisa passar em site_private.notification_delivery_is_claimable.
-- Nenhuma assinatura muda, então os chamadores em api/ não são tocados.

create or replace function site_private.notification_delivery_is_claimable(p_delivery_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when delivery.audience = 'customer'
      then not site_private.notification_request_erased(delivery.request_kind, delivery.request_id)
       and not site_private.notification_request_suppressed(delivery.request_kind, delivery.request_id)
    else not site_private.notification_request_erased(delivery.request_kind, delivery.request_id)
  end
  from site_private.notification_deliveries delivery
  where delivery.id = p_delivery_id;
$$;

comment on function site_private.notification_delivery_is_claimable(uuid) is
  'F-12: predicado único consultado pelas quatro claims. Falso para destinatário suprimido (bounce/complaint) e para pedido apagado pela autoexclusão do titular.';

revoke all on function site_private.notification_delivery_is_claimable(uuid) from public, anon, authenticated;
grant execute on function site_private.notification_delivery_is_claimable(uuid) to site_api, service_role;

-- === 6b. O envio passa a respeitar a supressão ===================================

-- As quatro funções abaixo são as únicas portas de reivindicação da fila: duas de envio
-- imediato (uma por audiência) e duas de cron. Antes desta migration nenhuma consultava a
-- lista de supressão, então um endereço que devolveu continuava recebendo. A correção
-- entra no mesmo lugar para todas: um endereço suprimido (ou cujo pedido foi apagado pela
-- autoexclusão) não é reivindicado, e a entrega em estado terminal não fica em loop.

create or replace function site_private.suppress_notification_delivery(p_delivery_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery site_private.notification_deliveries%rowtype;
begin
  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.id = p_delivery_id
  for update;

  if not found then return false; end if;
  -- Estado terminal não muda; lease de outro worker ainda válido não é pisado: o
  -- envio em curso termina e a próxima claim já encontra a supressão.
  if v_delivery.status in ('sent', 'cancelled', 'exhausted') then return false; end if;
  if v_delivery.status = 'processing' and v_delivery.lease_expires_at > now() then return false; end if;

  if site_private.notification_request_erased(v_delivery.request_kind, v_delivery.request_id) then
    update site_private.notification_deliveries delivery
    set status = 'cancelled', last_error_code = 'recipient_erased',
        lease_token = null, lease_expires_at = null, claimed_at = null, updated_at = now()
    where delivery.id = v_delivery.id;
    return true;
  end if;

  if v_delivery.audience = 'customer'
    and site_private.notification_request_suppressed(v_delivery.request_kind, v_delivery.request_id) then
    -- 'exhausted', nao 'cancelled': suppressed e um estado que o OPERADOR reabre
    -- depois de resolver o bounce (RUNBOOK_INCIDENTES.md). 'cancelled' e terminal
    -- por omissao na matriz de transicoes, e reprocess_site_notification_deliveries
    -- so reabre 'exhausted' — cancelar aqui deixaria a confirmacao morta para sempre.
    update site_private.notification_deliveries delivery
    set status = 'exhausted', last_error_code = 'recipient_suppressed',
        lease_token = null, lease_expires_at = null, claimed_at = null, updated_at = now()
    where delivery.id = v_delivery.id;
    return true;
  end if;

  return false;
end;
$$;

comment on function site_private.suppress_notification_delivery(uuid) is
  'F-12: encerra entrega cujo destinatário está suprimido (bounce/complaint) com status exhausted, para o operador reabrir via painel depois de resolver o bounce; e cancela entrega cujo pedido foi apagado pela autoexclusão (F-30), que é irreversível. Idempotente e restrita a estado não terminal.';

revoke all on function site_private.suppress_notification_delivery(uuid) from public, anon, authenticated;
grant execute on function site_private.suppress_notification_delivery(uuid) to site_api, service_role;

-- Redefinição das quatro portas de reivindicação, corpo idêntico ao vigente com o
-- predicado de elegibilidade aplicado no housekeeping e nos candidatos.

create or replace function public.claim_site_notification_deliveries(
  p_channels text[],
  p_batch_size integer default 10
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
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

  perform site_private.suppress_notification_delivery(blocked.id)
  from (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(p_channels)
      and delivery.status in ('pending', 'failed', 'processing')
      and not site_private.notification_delivery_is_claimable(delivery.id)
    order by delivery.created_at, delivery.id
    limit p_batch_size
    for update of delivery skip locked
  ) blocked;

  with exhausted_candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(p_channels)
      and delivery.attempts >= v_policy.max_attempts
      and (delivery.last_error_code is distinct from 'whatsapp_dispatch_started' or delivery.provider_message_id is not null)
      and (delivery.status in ('pending', 'failed') or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
      and site_private.notification_delivery_is_claimable(delivery.id)
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
      and ((delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now())
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
      and site_private.notification_delivery_is_claimable(delivery.id)
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
$$;

create or replace function public.claim_site_quote_notification(
  p_request_id uuid,
  p_channel text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_policy record;
  v_delivery site_private.notification_deliveries%rowtype;
begin
  if p_channel not in ('email', 'whatsapp') then
    raise exception using errcode = '22023', message = 'invalid_notification_channel';
  end if;
  select * into v_policy from site_private.notification_policy();

  -- Leitura sem lock do candidato, para poder cancelar (predicado) antes de travar a linha.
  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.request_kind = 'quote'
    and delivery.request_id = p_request_id
    and delivery.channel = p_channel
    and delivery.audience = 'customer'
    and delivery.status in ('pending', 'failed')
    and delivery.next_attempt_at <= now()
    and delivery.attempts < v_policy.max_attempts
  order by delivery.created_at, delivery.id
  limit 1;

  if not found then return null; end if;
  if site_private.suppress_notification_delivery(v_delivery.id) then return null; end if;

  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.id = v_delivery.id
  for update skip locked;
  if not found then return null; end if;
  if v_delivery.status not in ('pending', 'failed')
    or v_delivery.next_attempt_at > now()
    or v_delivery.attempts >= v_policy.max_attempts then
    return null;
  end if;

  update site_private.notification_deliveries delivery
  set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
      lease_token = gen_random_uuid(), claimed_at = now(), lease_expires_at = now() + v_policy.lease_timeout
  where delivery.id = v_delivery.id
  returning * into v_delivery;

  return site_private.quote_notification_payload(v_delivery.id);
end;
$$;

create or replace function public.claim_site_commercial_team_alert(p_request_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
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
  order by delivery.created_at, delivery.id
  limit 1;
  if not found then return null; end if;
  if site_private.suppress_notification_delivery(v_delivery.id) then return null; end if;

  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.id = v_delivery.id
  for update skip locked;
  if not found then return null; end if;
  if v_delivery.status not in ('pending', 'failed')
    or v_delivery.next_attempt_at > now()
    or v_delivery.attempts >= v_policy.max_attempts then
    return null;
  end if;

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
$$;

create or replace function public.claim_site_commercial_team_alerts(
  p_batch_size integer default 10
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_policy record;
  v_jobs jsonb;
begin
  select * into v_policy from site_private.notification_policy();
  if p_batch_size not between 1 and v_policy.batch_max then
    raise exception using errcode = '22023', message = 'invalid_notification_claim_input';
  end if;

  perform site_private.suppress_notification_delivery(blocked.id)
  from (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind in ('quote', 'contact')
      and delivery.audience = 'commercial_team'
      and delivery.status in ('pending', 'failed', 'processing')
      and not site_private.notification_delivery_is_claimable(delivery.id)
    order by delivery.created_at, delivery.id
    limit p_batch_size
    for update of delivery skip locked
  ) blocked;

  with exhausted_candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind in ('quote', 'contact')
      and delivery.audience = 'commercial_team'
      and delivery.attempts >= v_policy.max_attempts
      and (delivery.status in ('pending', 'failed') or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
      and site_private.notification_delivery_is_claimable(delivery.id)
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
      and ((delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now())
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now()))
      and site_private.notification_delivery_is_claimable(delivery.id)
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
$$;

revoke all on function public.claim_site_notification_deliveries(text[], integer) from public, anon, authenticated;
grant execute on function public.claim_site_notification_deliveries(text[], integer) to site_api, service_role;
revoke all on function public.claim_site_quote_notification(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_site_quote_notification(uuid, text) to site_api, service_role;
revoke all on function public.claim_site_commercial_team_alert(uuid) from public, anon, authenticated;
grant execute on function public.claim_site_commercial_team_alert(uuid) to site_api, service_role;
revoke all on function public.claim_site_commercial_team_alerts(integer) from public, anon, authenticated;
grant execute on function public.claim_site_commercial_team_alerts(integer) to site_api, service_role;

-- === 7. Purga dos eventos órfãos =================================================

-- Evento sem delivery nunca era apagado: a tabela de dedupe crescia para sempre com
-- linhas que nenhum fluxo lia. Segue o molde de purge_site_admin_audit_logs (faixa
-- validada + lote + get diagnostics). Só apaga órfãos — um evento vinculado é a fonte de
-- delivery_state_source_event_id e apagá-lo quebraria a FK.
create or replace function public.purge_site_notification_provider_events(
  p_retention_days integer default 180,
  p_batch_size integer default 1000
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if p_retention_days is null or p_retention_days not between 7 and 3650
    or p_batch_size is null or p_batch_size not between 1 and 5000 then
    raise exception using errcode = '22023', message = 'invalid_notification_event_purge_input';
  end if;

  -- Só expurga órfão que a reconciliação não consegue mais religar: órfão COM
  -- provider_message_id e mais antigo que a retenção ainda não teve chance de ser
  -- religado se ele é recente, mas depois da retenção ele já foi tentado em várias
  -- execuções do cron — manter outro critério faria a tabela crescer para sempre.
  with candidates as (
    select event.id
    from site_private.notification_provider_events event
    where event.delivery_id is null
      and event.received_at < now() - make_interval(days => p_retention_days)
    order by event.received_at, event.id
    limit p_batch_size
  )
  delete from site_private.notification_provider_events event using candidates
  where event.id = candidates.id;
  get diagnostics v_deleted = row_count;

  return jsonb_build_object('orphanEventsDeleted', v_deleted);
end;
$$;

revoke all on function public.purge_site_notification_provider_events(integer, integer) from public, anon, authenticated;
grant execute on function public.purge_site_notification_provider_events(integer, integer) to site_api, service_role;

comment on function public.purge_site_notification_provider_events(integer, integer) is
  'F-12: expurga eventos de webhook órfãos (delivery_id NULL) mais antigos que a retenção, em lote. Chamada por api/retention.ts depois da reconciliação — órfão recente ainda pode ser religado.';