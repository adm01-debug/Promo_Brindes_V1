CREATE OR REPLACE FUNCTION public.publish_site_quote_proposal(p_request_id uuid, p_title text, p_storage_path text, p_valid_until date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_path text := nullif(btrim(coalesce(p_storage_path, '')), '');
  v_request site_private.quote_requests%rowtype;
  v_next_version integer;
  v_proposal_id uuid;
begin
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;
  if v_title is null then
    raise exception using errcode = '22023', message = 'title_required';
  end if;
  if v_path is null then
    raise exception using errcode = '22023', message = 'storage_path_required';
  end if;
  -- A mesma regra vale no download (api/customer-proposals.ts): caminho invalido
  -- so apareceria no clique do cliente, depois do pedido ja anunciar a proposta.
  if not site_private.is_valid_proposal_storage_path(v_path) then
    raise exception using errcode = '22023', message = 'invalid_storage_path';
  end if;

  select * into v_request from site_private.quote_requests request where request.id = p_request_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'quote_request_not_found';
  end if;

  -- Uma proposta só faz sentido com o pedido em 'in_progress', que é o único estado
  -- com transição para 'quoted' na state machine.
  if v_request.status <> 'in_progress' then
    raise exception using errcode = '22023',
      message = format('proposal_requires_in_progress: status atual %s', v_request.status);
  end if;

  select coalesce(max(proposal.version), 0) + 1 into v_next_version
  from site_private.proposal_documents proposal where proposal.quote_request_id = p_request_id;

  -- A versão anterior deixa de ser a corrente sem perder o histórico (F-23 exibe todas).
  update site_private.proposal_documents proposal
  set superseded_at = now()
  where proposal.quote_request_id = p_request_id and proposal.superseded_at is null;

  insert into site_private.proposal_documents (
    quote_request_id, version, title, storage_bucket, storage_path, valid_until, published_at
  ) values (
    p_request_id, v_next_version, v_title, 'customer-proposals', v_path, p_valid_until, now()
  )
  returning id into v_proposal_id;

  -- O trigger quote_requests_record_customer_event já publica "Proposta disponível"
  -- para o cliente quando o status vira 'quoted'. Este registro fica só na trilha
  -- interna (audience internal) para guardar a versão, sem duplicar no portal.
  -- A descrição NÃO copia v_title: `erase_customer_data` anonimiza
  -- proposal_documents (onde o título vive) mas não quote_request_events, então um
  -- título com o nome do titular sobreviveria ao pedido de exclusão.
  insert into site_private.quote_request_events (quote_request_id, event_type, title, description, audience)
  values (
    p_request_id, 'proposal_published',
    format('Proposta v%s publicada', v_next_version),
    format('Versao %s publicada pelo comercial.', v_next_version), 'internal'
  );

  update site_private.quote_requests request
  set status = 'quoted'
  where request.id = p_request_id and request.status = 'in_progress';

  if not found then
    raise exception using errcode = '40001', message = 'quote_request_changed_concurrently';
  end if;

  insert into site_private.commercial_audit_log (actor_user_id, actor_label, action, quote_request_id, detail)
  values (auth.uid(), v_operator.display_name, 'proposal_published', p_request_id,
    jsonb_build_object('proposalId', v_proposal_id, 'version', v_next_version, 'storagePath', v_path));

  return jsonb_build_object(
    'proposalId', v_proposal_id,
    'version', v_next_version,
    'status', 'quoted'
  );
end;
$function$
