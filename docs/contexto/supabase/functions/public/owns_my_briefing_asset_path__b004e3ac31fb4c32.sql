CREATE OR REPLACE FUNCTION public.owns_my_briefing_asset_path(p_path text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select auth.uid() is not null and exists (
    select 1 from site_private.customer_briefing_assets asset
    where asset.customer_user_id = auth.uid()
      and asset.storage_path = p_path
      and asset.expires_at > now()
  );
$function$
