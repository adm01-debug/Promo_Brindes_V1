-- Fecha gaps de integridade encontrados na auditoria pós-publicação.
-- Aplicar exclusivamente no Supabase isolado xlzmclcjdncjfdrjxclt.

create or replace function site_private.has_unsafe_display_controls(p_value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_value, '') ~ '[[:cntrl:]]'
    or strpos(coalesce(p_value, ''), chr(8203)) > 0
    or strpos(coalesce(p_value, ''), chr(8206)) > 0
    or strpos(coalesce(p_value, ''), chr(8207)) > 0
    or strpos(coalesce(p_value, ''), chr(8288)) > 0
    or strpos(coalesce(p_value, ''), chr(65279)) > 0
    or exists (select 1 from generate_series(8234, 8238) point where strpos(coalesce(p_value, ''), chr(point)) > 0)
    or exists (select 1 from generate_series(8294, 8297) point where strpos(coalesce(p_value, ''), chr(point)) > 0)
$$;

create or replace function site_private.normalize_selection_references(p_items jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_item jsonb;
  v_clean jsonb := '[]'::jsonb;
  v_has_kit boolean;
begin
  if pg_catalog.jsonb_typeof(p_items) <> 'array'
    or pg_catalog.jsonb_array_length(p_items) not between 1 and 50 then
    raise exception using errcode = '22023', message = 'invalid_selection_reference_set';
  end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_items)
  loop
    v_has_kit := v_item ?| array['k', 'kn', 'kq', 'ku'];
    if pg_catalog.jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(v_item ->> 'q', '') !~ '^[1-9][0-9]{0,5}$'
      or (v_item ? 'v' and (pg_catalog.jsonb_typeof(v_item -> 'v') <> 'string' or coalesce(v_item ->> 'v', '') !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$'))
      or (v_item ? 'c' and (v_item ? 'v' or pg_catalog.jsonb_typeof(v_item -> 'c') <> 'string'
        or pg_catalog.length(pg_catalog.btrim(coalesce(v_item ->> 'c', ''))) not between 1 and 100
        or site_private.has_unsafe_display_controls(v_item ->> 'c')))
      or (v_item ? 'd' and (pg_catalog.jsonb_typeof(v_item -> 'd') <> 'string' or v_item ->> 'd' <> 'alternative'))
      or (v_has_kit and (
        not (v_item ?& array['k', 'kn', 'kq', 'ku'])
        or coalesce(v_item ->> 'k', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or pg_catalog.length(pg_catalog.btrim(coalesce(v_item ->> 'kn', ''))) not between 1 and 100
        or site_private.has_unsafe_display_controls(v_item ->> 'kn')
        or coalesce(v_item ->> 'kq', '') !~ '^[1-9][0-9]{0,5}$'
        or coalesce(v_item ->> 'ku', '') !~ '^[1-9][0-9]{0,2}$'
        or (v_item ->> 'ku')::integer > 100
        or (v_item ->> 'q')::integer <> (v_item ->> 'kq')::integer * (v_item ->> 'ku')::integer
      )) then
      raise exception using errcode = '22023', message = 'invalid_selection_reference';
    end if;

    v_clean := v_clean || pg_catalog.jsonb_build_array(pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'id', pg_catalog.lower(v_item ->> 'id'),
      'q', (v_item ->> 'q')::integer,
      'v', nullif(v_item ->> 'v', ''),
      'c', case when not (v_item ? 'v') then nullif(pg_catalog.btrim(v_item ->> 'c'), '') end,
      'd', case when v_item ->> 'd' = 'alternative' then 'alternative' end,
      'k', case when v_has_kit then pg_catalog.lower(v_item ->> 'k') end,
      'kn', case when v_has_kit then pg_catalog.btrim(v_item ->> 'kn') end,
      'kq', case when v_has_kit then (v_item ->> 'kq')::integer end,
      'ku', case when v_has_kit then (v_item ->> 'ku')::integer end
    )));
  end loop;

  if exists (
    select 1 from pg_catalog.jsonb_array_elements(v_clean) item(value)
    group by value ->> 'id' || ':' || coalesce(value ->> 'v', value ->> 'c', '')
    having pg_catalog.count(*) > 1 and pg_catalog.bool_or(value ? 'k')
  ) then
    raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
  elsif (select pg_catalog.count(*) <> pg_catalog.count(distinct (
    value ->> 'id' || ':' || coalesce(value ->> 'v', value ->> 'c', '')
  )) from pg_catalog.jsonb_array_elements(v_clean)) then
    raise exception using errcode = '22023', message = 'duplicate_selection_reference';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_array_elements(v_clean) item(value)
    where item.value ? 'k'
    group by item.value ->> 'k'
    having pg_catalog.count(*) < 2
      or pg_catalog.count(distinct item.value ->> 'kn') <> 1
      or pg_catalog.count(distinct item.value ->> 'kq') <> 1
  ) then
    raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
  end if;
  return v_clean;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'invalid_selection_reference';
