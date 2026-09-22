-- Verificação server-side da assinatura binária de logos e referências.
-- Aplicar exclusivamente no Supabase isolado xlzmclcjdncjfdrjxclt.

alter table site_private.customer_briefing_assets
  add column verified_at timestamptz;

comment on column site_private.customer_briefing_assets.verified_at is
  'Preenchido somente pela API do site após ler o blob privado e validar sua assinatura binária.';

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
    'verifiedAt', asset.verified_at,
    'createdAt', asset.created_at,
    'expiresAt', asset.expires_at
  ) order by asset.created_at desc, asset.id), '[]'::jsonb)
  from site_private.customer_briefing_assets asset
  where asset.customer_user_id = auth.uid()
    and asset.expires_at > now();
$$;

create or replace function public.get_my_briefing_asset_verification(p_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'id', asset.id,
    'bucket', asset.storage_bucket,
    'path', asset.storage_path,
    'mimeType', asset.mime_type,
    'sizeBytes', asset.size_bytes,
    'verifiedAt', asset.verified_at
  )
  from site_private.customer_briefing_assets asset
  where asset.id = p_id
    and asset.customer_user_id = auth.uid()
    and asset.quote_request_id is null
    and asset.expires_at > now();
$$;

create or replace function public.confirm_site_briefing_asset_verification(
  p_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes integer
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare v_verified_at timestamptz;
begin
  update site_private.customer_briefing_assets asset
  set verified_at = coalesce(asset.verified_at, now())
  where asset.id = p_id
    and asset.storage_bucket = 'customer-briefing-assets'
    and asset.storage_path = p_storage_path
    and asset.mime_type = p_mime_type
    and asset.size_bytes = p_size_bytes
    and asset.quote_request_id is null
    and asset.expires_at > now()
    and exists (
      select 1
      from storage.objects object
      where object.bucket_id = asset.storage_bucket
        and object.name = asset.storage_path
        and coalesce(object.metadata ->> 'mimetype', '') = asset.mime_type
        and coalesce(object.metadata ->> 'size', '') ~ '^[1-9][0-9]{0,7}$'
        and (object.metadata ->> 'size')::integer = asset.size_bytes
    )
  returning asset.verified_at into v_verified_at;
  if v_verified_at is null then
    raise exception using errcode = 'P0001', message = 'briefing_asset_verification_conflict';
  end if;
  return v_verified_at;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception using errcode = '22023', message = 'invalid_briefing_asset_verification';
end;
$$;

create or replace function site_private.require_verified_briefing_asset_attachment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.quote_request_id is not null
    and new.verified_at is null
    and (tg_op = 'INSERT' or old.quote_request_id is distinct from new.quote_request_id) then
    raise exception using errcode = 'P0001', message = 'briefing_asset_not_verified';
  end if;
  return new;
end;
$$;

create trigger customer_briefing_assets_require_verification
before update of quote_request_id on site_private.customer_briefing_assets
for each row execute function site_private.require_verified_briefing_asset_attachment();

create trigger customer_briefing_assets_require_verification_on_insert
before insert on site_private.customer_briefing_assets
for each row execute function site_private.require_verified_briefing_asset_attachment();

revoke all on function public.get_my_briefing_asset_verification(uuid) from public, anon, service_role, site_api;
grant execute on function public.get_my_briefing_asset_verification(uuid) to authenticated;

revoke all on function public.confirm_site_briefing_asset_verification(uuid, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.confirm_site_briefing_asset_verification(uuid, text, text, integer)
  to site_api, service_role;

revoke all on function site_private.require_verified_briefing_asset_attachment()
  from public, anon, authenticated, service_role, site_api;
