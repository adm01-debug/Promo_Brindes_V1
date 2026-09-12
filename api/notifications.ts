import { timingSafeEqual } from 'node:crypto';
import { getSiteDatabaseConfig } from './_lib/siteDatabase.js';
import type { ApiRequest, ApiResponse } from './_lib/leadHandler.js';

const BATCH_SIZE = 10;
const REQUEST_TIMEOUT_MS = 20_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface NotificationItem { name: string; sku: string; quantity: number; colorName?: string | null }
interface NotificationJob {
  id: string;
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
}

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

function parseJobs(value: unknown): NotificationJob[] {
  if (!Array.isArray(value) || value.length > BATCH_SIZE) throw new Error('invalid_notification_jobs');
  return value.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new Error('invalid_notification_job');
    const job = raw as Record<string, unknown>;
    if (!UUID_PATTERN.test(String(job.id)) || !UUID_PATTERN.test(String(job.requestId))
      || !['email', 'whatsapp'].includes(String(job.channel))
      || !Number.isInteger(job.attempt) || Number(job.attempt) < 1 || Number(job.attempt) > 5
      || !Array.isArray(job.items) || job.items.length > 50) throw new Error('invalid_notification_job');
    const items = job.items.map((rawItem) => {
      if (!rawItem || typeof rawItem !== 'object') throw new Error('invalid_notification_item');
      const item = rawItem as Record<string, unknown>;
      if (!Number.isInteger(item.quantity) || Number(item.quantity) < 1) throw new Error('invalid_notification_item');
      return {
        name: safeText(item.name, 240), sku: safeText(item.sku, 120), quantity: Number(item.quantity),
        colorName: safeText(item.colorName, 120) || null,
      };
    });
    return {
      id: String(job.id), requestId: String(job.requestId), channel: job.channel as NotificationJob['channel'],
      attempt: Number(job.attempt), protocol: safeText(job.protocol, 40), recipientEmail: safeText(job.recipientEmail, 160).toLowerCase(),
      recipientPhone: safeText(job.recipientPhone, 24), contactName: safeText(job.contactName, 100),
      company: safeText(job.company, 150), submittedAt: safeText(job.submittedAt, 50), items,
    };
  });
}

async function rpc<T>(name: string, body: Record<string, unknown>, signal: AbortSignal): Promise<T> {
  const config = getSiteDatabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: config.secretKey, Authorization: `Bearer ${config.secretKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
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

async function sendEmail(job: NotificationJob, signal: AbortSignal): Promise<{ provider: string; id: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = safeText(process.env.SITE_EMAIL_FROM, 200);
  if (!apiKey || !from || !job.recipientEmail.includes('@')) throw new Error('email_provider_not_configured');
  const itemLines = job.items.map((item) => `${item.quantity.toLocaleString('pt-BR')} un. · ${item.name} · cód. ${item.sku}${item.colorName ? ` · ${item.colorName}` : ''}`);
  const accountUrl = publicAccountUrl();
  const text = [
    `Olá, ${job.contactName}.`, '', `Recebemos a solicitação #${job.protocol} para ${job.company}.`, '',
    ...itemLines.map((line) => `• ${line}`), '',
    'Nosso time de especialistas vai analisar o briefing e conversar com você antes de qualquer decisão.',
    accountUrl ? `Acompanhe em: ${accountUrl}` : '', '', 'Promo Brindes · Conectando Marcas e Pessoas',
  ].filter(Boolean).join('\n');
  const itemHtml = job.items.map((item) => `<li><strong>${item.quantity.toLocaleString('pt-BR')} un.</strong> · ${html(item.name)} · cód. ${html(item.sku)}${item.colorName ? ` · ${html(item.colorName)}` : ''}</li>`).join('');
  const emailHtml = `<div style="font-family:Arial,sans-serif;color:#151515;line-height:1.55"><p>Olá, ${html(job.contactName)}.</p><h1 style="font-size:24px">Recebemos sua solicitação.</h1><p>Protocolo <strong>#${html(job.protocol)}</strong> · ${html(job.company)}</p><ul>${itemHtml}</ul><p>Nosso time de especialistas vai analisar o briefing e conversar com você antes de qualquer decisão.</p>${accountUrl ? `<p><a href="${html(accountUrl)}">Acompanhar meus orçamentos</a></p>` : ''}<p><strong>Promo Brindes</strong><br>Conectando Marcas e Pessoas</p></div>`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `quote-${job.requestId}-customer-email` },
    body: JSON.stringify({ from, to: [job.recipientEmail], subject: `Recebemos sua solicitação #${job.protocol} | Promo Brindes`, text, html: emailHtml }),
  });
  const body = await response.json().catch(() => ({})) as { id?: unknown };
  if (!response.ok || typeof body.id !== 'string') throw new Error(`email_provider_${response.status || 'invalid_response'}`);
  return { provider: 'resend', id: body.id.slice(0, 240) };
}

function whatsappRecipient(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits.length >= 12 && digits.length <= 15 ? digits : '';
}

