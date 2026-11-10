#!/usr/bin/env python3
"""Regressões offline: uma coleta parcial não pode destruir o SQL já publicado."""

from __future__ import annotations

import ast
import contextlib
import copy
import datetime as dt
import importlib.util
import io
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
import urllib.error
import urllib.parse
from unittest import mock


OFFLINE_DB_URL = "postgresql://offline:fixture-password@localhost:5432/offline"


class OfflineConnection:
    def __init__(self):
        self.commands = []  # tudo o que foi enviado: ("BEGIN" | "COMMIT" | "ROLLBACK" | SQL)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, command):
        if not command.startswith("SET "):
            raise AssertionError("O teste offline não permite consultas ao banco")
        self.commands.append(command)

    @contextlib.contextmanager
    def transaction(self):
        self.commands.append("BEGIN")
        try:
            yield
        except BaseException:
            self.commands.append("ROLLBACK")
            raise
        self.commands.append("COMMIT")

    def rollback(self):
        pass


def function(name="demo", value=1):
    return {
        "schema": "public", "name": name, "args": "", "returns": "integer",
        "language": "sql", "kind": "function", "is_trigger_fn": False,
        "security_definer": False, "volatility": "v", "config": [],
        "execute_api_roles": ["authenticated"], "execute_public": False,
        "definition": f"CREATE FUNCTION public.{name}() RETURNS integer LANGUAGE sql AS $$ SELECT {value} $$;",
    }


def migration(version="20260101000000", name="demo", statements=None):
    return {
        "version": version, "name": name,
        "statements": statements if statements is not None else [
            "CREATE TABLE public.demo_table (id integer);",
            "CREATE INDEX demo_id ON public.demo_table (id);",
        ],
    }


def structural_records(records):
    return [{k: v for k, v in row.items() if k != "callers"} for row in records] if records is not None else None


SCRIPT = pathlib.Path(__file__).with_name("snapshot.py")


def load_snapshot(env, *, name="snapshot_loaded", driver_available=True):
    """Carrega o script com um ambiente próprio e um driver falso (ou ausente)."""
    driver = types.ModuleType("psycopg")
    driver.connect = mock.Mock(side_effect=AssertionError("Conexão real proibida no teste"))
    rows = types.ModuleType("psycopg.rows")
    rows.dict_row = object()
    modules = {"psycopg": driver, "psycopg.rows": rows} if driver_available else {"psycopg": None, "psycopg.rows": None}
    spec = importlib.util.spec_from_file_location(name, SCRIPT)
    module = importlib.util.module_from_spec(spec)
    with mock.patch.dict(sys.modules, modules):
        with mock.patch.dict(os.environ, env, clear=True):
            spec.loader.exec_module(module)
    return module


def run_main(snapshot, argv=None):
    """Executa main() capturando stdout e stderr; devolve (código, stdout, stderr)."""
    with contextlib.redirect_stdout(io.StringIO()) as out, contextlib.redirect_stderr(io.StringIO()) as err:
        code = snapshot.main(argv) if argv is not None else snapshot.main()
    return code, out.getvalue(), err.getvalue()


def tree(root):
    return {path.relative_to(root).as_posix(): path.read_bytes() for path in sorted(root.rglob("*")) if path.is_file()}


class SnapshotFixture(unittest.TestCase):
    extra_env: dict[str, str] = {}

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="snapshot-sql-test-")
        self.addCleanup(self.temp.cleanup)
        self.out = pathlib.Path(self.temp.name) / "output"

        # Nem driver instalado nem credenciais são necessários. Qualquer tentativa real falha.
        driver = types.ModuleType("psycopg")
        driver.connect = mock.Mock(side_effect=AssertionError("Conexão real proibida no teste"))
        rows = types.ModuleType("psycopg.rows")
        rows.dict_row = object()
        spec = importlib.util.spec_from_file_location("snapshot_tested", pathlib.Path(__file__).with_name("snapshot.py"))
        self.snapshot = importlib.util.module_from_spec(spec)
        env = {
            "SUPABASE_DB_URL": OFFLINE_DB_URL, "SNAPSHOT_DIR": str(self.out),
            "PGDUMP": "false", "GEN_TYPES": "false", "REPO_ROOT": "", **self.extra_env,
        }
        with mock.patch.dict(sys.modules, {"psycopg": driver, "psycopg.rows": rows}):
            with mock.patch.dict(os.environ, env, clear=True):
                spec.loader.exec_module(self.snapshot)

        self.source_files = [("src/client.ts", "supabase.rpc('demo')")]

    def collect(self, *, failures=(), functions=None, migrations=None):
        snapshot = self.snapshot
        snapshot.ERRORS.clear()
        snapshot.CARRIED.clear()
        snapshot._SLUG_SEEN.clear()
        records = {
            "server": {"server_version": "offline-fixture"},
            "functions": [function()] if functions is None else functions,
            "migrations": [migration()] if migrations is None else migrations,
        }

        def section(name):
            @snapshot.section(name)
            def collect_section(_conn):
                if name in failures:
                    raise PermissionError(f"Falha simulada na seção {name}")
                return copy.deepcopy(records[name])
            return collect_section

        snapshot.DB_SECTIONS = [section(name) for name in records]
        with mock.patch.object(snapshot.psycopg, "connect", return_value=OfflineConnection()):
            with mock.patch.object(snapshot, "scan_code_files", return_value=self.source_files):
                with mock.patch.object(snapshot.urllib.request, "urlopen", side_effect=AssertionError("HTTP proibido no teste")):
                    with mock.patch.object(snapshot.subprocess, "run", side_effect=AssertionError("Comando externo proibido no teste")):
                        with contextlib.redirect_stdout(io.StringIO()):
                            return snapshot.main()

    def metadata(self):
        return json.loads((self.out / "snapshot.json").read_text(encoding="utf-8"))

    def function_sql(self, name="demo"):
        return self.out / "functions" / "public" / f"{name}__{self.snapshot.sha('')}.sql"

    def migration_sql(self, version="20260101000000", name="demo"):
        return self.out / "migrations" / f"{version}_{name}.sql"

    def error_sections(self):
        return {error["section"] for error in self.metadata()["errors"]}


class SnapshotSQLRecoveryTests(SnapshotFixture):
    def test_output_marker_is_created_preserved_and_recovers_legacy_snapshot(self):
        self.out.mkdir()  # diretório existente e vazio também é um alvo novo válido.
        self.assertEqual(self.collect(), 0)
        marker = self.out / self.snapshot.OUTPUT_MARKER
        self.assertEqual(marker.read_text(encoding="utf-8"), self.snapshot.OUTPUT_MARKER_CONTENT)
        marker.unlink()  # snapshot.json v2 identifica uma saída legítima anterior ao marcador.
        self.assertEqual(self.collect(), 0)
        self.assertEqual(marker.read_text(encoding="utf-8"), self.snapshot.OUTPUT_MARKER_CONTENT)

    def test_unowned_nonempty_output_is_rejected_before_collection(self):
        unowned = pathlib.Path(self.temp.name) / "unowned"
        unowned.mkdir()
        sentinel = unowned / "user.txt"
        sentinel.write_text("não apagar", encoding="utf-8")
        self.snapshot.OUT = unowned
        with mock.patch.object(self.snapshot, "introspect_db", side_effect=AssertionError("coleta proibida")):
            with contextlib.redirect_stderr(io.StringIO()) as stderr:
                self.assertEqual(self.snapshot.main(), 2)
        self.assertIn("sem marcador/snapshot válido", stderr.getvalue())
        self.assertEqual(sentinel.read_text(encoding="utf-8"), "não apagar")
        self.assertFalse((unowned / self.snapshot.OUTPUT_MARKER).exists())

    def test_broad_output_paths_are_rejected_before_collection(self):
        cwd = pathlib.Path.cwd().resolve()
        unsafe = {pathlib.Path(cwd.anchor).resolve(), pathlib.Path.home().resolve(), cwd, cwd.parent}
        for path in unsafe:
            with self.subTest(path=path):
                self.snapshot.OUT = path
                with mock.patch.object(self.snapshot, "introspect_db", side_effect=AssertionError("coleta proibida")):
                    with contextlib.redirect_stderr(io.StringIO()) as stderr:
                        self.assertEqual(self.snapshot.main(), 2)
                self.assertIn("SNAPSHOT_DIR inseguro", stderr.getvalue())

    def test_successful_collection_writes_full_sql_with_compact_metadata(self):
        self.assertEqual(self.collect(), 0)
        self.assertEqual(self.function_sql().read_text().strip(), function()["definition"])
        self.assertEqual(self.migration_sql().read_text().strip(), "\n\n".join(migration()["statements"]))
        metadata = self.metadata()
        self.assertIsNone(metadata["db"]["functions"][0]["definition"])
        self.assertEqual(metadata["db"]["migrations"][0]["statements"], 2)
        self.assertEqual(metadata["errors"], [])

    def test_repeated_failures_preserve_sql_counts_hashes_and_db_callers(self):
        self.assertEqual(self.collect(), 0)
        original_function = self.function_sql().read_bytes()
        original_migration = self.migration_sql().read_bytes()
        original_metadata = self.metadata()["db"]
        self.source_files = []

        for _ in range(2):
            self.assertEqual(self.collect(failures={"functions", "migrations"}), 0)
            self.assertEqual(self.function_sql().read_bytes(), original_function)
            self.assertEqual(self.migration_sql().read_bytes(), original_migration)
            metadata = self.metadata()
            self.assertEqual(structural_records(metadata["db"]["functions"]), structural_records(original_metadata["functions"]))
            self.assertEqual(metadata["db"]["functions"][0]["callers"]["db"], original_metadata["functions"][0]["callers"]["db"])
            self.assertEqual(metadata["db"]["functions"][0]["callers"]["code"], [])
            self.assertEqual(metadata["db"]["migrations"], original_metadata["migrations"])
            self.assertEqual(set(metadata["carried"]), {"functions", "migrations"})
            self.assertEqual(self.error_sections(), {"functions", "migrations"})
            for name in ("functions", "migrations"):
                self.assertIn("versão anterior", (self.out / f"{name}.md").read_text())
            for name in ("functions.md", "README.md"):
                document = (self.out / name).read_text()
                self.assertIn("| código do repo | coleta atual |", document)
                self.assertIn("| outras funções | coleta anterior; corpos SQL não atualizados |", document)

    def test_failed_functions_allow_healthy_migrations_to_update(self):
        self.collect()
        old_function = self.function_sql().read_bytes()
        statements = ["ALTER TABLE public.demo_table ADD COLUMN name text;"]
        self.assertEqual(self.collect(failures={"functions"}, migrations=[migration(statements=statements)]), 0)
        self.assertEqual(self.function_sql().read_bytes(), old_function)
        self.assertEqual(self.migration_sql().read_text().strip(), statements[0])
        self.assertEqual(self.metadata()["carried"], ["functions"])

    def test_failed_migrations_allow_healthy_functions_to_update(self):
        self.collect()
        old_migration = self.migration_sql().read_bytes()
        changed = function(value=2)
        self.assertEqual(self.collect(failures={"migrations"}, functions=[changed]), 0)
        self.assertEqual(self.function_sql().read_text().strip(), changed["definition"])
        self.assertEqual(self.migration_sql().read_bytes(), old_migration)
        self.assertEqual(self.metadata()["carried"], ["migrations"])

    def test_next_healthy_collection_replaces_sql_and_prunes_removed_objects(self):
        obsolete_migration = migration("20260102000000", "obsolete")
        self.collect(functions=[function(), function("obsolete")], migrations=[migration(), obsolete_migration])
        self.collect(failures={"functions", "migrations"})
        self.assertTrue(self.function_sql("obsolete").is_file())
        self.assertTrue(self.migration_sql("20260102000000", "obsolete").is_file())

        changed = function(value=3)
        statements = ["ALTER TABLE public.demo_table ADD COLUMN enabled boolean;"]
        self.assertEqual(self.collect(functions=[changed], migrations=[migration(statements=statements)]), 0)
        self.assertFalse(self.function_sql("obsolete").exists())
        self.assertFalse(self.migration_sql("20260102000000", "obsolete").exists())
        self.assertEqual(self.function_sql().read_text().strip(), changed["definition"])
        self.assertEqual(self.migration_sql().read_text().strip(), statements[0])
        self.assertEqual(self.metadata()["carried"], [])
        self.assertEqual(self.metadata()["errors"], [])
        self.assertNotIn("versão anterior", (self.out / "functions.md").read_text())

    def test_missing_previous_sql_is_reported_without_fake_content_or_links(self):
        self.collect()
        original_migrations = self.metadata()["db"]["migrations"]
        shutil.rmtree(self.out / "functions")
        shutil.rmtree(self.out / "migrations")

        self.assertEqual(self.collect(failures={"functions", "migrations"}), 0)
        self.assertFalse(self.function_sql().exists())
        self.assertFalse(self.migration_sql().exists())
        self.assertEqual(self.metadata()["db"]["migrations"], original_migrations)
        self.assertTrue({"functions.sql", "migrations.sql"}.issubset(self.error_sections()))
        for name in ("functions", "migrations"):
            document = (self.out / f"{name}.md").read_text()
            self.assertIn("SQL indisponível", document)
            self.assertNotIn(f"]({name}/", document)

    def test_failed_first_collection_does_not_claim_empty_sections(self):
        self.assertEqual(self.collect(failures={"functions", "migrations"}), 0)
        self.assertFalse(self.function_sql().exists())
        self.assertFalse(self.migration_sql().exists())
        self.assertEqual(self.metadata()["carried"], [])
        self.assertEqual(self.error_sections(), {"functions", "migrations"})
        for name in ("functions", "migrations"):
            document = (self.out / f"{name}.md").read_text()
            self.assertIn("Coleta indisponível", document)
            self.assertNotIn("_nenhum_", document)
            self.assertIn(f"| {name} | n/d |", (self.out / "README.md").read_text())

    def test_successful_empty_sections_are_not_reported_as_collection_failures(self):
        self.assertEqual(self.collect(functions=[], migrations=[]), 0)
        self.assertEqual(self.metadata()["errors"], [])
        self.assertEqual(self.metadata()["carried"], [])
        for name in ("functions", "migrations"):
            self.assertIn("_nenhum_", (self.out / f"{name}.md").read_text())
            self.assertIn(f"| {name} | 0 |", (self.out / "README.md").read_text())

    def test_aggregate_and_window_without_sql_remain_healthy_catalog_entries(self):
        entries = [{**function(f"demo_{kind}"), "kind": kind, "definition": None} for kind in ("aggregate", "window")]
        self.assertEqual(self.collect(functions=entries), 0)
        self.assertEqual(self.error_sections(), set())
        self.assertEqual([f["kind"] for f in self.metadata()["db"]["functions"]], ["aggregate", "window"])
        for entry in entries:
            self.assertFalse(self.function_sql(entry["name"]).exists())
        document = (self.out / "functions.md").read_text()
        self.assertIn("SQL não coletado para este tipo", document)
        self.assertNotIn("](functions/", document)
        self.assertEqual(self.collect(failures={"functions"}), 0)
        self.assertEqual(self.error_sections(), {"functions"})
        self.assertEqual(self.metadata()["carried"], ["functions"])
        self.assertEqual(self.collect(functions=entries), 0)
        self.assertEqual(self.error_sections(), set())


