-- Corrige o contrato da fila de notificações do Site Promo Brindes (R01, R03, R04
-- da revisão de fechamento de 12/09/2026). Migration aditiva, exclusiva de
-- xlzmclcjdncjfdrjxclt. Não referencia nem altera o catálogo canônico
-- doufsxqlfjyuvxuezpln.
--
-- R04 — finalização não identificava a tentativa: um trabalhador com lease
-- expirado podia finalizar a reivindicação seguinte. Corrigido com
-- lease_token, gerado a cada claim e exigido na finalização.
--
-- R03 — job preso em processing após a quinta tentativa nunca terminalizava:
-- o limite de tentativas também bloqueava o próprio ramo de recuperação.
-- Corrigido separando os dois: recuperação de processing expirado sempre
-- roda; só entra numa NOVA tentativa se ainda houver tentativas restantes,
-- senão vai direto para o estado terminal 'exhausted'.

alter table site_private.notification_deliveries
  add column if not exists lease_token uuid;

alter table site_private.notification_deliveries
  drop constraint if exists notification_deliveries_status_check;
alter table site_private.notification_deliveries
  add constraint notification_deliveries_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled', 'exhausted'));

comment on column site_private.notification_deliveries.lease_token is
  'Identifica a reivindicação corrente; finalize_site_notification_delivery só aceita o token da reivindicação ativa (R04).';

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
  v_jobs jsonb;
begin
  if p_batch_size not between 1 and 25
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
  set status = 'exhausted', lease_token = null, updated_at = now()
  where delivery.request_kind = 'quote'
    and delivery.audience = 'customer'
    and delivery.channel = any(p_channels)
    and delivery.attempts >= 5
    and (
      delivery.status in ('pending', 'failed')
      or (delivery.status = 'processing' and delivery.updated_at <= now() - interval '10 minutes')
    );

  with candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(p_channels)
      and delivery.attempts < 5
      and (
        (delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now())
        or (delivery.status = 'processing' and delivery.updated_at <= now() - interval '10 minutes')
      )
    order by delivery.next_attempt_at, delivery.created_at, delivery.id
    for update of delivery skip locked
    limit p_batch_size
  ), claimed as (
    update site_private.notification_deliveries delivery
    set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
        lease_token = gen_random_uuid()
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

-- A assinatura muda (p_lease_token inserido); create or replace com uma
-- assinatura diferente cria uma SEGUNDA função em vez de substituir a
-- original, deixando a antiga órfã no catálogo. Remove explicitamente antes.
drop function if exists public.finalize_site_notification_delivery(uuid, text, text, text, text, integer);

create function public.finalize_site_notification_delivery(
  p_delivery_id uuid,
  p_lease_token uuid,
  p_status text,
  p_provider text default null,
  p_provider_message_id text default null,
  p_error_code text default null,
  p_retry_after_seconds integer default 300
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
    or p_retry_after_seconds not between 60 and 86400
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
    next_attempt_at = case when p_status = 'failed' then now() + make_interval(secs => p_retry_after_seconds) else delivery.next_attempt_at end,
    lease_token = null,
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
  v_delivery site_private.notification_deliveries%rowtype;
  v_request site_private.quote_requests%rowtype;
  v_items jsonb;
begin
  if p_channel not in ('email', 'whatsapp') then
    raise exception using errcode = '22023', message = 'invalid_notification_channel';
  end if;

  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.request_kind = 'quote'
    and delivery.request_id = p_request_id
    and delivery.channel = p_channel
    and delivery.audience = 'customer'
    and delivery.status in ('pending', 'failed')
    and delivery.next_attempt_at <= now()
    and delivery.attempts < 5
  for update skip locked;
  if not found then return null; end if;

  update site_private.notification_deliveries delivery
  set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
      lease_token = gen_random_uuid()
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

-- Persiste o aceite do provedor assim que ele responder, sem esperar a
-- finalização. Se a finalização falhar depois (rede, timeout da função),
-- a próxima tentativa vê existingProviderMessageId e reconcilia em vez de
-- reenviar (R01, R02) — inclusive para o WhatsApp, cuja API não oferece uma
-- chave de idempotência própria como a do Resend.
create function public.record_site_notification_provider_acceptance(
  p_delivery_id uuid,
  p_lease_token uuid,
  p_provider text,
  p_provider_message_id text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if length(coalesce(p_provider, '')) not between 1 and 80
    or length(coalesce(p_provider_message_id, '')) not between 1 and 240 then
    raise exception using errcode = '22023', message = 'invalid_notification_acceptance_input';
  end if;

  update site_private.notification_deliveries delivery
  set provider = p_provider, provider_message_id = p_provider_message_id, updated_at = now()
  where delivery.id = p_delivery_id and delivery.status = 'processing' and delivery.lease_token = p_lease_token;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.finalize_site_notification_delivery(uuid, uuid, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.finalize_site_notification_delivery(uuid, uuid, text, text, text, text, integer) to service_role;
revoke all on function public.record_site_notification_provider_acceptance(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_site_notification_provider_acceptance(uuid, uuid, text, text) to service_role;

comment on function public.finalize_site_notification_delivery(uuid, uuid, text, text, text, text, integer) is
  'Finaliza uma tentativa previamente reivindicada; exige o lease_token da reivindicação ativa (R04). Retry limitado, trilha sem conteúdo da mensagem.';
comment on function public.record_site_notification_provider_acceptance(uuid, uuid, text, text) is
  'Registra o aceite do provedor antes da finalização, para reconciliação em caso de falha na etapa seguinte (R01, R02).';
