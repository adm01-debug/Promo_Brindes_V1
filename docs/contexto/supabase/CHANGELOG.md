# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-23 23:14 UTC

- **indexes** adicionado (1): `site_private.commercial_audit_log_actor_user_id_idx`
- **lints** removido (1): `fk_without_index:site_private.commercial_audit_log.commercial_audit_log_actor_user_id_fkey`
- **triggers** alterado (4): `site_private.notification_deliveries.notification_deliveries_log_admin_write`, `site_private.quote_items.quote_items_log_admin_write`, `site_private.quote_request_events.quote_request_events_log_admin_write`, `site_private.quote_requests.quote_requests_log_admin_write`

## 2026-11-23 12:28 UTC

- **functions** alterado (3): `public.purge_site_admin_audit_logs(p_retention_days integer, p_batch_size integer)`, `site_private.assert_site_operator()`, `site_private.audit_actor()`

## 2026-11-22 19:13 UTC

- **functions** alterado (7): `public.purge_site_admin_audit_logs(p_retention_days integer, p_batch_size integer)`, `site_private.assert_site_operator()`, `site_private.commercial_team_alert_payload(p_delivery_id uuid)`, `site_private.commercial_team_contact_alert_payload(p_delivery_id uuid)`, `site_private.normalize_email(p_email text)`, `site_private.notification_policy()`, `site_private.quote_notification_payload(p_delivery_id uuid)`

## 2026-11-22 16:14 UTC

- **functions** alterado (7): `public.erase_customer_data(p_email text, p_user_id uuid)`, `public.export_my_data()`, `public.reply_site_quote_adjustment(p_adjustment_id uuid, p_response text, p_status text)`, `site_private.assert_site_operator()`, `site_private.current_titular_verified_email()`, `site_private.erase_titular_request_metadata(p_metadata jsonb)`, `site_private.normalize_email(p_email text)`
- **migrations** adicionado (2): `20261122070000_add_customer_message_events`, `20261122080000_include_message_text_in_export`

## 2026-11-22 13:13 UTC

- **colunas** adicionado (7): `site_private.cron_heartbeats.consecutive_failures`, `site_private.cron_heartbeats.installed_at`, `site_private.cron_heartbeats.last_failed_at`, `site_private.cron_heartbeats.last_failure_detail`, `site_private.cron_heartbeats.last_ok_at`, `site_private.cron_heartbeats.name`, `site_private.cron_heartbeats.updated_at`
- **constraints** adicionado (4): `site_private.cron_heartbeats.cron_heartbeats_consecutive_failures_check`, `site_private.cron_heartbeats.cron_heartbeats_last_failure_detail_check`, `site_private.cron_heartbeats.cron_heartbeats_name_check`, `site_private.cron_heartbeats.cron_heartbeats_pkey`
- **functions** adicionado (2): `public.check_cron_heartbeats()`, `public.record_cron_heartbeat(p_name text, p_ok boolean, p_detail text)`
- **grants** adicionado (2): `site_private.cron_heartbeats:service_role`, `site_private.cron_heartbeats:site_api`
- **indexes** adicionado (1): `site_private.cron_heartbeats_pkey`
- **migrations** adicionado (1): `20261122040000_add_cron_heartbeat_and_watchdog`
- **tabelas** adicionado (1): `site_private.cron_heartbeats`

## 2026-11-22 09:14 UTC

- **migrations** adicionado (1): `20261122030000_add_commercial_backoffice_rpcs`

## 2026-11-22 08:17 UTC

