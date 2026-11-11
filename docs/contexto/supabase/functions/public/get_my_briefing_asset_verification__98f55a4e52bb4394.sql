CREATE OR REPLACE FUNCTION public.get_my_briefing_asset_verification(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  perform site_private.consume_rate_limit(
    'briefing_asset_verification',
    encode(extensions.digest(v_user_id::text, 'sha256'), 'hex'),
    20,
    interval '15 minutes'
  );
  return (
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
      and asset.customer_user_id = v_user_id
      and asset.quote_request_id is null
      and asset.expires_at > now()
  );
end;
$function$
