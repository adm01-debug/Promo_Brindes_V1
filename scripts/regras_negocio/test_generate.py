"""Regressões offline do gerador de regras; não acessam banco nem APIs de LLM."""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("generate.py")
SPEC = importlib.util.spec_from_file_location("context_rules_generate", SCRIPT)
generator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generator)


class CurrentSqlSourcesTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="context-rules-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.files = []

    def write(self, name, content):
        file = self.root / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(content, encoding="utf-8")
        self.files.append(file)
        return file

    def schema(self):
        return generator.parse_sql_schema(self.root, self.files)

    def test_foreign_migration_cannot_replace_current_table(self):
        current = "supabase/migrations/20260101000000_orders.sql"
        self.write(current, "CREATE TABLE public.orders (id uuid, created_at timestamptz);")
        self.write("supabase/migrations/_foreign/another-project/20250101000000_orders.sql",
                   "CREATE TABLE public.orders (id uuid, changed_at timestamptz);")
        schema = self.schema()
        self.assertEqual([c["name"] for c in schema["tables"]["orders"]["columns"]], ["id", "created_at"])
        self.assertEqual(schema["tables"]["orders"]["src"], current)
        self.assertEqual(schema["sources"], [current])

    def test_superseded_migration_cannot_undo_current_changes(self):
        self.write("supabase/migrations/20260101000000_orders.sql", "CREATE TABLE public.orders (id uuid);")
        self.write("supabase/migrations/20260102000000_status.sql", "ALTER TABLE public.orders ADD COLUMN status text;")
        self.write("supabase/migrations/_superseded/20250101000000_orders.sql", "DROP TABLE public.orders;")
        schema = self.schema()
        self.assertIn("orders", schema["tables"])
        self.assertEqual([c["name"] for c in schema["tables"]["orders"]["columns"]], ["id", "status"])
        self.assertEqual(len(schema["sources"]), 2)

    def test_archived_objects_do_not_contribute_to_schema_or_rules(self):
        sql = """
CREATE TYPE order_state AS ENUM ('open', 'done');
CREATE TABLE public.orders (id uuid PRIMARY KEY, status order_state DEFAULT 'open', amount numeric CHECK (amount >= 0));
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_select ON public.orders FOR SELECT TO authenticated USING (true);
CREATE FUNCTION public.ensure_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'amount cannot be negative';
  RETURN NEW;
END;
$$;
CREATE TRIGGER ensure_order_before BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.ensure_order();
CREATE INDEX orders_status ON public.orders (status);
CREATE VIEW public.open_orders AS SELECT * FROM public.orders;
GRANT SELECT ON public.orders TO authenticated;
COMMENT ON TABLE public.orders IS 'Current orders';
SELECT cron.schedule('daily_orders', '0 0 * * *', $$SELECT 1$$);
"""
        self.write("supabase/migrations/20260101000000_orders.sql", sql)
        self.write("supabase/seed.sql", "INSERT INTO public.orders (id) VALUES ('current');")
        expected = self.schema()
        for key in ("tables", "policies", "triggers", "functions", "enums", "indexes", "cron_jobs",
                    "views", "rls", "grants", "raises", "seed", "comments"):
            self.assertTrue(expected[key], key)
        self.write("supabase/migrations/_foreign/old-project/20240101000000_schema.sql",
                   sql.replace("orders", "foreign_orders").replace("order_state", "foreign_state").replace("ensure_order", "ensure_foreign"))
        self.write("supabase/migrations/_superseded/20240102000000_seed.sql", "INSERT INTO public.orders (id) VALUES ('historical');")
        self.assertEqual(self.schema(), expected)

    def test_archive_only_repository_has_no_current_sql_schema(self):
        self.write("db/migrations/_foreign/old.sql", "CREATE TABLE old_foreign (id uuid);")
        self.write("db/migrations/_superseded/old.sql", "CREATE TABLE old_superseded (id uuid);")
        schema = self.schema()
        self.assertEqual(schema["sources"], [])
        self.assertEqual(schema["tables"], {})

    def test_exact_directory_names_leave_other_sql_sources_visible(self):
        # O nome de um diretório acima da raiz do repo não muda seu significado.
        self.root = self.root / "_foreign" / "project"
        paths = [
            "supabase/migrations/_foreign.sql",
            "supabase/migrations/_superseded.sql",
            "supabase/migrations/customer_foreign/active.sql",
            "supabase/migrations/_superseded_backup/active.sql",
            "packages/store/prisma/migrations/20260101/active.sql",
            "db/current.sql",
            "sql/current.sql",
            "database/current.sql",
            "prisma/current.sql",
            "custom/schema.sql",
        ]
        for index, name in enumerate(paths):
            self.write(name, f"CREATE TABLE current_{index} (id uuid);")
        schema = self.schema()
        self.assertEqual(schema["sources"], sorted(paths))
        self.assertEqual(set(schema["tables"]), {f"current_{i}" for i in range(len(paths))})

    def test_current_prisma_and_types_fallback_remain_available(self):
        self.write("prisma/schema.prisma", "model Store {\n id String @id\n}\n")
        self.write("src/database.types.ts", """
export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
        }
      }
    }
  }
}
""")
        schema = self.schema()
        self.assertEqual(set(schema["tables"]), {"Store", "customers"})
        self.assertEqual(schema["tables"]["Store"]["origin"], "prisma")
        self.assertEqual(schema["tables"]["customers"]["origin"], "types.ts")

    def test_archived_sql_is_not_current_code_but_remains_in_file_inventory(self):
        current = self.write("supabase/migrations/20260101000000_retention.sql", "SELECT now() - interval '7 days';")
        archived = self.write("supabase/migrations/_superseded/20250101000000_retention.sql", "SELECT now() - interval '365 days';")
        self.assertTrue(generator.analyze_code_file(current, self.root)["temporal"])
        self.assertIsNone(generator.analyze_code_file(archived, self.root))
        files = generator.walk_repo(self.root, self.root / "output")
        self.assertEqual(set(files), {current, archived})

    def test_cli_rules_profile_uses_current_schema_and_temporal_rules(self):
        current = "supabase/migrations/20260101000000_orders.sql"
        archived = "supabase/migrations/_superseded/20250101000000_orders.sql"
        self.write(current, "CREATE TABLE public.orders (id uuid, created_at timestamptz);\nSELECT now() - interval '7 days';")
        self.write(archived, "CREATE TABLE public.orders (id uuid, historical_status text);\nSELECT now() - interval '365 days';")
        subprocess.run([sys.executable, str(SCRIPT), "--repo", str(self.root), "--out", "output",
                        "--profile", "regras", "--no-pointer"], check=True, capture_output=True, text=True, timeout=30)
        context = json.loads((self.root / "output/context.json").read_text(encoding="utf-8"))
        self.assertEqual(context["schema"]["sources"], [current])
        self.assertEqual([c["name"] for c in context["schema"]["tables"]["orders"]["columns"]], ["id", "created_at"])
        self.assertEqual(context["rules"]["temporal"], [{"file": current, "line": "SELECT now() - interval '7 days';"}])
        self.assertIn(current, context["code_files"])
        self.assertNotIn(archived, context["code_files"])
        self.assertEqual(context["meta"]["files_total"], 2)
        rendered = (self.root / "output/07-REGRAS-DE-NEGOCIO.md").read_text(encoding="utf-8")
        self.assertIn("7 days", rendered)
        self.assertNotIn("365 days", rendered)
        self.assertNotIn("historical_status", rendered)
        self.assertFalse((self.root / "AGENTS.md").exists())