class SnapshotFailureMatrixTests(SnapshotFixture):
    """24 sequências: seção × histórico/SQL disponível × repetição × recuperação."""

    def exercise_failure_recovery(self, section, history, attempts, recovery):
        if history != "none":
            self.collect(functions=[function(), function("obsolete")],
                         migrations=[migration(), migration("20260102000000", "obsolete")])
            previous = copy.deepcopy(self.metadata()["db"][section])
            sql_before = {p.relative_to(self.out): p.read_bytes() for p in (self.out / section).rglob("*.sql")}
            if history == "metadata_only":
                shutil.rmtree(self.out / section)
        else:
            previous, sql_before = None, {}

        self.source_files = []  # não pode apagar callers da seção que veio do histórico
        for attempt in range(attempts):
            changed_function = function(value=attempt + 20)
            changed_statement = f"ALTER TABLE public.demo_table ADD COLUMN field_{attempt} integer;"
            self.assertEqual(self.collect(failures={section}, functions=[changed_function],
                                         migrations=[migration(statements=[changed_statement])]), 0)
            metadata = self.metadata()
            self.assertEqual(structural_records(metadata["db"][section]), structural_records(previous))
            if section == "functions" and previous:
                self.assertEqual(metadata["db"][section][0]["callers"]["db"], previous[0]["callers"]["db"])
                self.assertEqual(metadata["db"][section][0]["callers"]["code"], [])
            self.assertEqual(metadata["carried"], [section] if history != "none" else [])
            self.assertIn(section, self.error_sections())
            self.assertEqual(f"{section}.sql" in self.error_sections(), history == "metadata_only")
            document = (self.out / f"{section}.md").read_text()
            if history == "complete":
                for relative, contents in sql_before.items():
                    self.assertEqual((self.out / relative).read_bytes(), contents)
                self.assertIn("versão anterior", document)
                self.assertNotIn("SQL indisponível", document)
            else:
                self.assertFalse((self.out / section).exists())
                self.assertNotIn(f"]({section}/", document)
                self.assertIn("SQL indisponível" if history == "metadata_only" else "Coleta indisponível", document)
            if history == "none":
                self.assertIn(f"| {section} | n/d |", (self.out / "README.md").read_text())
            else:
                self.assertIn(f"| {section} | 2 |", (self.out / "README.md").read_text())
                # Falha da coleta não pode transformar registros conhecidos em remoções.
                changes = self.snapshot.diff_fingerprints(
                    self.snapshot.fingerprints({"db": {section: structural_records(previous)}}),
                    self.snapshot.fingerprints({"db": {section: structural_records(metadata["db"][section])}}))
                self.assertEqual(changes, [])
            if section == "functions":
                self.assertEqual(self.migration_sql().read_text().strip(), changed_statement)
            else:
                self.assertEqual(self.function_sql().read_text().strip(), changed_function["definition"])

        self.source_files = [("src/recovered.ts", "supabase.rpc('demo')")]
        final_function = function(value=99)
        final_statement = "ALTER TABLE public.demo_table ADD COLUMN recovered boolean;"
        functions = [] if section == "functions" and recovery == "empty" else [final_function]
        migrations = [] if section == "migrations" and recovery == "empty" else [migration(statements=[final_statement])]
        self.assertEqual(self.collect(functions=functions, migrations=migrations), 0)
        metadata = self.metadata()
        self.assertEqual(metadata["errors"], [])
        self.assertEqual(metadata["carried"], [])
        self.assertFalse(self.function_sql("obsolete").exists())
        self.assertFalse(self.migration_sql("20260102000000", "obsolete").exists())
        document = (self.out / f"{section}.md").read_text()
        self.assertNotIn("versão anterior", document)
        self.assertNotIn("SQL indisponível", document)
        if recovery == "empty":
            self.assertEqual(metadata["db"][section], [])
            self.assertFalse((self.out / section).exists())
            self.assertIn("_nenhum_", document)
        elif section == "functions":
            self.assertEqual(self.function_sql().read_text().strip(), final_function["definition"])
            self.assertEqual(metadata["db"][section][0]["callers"]["code"], [{"file": "src/recovered.ts", "hits": 1}])
        else:
            self.assertEqual(self.migration_sql().read_text().strip(), final_statement)
            self.assertEqual(metadata["db"][section][0]["statements"], 1)


def recovery_case(section, history, attempts, recovery):
    def run(self):
        self.exercise_failure_recovery(section, history, attempts, recovery)
    return run


for _section in ("functions", "migrations"):
    for _history in ("none", "complete", "metadata_only"):
        for _attempts in (1, 3):
            for _recovery in ("changed", "empty"):
                setattr(SnapshotFailureMatrixTests,
                        f"test_{_section}_{_history}_{_attempts}_failures_recover_{_recovery}",
                        recovery_case(_section, _history, _attempts, _recovery))


class SnapshotFunctionCallerTests(SnapshotFixture):
    def callers(self, files, *, scan_dirs=None, kind="function"):
        root = pathlib.Path(self.temp.name) / "repo"
        for relative, text in files.items():
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
        self.snapshot.REPO_ROOT = root
        self.snapshot.CODE_SCAN_DIRS = scan_dirs or ["."]
        db = {"functions": [{**function(), "kind": kind}]}
        with contextlib.redirect_stdout(io.StringIO()):
            self.snapshot.build_function_callers(db)
        return db["functions"][0]["callers"]["code"]

    def test_function_declaration_is_not_a_call(self):
        declarations = {
            "supabase/migrations/001.sql": function()["definition"],
            "supabase/migrations/002.sql": "CREATE OR REPLACE\nFUNCTION public.demo() RETURNS integer AS $$ SELECT 2 $$ LANGUAGE sql;",
            "supabase/migrations/003.sql": "CREATE PROCEDURE public.demo() LANGUAGE sql AS $$ SELECT 1 $$;",
        }
        self.assertEqual(self.callers(declarations), [])

    def test_aggregate_declarations_and_metadata_are_not_calls(self):
        statements = [
            "CREATE AGGREGATE public.demo(integer) (SFUNC = int4pl, STYPE = integer);",
            "DROP AGGREGATE IF EXISTS public.demo(integer);",
            "ALTER AGGREGATE public.demo(integer) OWNER TO postgres;",
            "COMMENT ON AGGREGATE public.demo(integer) IS 'description';",
        ]
        self.assertEqual(self.callers({f"supabase/migrations/{i}.sql": text for i, text in enumerate(statements)}, kind="aggregate"), [])

    def test_ddl_function_signatures_are_not_calls(self):
        statements = [
            "DROP FUNCTION IF EXISTS public.demo();",
            "ALTER FUNCTION public.demo() OWNER TO postgres;",
            "COMMENT ON FUNCTION public.demo() IS 'description';",
            "GRANT EXECUTE ON FUNCTION public.demo() TO authenticated;",
            "REVOKE EXECUTE ON FUNCTION public.demo() FROM anon;",
        ]
        self.assertEqual(self.callers({f"supabase/migrations/{i}.sql": text for i, text in enumerate(statements)}), [])

    def test_real_calls_inside_function_bodies_and_migrations_remain(self):
        text = "CREATE FUNCTION public.demo() RETURNS integer AS $$ SELECT public.demo(); $$ LANGUAGE sql;\nSELECT public.demo();"
        self.assertEqual(self.callers({"supabase/migrations/active.sql": text}),
                         [{"file": "supabase/migrations/active.sql", "hits": 2}])

    def test_ddl_like_text_does_not_hide_a_real_call_later_in_the_statement(self):
        text = "SELECT audit_note('ALTER FUNCTION public.demo()'), public.demo();"
        self.assertEqual(self.callers({"supabase/migrations/active.sql": text}),
                         [{"file": "supabase/migrations/active.sql", "hits": 1}])

    def test_multiple_signatures_are_ignored_but_default_argument_calls_remain(self):
        text = ("GRANT EXECUTE ON FUNCTION public.demo(), public.demo(integer) TO authenticated;\n"
                "CREATE FUNCTION public.other(value integer DEFAULT public.demo()) RETURNS integer AS $$ SELECT 1 $$ LANGUAGE sql;")
        self.assertEqual(self.callers({"supabase/migrations/active.sql": text}),
                         [{"file": "supabase/migrations/active.sql", "hits": 1}])

    def test_overlapping_scan_paths_do_not_duplicate_real_calls(self):
        self.assertEqual(self.callers({"src/hooks/useDemo.ts": "supabase.rpc('demo')"}, scan_dirs=["src", "src/hooks"]),
                         [{"file": "src/hooks/useDemo.ts", "hits": 1}])

    def test_historical_and_test_files_do_not_prove_current_usage(self):
        excluded = [
            "supabase/migrations/_foreign/other/old.sql", "supabase/migrations/_superseded/old.sql",
            "src/__tests__/client.ts", "src/tests/client.ts", "src/test/client.ts", "src/__fixtures__/client.ts",
            "src/fixtures/client.ts", "src/__mocks__/client.ts", "src/client.test.ts", "src/client.spec.ts",
            "scripts/ci/client.unit.mjs", "scripts/test_client.py", "server/client_test.go", "src/client.stories.tsx",
        ]
        files = {name: "supabase.rpc('demo'); SELECT public.demo();" for name in excluded}
        files["src/client.ts"] = "supabase.rpc('demo')"
        self.assertEqual(self.callers(files), [{"file": "src/client.ts", "hits": 1}])

    def test_similar_names_operational_scripts_and_custom_scan_paths_remain(self):
        names = ["runtime/testimonials.ts", "runtime/customer_foreign/client.ts", "runtime/_superseded_backup/client.ts",
                 "runtime/fixtures-page.ts", "scripts/operations/sync.ts", "supabase/migrations/_foreign.sql"]
        files = {name: "supabase.rpc('demo')" for name in names}
        # SQL reconhece a chamada SQL, não a sintaxe de RPC do cliente.
        files[names[-1]] = "SELECT public.demo();"
        files["src/not_selected.ts"] = "supabase.rpc('demo')"
        self.assertEqual(self.callers(files, scan_dirs=["runtime", "scripts/operations", "supabase/migrations"]),
                         [{"file": name, "hits": 1} for name in sorted(names)])


