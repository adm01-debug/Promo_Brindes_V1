-- Fila transacional de comprovantes do Site Promo Brindes.
-- Aplicar exclusivamente em xlzmclcjdncjfdrjxclt.
-- Não referencia nem altera o catálogo canônico doufsxqlfjyuvxuezpln.

alter table site_private.notification_deliveries
  add column if not exists next_attempt_at timestamptz not null default now();

create index if not exists notification_deliveries_retry_idx
  on site_private.notification_deliveries (next_attempt_at, created_at)
  where status in ('pending', 'failed', 'processing');

create or replace function site_private.enqueue_quote_confirmations()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into site_private.notification_deliveries (
    request_kind, request_id, channel, audience, status, next_attempt_at
  ) values (
    'quote', new.id, 'email', 'customer', 'pending', now()
  ) on conflict (request_kind, request_id, channel, audience) do nothing;

  if new.request_metadata #> '{notificationPreferences,whatsappCopy}' = 'true'::jsonb then
    insert into site_private.notification_deliveries (
      request_kind, request_id, channel, audience, status, next_attempt_at
    ) values (
      'quote', new.id, 'whatsapp', 'customer', 'pending', now()
    ) on conflict (request_kind, request_id, channel, audience) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists quote_requests_enqueue_confirmations on site_private.quote_requests;
create trigger quote_requests_enqueue_confirmations
after insert on site_private.quote_requests
for each row execute function site_private.enqueue_quote_confirmations();

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
    set status = 'processing', attempts = delivery.attempts + 1, updated_at = now()
    from candidates
    where delivery.id = candidates.id
    returning delivery.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', claimed.id,
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
    provider = nullif(p_provider, ''),
    provider_message_id = case when p_status = 'sent' then nullif(p_provider_message_id, '') else null end,
    last_error_code = case when p_status = 'failed' then coalesce(nullif(p_error_code, ''), 'provider_error') else null end,
    last_error_at = case when p_status = 'failed' then now() else null end,
    sent_at = case when p_status = 'sent' then now() else null end,
    next_attempt_at = case when p_status = 'failed' then now() + make_interval(secs => p_retry_after_seconds) else delivery.next_attempt_at end,
    updated_at = now()
  where delivery.id = p_delivery_id and delivery.status = 'processing';
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
  set status = 'processing', attempts = delivery.attempts + 1, updated_at = now()
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
    'id', v_delivery.id, 'requestId', v_request.id, 'channel', v_delivery.channel,
    'attempt', v_delivery.attempts, 'protocol', upper(left(v_request.id::text, 8)),
    'recipientEmail', v_request.email, 'recipientPhone', v_request.phone,
    'contactName', v_request.contact_name, 'company', v_request.company,
    'submittedAt', v_request.created_at, 'items', v_items
  );
end;
$$;

revoke all on function site_private.enqueue_quote_confirmations() from public, anon, authenticated;
revoke all on function public.claim_site_notification_deliveries(text[], integer) from public, anon, authenticated;
revoke all on function public.finalize_site_notification_delivery(uuid, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.claim_site_quote_notification(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_site_notification_deliveries(text[], integer) to service_role;
grant execute on function public.finalize_site_notification_delivery(uuid, text, text, text, text, integer) to service_role;
grant execute on function public.claim_site_quote_notification(uuid, text) to service_role;

comment on function public.claim_site_notification_deliveries(text[], integer) is
  'Entrega ao backend somente comprovantes vencidos para tentativa; nunca executável pelo cliente.';
comment on function public.finalize_site_notification_delivery(uuid, text, text, text, text, integer) is
  'Finaliza uma tentativa previamente reivindicada, com retry limitado e trilha sem conteúdo da mensagem.';
