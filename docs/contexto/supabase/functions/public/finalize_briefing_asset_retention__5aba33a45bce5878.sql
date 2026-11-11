CREATE OR REPLACE FUNCTION public.finalize_briefing_asset_retention(p_storage_paths text[], p_batch_size integer DEFAULT 100)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_count integer;
begin
  if p_batch_size not between 1 and 500
    or coalesce(cardinality(p_storage_paths), 0) > p_batch_size
    or exists (
      select 1 from unnest(coalesce(p_storage_paths, '{}'::text[])) path
      where length(path) not between 2 and 500 or path ~ '(^|/)\.\.(/|$)'
    ) then
    raise exception using errcode = '22023', message = 'invalid_briefing_asset_retention_input';
  end if;

  delete from site_private.customer_briefing_assets asset
  where asset.storage_bucket = 'customer-briefing-assets'
    and asset.storage_path = any(coalesce(p_storage_paths, '{}'::text[]))
    and asset.expires_at <= now();

  delete from site_private.storage_deletion_queue queued
  where queued.bucket = 'customer-briefing-assets'
    and queued.object_path = any(coalesce(p_storage_paths, '{}'::text[]));
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
