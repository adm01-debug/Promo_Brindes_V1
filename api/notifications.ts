import { timingSafeEqual } from 'node:crypto';
import { getSiteDatabaseConfig } from './_lib/siteDatabase.js';
import type { ApiRequest, ApiResponse } from './_lib/leadHandler.js';
import { errorClass, logServerError, logServerWarning } from './_lib/observability.js';
import { OPERATIONAL_ALERT_TIMEOUT_MS, sendOperationalAlert } from './_lib/operationalAlerts.js';

const BATCH_SIZE = 10;
// Orçamento total da invocação, com folga sobre o maxDuration de 30s
// declarado em vercel.json para esta rota (Etapa 24). MIN_TIME_PER_JOB_MS é
// uma estimativa conservadora do provedor mais lento mais rede; usada tanto
// para não pedir mais jobs do que cabe no tempo restante (Etapa 25) quanto
// para decidir quando parar de tentar mais um dentro de um lote já
// reivindicado.
// Exportadas para que tests/api/maxDuration.test.ts confirme que cabem sob o
// maxDuration declarado em vercel.json (Etapa 24) sem duplicar o número.
export const OVERALL_TIME_BUDGET_MS = 25_000;
export const MIN_TIME_PER_JOB_MS = 8_000;
// Etapa 29: orçamento à parte para o sinal de saúde da fila, que roda depois
// da entrega e nunca deve competir pelo tempo reservado a ela.
export const QUEUE_HEALTH_TIMEOUT_MS = 3_000;
// Soma dos dois: o pior caso real da invocação, usado por
// tests/api/maxDuration.test.ts (Etapa 24) contra o maxDuration declarado em
// vercel.json — o sinal de saúde da fila também precisa caber.
export const TOTAL_TIME_BUDGET_MS = OVERALL_TIME_BUDGET_MS + QUEUE_HEALTH_TIMEOUT_MS + OPERATIONAL_ALERT_TIMEOUT_MS;
// Etapa 29: idade tolerável para um job elegível ainda não entregue antes de
// um alerta ativo. Calibrada em 3x a cadência do cron (Etapa 27, 15 em 15
// minutos) para tolerar até duas invocações perdidas sem soar o alarme por
// uma única execução atrasada — mesmo racional de tolerância a ruído que
// justifica o limite de 5 tentativas antes de "exhausted" (Etapa 18).
// Etapa 38: confirmado por soak test (docs/RELATORIO_SOAK_TEST_FILA_20260916.md,
// 1000 jobs sintéticos, 10% de falha injetada, duas rodadas) — p95 real de tempo de
// fila ficou em ~223-243s, ~11x abaixo deste limiar; mantido sem alteração. Mesmo o
// pior caso observado entre as duas rodadas (~20 min, um job raro que encadeou 4
// falhas seguidas) fica abaixo do limiar.
export const QUEUE_AGE_ALERT_SECONDS = 45 * 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface NotificationItem {
  name: string;
  sku: string;
  quantity: number;
  colorName?: string | null;
  decisionGroup?: 'primary' | 'alternative';
  kitGroupId?: string | null;
  kitName?: string | null;
  kitQuantity?: number | null;
  unitsPerKit?: number | null;
}
interface NotificationCampaign {
  moment?: 'onboarding' | 'evento' | 'relacionamento' | 'reconhecimento' | 'sazonal';
  audience?: 'clientes' | 'colaboradores' | 'lideranca' | 'parceiros' | 'publico-evento';
  scale?: 'ate-50' | '51-200' | '201-500' | '500-mais';
  mood?: 'util' | 'premium' | 'sustentavel' | 'tech' | 'afetivo' | 'divertido';
  occasion?: { name: string; date?: string };
}
interface NotificationBriefing {
  actionName?: string;
  budgetRange?: 'ate-25' | '26-50' | '51-100' | '101-200' | 'acima-200' | 'a-definir';
  budgetScope?: 'por-pessoa' | 'total';
  eventDate?: string;
  deadlineFlexibility?: 'flexivel' | 'data-fixa';
  responseChannel?: 'whatsapp' | 'email' | 'telefone' | 'sem-preferencia';
  brandAssetStatus?: 'logo-pronto' | 'identidade-em-criacao' | 'preciso-de-ajuda';
}
interface NotificationJob {
  id: string;
  leaseToken: string;
  /** Presentes quando uma tentativa anterior obteve aceite do provedor mas não concluiu a finalização (R01, R02). */
  existingProvider: string | null;
  existingProviderMessageId: string | null;
  requestId: string;
  channel: 'email' | 'whatsapp';
  attempt: number;
  protocol: string;
  recipientEmail: string;
  recipientPhone: string;
  contactName: string;
  company: string;
  submittedAt: string;
  items: NotificationItem[];
  desiredDeadline?: string | null;
  campaign?: NotificationCampaign;
  briefing?: NotificationBriefing;
}

