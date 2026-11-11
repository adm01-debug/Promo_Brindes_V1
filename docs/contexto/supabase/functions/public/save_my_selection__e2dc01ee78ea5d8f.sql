CREATE OR REPLACE FUNCTION public.save_my_selection(p_title text, p_references jsonb, p_campaign jsonb DEFAULT NULL::jsonb, p_id uuid DEFAULT NULL::uuid, p_expected_version integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_title text := pg_catalog.btrim(p_title);
  v_references jsonb;
  v_selection site_private.customer_selections%rowtype;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if v_title is null or pg_catalog.length(v_title) not between 1 and 100
    or site_private.has_unsafe_display_controls(v_title)
    or (p_campaign is not null and (pg_catalog.jsonb_typeof(p_campaign) <> 'object' or pg_catalog.octet_length(p_campaign::text) > 2048)) then
    raise exception using errcode = '22023', message = 'invalid_selection_payload';
  end if;
  begin
    v_references := site_private.normalize_selection_references(p_references);
  exception when sqlstate '22023' then
    if sqlerrm = 'duplicate_selection_reference' then
      raise exception using errcode = '22023', message = 'duplicate_selection_reference';
    elsif sqlerrm = 'invalid_kit_reference_set' then
      raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
    end if;
    raise exception using errcode = '22023', message = 'invalid_selection_reference';
  end;

  if p_id is null then
    if p_expected_version is not null then raise exception using errcode = '22023', message = 'invalid_selection_version'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 70922));
    if (select pg_catalog.count(*) from site_private.customer_selections where customer_user_id = v_user_id) >= 30 then
      raise exception using errcode = 'P0001', message = 'selection_limit_reached';
    end if;
    insert into site_private.customer_selections (customer_user_id, title, product_references, campaign)
    values (v_user_id, v_title, v_references, p_campaign) returning * into v_selection;
  else
    if p_expected_version is null or p_expected_version < 1 then raise exception using errcode = '22023', message = 'invalid_selection_version'; end if;
    update site_private.customer_selections selection
    set title = v_title, product_references = v_references, campaign = p_campaign,
        version = selection.version + 1, updated_at = now()
    where selection.id = p_id and selection.customer_user_id = v_user_id
      and selection.version = p_expected_version and selection.archived_at is null
    returning * into v_selection;
    if not found then raise exception using errcode = 'P0001', message = 'selection_version_conflict'; end if;
  end if;
  return pg_catalog.jsonb_build_object('id', v_selection.id, 'version', v_selection.version, 'updatedAt', v_selection.updated_at);
end;
$function$
