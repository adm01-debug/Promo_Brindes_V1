CREATE OR REPLACE FUNCTION site_private.assign_quote_protocol()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_base text;
begin
  if new.protocol is not null then
    return new;
  end if;
  v_base := to_char(coalesce(new.created_at, now()), 'YY') || lpad(nextval('site_private.quote_protocol_seq')::text, 6, '0');
  new.protocol := 'PB' || v_base || site_private.mod11_check_digit(v_base);
  return new;
end;
$function$
