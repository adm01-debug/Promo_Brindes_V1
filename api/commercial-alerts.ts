import { timingSafeEqual } from 'node:crypto';
import { getSiteDatabaseConfig } from './_lib/siteDatabase.js';
import type { ApiRequest, ApiResponse } from './_lib/leadHandler.js';
import { errorClass, logServerError, logServerWarning } from './_lib/observability.js';
import {
  deliverCommercialAlertJob,
  parseCommercialAlertJob,
} from './_lib/commercialTeamAlerts.js';
import { sendOperationalAlert } from './_lib/operationalAlerts.js';

/** Orçamento do cron abaixo do maxDuration de 15 s da Vercel. Exportado para
 * o gate de CI tests/api/maxDuration.test.ts. O sinal de deadline da rodada
 * é compartilhado pela reivindicação e pelas entregas do lote. */
export const COMMERCIAL_ALERTS_TIMEOUT_MS = 10_000;
const COMMERCIAL_ALERTS_BATCH_SIZE = 10;

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function matchesCronSecret(authorization: string, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function claimCommercialAlerts(signal: AbortSignal): Promise<unknown[]> {
  const config = getSiteDatabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/rpc/claim_site_commercial_team_alerts`, {
    method: 'POST',
    headers: {
      apikey: config.serviceCredential,
      Authorization: `Bearer ${config.serviceCredential}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ p_batch_size: COMMERCIAL_ALERTS_BATCH_SIZE }),
    signal,
  });
  if (!response.ok) throw new Error('claim_site_commercial_team_alerts_failed');
  const claimed = await response.json() as unknown;
  if (!Array.isArray(claimed) || claimed.length > COMMERCIAL_ALERTS_BATCH_SIZE) {
    throw new Error('invalid_claim_response');
  }
  return claimed;
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

  // A Vercel injeta CRON_SECRET automaticamente nas chamadas configuradas em
  // vercel.json. Uma única credencial reduz a superfície de acesso.
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || cronSecret.length < 32 || !matchesCronSecret(header(request, 'authorization'), cronSecret)) {
    response.status(401).json({ error: 'unauthorized' });
    return;
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), COMMERCIAL_ALERTS_TIMEOUT_MS);
    const claimedJobs = await claimCommercialAlerts(controller.signal);
    let delivered = 0;
    let failed = 0;
    let pending = 0;
    for (const raw of claimedJobs) {
      if (controller.signal.aborted) {
        pending += 1;
        continue;
      }
      const job = parseCommercialAlertJob(raw);
      if (!job) {
        logServerWarning('commercial_alert_invalid_payload_in_batch', {});
        failed += 1;
        continue;
      }
      const outcome = await deliverCommercialAlertJob(job, controller.signal);
      if (outcome === 'sent') delivered += 1;
      else pending += 1;
    }
    console.info('commercial_alerts_cron_completed', {
      claimed: claimedJobs.length,
      delivered,
      failed,
      pending,
    });
    response.status(200).json({ ok: true, claimed: claimedJobs.length, delivered, failed, pending });
  } catch (error) {
    logServerError('commercial_alerts_cron_failed', { errorClass: errorClass(error) });
    const alerted = await sendOperationalAlert('commercial_alerts_cron_failed', { errorClass: errorClass(error) });
    if (process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim() && !alerted) {
      logServerWarning('commercial_alerts_failure_alert_delivery_failed', {});
    }
    response.status(503).json({ error: 'commercial_alerts_unavailable' });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
