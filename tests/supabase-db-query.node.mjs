import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRows } from '../scripts/_lib/supabaseDbQuery.mjs';

// Guarda contra três regressões de CI observadas em 16/09 ao rodar `supabase db
// query --output-format json`:
// 1. texto solto do CLI (banner de conexão) antes do JSON.
// 2. no runner do GitHub Actions, o aviso de nova versão do CLI também sai como um
//    objeto JSON válido (não texto solto), em posição variável relativa ao objeto
//    de resultado.
// 3. o SHAPE do JSON de resultado difere por ambiente: localmente vem embrulhado em
//    `{"boundary":...,"rows":[...],"warning":...}`; no runner do GitHub Actions,
//    mesma versão declarada do CLI, veio como array top-level `[...]` sem wrapper.

test('extrai de objeto {"rows": [...]} (formato local, com boundary/warning)', () => {
  const raw = '{"boundary":"abc","rows":[{"a":1}],"warning":"..."}';
  assert.deepEqual(extractRows(raw), [{ a: 1 }]);
});

test('extrai de array top-level sem wrapper (formato observado no CI)', () => {
  const raw = '[{"a":1},{"a":2}]';
  assert.deepEqual(extractRows(raw), [{ a: 1 }, { a: 2 }]);
});

test('ignora banner de conexão (texto solto) antes do JSON', () => {
  const raw = 'Connecting to local database...\n{"rows":[{"a":1}]}';
  assert.deepEqual(extractRows(raw), [{ a: 1 }]);
});

test('ignora banner de conexão antes de um array top-level', () => {
  const raw = 'Connecting to local database...\n[{"a":1}]';
  assert.deepEqual(extractRows(raw), [{ a: 1 }]);
});

test('ignora objeto JSON de aviso de versão quando vem ANTES do resultado', () => {
  const raw = '{"level":"warn","message":"nova versão disponível"}\n{"rows":[{"a":1}]}';
  assert.deepEqual(extractRows(raw), [{ a: 1 }]);
});

test('ignora objeto JSON de aviso de versão quando vem DEPOIS do resultado (caso do CI)', () => {
  const raw = '[{"a":1}]\n{"level":"warn","message":"nova versão disponível"}';
  assert.deepEqual(extractRows(raw), [{ a: 1 }]);
});

test('não se confunde com chaves/colchetes dentro de strings (comentários de coluna etc.)', () => {
  const raw = '{"rows":[{"comment":"valores tipo {json} e [array] entre chaves"}]}\n{"other":"noise { not balanced"}';
  assert.deepEqual(extractRows(raw), [{ comment: 'valores tipo {json} e [array] entre chaves' }]);
});

test('não se confunde com aspas escapadas dentro de strings', () => {
  const raw = String.raw`[{"comment":"aspas \" e chave } escapada"}]`;
  assert.deepEqual(extractRows(raw), [{ comment: 'aspas " e chave } escapada' }]);
});

test('lança erro descritivo quando nenhum candidato é array ou tem "rows"', () => {
  assert.throws(() => extractRows('{"level":"warn","message":"sem rows aqui"}'), /Nenhuma lista de linhas encontrada/);
});

test('lança erro descritivo quando não há JSON na saída', () => {
  assert.throws(() => extractRows('só texto, sem chaves nem colchetes'), /Nenhuma lista de linhas encontrada/);
});

test('ignora chave solta que nunca fecha e segue procurando o valor válido', () => {
  const raw = 'not json at all {\n[{"b":2}]';
  assert.deepEqual(extractRows(raw), [{ b: 2 }]);
});
