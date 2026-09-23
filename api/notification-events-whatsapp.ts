// Etapa 30 (R07): webhook de entrega/devolução da Meta (WhatsApp Cloud API).
//
// Mesmo racional de api/notification-events-resend.ts para o estilo
// Request/Response (Web API): verificação de assinatura exige os bytes
// BRUTOS do corpo, e os helpers clássicos só desligam por env var de
// projeto inteiro. Ver o comentário completo naquele arquivo.

import { timingSafeEqual } from 'node:crypto';
import { verifyMetaSignature } from './_lib/webhookSignature.js';
import { callSiteRpc, parseProviderEventApplyResponse } from './_lib/siteDatabase.js';

export const REQUEST_TIMEOUT_MS = 10_000;
export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;
export const MAX_STATUSES_PER_WEBHOOK = 100;

type WhatsAppEventType = 'delivered' | 'bounced';

interface WhatsAppStatus {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: Array<{ title?: string }>;
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: { statuses?: WhatsAppStatus[] };
    }>;
  }>;
}

function json(status: number, body: unknown, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extraHeaders } });
}

function timingSafeStringEqual(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function eventTypeFor(status: string): WhatsAppEventType | null {
  if (status === 'delivered') return 'delivered';
  // 'failed' pós-aceite (número não está no WhatsApp, opt-out, etc.) é
  // conceitualmente uma devolução — diferente do nosso status='failed'
  // interno, que é rejeição síncrona no momento do envio.
  if (status === 'failed') return 'bounced';
  // 'sent' já é capturado por record_site_notification_provider_acceptance;
  // 'read' está fora do escopo desta etapa (aceite → entrega → devolução).
  return null;
}

function handleVerification(request: Request): Response {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!verifyToken) return json(503, { error: 'webhook_not_configured' });

  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode') || '';
  const token = url.searchParams.get('hub.verify_token') || '';
  const challenge = url.searchParams.get('hub.challenge') || '';

  if (mode !== 'subscribe' || !challenge || !timingSafeStringEqual(verifyToken, token)) {
    return json(403, { error: 'verification_failed' });
  }
  return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

async function applyStatus(status: WhatsAppStatus): Promise<'ignored' | 'applied' | 'failed'> {
  const eventType = status.status ? eventTypeFor(status.status) : null;
  if (!eventType || !status.id) return 'ignored';

  let occurredAt = new Date().toISOString();
  if (status.timestamp !== undefined) {
    if (!/^\d{1,12}$/.test(status.timestamp)) return 'ignored';
    const milliseconds = Number(status.timestamp) * 1000;
    const parsed = new Date(milliseconds);
    if (!Number.isFinite(milliseconds) || Number.isNaN(parsed.getTime())) return 'ignored';
    occurredAt = parsed.toISOString();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const rawResult = await callSiteRpc<unknown>('apply_site_notification_provider_event', {
      p_provider: 'meta-whatsapp-cloud',
      p_provider_message_id: status.id,
      p_event_type: eventType,
      p_provider_event_id: `${status.id}:${status.status}`,
      p_occurred_at: occurredAt,
      p_bounce_reason: eventType === 'bounced' ? ((status.errors?.[0]?.title || '').slice(0, 200) || null) : null,
    }, controller.signal);
    const result = parseProviderEventApplyResponse(rawResult);
    console.info('site_notification_event_applied', { provider: 'meta-whatsapp-cloud', eventType, applied: result.applied, reason: result.reason });
    return 'applied';
  } catch (error) {
    // Persistir o evento é o trabalho deste endpoint. Não escondemos uma
    // falha do banco atrás de 200: provedores de webhook podem reentregar o
    // evento, e a deduplicação no banco torna a reentrega segura.
    console.error('site_notification_event_failed', { provider: 'meta-whatsapp-cloud', eventType, error: error instanceof Error ? error.message : 'unknown' });
    return 'failed';
  } finally {
    clearTimeout(timeout);
  }
}

async function handlePost(request: Request): Promise<Response> {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret) return json(503, { error: 'webhook_not_configured' });

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BODY_BYTES) {
    return json(413, { error: 'payload_too_large' });
  }
  const signatureHeader = request.headers.get('x-hub-signature-256') || '';
  if (!verifyMetaSignature({ rawBody, signatureHeader, appSecret })) {
    return json(401, { error: 'invalid_signature' });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const statuses = (payload.entry || [])
    .flatMap((entry) => entry.changes || [])
    .flatMap((change) => change.value?.statuses || []);
  if (statuses.length > MAX_STATUSES_PER_WEBHOOK) return json(413, { error: 'too_many_events' });

  const outcomes = await Promise.all(statuses.map((status) => applyStatus(status)));
  if (outcomes.includes('failed')) return json(500, { error: 'apply_failed' });

  return json(200, { ok: true });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'GET') return handleVerification(request);
    if (request.method === 'POST') return handlePost(request);
    return json(405, { error: 'method_not_allowed' });
  },
};
