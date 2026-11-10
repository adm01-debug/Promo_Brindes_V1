import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
  const input = readFileSync(0, 'utf8').replace(/^\uFEFF/, '');
  if (!input.trim()) throw new Error('Nenhum JSON recebido por stdin: esperado o array de execuções do CI.');
  let runs;
  try {
    runs = JSON.parse(input);
  } catch (error) {
    throw new Error(`JSON inválido em stdin: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  process.stdout.write(`${JSON.stringify(calculateCiHealthMetrics(runs))}\n`);
}

const MODULE_BASENAME = fileURLToPath(import.meta.url).split(/[\\/]/).at(-1);

export function isDirectExecution(entryPath = process.argv[1]) {
  return entryPath?.split(/[\\/]/).at(-1) === MODULE_BASENAME;
}

if (isDirectExecution()) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
