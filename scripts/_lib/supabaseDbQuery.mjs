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

// O padrão do Node (1 MiB) estoura com ENOBUFS assim que o catálogo cresce; o primeiro
// `npx` ainda pode baixar o binário do CLI, por isso o limite de tempo é folgado.
const MAX_OUTPUT_BYTES = 256 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_ERROR_OUTPUT_CHARS = 2_000;

function isRowList(value) {
  return Array.isArray(value) && value.every((row) => row !== null && typeof row === 'object' && !Array.isArray(row));
}

export function extractRows(raw) {
  const candidates = findBalancedJsonValues(raw);
  let sawEmptyList = false;
  for (const candidate of candidates) {
    let parsed;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      continue;
    }
    if (parsed !== null && !Array.isArray(parsed) && Array.isArray(parsed.rows)) return parsed.rows;
    // Linhas são sempre objetos: um `[1]` solto num aviso do CLI não é resultado, e um
    // `[]` só vale como resultado vazio se nenhum candidato com linhas aparecer depois.
    if (!isRowList(parsed)) continue;
    if (parsed.length > 0) return parsed;
    sawEmptyList = true;
  }
  if (sawEmptyList) return [];
  const shown = raw.length > MAX_ERROR_OUTPUT_CHARS ? `${raw.slice(0, MAX_ERROR_OUTPUT_CHARS)}… (${raw.length} caracteres no total)` : raw;
  throw new Error(`Nenhuma lista de linhas encontrada na saída do supabase CLI: ${shown}`);
}

function describeCliFailure(error, { workdir, timeoutMs }) {
  if (error.code === 'ENOENT') return 'supabase db query não pôde ser executado: npx não encontrado no PATH.';
  if (error.code === 'ETIMEDOUT') {
    return `supabase db query não respondeu em ${Math.round(timeoutMs / 1000)}s e foi interrompido. O banco local está no ar? (SUPABASE_WORKDIR=${workdir} supabase start)`;
  }
  if (error.code === 'ENOBUFS') return `supabase db query devolveu mais de ${MAX_OUTPUT_BYTES / 1024 / 1024} MiB; reduza a consulta.`;
  const outcome = error.status !== null && error.status !== undefined ? `código ${error.status}` : `sinal ${error.signal ?? 'desconhecido'}`;
  return `supabase db query --local falhou (${outcome}; a saída de erro do CLI está acima). O banco local está no ar? (SUPABASE_WORKDIR=${workdir} supabase start)`;
}

export function runSupabaseDbQuery(sql, {
  cwd,
  cliVersion = '2.115.0',
  workdir = 'site-supabase',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  exec = execFileSync,
} = {}) {
  if (typeof sql !== 'string' || !sql.trim()) throw new Error('runSupabaseDbQuery: SQL vazio.');
  // O SQL vai como argumento posicional: começando com "-" o CLI o leria como flag.
  if (sql.startsWith('-')) throw new Error('runSupabaseDbQuery: o SQL não pode começar com "-".');
  let raw;
  try {
    raw = exec('npx', [`supabase@${cliVersion}`, 'db', 'query', '--local', '--output-format', 'json', sql], {
      cwd,
      env: { ...process.env, SUPABASE_WORKDIR: workdir },
      encoding: 'utf8',
      maxBuffer: MAX_OUTPUT_BYTES,
      timeout: timeoutMs,
    });
  } catch (error) {
    throw new Error(describeCliFailure(error, { workdir, timeoutMs }), { cause: error });
  }
  return extractRows(raw);
}