class SqlFixture(unittest.TestCase):
    """Migrations numeradas na ordem em que são escritas; o estado final é o que vale."""

    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="context-rules-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.files = []

    def migrate(self, sql):
        file = self.root / f"site-supabase/supabase/migrations/202601010000{len(self.files):02d}_m.sql"
        file.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(sql, bytes):
            file.write_bytes(sql)
        else:
            file.write_text(sql, encoding="utf-8")
        self.files.append(file)

    def schema(self):
        return generator.parse_sql_schema(self.root, self.files)

    def rules(self):
        return generator.collect_rules({}, self.schema(), {}, {}, {})

    def column_rules(self):
        return {(c["table"], c["column"]): c["rule"] for c in self.rules()["db_constraints"] if c["column"] != "(tabela)"}

    def table_rules(self):
        return [c["rule"] for c in self.rules()["db_constraints"] if c["column"] == "(tabela)"]


class SqlFinalStateTests(SqlFixture):
    def test_comment_markers_inside_strings_do_not_swallow_the_file(self):
        self.migrate("""
create table t (id int, note text default 'a;b -- not a comment /* nor this */');
-- create table ghost (id int);
/* create table ghost2 (id int); /* nested */ still a comment */
comment on table t is 'regra; com -- traço';
create function f() returns void language plpgsql as $fn$
begin
  -- don't break on this apostrophe
  execute $q$ create table inner_ghost (id int); $q$;
  perform E'it\\'s; fine';
end $fn$;
create table after_fn (id int);
""")
        schema = self.schema()
        self.assertEqual(list(schema["tables"]), ["t", "after_fn"])
        self.assertEqual(schema["tables"]["t"]["columns"][1]["type"], "text default 'a;b -- not a comment /* nor this */'")
        self.assertEqual(schema["tables"]["t"]["comment"], "regra; com -- traço")
        self.assertEqual(list(schema["functions"]), ["f"])

    def test_crlf_and_bom_do_not_change_the_result(self):
        sql = "create table t (\n  id int,\n  status text check (status in ('a','b'))\n);\nalter table t enable row level security;\n"
        self.migrate(sql)
        expected = self.schema()
        self.files = []
        self.migrate(("﻿" + sql.replace("\n", "\r\n")).encode("utf-8"))
        self.assertEqual(self.schema(), expected)
        self.assertEqual(self.rules()["state_machines"]["columns"][0]["allowed"], ["a", "b"])

    def test_alter_table_applies_every_comma_separated_action(self):
        self.migrate("create table t (id uuid, a int not null default 0, b text);")
        self.migrate("""
alter table t
  add column price numeric(10,2) default 0,
  add column if not exists delivery_state text check (delivery_state in ('delivered', 'bounced')),
  add column c text not null default 'x';
alter table t alter column a drop not null, alter column a set default timezone('utc', now()), alter column b set not null;
""")
        columns = {c["name"]: c["type"] for c in self.schema()["tables"]["t"]["columns"]}
        self.assertEqual(columns["price"], "numeric(10,2) default 0")
        self.assertEqual(columns["delivery_state"], "text check (delivery_state in ('delivered', 'bounced'))")
        self.assertEqual(columns["c"], "text not null default 'x'")
        self.assertEqual(columns["a"], "int default timezone('utc', now())")
        self.assertEqual(columns["b"], "text not null")
        state = {c["column"]: c["allowed"] for c in self.rules()["state_machines"]["columns"]}
        self.assertEqual(state, {"delivery_state": ["bounced", "delivered"]})

    def test_replacing_an_inline_check_drops_the_stale_rule(self):
        self.migrate("""
create table site_private.assets (
  mime_type text not null check (mime_type in ('image/png', 'application/pdf')),
  bucket text check (bucket = 'a'),
  email text unique,
  owner uuid references auth.users(id) on delete cascade,
  id uuid primary key
);""")
        self.migrate("""
alter table site_private.assets drop constraint if exists assets_mime_type_check;
alter table site_private.assets add constraint assets_mime_type_check check (mime_type in ('image/png'));
alter table site_private.assets
  drop constraint assets_bucket_check,
  add constraint assets_bucket_check check (bucket in ('a', 'b'));
alter table site_private.assets drop constraint assets_email_key;
alter table site_private.assets
  drop constraint assets_owner_fkey,
  add constraint assets_owner_fkey foreign key (owner) references auth.users(id) on delete set null;
""")
        rules = self.column_rules()
        self.assertEqual(rules[("site_private.assets", "mime_type")], "obrigatório")
        self.assertNotIn(("site_private.assets", "bucket"), rules)
        self.assertNotIn(("site_private.assets", "email"), rules)
        self.assertEqual(rules[("site_private.assets", "owner")], "FK → users.id on delete set null")
        self.assertEqual(self.table_rules(), [
            "constraint assets_mime_type_check check (mime_type in ('image/png'))",
            "constraint assets_bucket_check check (bucket in ('a', 'b'))",
            "constraint assets_owner_fkey foreign key (owner) references auth.users(id) on delete set null",
        ])
        self.assertNotIn("application/pdf", json.dumps(self.rules()["db_constraints"]))

    def test_readding_a_named_constraint_keeps_only_the_last_definition(self):
        self.migrate("create table t (kind text, constraint t_kind_check check (kind in ('a')));")
        self.migrate("alter table t add constraint t_kind_check check (kind in ('a', 'b'));")
        self.assertEqual(self.table_rules(), ["constraint t_kind_check check (kind in ('a', 'b'))"])

    def test_default_and_nested_check_are_reported_whole(self):
        self.migrate("""
create table t (
  retention_until timestamptz not null default (now() + interval '24 months'),
  label text default 'two words',
  note text check (note is null or (length(trim(note)) between 2 and 800)),
  size int check (size > 0) check (size < 10)
);""")
        rules = self.column_rules()
        self.assertEqual(rules[("t", "retention_until")], "default (now() + interval '24 months')")
        self.assertEqual(rules[("t", "label")], "default 'two words'")
        self.assertEqual(rules[("t", "note")], "CHECK note is null or (length(trim(note)) between 2 and 800)")
        self.assertEqual(rules[("t", "size")], "CHECK size > 0; CHECK size < 10")

    def test_long_inline_check_is_not_cut_in_the_middle(self):
        values = ", ".join(f"'value_{i:03d}'" for i in range(30))
        self.migrate(f"create table t (status text check (status in ({values})));")
        self.assertEqual(len(self.rules()["state_machines"]["columns"][0]["allowed"]), 30)

    def test_drop_table_removes_its_rules_and_accepts_a_list(self):
        self.migrate("""
create table site_private.a (id int); create table b (id int); create table c (id int);
alter table b enable row level security;
create policy p on b using (true);
create trigger tr before insert on b for each row execute function f();
create index i on b (id);
""")
        self.migrate("drop table if exists site_private.a, b cascade;")
        schema = self.schema()
        self.assertEqual(list(schema["tables"]), ["c"])
        for key in ("policies", "triggers", "indexes"):
            self.assertEqual(schema[key], [], key)
        self.assertEqual(schema["rls"], {})

    def test_create_table_if_not_exists_does_not_redefine_an_existing_table(self):
        self.migrate("create table t (id int, status text);")
        self.migrate("create table if not exists t (other int);")
        self.assertEqual([c["name"] for c in self.schema()["tables"]["t"]["columns"]], ["id", "status"])

    def test_policy_final_state_follows_alter_and_drop(self):
        self.migrate("""
create table t (id int);
create policy "Users can read; own" on public.t for select using (auth.uid() = id);
create policy p2 on t for all to authenticated using (true) with check (false);
create policy p3 on t as restrictive for update to anon, authenticated using ((a = 1) and (b in (select x from y where z = ')')));
""")
        self.migrate("""
drop policy p2 on t;
alter policy p3 on t to authenticated using (false);
alter policy p3 on t rename to p3b;
drop policy if exists "Users can read; own" on public.t;
""")
        policies = [{k: p[k] for k in ("name", "cmd", "roles", "mode", "using", "check")} for p in self.schema()["policies"]]
        self.assertEqual(policies, [{"name": "p3b", "cmd": "UPDATE", "roles": "authenticated", "mode": "restrictive", "using": "false", "check": ""}])

    def test_rls_enable_and_force_are_independent_flags(self):
        self.migrate("create table a (id int); create table b (id int); create table c (id int); create table d (id int);")
        self.migrate("""
alter table a force row level security;
alter table b enable row level security; alter table b force row level security; alter table b enable row level security;
alter table c enable row level security; alter table c force row level security; alter table c disable row level security;
alter table d enable row level security; alter table d force row level security; alter table d no force row level security;
""")
        self.assertEqual(self.schema()["rls"], {"b": "forced", "c": "disabled", "d": "enabled"})

    def test_raise_exception_using_message_is_a_business_rule(self):
        self.migrate("""
create function public.f() returns void language plpgsql as $$
begin
  raise exception using errcode = '22023', message = 'invalid_retention_batch_size';
  raise exception 'plain %; with semicolon', 1;
  raise exception using message = format('dynamic %s', v), errcode = 'P0001';
  raise sqlstate 'P0002' using message = 'by_sqlstate';
  raise notice 'only a notice';
  raise warning using message = 'only a warning';
  raise;
end $$;""")
        schema = self.schema()
        self.assertEqual([r["msg"] for r in schema["raises"]],
                         ["invalid_retention_batch_size", "plain %; with semicolon", "(dinâmica) format('dynamic %s', v)", "by_sqlstate"])
        self.assertEqual(schema["functions"]["f"]["raises"], [r["msg"] for r in schema["raises"]])

    def test_dropping_an_old_overload_keeps_the_function(self):
        self.migrate("create function public.get_selection(p_token uuid) returns jsonb language sql as $$ select '{}'::jsonb $$;")
        self.migrate("""
create or replace function public.get_selection(p_token uuid, p_identifier_hash text) returns jsonb language plpgsql security definer set search_path = '' as $$
begin raise exception using message = 'rate_limited'; end $$;
drop function public.get_selection(uuid);
""")
        schema = self.schema()
        self.assertEqual(schema["functions"]["get_selection"]["args"], "p_token uuid, p_identifier_hash text")
        self.assertTrue(schema["functions"]["get_selection"]["security_definer"])
        self.assertEqual([r["msg"] for r in schema["raises"]], ["rate_limited"])
        self.migrate("drop function if exists public.get_selection(uuid, text), public.unknown();")
        self.assertEqual(self.schema()["functions"], {})
        self.assertEqual(self.schema()["raises"], [])

    def test_single_quoted_function_body_is_a_function(self):
        self.migrate("create function h() returns int language sql security definer as 'select 1';")
        self.assertTrue(self.schema()["functions"]["h"]["security_definer"])

    def test_trigger_with_column_list_is_kept(self):
        self.migrate("""
create table t (status text, lease_token uuid, attempts int);
drop trigger if exists enforce_lease on t;
create trigger enforce_lease before update of status, lease_token, attempts on t
  for each row when ((old.status is distinct from new.status) or (old.attempts <> new.attempts)) execute function f();
""")
        trigger = self.schema()["triggers"][0]
        self.assertEqual(trigger["when"], "BEFORE UPDATE OF STATUS, LEASE_TOKEN, ATTEMPTS")
        self.assertEqual(trigger["condition"], "(old.status is distinct from new.status) or (old.attempts <> new.attempts)")

    def test_enum_values_may_contain_commas_and_quotes(self):
        self.migrate("create type st as enum ('a', 'b,c', 'd''e');")
        self.assertEqual(self.schema()["enums"], {"st": ["a", "b,c", "d'e"]})
        self.migrate("drop type st;")
        self.assertEqual(self.schema()["enums"], {})

    def test_identifier_columns_are_not_status_columns(self):
        self.migrate("create table t (delivery_state text, delivery_state_source_event_id uuid, status_changed_at timestamptz, order_status text);")
        self.assertEqual([c["column"] for c in self.rules()["state_machines"]["columns"]], ["delivery_state", "order_status"])

    def test_transition_table_rows_are_the_declared_state_machine(self):
        self.migrate("""
create table site_private.status_transitions (entity text not null, from_status text not null, to_status text not null);
insert into site_private.status_transitions (entity, from_status, to_status) values
  ('quote_requests', 'new', 'triaged'),
  ('quote_requests', 'new', 'closed'),
  ('quote_requests', 'triaged', 'closed');
create table site_private.quote_requests (status text check (status in ('new', 'triaged', 'closed')));
create table site_private.other (status text check (status in ('a', 'b')));
""")
        self.migrate("""
insert into site_private.status_transitions (entity, from_status, to_status) values
  ('quote_requests', 'new', 'triaged'),
  ('deliveries', 'pending', 'it''s done')
on conflict do nothing;
""")
        schema = self.schema()
        self.assertEqual([(t["scope"], t["from"], t["to"]) for t in schema["transitions"]], [
            ("entity=quote_requests", "new", "triaged"), ("entity=quote_requests", "new", "closed"),
            ("entity=quote_requests", "triaged", "closed"), ("entity=deliveries", "pending", "it's done")])
        self.assertEqual(schema["transition_notes"], [])
        rules = generator.collect_rules({}, schema, {}, {}, {})
        docs = {"manual": []}
        meta = {"sha": "", "branch": "", "generated_at": "agora"}
        rendered = generator.render_rules(meta, rules, docs, schema)
        self.assertIn("| `site_private.status_transitions` | `entity=quote_requests` | `new` | `triaged`, `closed` |", rendered)
        access = {"risky": [], "money_float": [], "tenant_missing": [], "tenant_key": "", "roles": []}
        dataflow = {"columns_unknown": [], "tables_only_in_code": [], "invokes": {}, "rpc": {}, "dynamic_from": [], "tables": {}}
        gaps = generator.build_audit({}, schema, {"edge_functions": []}, dataflow, rules, access, docs)["gaps"]
        self.assertFalse([g for g in gaps if "quote_requests.status" in g])
        self.assertTrue([g for g in gaps if "site_private.other.status" in g and "nenhum mapa de transições" in g])
        self.migrate("delete from site_private.status_transitions where entity = 'deliveries';")
        self.assertEqual([n["table"] for n in self.schema()["transition_notes"]], ["site_private.status_transitions"])

    def test_bypassrls_roles_are_tracked_to_their_final_state(self):
        self.migrate("""
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'site_api') then
    create role site_api nologin noinherit bypassrls;
  end if;
end $$;
create role worker bypassrls;
alter role site_api set statement_timeout = '8s';
""")
        self.migrate("alter role worker nobypassrls;")
        self.assertEqual([b["role"] for b in self.schema()["bypassrls_roles"]], ["site_api"])

    def test_cron_index_and_view_follow_later_drops(self):
        self.migrate("""
create table t (id int);
select cron.schedule('nightly', '0 3 * * *', $$select 1$$);
select cron.schedule('hourly', '0 * * * *', 'select 2');
-- select cron.schedule('commented', '* * * * *', 'select 3');
create index i1 on t (id); create index i2 on t (id);
create view v as select 1;
""")
        self.migrate("select cron.unschedule('nightly'); drop index if exists i1; drop view v; create index i2 on t (id);")
        schema = self.schema()
        self.assertEqual([j["job"] for j in schema["cron_jobs"]], ["hourly"])
        self.assertEqual([i["name"] for i in schema["indexes"]], ["i2"])
        self.assertEqual(schema["views"], {})

    def test_migrations_apply_in_filename_order_whatever_the_discovery_order(self):
        self.migrate("create table t (id int, status text);")
        self.migrate("alter table t drop column status;")
        self.migrate("alter table t add column status text check (status in ('a'));")
        expected = self.schema()
        self.files.reverse()
        self.assertEqual(self.schema(), expected)
        self.assertEqual(expected["tables"]["t"]["columns"][-1]["type"], "text check (status in ('a'))")

    def test_unreadable_migration_is_reported_instead_of_silently_skipped(self):
        self.migrate("create table t (id int);")
        self.migrate("create table huge (id int); -- " + "x" * 400)
        limit = generator.MAX_SQL_BYTES
        generator.MAX_SQL_BYTES = 200
        self.addCleanup(setattr, generator, "MAX_SQL_BYTES", limit)
        schema = self.schema()
        self.assertEqual(list(schema["tables"]), ["t"])
        self.assertEqual(schema["unread_sources"], ["site-supabase/supabase/migrations/20260101000001_m.sql"])
        rules = generator.collect_rules({}, schema, {}, {}, {})
        access = {"risky": [], "money_float": [], "tenant_missing": [], "tenant_key": "", "roles": []}
        dataflow = {"columns_unknown": [], "tables_only_in_code": [], "invokes": {}, "rpc": {}, "dynamic_from": [], "tables": {}}
        gaps = generator.build_audit({}, schema, {"edge_functions": []}, dataflow, rules, access, {"manual": []})["gaps"]
        self.assertTrue([g for g in gaps if "não foram lidos" in g and "20260101000001_m.sql" in g])

    def test_migration_named_seed_still_contributes_schema(self):
        self.migrate("create table t (id int);")
        seed = self.root / "site-supabase/supabase/migrations/20260102000000_seed_plans.sql"
        seed.write_text("create table plans (id int); insert into plans (id) values (1);", encoding="utf-8")
        self.files.append(seed)
        schema = self.schema()
        self.assertEqual(set(schema["tables"]), {"t", "plans"})
        self.assertEqual([s["table"] for s in schema["seed"]], ["plans"])


class CodeHeuristicsTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="context-rules-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)

    def analyze(self, name, content):
        file = self.root / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(content, encoding="utf-8")
        return generator.analyze_code_file(file, self.root)

    def test_numeric_constants_keep_their_whole_value(self):
        info = self.analyze("api/limits.ts", """
export const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ASSET_BYTES = 10 * 1024 * 1024; // 10 MB
export const QUEUE_AGE_ALERT_SECONDS = 45 * 60
const WINDOW_MS = 5 * MINUTE;
const BUCKET = 'customer-briefing-assets';
const NEGATIVE = -1;
""")
        self.assertEqual({p["name"]: p["value"] for p in info["params"]}, {
            "REQUEST_TIMEOUT_MS": "10_000", "MAX_ASSET_BYTES": "10 * 1024 * 1024", "QUEUE_AGE_ALERT_SECONDS": "45 * 60",
            "WINDOW_MS": "5 * MINUTE", "BUCKET": "'customer-briefing-assets'", "NEGATIVE": "-1"})

    def test_jsx_role_alert_is_not_an_error_message(self):
        info = self.analyze("src/pages/Page.tsx", """
export function Page() {
  if (bad) { alert("Falha ao salvar o item"); window.alert('Outra falha aqui'); toast.error("Erro do toast"); }
  return <div role="alert">{error}</div>}<button className="primary">Ok</button>;
}
""")
        self.assertEqual(info["errors"], ["Erro do toast", "Falha ao salvar o item", "Outra falha aqui"])

    def test_typeof_and_promise_states_are_not_status_values(self):
        info = self.analyze("api/events.ts", """
if (typeof status !== 'object' || typeof event.status === 'string') return null;
if (result.status === 'fulfilled' || result.status === 'rejected') count += 1;
if (delivery.status === 'delivered') done();
""")
        self.assertEqual([(v["field"], v["value"]) for v in info["status_values"]], [("status", "delivered")])

    def test_allowlist_is_not_a_transition_map(self):
        info = self.analyze("src/lib/analytics.ts", """
const ALLOWED_PROPERTIES = { search_started: ['source'] };
export const ALLOWED_STATUS_TRANSITIONS = { new: ['triaged'], triaged: ['closed'] };
const NEXT_STATUS = { open: ['done'] };
""")
        self.assertEqual([m["name"] for m in info["transition_maps"]], ["ALLOWED_STATUS_TRANSITIONS", "NEXT_STATUS"])

    def test_provider_event_map_keys_are_webhook_events(self):
        info = self.analyze("api/notification-events.ts", """
type ResendEventType = 'delivered' | 'bounced';
const EVENT_TYPE_MAP: Record<string, ResendEventType> = {
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
};
const LABELS = { 'not.an_event': 'x' };
switch (payload.type) { case 'invoice.paid': break; }
""")
        self.assertEqual(info["webhook_events"], ["email.bounced", "email.delivered", "invoice.paid"])

    def test_top_level_test_folders_are_test_code(self):
        for path in ("tests/queue.node.mjs", "e2e/smoke.ts", "__tests__/a.ts", "src/lib/a.test.ts", "site-supabase/supabase/tests/database/a.sql"):
            self.assertTrue(generator.is_test_file(path), path)
        for path in ("src/latest/a.ts", "src/contests/a.ts", "api/attestation.ts"):
            self.assertFalse(generator.is_test_file(path), path)

    def test_pgtap_descriptions_are_read_as_specification(self):
        info = self.analyze("site-supabase/supabase/tests/database/status.test.sql", """
begin;
select plan(3);
select has_column('site_private', 'events', 'sequence', 'eventos têm coluna; de ordem');
select throws_ok($$ update site_private.q set status = 'quoted' $$, '22023', null, 'rejeita new -> quoted');
select is((select count(*) from t), 2::bigint, 'conta ''duas'' linhas');
-- select ok(true, 'asserção comentada');
select * from finish();
rollback;
""")
        self.assertTrue(info["is_test"])
        self.assertEqual(info["tests"], ["eventos têm coluna; de ordem", "rejeita new -> quoted", "conta 'duas' linhas"])


class CliTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="context-rules-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name) / "repo"
        self.root.mkdir()

    def write(self, name, content):
        file = self.root / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(content, encoding="utf-8")

    def run_cli(self, *args, repo=None):
        return subprocess.run([sys.executable, str(SCRIPT), "--repo", str(repo or self.root), *args],
                              capture_output=True, text=True, timeout=60)

    def project(self):
        self.write("vercel.json", '{"crons": [{"path": "/api/retention", "schedule": "0 3 * * *"}]}')
        self.write("api/retention.ts", "export default function handler(request) { if (request.method !== 'GET') return; }\n")
        self.write("api/_lib/siteDatabase.ts", "export const key = process.env.SITE_SUPABASE_SERVICE_ROLE_KEY;\n")
        self.write("src/lib/account.ts", "export async function load(c) { return c.from('orders').select('id, status').eq('status', 'open'); }\n")
        self.write("tests/fixture.node.mjs", "test('fixture de teste', () => { c.from('ghost_table').select('nope'); c.rpc('ghost_rpc'); c.functions.invoke('ghost-edge'); });\n"
                                             "const el = <Route path=\"/app\" element={<ProtectedRoute><App /></ProtectedRoute>} />;\n")
        self.write("scripts/tool.mjs", "c.from(tableName); c.rpc('tool_rpc'); c.from('tool_table').select('x');\n")
        self.write("site-supabase/supabase/migrations/20260101000000_init.sql", """
create role site_api nologin bypassrls;
create table site_private.orders (id uuid primary key, status text not null default 'open' check (status in ('open', 'done')));
alter table site_private.orders enable row level security;
alter table site_private.orders force row level security;
grant select on site_private.orders to service_role;
create policy assets_select_own on storage.objects for select to authenticated using (bucket_id = 'assets');
""")

    def test_rules_profile_describes_only_the_system(self):
        self.project()
        result = self.run_cli("--out", "docs/contexto/regras", "--profile", "regras", "--schema-snapshot", "docs/contexto/supabase", "--no-pointer")
        self.assertEqual(result.returncode, 0, result.stderr)
        out = self.root / "docs/contexto/regras"
        context = json.loads((out / "context.json").read_text(encoding="utf-8"))
        # fixtures de tests/ e scripts/ (ghost_table, ghost_rpc, ghost-edge, tool_rpc, .from(variável)) não viram inconsistência
        self.assertEqual([(i["kind"], i["where"]) for i in context["audit"]["issues"]], [("rls", ["src/lib/account.ts"])])
        self.assertFalse([g for g in context["audit"]["gaps"] if "sem migration no repo" in g])
        self.assertEqual(context["access"]["protected_routes"], [])
        self.assertEqual(context["access"]["service_role_files"], ["api/_lib/siteDatabase.ts"])
        self.assertEqual(context["access"]["serverless"], [{"route": "/api/retention", "file": "api/retention.ts", "cron": "0 3 * * *", "methods": ["GET"]}])
        self.assertEqual([t["file"] for t in context["rules"]["tests"]], ["tests/fixture.node.mjs"])
        access = (out / "10-ACESSO-E-SEGURANCA.md").read_text(encoding="utf-8")
        self.assertIn("só role com BYPASSRLS (service_role, site_api) ou função SECURITY DEFINER acessa", access)
        self.assertIn("- `site_api` — `site-supabase/supabase/migrations/20260101000000_init.sql`", access)
        self.assertIn("| `storage.objects` | tabela de fora do repo | authenticated: bucket_id = 'assets' | sem política no repo |", access)
        self.assertIn("| /api/retention | `api/retention.ts` | GET | `0 3 * * *` |", access)
        self.assertNotIn("ninguém além de service_role", access)
        rules = (out / "07-REGRAS-DE-NEGOCIO.md").read_text(encoding="utf-8")
        for rendered in (access, rules):
            # o perfil regras não escreve o 06: a referência tem de levar a algo que existe
            self.assertNotIn("`06`", rendered)
        self.assertIn("schema real em `docs/contexto/supabase/`", rules)
        manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["schema_real_em"], "")
        self.assertEqual(manifest["arquivos"], ["07-REGRAS-DE-NEGOCIO.md", "10-ACESSO-E-SEGURANCA.md", "11-GLOSSARIO-E-LACUNAS.md", "context.json"])

    def test_manual_rules_with_bom_crlf_and_accents_are_rendered_and_never_rewritten(self):
        self.project()
        manual = self.root / "docs/contexto/regras/manual/regras.md"
        manual.parent.mkdir(parents=True)
        raw = "\ufeff## Exceções comerciais\r\n\r\nOrçamento não tem preço; só o comercial aprova.\r\n".encode("utf-8")
        manual.write_bytes(raw)
        result = self.run_cli("--out", "docs/contexto/regras", "--profile", "regras", "--no-pointer")
        self.assertEqual(result.returncode, 0, result.stderr)
        rendered = (self.root / "docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md").read_bytes().decode("utf-8")
        self.assertIn("### regras.md\n\n## Exceções comerciais\n\nOrçamento não tem preço; só o comercial aprova.\n", rendered)
        self.assertNotIn("\r", rendered)
        self.assertNotIn("\ufeff", rendered)
        self.assertEqual(manual.read_bytes(), raw)
        self.assertIn("- `manual/regras.md`", (self.root / "docs/contexto/regras/11-GLOSSARIO-E-LACUNAS.md").read_text(encoding="utf-8"))

    def test_two_runs_differ_only_by_the_declared_timestamp(self):
        self.project()
        outputs = []
        for name in ("one", "two"):
            result = self.run_cli("--out", f"../{name}", "--profile", "regras", "--no-pointer")
            self.assertEqual(result.returncode, 0, result.stderr)
            out = self.root.parent / name
            context = json.loads((out / "context.json").read_text(encoding="utf-8"))
            stamp = context["meta"].pop("generated_at")
            outputs.append({"context": context, **{p.name: p.read_text(encoding="utf-8").replace(stamp, "") for p in sorted(out.glob("*.md"))}})
        self.assertEqual(outputs[0], outputs[1])

    def test_missing_output_and_profile_change_are_regenerated(self):
        self.project()
        args = ("--out", "out", "--no-pointer")
        self.assertEqual(self.run_cli(*args, "--profile", "regras").returncode, 0)
        unchanged = self.run_cli(*args, "--profile", "regras")
        self.assertIn("nada mudou", unchanged.stderr)
        (self.root / "out/07-REGRAS-DE-NEGOCIO.md").unlink()
        healed = self.run_cli(*args, "--profile", "regras")
        self.assertEqual(healed.returncode, 0, healed.stderr)
        self.assertTrue((self.root / "out/07-REGRAS-DE-NEGOCIO.md").is_file())
        self.assertEqual(self.run_cli(*args, "--profile", "full").returncode, 0)
        self.assertTrue((self.root / "out/06-BANCO-DE-DADOS.md").is_file())
        self.assertIn("schema real em `06`", (self.root / "out/07-REGRAS-DE-NEGOCIO.md").read_text(encoding="utf-8"))
        self.assertEqual(self.run_cli(*args, "--profile", "regras", "--check").returncode, 1)

    def test_invalid_locations_fail_before_writing_anything(self):
        self.project()
        missing = self.root.parent / "does-not-exist"
        result = self.run_cli("--out", "out", "--profile", "regras", "--no-pointer", repo=missing)
        self.assertEqual(result.returncode, 2)
        self.assertIn("não é um diretório existente", result.stderr)
        self.assertFalse(missing.exists())
        before = sorted(p.name for p in self.root.iterdir())
        for out in ("", ".", ".."):
            result = self.run_cli("--out", out, "--profile", "regras", "--no-pointer")
            self.assertEqual(result.returncode, 2, out)
        result = self.run_cli("--out", "vercel.json", "--profile", "regras", "--no-pointer")
        self.assertEqual(result.returncode, 2)
        result = self.run_cli("--out", "out", "--profile", "regras", "--no-pointer", "--schema-snapshot", "../outside")
        self.assertEqual(result.returncode, 2)
        self.assertIn("sai do repositório", result.stderr)
        self.assertEqual(sorted(p.name for p in self.root.iterdir()), before)

    def test_existing_snapshot_folder_is_recorded_in_the_manifest(self):
        self.project()
        (self.root / "docs/contexto/supabase").mkdir(parents=True)
        result = self.run_cli("--out", "docs/contexto/regras", "--profile", "regras", "--no-pointer", "--schema-snapshot", "docs/contexto/supabase/")
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = json.loads((self.root / "docs/contexto/regras/manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["schema_real_em"], "docs/contexto/supabase")


def load_tests(loader, tests, pattern):
    """`npm run contexto:regras:test` roda este arquivo: os testes do índice e do publicador vêm junto."""
    for name in ("test_indice.py", "test_publish.py"):
        sibling = Path(__file__).with_name(name)
        if sibling.is_file():
            spec = importlib.util.spec_from_file_location(sibling.stem, sibling)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            tests.addTests(loader.loadTestsFromModule(module))
    return tests


if __name__ == "__main__":
    unittest.main()
