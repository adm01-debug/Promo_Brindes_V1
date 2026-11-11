CREATE OR REPLACE FUNCTION site_private.next_retry_at(p_attempts smallint, p_now timestamp with time zone DEFAULT now(), p_jitter double precision DEFAULT NULL::double precision)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_policy record;
  v_jitter double precision := coalesce(p_jitter, random());
  v_delay_seconds numeric;
begin
  select * into v_policy from site_private.notification_policy();
  if p_attempts < 1 then
    raise exception using errcode = '22023', message = 'invalid_retry_attempts';
  end if;
  if v_jitter < 0 or v_jitter >= 1 then
    raise exception using errcode = '22023', message = 'invalid_retry_jitter';
  end if;

  v_delay_seconds := least(
    v_policy.retry_base_seconds * power(2, least(p_attempts - 1, 10)),
    v_policy.retry_cap_seconds
  );
  -- Jitter de 0 a 20% para além do delay calculado: evita que todas as tentativas
  -- represadas por uma indisponibilidade do provedor voltem no mesmo instante exato.
  v_delay_seconds := v_delay_seconds * (1 + v_jitter * 0.2);

  return p_now + make_interval(secs => v_delay_seconds);
end;
$function$
