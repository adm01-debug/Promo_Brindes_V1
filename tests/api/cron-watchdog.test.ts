import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, { isUnhealthy } from '../../api/cron-watchdog.js';
import type { ApiRequest, ApiResponse } from '../../api/_lib/leadHandler.js';
import type { CronHeartbeatStatus } from '../../api/_lib/cronHeartbeats.js';

const CRON_SECRET = 'cron-secret-de-testes-com-mais-de-32-caracteres';

function responseDouble() {
  const result = { headers: new Map<string, string>(), statusCode: 0, body: undefined as unknown };
  const response: ApiResponse = {
    setHeader(name, value) { result.headers.set(name, value); },
    status(code) { result.statusCode = code; return response; },
    json(body) { result.body = body; },
  };
  return { result, response };
}

function request(authorization = '', method = 'GET'): ApiRequest {
  return { method, headers: { authorization } };
}

function beat(over: Partial<CronHeartbeatStatus>): CronHeartbeatStatus {
  return {
    name: 'retention',
    status: 'ok',
    lastOkAt: '2026-11-22T08:00:00.000Z',
    lastFailedAt: null,
    lastFailureDetail: null,
    consecutiveFailures: 0,
    expectedIntervalSeconds: 86_400,
    secondsSinceActivity: 60,
    isLate: false,
    ...over,
  };
}

function stubBeats(rows: CronHeartbeatStatus[] | 'fail') {
  const fetchMock = vi.fn(async (url: string) => {
    if (!String(url).includes('/rest/v1/rpc/check_cron_heartbeats')) return new Response('{}', { status: 500 });
    if (rows === 'fail') return new Response('{}', { status: 500 });
    return new Response(JSON.stringify(rows.map((row) => ({
      name: row.name,
      status: row.status,
      last_ok_at: row.lastOkAt,
      last_failed_at: row.lastFailedAt,
      last_failure_detail: row.lastFailureDetail,
      consecutive_failures: row.consecutiveFailures,
      expected_interval_seconds: row.expectedIntervalSeconds,
      seconds_since_activity: row.secondsSinceActivity,
      is_late: row.isLate,
    }))), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function configure() {
  vi.stubEnv('SITE_SUPABASE_URL', 'https://xlzmclcjdncjfdrjxclt.supabase.co');
  vi.stubEnv('SITE_SUPABASE_SECRET_KEY', `sb_secret_${'x'.repeat(40)}`);
  vi.stubEnv('CRON_SECRET', CRON_SECRET);
  vi.stubEnv('SITE_REQUEST_HASH_SALT', 'salt-de-testes-com-mais-de-32-caracteres');
}

describe('vigia dos crons (F-87)', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('recusa chamadas sem o segredo da tarefa agendada', async () => {
    configure();
    stubBeats([beat({})]);
    const { result, response } = responseDouble();
    await handler(request('Bearer outra-chave'), response);
    expect(result.statusCode).toBe(401);
  });

  it('recusa métodos que não são GET', async () => {
    configure();
    stubBeats([beat({})]);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${CRON_SECRET}`, 'POST'), response);
    expect(result.statusCode).toBe(405);
  });

  it('responde 200 quando todos os crons estão saudáveis', async () => {
    configure();
    stubBeats([beat({}), beat({ name: 'notifications', expectedIntervalSeconds: 900 }), beat({ name: 'commercial-alerts', expectedIntervalSeconds: 300 })]);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${CRON_SECRET}`), response);
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ ok: true, checked: 3, unhealthy: [] });
  });

  it('responde 503 e alerta quando algum cron está atrasado', async () => {
    configure();
    vi.stubEnv('OPERATIONS_ALERT_WEBHOOK_URL', 'https://alertas.test/hook');
    const fetchMock = stubBeats([
      beat({}),
      beat({ name: 'notifications', status: 'late', isLate: true, secondsSinceActivity: 7_200, consecutiveFailures: 0 }),
      beat({ name: 'commercial-alerts', expectedIntervalSeconds: 300 }),
    ]);
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${CRON_SECRET}`), response);
    expect(result.statusCode).toBe(503);
    expect(result.body).toMatchObject({ ok: false, checked: 3 });
    expect((result.body as { unhealthy: { cron: string }[] }).unhealthy.map((item) => item.cron)).toEqual(['notifications']);
    expect(erro).toHaveBeenCalledWith('cron_watchdog_unhealthy', expect.anything());
    const alerta = fetchMock.mock.calls.find(([url]) => String(url) === 'https://alertas.test/hook');
    expect(alerta).toBeDefined();
  });

  it('considera doente o cron que falhou repetidamente mesmo dentro da janela', () => {
    expect(isUnhealthy(beat({}))).toBe(false);
    expect(isUnhealthy(beat({ status: 'failing', consecutiveFailures: 3 }))).toBe(true);
    expect(isUnhealthy(beat({ status: 'late', isLate: true }))).toBe(true);
    expect(isUnhealthy(beat({ status: 'never_ran', isLate: true }))).toBe(true);
  });

  it('responde 503 sem vazar detalhe quando a leitura do banco falha', async () => {
    configure();
    vi.stubEnv('OPERATIONS_ALERT_WEBHOOK_URL', 'https://alertas.test/hook');
    const fetchMock = stubBeats('fail');
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${CRON_SECRET}`), response);
    expect(result.statusCode).toBe(503);
    expect(result.body).toEqual({ error: 'cron_watchdog_unavailable' });
    expect(fetchMock.mock.calls.some(([url]) => String(url) === 'https://alertas.test/hook')).toBe(true);
  });
});
