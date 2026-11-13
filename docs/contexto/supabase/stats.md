# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 13.8 MB |
| schema site_private | 1.3 MB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| site_private.notification_deliveries | 4 | 160.0 KB | 16.0 KB | 104.0 KB | ~10 | ~1.1k | ~1.9k | 2026-11-11 |
| site_private.quote_requests | 0 | 152.0 KB | 8.0 KB | 136.0 KB | ~20 | ~100 | ~170 |  |
| site_private.admin_ddl_log | ~300 | 120.0 KB | 32.0 KB | 48.0 KB | ~40 | 6 | ~210 | 2026-09-27 |
| site_private.contact_requests | 0 | 88.0 KB | 8.0 KB | 72.0 KB | 1 | ~20 | ~70 |  |
| site_private.customer_briefing_assets | 0 | 88.0 KB | 8.0 KB | 72.0 KB | 1 | ~10 | ~70 |  |
| site_private.consent_receipts | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 5 | ~20 | 4 |  |
| site_private.quote_items | 0 | 72.0 KB | 8.0 KB | 56.0 KB | ~10 | ~10 | ~40 |  |
| site_private.rate_limit_buckets | 2 | 72.0 KB | 8.0 KB | 48.0 KB | 6 | ~70 | ~20 |  |
| site_private.quote_request_events | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 9 | ~10 | 7 |  |
| site_private.customer_selections | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 1 | ~60 | ~10 |  |
| site_private.admin_audit_log | 2 | 48.0 KB | 8.0 KB | 32.0 KB | ~20 | ~60 | 0 |  |
| site_private.customer_profiles | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 8 | 9 | ~20 |  |
| site_private.shared_selection_rate_limits | 1 | 48.0 KB | 8.0 KB | 24.0 KB | ~20 | ~70 | ~20 |  |
| site_private.shared_selections | 0 | 48.0 KB | 8.0 KB | 32.0 KB | ~10 | ~70 | ~20 |  |
| site_private.proposal_documents | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | 7 |  |
| site_private.quote_adjustment_requests | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | 7 |  |
| site_private.notification_provider_events | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | ~10 |  |
| site_private.status_transitions | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 7 | ~60 |  |
| site_private.storage_deletion_queue | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 1 | ~110 | 2 |  |
| site_private.customer_occasion_favorites | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 4 | 1 |  |
| site_private.erased_customer_identities | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 4 | 0 |  |


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
| authenticator | ~120 | ~35k | 301.82 | `SELECT name FROM pg_timezone_names` |
| postgres | ~50 | ~11.5k | 250.12 | `SELECT e.name, n.nspname AS schema, e.default_version, x.extversion AS installed_version, e.comment, ev.schema AS default_version_schema FROM pg_available_extensions e LEFT JOIN pg_extension x ON e.name = x.extname LEFT ` |
| postgres | ~70 | ~9k | 127.41 | `select m->>$1 as version, m->>$2 as name, case when pg_catalog.jsonb_typeof(m->$3) = $4 then array(select pg_catalog.jsonb_array_elements_text(m->$5)) else $6 end as statements from pg_catalog.jsonb_array_elements( coale` |
| authenticator | ~110 | ~3.8k | 33.51 | `WITH -- Recursively get the base types of domains base_types AS ( WITH RECURSIVE recurse AS ( SELECT oid, typbasetype, typnamespace AS base_namespace, COALESCE(NULLIF(typbasetype, $3), oid) AS base_type FROM pg_type UNIO` |
| pgbouncer | ~250 | ~1.8k | 7.18 | `SELECT t.oid, t.typname, t.typsend, t.typreceive, t.typoutput, t.typinput, coalesce(d.typelem, t.typelem), coalesce(r.rngsubtype, $1), ARRAY ( SELECT a.atttypid FROM pg_attribute AS a WHERE a.attrelid = t.typrelid AND a.` |
| service_role | ~330 | ~1.6k | 4.76 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_batch_size" FROM json_to_record(pgrst_payload.json_data) AS _("p_batch_size" integer) LIMIT $4) pgrst_b` |
| pgbouncer | ~2.9k | ~830 | 0.28 | `SELECT * FROM pgbouncer.get_auth($1)` |
| postgres | ~60 | ~720 | 11.00 | `SELECT n.nspname AS schema, p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args, pg_get_function_result(p.oid) AS returns, l.lanname AS language, CASE p.prokind WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 TH` |
| service_role | ~100 | ~690 | 6.80 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_channels", "p_batch_size" FROM json_to_record(pgrst_payload.json_data) AS _("p_channels" text[], "p_bat` |
| postgres | ~60 | ~680 | 10.41 | `SELECT n.nspname AS schema, c.relname AS "table", con.conname AS name, CASE con.contype WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 THEN $6 WHEN $7 THEN $8 WHEN $9 THEN $10 ELSE con.contype::text END AS type, pg_get_constrai` |
| postgres | ~60 | ~520 | 7.96 | `SELECT n.nspname AS schema, c.relname AS name, GREATEST(c.reltuples::bigint, $1) AS est_rows, pg_total_relation_size(c.oid) AS total_bytes, pg_relation_size(c.oid) AS heap_bytes, pg_indexes_size(c.oid) AS index_bytes, s.` |
| postgres | ~60 | ~490 | 7.55 | `SELECT n.nspname AS schema, t.relname AS "table", ic.relname AS name, pg_get_indexdef(ix.indexrelid) AS definition, ix.indisunique AS is_unique, ix.indisprimary AS is_primary, ix.indisvalid AS is_valid, am.amname AS meth` |
| postgres | ~60 | ~480 | 7.41 | `SELECT n.nspname AS schema, c.relname AS "table", a.attnum AS position, a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable, pg_get_expr(d.adbin, d.adrelid) AS "default", NULLIF(` |
| postgres | ~60 | ~450 | 6.97 | `SELECT version, name, statements FROM supabase_migrations.schema_migrations ORDER BY version` |
| service_role | ~60 | ~380 | 6.36 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_quote_ids", "p_storage_paths", "p_batch_size" FROM json_to_record(pgrst_payload.json_data) AS _("p_quot` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | idle | 2 |
| pgbouncer | idle | 1 |
| postgres | active | 1 |
| supabase_admin | idle | 3 |
| supabase_admin |  | 1 |
