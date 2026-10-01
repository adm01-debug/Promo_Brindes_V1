import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { calculateCiHealthMetrics } from '../scripts/ci-health-metrics.mjs';

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
