import { execFileSync } from 'node:child_process';

// `supabase db query --output-format json` mistura o JSON com texto do CLI (banner
// de conexão, aviso de nova versão) na mesma stream. Localmente esse texto aparece
// antes do JSON; no runner do GitHub Actions (não-interativo) o aviso de atualização
// do CLI foi observado DEPOIS do JSON na mesma stdout — `indexOf('{')` sozinho não
// basta (JSON.parse falha com "Unexpected non-whitespace character after JSON").
// Isola o primeiro objeto JSON top-level por contagem de chaves, ignorando chaves
// dentro de strings.
export function extractFirstJsonObject(raw) {
  const start = raw.indexOf('{');
  if (start === -1) {
    throw new Error(`Nenhum objeto JSON encontrado na saída do supabase CLI: ${raw}`);
  }
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }
  throw new Error(`Objeto JSON malformado (chaves não fecham) na saída do supabase CLI: ${raw}`);
}

export function runSupabaseDbQuery(sql, { cwd, cliVersion = '2.115.0', workdir = 'site-supabase' } = {}) {
  const raw = execFileSync('npx', [`supabase@${cliVersion}`, 'db', 'query', '--local', '--output-format', 'json', sql], {
    cwd,
    env: { ...process.env, SUPABASE_WORKDIR: workdir },
    encoding: 'utf8',
  });
  const parsed = JSON.parse(extractFirstJsonObject(raw));
  return parsed.rows;
}
