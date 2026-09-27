import { copyFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = join(process.cwd(), 'dist', 'index.html');
const destination = join(process.cwd(), 'api', '_lib', 'app-shell.generated.html');
const html = readFileSync(source, 'utf8');

if (!/<div\s+id=["']root["'][^>]*>/i.test(html)
  || !/<script\b[^>]*\bsrc=["']\/assets\//i.test(html)) {
  throw new Error('O build não gerou um app shell válido para as funções serverless.');
}

copyFileSync(source, destination);
console.log('App shell gerado e preparado para as funções serverless.');
