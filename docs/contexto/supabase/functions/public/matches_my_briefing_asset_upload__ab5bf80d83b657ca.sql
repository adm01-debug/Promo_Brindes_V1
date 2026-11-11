CREATE OR REPLACE FUNCTION public.matches_my_briefing_asset_upload(p_path text, p_metadata jsonb)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
