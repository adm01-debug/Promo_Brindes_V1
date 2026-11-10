import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isTerminalDelivery, parseSoakConfig, percentile } from '../scripts/soak-test-notification-queue.mjs';

// db:site:soak-test precisa do Postgres local do Supabase. Aqui o script real roda numa
// árvore temporária (o relatório não sobrescreve docs/) contra um `psql` falso no PATH que
// imita a fila: claim com housekeeping `exhausted`, finalize e contagens. Prova o laço de
// drenagem, o relatório, a validação de entrada e o tratamento de erro; o contrato SQL real
// continua coberto por pgTAP e tests/queue-concurrency.node.mjs no database.yml.

const SCRIPT = fileURLToPath(new URL('../scripts/soak-test-notification-queue.mjs', import.meta.url));

const FAKE_PSQL = `#!/usr/bin/env node
const fs = require('node:fs');
const [url, flags, dashC, sql] = process.argv.slice(2);
const stateFile = process.env.SOAK_FAKE_STATE;
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
state.calls.push({ url, flags, dashC });
const save = () => fs.writeFileSync(stateFile, JSON.stringify(state));
if (state.mode === 'refused') {
  save();
  process.stderr.write('psql: error: connection to server at "127.0.0.1", port 56322 failed: Connection refused\\n');
  process.exit(2);
}
const now = () => Date.now() / 1000;
let out = '';
if (/insert into site_private\\.quote_requests/.test(sql)) {
  const count = Number(/generate_series\\(1, (\\S+)\\)/.exec(sql)[1]);
  const run = /'(soak-[a-z0-9]+-)'/.exec(sql)[1];
  for (let g = 1; g <= count; g += 1) state.jobs.push({ id: '00000000-0000-4000-8000-' + String(g).padStart(12, '0'), clientRequestId: run + g, status: 'pending', attempts: 0, created: now(), updated: now() });
} else if (/claim_site_notification_deliveries\\(array\\['email'\\], (\\d+)\\)/.test(sql)) {
  const batch = Number(/claim_site_notification_deliveries\\(array\\['email'\\], (\\d+)\\)/.exec(sql)[1]);
  for (const job of state.jobs) if (job.status === 'failed' && job.attempts >= 5) { job.status = 'exhausted'; job.updated = now(); }
  const claimed = state.jobs.filter((job) => (job.status === 'pending' || job.status === 'failed') && job.attempts < 5).slice(0, batch);
  for (const job of claimed) { job.status = 'processing'; job.attempts += 1; job.updated = now(); }
  out = JSON.stringify(claimed.map((job) => ({ id: job.id, requestId: job.id, attempt: job.attempts })));
} else if (/finalize_site_notification_delivery/.test(sql)) {
  const job = state.jobs.find((entry) => entry.id === /'([0-9a-f-]{36})'::uuid/.exec(sql)[1]);
  job.status = /'(sent|failed)',/.exec(sql)[1];
  job.updated = now();
  out = 't';
} else if (/delivery\\.status in \\('pending', 'processing', 'failed'\\) and delivery\\.attempts < 5/.test(sql)) {
  out = String(state.jobs.filter((job) => ['pending', 'processing', 'failed'].includes(job.status) && job.attempts < 5).length);
} else if (/select count\\(\\*\\)/.test(sql)) {
  out = String(state.jobs.length);
} else if (/extract\\(epoch from delivery\\.created_at\\)/.test(sql)) {
  out = state.jobs.map((job) => [job.clientRequestId, job.created, job.updated, job.status, job.attempts].join('|')).join('\\n');
} else {
  save();
  process.stderr.write('ERROR: consulta inesperada\\n');
  process.exit(1);
}
save();
process.stdout.write(out + '\\n');
`;

