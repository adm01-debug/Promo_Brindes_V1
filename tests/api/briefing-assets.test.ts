import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/briefing-assets.js';
import { matchesDeclaredFileSignature, readSignaturePrefix } from '../../api/_lib/fileSignatures.js';
import type { ApiRequest, ApiResponse } from '../../api/_lib/leadHandler.js';

const assetId = '11111111-1111-4111-8111-111111111111';
const path = `22222222-2222-4222-8222-222222222222/${assetId}.png`;

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
    body: { assetId },
    ...overrides,
  };
}

function configure() {
  vi.stubEnv('SITE_PUBLIC_ORIGIN', 'https://promo-brindes-v1.vercel.app');
  vi.stubEnv('SITE_SUPABASE_URL', 'https://xlzmclcjdncjfdrjxclt.supabase.co');
  vi.stubEnv('SITE_SUPABASE_SECRET_KEY', `sb_secret_${'x'.repeat(40)}`);
  vi.stubEnv('SITE_REQUEST_HASH_SALT', 'salt-de-testes-com-mais-de-32-caracteres');
}

function candidate(mimeType = 'image/png') {
  return { id: assetId, bucket: 'customer-briefing-assets', path, mimeType, sizeBytes: 2048 };
}

describe('inspeção server-side de anexos privados', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('confirma um PNG somente depois de ler a assinatura no Storage privado', async () => {
    configure();
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(candidate()), { status: 200 }))
      .mockResolvedValueOnce(new Response(png, { status: 206 }))
      .mockResolvedValueOnce(new Response(JSON.stringify('2026-09-22T12:00:00.000Z'), { status: 200 }))
      .mockResolvedValueOnce(new Response(png, { status: 206 }));
    vi.stubGlobal('fetch', fetchMock);
    const current = responseDouble();
    await handler(request(), current.response);
    expect(current.result.statusCode).toBe(200);
    expect(current.result.body).toEqual({ verifiedAt: '2026-09-22T12:00:00.000Z' });
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/storage/v1/object/authenticated/customer-briefing-assets/');
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).toMatchObject({ Range: 'bytes=0-1023' });
    expect(JSON.parse(String((fetchMock.mock.calls[2]?.[1] as RequestInit).body))).toMatchObject({ p_id: assetId, p_storage_path: path });
    expect(fetchMock.mock.calls[3]?.[0]).toBe(fetchMock.mock.calls[1]?.[0]);
  });

  it('remove blob e reserva quando o conteúdo contradiz o MIME declarado', async () => {
    configure();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(candidate()), { status: 200 }))
      .mockResolvedValueOnce(new Response('<svg onload="alert(1)"></svg>', { status: 206 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('true', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const current = responseDouble();
    await handler(request(), current.response);
    expect(current.result.statusCode).toBe(422);
    expect(current.result.body).toMatchObject({ error: 'briefing_asset_signature_mismatch' });
    expect(fetchMock.mock.calls[2]?.[0]).toBe('https://xlzmclcjdncjfdrjxclt.supabase.co/storage/v1/object/customer-briefing-assets');
    expect((fetchMock.mock.calls[2]?.[1] as RequestInit).method).toBe('DELETE');
    expect(fetchMock.mock.calls[3]?.[0]).toContain('/rpc/delete_my_briefing_asset');
  });

  it('rejeita origem, sessão e ID inválidos antes de acessar o banco', async () => {
    configure();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    for (const invalid of [
      request({ headers: { origin: 'https://evil.test', authorization: `Bearer ${'a'.repeat(40)}`, 'content-type': 'application/json' } }),
      request({ headers: { origin: 'https://promo-brindes-v1.vercel.app', 'content-type': 'application/json' } }),
      request({ body: { assetId: '../objeto' } }),
    ]) {
      const current = responseDouble();
      await handler(invalid, current.response);
      expect(current.result.statusCode).toBeGreaterThanOrEqual(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('não confirma arquivo ausente nem caminho forjado retornado pelo backend', async () => {
    configure();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ...candidate(), path: '../forjado.png' }), { status: 200 })));
    const current = responseDouble();
    await handler(request(), current.response);
    expect(current.result.statusCode).toBe(404);
  });

  it('é idempotente e não relê o blob quando a inspeção já foi confirmada', async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      ...candidate(), verifiedAt: '2026-09-22T12:00:00.000Z',
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const current = responseDouble();
    await handler(request(), current.response);
    expect(current.result.statusCode).toBe(200);
    expect(current.result.body).toEqual({ verifiedAt: '2026-09-22T12:00:00.000Z' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('descarta uma substituição ocorrida entre a leitura e o bloqueio do objeto', async () => {
    configure();
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(candidate()), { status: 200 }))
      .mockResolvedValueOnce(new Response(png, { status: 206 }))
      .mockResolvedValueOnce(new Response(JSON.stringify('2026-09-22T12:00:00.000Z'), { status: 200 }))
      .mockResolvedValueOnce(new Response('<svg onload="alert(1)"></svg>', { status: 206 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('true', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const current = responseDouble();

    await handler(request(), current.response);

    expect(current.result.statusCode).toBe(422);
    expect(current.result.body).toMatchObject({ error: 'briefing_asset_signature_mismatch' });
    expect(fetchMock.mock.calls[4]?.[0]).toContain('/storage/v1/object/customer-briefing-assets');
    expect(fetchMock.mock.calls[5]?.[0]).toContain('/rpc/delete_my_briefing_asset');
  });
});

describe('assinaturas de arquivo', () => {
  it.each([
    ['image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['image/jpeg', new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
    ['image/webp', new TextEncoder().encode('RIFF0000WEBP')],
    ['application/pdf', new TextEncoder().encode('%PDF-1.7')],
    ['application/pdf', new TextEncoder().encode('%PDF-2.0')],
  ])('reconhece %s', (mimeType, bytes) => {
    expect(matchesDeclaredFileSignature(mimeType, bytes)).toBe(true);
  });

  it('rejeita polyglot iniciado por HTML mesmo que contenha marcador PDF no primeiro KiB', () => {
    const polyglot = new TextEncoder().encode('<script>alert(1)</script>\n%PDF-1.7');
    expect(matchesDeclaredFileSignature('application/pdf', polyglot)).toBe(false);
    expect(matchesDeclaredFileSignature('application/pdf', new TextEncoder().encode('%PDF-9.0'))).toBe(false);
  });

  it('limita a leitura a 1 KiB mesmo quando a resposta é maior', async () => {
    const bytes = await readSignaturePrefix(new Response(new Uint8Array(4096).fill(65)));
    expect(bytes).toHaveLength(1024);
  });
});
