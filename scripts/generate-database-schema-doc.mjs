import { writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSupabaseDbQuery } from './_lib/supabaseDbQuery.mjs';

// Etapa 48 do plano de correções: gera docs/DATABASE_SCHEMA.md (ERD em Mermaid) a
// partir de pg_constraint no banco local — mesma filosofia da Etapa 35 (gerado, não
// escrito à mão, para nunca divergir do schema real).

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'docs', 'DATABASE_SCHEMA.md');
const MIGRATIONS_DIR = path.join(ROOT, 'site-supabase', 'supabase', 'migrations');

// Mesmo achado e mesma correção do scripts/generate-database-dictionary.mjs (plano de
// 20260917): `new Date()` fazia o check de drift do CI falhar em qualquer dia diferente
// do commit anterior, mesmo sem mudança real de schema.
function latestMigrationDate() {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => /^\d{14}_.+\.sql$/.test(f));
  const latest = files.sort().at(-1);
  const stamp = latest.slice(0, 8);
  return `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
}

function query(sql) {
  return runSupabaseDbQuery(sql, { cwd: ROOT });
}

function sanitize(id) {
  // Mermaid não aceita hífen/ponto em identificadores de entidade sem aspas em todo
  // renderer — troca por underscore para máxima compatibilidade.
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function main() {
  const tables = query(`
    select relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'site_private' and c.relkind = 'r'
    order by relname;
  `).map((row) => row.relname);

  const foreignKeys = query(`
    select
      con.conrelid::regclass::text as from_table,
      confrelid::regclass::text as to_table_raw,
      con.conname
    from pg_constraint con
    where con.contype = 'f' and con.connamespace = 'site_private'::regnamespace
    order by 1, 2;
  `);

  const lines = [
    '# Diagrama entidade-relacionamento — site_private (Etapa 48)',
    '',
    `Gerado por \`npm run db:site:schema-doc\` a partir de \`pg_constraint\` no banco local, na versão do schema da migration mais recente (${latestMigrationDate()}). Complementa \`docs/DATABASE_DICTIONARY.md\` (colunas e comentários) com as relações entre tabelas.`,
    '',
    '```mermaid',
    'erDiagram',
  ];

  for (const table of tables) {
    lines.push(`  ${sanitize(table)}`);
  }
  for (const { from_table: fromTableRaw, to_table_raw: toTableRaw } of foreignKeys) {
    const fromTable = fromTableRaw.replace('site_private.', '');
    // to_table_raw pode vir qualificado (auth.users) ou não (site_private.x sem aspas
    // se o nome não tiver caractere especial) — normaliza os dois casos.
    const toTable = toTableRaw.includes('.') ? toTableRaw.split('.').pop() : toTableRaw;
    lines.push(`  ${sanitize(fromTable)} }o--|| ${sanitize(toTable)} : references`);
  }

  lines.push('```', '');
  lines.push('## Verificação de drift', '');
  lines.push('CI (`database.yml`) roda `supabase db diff --local` implicitamente via `db reset` a partir das migrations — se o schema real não corresponder ao que as migrations descrevem, `db reset` falha antes mesmo de chegar neste script. Este arquivo, por sua vez, falha o build se estiver desatualizado em relação ao que `db reset` produziu (mesmo padrão de `src/types/site-database.types.ts` e `docs/DATABASE_DICTIONARY.md`).', '');

  writeFileSync(OUT_FILE, lines.join('\n'));
  console.log(`Escrito ${OUT_FILE} (${tables.length} tabelas, ${foreignKeys.length} relações).`);
}

main();
