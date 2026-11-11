CREATE OR REPLACE FUNCTION site_private.erase_customer_selections_on_profile_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.verified_email !~ '^titular-[0-9a-f]{16}@erased\.invalid$'
    and new.verified_email ~ '^titular-[0-9a-f]{16}@erased\.invalid$' then
    delete from site_private.customer_selections where customer_user_id = new.user_id;
  end if;
  return new;
end;
$function$
