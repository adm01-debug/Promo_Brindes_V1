import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { calculateCiHealthMetrics, isDirectExecution } from '../scripts/ci-health-metrics.mjs';

test('não contabiliza cancelamento, timeout ou execução pendente como sucesso', () => {
  assert.deepEqual(calculateCiHealthMetrics([
    { conclusion: 'success' },
    { conclusion: 'failure' },
    { conclusion: 'cancelled' },
    { conclusion: 'timed_out' },
    { conclusion: null },
  ]), {
    total: 5,
    successful: 1,
    failed: 2,
    inconclusive: 2,
    terminal: 3,
    successRate: 33,
    failureRate: 67,
  });
});

test('separa conclusões neutras e ignoradas do denominador terminal', () => {
  assert.deepEqual(calculateCiHealthMetrics([
    { conclusion: 'success' },
    { conclusion: 'success' },
    { conclusion: 'neutral' },
    { conclusion: 'skipped' },
  ]), {
    total: 4,
    successful: 2,
    failed: 0,
    inconclusive: 2,
    terminal: 2,
    successRate: 100,
    failureRate: 0,
  });
});

test('amostra sem conclusão terminal permanece inconclusiva', () => {
  assert.deepEqual(calculateCiHealthMetrics([{ conclusion: null }, { conclusion: 'cancelled' }]), {
    total: 2,
    successful: 0,
    failed: 0,
    inconclusive: 2,
    terminal: 0,
    successRate: null,
    failureRate: null,
  });
});

test('taxas arredondadas continuam somando exatamente 100', () => {
  const metrics = calculateCiHealthMetrics([
    { conclusion: 'success' },
    ...Array.from({ length: 7 }, () => ({ conclusion: 'failure' })),
  ]);
  assert.equal(metrics.successRate, 13);
  assert.equal(metrics.failureRate, 87);
  assert.equal(metrics.successRate + metrics.failureRate, 100);
});

test('recusa resposta da API que não seja uma lista', () => {
  assert.throws(() => calculateCiHealthMetrics({ workflow_runs: [] }), /deve ser um array/);
});

test('CLI lê JSON somente de stdin e recusa qualquer caminho informado', () => {
  const input = JSON.stringify([{ conclusion: 'success' }, { conclusion: 'cancelled' }]);
  const success = spawnSync(process.execPath, ['scripts/ci-health-metrics.mjs'], { input, encoding: 'utf8' });
  assert.equal(success.status, 0, success.stderr);
  assert.deepEqual(JSON.parse(success.stdout), {
    total: 2,
    successful: 1,
    failed: 0,
    inconclusive: 1,
    terminal: 1,
    successRate: 100,
    failureRate: 0,
  });

  const rejected = spawnSync(process.execPath, ['scripts/ci-health-metrics.mjs', '/etc/passwd'], { input, encoding: 'utf8' });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /exclusivamente por stdin/);
  assert.doesNotMatch(rejected.stderr, /root:/);
});

test('reconhece a execução direta com separadores POSIX ou Windows', () => {
  assert.equal(isDirectExecution('/workspace/scripts/ci-health-metrics.mjs'), true);
  assert.equal(isDirectExecution('C:\\workspace\\scripts\\ci-health-metrics.mjs'), true);
  assert.equal(isDirectExecution('/workspace/tests/runner.mjs'), false);
  assert.equal(isDirectExecution(undefined), false);
});

test('CLI falha com exit 1, stdout vazio e uma linha acionável para entrada inválida', () => {
  for (const [input, expected] of [
    ['', /^Nenhum JSON recebido por stdin[^\n]*\n$/],
    [' \r\n', /^Nenhum JSON recebido por stdin[^\n]*\n$/],
    ['[{', /^JSON inválido em stdin: [^\n]+\n$/],
    ['{"workflow_runs":[]}', /^A lista de execuções do CI deve ser um array\.\n$/],
    ['null', /^A lista de execuções do CI deve ser um array\.\n$/],
  ]) {
    const result = spawnSync(process.execPath, ['scripts/ci-health-metrics.mjs'], { input, encoding: 'utf8' });
    assert.equal(result.status, 1, JSON.stringify(input));
    assert.equal(result.stdout, '');
    assert.match(result.stderr, expected);
  }
});

test('CLI aceita JSON com BOM e quebras CRLF e imprime uma única linha', () => {
  const input = '\uFEFF[\r\n{"conclusion":"success"},\r\n{"conclusion":"stale"}\r\n]\r\n';
  const result = spawnSync(process.execPath, ['scripts/ci-health-metrics.mjs'], { input, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '{"total":2,"successful":1,"failed":1,"inconclusive":0,"terminal":2,"successRate":50,"failureRate":50}\n');
  assert.equal(result.stderr, '');
});

test('itens fora do formato da API contam como inconclusivos, nunca como sucesso', () => {
  assert.deepEqual(calculateCiHealthMetrics([
    null,
    1,
    'success',
    [],
    {},
    { conclusion: 1 },
    { conclusion: 'SUCCESS' },
    { conclusion: ' success ' },
    { conclusion: '__proto__' },
    { conclusion: 'constructor' },
  ]), {
    total: 10,
    successful: 0,
    failed: 0,
    inconclusive: 10,
    terminal: 0,
    successRate: null,
    failureRate: null,
  });
  assert.deepEqual(calculateCiHealthMetrics([]), {
    total: 0,
    successful: 0,
    failed: 0,
    inconclusive: 0,
    terminal: 0,
    successRate: null,
    failureRate: null,
  });
});

test('toda conclusão de falha da API do GitHub entra no denominador terminal', () => {
  const metrics = calculateCiHealthMetrics(
    ['failure', 'timed_out', 'action_required', 'startup_failure', 'stale'].map((conclusion) => ({ conclusion })),
  );
  assert.equal(metrics.failed, 5);
  assert.equal(metrics.terminal, 5);
  assert.equal(metrics.successRate, 0);
  assert.equal(metrics.failureRate, 100);
});
