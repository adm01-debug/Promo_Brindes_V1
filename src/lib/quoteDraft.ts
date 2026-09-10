import type { QuoteBriefingForm, QuoteContact } from '../types';
import { EMPTY_QUOTE_BRIEFING, quoteBriefingForm } from './quoteBriefing';

const STORAGE_KEY = 'promo-brindes:quote-draft:v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1_000;

export const EMPTY_QUOTE_CONTACT: QuoteContact = {
  name: '', company: '', email: '', phone: '', city: '', deadline: '', notes: '', privacyAccepted: false,
};

export interface QuoteDraft {
  contact: QuoteContact;
  briefing: QuoteBriefingForm;
}

interface StoredQuoteDraft {
  contact: QuoteContact;
  briefing?: QuoteBriefingForm;
  updatedAt: string;
}

function isQuoteContact(value: unknown): value is QuoteContact {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const contact = value as Partial<QuoteContact>;
  return ['name', 'company', 'email', 'phone', 'city', 'deadline', 'notes'].every((key) => typeof contact[key as keyof QuoteContact] === 'string')
    && typeof contact.privacyAccepted === 'boolean';
}

function normalizeContact(contact: QuoteContact): QuoteContact {
  return {
    name: contact.name.slice(0, 100),
    company: contact.company.slice(0, 150),
    email: contact.email.slice(0, 160),
    phone: contact.phone.slice(0, 24),
    city: contact.city.slice(0, 100),
    deadline: contact.deadline.slice(0, 10),
    notes: contact.notes.slice(0, 800),
    privacyAccepted: contact.privacyAccepted,
  };
}

export function loadQuoteDraft(now = Date.now()): QuoteDraft {
  if (typeof window === 'undefined') return { contact: EMPTY_QUOTE_CONTACT, briefing: EMPTY_QUOTE_BRIEFING };
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null') as StoredQuoteDraft | null;
    const updatedAt = stored?.updatedAt ? Date.parse(stored.updatedAt) : Number.NaN;
    if (!stored || !isQuoteContact(stored.contact) || !Number.isFinite(updatedAt) || now - updatedAt > MAX_AGE_MS || now < updatedAt) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return { contact: EMPTY_QUOTE_CONTACT, briefing: EMPTY_QUOTE_BRIEFING };
    }
    return { contact: normalizeContact(stored.contact), briefing: quoteBriefingForm(stored.briefing) };
  } catch {
    return { contact: EMPTY_QUOTE_CONTACT, briefing: EMPTY_QUOTE_BRIEFING };
  }
}

export function saveQuoteDraft(draft: QuoteDraft, now = new Date()): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      contact: normalizeContact(draft.contact),
      briefing: quoteBriefingForm(draft.briefing),
      updatedAt: now.toISOString(),
    } satisfies StoredQuoteDraft));
  } catch {
    // Session storage is an enhancement; the live form remains the source of truth.
  }
}

export function clearQuoteDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // No action is needed when the browser disallows storage access.
  }
}
