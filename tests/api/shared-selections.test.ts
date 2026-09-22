import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/shared-selections.js';
import type { ApiRequest, ApiResponse } from '../../api/_lib/leadHandler.js';

const token = '11111111-1111-4111-8111-111111111111';
const manager = '22222222-2222-4222-8222-222222222222';
const item = { id: '33333333-3333-4333-8333-333333333333', q: 100, v: 'blue' };
const kitItem = {
  id: '33333333-3333-4333-8333-333333333333',
  q: 120,
  k: '44444444-4444-4444-8444-444444444444',
  kn: 'Kit boas-vindas',
  kq: 60,
  ku: 2,
};

function responseDouble() {
  const result = { headers: new Map<string, string>(), statusCode: 0, body: undefined as unknown };
  const response: ApiResponse = {
    setHeader(name, value) { result.headers.set(name, value); },
    status(code) { result.statusCode = code; return response; },
    json(body) { result.body = body; },
  };
  return { result, response };
}

function request(body: unknown, overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    method: 'POST',
    headers: { origin: 'https://promo-brindes-v1.vercel.app', 'content-type': 'application/json', 'x-vercel-forwarded-for': '203.0.113.10' },
    body,
    ...overrides,
  };
}

function configure() {
  vi.stubEnv('SITE_PUBLIC_ORIGIN', 'https://promo-brindes-v1.vercel.app');
  vi.stubEnv('SITE_SUPABASE_URL', 'https://xlzmclcjdncjfdrjxclt.supabase.co');
  vi.stubEnv('SITE_SUPABASE_SECRET_KEY', `sb_secret_${'x'.repeat(40)}`);
  vi.stubEnv('SITE_REQUEST_HASH_SALT', 'salt-de-testes-com-mais-de-32-caracteres');
}

describe('links persistentes de seleção', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('cria link opaco, sem dados de produto ou contato no banco público', async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token, expiresAt: '2026-10-11T12:00:00.000Z' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();

    await handler(request({ action: 'create', items: [item] }), response);

    expect(result.statusCode).toBe(201);
    expect(result.body).toMatchObject({ token, managementToken: expect.stringMatching(/^[0-9a-f-]{36}$/i) });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/rpc/create_site_shared_selection');
    const sent = JSON.parse(String(init.body));
    expect(sent.p_items).toEqual([item]);
    expect(sent.p_management_token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(sent.p_identifier_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(sent)).not.toContain('contact');
  });

  it('preserva a composição do kit e rejeita aritmética adulterada', async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token, expiresAt: '2026-10-11T12:00:00.000Z' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const valid = responseDouble();
    await handler(request({ action: 'create', items: [kitItem] }), valid.response);
    expect(valid.result.statusCode).toBe(201);
    const sent = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(sent.p_items).toEqual([kitItem]);

    const invalid = responseDouble();
    await handler(request({ action: 'create', items: [{ ...kitItem, q: 119 }] }), invalid.response);
    expect(invalid.result.statusCode).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('lê somente referências públicas e trata ausência como 404', async () => {
    configure();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ items: [item], expiresAt: '2026-10-11T12:00:00.000Z' }), { status: 200 })));
    const first = responseDouble();
    await handler(request({ action: 'read', token }), first.response);
    expect(first.result.statusCode).toBe(200);
    expect(first.result.body).toEqual({ items: [item], expiresAt: '2026-10-11T12:00:00.000Z' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('null', { status: 200 })));
    const second = responseDouble();
    await handler(request({ action: 'read', token }), second.response);
    expect(second.result.statusCode).toBe(404);
  });

  it('revoga apenas com a chave de gestão e não aceita origem ou referências forjadas', async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ revoked: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const valid = responseDouble();
    await handler(request({ action: 'revoke', token, managementToken: manager }), valid.response);
    expect(valid.result.statusCode).toBe(200);
    const revokeCall = fetchMock.mock.calls[0];
    if (!revokeCall) throw new Error('A revogação esperada não ocorreu.');
    expect(JSON.parse(String((revokeCall[1] as RequestInit).body)).p_management_token_hash).toMatch(/^[0-9a-f]{64}$/);

    const invalid = responseDouble();
    await handler(request({ action: 'create', items: [{ ...item, id: 'not-a-uuid' }] }), invalid.response);
    expect(invalid.result.statusCode).toBe(400);

    const foreign = responseDouble();
    await handler(request({ action: 'read', token }, { headers: { origin: 'https://evil.test' } }), foreign.response);
    expect(foreign.result.statusCode).toBe(403);
  });

  it('aceita somente o deployment Vercel atual em Preview, nunca o domínio de produção', async () => {
    configure();
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_URL', 'promo-brindes-v1-preview-abc-juca1.vercel.app');
    vi.stubEnv('SITE_PREVIEW_SUPABASE_PROJECT_REF', 'unkaeotwziynruktxizp');
    vi.stubEnv('SITE_SUPABASE_URL', 'https://unkaeotwziynruktxizp.supabase.co');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [item], expiresAt: '2026-10-11T12:00:00.000Z' }), { status: 200 })));
    const allowed = responseDouble();
    await handler(request({ action: 'read', token }, { headers: { origin: 'https://promo-brindes-v1-preview-abc-juca1.vercel.app', 'content-type': 'application/json' } }), allowed.response);
    expect(allowed.result.statusCode).toBe(200);

    const denied = responseDouble();
    await handler(request({ action: 'read', token }, { headers: { origin: 'https://promo-brindes-v1-preview-other.vercel.app', 'content-type': 'application/json' } }), denied.response);
    expect(denied.result.statusCode).toBe(403);

    const production = responseDouble();
    await handler(request({ action: 'read', token }), production.response);
    expect(production.result.statusCode).toBe(403);
  });

  it('exige JSON e limita o payload antes de consultar o banco', async () => {
    configure();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const unsupported = responseDouble();
    await handler(request({ action: 'read', token }, { headers: { origin: 'https://promo-brindes-v1.vercel.app', 'content-type': 'text/plain' } }), unsupported.response);
    expect(unsupported.result.statusCode).toBe(415);

    const oversized = responseDouble();
    await handler(request({ action: 'read', token, padding: 'x'.repeat(17 * 1024) }), oversized.response);
    expect(oversized.result.statusCode).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();

    const spoofed = responseDouble();
    await handler(request({ action: 'read', token }, { headers: { origin: 'https://promo-brindes-v1.vercel.app', 'content-type': 'application/json-evil' } }), spoofed.response);
    expect(spoofed.result.statusCode).toBe(415);
  });
});
