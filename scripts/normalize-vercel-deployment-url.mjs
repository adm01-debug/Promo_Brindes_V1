import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Rótulos DNS estritos: o resultado é interpolado em shell e em logs do
// release, então nenhum caractere fora de [a-z0-9-] pode sobreviver.
const VERCEL_HOSTNAME = /^(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+vercel\.app$/;

export function normalizeVercelDeploymentUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('URL do deployment Vercel ausente.');

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('URL do deployment Vercel inválida.');
  }

  if (
    parsed.protocol !== 'https:'
    || parsed.username
    || parsed.password
    || parsed.port
    || parsed.hostname.length > 253
    || !VERCEL_HOSTNAME.test(parsed.hostname)
    || parsed.pathname !== '/'
    || parsed.search
    || parsed.hash
  ) {
    throw new Error('URL do deployment Vercel fora do domínio ou formato permitido.');
  }

  return parsed.origin;
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  try {
    // realpath dos dois lados: via symlink o Node resolve import.meta.url para
    // o caminho real, e a comparação textual deixava a CLI muda com exit 0.
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  try {
    if (process.argv.length > 3) {
      throw new Error('Uso: node scripts/normalize-vercel-deployment-url.mjs <url-ou-hostname> (exatamente um argumento).');
    }
    process.stdout.write(`${normalizeVercelDeploymentUrl(process.argv[2])}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
