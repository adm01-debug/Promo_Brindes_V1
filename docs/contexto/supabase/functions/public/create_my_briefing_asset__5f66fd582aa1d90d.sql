CREATE OR REPLACE FUNCTION public.create_my_briefing_asset(p_original_name text, p_mime_type text, p_size_bytes integer, p_kind text DEFAULT 'reference'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_name text := btrim(pg_catalog.regexp_replace(coalesce(p_original_name, ''), '[[:cntrl:]/\\]+', ' ', 'g'));
  v_extension text;
  v_path text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if length(v_name) not between 1 and 160
    or coalesce(p_mime_type, '') not in ('image/png', 'image/jpeg', 'image/webp')
    or coalesce(p_size_bytes, 0) not between 1 and 10485760
    or coalesce(p_kind, '') not in ('logo', 'reference') then
    raise exception using errcode = '22023', message = 'invalid_briefing_asset';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 150922));
  if (select count(*) from site_private.customer_briefing_assets where customer_user_id = v_user_id) >= 10
    or coalesce((select sum(size_bytes) from site_private.customer_briefing_assets where customer_user_id = v_user_id), 0) + p_size_bytes > 52428800 then
    raise exception using errcode = 'P0001', message = 'briefing_asset_limit_reached';
  end if;

  v_extension := case p_mime_type
    when 'image/png' then 'png'
    when 'image/jpeg' then 'jpg'
    when 'image/webp' then 'webp'
  end;
  v_path := v_user_id::text || '/' || v_id::text || '.' || v_extension;

  insert into site_private.customer_briefing_assets (
    id, customer_user_id, kind, original_name, storage_path, mime_type, size_bytes
  ) values (
    v_id, v_user_id, p_kind, v_name, v_path, p_mime_type, p_size_bytes
  );

  return jsonb_build_object(
    'id', v_id, 'kind', p_kind, 'name', v_name, 'path', v_path,
    'mimeType', p_mime_type, 'sizeBytes', p_size_bytes,
    'expiresAt', now() + interval '30 days'
  );
end;
$function$
