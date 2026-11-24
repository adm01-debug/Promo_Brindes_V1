import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/commercial-alerts.js';
import type { ApiRequest, ApiResponse } from '../../api/_lib/leadHandler.js';

const WEBHOOK_URL = 'https://comercial.promobrindes.com.br/hook';
const CRON_SECRET = 'cron-secret-de-testes-com-mais-de-32-caracteres';

function responseDouble() {
  const result = { headers: new Map<string, string>(), statusCode: 0, body: undefined as unknown };
  const response: ApiResponse = {
    setHeader(name, value) { result.headers.set(name, value); },
    status(code) { result.statusCode = code; return response; },
    json(body) { result.body = body; },
  };
  return { result, response };
}

function request(authorization = `Bearer ${CRON_SECRET}`): ApiRequest {
  return { method: 'GET', headers: { authorization } };
}

function configure() {
  vi.stubEnv('SITE_SUPABASE_URL', 'https://xlzmclcjdncjfdrjxclt.supabase.co');
  vi.stubEnv('SITE_SUPABASE_SECRET_KEY', `sb_secret_${'x'.repeat(40)}`);
  vi.stubEnv('SITE_REQUEST_HASH_SALT', 'salt-de-testes-com-mais-de-32-caracteres');
  vi.stubEnv('SITE_PUBLIC_ORIGIN', 'https://promo-brindes-v1.vercel.app');
  vi.stubEnv('CRON_SECRET', CRON_SECRET);
  vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_URL', WEBHOOK_URL);
  vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_TOKEN', 'token-comercial-de-teste');
}

/** Job no formato que o banco devolve (claim_site_commercial_team_alerts). */
function job(index: number) {
  const tail = String(index).padStart(12, '0');
  return {
    id: `11111111-1111-4111-8111-${tail}`,
    leaseToken: `22222222-2222-4222-8222-${tail}`,
    existingProvider: null,
    existingProviderMessageId: null,
    requestId: `33333333-3333-4333-8333-${tail}`,
    attempt: 1,
    protocol: `PB-2026-000${index}`,
    recipientEmail: 'ana@empresa.com.br',
    recipientPhone: '(11) 99999-9999',
    contactName: 'Ana Silva',
    company: 'Empresa Exemplo',
    submittedAt: '2026-11-24T12:00:00.000Z',
    items: [{ name: 'Mochila', sku: 'MO-42', quantity: 100, colorName: 'Verde' }],
    requestKind: 'quote',
    preferredChannel: '',
    pageUrl: '',
  };
}

/**
 * Banco aceita claim/finalize/aceite e o webhook do time responde conforme o
 * teste. `maxInFlight` guarda quantas entregas ficaram em voo ao mesmo tempo —
 * prova observável de que a rodada processa o lote em paralelo, e não em série
 * (o desenho anterior entregava 1 alerta por rodada).
 */
function cronFetchMock(jobs: unknown[], webhook: (call: number) => Response) {
  const claimBodies: Array<Record<string, unknown>> = [];
  let inFlight = 0;
  let maxInFlight = 0;
  let webhookCalls = 0;
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const target = String(url);
    if (target === WEBHOOK_URL) {
      webhookCalls += 1;
      const call = webhookCalls;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return webhook(call);
    }
    if (target.includes('/rpc/claim_site_commercial_team_alerts')) {
      claimBodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
      return new Response(JSON.stringify(jobs), { status: 200 });
    }
    // finalize_site_notification_delivery e record_site_notification_provider_acceptance
    // leem booleano; record_cron_heartbeat ignora o corpo.
    return new Response('true', { status: 200 });
  });
  return { fetchMock, claimBodies, maxInFlight: () => maxInFlight };
}

describe('cron do alerta comercial (PF-01)', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('recusa chamada sem o segredo do agendador', async () => {
    configure();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('true', { status: 200 })));
    const { result, response } = responseDouble();
    await handler(request('Bearer incorreto'), response);
    expect(result.statusCode).toBe(401);
  });

  it('entrega o lote da rodada em paralelo, não um alerta por rodada', async () => {
    configure();
    const jobs = [job(1), job(2), job(3), job(4)];
    const { fetchMock, claimBodies, maxInFlight } = cronFetchMock(jobs, () => new Response('', { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();

    await handler(request(), response);

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ ok: true, claimed: 4, delivered: 4, failed: 0, pending: 0 });
    // O gargalo era o laço serial: com um job por rodada, o time comercial só
    // era avisado 5 min depois por alerta.
    expect(claimBodies[0]?.p_batch_size).toBe(4);
    expect(maxInFlight()).toBeGreaterThan(1);
  });

  it('um webhook que falha não impede os outros alertas do mesmo lote', async () => {
    configure();
    const jobs = [job(1), job(2), job(3), job(4)];
    const { fetchMock } = cronFetchMock(jobs, (call) => new Response('', { status: call === 2 ? 500 : 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();

    await handler(request(), response);

    expect(result.statusCode).toBe(200);
    // O 500 vira tentativa pendente (retry na próxima rodada); os outros três
    // não podem ser abandonados por causa dele.
    expect(result.body).toMatchObject({ claimed: 4, delivered: 3, failed: 0, pending: 1 });
  });

  it('payload fora da forma mínima é contado sem interromper os demais', async () => {
    configure();
    const jobs = [job(1), { id: 'nao-uuid' }, job(3)];
    const { fetchMock } = cronFetchMock(jobs, () => new Response('', { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();

    await handler(request(), response);

    expect(result.body).toMatchObject({ claimed: 3, delivered: 2, failed: 1, pending: 0 });
  });
});