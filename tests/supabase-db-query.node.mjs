import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFirstJsonObject } from '../scripts/_lib/supabaseDbQuery.mjs';

// Guarda contra a regressão de CI de 16/09: `supabase db query` mistura o JSON com
// texto do CLI (banner, aviso de atualização) na mesma stdout, e ONDE esse texto
// aparece (antes ou depois do JSON) varia entre execução local (TTY) e o runner do
// GitHub Actions (não-interativo) — indexOf('{') sozinho só cobre o caso "antes".

test('extrai JSON quando não há texto extra', () => {
  const raw = '{"rows":[{"a":1}]}';
  assert.deepEqual(JSON.parse(extractFirstJsonObject(raw)), { rows: [{ a: 1 }] });
});

test('ignora banner de conexão antes do JSON (caso local)', () => {
  const raw = 'Connecting to local database...\n{"rows":[{"a":1}]}';
  assert.deepEqual(JSON.parse(extractFirstJsonObject(raw)), { rows: [{ a: 1 }] });
});

test('ignora aviso de nova versão do CLI depois do JSON (caso reproduzido no CI)', () => {
  const raw = '{"rows":[{"a":1}]}\nA new version of Supabase CLI is available: v2.117.0\nWe recommend updating regularly...';
  assert.deepEqual(JSON.parse(extractFirstJsonObject(raw)), { rows: [{ a: 1 }] });
});

test('ignora texto antes e depois do JSON simultaneamente', () => {
  const raw = 'Connecting to local database...\n{"rows":[{"a":1}]}\nA new version of Supabase CLI is available: v2.117.0';
  assert.deepEqual(JSON.parse(extractFirstJsonObject(raw)), { rows: [{ a: 1 }] });
});

test('não se confunde com chaves dentro de strings (comentários de coluna, etc.)', () => {
  const raw = '{"rows":[{"comment":"valores tipo {json} entre chaves"}]}\ntrailing noise { not json';
  assert.deepEqual(JSON.parse(extractFirstJsonObject(raw)), {
    rows: [{ comment: 'valores tipo {json} entre chaves' }],
  });
});

test('não se confunde com chaves escapadas dentro de strings', () => {
  const raw = String.raw`{"rows":[{"comment":"aspas \" e chave } escapada"}]}` + '\ntrailing { noise';
  assert.deepEqual(JSON.parse(extractFirstJsonObject(raw)), {
    rows: [{ comment: 'aspas " e chave } escapada' }],
  });
});

test('lança erro descritivo quando não há JSON na saída', () => {
  assert.throws(() => extractFirstJsonObject('só texto, sem chaves'), /Nenhum objeto JSON encontrado/);
});

test('lança erro descritivo quando as chaves não fecham', () => {
  assert.throws(() => extractFirstJsonObject('{"rows": [{"a": 1}]'), /chaves não fecham/);
});
