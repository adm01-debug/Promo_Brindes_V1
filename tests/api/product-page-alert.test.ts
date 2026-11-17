import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Arquivo próprio e handler reimportado por teste: o alerta guarda a janela de
// silêncio em estado de módulo. Compartilhar a instância faria um teste que
// entrega um alerta suprimir os seguintes, e o de temporizador falso envenenaria
// os demais com uma janela no futuro.
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

function configure() {
  vi.stubEnv('VITE_PUBLIC_URL', 'https://www.promobrindes.com.br');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', `sb_publishable_${'x'.repeat(40)}`);
  vi.stubEnv('VITE_PRODUCT_CATALOG_RESOURCE', 'v_site_products_public');
  vi.stubEnv('VERCEL_URL', '');
  vi.stubEnv('SITE_TEST_APP_SHELL', '1');
  vi.stubEnv('OPERATIONS_ALERT_WEBHOOK_URL', 'https://alertas.test/hook');
}

const URL_ALERTA = 'https://alertas.test/hook';
const visitar = async (handler: Handler, alvo = 'squeeze-inox') => {
  const { result, response } = responseDouble();
  await handler({ method: 'GET', url: `/api/product-page?identifier=${alvo}` }, response);
  return result;
};

describe('alerta de queda do catálogo público', () => {
  beforeEach(() => { configure(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('avisa o canal operacional quando o catálogo cai, em vez de só mostrar 503 ao visitante', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: { body?: string }) => {
      void init;
      if (String(input).includes('/rest/v1/')) throw new Error('catálogo fora do ar');
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const handler = await handlerNovo();

    expect((await visitar(handler)).statusCode).toBe(503);
    const alerta = fetchMock.mock.calls.find(([url]) => String(url) === URL_ALERTA);
    expect(alerta).toBeDefined();
    expect(String((alerta?.[1] as { body?: string } | undefined)?.body)).toContain('public_catalog_unavailable');

    // Segunda queda dentro da janela: 503 de novo ao visitante, sem repetir o alerta.
    expect((await visitar(handler)).statusCode).toBe(503);
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === URL_ALERTA)).toHaveLength(1);
  });

  it('entrega que falha não compra os cinco minutos de silêncio', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
    let webhookOk = false;
    const fetchMock = vi.fn(async (input: string | URL, init?: { body?: string }) => {
      void init;
      if (String(input).includes('/rest/v1/')) throw new Error('catálogo fora do ar');
      return new Response(null, { status: webhookOk ? 204 : 500 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const handler = await handlerNovo();
    const chamadas = () => fetchMock.mock.calls.filter(([url]) => String(url) === URL_ALERTA).length;

    expect((await visitar(handler)).statusCode).toBe(503);
    expect(chamadas()).toBe(1);

    // 31 s: acima da espera de retentativa (30 s), muito abaixo do silêncio
    // (5 min). Nada foi entregue, então tenta de novo.
    vi.advanceTimersByTime(31_000);
    await visitar(handler);
    expect(chamadas()).toBe(2);

    // Canal volta: entrega confirmada e aí sim vale o silêncio longo.
    webhookOk = true;
    vi.advanceTimersByTime(31_000);
    await visitar(handler);
    expect(chamadas()).toBe(3);
    vi.advanceTimersByTime(31_000);
    await visitar(handler);
    expect(chamadas()).toBe(3);
  });

  it('duas visitas simultâneas na mesma instância geram um único alerta', async () => {
    let liberar: (() => void) | null = null;
    const pendente = new Promise<void>((resolve) => { liberar = resolve; });
    const fetchMock = vi.fn(async (input: string | URL, init?: { body?: string }) => {
      void init;
      if (String(input).includes('/rest/v1/')) throw new Error('catálogo fora do ar');
      await pendente;
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const handler = await handlerNovo();

    const a = responseDouble();
    const b = responseDouble();
    const visitas = Promise.all([
      handler({ method: 'GET', url: '/api/product-page?identifier=squeeze-inox' }, a.response),
      handler({ method: 'GET', url: '/api/product-page?identifier=squeeze-inox' }, b.response),
    ]);
    // Deixa as duas chegarem ao envio antes de o webhook responder.
    await new Promise((resolve) => setTimeout(resolve, 0));
    liberar?.();
    await visitas;

    expect(a.result.statusCode).toBe(503);
    expect(b.result.statusCode).toBe(503);
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === URL_ALERTA)).toHaveLength(1);
  });

  it('não alerta quando o identificador é inválido, que não é queda de catálogo', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const handler = await handlerNovo();

    expect((await visitar(handler, '')).statusCode).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
