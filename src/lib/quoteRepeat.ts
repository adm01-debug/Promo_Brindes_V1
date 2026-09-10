import type { CampaignBrief, QuoteBriefingDetails } from '../types';
import { normalizeCampaignBrief } from './campaignBrief';
import { normalizeQuoteBriefing } from './quoteBriefing';

const STORAGE_KEY = 'promo-brindes:quote-repeat:v1';
const MAX_AGE_MS = 30 * 60 * 1_000;

export interface QuoteRepeatContext {
  quoteId: string;
  campaign?: CampaignBrief;
  briefing?: QuoteBriefingDetails;
}

interface StoredQuoteRepeat extends QuoteRepeatContext {
  savedAt: string;
}

export function saveQuoteRepeat(context: QuoteRepeatContext): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      quoteId: context.quoteId,
      campaign: normalizeCampaignBrief(context.campaign),
      briefing: normalizeQuoteBriefing(context.briefing),
      savedAt: new Date().toISOString(),
    } satisfies StoredQuoteRepeat));
  } catch {
    // Repetir um orçamento continua possível só com os itens se a sessão não puder ser usada.
  }
}

export function loadQuoteRepeat(quoteId: string | null): QuoteRepeatContext | null {
  if (typeof window === 'undefined' || !quoteId) return null;
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null') as StoredQuoteRepeat | null;
    const age = stored?.savedAt ? Date.now() - Date.parse(stored.savedAt) : Number.NaN;
    if (!stored || stored.quoteId !== quoteId || !Number.isFinite(age) || age < 0 || age > MAX_AGE_MS) return null;
    return {
      quoteId: stored.quoteId,
      campaign: normalizeCampaignBrief(stored.campaign),
      briefing: normalizeQuoteBriefing(stored.briefing),
    };
  } catch {
    return null;
  }
}

export function clearQuoteRepeat(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}
