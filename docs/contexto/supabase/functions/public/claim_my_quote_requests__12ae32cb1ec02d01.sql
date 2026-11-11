CREATE OR REPLACE FUNCTION public.claim_my_quote_requests()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_claimed integer := 0;
  v_email_hash text;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select lower(user_record.email), nullif(trim(user_record.raw_user_meta_data ->> 'name'), '')
    into v_email, v_name from auth.users user_record
    where user_record.id = v_user_id and user_record.email_confirmed_at is not null;
  if v_email is null then raise exception using errcode = '42501', message = 'verified_email_required'; end if;
  v_email_hash := encode(sha256(convert_to(v_email, 'UTF8')), 'hex');
  if exists (select 1 from site_private.erased_customer_identities erased where erased.email_sha256 = v_email_hash) then
    raise exception using errcode = '42501', message = 'identity_erased';
  end if;
  insert into site_private.customer_profiles (user_id, verified_email, display_name)
  values (v_user_id, v_email, v_name)
  on conflict (user_id) do update set verified_email = excluded.verified_email,
    display_name = coalesce(excluded.display_name, site_private.customer_profiles.display_name), updated_at = now();
  update site_private.quote_requests request set customer_user_id = v_user_id, updated_at = now()
  where request.customer_user_id is null and request.status <> 'spam' and lower(request.email) = v_email;
  get diagnostics v_claimed = row_count;
  return jsonb_build_object('claimed', v_claimed, 'email', v_email);
end;
$function$