class SnapshotCallerFreshnessTests(SnapshotFixture):
    @staticmethod
    def database(stage):
        consumer = function(f"{stage}_consumer")
        consumer["definition"] = f"CREATE FUNCTION public.{stage}_consumer() RETURNS integer AS $$ SELECT public.demo() $$ LANGUAGE sql;"
        return {
            "functions": [function(), consumer],
            "cron": {"jobs": [{"jobid": stage, "jobname": stage, "command": "SELECT public.demo();"}]},
            "triggers": [{"schema": "public", "table": "orders", "name": f"{stage}_trigger", "function": "public.demo"}],
            "views": [{"schema": "public", "name": f"{stage}_view", "definition": "SELECT public.demo();"}],
        }

    def build(self, database, files):
        with mock.patch.object(self.snapshot, "scan_code_files", return_value=files):
            with contextlib.redirect_stdout(io.StringIO()):
                return self.snapshot.build_function_callers(database)

    def previous_database(self):
        previous = self.database("old")
        self.build(previous, [("src/old.ts", "supabase.rpc('demo')")])
        for entry in previous["functions"]:
            entry["definition_sha"] = self.snapshot.sha(entry["definition"])
            entry["definition"] = None
        return previous

    def exercise_sources(self, failed_sources):
        previous = self.previous_database()
        previous_copy = copy.deepcopy(previous)
        current = self.database("new")
        # introspect_db reutiliza a lista anterior; o mapa não pode alterar esse histórico em memória.
        current["functions"] = previous["functions"]
        self.snapshot.CARRIED[:] = ["functions", *failed_sources]
        for source in failed_sources:
            current[source] = previous[source]
        states = self.build(current, [("src/new.ts", "supabase.rpc('demo')")])
        callers = current["functions"][0]["callers"]
        self.assertEqual(callers["code"], [{"file": "src/new.ts", "hits": 1}])
        self.assertEqual(callers["code_total_files"], 1)
        self.assertEqual(callers["db"], ["public.old_consumer"])
        expected = {"cron": ["new:new"], "triggers": ["public.orders.new_trigger"], "views": ["public.new_view"]}
        for source in expected:
            if source in failed_sources:
                self.assertEqual(callers[source], previous_copy["functions"][0]["callers"][source])
                self.assertIn("anterior", states[source])
            else:
                self.assertEqual(callers[source], expected[source])
                self.assertIn("coleta atual", states[source])
        self.assertIn("anterior", states["db"])
        self.assertEqual(previous, previous_copy, "recalcular callers não pode reescrever a base do changelog")
        self.assertEqual([{k: v for k, v in f.items() if k != "callers"} for f in current["functions"]],
                         [{k: v for k, v in f.items() if k != "callers"} for f in previous_copy["functions"]])

        self.snapshot.CARRIED.clear()
        recovered = self.database("recovered")
        states = self.build(recovered, [("src/recovered.ts", "supabase.rpc('demo')")])
        callers = recovered["functions"][0]["callers"]
        self.assertEqual(callers["db"], ["public.recovered_consumer"])
        self.assertEqual(callers["cron"], ["recovered:recovered"])
        self.assertEqual(callers["triggers"], ["public.orders.recovered_trigger"])
        self.assertEqual(callers["views"], ["public.recovered_view"])
        self.assertTrue(all("coleta atual" in state for state in states.values()))

    def test_unavailable_sources_preserve_known_references_without_claiming_freshness(self):
        previous = self.previous_database()
        expected = copy.deepcopy(previous["functions"][0]["callers"])
        current = {"functions": previous["functions"], "cron": None, "triggers": None, "views": None}
        self.snapshot.CARRIED[:] = ["functions"]
        states = self.build(current, None)
        self.assertEqual(current["functions"][0]["callers"], expected)
        for source in ("code", "cron", "triggers", "views"):
            self.assertIn("indisponível", states[source])

    def test_successful_empty_sources_remove_old_references(self):
        previous = self.previous_database()
        current = {"functions": previous["functions"], "cron": {"jobs": []}, "triggers": [], "views": []}
        self.snapshot.CARRIED[:] = ["functions"]
        states = self.build(current, [])
        callers = current["functions"][0]["callers"]
        for source in ("code", "cron", "triggers", "views"):
            self.assertEqual(callers[source], [])
            self.assertIn("coleta atual", states[source])
        self.assertEqual(callers["code_total_files"], 0)
        self.assertEqual(callers["db"], ["public.old_consumer"])

    def test_unreadable_code_preserves_previous_code_references_and_reports_failure(self):
        previous = self.previous_database()
        expected = copy.deepcopy(previous["functions"][0]["callers"]["code"])
        root = pathlib.Path(self.temp.name) / "repo"
        (root / "src").mkdir(parents=True)
        (root / "src/client.ts").write_text("supabase.rpc('demo')", encoding="utf-8")
        self.snapshot.REPO_ROOT = root
        self.snapshot.CODE_SCAN_DIRS = ["src"]
        self.snapshot.CARRIED[:] = ["functions"]
        with mock.patch.object(pathlib.Path, "read_text", side_effect=PermissionError("fixture ilegível")):
            with contextlib.redirect_stdout(io.StringIO()):
                states = self.snapshot.build_function_callers(previous)
        self.assertEqual(previous["functions"][0]["callers"]["code"], expected)
        self.assertIn("indisponível", states["code"])
        self.assertTrue(any(e["section"] == "callers.code" for e in self.snapshot.ERRORS))

    def test_database_callers_include_defaults_on_the_first_definition_line(self):
        consumer = function("consumer")
        consumer["definition"] = (
            "CREATE OR REPLACE FUNCTION public.consumer(value integer DEFAULT public.demo())\n"
            " RETURNS integer\n LANGUAGE sql\n AS $function$ SELECT value $function$;"
        )
        database = {"functions": [function(), consumer]}
        self.build(database, [])
        self.assertEqual(database["functions"][0]["callers"]["db"], ["public.consumer"])
        self.assertEqual(database["functions"][1]["callers"]["db"], [])


class SnapshotHeartbeatTests(SnapshotFixture):
    def manifest(self):
        return json.loads((self.out / "manifest.json").read_text(encoding="utf-8"))

    def collect_at(self, instant, **options):
        class FrozenDateTime(dt.datetime):
            @classmethod
            def now(cls, tz=None):
                return instant.astimezone(tz) if tz is not None else instant.replace(tzinfo=None)
        with mock.patch.object(self.snapshot.dt, "datetime", FrozenDateTime):
            return self.collect(**options)

    def unified_index(self):
        script = pathlib.Path(__file__).resolve().parents[1] / "regras_negocio" / "indice.py"
        spec = importlib.util.spec_from_file_location("heartbeat_index", script)
        index = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(index)
        arguments = [str(script), "--repo", self.temp.name, "--out", "INDEX.md", "--remote", "owner/repo",
                     "--head", "a" * 40, "--fonte", "banco real=output"]
        with mock.patch.object(sys, "argv", arguments):
            with mock.patch.object(index, "git", side_effect=AssertionError("manifest/CHANGELOG dispensam fallback Git")):
                with contextlib.redirect_stderr(io.StringIO()):
                    self.assertEqual(index.main(), 0)
        return (pathlib.Path(self.temp.name) / "INDEX.md").read_text(encoding="utf-8")

    def test_unchanged_collection_refreshes_utc_heartbeat_without_structural_changes(self):
        first = dt.datetime(2026, 1, 1, 0, 0, tzinfo=dt.timezone.utc)
        second = first + dt.timedelta(minutes=10)
        self.assertEqual(self.collect_at(first), 0)
        original_manifest = self.manifest()
        original_snapshot = (self.out / "snapshot.json").read_bytes()
        original_changelog = (self.out / "CHANGELOG.md").read_bytes()
        original_fingerprints = self.snapshot.fingerprints(self.metadata())
        self.assertEqual(self.collect_at(second), 0)
        current_manifest = self.manifest()
        self.assertEqual(original_manifest["gerado_em"], "2026-01-01T00:00:00Z")
        self.assertEqual(current_manifest["gerado_em"], "2026-01-01T00:10:00Z")
        self.assertEqual(dt.datetime.fromisoformat(current_manifest["gerado_em"]).utcoffset(), dt.timedelta(0))
        self.assertEqual(current_manifest["entrada"], "README.md")
        self.assertEqual(current_manifest["gerador"], "scripts/supabase_snapshot/snapshot.py")
        self.assertEqual(current_manifest["erros"], [])
        self.assertEqual(current_manifest["carried"], [])
        self.assertEqual((self.out / "snapshot.json").read_bytes(), original_snapshot)
        self.assertEqual((self.out / "CHANGELOG.md").read_bytes(), original_changelog)
        self.assertEqual(self.snapshot.fingerprints(self.metadata()), original_fingerprints)

    def test_partial_heartbeat_includes_collection_and_render_errors(self):
        self.collect()
        shutil.rmtree(self.out / "functions")
        self.assertEqual(self.collect(failures={"functions"}), 0)
        manifest = self.manifest()
        self.assertEqual(manifest["erros"], self.metadata()["errors"])
        self.assertEqual({error["section"] for error in manifest["erros"]}, {"functions", "functions.sql"})
        self.assertEqual(manifest["carried"], ["functions"])
        self.assertIn("| parcial ·", self.unified_index())

    def test_recovery_clears_heartbeat_errors_and_carried_sections(self):
        self.collect()
        self.collect(failures={"functions", "migrations"})
        self.assertTrue(self.manifest()["erros"])
        self.assertEqual(set(self.manifest()["carried"]), {"functions", "migrations"})
        self.assertEqual(self.collect(), 0)
        self.assertEqual(self.manifest()["erros"], [])
        self.assertEqual(self.manifest()["carried"], [])

    def test_index_prefers_current_heartbeat_to_old_structural_changelog(self):
        self.collect()
        (self.out / "CHANGELOG.md").write_text("# Histórico\n\n## 2000-01-01 00:00 UTC\n", encoding="utf-8")
        document = self.unified_index()
        self.assertIn("| ok ·", document)
        self.assertNotIn("desatualizado", document)
        (self.out / "manifest.json").unlink()
        self.assertIn("| desatualizado ·", self.unified_index())

    def test_unavailable_collection_does_not_renew_previous_heartbeat(self):
        self.collect()
        before = (self.out / "manifest.json").read_bytes()
        with mock.patch.object(self.snapshot, "introspect_db", return_value=({"functions": None, "migrations": None}, {})):
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(self.snapshot.main(), 1)
        self.assertEqual((self.out / "manifest.json").read_bytes(), before)

    def test_interrupted_render_does_not_publish_a_completed_heartbeat(self):
        with mock.patch.object(self.snapshot, "render_simple", side_effect=RuntimeError("falha de escrita simulada")):
            with self.assertRaisesRegex(RuntimeError, "falha de escrita"):
                self.collect()
        self.assertFalse((self.out / "manifest.json").exists())


def source_freshness_case(failed_sources):
    def run(self):
        self.exercise_sources(failed_sources)
    return run


for _mask in range(8):
    _sources = tuple(source for bit, source in enumerate(("cron", "triggers", "views")) if _mask & (1 << bit))
    setattr(SnapshotCallerFreshnessTests, f"test_functions_carried_with_{'_'.join(_sources) or 'no_other_failure'}",
            source_freshness_case(_sources))


