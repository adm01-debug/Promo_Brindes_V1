import { timingSafeEqual } from 'node:crypto';
import type { ApiRequest, ApiResponse } from './_lib/leadHandler.js';
import { readCronHeartbeats, type CronHeartbeatStatus } from './_lib/cronHeartbeats.js';
import { errorClass, logServerError, logServerWarning } from './_lib/observability.js';
import { sendOperationalAlert } from './_lib/operationalAlerts.js';

/** Orçamento abaixo do maxDuration de 15 s declarado em vercel.json. */
export const CRON_WATCHDOG_TIMEOUT_MS = 8_000;

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function matchesCronSecret(authorization: string, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Um cron está doente quando está atrasado ou falhando de forma consecutiva.
 *
 * `never_ran` **não** é doença: enquanto a primeira janela não vence, o cron só
 * ainda não teve oportunidade de rodar (é o estado logo após aplicar a migration).
 * Passada a janela, `check_cron_heartbeats` já devolve `late`/`is_late`.
 */
export function isUnhealthy(beat: CronHeartbeatStatus): boolean {
  return beat.isLate || beat.status === 'failing' || beat.status === 'late';
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || cronSecret.length < 32 || !matchesCronSecret(header(request, 'authorization'), cronSecret)) {
    response.status(401).json({ error: 'unauthorized' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CRON_WATCHDOG_TIMEOUT_MS);
  try {
    const beats = await readCronHeartbeats(controller.signal);
    const unhealthy = beats.filter(isUnhealthy);
    if (!unhealthy.length) {
      console.info('cron_watchdog_ok', { checked: beats.length });
      response.status(200).json({ ok: true, checked: beats.length, unhealthy: [] });
      return;
    }
    const detalhe = {
      unhealthy: unhealthy.map((beat) => ({
        cron: beat.name,
        status: beat.status,
        secondsSinceActivity: beat.secondsSinceActivity,
        expectedIntervalSeconds: beat.expectedIntervalSeconds,
        consecutiveFailures: beat.consecutiveFailures,
      })),
    };
    // `console.error` para o log da Vercel e o webhook: este é o único caminho
    // pelo qual um cron silencioso (cron que a plataforma deixou de disparar,
    // ou que passou a falhar antes do próprio `try`) vira alerta.
    console.error('cron_watchdog_unhealthy', detalhe);
    const alerted = await sendOperationalAlert('cron_watchdog_unhealthy', detalhe);
    if (process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim() && !alerted) {
      logServerWarning('cron_watchdog_alert_delivery_failed', {});
    }
    response.status(503).json({ ok: false, checked: beats.length, ...detalhe });
  } catch (error) {
    logServerError('cron_watchdog_failed', { errorClass: errorClass(error) });
    const alerted = await sendOperationalAlert('cron_watchdog_failed', { errorClass: errorClass(error) });
    if (process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim() && !alerted) {
      logServerWarning('cron_watchdog_failure_alert_delivery_failed', {});
    }
    response.status(503).json({ error: 'cron_watchdog_unavailable' });
  } finally {
    clearTimeout(timeout);
  }
}
