import { afterEach, describe, expect, it, vi } from 'vitest';

// `node:fs/promises` é mockado para o HTML inicial falhar de forma
// determinística: o artefato real (api/_lib/app-shell.generated.html) é gerado
// pelo build e ignorado pelo Git, então depender da ausência dele faria o teste
// passar no CI e falhar na máquina de quem acabou de buildar — foi exatamente
// o que aconteceu na primeira versão deste teste.
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => { throw new Error('shell ausente no pacote da função'); }),
}));

type Handler = (request: unknown, response: unknown) => Promise<void>;

async function handlerNovo(): Promise<Handler> {
  vi.resetModules();
  return (await import('../../api/product-page.js')).default as unknown as Handler;
}

function responseDouble() {
  const result = { headers: new Map<string, string>(), statusCode: 0, body: '' };
  const response = {
    setHeader(name: string, value: string) { result.headers.set(name, value); },
    status(code: number) { result.statusCode = code; return response; },
    send(body: string) { result.body = body; },
  };
  return { result, response };
}

const URL_ALERTA = 'https://alertas.test/hook';

function configure() {
  vi.stubEnv('VITE_PUBLIC_URL', 'https://www.promobrindes.com.br');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', `sb_publishable_${'x'.repeat(40)}`);
  vi.stubEnv('VITE_PRODUCT_CATALOG_RESOURCE', 'v_site_products_public');
  vi.stubEnv('VERCEL_URL', '');
  vi.stubEnv('OPERATIONS_ALERT_WEBHOOK_URL', URL_ALERTA);
}

const alertas = (mock: { mock: { calls: unknown[][] } }) =>
  mock.mock.calls.filter((call) => String(call[0]) === URL_ALERTA).length;

describe('origem da falha decide o alerta quando o HTML inicial não carrega', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('não acusa o catálogo quando só o HTML falhou', async () => {
    configure();
    const fetchMock = vi.fn(async (input: string | URL, init?: { body?: string }) => {
      void init;
      if (String(input).includes('/rest/v1/')) {
        return new Response(JSON.stringify([{ id: 'p1', slug: 'squeeze-inox', name: 'Squeeze', is_active: true }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const handler = await handlerNovo();

    const { result, response } = responseDouble();
    await handler({ method: 'GET', url: '/api/product-page?identifier=squeeze-inox' }, response);

    expect(result.statusCode).toBe(503);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/rest/v1/'))).toBe(true);
    expect(alertas(fetchMock)).toBe(0);
  });

  it('ainda alerta a queda do catálogo quando o HTML falha primeiro e a consulta cai depois', async () => {
    configure();
    // O shell falha de imediato (leitura local mockada); a consulta só rejeita
    // 20 ms depois. Com Promise.all o handler terminava antes disso e a queda
    // real do catálogo ficava sem aviso.
    const fetchMock = vi.fn(async (input: string | URL, init?: { body?: string }) => {
      void init;
      if (String(input).includes('/rest/v1/')) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        throw new Error('catálogo fora do ar');
      }
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const handler = await handlerNovo();

    const { result, response } = responseDouble();
    await handler({ method: 'GET', url: '/api/product-page?identifier=squeeze-inox' }, response);

    expect(result.statusCode).toBe(503);
    expect(alertas(fetchMock)).toBe(1);
  });
});
