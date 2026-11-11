CREATE OR REPLACE FUNCTION public.request_my_quote_adjustment(p_request_id uuid, p_message text, p_client_request_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_adjustment_id uuid;
  v_created_at timestamptz;
  v_message text := left(trim(coalesce(p_message, '')), 800);
  v_client_request_id text := left(trim(coalesce(p_client_request_id, '')), 100);
  v_identifier_hash text;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  -- Serializa as decisões de idempotência/quota/limite do mesmo pedido. Sem o
  -- lock, duas transações poderiam observar apenas duas pendências e ambas
  -- inserir a quarta linha.
  perform 1 from site_private.quote_requests request
  where request.id = p_request_id and request.customer_user_id = v_user_id and request.status <> 'spam'
  for update;
  if p_request_id is null or not found then
    raise exception using errcode = '42501', message = 'quote_not_found';
  end if;
  if length(v_message) < 2 then raise exception using errcode = '22023', message = 'adjustment_message_required'; end if;
  if v_client_request_id !~ '^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,99}$' then
    raise exception using errcode = '22023', message = 'invalid_client_request_id';
  end if;

  select adjustment.id, adjustment.created_at into v_adjustment_id, v_created_at
  from site_private.quote_adjustment_requests adjustment
  where adjustment.quote_request_id = p_request_id
    and adjustment.requested_by = v_user_id
    and adjustment.client_request_id = v_client_request_id;
  if found then return jsonb_build_object('id', v_adjustment_id, 'createdAt', v_created_at); end if;

  if (select count(*) from site_private.quote_adjustment_requests adjustment
      where adjustment.quote_request_id = p_request_id and adjustment.requested_by = v_user_id
        and adjustment.status in ('new', 'triaged')) >= 3 then
    raise exception using errcode = 'P0001', message = 'too_many_pending_adjustments';
  end if;
  v_identifier_hash := encode(sha256(convert_to(v_user_id::text || ':' || p_request_id::text, 'UTF8')), 'hex');
  perform site_private.consume_rate_limit('adjustment', v_identifier_hash, 5, interval '1 hour');

  insert into site_private.quote_adjustment_requests (quote_request_id, requested_by, client_request_id, message)
  values (p_request_id, v_user_id, v_client_request_id, v_message)
  returning id, created_at into v_adjustment_id, v_created_at;

  insert into site_private.quote_request_events (quote_request_id, event_type, title, description, audience)
  values
    (p_request_id, 'adjustment_requested', 'Pedido de ajuste recebido', v_adjustment_id::text, 'internal'),
    (p_request_id, 'adjustment_requested', 'Pedido de ajuste enviado', 'Nosso time de especialistas vai considerar seu comentário na próxima atualização.', 'customer');
  return jsonb_build_object('id', v_adjustment_id, 'createdAt', v_created_at);
end;
$function$
