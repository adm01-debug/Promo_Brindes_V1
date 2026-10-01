import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const FAILURE_CONCLUSIONS = new Set([
  'failure',
  'timed_out',
  'action_required',
  'startup_failure',
  'stale',
]);

export function calculateCiHealthMetrics(runs) {
  if (!Array.isArray(runs)) throw new TypeError('A lista de execuções do CI deve ser um array.');

  let successful = 0;
  let failed = 0;
  let inconclusive = 0;

  for (const run of runs) {
    const conclusion = run && typeof run === 'object' && typeof run.conclusion === 'string'
      ? run.conclusion
      : null;
    if (conclusion === 'success') successful += 1;
    else if (conclusion && FAILURE_CONCLUSIONS.has(conclusion)) failed += 1;
    else inconclusive += 1;
  }

  const terminal = successful + failed;
  return {
    total: runs.length,
    successful,
    failed,
    inconclusive,
    terminal,
    successRate: terminal > 0 ? Math.round((successful / terminal) * 100) : null,
    failureRate: terminal > 0 ? Math.round((failed / terminal) * 100) : null,
  };
}

function runCli() {
  const file = process.argv[2];
  if (!file) throw new Error('Uso: node scripts/ci-health-metrics.mjs <runs.json>');
  const runs = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
  process.stdout.write(`${JSON.stringify(calculateCiHealthMetrics(runs))}\n`);
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) runCli();
