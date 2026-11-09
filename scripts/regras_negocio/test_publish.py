"""Regressões do publicador contra um remoto bare local; nunca tocam o origin de verdade."""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("publish.sh")
OUT = "docs/ctx/regras"


@unittest.skipUnless(shutil.which("git") and shutil.which("bash"), "git e bash são necessários")
class PublishTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="context publish ")  # espaço no caminho de propósito
        self.addCleanup(temporary.cleanup)
        self.base = Path(temporary.name)
        (self.base / "tmp").mkdir()
        (self.base / "home").mkdir()
        # sem identidade git em lugar nenhum: o script precisa publicar mesmo assim, sem gravar config
        self.env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_") and k not in (
            "MODE", "OUT_DIR", "BRANCH", "BRANCH_OUT", "KEEP_DIRS", "INDEX_CMD", "PUSH_URL", "GEN_CMD")}
        self.env.update({"GIT_CONFIG_GLOBAL": os.devnull, "GIT_CONFIG_NOSYSTEM": "1", "GIT_TERMINAL_PROMPT": "0",
                         "HOME": str(self.base / "home"), "TMPDIR": str(self.base / "tmp")})
        self.remote = self.base / "remote.git"
        self.git(self.base, "init", "-q", "--bare", "-b", "main", str(self.remote))
        self.work = self.clone("work")
        self.git(self.work, "checkout", "-q", "-B", "main")
        (self.work / "src").mkdir()
        (self.work / "src/a.ts").write_text("a\n", encoding="utf-8")
        self.commit(self.work, "init")
        self.git(self.work, "push", "-q", "origin", "main")

    def git(self, cwd, *args, check=True):
        result = subprocess.run(["git", *args], cwd=cwd, env=self.env, capture_output=True, text=True, timeout=60)
        if check and result.returncode != 0:
            self.fail(f"git {' '.join(args)}: {result.stderr}")
        return result.stdout.strip()

    def commit(self, cwd, message):
        self.git(cwd, "add", "-A")
        self.git(cwd, "-c", "user.name=dev", "-c", "user.email=dev@example.test", "commit", "-q", "-m", message)

    def clone(self, name, *args):
        self.git(self.base, "clone", "-q", *args, self.remote.as_uri() if args else str(self.remote), str(self.base / name))
        return self.base / name

    def generate(self, cwd, text, out=OUT):
        (cwd / out).mkdir(parents=True, exist_ok=True)
        (cwd / out / "07.md").write_text(text + "\n", encoding="utf-8")

    def publish(self, cwd, **variables):
        return subprocess.run(["bash", str(SCRIPT)], cwd=cwd, env={**self.env, **variables}, capture_output=True, text=True, timeout=120)

    def remote_sha(self, branch):
        return self.git(self.base, "--git-dir", str(self.remote), "rev-parse", "-q", "--verify", f"refs/heads/{branch}", check=False)

    def remote_tree(self, branch):
        return self.git(self.base, "--git-dir", str(self.remote), "ls-tree", "-r", "--name-only", branch).splitlines()

    def remote_file(self, branch, path):
        return self.git(self.base, "--git-dir", str(self.remote), "show", f"{branch}:{path}")

    def local_commits(self, cwd):
        return int(self.git(cwd, "rev-list", "--count", "HEAD"))

    def branch_mode(self, cwd, **variables):
        return self.publish(cwd, MODE="branch", OUT_DIR=OUT, BRANCH_OUT="contexto", **variables)

    def test_branch_mode_publishes_gitignored_output_and_leaves_the_checkout_as_it_was(self):
        (self.work / ".gitignore").write_text("docs/ctx/*\n", encoding="utf-8")
        self.commit(self.work, "ignora a saída gerada")
        self.git(self.work, "push", "-q", "origin", "main")
        (self.work / "src/a.ts").write_text("edição local não commitada\n", encoding="utf-8")
        self.generate(self.work, "regra 1")
        result = self.branch_mode(self.work)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("publicado em contexto", result.stdout)
        self.assertEqual(self.remote_tree("contexto"), [".gitignore", f"{OUT}/07.md", "src/a.ts"])
        self.assertEqual(self.git(self.base, "--git-dir", str(self.remote), "rev-parse", "contexto^"), self.remote_sha("main"))
        self.assertEqual(self.git(self.base, "--git-dir", str(self.remote), "log", "-1", "--format=%an", "contexto"), "ai-context-bot")
        # a branch de origem, a identidade git e os arquivos de quem rodou ficam intocados
        self.assertEqual(self.git(self.work, "rev-parse", "--abbrev-ref", "HEAD"), "main")
        self.assertEqual(self.git(self.work, "status", "--short"), "M src/a.ts")
        self.assertEqual((self.work / OUT / "07.md").read_text(encoding="utf-8"), "regra 1\n")
        self.assertEqual(self.git(self.work, "config", "--get", "user.name", check=False), "")
        self.assertEqual(list((self.base / "tmp").iterdir()), [])

    def test_branch_mode_without_changes_creates_no_commit(self):
        self.generate(self.work, "regra 1")
        self.assertEqual(self.branch_mode(self.work).returncode, 0)
        published = self.remote_sha("contexto")
        again = self.branch_mode(self.work)
        self.assertEqual(again.returncode, 0, again.stderr)
        self.assertIn("nada a publicar", again.stdout)
        self.assertEqual(self.remote_sha("contexto"), published)
        self.assertEqual(self.git(self.work, "diff", "--cached", "--name-only"), "")
        self.generate(self.work, "regra 2")
        self.assertEqual(self.branch_mode(self.work).returncode, 0)
        self.assertNotEqual(self.remote_sha("contexto"), published)
        self.assertEqual(self.remote_file("contexto", f"{OUT}/07.md"), "regra 2")

    def test_shallow_single_branch_clone_keeps_other_producers_folders(self):
        self.generate(self.work, "regra 1")
        self.assertEqual(self.branch_mode(self.work).returncode, 0)
        shallow = self.clone("shallow", "--depth", "1")
        self.assertEqual(self.git(shallow, "config", "--get", "remote.origin.fetch"), "+refs/heads/main:refs/remotes/origin/main")
        self.generate(shallow, "código", out="docs/ctx/codigo")
        result = self.publish(shallow, MODE="branch", OUT_DIR="docs/ctx/codigo", BRANCH_OUT="contexto", KEEP_DIRS=OUT)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.remote_tree("contexto"), ["docs/ctx/codigo/07.md", f"{OUT}/07.md", "src/a.ts"])
        self.assertFalse((shallow / OUT).exists())

    def test_concurrent_producers_do_not_overwrite_each_other(self):
        self.generate(self.work, "regra 1")
        self.assertEqual(self.branch_mode(self.work).returncode, 0)
        other = self.clone("other")
        self.generate(other, "código", out="docs/ctx/codigo")
        self.generate(self.work, "regra 2")
        # o outro produtor publica entre o fetch e o push deste: o hook de pre-push dispara a corrida uma vez
        hook = self.work / ".git/hooks/pre-push"
        hook.parent.mkdir(exist_ok=True)
        hook.write_text("#!/usr/bin/env bash\n"
                        f'if [ ! -f "{self.base}/raced" ]; then touch "{self.base}/raced"\n'
                        f'  ( cd "{other}" && unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX && MODE=branch OUT_DIR=docs/ctx/codigo '
                        f'BRANCH_OUT=contexto KEEP_DIRS={OUT} bash "{SCRIPT}" ) >"{self.base}/race.log" 2>&1\nfi\nexit 0\n', encoding="utf-8")
        hook.chmod(0o755)
        result = self.branch_mode(self.work, KEEP_DIRS="docs/ctx/codigo")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("publicado em contexto", (self.base / "race.log").read_text(encoding="utf-8"))
        self.assertIn("rejeitado (tentativa 1)", result.stderr)
        self.assertEqual(self.remote_tree("contexto"), ["docs/ctx/codigo/07.md", f"{OUT}/07.md", "src/a.ts"])
        self.assertEqual(self.remote_file("contexto", f"{OUT}/07.md"), "regra 2")
        self.assertEqual(self.git(self.base, "--git-dir", str(self.remote), "rev-parse", "contexto^"), self.remote_sha("main"))

    def test_unreachable_remote_publishes_nothing_and_restores_the_branch(self):
        self.generate(self.work, "regra 1")
        self.git(self.work, "remote", "set-url", "origin", str(self.base / "gone.git"))
        result = self.branch_mode(self.work)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("não foi possível consultar origin/contexto", result.stderr)
        self.assertEqual(self.git(self.work, "rev-parse", "--abbrev-ref", "HEAD"), "main")
        self.assertEqual(self.git(self.work, "diff", "--cached", "--name-only"), "")
        self.assertEqual((self.work / OUT / "07.md").read_text(encoding="utf-8"), "regra 1\n")
        self.assertEqual(self.remote_sha("contexto"), "")

    def test_invalid_usage_fails_before_any_commit(self):
        self.generate(self.work, "regra 1")
        cases = {
            "MODE desconhecido": ({"MODE": "bogus", "OUT_DIR": OUT}, 2),
            "OUT_DIR fora do repo": ({"MODE": "branch", "OUT_DIR": "../fora"}, 2),
            "OUT_DIR absoluto": ({"MODE": "branch", "OUT_DIR": "/abs"}, 2),
            "KEEP_DIRS fora do repo": ({"MODE": "branch", "OUT_DIR": OUT, "KEEP_DIRS": "../x"}, 2),
            "OUT_DIR inexistente": ({"MODE": "branch", "OUT_DIR": "docs/nada"}, 1),
            "PR com base na branch gerada": ({"MODE": "pr", "OUT_DIR": OUT, "BRANCH": "contexto"}, 1),
            "push para a branch gerada": ({"MODE": "push", "OUT_DIR": OUT, "BRANCH": "contexto"}, 1),
        }
        for label, (variables, code) in cases.items():
            result = self.publish(self.work, **variables)
            self.assertEqual(result.returncode, code, f"{label}: {result.stdout}{result.stderr}")
            self.assertIn("ERRO:", result.stderr, label)
        self.assertEqual(self.local_commits(self.work), 1)
        self.assertEqual(self.git(self.work, "rev-parse", "--abbrev-ref", "HEAD"), "main")
        self.assertEqual(self.git(self.base, "--git-dir", str(self.remote), "for-each-ref", "--format=%(refname)"), "refs/heads/main")
        outside = subprocess.run(["bash", str(SCRIPT)], cwd=self.base / "home", env={**self.env, "MODE": "push"}, capture_output=True, text=True, timeout=60)
        self.assertEqual(outside.returncode, 1)
        self.assertIn("não é um repositório git", outside.stderr)
        subdir = subprocess.run(["bash", str(SCRIPT)], cwd=self.work / "docs", env={**self.env, "MODE": "branch", "OUT_DIR": "ctx/regras"}, capture_output=True, text=True, timeout=60)
        self.assertEqual(subdir.returncode, 1)
        self.assertIn("rode a partir da raiz", subdir.stderr)

    def test_generated_branch_is_never_the_source_of_a_publication(self):
        self.generate(self.work, "regra 1")
        self.assertEqual(self.branch_mode(self.work).returncode, 0)
        published = self.remote_sha("contexto")
        shutil.rmtree(self.work / "docs")
        self.git(self.work, "fetch", "-q", "origin", "+refs/heads/contexto:refs/remotes/origin/contexto")
        self.git(self.work, "checkout", "-q", "-b", "contexto", "origin/contexto")
        self.generate(self.work, "regra 9")
        for variables in ({"MODE": "branch"}, {"MODE": "push"}, {"MODE": "pr", "BRANCH": "main"}):
            result = self.publish(self.work, OUT_DIR=OUT, BRANCH_OUT="contexto", **variables)
            self.assertEqual(result.returncode, 1, f"{variables}: {result.stdout}{result.stderr}")
            self.assertIn("branch gerada", result.stderr)
        self.assertEqual(self.remote_sha("contexto"), published)
        self.assertEqual(self.git(self.base, "--git-dir", str(self.remote), "for-each-ref", "--format=%(refname)").splitlines(),
                         ["refs/heads/contexto", "refs/heads/main"])

    def test_push_mode_publishes_once_and_survives_a_race_with_the_default_generator(self):
        self.generate(self.work, "regra 1")
        first = self.publish(self.work, MODE="push", OUT_DIR=OUT)
        self.assertEqual(first.returncode, 0, first.stdout + first.stderr)
        published = self.remote_sha("main")
        unchanged = self.publish(self.work, MODE="push", OUT_DIR=OUT)
        self.assertEqual(unchanged.returncode, 0)
        self.assertIn("nada a commitar", unchanged.stdout)
        self.assertEqual(self.remote_sha("main"), published)
        other = self.clone("other")
        (other / "src/b.ts").write_text("b\n", encoding="utf-8")
        self.commit(other, "outro commit na main")
        self.git(other, "push", "-q", "origin", "main")
        self.generate(self.work, "regra 3")
        raced = self.publish(self.work, MODE="push", OUT_DIR=OUT)
        # GEN_CMD padrão = generate.py ao lado deste script (o caminho herdado do repo de origem não existe aqui)
        self.assertEqual(raced.returncode, 0, raced.stdout + raced.stderr)
        self.assertIn("push falhou (tentativa 1)", raced.stdout)
        tree = self.remote_tree("main")
        self.assertIn("src/b.ts", tree)
        self.assertIn(f"{OUT}/07-REGRAS-DE-NEGOCIO.md", tree)
        self.assertEqual(self.git(self.work, "status", "--short"), "")
        self.assertEqual(self.git(self.work, "config", "--get", "user.name", check=False), "")

    def test_detached_head_and_foreign_staged_change_are_refused(self):
        self.generate(self.work, "regra 1")
        (self.work / "src/z.ts").write_text("z\n", encoding="utf-8")
        self.git(self.work, "add", "src/z.ts")
        staged = self.publish(self.work, MODE="push", OUT_DIR=OUT)
        self.assertEqual(staged.returncode, 1)
        self.assertIn("alteração staged fora da saída gerada: src/z.ts", staged.stderr)
        self.git(self.work, "reset", "-q")
        self.git(self.work, "checkout", "-q", "--detach")
        detached = self.publish(self.work, MODE="push", OUT_DIR=OUT)
        self.assertEqual(detached.returncode, 1)
        self.assertIn("HEAD destacado", detached.stderr)
        self.assertEqual(self.local_commits(self.work), 1)
        self.assertEqual(self.remote_sha("main"), self.git(self.work, "rev-parse", "HEAD"))

    def test_help_prints_the_contract(self):
        result = subprocess.run(["bash", str(SCRIPT), "--help"], cwd=self.base, env=self.env, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0)
        for word in ("MODE", "OUT_DIR", "BRANCH_OUT", "KEEP_DIRS", "INDEX_CMD", "PUSH_URL", "GEN_CMD"):
            self.assertIn(word, result.stdout)
        self.assertNotIn("set -euo pipefail", result.stdout)


if __name__ == "__main__":
    unittest.main()
