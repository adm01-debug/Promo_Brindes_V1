CREATE OR REPLACE FUNCTION site_private.audit_actor()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_claims jsonb;
  v_actor text;
begin
  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    v_claims := null;
  end;
  v_actor := coalesce(
    nullif(v_claims ->> 'role', ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('role', true), 'none'),
    session_user::text
  );
  return coalesce(v_actor, 'unknown');
end;
$function$
