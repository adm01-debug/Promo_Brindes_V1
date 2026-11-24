CREATE OR REPLACE FUNCTION site_private.log_pii_read(p_table_name text, p_subject uuid DEFAULT NULL::uuid, p_row_count integer DEFAULT NULL::integer, p_filter text DEFAULT NULL::text, p_actor_kind text DEFAULT 'titular'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'site_private'
AS $function$
begin
  insert into site_private.pii_read_audit_log
    (table_name, subject, performed_by, application_name, row_count, filter, actor_kind)
  values (
    p_table_name, p_subject,
    coalesce(auth.uid()::text, site_private.audit_actor(), 'anonymous'),
    current_setting('application_name', true),
    p_row_count, p_filter, p_actor_kind
  );
end;
$function$
