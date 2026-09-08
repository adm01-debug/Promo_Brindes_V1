-- Banco exclusivo do Site Promo Brindes.
-- PROIBIDO aplicar no projeto canônico do catálogo: doufsxqlfjyuvxuezpln.
-- O frontend não recebe acesso direto a nenhuma tabela deste schema.

create schema if not exists site_private;
revoke all on schema site_private from public, anon, authenticated;
grant usage on schema site_private to service_role;

create table site_private.quote_requests (
  id uuid primary key default gen_random_uuid(),
  client_request_id text not null unique check (length(client_request_id) between 8 and 100),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  source text not null check (source = 'site-promo-brindes'),
  status text not null default 'new' check (status in ('new', 'triaged', 'in_progress', 'quoted', 'closed', 'spam')),
  contact_name text not null check (length(contact_name) between 2 and 100),
  company text not null check (length(company) between 2 and 150),
  email text not null check (length(email) between 5 and 160),
  phone text not null check (length(phone) between 10 and 24),
  city text,
  desired_deadline date,
  notes text check (notes is null or length(notes) <= 800),
  page_url text check (page_url is null or length(page_url) <= 500),
  client_submitted_at timestamptz not null,
  request_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(request_metadata) = 'object'),
  retention_until timestamptz not null default (now() + interval '24 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table site_private.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references site_private.quote_requests(id) on delete cascade,
  position smallint not null check (position between 1 and 50),
  source_product_id text not null check (length(source_product_id) between 8 and 100),
  item_key text not null check (length(item_key) between 1 and 220),
  product_slug text not null check (length(product_slug) between 1 and 180),
  product_name_snapshot text not null check (length(product_name_snapshot) between 1 and 240),
  sku_snapshot text not null check (length(sku_snapshot) between 1 and 120),
  image_url_snapshot text check (image_url_snapshot is null or length(image_url_snapshot) <= 1000),
  quantity integer not null check (quantity between 1 and 999999),
  minimum_quantity_snapshot integer not null check (minimum_quantity_snapshot between 1 and 999999),
  color_name_snapshot text check (color_name_snapshot is null or length(color_name_snapshot) <= 120),
  color_hex_snapshot text check (color_hex_snapshot is null or length(color_hex_snapshot) <= 32),
  created_at timestamptz not null default now(),
  unique (quote_request_id, position),
  check (quantity >= minimum_quantity_snapshot)
);

create table site_private.contact_requests (
  id uuid primary key default gen_random_uuid(),
  client_request_id text not null unique check (length(client_request_id) between 8 and 100),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  source text not null check (source = 'site-promo-brindes-contact'),
  status text not null default 'new' check (status in ('new', 'triaged', 'in_progress', 'closed', 'spam')),
  contact_name text not null check (length(contact_name) between 2 and 100),
  email text not null check (length(email) between 5 and 160),
  phone text,
  page_url text check (page_url is null or length(page_url) <= 500),
  client_submitted_at timestamptz not null,
  request_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(request_metadata) = 'object'),
  retention_until timestamptz not null default (now() + interval '24 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table site_private.consent_receipts (
  id uuid primary key default gen_random_uuid(),
  request_kind text not null check (request_kind in ('quote', 'contact')),
  quote_request_id uuid references site_private.quote_requests(id) on delete cascade,
  contact_request_id uuid references site_private.contact_requests(id) on delete cascade,
  purpose text not null default 'commercial_contact' check (purpose = 'commercial_contact'),
  accepted boolean not null check (accepted is true),
  notice_version text not null check (length(notice_version) between 1 and 40),
  client_accepted_at timestamptz not null,
  server_recorded_at timestamptz not null default now(),
  check (
    (request_kind = 'quote' and quote_request_id is not null and contact_request_id is null)
    or (request_kind = 'contact' and contact_request_id is not null and quote_request_id is null)
  )
);

create table site_private.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  request_kind text not null check (request_kind in ('quote', 'contact')),
  request_id uuid not null,
  channel text not null check (channel in ('email', 'whatsapp')),
  audience text not null check (audience in ('customer', 'commercial_team')),
  provider text,
  provider_message_id text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts smallint not null default 0 check (attempts between 0 and 20),
  last_error_code text,
  last_error_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_kind, request_id, channel, audience)
);

