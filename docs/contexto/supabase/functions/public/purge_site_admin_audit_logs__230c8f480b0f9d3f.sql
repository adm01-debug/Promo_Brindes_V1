CREATE OR REPLACE FUNCTION public.purge_site_admin_audit_logs(p_retention_days integer DEFAULT 400, p_batch_size integer DEFAULT 1000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_writes integer;
  v_ddl integer;
begin
  if p_retention_days not between 30 and 3650 or p_batch_size not between 1 and 5000 then
    raise exception using errcode = '22023', message = 'invalid_audit_retention_input';
  end if;
  with candidates as (
    select id from site_private.admin_audit_log
    where occurred_at < now() - make_interval(days => p_retention_days)
    order by occurred_at, id limit p_batch_size
  )
  delete from site_private.admin_audit_log log using candidates
  where log.id = candidates.id;
  get diagnostics v_writes = row_count;

  with candidates as (
    select id from site_private.admin_ddl_log
    where occurred_at < now() - make_interval(days => p_retention_days)
    order by occurred_at, id limit p_batch_size
  )
  delete from site_private.admin_ddl_log log using candidates
  where log.id = candidates.id;
  get diagnostics v_ddl = row_count;
  return jsonb_build_object('writesDeleted', v_writes, 'ddlDeleted', v_ddl);
end;
$function$
