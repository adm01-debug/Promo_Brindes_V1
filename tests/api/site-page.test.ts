import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
    expect(catalog.result.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=3600');

    const privatePage = responseDouble();
    await handler({ method: 'GET', query: { page: 'detalheOrcamento' } }, privatePage.response);
    expect(privatePage.result.statusCode).toBe(200);
    expect(privatePage.result.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(privatePage.result.headers.get('Cache-Control')).toBe('no-store');
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

  it('publica o montador de kits com rewrite e metadados indexáveis próprios', async () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(appShell, { status: 200 })));
    const config = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      rewrites?: Array<{ source?: string; destination?: string }>;
    };
    expect(config.rewrites).toContainEqual({ source: '/montar-kit', destination: '/api/site-page?page=montarKit' });

    const { result, response } = responseDouble();
    await handler({ method: 'GET', query: { page: 'montarKit' } }, response);
    expect(result.statusCode).toBe(200);
    expect(result.headers.get('X-Robots-Tag')).toBeUndefined();
    expect(result.body).toContain('<title>Monte seu kit de brindes | Promo Brindes</title>');
    expect(result.body).toContain('https://promo-brindes-v1.vercel.app/montar-kit');
  });

  it('gera previews específicos para coleção e data compartilhadas', async () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(appShell, { status: 200 })));

    const collection = responseDouble();
    await handler({ method: 'GET', query: { page: 'catalogos', colecao: 'onboarding-com-cultura' } }, collection.response);
    expect(collection.result.statusCode).toBe(200);
    expect(collection.result.body).toContain('<title>Onboarding com cultura | Catálogos Promo Brindes</title>');
    expect(collection.result.body).toContain('/catalogos?colecao=onboarding-com-cultura');

    const occasion = responseDouble();
    await handler({ method: 'GET', query: { page: 'datas', ano: '2027', data: 'dia-do-cliente' } }, occasion.response);
    expect(occasion.result.statusCode).toBe(200);
    expect(occasion.result.body).toContain('<title>Dia do Cliente 2027 | Promo Brindes</title>');
    expect(occasion.result.body).toContain('/datas-comemorativas?ano=2027&amp;data=dia-do-cliente');
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
