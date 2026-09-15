import { clampQuoteQuantity, MAX_QUOTE_ITEMS, normalizeQuoteItems } from '../lib/quoteItems';
import { normalizeCampaignBrief } from '../lib/campaignBrief';
import type { CampaignBrief, QuoteItem } from '../types';

const STORAGE_KEY = 'promo-brindes:quote-selection:v1';

export interface CartState {
  items: QuoteItem[];
  campaign?: CampaignBrief;
  selectionTitle?: string;
}

export type CartAction =
  | { type: 'add'; item: QuoteItem }
  | { type: 'remove'; key: string }
  | { type: 'quantity'; key: string; quantity: number }
  | { type: 'clear' }
  | { type: 'reset' }
  | { type: 'replace'; items: QuoteItem[] }
  | { type: 'replace-selection'; items: QuoteItem[] }
  | { type: 'restore-selection'; state: CartState }
  | { type: 'restore'; item: QuoteItem; index: number }
  | { type: 'campaign'; campaign?: CampaignBrief }
  | { type: 'selection-title'; title?: string }
  | { type: 'decision-group'; key: string; group: 'primary' | 'alternative' };

const initialState: CartState = { items: [] };

export function loadInitialQuoteCartState(): CartState {
  if (typeof window === 'undefined') return initialState;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as unknown;
    if (Array.isArray(parsed)) return { items: normalizeQuoteItems(parsed) };
    if (parsed && typeof parsed === 'object') {
      const stored = parsed as { items?: unknown; campaign?: unknown; selectionTitle?: unknown };
      return {
        items: normalizeQuoteItems(stored.items),
        campaign: normalizeCampaignBrief(stored.campaign),
        selectionTitle: typeof stored.selectionTitle === 'string' ? stored.selectionTitle.trim().slice(0, 100) || undefined : undefined,
      };
    }
    return initialState;
  } catch {
    return initialState;
  }
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const normalizedItem = normalizeQuoteItems([action.item])[0];
      if (!normalizedItem) return state;
      const existing = state.items.find((item) => item.key === normalizedItem.key);
      if (!existing) return state.items.length >= MAX_QUOTE_ITEMS ? state : { ...state, items: [...state.items, normalizedItem] };
      return {
        ...state,
        items: state.items.map((item) => item.key === normalizedItem.key ? { ...item, quantity: Math.max(item.quantity, normalizedItem.quantity) } : item),
      };
    }
    case 'remove': return { ...state, items: state.items.filter((item) => item.key !== action.key) };
    case 'quantity': return { ...state, items: state.items.map((item) => item.key === action.key ? { ...item, quantity: clampQuoteQuantity(action.quantity, item.minQuantity) } : item) };
    case 'clear': return { ...state, items: [] };
    case 'reset': return initialState;
    case 'replace': return { ...state, items: normalizeQuoteItems(action.items) };
    case 'replace-selection': return { items: normalizeQuoteItems(action.items) };
    case 'restore-selection': return {
      items: normalizeQuoteItems(action.state.items),
      campaign: normalizeCampaignBrief(action.state.campaign),
      selectionTitle: action.state.selectionTitle?.trim().slice(0, 100) || undefined,
    };
    case 'restore': {
      const restored = normalizeQuoteItems([action.item])[0];
      if (!restored || state.items.some((item) => item.key === restored.key)) return state;
      const index = Math.max(0, Math.min(action.index, state.items.length));
      return { ...state, items: [...state.items.slice(0, index), restored, ...state.items.slice(index)].slice(0, MAX_QUOTE_ITEMS) };
    }
    case 'campaign':
      if (JSON.stringify(state.campaign) === JSON.stringify(action.campaign)) return state;
      return { ...state, campaign: action.campaign };
    case 'selection-title': {
      const title = action.title?.trim().slice(0, 100) || undefined;
      return state.selectionTitle === title ? state : { ...state, selectionTitle: title };
    }
    case 'decision-group':
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.key !== action.key) return item;
          if (action.group === 'alternative') return { ...item, decisionGroup: 'alternative' };
          const { decisionGroup: _decisionGroup, ...primaryItem } = item;
          return primaryItem;
        }),
      };
    default: return state;
  }
}
