CREATE OR REPLACE FUNCTION site_private.mod11_check_digit(p_digits text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_sum integer := 0;
  v_weight integer := 2;
  v_digit integer;
  v_remainder integer;
begin
  if p_digits is null or p_digits !~ '^[0-9]+$' then
    raise exception using errcode = '22023', message = 'invalid_mod11_input';
  end if;
  for i in reverse length(p_digits)..1 loop
    v_digit := substring(p_digits from i for 1)::integer;
    v_sum := v_sum + v_digit * v_weight;
    v_weight := case when v_weight = 9 then 2 else v_weight + 1 end;
  end loop;
  v_remainder := v_sum % 11;
  return case when v_remainder < 2 then '0' else (11 - v_remainder)::text end;
end;
$function$
