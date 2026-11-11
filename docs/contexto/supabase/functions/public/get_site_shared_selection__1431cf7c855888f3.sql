CREATE OR REPLACE FUNCTION public.get_site_shared_selection(p_token uuid, p_identifier_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  perform site_private.consume_shared_selection_action_limit(p_identifier_hash, 120);
  select pg_catalog.jsonb_build_object('items', selection.items, 'expiresAt', selection.expires_at)
  into v_result from site_private.shared_selections selection
  where selection.token = p_token and selection.revoked_at is null and selection.expires_at > now();
  return v_result;
end;
$function$
