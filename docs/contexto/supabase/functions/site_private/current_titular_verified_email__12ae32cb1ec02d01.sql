CREATE OR REPLACE FUNCTION site_private.current_titular_verified_email()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select lower(user_record.email) into v_email
  from auth.users user_record
  where user_record.id = v_user_id and user_record.email_confirmed_at is not null;

  if v_email is null then
    raise exception using errcode = '42501', message = 'verified_email_required';
  end if;

  return v_email;
end;
$function$