end;
$$;

revoke all on function site_private.has_unsafe_display_controls(text) from public, anon, authenticated, service_role, site_api;
revoke all on function site_private.normalize_selection_references(jsonb) from public, anon, authenticated, service_role, site_api;

create or replace function site_private.enforce_valid_kit_reference_set()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform site_private.normalize_selection_references(pg_catalog.to_jsonb(new) -> tg_argv[0]);
  return new;
exception when sqlstate '22023' then
  raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
end;
$$;

create or replace function public.create_site_shared_selection(
  p_items jsonb, p_management_token_hash text, p_identifier_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clean_items jsonb;
  v_token uuid;
  v_count integer;
begin
  if coalesce(p_management_token_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_identifier_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_shared_selection_payload';
  end if;
  begin
    v_clean_items := site_private.normalize_selection_references(p_items);
  exception when sqlstate '22023' then
    if sqlerrm = 'duplicate_selection_reference' then
      raise exception using errcode = '22023', message = 'duplicate_shared_selection_item';
    elsif sqlerrm = 'invalid_kit_reference_set' then
      raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
    end if;
    raise exception using errcode = '22023', message = 'invalid_shared_selection_item';
  end;

  insert into site_private.shared_selection_rate_limits as bucket (identifier_hash, window_started_at, request_count, updated_at)
  values (p_identifier_hash, now(), 1, now())
  on conflict (identifier_hash) do update
  set request_count = case when bucket.window_started_at <= now() - interval '1 hour' then 1 else bucket.request_count + 1 end,
      window_started_at = case when bucket.window_started_at <= now() - interval '1 hour' then now() else bucket.window_started_at end,
      updated_at = now()
  returning request_count into v_count;
  if v_count > 12 then raise exception using errcode = 'P0001', message = 'shared_selection_rate_limit_exceeded'; end if;

  insert into site_private.shared_selections (management_token_hash, items)
  values (p_management_token_hash, v_clean_items) returning token into v_token;
  return pg_catalog.jsonb_build_object('token', v_token, 'expiresAt', now() + interval '30 days');
end;
$$;

create or replace function site_private.consume_shared_selection_action_limit(p_identifier_hash text, p_limit integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_count integer;
begin
  if coalesce(p_identifier_hash, '') !~ '^[0-9a-f]{64}$' or p_limit not between 1 and 240 then
    raise exception using errcode = '22023', message = 'invalid_shared_selection_rate_limit';
  end if;
  insert into site_private.shared_selection_rate_limits as bucket (identifier_hash, window_started_at, request_count, updated_at)
  values (p_identifier_hash, now(), 1, now())
  on conflict (identifier_hash) do update
  set request_count = case when bucket.window_started_at <= now() - interval '1 hour' then 1 else bucket.request_count + 1 end,
      window_started_at = case when bucket.window_started_at <= now() - interval '1 hour' then now() else bucket.window_started_at end,
      updated_at = now()
  returning request_count into v_count;
  if v_count > p_limit then raise exception using errcode = 'P0001', message = 'shared_selection_rate_limit_exceeded'; end if;
end;
$$;

create or replace function public.get_site_shared_selection(p_token uuid, p_identifier_hash text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_result jsonb;
begin
  perform site_private.consume_shared_selection_action_limit(p_identifier_hash, 120);
  select pg_catalog.jsonb_build_object('items', selection.items, 'expiresAt', selection.expires_at)
  into v_result from site_private.shared_selections selection
  where selection.token = p_token and selection.revoked_at is null and selection.expires_at > now();
  return v_result;
end;
$$;

create or replace function public.revoke_site_shared_selection(
  p_token uuid, p_management_token_hash text, p_identifier_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_revoked boolean := false;
begin
  perform site_private.consume_shared_selection_action_limit(p_identifier_hash, 30);
  if coalesce(p_management_token_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_shared_selection_management_token';
  end if;
  update site_private.shared_selections set revoked_at = now()
  where token = p_token and management_token_hash = p_management_token_hash
    and revoked_at is null and expires_at > now()
  returning true into v_revoked;
  return pg_catalog.jsonb_build_object('revoked', coalesce(v_revoked, false));
end;
$$;

revoke all on function site_private.consume_shared_selection_action_limit(text, integer) from public, anon, authenticated;
revoke all on function public.get_site_shared_selection(uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_site_shared_selection(uuid, text, text) from public, anon, authenticated;
grant execute on function site_private.normalize_selection_references(jsonb) to site_api, service_role;
grant execute on function site_private.has_unsafe_display_controls(text) to site_api, service_role;
grant execute on function site_private.consume_shared_selection_action_limit(text, integer) to site_api, service_role;
grant execute on function public.get_site_shared_selection(uuid, text) to site_api, service_role;
grant execute on function public.revoke_site_shared_selection(uuid, text, text) to site_api, service_role;

create or replace function public.save_my_selection(
  p_title text, p_references jsonb, p_campaign jsonb default null,
  p_id uuid default null, p_expected_version integer default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text := pg_catalog.btrim(p_title);
  v_references jsonb;
  v_selection site_private.customer_selections%rowtype;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if v_title is null or pg_catalog.length(v_title) not between 1 and 100
    or site_private.has_unsafe_display_controls(v_title)
    or (p_campaign is not null and (pg_catalog.jsonb_typeof(p_campaign) <> 'object' or pg_catalog.octet_length(p_campaign::text) > 2048)) then
    raise exception using errcode = '22023', message = 'invalid_selection_payload';
  end if;
  begin
    v_references := site_private.normalize_selection_references(p_references);
  exception when sqlstate '22023' then
    if sqlerrm = 'duplicate_selection_reference' then
      raise exception using errcode = '22023', message = 'duplicate_selection_reference';
    elsif sqlerrm = 'invalid_kit_reference_set' then
      raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
    end if;
    raise exception using errcode = '22023', message = 'invalid_selection_reference';
  end;

  if p_id is null then
    if p_expected_version is not null then raise exception using errcode = '22023', message = 'invalid_selection_version'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 70922));
    if (select pg_catalog.count(*) from site_private.customer_selections where customer_user_id = v_user_id) >= 30 then
      raise exception using errcode = 'P0001', message = 'selection_limit_reached';
    end if;
    insert into site_private.customer_selections (customer_user_id, title, product_references, campaign)
    values (v_user_id, v_title, v_references, p_campaign) returning * into v_selection;
  else
    if p_expected_version is null or p_expected_version < 1 then raise exception using errcode = '22023', message = 'invalid_selection_version'; end if;
    update site_private.customer_selections selection
    set title = v_title, product_references = v_references, campaign = p_campaign,
        version = selection.version + 1, updated_at = now()
    where selection.id = p_id and selection.customer_user_id = v_user_id
      and selection.version = p_expected_version and selection.archived_at is null
    returning * into v_selection;
    if not found then raise exception using errcode = 'P0001', message = 'selection_version_conflict'; end if;
  end if;
  return pg_catalog.jsonb_build_object('id', v_selection.id, 'version', v_selection.version, 'updatedAt', v_selection.updated_at);
end;
$$;

revoke all on function public.save_my_selection(text, jsonb, jsonb, uuid, integer) from public, anon, service_role;
grant execute on function public.save_my_selection(text, jsonb, jsonb, uuid, integer) to authenticated;

create or replace function public.matches_my_briefing_asset_upload(p_path text, p_metadata jsonb)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select auth.uid() is not null
    and pg_catalog.jsonb_typeof(p_metadata) = 'object'
    and coalesce(p_metadata ->> 'size', '') ~ '^[1-9][0-9]{0,7}$'
    and exists (
      select 1 from site_private.customer_briefing_assets asset
      where asset.customer_user_id = auth.uid()
        and asset.storage_path = p_path
        and asset.expires_at > now()
        and asset.size_bytes = (p_metadata ->> 'size')::integer
        and asset.mime_type = pg_catalog.lower(coalesce(p_metadata ->> 'mimetype', ''))
    )
$$;

revoke all on function public.matches_my_briefing_asset_upload(text, jsonb) from public, anon, service_role, site_api;
grant execute on function public.matches_my_briefing_asset_upload(text, jsonb) to authenticated;

drop policy if exists customer_briefing_assets_insert_own on storage.objects;
create policy customer_briefing_assets_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'customer-briefing-assets'
  and owner_id = auth.uid()::text
  and public.matches_my_briefing_asset_upload(name, metadata)
);

comment on function site_private.normalize_selection_references(jsonb) is
  'Validação canônica de referências, incluindo fallback de cor, kits, alternativas e controles Unicode.';
comment on function public.matches_my_briefing_asset_upload(text, jsonb) is
  'Confere proprietário, caminho, MIME e tamanho real registrado pelo Storage antes do insert.';

-- As assinaturas sem rate limit não podem permanecer executáveis em paralelo.
drop function public.get_site_shared_selection(uuid);
drop function public.revoke_site_shared_selection(uuid, text);
