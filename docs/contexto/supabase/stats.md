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
| site_private.notification_deliveries | 4 | 160.0 KB | 16.0 KB | 104.0 KB | ~10 | ~190 | ~500 | 2026-11-11 |
| site_private.quote_requests | 0 | 152.0 KB | 8.0 KB | 136.0 KB | ~20 | ~100 | ~160 |  |
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
| authenticator | ~110 | ~34k | 300.69 | `SELECT name FROM pg_timezone_names` |
| postgres | ~50 | ~11.5k | 250.12 | `SELECT e.name, n.nspname AS schema, e.default_version, x.extversion AS installed_version, e.comment, ev.schema AS default_version_schema FROM pg_available_extensions e LEFT JOIN pg_extension x ON e.name = x.extname LEFT ` |
| postgres | ~70 | ~8.7k | 126.54 | `select m->>$1 as version, m->>$2 as name, case when pg_catalog.jsonb_typeof(m->$3) = $4 then array(select pg_catalog.jsonb_array_elements_text(m->$5)) else $6 end as statements from pg_catalog.jsonb_array_elements( coale` |
| authenticator | ~110 | ~3.7k | 33.40 | `WITH -- Recursively get the base types of domains base_types AS ( WITH RECURSIVE recurse AS ( SELECT oid, typbasetype, typnamespace AS base_namespace, COALESCE(NULLIF(typbasetype, $3), oid) AS base_type FROM pg_type UNIO` |
| pgbouncer | ~190 | ~1.3k | 7.08 | `SELECT t.oid, t.typname, t.typsend, t.typreceive, t.typoutput, t.typinput, coalesce(d.typelem, t.typelem), coalesce(r.rngsubtype, $1), ARRAY ( SELECT a.atttypid FROM pg_attribute AS a WHERE a.attrelid = t.typrelid AND a.` |
| pgbouncer | ~2.5k | ~680 | 0.27 | `SELECT * FROM pgbouncer.get_auth($1)` |
| service_role | ~60 | ~380 | 6.36 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_quote_ids", "p_storage_paths", "p_batch_size" FROM json_to_record(pgrst_payload.json_data) AS _("p_quot` |
| authenticator | ~110 | ~360 | 3.17 | `WITH -- Recursively get the base types of domains base_types AS ( WITH RECURSIVE recurse AS ( SELECT oid, typbasetype, typnamespace AS base_namespace, COALESCE(NULLIF(typbasetype, $2), oid) AS base_type FROM pg_type UNIO` |
| authenticator | ~110 | ~350 | 3.10 | `with recursive pks_fks as ( -- pk + fk referencing col select contype::text as contype, conname, array_length(conkey, $3) as ncol, conrelid as resorigtbl, col as resorigcol, ord from pg_constraint left join lateral unnes` |
| service_role | ~70 | ~350 | 5.27 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_batch_size" FROM json_to_record(pgrst_payload.json_data) AS _("p_batch_size" integer) LIMIT $4) pgrst_b` |
| authenticator | ~110 | ~330 | 2.96 | `with role_setting as ( select r.rolname, unnest(r.rolconfig) as setting from pg_auth_members m join pg_roles r on r.oid = m.roleid where member = current_user::regrole::oid ), kv_settings AS ( SELECT rolname, substr(sett` |
| service_role | ~60 | ~310 | 5.21 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_batch_size" FROM json_to_record(pgrst_payload.json_data) AS _("p_batch_size" integer) LIMIT $4) pgrst_b` |
| postgres | 1 | ~300 | 298.56 | `with f as ( -- CTE with sane arg_modes, arg_names, and arg_types. -- All three are always of the same length. -- All three include all args, including OUT and TABLE args. with functions as ( select *, -- proargmodes is n` |
| postgres | 6 | ~270 | 45.50 | `with extension_oids as ( select objid from pg_depend d WHERE d.refclassid = $1::regclass and d.classid = $2::regclass ), pg_proc_pre as ( select pp.*, pp.oid as p_oid -- 10_AND_EARLIER pp.oid as p_oid, case when pp.prois` |
| authenticator | ~110 | ~260 | 2.33 | `WITH pks_uniques_cols AS ( SELECT conrelid, array_agg(key order by key) as cols FROM pg_constraint, LATERAL unnest(conkey) AS _(key) WHERE contype IN ($1, $2) AND connamespace <> $3::regnamespace GROUP BY oid, conrelid )` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | idle | 2 |
| pgbouncer | idle | 1 |
| postgres | active | 1 |
| supabase_admin | idle | 3 |
| supabase_admin |  | 1 |
