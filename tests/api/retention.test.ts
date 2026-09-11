import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/retention.js';
import type { ApiRequest, ApiResponse } from '../../api/_lib/leadHandler.js';

function responseDouble() {
  const result = { headers: new Map<string, string>(), statusCode: 0, body: undefined as unknown };
  const response: ApiResponse = {
    setHeader(name, value) { result.headers.set(name, value); },
    status(code) { result.statusCode = code; return response; },
    json(body) { result.body = body; },
  };
  return { result, response };
}

function request(authorization = ''): ApiRequest {
  return { method: 'GET', headers: { authorization } };
}

function configure() {
  vi.stubEnv('SITE_SUPABASE_URL', 'https://xlzmclcjdncjfdrjxclt.supabase.co');
  vi.stubEnv('SITE_SUPABASE_SECRET_KEY', `sb_secret_${'x'.repeat(40)}`);
  vi.stubEnv('SITE_REQUEST_HASH_SALT', 'salt-de-testes-com-mais-de-32-caracteres');
  vi.stubEnv('CRON_SECRET', 'cron-secret-de-testes-com-mais-de-32-caracteres');
}

describe('tarefa de retenção', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('recusa chamadas sem o segredo da tarefa agendada', async () => {
    configure();
    const { result, response } = responseDouble();
    await handler(request('Bearer outra-chave'), response);
    expect(result.statusCode).toBe(401);
  });

  it('executa somente o RPC de retenção com a credencial server-side', async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);
    expect(result.statusCode).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://xlzmclcjdncjfdrjxclt.supabase.co/rest/v1/rpc/run_site_data_retention');
    expect(init.headers).toMatchObject({ apikey: expect.stringMatching(/^sb_secret_/) });
    expect(init.body).toBe('{"p_batch_size":500}');
  });
});
