import type { CampaignBrief, QuoteBriefingDetails, QuoteContact, QuoteItem, QuoteRequestPayload } from '../types';
import { createClientRequestId, postJson } from './http';
import { normalizeQuoteItems } from './quoteItems';
import { normalizeQuoteBriefing, quoteBriefingSummary } from './quoteBriefing';
import { campaignBriefLabels } from './campaignBrief';

const DEFAULT_CONTACT_EMAIL = 'adm01@promobrindes.com.br';

export function sanitizeLeadPageUrl(candidate: string): string {
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

export function buildQuotePayload(
  contact: QuoteContact,
  items: QuoteItem[],
  pageUrl = typeof window === 'undefined' ? '' : window.location.href,
  submittedAt = new Date().toISOString(),
  clientRequestId = createClientRequestId(),
  campaign?: CampaignBrief,
  briefing?: QuoteBriefingDetails,
): QuoteRequestPayload {
  const { privacyAccepted: _privacyAccepted, whatsappCopyAccepted: _whatsappCopyAccepted, ...safeContact } = contact;
  const normalizedBriefing = normalizeQuoteBriefing(briefing);
  return {
    contact: safeContact,
    items: normalizeQuoteItems(items),
    ...(campaign ? { campaign } : {}),
    ...(normalizedBriefing ? { briefing: normalizedBriefing } : {}),
    consent: { accepted: contact.privacyAccepted, noticeVersion: '2026-09-08', acceptedAt: submittedAt },
    source: 'site-promo-brindes',
    submittedAt,
    pageUrl: sanitizeLeadPageUrl(pageUrl),
    clientRequestId,
    notificationPreferences: { emailCopy: true, whatsappCopy: contact.whatsappCopyAccepted },
  };
}

export function buildEmailHref(payload: QuoteRequestPayload, email = DEFAULT_CONTACT_EMAIL): string {
  const itemLines = payload.items.map(
    (item, index) =>
      `${index + 1}. ${item.name} — cód. ${item.sku} — ${item.quantity.toLocaleString('pt-BR')} un.${item.colorName ? ` — cor: ${item.colorName}` : ''}${item.decisionGroup ? ` — prioridade: ${item.decisionGroup === 'alternative' ? 'alternativa' : 'principal'}` : ''}`,
  );
  const body = [
    'Olá, time de especialistas da Promo Brindes!',
    '',
    'Gostaria de receber uma proposta para esta seleção:',
    ...itemLines,
    '',
    `Nome: ${payload.contact.name}`,
    `Empresa: ${payload.contact.company}`,
    `E-mail: ${payload.contact.email}`,
    `Telefone: ${payload.contact.phone}`,
    payload.contact.city ? `Cidade/UF: ${payload.contact.city}` : '',
    payload.contact.deadline ? `Prazo desejado: ${payload.contact.deadline}` : '',
    ...campaignBriefLabels(payload.campaign).map((label) => `Direção da campanha: ${label}`),
    ...quoteBriefingSummary(payload.briefing),
    payload.contact.notes ? `Observações: ${payload.contact.notes}` : '',
    '',
    'Aguardo o contato. Obrigado!',
  ].filter(Boolean).join('\n');
  const subject = `Solicitação de orçamento — ${payload.contact.company}`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export type SubmitResult =
  | { mode: 'endpoint'; requestId?: string; confirmations?: { email: 'sent' | 'pending'; whatsapp: 'sent' | 'pending' | 'not_requested' } }
  | { mode: 'email'; href: string };

function confirmationResult(value: unknown): Extract<SubmitResult, { mode: 'endpoint' }>['confirmations'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const result = value as Record<string, unknown>;
  const email = result.email === 'sent' ? 'sent' : 'pending';
  const whatsapp = result.whatsapp === 'sent' || result.whatsapp === 'pending' ? result.whatsapp : 'not_requested';
  return { email, whatsapp };
}

export async function submitQuoteRequest(payload: QuoteRequestPayload): Promise<SubmitResult> {
  const endpoint = import.meta.env.VITE_QUOTE_REQUEST_ENDPOINT?.trim();
  if (!endpoint) {
    const email = import.meta.env.VITE_CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_EMAIL;
    return { mode: 'email', href: buildEmailHref(payload, email) };
  }
  const data = await postJson(endpoint, payload, 'orçamento', payload.clientRequestId);
  return {
    mode: 'endpoint',
    requestId: data.requestId,
    confirmations: confirmationResult(data.confirmations),
  };
}