async function sendWhatsApp(job: NotificationJob, signal: AbortSignal): Promise<{ provider: string; id: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const template = process.env.WHATSAPP_QUOTE_TEMPLATE?.trim();
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim();
  const to = whatsappRecipient(job.recipientPhone);
  if (!token || !/^\d{5,30}$/.test(phoneNumberId || '') || !/^[a-z0-9_]{2,120}$/.test(template || '') || !/^v\d{1,2}\.\d{1,2}$/.test(apiVersion || '') || !to) {
    throw new Error('whatsapp_provider_not_configured');
  }
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST', signal,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to, type: 'template',
      template: {
        name: template, language: { code: 'pt_BR' },
        components: [{ type: 'body', parameters: [
          { type: 'text', text: job.contactName }, { type: 'text', text: job.protocol }, { type: 'text', text: job.company },
        ] }],
      },
    }),
  });
  const body = await response.json().catch(() => ({})) as { messages?: Array<{ id?: unknown }> };
  const id = body.messages?.[0]?.id;
  if (!response.ok || typeof id !== 'string') throw new Error(`whatsapp_provider_${response.status || 'invalid_response'}`);
  return { provider: 'meta-whatsapp-cloud', id: id.slice(0, 240) };
}

function configuredChannels(): Array<'email' | 'whatsapp'> {
  const channels: Array<'email' | 'whatsapp'> = [];
  if (process.env.RESEND_API_KEY?.trim() && process.env.SITE_EMAIL_FROM?.trim()) channels.push('email');
  if (process.env.WHATSAPP_ACCESS_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
    && process.env.WHATSAPP_QUOTE_TEMPLATE?.trim() && process.env.WHATSAPP_GRAPH_API_VERSION?.trim()) channels.push('whatsapp');
  return channels;
}

async function finalize(job: NotificationJob, status: 'sent' | 'failed', signal: AbortSignal, delivery?: { provider: string; id: string }, errorCode?: string) {
  const retrySeconds = Math.min(86_400, 300 * (2 ** Math.max(0, job.attempt - 1)));
  await rpc<boolean>('finalize_site_notification_delivery', {
    p_delivery_id: job.id, p_status: status, p_provider: delivery?.provider || null,
    p_provider_message_id: delivery?.id || null, p_error_code: errorCode?.slice(0, 120) || null,
    p_retry_after_seconds: retrySeconds,
  }, signal);
}

async function deliverJob(job: NotificationJob, signal: AbortSignal): Promise<boolean> {
  let delivery: { provider: string; id: string };
  try {
    delivery = job.channel === 'email' ? await sendEmail(job, signal) : await sendWhatsApp(job, signal);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'provider_error';
    try { await finalize(job, 'failed', signal, undefined, code); } catch { /* processing expirará e poderá ser retomado */ }
    return false;
  }
  try {
    await finalize(job, 'sent', signal, delivery);
    return true;
  } catch {
    // O provedor já recebeu a mensagem. A chave idempotente do e-mail e o timeout
    // de processing reduzem duplicações quando a finalização precisar ser retomada.
    return false;
  }
}

export interface QuoteConfirmationResult {
  email: 'sent' | 'pending';
  whatsapp: 'sent' | 'pending' | 'not_requested';
}

export async function deliverQuoteConfirmationsNow(requestId: string, whatsappRequested: boolean): Promise<QuoteConfirmationResult> {
  const result: QuoteConfirmationResult = { email: 'pending', whatsapp: whatsappRequested ? 'pending' : 'not_requested' };
  if (!UUID_PATTERN.test(requestId)) return result;
  const configured = configuredChannels();
  const requested = configured.filter((channel) => channel === 'email' || whatsappRequested);
  if (!requested.length) return result;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    for (const channel of requested) {
      const raw = await rpc<unknown>('claim_site_quote_notification', { p_request_id: requestId, p_channel: channel }, controller.signal);
      if (!raw) continue;
      const job = parseJobs([raw])[0];
      if (!job) continue;
      const sent = await deliverJob(job, controller.signal);
      if (channel === 'email') result.email = sent ? 'sent' : 'pending';
      else result.whatsapp = sent ? 'sent' : 'pending';
    }
  } catch {
    // O protocolo já existe; falha de mensagem nunca desfaz a solicitação.
  } finally {
    clearTimeout(timeout);
  }
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const jobs = parseJobs(await rpc<unknown>('claim_site_notification_deliveries', { p_channels: channels, p_batch_size: BATCH_SIZE }, controller.signal));
    let sent = 0;
    let failed = 0;
    for (const job of jobs) {
      if (await deliverJob(job, controller.signal)) sent += 1;
      else failed += 1;
    }
    console.info('site_notifications_completed', { claimed: jobs.length, sent, failed, channels });
    response.status(200).json({ ok: true, claimed: jobs.length, sent, failed });
  } catch {
    response.status(503).json({ error: 'notification_delivery_unavailable' });
  } finally {
    clearTimeout(timeout);
  }
}