/** Resultado de uma tentativa de entrega. 'inconclusive' cobre tanto uma falha
 * de rede ao chamar nosso próprio banco quanto uma finalização que retornou
 * `false` (lease expirado ou linha já alterada) — em nenhum dos dois casos
 * sabemos se o provedor efetivamente entregou, então nunca tratamos como
 * sucesso nem reenviamos automaticamente. */
type DeliveryOutcome = 'delivered' | 'failed' | 'inconclusive';

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function matchesSecret(authorization: string, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function safeText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';
}

function safeDate(value: unknown): string | undefined {
  const date = safeText(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? undefined : date;
}

function safeEnum<Value extends string>(value: unknown, values: readonly Value[]): Value | undefined {
  return typeof value === 'string' && values.includes(value as Value) ? value as Value : undefined;
}

function safeCampaign(value: unknown): NotificationCampaign | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const occasionRaw = raw.occasion;
  const occasion = occasionRaw && typeof occasionRaw === 'object' && !Array.isArray(occasionRaw)
    ? { name: safeText((occasionRaw as Record<string, unknown>).name, 120), date: safeDate((occasionRaw as Record<string, unknown>).date) }
    : undefined;
  const result: NotificationCampaign = {
    moment: safeEnum(raw.moment, ['onboarding', 'evento', 'relacionamento', 'reconhecimento', 'sazonal']),
    audience: safeEnum(raw.audience, ['clientes', 'colaboradores', 'lideranca', 'parceiros', 'publico-evento']),
    scale: safeEnum(raw.scale, ['ate-50', '51-200', '201-500', '500-mais']),
    mood: safeEnum(raw.mood, ['util', 'premium', 'sustentavel', 'tech', 'afetivo', 'divertido']),
    ...(occasion?.name ? { occasion } : {}),
  };
  return Object.keys(result).length ? result : undefined;
}

function safeBriefing(value: unknown): NotificationBriefing | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const result: NotificationBriefing = {
    actionName: safeText(raw.actionName, 100) || undefined,
    budgetRange: safeEnum(raw.budgetRange, ['ate-25', '26-50', '51-100', '101-200', 'acima-200', 'a-definir']),
    budgetScope: safeEnum(raw.budgetScope, ['por-pessoa', 'total']),
    eventDate: safeDate(raw.eventDate),
    deadlineFlexibility: safeEnum(raw.deadlineFlexibility, ['flexivel', 'data-fixa']),
    responseChannel: safeEnum(raw.responseChannel, ['whatsapp', 'email', 'telefone', 'sem-preferencia']),
    brandAssetStatus: safeEnum(raw.brandAssetStatus, ['logo-pronto', 'identidade-em-criacao', 'preciso-de-ajuda']),
  };
  return Object.values(result).some(Boolean) ? result : undefined;
}

class ProviderDeliveryError extends Error {
  constructor(code: string, readonly retryAfterSeconds: number | null, readonly definitiveRejection = true) {
    super(code);
  }
}

function retryAfterSeconds(response: Response): number | null {
  if (response.status !== 429 && response.status !== 503) return null;
  const value = response.headers.get('Retry-After')?.trim();
  if (!value || value.length > 128) return null;
  let seconds: number;
  if (/^\d{1,10}$/.test(value)) seconds = Number(value);
  else {
    const date = Date.parse(value);
    if (!Number.isFinite(date)) return null;
    seconds = Math.ceil((date - Date.now()) / 1_000);
  }
  return Math.min(86_400, Math.max(0, seconds));
}

