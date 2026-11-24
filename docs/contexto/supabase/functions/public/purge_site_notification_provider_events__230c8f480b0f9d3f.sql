CREATE OR REPLACE FUNCTION public.purge_site_notification_provider_events(p_retention_days integer DEFAULT 180, p_batch_size integer DEFAULT 1000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_deleted integer;
begin
  if p_retention_days is null or p_retention_days not between 7 and 3650
    or p_batch_size is null or p_batch_size not between 1 and 5000 then
    raise exception using errcode = '22023', message = 'invalid_notification_event_purge_input';
  end if;

  -- Só expurga órfão que a reconciliação não consegue mais religar: órfão COM
  -- provider_message_id e mais antigo que a retenção ainda não teve chance de ser
  -- religado se ele é recente, mas depois da retenção ele já foi tentado em várias
  -- execuções do cron — manter outro critério faria a tabela crescer para sempre.
  with candidates as (
    select event.id
    from site_private.notification_provider_events event
    where event.delivery_id is null
      and event.received_at < now() - make_interval(days => p_retention_days)
    order by event.received_at, event.id
    limit p_batch_size
  )
  delete from site_private.notification_provider_events event using candidates
  where event.id = candidates.id;
  get diagnostics v_deleted = row_count;

  return jsonb_build_object('orphanEventsDeleted', v_deleted);
end;
$function$
