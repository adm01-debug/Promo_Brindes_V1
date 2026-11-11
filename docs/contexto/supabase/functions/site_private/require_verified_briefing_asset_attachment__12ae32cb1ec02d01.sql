CREATE OR REPLACE FUNCTION site_private.require_verified_briefing_asset_attachment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.quote_request_id is not null
    and new.verified_at is null
    and (tg_op = 'INSERT' or old.quote_request_id is distinct from new.quote_request_id) then
    raise exception using errcode = 'P0001', message = 'briefing_asset_not_verified';
  end if;
  return new;
end;
$function$
