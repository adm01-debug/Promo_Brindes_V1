CREATE OR REPLACE FUNCTION public.cancel_site_notification_backlog(p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_policy record;
  v_result jsonb;
begin
  if length(v_reason) not between 3 and 200 then
    raise exception using errcode = '22023', message = 'invalid_notification_backlog_input';
  end if;

  select * into v_policy from site_private.notification_policy();
  v_result := site_private.cancel_ineligible_notification_backlog(
    null, null, v_operator.display_name, v_reason, v_policy.max_age);

  return v_result || jsonb_build_object('reason', v_reason);
end;
$function$
