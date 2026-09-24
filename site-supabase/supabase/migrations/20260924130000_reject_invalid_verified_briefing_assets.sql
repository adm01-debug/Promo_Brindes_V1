-- Remove com segurança uma reserva que falhou na segunda inspeção após o
-- bloqueio do blob. Aplicar exclusivamente no Supabase isolado
-- xlzmclcjdncjfdrjxclt.

create or replace function public.reject_site_briefing_asset_verification(
  p_id uuid,
  p_storage_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from site_private.customer_briefing_assets asset
  where asset.id = p_id
    and asset.storage_bucket = 'customer-briefing-assets'
    and asset.storage_path = p_storage_path
    and asset.quote_request_id is null;

  return found;
end;
$$;

revoke all on function public.reject_site_briefing_asset_verification(uuid, text)
  from public, anon, authenticated;
grant execute on function public.reject_site_briefing_asset_verification(uuid, text)
  to site_api, service_role;

comment on function public.reject_site_briefing_asset_verification(uuid, text) is
  'Caminho server-side idempotente para remover uma reserva não vinculada cuja verificação de conteúdo falhou; o trigger enfileira a exclusão do blob privado.';
