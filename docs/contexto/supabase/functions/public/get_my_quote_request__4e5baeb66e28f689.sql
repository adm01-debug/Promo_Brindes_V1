CREATE OR REPLACE FUNCTION public.get_my_quote_request(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_request site_private.quote_requests%rowtype;
  v_items jsonb;
  v_events jsonb;
  v_proposals jsonb;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select * into v_request from site_private.quote_requests request
  where request.id = p_request_id and request.customer_user_id = v_user_id and request.status <> 'spam';
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'key', item.item_key, 'productId', item.source_product_id, 'slug', item.product_slug,
    'name', item.product_name_snapshot, 'sku', item.sku_snapshot, 'imageUrl', item.image_url_snapshot,
    'quantity', item.quantity, 'minQuantity', item.minimum_quantity_snapshot, 'variantId', item.variant_id_snapshot,
    'colorName', item.color_name_snapshot, 'colorHex', item.color_hex_snapshot,
    'decisionGroup', item.decision_group_snapshot, 'kitGroupId', item.kit_group_id,
    'kitName', item.kit_name_snapshot, 'kitQuantity', item.kit_quantity_snapshot,
    'unitsPerKit', item.units_per_kit_snapshot
  )) order by item.position), '[]'::jsonb) into v_items
  from site_private.quote_items item where item.quote_request_id = v_request.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', event.id, 'type', event.event_type, 'status', event.status, 'title', event.title,
    'description', event.description, 'createdAt', event.created_at
  ) order by event.sequence desc), '[]'::jsonb) into v_events
  from site_private.quote_request_events event where event.quote_request_id = v_request.id and event.audience = 'customer';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', proposal.id, 'version', proposal.version, 'title', proposal.title, 'validUntil', proposal.valid_until,
    'publishedAt', proposal.published_at, 'isCurrent', proposal.superseded_at is null
  ) order by proposal.version desc), '[]'::jsonb) into v_proposals
  from site_private.proposal_documents proposal where proposal.quote_request_id = v_request.id and proposal.published_at is not null;

  return jsonb_build_object(
    'id', v_request.id, 'protocol', v_request.protocol, 'status', v_request.status,
    'createdAt', v_request.created_at, 'submittedAt', v_request.client_submitted_at, 'company', v_request.company,
    'contactName', v_request.contact_name, 'email', v_request.email, 'phone', v_request.phone, 'city', v_request.city,
    'desiredDeadline', v_request.desired_deadline, 'notes', v_request.notes,
    'campaign', v_request.request_metadata -> 'campaign', 'briefing', v_request.request_metadata -> 'briefing',
    'items', v_items, 'events', v_events, 'proposals', v_proposals
  );
end;
$function$
