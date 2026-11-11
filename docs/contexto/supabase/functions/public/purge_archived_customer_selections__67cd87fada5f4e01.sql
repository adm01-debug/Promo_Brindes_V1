CREATE OR REPLACE FUNCTION public.purge_archived_customer_selections(p_batch_size integer DEFAULT 100)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_count integer;
begin
  if p_batch_size not between 1 and 500 then raise exception using errcode = '22023', message = 'invalid_batch_size'; end if;
  with old as (
    select id from site_private.customer_selections
    where archived_at < now() - interval '90 days'
    order by archived_at, id limit p_batch_size for update skip locked
  )
  delete from site_private.customer_selections selection
  using old where selection.id = old.id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
