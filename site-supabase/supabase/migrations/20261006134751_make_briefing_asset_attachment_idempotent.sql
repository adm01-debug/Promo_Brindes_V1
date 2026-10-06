-- Um timeout entre o commit e a resposta não pode transformar um vínculo já
-- persistido em conflito permanente. Repetir os mesmos IDs para o mesmo
-- orçamento do mesmo titular deve confirmar o estado final, sem permitir
-- mover arquivo para outro orçamento.
create or replace function public.attach_my_briefing_assets_to_quote(
  p_request_id uuid,
  p_asset_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if coalesce(cardinality(p_asset_ids), 0) not between 1 and 10
    or (select count(distinct id) from unnest(p_asset_ids) id) <> cardinality(p_asset_ids)
    or not exists (
      select 1 from site_private.quote_requests request
      where request.id = p_request_id and request.customer_user_id = v_user_id and request.status <> 'spam'
    ) then
    raise exception using errcode = '22023', message = 'invalid_briefing_asset_attachment';
  end if;

  update site_private.customer_briefing_assets asset
  set quote_request_id = p_request_id,
      expires_at = (select request.retention_until from site_private.quote_requests request where request.id = p_request_id)
  where asset.id = any(p_asset_ids)
    and asset.customer_user_id = v_user_id
    and asset.quote_request_id is null
    and asset.expires_at > now();

  -- Confere o estado depois do UPDATE, não o número de linhas alteradas:
  -- uma repetição após resposta perdida (ou uma corrida igual) encontra os
  -- mesmos IDs já ligados ao mesmo pedido e é um sucesso idempotente.
  select count(*) into v_count
  from site_private.customer_briefing_assets asset
  where asset.id = any(p_asset_ids)
    and asset.customer_user_id = v_user_id
    and asset.quote_request_id = p_request_id;
  if v_count <> cardinality(p_asset_ids) then
    raise exception using errcode = 'P0001', message = 'briefing_asset_attachment_conflict';
  end if;
  return v_count;
end;
$$;
