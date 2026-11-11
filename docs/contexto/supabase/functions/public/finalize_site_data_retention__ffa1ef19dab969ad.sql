CREATE OR REPLACE FUNCTION public.finalize_site_data_retention(p_quote_ids uuid[], p_storage_paths text[], p_batch_size integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select site_private.finalize_expired_site_data(p_quote_ids, p_storage_paths, p_batch_size);
$function$
