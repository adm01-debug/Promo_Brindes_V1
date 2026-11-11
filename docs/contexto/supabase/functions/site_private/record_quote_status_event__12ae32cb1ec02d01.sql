CREATE OR REPLACE FUNCTION site_private.record_quote_status_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_title text;
begin
  if new.status = 'spam' or (tg_op = 'UPDATE' and new.status is not distinct from old.status) then
    return new;
  end if;

  v_title := case new.status
    when 'new' then 'Solicitação recebida'
    when 'triaged' then 'Briefing em análise'
    when 'in_progress' then 'Curadoria em andamento'
    when 'quoted' then 'Proposta disponível'
    when 'closed' then 'Solicitação encerrada'
  end;

  insert into site_private.quote_request_events (
    quote_request_id, event_type, status, title, audience, created_at
  ) values (
    new.id,
    case when tg_op = 'INSERT' then 'received' else 'status_changed' end,
    new.status,
    v_title,
    'customer',
    case when tg_op = 'INSERT' then new.created_at else now() end
  );
  return new;
end;
$function$
