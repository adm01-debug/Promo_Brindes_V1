CREATE OR REPLACE FUNCTION public.update_site_quote_status(p_request_id uuid, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_target text := nullif(btrim(coalesce(p_status, '')), '');
  v_previous text;
begin
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;
  if v_target is null then
    raise exception using errcode = '22023', message = 'status_required';
  end if;

  select request.status into v_previous
  from site_private.quote_requests request where request.id = p_request_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'quote_request_not_found';
  end if;

  -- Reaproveita a state machine: o trigger BEFORE UPDATE rejeita com 22023, mas aqui
  -- antecipamos o erro para devolver mensagem específica e não deixar o cliente
  -- adivinhar quais transições existem.
  if v_target <> v_previous and not exists (
    select 1 from site_private.status_transitions transition
    where transition.entity = 'quote_requests'
      and transition.from_status = v_previous
      and transition.to_status = v_target
  ) then
    raise exception using errcode = '22023',
      message = format('invalid_status_transition: %s -> %s', v_previous, v_target);
  end if;

  -- 'quoted' promete uma proposta no portal. Só `publish_site_quote_proposal` pode
  -- levar o pedido até lá; senão o cliente veria o evento "Proposta disponível" sem
  -- nenhuma versão para abrir.
  if v_target = 'quoted' then
    raise exception using errcode = '22023', message = 'quoted_requires_proposal_publication';
  end if;

  update site_private.quote_requests request
  set status = v_target
  where request.id = p_request_id and request.status = v_previous;

  if not found then
    raise exception using errcode = '40001', message = 'quote_request_changed_concurrently';
  end if;

  if v_target <> v_previous then
    insert into site_private.commercial_audit_log (actor_user_id, actor_label, action, quote_request_id, detail)
    values (auth.uid(), v_operator.display_name, 'status_changed', p_request_id,
      jsonb_build_object('from', v_previous, 'to', v_target));
  end if;

  return jsonb_build_object('id', p_request_id, 'previousStatus', v_previous, 'status', v_target);
end;
$function$
