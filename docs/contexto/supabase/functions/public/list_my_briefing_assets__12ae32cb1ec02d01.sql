CREATE OR REPLACE FUNCTION public.list_my_briefing_assets()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
