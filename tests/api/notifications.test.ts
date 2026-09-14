import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, { deliverQuoteConfirmationsNow } from '../../api/notifications.js';
import type { ApiRequest, ApiResponse } from '../../api/_lib/leadHandler.js';

function responseDouble() {
  const result = { headers: new Map<string, string>(), statusCode: 0, body: undefined as unknown };
  const response: ApiResponse = {
    setHeader(name, value) { result.headers.set(name, value); },
    status(code) { result.statusCode = code; return response; },
    json(body) { result.body = body; },
  };
  return { result, response };
}

function request(authorization = ''): ApiRequest {
  return { method: 'GET', headers: { authorization } };
}

function configure() {
  vi.stubEnv('SITE_SUPABASE_URL', 'https://xlzmclcjdncjfdrjxclt.supabase.co');
  vi.stubEnv('SITE_SUPABASE_SECRET_KEY', `sb_secret_${'x'.repeat(40)}`);
  vi.stubEnv('SITE_REQUEST_HASH_SALT', 'salt-de-testes-com-mais-de-32-caracteres');
  vi.stubEnv('SITE_PUBLIC_ORIGIN', 'https://promo-brindes-v1.vercel.app');
  vi.stubEnv('CRON_SECRET', 'cron-secret-de-testes-com-mais-de-32-caracteres');
  for (const key of ['RESEND_API_KEY', 'SITE_EMAIL_FROM', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_QUOTE_TEMPLATE', 'WHATSAPP_GRAPH_API_VERSION']) vi.stubEnv(key, '');
}

const emailJob = {
  id: '11111111-1111-4111-8111-111111111111',
  leaseToken: '55555555-5555-4555-8555-555555555555',
  existingProvider: null, existingProviderMessageId: null,
  requestId: '22222222-2222-4222-8222-222222222222',
  channel: 'email', attempt: 1, protocol: '22222222', recipientEmail: 'cliente@example.test',
  recipientPhone: '(11) 99999-9999', contactName: 'Ana & Cia', company: 'Marca <Teste>',
  submittedAt: '2026-09-12T12:00:00Z', items: [{ name: 'Mochila <Premium>', sku: 'MO-1', quantity: 100, colorName: 'Azul' }],
};

// A finalização e o registro de aceite do provedor caem aqui quando um teste
// não os mocka explicitamente; rpc() trata !response.ok como erro e o
// chamador (tryFinalize/recordProviderAcceptance) já absorve essa falha.
const notMocked = () => new Response('{}', { status: 500 });

describe('worker de comprovantes do orçamento', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('recusa chamada sem o segredo agendado', async () => {
    configure();
    const { result, response } = responseDouble();
    await handler(request('Bearer incorreto'), response);
    expect(result.statusCode).toBe(401);
  });

  it('não reivindica a fila enquanto nenhum provedor estiver configurado', async () => {
    configure();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);
    expect(result.statusCode).toBe(503);
    expect(result.body).toEqual({ error: 'notification_provider_not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envia e-mail transacional escapado e finaliza a entrega', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
      if (String(url).includes('/claim_site_notification_deliveries')) return new Response(JSON.stringify([emailJob]), { status: 200 });
      if (String(url) === 'https://api.resend.com/emails') return new Response('{"id":"email-provider-1"}', { status: 200 });
      if (String(url).includes('/record_site_notification_provider_acceptance')) return new Response('true', { status: 200 });
      if (String(url).includes('/finalize_site_notification_delivery')) return new Response('true', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ ok: true, claimed: 1, delivered: 1, failed: 0, inconclusive: 0 });
    const resendCall = fetchMock.mock.calls.find(([url]) => String(url) === 'https://api.resend.com/emails');
    const resendPayload = JSON.parse(String(resendCall?.[1]?.body));
    expect(resendPayload.to).toEqual(['cliente@example.test']);
    expect(resendPayload.html).toContain('Ana &amp; Cia');
    expect(resendPayload.html).toContain('Marca &lt;Teste&gt;');
    expect(resendPayload.html).not.toContain('Mochila <Premium>');
    expect(resendCall?.[1]?.headers).toMatchObject({ 'Idempotency-Key': `quote-${emailJob.requestId}-customer-email` });
    const acceptanceCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/record_site_notification_provider_acceptance'));
    expect(JSON.parse(String(acceptanceCall?.[1]?.body))).toMatchObject({ p_delivery_id: emailJob.id, p_lease_token: emailJob.leaseToken, p_provider: 'resend', p_provider_message_id: 'email-provider-1' });
    const finalizeCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/finalize_site_notification_delivery'));
    expect(JSON.parse(String(finalizeCall?.[1]?.body))).toMatchObject({ p_delivery_id: emailJob.id, p_lease_token: emailJob.leaseToken, p_status: 'sent', p_provider: 'resend', p_provider_message_id: 'email-provider-1' });
  });

  it('R01: boolean false da finalização não vira sucesso nem some silenciosamente', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    const fetchMock = vi.fn(async (url: string | URL) => {
      if (String(url).includes('/claim_site_notification_deliveries')) return new Response(JSON.stringify([emailJob]), { status: 200 });
      if (String(url) === 'https://api.resend.com/emails') return new Response('{"id":"email-provider-1"}', { status: 200 });
      if (String(url).includes('/record_site_notification_provider_acceptance')) return new Response('true', { status: 200 });
      // Simula lease expirado ou linha já alterada: o RPC responde 200 com o
      // boolean false — nenhuma linha foi de fato atualizada.
      if (String(url).includes('/finalize_site_notification_delivery')) return new Response('false', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.body).toEqual({ ok: true, claimed: 1, delivered: 0, failed: 0, inconclusive: 1 });
  });

  it('R02/R21: reconcilia em vez de reenviar quando um aceite anterior já foi persistido', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    const reconciledJob = { ...emailJob, existingProvider: 'resend', existingProviderMessageId: 'email-ja-aceito' };
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
      if (String(url).includes('/claim_site_notification_deliveries')) return new Response(JSON.stringify([reconciledJob]), { status: 200 });
      if (String(url).includes('/finalize_site_notification_delivery')) return new Response('true', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.body).toEqual({ ok: true, claimed: 1, delivered: 1, failed: 0, inconclusive: 0 });
    expect(fetchMock.mock.calls.some(([url]) => String(url) === 'https://api.resend.com/emails')).toBe(false);
    const finalizeCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/finalize_site_notification_delivery'));
    expect(JSON.parse(String(finalizeCall?.[1]?.body))).toMatchObject({ p_status: 'sent', p_provider: 'resend', p_provider_message_id: 'email-ja-aceito' });
  });

  it('tenta imediatamente a confirmação do orçamento recém-criado', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    const fetchMock = vi.fn(async (url: string | URL) => {
      if (String(url).includes('/claim_site_quote_notification')) return new Response(JSON.stringify(emailJob), { status: 200 });
      if (String(url) === 'https://api.resend.com/emails') return new Response('{"id":"email-immediate"}', { status: 200 });
      if (String(url).includes('/record_site_notification_provider_acceptance')) return new Response('true', { status: 200 });
      if (String(url).includes('/finalize_site_notification_delivery')) return new Response('true', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(deliverQuoteConfirmationsNow(emailJob.requestId, false)).resolves.toEqual({
      email: 'sent', whatsapp: 'not_requested',
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/claim_site_notification_deliveries'))).toBe(false);
  });

  it('Etapa 26: e-mail lento não impede o WhatsApp de ser tentado em paralelo', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'meta-synthetic-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '1234567890');
    vi.stubEnv('WHATSAPP_QUOTE_TEMPLATE', 'confirmacao_orcamento');
    vi.stubEnv('WHATSAPP_GRAPH_API_VERSION', 'v23.0');

    let releaseEmail: () => void = () => {};
    const emailGate = new Promise<void>((resolve) => { releaseEmail = resolve; });
    let whatsappAttempted = false;

    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const target = String(url);
      if (target.includes('/claim_site_quote_notification')) {
        const channel = (JSON.parse(String(init?.body)) as { p_channel: string }).p_channel;
        return new Response(JSON.stringify({ ...emailJob, channel }), { status: 200 });
      }
      if (target === 'https://api.resend.com/emails') {
        await emailGate;
        return new Response('{"id":"email-immediate"}', { status: 200 });
      }
      if (target.includes('graph.facebook.com')) {
        whatsappAttempted = true;
        return new Response('{"messages":[{"id":"wamid-paralelo"}]}', { status: 200 });
      }
      if (target.includes('/record_site_notification_provider_acceptance')) return new Response('true', { status: 200 });
      if (target.includes('/finalize_site_notification_delivery')) return new Response('true', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);

    const pending = deliverQuoteConfirmationsNow(emailJob.requestId, true);
    // Com um único AbortController compartilhado (design antigo), o
    // WhatsApp só seria tentado depois que o e-mail (preso aqui de
    // propósito) terminasse sua vez no laço sequencial — nunca aconteceria
    // antes de liberarmos o gate.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(whatsappAttempted).toBe(true);
    releaseEmail();
    await expect(pending).resolves.toEqual({ email: 'sent', whatsapp: 'sent' });
  });

  it('registra falha do provedor com backoff sem perder o job', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
      if (String(url).includes('/claim_site_notification_deliveries')) return new Response(JSON.stringify([{ ...emailJob, attempt: 3 }]), { status: 200 });
      if (String(url) === 'https://api.resend.com/emails') return new Response('{"message":"temporary"}', { status: 503 });
      if (String(url).includes('/finalize_site_notification_delivery')) return new Response('true', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.body).toEqual({ ok: true, claimed: 1, delivered: 0, failed: 1, inconclusive: 0 });
    const finalizeCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/finalize_site_notification_delivery'));
    expect(JSON.parse(String(finalizeCall?.[1]?.body))).toMatchObject({ p_lease_token: emailJob.leaseToken, p_status: 'failed', p_error_code: 'email_provider_503', p_retry_after_seconds: 1200 });
  });

  it('Etapa 28: drena um segundo lote quando o primeiro vem cheio', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    let claimCalls = 0;
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (String(url).includes('/claim_site_notification_deliveries')) {
        claimCalls += 1;
        const body = JSON.parse(String(init?.body)) as { p_batch_size: number };
        // Primeiro lote vem exatamente cheio (sinal de que pode haver mais
        // backlog); segundo lote vem vazio (fila esgotada por agora).
        const jobs = claimCalls === 1 ? Array.from({ length: body.p_batch_size }, (_, index) => ({ ...emailJob, id: `1111111${index}-1111-4111-8111-11111111111${index}` })) : [];
        return new Response(JSON.stringify(jobs), { status: 200 });
      }
      if (String(url) === 'https://api.resend.com/emails') return new Response('{"id":"email-provider-1"}', { status: 200 });
      if (String(url).includes('/record_site_notification_provider_acceptance')) return new Response('true', { status: 200 });
      if (String(url).includes('/finalize_site_notification_delivery')) return new Response('true', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(claimCalls).toBeGreaterThanOrEqual(2);
    expect(result.body).toMatchObject({ ok: true, failed: 0, inconclusive: 0 });
    expect((result.body as { claimed: number }).claimed).toBeGreaterThanOrEqual(1);
    expect((result.body as { delivered: number }).delivered).toBe((result.body as { claimed: number }).claimed);
  });

  it('só envia WhatsApp por template quando o canal foi enfileirado', async () => {
    configure();
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'meta-synthetic-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '1234567890');
    vi.stubEnv('WHATSAPP_QUOTE_TEMPLATE', 'confirmacao_orcamento');
    vi.stubEnv('WHATSAPP_GRAPH_API_VERSION', 'v23.0');
    const whatsappJob = { ...emailJob, channel: 'whatsapp' };
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
      if (String(url).includes('/claim_site_notification_deliveries')) return new Response(JSON.stringify([whatsappJob]), { status: 200 });
      if (String(url).includes('graph.facebook.com')) return new Response('{"messages":[{"id":"wamid-test"}]}', { status: 200 });
      if (String(url).includes('/record_site_notification_provider_acceptance')) return new Response('true', { status: 200 });
      if (String(url).includes('/finalize_site_notification_delivery')) return new Response('true', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.body).toEqual({ ok: true, claimed: 1, delivered: 1, failed: 0, inconclusive: 0 });
    const metaCall = fetchMock.mock.calls.find(([url]) => String(url).includes('graph.facebook.com'));
    const payload = JSON.parse(String(metaCall?.[1]?.body));
    expect(payload.to).toBe('5511999999999');
    expect(payload.template.name).toBe('confirmacao_orcamento');
  });

  it('WhatsApp com retomada não reenvia quando um aceite anterior já foi persistido (R19/R21)', async () => {
    configure();
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'meta-synthetic-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '1234567890');
    vi.stubEnv('WHATSAPP_QUOTE_TEMPLATE', 'confirmacao_orcamento');
    vi.stubEnv('WHATSAPP_GRAPH_API_VERSION', 'v23.0');
    const reconciledJob = { ...emailJob, channel: 'whatsapp', existingProvider: 'meta-whatsapp-cloud', existingProviderMessageId: 'wamid-ja-aceito' };
    const fetchMock = vi.fn(async (url: string | URL) => {
      if (String(url).includes('/claim_site_notification_deliveries')) return new Response(JSON.stringify([reconciledJob]), { status: 200 });
      if (String(url).includes('/finalize_site_notification_delivery')) return new Response('true', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.body).toEqual({ ok: true, claimed: 1, delivered: 1, failed: 0, inconclusive: 0 });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('graph.facebook.com'))).toBe(false);
  });
});
