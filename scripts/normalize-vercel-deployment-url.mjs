import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    || !parsed.hostname.endsWith('.vercel.app')
    || parsed.pathname !== '/'
    || parsed.search
    || parsed.hash
  ) {
    throw new Error('URL do deployment Vercel fora do domínio ou formato permitido.');
  }

  return parsed.origin;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${normalizeVercelDeploymentUrl(process.argv[2])}\n`);
}
