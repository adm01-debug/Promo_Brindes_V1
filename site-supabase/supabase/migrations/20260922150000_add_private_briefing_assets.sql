-- Logos e referências privados do titular no Supabase isolado do site.
-- O objeto só é acessível pela sessão proprietária e nunca fica público.
-- Aplicar exclusivamente em xlzmclcjdncjfdrjxclt.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-briefing-assets',
  'customer-briefing-assets',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table site_private.customer_briefing_assets (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  quote_request_id uuid references site_private.quote_requests(id) on delete cascade,
  kind text not null check (kind in ('logo', 'reference')),
  original_name text not null check (length(original_name) between 1 and 160),
  storage_bucket text not null default 'customer-briefing-assets'
    check (storage_bucket = 'customer-briefing-assets'),
  storage_path text not null unique
    check (length(storage_path) between 40 and 160 and storage_path !~ '(^|/)\.\.(/|$)'),
  mime_type text not null
    check (mime_type in ('image/png', 'image/jpeg', 'image/webp', 'application/pdf')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index customer_briefing_assets_owner_created_idx
  on site_private.customer_briefing_assets (customer_user_id, created_at desc, id);
create index customer_briefing_assets_quote_idx
  on site_private.customer_briefing_assets (quote_request_id)
  where quote_request_id is not null;
create index customer_briefing_assets_expiry_idx
  on site_private.customer_briefing_assets (expires_at, id);

create table site_private.storage_deletion_queue (
  bucket text not null check (bucket = 'customer-briefing-assets'),
  object_path text not null check (length(object_path) between 2 and 500 and object_path !~ '(^|/)\.\.(/|$)'),
  queued_at timestamptz not null default now(),
  primary key (bucket, object_path)
);

alter table site_private.customer_briefing_assets enable row level security;
alter table site_private.customer_briefing_assets force row level security;
alter table site_private.storage_deletion_queue enable row level security;
alter table site_private.storage_deletion_queue force row level security;

revoke all on site_private.customer_briefing_assets, site_private.storage_deletion_queue
  from public, anon, authenticated, service_role, site_api;

create or replace function site_private.queue_briefing_asset_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into site_private.storage_deletion_queue (bucket, object_path)
  values (old.storage_bucket, old.storage_path)
  on conflict (bucket, object_path) do update set queued_at = least(site_private.storage_deletion_queue.queued_at, excluded.queued_at);
  return old;
end;
$$;

create trigger customer_briefing_assets_queue_deletion
before delete on site_private.customer_briefing_assets
for each row execute function site_private.queue_briefing_asset_deletion();

create or replace function public.create_my_briefing_asset(
  p_original_name text,
  p_mime_type text,
  p_size_bytes integer,
  p_kind text default 'reference'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_name text := btrim(pg_catalog.regexp_replace(coalesce(p_original_name, ''), '[[:cntrl:]/\\]+', ' ', 'g'));
  v_extension text;
  v_path text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if length(v_name) not between 1 and 160
    or coalesce(p_mime_type, '') not in ('image/png', 'image/jpeg', 'image/webp', 'application/pdf')
    or coalesce(p_size_bytes, 0) not between 1 and 10485760
    or coalesce(p_kind, '') not in ('logo', 'reference') then
    raise exception using errcode = '22023', message = 'invalid_briefing_asset';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 150922));
  if (select count(*) from site_private.customer_briefing_assets where customer_user_id = v_user_id) >= 10
    or coalesce((select sum(size_bytes) from site_private.customer_briefing_assets where customer_user_id = v_user_id), 0) + p_size_bytes > 52428800 then
    raise exception using errcode = 'P0001', message = 'briefing_asset_limit_reached';
  end if;

  v_extension := case p_mime_type
    when 'image/png' then 'png'
    when 'image/jpeg' then 'jpg'
    when 'image/webp' then 'webp'
    else 'pdf'
  end;
  v_path := v_user_id::text || '/' || v_id::text || '.' || v_extension;

  insert into site_private.customer_briefing_assets (
    id, customer_user_id, kind, original_name, storage_path, mime_type, size_bytes
  ) values (
    v_id, v_user_id, p_kind, v_name, v_path, p_mime_type, p_size_bytes
  );

  return jsonb_build_object(
    'id', v_id, 'kind', p_kind, 'name', v_name, 'path', v_path,
    'mimeType', p_mime_type, 'sizeBytes', p_size_bytes,
    'expiresAt', now() + interval '30 days'
  );
end;
$$;

create or replace function public.list_my_briefing_assets()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', asset.id,
    'kind', asset.kind,
    'name', asset.original_name,
    'path', asset.storage_path,
    'mimeType', asset.mime_type,
    'sizeBytes', asset.size_bytes,
    'quoteRequestId', asset.quote_request_id,
    'createdAt', asset.created_at,
    'expiresAt', asset.expires_at
  ) order by asset.created_at desc, asset.id), '[]'::jsonb)
  from site_private.customer_briefing_assets asset
  where asset.customer_user_id = auth.uid()
    and asset.expires_at > now();
