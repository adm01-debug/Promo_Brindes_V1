// Etapa 30 (R07): webhook de entrega/devolução do Resend.
//
// Este arquivo usa o estilo Request/Response (Web API) da Vercel, diferente
// dos outros endpoints em api/ (estilo clássico (request, response), com
// request.body já parseado). Verificação de assinatura HMAC exige os bytes
// BRUTOS do corpo — reserializar request.body não reproduz o que o provedor
// assinou. Os helpers clássicos só podem ser desligados via NODEJS_HELPERS=0,
// uma env var de projeto inteiro (quebraria os outros 10 endpoints), então
// não é uma opção viável para isolar só este arquivo. `request.text()` no
// estilo Web API dá os bytes brutos garantidos, sem afetar o resto do
// diretório.

import { verifySvixSignature } from './_lib/webhookSignature.js';
import { callSiteRpc, parseProviderEventApplyResponse } from './_lib/siteDatabase.js';

export const REQUEST_TIMEOUT_MS = 10_000;
export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

type ResendEventType = 'delivered' | 'bounced' | 'complained';

const EVENT_TYPE_MAP: Record<string, ResendEventType> = {
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
};

interface ResendWebhookPayload {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    bounce?: { type?: string };
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });

    const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
    if (!secret) return json(503, { error: 'webhook_not_configured' });

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BODY_BYTES) {
      return json(413, { error: 'payload_too_large' });
    }
    const svixId = request.headers.get('svix-id') || '';
    const svixTimestamp = request.headers.get('svix-timestamp') || '';
    const svixSignature = request.headers.get('svix-signature') || '';

    if (!verifySvixSignature({ id: svixId, timestamp: svixTimestamp, signatureHeader: svixSignature, rawBody, secret })) {
      return json(401, { error: 'invalid_signature' });
    }

    let payload: ResendWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as ResendWebhookPayload;
    } catch {
      return json(400, { error: 'invalid_json' });
    }

    const eventType = EVENT_TYPE_MAP[payload.type || ''];
    const emailId = payload.data?.email_id;
    // O Resend envia tipos que não acompanhamos (email.sent, email.opened,
    // email.clicked, email.delivery_delayed, ...) — não é erro, só não há
    // ação a tomar. Responder 200 evita reentregas desnecessárias.
    if (!eventType || !emailId) {
      console.info('site_notification_event_ignored', { provider: 'resend', type: payload.type || null });
      return json(200, { ok: true, applied: false });
    }
    let occurredAt = new Date().toISOString();
    if (payload.created_at !== undefined) {
      const parsed = new Date(payload.created_at);
      if (Number.isNaN(parsed.getTime())) return json(400, { error: 'invalid_event_timestamp' });
      occurredAt = parsed.toISOString();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const rawResult = await callSiteRpc<unknown>('apply_site_notification_provider_event', {
        p_provider: 'resend',
        p_provider_message_id: emailId,
        p_event_type: eventType,
        p_provider_event_id: svixId,
        p_occurred_at: occurredAt,
        p_bounce_reason: eventType === 'bounced' ? ((payload.data?.bounce?.type || '').slice(0, 200) || null) : null,
      }, controller.signal);
      const result = parseProviderEventApplyResponse(rawResult);
      console.info('site_notification_event_applied', { provider: 'resend', eventType, applied: result.applied, reason: result.reason });
      return json(200, { ok: true, applied: result.applied });
    } catch (error) {
      // Ao contrário do padrão best-effort da Etapa 29 (onde havia trabalho
      // já concluído a proteger), aqui persistir o evento É o trabalho — um
      // 500 propositalmente aciona a reentrega em backoff do Svix.
      console.error('site_notification_event_failed', { provider: 'resend', eventType, error: error instanceof Error ? error.message : 'unknown' });
      return json(500, { error: 'apply_failed' });
    } finally {
      clearTimeout(timeout);
    }
  },
};
