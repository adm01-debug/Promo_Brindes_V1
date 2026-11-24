CREATE OR REPLACE FUNCTION public.get_site_quote_request(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operator site_private.commercial_operators := site_private.assert_site_operator();
  v_request site_private.quote_requests%rowtype;
  v_items jsonb;
  v_events jsonb;
  v_proposals jsonb;
  v_adjustments jsonb;
  v_allowed_statuses text[];
  v_audit jsonb;
begin
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;

  select * into v_request from site_private.quote_requests request where request.id = p_request_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'quote_request_not_found';
  end if;

  perform site_private.log_pii_read('quote_requests', null, 1, v_request.id::text, 'operador');

  select coalesce(jsonb_agg(jsonb_build_object(
    'key', item.item_key, 'productId', item.source_product_id, 'slug', item.product_slug,
    'name', item.product_name_snapshot, 'sku', item.sku_snapshot, 'imageUrl', item.image_url_snapshot,
    'quantity', item.quantity, 'minQuantity', item.minimum_quantity_snapshot,
    'variantId', item.variant_id_snapshot, 'colorName', item.color_name_snapshot,
    'colorHex', item.color_hex_snapshot, 'decisionGroup', item.decision_group_snapshot
  ) order by item.position), '[]'::jsonb) into v_items
  from site_private.quote_items item where item.quote_request_id = v_request.id;

  -- Diferente de get_my_quote_request, o operador vê também a audiência interna.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', event.id, 'type', event.event_type, 'status', event.status, 'title', event.title,
    'description', event.description, 'audience', event.audience, 'createdAt', event.created_at
  ) order by event.sequence desc), '[]'::jsonb) into v_events
  from site_private.quote_request_events event where event.quote_request_id = v_request.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', proposal.id, 'version', proposal.version, 'title', proposal.title,
    'validUntil', proposal.valid_until, 'publishedAt', proposal.published_at,
    'supersededAt', proposal.superseded_at, 'isCurrent', proposal.superseded_at is null
  ) order by proposal.version desc), '[]'::jsonb) into v_proposals
  from site_private.proposal_documents proposal where proposal.quote_request_id = v_request.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', adjustment.id, 'status', adjustment.status, 'message', adjustment.message,
    'createdAt', adjustment.created_at, 'updatedAt', adjustment.updated_at
  ) order by adjustment.created_at desc), '[]'::jsonb) into v_adjustments
  from site_private.quote_adjustment_requests adjustment
  where adjustment.quote_request_id = v_request.id;

  -- 'quoted' fica fora das opções avulsas: esse estágio promete uma proposta no portal
  -- e só `publish_site_quote_proposal` pode produzi-la (a RPC de status recusa).
  select coalesce(array_agg(transition.to_status order by transition.to_status), '{}'::text[])
  into v_allowed_statuses
  from site_private.status_transitions transition
  where transition.entity = 'quote_requests'
    and transition.from_status = v_request.status
    and transition.to_status <> 'quoted';

  select coalesce(jsonb_agg(jsonb_build_object(
    'action', log.action, 'actorLabel', log.actor_label, 'detail', log.detail, 'createdAt', log.created_at
  ) order by log.created_at desc), '[]'::jsonb) into v_audit
  from site_private.commercial_audit_log log where log.quote_request_id = v_request.id;

  return jsonb_build_object(
    'operator', v_operator.display_name,
    'id', v_request.id,
    'protocol', v_request.protocol,
    'status', v_request.status,
    'allowedStatuses', to_jsonb(v_allowed_statuses),
    'createdAt', v_request.created_at,
    'submittedAt', v_request.client_submitted_at,
    'contactName', v_request.contact_name,
    'company', v_request.company,
    'email', v_request.email,
    'phone', v_request.phone,
    'city', v_request.city,
    'desiredDeadline', v_request.desired_deadline,
    'notes', v_request.notes,
    'pageUrl', v_request.page_url,
    'isClaimed', v_request.customer_user_id is not null,
    'campaign', v_request.request_metadata -> 'campaign',
    'briefing', v_request.request_metadata -> 'briefing',
    'items', v_items,
    'events', v_events,
    'proposals', v_proposals,
    'adjustments', v_adjustments,
    'audit', v_audit
  );
end;
$function$
