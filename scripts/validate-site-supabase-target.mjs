import { existsSync, readFileSync } from 'node:fs';

const CANONICAL_CATALOG_PROJECT = 'doufsxqlfjyuvxuezpln';
const SITE_DATABASE_PROJECT = 'xlzmclcjdncjfdrjxclt';
const projectRefFile = new URL('../site-supabase/supabase/.temp/project-ref', import.meta.url);

if (!existsSync(projectRefFile)) {
  console.error('Novo Supabase do site ainda não foi vinculado. Use o procedimento de docs/SITE_SUPABASE_SETUP.md.');
  process.exit(1);
}

const projectRef = readFileSync(projectRefFile, 'utf8').trim();
if (!projectRef || projectRef === CANONICAL_CATALOG_PROJECT || projectRef !== SITE_DATABASE_PROJECT) {
  console.error(`BLOQUEADO: migrations do site só podem ser aplicadas no projeto isolado ${SITE_DATABASE_PROJECT}.`);
  process.exit(1);
}

console.log(`Destino isolado validado: ${projectRef}`);