function parseJobs(value: unknown): NotificationJob[] {
  if (!Array.isArray(value) || value.length > BATCH_SIZE) throw new Error('invalid_notification_jobs');
  return value.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new Error('invalid_notification_job');
    const job = raw as Record<string, unknown>;
    if (!UUID_PATTERN.test(String(job.id)) || !UUID_PATTERN.test(String(job.leaseToken)) || !UUID_PATTERN.test(String(job.requestId))
      || !['email', 'whatsapp'].includes(String(job.channel))
      || !Number.isInteger(job.attempt) || Number(job.attempt) < 1 || Number(job.attempt) > 5
      || !Array.isArray(job.items) || job.items.length > 50) throw new Error('invalid_notification_job');
    const items = job.items.map((rawItem) => {
      if (!rawItem || typeof rawItem !== 'object') throw new Error('invalid_notification_item');
      const item = rawItem as Record<string, unknown>;
      if (!Number.isInteger(item.quantity) || Number(item.quantity) < 1) throw new Error('invalid_notification_item');
      const kitGroupId = safeText(item.kitGroupId, 36) || null;
      const kitName = safeText(item.kitName, 100) || null;
      const kitQuantity = Number.isInteger(item.kitQuantity) && Number(item.kitQuantity) > 0 ? Number(item.kitQuantity) : null;
      const unitsPerKit = Number.isInteger(item.unitsPerKit) && Number(item.unitsPerKit) > 0 ? Number(item.unitsPerKit) : null;
      const completeKit = kitGroupId && kitName && kitQuantity && unitsPerKit;
      return {
        name: safeText(item.name, 240), sku: safeText(item.sku, 120), quantity: Number(item.quantity),
        colorName: safeText(item.colorName, 120) || null,
        decisionGroup: safeEnum(item.decisionGroup, ['primary', 'alternative']),
        ...(completeKit ? { kitGroupId, kitName, kitQuantity, unitsPerKit } : {}),
      };
    });
    return {
      id: String(job.id), leaseToken: String(job.leaseToken),
      existingProvider: safeText(job.existingProvider, 80) || null,
      existingProviderMessageId: safeText(job.existingProviderMessageId, 240) || null,
      requestId: String(job.requestId), channel: job.channel as NotificationJob['channel'],
      attempt: Number(job.attempt), protocol: safeText(job.protocol, 40), recipientEmail: safeText(job.recipientEmail, 160).toLowerCase(),
      recipientPhone: safeText(job.recipientPhone, 24), contactName: safeText(job.contactName, 100),
      company: safeText(job.company, 150), submittedAt: safeText(job.submittedAt, 50), items,
      desiredDeadline: safeDate(job.desiredDeadline) || null,
      campaign: safeCampaign(job.campaign),
      briefing: safeBriefing(job.briefing),
    };
  });
}

