CREATE OR REPLACE FUNCTION public.create_site_quote_request(p_payload jsonb, p_request_meta jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
