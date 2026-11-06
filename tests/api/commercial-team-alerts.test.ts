import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COMMERCIAL_ALERT_TIMEOUT_MS,
  deliverCommercialAlertJob,
  deliverCommercialTeamAlertNow,
  parseCommercialAlertJob,
  type CommercialAlertJob,
} from '../../api/_lib/commercialTeamAlerts.js';

const REQUEST_ID = '99999999-9999-4999-8999-999999999999';
const WEBHOOK_URL = 'https://comercial.promobrindes.com.br/hook';

function validJob(overrides: Partial<CommercialAlertJob> = {}): CommercialAlertJob {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    leaseToken: '22222222-2222-4222-8222-222222222222',
    existingProvider: null,
    existingProviderMessageId: null,
    requestId: REQUEST_ID,
    attempt: 1,
    protocol: 'PB-2026-0001',
    recipientEmail: 'ana@empresa.com.br',
    recipientPhone: '(11) 99999-9999',
    contactName: 'Ana Silva',
    company: 'Empresa Exemplo',
    submittedAt: '2026-09-08T12:00:00.000Z',
    items: [{ name: 'Mochila', sku: 'MO-42', quantity: 100, colorName: 'Verde' }],
    ...overrides,
  };
}

function configureSiteDatabase() {
  vi.stubEnv('SITE_SUPABASE_URL', 'https://xlzmclcjdncjfdrjxclt.supabase.co');
  vi.stubEnv('SITE_SUPABASE_SECRET_KEY', `sb_secret_${'x'.repeat(40)}`);
  vi.stubEnv('SITE_REQUEST_HASH_SALT', 'salt-de-testes-com-mais-de-32-caracteres');
  vi.stubEnv('SITE_PUBLIC_ORIGIN', 'https://www.promobrindes.com.br');
}

function databaseResponse(): Response {
  return new Response('true', { status: 200 });
}

/** Responde todas as RPC do banco com 'true' e (opcionalmente) o claim do job. */
function commercialFetchMock(job?: unknown, webhookStatus = 202) {
  return vi.fn(async (url: string | URL) => {
    const target = String(url);
    if (target === WEBHOOK_URL) return new Response('', { status: webhookStatus });
    if (target.includes('/claim_site_commercial_team_alert')) {
      return new Response(job === undefined ? 'null' : JSON.stringify(job), { status: 200 });
    }
    return databaseResponse();
  });
}