async function rpc<T>(name: string, body: Record<string, unknown>, signal: AbortSignal): Promise<T> {
  const config = getSiteDatabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: config.serviceCredential, Authorization: `Bearer ${config.serviceCredential}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body), signal,
  });
  if (!response.ok) throw new Error(`notification_${name}_failed`);
  return response.json() as Promise<T>;
}

function html(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

function publicAccountUrl(): string {
  const origin = process.env.SITE_PUBLIC_ORIGIN?.trim() || '';
  try { return `${new URL(origin).origin}/minha-conta`; } catch { return ''; }
}

function localizedDate(value?: string | null): string | undefined {
  const valid = safeDate(value);
  return valid ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'long' }).format(new Date(`${valid}T12:00:00.000Z`)) : undefined;
}

const campaignLabels = {
  moment: { onboarding: 'Onboarding', evento: 'Evento', relacionamento: 'Relacionamento', reconhecimento: 'Reconhecimento', sazonal: 'Data especial' },
  audience: { clientes: 'Clientes', colaboradores: 'Colaboradores', lideranca: 'Liderança', parceiros: 'Parceiros', 'publico-evento': 'Público de evento' },
  scale: { 'ate-50': 'Até 50 pessoas', '51-200': '51–200 pessoas', '201-500': '201–500 pessoas', '500-mais': '500+ pessoas' },
  mood: { util: 'Útil', premium: 'Premium', sustentavel: 'Sustentável', tech: 'Tech', afetivo: 'Afetivo', divertido: 'Divertido' },
} as const;

const briefingLabels = {
  budgetRange: { 'ate-25': 'Até R$ 25', '26-50': 'De R$ 26 a R$ 50', '51-100': 'De R$ 51 a R$ 100', '101-200': 'De R$ 101 a R$ 200', 'acima-200': 'Acima de R$ 200', 'a-definir': 'Verba a definir' },
  budgetScope: { 'por-pessoa': 'por pessoa', total: 'no total da ação' },
  deadlineFlexibility: { flexivel: 'Recebimento com data flexível', 'data-fixa': 'Recebimento em data fixa' },
  responseChannel: { whatsapp: 'Contato por WhatsApp', email: 'Contato por e-mail', telefone: 'Contato por telefone', 'sem-preferencia': 'Sem preferência de contato' },
  brandAssetStatus: { 'logo-pronto': 'Logo pronto para compartilhar', 'identidade-em-criacao': 'Identidade visual em criação', 'preciso-de-ajuda': 'Preciso de ajuda com o direcionamento visual' },
} as const;

function confirmationContext(job: NotificationJob): string[] {
  const campaign = job.campaign;
  const briefing = job.briefing;
  return [
    job.desiredDeadline ? `Recebimento desejado: ${localizedDate(job.desiredDeadline)}` : '',
    campaign?.occasion?.name ? `Data especial: ${campaign.occasion.name}${localizedDate(campaign.occasion.date) ? ` (${localizedDate(campaign.occasion.date)})` : ''}` : '',
    campaign?.moment ? campaignLabels.moment[campaign.moment] : '',
    campaign?.audience ? campaignLabels.audience[campaign.audience] : '',
    campaign?.scale ? campaignLabels.scale[campaign.scale] : '',
    campaign?.mood ? campaignLabels.mood[campaign.mood] : '',
    briefing?.actionName ? `Ação: ${briefing.actionName}` : '',
    briefing?.budgetRange ? `${briefingLabels.budgetRange[briefing.budgetRange]}${briefing.budgetScope ? ` ${briefingLabels.budgetScope[briefing.budgetScope]}` : ''}` : '',
    briefing?.eventDate ? `Evento em ${localizedDate(briefing.eventDate)}` : '',
    briefing?.deadlineFlexibility ? briefingLabels.deadlineFlexibility[briefing.deadlineFlexibility] : '',
    briefing?.responseChannel ? briefingLabels.responseChannel[briefing.responseChannel] : '',
    briefing?.brandAssetStatus ? briefingLabels.brandAssetStatus[briefing.brandAssetStatus] : '',
  ].filter((value): value is string => Boolean(value));
}

function itemDescription(item: NotificationItem): string {
  const details = [
    `${item.quantity.toLocaleString('pt-BR')} un.`,
    item.name,
    `cód. ${item.sku}`,
    item.colorName || '',
    item.decisionGroup === 'alternative' ? 'alternativa para comparar' : '',
    item.kitName && item.kitQuantity && item.unitsPerKit ? `kit ${item.kitName}: ${item.kitQuantity.toLocaleString('pt-BR')} kits × ${item.unitsPerKit} un.` : '',
  ].filter(Boolean);
  return details.join(' · ');
}

async function sendEmail(job: NotificationJob, signal: AbortSignal): Promise<{ provider: string; id: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = safeText(process.env.SITE_EMAIL_FROM, 200);
  if (!apiKey || !from || !job.recipientEmail.includes('@')) throw new Error('email_provider_not_configured');
  const itemLines = job.items.map(itemDescription);
  const contextLines = confirmationContext(job);
  const accountUrl = publicAccountUrl();
  const text = [
    `Olá, ${job.contactName}.`, '', `Recebemos a solicitação #${job.protocol} para ${job.company}.`, '',
    ...itemLines.map((line) => `• ${line}`),
    ...(contextLines.length ? ['Contexto registrado:', ...contextLines.map((line) => `• ${line}`)] : []),
    '', 'As observações livres e os dados de contato ficam apenas na área privada para preservar sua privacidade.',
    'Nosso time de especialistas vai analisar o briefing e conversar com você antes de qualquer decisão.',
    accountUrl ? `Acompanhe em: ${accountUrl}` : '', '', 'Promo Brindes · Conectando Marcas e Pessoas',
  ].filter(Boolean).join('\n');
  const itemHtml = job.items.map((item) => `<li>${html(itemDescription(item))}</li>`).join('');
  const contextHtml = contextLines.length ? `<h2 style="font-size:18px">Contexto registrado</h2><ul>${contextLines.map((line) => `<li>${html(line)}</li>`).join('')}</ul>` : '';
  const emailHtml = `<div style="font-family:Arial,sans-serif;color:#151515;line-height:1.55"><p>Olá, ${html(job.contactName)}.</p><h1 style="font-size:24px">Recebemos sua solicitação.</h1><p>Protocolo <strong>#${html(job.protocol)}</strong> · ${html(job.company)}</p><h2 style="font-size:18px">Seleção enviada</h2><ul>${itemHtml}</ul>${contextHtml}<p>As observações livres e os dados de contato ficam apenas na área privada para preservar sua privacidade.</p><p>Nosso time de especialistas vai analisar o briefing e conversar com você antes de qualquer decisão.</p>${accountUrl ? `<p><a href="${html(accountUrl)}">Acompanhar meus orçamentos</a></p>` : ''}<p><strong>Promo Brindes</strong><br>Conectando Marcas e Pessoas</p></div>`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `quote-${job.requestId}-customer-email` },
    body: JSON.stringify({ from, to: [job.recipientEmail], subject: `Recebemos sua solicitação #${job.protocol} | Promo Brindes`, text, html: emailHtml }),
  });
  const body = await response.json().catch(() => ({})) as { id?: unknown };
  if (!response.ok || typeof body.id !== 'string') {
    throw new ProviderDeliveryError(`email_provider_${response.status || 'invalid_response'}`, retryAfterSeconds(response));
  }
  return { provider: 'resend', id: body.id.slice(0, 240) };
}

