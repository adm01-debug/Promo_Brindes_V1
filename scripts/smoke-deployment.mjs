const baseUrl = process.env.SMOKE_BASE_URL?.trim();
if (!baseUrl) throw new Error('SMOKE_BASE_URL ausente.');

const origin = new URL(baseUrl).origin;
const attempts = 6;

async function fetchWithRetry(path) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${origin}${path}`, { redirect: 'follow', signal: AbortSignal.timeout(10_000) });
      if (response.status < 500) return response;
      lastError = new Error(`${path}: HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
  }
  throw lastError || new Error(`${path}: sem resposta`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const htmlRoutes = ['/', '/catalogo', '/catalogos', '/datas-comemorativas'];
for (const path of htmlRoutes) {
  const response = await fetchWithRetry(path);
  assert(response.status === 200, `${path}: esperado 200, recebido ${response.status}`);
  assert(response.headers.get('x-content-type-options') === 'nosniff', `${path}: header nosniff ausente`);
  assert(response.headers.get('x-frame-options') === 'DENY', `${path}: X-Frame-Options divergente`);
  assert(response.headers.get('content-security-policy')?.includes("default-src 'self'"), `${path}: CSP ausente ou divergente`);
}

const sitemap = await fetchWithRetry('/sitemap.xml');
assert(sitemap.status === 200, `/sitemap.xml: esperado 200, recebido ${sitemap.status}`);
assert(sitemap.headers.get('x-content-type-options') === 'nosniff', '/sitemap.xml: header nosniff ausente');
const sitemapBody = await sitemap.text();
assert(sitemapBody.trimStart().startsWith('<?xml'), '/sitemap.xml: não inicia com declaração XML');
assert(sitemapBody.includes('<urlset'), '/sitemap.xml: elemento <urlset> ausente');

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

console.log(`Smoke aprovado em ${origin}: páginas HTML (CSP+X-Frame em todas as rotas), sitemap XML, Analytics 200, rota desconhecida 404, crons sem credencial 401.`);
