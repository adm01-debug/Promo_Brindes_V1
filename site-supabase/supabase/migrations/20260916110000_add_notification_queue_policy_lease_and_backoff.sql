-- Etapas 9, 10, 11 e 12 do plano de correções
-- (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md). Migration aditiva,
-- exclusiva de xlzmclcjdncjfdrjxclt. Reescreve claim_site_notification_deliveries,
-- claim_site_quote_notification e finalize_site_notification_delivery numa única
-- passada (evita reabrir as mesmas funções três vezes em migrations separadas).
--
-- Etapa 9 (revisada durante a implementação) — o plano original previa um trigger de
-- máquina de estados completa para notification_deliveries.status, como a de
-- quote_requests (Etapa 8). Investigação dos testes existentes
-- (notification_outbox.test.sql) mostrou que fixtures legítimas reescrevem status e
-- attempts diretamente para simular jobs presos, incluindo reaproveitar a mesma linha
-- para dois cenários em sequência (exhausted -> processing de novo). Um trigger de
-- transição estrita quebraria esses fixtures sem ganho real de segurança, porque quem
-- os escreve é o próprio time de teste, não um admin no Studio. A invariante que
-- realmente importa — nunca existir 'processing' sem lease, nem lease sobrevivendo a um
-- estado terminal — vira uma CHECK constraint declarativa: mais simples, não pode ser
-- esquecida/desabilitada, e continua verdadeira em 100% dos caminhos de código atuais
-- (confirmado por leitura de claim_site_notification_deliveries,
-- claim_site_quote_notification e finalize_site_notification_delivery antes de escrever
-- esta migration).
--
-- Etapa 10 — a lease era inferida por updated_at <= now() - interval '10 minutes', e
-- record_site_notification_provider_acceptance também grava updated_at = now(),
-- prorrogando a lease sem essa ser uma decisão explícita. claimed_at/lease_expires_at
-- tornam isso um dado, não uma inferência.
--
-- Etapa 11 — o backoff era linear e definido pelo cliente (p_retry_after_seconds,
-- default 300). Sob indisponibilidade do provedor, todas as tentativas voltavam ao
-- mesmo instante. site_private.next_retry_at() calcula backoff exponencial com jitter;
-- p_retry_after_seconds vira só um piso opcional vindo do provedor (ex.: Retry-After).
--
-- Etapa 12 — 5 tentativas, 10 minutos de lease e lote de 25 estavam repetidos como
-- literais em duas funções. site_private.notification_policy() centraliza os valores.

-- === Etapa 12: política única ======================================================

create or replace function site_private.notification_policy()
returns table (
  max_attempts smallint,
  lease_timeout interval,
  batch_max integer,
  retry_base_seconds integer,
  retry_cap_seconds integer
)
language sql
immutable
security invoker
set search_path = ''
as $$
  select 5::smallint, interval '10 minutes', 25, 60, 3600;
$$;

comment on function site_private.notification_policy() is
  'Fonte única dos parâmetros da fila de notificações (Etapa 12). Mudar tentativas máximas, timeout de lease, lote máximo ou parâmetros de backoff é editar só esta função, em vez de caçar literais espalhados.';

revoke all on function site_private.notification_policy() from public, anon, authenticated;
grant execute on function site_private.notification_policy() to service_role;

-- === Etapa 11: backoff exponencial com jitter ======================================

create or replace function site_private.next_retry_at(
  p_attempts smallint,
  p_now timestamptz default now(),
  p_jitter double precision default null
)
returns timestamptz
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_policy record;
  v_jitter double precision := coalesce(p_jitter, random());
  v_delay_seconds numeric;
begin
  select * into v_policy from site_private.notification_policy();
  if p_attempts < 1 then
    raise exception using errcode = '22023', message = 'invalid_retry_attempts';
  end if;
  if v_jitter < 0 or v_jitter >= 1 then
    raise exception using errcode = '22023', message = 'invalid_retry_jitter';
  end if;

  v_delay_seconds := least(
    v_policy.retry_base_seconds * power(2, least(p_attempts - 1, 10)),
    v_policy.retry_cap_seconds
  );
  -- Jitter de 0 a 20% para além do delay calculado: evita que todas as tentativas
  -- represadas por uma indisponibilidade do provedor voltem no mesmo instante exato.
  v_delay_seconds := v_delay_seconds * (1 + v_jitter * 0.2);

  return p_now + make_interval(secs => v_delay_seconds);
end;
$$;

comment on function site_private.next_retry_at(smallint, timestamptz, double precision) is
  'Backoff exponencial com jitter (Etapa 11). p_jitter é só para teste determinístico — em produção usa random() (por isso a função é volatile, não immutable: o db lint acusou a classificação errada quando marcada immutable, já que random() não é determinística).';