$$;

create or replace function public.owns_my_briefing_asset_path(p_path text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select auth.uid() is not null and exists (
    select 1 from site_private.customer_briefing_assets asset
    where asset.customer_user_id = auth.uid()
      and asset.storage_path = p_path
      and asset.expires_at > now()
  );
$$;

create or replace function public.delete_my_briefing_asset(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  delete from site_private.customer_briefing_assets asset
  where asset.id = p_id
    and asset.customer_user_id = auth.uid()
    and asset.quote_request_id is null;
  if not found then
    raise exception using errcode = 'P0001', message = 'briefing_asset_not_deletable';
  end if;
  return true;
end;
$$;

create or replace function public.attach_my_briefing_assets_to_quote(
  p_request_id uuid,
  p_asset_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if coalesce(cardinality(p_asset_ids), 0) not between 1 and 10
    or (select count(distinct id) from unnest(p_asset_ids) id) <> cardinality(p_asset_ids)
    or not exists (
      select 1 from site_private.quote_requests request
      where request.id = p_request_id and request.customer_user_id = v_user_id and request.status <> 'spam'
    ) then
    raise exception using errcode = '22023', message = 'invalid_briefing_asset_attachment';
  end if;

  update site_private.customer_briefing_assets asset
  set quote_request_id = p_request_id,
      expires_at = (select request.retention_until from site_private.quote_requests request where request.id = p_request_id)
  where asset.id = any(p_asset_ids)
    and asset.customer_user_id = v_user_id
    and asset.quote_request_id is null
    and asset.expires_at > now();
  get diagnostics v_count = row_count;
  if v_count <> cardinality(p_asset_ids) then
    raise exception using errcode = 'P0001', message = 'briefing_asset_attachment_conflict';
  end if;
  return v_count;
end;
$$;

create or replace function public.get_briefing_asset_retention_candidates(p_batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_items jsonb;
begin
  if p_batch_size not between 1 and 500 then
    raise exception using errcode = '22023', message = 'invalid_batch_size';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('bucket', candidate.bucket, 'path', candidate.object_path)
    order by candidate.queued_at, candidate.object_path), '[]'::jsonb)
  into v_items
  from (
    select queued.bucket, queued.object_path, queued.queued_at
    from site_private.storage_deletion_queue queued
    union
    select asset.storage_bucket, asset.storage_path, asset.expires_at
    from site_private.customer_briefing_assets asset
    where asset.expires_at <= now()
    order by 3, 2
    limit p_batch_size
  ) candidate;
  return jsonb_build_object('objects', v_items);
end;
$$;

create or replace function public.finalize_briefing_asset_retention(
  p_storage_paths text[],
  p_batch_size integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_count integer;
begin
  if p_batch_size not between 1 and 500
    or coalesce(cardinality(p_storage_paths), 0) > p_batch_size
    or exists (
      select 1 from unnest(coalesce(p_storage_paths, '{}'::text[])) path
      where length(path) not between 2 and 500 or path ~ '(^|/)\.\.(/|$)'
    ) then
    raise exception using errcode = '22023', message = 'invalid_briefing_asset_retention_input';
  end if;

  delete from site_private.customer_briefing_assets asset
  where asset.storage_bucket = 'customer-briefing-assets'
    and asset.storage_path = any(coalesce(p_storage_paths, '{}'::text[]))
    and asset.expires_at <= now();

  delete from site_private.storage_deletion_queue queued
  where queued.bucket = 'customer-briefing-assets'
    and queued.object_path = any(coalesce(p_storage_paths, '{}'::text[]));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function site_private.erase_customer_assets_on_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.verified_email !~ '^titular-[0-9a-f]{16}@erased\.invalid$'
    and new.verified_email ~ '^titular-[0-9a-f]{16}@erased\.invalid$' then
    delete from site_private.customer_briefing_assets where customer_user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger customer_profile_asset_erasure
after update of verified_email on site_private.customer_profiles
for each row execute function site_private.erase_customer_assets_on_profile_change();

revoke all on function site_private.queue_briefing_asset_deletion() from public, anon, authenticated, service_role, site_api;
revoke all on function site_private.erase_customer_assets_on_profile_change() from public, anon, authenticated, service_role, site_api;
revoke all on function public.create_my_briefing_asset(text, text, integer, text) from public, anon, service_role, site_api;
revoke all on function public.list_my_briefing_assets() from public, anon, service_role, site_api;
revoke all on function public.owns_my_briefing_asset_path(text) from public, anon, service_role, site_api;
revoke all on function public.delete_my_briefing_asset(uuid) from public, anon, service_role, site_api;
revoke all on function public.attach_my_briefing_assets_to_quote(uuid, uuid[]) from public, anon, service_role, site_api;
revoke all on function public.get_briefing_asset_retention_candidates(integer) from public, anon, authenticated;
revoke all on function public.finalize_briefing_asset_retention(text[], integer) from public, anon, authenticated;

grant execute on function public.create_my_briefing_asset(text, text, integer, text) to authenticated;
grant execute on function public.list_my_briefing_assets() to authenticated;
grant execute on function public.owns_my_briefing_asset_path(text) to authenticated;
grant execute on function public.delete_my_briefing_asset(uuid) to authenticated;
grant execute on function public.attach_my_briefing_assets_to_quote(uuid, uuid[]) to authenticated;
grant execute on function public.get_briefing_asset_retention_candidates(integer) to site_api, service_role;
grant execute on function public.finalize_briefing_asset_retention(text[], integer) to site_api, service_role;

drop policy if exists customer_briefing_assets_select_own on storage.objects;
drop policy if exists customer_briefing_assets_insert_own on storage.objects;
drop policy if exists customer_briefing_assets_delete_own on storage.objects;

create policy customer_briefing_assets_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'customer-briefing-assets'
  and public.owns_my_briefing_asset_path(name)
);

create policy customer_briefing_assets_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'customer-briefing-assets'
  and owner_id = auth.uid()::text
  and public.owns_my_briefing_asset_path(name)
);

create policy customer_briefing_assets_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'customer-briefing-assets'
  and owner_id = auth.uid()::text
  and public.owns_my_briefing_asset_path(name)
);

comment on table site_private.customer_briefing_assets is
  'Logos e referências privadas do titular. Objetos ficam em bucket privado, expiram sem vínculo e acompanham a retenção do briefing após anexação.';
comment on table site_private.storage_deletion_queue is
  'Fila mínima de objetos privados para remoção pela Storage API; não contém conteúdo do arquivo.';
