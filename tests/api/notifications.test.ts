import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, { deliverQuoteConfirmationsNow, QUEUE_AGE_ALERT_SECONDS } from '../../api/notifications.js';
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
  submittedAt: '2026-09-12T12:00:00Z', desiredDeadline: '2026-10-20',
  campaign: { moment: 'onboarding', audience: 'clientes', occasion: { name: 'Dia do Cliente <Especial>', date: '2026-09-15' } },
  briefing: { actionName: 'Marca <Teste>', budgetRange: '51-100', budgetScope: 'por-pessoa', responseChannel: 'whatsapp' },
  items: [{ name: 'Mochila <Premium>', sku: 'MO-1', quantity: 100, colorName: 'Azul', decisionGroup: 'alternative', kitGroupId: '33333333-3333-4333-8333-333333333333', kitName: 'Boas-vindas <2026>', kitQuantity: 100, unitsPerKit: 1 }],
};

// A finalização e o registro de aceite do provedor caem aqui quando um teste
// não os mocka explicitamente; rpc() trata !response.ok como erro e o
// chamador (tryFinalize/recordProviderAcceptance) já absorve essa falha.
const notMocked = () => new Response('{}', { status: 500 });

describe('worker de comprovantes do orçamento', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

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

  it('Preview não envia mensagens reais mesmo se herdar credenciais dos provedores', async () => {
    configure();
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(deliverQuoteConfirmationsNow(emailJob.requestId, false)).resolves.toEqual({ email: 'pending', whatsapp: 'not_requested' });
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);
    expect(result.statusCode).toBe(503);
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
    expect(resendPayload.html).toContain('alternativa para comparar');
    expect(resendPayload.html).toContain('kit Boas-vindas &lt;2026&gt;: 100 kits × 1 un.');
    expect(resendPayload.html).toContain('Dia do Cliente &lt;Especial&gt;');
    expect(resendPayload.html).toContain('As observações livres e os dados de contato ficam apenas na área privada');
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
      if (target.includes('/record_site_notification_dispatch_started')) return new Response('true', { status: 200 });
      if (new URL(target).hostname === 'graph.facebook.com') {
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

  it('registra falha do provedor sem perder o job, sem calcular backoff no cliente', async () => {
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
    const finalizeBody = JSON.parse(String(finalizeCall?.[1]?.body));
    expect(finalizeBody).toMatchObject({ p_lease_token: emailJob.leaseToken, p_status: 'failed', p_error_code: 'email_provider_503' });
    // Backoff exponencial com jitter agora é responsabilidade exclusiva de
    // site_private.next_retry_at (plano de correções, etapa 11): o worker não
    // calcula mais um retrySeconds próprio, que sempre venceria o cálculo do
    // banco por partir de uma base maior (300s contra 60s) e o deixaria morto
    // na prática. A chave nem é enviada (undefined não serializa em JSON).
    expect(finalizeBody).not.toHaveProperty('p_retry_after_seconds');
  });

  it('respeita Retry-After numérico do provedor sem substituir o backoff do banco', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
      if (String(url).includes('/claim_site_quote_notification')) return new Response(JSON.stringify(emailJob), { status: 200 });
      if (String(url) === 'https://api.resend.com/emails') {
        return new Response('{"message":"too many requests"}', { status: 429, headers: { 'Retry-After': '120' } });
      }
      if (String(url).includes('/finalize_site_notification_delivery')) return new Response('true', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(deliverQuoteConfirmationsNow(emailJob.requestId, false)).resolves.toEqual({ email: 'pending', whatsapp: 'not_requested' });
    const finalizeCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/finalize_site_notification_delivery'));
    expect(JSON.parse(String(finalizeCall?.[1]?.body))).toMatchObject({
      p_status: 'failed', p_error_code: 'email_provider_429', p_retry_after_seconds: 120,
    });
  });

  it('aceita Retry-After por data HTTP do WhatsApp, limitado a um dia', async () => {
    configure();
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'meta-synthetic-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '1234567890');
    vi.stubEnv('WHATSAPP_QUOTE_TEMPLATE', 'confirmacao_orcamento');
    vi.stubEnv('WHATSAPP_GRAPH_API_VERSION', 'v23.0');
    const later = new Date(Date.now() + 2 * 86_400_000).toUTCString();
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
      if (String(url).includes('/claim_site_quote_notification')) return new Response(JSON.stringify({ ...emailJob, channel: 'whatsapp' }), { status: 200 });
      if (String(url).includes('/record_site_notification_dispatch_started')) return new Response('true', { status: 200 });
      if (new URL(String(url)).hostname === 'graph.facebook.com') {
        return new Response('{"error":"overloaded"}', { status: 503, headers: { 'Retry-After': later } });
      }
      if (String(url).includes('/finalize_site_notification_delivery')) return new Response('true', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(deliverQuoteConfirmationsNow(emailJob.requestId, true)).resolves.toEqual({ email: 'pending', whatsapp: 'pending' });
    const finalizeCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/finalize_site_notification_delivery'));
    expect(JSON.parse(String(finalizeCall?.[1]?.body))).toMatchObject({
      p_status: 'failed', p_error_code: 'whatsapp_provider_503', p_retry_after_seconds: 86_400,
    });
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
      if (String(url).includes('/record_site_notification_dispatch_started')) return new Response('true', { status: 200 });
      if (new URL(String(url)).hostname === 'graph.facebook.com') return new Response('{"messages":[{"id":"wamid-test"}]}', { status: 200 });
      if (String(url).includes('/record_site_notification_provider_acceptance')) return new Response('true', { status: 200 });
      if (String(url).includes('/finalize_site_notification_delivery')) return new Response('true', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.body).toEqual({ ok: true, claimed: 1, delivered: 1, failed: 0, inconclusive: 0 });
    const metaCall = fetchMock.mock.calls.find(([url]) => new URL(String(url)).hostname === 'graph.facebook.com');
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
    expect(fetchMock.mock.calls.some(([url]) => new URL(String(url)).hostname === 'graph.facebook.com')).toBe(false);
  });

  it('não chama a Meta quando a intenção durável não pôde ser confirmada no banco', async () => {
    configure();
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'meta-synthetic-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '1234567890');
    vi.stubEnv('WHATSAPP_QUOTE_TEMPLATE', 'confirmacao_orcamento');
    vi.stubEnv('WHATSAPP_GRAPH_API_VERSION', 'v23.0');
    const whatsappJob = { ...emailJob, channel: 'whatsapp' };
    const fetchMock = vi.fn(async (url: string | URL) => {
      if (String(url).includes('/claim_site_notification_deliveries')) return new Response(JSON.stringify([whatsappJob]), { status: 200 });
      if (String(url).includes('/record_site_notification_dispatch_started')) return new Response('{}', { status: 500 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.body).toEqual({ ok: true, claimed: 1, delivered: 0, failed: 0, inconclusive: 1 });
    expect(fetchMock.mock.calls.some(([url]) => new URL(String(url)).hostname === 'graph.facebook.com')).toBe(false);
  });

  it('resposta 2xx da Meta sem ID fica inconclusiva e não libera retry automático', async () => {
    configure();
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'meta-synthetic-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '1234567890');
    vi.stubEnv('WHATSAPP_QUOTE_TEMPLATE', 'confirmacao_orcamento');
    vi.stubEnv('WHATSAPP_GRAPH_API_VERSION', 'v23.0');
    const whatsappJob = { ...emailJob, channel: 'whatsapp' };
    const fetchMock = vi.fn(async (url: string | URL) => {
      if (String(url).includes('/claim_site_notification_deliveries')) return new Response(JSON.stringify([whatsappJob]), { status: 200 });
      if (String(url).includes('/record_site_notification_dispatch_started')) return new Response('true', { status: 200 });
      if (new URL(String(url)).hostname === 'graph.facebook.com') return new Response('{}', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.body).toEqual({ ok: true, claimed: 1, delivered: 0, failed: 0, inconclusive: 1 });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/finalize_site_notification_delivery'))).toBe(false);
  });
});

describe('Etapa 29: sinal de saúde da fila (reportQueueHealth, via handler)', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  function fetchMockWithQueueHealth(channels: unknown) {
    return vi.fn(async (url: string | URL, _init?: RequestInit) => {
      if (String(url).includes('/claim_site_notification_deliveries')) return new Response('[]', { status: 200 });
      if (String(url).includes('/site_notification_queue_health')) return new Response(JSON.stringify(channels), { status: 200 });
      if (String(url).includes('alertas.example.test')) return new Response('', { status: 202 });
      return notMocked();
    });
  }

  it('fila saudável: registra o snapshot em console.info e não soa alerta', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const channels = [
      { channel: 'email', oldestEligibleAgeSeconds: 60, eligibleCount: 1, exhaustedCount: 0 },
      { channel: 'whatsapp', oldestEligibleAgeSeconds: null, eligibleCount: 0, exhaustedCount: 0 },
    ];
    vi.stubGlobal('fetch', fetchMockWithQueueHealth(channels));
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.statusCode).toBe(200);
    expect(infoSpy).toHaveBeenCalledWith('site_notifications_queue_health', { channels });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('job elegível mais velho que o limiar: soa alerta com o payload do canal afetado', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const staleChannel = { channel: 'email', oldestEligibleAgeSeconds: QUEUE_AGE_ALERT_SECONDS + 1, eligibleCount: 3, exhaustedCount: 0 };
    const channels = [staleChannel, { channel: 'whatsapp', oldestEligibleAgeSeconds: null, eligibleCount: 0, exhaustedCount: 0 }];
    vi.stubGlobal('fetch', fetchMockWithQueueHealth(channels));
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.statusCode).toBe(200);
    expect(errorSpy).toHaveBeenCalledWith('site_notifications_queue_alert', { ...staleChannel, ageAlertThresholdSeconds: QUEUE_AGE_ALERT_SECONDS });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  // Etapa 42 do plano de correções: os dois testes acima só confirmavam o
  // console.error — nunca que sendOperationalAlert (o webhook de fato) era chamado.
  // Sem OPERATIONS_ALERT_WEBHOOK_URL configurado, sendOperationalAlert retorna false
  // sem abrir conexão (api/_lib/operationalAlerts.ts) — este teste configura o
  // webhook e verifica a chamada HTTP ponta a ponta.
  it('job elegível mais velho que o limiar: dispara o webhook de alerta operacional configurado', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    vi.stubEnv('OPERATIONS_ALERT_WEBHOOK_URL', 'https://alertas.example.test/hook');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const staleChannel = { channel: 'email', oldestEligibleAgeSeconds: QUEUE_AGE_ALERT_SECONDS + 1, eligibleCount: 3, exhaustedCount: 0 };
    const channels = [staleChannel, { channel: 'whatsapp', oldestEligibleAgeSeconds: null, eligibleCount: 0, exhaustedCount: 0 }];
    const fetchMock = fetchMockWithQueueHealth(channels);
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.statusCode).toBe(200);
    const alertCall = fetchMock.mock.calls.find(([url]) => String(url).includes('alertas.example.test'));
    if (!alertCall) throw new Error('O webhook de alerta operacional não foi chamado.');
    const [, init] = alertCall as [string, RequestInit];
    expect(String(init.body)).toContain('notification_queue_alert');
    expect(String(init.body)).toContain('"channel":"email"');
  });

  it('job esgotado (exhausted > 0) soa alerta mesmo com idade dentro do limiar', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const exhaustedChannel = { channel: 'whatsapp', oldestEligibleAgeSeconds: null, eligibleCount: 0, exhaustedCount: 2 };
    const channels = [{ channel: 'email', oldestEligibleAgeSeconds: null, eligibleCount: 0, exhaustedCount: 0 }, exhaustedChannel];
    vi.stubGlobal('fetch', fetchMockWithQueueHealth(channels));
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.statusCode).toBe(200);
    expect(errorSpy).toHaveBeenCalledWith('site_notifications_queue_alert', { ...exhaustedChannel, ageAlertThresholdSeconds: QUEUE_AGE_ALERT_SECONDS });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('despacho WhatsApp incerto soa alerta sem liberar reenvio automático', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const uncertainChannel = {
      channel: 'whatsapp', oldestEligibleAgeSeconds: null, eligibleCount: 0,
      exhaustedCount: 0, uncertainCount: 1,
    };
    const channels = [
      { channel: 'email', oldestEligibleAgeSeconds: null, eligibleCount: 0, exhaustedCount: 0, uncertainCount: 0 },
      uncertainChannel,
    ];
    vi.stubGlobal('fetch', fetchMockWithQueueHealth(channels));
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.statusCode).toBe(200);
    expect(errorSpy).toHaveBeenCalledWith('site_notifications_queue_alert', {
      ...uncertainChannel,
      ageAlertThresholdSeconds: QUEUE_AGE_ALERT_SECONDS,
    });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('falha ao consultar o sinal de saúde nunca derruba a resposta já concluída (melhor esforço)', async () => {
    configure();
    vi.stubEnv('RESEND_API_KEY', 're_synthetic_test_key');
    vi.stubEnv('SITE_EMAIL_FROM', 'Promo Brindes <atendimento@example.test>');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    // site_notification_queue_health cai no notMocked() (500) — rpc() lança,
    // reportQueueHealth() absorve via try/catch.
    const fetchMock = vi.fn(async (url: string | URL) => {
      if (String(url).includes('/claim_site_notification_deliveries')) return new Response('[]', { status: 200 });
      return notMocked();
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, response } = responseDouble();
    await handler(request(`Bearer ${process.env.CRON_SECRET}`), response);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ ok: true, claimed: 0, delivered: 0, failed: 0, inconclusive: 0 });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
