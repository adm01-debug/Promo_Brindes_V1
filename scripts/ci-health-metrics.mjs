import { readFileSync } from 'node:fs';

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
  const successRate = terminal > 0 ? Math.round((successful / terminal) * 100) : null;
  return {
    total: runs.length,
    successful,
    failed,
    inconclusive,
    terminal,
    successRate,
    failureRate: successRate === null ? null : 100 - successRate,
  };
}

function runCli() {
  if (process.argv.length > 2) throw new Error('Este comando recebe o JSON exclusivamente por stdin.');
  const runs = JSON.parse(readFileSync(0, 'utf8'));
  process.stdout.write(`${JSON.stringify(calculateCiHealthMetrics(runs))}\n`);
}

if (process.argv[1]?.endsWith('/ci-health-metrics.mjs')) runCli();