function whatsappRecipient(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits.length >= 12 && digits.length <= 15 ? digits : '';
}

interface WhatsAppRequestConfig {
  token: string;
  phoneNumberId: string;
  template: string;
  apiVersion: string;
  to: string;
}

function whatsappRequestConfig(job: NotificationJob): WhatsAppRequestConfig {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const template = process.env.WHATSAPP_QUOTE_TEMPLATE?.trim();
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim();
  const to = whatsappRecipient(job.recipientPhone);
  if (!token || !/^\d{5,30}$/.test(phoneNumberId || '') || !/^[a-z0-9_]{2,120}$/.test(template || '') || !/^v\d{1,2}\.\d{1,2}$/.test(apiVersion || '') || !to) {
    throw new Error('whatsapp_provider_not_configured');
  }
  return { token, phoneNumberId: phoneNumberId || '', template: template || '', apiVersion: apiVersion || '', to };
}

async function sendWhatsApp(job: NotificationJob, signal: AbortSignal, config = whatsappRequestConfig(job)): Promise<{ provider: string; id: string }> {
  const response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
    method: 'POST', signal,
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to: config.to, type: 'template',
      template: {
        name: config.template, language: { code: 'pt_BR' },
        components: [{ type: 'body', parameters: [
          { type: 'text', text: job.contactName }, { type: 'text', text: job.protocol }, { type: 'text', text: job.company },
        ] }],
      },
    }),
  });
  const body = await response.json().catch(() => ({})) as { messages?: Array<{ id?: unknown }> };
  const id = body.messages?.[0]?.id;
  if (!response.ok || typeof id !== 'string') {
    // HTTP não-2xx confirma rejeição e permite retry. Já um 2xx sem ID deixa
    // o aceite incerto: reenviar automaticamente poderia duplicar a mensagem.
    throw new ProviderDeliveryError(
      `whatsapp_provider_${response.status || 'invalid_response'}`,
      retryAfterSeconds(response),
      !response.ok,
    );
  }
  return { provider: 'meta-whatsapp-cloud', id: id.slice(0, 240) };
}

function configuredChannels(): Array<'email' | 'whatsapp'> {
  // Deploys de Preview nunca disparam mensagens reais, mesmo que herdem
  // acidentalmente credenciais de produção na Vercel.
  if (process.env.VERCEL_ENV === 'preview') return [];
  const channels: Array<'email' | 'whatsapp'> = [];
  if (process.env.RESEND_API_KEY?.trim() && process.env.SITE_EMAIL_FROM?.trim()) channels.push('email');
  if (process.env.WHATSAPP_ACCESS_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
    && process.env.WHATSAPP_QUOTE_TEMPLATE?.trim() && process.env.WHATSAPP_GRAPH_API_VERSION?.trim()) channels.push('whatsapp');
  return channels;
}

/** Finaliza e devolve o boolean real do banco (R01): `false` significa que a
 * linha não foi atualizada (lease expirado ou status já mudou) e nunca deve
 * ser tratado como sucesso. */
