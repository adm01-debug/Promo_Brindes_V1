-- Preserva a aritmética de kits criada pelo cliente no snapshot do briefing.
-- Não cria preço, estoque, composição comercial recomendada nem FK cross-project.
-- Aplicar exclusivamente em xlzmclcjdncjfdrjxclt.

alter table site_private.quote_items
  add column kit_group_id uuid,
  add column kit_name_snapshot text check (kit_name_snapshot is null or length(kit_name_snapshot) between 1 and 100),
  add column kit_quantity_snapshot integer check (kit_quantity_snapshot is null or kit_quantity_snapshot between 1 and 999999),
  add column units_per_kit_snapshot integer check (units_per_kit_snapshot is null or units_per_kit_snapshot between 1 and 100);

alter table site_private.quote_items
  add constraint quote_items_kit_composition_check check (
    (kit_group_id is null and kit_name_snapshot is null and kit_quantity_snapshot is null and units_per_kit_snapshot is null)
    or
    (kit_group_id is not null and kit_name_snapshot is not null and kit_quantity_snapshot is not null
      and units_per_kit_snapshot is not null and quantity = kit_quantity_snapshot * units_per_kit_snapshot)
  );

create index quote_items_kit_group_idx
  on site_private.quote_items (quote_request_id, kit_group_id, position)
  where kit_group_id is not null;

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
  v_decision_group text;
  v_kit_group_id uuid;
  v_kit_name text;
  v_kit_quantity integer;
  v_units_per_kit integer;
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

  select id, request_hash into v_request_id, v_existing_hash
  from site_private.quote_requests where client_request_id = v_client_request_id;
  if v_request_id is not null then
    if v_existing_hash <> v_request_hash then raise exception using errcode = 'P0001', message = 'client_request_id_conflict'; end if;
    return jsonb_build_object('requestId', v_request_id, 'duplicate', true);
  end if;

  perform site_private.consume_rate_limit('quote', p_request_meta ->> 'identifierHash', 5, interval '15 minutes');

  insert into site_private.quote_requests (
    client_request_id, request_hash, source, contact_name, company, email, phone,
    city, desired_deadline, notes, page_url, client_submitted_at, request_metadata
  ) values (
    v_client_request_id, v_request_hash, p_payload ->> 'source',
    p_payload #>> '{contact,name}', p_payload #>> '{contact,company}', lower(p_payload #>> '{contact,email}'), p_payload #>> '{contact,phone}',
    nullif(p_payload #>> '{contact,city}', ''), nullif(p_payload #>> '{contact,deadline}', '')::date, nullif(p_payload #>> '{contact,notes}', ''),
    nullif(p_payload ->> 'pageUrl', ''), (p_payload ->> 'submittedAt')::timestamptz,
    p_request_meta - 'identifierHash' - 'requestHash'
  ) on conflict (client_request_id) do nothing returning id into v_request_id;

  if v_request_id is null then
    select id, request_hash into v_request_id, v_existing_hash from site_private.quote_requests where client_request_id = v_client_request_id;
    if v_existing_hash <> v_request_hash then raise exception using errcode = 'P0001', message = 'client_request_id_conflict'; end if;
    return jsonb_build_object('requestId', v_request_id, 'duplicate', true);
  end if;

  for v_item in select item.value, item.ordinality from jsonb_array_elements(p_payload -> 'items') with ordinality as item(value, ordinality)
  loop
    v_decision_group := coalesce(nullif(v_item.value ->> 'decisionGroup', ''), 'primary');
    if v_decision_group not in ('primary', 'alternative') then
      raise exception using errcode = '22023', message = 'invalid_item_decision_group';
    end if;

    if v_item.value ? 'kitGroupId' then
      if not (v_item.value ?& array['kitGroupId', 'kitName', 'kitQuantity', 'unitsPerKit']) then
        raise exception using errcode = '22023', message = 'invalid_kit_composition';
      end if;
      begin
        v_kit_group_id := (v_item.value ->> 'kitGroupId')::uuid;
        v_kit_name := btrim(v_item.value ->> 'kitName');
        v_kit_quantity := (v_item.value ->> 'kitQuantity')::integer;
        v_units_per_kit := (v_item.value ->> 'unitsPerKit')::integer;
      exception when others then
        raise exception using errcode = '22023', message = 'invalid_kit_composition';
      end;
      if length(v_kit_name) not between 1 and 100
        or v_kit_quantity not between 1 and 999999
        or v_units_per_kit not between 1 and 100
        or (v_item.value ->> 'quantity')::integer <> v_kit_quantity * v_units_per_kit then
        raise exception using errcode = '22023', message = 'invalid_kit_composition';
      end if;
    else
      if v_item.value ?| array['kitName', 'kitQuantity', 'unitsPerKit'] then
        raise exception using errcode = '22023', message = 'invalid_kit_composition';
      end if;
      v_kit_group_id := null;
      v_kit_name := null;
      v_kit_quantity := null;
      v_units_per_kit := null;
    end if;

    insert into site_private.quote_items (
      quote_request_id, position, source_product_id, item_key, product_slug,
      product_name_snapshot, sku_snapshot, image_url_snapshot, quantity,
      minimum_quantity_snapshot, variant_id_snapshot, color_name_snapshot, color_hex_snapshot,
      decision_group_snapshot, kit_group_id, kit_name_snapshot, kit_quantity_snapshot, units_per_kit_snapshot
    ) values (
      v_request_id, v_item.ordinality, v_item.value ->> 'productId', v_item.value ->> 'key', v_item.value ->> 'slug',
      v_item.value ->> 'name', v_item.value ->> 'sku', nullif(v_item.value ->> 'imageUrl', ''),
      (v_item.value ->> 'quantity')::integer, (v_item.value ->> 'minQuantity')::integer,
      nullif(v_item.value ->> 'variantId', ''), nullif(v_item.value ->> 'colorName', ''), nullif(v_item.value ->> 'colorHex', ''),
      v_decision_group, v_kit_group_id, v_kit_name, v_kit_quantity, v_units_per_kit
    );
  end loop;

  if exists (
    select 1
    from site_private.quote_items item
    where item.quote_request_id = v_request_id and item.kit_group_id is not null
    group by item.kit_group_id
    having count(*) < 2
      or count(distinct item.kit_name_snapshot) <> 1
      or count(distinct item.kit_quantity_snapshot) <> 1
  ) then
    raise exception using errcode = '22023', message = 'invalid_kit_composition';
  end if;

  insert into site_private.consent_receipts (request_kind, quote_request_id, accepted, notice_version, client_accepted_at)
  values ('quote', v_request_id, true, p_payload #>> '{consent,noticeVersion}', (p_payload #>> '{consent,acceptedAt}')::timestamptz);
  return jsonb_build_object('requestId', v_request_id, 'duplicate', false);
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
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select * into v_request from site_private.quote_requests request
  where request.id = p_request_id and request.customer_user_id = v_user_id and request.status <> 'spam';
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'key', item.item_key, 'productId', item.source_product_id, 'slug', item.product_slug,
    'name', item.product_name_snapshot, 'sku', item.sku_snapshot, 'imageUrl', item.image_url_snapshot,
    'quantity', item.quantity, 'minQuantity', item.minimum_quantity_snapshot, 'variantId', item.variant_id_snapshot,
    'colorName', item.color_name_snapshot, 'colorHex', item.color_hex_snapshot,
    'decisionGroup', item.decision_group_snapshot, 'kitGroupId', item.kit_group_id,
    'kitName', item.kit_name_snapshot, 'kitQuantity', item.kit_quantity_snapshot,
    'unitsPerKit', item.units_per_kit_snapshot
  )) order by item.position), '[]'::jsonb) into v_items
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
    'id', v_request.id, 'protocol', v_request.protocol, 'status', v_request.status,
    'createdAt', v_request.created_at, 'submittedAt', v_request.client_submitted_at, 'company', v_request.company,
    'contactName', v_request.contact_name, 'email', v_request.email, 'phone', v_request.phone, 'city', v_request.city,
    'desiredDeadline', v_request.desired_deadline, 'notes', v_request.notes,
    'campaign', v_request.request_metadata -> 'campaign', 'briefing', v_request.request_metadata -> 'briefing',
    'items', v_items, 'events', v_events, 'proposals', v_proposals
  );
end;
$$;

revoke all on function public.create_site_quote_request(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.get_my_quote_request(uuid) from public, anon;
grant execute on function public.create_site_quote_request(jsonb, jsonb) to site_api, service_role;
grant execute on function public.get_my_quote_request(uuid) to authenticated, service_role;

comment on column site_private.quote_items.kit_group_id is 'Identificador do kit configurado pelo cliente; agrupa componentes no snapshot do briefing.';
comment on column site_private.quote_items.kit_quantity_snapshot is 'Quantidade de kits usada na aritmética do componente.';
comment on column site_private.quote_items.units_per_kit_snapshot is 'Unidades deste componente por kit; quantity deve ser o produto dos dois campos.';