class SnapshotDBStatsTests(SnapshotFixture):
    """Catálogo e resultados sintéticos; nenhum driver, socket ou banco real."""

    def stats(self, *, schema="extensions", auth_error=False, top=15, failure=None, empty=False):
        snapshot = self.snapshot
        snapshot.ERRORS.clear()
        snapshot.STAT_STATEMENTS_TOP = top
        calls = []

        def query(_conn, sql, params=None):
            calls.append((sql, params))
            compact = " ".join(sql.split())
            if "pg_extension" in compact:
                extension = params[0] if params else "pg_stat_statements"
                if extension == "pgmq":
                    return [{"present": 1}]
                if failure == "catalog":
                    raise PermissionError("catálogo indisponível na fixture")
                if schema is None:
                    return []
                if "extnamespace" in compact:
                    return [{"schema": schema}]
                return [{"present": 1}]  # has_ext do código anterior
            if "total_exec_time" in compact:
                # O backend de teste não inclui a extensão no search_path.
                # Aceita somente um identificador SQL delimitado, não texto cru.
                relation = re.search(
                    r'FROM\s+("(?:""|[^"])*")\.pg_stat_statements\s+s', sql, re.I)
                if relation is None or relation.group(1)[1:-1].replace('""', '"') != schema:
                    raise RuntimeError('relation "pg_stat_statements" does not exist')
                if failure == "permission":
                    raise PermissionError("view sem permissão na fixture")
                if failure == "missing":
                    raise RuntimeError("view removida depois da consulta ao catálogo")
                if failure == "timeout":
                    raise TimeoutError("statement timeout simulado")
                if failure == "row":
                    return [{"query": None}]
                return [] if empty else [{
                    "role": "fixture_reader", "calls": 3, "total_ms": 8,
                    "mean_ms": 2.67, "rows": 3, "query": "select 'literal-fixture'",
                }]
            if "pg_database_size" in compact:
                if failure == "database":
                    raise RuntimeError("banco indisponível na fixture")
                return [{"s": 123456}]
            if "pg_stat_activity" in compact:
                return [{"usename": "fixture_reader", "state": "idle", "n": 2}]
            if "sum(pg_total_relation_size" in compact:
                return [{"schema": "public", "bytes": 45678}]
            if "FROM storage.objects" in compact:
                if failure == "storage":
                    raise PermissionError("permission denied for schema storage")
                return [{"bucket_id": "fixture", "objects": 2, "bytes": 42}]
            if "FROM auth." in compact:
                if auth_error:
                    raise PermissionError("permission denied for schema auth")
                if "auth.identities" in compact:
                    return [{"provider": "fixture", "users": 5}]
                if "auth.mfa_factors" in compact:
                    return [{"factor_type": "totp", "status": "verified", "total": 2}]
                return [{"c": 5}]
            if "pgmq.metrics_all()" in compact:
                return [{"queue_name": "fixture", "queue_length": 3, "newest_msg_age_sec": 1,
                         "oldest_msg_age_sec": 2, "total_messages": 4}]
            raise AssertionError(f"Consulta não prevista no modelo offline: {compact[:70]}")

        with mock.patch.object(snapshot, "q", side_effect=query):
            with mock.patch.object(snapshot.urllib.request, "urlopen", side_effect=AssertionError("HTTP proibido")):
                with contextlib.redirect_stdout(io.StringIO()):
                    result = snapshot.get_db_stats(OfflineConnection())
        errors = {error["section"] for error in snapshot.ERRORS}
        return result, calls, errors

    def assert_core_metrics(self, stats, auth_error):
        self.assertIsInstance(stats, dict, "Falha opcional não deve descartar db_stats")
        self.assertEqual(stats["database_bytes"], 123456)
        self.assertEqual(stats["connections"], [{"usename": "fixture_reader", "state": "idle", "n": 2}])
        self.assertEqual(stats["schema_bytes"], [{"schema": "public", "bytes": 45678}])
        self.assertEqual(stats["storage"], [{"bucket_id": "fixture", "objects": 2, "bytes": 42}])
        self.assertEqual(stats["queues"][0]["queue_length"], 3)
        self.assertEqual(bool(stats["auth"]), not auth_error)

    def exercise_schema(self, schema, auth_error):
        stats, calls, errors = self.stats(schema=schema, auth_error=auth_error)
        self.assert_core_metrics(stats, auth_error)
        self.assertEqual(stats["top_queries"][0]["query"], "select '?'")
        self.assertEqual(errors, {"db_stats.auth"} if auth_error else set())
        lookup = [(sql, params) for sql, params in calls if "extnamespace" in sql]
        self.assertEqual(len(lookup), 1)
        top_calls = [(sql, params) for sql, params in calls if "total_exec_time" in sql]
        self.assertEqual(len(top_calls), 1)
        # Sem binds, '%' no identificador não vira placeholder do psycopg.
        self.assertIsNone(top_calls[0][1])
        self.assertIn("LIMIT 15", top_calls[0][0])

    def exercise_availability(self, present, top, auth_error):
        stats, calls, errors = self.stats(schema="extensions" if present else None,
                                         top=top, auth_error=auth_error)
        self.assert_core_metrics(stats, auth_error)
        self.assertEqual(errors, {"db_stats.auth"} if auth_error else set())
        self.assertEqual("top_queries" in stats, present and top > 0)
        stat_calls = [(sql, params) for sql, params in calls
                      if "total_exec_time" in sql or "extnamespace" in sql or params == ("pg_stat_statements",)]
        if top <= 0:
            self.assertEqual(stat_calls, [])
        elif present:
            self.assertEqual(len(stat_calls), 2)
            self.assertIn("LIMIT 1", stat_calls[-1][0])
        else:
            self.assertEqual(len(stat_calls), 1)

    def exercise_failure(self, failure, auth_error):
        stats, _, errors = self.stats(failure=failure, auth_error=auth_error)
        self.assert_core_metrics(stats, auth_error)
        self.assertNotIn("top_queries", stats)
        expected = {"db_stats.top_queries"} | ({"db_stats.auth"} if auth_error else set())
        self.assertEqual(errors, expected)

    def exercise_recovery(self, auth_error, empty):
        failed, _, errors = self.stats(failure="permission", auth_error=auth_error)
        self.assert_core_metrics(failed, auth_error)
        self.assertIn("db_stats.top_queries", errors)
        recovered, _, errors = self.stats(empty=empty, auth_error=auth_error)
        self.assert_core_metrics(recovered, auth_error)
        self.assertEqual(errors, {"db_stats.auth"} if auth_error else set())
        self.assertEqual(len(recovered["top_queries"]), 0 if empty else 1)
        self.assertNotIn("top_queries", failed, "Recuperação não deve alterar o resultado anterior")

    def test_schema_is_resolved_again_after_extension_moves(self):
        first, _, first_errors = self.stats(schema="extensions")
        second, _, second_errors = self.stats(schema='Stats "new"')
        self.assert_core_metrics(first, False)
        self.assert_core_metrics(second, False)
        self.assertEqual(first_errors | second_errors, set())
        self.assertEqual(first["top_queries"], second["top_queries"])

    def test_partial_metrics_remain_in_rendered_json_and_markdown(self):
        stats, _, errors = self.stats(failure="missing", auth_error=True)
        self.assert_core_metrics(stats, True)
        self.snapshot.render_stats({"db_stats": stats}, {}, {})
        rendered = json.loads((self.out / "stats.json").read_text())["db"]["db_stats"]
        self.assertEqual(rendered["database_bytes"], 123456)
        self.assertEqual(rendered["queues"][0]["queue_name"], "fixture")
        self.assertNotIn("top_queries", rendered)
        self.assertTrue((self.out / "stats.md").exists())
        self.assertEqual(errors, {"db_stats.auth", "db_stats.top_queries"})

    def test_storage_without_permission_does_not_discard_the_other_metrics(self):
        stats, _, errors = self.stats(failure="storage")
        self.assertIsInstance(stats, dict, "storage sem permissão não pode derrubar db_stats")
        self.assertEqual(errors, {"db_stats.storage"})
        self.assertEqual(stats["storage"], [])
        self.assertEqual(stats["database_bytes"], 123456)
        self.assertEqual(stats["queues"][0]["queue_length"], 3)
        self.assertTrue(stats["auth"])
        self.assertEqual(len(stats["top_queries"]), 1)
        self.snapshot.render_stats({"db_stats": stats}, {}, {})
        self.assertIn("**NÃO VERIFICADO** — seção `db_stats.storage`", (self.out / "stats.md").read_text(encoding="utf-8"))

    def test_optional_blocks_run_in_savepoints_inside_the_section_transaction(self):
        connection = OfflineConnection()
        snapshot = self.snapshot
        snapshot.ERRORS.clear()

        def query(_conn, sql, params=None):
            if "FROM auth." in sql or "FROM storage.objects" in sql:
                raise PermissionError("permission denied")
            return [{"s": 1, "schema": "extensions"}] if "pg_database_size" in sql or "extnamespace" in sql else []

        with mock.patch.object(snapshot, "q", side_effect=query), contextlib.redirect_stdout(io.StringIO()):
            self.assertIsNotNone(snapshot.get_db_stats(connection))
        # seção (BEGIN, guard) → storage falha → auth falha → top_queries conclui → COMMIT da seção
        self.assertEqual(connection.commands, ["BEGIN", snapshot.TX_GUARD, "BEGIN", "ROLLBACK", "BEGIN", "ROLLBACK",
                                               "BEGIN", "COMMIT", "COMMIT"])

    def test_mandatory_database_failure_keeps_section_error_contract(self):
        stats, _, errors = self.stats(failure="database")
        self.assertIsNone(stats)
        self.assertEqual(errors, {"db_stats"})


class SnapshotConfigurationTests(unittest.TestCase):
    def test_invalid_integer_environment_is_reported_without_traceback(self):
        script = pathlib.Path(__file__).with_name("snapshot.py")
        for key, value in (("CRON_RUNS_PER_JOB", "x"), ("STAT_STATEMENTS_TOP", "1.5"),
                           ("CODE_SCAN_MAX_FILES", "")):
            with self.subTest(key=key):
                driver = types.ModuleType("psycopg")
                driver.connect = mock.Mock(side_effect=AssertionError("conexão proibida"))
                rows = types.ModuleType("psycopg.rows")
                rows.dict_row = object()
                spec = importlib.util.spec_from_file_location(f"snapshot_invalid_{key}", script)
                snapshot = importlib.util.module_from_spec(spec)
                env = {"SUPABASE_DB_URL": OFFLINE_DB_URL, key: value}
                with mock.patch.dict(sys.modules, {"psycopg": driver, "psycopg.rows": rows}):
                    with mock.patch.dict(os.environ, env, clear=True):
                        spec.loader.exec_module(snapshot)
                with contextlib.redirect_stderr(io.StringIO()) as stderr:
                    self.assertEqual(snapshot.main(), 2)
                message = stderr.getvalue()
                self.assertIn(f"Configuração inválida: {key}", message)
                self.assertNotIn("Traceback", message)


def db_stats_case(method, *args):
    def run(self):
        getattr(self, method)(*args)
    return run


for _index, _schema in enumerate((
        "extensions", "public", "analytics", "Query Metrics", 'stats"quoted',
        "select", "stats%raw", 'stats"; DROP TABLE private; --')):
    for _auth_error in (False, True):
        setattr(SnapshotDBStatsTests, f"test_schema_{_index}_auth_{_auth_error}",
                db_stats_case("exercise_schema", _schema, _auth_error))

for _present in (False, True):
    for _top in (0, -1, 1):
        for _auth_error in (False, True):
            setattr(SnapshotDBStatsTests, f"test_available_{_present}_top_{_top}_auth_{_auth_error}",
                    db_stats_case("exercise_availability", _present, _top, _auth_error))

for _failure in ("catalog", "permission", "missing", "timeout", "row"):
    for _auth_error in (False, True):
        setattr(SnapshotDBStatsTests, f"test_failure_{_failure}_auth_{_auth_error}",
                db_stats_case("exercise_failure", _failure, _auth_error))

for _auth_error in (False, True):
    for _empty in (False, True):
        setattr(SnapshotDBStatsTests, f"test_recovery_auth_{_auth_error}_empty_{_empty}",
                db_stats_case("exercise_recovery", _auth_error, _empty))


STRUCTURAL_SECTIONS = (
    "server", "schemas", "tables", "columns", "constraints", "indexes", "views", "functions", "triggers", "policies",
    "types", "extensions", "sequences", "grants", "roles", "realtime", "cron", "queues", "migrations", "storage",
    "vault", "foreign_servers", "webhooks", "lints")
VOLATILE_SECTIONS = {"cron_runs": [], "table_stats": [], "index_stats": [], "db_stats": {}}
# Cópia literal do padrão do passo "Guard — nenhum segredo na saída" de .github/workflows/contexto.yml.
WORKFLOW_SECRET_GUARD = (r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|sb_secret_|sb_publishable_|"
                         r"postgres(ql)?://[^ ]*:[^ @]+@")


