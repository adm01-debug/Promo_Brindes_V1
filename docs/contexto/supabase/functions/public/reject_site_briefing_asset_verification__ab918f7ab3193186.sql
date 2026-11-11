CREATE OR REPLACE FUNCTION public.reject_site_briefing_asset_verification(p_id uuid, p_storage_path text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  delete from site_private.customer_briefing_assets asset
  where asset.id = p_id
    and asset.storage_bucket = 'customer-briefing-assets'
    and asset.storage_path = p_storage_path
    and asset.quote_request_id is null;

  return found;
end;
$function$
