import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const root = process.cwd();
const expected = 'api/_lib/app-shell.generated.html';
const staticHtml = readFileSync(join(root, '.vercel', 'output', 'static', 'index.html'), 'utf8');
const functionHtml = readFileSync(join(root, expected), 'utf8');
const vercelConfig = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));

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

const appShellFunctions = Object.entries(vercelConfig.functions ?? {})
  .filter(([, config]) => {
    const includeFiles = Array.isArray(config.includeFiles) ? config.includeFiles : [config.includeFiles];
    return includeFiles.includes(expected);
  })
  .map(([source]) => source.replace(/^api\//, '').slice(0, -extname(source).length));

if (appShellFunctions.length === 0) {
  throw new Error(`Nenhuma função declarou ${expected} em vercel.json.`);
}

for (const name of appShellFunctions) {
  const configPath = join(functionsDir, `${name}.func`, '.vc-config.json');
  if (!existsSync(configPath)) {
    throw new Error(`A função ${name}, que exige o app shell, não foi encontrada no artefato Vercel.`);
  }
  const config = JSON.parse(
    readFileSync(configPath, 'utf8'),
  );
  if (config.filePathMap?.[expected] !== expected) {
    throw new Error(`O app shell não foi incluído no artefato da função ${name}.`);
  }
}

console.log(`App shell idêntico ao HTML estático e mapeado nas ${appShellFunctions.length} funções de página: ${appShellFunctions.join(', ')}. Artefato contém ${funcNames.length} funções no total.`);
