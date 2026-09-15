import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import contactHandler from '../../api/contact-requests.js';
import quoteHandler from '../../api/quote-requests.js';
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
  contact: { name: 'Ana Silva', email: 'ANA@EMPRESA.COM.BR', phone: '(11) 99999-9999', message: 'Quero um kit para onboarding.', responseChannel: 'whatsapp' },
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
    variantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', colorName: 'Verde', colorHex: '#00aa66', decisionGroup: 'alternative',
  }],
  campaign: { source: 'finder', moment: 'onboarding', audience: 'colaboradores', scale: '51-200', mood: 'sustentavel' },
  briefing: { actionName: 'Boas-vindas 2026', budgetRange: '51-100', budgetScope: 'por-pessoa', responseChannel: 'whatsapp', brandAssetStatus: 'logo-pronto' },
  notificationPreferences: { emailCopy: true, whatsappCopy: true },
};

function configureSiteDatabase() {
  vi.stubEnv('SITE_SUPABASE_URL', 'https://xlzmclcjdncjfdrjxclt.supabase.co');
  vi.stubEnv('SITE_SUPABASE_SECRET_KEY', `sb_secret_${'x'.repeat(40)}`);
  vi.stubEnv('SITE_REQUEST_HASH_SALT', 'salt-de-testes-com-mais-de-32-caracteres');
  vi.stubEnv('SITE_PUBLIC_ORIGIN', 'https://www.promobrindes.com.br');
  vi.stubEnv('CATALOG_SUPABASE_PUBLISHABLE_KEY', `sb_publishable_${'x'.repeat(40)}`);
}

function catalogResponse() {
  const quoteItem = quotePayload.items[0];
  if (!quoteItem) throw new Error('Fixture de orçamento sem item.');
  return new Response(JSON.stringify([{
    id: quoteItem.productId,
    slug: quoteItem.slug,
    name: quoteItem.name,
    sku: quoteItem.sku,
    min_quantity: quoteItem.minQuantity,
    primary_image_url: 'https://catalogo-canonico.test/mochila-validada.webp',
    color_swatches: [{
      variant_id: quoteItem.variantId,
      color_name: quoteItem.colorName,
      color_hex: quoteItem.colorHex,
      image_url: 'https://catalogo-canonico.test/mochila-verde.webp',
    }],
  }]), { status: 200 });
}

function quoteFetchMock(rpcBody: string) {
  return vi.fn(async (url: string | URL, _init?: RequestInit) => String(url).includes('/v_site_products_public')
    ? catalogResponse()
    : new Response(rpcBody, { status: 200 }));
}

