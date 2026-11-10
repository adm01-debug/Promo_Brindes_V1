import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const root = process.cwd();
const expected = 'api/_lib/app-shell.generated.html';
const staticIndex = '.vercel/output/static/index.html';
const functionsRoot = '.vercel/output/functions/api';

function read(relativePath, hint) {
  try {
    return readFileSync(join(root, relativePath));
  } catch (error) {
    throw new Error(`Não foi possível ler ${relativePath} (${error.code ?? error.message}). ${hint}`, { cause: error });
  }
}

function readJson(relativePath, hint) {
  const text = read(relativePath, hint).toString('utf8');
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${relativePath} não é um JSON válido: ${error.message}`, { cause: error });
  }
}

const buildHint = 'Rode `vercel build --prod` na raiz do repositório antes deste verificador.';
const staticHtml = read(staticIndex, buildHint);
const functionHtml = read(expected, 'O arquivo é gerado por scripts/stage-app-shell.mjs no fim de `npm run build`.');
const vercelConfig = readJson('vercel.json', 'Execute o verificador na raiz do repositório.');

// Comparação por bytes: decodificar como UTF-8 igualaria sequências inválidas distintas.
if (!functionHtml.equals(staticHtml)) {
  throw new Error('O app shell das funções diverge do HTML publicado estaticamente.');
}

const functionsDir = join(root, functionsRoot);
if (!existsSync(functionsDir)) {
  throw new Error(`Diretório ${functionsRoot}/ ausente no artefato. ${buildHint}`);
}
// A Vercel pode emitir funções agrupadas como symlinks para outro .func.
const funcNames = readdirSync(functionsDir)
  .filter((name) => name.endsWith('.func') && statSync(join(functionsDir, name), { throwIfNoEntry: false })?.isDirectory())
  .map((name) => name.slice(0, -5));

if (funcNames.length === 0) {
  throw new Error('Nenhuma função encontrada em .vercel/output/functions/api/');
}

const appShellFunctions = Object.entries(vercelConfig?.functions ?? {})
  .filter(([, config]) => {
    const includeFiles = Array.isArray(config?.includeFiles) ? config.includeFiles : [config?.includeFiles];
    return includeFiles.includes(expected);
  })
  .map(([source]) => {
    if (/[*?{]/.test(source)) {
      throw new Error(`vercel.json declara ${expected} pelo padrão "${source}"; o verificador exige o caminho explícito de cada função.`);
    }
    const extension = extname(source);
    return source.replace(/^api\//, '').slice(0, extension ? -extension.length : undefined);
  });

if (appShellFunctions.length === 0) {
  throw new Error(`Nenhuma função declarou ${expected} em vercel.json.`);
}

for (const name of appShellFunctions) {
  const configRelativePath = `${functionsRoot}/${name}.func/.vc-config.json`;
  if (!existsSync(join(root, configRelativePath))) {
    throw new Error(`A função ${name}, que exige o app shell, não foi encontrada no artefato Vercel.`);
  }
  const config = readJson(configRelativePath, buildHint);
  if (config?.filePathMap?.[expected] !== expected) {
    throw new Error(`O app shell não foi incluído no artefato da função ${name}.`);
  }
}

console.log(`App shell idêntico ao HTML estático e mapeado nas ${appShellFunctions.length} funções de página: ${appShellFunctions.join(', ')}. Artefato contém ${funcNames.length} funções no total.`);
