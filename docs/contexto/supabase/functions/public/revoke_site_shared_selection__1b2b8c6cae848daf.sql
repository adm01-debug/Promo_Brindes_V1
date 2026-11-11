CREATE OR REPLACE FUNCTION public.revoke_site_shared_selection(p_token uuid, p_management_token_hash text, p_identifier_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_revoked boolean := false;
begin
  perform site_private.consume_shared_selection_action_limit(p_identifier_hash, 30);
  if coalesce(p_management_token_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_shared_selection_management_token';
  end if;
  update site_private.shared_selections set revoked_at = now()
  where token = p_token and management_token_hash = p_management_token_hash
    and revoked_at is null and expires_at > now()
  returning true into v_revoked;
  return pg_catalog.jsonb_build_object('revoked', coalesce(v_revoked, false));
end;
$function$
