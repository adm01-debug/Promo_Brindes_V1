CREATE OR REPLACE FUNCTION public.export_my_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_email text := site_private.current_titular_verified_email();
  v_display_name text;
  v_company text;
  v_quotes jsonb;
  v_selections jsonb;
  v_favorites jsonb;
  v_contacts jsonb;
  v_adjustments jsonb;
  v_rights jsonb;
begin
  insert into site_private.subject_right_requests (subject_user_id, right_type)
  values (v_user_id, 'export');

  select profile.display_name, profile.company
    into v_display_name, v_company
  from site_private.customer_profiles profile
  where profile.user_id = v_user_id;

  select coalesce(jsonb_agg(payload order by created_at desc), '[]'::jsonb) into v_quotes
  from (
    select request.created_at, jsonb_build_object(
      'id', request.id, 'protocol', request.protocol,
      'status', request.status, 'createdAt', request.created_at,
      'submittedAt', request.client_submitted_at, 'company', request.company,
      'contactName', request.contact_name, 'email', request.email, 'phone', request.phone,
      'city', request.city, 'desiredDeadline', request.desired_deadline, 'notes', request.notes,
      'retentionUntil', request.retention_until,
      'campaign', request.request_metadata -> 'campaign',
      'briefing', request.request_metadata -> 'briefing',
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'key', item.item_key, 'productId', item.source_product_id, 'slug', item.product_slug,
          'name', item.product_name_snapshot, 'sku', item.sku_snapshot,
          'imageUrl', item.image_url_snapshot, 'quantity', item.quantity,
          'minQuantity', item.minimum_quantity_snapshot, 'variantId', item.variant_id_snapshot,
          'colorName', item.color_name_snapshot, 'colorHex', item.color_hex_snapshot,
          'decisionGroup', item.decision_group_snapshot, 'kitGroupId', item.kit_group_id,
          'kitName', item.kit_name_snapshot, 'kitQuantity', item.kit_quantity_snapshot,
          'unitsPerKit', item.units_per_kit_snapshot
        ) order by item.position)
        from site_private.quote_items item
        where item.quote_request_id = request.id
      ), '[]'::jsonb),
      'events', coalesce((
        select jsonb_agg(jsonb_build_object(
          'type', event.event_type, 'status', event.status, 'title', event.title,
          -- O texto da mensagem e dado pessoal vinculado ao titular (F-05): o
          -- botao "Baixar meus dados" precisa entregar o que a linha do tempo
          -- mostra, nao so o titulo generico. Eventos internos continuam fora
          -- pelo filtro de audiencia abaixo.
          'description', event.description,
          'createdAt', event.created_at
        ) order by event.created_at desc)
        from site_private.quote_request_events event
        where event.quote_request_id = request.id and event.audience = 'customer'
      ), '[]'::jsonb),
      'proposals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'version', proposal.version, 'title', proposal.title,
          'validUntil', proposal.valid_until, 'publishedAt', proposal.published_at,
          'isCurrent', proposal.superseded_at is null
        ) order by proposal.version desc)
        from site_private.proposal_documents proposal
        where proposal.quote_request_id = request.id and proposal.published_at is not null
      ), '[]'::jsonb)
    ) as payload
    from site_private.quote_requests request
    where request.customer_user_id = v_user_id and request.status <> 'spam'
  ) quote_payload;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', selection.id, 'title', selection.title, 'references', selection.product_references,
      'campaign', selection.campaign, 'version', selection.version,
      'archivedAt', selection.archived_at, 'createdAt', selection.created_at,
      'updatedAt', selection.updated_at
    ) order by selection.updated_at desc), '[]'::jsonb)
  into v_selections
  from site_private.customer_selections selection
  where selection.customer_user_id = v_user_id;

  select coalesce(jsonb_agg(occasion_id), '[]'::jsonb)
  into v_favorites
  from site_private.customer_occasion_favorites favorite
  where favorite.customer_user_id = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', contact.id, 'clientRequestId', contact.client_request_id,
      'name', contact.contact_name, 'email', contact.email, 'phone', contact.phone,
      'message', contact.message, 'pageUrl', contact.page_url, 'source', contact.source
    ) order by contact.created_at desc), '[]'::jsonb)
  into v_contacts
  from site_private.contact_requests contact
  where contact.email = v_email and contact.status <> 'spam';

  select coalesce(jsonb_agg(jsonb_build_object(
      'requestId', adjustment.quote_request_id, 'clientRequestId', adjustment.client_request_id,
      'message', adjustment.message, 'createdAt', adjustment.created_at, 'status', adjustment.status
    ) order by adjustment.created_at desc), '[]'::jsonb)
  into v_adjustments
  from site_private.quote_adjustment_requests adjustment
  where adjustment.requested_by = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'rightType', right_request.right_type, 'requestedAt', right_request.requested_at
    ) order by right_request.requested_at desc), '[]'::jsonb)
  into v_rights
  from site_private.subject_right_requests right_request
  where right_request.subject_user_id = v_user_id;

  return jsonb_build_object(
    'exportedAt', now(), 'email', v_email,
    'profile', jsonb_build_object('displayName', v_display_name, 'company', v_company),
    'quotes', v_quotes, 'selections', v_selections, 'favorites', v_favorites,
    'contacts', v_contacts, 'adjustments', v_adjustments, 'rights', v_rights
  );
end;
$function$
