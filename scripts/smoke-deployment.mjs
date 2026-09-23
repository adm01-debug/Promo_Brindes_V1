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

const publicRoutes = ['/', '/catalogo', '/catalogos', '/datas-comemorativas', '/sitemap.xml'];
for (const path of publicRoutes) {
  const response = await fetchWithRetry(path);
  assert(response.status === 200, `${path}: esperado 200, recebido ${response.status}`);
  assert(response.headers.get('x-content-type-options') === 'nosniff', `${path}: header nosniff ausente`);
  if (path === '/') {
    assert(response.headers.get('x-frame-options') === 'DENY', '/: X-Frame-Options divergente');
    assert(response.headers.get('content-security-policy')?.includes("default-src 'self'"), '/: CSP ausente ou divergente');
  }
}

const missing = await fetchWithRetry('/rota-inexistente-smoke-20260923');
assert(missing.status === 404, `rota inexistente: esperado 404, recebido ${missing.status}`);

for (const path of ['/api/retention', '/api/notifications']) {
  const response = await fetchWithRetry(path);
  assert(response.status === 401, `${path}: chamada sem segredo deveria retornar 401, recebeu ${response.status}`);
}

console.log(`Smoke aprovado em ${origin}: páginas públicas 200, rota desconhecida 404, crons sem credencial 401 e headers de segurança válidos.`);