create table site_private.rate_limit_buckets (
  request_kind text not null check (request_kind in ('quote', 'contact')),
  identifier_hash text not null check (identifier_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (request_kind, identifier_hash)
);

create index quote_requests_created_at_idx on site_private.quote_requests (created_at desc);
create index quote_requests_status_created_at_idx on site_private.quote_requests (status, created_at desc);
create index quote_items_product_id_idx on site_private.quote_items (source_product_id);
create index contact_requests_created_at_idx on site_private.contact_requests (created_at desc);
create index contact_requests_status_created_at_idx on site_private.contact_requests (status, created_at desc);
create index consent_receipts_server_recorded_at_idx on site_private.consent_receipts (server_recorded_at desc);
create index notification_deliveries_pending_idx on site_private.notification_deliveries (status, created_at) where status in ('pending', 'failed');
create index rate_limit_buckets_updated_at_idx on site_private.rate_limit_buckets (updated_at);

alter table site_private.quote_requests enable row level security;
alter table site_private.quote_items enable row level security;
alter table site_private.contact_requests enable row level security;
alter table site_private.consent_receipts enable row level security;
alter table site_private.notification_deliveries enable row level security;
alter table site_private.rate_limit_buckets enable row level security;

revoke all on all tables in schema site_private from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema site_private to service_role;

alter default privileges in schema site_private revoke all on tables from public, anon, authenticated;
alter default privileges in schema site_private grant select, insert, update, delete on tables to service_role;
alter default privileges in schema site_private revoke execute on functions from public, anon, authenticated;

create or replace function site_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger quote_requests_set_updated_at
before update on site_private.quote_requests
for each row execute function site_private.set_updated_at();

create trigger contact_requests_set_updated_at
before update on site_private.contact_requests
for each row execute function site_private.set_updated_at();

create trigger notification_deliveries_set_updated_at
before update on site_private.notification_deliveries
for each row execute function site_private.set_updated_at();

create or replace function site_private.consume_rate_limit(
  p_request_kind text,
  p_identifier_hash text,
  p_limit integer,
  p_window interval
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_request_kind not in ('quote', 'contact')
    or p_identifier_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1
    or p_window <= interval '0 seconds' then
    raise exception using errcode = '22023', message = 'invalid_rate_limit_input';
  end if;

  insert into site_private.rate_limit_buckets as bucket (
    request_kind, identifier_hash, window_started_at, request_count, updated_at
  ) values (
    p_request_kind, p_identifier_hash, now(), 1, now()
  )
  on conflict (request_kind, identifier_hash) do update
  set
    request_count = case
      when bucket.window_started_at <= now() - p_window then 1
      else bucket.request_count + 1
    end,
    window_started_at = case
      when bucket.window_started_at <= now() - p_window then now()
      else bucket.window_started_at
    end,
    updated_at = now()
  returning request_count into v_count;

  if v_count > p_limit then
    raise exception using errcode = 'P0001', message = 'rate_limit_exceeded';
  end if;
end;
$$;

create or replace function public.create_site_quote_request(p_payload jsonb, p_request_meta jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_existing_hash text;
  v_request_hash text := p_request_meta ->> 'requestHash';
  v_client_request_id text := p_payload ->> 'clientRequestId';
  v_item record;
begin
  if p_payload ->> 'source' <> 'site-promo-brindes'
    or coalesce((p_payload #>> '{consent,accepted}')::boolean, false) is not true
    or p_payload #>> '{consent,noticeVersion}' <> '2026-09-08'
    or jsonb_typeof(p_payload -> 'items') <> 'array'
    or jsonb_array_length(p_payload -> 'items') not between 1 and 50
    or coalesce(v_client_request_id, '') !~ '^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,99}$'
    or coalesce(v_request_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_request_meta ->> 'identifierHash', '') !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_quote_payload';
  end if;

  select id, request_hash
  into v_request_id, v_existing_hash
  from site_private.quote_requests
  where client_request_id = v_client_request_id;

  if v_request_id is not null then
    if v_existing_hash <> v_request_hash then
      raise exception using errcode = 'P0001', message = 'client_request_id_conflict';
    end if;
    return jsonb_build_object('requestId', v_request_id, 'duplicate', true);
  end if;

  perform site_private.consume_rate_limit('quote', p_request_meta ->> 'identifierHash', 5, interval '15 minutes');

  insert into site_private.quote_requests (
    client_request_id, request_hash, source, contact_name, company, email, phone,
    city, desired_deadline, notes, page_url, client_submitted_at, request_metadata
  ) values (
    v_client_request_id,
    v_request_hash,
    p_payload ->> 'source',
    p_payload #>> '{contact,name}',
    p_payload #>> '{contact,company}',
    lower(p_payload #>> '{contact,email}'),
    p_payload #>> '{contact,phone}',
    nullif(p_payload #>> '{contact,city}', ''),
    nullif(p_payload #>> '{contact,deadline}', '')::date,
    nullif(p_payload #>> '{contact,notes}', ''),
    nullif(p_payload ->> 'pageUrl', ''),
    (p_payload ->> 'submittedAt')::timestamptz,
    p_request_meta - 'identifierHash' - 'requestHash'
  )
  on conflict (client_request_id) do nothing
  returning id into v_request_id;

  if v_request_id is null then
    select id, request_hash into v_request_id, v_existing_hash
    from site_private.quote_requests where client_request_id = v_client_request_id;
    if v_existing_hash <> v_request_hash then
      raise exception using errcode = 'P0001', message = 'client_request_id_conflict';
    end if;
    return jsonb_build_object('requestId', v_request_id, 'duplicate', true);
  end if;

  for v_item in
    select item.value, item.ordinality
    from jsonb_array_elements(p_payload -> 'items') with ordinality as item(value, ordinality)
  loop
    insert into site_private.quote_items (
      quote_request_id, position, source_product_id, item_key, product_slug,
      product_name_snapshot, sku_snapshot, image_url_snapshot, quantity,
      minimum_quantity_snapshot, color_name_snapshot, color_hex_snapshot
    ) values (
      v_request_id,
      v_item.ordinality,
      v_item.value ->> 'productId',
      v_item.value ->> 'key',
      v_item.value ->> 'slug',
      v_item.value ->> 'name',
      v_item.value ->> 'sku',
      nullif(v_item.value ->> 'imageUrl', ''),
      (v_item.value ->> 'quantity')::integer,
      (v_item.value ->> 'minQuantity')::integer,
      nullif(v_item.value ->> 'colorName', ''),
      nullif(v_item.value ->> 'colorHex', '')
    );
  end loop;

  insert into site_private.consent_receipts (
    request_kind, quote_request_id, accepted, notice_version, client_accepted_at
  ) values (
    'quote', v_request_id, true, p_payload #>> '{consent,noticeVersion}',
    (p_payload #>> '{consent,acceptedAt}')::timestamptz
  );

  return jsonb_build_object('requestId', v_request_id, 'duplicate', false);
end;
$$;

create or replace function public.create_site_contact_request(p_payload jsonb, p_request_meta jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_existing_hash text;
  v_request_hash text := p_request_meta ->> 'requestHash';
  v_client_request_id text := p_payload ->> 'clientRequestId';
begin
  if p_payload ->> 'source' <> 'site-promo-brindes-contact'
    or coalesce((p_payload #>> '{consent,accepted}')::boolean, false) is not true
    or p_payload #>> '{consent,noticeVersion}' <> '2026-09-08'
    or coalesce(v_client_request_id, '') !~ '^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,99}$'
    or coalesce(v_request_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_request_meta ->> 'identifierHash', '') !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_contact_payload';
  end if;

  select id, request_hash
  into v_request_id, v_existing_hash
  from site_private.contact_requests
  where client_request_id = v_client_request_id;

  if v_request_id is not null then
    if v_existing_hash <> v_request_hash then
      raise exception using errcode = 'P0001', message = 'client_request_id_conflict';
    end if;
    return jsonb_build_object('requestId', v_request_id, 'duplicate', true);
  end if;

  perform site_private.consume_rate_limit('contact', p_request_meta ->> 'identifierHash', 8, interval '15 minutes');

  insert into site_private.contact_requests (
    client_request_id, request_hash, source, contact_name, email, phone,
    page_url, client_submitted_at, request_metadata
  ) values (
    v_client_request_id,
    v_request_hash,
    p_payload ->> 'source',
    p_payload #>> '{contact,name}',
    lower(p_payload #>> '{contact,email}'),
    nullif(p_payload #>> '{contact,phone}', ''),
    nullif(p_payload ->> 'pageUrl', ''),
    (p_payload ->> 'submittedAt')::timestamptz,
    p_request_meta - 'identifierHash' - 'requestHash'
  )
  on conflict (client_request_id) do nothing
  returning id into v_request_id;

  if v_request_id is null then
    select id, request_hash into v_request_id, v_existing_hash
    from site_private.contact_requests where client_request_id = v_client_request_id;
    if v_existing_hash <> v_request_hash then
      raise exception using errcode = 'P0001', message = 'client_request_id_conflict';
    end if;
    return jsonb_build_object('requestId', v_request_id, 'duplicate', true);
  end if;

  insert into site_private.consent_receipts (
    request_kind, contact_request_id, accepted, notice_version, client_accepted_at
  ) values (
    'contact', v_request_id, true, p_payload #>> '{consent,noticeVersion}',
    (p_payload #>> '{consent,acceptedAt}')::timestamptz
  );

  return jsonb_build_object('requestId', v_request_id, 'duplicate', false);
end;
$$;

revoke all on function public.create_site_quote_request(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.create_site_contact_request(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_site_quote_request(jsonb, jsonb) to service_role;
grant execute on function public.create_site_contact_request(jsonb, jsonb) to service_role;
grant execute on function site_private.consume_rate_limit(text, text, integer, interval) to service_role;
grant execute on function site_private.set_updated_at() to service_role;

comment on schema site_private is 'Dados pessoais e operacionais exclusivos do Site Promo Brindes; não exposto pela Data API.';
comment on table site_private.quote_items is 'Snapshot do produto no instante do briefing; sem FK entre projetos Supabase.';
comment on table site_private.notification_deliveries is 'Auditoria de entregas futuras. WhatsApp exige consentimento específico antes da criação do registro.';