async function finalize(job: NotificationJob, status: 'sent' | 'failed', signal: AbortSignal, delivery?: { provider: string; id: string }, errorCode?: string, providerRetryAfter?: number | null): Promise<boolean> {
  // O backoff exponencial com jitter agora é calculado no banco por
  // site_private.next_retry_at (plano de correções, etapa 11): não enviamos
  // mais um retrySeconds calculado aqui, que sempre venceria o cálculo do
  // banco por ser maior (base de 300s contra 60s) e o deixaria morto na
  // prática. p_retry_after_seconds só recebe um Retry-After válido do
  // provedor; sem esse header, a função usa apenas a política do banco.
  return rpc<boolean>('finalize_site_notification_delivery', {
    p_delivery_id: job.id, p_lease_token: job.leaseToken, p_status: status, p_provider: delivery?.provider || null,
    p_provider_message_id: delivery?.id || null, p_error_code: errorCode?.slice(0, 120) || null,
    p_retry_after_seconds: providerRetryAfter ?? undefined,
  }, signal);
}

/** Envolve finalize() para nunca deixar uma falha de rede ao próprio banco
 * escapar como exceção — o chamador só precisa saber se a finalização foi
 * confirmada (R01): tanto um `throw` quanto um `false` explícito significam
 * "não confirmado", tratados da mesma forma pelo chamador. */
async function tryFinalize(job: NotificationJob, status: 'sent' | 'failed', signal: AbortSignal, delivery?: { provider: string; id: string }, errorCode?: string, providerRetryAfter?: number | null): Promise<boolean> {
  try {
    return await finalize(job, status, signal, delivery, errorCode, providerRetryAfter);
  } catch {
    return false;
  }
}

/** Persiste o aceite do provedor assim que ele responde, antes da
 * finalização (R01, R02, R21): se a finalização falhar em seguida, a
 * próxima tentativa vê existingProvider/existingProviderMessageId e
 * reconcilia em vez de reenviar — inclusive para o WhatsApp, cuja API não
 * oferece uma chave de idempotência própria como a do Resend. Melhor
 * esforço: seu insucesso não impede a finalização de tentar persistir o
 * mesmo par logo em seguida. */
async function recordProviderAcceptance(job: NotificationJob, delivery: { provider: string; id: string }, signal: AbortSignal): Promise<void> {
  try {
    await rpc<boolean>('record_site_notification_provider_acceptance', {
      p_delivery_id: job.id, p_lease_token: job.leaseToken, p_provider: delivery.provider, p_provider_message_id: delivery.id,
    }, signal);
  } catch (error) {
    logServerWarning('site_notification_provider_acceptance_unconfirmed', { requestId: job.requestId, channel: job.channel, errorClass: errorClass(error) });
  }
}

async function recordWhatsAppDispatchStarted(job: NotificationJob, signal: AbortSignal): Promise<boolean> {
  try {
    return await rpc<boolean>('record_site_notification_dispatch_started', {
      p_delivery_id: job.id,
      p_lease_token: job.leaseToken,
    }, signal);
  } catch (error) {
    logServerWarning('site_notification_dispatch_start_unconfirmed', {
      requestId: job.requestId,
      channel: job.channel,
      errorClass: errorClass(error),
    });
    return false;
  }
}

async function deliverJob(job: NotificationJob, signal: AbortSignal): Promise<DeliveryOutcome> {
  // Reconciliação: uma tentativa anterior já obteve aceite do provedor, mas
  // não concluiu a finalização. Não reenvia a mensagem — apenas finaliza.
  if (job.existingProvider && job.existingProviderMessageId) {
    const confirmed = await tryFinalize(job, 'sent', signal, { provider: job.existingProvider, id: job.existingProviderMessageId });
    return confirmed ? 'delivered' : 'inconclusive';
  }

  let delivery: { provider: string; id: string };
  let whatsappConfig: WhatsAppRequestConfig | undefined;
  if (job.channel === 'whatsapp') {
    try {
      // Valida tudo antes de gravar a intenção. Assim uma configuração ausente
      // continua sendo uma falha recuperável sem colocar o job em revisão manual.
      whatsappConfig = whatsappRequestConfig(job);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'provider_error';
      const confirmed = await tryFinalize(job, 'failed', signal, undefined, code);
      return confirmed ? 'failed' : 'inconclusive';
    }
    // A Meta não oferece chave de idempotência. A intenção durável precede a
    // chamada externa; se a resposta se perder, o banco bloqueia reenvio cego.
    if (!await recordWhatsAppDispatchStarted(job, signal)) return 'inconclusive';
  }
  try {
    delivery = job.channel === 'email' ? await sendEmail(job, signal) : await sendWhatsApp(job, signal, whatsappConfig);
  } catch (error) {
    if (job.channel === 'whatsapp'
      && (!(error instanceof ProviderDeliveryError) || !error.definitiveRejection)) {
      logServerWarning('site_notification_whatsapp_dispatch_uncertain', {
        requestId: job.requestId,
        channel: job.channel,
        errorClass: errorClass(error),
      });
      return 'inconclusive';
    }
    const code = error instanceof Error ? error.message : 'provider_error';
    const confirmed = await tryFinalize(job, 'failed', signal, undefined, code,
      error instanceof ProviderDeliveryError ? error.retryAfterSeconds : null);
    return confirmed ? 'failed' : 'inconclusive';
  }

  await recordProviderAcceptance(job, delivery, signal);
  const confirmed = await tryFinalize(job, 'sent', signal, delivery);
  return confirmed ? 'delivered' : 'inconclusive';
}

