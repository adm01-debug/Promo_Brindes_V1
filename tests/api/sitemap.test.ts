import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/sitemap.js';

function responseDouble() {
  const result = { headers: new Map<string, string>(), statusCode: 0, body: '' };
  return {
    result,
    response: {
      setHeader(name: string, value: string) { result.headers.set(name, value); },
      status(code: number) { result.statusCode = code; return this; },
      send(body: string) { result.body = body; },
    },
  };
}

describe('sitemap público', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('nunca ultrapassa 50 mil URLs incluindo páginas estáticas', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const limit = Number(url.searchParams.get('limit'));
      const offset = Number(url.searchParams.get('offset'));
      return new Response(JSON.stringify(Array.from({ length: limit }, (_, index) => ({
        id: `id-${offset + index}`,
        slug: `produto-${offset + index}`,
        created_at: '2026-09-08T00:00:00Z',
      }))), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { response, result } = responseDouble();

    await handler({ method: 'GET' }, response);

    expect(result.statusCode).toBe(200);
    expect((result.body.match(/<url>/g) || [])).toHaveLength(50_000);
    expect(fetchMock).toHaveBeenCalledTimes(50);
    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    const lastUrl = new URL(String(lastCall?.[0]));
    expect(lastUrl.searchParams.get('limit')).toBe('995');
    expect(lastUrl.searchParams.get('order')).toBe('created_at.desc.nullslast,id.asc');
  });

  it('responde 503 sem publicar sitemap parcial quando o catálogo falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
    const { response, result } = responseDouble();

    await handler({ method: 'GET' }, response);

    expect(result.statusCode).toBe(503);
    expect(result.headers.get('Retry-After')).toBe('300');
    expect(result.body).toContain('temporariamente indisponível');
  });

  it('usa a view legada somente quando o contrato novo ainda não existe', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'id-seguro', slug: 'produto-seguro', created_at: null }]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { response, result } = responseDouble();

    await handler({ method: 'GET' }, response);

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('/produto/produto-seguro');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/v_products_public?');
  });

  it('responde HEAD sem consultar todo o catálogo', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { response, result } = responseDouble();
    await handler({ method: 'HEAD' }, response);
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignora um nome de recurso não autorizado', async () => {
    vi.stubEnv('VITE_PRODUCT_CATALOG_RESOURCE', 'supplier_products_raw');
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { response } = responseDouble();
    await handler({ method: 'GET' }, response);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/v_site_products_public?');
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('supplier_products_raw');
  });
});
