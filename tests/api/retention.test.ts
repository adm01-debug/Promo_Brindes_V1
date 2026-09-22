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

  it('remove blobs pela Storage API e finaliza somente os metadados confirmados', async () => {
    configure();
    const quoteId = '11111111-1111-4111-8111-111111111111';
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.includes('/get_site_data_retention_candidates')) {
        return new Response(JSON.stringify({ quoteIds: [quoteId], storagePaths: ['cliente/proposta.pdf'] }), { status: 200 });
      }
      if (url.includes('/storage/v1/object/customer-proposals')) return new Response('[]', { status: 200 });
      if (url.includes('/finalize_site_data_retention')) return new Response(JSON.stringify({ quotesDeleted: 1, proposalDocumentsDeleted: 1 }), { status: 200 });
      return new Response('{}', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);
    expect(result.statusCode).toBe(200);
    expect(fetchMock.mock.calls).toHaveLength(3);
    const [candidatesUrl, candidatesInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(candidatesUrl).toBe('https://xlzmclcjdncjfdrjxclt.supabase.co/rest/v1/rpc/get_site_data_retention_candidates');
    expect(candidatesInit.headers).toMatchObject({ apikey: expect.stringMatching(/^sb_secret_/) });
    expect(candidatesInit.body).toBe('{"p_batch_size":100}');
    const [storageUrl, storageInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(storageUrl).toBe('https://xlzmclcjdncjfdrjxclt.supabase.co/storage/v1/object/customer-proposals');
    expect(storageInit).toMatchObject({ method: 'DELETE', body: '{"prefixes":["cliente/proposta.pdf"]}' });
    const [finalizeUrl, finalizeInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(finalizeUrl).toBe('https://xlzmclcjdncjfdrjxclt.supabase.co/rest/v1/rpc/finalize_site_data_retention');
    expect(finalizeInit.body).toBe(`{"p_quote_ids":["${quoteId}"],"p_storage_paths":["cliente/proposta.pdf"],"p_batch_size":100}`);
  });

  it('usa a role limitada para RPC e a chave de Storage separada ao migrar a autenticação', async () => {
    configure();
    const serviceJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ role: 'site_api', ref: 'xlzmclcjdncjfdrjxclt' })).toString('base64url')}.c2lnbmF0dXJl`;
    vi.stubEnv('SITE_SUPABASE_SERVICE_JWT', serviceJwt);
    const storageSecret = process.env.SITE_SUPABASE_SECRET_KEY;
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.includes('/get_site_data_retention_candidates')) {
        return new Response(JSON.stringify({ quoteIds: [], storagePaths: ['cliente/proposta.pdf'] }), { status: 200 });
      }
      if (url.includes('/storage/v1/object/customer-proposals')) return new Response('[]', { status: 200 });
      if (url.includes('/finalize_site_data_retention')) return new Response('{}', { status: 200 });
      return new Response('{}', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.statusCode).toBe(200);
    const rpcHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers;
    const storageHeaders = (fetchMock.mock.calls[1]?.[1] as RequestInit).headers;
    expect(rpcHeaders).toMatchObject({ Authorization: `Bearer ${serviceJwt}` });
    expect(storageHeaders).toMatchObject({ Authorization: `Bearer ${storageSecret}`, apikey: storageSecret });
    expect((fetchMock.mock.calls[2]?.[1] as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${serviceJwt}` });
  });

  it('não finaliza metadados quando falta credencial para apagar um blob existente', async () => {
    configure();
    const serviceJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ role: 'site_api', ref: 'xlzmclcjdncjfdrjxclt' })).toString('base64url')}.c2lnbmF0dXJl`;
    vi.stubEnv('SITE_SUPABASE_SERVICE_JWT', serviceJwt);
    vi.stubEnv('SITE_SUPABASE_SECRET_KEY', '');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ quoteIds: [], storagePaths: ['cliente/proposta.pdf'] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.statusCode).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falha fechada e não remove metadados quando a Storage API falha', async () => {
    configure();
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.includes('/get_site_data_retention_candidates')) {
        return new Response(JSON.stringify({ quoteIds: ['11111111-1111-4111-8111-111111111111'], storagePaths: ['cliente/proposta.pdf'] }), { status: 200 });
      }
      return new Response('{}', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);
    expect(result.statusCode).toBe(503);
    expect(fetchMock.mock.calls).toHaveLength(2);
    const storageCall = fetchMock.mock.calls[1];
    if (!storageCall) throw new Error('A exclusão de Storage esperada não ocorreu.');
    expect(String(storageCall[0])).toContain('/storage/v1/object/customer-proposals');
  });

  // Etapa 33 do plano de correções: cenário de falha parcial que faltava — Storage
  // removeu o arquivo, mas finalize_site_data_retention falhou antes de apagar os
  // metadados. A próxima execução (replay) precisa concluir sem duplicar nem perder,
  // mesmo com o objeto de Storage já ausente (a API de Storage trata 404 como
  // sucesso para retry — comentário em api/retention.ts, removeProposalObjects).
  it('Storage removeu mas finalize falhou: 503, sem tentar apagar Storage de novo na mesma execução', async () => {
    configure();
    const quoteId = '22222222-2222-4222-8222-222222222222';
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/get_site_data_retention_candidates')) {
        return new Response(JSON.stringify({ quoteIds: [quoteId], storagePaths: ['cliente/proposta-2.pdf'] }), { status: 200 });
      }
      if (url.includes('/storage/v1/object/customer-proposals')) return new Response('[]', { status: 200 });
      if (url.includes('/finalize_site_data_retention')) return new Response('{}', { status: 500 });
      return new Response('{}', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);
    expect(result.statusCode).toBe(503);
    expect(fetchMock.mock.calls).toHaveLength(3);
  });

  it('replay depois da falha: Storage já ausente (404) é tratado como sucesso, finalize conclui — idempotente', async () => {
    configure();
    const quoteId = '22222222-2222-4222-8222-222222222222';
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/get_site_data_retention_candidates')) {
        // Mesmo candidato da execução anterior: finalize nunca rodou, então a linha
        // continua elegível — a fonte de verdade é o banco, não o Storage.
        return new Response(JSON.stringify({ quoteIds: [quoteId], storagePaths: ['cliente/proposta-2.pdf'] }), { status: 200 });
      }
      if (url.includes('/storage/v1/object/customer-proposals')) return new Response('{"error":"not_found"}', { status: 404 });
      if (url.includes('/finalize_site_data_retention')) return new Response(JSON.stringify({ quotesDeleted: 1, proposalDocumentsDeleted: 1 }), { status: 200 });
      return new Response('{}', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);
    expect(result.statusCode).toBe(200);
    expect(fetchMock.mock.calls).toHaveLength(3);
  });
});
