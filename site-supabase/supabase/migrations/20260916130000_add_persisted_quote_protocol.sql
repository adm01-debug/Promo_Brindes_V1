-- Etapa 19 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md).
-- Migration aditiva, exclusiva de xlzmclcjdncjfdrjxclt.
--
-- O protocolo mostrado ao cliente era upper(left(id::text, 8)) — 32 bits de um UUID v4
-- (checado via `select proname from pg_proc where prosrc ilike '%upper(left(%'` no
-- banco local: 4 funções usavam essa expressão — claim_site_notification_deliveries,
-- claim_site_quote_notification, get_my_quote_request, get_my_quote_requests). Pelo
-- paradoxo do aniversário, a chance de colisão passa de 50% por volta de ~77 mil
-- pedidos, e o valor não é gerado por sequência nem tem dígito verificador.
--
-- Protocolo novo: PB<AA><NNNNNN><D> — prefixo fixo, ano de 2 dígitos, sequência de 6
-- dígitos (site_private.quote_protocol_seq, dedicada, não reaproveita nenhuma outra) e
-- 1 dígito verificador mod 11 (mesmo algoritmo de CPF/CNPJ/boleto — bem entendido e
-- fácil de auditar visualmente). Garantidamente único (unique constraint), gerado uma
-- única vez no insert (trigger before insert), nunca recalculado depois.

create sequence if not exists site_private.quote_protocol_seq;
revoke all on sequence site_private.quote_protocol_seq from public, anon, authenticated;
grant usage on sequence site_private.quote_protocol_seq to service_role;

create or replace function site_private.mod11_check_digit(p_digits text)
returns text
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_sum integer := 0;
  v_weight integer := 2;
  v_digit integer;
  v_remainder integer;
begin
  if p_digits is null or p_digits !~ '^[0-9]+$' then
    raise exception using errcode = '22023', message = 'invalid_mod11_input';
  end if;
  for i in reverse length(p_digits)..1 loop
    v_digit := substring(p_digits from i for 1)::integer;
    v_sum := v_sum + v_digit * v_weight;
    v_weight := case when v_weight = 9 then 2 else v_weight + 1 end;
  end loop;
  v_remainder := v_sum % 11;
  return case when v_remainder < 2 then '0' else (11 - v_remainder)::text end;
end;
$$;

comment on function site_private.mod11_check_digit(text) is
  'Dígito verificador mod 11 clássico (mesmo algoritmo de CPF/CNPJ/boleto) sobre uma string só de dígitos. Usado para o protocolo persistido do pedido (Etapa 19).';

revoke all on function site_private.mod11_check_digit(text) from public, anon, authenticated;
grant execute on function site_private.mod11_check_digit(text) to service_role;

alter table site_private.quote_requests add column if not exists protocol text;

create or replace function site_private.assign_quote_protocol()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_base text;
begin
  if new.protocol is not null then
    return new;
  end if;
  v_base := to_char(coalesce(new.created_at, now()), 'YY') || lpad(nextval('site_private.quote_protocol_seq')::text, 6, '0');
  new.protocol := 'PB' || v_base || site_private.mod11_check_digit(v_base);
  return new;
end;
$$;

drop trigger if exists quote_requests_assign_protocol on site_private.quote_requests;
create trigger quote_requests_assign_protocol
  before insert on site_private.quote_requests
  for each row execute function site_private.assign_quote_protocol();

comment on trigger quote_requests_assign_protocol on site_private.quote_requests is
  'Etapa 19: gera o protocolo uma única vez no insert. Nunca recalculado num update — o trigger só age quando protocol ainda é null.';

-- Backfill: linhas existentes (se houver, em ambiente já em produção) recebem um
-- protocolo novo via a mesma sequência, na ordem cronológica original. Idempotente:
-- só afeta linhas com protocol ainda null.
do $$
declare
  r record;
  v_base text;
begin
  for r in select id, created_at from site_private.quote_requests where protocol is null order by created_at loop
    v_base := to_char(r.created_at, 'YY') || lpad(nextval('site_private.quote_protocol_seq')::text, 6, '0');
    update site_private.quote_requests
    set protocol = 'PB' || v_base || site_private.mod11_check_digit(v_base)
    where id = r.id;
  end loop;
end;
$$;

alter table site_private.quote_requests alter column protocol set not null;
alter table site_private.quote_requests
  add constraint quote_requests_protocol_key unique (protocol);
alter table site_private.quote_requests
  add constraint quote_requests_protocol_format_check check (protocol ~ '^PB[0-9]{9}$');

comment on column site_private.quote_requests.protocol is
  'Etapa 19: protocolo público persistido (PB + ano 2 dígitos + sequência 6 dígitos + dígito verificador mod 11). Substitui upper(left(id::text,8)), que não tinha garantia de unicidade nem verificação.';

-- === Atualiza as 4 funções que expunham o protocolo derivado do UUID ================

