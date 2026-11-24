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
    requestKind: 'quote',
    preferredChannel: '',
    pageUrl: '',
    ...overrides,
  };
}

/** Lead de contato: sem protocolo, empresa nem itens; com canal preferido e
 * página de origem. O texto livre da mensagem não existe no envelope. */
function validContactJob(overrides: Partial<CommercialAlertJob> = {}): CommercialAlertJob {
  return validJob({
    requestKind: 'contact',
    protocol: '',
    company: '',
    items: [],
    preferredChannel: 'whatsapp',
    pageUrl: 'https://www.promobrindes.com.br/contato',
    ...overrides,
  });
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
  return vi.fn(async (url: string | URL, _init?: RequestInit) => {
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
      expect(job?.items[0]?.name).toBe('Mochila Grande');
    });

    it('classifica o tipo do lead e trata job antigo (sem requestKind) como orçamento', () => {
      const { requestKind: _ignored, ...legacyJob } = validJob();
      expect(parseCommercialAlertJob(legacyJob)?.requestKind).toBe('quote');
      expect(parseCommercialAlertJob({ ...validJob(), requestKind: 'forjado' })?.requestKind).toBe('quote');
      const contact = parseCommercialAlertJob(validContactJob({ preferredChannel: ' whatsapp ', pageUrl: 'https://www.promobrindes.com.br/contato' }));
      expect(contact?.requestKind).toBe('contact');
      expect(contact?.preferredChannel).toBe('whatsapp');
      expect(contact?.pageUrl).toBe('https://www.promobrindes.com.br/contato');
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

    it('preview nunca envia webhook comercial real, mesmo com endpoint configurado', async () => {
      configureSiteDatabase();
      vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_URL', WEBHOOK_URL);
      vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_TOKEN', 'token-comercial-de-teste');
      vi.stubEnv('VERCEL_ENV', 'preview');
      const fetchMock = commercialFetchMock(validJob());
      vi.stubGlobal('fetch', fetchMock);

      const controller = new AbortController();
      await expect(deliverCommercialAlertJob(validJob(), controller.signal)).resolves.toBe('pending');
      expect(fetchMock.mock.calls.filter(([url]) => String(url) === WEBHOOK_URL)).toHaveLength(0);
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
      expect(init.headers).toMatchObject({ 'Idempotency-Key': `commercial-${REQUEST_ID}` });
      const envelope = JSON.parse(String(init.body)) as Record<string, unknown>;
      expect(envelope.event).toBe('quote_request_submitted');
      expect(envelope.requestId).toBe(REQUEST_ID);
      expect(envelope.protocol).toBe('PB-2026-0001');
      expect(envelope.contact).toMatchObject({ name: 'Ana Silva', email: 'ana@empresa.com.br', company: 'Empresa Exemplo' });
      expect(envelope.items).toEqual([{ name: 'Mochila', sku: 'MO-42', quantity: 100, colorName: 'Verde' }]);
    });

    it('envia o envelope do contato, sem campo de orçamento e sem o texto livre do lead', async () => {
      configureSiteDatabase();
      vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_URL', WEBHOOK_URL);
      vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_TOKEN', 'token-comercial-de-teste');
      const fetchMock = commercialFetchMock(validContactJob());
      vi.stubGlobal('fetch', fetchMock);

      const controller = new AbortController();
      await expect(deliverCommercialAlertJob(validContactJob(), controller.signal)).resolves.toBe('sent');

      const webhookCall = fetchMock.mock.calls.find(([url]) => String(url) === WEBHOOK_URL);
      expect(webhookCall).toBeDefined();
      const [, init] = webhookCall as [unknown, RequestInit];
      const envelope = JSON.parse(String(init.body)) as Record<string, unknown>;
      expect(envelope.event).toBe('contact_request_submitted');
      expect(envelope.requestId).toBe(REQUEST_ID);
      expect(envelope.preferredChannel).toBe('whatsapp');
      expect(envelope.pageUrl).toBe('https://www.promobrindes.com.br/contato');
      expect(envelope.contact).toEqual({ name: 'Ana Silva', email: 'ana@empresa.com.br', phone: '(11) 99999-9999' });
      // Minimização (migration 20261117010000): o alerta é um ponteiro para o
      // lead, não uma cópia do texto do titular num endpoint de terceiro.
      expect(envelope).not.toHaveProperty('message');
      expect(envelope).not.toHaveProperty('protocol');
      expect(envelope).not.toHaveProperty('items');
    });

    it('o timeout da entrega é menor que o orçamento da rodada do cron', () => {
      expect(COMMERCIAL_ALERT_TIMEOUT_MS).toBeLessThan(10_000);
    });

    describe('canal de e-mail (sem webhook do time)', () => {
      const RESEND_URL = 'https://api.resend.com/emails';

      /** Banco responde 'true' (com o claim do job) e o Resend responde o ID. */
      function emailFetchMock(job: unknown, resend: { status?: number; id?: string } = {}) {
        return vi.fn(async (url: string | URL, _init?: RequestInit) => {
          const target = String(url);
          if (target === RESEND_URL) {
            return resend.status && resend.status >= 400
              ? new Response('{"message":"falha"}', { status: resend.status })
              : new Response(JSON.stringify({ id: resend.id ?? 'resend-msg-1' }), { status: 200 });
          }
          if (target.includes('/claim_site_commercial_team_alert')) {
            return new Response(JSON.stringify(job), { status: 200 });
          }
          return databaseResponse();
        });
      }

      function configureEmailChannel() {
        configureSiteDatabase();
        vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
        vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@promobrindes.com.br>');
      }

      it('entrega na caixa do time comercial quando o webhook não existe', async () => {
        configureEmailChannel();
        const fetchMock = emailFetchMock(validJob());
        vi.stubGlobal('fetch', fetchMock);

        const controller = new AbortController();
        await expect(deliverCommercialAlertJob(validJob(), controller.signal)).resolves.toBe('sent');

        const emailCall = fetchMock.mock.calls.find(([url]) => String(url) === RESEND_URL) as [string, RequestInit];
        expect(emailCall).toBeDefined();
        const payload = JSON.parse(String(emailCall[1].body)) as { to: string[]; from: string; subject: string; text: string };
        expect(payload.to).toEqual(['adm01@promobrindes.com.br']);
        expect(payload.from).toBe('Promo Brindes <atendimento@promobrindes.com.br>');
        expect(payload.subject).toContain('PB-2026-0001');
        expect(payload.subject).toContain('Empresa Exemplo');
        expect(payload.text).toContain('ana@empresa.com.br');
        expect(payload.text).toContain('- 100x Mochila (MO-42, Verde)');
        expect(payload.text).toContain('Novo orçamento pelo site.');

        const acceptance = fetchMock.mock.calls.find(([url]) => String(url).includes('/record_site_notification_provider_acceptance'));
        expect(JSON.parse(String((acceptance as [string, RequestInit])[1].body))).toMatchObject({
          p_provider: 'commercial-email',
          p_provider_message_id: 'resend-msg-1',
        });
        const finalizeCall = fetchMock.mock.calls.filter(([url]) => String(url).includes('/finalize_site_notification_delivery')).pop() as [string, RequestInit];
        expect(JSON.parse(String(finalizeCall[1].body))).toMatchObject({ p_status: 'sent', p_provider: 'commercial-email' });
      });

      it('respeita COMMERCIAL_TEAM_ALERT_EMAIL como destino', async () => {
        configureEmailChannel();
        vi.stubEnv('COMMERCIAL_TEAM_ALERT_EMAIL', 'comercial@promobrindes.com.br');
        const fetchMock = emailFetchMock(validJob());
        vi.stubGlobal('fetch', fetchMock);

        await expect(deliverCommercialAlertJob(validJob(), new AbortController().signal)).resolves.toBe('sent');
        const emailCall = fetchMock.mock.calls.find(([url]) => String(url) === RESEND_URL) as [string, RequestInit];
        expect((JSON.parse(String(emailCall[1].body)) as { to: string[] }).to).toEqual(['comercial@promobrindes.com.br']);
      });

      it('o webhook do time continua tendo prioridade sobre o e-mail', async () => {
        configureEmailChannel();
        vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_URL', WEBHOOK_URL);
        const fetchMock = emailFetchMock(validJob());
        vi.stubGlobal('fetch', fetchMock);

        await expect(deliverCommercialAlertJob(validJob(), new AbortController().signal)).resolves.toBe('sent');
        expect(fetchMock.mock.calls.filter(([url]) => String(url) === RESEND_URL)).toHaveLength(0);
        expect(fetchMock.mock.calls.filter(([url]) => String(url) === WEBHOOK_URL)).toHaveLength(1);
      });

      it('recusa do provedor marca a entrega como falha em vez de dar o lead por avisado', async () => {
        configureEmailChannel();
        const fetchMock = emailFetchMock(validJob(), { status: 502 });
        vi.stubGlobal('fetch', fetchMock);

        await expect(deliverCommercialAlertJob(validJob(), new AbortController().signal)).resolves.toBe('pending');
        const finalizeCall = fetchMock.mock.calls.filter(([url]) => String(url).includes('/finalize_site_notification_delivery')).pop() as [string, RequestInit];
        expect(JSON.parse(String(finalizeCall[1].body))).toMatchObject({ p_status: 'failed', p_error_code: 'commercial_email_502' });
      });

      it('preview não envia e-mail comercial, mesmo com o provedor configurado', async () => {
        configureEmailChannel();
        vi.stubEnv('VERCEL_ENV', 'preview');
        const fetchMock = emailFetchMock(validJob());
        vi.stubGlobal('fetch', fetchMock);

        await expect(deliverCommercialAlertJob(validJob(), new AbortController().signal)).resolves.toBe('pending');
        expect(fetchMock).not.toHaveBeenCalled();
      });
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

    it('sem webhook configurado não reivindica job (evita consumir attempts do lead)', async () => {
      configureSiteDatabase();
      const fetchMock = commercialFetchMock(validJob());
      vi.stubGlobal('fetch', fetchMock);

      await expect(deliverCommercialTeamAlertNow(REQUEST_ID)).resolves.toBe('pending');
      const claimCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/claim_site_commercial_team_alert'));
      expect(claimCalls).toHaveLength(0);
    });

    it('preview não reivindica nem envia webhook comercial real', async () => {
      configureSiteDatabase();
      vi.stubEnv('COMMERCIAL_TEAM_WEBHOOK_URL', WEBHOOK_URL);
      vi.stubEnv('VERCEL_ENV', 'preview');
      const fetchMock = commercialFetchMock(validJob());
      vi.stubGlobal('fetch', fetchMock);

      await expect(deliverCommercialTeamAlertNow(REQUEST_ID)).resolves.toBe('pending');
      const calls = fetchMock.mock.calls;
      expect(calls.filter(([url]) => String(url).includes('/claim_site_commercial_team_alert'))).toHaveLength(0);
      expect(calls.filter(([url]) => String(url) === WEBHOOK_URL)).toHaveLength(0);
    });
  });
});
