import { getSiteDatabaseConfig } from './siteDatabase.js';
import { errorClass, logServerError, logServerWarning } from './observability.js';

/**
 * Alerta comercial (PF-01): quando um lead submete orçamento, o time vende
 * precisa ser notificado. O job comercial enfileirado pelo banco
 * (audience 'commercial_team') é entregue aqui, direto ou pelo cron
 * /api/commercial-alerts, sempre por webhook HTTPS — nunca por e-mail interno
 * (os provedores de transação só enviam para o cliente).
 *
 * Orçamento de uma tentativa síncrona, com folga sobre o maxDuration de 15s
 * da rota (vercel.json). Exportado para o gate de CI
 * tests/api/maxDuration.test.ts.
 */
export const COMMERCIAL_ALERT_TIMEOUT_MS = 7_000;

/** Alerta comercial real só em produção; preview/dev não notificam o time.
 * Mesmo critério do guard de preview das confirmações (api/notifications.ts
 * configuredChannels). Sem esta trava, um deploy preview reivindicaria job e
 * dispararia webhook comercial real com payload de teste. Avaliada em runtime
 * (RPC/entrega) para ler o env do momento. */
export function commercialAlertsEnabled(): boolean {
  return process.env.VERCEL_ENV !== 'preview' && Boolean(process.env.COMMERCIAL_TEAM_WEBHOOK_URL?.trim());
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CommercialAlertJob {
  id: string;
  leaseToken: string;
  existingProvider: string | null;
  existingProviderMessageId: string | null;
  requestId: string;
  attempt: number;
  protocol: string;
  recipientEmail: string;
  recipientPhone: string;
  contactName: string;
  company: string;
  submittedAt: string;
  items: Array<{ name: string; sku: string; quantity: number; colorName: string | null }>;
}

function safeText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';
}

/** O payload reivindicado vem do banco e é JSON não confiável em runtime;
 * valida a forma mínima antes de usar, no mesmo espírito do parseJobs das
 * confirmações (api/notifications.ts). */
export function parseCommercialAlertJob(value: unknown): CommercialAlertJob | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const job = value as Record<string, unknown>;
  if (!UUID_PATTERN.test(String(job.id)) || !UUID_PATTERN.test(String(job.leaseToken))
    || !UUID_PATTERN.test(String(job.requestId))
    || !Number.isInteger(job.attempt) || Number(job.attempt) < 1 || Number(job.attempt) > 5) {
    return null;
  }
  const items: Array<{ name: string; sku: string; quantity: number; colorName: string | null }> = [];
  if (Array.isArray(job.items)) {
    for (const rawItem of job.items.slice(0, 50)) {
      if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) return null;
      const item = rawItem as Record<string, unknown>;
      if (!Number.isInteger(item.quantity) || Number(item.quantity) < 1) return null;
      items.push({
        name: safeText(item.name, 240),
        sku: safeText(item.sku, 120),
        quantity: Number(item.quantity),
        colorName: safeText(item.colorName, 120) || null,
      });
    }
  }
  return {
    id: String(job.id),
    leaseToken: String(job.leaseToken),
    existingProvider: safeText(job.existingProvider, 80) || null,
    existingProviderMessageId: safeText(job.existingProviderMessageId, 240) || null,
    requestId: String(job.requestId),
    attempt: Number(job.attempt),
    protocol: safeText(job.protocol, 40),
    recipientEmail: safeText(job.recipientEmail, 160).toLowerCase(),
    recipientPhone: safeText(job.recipientPhone, 24),
    contactName: safeText(job.contactName, 100),
    company: safeText(job.company, 150),
    submittedAt: safeText(job.submittedAt, 50),
    items,
  };
}

