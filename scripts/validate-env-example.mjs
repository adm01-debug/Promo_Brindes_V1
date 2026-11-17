import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// PF-112 da auditoria de 11/10/2026: `CATALOG_SUPABASE_PUBLISHABLE_KEY` é lida por
// api/_lib/catalogValidation.ts e nunca foi citada em .env.example. Como ela tem
// fallback para VITE_SUPABASE_PUBLISHABLE_KEY, nada quebrou — e foi exatamente por
// isso que a omissão durou: ninguém descobre a variável existente, e quem monta um
// ambiente novo não sabe que pode separar a chave do servidor da chave do navegador.
// Uma variável sem fallback que falte no exemplo custa mais caro: a rota falha
// fechada e o operador recebe só "não está configurado", sem o nome que falta.
// Este guard falha o build quando uma função em api/ passa a ler uma variável que o
// .env.example não cita em nenhum lugar — nem como atribuição, nem em comentário.

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_DIR = path.join(ROOT, 'api');
const ENV_EXAMPLE_FILE = path.join(ROOT, '.env.example');

// Injetadas pela plataforma em tempo de execução: documentá-las no exemplo sugeriria,
// erradamente, que alguém precisa defini-las na Vercel.
const PLATFORM_PROVIDED = new Set(['NODE_ENV', 'VERCEL_ENV', 'VERCEL_URL', 'CI']);
// Chaves que só existem para teste. Não entram no exemplo porque defini-las em
// produção mudaria o comportamento da rota.
const TEST_ONLY = new Set(['SITE_TEST_APP_SHELL']);

const ENV_REFERENCE_PATTERN = /process\.env\.([A-Z][A-Z0-9_]*)/g;

export function extractEnvNames(source) {
  const names = new Set();
  for (const match of source.matchAll(ENV_REFERENCE_PATTERN)) names.add(match[1]);
  return names;
}

function listTypeScriptFiles(directory, readDir = readdirSync) {
  const files = [];
  for (const entry of readDir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listTypeScriptFiles(full, readDir));
    else if (entry.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

export function findUndocumentedEnvVars(
  apiDir = API_DIR,
  envExampleFile = ENV_EXAMPLE_FILE,
  readFile = readFileSync,
  listFiles = listTypeScriptFiles,
) {
  const envExample = readFile(envExampleFile, 'utf8');
  const files = listFiles(apiDir);
  if (files.length === 0) {
    throw new Error(`Nenhum arquivo .ts encontrado em ${apiDir} — nada foi verificado.`);
  }

  const referenced = new Set();
  for (const file of files) {
    for (const name of extractEnvNames(readFile(file, 'utf8'))) referenced.add(name);
  }

  // Citada em qualquer lugar do arquivo vale: SITE_PREVIEW_SUPABASE_PROJECT_REF é
  // documentada só em comentário, de propósito, porque só o escopo Preview a define.
  // Os dois limites são necessários e cada um pega um caso real: o da direita
  // impede que CATALOG_SUPABASE_PUBLISHABLE_KEY documente ..._KEY_V2; o da
  // esquerda impede que VITE_SITE_SUPABASE_URL, a chave do navegador, passe por
  // documentação de SITE_SUPABASE_URL, a credencial de backend lida em
  // api/_lib/siteDatabase.ts — exatamente a omissão que este guard existe para
  // bloquear.
  return [...referenced]
    .filter((name) => !PLATFORM_PROVIDED.has(name) && !TEST_ONLY.has(name))
    .filter((name) => !new RegExp(`(?<![A-Z0-9_])${name}(?![A-Z0-9_])`).test(envExample))
    .sort();
}

function runCli() {
  let undocumented;
  try {
    undocumented = findUndocumentedEnvVars();
  } catch (error) {
    console.error(`.env.example não verificado: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  if (undocumented.length > 0) {
    console.error('Variáveis lidas por api/ e ausentes de .env.example:');
    for (const name of undocumented) console.error(`  - ${name}`);
    console.error('\nDocumente cada uma no .env.example (atribuição ou comentário) antes de commitar.');
    console.error('Se for injetada pela plataforma ou exclusiva de teste, acrescente-a à lista certa em scripts/validate-env-example.mjs, com o motivo.');
    process.exit(1);
  }
  console.log('.env.example cita todas as variáveis de ambiente lidas por api/.');
}

function isMainModule() {
  // Mesmo motivo do guard do catálogo de erros: por um caminho com symlink, argv[1]
  // difere de import.meta.url e o guard sairia com código 0 sem validar nada.
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  runCli();
}
