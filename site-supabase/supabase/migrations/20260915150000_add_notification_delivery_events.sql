-- Etapa 30 do plano de fechamento (R07): webhooks de entrega e devolução.
-- Migration aditiva, exclusiva de xlzmclcjdncjfdrjxclt.
--
-- `status` em notification_deliveries é a máquina de estados do ENVIO
-- (pending/processing/sent/failed/cancelled/exhausted), usada pelas queries
-- de reivindicação da fila. Entrega/devolução/reclamação acontecem DEPOIS
-- que o provedor já aceitou (status='sent'), de forma assíncrona, fora do
-- ciclo de retry — são uma dimensão ortogonal, não um novo valor de status.
-- Misturar arriscaria tornar uma linha 'sent' elegível a reclaim por
-- acidente. Por isso: colunas novas e independentes, não extensão do enum.

alter table site_private.notification_deliveries
  add column if not exists delivery_state text check (delivery_state in ('delivered', 'bounced')),
  add column if not exists delivery_state_at timestamptz,
  add column if not exists bounce_reason text check (bounce_reason is null or length(bounce_reason) <= 200),
  add column if not exists complained_at timestamptz;

comment on column site_private.notification_deliveries.delivery_state is
  'Resultado terminal pós-aceite (Etapa 30): delivered ou bounced. Mutuamente exclusivos; só grava se ainda null (primeiro evento vence, sem depender de clock do provedor).';
comment on column site_private.notification_deliveries.bounce_reason is
  'Categoria curta fornecida pelo provedor (ex. Resend bounce.type, Meta errors[].title) — não é texto livre do usuário.';
comment on column site_private.notification_deliveries.complained_at is
  'Reclamação de spam (Etapa 30), independente de delivery_state: uma mensagem pode ser entregue e só depois reclamada.';

-- Todo webhook busca a entrega por (provider, provider_message_id); passa a
-- ser caminho quente, hoje sem índice dedicado.
create index if not exists notification_deliveries_provider_lookup_idx
  on site_private.notification_deliveries (provider, provider_message_id)
  where provider_message_id is not null;

-- Deduplicação de eventos de webhook. Resend: chave = header svix-id
-- (estável entre reentregas do Svix). Meta: sem id de evento único no
-- payload — chave composta "${wamid}:${status}" (mesmo wamid recebe vários
-- status ao longo do tempo, isso não é duplicata; o mesmo par pode ser
-- reentregue, isso é).
create table site_private.notification_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('resend', 'meta-whatsapp-cloud')),
  provider_event_id text not null check (length(provider_event_id) between 1 and 240),
  event_type text not null check (event_type in ('delivered', 'bounced', 'complained')),
  delivery_id uuid references site_private.notification_deliveries(id),
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index notification_provider_events_delivery_id_idx
  on site_private.notification_provider_events (delivery_id)
  where delivery_id is not null;

alter table site_private.notification_provider_events enable row level security;
revoke all on site_private.notification_provider_events from public, anon, authenticated;
grant select, insert, update, delete on site_private.notification_provider_events to service_role;

comment on table site_private.notification_provider_events is
  'Deduplicação de eventos de webhook de entrega/devolução (Etapa 30). Sem conteúdo pessoal — apenas ids de correlação do provedor.';

create function public.apply_site_notification_provider_event(
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

  insert into site_private.notification_provider_events (provider, provider_event_id, event_type, delivery_id)
  values (p_provider, p_provider_event_id, p_event_type, v_delivery_id)
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
        updated_at = now()
    where delivery.id = v_delivery_id and delivery.delivery_state is null;
    get diagnostics v_updated = row_count;
    -- Estado terminal já definido por um evento anterior (não necessariamente
    -- duplicata: pode ser um bounced atrasado chegando depois de um delivered
    -- já aplicado). O evento já foi gravado na tabela de dedup acima — não é
    -- reentregue à toa — mas não regride o delivery_state.
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
  'Aplica evento de webhook (entrega/devolução/reclamação) de forma idempotente (Etapa 30). delivered/bounced só gravam se delivery_state ainda for null (primeiro evento vence, sem depender de clock do provedor); complained é independente e idempotente via coalesce.';
