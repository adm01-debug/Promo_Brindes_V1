-- Solicitações de ajuste do titular autenticado.
-- Aplicar exclusivamente no projeto isolado xlzmclcjdncjfdrjxclt.
-- Não toca no catálogo canônico doufsxqlfjyuvxuezpln.

create table if not exists site_private.quote_adjustment_requests (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references site_private.quote_requests(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  client_request_id text not null check (client_request_id ~ '^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,99}$'),
  message text not null check (length(trim(message)) between 2 and 800),
  status text not null default 'new' check (status in ('new', 'triaged', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_request_id, requested_by, client_request_id)
);

create index if not exists quote_adjustments_request_created_idx
  on site_private.quote_adjustment_requests (quote_request_id, created_at desc);

alter table site_private.quote_adjustment_requests enable row level security;
revoke all on site_private.quote_adjustment_requests from public, anon, authenticated;
grant select, insert, update, delete on site_private.quote_adjustment_requests to service_role;

create trigger quote_adjustment_requests_set_updated_at
before update on site_private.quote_adjustment_requests
for each row execute function site_private.set_updated_at();

alter table site_private.quote_request_events
  drop constraint if exists quote_request_events_event_type_check;

alter table site_private.quote_request_events
  add constraint quote_request_events_event_type_check
  check (event_type in ('received', 'status_changed', 'message', 'proposal_published', 'adjustment_requested'));

create or replace function public.request_my_quote_adjustment(
  p_request_id uuid,
  p_message text,
  p_client_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_adjustment_id uuid;
  v_created_at timestamptz;
  v_message text := left(trim(coalesce(p_message, '')), 800);
  v_client_request_id text := left(trim(coalesce(p_client_request_id, '')), 100);
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if p_request_id is null or not exists (
    select 1 from site_private.quote_requests request
    where request.id = p_request_id
      and request.customer_user_id = v_user_id
      and request.status <> 'spam'
  ) then
    raise exception using errcode = '42501', message = 'quote_not_found';
  end if;
  if length(v_message) < 2 then
    raise exception using errcode = '22023', message = 'adjustment_message_required';
  end if;
  if v_client_request_id !~ '^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,99}$' then
    raise exception using errcode = '22023', message = 'invalid_client_request_id';
  end if;

  insert into site_private.quote_adjustment_requests (
    quote_request_id, requested_by, client_request_id, message
  ) values (
    p_request_id, v_user_id, v_client_request_id, v_message
  )
  on conflict (quote_request_id, requested_by, client_request_id) do update
    set client_request_id = excluded.client_request_id
  returning id, created_at into v_adjustment_id, v_created_at;

  if not exists (
    select 1 from site_private.quote_request_events event
    where event.quote_request_id = p_request_id
      and event.event_type = 'adjustment_requested'
      and event.description = v_adjustment_id::text
  ) then
    insert into site_private.quote_request_events (
      quote_request_id, event_type, title, description, audience
    ) values (
      p_request_id,
      'adjustment_requested',
      'Pedido de ajuste recebido',
      v_adjustment_id::text,
      'internal'
    );
    insert into site_private.quote_request_events (
      quote_request_id, event_type, title, description, audience
    ) values (
      p_request_id,
      'adjustment_requested',
      'Pedido de ajuste enviado',
      'Nosso time de especialistas vai considerar seu comentário na próxima atualização.',
      'customer'
    );
  end if;

  return jsonb_build_object('id', v_adjustment_id, 'createdAt', v_created_at);
end;
$$;

revoke all on function public.request_my_quote_adjustment(uuid, text, text) from public, anon;
grant execute on function public.request_my_quote_adjustment(uuid, text, text) to authenticated, service_role;

comment on function public.request_my_quote_adjustment(uuid, text, text) is
  'Registra um pedido de ajuste somente para o titular autenticado da solicitação, mantendo o texto no schema privado.';
