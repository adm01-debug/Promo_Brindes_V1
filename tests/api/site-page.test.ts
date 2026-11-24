import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import handler from '../../api/site-page.js';
import { ideaLandingIds, ideaLandingMeta } from '../../shared/ideaLandingPages.js';
import { catalogSocialImages } from '../../shared/socialImages.js';
import { SITE_NAME } from '../../shared/siteName.js';

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

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
  // A rota serverless lê o mesmo app shell que é empacotado no deploy. O
  // fixture existe só para que estes testes não dependam de um build prévio.
  beforeEach(() => { vi.stubEnv('SITE_TEST_APP_SHELL', '1'); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('entrega metadados específicos para catálogo e não indexa o detalhe privado', async () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    // Cada chamada de fetch produz uma Response nova. O corpo de uma Response é
    // consumível uma única vez, como no runtime HTTP real.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(appShell, { status: 200 })));

    const catalog = responseDouble();
    await handler({ method: 'GET', query: { page: 'catalogo', perfil: 'novos', q: 'ecobag' } }, catalog.response);
    expect(catalog.result.statusCode).toBe(200);
    expect(catalog.result.body).toContain('<title>Catálogo de brindes | Promo Brindes</title>');
    expect(catalog.result.body).toContain('https://promo-brindes-v1.vercel.app/catalogo');
    expect(catalog.result.body).not.toContain('perfil=novos');
    expect(catalog.result.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=3600');

    const privatePage = responseDouble();
    await handler({ method: 'GET', query: { page: 'detalheOrcamento' } }, privatePage.response);
    expect(privatePage.result.statusCode).toBe(200);
    expect(privatePage.result.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(privatePage.result.headers.get('Cache-Control')).toBe('no-store');
    expect(privatePage.result.body).toContain('noindex,nofollow');
  });

  it('serve o back-office comercial como rota privada e nao indexavel', async () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(appShell, { status: 200 })));
    const { result, response } = responseDouble();
    await handler({ method: 'GET', query: { page: 'backoffice' } }, response);
    expect(result.statusCode).toBe(200);
    expect(result.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(result.headers.get('Cache-Control')).toBe('no-store');
    expect(result.body).toContain('noindex,nofollow');
    expect(result.body).toContain('https://promo-brindes-v1.vercel.app/admin/orcamentos');
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

  it('serve para cada landing o mesmo título que o React grava depois da hidratação', async () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(appShell, { status: 200 })));
    expect(ideaLandingIds).toHaveLength(4);
    for (const id of ideaLandingIds) {
      const { result, response } = responseDouble();
      await handler({ method: 'GET', query: { page: 'ideia', topic: id } }, response);
      expect(result.statusCode).toBe(200);
      // Mesma composição de src/components/Seo.tsx:36, pela mesma constante: um
      // literal repetido aqui não conseguiria detectar divergência de sufixo.
      expect(result.body).toContain(`<title>${escapeHtml(`${ideaLandingMeta[id].title} | ${SITE_NAME}`)}</title>`);
      expect(result.body).toContain(`content="${escapeHtml(ideaLandingMeta[id].description)}"`);
      expect(result.body).toContain(`https://promo-brindes-v1.vercel.app/ideias/${id}`);
    }
  });

  it('publica o montador de kits com rewrite e metadados indexáveis próprios', async () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(appShell, { status: 200 })));
    const config = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      rewrites?: Array<{ source?: string; destination?: string }>;
    };
    expect(config.rewrites).toContainEqual({ source: '/montar-kit', destination: '/api/site-page?page=montarKit' });
    expect(config.rewrites?.some((rewrite) => rewrite.source?.includes('_vercel/'))).toBe(true);

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

    const renamedCollection = responseDouble();
    await handler({ method: 'GET', query: { page: 'catalogos', colecao: 'novos-drops' } }, renamedCollection.response);
    expect(renamedCollection.result.statusCode).toBe(200);
    expect(renamedCollection.result.body).toContain('<title>Tendências | Catálogos Promo Brindes</title>');
    expect(renamedCollection.result.body).toContain('/catalogos?colecao=novas-tendencias');

    const occasion = responseDouble();
    await handler({ method: 'GET', query: { page: 'datas', ano: '2027', data: 'dia-do-cliente' } }, occasion.response);
    expect(occasion.result.statusCode).toBe(200);
    expect(occasion.result.body).toContain('<title>Dia do Cliente 2027 | Promo Brindes</title>');
    expect(occasion.result.body).toContain('/datas-comemorativas?ano=2027&amp;data=dia-do-cliente');
  });

  it('troca a capa social genérica pelo card da coleção compartilhada', async () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(appShell, { status: 200 })));

    const collection = responseDouble();
    await handler({ method: 'GET', query: { page: 'catalogos', colecao: 'relacionamento-que-fica' } }, collection.response);
    expect(collection.result.body).toContain('content="https://promo-brindes-v1.vercel.app/images/og/colecao-relacionamento-que-fica.png"');
    expect(collection.result.body).not.toContain('hero-gen-z-v2.webp');

    // O link antigo continua abrindo a coleção canônica e precisa do card dela.
    const renamed = responseDouble();
    await handler({ method: 'GET', query: { page: 'catalogos', colecao: 'novos-drops' } }, renamed.response);
    expect(renamed.result.body).toContain('content="https://promo-brindes-v1.vercel.app/images/og/colecao-novas-tendencias.png"');

    const index = responseDouble();
    await handler({ method: 'GET', query: { page: 'catalogos' } }, index.response);
    expect(index.result.body).toContain('content="https://promo-brindes-v1.vercel.app/images/hero-gen-z-v2.webp"');
  });

  it('mantém em public/ um card 1200x630 para cada coleção do mapa social', () => {
    const entries = Object.entries(catalogSocialImages);
    expect(entries).toHaveLength(10);
    for (const [id, path] of entries) {
      const bytes = readFileSync(join(process.cwd(), 'public', path));
      expect(bytes.subarray(1, 4).toString('ascii'), id).toBe('PNG');
      expect(bytes.readUInt32BE(16), `${id}: largura`).toBe(1200);
      expect(bytes.readUInt32BE(20), `${id}: altura`).toBe(630);
    }
  });

  it('normaliza no HTML inicial um ano que a agenda da interface não suporta', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T12:00:00-03:00'));
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(appShell, { status: 200 })));
    const occasion = responseDouble();

    await handler({ method: 'GET', query: { page: 'datas', ano: '2030', data: 'pascoa' } }, occasion.response);

    expect(occasion.result.statusCode).toBe(200);
    expect(occasion.result.body).toContain('<title>Páscoa 2026 | Promo Brindes</title>');
    expect(occasion.result.body).toContain('/datas-comemorativas?ano=2026&amp;data=pascoa');
    expect(occasion.result.body).not.toContain('ano=2030');
  });

  it('não consulta HTML de autenticação de terceiro para compor uma página estática', async () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    vi.stubEnv('VERCEL_URL', 'deployment-protegido.vercel.app');
    vi.stubGlobal('fetch', vi.fn());
    const { result, response } = responseDouble();

    await handler({ method: 'GET', query: { page: 'catalogo' } }, response);

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('Catálogo de brindes | Promo Brindes');
    expect(result.body).not.toContain('Log in to Vercel');
  });
});