def table(name="orders", schema="public", rls_enabled=True):
    return {
        "schema": schema, "name": name, "kind": "table", "rls_enabled": rls_enabled, "rls_forced": False,
        "owner": "postgres", "comment": None, "is_partition": False, "parent": None, "partition_key": None,
        "partition_bound": None, "replica_identity": "default", "from_extension": False,
    }


def policy(name="orders_owner", table_name="orders"):
    return {"schema": "public", "table": table_name, "name": name, "permissive": "PERMISSIVE",
            "roles": ["authenticated"], "cmd": "SELECT", "using": "true", "with_check": None}


def healthy_catalog():
    """Catálogo mínimo e saudável: toda seção respondeu, a maioria sem objetos."""
    records = {name: [] for name in STRUCTURAL_SECTIONS}
    records.update(
        server={"server_version": "offline-fixture"}, tables=[table()],
        grants={"tables": [], "columns": [], "sequences": [], "default_privileges": []},
        realtime={"publications": [], "tables": []}, cron={"installed": False, "jobs": []},
        queues={"installed": False, "queues": []})
    return records


class CatalogFixture(SnapshotFixture):
    """Coleta completa (24 seções estruturais + 4 voláteis) sobre a conexão simulada."""

    def collect_catalog(self, records=None, *, failures=(), error=None, connection=None, connect_error=None,
                        run=None, urlopen=None):
        snapshot = self.snapshot
        snapshot.ERRORS.clear()
        snapshot.CARRIED.clear()
        snapshot._SLUG_SEEN.clear()
        available = {**(healthy_catalog() if records is None else records), **VOLATILE_SECTIONS}

        def section(name):
            @snapshot.section(name, volatile=name in VOLATILE_SECTIONS)
            def collect_section(_conn):
                if name in failures:
                    raise error or PermissionError(f"permission denied for {name}")
                return copy.deepcopy(available[name])
            return collect_section

        snapshot.DB_SECTIONS = [section(name) for name in available]
        self.connection = connection or OfflineConnection()
        connect = {"side_effect": connect_error} if connect_error else {"return_value": self.connection}
        with mock.patch.object(snapshot.psycopg, "connect", **connect) as self.connect:
            with mock.patch.object(snapshot, "scan_code_files", return_value=[]):
                with mock.patch.object(snapshot.urllib.request, "urlopen",
                                       side_effect=urlopen or AssertionError("HTTP proibido no teste")):
                    with mock.patch.object(snapshot.subprocess, "run",
                                           side_effect=run or AssertionError("Comando externo proibido no teste")):
                        return run_main(snapshot)

    def document(self, name):
        return (self.out / name).read_text(encoding="utf-8")

    def summary(self):
        """Linhas `| categoria | quantidade |` do README."""
        section = self.document("README.md").split("## Resumo", 1)[1].split("\n## ", 1)[0]
        rows = re.findall(r"^\| ([^|]+) \| ([^|]+) \|$", section, re.M)
        return {key: value for key, value in rows}


class SnapshotReadOnlyTests(CatalogFixture):
    def test_every_section_runs_in_its_own_read_only_transaction(self):
        code, _, _ = self.collect_catalog()
        self.assertEqual(code, 0)
        sections = len(STRUCTURAL_SECTIONS) + len(VOLATILE_SECTIONS)
        # Nenhum SET de sessão: tudo o que chega ao banco está dentro de BEGIN…COMMIT e começa pelo guard.
        self.assertEqual(self.connection.commands, ["BEGIN", self.snapshot.TX_GUARD, "COMMIT"] * sections)
        self.assertIs(self.connection.read_only, True)
        options = self.connect.call_args.kwargs
        self.assertIs(options["autocommit"], True)
        self.assertIsNone(options["prepare_threshold"])
        self.assertGreater(options["connect_timeout"], 0)

    def test_guard_is_transaction_scoped_and_cannot_be_reverted(self):
        statements = [statement.strip() for statement in self.snapshot.TX_GUARD.split(";")]
        self.assertEqual(statements[0], "SET TRANSACTION READ ONLY")
        self.assertEqual(statements[-1], "SELECT 1", "o primeiro snapshot impede SET TRANSACTION READ WRITE depois")
        for statement in statements[1:-1]:
            self.assertTrue(statement.startswith("SET LOCAL "), statement)
        guard = " ".join(statements)
        for limit in ("statement_timeout = '90s'", "lock_timeout = '5s'", "row_security = off"):
            self.assertIn(limit, guard)

    def test_failed_section_rolls_back_and_the_next_one_starts_a_new_transaction(self):
        code, _, _ = self.collect_catalog(failures={"views"})
        self.assertEqual(code, 0)
        commands = self.connection.commands
        position = 3 * STRUCTURAL_SECTIONS.index("views")
        self.assertEqual(commands[position:position + 6],
                         ["BEGIN", self.snapshot.TX_GUARD, "ROLLBACK", "BEGIN", self.snapshot.TX_GUARD, "COMMIT"])
        self.assertEqual(commands.count("ROLLBACK"), 1)

    def test_script_never_sends_a_write_statement(self):
        statements, unresolved = [], []
        for node in ast.walk(ast.parse(SCRIPT.read_text(encoding="utf-8"))):
            if not isinstance(node, ast.Call):
                continue
            if isinstance(node.func, ast.Name) and node.func.id == "q":
                argument = node.args[1]
            elif isinstance(node.func, ast.Attribute) and node.func.attr == "execute":
                argument = node.args[0]
            else:
                continue
            if isinstance(argument, ast.Constant) and isinstance(argument.value, str):
                text = argument.value
            elif isinstance(argument, ast.JoinedStr):
                text = "".join(part.value if isinstance(part, ast.Constant) else "placeholder" for part in argument.values)
            elif isinstance(argument, ast.Name) and isinstance(getattr(self.snapshot, argument.id, None), str):
                text = getattr(self.snapshot, argument.id)
            else:
                unresolved.append(ast.unparse(argument))
                continue
            statements += [part.strip() for part in re.sub(r"--[^\n]*", "", text).split(";") if part.strip()]
        self.assertEqual(unresolved, ["sql"], "só q() repassa SQL recebido; todo o resto precisa ser literal auditável")
        self.assertGreater(len(statements), 60)
        writes = re.compile(
            r"\b(insert\s+into|delete\s+from|update\s+\S+\s+set|merge\s+into|truncate\s|drop\s|alter\s|create\s|grant\s|"
            r"revoke\s|copy\s|call\s|refresh\s|vacuum|reindex|nextval|setval|pg_terminate_backend|pg_cancel_backend|"
            r"lo_import|lo_export|dblink|pg_read_file|pg_notify)", re.I)
        for statement in statements:
            with self.subTest(statement=" ".join(statement.split())[:70]):
                self.assertRegex(statement, r"(?is)^(select|with|set\s+local|set\s+transaction\s+read\s+only)\b")
                self.assertIsNone(writes.search(statement))


class SnapshotSecretLeakTests(CatalogFixture):
    PASSWORD = "p@ss:w/rd %x y#?S3CR3T"
    ENCODED = "p%40ss%3Aw%2Frd%20%25x%20y%23%3FS3CR3T"
    DSN = f"postgresql://postgres.abcdefghijklmnopqrst:{ENCODED}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
    extra_env = {"SUPABASE_DB_URL": DSN}

    def assert_no_secret(self, *texts):
        for text in texts:
            for secret in (self.PASSWORD, self.ENCODED, self.DSN, "S3CR3T"):
                self.assertNotIn(secret, text)

    def assert_no_secret_in_output(self):
        for name, content in tree(self.out).items():
            with self.subTest(file=name):
                self.assert_no_secret(content.decode("utf-8"))

    def test_fixture_password_round_trips(self):
        # Garante que o teste cobre a senha real: a forma codificada decodifica para a senha crua.
        self.assertEqual(self.snapshot.urllib.parse.unquote(self.ENCODED), self.PASSWORD)
        self.assertIsNone(self.snapshot.dsn_problem(self.DSN))
        self.assertEqual(self.snapshot.dsn_parts(self.DSN)["password"], self.ENCODED)

    def test_connection_failure_echoing_the_dsn_leaks_nothing_and_has_no_traceback(self):
        failure = RuntimeError(f'connection to "{self.DSN}" failed: FATAL: password authentication failed\n'
                               f"\tDETAIL: password={self.PASSWORD} encoded={self.ENCODED}")
        code, out, err = self.collect_catalog(connect_error=failure)
        self.assertEqual(code, 1)
        self.assert_no_secret(out, err)
        self.assertIn("Falha ao coletar o banco (RuntimeError)", err)
        self.assertIn("password authentication failed", err)
        self.assertIn("[REDACTED]", err)
        self.assertNotIn("Traceback", err)
        self.assertEqual(set(tree(self.out)), {self.snapshot.OUTPUT_MARKER}, "falha de conexão não grava snapshot")

    def test_password_given_as_uri_parameter_is_also_a_secret(self):
        snapshot = load_snapshot({"SUPABASE_DB_URL": "postgresql://user@db.example.com/postgres?sslmode=require&password=S3CR3T%40pw",
                                  "SNAPSHOT_DIR": str(self.out)})
        failure = RuntimeError('connection failed (password "S3CR3T@pw" / S3CR3T%40pw)')
        with mock.patch.object(snapshot.psycopg, "connect", side_effect=failure):
            code, out, err = run_main(snapshot)
        self.assertEqual(code, 1)
        self.assertNotIn("S3CR3T", out + err)

    def test_section_error_is_sanitized_in_log_and_in_every_generated_file(self):
        failure = RuntimeError(f"could not translate {self.DSN} (password {self.PASSWORD} / {self.ENCODED})")
        code, out, err = self.collect_catalog(failures={"views", "db_stats"}, error=failure)
        self.assertEqual(code, 0)
        self.assert_no_secret(out, err)
        self.assert_no_secret_in_output()
        self.assertIn("[REDACTED]", self.document("errors.md"))
        self.assertIn("[REDACTED]", json.dumps(json.loads(self.document("manifest.json"))["erros"]))

    def test_subprocess_failure_does_not_publish_the_command_line(self):
        self.snapshot.PGDUMP = True
        self.snapshot.GEN_TYPES = True

        def run(command, **_):
            # str(TimeoutExpired) inclui o comando inteiro — e a DSN é um dos argumentos.
            self.assertIn(self.DSN, command)
            raise subprocess.TimeoutExpired(command, 600)

        with mock.patch.object(self.snapshot.shutil, "which", return_value="/usr/bin/fixture"):
            code, out, err = self.collect_catalog(run=run)
        self.assertEqual(code, 0)
        self.assertEqual({e["section"] for e in self.metadata()["errors"]}, {"pg_dump", "gen_types"})
        self.assert_no_secret(out, err)
        self.assert_no_secret_in_output()

    def test_malformed_connection_string_is_rejected_before_the_driver_without_echo(self):
        malformed = {
            "espaco": "postgresql://user:pa ss S3CR3T@db.example.com:5432/postgres",
            "arroba": "postgresql://user:p@S3CR3T@db.example.com:5432/postgres",
            "barra": "postgresql://user:pS3CR3T/x@db.example.com:5432/postgres",
            "interrogacao": "postgresql://user:pS3CR3T?x@db.example.com:5432/postgres",
            "percent": "postgresql://user:S3CR3T%zz@db.example.com:5432/postgres",
            "percent_nul": "postgresql://user:S3CR3T%00@db.example.com:5432/postgres",
            "porta": "postgresql://user:S3CR3T@db.example.com:54x2/postgres",
            "parametro": "postgresql://user:S3CR3T@db.example.com/postgres?sslmode",
            "quebra_de_linha": "postgresql://user:S3CR3T@db.example.com/postgres\nx",
            "texto_solto": "S3CR3T-nao-e-connection-string",
            "esquema_em_maiusculas": "PostgreSQL://user:S3CR3T@db.example.com:5432/postgres",
            "chave_valor_com_espaco": "host=db.example.com user=u password=abc S3CR3T",
            "chave_valor_aspas_abertas": "host=db.example.com user=u password='S3CR3T",
        }
        for label, dsn in malformed.items():
            with self.subTest(label):
                snapshot = load_snapshot({"SUPABASE_DB_URL": dsn, "SNAPSHOT_DIR": str(self.out)})
                code, out, err = run_main(snapshot)
                self.assertEqual(code, 2)
                self.assertIn("Configuração inválida: SUPABASE_DB_URL", err)
                self.assertNotIn("S3CR3T", out + err)
                self.assertNotIn("Traceback", err)
                snapshot.psycopg.connect.assert_not_called()
                self.assertFalse(self.out.exists(), "configuração inválida não cria a pasta de saída")

    def test_well_formed_connection_strings_are_accepted(self):
        accepted = [
            self.DSN, OFFLINE_DB_URL, "postgres://user@localhost/db", "postgresql://localhost", "postgresql:///db",
            "postgresql://user:pa%20ss@h1:5432,h2:5433/db?sslmode=require&connect_timeout=10",
            "postgresql://user:pw:with:colons@[::1]:5432/db", "postgresql://user:senha#hash@host/db",
            "postgresql://%2Fvar%2Frun%2Fpostgresql/db", "host=localhost port=5432 dbname=db user=u password=simple",
            "host=localhost user=u password='com espaço e \\' aspas'", "dbname=db",
        ]
        for dsn in accepted:
            with self.subTest(dsn=dsn[:40]):
                self.assertIsNone(self.snapshot.dsn_problem(dsn))
        parts = self.snapshot.dsn_parts("host=localhost user=u password='com espaço e \\' aspas'")
        self.assertEqual(parts["password"], "com espaço e ' aspas")
        self.assertEqual(self.snapshot.dsn_parts("postgresql://user:pw:with:colons@[::1]:5432/db"),
                         {"user": "user", "password": "pw:with:colons", "hosts": ["::1"], "options": ""})

    def test_unknown_argument_is_refused_without_being_echoed(self):
        code, out, err = run_main(self.snapshot, [self.DSN])
        self.assertEqual(code, 2)
        self.assertIn("--help", err)
        self.assert_no_secret(out, err)
        self.assertFalse(self.out.exists())

    def test_scrubbed_connection_string_does_not_trip_the_workflow_secret_guard(self):
        samples = [
            "SELECT dblink_connect('postgresql://app:p@ss:w0rdS3CR3T@db.internal:5432/app')",
            "postgres://user:S3CR3T@host/db e postgresql://outro:S3CR3T2@host2:6543/postgres?sslmode=require",
            "curl https://user:S3CR3T@example.com/webhook",
        ]
        for sample in samples:
            with self.subTest(sample=sample[:30]):
                scrubbed = self.snapshot.scrub(sample)
                self.assertNotIn("S3CR3T", scrubbed)
                self.assertIn("[REDACTED]@", scrubbed)
                self.assertIsNone(re.search(WORKFLOW_SECRET_GUARD, scrubbed), scrubbed)
        self.assertEqual(self.snapshot.scrub("http://localhost:3000/a?b=c@d"), "http://localhost:3000/a?b=c@d")
        self.assertEqual(self.snapshot.scrub("PAT sbp_" + "0123456789abcdef" * 2 + "01234567 em uso"), "PAT [REDACTED_KEY] em uso")
        workflow = SCRIPT.resolve().parents[2] / ".github" / "workflows" / "contexto.yml"
        if workflow.is_file():
            self.assertIn(WORKFLOW_SECRET_GUARD, workflow.read_text(encoding="utf-8"),
                          "o guard do workflow mudou: atualize WORKFLOW_SECRET_GUARD e revise scrub()")

    def test_cron_run_messages_do_not_carry_personal_data(self):
        def query(_conn, sql, params=None):
            if "pg_extension" in sql:
                return [{"present": 1}]
            self.assertIn("cron.job_run_details", sql)
            return [
                {"jobid": 1, "return_message": "ERROR: lead maria.silva+promo@example.com.br já notificado"},
                {"jobid": 1, "return_message": "falha ao enviar WhatsApp para 5511987654321 (CPF 12345678901)"},
                {"jobid": 2, "return_message": "3 rows"}, {"jobid": 2, "return_message": None},
            ]

        with mock.patch.object(self.snapshot, "q", side_effect=query):
            with contextlib.redirect_stdout(io.StringIO()):
                runs = self.snapshot.get_cron_runs(OfflineConnection())
        self.assertEqual([run["return_message"] for run in runs], [
            "ERROR: lead [REDACTED_PII] já notificado",
            "falha ao enviar WhatsApp para [REDACTED_PII] (CPF [REDACTED_PII])", "3 rows", None])


