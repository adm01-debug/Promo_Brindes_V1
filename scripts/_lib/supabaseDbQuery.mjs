import { execFileSync } from 'node:child_process';

// `supabase db query --output-format json` mistura o JSON do resultado com outras
// mensagens do CLI (banner de conexão, aviso de nova versão) na mesma stdout, e o
// SHAPE do JSON de resultado observado difere entre ambientes: localmente vem como
// `{"boundary":...,"rows":[...],"warning":...}` (guarda contra prompt injection via
// dados do banco); no runner do GitHub Actions, mesma versão declarada (2.115.0),
// veio como um array top-level `[...]` de linhas, sem wrapper. O aviso de nova
// versão do CLI também pode sair como um objeto JSON próprio, em posição variável
// relativa ao resultado. Por isso: localiza todo valor JSON top-level (objeto OU
// array) por contagem de chaves/colchetes (ignorando dentro de strings/escapes) e
// usa o primeiro candidato que, ao parsear, já É um array de linhas ou tem uma
// propriedade "rows" que é um array.
function scanBalancedValue(raw, start) {
  const openChar = raw[start];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  for (let j = start; j < raw.length; j += 1) {
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
    if (ch === openChar) {
      depth += 1;
    } else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return j;
    }
  }
  return -1;
}

export function findBalancedJsonValues(raw) {
  const values = [];
  let i = 0;
  while (i < raw.length) {
    const nextBrace = raw.indexOf('{', i);
    const nextBracket = raw.indexOf('[', i);
    let start;
    if (nextBrace === -1 && nextBracket === -1) break;
    if (nextBrace === -1) start = nextBracket;
    else if (nextBracket === -1) start = nextBrace;
    else start = Math.min(nextBrace, nextBracket);

    const end = scanBalancedValue(raw, start);
    if (end === -1) {
      // Este delimitador nunca fecha (fragmento truncado/malformado) — tenta o
      // próximo a partir daqui em vez de desistir do resto da string.
      i = start + 1;
      continue;
    }
    values.push(raw.slice(start, end + 1));
    i = end + 1;
  }
  return values;
}

export function extractRows(raw) {
  const candidates = findBalancedJsonValues(raw);
  for (const candidate of candidates) {
    let parsed;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      continue;
    }
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.rows)) return parsed.rows;
  }
  throw new Error(`Nenhuma lista de linhas encontrada na saída do supabase CLI: ${raw}`);
}

export function runSupabaseDbQuery(sql, { cwd, cliVersion = '2.115.0', workdir = 'site-supabase' } = {}) {
  const raw = execFileSync('npx', [`supabase@${cliVersion}`, 'db', 'query', '--local', '--output-format', 'json', sql], {
    cwd,
    env: { ...process.env, SUPABASE_WORKDIR: workdir },
    encoding: 'utf8',
  });
  return extractRows(raw);
}
