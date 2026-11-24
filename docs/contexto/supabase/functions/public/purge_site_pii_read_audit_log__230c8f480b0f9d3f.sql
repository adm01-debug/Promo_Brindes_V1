CREATE OR REPLACE FUNCTION public.purge_site_pii_read_audit_log(p_retention_days integer DEFAULT 400, p_batch_size integer DEFAULT 1000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_reads integer;
begin
  if p_retention_days not between 30 and 3650 or p_batch_size not between 1 and 5000 then
    raise exception using errcode = '22023', message = 'invalid_pii_read_retention_input';
  end if;
  with candidates as (
    select id from site_private.pii_read_audit_log
    where occurred_at < now() - make_interval(days => p_retention_days)
    order by occurred_at, id limit p_batch_size
  )
  delete from site_private.pii_read_audit_log log using candidates
  where log.id = candidates.id;
  get diagnostics v_reads = row_count;
  return jsonb_build_object('readsDeleted', v_reads);
end;
$function$
