import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRows } from '../scripts/_lib/supabaseDbQuery.mjs';

// Guarda contra duas regressões de CI observadas em 16/09 ao rodar `supabase db
// query --output-format json`:
// 1. texto solto do CLI (banner de conexão) antes do JSON — `indexOf('{')` sozinho
//    cobre isso, mas quebra se o texto vier DEPOIS do JSON (não reproduzia local).
// 2. no runner do GitHub Actions, o aviso de nova versão do CLI também sai como um
//    objeto JSON válido (não texto solto), e sua posição relativa ao objeto com
//    "rows" varia entre chamadas — pegar só "o primeiro objeto JSON da string" não
//    basta; é preciso achar o objeto que de fato tem "rows".

test('extrai rows quando não há texto extra', () => {
  assert.deepEqual(extractRows('{"rows":[{"a":1}]}'), [{ a: 1 }]);
});

test('ignora banner de conexão (texto solto) antes do JSON', () => {
  const raw = 'Connecting to local database...\n{"rows":[{"a":1}]}';
  assert.deepEqual(extractRows(raw), [{ a: 1 }]);
});

test('ignora objeto JSON de aviso de versão quando vem ANTES do objeto com rows', () => {
  const raw = '{"level":"warn","message":"nova versão disponível"}\n{"rows":[{"a":1}]}';
  assert.deepEqual(extractRows(raw), [{ a: 1 }]);
});

test('ignora objeto JSON de aviso de versão quando vem DEPOIS do objeto com rows (caso do CI)', () => {
  const raw = '{"rows":[{"a":1}]}\n{"level":"warn","message":"nova versão disponível"}';
  assert.deepEqual(extractRows(raw), [{ a: 1 }]);
});

test('não se confunde com chaves dentro de strings (comentários de coluna etc.)', () => {
  const raw = '{"rows":[{"comment":"valores tipo {json} entre chaves"}]}\n{"other":"noise { not balanced"}';
  assert.deepEqual(extractRows(raw), [{ comment: 'valores tipo {json} entre chaves' }]);
});

test('não se confunde com chaves escapadas dentro de strings', () => {
  const raw = String.raw`{"rows":[{"comment":"aspas \" e chave } escapada"}]}`;
  assert.deepEqual(extractRows(raw), [{ comment: 'aspas " e chave } escapada' }]);
});

test('lança erro descritivo quando nenhum objeto tem "rows"', () => {
  assert.throws(() => extractRows('{"level":"warn","message":"sem rows aqui"}'), /Nenhum objeto JSON com "rows"/);
});

test('lança erro descritivo quando não há JSON na saída', () => {
  assert.throws(() => extractRows('só texto, sem chaves'), /Nenhum objeto JSON com "rows"/);
});

test('ignora objeto JSON malformado (chaves não fecham) e segue procurando', () => {
  const raw = '{"broken": [{"a": 1}]\n{"rows":[{"b":2}]}';
  assert.deepEqual(extractRows(raw), [{ b: 2 }]);
});
