# Grants


Roles da API: `anon` (sem login), `authenticated` (logado), `service_role` (bypass RLS). Grants de sistema (postgres, supabase_*) omitidos.

## Tabelas e views

| objeto | role | privilégios |
|---|---|---|
| site_private.admin_audit_log | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.admin_ddl_log | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.consent_receipts | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.consent_receipts | site_api | INSERT, SELECT |
| site_private.contact_requests | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.contact_requests | site_api | DELETE, INSERT, SELECT |
| site_private.customer_occasion_favorites | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.customer_profiles | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.customer_selections | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.erased_customer_identities | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.notification_deliveries | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.notification_deliveries | site_api | DELETE, INSERT, SELECT, UPDATE |
| site_private.notification_provider_events | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.notification_provider_events | site_api | INSERT, SELECT |
| site_private.proposal_documents | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.proposal_documents | site_api | DELETE, SELECT |
| site_private.quote_adjustment_requests | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.quote_items | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.quote_items | site_api | INSERT, SELECT |
| site_private.quote_request_events | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.quote_request_events | site_api | INSERT, SELECT |
| site_private.quote_requests | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.quote_requests | site_api | DELETE, INSERT, SELECT |
| site_private.rate_limit_buckets | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.rate_limit_buckets | site_api | DELETE, INSERT, SELECT, UPDATE |
| site_private.shared_selection_rate_limits | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.shared_selection_rate_limits | site_api | DELETE, INSERT, SELECT, UPDATE |
| site_private.shared_selections | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.shared_selections | site_api | DELETE, INSERT, SELECT, UPDATE |
| site_private.status_transitions | service_role | DELETE, INSERT, SELECT, UPDATE |
| site_private.status_transitions | site_api | SELECT |
| storage.bucket_lifecycle_states | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.buckets | anon | DELETE, INSERT, SELECT, UPDATE |
| storage.buckets | authenticated | DELETE, INSERT, SELECT, UPDATE |
| storage.buckets | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.buckets_analytics | anon | DELETE, INSERT, SELECT, UPDATE |
| storage.buckets_analytics | authenticated | DELETE, INSERT, SELECT, UPDATE |
| storage.buckets_analytics | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.buckets_vectors | anon | SELECT |
| storage.buckets_vectors | authenticated | SELECT |
| storage.buckets_vectors | service_role | SELECT |
| storage.lifecycle_abandoned_artifacts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.objects | anon | DELETE, INSERT, SELECT, UPDATE |
| storage.objects | authenticated | DELETE, INSERT, SELECT, UPDATE |
| storage.objects | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.s3_multipart_uploads | anon | SELECT |
| storage.s3_multipart_uploads | authenticated | SELECT |
| storage.s3_multipart_uploads | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.s3_multipart_uploads_parts | anon | SELECT |
| storage.s3_multipart_uploads_parts | authenticated | SELECT |
| storage.s3_multipart_uploads_parts | service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.vector_indexes | anon | SELECT |
| storage.vector_indexes | authenticated | SELECT |
| storage.vector_indexes | service_role | SELECT |


## Colunas (grants parciais)

_nenhum_


## Sequences (roles da API)

| sequence | role | privilégios |
|---|---|---|
| site_private.quote_protocol_seq | service_role | USAGE |


## Default privileges (aplicam-se a objetos NOVOS)

| schema | owner | tipo | ACL |
|---|---|---|---|
| (global) | postgres | functions | postgres=X/postgres |
| auth | supabase_auth_admin | functions | postgres=X/supabase_auth_admin, dashboard_user=X/supabase_auth_admin |
| auth | supabase_auth_admin | sequences | postgres=rwU/supabase_auth_admin, dashboard_user=rwU/supabase_auth_admin |
| auth | supabase_auth_admin | tables | postgres=arwdDxtm/supabase_auth_admin, dashboard_user=arwdDxtm/supabase_auth_admin |
| extensions | supabase_admin | functions | postgres=X*/supabase_admin |
| extensions | supabase_admin | sequences | postgres=r*w*U*/supabase_admin |
| extensions | supabase_admin | tables | postgres=a*r*w*d*D*x*t*m*/supabase_admin |
| graphql | supabase_admin | functions | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin |
| graphql | supabase_admin | sequences | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin |
| graphql | supabase_admin | tables | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin |
| graphql_public | supabase_admin | functions | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin |
| graphql_public | supabase_admin | sequences | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin |
| graphql_public | supabase_admin | tables | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin |
| public | postgres | functions | postgres=X/postgres, service_role=X/postgres |
| public | postgres | sequences | postgres=rwU/postgres, service_role=rwU/postgres |
| public | postgres | tables | postgres=arwdDxtm/postgres, service_role=arwdDxtm/postgres |
| public | supabase_admin | functions | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin |
| public | supabase_admin | sequences | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin |
| public | supabase_admin | tables | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin |
| realtime | supabase_admin | functions | postgres=X/supabase_admin, dashboard_user=X/supabase_admin |
| realtime | supabase_admin | sequences | postgres=rwU/supabase_admin, dashboard_user=rwU/supabase_admin |
| realtime | supabase_admin | tables | postgres=a*r*wdDxtm/supabase_admin, dashboard_user=arwdDxtm/supabase_admin |
| site_private | postgres | tables | service_role=arwd/postgres |
| storage | postgres | functions | postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres |
| storage | postgres | sequences | postgres=rwU/postgres, anon=rwU/postgres, authenticated=rwU/postgres, service_role=rwU/postgres |
| storage | postgres | tables | postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres |
