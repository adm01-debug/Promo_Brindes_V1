CREATE OR REPLACE FUNCTION public.can_delete_my_unverified_briefing_asset_path(p_path text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select auth.uid() is not null and exists (
    select 1 from site_private.customer_briefing_assets asset
    where asset.customer_user_id = auth.uid()
      and asset.storage_path = p_path
      and asset.quote_request_id is null
      and asset.verified_at is null
      and asset.expires_at > now()
  )
$function$