describe('APIs de leads isoladas', () => {
  // O contrato rejeita submissões com mais de sete dias. Congelar o relógio
  // mantém estes cenários determinísticos, sem enfraquecer a regra em produção.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
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
    expect(url).toBe('https://xlzmclcjdncjfdrjxclt.supabase.co/rest/v1/rpc/create_site_contact_request');
    expect(init.headers).toMatchObject({ apikey: expect.stringMatching(/^sb_secret_/) });
    const sent = JSON.parse(String(init.body));
    expect(sent.p_payload.contact.email).toBe('ana@empresa.com.br');
    expect(sent.p_payload.contact.message).toBe('Quero um kit para onboarding.');
    expect(sent.p_payload.contact.responseChannel).toBe('whatsapp');
    expect(sent.p_request_meta.identifierHash).toMatch(/^[0-9a-f]{64}$/);
    expect(sent.p_request_meta).not.toHaveProperty('ip');
  });

  it('persiste orçamento e devolve 200 em repetição idempotente', async () => {
    configureSiteDatabase();
    vi.stubGlobal('fetch', quoteFetchMock('{"requestId":"quote-42","duplicate":true}'));
    const { result, response } = responseDouble();
    await quoteHandler(request(quotePayload, { headers: { 'content-type': 'application/json', origin: 'https://www.promobrindes.com.br', 'idempotency-key': 'quote-request-123' } }), response);
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({
      requestId: 'quote-42', duplicate: true,
      confirmations: { email: 'pending', whatsapp: 'pending' },
    });
    const rpcCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.find(([url]) => String(url).includes('/create_site_quote_request'));
    const sent = JSON.parse(String(rpcCall?.[1]?.body));
    expect(sent.p_request_meta.campaign).toEqual(quotePayload.campaign);
    expect(sent.p_request_meta.briefing).toEqual(quotePayload.briefing);
    expect(sent.p_request_meta.notificationPreferences).toEqual({ emailCopy: true, whatsappCopy: true });
    expect(sent.p_request_meta).not.toHaveProperty('ip');
    expect(sent.p_payload.items[0].variantId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(sent.p_payload.items[0].decisionGroup).toBe('alternative');
    expect(sent.p_payload.items[0].imageUrl).toBe('https://catalogo-canonico.test/mochila-verde.webp');
  });

  it('mantém no briefing produto publicado com mínimo ainda não confirmado', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => String(url).includes('/v_site_products_public')
      ? new Response(JSON.stringify([{ ...JSON.parse(await catalogResponse().text())[0], min_quantity: null }]), { status: 200 })
      : new Response('{"requestId":"quote-minimum-pending","duplicate":false}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();

    await quoteHandler(request(quotePayload), response);

    expect(result.statusCode).toBe(201);
    const rpcCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/create_site_quote_request'));
    expect(JSON.parse(String(rpcCall?.[1]?.body)).p_payload.items[0].minQuantity).toBe(1);
  });

  it('recusa variante que não pertence ao produto publicado', async () => {
    configureSiteDatabase();
    const fetchMock = quoteFetchMock('{"requestId":"should-not-write","duplicate":false}');
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    const forgedVariant = {
      ...quotePayload,
      items: [{ ...quotePayload.items[0], variantId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }],
    };

    await quoteHandler(request(forgedVariant), response);

    expect(result.statusCode).toBe(422);
    expect(result.body).toMatchObject({ error: 'catalog_variant_unavailable' });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/create_site_quote_request'))).toBe(false);
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

  it('recusa um projeto Supabase diferente do destino isolado aprovado', async () => {
    configureSiteDatabase();
    vi.stubEnv('SITE_SUPABASE_URL', 'https://zyxwvutsrqponmlkjihg.supabase.co');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await contactHandler(request(contactPayload), response);
    expect(result.statusCode).toBe(503);
    expect(result.body).toMatchObject({ error: 'unsafe_database_target' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('prioriza o IP assinado pela Vercel para o bucket de rate limit', async () => {
    configureSiteDatabase();
    const fetchMock = quoteFetchMock('{"requestId":"quote-42","duplicate":false}');
    vi.stubGlobal('fetch', fetchMock);
    const { response } = responseDouble();
    await quoteHandler(request(quotePayload, { headers: {
      'content-type': 'application/json',
      origin: 'https://www.promobrindes.com.br',
      'x-forwarded-for': '198.51.100.99',
      'x-vercel-forwarded-for': '203.0.113.42',
    } }), response);
    const rpcCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/create_site_quote_request'));
    expect(JSON.parse(String(rpcCall?.[1]?.body)).p_request_meta.identifierHash).toMatch(/^[0-9a-f]{64}$/);
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

  it('exige Origin igual ao domínio público configurado', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await contactHandler(request(contactPayload, { headers: { 'content-type': 'application/json' } }), response);
    expect(result.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejeita chave de idempotência divergente', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await quoteHandler(request(quotePayload, { headers: { 'content-type': 'application/json', origin: 'https://www.promobrindes.com.br', 'idempotency-key': 'outra-chave' } }), response);
    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({ error: 'idempotency_key_mismatch' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aceita o instante exatamente no limite retroativo permitido', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"requestId":"lead-boundary","duplicate":false}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    const submittedAt = '2026-09-01T12:00:00.000Z';

    await contactHandler(request({
      ...contactPayload,
      submittedAt,
      consent: { ...contactPayload.consent, acceptedAt: submittedAt },
    }), response);

    expect(result.statusCode).toBe(201);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejeita instante anterior ao limite retroativo antes de acessar o banco', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    const submittedAt = '2026-09-01T11:59:59.999Z';

    await contactHandler(request({
      ...contactPayload,
      submittedAt,
      consent: { ...contactPayload.consent, acceptedAt: submittedAt },
    }), response);

    expect(result.statusCode).toBe(400);
    expect(result.body).toMatchObject({ error: 'invalid_request' });
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

  it('rejeita prazo, URL e imagem hostis antes de consultar banco algum', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const invalidDeadline = { ...quotePayload, contact: { ...quotePayload.contact, deadline: 'not-a-date' } };
    const first = responseDouble();
    await quoteHandler(request(invalidDeadline), first.response);
    expect(first.result.statusCode).toBe(400);

    const invalidImage = { ...quotePayload, items: [{ ...quotePayload.items[0], imageUrl: 'javascript:alert(1)' }] };
    const second = responseDouble();
    await quoteHandler(request(invalidImage), second.response);
    expect(second.result.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejeita contexto opcional adulterado antes de consultar o banco', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const invalidCampaign = { ...quotePayload, campaign: { source: 'finder', mood: 'nao-existe' } };
    const result = responseDouble();
    await quoteHandler(request(invalidCampaign), result.response);
    expect(result.result.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exige escopo para uma faixa de investimento numérica antes de consultar o banco', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = responseDouble();
    const inconsistentBriefing = {
      ...quotePayload,
      briefing: { ...quotePayload.briefing, budgetScope: undefined },
    };

    await quoteHandler(request(inconsistentBriefing), result.response);

    expect(result.result.statusCode).toBe(400);
    expect(result.result.body).toMatchObject({ error: 'invalid_request' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejeita recebimento posterior ao evento antes de consultar o banco', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = responseDouble();
    const inconsistentDates = {
      ...quotePayload,
      contact: { ...quotePayload.contact, deadline: '2026-12-12' },
      briefing: { ...quotePayload.briefing, eventDate: '2026-12-10' },
    };

    await quoteHandler(request(inconsistentDates), result.response);

    expect(result.result.statusCode).toBe(400);
    expect(result.result.body).toMatchObject({ error: 'invalid_request' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('usa o calendário de São Paulo na virada do dia do servidor', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-13T01:30:00.000Z'));
    configureSiteDatabase();
    const now = new Date().toISOString();
    const payload = {
      ...quotePayload,
      submittedAt: now,
      consent: { ...quotePayload.consent, acceptedAt: now },
      contact: { ...quotePayload.contact, deadline: '2026-09-12' },
    };
    const fetchMock = quoteFetchMock('{"requestId":"quote-calendar","duplicate":false}');
    vi.stubGlobal('fetch', fetchMock);
    const result = responseDouble();

    await quoteHandler(request(payload), result.response);

    expect(result.result.statusCode).toBe(201);
  });

  it('rejeita prioridade de item fora das duas opções comerciais', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = responseDouble();
    await quoteHandler(request({ ...quotePayload, items: [{ ...quotePayload.items[0], decisionGroup: 'preferido' }] }), result.response);
    expect(result.result.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('não aceita preferência de notificação forjada', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = responseDouble();
    await quoteHandler(request({
      ...quotePayload,
      notificationPreferences: { emailCopy: false, whatsappCopy: 'sim' },
    }), result.response);
    expect(result.result.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aceita exclusivamente POST com JSON', async () => {
    const getResponse = responseDouble();
    await contactHandler(request(undefined, { method: 'GET' }), getResponse.response);
    expect(getResponse.result.statusCode).toBe(405);
    expect(getResponse.result.headers.get('Allow')).toBe('POST');

    const formResponse = responseDouble();
    await contactHandler(request(contactPayload, { headers: { 'content-type': 'application/x-www-form-urlencoded' } }), formResponse.response);
    expect(formResponse.result.statusCode).toBe(415);

    const spoofedJsonResponse = responseDouble();
    await contactHandler(request(contactPayload, { headers: { 'content-type': 'application/json-evil', origin: 'https://www.promobrindes.com.br' } }), spoofedJsonResponse.response);
    expect(spoofedJsonResponse.result.statusCode).toBe(415);
  });

  it('rejeita JSON malformado em texto, buffer ou corpo não serializável', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    for (const body of ['{', Buffer.from('{')]) {
      const malformedResponse = responseDouble();
      await contactHandler(request(body), malformedResponse.response);
      expect(malformedResponse.result.statusCode).toBe(400);
      expect(malformedResponse.result.body).toMatchObject({ error: 'invalid_request' });
    }

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const circularResponse = responseDouble();
    await contactHandler(request(circular), circularResponse.response);
    expect(circularResponse.result.statusCode).toBe(400);
    expect(circularResponse.result.body).toMatchObject({ error: 'invalid_request' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('converte falha do getter de body da plataforma em resposta 400', async () => {
    configureSiteDatabase();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const platformRequest = request(undefined);
    Object.defineProperty(platformRequest, 'body', {
      get() { throw new SyntaxError('Unexpected end of JSON input'); },
    });
    const { result, response } = responseDouble();

    await contactHandler(platformRequest, response);

    expect(result.statusCode).toBe(400);
    expect(result.body).toMatchObject({ error: 'invalid_request' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('registra um 500 inesperado com correlação e sem dados pessoais', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, response } = responseDouble();
    const headers = new Proxy({}, {
      get() { throw new TypeError('falha com ana@empresa.com.br'); },
    }) as ApiRequest['headers'];

    await contactHandler(request(contactPayload, { headers }), response);

    expect(result.statusCode).toBe(500);
    const correlationId = result.headers.get('X-Request-Id');
    expect(correlationId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(errorSpy).toHaveBeenCalledWith('site_lead_request_failed', {
      kind: 'contact', correlationId, errorClass: 'TypeError',
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('ana@empresa.com.br');
  });
});
