import { afterEach, describe, expect, it, vi } from 'vitest';
import contactHandler from './contact-requests';
import quoteHandler from './quote-requests';
import type { ApiRequest, ApiResponse } from './_lib/leadHandler';

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
    headers: {
      'content-type': 'application/json',
      origin: 'https://www.promobrindes.com.br',
      'user-agent': 'Vitest',
      'x-forwarded-for': '203.0.113.42',
    },
    body,
    ...overrides,
  };
}

const common = {
  consent: { accepted: true, noticeVersion: '2026-09-08', acceptedAt: '2026-09-08T12:00:00.000Z' },
  submittedAt: '2026-09-08T12:00:00.000Z',
  pageUrl: 'https://www.promobrindes.com.br/',
};

const contactPayload = {
  ...common,
  source: 'site-promo-brindes-contact',
  clientRequestId: 'contact-request-123',
  contact: { name: 'Ana Silva', email: 'ANA@EMPRESA.COM.BR', phone: '(11) 99999-9999' },
};

const quotePayload = {
  ...common,
  source: 'site-promo-brindes',
  clientRequestId: 'quote-request-123',
  contact: {
    name: 'Ana Silva', company: 'Empresa Exemplo', email: 'ana@empresa.com.br',
    phone: '(11) 99999-9999', city: 'São Paulo / SP', deadline: '2026-12-01', notes: 'Evento',
  },
  items: [{
    key: '11111111-1111-4111-8111-111111111111::verde',
    productId: '11111111-1111-4111-8111-111111111111', slug: 'mochila', name: 'Mochila',
    sku: 'MO-42', imageUrl: 'https://cdn.example.test/mochila.webp', quantity: 100, minQuantity: 50,
    colorName: 'Verde', colorHex: '#00aa66',
  }],
};

function configureSiteDatabase() {
  vi.stubEnv('SITE_SUPABASE_URL', 'https://abcdefghijklmnopqrst.supabase.co');
  vi.stubEnv('SITE_SUPABASE_SECRET_KEY', `sb_secret_${'x'.repeat(40)}`);
  vi.stubEnv('SITE_REQUEST_HASH_SALT', 'salt-de-testes-com-mais-de-32-caracteres');
  vi.stubEnv('SITE_PUBLIC_ORIGIN', 'https://www.promobrindes.com.br');
}

describe('APIs de leads isoladas', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('registra contato normalizado pelo RPC server-side', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"requestId":"lead-42","duplicate":false}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();

    await contactHandler(request(contactPayload), response);

    expect(result.statusCode).toBe(201);
    expect(result.body).toEqual({ requestId: 'lead-42', duplicate: false });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://abcdefghijklmnopqrst.supabase.co/rest/v1/rpc/create_site_contact_request');
    expect(init.headers).toMatchObject({ apikey: expect.stringMatching(/^sb_secret_/) });
    const sent = JSON.parse(String(init.body));
    expect(sent.p_payload.contact.email).toBe('ana@empresa.com.br');
    expect(sent.p_request_meta.identifierHash).toMatch(/^[0-9a-f]{64}$/);
    expect(sent.p_request_meta).not.toHaveProperty('ip');
  });

  it('persiste orçamento e devolve 200 em repetição idempotente', async () => {
    configureSiteDatabase();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"requestId":"quote-42","duplicate":true}', { status: 200 })));
    const { result, response } = responseDouble();
    await quoteHandler(request(quotePayload, { headers: { 'content-type': 'application/json', 'idempotency-key': 'quote-request-123' } }), response);
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ requestId: 'quote-42', duplicate: true });
  });

  it('bloqueia qualquer tentativa de apontar gravações ao Supabase canônico', async () => {
    configureSiteDatabase();
    vi.stubEnv('SITE_SUPABASE_URL', 'https://doufsxqlfjyuvxuezpln.supabase.co');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await contactHandler(request(contactPayload), response);
    expect(result.statusCode).toBe(503);
    expect(result.body).toMatchObject({ error: 'unsafe_database_target' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('nunca envia a secret key para um host que não seja Supabase', async () => {
    configureSiteDatabase();
    vi.stubEnv('SITE_SUPABASE_URL', 'https://coletor-malicioso.example');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await contactHandler(request(contactPayload), response);
    expect(result.statusCode).toBe(503);
    expect(result.body).toMatchObject({ error: 'unsafe_database_target' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejeita origem não autorizada antes de acessar o banco', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await contactHandler(request(contactPayload, { headers: { 'content-type': 'application/json', origin: 'https://evil.example' } }), response);
    expect(result.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejeita chave de idempotência divergente', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await quoteHandler(request(quotePayload, { headers: { 'content-type': 'application/json', 'idempotency-key': 'outra-chave' } }), response);
    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({ error: 'idempotency_key_mismatch' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejeita quantidade abaixo do mínimo e payload excessivo', async () => {
    configureSiteDatabase();
    const invalidQuote = { ...quotePayload, items: [{ ...quotePayload.items[0], quantity: 10 }] };
    const first = responseDouble();
    await quoteHandler(request(invalidQuote), first.response);
    expect(first.result.statusCode).toBe(400);

    const second = responseDouble();
    await contactHandler(request(JSON.stringify({ ...contactPayload, noise: 'x'.repeat(70_000) })), second.response);
    expect(second.result.statusCode).toBe(413);
  });

  it('aceita exclusivamente POST com JSON', async () => {
    const getResponse = responseDouble();
    await contactHandler(request(undefined, { method: 'GET' }), getResponse.response);
    expect(getResponse.result.statusCode).toBe(405);
    expect(getResponse.result.headers.get('Allow')).toBe('POST');

    const formResponse = responseDouble();
    await contactHandler(request(contactPayload, { headers: { 'content-type': 'application/x-www-form-urlencoded' } }), formResponse.response);
    expect(formResponse.result.statusCode).toBe(415);
  });
});
