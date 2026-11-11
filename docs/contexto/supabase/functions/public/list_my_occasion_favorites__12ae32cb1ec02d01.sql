CREATE OR REPLACE FUNCTION public.list_my_occasion_favorites()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_items jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select coalesce(jsonb_agg(favorite.occasion_id order by favorite.updated_at desc, favorite.occasion_id), '[]'::jsonb)
  into v_items
  from site_private.customer_occasion_favorites favorite
  where favorite.customer_user_id = v_user_id;

  return jsonb_build_object('items', v_items);
end;
$function$
