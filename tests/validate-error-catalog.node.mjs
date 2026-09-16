import assert from 'node:assert/strict';
import test from 'node:test';
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