revoke all on function site_private.next_retry_at(smallint, timestamptz, double precision) from public, anon, authenticated;
grant execute on function site_private.next_retry_at(smallint, timestamptz, double precision) to service_role;

-- === Etapa 10: lease explícita ======================================================

alter table site_private.notification_deliveries
  add column if not exists claimed_at timestamptz,
  add column if not exists lease_expires_at timestamptz;

comment on column site_private.notification_deliveries.claimed_at is
  'Instante da reivindicação corrente (Etapa 10). Histórico: não é limpo na finalização, só na próxima reivindicação.';
comment on column site_private.notification_deliveries.lease_expires_at is
  'Prazo da reivindicação corrente (Etapa 10). Substitui a inferência antiga por updated_at, que record_site_notification_provider_acceptance prorrogava sem essa ser uma decisão explícita. Null sempre que status <> processing (Etapa 9).';

-- === Etapa 9: invariante declarativa lease <-> status ==============================

alter table site_private.notification_deliveries
  drop constraint if exists notification_deliveries_lease_matches_status;
alter table site_private.notification_deliveries
  add constraint notification_deliveries_lease_matches_status
  check (
    (status = 'processing' and lease_token is not null and lease_expires_at is not null)
    or (status <> 'processing' and lease_token is null and lease_expires_at is null)
  );

comment on constraint notification_deliveries_lease_matches_status on site_private.notification_deliveries is
  'Etapa 9: nunca existe processing sem lease, nem lease sobrevivendo a um estado não-processing. Declarativa em vez de trigger — ver cabeçalho da migration 20260916110000 para o porquê.';

-- === Reescrita das três funções sobre a base acima ==================================

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

  -- Termina definitivamente jobs presos em processing que já esgotaram as
  -- tentativas: não são elegíveis a nova tentativa, mas também não podem
  -- ficar presos indefinidamente (R03). Também cobre pending/failed que
  -- esgotaram tentativas sem nunca ter sido marcados como tal.
  update site_private.notification_deliveries delivery
  set status = 'exhausted', lease_token = null, lease_expires_at = null, updated_at = now()
  where delivery.request_kind = 'quote'
    and delivery.audience = 'customer'
    and delivery.channel = any(p_channels)
    and delivery.attempts >= v_policy.max_attempts
    and (
      delivery.status in ('pending', 'failed')
      or (delivery.status = 'processing' and delivery.lease_expires_at <= now())
    );

  with candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(p_channels)
      and delivery.attempts < v_policy.max_attempts
      and (
        (delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now())
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now())
      )
    order by delivery.next_attempt_at, delivery.created_at, delivery.id
    for update of delivery skip locked
    limit p_batch_size
  ), claimed as (
    update site_private.notification_deliveries delivery
    set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
        lease_token = gen_random_uuid(), claimed_at = now(),
        lease_expires_at = now() + v_policy.lease_timeout
    from candidates
    where delivery.id = candidates.id
    returning delivery.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', claimed.id,
    'leaseToken', claimed.lease_token,
    -- Presentes quando uma tentativa anterior já obteve aceite do provedor
    -- mas não concluiu a finalização (R01/R02): o backend reconcilia em vez
    -- de reenviar.
    'existingProvider', claimed.provider,
    'existingProviderMessageId', claimed.provider_message_id,
    'requestId', request.id,
    'channel', claimed.channel,
    'attempt', claimed.attempts,
    'protocol', upper(left(request.id::text, 8)),
    'recipientEmail', request.email,
    'recipientPhone', request.phone,
    'contactName', request.contact_name,
    'company', request.company,
    'submittedAt', request.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', item.product_name_snapshot,
        'sku', item.sku_snapshot,
        'quantity', item.quantity,
        'colorName', item.color_name_snapshot
      ) order by item.position)
      from site_private.quote_items item
      where item.quote_request_id = request.id
    ), '[]'::jsonb)
  ) order by claimed.created_at, claimed.id), '[]'::jsonb)
  into v_jobs
  from claimed
  join site_private.quote_requests request on request.id = claimed.request_id;

  return v_jobs;
end;
$$;

