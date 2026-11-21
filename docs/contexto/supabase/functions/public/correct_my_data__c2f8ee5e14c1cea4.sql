CREATE OR REPLACE FUNCTION public.correct_my_data(p_display_name text, p_company text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_email text := site_private.current_titular_verified_email();
  v_display_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_company text := nullif(trim(coalesce(p_company, '')), '');
begin
  if v_display_name is null and v_company is null then
    raise exception using errcode = '22023', message = 'invalid_profile_fields';
  end if;
  if v_display_name is not null and length(v_display_name) not between 2 and 100 then
    raise exception using errcode = '22023', message = 'invalid_profile_fields';
  end if;
  if v_company is not null and length(v_company) not between 2 and 150 then
    raise exception using errcode = '22023', message = 'invalid_profile_fields';
  end if;

  insert into site_private.customer_profiles (user_id, verified_email, display_name, company)
  values (v_user_id, v_email, v_display_name, v_company)
  on conflict (user_id) do update
    set display_name = coalesce(excluded.display_name, site_private.customer_profiles.display_name),
        company = coalesce(excluded.company, site_private.customer_profiles.company),
        updated_at = now();

  insert into site_private.subject_right_requests (subject_user_id, right_type)
  values (v_user_id, 'correct');

  return jsonb_build_object('updated', true, 'displayName', v_display_name, 'company', v_company);
end;
$function$
