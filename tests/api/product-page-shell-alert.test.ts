import { afterEach, describe, expect, it, vi } from 'vitest';

// Arquivo separado porque mocka `node:fs/promises`: o HTML inicial precisa
// falhar de forma determinística, e o artefato real (api/_lib/app-shell.generated.html)
// é gerado pelo build e ignorado pelo Git — depender da ausência dele faria o
// teste passar no CI e falhar na máquina de quem acabou de buildar.
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => { throw new Error('shell ausente no pacote da função'); }),
}));

const { default: handler } = await import('../../api/product-page.js');

function responseDouble() {
  const result = { headers: new Map<string, string>(), statusCode: 0, body: '' };
  const response = {
    setHeader(name: string, value: string) { result.headers.set(name, value); },
    status(code: number) { result.statusCode = code; return response; },
    send(body: string) { result.body = body; },
  };
  return { result, response };
}

describe('falha do HTML inicial não vira alerta de queda do catálogo', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('responde 503 ao visitante sem acusar o catálogo, que respondeu normalmente', async () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://www.promobrindes.com.br');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', `sb_publishable_${'x'.repeat(40)}`);
    vi.stubEnv('VITE_PRODUCT_CATALOG_RESOURCE', 'v_site_products_public');
    vi.stubEnv('VERCEL_URL', '');
    vi.stubEnv('OPERATIONS_ALERT_WEBHOOK_URL', 'https://alertas.test/hook');

    // O catálogo responde normalmente; só o shell falha.
    const fetchMock = vi.fn(async (input: string | URL, init?: { body?: string }) => {
      void init;
      if (String(input).includes('/rest/v1/')) {
        return new Response(JSON.stringify([{ id: 'p1', slug: 'squeeze-inox', name: 'Squeeze', is_active: true }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result, response } = responseDouble();
    await handler({ method: 'GET', url: '/api/product-page?identifier=squeeze-inox' } as never, response as never);

    expect(result.statusCode).toBe(503);
    // A consulta ao catálogo aconteceu e deu certo; nenhum POST para o canal.
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/rest/v1/'))).toBe(true);
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === 'https://alertas.test/hook')).toHaveLength(0);
  });
});
