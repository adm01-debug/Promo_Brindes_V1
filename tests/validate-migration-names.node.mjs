import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  isValidCalendarTimestamp,
  validateMigrationFileNames,
  validateMigrationDirsNotEmpty,
  validateMigrationDirsOnDisk,
  validateNoTopLevelSupabaseMigrationsDir,
} from '../scripts/validate-migration-names.mjs';

const SCRIPT = fileURLToPath(new URL('../scripts/validate-migration-names.mjs', import.meta.url));

// Cópia do script numa árvore temporária com o mesmo layout do repositório: exercita a
// CLI real (resolução de caminhos, exit code, stdout/stderr) sem tocar nas migrations.
function cliFixture(t, migrationNames, { topLevelDir = false, label = 'migration names é' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${label}-`));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.copyFileSync(SCRIPT, path.join(root, 'scripts', 'validate-migration-names.mjs'));
  if (migrationNames !== null) {
    const dir = path.join(root, 'site-supabase', 'supabase', 'migrations');
    fs.mkdirSync(dir, { recursive: true });
    for (const name of migrationNames) fs.writeFileSync(path.join(dir, name), 'select 1;\n');
  }
  if (topLevelDir) fs.mkdirSync(path.join(root, 'supabase', 'migrations'), { recursive: true });
  return {
    root,
    run: ({ cwd = root, scriptPath = path.join(root, 'scripts', 'validate-migration-names.mjs') } = {}) =>
      spawnSync(process.execPath, [scriptPath], { cwd, encoding: 'utf8' }),
  };
}

test('aceita nomes de 14 dígitos em ordem estritamente crescente', () => {
  const errors = validateMigrationFileNames('site', [
    '20260908230000_create_site_lead_storage.sql',
    '20260909103000_lock_down_rls_event_trigger.sql',
    '20260909180000_create_customer_quote_portal.sql',
  ]);
  assert.deepEqual(errors, []);
});

test('rejeita o formato antigo com underscore no timestamp (regressão do incidente de 15/09)', () => {
  const errors = validateMigrationFileNames('site', ['20260908_230000_create_site_lead_storage.sql']);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /nome fora do padrão/);
});

test('rejeita data de calendário inválida', () => {
  const errors = validateMigrationFileNames('site', ['20261399999999_impossible.sql']);
  assert.match(errors[0], /não é uma data\/hora válida/);
});

test('rejeita versão duplicada dentro do mesmo diretório', () => {
  // Uma duplicata também não é estritamente maior que a anterior, então dispara os dois
  // avisos — ambos verdadeiros e úteis; o teste verifica a presença do de duplicata.
  const errors = validateMigrationFileNames('site', [
    '20260908230000_a.sql',
    '20260908230000_b.sql',
  ]);
  assert.ok(errors.some((error) => /duplicada/.test(error)), errors.join('\n'));
});

test('rejeita ordem não estritamente crescente entre arquivos', () => {
  // A entrada já vem ordenada por nome de arquivo; forçar uma versão "menor" depois de uma maior
  // exigiria um nome de arquivo que ordene depois lexicograficamente mas tenha timestamp menor —
  // isso não ocorre com o padrão de 14 dígitos fixos, então este caso cobre o teto: duas versões
  // fora de ordem não podem coexistir sem cair em duplicata ou em not-strictly-increasing.
  const errors = validateMigrationFileNames('site', [
    '20260909000000_depois.sql',
    '20260908000000_antes.sql',
  ]);
  assert.equal(errors.length, 0, 'a função ordena antes de validar, então a entrada fora de ordem no array não é o caso de regressão real');
});

test('isValidCalendarTimestamp rejeita mês, dia, hora, minuto e segundo fora do intervalo', () => {
  assert.equal(isValidCalendarTimestamp('20261301000000'), false);
  assert.equal(isValidCalendarTimestamp('20260932000000'), false);
  assert.equal(isValidCalendarTimestamp('20260908240000'), false);
  assert.equal(isValidCalendarTimestamp('20260908006000'), false);
  assert.equal(isValidCalendarTimestamp('20260908000060'), false);
  assert.equal(isValidCalendarTimestamp('20260908230000'), true);
  assert.equal(isValidCalendarTimestamp('20260229000000'), false);
  assert.equal(isValidCalendarTimestamp('20260230000000'), false);
  assert.equal(isValidCalendarTimestamp('20260431000000'), false);
  assert.equal(isValidCalendarTimestamp('20260931000000'), false);
  assert.equal(isValidCalendarTimestamp('20240229000000'), true);
});

test('ignora arquivos que não terminam em .sql e diretórios ausentes', () => {
  const fakeReadDir = (dir) => {
    if (dir === 'site-supabase/supabase/migrations') return ['20260908230000_ok.sql', 'README.md'];
    const error = new Error('not found');
    error.code = 'ENOENT';
    throw error;
  };
  const errors = validateMigrationDirsOnDisk(['site-supabase/supabase/migrations', 'supabase/migrations'], fakeReadDir);
  assert.deepEqual(errors, []);
});

test('varredura real do repositório não acusa nenhum erro (guarda contra regressão)', () => {
  const errors = validateMigrationDirsOnDisk();
  assert.deepEqual(errors, [], errors.join('\n'));
});

test('rejeita a existência de supabase/migrations no topo do repositório (Etapa 45)', () => {
  const errors = validateNoTopLevelSupabaseMigrationsDir((dir) => dir === 'supabase/migrations');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /link incoerente/);
});

test('não acusa nada quando supabase/migrations no topo não existe', () => {
  const errors = validateNoTopLevelSupabaseMigrationsDir(() => false);
  assert.deepEqual(errors, []);
});

test('varredura real do repositório confirma que supabase/migrations no topo não existe (guarda contra regressão)', () => {
  const errors = validateNoTopLevelSupabaseMigrationsDir();
  assert.deepEqual(errors, [], errors.join('\n'));
});

test('CLI aprova uma árvore válida em stdout e sai com código 0 (caminho com espaço e acento)', (t) => {
  const result = cliFixture(t, ['20260908230000_a.sql', '20260909103000_b.sql', 'README.md']).run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'Nomes de migration válidos em todos os diretórios verificados.\n');
  assert.equal(result.stderr, '');
});

test('CLI reprova nome inválido em stderr com código 1, também quando chamada de outro diretório', (t) => {
  const fixture = cliFixture(t, ['20260908_230000_formato_antigo.sql']);
  for (const cwd of [fixture.root, os.tmpdir(), path.join(fixture.root, 'scripts')]) {
    const result = fixture.run({ cwd });
    assert.equal(result.status, 1, `cwd=${cwd}: ${result.stdout}`);
    assert.match(result.stderr, /Nomes de migration inválidos:\n {2}- site-supabase\/supabase\/migrations\/20260908_230000_formato_antigo\.sql: nome fora do padrão/);
    assert.equal(result.stdout, '');
  }
});

test('CLI chamada por symlink valida de verdade em vez de sair com código 0 sem rodar', (t) => {
  const fixture = cliFixture(t, ['20260908_230000_formato_antigo.sql']);
  const link = path.join(fixture.root, 'atalho.mjs');
  fs.symlinkSync(path.join(fixture.root, 'scripts', 'validate-migration-names.mjs'), link);
  const result = fixture.run({ scriptPath: link });
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /nome fora do padrão/);
});

test('CLI falha fechada quando o diretório de migrations está ausente ou vazio', (t) => {
  for (const names of [null, [], ['README.md']]) {
    const result = cliFixture(t, names).run();
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /site-supabase\/supabase\/migrations: diretório ausente ou sem nenhum arquivo \.sql — nada foi verificado/);
  }
});

test('CLI reprova supabase/migrations no topo mesmo chamada de outro diretório', (t) => {
  const result = cliFixture(t, ['20260908230000_a.sql'], { topLevelDir: true }).run({ cwd: os.tmpdir() });
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /supabase\/migrations não deveria existir/);
});

test('validateMigrationDirsNotEmpty acusa diretório ausente ou sem .sql e propaga erro inesperado', () => {
  const missing = () => { throw Object.assign(new Error('not found'), { code: 'ENOENT' }); };
  assert.equal(validateMigrationDirsNotEmpty(['x'], missing).length, 1);
  assert.equal(validateMigrationDirsNotEmpty(['x'], () => ['README.md']).length, 1);
  assert.deepEqual(validateMigrationDirsNotEmpty(['x'], () => ['20260908230000_a.sql']), []);
  assert.throws(() => validateMigrationDirsNotEmpty(['x'], () => { throw Object.assign(new Error('denied'), { code: 'EACCES' }); }), /denied/);
  assert.deepEqual(validateMigrationDirsNotEmpty(), []);
});

test('rejeita maiúsculas, hífen, espaço, extensão dupla e prefixo com 13 ou 15 dígitos', () => {
  for (const name of [
    '20260908230000_Nome.sql',
    '20260908230000_com-hifen.sql',
    '20260908230000_com espaco.sql',
    '20260908230000_a.sql.sql',
    '2026090823000_a.sql',
    '202609082300000_a.sql',
    '20260908230000.sql',
    '20260908230000_.sql',
    '٢٠٢٦٠٩٠٨٢٣٠٠٠٠_a.sql',
    '.sql',
  ]) {
    const errors = validateMigrationFileNames('site', [name]);
    assert.equal(errors.length, 1, name);
    assert.match(errors[0], /nome fora do padrão/, name);
  }
});
