-- As RPCs de favoritos são exclusivamente o contrato da sessão autenticada do
-- cliente. A ACL explícita impede que defaults de função, service_role ou a
-- role mínima da API do site ampliem esse caminho público por acidente.
-- Aplicar somente no Supabase isolado xlzmclcjdncjfdrjxclt.

revoke all on function public.list_my_occasion_favorites() from public, anon, authenticated, service_role, site_api;
revoke all on function public.set_my_occasion_favorite(text, boolean) from public, anon, authenticated, service_role, site_api;

grant execute on function public.list_my_occasion_favorites() to authenticated;
grant execute on function public.set_my_occasion_favorite(text, boolean) to authenticated;

comment on function public.list_my_occasion_favorites() is
  'Lista IDs editoriais do titular autenticado. EXECUTE somente para authenticated.';
comment on function public.set_my_occasion_favorite(text, boolean) is
  'Altera um ID editorial do titular autenticado. EXECUTE somente para authenticated.';
