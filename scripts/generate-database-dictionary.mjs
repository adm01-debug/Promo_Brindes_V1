import { writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSupabaseDbQuery } from './_lib/supabaseDbQuery.mjs';

// Etapa 35 do plano de correções: gera docs/DATABASE_DICTIONARY.md a partir dos
// comentários reais do banco local (pg_description), não de memória — evita o
// dicionário divergir do schema como qualquer documentação escrita à mão divergiria.
//
// Usa `supabase db query` (não psql direto): é o mesmo binário que database.yml já
// instala para db reset/test db, então não depende de postgresql-client estar
// disponível no runner do CI — uma suposição que não valia a pena arriscar.

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'docs', 'DATABASE_DICTIONARY.md');
const MIGRATIONS_DIR = path.join(ROOT, 'site-supabase', 'supabase', 'migrations');

// Achado da execução do plano de 20260917: usar `new Date()` aqui fazia o check de
// drift do CI (database.yml, Etapa 35) falhar em qualquer dia diferente do commit
// anterior, mesmo sem nenhuma mudança real de schema — a única coisa que mudava era o
// texto "gerado em DD/MM". A data do arquivo de migration mais recente é determinística
// (só muda quando o schema muda de verdade) e continua respondendo "a partir de que
// estado do banco isto foi gerado", que é a pergunta que a frase original tentava
// responder.
function latestMigrationDate() {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => /^\d{14}_.+\.sql$/.test(f));
  const latest = files.sort().at(-1);
  const stamp = latest.slice(0, 8); // YYYYMMDD
  return `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
}

function query(sql) {
  return runSupabaseDbQuery(sql, { cwd: ROOT });
}

function main() {
  const tables = query(`
    select c.relname, obj_description(c.oid)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'site_private' and c.relkind = 'r'
    order by c.relname;
  `);

  const columns = query(`
    select c.relname, a.attname, format_type(a.atttypid, a.atttypmod) as type, col_description(c.oid, a.attnum) as comment
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'site_private' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum;
  `);

  const functions = query(`
    select p.proname, pg_get_function_identity_arguments(p.oid) as args, obj_description(p.oid, 'pg_proc') as comment
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
    order by p.proname;
  `);

  const columnsByTable = new Map();
  for (const row of columns) {
    if (!columnsByTable.has(row.relname)) columnsByTable.set(row.relname, []);
    columnsByTable.get(row.relname).push(row);
  }

  const lines = [
    '# Dicionário de dados — site_private (Etapa 35)',
    '',
    `Gerado por \`npm run db:site:dictionary\` a partir de \`pg_description\` no banco local, na versão do schema da migration mais recente (${latestMigrationDate()}). Não editar à mão — a fonte de verdade é o comentário na migration (\`comment on table\`/\`comment on column\`); rode o script de novo depois de qualquer mudança de schema.`,
    '',
    '## Tabelas',
    '',
  ];

  for (const { relname: table, obj_description: comment } of tables) {
    lines.push(`### \`site_private.${table}\``);
    lines.push('');
    if (comment) lines.push(comment);
    else lines.push('_Sem comment on table — considerar adicionar um na próxima migration que tocar esta tabela._');
    lines.push('');
    lines.push('| Coluna | Tipo | Comentário |');
    lines.push('|---|---|---|');
    for (const { attname: column, type, comment: columnComment } of columnsByTable.get(table) || []) {
      lines.push(`| \`${column}\` | \`${type}\` | ${columnComment ? columnComment.replace(/\|/g, '\\|') : '—'} |`);
    }
    lines.push('');
  }

  lines.push('## Funções públicas (`public`)', '');
  lines.push('| Função | Argumentos | Comentário |');
  lines.push('|---|---|---|');
  for (const { proname: name, args, comment } of functions) {
    lines.push(`| \`${name}\` | \`${args}\` | ${comment ? comment.replace(/\|/g, '\\|') : '—'} |`);
  }
  lines.push('');

  writeFileSync(OUT_FILE, lines.join('\n'));
  console.log(`Escrito ${OUT_FILE} (${tables.length} tabelas, ${functions.length} funções públicas).`);
}

main();
