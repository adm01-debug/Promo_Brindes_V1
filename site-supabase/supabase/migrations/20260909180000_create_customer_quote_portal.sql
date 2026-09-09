-- Área do Cliente do Site Promo Brindes.
-- Aplicar exclusivamente no projeto isolado xlzmclcjdncjfdrjxclt.

alter table site_private.quote_requests
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

create index if not exists quote_requests_customer_created_idx
  on site_private.quote_requests (customer_user_id, created_at desc)
  where customer_user_id is not null and status <> 'spam';

create index if not exists quote_requests_unclaimed_email_idx
  on site_private.quote_requests (lower(email), created_at desc)
  where customer_user_id is null and status <> 'spam';

create table if not exists site_private.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_email text not null check (length(verified_email) between 5 and 160),
  display_name text check (display_name is null or length(display_name) between 2 and 100),
  company text check (company is null or length(company) between 2 and 150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_profiles_verified_email_idx
  on site_private.customer_profiles (lower(verified_email));

create table if not exists site_private.quote_request_events (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references site_private.quote_requests(id) on delete cascade,
  event_type text not null check (event_type in ('received', 'status_changed', 'message', 'proposal_published')),
  status text check (status is null or status in ('new', 'triaged', 'in_progress', 'quoted', 'closed')),
  title text not null check (length(title) between 2 and 120),
  description text check (description is null or length(description) <= 500),
  audience text not null default 'customer' check (audience in ('customer', 'internal')),
  created_at timestamptz not null default now()
);

create index if not exists quote_request_events_request_created_idx
  on site_private.quote_request_events (quote_request_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-proposals',
  'customer-proposals',
  false,
  20971520,
  array['application/pdf']::text[]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table if not exists site_private.proposal_documents (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references site_private.quote_requests(id) on delete cascade,
  version integer not null check (version between 1 and 999),
  title text not null check (length(title) between 2 and 160),
  storage_bucket text not null default 'customer-proposals'
    check (storage_bucket = 'customer-proposals'),
  storage_path text not null check (length(storage_path) between 2 and 500 and storage_path !~ '(^|/)\.\.(/|$)'),
  valid_until date,
  published_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quote_request_id, version),
  unique (storage_bucket, storage_path)
);

create index if not exists proposal_documents_published_idx
  on site_private.proposal_documents (quote_request_id, published_at desc)
  where published_at is not null;

alter table site_private.customer_profiles enable row level security;
alter table site_private.quote_request_events enable row level security;
alter table site_private.proposal_documents enable row level security;

revoke all on site_private.customer_profiles, site_private.quote_request_events, site_private.proposal_documents
  from public, anon, authenticated;
grant select, insert, update, delete on site_private.customer_profiles, site_private.quote_request_events, site_private.proposal_documents
  to service_role;

create trigger customer_profiles_set_updated_at
before update on site_private.customer_profiles
for each row execute function site_private.set_updated_at();

create or replace function site_private.record_quote_status_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_title text;
begin
  if new.status = 'spam' or (tg_op = 'UPDATE' and new.status is not distinct from old.status) then
    return new;
  end if;

  v_title := case new.status
    when 'new' then 'Solicitação recebida'
    when 'triaged' then 'Briefing em análise'
    when 'in_progress' then 'Curadoria em andamento'
    when 'quoted' then 'Proposta disponível'
    when 'closed' then 'Solicitação encerrada'
  end;

  insert into site_private.quote_request_events (
    quote_request_id, event_type, status, title, audience, created_at
  ) values (
    new.id,
    case when tg_op = 'INSERT' then 'received' else 'status_changed' end,
    new.status,
    v_title,
    'customer',
    case when tg_op = 'INSERT' then new.created_at else now() end
  );
  return new;
end;
$$;

create trigger quote_requests_record_customer_event
after insert or update of status on site_private.quote_requests
for each row execute function site_private.record_quote_status_event();

insert into site_private.quote_request_events (
  quote_request_id, event_type, status, title, audience, created_at
)
select
  request.id,
  'received',
  request.status,
  case request.status
    when 'new' then 'Solicitação recebida'
    when 'triaged' then 'Briefing em análise'
    when 'in_progress' then 'Curadoria em andamento'
    when 'quoted' then 'Proposta disponível'
    when 'closed' then 'Solicitação encerrada'
  end,
  'customer',
  request.created_at
from site_private.quote_requests request
where request.status <> 'spam'
  and not exists (
    select 1 from site_private.quote_request_events event
    where event.quote_request_id = request.id
  );

create or replace function public.claim_my_quote_requests()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_claimed integer := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select lower(user_record.email), nullif(trim(user_record.raw_user_meta_data ->> 'name'), '')
    into v_email, v_name
  from auth.users user_record
  where user_record.id = v_user_id and user_record.email_confirmed_at is not null;

  if v_email is null then
    raise exception using errcode = '42501', message = 'verified_email_required';
  end if;

  insert into site_private.customer_profiles (user_id, verified_email, display_name)
  values (v_user_id, v_email, v_name)
  on conflict (user_id) do update
    set verified_email = excluded.verified_email,
        display_name = coalesce(excluded.display_name, site_private.customer_profiles.display_name),
        updated_at = now();

  update site_private.quote_requests request
  set customer_user_id = v_user_id, updated_at = now()
  where request.customer_user_id is null
    and request.status <> 'spam'
    and lower(request.email) = v_email;
  get diagnostics v_claimed = row_count;

  return jsonb_build_object('claimed', v_claimed, 'email', v_email);
end;
$$;

create or replace function public.get_my_quote_requests(
  p_limit integer default 20,
  p_offset integer default 0,
  p_status text default null,
  p_search text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_offset integer := least(greatest(coalesce(p_offset, 0), 0), 10000);
  v_search text := lower(left(trim(coalesce(p_search, '')), 80));
  v_status text := nullif(trim(coalesce(p_status, '')), '');
  v_total integer;
  v_items jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if v_status is not null and v_status not in ('new', 'triaged', 'in_progress', 'quoted', 'closed') then
    raise exception using errcode = '22023', message = 'invalid_status_filter';
  end if;

  select count(*) into v_total
  from site_private.quote_requests request
  where request.customer_user_id = v_user_id
    and request.status <> 'spam'
    and (v_status is null or request.status = v_status)
    and (
      v_search = ''
      or position(v_search in lower(request.id::text)) > 0
      or position(v_search in lower(request.company)) > 0
      or exists (
        select 1 from site_private.quote_items item
        where item.quote_request_id = request.id
          and position(v_search in lower(item.product_name_snapshot || ' ' || item.sku_snapshot)) > 0
      )
    );

  select coalesce(jsonb_agg(result.payload order by result.created_at desc), '[]'::jsonb)
    into v_items
  from (
    select request.created_at, jsonb_build_object(
      'id', request.id,
      'protocol', upper(left(request.id::text, 8)),
      'status', request.status,
      'company', request.company,
      'createdAt', request.created_at,
      'desiredDeadline', request.desired_deadline,
      'itemCount', count(item.id),
      'totalUnits', coalesce(sum(item.quantity), 0),
      'productNames', coalesce(jsonb_agg(item.product_name_snapshot order by item.position) filter (where item.id is not null), '[]'::jsonb)
    ) as payload
    from site_private.quote_requests request
    left join site_private.quote_items item on item.quote_request_id = request.id
    where request.customer_user_id = v_user_id
      and request.status <> 'spam'
      and (v_status is null or request.status = v_status)
      and (
        v_search = ''
        or position(v_search in lower(request.id::text)) > 0
        or position(v_search in lower(request.company)) > 0
        or exists (
          select 1 from site_private.quote_items searched_item
          where searched_item.quote_request_id = request.id
            and position(v_search in lower(searched_item.product_name_snapshot || ' ' || searched_item.sku_snapshot)) > 0
        )
      )
    group by request.id
    order by request.created_at desc
    limit v_limit offset v_offset
  ) result;

  return jsonb_build_object('items', v_items, 'total', v_total, 'limit', v_limit, 'offset', v_offset);
end;
$$;

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
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select * into v_request
  from site_private.quote_requests request
  where request.id = p_request_id
    and request.customer_user_id = v_user_id
    and request.status <> 'spam';

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'key', item.item_key,
    'productId', item.source_product_id,
    'slug', item.product_slug,
    'name', item.product_name_snapshot,
    'sku', item.sku_snapshot,
    'imageUrl', item.image_url_snapshot,
    'quantity', item.quantity,
    'minQuantity', item.minimum_quantity_snapshot,
    'colorName', item.color_name_snapshot,
    'colorHex', item.color_hex_snapshot
  ) order by item.position), '[]'::jsonb) into v_items
  from site_private.quote_items item
  where item.quote_request_id = v_request.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', event.id,
    'type', event.event_type,
    'status', event.status,
    'title', event.title,
    'description', event.description,
    'createdAt', event.created_at
  ) order by event.created_at desc), '[]'::jsonb) into v_events
  from site_private.quote_request_events event
  where event.quote_request_id = v_request.id and event.audience = 'customer';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', proposal.id,
    'version', proposal.version,
    'title', proposal.title,
    'validUntil', proposal.valid_until,
    'publishedAt', proposal.published_at,
    'isCurrent', proposal.superseded_at is null
  ) order by proposal.version desc), '[]'::jsonb) into v_proposals
  from site_private.proposal_documents proposal
  where proposal.quote_request_id = v_request.id and proposal.published_at is not null;

  return jsonb_build_object(
    'id', v_request.id,
    'protocol', upper(left(v_request.id::text, 8)),
    'status', v_request.status,
    'createdAt', v_request.created_at,
    'submittedAt', v_request.client_submitted_at,
    'company', v_request.company,
    'contactName', v_request.contact_name,
    'email', v_request.email,
    'phone', v_request.phone,
    'city', v_request.city,
    'desiredDeadline', v_request.desired_deadline,
    'notes', v_request.notes,
    'items', v_items,
    'events', v_events,
    'proposals', v_proposals
  );
