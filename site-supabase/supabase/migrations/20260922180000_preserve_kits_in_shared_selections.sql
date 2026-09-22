-- Links de seleção preservam a mesma aritmética de kit do briefing, sem PII.
-- Aplicar exclusivamente no Supabase isolado xlzmclcjdncjfdrjxclt.

create or replace function public.create_site_shared_selection(
  p_items jsonb,
  p_management_token_hash text,
  p_identifier_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_clean_items jsonb := '[]'::jsonb;
  v_token uuid;
  v_count integer;
  v_has_kit boolean;
begin
  if jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) not between 1 and 50
    or coalesce(p_management_token_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_identifier_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_shared_selection_payload';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_has_kit := v_item ?| array['k', 'kn', 'kq', 'ku'];
    if jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(v_item ->> 'q', '') !~ '^\d+$'
      or (v_item ->> 'q')::integer not between 1 and 999999
      or (v_item ? 'v' and coalesce(v_item ->> 'v', '') !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$')
      or (v_has_kit and (
        coalesce(v_item ->> 'k', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or length(btrim(coalesce(v_item ->> 'kn', ''))) not between 1 and 100
        or coalesce(v_item ->> 'kq', '') !~ '^[1-9][0-9]{0,5}$'
        or coalesce(v_item ->> 'ku', '') !~ '^[1-9][0-9]{0,2}$'
        or (v_item ->> 'ku')::integer > 100
        or (v_item ->> 'q')::integer <> (v_item ->> 'kq')::integer * (v_item ->> 'ku')::integer
      )) then
      raise exception using errcode = '22023', message = 'invalid_shared_selection_item';
    end if;

    v_clean_items := v_clean_items || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', lower(v_item ->> 'id'),
      'q', (v_item ->> 'q')::integer,
      'v', nullif(v_item ->> 'v', ''),
      'k', case when v_has_kit then lower(v_item ->> 'k') end,
      'kn', case when v_has_kit then btrim(v_item ->> 'kn') end,
      'kq', case when v_has_kit then (v_item ->> 'kq')::integer end,
      'ku', case when v_has_kit then (v_item ->> 'ku')::integer end
    )));
  end loop;

  if (select count(*) from (
    select distinct value ->> 'id' || ':' || coalesce(value ->> 'v', '') || ':' || coalesce(value ->> 'k', '') as reference_key
    from jsonb_array_elements(v_clean_items)
  ) unique_items) <> jsonb_array_length(v_clean_items) then
    raise exception using errcode = '22023', message = 'duplicate_shared_selection_item';
  end if;

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
  return jsonb_build_object('token', v_token, 'expiresAt', now() + interval '30 days');
end;
$$;

revoke all on function public.create_site_shared_selection(jsonb, text, text) from public, anon, authenticated;
grant execute on function public.create_site_shared_selection(jsonb, text, text) to site_api, service_role;

comment on column site_private.shared_selections.items is
  'Referências públicas sem PII; preserva grupo, nome e multiplicadores de kit quando presentes.';
