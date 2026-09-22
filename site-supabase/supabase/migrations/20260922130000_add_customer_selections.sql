-- Seleções persistentes por titular, exclusivas do banco isolado do site.
-- Uma seleção é um rascunho privado; não representa um orçamento enviado.
create table site_private.customer_selections (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 100),
  product_references jsonb not null check (jsonb_typeof(product_references) = 'array'),
  campaign jsonb,
  version integer not null default 1 check (version > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_selections_owner_updated_idx
  on site_private.customer_selections (customer_user_id, updated_at desc, id);
create index customer_selections_archived_idx
  on site_private.customer_selections (archived_at)
  where archived_at is not null;

alter table site_private.customer_selections enable row level security;
alter table site_private.customer_selections force row level security;
revoke all on site_private.customer_selections from public, anon, authenticated;
grant select, insert, update, delete on site_private.customer_selections to service_role;

comment on table site_private.customer_selections is
  'Rascunhos privados do titular, sem preço nem estoque. A FK apaga ao excluir a conta; pedido de apagamento do titular remove via trigger do perfil; arquivados são purgados após 90 dias.';
comment on column site_private.customer_selections.product_references is
  'Somente IDs públicos, quantidade, variante e grupo de decisão; dados do produto são reidratados do catálogo ao restaurar.';

create or replace function public.list_my_selections(p_include_archived boolean default false)
returns jsonb
language plpgsql security definer set search_path = '' stable
as $$
declare
  v_user_id uuid := auth.uid();
  v_items jsonb;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', selection.id,
    'title', selection.title,
    'references', selection.product_references,
    'campaign', selection.campaign,
    'version', selection.version,
    'archivedAt', selection.archived_at,
    'createdAt', selection.created_at,
    'updatedAt', selection.updated_at
  ) order by selection.updated_at desc, selection.id), '[]'::jsonb)
  into v_items
  from site_private.customer_selections selection
  where selection.customer_user_id = v_user_id
    and (p_include_archived or selection.archived_at is null);
  return jsonb_build_object('items', v_items);
end;
$$;

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
    if jsonb_typeof(v_reference) <> 'object'
      or coalesce(v_reference ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(v_reference ->> 'q', '') !~ '^[1-9][0-9]{0,5}$'
      or (v_reference ? 'v' and coalesce(v_reference ->> 'v', '') !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$')
      or (v_reference ? 'd' and v_reference ->> 'd' <> 'alternative') then
      raise exception using errcode = '22023', message = 'invalid_selection_reference';
    end if;
    v_references := v_references || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', lower(v_reference ->> 'id'),
      'q', (v_reference ->> 'q')::integer,
      'v', nullif(v_reference ->> 'v', ''),
      'd', nullif(v_reference ->> 'd', '')
    )));
  end loop;

  if (select count(*) from (
    select distinct value ->> 'id' || ':' || coalesce(value ->> 'v', '') as reference_key
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

create or replace function public.set_my_selection_archived(
  p_id uuid, p_expected_version integer, p_archived boolean
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_selection site_private.customer_selections%rowtype;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  update site_private.customer_selections selection
  set archived_at = case when p_archived then now() else null end,
      version = selection.version + 1, updated_at = now()
  where selection.id = p_id and selection.customer_user_id = auth.uid()
    and selection.version = p_expected_version
  returning * into v_selection;
  if not found then raise exception using errcode = 'P0001', message = 'selection_version_conflict'; end if;
  return jsonb_build_object('id', v_selection.id, 'version', v_selection.version, 'archivedAt', v_selection.archived_at);
end;
$$;

create or replace function public.delete_my_selection(p_id uuid, p_expected_version integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  delete from site_private.customer_selections selection
  where selection.id = p_id and selection.customer_user_id = auth.uid()
    and selection.version = p_expected_version;
  if not found then raise exception using errcode = 'P0001', message = 'selection_version_conflict'; end if;
  return true;
end;
$$;

create or replace function public.purge_archived_customer_selections(p_batch_size integer default 100)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  if p_batch_size not between 1 and 500 then raise exception using errcode = '22023', message = 'invalid_batch_size'; end if;
  with old as (
    select id from site_private.customer_selections
    where archived_at < now() - interval '90 days'
    order by archived_at, id limit p_batch_size for update skip locked
  )
  delete from site_private.customer_selections selection
  using old where selection.id = old.id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function site_private.erase_customer_selections_on_profile_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.verified_email !~ '^titular-[0-9a-f]{16}@erased\.invalid$'
    and new.verified_email ~ '^titular-[0-9a-f]{16}@erased\.invalid$' then
    delete from site_private.customer_selections where customer_user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger customer_profile_selection_erasure
after update of verified_email on site_private.customer_profiles
for each row execute function site_private.erase_customer_selections_on_profile_change();

revoke all on function public.list_my_selections(boolean) from public, anon;
revoke all on function public.save_my_selection(text, jsonb, jsonb, uuid, integer) from public, anon;
revoke all on function public.set_my_selection_archived(uuid, integer, boolean) from public, anon;
revoke all on function public.delete_my_selection(uuid, integer) from public, anon;
revoke all on function public.purge_archived_customer_selections(integer) from public, anon, authenticated;
grant execute on function public.list_my_selections(boolean) to authenticated;
grant execute on function public.save_my_selection(text, jsonb, jsonb, uuid, integer) to authenticated;
grant execute on function public.set_my_selection_archived(uuid, integer, boolean) to authenticated;
grant execute on function public.delete_my_selection(uuid, integer) to authenticated;
grant execute on function public.purge_archived_customer_selections(integer) to site_api, service_role;