create or replace function public.get_my_quote_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'key', item.item_key, 'productId', item.source_product_id, 'slug', item.product_slug,
    'name', item.product_name_snapshot, 'sku', item.sku_snapshot, 'imageUrl', item.image_url_snapshot,
    'quantity', item.quantity, 'minQuantity', item.minimum_quantity_snapshot, 'variantId', item.variant_id_snapshot,
    'colorName', item.color_name_snapshot, 'colorHex', item.color_hex_snapshot,
    'decisionGroup', item.decision_group_snapshot
  ) order by item.position), '[]'::jsonb) into v_items
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
$$;

revoke all on function public.get_my_quote_request(uuid) from public, anon;
grant execute on function public.get_my_quote_request(uuid) to authenticated, service_role;

create or replace function public.get_my_quote_requests(
  p_limit integer default 20,
  p_offset integer default 0,
  p_status text default null,
  p_search text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_offset integer := least(greatest(coalesce(p_offset, 0), 0), 10000);
  v_search text := lower(left(trim(coalesce(p_search, '')), 80));
  v_status text := nullif(trim(coalesce(p_status, '')), '');
  v_total integer;
  v_items jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if v_status is not null and v_status not in ('new', 'triaged', 'in_progress', 'quoted', 'closed') then
    raise exception using errcode = '22023', message = 'invalid_status_filter';
  end if;

  select count(*) into v_total
  from site_private.quote_requests request
  where request.customer_user_id = v_user_id
    and request.status <> 'spam'
    and (v_status is null or request.status = v_status)
    and (
      v_search = ''
      or position(v_search in lower(request.protocol)) > 0
      or position(v_search in lower(request.id::text)) > 0
      or position(v_search in lower(request.company)) > 0
      or position(v_search in lower(coalesce(request.request_metadata #>> '{briefing,actionName}', ''))) > 0
      or exists (
        select 1 from site_private.quote_items item
        where item.quote_request_id = request.id
          and position(v_search in lower(item.product_name_snapshot || ' ' || item.sku_snapshot)) > 0
      )
    );

  select coalesce(jsonb_agg(result.payload order by result.created_at desc), '[]'::jsonb)
    into v_items
  from (
    select request.created_at, jsonb_build_object(
      'id', request.id,
      'protocol', request.protocol,
      'status', request.status,
      'company', request.company,
      'actionName', nullif(request.request_metadata #>> '{briefing,actionName}', ''),
      'createdAt', request.created_at,
      'lastMovementAt', coalesce((
        select max(event.created_at)
        from site_private.quote_request_events event
        where event.quote_request_id = request.id and event.audience = 'customer'
      ), request.created_at),
      'desiredDeadline', request.desired_deadline,
      'itemCount', (select count(*) from site_private.quote_items item where item.quote_request_id = request.id),
      'totalUnits', coalesce((select sum(item.quantity) from site_private.quote_items item where item.quote_request_id = request.id), 0),
      'productNames', coalesce((
        select jsonb_agg(item.product_name_snapshot order by item.position)
        from site_private.quote_items item where item.quote_request_id = request.id
      ), '[]'::jsonb),
      'productImages', coalesce((
        select jsonb_agg(item.image_url_snapshot order by item.position)
        from site_private.quote_items item
        where item.quote_request_id = request.id and item.image_url_snapshot is not null
      ), '[]'::jsonb)
    ) as payload
    from site_private.quote_requests request
    where request.customer_user_id = v_user_id
      and request.status <> 'spam'
      and (v_status is null or request.status = v_status)
      and (
        v_search = ''
        or position(v_search in lower(request.protocol)) > 0
        or position(v_search in lower(request.id::text)) > 0
        or position(v_search in lower(request.company)) > 0
        or position(v_search in lower(coalesce(request.request_metadata #>> '{briefing,actionName}', ''))) > 0
        or exists (
          select 1 from site_private.quote_items searched_item
          where searched_item.quote_request_id = request.id
            and position(v_search in lower(searched_item.product_name_snapshot || ' ' || searched_item.sku_snapshot)) > 0
        )
      )
    order by request.created_at desc
    limit v_limit offset v_offset
  ) result;

  return jsonb_build_object('items', v_items, 'total', v_total, 'limit', v_limit, 'offset', v_offset);
end;
$$;

revoke all on function public.get_my_quote_requests(integer, integer, text, text) from public, anon;
grant execute on function public.get_my_quote_requests(integer, integer, text, text) to authenticated, service_role;

create or replace function public.claim_site_notification_deliveries(
  p_channels text[],
  p_batch_size integer default 10
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_policy record;
  v_jobs jsonb;
begin
  select * into v_policy from site_private.notification_policy();

  if p_batch_size not between 1 and v_policy.batch_max
    or p_channels is null
    or cardinality(p_channels) not between 1 and 2
    or exists (select 1 from unnest(p_channels) channel where channel not in ('email', 'whatsapp')) then
    raise exception using errcode = '22023', message = 'invalid_notification_claim_input';
  end if;

  update site_private.notification_deliveries delivery
  set status = 'exhausted', lease_token = null, lease_expires_at = null, updated_at = now()
  where delivery.request_kind = 'quote'
    and delivery.audience = 'customer'
    and delivery.channel = any(p_channels)
    and delivery.attempts >= v_policy.max_attempts
    and (
      delivery.status in ('pending', 'failed')
      or (delivery.status = 'processing' and delivery.lease_expires_at <= now())
    );

  with candidates as (
    select delivery.id
    from site_private.notification_deliveries delivery
    where delivery.request_kind = 'quote'
      and delivery.audience = 'customer'
      and delivery.channel = any(p_channels)
      and delivery.attempts < v_policy.max_attempts
      and (
        (delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now())
        or (delivery.status = 'processing' and delivery.lease_expires_at <= now())
      )
    order by delivery.next_attempt_at, delivery.created_at, delivery.id
    for update of delivery skip locked
    limit p_batch_size
  ), claimed as (
    update site_private.notification_deliveries delivery
    set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
        lease_token = gen_random_uuid(), claimed_at = now(),
        lease_expires_at = now() + v_policy.lease_timeout
    from candidates
    where delivery.id = candidates.id
    returning delivery.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', claimed.id,
    'leaseToken', claimed.lease_token,
    'existingProvider', claimed.provider,
    'existingProviderMessageId', claimed.provider_message_id,
    'requestId', request.id,
    'channel', claimed.channel,
    'attempt', claimed.attempts,
    'protocol', request.protocol,
    'recipientEmail', request.email,
    'recipientPhone', request.phone,
    'contactName', request.contact_name,
    'company', request.company,
    'submittedAt', request.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', item.product_name_snapshot,
        'sku', item.sku_snapshot,
        'quantity', item.quantity,
        'colorName', item.color_name_snapshot
      ) order by item.position)
      from site_private.quote_items item
      where item.quote_request_id = request.id
    ), '[]'::jsonb)
  ) order by claimed.created_at, claimed.id), '[]'::jsonb)
  into v_jobs
  from claimed
  join site_private.quote_requests request on request.id = claimed.request_id;

  return v_jobs;
end;
$$;

revoke all on function public.claim_site_notification_deliveries(text[], integer) from public, anon, authenticated;
grant execute on function public.claim_site_notification_deliveries(text[], integer) to service_role;

create or replace function public.claim_site_quote_notification(
  p_request_id uuid,
  p_channel text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_policy record;
  v_delivery site_private.notification_deliveries%rowtype;
  v_request site_private.quote_requests%rowtype;
  v_items jsonb;
begin
  if p_channel not in ('email', 'whatsapp') then
    raise exception using errcode = '22023', message = 'invalid_notification_channel';
  end if;
  select * into v_policy from site_private.notification_policy();

  select * into v_delivery
  from site_private.notification_deliveries delivery
  where delivery.request_kind = 'quote'
    and delivery.request_id = p_request_id
    and delivery.channel = p_channel
    and delivery.audience = 'customer'
    and delivery.status in ('pending', 'failed')
    and delivery.next_attempt_at <= now()
    and delivery.attempts < v_policy.max_attempts
  for update skip locked;
  if not found then return null; end if;

  update site_private.notification_deliveries delivery
  set status = 'processing', attempts = delivery.attempts + 1, updated_at = now(),
      lease_token = gen_random_uuid(), claimed_at = now(),
      lease_expires_at = now() + v_policy.lease_timeout
  where delivery.id = v_delivery.id
  returning * into v_delivery;

  select * into v_request from site_private.quote_requests request where request.id = p_request_id;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', item.product_name_snapshot, 'sku', item.sku_snapshot,
    'quantity', item.quantity, 'colorName', item.color_name_snapshot
  ) order by item.position), '[]'::jsonb)
  into v_items from site_private.quote_items item where item.quote_request_id = p_request_id;

  return jsonb_build_object(
    'id', v_delivery.id, 'leaseToken', v_delivery.lease_token,
    'existingProvider', v_delivery.provider, 'existingProviderMessageId', v_delivery.provider_message_id,
    'requestId', v_request.id, 'channel', v_delivery.channel,
    'attempt', v_delivery.attempts, 'protocol', v_request.protocol,
    'recipientEmail', v_request.email, 'recipientPhone', v_request.phone,
    'contactName', v_request.contact_name, 'company', v_request.company,
    'submittedAt', v_request.created_at, 'items', v_items
  );
end;
$$;

revoke all on function public.claim_site_quote_notification(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_site_quote_notification(uuid, text) to service_role;

comment on function public.claim_site_notification_deliveries(text[], integer) is
  'Reivindica lote da fila assíncrona; lê limites de site_private.notification_policy() (Etapa 12), grava lease_expires_at explícito (Etapa 10) e expõe o protocolo persistido (Etapa 19).';
comment on function public.claim_site_quote_notification(uuid, text) is
  'Reivindicação síncrona imediata (não recupera processing preso). Lê limites de site_private.notification_policy() (Etapa 12) e expõe o protocolo persistido (Etapa 19).';
