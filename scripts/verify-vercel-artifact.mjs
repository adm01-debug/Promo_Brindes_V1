import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const expected = 'api/_lib/app-shell.generated.html';
const staticHtml = readFileSync(join(root, '.vercel', 'output', 'static', 'index.html'), 'utf8');
const functionHtml = readFileSync(join(root, expected), 'utf8');

if (functionHtml !== staticHtml) {
  throw new Error('O app shell das funções diverge do HTML publicado estaticamente.');
}

for (const name of ['site-page', 'product-page', 'not-found']) {
  const config = JSON.parse(readFileSync(join(root, '.vercel', 'output', 'functions', 'api', `${name}.func`, '.vc-config.json'), 'utf8'));
  if (config.filePathMap?.[expected] !== expected) {
    throw new Error(`O app shell não foi incluído no artefato da função ${name}.`);
  }
}

console.log('App shell idêntico ao HTML estático e mapeado nas três funções.');
