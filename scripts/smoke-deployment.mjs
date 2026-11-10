import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const USAGE = [
  'Uso: SMOKE_BASE_URL=https://<deployment> node scripts/smoke-deployment.mjs',
  '',
  'Valida um deployment publicado: páginas HTML 200 com nosniff, X-Frame-Options e CSP;',
  'sitemap XML; Web Analytics 200; rota desconhecida 404; crons sem credencial 401.',
  'Respostas 5xx, timeouts e falhas de rede são repetidas até 6 vezes por rota.',
  'Sai com 0 quando tudo passa e com 1 na primeira divergência. Não recebe argumentos.',
].join('\n');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function describeFailure(error, timeoutMs) {
  // O único sinal de aborto em uso é o AbortSignal.timeout de cada tentativa.
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return `sem resposta completa em ${timeoutMs} ms`;
  const cause = error?.cause?.code || error?.cause?.message;
  const message = error instanceof Error ? error.message : String(error);
  return cause ? `${message} (${cause})` : message;
}

export async function runSmoke(baseUrl, options = {}) {
  const { attempts = 6, timeoutMs = 10_000, retryDelayMs = 2_000, log = () => {} } = options;
  const base = typeof baseUrl === 'string' ? baseUrl.trim() : '';
  if (!base) throw new Error('SMOKE_BASE_URL ausente.');

  let parsed;
  try {
    parsed = new URL(base);
  } catch {
    throw new Error('SMOKE_BASE_URL inválida: informe a URL completa do deployment, começando por https://.');
  }
  // file:, ftp: e afins têm origin "null": sem esta recusa o smoke gastaria
  // todas as tentativas de todas as rotas contra um alvo impossível.
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`SMOKE_BASE_URL deve usar https (ou http em teste local); recebido "${parsed.protocol}".`);
  }
  const origin = parsed.origin;

  // O corpo é lido (ou descartado) dentro da tentativa: assim um corpo que
  // trava conta como falha transitória, com o caminho na mensagem, e nenhuma
  // conexão pendente segura o processo depois do veredito.
  async function fetchWithRetry(path, { readBody = false } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(`${origin}${path}`, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
        if (response.status < 500) {
          const body = readBody ? await response.text() : '';
          if (!readBody) await response.body?.cancel().catch(() => {});
          if (response.redirected && new URL(response.url).origin !== origin) {
            log(`Aviso: ${path} foi respondido por ${new URL(response.url).origin} após redirecionamento.`);
          }
          return { status: response.status, headers: response.headers, body };
        }
        await response.body?.cancel().catch(() => {});
        lastError = new Error(`${path}: HTTP ${response.status}`);
      } catch (error) {
        lastError = new Error(`${path}: ${describeFailure(error, timeoutMs)}`, { cause: error });
      }
      if (attempt < attempts) {
        log(`${lastError.message} — tentativa ${attempt}/${attempts}, repetindo.`);
        await new Promise((resolve) => setTimeout(resolve, attempt * retryDelayMs));
      }
    }
    throw new Error(`${lastError?.message || `${path}: sem resposta`} (após ${attempts} tentativas)`, { cause: lastError?.cause });
  }

  const htmlRoutes = ['/', '/catalogo', '/catalogos', '/datas-comemorativas'];
  for (const path of htmlRoutes) {
    const response = await fetchWithRetry(path);
    assert(response.status === 200, `${path}: esperado 200, recebido ${response.status}`);
    assert(response.headers.get('x-content-type-options') === 'nosniff', `${path}: header nosniff ausente`);
    assert(response.headers.get('x-frame-options') === 'DENY', `${path}: X-Frame-Options divergente`);
    assert(response.headers.get('content-security-policy')?.includes("default-src 'self'"), `${path}: CSP ausente ou divergente`);
  }

  const sitemap = await fetchWithRetry('/sitemap.xml', { readBody: true });
  assert(sitemap.status === 200, `/sitemap.xml: esperado 200, recebido ${sitemap.status}`);
  assert(sitemap.headers.get('x-content-type-options') === 'nosniff', '/sitemap.xml: header nosniff ausente');
  assert(sitemap.body.trimStart().startsWith('<?xml'), '/sitemap.xml: não inicia com declaração XML');
  assert(sitemap.body.includes('<urlset'), '/sitemap.xml: elemento <urlset> ausente');

  const missing = await fetchWithRetry('/rota-inexistente-smoke-20260923');
  assert(missing.status === 404, `rota inexistente: esperado 404, recebido ${missing.status}`);

  // O App monta @vercel/analytics em toda publicação. Validar o artefato evita
  // considerar o componente React uma ativação comprovada do coletor.
  const analytics = await fetchWithRetry('/_vercel/insights/script.js');
  assert(analytics.status === 200, `Web Analytics: esperado 200, recebido ${analytics.status}`);
  assert((analytics.headers.get('content-type') || '').includes('javascript'), 'Web Analytics: script JavaScript ausente');

  for (const path of ['/api/retention', '/api/notifications']) {
    const response = await fetchWithRetry(path);
    assert(response.status === 401, `${path}: chamada sem segredo deveria retornar 401, recebeu ${response.status}`);
  }

  return `Smoke aprovado em ${origin}: páginas HTML (CSP+X-Frame em todas as rotas), sitemap XML, Analytics 200, rota desconhecida 404, crons sem credencial 401.`;
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    console.log(USAGE);
  } else if (args.length > 0) {
    console.error(`Argumento não reconhecido: ${args.join(' ')}\n${USAGE}`);
    process.exitCode = 1;
  } else {
    try {
      console.log(await runSmoke(process.env.SMOKE_BASE_URL, { log: (message) => console.error(message) }));
    } catch (error) {
      console.error(`Smoke reprovado: ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    }
  }
}
