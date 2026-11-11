CREATE OR REPLACE FUNCTION public.set_my_selection_archived(p_id uuid, p_expected_version integer, p_archived boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_selection site_private.customer_selections%rowtype;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  update site_private.customer_selections selection
  set archived_at = case when p_archived then now() else null end,
      version = selection.version + 1, updated_at = now()
  where selection.id = p_id and selection.customer_user_id = auth.uid()
    and selection.version = p_expected_version
  returning * into v_selection;
  if not found then raise exception using errcode = 'P0001', message = 'selection_version_conflict'; end if;
  return jsonb_build_object('id', v_selection.id, 'version', v_selection.version, 'archivedAt', v_selection.archived_at);
end;
$function$
