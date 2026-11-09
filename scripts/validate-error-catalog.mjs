import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Etapa 22 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md):
// docs/DATABASE_FUNCTION_CONTRACTS.md documenta um catálogo de erros gerado por
// `grep -rhoE "message = '[a-z_]+'" site-supabase/supabase/migrations/*.sql`, mas
// nada garantia que ele continuasse batendo depois da migration ser escrita — uma
// auditoria em 16/09/2026 encontrou `invalid_erasure_email` (Etapa 32) faltando na
// tabela, escrita e nunca adicionada ao catálogo. Este guard falha o build se uma
// mensagem de erro nova aparecer numa migration sem também aparecer no catálogo.

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = path.join(ROOT, 'site-supabase', 'supabase', 'migrations');
const CATALOG_FILE = path.join(ROOT, 'docs', 'DATABASE_FUNCTION_CONTRACTS.md');

// Mesmos dois padrões documentados no cabeçalho do catálogo: mensagem literal
// (`message = 'token'`) e mensagem via format() com um prefixo fixo em snake_case
// antes do primeiro `:`/espaço/vírgula interpolado (`message = format('token...`).
// O token aceita dígitos: com `[a-z_]+` uma mensagem como `invalid_mod11_input` não
// casava e ficava fora da conferência.
const LITERAL_MESSAGE_PATTERN = /message\s*=\s*'([a-z0-9_]+)'/g;
const FORMAT_MESSAGE_PATTERN = /message\s*=\s*format\('([a-z0-9_]+)/g;

export function extractErrorMessagesFromSql(sql) {
  const messages = new Set();
  for (const match of sql.matchAll(LITERAL_MESSAGE_PATTERN)) messages.add(match[1]);
  for (const match of sql.matchAll(FORMAT_MESSAGE_PATTERN)) messages.add(match[1]);
  return messages;
}

export function findUndocumentedErrorMessages(
  migrationsDir = MIGRATIONS_DIR,
  catalogFile = CATALOG_FILE,
  readDir = readdirSync,
  readFile = readFileSync,
) {
  const catalog = readFile(catalogFile, 'utf8');
  const allMessages = new Set();
  let migrationFiles = 0;

  for (const name of readDir(migrationsDir)) {
    if (!name.endsWith('.sql')) continue;
    migrationFiles += 1;
    const sql = readFile(path.join(migrationsDir, name), 'utf8');
    for (const message of extractErrorMessagesFromSql(sql)) allMessages.add(message);
  }
  if (migrationFiles === 0) {
    throw new Error(`Nenhuma migration .sql encontrada em ${migrationsDir} — nada foi verificado.`);
  }

  // O token documentado termina onde o da migration termina: `invalid_token_format` no
  // catálogo não documenta `invalid_token`. O sufixo livre (`: ...`) do format() continua aceito.
  const undocumented = [...allMessages]
    .filter((message) => !new RegExp(`\`${message}(?![a-z0-9_])`).test(catalog))
    .sort();

  return undocumented;
}

function runCli() {
  let undocumented;
  try {
    undocumented = findUndocumentedErrorMessages();
  } catch (error) {
    console.error(`Catálogo de erros não verificado: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  if (undocumented.length > 0) {
    console.error('Mensagens de erro sem entrada no catálogo (docs/DATABASE_FUNCTION_CONTRACTS.md):');
    for (const message of undocumented) {
      console.error(`  - ${message}`);
    }
    console.error('\nAdicione uma linha na tabela "Catálogo de erros" para cada uma antes de commitar.');
    process.exit(1);
  }
  console.log('Catálogo de erros em docs/DATABASE_FUNCTION_CONTRACTS.md cobre todas as mensagens encontradas nas migrations.');
}

function isMainModule() {
  // realpath: por um caminho com symlink, argv[1] difere de import.meta.url e o guard
  // sairia com código 0 sem validar nada.
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  runCli();
}
