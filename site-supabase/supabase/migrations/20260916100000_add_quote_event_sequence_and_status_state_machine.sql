-- Etapas 7 e 8 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md).
-- Migration aditiva, exclusiva de xlzmclcjdncjfdrjxclt.
--
-- Etapa 7 — site_private.quote_request_events ordenava por created_at, que é fixo por
-- transação: dois eventos inseridos na mesma transação (ex.: o trigger de status_changed
-- disparando junto de outro insert) podem ter created_at idêntico e ordem indefinida.
-- Uma coluna identity monotônica resolve isso sem depender do relógio.
--
-- Etapa 8 — quote_requests.status e contact_requests.status só tinham a validação de
-- valores (check), não de sequência: nada impedia um update manual (Studio/SQL) pular
-- direto de 'closed' para 'triaged', ou reabrir um 'spam'. Confirmado por auditoria de
-- código que nenhuma RPC ou trigger muda esses status hoje (só o default 'new' no
-- insert) — a máquina de estados abaixo não altera nenhum comportamento existente,
-- só bloqueia updates administrativos fora de ordem.

-- === Etapa 7: sequência monotônica ===============================================

alter table site_private.quote_request_events
  add column if not exists sequence bigint generated always as identity;

alter table site_private.quote_request_events
  add constraint quote_request_events_sequence_key unique (sequence);

create index if not exists quote_request_events_request_sequence_idx
  on site_private.quote_request_events (quote_request_id, sequence desc);

drop index if exists site_private.quote_request_events_request_created_idx;

comment on column site_private.quote_request_events.sequence is
  'Ordem de inserção monotônica (Etapa 7). Usar em vez de created_at para ordenar eventos do mesmo pedido: created_at é fixo por transação e não desempata eventos inseridos juntos.';

-- get_my_quote_request passa a ordenar a linha do tempo por sequence; created_at
-- continua exposto ao cliente para exibição, só não é mais o critério de ordem.
create or replace function public.get_my_quote_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request site_private.quote_requests%rowtype;
  v_items jsonb;
  v_events jsonb;
  v_proposals jsonb;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select * into v_request from site_private.quote_requests request
  where request.id = p_request_id and request.customer_user_id = v_user_id and request.status <> 'spam';
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'key', item.item_key, 'productId', item.source_product_id, 'slug', item.product_slug,
    'name', item.product_name_snapshot, 'sku', item.sku_snapshot, 'imageUrl', item.image_url_snapshot,
    'quantity', item.quantity, 'minQuantity', item.minimum_quantity_snapshot, 'variantId', item.variant_id_snapshot,
    'colorName', item.color_name_snapshot, 'colorHex', item.color_hex_snapshot,
    'decisionGroup', item.decision_group_snapshot
  ) order by item.position), '[]'::jsonb) into v_items
  from site_private.quote_items item where item.quote_request_id = v_request.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', event.id, 'type', event.event_type, 'status', event.status, 'title', event.title,
    'description', event.description, 'createdAt', event.created_at
  ) order by event.sequence desc), '[]'::jsonb) into v_events
  from site_private.quote_request_events event where event.quote_request_id = v_request.id and event.audience = 'customer';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', proposal.id, 'version', proposal.version, 'title', proposal.title, 'validUntil', proposal.valid_until,
    'publishedAt', proposal.published_at, 'isCurrent', proposal.superseded_at is null
  ) order by proposal.version desc), '[]'::jsonb) into v_proposals
  from site_private.proposal_documents proposal where proposal.quote_request_id = v_request.id and proposal.published_at is not null;

  return jsonb_build_object(
    'id', v_request.id, 'protocol', upper(left(v_request.id::text, 8)), 'status', v_request.status,
    'createdAt', v_request.created_at, 'submittedAt', v_request.client_submitted_at, 'company', v_request.company,
    'contactName', v_request.contact_name, 'email', v_request.email, 'phone', v_request.phone, 'city', v_request.city,
    'desiredDeadline', v_request.desired_deadline, 'notes', v_request.notes,
    'campaign', v_request.request_metadata -> 'campaign', 'briefing', v_request.request_metadata -> 'briefing',
    'items', v_items, 'events', v_events, 'proposals', v_proposals
  );
end;
$$;

revoke all on function public.get_my_quote_request(uuid) from public, anon;
grant execute on function public.get_my_quote_request(uuid) to authenticated, service_role;

-- === Etapa 8: máquina de estados de status administrativo ========================

create table if not exists site_private.status_transitions (
  entity text not null check (entity in ('quote_requests', 'contact_requests')),
  from_status text not null,
  to_status text not null,
  primary key (entity, from_status, to_status)
);

alter table site_private.status_transitions enable row level security;
alter table site_private.status_transitions force row level security;
revoke all on site_private.status_transitions from public, anon, authenticated;
grant select on site_private.status_transitions to service_role;

comment on table site_private.status_transitions is
  'Transições administrativas válidas por entidade (Etapa 8). Fonte única de verdade para os triggers enforce_status_transition; qualquer update de status fora desta tabela é rejeitado com 22023.';

insert into site_private.status_transitions (entity, from_status, to_status) values
  ('quote_requests', 'new', 'triaged'),
  ('quote_requests', 'new', 'in_progress'),
  ('quote_requests', 'new', 'spam'),
  ('quote_requests', 'new', 'closed'),
  ('quote_requests', 'triaged', 'in_progress'),
  ('quote_requests', 'triaged', 'spam'),
  ('quote_requests', 'triaged', 'closed'),
  ('quote_requests', 'in_progress', 'quoted'),
  ('quote_requests', 'in_progress', 'spam'),
  ('quote_requests', 'in_progress', 'closed'),
  ('quote_requests', 'quoted', 'in_progress'),
  ('quote_requests', 'quoted', 'closed'),
  ('contact_requests', 'new', 'triaged'),
  ('contact_requests', 'new', 'in_progress'),
  ('contact_requests', 'new', 'spam'),
  ('contact_requests', 'new', 'closed'),
  ('contact_requests', 'triaged', 'in_progress'),
  ('contact_requests', 'triaged', 'spam'),
  ('contact_requests', 'triaged', 'closed'),
  ('contact_requests', 'in_progress', 'spam'),
  ('contact_requests', 'in_progress', 'closed')
on conflict do nothing;

-- 'closed' e 'spam' são terminais por omissão: nenhuma linha desta tabela parte deles.
-- Reabertura é uma decisão de produto futura (nova migration aditiva na tabela acima),
-- não uma exceção silenciosa no trigger.

create or replace function site_private.enforce_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if not exists (
    select 1 from site_private.status_transitions t
    where t.entity = tg_table_name and t.from_status = old.status and t.to_status = new.status
  ) then
    raise exception using errcode = '22023',
      message = format('invalid_status_transition: %s.%s -> %s not allowed for %s', tg_table_name, old.status, new.status, old.id);
  end if;
  return new;
end;
$$;

drop trigger if exists quote_requests_enforce_status_transition on site_private.quote_requests;
create trigger quote_requests_enforce_status_transition
  before update of status on site_private.quote_requests
  for each row execute function site_private.enforce_status_transition();

drop trigger if exists contact_requests_enforce_status_transition on site_private.contact_requests;
create trigger contact_requests_enforce_status_transition
  before update of status on site_private.contact_requests
  for each row execute function site_private.enforce_status_transition();

comment on function site_private.enforce_status_transition() is
  'Rejeita updates de status fora da tabela site_private.status_transitions (Etapa 8). Roda BEFORE UPDATE, então site_private.record_quote_status_event (AFTER) só vê transições já validadas.';
