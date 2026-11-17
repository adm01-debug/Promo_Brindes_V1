CREATE OR REPLACE FUNCTION site_private.erase_titular_request_metadata(p_metadata jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_result jsonb := p_metadata;
  v_briefing jsonb;
  v_campaign jsonb;
  v_occasion jsonb;
begin
  if jsonb_typeof(v_result) <> 'object' then
    return v_result;
  end if;

  v_briefing := v_result -> 'briefing';
  if jsonb_typeof(v_briefing) = 'object' then
    v_result := jsonb_set(v_result, '{briefing}', v_briefing - 'actionName');
  end if;

  v_campaign := v_result -> 'campaign';
  if jsonb_typeof(v_campaign) = 'object' then
    v_occasion := v_campaign -> 'occasion';
    if jsonb_typeof(v_occasion) = 'object' then
      v_result := jsonb_set(v_result, '{campaign,occasion}', (v_occasion - 'name') - 'id');
    end if;
  end if;

  return v_result;
end;
$function$