interface ChannelQueueHealth {
  channel: 'email' | 'whatsapp';
  oldestEligibleAgeSeconds: number | null;
  eligibleCount: number;
  exhaustedCount: number;
  uncertainCount?: number;
}

/** Etapa 29: sinal ativo de acúmulo ou job preso na fila, em vez de
 * descoberta manual — o único sinal anterior (`site_notifications_completed`
 * abaixo) só cobre o lote já processado na invocação atual, nunca o que
 * ficou para trás. Melhor esforço: uma falha aqui nunca pode derrubar a
 * resposta da invocação, cujo trabalho de entrega já terminou antes desta
 * chamada. `console.error` funciona como o sinal mínimo (visível em log);
 * `sendOperationalAlert` (Etapa 42) dispara o webhook quando configurado. */
async function reportQueueHealth(): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), QUEUE_HEALTH_TIMEOUT_MS);
    let channels: ChannelQueueHealth[];
    try {
      channels = await rpc<ChannelQueueHealth[]>('site_notification_queue_health', {}, controller.signal);
    } finally {
      clearTimeout(timeout);
    }
    console.info('site_notifications_queue_health', { channels });
    for (const health of channels) {
      const stale = health.oldestEligibleAgeSeconds !== null && health.oldestEligibleAgeSeconds > QUEUE_AGE_ALERT_SECONDS;
      if (stale || health.exhaustedCount > 0 || Number(health.uncertainCount || 0) > 0) {
        console.error('site_notifications_queue_alert', { ...health, ageAlertThresholdSeconds: QUEUE_AGE_ALERT_SECONDS });
        const alerted = await sendOperationalAlert('notification_queue_alert', {
          channel: health.channel,
          oldestEligibleAgeSeconds: health.oldestEligibleAgeSeconds,
          eligibleCount: health.eligibleCount,
          exhaustedCount: health.exhaustedCount,
          uncertainCount: Number(health.uncertainCount || 0),
          ageAlertThresholdSeconds: QUEUE_AGE_ALERT_SECONDS,
        });
        if (process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim() && !alerted) {
          logServerWarning('site_notifications_queue_alert_delivery_failed', { channel: health.channel });
        }
      }
    }
  } catch (error) {
    // Melhor esforço — ver comentário acima.
    logServerWarning('site_notifications_queue_health_unavailable', { errorClass: errorClass(error) });
  }
}

export interface QuoteConfirmationResult {
  email: 'sent' | 'pending';
  whatsapp: 'sent' | 'pending' | 'not_requested';
}

