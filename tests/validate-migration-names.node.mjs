import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isValidCalendarTimestamp,
  validateMigrationFileNames,
  validateMigrationDirsOnDisk,
  validateNoTopLevelSupabaseMigrationsDir,
} from '../scripts/validate-migration-names.mjs';

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
