CREATE OR REPLACE FUNCTION public.get_site_data_retention_candidates(p_batch_size integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select site_private.get_expired_site_data_candidates(p_batch_size);
$function$