function soak(t, env, { mode = 'ok', withPsql = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'soak fila é-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const dir of ['scripts', 'docs', 'bin']) fs.mkdirSync(path.join(root, dir));
  fs.copyFileSync(SCRIPT, path.join(root, 'scripts', 'soak-test-notification-queue.mjs'));
  if (withPsql) fs.writeFileSync(path.join(root, 'bin', 'psql'), FAKE_PSQL, { mode: 0o755 });
  const stateFile = path.join(root, 'state.json');
  fs.writeFileSync(stateFile, JSON.stringify({ mode, jobs: [], calls: [] }));
  const cleanEnv = { ...process.env };
  delete cleanEnv.SOAK_JOB_COUNT;
  delete cleanEnv.SOAK_FAILURE_RATE;
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'soak-test-notification-queue.mjs')], {
    cwd: os.tmpdir(),
    encoding: 'utf8',
    timeout: 120_000,
    env: {
      ...cleanEnv,
      // O psql falso vem primeiro no PATH; sem ele o PATH é só um diretório vazio. O psql
      // real da máquina (e um Supabase local que esteja no ar) nunca é alcançado.
      PATH: withPsql ? `${path.join(root, 'bin')}${path.delimiter}${path.dirname(process.execPath)}` : path.join(root, 'bin'),
      SOAK_FAKE_STATE: stateFile,
      ...env,
    },
  });
  const reportFile = path.join(root, 'docs', 'RELATORIO_SOAK_TEST_FILA_20260916.md');
  return {
    result,
    state: JSON.parse(fs.readFileSync(stateFile, 'utf8')),
    summary: () => JSON.parse(result.stdout.slice(result.stdout.indexOf('{'), result.stdout.lastIndexOf('}') + 1)),
    report: () => (fs.existsSync(reportFile) ? fs.readFileSync(reportFile, 'utf8') : null),
  };
}

test('percentile usa o método nearest-rank e devolve null para lista vazia', () => {
  assert.equal(percentile([], 95), null);
  assert.equal(percentile([7], 50), 7);
  assert.equal(percentile([1, 2, 3, 4], 50), 2);
  assert.equal(percentile([1, 2, 3, 4], 95), 4);
  assert.equal(percentile([1, 2, 3, 4], 0), 1);
  assert.equal(percentile(Array.from({ length: 100 }, (_, index) => index + 1), 95), 95);
});

test('parseSoakConfig aplica os padrões e recusa valores fora do contrato', () => {
  assert.deepEqual(parseSoakConfig({}), { jobCount: 1000, failureRate: 0.1 });
  assert.deepEqual(parseSoakConfig({ SOAK_JOB_COUNT: '', SOAK_FAILURE_RATE: '  ' }), { jobCount: 1000, failureRate: 0.1 });
  assert.deepEqual(parseSoakConfig({ SOAK_JOB_COUNT: ' 50 ', SOAK_FAILURE_RATE: '0' }), { jobCount: 50, failureRate: 0 });
  assert.deepEqual(parseSoakConfig({ SOAK_JOB_COUNT: '100000', SOAK_FAILURE_RATE: '1' }), { jobCount: 100000, failureRate: 1 });
  for (const value of ['0', '-1', '1.5', 'abc', '100001', '1; drop table x', 'Infinity']) {
    assert.throws(() => parseSoakConfig({ SOAK_JOB_COUNT: value }), /SOAK_JOB_COUNT deve ser um inteiro entre 1 e 100000/, value);
  }
  for (const value of ['10', '-0.1', 'abc', '1.01', 'NaN', '10%']) {
    assert.throws(() => parseSoakConfig({ SOAK_FAILURE_RATE: value }), /SOAK_FAILURE_RATE deve ser um número entre 0 e 1/, value);
  }
});

test('isTerminalDelivery reconhece sent, exhausted e failed com tentativas esgotadas', () => {
  assert.equal(isTerminalDelivery({ status: 'sent', attempts: 1 }), true);
  assert.equal(isTerminalDelivery({ status: 'exhausted', attempts: 5 }), true);
  assert.equal(isTerminalDelivery({ status: 'failed', attempts: 5 }), true);
  assert.equal(isTerminalDelivery({ status: 'failed', attempts: 4 }), false);
  assert.equal(isTerminalDelivery({ status: 'pending', attempts: 0 }), false);
  assert.equal(isTerminalDelivery({ status: 'processing', attempts: 5 }), false);
});