class SnapshotTargetGuardTests(unittest.TestCase):
    SITE = "abcdefghijklmnopqrst"
    CATALOG = "zyxwvutsrqponmlkjihg"

    def problem(self, dsn, **env):
        snapshot = load_snapshot({"SUPABASE_DB_URL": dsn, **env})
        return snapshot, snapshot.target_problem()

    def test_project_ref_is_detected_in_every_supabase_connection_shape(self):
        shapes = {
            f"postgresql://postgres.{self.SITE}:pw@aws-0-sa-east-1.pooler.supabase.com:5432/postgres": self.SITE,
            f"postgresql://postgres.{self.SITE}:pw@aws-0-sa-east-1.pooler.supabase.com:6543/postgres": self.SITE,
            f"postgresql://postgres:pw@db.{self.SITE}.supabase.co:5432/postgres": self.SITE,
            f"postgresql://postgres:pw@pooler.example.com/postgres?options=reference%3D{self.SITE}": self.SITE,
            f"host=db.{self.SITE}.supabase.co user=postgres password=pw dbname=postgres": self.SITE,
            f"host=pooler.example.com user=postgres.{self.SITE} password=pw": self.SITE,
            "postgresql://postgres:pw@localhost:5432/postgres": "",
            f"postgresql://postgres:{self.SITE}@localhost/postgres": "",  # senha parecida com ref não conta
        }
        for dsn, expected in shapes.items():
            with self.subTest(dsn=dsn[:50]):
                snapshot, problem = self.problem(dsn)
                self.assertEqual(snapshot.detect_project_ref(dsn), expected)
                self.assertIsNone(problem, "sem guard configurado nada é bloqueado")

    def test_guard_matrix_fails_closed(self):
        site = f"postgresql://postgres.{self.SITE}:pw@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
        catalog = f"postgresql://postgres:pw@db.{self.CATALOG}.supabase.co:5432/postgres"
        unknown = "postgresql://postgres:pw@10.0.0.5:5432/postgres"
        cases = [
            (site, {"SNAPSHOT_EXPECTED_REF": self.SITE, "SNAPSHOT_FORBIDDEN_REFS": self.CATALOG}, None),
            (site, {"SNAPSHOT_EXPECTED_REF": self.SITE, "SUPABASE_PROJECT_REF": self.SITE}, None),
            (unknown, {"SUPABASE_PROJECT_REF": self.SITE}, None),
            (catalog, {"SNAPSHOT_EXPECTED_REF": self.SITE}, f"aponta para {self.CATALOG}"),
            (unknown, {"SNAPSHOT_EXPECTED_REF": self.SITE}, "não identifica o projeto"),
            (catalog, {"SNAPSHOT_FORBIDDEN_REFS": f"outro, {self.CATALOG}"}, "SNAPSHOT_FORBIDDEN_REFS"),
            (site, {"SNAPSHOT_FORBIDDEN_REFS": self.CATALOG, "SUPABASE_PROJECT_REF": self.CATALOG}, "SNAPSHOT_FORBIDDEN_REFS"),
            (catalog, {"SUPABASE_PROJECT_REF": self.SITE}, "não corresponde ao projeto da conexão"),
            (site, {"SNAPSHOT_EXPECTED_REF": self.SITE, "SUPABASE_PROJECT_REF": self.CATALOG}, "não corresponde"),
        ]
        for dsn, env, expected in cases:
            with self.subTest(env=env, dsn=dsn[:40]):
                snapshot, problem = self.problem(dsn, **env)
                if expected is None:
                    self.assertIsNone(problem)
                    continue
                self.assertIn("BLOQUEADO", problem)
                self.assertIn(expected, problem)
                self.assertNotIn(":pw@", problem)
                with tempfile.TemporaryDirectory(prefix="snapshot-guard-test-") as directory:
                    snapshot.OUT = pathlib.Path(directory) / "output"
                    code, out, err = run_main(snapshot)
                    self.assertEqual(code, 2)
                    self.assertIn("Nada foi coletado", err)
                    self.assertFalse(snapshot.OUT.exists())
                snapshot.psycopg.connect.assert_not_called()


class SnapshotTargetManifestTests(CatalogFixture):
    extra_env = {"SUPABASE_DB_URL": "postgresql://postgres.abcdefghijklmnopqrst:pw@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
                 "SNAPSHOT_EXPECTED_REF": "abcdefghijklmnopqrst"}

    def test_collected_project_is_recorded_for_readers(self):
        code, out, _ = self.collect_catalog()
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(self.document("manifest.json"))["projeto"], "abcdefghijklmnopqrst")
        self.assertIn("| ref do projeto (conexão) | abcdefghijklmnopqrst |", self.document("README.md"))
        self.assertIn("projeto da conexão: abcdefghijklmnopqrst", out)


