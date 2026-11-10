import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { extractRows, findBalancedJsonValues, runSupabaseDbQuery } from '../scripts/_lib/supabaseDbQuery.mjs';

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

test('lê o JSON indentado e com escape de HTML que o CLI realmente emite', () => {
  const rows = [{ relname: 'a', comment: 'x < y & "z" > w — ação' }, { relname: 'b', comment: null }];
  const pretty = JSON.stringify(rows, null, 2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  assert.deepEqual(extractRows(`${pretty}\n`), rows);
  assert.deepEqual(extractRows(`${JSON.stringify({ advisory: { id: 'rls', remediation_sql: 'alter table [x]' }, boundary: 'b', rows, warning: 'w' }, null, 2)}\n`), rows);
});

test('aceita resultado vazio nos dois formatos e com CRLF', () => {
  assert.deepEqual(extractRows('[]\n'), []);
  assert.deepEqual(extractRows('{"boundary":"b","rows":[],"warning":"w"}\r\n'), []);
  assert.deepEqual(extractRows('Connecting...\r\n[\r\n  {"a":1}\r\n]\r\n'), [{ a: 1 }]);
});

test('lista que não é de objetos num aviso do CLI não é confundida com o resultado', () => {
  assert.deepEqual(extractRows('tentativa [1] de 3\n[{"a":1}]'), [{ a: 1 }]);
  assert.deepEqual(extractRows('WARN[0000] versão nova ["2.116.0"]\n{"rows":[{"a":1}]}'), [{ a: 1 }]);
  assert.deepEqual(extractRows('cache [] limpo\n[{"a":1}]'), [{ a: 1 }]);
  assert.deepEqual(extractRows('cache [] limpo\n[]'), []);
  assert.throws(() => extractRows('só um aviso [1, 2, 3]'), /Nenhuma lista de linhas encontrada/);
  assert.throws(() => extractRows('[null]'), /Nenhuma lista de linhas encontrada/);
  assert.throws(() => extractRows(''), /Nenhuma lista de linhas encontrada/);
});

test('erro de saída sem linhas não despeja megabytes do CLI na mensagem', () => {
  assert.throws(() => extractRows('x'.repeat(50_000)), (error) => error.message.length < 2_200 && /50000 caracteres no total/.test(error.message));
});

test('saída grande é varrida em tempo linear', () => {
  const rows = Array.from({ length: 20_000 }, (_, index) => ({ id: index, text: 'valor [com] {delimitadores} e "aspas"' }));
  const started = Date.now();
  assert.equal(extractRows(`banner {\n${JSON.stringify(rows)}`).length, rows.length);
  assert.ok(Date.now() - started < 5_000);
  assert.equal(findBalancedJsonValues('{'.repeat(2_000)).length, 0);
});

test('runSupabaseDbQuery chama o CLI travado em versão, formato e workdir, com limite de buffer e de tempo', () => {
  const calls = [];
  const exec = (file, args, options) => {
    calls.push({ file, args, options });
    return 'Connecting to local database...\n[{"n":1}]\n';
  };
  assert.deepEqual(runSupabaseDbQuery('select 1 as n', { cwd: '/repo', exec }), [{ n: 1 }]);
  assert.equal(calls[0].file, 'npx');
  assert.deepEqual(calls[0].args, ['supabase@2.115.0', 'db', 'query', '--local', '--output-format', 'json', 'select 1 as n']);
  assert.equal(calls[0].options.cwd, '/repo');
  assert.equal(calls[0].options.env.SUPABASE_WORKDIR, 'site-supabase');
  assert.equal(calls[0].options.encoding, 'utf8');
  assert.ok(calls[0].options.maxBuffer >= 64 * 1024 * 1024, 'acima do padrão de 1 MiB do Node');
  assert.ok(calls[0].options.timeout > 0, 'um CLI travado não segura o job até o timeout do workflow');
  runSupabaseDbQuery('select 1', { exec, cliVersion: '9.9.9', workdir: 'outro', timeoutMs: 1234 });
  assert.equal(calls[1].args[0], 'supabase@9.9.9');
  assert.equal(calls[1].options.env.SUPABASE_WORKDIR, 'outro');
  assert.equal(calls[1].options.timeout, 1234);
});

test('runSupabaseDbQuery recusa SQL vazio ou que o CLI leria como flag, antes de chamar o CLI', () => {
  const exec = () => assert.fail('não deveria chamar o CLI');
  for (const sql of ['', '   \n', undefined, null, 42]) assert.throws(() => runSupabaseDbQuery(sql, { exec }), /SQL vazio/);
  for (const sql of ['--linked', '-f /etc/passwd', '-- comentário\nselect 1']) assert.throws(() => runSupabaseDbQuery(sql, { exec }), /não pode começar com "-"/);
});

test('runSupabaseDbQuery traduz falha do CLI em mensagem acionável e preserva a causa', () => {
  const failing = (properties) => () => { throw Object.assign(new Error('Command failed: npx supabase db query <SQL>'), properties); };
  const cases = [
    [{ status: 1, signal: null }, /falhou \(código 1.*SUPABASE_WORKDIR=site-supabase supabase start/],
    [{ status: null, signal: 'SIGKILL' }, /falhou \(sinal SIGKILL/],
    [{ code: 'ENOENT' }, /npx não encontrado no PATH/],
    [{ code: 'ETIMEDOUT' }, /não respondeu em 2s e foi interrompido/],
    [{ code: 'ENOBUFS' }, /devolveu mais de 256 MiB/],
  ];
  for (const [properties, pattern] of cases) {
    assert.throws(
      () => runSupabaseDbQuery('select 1', { exec: failing(properties), timeoutMs: 2_000 }),
      (error) => pattern.test(error.message) && !/<SQL>/.test(error.message) && error.cause instanceof Error,
      JSON.stringify(properties),
    );
  }
});

test('runSupabaseDbQuery interrompe de verdade um CLI que não responde', () => {
  const exec = (file, args, options) => execFileSync(process.execPath, ['-e', 'setTimeout(() => {}, 60_000)'], options);
  const started = Date.now();
  assert.throws(() => runSupabaseDbQuery('select 1', { exec, timeoutMs: 300 }), /não respondeu em 0s e foi interrompido/);
  assert.ok(Date.now() - started < 10_000);
});
