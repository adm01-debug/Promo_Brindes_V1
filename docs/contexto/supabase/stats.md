# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 14.2 MB |
| schema site_private | 1.6 MB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| site_private.admin_ddl_log | ~620 | 168.0 KB | 56.0 KB | 72.0 KB | ~40 | 8 | ~270 | 2026-09-27 |
| site_private.quote_requests | 4 | 168.0 KB | 8.0 KB | 152.0 KB | ~20 | ~180 | ~210 |  |
| site_private.notification_deliveries | 8 | 160.0 KB | 16.0 KB | 104.0 KB | ~50 | ~10.7k | ~17.6k | 2026-11-11 |
| site_private.contact_requests | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 1 | ~20 | ~80 |  |
| site_private.customer_briefing_assets | 0 | 88.0 KB | 8.0 KB | 72.0 KB | 1 | ~10 | ~90 |  |
| site_private.consent_receipts | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 5 | ~20 | 4 |  |
| site_private.quote_items | 0 | 72.0 KB | 8.0 KB | 56.0 KB | ~10 | ~10 | ~60 |  |
| site_private.rate_limit_buckets | 2 | 72.0 KB | 8.0 KB | 48.0 KB | ~20 | ~80 | ~30 |  |
| site_private.cron_heartbeats | 3 | 64.0 KB | 8.0 KB | 16.0 KB | ~20 | ~1.5k | ~1.5k | 2026-11-26 |
| site_private.quote_request_events | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~10 | ~10 | 7 |  |
| site_private.customer_selections | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 1 | ~70 | ~20 |  |
| site_private.admin_audit_log | 2 | 48.0 KB | 8.0 KB | 32.0 KB | ~20 | ~80 | 0 |  |
| site_private.customer_profiles | 0 | 48.0 KB | 8.0 KB | 32.0 KB | ~10 | 9 | ~30 |  |
| site_private.shared_selection_rate_limits | 1 | 48.0 KB | 8.0 KB | 24.0 KB | ~20 | ~80 | ~20 |  |
| site_private.shared_selections | 0 | 48.0 KB | 8.0 KB | 32.0 KB | ~10 | ~80 | ~20 |  |
| site_private.subject_right_requests | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 8 | 2 | 3 |  |
| site_private.notification_provider_events | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | ~20 |  |
| site_private.proposal_documents | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | 7 |  |
| site_private.quote_adjustment_requests | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | ~10 |  |
| site_private.commercial_audit_log | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| site_private.erased_customer_identities | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 4 | 2 |  |
| site_private.pii_read_audit_log | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 0 |  |
| site_private.status_transitions | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 7 | ~90 |  |
| site_private.storage_deletion_queue | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 1 | ~140 | 2 |  |
| site_private.commercial_operators | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 1 |  |
| site_private.customer_occasion_favorites | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 4 | 9 |  |


## Índices nunca usados (candidatos a remoção; ignore PK/UNIQUE)

_nenhum_


## Storage

_nenhum_


## Auth (agregados)

| métrica | valor |
|---|---|
| usuários (~) | 1 |
| confirmados (~) | 1 |
| criados últimos 30d (~) | 1 |

| provider | usuários (~) |
|---|---|
| email | 1 |


## Consultas mais custosas (pg_stat_statements, desde o último reset)
| role | chamadas (~) | total ms (~) | média ms | query |
|---|---|---|---|---|
| authenticator | ~140 | ~42.2k | 310.22 | `SELECT name FROM pg_timezone_names` |
| postgres | ~110 | ~20.1k | 182.35 | `SELECT version, coalesce(name, $1) as name, statements FROM supabase_migrations.schema_migrations` |
| postgres | ~90 | ~13k | 141.55 | `select m->>$1 as version, m->>$2 as name, case when pg_catalog.jsonb_typeof(m->$3) = $4 then array(select pg_catalog.jsonb_array_elements_text(m->$5)) else $6 end as statements from pg_catalog.jsonb_array_elements( coale` |
| postgres | ~50 | ~12.1k | 242.95 | `SELECT e.name, n.nspname AS schema, e.default_version, x.extversion AS installed_version, e.comment, ev.schema AS default_version_schema FROM pg_available_extensions e LEFT JOIN pg_extension x ON e.name = x.extname LEFT ` |
| postgres | ~30 | ~10.8k | 373.07 | `with f as ( -- CTE with sane arg_modes, arg_names, and arg_types. -- All three are always of the same length. -- All three include all args, including OUT and TABLE args. with functions as ( select *, -- proargmodes is n` |
| service_role | ~1.9k | ~9.4k | 4.90 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_batch_size" FROM json_to_record(pgrst_payload.json_data) AS _("p_batch_size" integer) LIMIT $4) pgrst_b` |
| service_role | ~1.4k | ~8.5k | 6.23 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_channels", "p_batch_size" FROM json_to_record(pgrst_payload.json_data) AS _("p_channels" text[], "p_bat` |
| pgbouncer | ~700 | ~5k | 7.15 | `SELECT t.oid, t.typname, t.typsend, t.typreceive, t.typoutput, t.typinput, coalesce(d.typelem, t.typelem), coalesce(r.rngsubtype, $1), ARRAY ( SELECT a.atttypid FROM pg_attribute AS a WHERE a.attrelid = t.typrelid AND a.` |
| authenticator | ~130 | ~4.5k | 34.18 | `WITH -- Recursively get the base types of domains base_types AS ( WITH RECURSIVE recurse AS ( SELECT oid, typbasetype, typnamespace AS base_namespace, COALESCE(NULLIF(typbasetype, $3), oid) AS base_type FROM pg_type UNIO` |
| postgres | ~410 | ~4.5k | 11.11 | `SELECT n.nspname AS schema, p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args, pg_get_function_result(p.oid) AS returns, l.lanname AS language, CASE p.prokind WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 TH` |
| postgres | ~410 | ~4.1k | 10.22 | `SELECT n.nspname AS schema, c.relname AS "table", con.conname AS name, CASE con.contype WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 THEN $6 WHEN $7 THEN $8 WHEN $9 THEN $10 ELSE con.contype::text END AS type, pg_get_constrai` |
| postgres | ~410 | ~3.5k | 8.56 | `SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema, (SELECT default_version FROM pg_available_extensions a WHERE a.name = e.extname) AS available_version FROM pg_extension e JOIN pg_namespace n ON n.o` |
| postgres | ~410 | ~3.2k | 7.83 | `SELECT n.nspname AS schema, c.relname AS name, GREATEST(c.reltuples::bigint, $1) AS est_rows, pg_total_relation_size(c.oid) AS total_bytes, pg_relation_size(c.oid) AS heap_bytes, pg_indexes_size(c.oid) AS index_bytes, s.` |
| postgres | ~410 | ~3.1k | 7.56 | `SELECT n.nspname AS schema, t.relname AS "table", ic.relname AS name, pg_get_indexdef(ix.indexrelid) AS definition, ix.indisunique AS is_unique, ix.indisprimary AS is_primary, ix.indisvalid AS is_valid, am.amname AS meth` |
| postgres | ~410 | ~2.9k | 7.17 | `SELECT n.nspname AS schema, c.relname AS "table", a.attnum AS position, a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable, pg_get_expr(d.adbin, d.adrelid) AS "default", NULLIF(` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | idle | 2 |
| pgbouncer | idle | 1 |
| postgres | active | 1 |
| supabase_admin | idle | 3 |
| supabase_admin |  | 1 |
