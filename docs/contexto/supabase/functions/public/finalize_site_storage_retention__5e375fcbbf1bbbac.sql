CREATE OR REPLACE FUNCTION public.finalize_site_storage_retention(p_objects jsonb, p_batch_size integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_assets integer := 0;
  v_queue integer := 0;
begin
  if p_batch_size not between 1 and 500
    or jsonb_typeof(coalesce(p_objects, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_objects, '[]'::jsonb)) > p_batch_size
    or exists (
      select 1
      from jsonb_array_elements(coalesce(p_objects, '[]'::jsonb)) item
      where jsonb_typeof(item) <> 'object'
        or item ->> 'bucket' not in ('customer-briefing-assets', 'customer-proposals')
        or length(coalesce(item ->> 'path', '')) not between 2 and 500
        or (item ->> 'path') ~ '(^|/)\.\.(/|$)'
    ) then
    raise exception using errcode = '22023', message = 'invalid_site_storage_retention_input';
  end if;

  delete from site_private.customer_briefing_assets asset
  using jsonb_array_elements(coalesce(p_objects, '[]'::jsonb)) item
  where item ->> 'bucket' = 'customer-briefing-assets'
    and asset.storage_bucket = item ->> 'bucket'
    and asset.storage_path = item ->> 'path'
    and asset.expires_at <= now();
  get diagnostics v_assets = row_count;

  delete from site_private.storage_deletion_queue queued
  using jsonb_array_elements(coalesce(p_objects, '[]'::jsonb)) item
  where queued.bucket = item ->> 'bucket'
    and queued.object_path = item ->> 'path';
  get diagnostics v_queue = row_count;

  return jsonb_build_object('assetsDeleted', v_assets, 'queueEntriesDeleted', v_queue);
end;
$function$
