import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Etapa 35 do plano de correções: gera docs/DATABASE_DICTIONARY.md a partir dos
// comentários reais do banco local (pg_description), não de memória — evita o
// dicionário divergir do schema como qualquer documentação escrita à mão divergiria.
//
// Usa `supabase db query` (não psql direto): é o mesmo binário que database.yml já
// instala para db reset/test db, então não depende de postgresql-client estar
// disponível no runner do CI — uma suposição que não valia a pena arriscar.

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'docs', 'DATABASE_DICTIONARY.md');

function query(sql) {
  const raw = execFileSync('npx', ['supabase@2.115.0', 'db', 'query', '--local', '--output-format', 'json', sql], {
    cwd: ROOT,
    env: { ...process.env, SUPABASE_WORKDIR: 'site-supabase' },
    encoding: 'utf8',
  });
  // A saída mistura "Connecting to local database..." (stderr, já separado por
  // encoding: 'utf8' + stdio padrão) com um objeto JSON em stdout; extrai só o JSON.
  const jsonStart = raw.indexOf('{');
  const parsed = JSON.parse(raw.slice(jsonStart));
  return parsed.rows;
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
    `Gerado por \`npm run db:site:dictionary\` a partir de \`pg_description\` no banco local em ${new Date().toISOString().slice(0, 10)}. Não editar à mão — a fonte de verdade é o comentário na migration (\`comment on table\`/\`comment on column\`); rode o script de novo depois de qualquer mudança de schema.`,
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
