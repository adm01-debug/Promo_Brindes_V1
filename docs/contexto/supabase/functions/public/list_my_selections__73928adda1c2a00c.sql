CREATE OR REPLACE FUNCTION public.list_my_selections(p_include_archived boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_items jsonb;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', selection.id,
    'title', selection.title,
    'references', selection.product_references,
    'campaign', selection.campaign,
    'version', selection.version,
    'archivedAt', selection.archived_at,
    'createdAt', selection.created_at,
    'updatedAt', selection.updated_at
  ) order by selection.updated_at desc, selection.id), '[]'::jsonb)
  into v_items
  from site_private.customer_selections selection
  where selection.customer_user_id = v_user_id
    and (p_include_archived or selection.archived_at is null);
  return jsonb_build_object('items', v_items);
end;
$function$