class SnapshotUnavailableSectionTests(CatalogFixture):
    """Seção que falhou é NÃO VERIFICADO; só seção que respondeu vazia pode dizer "não existe"."""

    def test_total_failure_with_previous_snapshot_changes_nothing_and_fails(self):
        self.assertEqual(self.collect_catalog()[0], 0)
        before = tree(self.out)
        code, out, _ = self.collect_catalog(failures=set(STRUCTURAL_SECTIONS) | set(VOLATILE_SECTIONS))
        self.assertEqual(code, 1, "nenhuma seção respondeu: reaproveitar tudo não é uma coleta")
        self.assertIn("Banco inteiro indisponível", out)
        self.assertEqual(tree(self.out), before)

    def test_one_live_section_is_enough_to_publish_a_partial_snapshot(self):
        self.assertEqual(self.collect_catalog()[0], 0)
        failures = (set(STRUCTURAL_SECTIONS) | set(VOLATILE_SECTIONS)) - {"extensions"}
        self.assertEqual(self.collect_catalog(failures=failures)[0], 0)
        self.assertEqual(set(self.metadata()["carried"]), set(STRUCTURAL_SECTIONS) - {"extensions"})

    def test_failed_sections_are_never_published_as_absent(self):
        failed = {"views", "cron", "queues", "policies", "columns", "storage", "realtime", "lints", "indexes",
                  "constraints", "triggers", "grants"}
        self.assertEqual(self.collect_catalog(failures=failed)[0], 0)
        for name in ("views.md", "cron.md", "queues.md", "storage.md", "policies.md", "lints.md", "indexes.md",
                     "relationships.md", "triggers.md", "grants.md", "realtime.md", "tables.md"):
            with self.subTest(document=name):
                self.assertIn("**NÃO VERIFICADO**", self.document(name))
        for name, absent in (("views.md", "_nenhuma_"), ("cron.md", "não instalada"), ("queues.md", "não instalada")):
            with self.subTest(document=name):
                self.assertNotIn(absent, self.document(name))
                self.assertIn("Coleta indisponível", self.document(name))
        orders = self.document("tables/public/orders.md")
        self.assertNotIn("sem policies", orders, "sem coleta de policies não há como afirmar que não existe nenhuma")
        for name in ("columns", "constraints", "indexes", "policies", "triggers", "grants"):
            self.assertIn(f"**NÃO VERIFICADO** — seção `{name}`", orders)
        self.assertIn("| policies | n/d |", orders)
        self.assertIn("| realtime (publication) | n/d |", orders)
        self.assertIn("| [public.orders](tables/public/orders.md) | table | sim | n/d | n/d | n/d |", self.document("tables.md"))
        summary = self.summary()
        for label in ("colunas", "views", "triggers", "policies (RLS)", "índices", "cron jobs", "filas pgmq", "buckets",
                      "lints ALTA", "lints total"):
            self.assertEqual(summary[label], "n/d", label)
        self.assertEqual(summary["tabelas"], "1")
        self.assertEqual(summary["extensões"], "0")

    def test_sections_that_answered_empty_keep_the_plain_absence_wording(self):
        self.assertEqual(self.collect_catalog()[0], 0)
        self.assertEqual(self.metadata()["errors"], [])
        self.assertEqual(self.document("views.md"), "# Views\n\n_nenhuma_\n")
        self.assertIn("_extensão pg_cron não instalada_", self.document("cron.md"))
        self.assertIn("_extensão pgmq não instalada_", self.document("queues.md"))
        self.assertIn("RLS habilitado **sem policies**", self.document("tables/public/orders.md"))
        self.assertIn("| policies | 0 |", self.document("tables/public/orders.md"))
        for path, content in tree(self.out).items():
            self.assertNotIn("NÃO VERIFICADO", content.decode("utf-8"), path)
        summary = self.summary()
        for label in ("colunas", "views", "policies (RLS)", "cron jobs", "filas pgmq", "buckets", "lints total"):
            self.assertEqual(summary[label], "0", label)

    def test_carried_sections_are_flagged_inside_each_table_file(self):
        records = healthy_catalog()
        records["policies"] = [policy()]
        self.assertEqual(self.collect_catalog(records)[0], 0)
        self.assertNotIn("versão anterior", self.document("tables/public/orders.md"))
        self.assertEqual(self.collect_catalog(records, failures={"policies"})[0], 0)
        orders = self.document("tables/public/orders.md")
        self.assertIn("Seção `policies` não pôde ser atualizada nesta coleta", orders)
        self.assertIn("### `orders_owner`", orders, "a versão anterior continua visível, com o aviso")
        self.assertIn("| policies | 1 |", orders)
        self.assertEqual(self.summary()["policies (RLS)"], "1")

    def test_failed_volatile_sections_are_flagged_in_the_metrics(self):
        self.assertEqual(self.collect_catalog(failures={"table_stats", "index_stats", "db_stats", "cron_runs"})[0], 0)
        stats = self.document("stats.md")
        for name in ("db_stats", "table_stats", "index_stats"):
            self.assertIn(f"**NÃO VERIFICADO** — seção `{name}`", stats)
        self.assertIn("**NÃO VERIFICADO** — seção `cron_runs`", self.document("cron-runs.md"))

    def test_function_files_do_not_collide_when_names_differ_only_outside_ascii(self):
        first, second = function("relatório"), function("relatário", value=2)
        other_schema = {**function("relatório", value=3), "schema": "público"}
        another_schema = {**function("relatório", value=4), "schema": "publico"}
        functions = [first, second, other_schema, another_schema]
        self.assertEqual(self.collect_catalog({**healthy_catalog(), "functions": functions})[0], 0)
        links = re.findall(r"\]\((functions/[^)]+\.sql)\)", self.document("functions.md"))
        self.assertEqual(len(set(links)), 4, links)
        written = {self.document(link).strip() for link in links}
        self.assertEqual(written, {entry["definition"] for entry in functions})
        # Sem colisão, o caminho continua o de sempre.
        self.assertEqual(links[0], f"functions/public/relat_rio__{self.snapshot.sha('')}.sql")

    def test_second_collection_on_the_same_directory_is_refused_while_the_first_is_writing(self):
        import fcntl
        self.assertEqual(self.collect_catalog()[0], 0)
        before = tree(self.out)
        with open(self.out / self.snapshot.OUTPUT_MARKER, "a", encoding="utf-8") as other_process:
            fcntl.flock(other_process, fcntl.LOCK_EX | fcntl.LOCK_NB)
            code, _, err = self.collect_catalog()
            self.assertEqual(code, 1)
            self.assertIn("Outra coleta está gravando", err)
            self.assertNotIn("Traceback", err)
            self.connect.assert_not_called()
            self.assertEqual(tree(self.out), before)
        # Liberada a trava (inclusive a da própria coleta anterior), a pasta volta a aceitar coletas.
        self.assertEqual(self.collect_catalog()[0], 0)
        self.assertEqual(self.collect_catalog()[0], 0)

    def test_unwritable_output_directory_is_a_configuration_error_without_traceback(self):
        with mock.patch.object(pathlib.Path, "mkdir", side_effect=PermissionError(13, "Permission denied")):
            code, _, err = self.collect_catalog()
        self.assertEqual(code, 2)
        self.assertIn("não foi possível preparar SNAPSHOT_DIR", err)
        self.assertIn("Permission denied", err)
        self.connect.assert_not_called()

    def test_identical_collections_produce_identical_files(self):
        records = {**healthy_catalog(), "policies": [policy()], "functions": [function()], "migrations": [migration()]}
        for failures in ((), ("views", "table_stats")):
            with self.subTest(failures=failures):
                shutil.rmtree(self.out, ignore_errors=True)
                self.assertEqual(self.collect_catalog(records, failures=failures)[0], 0)
                first = tree(self.out)
                self.assertEqual(self.collect_catalog(records, failures=failures)[0], 0)
                second = tree(self.out)
                self.assertEqual(set(first), set(second))
                changed = {name for name in first if first[name] != second[name]}
                self.assertLessEqual(changed, {"manifest.json"}, "só o frescor (gerado_em) pode variar")
                for content in second.values():
                    self.assertNotIn(".tmp-", content.decode("utf-8"))
                self.assertFalse([name for name in second if ".tmp-" in name])

    def test_interrupted_write_keeps_the_previous_file_and_leaves_no_partial_file(self):
        target = self.out / "snapshot.json"
        self.snapshot.write(target, '{"format_version": 2}')
        original = pathlib.Path.write_text

        def half_write(path, data, *args, **kwargs):
            original(path, data[: len(data) // 2], *args, **kwargs)
            raise OSError("disco cheio na fixture")

        with mock.patch.object(pathlib.Path, "write_text", half_write):
            with self.assertRaisesRegex(OSError, "disco cheio"):
                self.snapshot.write(target, '{"format_version": 2, "db": {"tables": []}}')
        self.assertEqual(target.read_text(encoding="utf-8"), '{"format_version": 2}\n')
        self.assertEqual([path.name for path in self.out.iterdir()], ["snapshot.json"])


class SnapshotQueryContractTests(SnapshotFixture):
    """Sem banco no CI: fixa o texto das consultas cujos erros só aparecem em Postgres real
    (as mesmas regressões rodam de verdade em SnapshotLivePostgresTests)."""

    def queries(self, collector):
        sent = []

        def query(_conn, sql, params=None):
            sent.append(" ".join(sql.split()))
            return [{"db": "fixture"}] if "current_database()" in sql else []

        with mock.patch.object(self.snapshot, "q", side_effect=query):
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertIsNotNone(collector(OfflineConnection()))
        return sent

    def test_constraint_columns_follow_the_key_order_not_the_table_order(self):
        constraints, = self.queries(self.snapshot.get_constraints)
        for key, relation in (("con.conkey", "con.conrelid"), ("con.confkey", "con.confrelid")):
            self.assertIn(f"unnest({key}) WITH ORDINALITY k(attnum, ord) JOIN pg_attribute a "
                          f"ON a.attrelid = {relation} AND a.attnum = k.attnum ORDER BY k.ord", constraints)
        lints = " ".join(self.queries(self.snapshot.get_lints))
        self.assertNotRegex(lints + constraints, r"unnest\(con\.conf?key\) k\b")

    def test_server_settings_do_not_report_the_limits_of_the_collection_itself(self):
        settings = self.queries(self.snapshot.get_server)[0]
        self.assertIn("SELECT lower(name) AS name, reset_val AS setting FROM pg_settings WHERE lower(name) IN (", settings)
        self.assertIn("'timezone'", settings)

    def test_grants_come_from_the_acl_catalog_visible_to_any_role(self):
        tables, columns, *_ = self.queries(self.snapshot.get_grants)
        self.assertNotIn("information_schema.", tables + columns)
        self.assertIn("aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner)))", tables)
        self.assertIn("aclexplode(at.attacl)", columns)
        self.assertIn("WHEN a.grantee = 0 THEN 'PUBLIC'", tables)

    def test_domain_constraints_have_a_stable_order(self):
        domains = self.queries(self.snapshot.get_types)[1]
        self.assertIn("string_agg(pg_get_constraintdef(c.oid), ' ' ORDER BY c.conname)", domains)


class SnapshotCommandLineTests(unittest.TestCase):
    def test_help_needs_neither_driver_nor_configuration(self):
        snapshot = load_snapshot({}, driver_available=False)
        for flag in ("--help", "-h"):
            with self.subTest(flag=flag):
                code, out, err = run_main(snapshot, [flag])
                self.assertEqual((code, err), (0, ""))
                for expected in ("SUPABASE_DB_URL", "SNAPSHOT_DIR", "--help", "Códigos de saída"):
                    self.assertIn(expected, out)

    def test_missing_driver_is_reported_with_the_install_command(self):
        snapshot = load_snapshot({"SUPABASE_DB_URL": OFFLINE_DB_URL}, driver_available=False)
        code, _, err = run_main(snapshot, [])
        self.assertEqual(code, 2)
        self.assertIn("Dependência ausente: psycopg", err)
        self.assertIn("requirements.txt", err)
        self.assertNotIn("Traceback", err)

    def test_command_line_entry_point(self):
        with tempfile.TemporaryDirectory(prefix="snapshot-cli-test-") as directory:
            env = {"PATH": os.environ.get("PATH", ""), "SNAPSHOT_DIR": str(pathlib.Path(directory) / "output")}
            cases = [(["--help"], {}, 0, "Uso:", ""), ([], {}, 2, "", "SUPABASE_DB_URL não definido"),
                     ([], {"SUPABASE_DB_URL": "   "}, 2, "", "SUPABASE_DB_URL não definido"),
                     (["--out", "x"], {"SUPABASE_DB_URL": OFFLINE_DB_URL}, 2, "", "Argumento não reconhecido"),
                     ([], {"SUPABASE_DB_URL": OFFLINE_DB_URL, "CRON_RUNS_PER_JOB": "-1"}, 2, "", "CRON_RUNS_PER_JOB"),
                     ([], {"SUPABASE_DB_URL": "postgresql://u:p w@h/db"}, 2, "", "a URI contém espaço")]
            for arguments, extra, code, stdout, stderr in cases:
                with self.subTest(arguments=arguments, extra=sorted(extra)):
                    result = subprocess.run([sys.executable, str(SCRIPT), *arguments], env={**env, **extra},
                                            capture_output=True, text=True, timeout=60, check=False)
                    self.assertEqual(result.returncode, code, result.stderr)
                    self.assertIn(stdout, result.stdout)
                    self.assertIn(stderr, result.stderr)
                    self.assertNotIn("Traceback", result.stderr)
            self.assertFalse((pathlib.Path(directory) / "output").exists())


class SnapshotManagementApiTests(CatalogFixture):
    TOKEN = "sbp_fixture_token_0123456789abcdef"
    extra_env = {"SUPABASE_PROJECT_REF": "abcdefghijklmnopqrst", "SUPABASE_ACCESS_TOKEN": TOKEN}

    def api(self, *, failing=False):
        payloads = {
            "": {"id": "abcdefghijklmnopqrst", "name": "fixture", "region": "sa-east-1", "status": "ACTIVE_HEALTHY"},
            "/functions": [{"slug": "notify", "name": "notify", "status": "ACTIVE", "version": 3, "verify_jwt": True}],
            "/secrets": [{"name": "RESEND_API_KEY", "value": "segredo-que-nunca-sai"}],
            "/config/auth": {"site_url": "https://example.com", "smtp_pass": "segredo-que-nunca-sai"},
            "/postgrest": {"db_schema": "public", "max_rows": 1000, "jwt_secret": "segredo-que-nunca-sai"},
            "/config/database/pooler": {"pool_mode": "transaction",
                                        "connection_string": "postgresql://u:segredo-que-nunca-sai@h/db"},
        }

        def urlopen(request, timeout=None):
            self.assertEqual(request.get_header("Authorization"), f"Bearer {self.TOKEN}")
            path = request.full_url.split("/projects/abcdefghijklmnopqrst", 1)[1].split("?")[0]
            if failing:
                raise urllib.error.URLError(f"proxy recusou Authorization: Bearer {self.TOKEN}")
            if path not in payloads:
                raise urllib.error.HTTPError(request.full_url, 404, "Not Found", None, None)
            response = mock.MagicMock()
            response.__enter__.return_value.read.return_value = json.dumps(payloads[path]).encode("utf-8")
            return response

        return urlopen

    def test_api_outage_reuses_the_previous_collection_instead_of_recording_removals(self):
        self.assertEqual(self.collect_catalog(urlopen=self.api())[0], 0)
        healthy = self.metadata()["api"]
        changelog = self.document("CHANGELOG.md")
        self.assertEqual([f["slug"] for f in healthy["edge_functions"]], ["notify"])
        self.assertTrue((self.out / "edge-functions" / "notify" / "README.md").is_file())

        code, out, err = self.collect_catalog(urlopen=self.api(failing=True))
        self.assertEqual(code, 0)
        metadata = self.metadata()
        self.assertEqual(metadata["api"], healthy)
        self.assertEqual(self.document("CHANGELOG.md"), changelog, "falha da API não é remoção")
        self.assertTrue((self.out / "edge-functions" / "notify" / "README.md").is_file())
        self.assertLessEqual({"api.edge_functions", "api.auth_config", "api.postgrest_config"}, set(metadata["carried"]))
        self.assertIn("api.edge_functions", {error["section"] for error in metadata["errors"]})
        self.assertIn("Seção `api.edge_functions` não pôde ser atualizada", self.document("edge-functions.md"))
        for text in (out, err, *(content.decode("utf-8") for content in tree(self.out).values())):
            self.assertNotIn(self.TOKEN, text)
            self.assertNotIn("segredo-que-nunca-sai", text)

        self.assertEqual(self.collect_catalog(urlopen=self.api())[0], 0)
        self.assertEqual(self.metadata()["carried"], [])
        self.assertEqual(self.metadata()["errors"], [])


class SnapshotRequirementsTests(unittest.TestCase):
    def test_every_third_party_import_is_pinned(self):
        imported = set()
        for node in ast.walk(ast.parse(SCRIPT.read_text(encoding="utf-8"))):
            if isinstance(node, ast.Import):
                imported |= {alias.name.split(".")[0] for alias in node.names}
            elif isinstance(node, ast.ImportFrom) and node.module and not node.level:
                imported.add(node.module.split(".")[0])
        third_party = imported - set(sys.stdlib_module_names)
        requirements = [line.split("#")[0].strip() for line in
                        SCRIPT.with_name("requirements.txt").read_text(encoding="utf-8").splitlines()]
        pinned = dict(re.fullmatch(r"([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?==([0-9][A-Za-z0-9.]*)", line).groups()
                      for line in requirements if line)
        self.assertEqual(third_party, {"psycopg"})
        self.assertEqual(set(pinned), third_party, "requirements.txt deve conter exatamente o que o script importa")


LIVE_URL = os.environ.get("SNAPSHOT_TEST_PG_URL", "").strip()


@unittest.skipUnless(LIVE_URL, "defina SNAPSHOT_TEST_PG_URL (Postgres descartável, via TCP, usuário superuser) para rodar contra banco real")
class SnapshotLivePostgresTests(unittest.TestCase):
    """Regressões que só um Postgres de verdade prova. Cria um schema e duas roles próprios e os remove no fim."""

    @classmethod
    def setUpClass(cls):
        try:
            import psycopg
            from psycopg.conninfo import conninfo_to_dict
        except ModuleNotFoundError as error:
            raise unittest.SkipTest("psycopg não instalado") from error
        cls.psycopg = psycopg
        cls.schema = f"snapshot_live_{os.getpid()}"
        cls.reader = f"snapshot_live_reader_{os.getpid()}"
        cls.other = f"snapshot_live_other_{os.getpid()}"
        cls.password = "p@ss:w/rd %x y#?"
        cls.addClassCleanup(cls.drop_fixture)
        cls.drop_fixture()
        cls.admin(f"""
            CREATE ROLE {cls.reader} LOGIN PASSWORD '{cls.password}';
            CREATE ROLE {cls.other} NOLOGIN;
            GRANT pg_read_all_data TO {cls.reader};
            CREATE SCHEMA {cls.schema};
            CREATE TABLE {cls.schema}.parent (a int, b int, c int, PRIMARY KEY (c, a), UNIQUE (b, a));
            CREATE TABLE {cls.schema}.child (x int, y int, FOREIGN KEY (y, x) REFERENCES {cls.schema}.parent (c, a));
            CREATE TABLE {cls.schema}.guarded (id int PRIMARY KEY, note text);
            INSERT INTO {cls.schema}.guarded VALUES (1, 'linha-que-nunca-sai');
            ALTER TABLE {cls.schema}.guarded ENABLE ROW LEVEL SECURITY;
            GRANT SELECT, UPDATE ON {cls.schema}.parent TO {cls.other};
            GRANT INSERT (x) ON {cls.schema}.child TO {cls.other};
            CREATE DOMAIN {cls.schema}.code AS text CONSTRAINT z_first CHECK (VALUE <> '') CONSTRAINT a_second CHECK (length(VALUE) < 9);
        """)
        target = conninfo_to_dict(LIVE_URL)
        cls.reader_url = (f"postgresql://{cls.reader}:{urllib.parse.quote(cls.password, safe='')}"
                          f"@{target['host']}:{target.get('port', 5432)}/{target['dbname']}")
        cls.owner = cls.run_script(LIVE_URL)
        cls.as_reader = cls.run_script(cls.reader_url)

    @classmethod
    def admin(cls, sql):
        with cls.psycopg.connect(LIVE_URL, autocommit=True) as connection:
            return connection.execute(sql).fetchall() if sql.lstrip().upper().startswith("SELECT") else connection.execute(sql)

    @classmethod
    def drop_fixture(cls):
        cls.admin(f"DROP SCHEMA IF EXISTS {cls.schema} CASCADE; DROP ROLE IF EXISTS {cls.reader}; DROP ROLE IF EXISTS {cls.other}")

    @classmethod
    def run_script(cls, url, sections=()):
        directory = pathlib.Path(tempfile.mkdtemp(prefix="snapshot-live-test-"))
        cls.addClassCleanup(shutil.rmtree, directory, True)
        env = {"SUPABASE_DB_URL": url, "SNAPSHOT_DIR": str(directory / "output"), "PGDUMP": "false", "GEN_TYPES": "false",
               "REPO_ROOT": "", "PATH": os.environ.get("PATH", ""), "HOME": os.environ.get("HOME", "/")}
        spec = importlib.util.spec_from_file_location("snapshot_live", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        with mock.patch.dict(os.environ, env, clear=True):
            spec.loader.exec_module(module)
            for name, body in sections:
                module.DB_SECTIONS.insert(1, module.section(name)(body))
            code, out, err = run_main(module, [])
        output = directory / "output"
        snapshot = json.loads((output / "snapshot.json").read_text(encoding="utf-8")) if code == 0 else None
        return {"code": code, "out": out, "err": err, "dir": output, "snapshot": snapshot}

    def rows(self, run, section, key=None):
        data = run["snapshot"]["db"][section]
        data = data[key] if key else data
        return [row for row in data if row.get("schema") == self.schema]

    def test_collection_succeeds_without_errors_as_owner(self):
        self.assertEqual(self.owner["code"], 0, self.owner["err"])
        self.assertEqual(self.owner["snapshot"]["errors"], [])

    def test_composite_keys_keep_the_declared_column_order(self):
        constraints = {row["name"]: row for row in self.rows(self.owner, "constraints")}
        self.assertEqual(constraints["parent_pkey"]["columns"], ["c", "a"])
        self.assertEqual(constraints["parent_b_a_key"]["columns"], ["b", "a"])
        foreign = constraints["child_y_x_fkey"]
        self.assertEqual((foreign["columns"], foreign["ref_columns"]), (["y", "x"], ["c", "a"]))
        self.assertIn(f"| {self.schema}.child | y, x | {self.schema}.parent | c, a |",
                      (self.owner["dir"] / "relationships.md").read_text(encoding="utf-8"))

    def test_server_settings_are_the_database_ones_not_the_collection_limits(self):
        (expected,), = self.admin("SELECT reset_val FROM pg_settings WHERE name = 'statement_timeout'")
        server = self.owner["snapshot"]["db"]["server"]
        self.assertEqual(server["statement_timeout"], expected)
        (timezone,), = self.admin("SELECT reset_val FROM pg_settings WHERE name = 'TimeZone'")
        self.assertEqual(server["timezone"], timezone)

    def test_domain_constraints_are_ordered_by_name(self):
        domain, = [row for row in self.rows(self.owner, "types") if row["name"] == "code"]
        self.assertLess(domain["definition"].index("length(VALUE)"), domain["definition"].index("<> ''"))

    def test_reader_role_publishes_the_same_grants_as_the_owner(self):
        self.assertEqual(self.as_reader["code"], 0, self.as_reader["err"])
        for key in ("tables", "columns"):
            with self.subTest(key=key):
                self.assertEqual(self.rows(self.as_reader, "grants", key), self.rows(self.owner, "grants", key))
        self.assertIn({"schema": self.schema, "table": "parent", "grantee": self.other, "privileges": "SELECT, UPDATE"},
                      self.rows(self.as_reader, "grants", "tables"))
        self.assertIn({"schema": self.schema, "table": "child", "column": "x", "grantee": self.other, "privileges": "INSERT"},
                      self.rows(self.as_reader, "grants", "columns"))

    def test_row_level_security_is_an_error_instead_of_an_empty_result(self):
        def guarded(connection, module=None):
            return self.module.q(connection, f"SELECT id FROM {self.schema}.guarded")

        run = self.run_with_module(self.reader_url, [("rls_probe", guarded)])
        errors = {error["section"]: error["error"] for error in run["snapshot"]["errors"]}
        self.assertIn("row-level security", errors["rls_probe"])
        self.assertIsNone(run["snapshot"]["db"]["rls_probe"])

    def run_with_module(self, url, sections):
        # As seções injetadas precisam do q() do módulo carregado para esta execução.
        test = self

        def bind(body):
            def section(connection):
                test.module = sys.modules.get("snapshot_live_current")
                return body(connection)
            return section

        directory = pathlib.Path(tempfile.mkdtemp(prefix="snapshot-live-test-"))
        self.addCleanup(shutil.rmtree, directory, True)
        env = {"SUPABASE_DB_URL": url, "SNAPSHOT_DIR": str(directory / "output"), "PGDUMP": "false", "GEN_TYPES": "false",
               "REPO_ROOT": "", "PATH": os.environ.get("PATH", ""), "HOME": os.environ.get("HOME", "/")}
        spec = importlib.util.spec_from_file_location("snapshot_live_current", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        with mock.patch.dict(os.environ, env, clear=True), mock.patch.dict(sys.modules, {"snapshot_live_current": module}):
            spec.loader.exec_module(module)
            for name, body in sections:
                module.DB_SECTIONS.insert(1, module.section(name)(bind(body)))
            code, out, err = run_main(module, [])
        self.assertEqual(code, 0, err)
        output = directory / "output"
        return {"code": code, "out": out, "err": err, "dir": output,
                "snapshot": json.loads((output / "snapshot.json").read_text(encoding="utf-8"))}

    def test_writes_are_refused_even_after_trying_to_leave_read_only(self):
        table_name = f"{self.schema}.must_not_exist"

        def create(connection):
            connection.execute(f"CREATE TABLE {table_name} (id int)")
            return []

        def insert(connection):
            return self.module.q(connection, f"INSERT INTO {self.schema}.guarded VALUES (2, 'x') RETURNING id")

        def escape(connection):
            connection.execute("SET TRANSACTION READ WRITE")
            connection.execute(f"DELETE FROM {self.schema}.guarded")
            return []

        run = self.run_with_module(LIVE_URL, [("write_create", create), ("write_insert", insert), ("write_escape", escape)])
        errors = {error["section"]: error["error"] for error in run["snapshot"]["errors"]}
        self.assertIn("read-only transaction", errors["write_create"])
        self.assertIn("read-only transaction", errors["write_insert"])
        self.assertIn("read-write mode must be set before any query", errors["write_escape"])
        (exists, rows), = self.admin(f"SELECT to_regclass('{table_name}') IS NOT NULL, (SELECT count(*) FROM {self.schema}.guarded)")
        self.assertEqual((exists, rows), (False, 1))
        # A falha das seções injetadas não derruba as demais nem deixa limite pendurado na sessão.
        self.assertTrue(self.rows(run, "tables"))

    def test_output_has_no_row_data_and_no_password(self):
        for run in (self.owner, self.as_reader):
            for name, content in tree(run["dir"]).items():
                text = content.decode("utf-8")
                with self.subTest(file=name):
                    self.assertNotIn("linha-que-nunca-sai", text)
                    self.assertNotIn(self.password, text)
                    self.assertNotIn(urllib.parse.quote(self.password, safe=""), text)
            self.assertNotIn(self.password, run["out"] + run["err"])


if __name__ == "__main__":
    unittest.main()
