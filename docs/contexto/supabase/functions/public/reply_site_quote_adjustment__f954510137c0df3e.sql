CREATE OR REPLACE FUNCTION public.reply_site_quote_adjustment(p_adjustment_id uuid, p_response text, p_status text DEFAULT 'resolved'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_response text := nullif(btrim(coalesce(p_response, '')), '');
  v_status text := nullif(btrim(coalesce(p_status, 'resolved')), '');
  v_adjustment site_private.quote_adjustment_requests%rowtype;
begin
  if p_adjustment_id is null then
    raise exception using errcode = '22023', message = 'adjustment_id_required';
  end if;
  if v_response is null then
    raise exception using errcode = '22023', message = 'response_required';
  end if;
  -- A linha do tempo aceita ate 500 caracteres (check de
  -- site_private.quote_request_events). Recusar aqui e o que impede o cliente de
  -- receber a resposta pela metade sem ninguem saber: um corte silencioso em
  -- left() escondia a condicao comercial no fim do texto. O formulario do
  -- back-office usa o mesmo limite.
  if length(v_response) > 500 then
    raise exception using errcode = '22023', message = 'response_too_long';
  end if;
  -- Espelha o check da tabela (20260910130000): new/triaged/resolved/closed.
  if v_status not in ('triaged', 'resolved', 'closed') then
    raise exception using errcode = '22023', message = 'invalid_adjustment_status';
  end if;

  select * into v_adjustment
  from site_private.quote_adjustment_requests adjustment
  where adjustment.id = p_adjustment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'adjustment_not_found';
  end if;

  -- A resposta do operador é registrada como trilha: a tabela de ajustes guarda só o
  -- pedido do cliente e o estado do atendimento, não o texto da resposta.
  update site_private.quote_adjustment_requests adjustment
  set status = v_status
  where adjustment.id = p_adjustment_id;

  -- F-05: o mesmo texto vira mensagem na linha do tempo do cliente. O título é fixo
  -- (não copia o nome do titular nem o texto do ajuste). O texto entra integral: a
  -- validação acima já garante o limite da coluna, então cliente e trilha interna
  -- recebem exatamente a mesma resposta.
  insert into site_private.quote_request_events (quote_request_id, event_type, title, description, audience)
  values (
    v_adjustment.quote_request_id, 'message',
    'Resposta da equipe ao seu ajuste', v_response, 'customer'
  );

  insert into site_private.commercial_audit_log (actor_user_id, actor_label, action, quote_request_id, detail)
  values (auth.uid(), v_operator.display_name, 'adjustment_replied', v_adjustment.quote_request_id,
    jsonb_build_object('adjustmentId', p_adjustment_id, 'status', v_status, 'response', v_response));

  return jsonb_build_object('id', p_adjustment_id, 'status', v_status);
end;
$function$
