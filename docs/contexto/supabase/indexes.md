# Índices

Uso e tamanho em `stats.md`.

| tabela | índice | método | colunas | único | válido | predicado |
|---|---|---|---|---|---|---|
| site_private.admin_audit_log | admin_audit_log_occurred_idx | btree | occurred_at, id | não | sim |  |
| site_private.admin_audit_log | admin_audit_log_pkey | btree | id | sim | sim |  |
| site_private.admin_ddl_log | admin_ddl_log_occurred_idx | btree | occurred_at, id | não | sim |  |
| site_private.admin_ddl_log | admin_ddl_log_pkey | btree | id | sim | sim |  |
| site_private.consent_receipts | consent_receipts_contact_request_id_idx | btree | contact_request_id | não | sim | `(contact_request_id IS NOT NULL)` |
| site_private.consent_receipts | consent_receipts_pkey | btree | id | sim | sim |  |
| site_private.consent_receipts | consent_receipts_quote_request_id_idx | btree | quote_request_id | não | sim | `(quote_request_id IS NOT NULL)` |
| site_private.consent_receipts | consent_receipts_server_recorded_at_idx | btree | server_recorded_at | não | sim |  |
| site_private.contact_requests | contact_requests_client_request_id_key | btree | client_request_id | sim | sim |  |
| site_private.contact_requests | contact_requests_created_at_idx | btree | created_at | não | sim |  |
| site_private.contact_requests | contact_requests_pkey | btree | id | sim | sim |  |
| site_private.contact_requests | contact_requests_retention_idx | btree | retention_until | não | sim |  |
| site_private.contact_requests | contact_requests_status_created_at_idx | btree | status, created_at | não | sim |  |
| site_private.customer_briefing_assets | customer_briefing_assets_expiry_idx | btree | expires_at, id | não | sim |  |
| site_private.customer_briefing_assets | customer_briefing_assets_owner_created_idx | btree | customer_user_id, created_at, id | não | sim |  |
| site_private.customer_briefing_assets | customer_briefing_assets_pkey | btree | id | sim | sim |  |
| site_private.customer_briefing_assets | customer_briefing_assets_quote_idx | btree | quote_request_id | não | sim | `(quote_request_id IS NOT NULL)` |
| site_private.customer_briefing_assets | customer_briefing_assets_storage_path_key | btree | storage_path | sim | sim |  |
| site_private.customer_occasion_favorites | customer_occasion_favorites_owner_updated_idx | btree | customer_user_id, updated_at, occasion_id | não | sim |  |
| site_private.customer_occasion_favorites | customer_occasion_favorites_pkey | btree | customer_user_id, occasion_id | sim | sim |  |
| site_private.customer_profiles | customer_profiles_pkey | btree | user_id | sim | sim |  |
| site_private.customer_profiles | customer_profiles_verified_email_idx | btree |  | sim | sim |  |
| site_private.customer_selections | customer_selections_archived_idx | btree | archived_at | não | sim | `(archived_at IS NOT NULL)` |
| site_private.customer_selections | customer_selections_owner_updated_idx | btree | customer_user_id, updated_at, id | não | sim |  |
| site_private.customer_selections | customer_selections_pkey | btree | id | sim | sim |  |
| site_private.erased_customer_identities | erased_customer_identities_pkey | btree | email_sha256 | sim | sim |  |
| site_private.notification_deliveries | notification_deliveries_delivery_state_source_event_idx | btree | delivery_state_source_event_id | não | sim | `(delivery_state_source_event_id IS NOT NULL)` |
| site_private.notification_deliveries | notification_deliveries_pending_idx | btree | status, created_at | não | sim | `(status = ANY (ARRAY['pending'::text, 'failed'::text]))` |
| site_private.notification_deliveries | notification_deliveries_pkey | btree | id | sim | sim |  |
| site_private.notification_deliveries | notification_deliveries_processing_lease_idx | btree | lease_expires_at | não | sim | `(status = 'processing'::text)` |
| site_private.notification_deliveries | notification_deliveries_provider_message_key | btree | provider, provider_message_id | sim | sim | `(provider_message_id IS NOT NULL)` |
| site_private.notification_deliveries | notification_deliveries_request_kind_request_id_channel_aud_key | btree | request_kind, request_id, channel, audience | sim | sim |  |
| site_private.notification_deliveries | notification_deliveries_retry_idx | btree | next_attempt_at, created_at | não | sim | `(status = ANY (ARRAY['pending'::text, 'failed'::text, 'processing'::text]))` |
| site_private.notification_provider_events | notification_provider_events_delivery_id_idx | btree | delivery_id | não | sim | `(delivery_id IS NOT NULL)` |
| site_private.notification_provider_events | notification_provider_events_pkey | btree | id | sim | sim |  |
| site_private.notification_provider_events | notification_provider_events_provider_provider_event_id_key | btree | provider, provider_event_id | sim | sim |  |
| site_private.proposal_documents | proposal_documents_pkey | btree | id | sim | sim |  |
| site_private.proposal_documents | proposal_documents_published_idx | btree | quote_request_id, published_at | não | sim | `(published_at IS NOT NULL)` |
| site_private.proposal_documents | proposal_documents_quote_request_id_version_key | btree | quote_request_id, version | sim | sim |  |
| site_private.proposal_documents | proposal_documents_storage_bucket_storage_path_key | btree | storage_bucket, storage_path | sim | sim |  |
| site_private.quote_adjustment_requests | quote_adjustment_requests_pkey | btree | id | sim | sim |  |
| site_private.quote_adjustment_requests | quote_adjustment_requests_quote_request_id_requested_by_cli_key | btree | quote_request_id, requested_by, client_request_id | sim | sim |  |
| site_private.quote_adjustment_requests | quote_adjustment_requests_requested_by_idx | btree | requested_by | não | sim |  |
| site_private.quote_adjustment_requests | quote_adjustments_request_created_idx | btree | quote_request_id, created_at | não | sim |  |
| site_private.quote_items | quote_items_kit_group_idx | btree | quote_request_id, kit_group_id, position | não | sim | `(kit_group_id IS NOT NULL)` |
| site_private.quote_items | quote_items_pkey | btree | id | sim | sim |  |
| site_private.quote_items | quote_items_product_id_idx | btree | source_product_id | não | sim |  |
| site_private.quote_items | quote_items_quote_request_id_position_key | btree | quote_request_id, position | sim | sim |  |
| site_private.quote_request_events | quote_request_events_pkey | btree | id | sim | sim |  |
| site_private.quote_request_events | quote_request_events_request_sequence_idx | btree | quote_request_id, sequence | não | sim |  |
| site_private.quote_request_events | quote_request_events_sequence_key | btree | sequence | sim | sim |  |
| site_private.quote_requests | quote_requests_client_request_id_key | btree | client_request_id | sim | sim |  |
| site_private.quote_requests | quote_requests_created_at_idx | btree | created_at | não | sim |  |
| site_private.quote_requests | quote_requests_customer_created_idx | btree | customer_user_id, created_at | não | sim | `((customer_user_id IS NOT NULL) AND (status <> 'spam'::text))` |
| site_private.quote_requests | quote_requests_customer_owner_idx | btree | customer_user_id | não | sim | `(customer_user_id IS NOT NULL)` |
| site_private.quote_requests | quote_requests_pkey | btree | id | sim | sim |  |
| site_private.quote_requests | quote_requests_protocol_key | btree | protocol | sim | sim |  |
| site_private.quote_requests | quote_requests_retention_idx | btree | retention_until | não | sim |  |
| site_private.quote_requests | quote_requests_status_created_at_idx | btree | status, created_at | não | sim |  |
| site_private.quote_requests | quote_requests_unclaimed_email_idx | btree | created_at | não | sim | `((customer_user_id IS NULL) AND (status <> 'spam'::text))` |
| site_private.rate_limit_buckets | rate_limit_buckets_pkey | btree | request_kind, identifier_hash | sim | sim |  |
| site_private.rate_limit_buckets | rate_limit_buckets_updated_at_idx | btree | updated_at | não | sim |  |
| site_private.shared_selection_rate_limits | shared_selection_rate_limits_pkey | btree | identifier_hash | sim | sim |  |
| site_private.shared_selections | shared_selections_active_idx | btree | expires_at | não | sim | `(revoked_at IS NULL)` |
| site_private.shared_selections | shared_selections_pkey | btree | token | sim | sim |  |
| site_private.status_transitions | status_transitions_pkey | btree | entity, from_status, to_status | sim | sim |  |
| site_private.storage_deletion_queue | storage_deletion_queue_pkey | btree | bucket, object_path | sim | sim |  |
