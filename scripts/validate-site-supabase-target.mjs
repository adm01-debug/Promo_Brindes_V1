import { existsSync, readFileSync } from 'node:fs';

const CANONICAL_CATALOG_PROJECT = 'doufsxqlfjyuvxuezpln';
const SITE_DATABASE_PROJECT = 'xlzmclcjdncjfdrjxclt';
const projectRefFile = new URL('../site-supabase/supabase/.temp/project-ref', import.meta.url);
const RELINK_HINT = `Refaça o vínculo: SUPABASE_WORKDIR=site-supabase npx supabase@latest link --project-ref ${SITE_DATABASE_PROJECT}`;

function block(reason) {
  console.error(`BLOQUEADO: migrations do site só podem ser aplicadas no projeto isolado ${SITE_DATABASE_PROJECT}.`);
  console.error(reason);
  process.exit(1);
}

function describeTarget(value) {
  if (value === CANONICAL_CATALOG_PROJECT) return `o catálogo canônico ${CANONICAL_CATALOG_PROJECT} (somente leitura para este repositório)`;
  // Só ecoa o valor quando tem o formato de um project ref; qualquer outra coisa pode ser um segredo colado no lugar errado.
  return /^[a-z]{20}$/.test(value) ? `outro projeto (${value})` : 'um valor que não tem o formato de um project ref';
}

if (!existsSync(projectRefFile)) {
  console.error('Novo Supabase do site ainda não foi vinculado. Use o procedimento de docs/SITE_SUPABASE_SETUP.md.');
  process.exit(1);
}

let projectRef;
try {
  projectRef = readFileSync(projectRefFile, 'utf8').trim();
} catch (error) {
  block(`Não foi possível ler o vínculo em site-supabase/supabase/.temp/project-ref (${error.code ?? error.message}). ${RELINK_HINT}`);
}
if (!projectRef || projectRef === CANONICAL_CATALOG_PROJECT || projectRef !== SITE_DATABASE_PROJECT) {
  block(projectRef
    ? `O vínculo atual aponta para ${describeTarget(projectRef)}. ${RELINK_HINT}`
    : `O arquivo de vínculo está vazio. ${RELINK_HINT}`);
}

// No CLI do Supabase a variável SUPABASE_PROJECT_ID tem precedência sobre o arquivo de
// vínculo (flag --project-ref > SUPABASE_PROJECT_ID > supabase/.temp/project-ref):
// com ela apontando para outro projeto, o `db push` seguinte ignoraria o vínculo validado acima.
const projectIdOverride = process.env.SUPABASE_PROJECT_ID;
if (projectIdOverride !== undefined && projectIdOverride !== '' && projectIdOverride !== SITE_DATABASE_PROJECT) {
  block(`A variável de ambiente SUPABASE_PROJECT_ID aponta para ${describeTarget(projectIdOverride)} e, no CLI do Supabase, tem precedência sobre o vínculo. Remova-a (unset SUPABASE_PROJECT_ID) e repita.`);
}

console.log(`Destino isolado validado: ${projectRef}`);