- **colunas** adicionado (12): `site_private.commercial_audit_log.action`, `site_private.commercial_audit_log.actor_label`, `site_private.commercial_audit_log.actor_user_id`, `site_private.commercial_audit_log.created_at`, `site_private.commercial_audit_log.detail`, `site_private.commercial_audit_log.id`, `site_private.commercial_audit_log.quote_request_id`, `site_private.commercial_operators.created_at`, `site_private.commercial_operators.display_name`, `site_private.commercial_operators.is_active`, `site_private.commercial_operators.updated_at`, `site_private.commercial_operators.user_id`
- **constraints** adicionado (9): `site_private.commercial_audit_log.commercial_audit_log_action_check`, `site_private.commercial_audit_log.commercial_audit_log_actor_label_check`, `site_private.commercial_audit_log.commercial_audit_log_actor_user_id_fkey`, `site_private.commercial_audit_log.commercial_audit_log_detail_check`, `site_private.commercial_audit_log.commercial_audit_log_pkey`, `site_private.commercial_audit_log.commercial_audit_log_quote_request_id_fkey`, `site_private.commercial_operators.commercial_operators_display_name_check`, `site_private.commercial_operators.commercial_operators_pkey`, `site_private.commercial_operators.commercial_operators_user_id_fkey`
- **functions** adicionado (7): `public.get_site_quote_request(p_request_id uuid)`, `public.list_site_quote_requests(p_status text, p_search text, p_limit integer, p_offset integer)`, `public.publish_site_quote_proposal(p_request_id uuid, p_title text, p_storage_path text, p_valid_until date)`, `public.reply_site_quote_adjustment(p_adjustment_id uuid, p_response text, p_status text)`, `public.update_site_quote_status(p_request_id uuid, p_status text)`, `site_private.assert_site_operator()`, `site_private.is_valid_proposal_storage_path(p_path text)`
- **functions** alterado (1): `site_private.set_updated_at()`
- **grants** adicionado (2): `site_private.commercial_audit_log:service_role`, `site_private.commercial_operators:service_role`
- **indexes** adicionado (4): `site_private.commercial_audit_log_pkey`, `site_private.commercial_audit_log_request_created_idx`, `site_private.commercial_operators_active_idx`, `site_private.commercial_operators_pkey`
- **lints** adicionado (1): `fk_without_index:site_private.commercial_audit_log.commercial_audit_log_actor_user_id_fkey`
- **tabelas** adicionado (2): `site_private.commercial_audit_log`, `site_private.commercial_operators`
- **triggers** adicionado (1): `site_private.commercial_operators.commercial_operators_set_updated_at`

## 2026-11-21 21:12 UTC

- **colunas** adicionado (4): `site_private.subject_right_requests.id`, `site_private.subject_right_requests.requested_at`, `site_private.subject_right_requests.right_type`, `site_private.subject_right_requests.subject_user_id`
- **constraints** adicionado (3): `site_private.subject_right_requests.subject_right_requests_pkey`, `site_private.subject_right_requests.subject_right_requests_right_type_check`, `site_private.subject_right_requests.subject_right_requests_subject_user_id_fkey`
- **functions** adicionado (6): `public.correct_my_data(p_display_name text, p_company text)`, `public.delete_my_data()`, `public.erase_customer_data(p_email text, p_user_id uuid)`, `public.export_my_data()`, `public.get_my_data_access()`, `site_private.current_titular_verified_email()`
- **functions** removido (1): `public.erase_customer_data(p_email text)`
- **functions** alterado (3): `public.claim_my_quote_requests()`, `site_private.erase_titular_request_metadata(p_metadata jsonb)`, `site_private.normalize_email(p_email text)`
- **grants** adicionado (1): `site_private.subject_right_requests:service_role`
- **indexes** adicionado (2): `site_private.subject_right_requests_pkey`, `site_private.subject_right_requests_subject_idx`
- **migrations** adicionado (1): `20261121110000_add_titular_lgpd_rights_rpcs`
- **tabelas** adicionado (1): `site_private.subject_right_requests`

## 2026-11-17 11:22 UTC

- **functions** adicionado (3): `site_private.commercial_team_contact_alert_payload(p_delivery_id uuid)`, `site_private.enqueue_contact_commercial_alert()`, `site_private.erase_titular_request_metadata(p_metadata jsonb)`
- **functions** alterado (3): `public.claim_site_commercial_team_alert(p_request_id uuid)`, `public.claim_site_commercial_team_alerts(p_batch_size integer)`, `public.erase_customer_data(p_email text)`
- **migrations** adicionado (3): `20261117010000_add_commercial_team_contact_alert`, `20261117030000_complete_customer_data_erasure`, `20261117030100_repair_incomplete_customer_data_erasure`
- **triggers** adicionado (1): `site_private.contact_requests.contact_requests_enqueue_commercial_alert`

## 2026-11-17 09:16 UTC

- **functions** alterado (8): `public.erase_customer_data(p_email text)`, `public.get_my_quote_request(p_request_id uuid)`, `public.get_my_quote_requests(p_limit integer, p_offset integer, p_status text, p_search text)`, `site_private.commercial_team_alert_payload(p_delivery_id uuid)`, `site_private.enqueue_quote_confirmations()`, `site_private.normalize_email(p_email text)`, `site_private.notification_policy()`, `site_private.quote_notification_payload(p_delivery_id uuid)`

## 2026-11-11 22:46 UTC

- Snapshot inicial.

