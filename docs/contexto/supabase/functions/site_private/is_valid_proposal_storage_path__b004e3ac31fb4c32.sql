CREATE OR REPLACE FUNCTION site_private.is_valid_proposal_storage_path(p_path text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when p_path is null or btrim(p_path) = '' then false
    when length(p_path) > 500 then false
    when p_path like '/%' then false
    when position(chr(92) in p_path) > 0 then false
    -- O download recusa caracteres de controle antes de assinar a URL; aceitar na
    -- publicacao produziria uma proposta que o cliente nao consegue baixar.
    when p_path ~ '[\x01-\x1f\x7f]' then false
    when p_path !~* '\.pdf$' then false
    else not exists (
      select 1 from unnest(string_to_array(p_path, '/')) as segment
      where segment = '' or segment = '.' or segment = '..'
    )
  end;
$function$
