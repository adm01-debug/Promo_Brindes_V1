import { existsSync, readFileSync } from 'node:fs';

const CANONICAL_CATALOG_PROJECT = 'doufsxqlfjyuvxuezpln';
const projectRefFile = new URL('../site-supabase/supabase/.temp/project-ref', import.meta.url);

if (!existsSync(projectRefFile)) {
  console.error('Novo Supabase do site ainda não foi vinculado. Use o procedimento de docs/SITE_SUPABASE_SETUP.md.');
  process.exit(1);
}

const projectRef = readFileSync(projectRefFile, 'utf8').trim();
if (!projectRef || projectRef === CANONICAL_CATALOG_PROJECT) {
  console.error('BLOQUEADO: a migration de leads nunca pode ser aplicada no Supabase canônico do catálogo.');
  process.exit(1);
}

console.log(`Destino isolado validado: ${projectRef}`);
