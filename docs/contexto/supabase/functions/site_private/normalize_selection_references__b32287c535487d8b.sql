CREATE OR REPLACE FUNCTION site_private.normalize_selection_references(p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$