export async function deliverQuoteConfirmationsNow(requestId: string, whatsappRequested: boolean, correlationId?: string): Promise<QuoteConfirmationResult> {
  const result: QuoteConfirmationResult = { email: 'pending', whatsapp: whatsappRequested ? 'pending' : 'not_requested' };
  if (!UUID_PATTERN.test(requestId)) return result;
  const configured = configuredChannels();
  const requested = configured.filter((channel) => channel === 'email' || whatsappRequested);
  if (!requested.length) return result;

  // Cada canal roda em paralelo com seu próprio orçamento de 7s (Etapa 26):
  // um e-mail lento não pode consumir o tempo do WhatsApp até zero, como
  // acontecia com um único AbortController compartilhado entre os dois.
  async function deliverChannel(channel: 'email' | 'whatsapp'): Promise<'sent' | 'pending'> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7_000);
    try {
      const raw = await rpc<unknown>('claim_site_quote_notification', { p_request_id: requestId, p_channel: channel }, controller.signal);
      if (!raw) return 'pending';
      const job = parseJobs([raw])[0];
      if (!job) return 'pending';
      const outcome = await deliverJob(job, controller.signal);
      return outcome === 'delivered' ? 'sent' : 'pending';
    } catch (error) {
      // O protocolo já existe; falha de mensagem em um canal nunca desfaz a
      // solicitação nem afeta o orçamento do outro canal.
      logServerWarning('site_quote_confirmation_pending', { requestId, channel, correlationId: correlationId || null, errorClass: errorClass(error) });
      return 'pending';
    } finally {
      clearTimeout(timeout);
    }
  }

  const settled = await Promise.allSettled(requested.map(async (channel) => ({ channel, status: await deliverChannel(channel) })));
  for (const outcome of settled) {
    if (outcome.status !== 'fulfilled') continue;
    if (outcome.value.channel === 'email') result.email = outcome.value.status;
    else result.whatsapp = outcome.value.status;
  }
  console.info('site_quote_confirmations_completed', { requestId, correlationId: correlationId || null, email: result.email, whatsapp: result.whatsapp });
  return result;
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
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || cronSecret.length < 32 || !matchesSecret(header(request, 'authorization'), cronSecret)) {
    response.status(401).json({ error: 'unauthorized' });
    return;
  }
  const channels = configuredChannels();
  if (!channels.length) {
    response.status(503).json({ error: 'notification_provider_not_configured' });
    return;
  }
  const deadline = Date.now() + OVERALL_TIME_BUDGET_MS;
  let claimed = 0;
  let delivered = 0;
  let failed = 0;
  let inconclusive = 0;
  try {
    // Drena lotes sucessivos enquanto houver orçamento e backlog (Etapa 28),
    // em vez de se limitar a um único lote de BATCH_SIZE por invocação.
    while (Date.now() < deadline - MIN_TIME_PER_JOB_MS) {
      const remainingMs = deadline - Date.now();
      // Não pede mais jobs do que cabe no tempo restante (Etapa 25): pedir e
      // depois abortar no meio deixaria jobs reivindicados sem tentativa
      // alguma até a próxima janela de recuperação.
      const batchSize = Math.max(1, Math.min(BATCH_SIZE, Math.floor(remainingMs / MIN_TIME_PER_JOB_MS)));
      const claimController = new AbortController();
      const claimTimeout = setTimeout(() => claimController.abort(), remainingMs);
      let jobs: NotificationJob[];
      try {
        jobs = parseJobs(await rpc<unknown>('claim_site_notification_deliveries', { p_channels: channels, p_batch_size: batchSize }, claimController.signal));
      } finally {
        clearTimeout(claimTimeout);
      }
      if (!jobs.length) break;
      claimed += jobs.length;
      for (const job of jobs) {
        if (Date.now() >= deadline - MIN_TIME_PER_JOB_MS) break;
        const jobController = new AbortController();
        const jobTimeout = setTimeout(() => jobController.abort(), Math.max(1_000, deadline - Date.now()));
        try {
          const outcome = await deliverJob(job, jobController.signal);
          if (outcome === 'delivered') delivered += 1;
          else if (outcome === 'failed') failed += 1;
          else inconclusive += 1;
          console.info('site_notification_delivery_processed', { requestId: job.requestId, channel: job.channel, attempt: job.attempt, outcome });
        } finally {
          clearTimeout(jobTimeout);
        }
      }
      // Lote não cheio: a fila elegível provavelmente esgotou por agora.
      if (jobs.length < batchSize) break;
    }
    console.info('site_notifications_completed', { claimed, delivered, failed, inconclusive, channels });
    await reportQueueHealth();
    response.status(200).json({ ok: true, claimed, delivered, failed, inconclusive });
  } catch (error) {
    logServerError('site_notifications_failed', { errorClass: errorClass(error), claimed, delivered, failed, inconclusive, channels });
    const alerted = await sendOperationalAlert('notification_cron_failed', { errorClass: errorClass(error), claimed, delivered, failed, inconclusive, channels });
    if (process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim() && !alerted) logServerWarning('site_notifications_failure_alert_delivery_failed', {});
    response.status(503).json({ error: 'notification_delivery_unavailable' });
  }
}
