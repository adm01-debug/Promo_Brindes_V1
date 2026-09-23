-- Datas comemorativas salvas pertencem à conta, não ao dispositivo.
-- O catálogo de ocasiões continua no frontend; o banco guarda somente IDs estáveis,
-- sem dados pessoais adicionais e sem permitir acesso direto pelo navegador.
create table site_private.customer_occasion_favorites (
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  occasion_id text not null check (occasion_id ~ '^[a-z0-9]+(?:-[a-z0-9]+){0,15}$' and length(occasion_id) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (customer_user_id, occasion_id)
);

create index customer_occasion_favorites_owner_updated_idx
  on site_private.customer_occasion_favorites (customer_user_id, updated_at desc, occasion_id);

alter table site_private.customer_occasion_favorites enable row level security;
alter table site_private.customer_occasion_favorites force row level security;
revoke all on site_private.customer_occasion_favorites from public, anon, authenticated;
grant select, insert, update, delete on site_private.customer_occasion_favorites to service_role;

comment on table site_private.customer_occasion_favorites is
  'IDs de datas comemorativas escolhidas pelo titular. A lista editorial fica no frontend; a conta guarda somente o ID e o vínculo é apagado com auth.users.';

create or replace function public.list_my_occasion_favorites()
returns jsonb
language plpgsql security definer set search_path = '' stable
as $$
declare
  v_user_id uuid := auth.uid();
  v_items jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select coalesce(jsonb_agg(favorite.occasion_id order by favorite.updated_at desc, favorite.occasion_id), '[]'::jsonb)
  into v_items
  from site_private.customer_occasion_favorites favorite
  where favorite.customer_user_id = v_user_id;

  return jsonb_build_object('items', v_items);
end;
$$;

create or replace function public.set_my_occasion_favorite(
  p_occasion_id text,
  p_saved boolean
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_occasion_id text := lower(btrim(p_occasion_id));
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if v_occasion_id is null
    or v_occasion_id !~ '^[a-z0-9]+(?:-[a-z0-9]+){0,15}$'
    or length(v_occasion_id) > 80 then
    raise exception using errcode = '22023', message = 'invalid_occasion_id';
  end if;

  if p_saved then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 70923));
    if not exists (
      select 1 from site_private.customer_occasion_favorites favorite
      where favorite.customer_user_id = v_user_id and favorite.occasion_id = v_occasion_id
    ) and (
      select pg_catalog.count(*) from site_private.customer_occasion_favorites favorite
      where favorite.customer_user_id = v_user_id
    ) >= 100 then
      raise exception using errcode = 'P0001', message = 'occasion_favorite_limit_reached';
    end if;

    insert into site_private.customer_occasion_favorites (customer_user_id, occasion_id)
    values (v_user_id, v_occasion_id)
    on conflict (customer_user_id, occasion_id)
    do update set updated_at = now();
  else
    delete from site_private.customer_occasion_favorites favorite
    where favorite.customer_user_id = v_user_id and favorite.occasion_id = v_occasion_id;
  end if;

  return jsonb_build_object('occasionId', v_occasion_id, 'saved', p_saved);
end;
$$;

create or replace function site_private.erase_customer_occasion_favorites_on_profile_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.verified_email !~ '^titular-[0-9a-f]{16}@erased\.invalid$'
    and new.verified_email ~ '^titular-[0-9a-f]{16}@erased\.invalid$' then
    delete from site_private.customer_occasion_favorites where customer_user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger customer_profile_occasion_favorite_erasure
after update of verified_email on site_private.customer_profiles
for each row execute function site_private.erase_customer_occasion_favorites_on_profile_change();

revoke all on function public.list_my_occasion_favorites() from public, anon;
revoke all on function public.set_my_occasion_favorite(text, boolean) from public, anon;
grant execute on function public.list_my_occasion_favorites() to authenticated;
grant execute on function public.set_my_occasion_favorite(text, boolean) to authenticated;

revoke all on function site_private.erase_customer_occasion_favorites_on_profile_change() from public, anon, authenticated, service_role, site_api;
