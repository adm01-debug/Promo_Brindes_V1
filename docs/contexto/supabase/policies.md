# Policies (RLS)


Visão consolidada (inclui `storage.objects` e `realtime.messages`); detalhes por tabela em `tables/`.

| tabela | policy | cmd | tipo | roles | USING | WITH CHECK |
|---|---|---|---|---|---|---|
| storage.objects | customer_briefing_assets_delete_own | DELETE | PERMISSIVE | authenticated | `((bucket_id = 'customer-briefing-assets'::text) AND (owner_id = (auth.uid())::text) AND can_delete_my_unverified_briefing_asset_path(name))` |  |
| storage.objects | customer_briefing_assets_insert_own | INSERT | PERMISSIVE | authenticated |  | `((bucket_id = 'customer-briefing-assets'::text) AND (owner_id = (auth.uid())::text) AND matches_my_briefing_asset_upload(name, metadata))` |
| storage.objects | customer_briefing_assets_select_own | SELECT | PERMISSIVE | authenticated | `((bucket_id = 'customer-briefing-assets'::text) AND owns_my_briefing_asset_path(name))` |  |
