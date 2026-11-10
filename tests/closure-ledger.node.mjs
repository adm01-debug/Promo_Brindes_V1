import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseCsv, validateLedger } from '../scripts/validate-closure-ledger.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const script = fileURLToPath(new URL('../scripts/validate-closure-ledger.mjs', import.meta.url));
const source = fs.readFileSync(new URL('../docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv', import.meta.url), 'utf8');
const rows = () => parseCsv(source);

// Sem as variáveis GIT_* herdadas (um hook ou `git rebase --exec` define GIT_DIR): os
// commits de fixture têm de cair no repositório temporário, nunca no repositório real.
const gitEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));

function git(cwd, ...args) {
  return execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', '-c', 'commit.gpgsign=false', ...args], {
    cwd,
    env: gitEnv,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function hasCommit(cwd, commit) {
  try {
    git(cwd, 'cat-file', '-e', `${commit}^{commit}`);
    return true;
  } catch {
    return false;
  }
}

// Os commits auditados do ledger real só existem com o histórico completo (o CI usa
// fetch-depth: 0). Num clone raso, estes casos são cobertos pelo repositório-fixture abaixo.
const realHistory = hasCommit(repoRoot, rows()[0].commit_auditado)
  ? {}
  : { skip: 'clone raso: commits auditados do ledger real ausentes (git fetch --unshallow origin)' };

function temporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'closure-ledger-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function fixtureRepository(t) {
  const directory = path.join(temporaryDirectory(t), 'origem');
  fs.mkdirSync(path.join(directory, 'docs'), { recursive: true });
  git(directory, 'init', '-q');
  fs.writeFileSync(path.join(directory, 'docs', 'primeira.md'), 'primeira\n');
  git(directory, 'add', '.');
  git(directory, 'commit', '-q', '-m', 'primeiro');
  const first = git(directory, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(directory, 'docs', 'segunda.md'), 'segunda\n');
  git(directory, 'add', '.');
  git(directory, 'commit', '-q', '-m', 'segundo');
  return { directory, first, second: git(directory, 'rev-parse', 'HEAD'), tree: git(directory, 'rev-parse', 'HEAD^{tree}') };
}

function fixtureRows(commit, fontes = 'docs/primeira.md') {
  return Object.entries({ UX: 100, LK: 50, GR: 50, AC: 30 }).flatMap(([prefix, count]) =>
    Array.from({ length: count }, (_, index) => ({
      id: `${prefix}${String(index + 1).padStart(2, '0')}`,
      estado_revisado: 'I',
      fontes,
      conclusao_e_aceite_restante: 'fixture',
      metodo: 'fixture',
      commit_auditado: commit,
    })));
}

test('ledger atual contém todos os IDs, commits e fontes locais', realHistory, () => {
  assert.deepEqual(validateLedger(rows()), { references: 230, uniqueIds: 230 });
});
test('não aceita trocar uma referência por um ID inexistente mantendo o total', () => {
  const changed = rows(); changed[0].id = 'UX999';
  assert.throws(() => validateLedger(changed), /fora dos planos/);
});
test('fontes inexistentes e caminhos fora do site não passam como evidência', () => {
  for (const source of ['docs/arquivo-ausente-auditoria.md', '../Promo_Gifts_V4/AGENTS.md']) {
    const changed = rows(); changed[0].fontes = source;
    assert.throws(() => validateLedger(changed), /fonte (ausente|fora)/);
  }
});
test('fonte atual que não existia no commit auditado não passa como evidência histórica', realHistory, () => {
  const changed = rows();
  changed[0].fontes = 'docs/MATRIZ_INDEX.md';
  changed[0].commit_auditado = '91653abaecd574722c6534ef271b7c078c8d8a47';
  assert.throws(() => validateLedger(changed), /não existe no commit auditado/);
});
test('estado, ID duplicado e commit sem evidência são recusados', () => {
  for (const [field, value, pattern] of [['estado_revisado', 'DONE', /estado/], ['id', 'UX02', /duplicado/], ['commit_auditado', 'latest', /commit auditado/]]) {
    const changed = rows(); changed[0][field] = value;
    assert.throws(() => validateLedger(changed), pattern);
  }
});
test('CSV preserva aspas escapadas e rejeita linhas ou cabeçalhos ambíguos', () => {
  assert.deepEqual(parseCsv('id,text\nUX01,"texto com ""aspas"", vírgula e\nlinha"\n'), [{ id: 'UX01', text: 'texto com "aspas", vírgula e\nlinha' }]);
  assert.throws(() => parseCsv('id,id\na,b\n'), /duplicados/);
  assert.throws(() => parseCsv('id,text\na,b,c\n'), /colunas/);
  assert.throws(() => parseCsv('id,text\na,"b\n'), /aspas não fechadas/);
});

