import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  extractErrorMessagesFromSql,
  findUndocumentedErrorMessages,
} from '../scripts/validate-error-catalog.mjs';

test('extrai mensagens literais (message = \'token\')', () => {
  const sql = "raise exception using errcode = '22023', message = 'invalid_foo_bar';";
  assert.deepEqual(extractErrorMessagesFromSql(sql), new Set(['invalid_foo_bar']));
});

test('extrai o prefixo de mensagens via format() (message = format(\'token...)', () => {
  const sql = "message = format('invalid_something_transition: %s -> %s not allowed', old.status, new.status)";
  assert.deepEqual(extractErrorMessagesFromSql(sql), new Set(['invalid_something_transition']));
});

test('ignora texto solto que não segue nenhum dos dois padrões (acentos/espaços quebram o casamento)', () => {
  const sql = "-- comentário mencionando message = 'não é isto' de propósito\nselect 1;";
  assert.deepEqual(extractErrorMessagesFromSql(sql), new Set());
});

test('acusa mensagem de migration que não está no catálogo', () => {
  const fakeReadDir = () => ['20260101000000_fake.sql'];
  const fakeReadFile = (filePath) => {
    if (String(filePath).endsWith('.sql')) {
      return "raise exception using errcode = '22023', message = 'invalid_never_documented';";
    }
    return '# Catálogo de erros\n\n| Mensagem |\n|---|\n| `outra_coisa` |\n';
  };
  const undocumented = findUndocumentedErrorMessages('/fake/migrations', '/fake/catalog.md', fakeReadDir, fakeReadFile);
  assert.deepEqual(undocumented, ['invalid_never_documented']);
});

test('não acusa nada quando a mensagem já está documentada (com prefixo format())', () => {
  const fakeReadDir = () => ['20260101000000_fake.sql'];
  const fakeReadFile = (filePath) => {
    if (String(filePath).endsWith('.sql')) {
      return "message = format('invalid_x_transition: %s', old.id)";
    }
    return '# Catálogo\n\n| `invalid_x_transition: ...` |\n';
  };
  const undocumented = findUndocumentedErrorMessages('/fake/migrations', '/fake/catalog.md', fakeReadDir, fakeReadFile);
  assert.deepEqual(undocumented, []);
});

test('varredura real do repositório não acusa nenhuma mensagem sem documentação (guarda contra regressão)', () => {
  const undocumented = findUndocumentedErrorMessages();
  assert.deepEqual(undocumented, [], undocumented.join('\n'));
});

test('extrai mensagens com dígitos no token (regressão: invalid_mod11_input ficava fora da conferência)', () => {
  const sql = "raise exception using errcode = '22023', message = 'invalid_mod11_input';\nmessage = format('invalid_v2_transition: %s', x)";
  assert.deepEqual(extractErrorMessagesFromSql(sql), new Set(['invalid_mod11_input', 'invalid_v2_transition']));
});

test('token mais longo no catálogo não documenta um token que é só o prefixo dele', () => {
  const fakeReadDir = () => ['20260101000000_fake.sql'];
  const catalogWith = (catalog) => (filePath) => (String(filePath).endsWith('.sql')
    ? "raise exception using message = 'invalid_token';"
    : catalog);
  const scan = (catalog) => findUndocumentedErrorMessages('/fake/migrations', '/fake/catalog.md', fakeReadDir, catalogWith(catalog));
  assert.deepEqual(scan('| `invalid_token_format` |\n| `invalid_token2` |\n'), ['invalid_token']);
  assert.deepEqual(scan('| `invalid_token` |\n'), []);
  assert.deepEqual(scan('| `invalid_token: <motivo>` |\n'), []);
  assert.deepEqual(scan('| `invalid_token`, `outra` |\n'), []);
  assert.deepEqual(scan('| invalid_token sem crase |\n'), ['invalid_token']);
});

test('falha fechado quando não há nenhuma migration .sql para ler', () => {
  assert.throws(
    () => findUndocumentedErrorMessages('/fake/migrations', '/fake/catalog.md', () => ['README.md'], () => ''),
    /Nenhuma migration \.sql encontrada .* nada foi verificado/,
  );
});

const SCRIPT = fileURLToPath(new URL('../scripts/validate-error-catalog.mjs', import.meta.url));

function cliFixture(t, { sql, catalog }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'error catalog é-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const migrations = path.join(root, 'site-supabase', 'supabase', 'migrations');
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.mkdirSync(path.join(root, 'docs'));
  fs.mkdirSync(migrations, { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(root, 'scripts', 'validate-error-catalog.mjs'));
  if (sql !== null) fs.writeFileSync(path.join(migrations, '20260101000000_fake.sql'), sql);
  if (catalog !== null) fs.writeFileSync(path.join(root, 'docs', 'DATABASE_FUNCTION_CONTRACTS.md'), catalog);
  const script = path.join(root, 'scripts', 'validate-error-catalog.mjs');
  const link = path.join(root, 'atalho.mjs');
  fs.symlinkSync(script, link);
  return { run: (scriptPath = script, cwd = os.tmpdir()) => spawnSync(process.execPath, [scriptPath], { cwd, encoding: 'utf8' }), link };
}

test('CLI: código 0 e stdout quando tudo está documentado; código 1 e lista em stderr quando falta', (t) => {
  const sql = "raise exception using message = 'invalid_mod11_input';\r\n";
  const documented = cliFixture(t, { sql, catalog: '\ufeff| `invalid_mod11_input` |\r\n' }).run();
  assert.equal(documented.status, 0, documented.stderr);
  assert.match(documented.stdout, /^Catálogo de erros em docs\/DATABASE_FUNCTION_CONTRACTS\.md cobre todas as mensagens/);
  assert.equal(documented.stderr, '');

  const missing = cliFixture(t, { sql, catalog: '| `outra_coisa` |\n' });
  for (const scriptPath of [undefined, missing.link]) {
    const result = missing.run(scriptPath);
    assert.equal(result.status, 1, `symlink=${scriptPath === missing.link}: ${result.stdout}`);
    assert.match(result.stderr, /Mensagens de erro sem entrada no catálogo[^\n]*\n {2}- invalid_mod11_input\n/);
    assert.equal(result.stdout, '');
  }
});

test('CLI: catálogo ausente ou pasta de migrations vazia saem com código 1 e mensagem de uma linha', (t) => {
  const noCatalog = cliFixture(t, { sql: 'select 1;', catalog: null }).run();
  assert.equal(noCatalog.status, 1);
  assert.match(noCatalog.stderr, /^Catálogo de erros não verificado: ENOENT[^\n]*DATABASE_FUNCTION_CONTRACTS\.md[^\n]*\n$/);
  const noMigrations = cliFixture(t, { sql: null, catalog: '' }).run();
  assert.equal(noMigrations.status, 1);
  assert.match(noMigrations.stderr, /^Catálogo de erros não verificado: Nenhuma migration \.sql encontrada[^\n]*\n$/);
});
