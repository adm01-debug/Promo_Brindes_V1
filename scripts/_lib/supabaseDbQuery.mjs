import { execFileSync } from 'node:child_process';

// `supabase db query --output-format json` mistura o JSON do resultado com outras
// mensagens do CLI (banner de conexão, aviso de nova versão) na mesma stdout. No
// runner do GitHub Actions (não-interativo) o aviso de atualização também sai como
// um objeto JSON próprio — e a ordem entre ele e o objeto de resultado varia entre
// chamadas (observado ora antes, ora depois do objeto com "rows"), então não dá para
// assumir que o primeiro `{` da string é o objeto certo. Localiza todo objeto JSON
// top-level por contagem de chaves (ignorando chaves dentro de strings/escapes) e
// usa o primeiro que, ao parsear, tem uma propriedade "rows".
export function findBalancedJsonObjects(raw) {
  const objects = [];
  let i = raw.indexOf('{');
  while (i !== -1) {
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let end = -1;
    for (let j = i; j < raw.length; j += 1) {
      const ch = raw[j];
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
          end = j;
          break;
        }
      }
    }
    if (end === -1) {
      // Este `{` nunca fecha (fragmento truncado/malformado) — tenta o próximo `{`
      // depois deste ponto de partida em vez de desistir de toda a string.
      i = raw.indexOf('{', i + 1);
      continue;
    }
    objects.push(raw.slice(i, end + 1));
    i = raw.indexOf('{', end + 1);
  }
  return objects;
}

export function extractRows(raw) {
  const candidates = findBalancedJsonObjects(raw);
  for (const candidate of candidates) {
    let parsed;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      continue;
    }
    if (Array.isArray(parsed?.rows)) {
      return parsed.rows;
    }
  }
  throw new Error(`Nenhum objeto JSON com "rows" encontrado na saída do supabase CLI: ${raw}`);
}

export function runSupabaseDbQuery(sql, { cwd, cliVersion = '2.115.0', workdir = 'site-supabase' } = {}) {
  const raw = execFileSync('npx', [`supabase@${cliVersion}`, 'db', 'query', '--local', '--output-format', 'json', sql], {
    cwd,
    env: { ...process.env, SUPABASE_WORKDIR: workdir },
    encoding: 'utf8',
  });
  return extractRows(raw);
}
