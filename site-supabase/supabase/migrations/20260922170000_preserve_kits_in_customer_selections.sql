-- Mantém a composição de kit ao sincronizar rascunhos entre dispositivos.
-- Aplicar exclusivamente no Supabase isolado xlzmclcjdncjfdrjxclt.

create or replace function public.save_my_selection(
  p_title text,
  p_references jsonb,
  p_campaign jsonb default null,
  p_id uuid default null,
  p_expected_version integer default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text := btrim(p_title);
  v_reference jsonb;
  v_references jsonb := '[]'::jsonb;
  v_selection site_private.customer_selections%rowtype;
  v_has_kit boolean;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if v_title is null or length(v_title) not between 1 and 100
    or jsonb_typeof(p_references) <> 'array'
    or jsonb_array_length(p_references) not between 1 and 50
    or (p_campaign is not null and (jsonb_typeof(p_campaign) <> 'object' or octet_length(p_campaign::text) > 2048)) then
    raise exception using errcode = '22023', message = 'invalid_selection_payload';
  end if;

  for v_reference in select value from jsonb_array_elements(p_references)
  loop
    v_has_kit := v_reference ?| array['k', 'kn', 'kq', 'ku'];
    if jsonb_typeof(v_reference) <> 'object'
      or coalesce(v_reference ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(v_reference ->> 'q', '') !~ '^[1-9][0-9]{0,5}$'
      or (v_reference ? 'v' and coalesce(v_reference ->> 'v', '') !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$')
      or (v_reference ? 'd' and v_reference ->> 'd' <> 'alternative')
      or (v_has_kit and (
        coalesce(v_reference ->> 'k', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or length(btrim(coalesce(v_reference ->> 'kn', ''))) not between 1 and 100
        or coalesce(v_reference ->> 'kq', '') !~ '^[1-9][0-9]{0,5}$'
        or coalesce(v_reference ->> 'ku', '') !~ '^[1-9][0-9]{0,2}$'
        or (v_reference ->> 'ku')::integer > 100
        or (v_reference ->> 'q')::integer <> (v_reference ->> 'kq')::integer * (v_reference ->> 'ku')::integer
      )) then
      raise exception using errcode = '22023', message = 'invalid_selection_reference';
    end if;
    v_references := v_references || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', lower(v_reference ->> 'id'),
      'q', (v_reference ->> 'q')::integer,
      'v', nullif(v_reference ->> 'v', ''),
      'd', nullif(v_reference ->> 'd', ''),
      'k', case when v_has_kit then lower(v_reference ->> 'k') end,
      'kn', case when v_has_kit then btrim(v_reference ->> 'kn') end,
      'kq', case when v_has_kit then (v_reference ->> 'kq')::integer end,
      'ku', case when v_has_kit then (v_reference ->> 'ku')::integer end
    )));
  end loop;

  if (select count(*) from (
    select distinct value ->> 'id' || ':' || coalesce(value ->> 'v', '') || ':' || coalesce(value ->> 'k', '') as reference_key
    from jsonb_array_elements(v_references)
  ) distinct_references) <> jsonb_array_length(v_references) then
    raise exception using errcode = '22023', message = 'duplicate_selection_reference';
  end if;

  if p_id is null then
    if p_expected_version is not null then raise exception using errcode = '22023', message = 'invalid_selection_version'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 70922));
    if (select count(*) from site_private.customer_selections where customer_user_id = v_user_id) >= 30 then
      raise exception using errcode = 'P0001', message = 'selection_limit_reached';
    end if;
    insert into site_private.customer_selections (customer_user_id, title, product_references, campaign)
    values (v_user_id, v_title, v_references, p_campaign)
    returning * into v_selection;
  else
    if p_expected_version is null or p_expected_version < 1 then
      raise exception using errcode = '22023', message = 'invalid_selection_version';
    end if;
    update site_private.customer_selections selection
    set title = v_title, product_references = v_references, campaign = p_campaign,
        version = selection.version + 1, updated_at = now()
    where selection.id = p_id and selection.customer_user_id = v_user_id
      and selection.version = p_expected_version and selection.archived_at is null
    returning * into v_selection;
    if not found then raise exception using errcode = 'P0001', message = 'selection_version_conflict'; end if;
  end if;

  return jsonb_build_object('id', v_selection.id, 'version', v_selection.version, 'updatedAt', v_selection.updated_at);
end;
$$;

revoke all on function public.save_my_selection(text, jsonb, jsonb, uuid, integer) from public, anon, service_role;
grant execute on function public.save_my_selection(text, jsonb, jsonb, uuid, integer) to authenticated;

comment on column site_private.customer_selections.product_references is
  'IDs públicos, quantidade, variante, decisão e, quando aplicável, grupo/nome/quantidade/unidades por kit. Sem preço nem estoque.';
