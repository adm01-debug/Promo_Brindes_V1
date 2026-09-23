import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import handler from '../../api/notification-events-whatsapp.js';

const APP_SECRET = 'whatsapp-webhook-test-app-secret';
const VERIFY_TOKEN = 'verify-token-de-testes-0001';
const DELIVERY_ID = 'a2d52926-96ef-4d72-a5e6-da3d8daed7b4';

function configureEnv() {
  vi.stubEnv('SITE_SUPABASE_URL', 'https://xlzmclcjdncjfdrjxclt.supabase.co');
  vi.stubEnv('SITE_SUPABASE_SECRET_KEY', `sb_secret_${'x'.repeat(40)}`);
  vi.stubEnv('SITE_REQUEST_HASH_SALT', 'salt-de-testes-com-mais-de-32-caracteres');
  vi.stubEnv('WHATSAPP_APP_SECRET', APP_SECRET);
  vi.stubEnv('WHATSAPP_WEBHOOK_VERIFY_TOKEN', VERIFY_TOKEN);
}

function signedPostRequest(payload: unknown, overrides: { rawBody?: string; signature?: string } = {}): Request {
  const rawBody = overrides.rawBody ?? JSON.stringify(payload);
  const signature = overrides.signature ?? `sha256=${createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')}`;
  return new Request('https://example.test/api/notification-events-whatsapp', {
    method: 'POST',
    headers: { 'x-hub-signature-256': signature, 'content-type': 'application/json' },
    body: rawBody,
  });
}

function statusPayload(statuses: Array<Record<string, unknown>>): unknown {
  return { entry: [{ changes: [{ value: { statuses } }] }] };
}

