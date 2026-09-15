/** Canal opcional para alertas de operação (Slack, PagerDuty, e-mail gateway).
 * Só aceita HTTPS e transporta contagens/IDs técnicos — nunca payload de lead. */
export const OPERATIONAL_ALERT_TIMEOUT_MS = 1_000;

export type OperationalAlertEvent = 'notification_queue_alert' | 'notification_cron_failed' | 'retention_cron_failed';

function alertEndpoint(): URL | null {
  const value = process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export async function sendOperationalAlert(event: OperationalAlertEvent, details: Record<string, unknown>): Promise<boolean> {
  const endpoint = alertEndpoint();
  if (!endpoint) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPERATIONAL_ALERT_TIMEOUT_MS);
  try {
    const token = process.env.OPERATIONS_ALERT_WEBHOOK_TOKEN?.trim();
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ event, occurredAt: new Date().toISOString(), details }),
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
