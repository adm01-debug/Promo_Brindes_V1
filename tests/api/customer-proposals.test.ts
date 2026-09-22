import { afterEach, describe, expect, it, vi } from 'vitest';
import proposalHandler from '../../api/customer-proposals.js';
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

function request(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    method: 'POST',
    headers: { origin: 'https://promo-brindes-v1.vercel.app', authorization: `Bearer ${'a'.repeat(40)}`, 'content-type': 'application/json' },
    body: { proposalId: '11111111-1111-4111-8111-111111111111' },
    ...overrides,
  };
}

function configure() {
  vi.stubEnv('SITE_PUBLIC_ORIGIN', 'https://promo-brindes-v1.vercel.app');
  vi.stubEnv('SITE_SUPABASE_URL', 'https://xlzmclcjdncjfdrjxclt.supabase.co');
  vi.stubEnv('SITE_SUPABASE_SECRET_KEY', `sb_secret_${'x'.repeat(40)}`);
  vi.stubEnv('SITE_REQUEST_HASH_SALT', 'salt-de-testes-com-mais-de-32-caracteres');
}

describe('download autenticado de propostas', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('assina por 60 segundos somente o documento autorizado pelo RPC', async () => {
    configure();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ bucket: 'customer-proposals', path: 'cliente/proposta.pdf' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedURL: '/object/sign/customer-proposals/cliente/proposta.pdf?token=ok' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await proposalHandler(request(), response);
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ url: 'https://xlzmclcjdncjfdrjxclt.supabase.co/storage/v1/object/sign/customer-proposals/cliente/proposta.pdf?token=ok' });
    const signedUrlCall = fetchMock.mock.calls[1];
    if (!signedUrlCall) throw new Error('A assinatura de URL esperada não ocorreu.');
    expect(JSON.parse(String((signedUrlCall[1] as RequestInit).body))).toEqual({ expiresIn: 60 });
  });

  it('usa o JWT limitado no RPC e a credencial de Storage somente para a assinatura', async () => {
    configure();
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const siteApiJwt = `${header}.e30.signature`;
    vi.stubEnv('SITE_SUPABASE_SERVICE_JWT', siteApiJwt);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ bucket: 'customer-proposals', path: 'cliente/proposta.pdf' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedURL: '/object/sign/customer-proposals/cliente/proposta.pdf?token=ok' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const current = responseDouble();
    await proposalHandler(request(), current.response);
    expect(current.result.statusCode).toBe(200);
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).headers).toMatchObject({ apikey: siteApiJwt });
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).toMatchObject({ apikey: `sb_secret_${'x'.repeat(40)}` });
  });

  it('rejeita origem, sessão e identificador inválidos antes do banco', async () => {
    configure();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    for (const invalid of [
      request({ headers: { origin: 'https://evil.test', authorization: `Bearer ${'a'.repeat(40)}` } }),
      request({ headers: { origin: 'https://promo-brindes-v1.vercel.app' } }),
      request({ body: { proposalId: '../segredo' } }),
    ]) {
      const current = responseDouble();
      await proposalHandler(invalid, current.response);
      expect(current.result.statusCode).toBeGreaterThanOrEqual(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aceita o deployment Vercel Preview isolado e bloqueia corpo inválido antes do banco', async () => {
    configure();
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_URL', 'promo-brindes-v1-preview-abc-juca1.vercel.app');
    vi.stubEnv('SITE_PREVIEW_SUPABASE_PROJECT_REF', 'unkaeotwziynruktxizp');
    vi.stubEnv('SITE_SUPABASE_URL', 'https://unkaeotwziynruktxizp.supabase.co');
    const fetchMock = vi.fn().mockResolvedValue(new Response('null', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const preview = responseDouble();
    await proposalHandler(request({ headers: { origin: 'https://promo-brindes-v1-preview-abc-juca1.vercel.app', authorization: `Bearer ${'a'.repeat(40)}`, 'content-type': 'application/json' } }), preview.response);
    expect(preview.result.statusCode).toBe(404);

    const production = responseDouble();
    await proposalHandler(request(), production.response);
    expect(production.result.statusCode).toBe(403);
    vi.stubEnv('VERCEL_ENV', 'production');

    const unsupported = responseDouble();
    await proposalHandler(request({ headers: { origin: 'https://promo-brindes-v1.vercel.app', authorization: `Bearer ${'a'.repeat(40)}`, 'content-type': 'text/plain' } }), unsupported.response);
    expect(unsupported.result.statusCode).toBe(415);

    const oversized = responseDouble();
    await proposalHandler(request({ body: { proposalId: '11111111-1111-4111-8111-111111111111', padding: 'x'.repeat(5 * 1024) } }), oversized.response);
    expect(oversized.result.statusCode).toBe(413);

    const spoofed = responseDouble();
    await proposalHandler(request({ headers: { origin: 'https://promo-brindes-v1.vercel.app', authorization: `Bearer ${'a'.repeat(40)}`, 'content-type': 'application/json-evil' } }), spoofed.response);
    expect(spoofed.result.statusCode).toBe(415);
  });

  it('não revela se proposta alheia existe', async () => {
    configure();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('null', { status: 200 })));
    const { result, response } = responseDouble();
    await proposalHandler(request(), response);
    expect(result.statusCode).toBe(404);
    expect(result.body).toMatchObject({ error: 'proposal_not_found' });
  });

  it('recusa bucket e URL assinada fora do armazenamento isolado', async () => {
    configure();
    const foreignBucket = responseDouble();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ bucket: 'outro-bucket', path: 'cliente/proposta.pdf' }), { status: 200 })));
    await proposalHandler(request(), foreignBucket.response);
    expect(foreignBucket.result.statusCode).toBe(404);

    const unsafeUrl = responseDouble();
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ bucket: 'customer-proposals', path: 'cliente/proposta.pdf' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedURL: 'https://evil.test/proposta.pdf' }), { status: 200 })));
    await proposalHandler(request(), unsafeUrl.response);
    expect(unsafeUrl.result.statusCode).toBe(503);
  });
});