describe('api/notification-events-whatsapp (Etapa 30)', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('rejeita método diferente de GET/POST', async () => {
    configureEnv();
    const response = await handler.fetch(new Request('https://example.test/api/notification-events-whatsapp', { method: 'DELETE' }));
    expect(response.status).toBe(405);
  });

  describe('handshake GET', () => {
    it('responde 503 quando o token de verificação não está configurado', async () => {
      vi.stubEnv('WHATSAPP_WEBHOOK_VERIFY_TOKEN', '');
      const url = `https://example.test/api/notification-events-whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=abc123`;
      const response = await handler.fetch(new Request(url));
      expect(response.status).toBe(503);
    });

    it('ecoa hub.challenge quando o token e o modo estão corretos', async () => {
      configureEnv();
      const url = `https://example.test/api/notification-events-whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=abc123`;
      const response = await handler.fetch(new Request(url));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('abc123');
    });

    it('rejeita token incorreto', async () => {
      configureEnv();
      const url = 'https://example.test/api/notification-events-whatsapp?hub.mode=subscribe&hub.verify_token=token-errado&hub.challenge=abc123';
      const response = await handler.fetch(new Request(url));
      expect(response.status).toBe(403);
    });

    it('rejeita hub.mode diferente de subscribe', async () => {
      configureEnv();
      const url = `https://example.test/api/notification-events-whatsapp?hub.mode=unsubscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=abc123`;
      const response = await handler.fetch(new Request(url));
      expect(response.status).toBe(403);
    });
  });

  describe('POST', () => {
    it('responde 503 quando o app secret não está configurado', async () => {
      vi.stubEnv('WHATSAPP_APP_SECRET', '');
      const response = await handler.fetch(signedPostRequest(statusPayload([{ id: 'wamid.1', status: 'delivered', timestamp: '1700000000' }])));
      expect(response.status).toBe(503);
    });

    it('rejeita assinatura ausente ou inválida sem chamar o banco', async () => {
      configureEnv();
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const response = await handler.fetch(signedPostRequest(statusPayload([{ id: 'wamid.1', status: 'delivered' }]), { signature: 'sha256=invalido'.padEnd(71, '0') }));
      expect(response.status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('chama a RPC apenas para status delivered/failed, ignorando sent/read', async () => {
      configureEnv();
      const calls: Array<Record<string, unknown>> = [];
      const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        calls.push(body);
        return new Response(JSON.stringify({ applied: true, deliveryId: DELIVERY_ID, reason: null }), { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const response = await handler.fetch(signedPostRequest(statusPayload([
        { id: 'wamid.1', status: 'sent', timestamp: '1700000000' },
        { id: 'wamid.1', status: 'delivered', timestamp: '1700000001' },
        { id: 'wamid.2', status: 'read', timestamp: '1700000002' },
        { id: 'wamid.3', status: 'failed', timestamp: '1700000003', errors: [{ title: 'Recipient opted out' }] },
      ])));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const delivered = calls.find((c) => c.p_provider_message_id === 'wamid.1');
      expect(delivered).toMatchObject({ p_provider: 'meta-whatsapp-cloud', p_event_type: 'delivered', p_provider_event_id: 'wamid.1:delivered' });

      const bounced = calls.find((c) => c.p_provider_message_id === 'wamid.3');
      expect(bounced).toMatchObject({ p_event_type: 'bounced', p_provider_event_id: 'wamid.3:failed', p_bounce_reason: 'Recipient opted out' });
    });

    it('solicita reentrega quando qualquer evento assinado não pôde ser persistido', async () => {
      configureEnv();
      const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        if (body.p_provider_message_id === 'wamid.fails') {
          return new Response('{}', { status: 500 });
        }
        return new Response(JSON.stringify({ applied: true, deliveryId: DELIVERY_ID, reason: null }), { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await handler.fetch(signedPostRequest(statusPayload([
        { id: 'wamid.fails', status: 'delivered', timestamp: '1700000000' },
        { id: 'wamid.ok', status: 'delivered', timestamp: '1700000001' },
      ])));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'apply_failed' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('site_notification_event_failed', expect.objectContaining({ provider: 'meta-whatsapp-cloud' }));
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('solicita reentrega quando a RPC retorna um protocolo 200 malformado', async () => {
      configureEnv();
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ applied: true, deliveryId: null, reason: null }), { status: 200 })));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const response = await handler.fetch(signedPostRequest(statusPayload([
        { id: 'wamid.bad-contract', status: 'delivered', timestamp: '1700000000' },
      ])));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'apply_failed' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('site_notification_event_failed', expect.objectContaining({ provider: 'meta-whatsapp-cloud' }));
    });

    it('rejeita JSON inválido depois de validar a assinatura', async () => {
      configureEnv();
      const rawBody = '{invalido';
      const signature = `sha256=${createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')}`;
      const response = await handler.fetch(new Request('https://example.test/api/notification-events-whatsapp', {
        method: 'POST',
        headers: { 'x-hub-signature-256': signature, 'content-type': 'application/json' },
        body: rawBody,
      }));
      expect(response.status).toBe(400);
    });

    it('ignora timestamp numérico fora do intervalo sem lançar RangeError nem chamar o banco', async () => {
      configureEnv();
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const response = await handler.fetch(signedPostRequest(statusPayload([
        { id: 'wamid.out-of-range', status: 'delivered', timestamp: '9999999999999' },
      ])));
      expect(response.status).toBe(200);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('recusa lotes com mais de cem status sem iniciar chamadas ao banco', async () => {
      configureEnv();
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const response = await handler.fetch(signedPostRequest(statusPayload(
        Array.from({ length: 101 }, (_, index) => ({ id: `wamid.${index}`, status: 'delivered' })),
      )));
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ error: 'too_many_events' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('recusa corpo acima de 256 KiB antes de verificar assinatura ou parsear JSON', async () => {
      configureEnv();
      const rawBody = JSON.stringify({ padding: 'x'.repeat(256 * 1024) });
      const response = await handler.fetch(signedPostRequest({}, { rawBody, signature: 'inválida' }));
      expect(response.status).toBe(413);
    });
  });
});
