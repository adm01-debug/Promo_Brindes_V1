CREATE OR REPLACE FUNCTION public.delete_my_briefing_asset(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
