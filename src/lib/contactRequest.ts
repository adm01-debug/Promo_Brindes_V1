import type { ContactLead, ContactRequestPayload } from '../types';
import { createClientRequestId, postJson } from './http';

const DEFAULT_CONTACT_EMAIL = 'adm01@promobrindes.com.br';

export function buildContactPayload(
  lead: ContactLead,
  pageUrl = typeof window === 'undefined' ? '' : window.location.href,
  submittedAt = new Date().toISOString(),
  clientRequestId = createClientRequestId(),
): ContactRequestPayload {
  const { privacyAccepted: _privacyAccepted, ...contact } = lead;
  return {
    contact,
    consent: { accepted: lead.privacyAccepted, noticeVersion: '2026-09-08', acceptedAt: submittedAt },
    source: 'site-promo-brindes-contact',
    submittedAt,
    pageUrl,
    clientRequestId,
  };
}

export function buildContactEmailHref(payload: ContactRequestPayload, email = DEFAULT_CONTACT_EMAIL): string {
  const body = [
    'Olá, time de especialistas da Promo Brindes!',
    '',
    'Quero conversar sobre uma ação de brindes.',
    '',
    `Nome: ${payload.contact.name}`,
    `E-mail: ${payload.contact.email}`,
    payload.contact.phone ? `Telefone / WhatsApp: ${payload.contact.phone}` : '',
    payload.contact.responseChannel && payload.contact.responseChannel !== 'sem-preferencia' ? `Canal preferido: ${payload.contact.responseChannel}` : '',
    payload.contact.message ? `Mensagem: ${payload.contact.message}` : '',
    '',
    'Aguardo o contato. Obrigado!',
  ].filter(Boolean).join('\n');
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Contato pelo site — ${payload.contact.name}`)}&body=${encodeURIComponent(body)}`;
}

export type ContactSubmitResult =
  | { mode: 'endpoint'; requestId?: string }
  | { mode: 'email'; href: string };

export async function submitContactRequest(payload: ContactRequestPayload): Promise<ContactSubmitResult> {
  const endpoint = import.meta.env.VITE_CONTACT_REQUEST_ENDPOINT?.trim();
  if (!endpoint) {
    const email = import.meta.env.VITE_CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_EMAIL;
    return { mode: 'email', href: buildContactEmailHref(payload, email) };
  }
  const data = await postJson(endpoint, payload, 'contato', payload.clientRequestId);
  return { mode: 'endpoint', requestId: data.requestId };
}
