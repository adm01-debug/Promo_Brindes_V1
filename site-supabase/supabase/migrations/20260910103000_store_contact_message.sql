-- Campo de intenção para a conversa inicial.
-- Aplicar exclusivamente no Supabase isolado do site: xlzmclcjdncjfdrjxclt.
-- Nunca aplicar no banco canônico de catálogo: doufsxqlfjyuvxuezpln.

alter table site_private.contact_requests
  add column if not exists message text check (message is null or length(message) <= 800);

create or replace function public.create_site_contact_request(p_payload jsonb, p_request_meta jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_existing_hash text;
  v_request_hash text := p_request_meta ->> 'requestHash';
  v_client_request_id text := p_payload ->> 'clientRequestId';
begin
  if p_payload ->> 'source' <> 'site-promo-brindes-contact'
    or coalesce((p_payload #>> '{consent,accepted}')::boolean, false) is not true
    or p_payload #>> '{consent,noticeVersion}' <> '2026-09-08'
    or coalesce(v_client_request_id, '') !~ '^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,99}$'
    or coalesce(v_request_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_request_meta ->> 'identifierHash', '') !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_contact_payload';
  end if;

  select id, request_hash
  into v_request_id, v_existing_hash
  from site_private.contact_requests
  where client_request_id = v_client_request_id;

  if v_request_id is not null then
    if v_existing_hash <> v_request_hash then
      raise exception using errcode = 'P0001', message = 'client_request_id_conflict';
    end if;
    return jsonb_build_object('requestId', v_request_id, 'duplicate', true);
  end if;

  perform site_private.consume_rate_limit('contact', p_request_meta ->> 'identifierHash', 8, interval '15 minutes');

  insert into site_private.contact_requests (
    client_request_id, request_hash, source, contact_name, email, phone, message,
    page_url, client_submitted_at, request_metadata
  ) values (
    v_client_request_id,
    v_request_hash,
    p_payload ->> 'source',
    p_payload #>> '{contact,name}',
    lower(p_payload #>> '{contact,email}'),
    nullif(p_payload #>> '{contact,phone}', ''),
    nullif(p_payload #>> '{contact,message}', ''),
    nullif(p_payload ->> 'pageUrl', ''),
    (p_payload ->> 'submittedAt')::timestamptz,
    p_request_meta - 'identifierHash' - 'requestHash'
  )
  on conflict (client_request_id) do nothing
  returning id into v_request_id;

  if v_request_id is null then
    select id, request_hash into v_request_id, v_existing_hash
    from site_private.contact_requests where client_request_id = v_client_request_id;
    if v_existing_hash <> v_request_hash then
      raise exception using errcode = 'P0001', message = 'client_request_id_conflict';
    end if;
    return jsonb_build_object('requestId', v_request_id, 'duplicate', true);
  end if;

  insert into site_private.consent_receipts (
    request_kind, contact_request_id, accepted, notice_version, client_accepted_at
  ) values (
    'contact', v_request_id, true, p_payload #>> '{consent,noticeVersion}',
    (p_payload #>> '{consent,acceptedAt}')::timestamptz
  );

  return jsonb_build_object('requestId', v_request_id, 'duplicate', false);
end;
$$;

revoke all on function public.create_site_contact_request(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_site_contact_request(jsonb, jsonb) to service_role;

comment on column site_private.contact_requests.message is
  'Contexto opcional da conversa, limitado a 800 caracteres e retido no banco isolado do site.';
