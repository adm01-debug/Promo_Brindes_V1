"""Regressões offline do índice único; cada caso monta as fontes numa pasta temporária."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path


SCRIPT = Path(__file__).with_name("indice.py")
HEAD = "abc1234def5678900000000000000000000000ff"


def stamp(minutes_ago: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).strftime("%Y-%m-%dT%H:%M:%SZ")


class IndexTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="context-index-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name) / "repo"
        self.root.mkdir()

    def source(self, name, manifest=None, files=("INDEX.md",)):
        folder = self.root / "docs/contexto" / name
        folder.mkdir(parents=True, exist_ok=True)
        for file in files:
            (folder / file).parent.mkdir(parents=True, exist_ok=True)
            (folder / file).write_text("x\n", encoding="utf-8")
        if manifest is not None:
            (folder / "manifest.json").write_text(manifest if isinstance(manifest, str) else json.dumps(manifest), encoding="utf-8")
        return folder

    def run_index(self, *args, repo=None, out="docs/contexto/00-INDEX.md", head=HEAD):
        command = [sys.executable, str(SCRIPT), "--repo", str(repo or self.root), "--out", out, *args]
        if head:
            command += ["--head", head]
        return subprocess.run(command, capture_output=True, text=True, timeout=30)

    def rows(self, out="docs/contexto/00-INDEX.md"):
        text = (self.root / out).read_text(encoding="utf-8")
        table = text.split("## Onde está cada coisa")[1].split("## Ordem de leitura")[0]
        rows = {}
        for line in table.splitlines()[4:]:
            cells = [c.strip() for c in line.replace("\\|", "\0").strip().strip("|").split("|")]
            if len(cells) == 4:
                rows[cells[1].strip("*").replace("\0", "|")] = {"onde": cells[2], "estado": cells[3]}
        return rows

    def three_sources(self):
        return ("--fonte", "banco real=docs/contexto/supabase", "--fonte", "código=docs/contexto/codigo",
                "--fonte", "regras de negócio=docs/contexto/regras")

    def test_fresh_sources_are_ok_and_missing_source_is_not_invented(self):
        self.source("codigo", {"gerado_em": stamp(3), "commit": HEAD})
        self.source("regras", {"gerado_em": stamp(2000), "commit": HEAD, "entrada": "07-REGRAS-DE-NEGOCIO.md"}, files=("07-REGRAS-DE-NEGOCIO.md",))
        result = self.run_index(*self.three_sources())
        self.assertEqual(result.returncode, 0, result.stderr)
        rows = self.rows()
        self.assertTrue(rows["código"]["estado"].startswith("ok · "))
        # regras no mesmo commit do HEAD continuam atuais apesar da idade da coleta
        self.assertTrue(rows["regras de negócio"]["estado"].startswith("ok · "), rows)
        self.assertEqual(rows["regras de negócio"]["onde"], "`docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md`")
        self.assertEqual(rows["banco real"]["estado"], "ainda não gerado")
        self.assertEqual(list(rows), ["regras de negócio", "banco real", "código"])

    def test_stale_database_and_other_commit_are_flagged(self):
        self.source("supabase", {"gerado_em": stamp(200)})
        self.source("codigo", {"gerado_em": stamp(1), "commit": "9999999aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})
        self.assertEqual(self.run_index(*self.three_sources()).returncode, 0)
        rows = self.rows()
        self.assertTrue(rows["banco real"]["estado"].startswith("desatualizado · "), rows)
        self.assertIn("desatualizado há 3h20", rows["banco real"]["estado"])
        self.assertIn("gerado no commit `9999999`, HEAD é `abc1234`", rows["código"]["estado"])

    def test_future_collection_date_is_not_reported_as_fresh(self):
        self.source("supabase", {"gerado_em": "2099-01-01T00:00:00Z"})
        self.source("codigo", {"gerado_em": "2099-01-01T00:00:00.000Z", "commit": HEAD})
        self.assertEqual(self.run_index(*self.three_sources()).returncode, 0)
        rows = self.rows()
        for name in ("banco real", "código"):
            self.assertEqual(rows[name]["estado"], "não verificável · ⚠️ data da coleta no futuro (2099-01-01 00:00 UTC)")
        self.assertNotIn("-", rows["código"]["estado"].split("·")[0])

    def test_source_without_verifiable_date_is_not_ok(self):
        self.source("supabase", {"commit": "zzz"})
        self.source("codigo", {"commit": HEAD})
        self.assertEqual(self.run_index(*self.three_sources()).returncode, 0)
        rows = self.rows()
        self.assertEqual(rows["banco real"]["estado"], "não verificável · ⚠️ sem data de coleta verificável")
        self.assertEqual(rows["código"]["estado"], "ok")

    def test_folder_with_only_manual_rules_was_not_generated(self):
        self.source("regras", files=("manual/README.md", "manual/TEMPLATE-regras-de-negocio.md"))
        self.assertEqual(self.run_index(*self.three_sources()).returncode, 0)
        row = self.rows()["regras de negócio"]
        self.assertEqual(row["estado"], "ainda não gerado")
        self.assertIn("o produtor ainda não rodou", row["onde"])

    def test_hostile_manifest_cannot_break_or_redirect_the_index(self):
        (self.root.parent / "secret.md").write_text("fora do repo\n", encoding="utf-8")
        self.source("codigo", {"gerado_em": 12345, "commit": 123, "entrada": ["x"]})
        self.source("regras", {"gerado_em": stamp(1), "commit": HEAD, "entrada": "../../../../secret.md"})
        self.source("supabase", "[1, 2]")
        result = self.run_index(*self.three_sources())
        self.assertEqual(result.returncode, 0, result.stderr)
        rows = self.rows()
        self.assertEqual(rows["código"]["estado"], "não verificável · ⚠️ sem data de coleta verificável")
        self.assertEqual(rows["regras de negócio"]["onde"], "`docs/contexto/regras/INDEX.md`")
        self.assertEqual(rows["banco real"]["estado"], "não verificável · ⚠️ manifest.json não contém um objeto JSON")

    def test_collection_errors_make_the_source_partial(self):
        folder = self.source("supabase", {"gerado_em": stamp(1), "carried": ["cron"]})
        (folder / "errors.md").write_text("| seção | erro |\n|---|---|\n| lints | timeout |\n", encoding="utf-8")
        self.assertEqual(self.run_index(*self.three_sources()).returncode, 0)
        estado = self.rows()["banco real"]["estado"]
        self.assertTrue(estado.startswith("parcial · "), estado)
        self.assertIn("seções reaproveitadas da coleta anterior; 1 seção(ões) com erro em errors.md", estado)

    def test_invalid_arguments_fail_closed_without_writing(self):
        self.source("regras", {"gerado_em": stamp(1), "commit": HEAD})
        missing = self.root.parent / "does-not-exist"
        cases = {
            "caminho vazio": (("--fonte", "x="), {}),
            "nome vazio": (("--fonte", "=docs/contexto/regras"), {}),
            "sem igual": (("--fonte", "docs/contexto/regras"), {}),
            "fora do repo": (("--fonte", "fora=../.."), {}),
            "raiz do repo": (("--fonte", "raiz=."), {}),
            "nome repetido": (("--fonte", "a=docs/contexto/regras", "--fonte", "a=docs/contexto/codigo"), {}),
            "nenhuma fonte": ((), {}),
            "stale negativo": (("--fonte", "a=docs/contexto/regras", "--stale-min", "-5"), {}),
            "repo inexistente": (("--fonte", "a=b"), {"repo": missing}),
            "out é pasta": (("--fonte", "a=docs/contexto/regras"), {"out": "docs/contexto/regras"}),
            "head inválido": (("--fonte", "a=docs/contexto/regras"), {"head": "x`rm`"}),
            "remote inválido": (("--fonte", "a=docs/contexto/regras", "--remote", "o/r/../x y"), {}),
        }
        for label, (args, kwargs) in cases.items():
            result = self.run_index(*args, **kwargs)
            self.assertEqual(result.returncode, 2, f"{label}: {result.stderr}")
            self.assertNotIn("Traceback", result.stderr, label)
        self.assertFalse(missing.exists())
        self.assertFalse((self.root / "docs/contexto/00-INDEX.md").exists())

    def test_second_run_does_not_rewrite_when_only_ages_changed(self):
        self.source("codigo", {"gerado_em": stamp(3), "commit": HEAD})
        self.assertEqual(self.run_index(*self.three_sources()).returncode, 0)
        index = self.root / "docs/contexto/00-INDEX.md"
        index.write_text(index.read_text(encoding="utf-8").replace(" min atrás", "9 min atrás"), encoding="utf-8")
        first = index.read_text(encoding="utf-8")
        second = self.run_index(*self.three_sources())
        self.assertIn("sem mudança estrutural", second.stderr)
        self.assertEqual(index.read_text(encoding="utf-8"), first)
        self.source("regras", {"gerado_em": stamp(1), "commit": HEAD})
        self.assertEqual(self.run_index(*self.three_sources()).returncode, 0)
        self.assertNotEqual(index.read_text(encoding="utf-8"), first)

    def test_names_and_title_cannot_break_the_markdown(self):
        self.source("regras", {"gerado_em": stamp(1), "commit": HEAD})
        result = self.run_index("--fonte", "com | pipe=docs/contexto/regras", "--titulo", "Título\ninjetado")
        self.assertEqual(result.returncode, 0, result.stderr)
        text = (self.root / "docs/contexto/00-INDEX.md").read_text(encoding="utf-8")
        self.assertEqual(text.splitlines()[0], "# Título injetado")
        self.assertIn("| **com \\| pipe** |", text)
        self.assertEqual(list(self.rows()), ["com | pipe"])

    def test_branch_source_points_to_how_to_read_it(self):
        result = self.run_index("--fonte", "banco real=docs/supabase@supabase-snapshot", "--remote", "owner/repo")
        self.assertEqual(result.returncode, 0, result.stderr)
        row = self.rows()["banco real"]
        self.assertEqual(row["estado"], "não disponível neste checkout")
        self.assertIn("https://raw.githubusercontent.com/owner/repo/supabase-snapshot/docs/supabase/<arquivo>", row["onde"])


if __name__ == "__main__":
    unittest.main()
