CREATE OR REPLACE FUNCTION public.delete_my_selection(p_id uuid, p_expected_version integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  delete from site_private.customer_selections selection
  where selection.id = p_id and selection.customer_user_id = auth.uid()
    and selection.version = p_expected_version;
  if not found then raise exception using errcode = 'P0001', message = 'selection_version_conflict'; end if;
  return true;
end;
$function$