describe('alerta comercial de orçamento (PF-01)', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  describe('parseCommercialAlertJob', () => {
    it('rejeita payload sem a forma mínima do job', () => {
      expect(parseCommercialAlertJob(null)).toBeNull();
      expect(parseCommercialAlertJob({})).toBeNull();
      expect(parseCommercialAlertJob({ id: 'nao-uuid', leaseToken: 'nao-uuid', requestId: 'nao-uuid', attempt: 0 })).toBeNull();
      expect(parseCommercialAlertJob({ ...validJob(), id: 'nao-uuid' })).toBeNull();
      expect(parseCommercialAlertJob({ ...validJob(), items: [{ name: 'X', sku: 'S', quantity: 0 }] })).toBeNull();
    });

    it('normaliza e limita campos do envelope', () => {
      const job = parseCommercialAlertJob({ ...validJob(), recipientEmail: '  ANA@EMPRESA.COM.BR ', attempt: 2, items: [{ name: 'Mochila\nGrande', sku: 'MO-42', quantity: 100, colorName: 'Verde' }] });
      expect(job).not.toBeNull();
      expect(job?.recipientEmail).toBe('ana@empresa.com.br');
      expect(job?.attempt).toBe(2);
      expect(job?.items[0].name).toBe('Mochila Grande');
    });
  });

  describe('deliverCommercialAlertJob', () => {
    it('não abre conexão sem endpoint configurado', async () => {
      configureSiteDatabase();
      const fetchMock = commercialFetchMock(validJob());
      vi.stubGlobal('fetch', fetchMock);

      const controller = new AbortController();
      await expect(deliverCommercialAlertJob(validJob(), controller.signal)).resolves.toBe('pending');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('recusa endpoint que não seja HTTPS, sem conexão', async () => {
      configureSiteDatabase();
      vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_URL', 'http://comercial.promobrindes.com.br/hook');
      const fetchMock = commercialFetchMock(validJob());
      vi.stubGlobal('fetch', fetchMock);

      const controller = new AbortController();
      await expect(deliverCommercialAlertJob(validJob(), controller.signal)).resolves.toBe('pending');
      expect(fetchMock.mock.calls.filter(([url]) => String(url) === 'http://comercial.promobrindes.com.br/hook')).toHaveLength(0);
    });

    it('não reenvia quando a tentativa anterior já registrou aceite do provedor', async () => {
      configureSiteDatabase();
      vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_URL', WEBHOOK_URL);
      vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_TOKEN', 'token-comercial-de-teste');
      const fetchMock = commercialFetchMock();
      vi.stubGlobal('fetch', fetchMock);
      const job = validJob({ existingProvider: 'commercial-webhook', existingProviderMessageId: 'PB-2026-0001' });

      const controller = new AbortController();
      await expect(deliverCommercialAlertJob(job, controller.signal)).resolves.toBe('sent');
      expect(fetchMock.mock.calls.filter(([url]) => String(url) === WEBHOOK_URL)).toHaveLength(0);
    });

    it('envia o envelope do lead ao endpoint HTTPS com token de autorização', async () => {
      configureSiteDatabase();
      vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_URL', WEBHOOK_URL);
      vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_TOKEN', 'token-comercial-de-teste');
      const fetchMock = commercialFetchMock(validJob());
      vi.stubGlobal('fetch', fetchMock);

      const controller = new AbortController();
      await expect(deliverCommercialAlertJob(validJob(), controller.signal)).resolves.toBe('sent');

      const webhookCall = fetchMock.mock.calls.find(([url]) => String(url) === WEBHOOK_URL);
      expect(webhookCall).toBeDefined();
      const [, init] = webhookCall as [unknown, RequestInit];
      expect(init.method).toBe('POST');
      expect(init.headers).toMatchObject({ Authorization: 'Bearer token-comercial-de-teste' });
      const envelope = JSON.parse(String(init.body)) as Record<string, unknown>;
      expect(envelope.event).toBe('quote_request_submitted');
      expect(envelope.requestId).toBe(REQUEST_ID);
      expect(envelope.protocol).toBe('PB-2026-0001');
      expect(envelope.contact).toMatchObject({ name: 'Ana Silva', email: 'ana@empresa.com.br', company: 'Empresa Exemplo' });
      expect(envelope.items).toEqual([{ name: 'Mochila', sku: 'MO-42', quantity: 100, colorName: 'Verde' }]);
    });

    it('o timeout da entrega é menor que o orçamento da rodada do cron', () => {
      expect(COMMERCIAL_ALERT_TIMEOUT_MS).toBeLessThan(10_000);
    });
  });

  describe('deliverCommercialTeamAlertNow', () => {
    it('reivindica um único job por requestId e entrega', async () => {
      configureSiteDatabase();
      vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_URL', WEBHOOK_URL);
      vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_TOKEN', 'token-comercial-de-teste');
      const fetchMock = commercialFetchMock(validJob());
      vi.stubGlobal('fetch', fetchMock);

      await expect(deliverCommercialTeamAlertNow(REQUEST_ID)).resolves.toBe('sent');
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/claim_site_commercial_team_alert'))).toBe(true);
      const rpcCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/claim_site_commercial_team_alert')) as [string, RequestInit];
      expect(JSON.parse(String(rpcCall[1].body))).toEqual({ p_request_id: REQUEST_ID });
    });

    it('requestId fora do formato UUID não toca conexão alguma', async () => {
      configureSiteDatabase();
      const fetchMock = commercialFetchMock(validJob());
      vi.stubGlobal('fetch', fetchMock);

      await expect(deliverCommercialTeamAlertNow('lead-42')).resolves.toBe('pending');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
