import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import handler from '../../api/notification-events-resend.js';

const SECRET = `whsec_${Buffer.from('resend-webhook-test-secret-0001').toString('base64')}`;
const DELIVERY_ID = 'a2d52926-96ef-4d72-a5e6-da3d8daed7b4';

function configureEnv() {
  vi.stubEnv('SITE_SUPABASE_URL', 'https://xlzmclcjdncjfdrjxclt.supabase.co');
  vi.stubEnv('SITE_SUPABASE_SECRET_KEY', `sb_secret_${'x'.repeat(40)}`);
  vi.stubEnv('SITE_REQUEST_HASH_SALT', 'salt-de-testes-com-mais-de-32-caracteres');
  vi.stubEnv('RESEND_WEBHOOK_SECRET', SECRET);
}

function signedRequest(payload: unknown, overrides: { id?: string; timestamp?: string; signature?: string; rawBody?: string } = {}): Request {
  const rawBody = overrides.rawBody ?? JSON.stringify(payload);
  const id = overrides.id ?? 'msg_test_1';
  const timestamp = overrides.timestamp ?? String(Math.floor(Date.now() / 1000));
  const signature = overrides.signature ?? (() => {
    const key = Buffer.from(SECRET.slice('whsec_'.length), 'base64');
    const digest = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64');
    return `v1,${digest}`;
  })();
  return new Request('https://example.test/api/notification-events-resend', {
    method: 'POST',
    headers: { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': signature, 'content-type': 'application/json' },
    body: rawBody,
  });
}

describe('api/notification-events-resend (Etapa 30)', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('rejeita método diferente de POST', async () => {
    configureEnv();
    const response = await handler.fetch(new Request('https://example.test/api/notification-events-resend', { method: 'GET' }));
    expect(response.status).toBe(405);
  });

  it('responde 503 quando o segredo do webhook não está configurado', async () => {
    vi.stubEnv('RESEND_WEBHOOK_SECRET', '');
    const response = await handler.fetch(signedRequest({ type: 'email.delivered', data: { email_id: 'em_1' } }));
    expect(response.status).toBe(503);
  });

  it('rejeita assinatura ausente ou inválida sem chamar o banco', async () => {
    configureEnv();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await handler.fetch(signedRequest({ type: 'email.delivered', data: { email_id: 'em_1' } }, { signature: 'v1,invalido' }));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejeita timestamp fora da tolerância de replay', async () => {
    configureEnv();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 600);
    const response = await handler.fetch(signedRequest({ type: 'email.delivered', data: { email_id: 'em_1' } }, { timestamp: staleTimestamp }));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignora tipos de evento fora de interesse sem chamar o banco', async () => {
    configureEnv();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await handler.fetch(signedRequest({ type: 'email.sent', data: { email_id: 'em_1' } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, applied: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['email.delivered', 'delivered'],
    ['email.complained', 'complained'],
  ])('%s assinado corretamente chama a RPC com o evento mapeado', async (type, eventType) => {
    configureEnv();
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.p_provider).toBe('resend');
      expect(body.p_provider_message_id).toBe('em_42');
      expect(body.p_event_type).toBe(eventType);
      return new Response(JSON.stringify({ applied: true, deliveryId: DELIVERY_ID, reason: null }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = await handler.fetch(signedRequest({ type, data: { email_id: 'em_42' } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, applied: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('email.bounced extrai bounce.type como bounce_reason', async () => {
    configureEnv();
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.p_event_type).toBe('bounced');
      expect(body.p_bounce_reason).toBe('HardBounce');
      return new Response(JSON.stringify({ applied: true, deliveryId: DELIVERY_ID, reason: null }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = await handler.fetch(signedRequest({ type: 'email.bounced', data: { email_id: 'em_42', bounce: { type: 'HardBounce' } } }));
    expect(response.status).toBe(200);
  });

  it('responde 200 mesmo quando a RPC reporta duplicata ou entrega desconhecida', async () => {
    configureEnv();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ applied: false, deliveryId: null, reason: 'delivery_not_found' }), { status: 200 })));
    const response = await handler.fetch(signedRequest({ type: 'email.delivered', data: { email_id: 'em_desconhecido' } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, applied: false });
  });

  it('responde 500 quando a chamada ao banco falha, para o Svix reentregar', async () => {
    configureEnv();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    const response = await handler.fetch(signedRequest({ type: 'email.delivered', data: { email_id: 'em_42' } }));
    expect(response.status).toBe(500);
  });

  it('solicita reentrega quando a RPC retorna um protocolo 200 malformado', async () => {
    configureEnv();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ applied: 'true', deliveryId: null, reason: null }), { status: 200 })));
    const response = await handler.fetch(signedRequest({ type: 'email.delivered', data: { email_id: 'em_42' } }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'apply_failed' });
  });

  it('recusa timestamp de evento inválido sem chamar o banco', async () => {
    configureEnv();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await handler.fetch(signedRequest({
      type: 'email.delivered', created_at: 'não-é-data', data: { email_id: 'em_42' },
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_event_timestamp' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('recusa corpo acima de 256 KiB antes de verificar assinatura', async () => {
    configureEnv();
    const rawBody = JSON.stringify({ padding: 'x'.repeat(256 * 1024) });
    const response = await handler.fetch(signedRequest({}, { rawBody, signature: 'inválida' }));
    expect(response.status).toBe(413);
  });
});
