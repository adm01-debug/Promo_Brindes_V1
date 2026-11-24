import { timingSafeEqual } from 'node:crypto';
import { getSiteDatabaseConfig } from './_lib/siteDatabase.js';
import type { ApiRequest, ApiResponse } from './_lib/leadHandler.js';
import { errorClass, logServerError, logServerWarning } from './_lib/observability.js';
import {
  COMMERCIAL_ALERT_TIMEOUT_MS,
  commercialAlertsEnabled,
  deliverCommercialAlertJob,
  parseCommercialAlertJob,
} from './_lib/commercialTeamAlerts.js';
import { recordCronHeartbeat } from './_lib/cronHeartbeats.js';
import { sendOperationalAlert } from './_lib/operationalAlerts.js';

/** Orçamento do cron abaixo do maxDuration de 15 s da Vercel. Exportado para
 * o gate de CI tests/api/maxDuration.test.ts. O sinal de deadline da rodada
 * é compartilhado pela reivindicação e pelas entregas do lote. */
export const COMMERCIAL_ALERTS_TIMEOUT_MS = 10_000;
/** Alertas entregues por rodada. O lote inteiro roda EM PARALELO sobre a mesma
 * janela de COMMERCIAL_ALERTS_TIMEOUT_MS, então nenhum job reivindicado fica
 * sem tentativa (attempts consumido sem entrega real, R03). O valor é o que
 * cabe em uma única janela: com o laço serial o lote efetivo era sempre 1
 * (floor(10s / COMMERCIAL_ALERT_TIMEOUT_MS) = 1), ou seja 12 alertas por hora
 * no cron de 5 min — num pico de orçamentos o time comercial era avisado com
 * horas de atraso. */
const COMMERCIAL_ALERTS_BATCH_SIZE = 4;

/** Desfecho de um job dentro da rodada. 'invalid' é payload fora da forma
 * mínima; 'untouched' é o job que a guarda de tempo deixou para a próxima
 * rodada (não chegou a abrir conexão). */
type CronJobOutcome = 'sent' | 'pending' | 'invalid' | 'untouched';

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function matchesCronSecret(authorization: string, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function claimCommercialAlerts(signal: AbortSignal, batchSize: number): Promise<unknown[]> {
  const config = getSiteDatabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/rpc/claim_site_commercial_team_alerts`, {
    method: 'POST',
    headers: {
      apikey: config.serviceCredential,
      Authorization: `Bearer ${config.serviceCredential}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ p_batch_size: batchSize }),
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

  // Mesma trava do caminho sincrono (commercialTeamAlerts.ts: deliverCommercialTeamAlertNow):
  // sem destino configurado (webhook do time ou e-mail interno) ou em preview, reivindicar o job so consome attempts do lead sem
  // chance de entrega, levando a fila a exhausted sem nenhuma tentativa real. O cron roda a
  // cada 5 min (vercel.json), entao a perda era continua.
  if (!commercialAlertsEnabled()) {
    console.info('commercial_alerts_cron_skipped', { reason: 'not_configured' });
    // F-87: o cron rodou, so nao havia destino. Sem este heartbeat o vigia
    // confundiria "sem provedor" com "agendador parado" e alertaria sem motivo.
    await recordCronHeartbeat('commercial-alerts', true, 'skipped:not_configured');
    response.status(200).json({ ok: true, skipped: 'not_configured', claimed: 0, delivered: 0, failed: 0, pending: 0 });
    return;
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), COMMERCIAL_ALERTS_TIMEOUT_MS);
    const deadline = Date.now() + COMMERCIAL_ALERTS_TIMEOUT_MS;
    // O lote roda em paralelo sobre o mesmo deadline: cada job tem a janela
    // inteira para responder e nenhum fica reivindicado sem tentativa. A guarda
    // de tempo é reavaliada por job (o deadline pode ter estourado entre dois
    // ticks do event loop) e o que sobrar volta como 'pending' — a próxima
    // rodada o recupera. allSettled, e não all, porque uma entrega que estourar
    // não pode esconder o desfecho das outras do mesmo lote.
    const claimedJobs = await claimCommercialAlerts(controller.signal, COMMERCIAL_ALERTS_BATCH_SIZE);
    const settled = await Promise.allSettled(claimedJobs.map(async (raw): Promise<CronJobOutcome> => {
      if (controller.signal.aborted || Date.now() >= deadline - COMMERCIAL_ALERT_TIMEOUT_MS) return 'untouched';
      const job = parseCommercialAlertJob(raw);
      if (!job) {
        logServerWarning('commercial_alert_invalid_payload_in_batch', {});
        return 'invalid';
      }
      return deliverCommercialAlertJob(job, controller.signal);
    }));
    let delivered = 0;
    let failed = 0;
    let pending = 0;
    let untouched = 0;
    for (const result of settled) {
      if (result.status === 'rejected') {
        failed += 1;
        logServerWarning('commercial_alert_delivery_threw', { errorClass: errorClass(result.reason) });
        continue;
      }
      if (result.value === 'sent') delivered += 1;
      else if (result.value === 'invalid') failed += 1;
      else if (result.value === 'untouched') untouched += 1;
      else pending += 1;
    }
    // Jobs que a guarda de tempo não chegou a tentar voltam como 'pending' na
    // resposta — a próxima rodada os recupera.
    const pendingTotal = pending + untouched;
    console.info('commercial_alerts_cron_completed', {
      claimed: claimedJobs.length,
      delivered,
      failed,
      pending: pendingTotal,
    });
    await recordCronHeartbeat('commercial-alerts', true, failed ? `failed:${failed}` : undefined);
    response.status(200).json({ ok: true, claimed: claimedJobs.length, delivered, failed, pending: pendingTotal });
  } catch (error) {
    logServerError('commercial_alerts_cron_failed', { errorClass: errorClass(error) });
    await recordCronHeartbeat('commercial-alerts', false, errorClass(error));
    const alerted = await sendOperationalAlert('commercial_alerts_cron_failed', { errorClass: errorClass(error) });
    if (process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim() && !alerted) {
      logServerWarning('commercial_alerts_failure_alert_delivery_failed', {});
    }
    response.status(503).json({ error: 'commercial_alerts_unavailable' });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
