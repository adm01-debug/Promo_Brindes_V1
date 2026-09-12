import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/site-page.js';

const appShell = `<!doctype html><html><head>
  <meta name="description" content="genérica" />
  <meta name="robots" content="index,follow" />
  <meta property="og:title" content="genérico" />
  <meta property="og:description" content="genérica" />
  <meta property="og:url" content="https://example.test/" />
  <meta property="og:image" content="https://example.test/default.webp" />
  <link rel="canonical" href="https://example.test/" />
  <title>Genérico</title>
</head><body><div id="root"></div><script type="module" src="/assets/app-test.js"></script></body></html>`;

function responseDouble() {
  const result = { headers: new Map<string, string>(), statusCode: 0, body: '' };
  const response = {
    setHeader(name: string, value: string) { result.headers.set(name, value); },
    status(code: number) { result.statusCode = code; return response; },
    send(body: string) { result.body = body; },
  };
  return { result, response };
}

describe('HTML inicial das páginas estáticas', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('entrega metadados específicos para catálogo e não indexa o detalhe privado', async () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    // Cada chamada de fetch produz uma Response nova. O corpo de uma Response é
    // consumível uma única vez, como no runtime HTTP real.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(appShell, { status: 200 })));

    const catalog = responseDouble();
    await handler({ method: 'GET', query: { page: 'catalogo' } }, catalog.response);
    expect(catalog.result.statusCode).toBe(200);
    expect(catalog.result.body).toContain('<title>Catálogo de brindes | Promo Brindes</title>');
    expect(catalog.result.body).toContain('https://promo-brindes-v1.vercel.app/catalogo');

    const privatePage = responseDouble();
    await handler({ method: 'GET', query: { page: 'detalheOrcamento' } }, privatePage.response);
    expect(privatePage.result.statusCode).toBe(200);
    expect(privatePage.result.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(privatePage.result.body).toContain('noindex,nofollow');
  });

  it('preserva 404 real para uma landing editorial desconhecida', async () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(appShell, { status: 200 })));
    const { result, response } = responseDouble();
    await handler({ method: 'GET', query: { page: 'ideia', topic: 'nao-existe' } }, response);
    expect(result.statusCode).toBe(404);
    expect(result.body).toContain('Página não encontrada | Promo Brindes');
    expect(result.body).toContain('noindex,nofollow');
  });

  it('não transforma HTML de autenticação de terceiro em página estática', async () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    vi.stubEnv('VERCEL_URL', 'deployment-protegido.vercel.app');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Protected Deployment — Log in to Vercel</html>', { status: 200 })));
    const { result, response } = responseDouble();

    await handler({ method: 'GET', query: { page: 'catalogo' } }, response);

    expect(result.statusCode).toBe(503);
    expect(result.body).toContain('Catálogo de brindes | Promo Brindes');
    expect(result.body).not.toContain('Log in to Vercel');
  });
});
