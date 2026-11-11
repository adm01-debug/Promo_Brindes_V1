CREATE OR REPLACE FUNCTION site_private.queue_briefing_asset_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into site_private.storage_deletion_queue (bucket, object_path)
  values (old.storage_bucket, old.storage_path)
  on conflict (bucket, object_path) do update set queued_at = least(site_private.storage_deletion_queue.queued_at, excluded.queued_at);
  return old;
end;
$function$
