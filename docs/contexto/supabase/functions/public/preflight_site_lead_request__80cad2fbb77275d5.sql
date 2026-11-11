CREATE OR REPLACE FUNCTION public.preflight_site_lead_request(p_request_kind text, p_identifier_hash text, p_client_request_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if p_request_kind not in ('quote', 'contact')
    or coalesce(p_identifier_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_client_request_id, '') !~ '^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,99}$' then
    raise exception using errcode = '22023', message = 'invalid_lead_preflight_input';
  end if;

  -- Repetições idempotentes também consomem o bucket. Ignorá-las permitiria
  -- repetir um client_request_id conhecido e consultar o catálogo sem limite.
  perform site_private.consume_rate_limit(
    p_request_kind || '_preflight',
    p_identifier_hash,
    case when p_request_kind = 'quote' then 8 else 12 end,
    interval '15 minutes'
  );
  return true;
end;
$function$
