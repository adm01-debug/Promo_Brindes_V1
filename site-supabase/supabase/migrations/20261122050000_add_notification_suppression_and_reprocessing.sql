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
--   6. Relatório operacional da fila (esgotados, suprimidos, órfãos) para o back-office.
--   7. Purga dos eventos órfãos, chamada por api/retention.ts.
--
-- Nenhuma função existente muda de assinatura; nenhuma coluna nova é NOT NULL, então
-- nenhum insert existente quebra.

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

revoke all on function public.get_site_notification_suppression(text) from public, anon;
grant execute on function public.get_site_notification_suppression(text) to authenticated, site_api, service_role;

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

  for v_event in
    select event.id, event.provider, event.provider_message_id, event.event_type,
           event.received_at, event.bounce_reason
    from site_private.notification_provider_events event
    where event.delivery_id is null and event.provider_message_id is not null
    order by event.received_at, event.id
    limit p_batch_size
    for update skip locked
  loop
    select delivery.id into v_delivery_id
    from site_private.notification_deliveries delivery
    where delivery.provider = v_event.provider
      and delivery.provider_message_id = v_event.provider_message_id
    order by delivery.created_at desc, delivery.id
    limit 1;

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

  with candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.id = any(v_ids) and delivery.status = 'exhausted'
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
           left('reprocess_site_notification_deliveries: ' || v_reason, 200)
    from unnest(v_reopened_ids) as item(id);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'deliveryId', delivery.id,
    'status', delivery.status,
    'reason', case when delivery.status = 'exhausted' then 'locked' else 'not_exhausted' end
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
        'suppressed', item.suppressed
      ) order by item.updated_at desc, item.id)
      from (
        select delivery.id, delivery.request_kind, delivery.request_id, delivery.channel,
               delivery.attempts, delivery.last_error_code, delivery.last_error_at,
               delivery.updated_at, request.protocol,
               site_private.email_hash(request.email) as email_hash,
               exists (
                 select 1
                 from site_private.notification_deliveries previous
                 join site_private.quote_requests previous_request
                   on previous_request.id = previous.request_id
                 where previous.request_kind = 'quote'
                   and previous.audience = 'customer'
                   and previous_request.email = request.email
                   and (previous.delivery_state = 'bounced' or previous.complained_at is not null)
               ) as suppressed
        from site_private.notification_deliveries delivery
        join site_private.quote_requests request
          on delivery.request_kind = 'quote' and request.id = delivery.request_id
        where delivery.status = 'exhausted'
        order by delivery.updated_at desc, delivery.id
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