# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-17 11:22 UTC

- **functions** adicionado (3): `site_private.commercial_team_contact_alert_payload(p_delivery_id uuid)`, `site_private.enqueue_contact_commercial_alert()`, `site_private.erase_titular_request_metadata(p_metadata jsonb)`
- **functions** alterado (3): `public.claim_site_commercial_team_alert(p_request_id uuid)`, `public.claim_site_commercial_team_alerts(p_batch_size integer)`, `public.erase_customer_data(p_email text)`
- **migrations** adicionado (3): `20261117010000_add_commercial_team_contact_alert`, `20261117030000_complete_customer_data_erasure`, `20261117030100_repair_incomplete_customer_data_erasure`
- **triggers** adicionado (1): `site_private.contact_requests.contact_requests_enqueue_commercial_alert`

## 2026-11-17 09:16 UTC

- **functions** alterado (8): `public.erase_customer_data(p_email text)`, `public.get_my_quote_request(p_request_id uuid)`, `public.get_my_quote_requests(p_limit integer, p_offset integer, p_status text, p_search text)`, `site_private.commercial_team_alert_payload(p_delivery_id uuid)`, `site_private.enqueue_quote_confirmations()`, `site_private.normalize_email(p_email text)`, `site_private.notification_policy()`, `site_private.quote_notification_payload(p_delivery_id uuid)`

## 2026-11-11 22:46 UTC

- Snapshot inicial.