test('drena a fila sem falhas, só fala com o banco local e escreve o relatório com os padrões reais', (t) => {
  const { result, state, summary, report } = soak(t, { SOAK_JOB_COUNT: '3', SOAK_FAILURE_RATE: '0' });
  assert.equal(result.status, 0, result.stderr);
  const data = summary();
  assert.deepEqual(
    { jobCount: data.jobCount, failureRateInjected: data.failureRateInjected, claimedTotal: data.claimedTotal, deliveredTotal: data.deliveredTotal, exhaustedTotal: data.exhaustedTotal, inconclusiveTotal: data.inconclusiveTotal },
    { jobCount: 3, failureRateInjected: 0, claimedTotal: 3, deliveredTotal: 3, exhaustedTotal: 0, inconclusiveTotal: 0 },
  );
  assert.ok(data.p50Ms !== null && data.p95Ms >= data.p50Ms && data.maxMs >= data.p95Ms);
  assert.ok(state.jobs.every((job) => job.status === 'sent' && job.attempts === 1));
  assert.ok(state.calls.length > 0 && state.calls.every((call) => call.url === 'postgresql://postgres:postgres@127.0.0.1:56322/postgres' && call.flags === '-At' && call.dashC === '-c'));
  const text = report();
  assert.match(text, /Jobs sintéticos enfileirados: \*\*3\*\*/);
  assert.match(text, /\| Entregues \(`sent`\) \| 3 \|/);
  assert.match(text, /`SOAK_JOB_COUNT` \(padrão 1000\), `SOAK_FAILURE_RATE` \(padrão 0\.1\)/, 'o relatório cita o padrão, não o valor usado nesta rodada');
});

test('jobs que esgotam as tentativas viram exhausted e contam como concluídos, com tempo de fila medido', (t) => {
  const { result, state, summary, report } = soak(t, { SOAK_JOB_COUNT: '2', SOAK_FAILURE_RATE: '1' });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(state.jobs.every((job) => job.status === 'exhausted' && job.attempts === 5));
  const data = summary();
  assert.equal(data.claimedTotal, 10);
  assert.equal(data.deliveredTotal, 0);
  assert.equal(data.exhaustedTotal, 2);
  assert.equal(data.inconclusiveTotal, 0, 'exhausted é estado terminal, não "não concluído"');
  assert.ok(data.p95Ms > 0, 'o tempo de fila dos esgotados entra na calibração');
  assert.match(report(), /\| Não concluídos até o fim do teste \| 0 \|/);
  assert.match(report(), /p95 medido \(\d+\.\ds\) sob 100% de falha injetada/);
});

test('entrada inválida sai com código 1 antes de qualquer chamada ao banco', (t) => {
  for (const env of [{ SOAK_JOB_COUNT: 'abc' }, { SOAK_JOB_COUNT: '0' }, { SOAK_FAILURE_RATE: '10' }]) {
    const { result, state, report } = soak(t, env);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Soak test interrompido: SOAK_(JOB_COUNT|FAILURE_RATE) deve ser /);
    assert.equal(state.calls.length, 0);
    assert.equal(report(), null);
  }
});

test('banco fora do ar ou psql ausente: código 1, orientação em uma linha e nenhum relatório', (t) => {
  const refused = soak(t, { SOAK_JOB_COUNT: '2' }, { mode: 'refused' });
  assert.equal(refused.result.status, 1);
  assert.match(refused.result.stderr, /Connection refused\n/);
  assert.match(refused.result.stderr, /Soak test interrompido: Não foi possível conectar ao Postgres local do Supabase em 127\.0\.0\.1:56322\. .*npm run db:site:reset\n$/);
  assert.doesNotMatch(refused.result.stderr, /\n\s+at /);
  assert.equal(refused.state.calls.length, 1);
  assert.equal(refused.report(), null);

  const missing = soak(t, { SOAK_JOB_COUNT: '2' }, { withPsql: false });
  assert.equal(missing.result.status, 1);
  assert.match(missing.result.stderr, /Soak test interrompido: psql não encontrado no PATH/);
  assert.equal(missing.report(), null);
});
