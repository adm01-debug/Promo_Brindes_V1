CREATE OR REPLACE FUNCTION site_private.assert_site_operator()
 RETURNS site_private.commercial_operators
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operator site_private.commercial_operators;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select * into v_operator
  from site_private.commercial_operators operator
  where operator.user_id = v_user_id and operator.is_active;

  if not found then
    raise exception using errcode = '42501', message = 'not_a_site_operator';
  end if;

  return v_operator;
end;
$function$