create or replace function public.finalize_site_notification_delivery(
  p_delivery_id uuid,
  p_lease_token uuid,
  p_status text,
  p_provider text default null,
  p_provider_message_id text default null,
  p_error_code text default null,
  p_retry_after_seconds integer default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_status not in ('sent', 'failed', 'cancelled')
    or (p_retry_after_seconds is not null and p_retry_after_seconds not between 0 and 86400)
    or length(coalesce(p_provider, '')) > 80
    or length(coalesce(p_provider_message_id, '')) > 240
    or length(coalesce(p_error_code, '')) > 120 then
    raise exception using errcode = '22023', message = 'invalid_notification_finalize_input';
  end if;

  update site_private.notification_deliveries delivery
  set
    status = p_status,
    -- provider_message_id é preservado mesmo em falha/cancelamento: se o
    -- provedor já aceitou a mensagem antes de a finalização falhar, o ID
    -- permite reconciliar em vez de reenviar na próxima recuperação (R01/R02).
    provider = coalesce(nullif(p_provider, ''), delivery.provider),
    provider_message_id = coalesce(nullif(p_provider_message_id, ''), delivery.provider_message_id),
    last_error_code = case when p_status = 'failed' then coalesce(nullif(p_error_code, ''), 'provider_error') else null end,
    last_error_at = case when p_status = 'failed' then now() else null end,
    sent_at = case when p_status = 'sent' then now() else null end,
    -- Backoff exponencial com jitter (Etapa 11) é o piso; um Retry-After do
    -- provedor maior que o backoff calculado prevalece, nunca o contrário.
    next_attempt_at = case when p_status = 'failed' then greatest(
        site_private.next_retry_at(delivery.attempts, now()),
        now() + make_interval(secs => coalesce(p_retry_after_seconds, 0))
      ) else delivery.next_attempt_at end,
    lease_token = null,
    lease_expires_at = null,
    updated_at = now()
  where delivery.id = p_delivery_id and delivery.status = 'processing' and delivery.lease_token = p_lease_token;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
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
  v_request site_private.quote_requests%rowtype;
  v_items jsonb;
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
  for update skip locked;
  if not found then return null; end if;

  update site_private.notification_deliveries delivery
  set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
      lease_token = gen_random_uuid(), claimed_at = now(),
      lease_expires_at = now() + v_policy.lease_timeout
  where delivery.id = v_delivery.id
  returning * into v_delivery;

  select * into v_request from site_private.quote_requests request where request.id = p_request_id;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', item.product_name_snapshot, 'sku', item.sku_snapshot,
    'quantity', item.quantity, 'colorName', item.color_name_snapshot
  ) order by item.position), '[]'::jsonb)
  into v_items from site_private.quote_items item where item.quote_request_id = p_request_id;

  return jsonb_build_object(
    'id', v_delivery.id, 'leaseToken', v_delivery.lease_token,
    'existingProvider', v_delivery.provider, 'existingProviderMessageId', v_delivery.provider_message_id,
    'requestId', v_request.id, 'channel', v_delivery.channel,
    'attempt', v_delivery.attempts, 'protocol', upper(left(v_request.id::text, 8)),
    'recipientEmail', v_request.email, 'recipientPhone', v_request.phone,
    'contactName', v_request.contact_name, 'company', v_request.company,
    'submittedAt', v_request.created_at, 'items', v_items
  );
end;
$$;

-- record_site_notification_provider_acceptance não muda: já não toca em lease_token
-- nem (agora) em lease_expires_at, então continua sem prorrogar a lease (Etapa 10
-- resolvido pela própria existência da coluna nova, sem precisar tocar nesta função).

-- Nenhuma das três já tinha DROP explícito necessário: assinaturas inalteradas
-- (finalize mantém p_retry_after_seconds, só muda o default de 300 para null e o
-- comportamento de "piso" em vez de "valor final").
revoke all on function public.claim_site_notification_deliveries(text[], integer) from public, anon, authenticated;
grant execute on function public.claim_site_notification_deliveries(text[], integer) to service_role;
revoke all on function public.finalize_site_notification_delivery(uuid, uuid, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.finalize_site_notification_delivery(uuid, uuid, text, text, text, text, integer) to service_role;
revoke all on function public.claim_site_quote_notification(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_site_quote_notification(uuid, text) to service_role;

comment on function public.claim_site_notification_deliveries(text[], integer) is
  'Reivindica lote da fila assíncrona; lê limites de site_private.notification_policy() (Etapa 12) e grava lease_expires_at explícito (Etapa 10).';
comment on function public.finalize_site_notification_delivery(uuid, uuid, text, text, text, text, integer) is
  'Finaliza uma tentativa previamente reivindicada; exige o lease_token da reivindicação ativa (R04). Backoff exponencial com jitter via site_private.next_retry_at (Etapa 11); p_retry_after_seconds é só um piso opcional do provedor.';
comment on function public.claim_site_quote_notification(uuid, text) is
  'Reivindicação síncrona imediata (não recupera processing preso — isso é papel exclusivo do worker assíncrono). Lê limites de site_private.notification_policy() (Etapa 12).';
