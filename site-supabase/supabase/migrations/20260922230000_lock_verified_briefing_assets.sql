-- Imutabilidade do blob após validação server-side.
-- Aplicar exclusivamente no Supabase isolado xlzmclcjdncjfdrjxclt.

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
        and asset.quote_request_id is null
        and asset.verified_at is null
        and asset.size_bytes = (p_metadata ->> 'size')::integer
        and asset.mime_type = pg_catalog.lower(coalesce(p_metadata ->> 'mimetype', ''))
    )
$$;

create or replace function public.can_delete_my_unverified_briefing_asset_path(p_path text)
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
      and asset.quote_request_id is null
      and asset.verified_at is null
      and asset.expires_at > now()
  )
$$;

revoke all on function public.can_delete_my_unverified_briefing_asset_path(text)
  from public, anon, service_role, site_api;
grant execute on function public.can_delete_my_unverified_briefing_asset_path(text)
  to authenticated;

drop policy if exists customer_briefing_assets_delete_own on storage.objects;
create policy customer_briefing_assets_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'customer-briefing-assets'
  and owner_id = auth.uid()::text
  and public.can_delete_my_unverified_briefing_asset_path(name)
);

comment on function public.matches_my_briefing_asset_upload(text, jsonb) is
  'Autoriza apenas o primeiro upload de uma reserva ainda não verificada; conteúdo validado não pode ser substituído pelo titular.';
comment on function public.can_delete_my_unverified_briefing_asset_path(text) is
  'Permite limpeza direta somente antes da verificação; depois dela a exclusão ocorre pela fila server-side.';
