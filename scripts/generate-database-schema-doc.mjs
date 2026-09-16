import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Etapa 48 do plano de correções: gera docs/DATABASE_SCHEMA.md (ERD em Mermaid) a
// partir de pg_constraint no banco local — mesma filosofia da Etapa 35 (gerado, não
// escrito à mão, para nunca divergir do schema real).

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'docs', 'DATABASE_SCHEMA.md');

function query(sql) {
  const raw = execFileSync('npx', ['supabase@2.115.0', 'db', 'query', '--local', '--output-format', 'json', sql], {
    cwd: ROOT,
    env: { ...process.env, SUPABASE_WORKDIR: 'site-supabase' },
    encoding: 'utf8',
  });
  const jsonStart = raw.indexOf('{');
  return JSON.parse(raw.slice(jsonStart)).rows;
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
    `Gerado por \`npm run db:site:schema-doc\` a partir de \`pg_constraint\` no banco local em ${new Date().toISOString().slice(0, 10)}. Complementa \`docs/DATABASE_DICTIONARY.md\` (colunas e comentários) com as relações entre tabelas.`,
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
