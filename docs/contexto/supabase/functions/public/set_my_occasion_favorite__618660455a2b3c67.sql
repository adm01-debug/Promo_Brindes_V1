CREATE OR REPLACE FUNCTION public.set_my_occasion_favorite(p_occasion_id text, p_saved boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_occasion_id text := lower(btrim(p_occasion_id));
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if p_saved is null then
    raise exception using errcode = '22023', message = 'invalid_favorite_state';
  end if;
  if v_occasion_id is null
    or v_occasion_id !~ '^[a-z0-9]+(?:-[a-z0-9]+){0,15}$'
    or length(v_occasion_id) > 80 then
    raise exception using errcode = '22023', message = 'invalid_occasion_id';
  end if;

  if p_saved then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 70923));
    if not exists (
      select 1 from site_private.customer_occasion_favorites favorite
      where favorite.customer_user_id = v_user_id and favorite.occasion_id = v_occasion_id
    ) and (
      select pg_catalog.count(*) from site_private.customer_occasion_favorites favorite
      where favorite.customer_user_id = v_user_id
    ) >= 100 then
      raise exception using errcode = 'P0001', message = 'occasion_favorite_limit_reached';
    end if;

    insert into site_private.customer_occasion_favorites (customer_user_id, occasion_id)
    values (v_user_id, v_occasion_id)
    on conflict (customer_user_id, occasion_id)
    do update set updated_at = now();
  else
    delete from site_private.customer_occasion_favorites favorite
    where favorite.customer_user_id = v_user_id and favorite.occasion_id = v_occasion_id;
  end if;

  return jsonb_build_object('occasionId', v_occasion_id, 'saved', p_saved);
end;
$function$
