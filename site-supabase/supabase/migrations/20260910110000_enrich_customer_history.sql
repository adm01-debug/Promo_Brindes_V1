-- Histórico de orçamentos do Site Promo Brindes.
-- Aplicar exclusivamente no projeto isolado: xlzmclcjdncjfdrjxclt.
-- Esta migration somente amplia dados já autorizados ao auth.uid() proprietário.

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
      'protocol', upper(left(request.id::text, 8)),
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

comment on function public.get_my_quote_requests(integer, integer, text, text) is
  'Lista solicitações do auth.uid() com título de ação, miniaturas e última movimentação visível ao cliente.';
