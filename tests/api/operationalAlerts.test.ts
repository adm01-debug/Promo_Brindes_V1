import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendOperationalAlert } from '../../api/_lib/operationalAlerts.js';

describe('alertas operacionais', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('não abre conexão sem endpoint HTTPS explicitamente configurado', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('OPERATIONS_ALERT_WEBHOOK_URL', 'http://alertas.example.test/hook');

    await expect(sendOperationalAlert('notification_queue_alert', { exhaustedCount: 1 })).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envia somente o envelope técnico ao endpoint HTTPS configurado', async () => {
    vi.stubEnv('OPERATIONS_ALERT_WEBHOOK_URL', 'https://alertas.example.test/hook');
    vi.stubEnv('OPERATIONS_ALERT_WEBHOOK_TOKEN', 'token-de-alerta');
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendOperationalAlert('notification_cron_failed', { claimed: 2, errorClass: 'TypeError' })).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(new URL('https://alertas.example.test/hook'), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer token-de-alerta' }),
      body: expect.stringContaining('notification_cron_failed'),
    }));
  });
});
