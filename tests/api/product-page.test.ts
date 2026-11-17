import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/product-page.js';
import notFoundHandler from '../../api/not-found.js';
import { renderPageShell } from '../../api/_lib/pageShell.js';

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

function configure() {
  vi.stubEnv('VITE_PUBLIC_URL', 'https://www.promobrindes.com.br');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', `sb_publishable_${'x'.repeat(40)}`);
  vi.stubEnv('VITE_PRODUCT_CATALOG_RESOURCE', 'v_site_products_public');
  vi.stubEnv('VERCEL_URL', '');
  vi.stubEnv('SITE_TEST_APP_SHELL', '1');
}

describe('HTML inicial de fichas de produto', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('escapa conteúdo de catálogo no head e no JSON-LD', () => {
    const html = renderPageShell(appShell, {
      title: 'Squeeze <especial>', description: 'Descrição com "aspas" e <tag>',
      canonicalUrl: 'https://www.promobrindes.com.br/produto/squeeze', imageUrl: 'https://cdn.example/squeeze.webp',
      jsonLd: { '@type': 'Product', name: '</script><script>alert(1)</script>' },
    });
    expect(html).toContain('<title>Squeeze &lt;especial&gt;</title>');
    expect(html).toContain('Descrição com &quot;aspas&quot; e &lt;tag&gt;');
    expect(html).toContain('\\u003c/script\\u003e');
    expect(html).not.toContain('</script><script>alert(1)</script>');
  });

  it('entrega produto com metadados específicos e schema sem virar checkout', async () => {
    configure();
    const fetchMock = vi.fn(async (_input: string | URL) => new Response(JSON.stringify([{
        id: '11111111-1111-4111-8111-111111111111', name: 'Squeeze corporativo', sku: 'SQ-42', slug: 'squeeze-corporativo',
        ai_summary: 'Uma escolha funcional para eventos.', primary_image_url: 'https://cdn.example/squeeze.webp', images: [],
      }]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();

    await handler({ method: 'GET', query: { identifier: 'squeeze-corporativo' } }, response);

    expect(result.statusCode).toBe(200);
    expect(result.headers.get('Cache-Control')).toContain('s-maxage=300');
    expect(result.body).toContain('<title>Squeeze corporativo | Promo Brindes</title>');
    expect(result.body).toContain('https://www.promobrindes.com.br/produto/squeeze-corporativo');
    expect(result.body).toContain('application/ld+json');
    expect(result.body).toContain('"@type":"Product"');
    expect(String(fetchMock.mock.calls.find(([url]) => String(url).includes('/rest/v1/'))?.[0])).toContain('/v_site_products_public?');
  });

  it('responde 404 e noindex para um identificador inválido sem consultar o catálogo', async () => {
    configure();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();

    await handler({ method: 'GET', query: { identifier: '../segredo' } }, response);

    expect(result.statusCode).toBe(404);
    expect(result.headers.get('Cache-Control')).toBe('no-store');
    expect(result.body).toContain('noindex,nofollow');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserva 404 real quando o item ativo não existe', async () => {
    configure();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
    const { result, response } = responseDouble();

    await handler({ method: 'GET', query: { identifier: 'produto-removido' } }, response);

    expect(result.statusCode).toBe(404);
    expect(result.body).toContain('Produto não encontrado');
    expect(result.body).toContain('noindex,nofollow');
  });

  it('entrega 404 real também para uma rota de interface inexistente', async () => {
    configure();
    vi.stubGlobal('fetch', vi.fn());
    const { result, response } = responseDouble();

    await notFoundHandler({ method: 'GET' }, response);

    expect(result.statusCode).toBe(404);
    expect(result.body).toContain('<title>Página não encontrada | Promo Brindes</title>');
    expect(result.body).toContain('noindex,nofollow');
  });

  it('usa o shell incluso no mesmo deployment e nunca consulta a origem pública', async () => {
    configure();
    vi.stubEnv('VERCEL_URL', 'deployment-protegido.vercel.app');
    const fetchMock = vi.fn(async () => new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();

    await handler({ method: 'GET', query: { identifier: 'produto-removido' } }, response);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.statusCode).toBe(404);
    expect(result.body).not.toContain('Log in to Vercel');
  });
});

describe('alerta de queda do catálogo público', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('avisa o canal operacional quando o catálogo cai, em vez de só mostrar 503 ao visitante', async () => {
    configure();
    vi.stubEnv('OPERATIONS_ALERT_WEBHOOK_URL', 'https://alertas.test/hook');
    // Primeira chamada: catálogo; segunda: o próprio webhook de alerta.
    // O segundo parâmetro precisa existir na assinatura: o teste inspeciona o
    // corpo enviado ao webhook, e sem ele a tupla de `mock.calls` tem tamanho 1.
    const fetchMock = vi.fn(async (input: string | URL, init?: { body?: string }) => {
      void init;
      if (String(input).includes('/rest/v1/')) throw new Error('catálogo fora do ar');
      return new Response('', { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler({ method: 'GET', url: '/api/product-page?identifier=squeeze-inox' } as never, response as never);

    expect(result.statusCode).toBe(503);
    const alerta = fetchMock.mock.calls.find(([url]) => String(url) === 'https://alertas.test/hook');
    expect(alerta).toBeDefined();
    expect(String((alerta?.[1] as { body?: string } | undefined)?.body)).toContain('public_catalog_unavailable');

    // Segunda queda dentro da janela de silêncio: o visitante recebe 503 de
    // novo, mas o canal operacional não recebe um segundo alerta.
    const segunda = responseDouble();
    await handler({ method: 'GET', url: '/api/product-page?identifier=squeeze-inox' } as never, segunda.response as never);
    expect(segunda.result.statusCode).toBe(503);
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === 'https://alertas.test/hook')).toHaveLength(1);
  });

  it('não alerta quando o identificador é inválido, que não é queda de catálogo', async () => {
    configure();
    vi.stubEnv('OPERATIONS_ALERT_WEBHOOK_URL', 'https://alertas.test/hook');
    const fetchMock = vi.fn(async () => new Response('', { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler({ method: 'GET', url: '/api/product-page?identifier=' } as never, response as never);
    expect(result.statusCode).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
