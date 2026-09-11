-- Links de seleção persistentes, opacos e revogáveis.
-- Aplicar somente ao Supabase isolado xlzmclcjdncjfdrjxclt; nunca ao catálogo canônico.

create table site_private.shared_selections (
  token uuid primary key default gen_random_uuid(),
  management_token_hash text not null check (management_token_hash ~ '^[0-9a-f]{64}$'),
  items jsonb not null check (
    jsonb_typeof(items) = 'array'
    and jsonb_array_length(items) between 1 and 8
  ),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '31 days')
);

create table site_private.shared_selection_rate_limits (
  identifier_hash text primary key check (identifier_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);

create index shared_selections_active_idx
  on site_private.shared_selections (expires_at)
  where revoked_at is null;

alter table site_private.shared_selections enable row level security;
alter table site_private.shared_selection_rate_limits enable row level security;
revoke all on site_private.shared_selections, site_private.shared_selection_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on site_private.shared_selections, site_private.shared_selection_rate_limits to service_role;

create trigger shared_selections_set_updated_at
before update on site_private.shared_selections
for each row execute function site_private.set_updated_at();

create trigger shared_selection_rate_limits_set_updated_at
before update on site_private.shared_selection_rate_limits
for each row execute function site_private.set_updated_at();

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
begin
  if jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) not between 1 and 8
    or coalesce(p_management_token_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_identifier_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_shared_selection_payload';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(v_item ->> 'q', '') !~ '^\d+$'
      or (v_item ->> 'q')::integer not between 1 and 999999
      or (v_item ? 'v' and coalesce(v_item ->> 'v', '') !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$') then
      raise exception using errcode = '22023', message = 'invalid_shared_selection_item';
    end if;

    v_clean_items := v_clean_items || jsonb_build_array(
      jsonb_strip_nulls(jsonb_build_object(
        'id', lower(v_item ->> 'id'),
        'q', (v_item ->> 'q')::integer,
        'v', nullif(v_item ->> 'v', '')
      ))
    );
  end loop;

  if (
    select count(*)
    from (
      select distinct
        value ->> 'id' || ':' || coalesce(value ->> 'v', '') as reference_key
      from jsonb_array_elements(v_clean_items)
    ) unique_items
  ) <> jsonb_array_length(v_clean_items) then
    raise exception using errcode = '22023', message = 'duplicate_shared_selection_item';
  end if;

  insert into site_private.shared_selection_rate_limits as bucket (
    identifier_hash, window_started_at, request_count, updated_at
  ) values (p_identifier_hash, now(), 1, now())
  on conflict (identifier_hash) do update
  set request_count = case when bucket.window_started_at <= now() - interval '1 hour' then 1 else bucket.request_count + 1 end,
      window_started_at = case when bucket.window_started_at <= now() - interval '1 hour' then now() else bucket.window_started_at end,
      updated_at = now()
  returning request_count into v_count;

  if v_count > 12 then
    raise exception using errcode = 'P0001', message = 'shared_selection_rate_limit_exceeded';
  end if;

  insert into site_private.shared_selections (management_token_hash, items)
  values (p_management_token_hash, v_clean_items)
  returning token into v_token;

  return jsonb_build_object('token', v_token, 'expiresAt', now() + interval '30 days');
end;
$$;

create or replace function public.get_site_shared_selection(p_token uuid)
returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select jsonb_build_object('items', selection.items, 'expiresAt', selection.expires_at)
  from site_private.shared_selections selection
  where selection.token = p_token
    and selection.revoked_at is null
    and selection.expires_at > now()
$$;

create or replace function public.revoke_site_shared_selection(
  p_token uuid,
  p_management_token_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revoked boolean := false;
begin
  if coalesce(p_management_token_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_shared_selection_management_token';
  end if;

  update site_private.shared_selections
  set revoked_at = now()
  where token = p_token
    and management_token_hash = p_management_token_hash
    and revoked_at is null
    and expires_at > now()
  returning true into v_revoked;

  return jsonb_build_object('revoked', coalesce(v_revoked, false));
end;
$$;

revoke all on function public.create_site_shared_selection(jsonb, text, text) from public, anon, authenticated;
revoke all on function public.get_site_shared_selection(uuid) from public, anon, authenticated;
revoke all on function public.revoke_site_shared_selection(uuid, text) from public, anon, authenticated;
grant execute on function public.create_site_shared_selection(jsonb, text, text) to service_role;
grant execute on function public.get_site_shared_selection(uuid) to service_role;
grant execute on function public.revoke_site_shared_selection(uuid, text) to service_role;