async function rpc<T>(name: string, body: Record<string, unknown>, signal: AbortSignal): Promise<T> {
  const config = getSiteDatabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: config.serviceCredential, Authorization: `Bearer ${config.serviceCredential}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new Error(`commercial_alert_${name}_failed`);
  return response.json() as Promise<T>;
}

function parseBooleanRpc(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`commercial_alert_invalid_${name}_response`);
  return value;
}

/** Persiste o aceite do webhook assim que ele responde (R01): se a
 * finalização falhar em seguida, a próxima tentativa vê
 * existingProvider/existingProviderMessageId e apenas finaliza, sem
 * reenviar. Evita duplicar o alerta quando a rede oscila. */
async function recordProviderAcceptance(job: CommercialAlertJob, delivery: { provider: string; id: string }, signal: AbortSignal): Promise<void> {
  try {
    const accepted = parseBooleanRpc(await rpc<unknown>('record_site_notification_provider_acceptance', {
      p_delivery_id: job.id, p_lease_token: job.leaseToken, p_provider: delivery.provider, p_provider_message_id: delivery.id,
    }, signal), 'record_site_notification_provider_acceptance');
    if (!accepted) {
      logServerWarning('commercial_alert_provider_acceptance_unconfirmed', { requestId: job.requestId, errorClass: 'lease_not_confirmed' });
    }
  } catch (error) {
    logServerWarning('commercial_alert_provider_acceptance_unconfirmed', { requestId: job.requestId, errorClass: errorClass(error) });
  }
}

async function finalize(job: CommercialAlertJob, status: 'sent' | 'failed', signal: AbortSignal, delivery?: { provider: string; id: string }, errorCode?: string): Promise<boolean> {
  try {
    const result = await rpc<unknown>('finalize_site_notification_delivery', {
      p_delivery_id: job.id,
      p_lease_token: job.leaseToken,
      p_status: status,
      p_provider: delivery?.provider || null,
      p_provider_message_id: delivery?.id || null,
      p_error_code: errorCode?.slice(0, 120) || null,
    }, signal);
    return parseBooleanRpc(result, 'finalize_site_notification_delivery');
  } catch {
    return false;
  }
}

/** Entrega o payload do lead (envelope comercial) ao webhook do time. Nada de
 * credencial vai no corpo; o webhook confia no token de Authorization. */
export async function deliverCommercialAlertJob(job: CommercialAlertJob, signal: AbortSignal): Promise<'sent' | 'pending'> {
  if (!commercialAlertsEnabled()) {
    // Preview/dev ou endpoint não configurado: não entrega — o job fica
    // disponível para o cron em produção.
    return 'pending';
  }
  // Reconciliação: tentativa anterior obteve aceite mas não concluiu a
  // finalização. Não reenvia — apenas finaliza.
  if (job.existingProvider && job.existingProviderMessageId) {
    const confirmed = await finalize(job, 'sent', signal, { provider: job.existingProvider, id: job.existingProviderMessageId });
    return confirmed ? 'sent' : 'pending';
  }

  const webhookUrl = process.env.COMMERCIAL_TEAM_WEBHOOK_URL!.trim();
  let url: URL;
  try {
    url = new URL(webhookUrl);
  } catch {
    logServerWarning('commercial_alert_webhook_invalid_url', { requestId: job.requestId });
    return 'pending';
  }
  if (url.protocol !== 'https:') {
    logServerWarning('commercial_alert_webhook_not_https', { requestId: job.requestId });
    return 'pending';
  }

  const token = process.env.COMMERCIAL_TEAM_WEBHOOK_TOKEN?.trim();
  const deliveryId = `${job.protocol || job.requestId}`;
  const envelope = {
    event: 'quote_request_submitted',
    occurredAt: job.submittedAt || new Date().toISOString(),
    protocol: job.protocol,
    requestId: job.requestId,
    contact: { name: job.contactName, email: job.recipientEmail, phone: job.recipientPhone, company: job.company },
    items: job.items,
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Idempotency-Key permite ao destino deduplicar reenvios (ex.: a
        // resposta se perdeu na rede e a tentativa segue pendente).
        'Idempotency-Key': `commercial-${job.requestId}`,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(envelope),
      signal,
    });
    if (!response.ok) {
      await finalize(job, 'failed', signal, undefined, `commercial_webhook_${response.status}`);
      return 'pending';
    }
    // Aceite gravado antes da finalização — mesma proteção R01/R02 das
    // confirmações do cliente.
    await recordProviderAcceptance(job, { provider: 'commercial-webhook', id: deliveryId }, signal);
    const finalized = await finalize(job, 'sent', signal, { provider: 'commercial-webhook', id: deliveryId });
    return finalized ? 'sent' : 'pending';
  } catch (error) {
    logServerWarning('commercial_alert_webhook_failed', { requestId: job.requestId, errorClass: errorClass(error) });
    return 'pending';
  }
}

export type CommercialAlertResult = 'sent' | 'pending';

export interface CommercialAlertOptions {
  correlationId?: string;
  /** Sinal externo do orçamento da requisição; aborta junto com o timeout
   * próprio do alerta (quem tiver o prazo menor decide). */
  signal?: AbortSignal;
}

/** Dispara o alerta comercial do orçamento recém-submetido (fluxo síncrono do
 * POST /api/quote-requests). Reivindica um único job com o próprio requestId;
 * sem endpoint configurado, devolve 'pending' sem conexão — o cron
 * /api/commercial-alerts drena o backlog depois. */
export async function deliverCommercialTeamAlertNow(requestId: string, options: CommercialAlertOptions = {}): Promise<CommercialAlertResult> {
  if (!UUID_PATTERN.test(requestId)) return 'pending';
  // Sem endpoint configurado ou preview, o claim do job é inútil: o job
  // ficaria reivindicado (attempts+1) e o cron não o recupera nesta janela.
  // Check antes do claim evita consumir tentativas do lead na fila.
  if (!commercialAlertsEnabled()) return 'pending';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), COMMERCIAL_ALERT_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  const externalSignal = options.signal;
  if (externalSignal?.aborted) {
    controller.abort();
  } else if (externalSignal) {
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  try {
    const raw = await rpc<unknown>('claim_site_commercial_team_alert', { p_request_id: requestId }, controller.signal);
    if (!raw) return 'pending';
    const job = parseCommercialAlertJob(raw);
    if (!job) {
      logServerWarning('commercial_alert_invalid_payload', { requestId, correlationId: options.correlationId || null });
      return 'pending';
    }
    const outcome = await deliverCommercialAlertJob(job, controller.signal);
    console.info('commercial_alert_completed', { requestId, correlationId: options.correlationId || null, outcome });
    return outcome;
  } catch (error) {
    logServerError('commercial_alert_failed', { requestId, correlationId: options.correlationId || null, errorClass: errorClass(error) });
    return 'pending';
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}
