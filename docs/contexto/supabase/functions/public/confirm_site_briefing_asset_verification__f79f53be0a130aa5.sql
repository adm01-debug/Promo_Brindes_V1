CREATE OR REPLACE FUNCTION public.confirm_site_briefing_asset_verification(p_id uuid, p_storage_path text, p_mime_type text, p_size_bytes integer)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