test('repositório-fixture: aceita fonte presente no commit auditado e recusa a que só existe depois dele', (t) => {
  const { directory, first, second } = fixtureRepository(t);
  assert.deepEqual(validateLedger(fixtureRows(first), directory), { references: 230, uniqueIds: 230 });
  assert.deepEqual(validateLedger(fixtureRows(second, 'docs/primeira.md; docs/segunda.md'), directory), { references: 230, uniqueIds: 230 });
  assert.throws(() => validateLedger(fixtureRows(first, 'docs/segunda.md'), directory), /Ledger inválido: fonte docs\/segunda\.md não existe no commit auditado de UX01/);
});

test('commit auditado inexistente em clone completo é erro do ledger, não do checkout', (t) => {
  const { directory, tree } = fixtureRepository(t);
  assert.throws(() => validateLedger(fixtureRows('0'.repeat(39) + '1'), directory), /Ledger inválido: commit auditado 0{39}1 de UX01 não existe neste repositório/);
  assert.throws(() => validateLedger(fixtureRows(tree), directory), /Ledger inválido: commit auditado [0-9a-f]{40} de UX01 é um objeto tree, não um commit/);
});

test('clone raso sem o commit auditado falha fechado com diagnóstico do checkout, sem culpar o ledger', (t) => {
  const { directory, first, second } = fixtureRepository(t);
  const shallow = path.join(path.dirname(directory), 'raso');
  git(path.dirname(directory), 'clone', '-q', '--depth', '1', `file://${directory}`, shallow);
  assert.equal(hasCommit(shallow, first), false);
  assert.deepEqual(validateLedger(fixtureRows(second), shallow), { references: 230, uniqueIds: 230 });
  assert.throws(
    () => validateLedger(fixtureRows(first), shallow),
    (error) => /^Ledger não verificável: .*1 commit\(s\) auditado\(s\) não estão neste clone raso/.test(error.message)
      && /git fetch --unshallow/.test(error.message)
      && !/Ledger inválido|não existe no commit auditado/.test(error.message),
  );
});

test('erro estrutural do ledger aparece antes da indisponibilidade do histórico no clone raso', (t) => {
  const { directory, first } = fixtureRepository(t);
  const shallow = path.join(path.dirname(directory), 'raso');
  git(path.dirname(directory), 'clone', '-q', '--depth', '1', `file://${directory}`, shallow);
  const changed = fixtureRows(first);
  changed[229].estado_revisado = 'DONE';
  assert.throws(() => validateLedger(changed, shallow), /Ledger inválido: estado DONE em AC30/);
  const missing = fixtureRows(first);
  missing[100].fontes = 'docs/inexistente.md';
  assert.throws(() => validateLedger(missing, shallow), /Ledger inválido: fonte ausente docs\/inexistente\.md em LK01/);
});

test('diretório que não é repositório git é reportado como não verificável', (t) => {
  const directory = temporaryDirectory(t);
  fs.mkdirSync(path.join(directory, 'docs'));
  fs.writeFileSync(path.join(directory, 'docs', 'primeira.md'), 'primeira\n');
  const previous = process.env.GIT_CEILING_DIRECTORIES;
  process.env.GIT_CEILING_DIRECTORIES = path.dirname(fs.realpathSync(directory));
  t.after(() => {
    if (previous === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
    else process.env.GIT_CEILING_DIRECTORIES = previous;
  });
  assert.throws(() => validateLedger(fixtureRows('a'.repeat(40)), directory), /Ledger não verificável: .* não é um repositório git/);
});

test('CSV aceita BOM e CRLF sem nova linha final, e aponta o registro com colunas divergentes', () => {
  assert.deepEqual(parseCsv('\ufeffid,text\r\nUX01,a\r\nUX02,b\r'), [{ id: 'UX01', text: 'a' }, { id: 'UX02', text: 'b' }]);
  assert.throws(() => parseCsv('id,text\nUX01,a\n\n'), /colunas divergente no registro 3 \(esperado 2, recebido 1\)/);
});

test('CLI roda por caminho com symlink e sai com código 1 e mensagem única quando o ledger não é verificável', (t) => {
  const link = path.join(temporaryDirectory(t), 'atalho.mjs');
  fs.symlinkSync(script, link);
  let failure = null;
  let stdout = '';
  try {
    stdout = execFileSync(process.execPath, [link], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    failure = error;
  }
  if (realHistory.skip) {
    assert.equal(failure?.status, 1);
    assert.match(failure.stderr, /^Ledger não verificável: .*clone raso.*\n$/);
    assert.equal(failure.stdout, '');
  } else {
    assert.equal(failure, null);
    assert.match(stdout, /^Ledger válido: 230 referências/);
  }
});
