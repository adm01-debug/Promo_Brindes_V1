CREATE OR REPLACE FUNCTION public.get_my_data_access()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_email text := site_private.current_titular_verified_email();
  v_display_name text;
  v_company text;
  v_quotes integer;
  v_selections integer;
  v_favorites integer;
  v_contacts integer;
begin
  insert into site_private.subject_right_requests (subject_user_id, right_type)
  values (v_user_id, 'access');

  select profile.display_name, profile.company
    into v_display_name, v_company
  from site_private.customer_profiles profile
  where profile.user_id = v_user_id;

  select count(*) into v_quotes
  from site_private.quote_requests request
  where request.customer_user_id = v_user_id and request.status <> 'spam';
  -- Todas as selecoes, inclusive as arquivadas: a exportacao (abaixo) as inclui,
  -- e o relatorio de acesso deve refletir o que esta armazenado para o titular.
  select count(*) into v_selections
  from site_private.customer_selections selection
  where selection.customer_user_id = v_user_id;
  select count(*) into v_favorites
  from site_private.customer_occasion_favorites favorite
  where favorite.customer_user_id = v_user_id;
  select count(*) into v_contacts
  from site_private.contact_requests contact
  where contact.email = v_email and contact.status <> 'spam';

  return jsonb_build_object(
    'profile', jsonb_build_object('displayName', v_display_name, 'company', v_company),
    'counts', jsonb_build_object(
      'quotes', v_quotes, 'selections', v_selections, 'favorites', v_favorites, 'contacts', v_contacts
    )
  );
end;
$function$
