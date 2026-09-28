import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const expected = 'api/_lib/app-shell.generated.html';
const staticHtml = readFileSync(join(root, '.vercel', 'output', 'static', 'index.html'), 'utf8');
const functionHtml = readFileSync(join(root, expected), 'utf8');

if (functionHtml !== staticHtml) {
  throw new Error('O app shell das funções diverge do HTML publicado estaticamente.');
}

const functionsDir = join(root, '.vercel', 'output', 'functions', 'api');
const funcNames = readdirSync(functionsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.endsWith('.func'))
  .map((d) => d.name.slice(0, -5));

if (funcNames.length === 0) {
  throw new Error('Nenhuma função encontrada em .vercel/output/functions/api/');
}

for (const name of funcNames) {
  const config = JSON.parse(
    readFileSync(join(root, '.vercel', 'output', 'functions', 'api', `${name}.func`, '.vc-config.json'), 'utf8'),
  );
  if (config.filePathMap?.[expected] !== expected) {
    throw new Error(`O app shell não foi incluído no artefato da função ${name}.`);
  }
}

console.log(`App shell idêntico ao HTML estático e mapeado nas ${funcNames.length} funções: ${funcNames.join(', ')}.`);
