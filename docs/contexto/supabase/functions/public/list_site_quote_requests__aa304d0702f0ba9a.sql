CREATE OR REPLACE FUNCTION public.list_site_quote_requests(p_status text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  -- A Area do Cliente exibe o protocolo com '#' (CustomerQuotePage) e o operador
  -- cola exatamente o que o cliente viu. O prefixo so sai da comparacao com o
  -- PROTOCOLO: a busca textual continua vendo o termo literal, senao '#Marca'
  -- passaria a casar com 'Marca' e um '#' sozinho desligaria o filtro.
  v_protocol text := nullif(btrim(ltrim(btrim(coalesce(p_search, '')), '#')), '');
  v_status text := nullif(btrim(coalesce(p_status, '')), '');
  v_rows jsonb;
  v_total integer;
begin
  if v_status is not null and v_status not in ('new', 'triaged', 'in_progress', 'quoted', 'closed', 'spam') then
    raise exception using errcode = '22023', message = 'invalid_status_filter';
  end if;

  select count(*) into v_total
  from site_private.quote_requests request
  where (v_status is null or request.status = v_status)
    and (
      v_search is null
      or request.id::text = v_search
      or request.protocol = upper(v_protocol)
      or request.company ilike '%' || v_search || '%'
      or request.contact_name ilike '%' || v_search || '%'
      or request.email ilike '%' || v_search || '%'
      or request.phone ilike '%' || v_search || '%'
    );

  -- jsonb_build_object em vez de row_to_json: o contrato da UI usa camelCase, e
  -- row_to_json preservaria o snake_case dos aliases, entregando itemCount nulo.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', page.id,
    'protocol', page.protocol,
    'status', page.status,
    'contactName', page.contact_name,
    'company', page.company,
    'email', page.email,
    'phone', page.phone,
    'city', page.city,
    'desiredDeadline', page.desired_deadline,
    'createdAt', page.created_at,
    'submittedAt', page.client_submitted_at,
    'isClaimed', page.is_claimed,
    'itemCount', page.item_count,
    'pendingAdjustments', page.pending_adjustments,
    'currentProposalVersion', page.current_proposal_version
  ) order by page.created_at desc), '[]'::jsonb) into v_rows
  from (
    select
      request.id,
      request.protocol,
      request.status,
      request.contact_name,
      request.company,
      request.email,
      request.phone,
      request.city,
      request.desired_deadline,
      request.created_at,
      request.client_submitted_at,
      request.customer_user_id is not null as is_claimed,
      (
        select count(*) from site_private.quote_items item
        where item.quote_request_id = request.id
      ) as item_count,
      (
        select count(*) from site_private.quote_adjustment_requests adjustment
        where adjustment.quote_request_id = request.id and adjustment.status in ('new', 'triaged')
      ) as pending_adjustments,
      (
        select max(proposal.version) from site_private.proposal_documents proposal
        where proposal.quote_request_id = request.id and proposal.published_at is not null
      ) as current_proposal_version
    from site_private.quote_requests request
    where (v_status is null or request.status = v_status)
      and (
        v_search is null
        or request.id::text = v_search
        or request.protocol = upper(v_protocol)
        or request.company ilike '%' || v_search || '%'
        or request.contact_name ilike '%' || v_search || '%'
        or request.email ilike '%' || v_search || '%'
        or request.phone ilike '%' || v_search || '%'
      )
    order by request.created_at desc
    limit v_limit offset v_offset
  ) page;

  return jsonb_build_object(
    'operator', v_operator.display_name,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset,
    'requests', v_rows
  );
end;
$function$
