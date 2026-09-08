import type { QuoteContact, QuoteItem, QuoteRequestPayload } from '../types';
import { createClientRequestId, postJson } from './http';
import { normalizeQuoteItems } from './quoteItems';

const DEFAULT_CONTACT_EMAIL = 'adm01@promobrindes.com.br';

export function buildQuotePayload(
  contact: QuoteContact,
  items: QuoteItem[],
  pageUrl = typeof window === 'undefined' ? '' : window.location.href,
  submittedAt = new Date().toISOString(),
  clientRequestId = createClientRequestId(),
): QuoteRequestPayload {
  const { privacyAccepted: _privacyAccepted, ...safeContact } = contact;
  return {
    contact: safeContact,
    items: normalizeQuoteItems(items),
    consent: { accepted: contact.privacyAccepted, noticeVersion: '2026-09-08', acceptedAt: submittedAt },
    source: 'site-promo-brindes',
    submittedAt,
    pageUrl,
    clientRequestId,
  };
}

export function buildEmailHref(payload: QuoteRequestPayload, email = DEFAULT_CONTACT_EMAIL): string {
  const itemLines = payload.items.map(
    (item, index) =>
      `${index + 1}. ${item.name} — cód. ${item.sku} — ${item.quantity.toLocaleString('pt-BR')} un.${item.colorName ? ` — cor: ${item.colorName}` : ''}`,
  );
  const body = [
    'Olá, equipe Promo Brindes!',
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
    payload.contact.notes ? `Observações: ${payload.contact.notes}` : '',
    '',
    'Aguardo o contato. Obrigado!',
  ].filter(Boolean).join('\n');
  const subject = `Solicitação de orçamento — ${payload.contact.company}`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export type SubmitResult =
  | { mode: 'endpoint'; requestId?: string }
  | { mode: 'email'; href: string };

export async function submitQuoteRequest(payload: QuoteRequestPayload): Promise<SubmitResult> {
  const endpoint = import.meta.env.VITE_QUOTE_REQUEST_ENDPOINT?.trim();
  if (!endpoint) {
    const email = import.meta.env.VITE_CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_EMAIL;
    return { mode: 'email', href: buildEmailHref(payload, email) };
  }
  const data = await postJson(endpoint, payload, 'orçamento', payload.clientRequestId);
  return { mode: 'endpoint', requestId: data.requestId || data.id };
}
