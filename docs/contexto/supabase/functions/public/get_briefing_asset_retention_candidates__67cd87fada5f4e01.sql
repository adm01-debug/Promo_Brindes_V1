CREATE OR REPLACE FUNCTION public.get_briefing_asset_retention_candidates(p_batch_size integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_items jsonb;
begin
  if p_batch_size not between 1 and 500 then raise exception using errcode = '22023', message = 'invalid_batch_size'; end if;
  with raw_candidates as (
    select queued.bucket, queued.object_path, queued.queued_at
    from site_private.storage_deletion_queue queued
    union all
    select asset.storage_bucket, asset.storage_path, asset.expires_at
    from site_private.customer_briefing_assets asset
    where asset.expires_at <= now()
  ), candidates as (
    select candidate.bucket, candidate.object_path, min(candidate.queued_at) as queued_at
    from raw_candidates candidate
    group by candidate.bucket, candidate.object_path
    order by min(candidate.queued_at), candidate.bucket, candidate.object_path
    limit p_batch_size
  )
  select coalesce(jsonb_agg(jsonb_build_object('bucket', candidate.bucket, 'path', candidate.object_path)
    order by candidate.queued_at, candidate.bucket, candidate.object_path), '[]'::jsonb)
  into v_items
  from candidates candidate;
  return jsonb_build_object('objects', v_items);
end;
$function$