end;
$$;

create or replace function public.get_my_proposal_document(p_proposal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_document jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  select jsonb_build_object(
    'bucket', proposal.storage_bucket,
    'path', proposal.storage_path,
    'title', proposal.title
  ) into v_document
  from site_private.proposal_documents proposal
  join site_private.quote_requests request on request.id = proposal.quote_request_id
  where proposal.id = p_proposal_id
    and proposal.published_at is not null
    and request.customer_user_id = v_user_id
    and request.status <> 'spam';
  return v_document;
end;
$$;

revoke all on function public.claim_my_quote_requests() from public, anon;
revoke all on function public.get_my_quote_requests(integer, integer, text, text) from public, anon;
revoke all on function public.get_my_quote_request(uuid) from public, anon;
revoke all on function public.get_my_proposal_document(uuid) from public, anon;
grant execute on function public.claim_my_quote_requests() to authenticated, service_role;
grant execute on function public.get_my_quote_requests(integer, integer, text, text) to authenticated, service_role;
grant execute on function public.get_my_quote_request(uuid) to authenticated, service_role;
grant execute on function public.get_my_proposal_document(uuid) to authenticated, service_role;
grant execute on function site_private.record_quote_status_event() to service_role;

alter default privileges in schema site_private revoke all on tables from public, anon, authenticated;

comment on function public.claim_my_quote_requests() is
  'Associa solicitações sem titular somente após confirmação do e-mail da identidade autenticada.';
comment on function public.get_my_quote_requests(integer, integer, text, text) is
  'Lista exclusivamente solicitações pertencentes ao auth.uid() atual.';
comment on function public.get_my_quote_request(uuid) is
  'Retorna detalhe de uma solicitação somente ao auth.uid() proprietário.';
comment on function public.get_my_proposal_document(uuid) is
  'Entrega o local de um documento somente ao cliente proprietário para assinatura server-side.';
