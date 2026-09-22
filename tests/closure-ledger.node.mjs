import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseCsv, validateLedger } from '../scripts/validate-closure-ledger.mjs';

const source = fs.readFileSync(new URL('../docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv', import.meta.url), 'utf8');
const rows = () => parseCsv(source);

test('ledger atual contém todos os IDs, commits e fontes locais', () => {
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
test('fonte atual que não existia no commit auditado não passa como evidência histórica', () => {
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
