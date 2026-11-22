import { getSiteDatabaseConfig } from './siteDatabase.js';
import { logServerWarning } from './observability.js';

/** Nomes aceitos pela tabela site_private.cron_heartbeats (F-87). */
export type CronName = 'retention' | 'notifications' | 'commercial-alerts';

export const CRON_HEARTBEAT_TIMEOUT_MS = 2_000;

/**
 * Grava o desfecho de uma rodada de cron na tabela de heartbeat.
 *
 * Best-effort de proposito: o heartbeat e observabilidade, nao pode derrubar a
 * rodada que ele observa. Uma falha aqui vira log de aviso, e o vigia
 * (/api/cron-watchdog) acaba acusando o cron como atrasado — o que e a resposta
 * certa quando o proprio registro do heartbeat nao funciona.
 */
export async function recordCronHeartbeat(
  name: CronName,
  ok: boolean,
  detail?: string,
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CRON_HEARTBEAT_TIMEOUT_MS);
  try {
    const config = getSiteDatabaseConfig();
    const response = await fetch(`${config.url}/rest/v1/rpc/record_cron_heartbeat`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: config.serviceCredential,
        Authorization: `Bearer ${config.serviceCredential}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ p_name: name, p_ok: ok, p_detail: detail ?? null }),
    });
    if (!response.ok) {
      logServerWarning('cron_heartbeat_write_failed', { cron: name, status: response.status });
      return false;
    }
    return true;
  } catch {
    logServerWarning('cron_heartbeat_write_failed', { cron: name, errorClass: 'network_or_timeout' });
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export interface CronHeartbeatStatus {
  name: string;
  status: 'ok' | 'late' | 'failing' | 'never_ran';
  lastOkAt: string | null;
  lastFailedAt: string | null;
  lastFailureDetail: string | null;
  consecutiveFailures: number;
  expectedIntervalSeconds: number;
  secondsSinceActivity: number;
  isLate: boolean;
}

/** Le public.check_cron_heartbeats() e normaliza o snake_case do PostgREST. */
export async function readCronHeartbeats(signal?: AbortSignal): Promise<CronHeartbeatStatus[]> {
  const config = getSiteDatabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/rpc/check_cron_heartbeats`, {
    method: 'POST',
    signal,
    headers: {
      apikey: config.serviceCredential,
      Authorization: `Bearer ${config.serviceCredential}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: '{}',
  });
  if (!response.ok) throw new Error('check_cron_heartbeats_failed');
  const rows = await response.json() as unknown;
  if (!Array.isArray(rows)) throw new Error('invalid_cron_heartbeats_response');
  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      name: String(item.name),
      status: String(item.status) as CronHeartbeatStatus['status'],
      lastOkAt: (item.last_ok_at as string | null) ?? null,
      lastFailedAt: (item.last_failed_at as string | null) ?? null,
      lastFailureDetail: (item.last_failure_detail as string | null) ?? null,
      consecutiveFailures: Number(item.consecutive_failures ?? 0),
      expectedIntervalSeconds: Number(item.expected_interval_seconds ?? 0),
      secondsSinceActivity: Number(item.seconds_since_activity ?? 0),
      isLate: Boolean(item.is_late),
    };
  });
}
