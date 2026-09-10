import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { defaultQuoteQuantity } from '../lib/catalog';
import { trackFunnelEvent } from '../lib/analytics';
import { clampQuoteQuantity, MAX_QUOTE_ITEMS, normalizeQuoteItems } from '../lib/quoteItems';
import { normalizeCampaignBrief } from '../lib/campaignBrief';
import type { CampaignBrief, CatalogProduct, ProductColor, QuoteItem } from '../types';

const STORAGE_KEY = 'promo-brindes:quote-selection:v1';

interface CartState {
  items: QuoteItem[];
  campaign?: CampaignBrief;
  selectionTitle?: string;
}

type CartAction =
  | { type: 'add'; item: QuoteItem }
  | { type: 'remove'; key: string }
  | { type: 'quantity'; key: string; quantity: number }
  | { type: 'clear' }
  | { type: 'reset' }
  | { type: 'replace'; items: QuoteItem[] }
  | { type: 'restore'; item: QuoteItem; index: number }
  | { type: 'campaign'; campaign?: CampaignBrief }
  | { type: 'selection-title'; title?: string }
  | { type: 'decision-group'; key: string; group: 'primary' | 'alternative' };

const initialState: CartState = { items: [] };

function loadInitialState(): CartState {
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
        items: state.items.map((item) =>
          item.key === normalizedItem.key
            ? { ...item, quantity: Math.max(item.quantity, normalizedItem.quantity) }
            : item,
        ),
      };
    }
    case 'remove':
      return { ...state, items: state.items.filter((item) => item.key !== action.key) };
    case 'quantity':
      return {
        ...state,
        items: state.items.map((item) =>
          item.key === action.key
            ? { ...item, quantity: clampQuoteQuantity(action.quantity, item.minQuantity) }
            : item,
        ),
      };
    case 'clear':
      return { ...state, items: [] };
    case 'reset':
      return initialState;
    case 'replace':
      return { ...state, items: normalizeQuoteItems(action.items) };
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
    default:
      return state;
  }
}

interface QuoteCartValue {
  items: QuoteItem[];
  campaign?: CampaignBrief;
  selectionTitle?: string;
  itemCount: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addProduct: (product: CatalogProduct, quantity?: number, color?: ProductColor) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  setItemDecisionGroup: (key: string, group: 'primary' | 'alternative') => void;
  replaceItems: (items: QuoteItem[]) => void;
  setCampaign: (campaign?: CampaignBrief) => void;
  setSelectionTitle: (title?: string) => void;
  clear: () => void;
  reset: () => void;
  canUndoClear: boolean;
  restoreLastClear: () => void;
  dismissLastClear: () => void;
  canUndoRemoval: boolean;
  restoreLastRemoval: () => void;
  dismissLastRemoval: () => void;
}

const QuoteCartContext = createContext<QuoteCartValue | null>(null);

export function QuoteCartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadInitialState);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastCleared, setLastCleared] = useState<CartState | null>(null);
  const [lastRemoved, setLastRemoved] = useState<{ item: QuoteItem; index: number } | null>(null);

  useEffect(() => {
    if (!lastCleared) return;
    const timeout = window.setTimeout(() => setLastCleared(null), 8_000);
    return () => window.clearTimeout(timeout);
  }, [lastCleared]);

  useEffect(() => {
    if (!lastRemoved) return;
    const timeout = window.setTimeout(() => setLastRemoved(null), 8_000);
    return () => window.clearTimeout(timeout);
  }, [lastRemoved]);

  useEffect(() => {
    try {
      if (state.items.length || state.campaign || state.selectionTitle) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private browsing or a full storage quota must not block the quote journey.
    }
  }, [state]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (!event.newValue) {
        dispatch({ type: 'reset' });
        setLastCleared(null);
        return;
      }
      try {
        const value = JSON.parse(event.newValue) as unknown;
        if (Array.isArray(value)) dispatch({ type: 'replace', items: normalizeQuoteItems(value) });
        else if (value && typeof value === 'object') {
          const stored = value as { items?: unknown; campaign?: unknown; selectionTitle?: unknown };
          dispatch({ type: 'replace', items: normalizeQuoteItems(stored.items) });
          dispatch({ type: 'campaign', campaign: normalizeCampaignBrief(stored.campaign) });
          dispatch({ type: 'selection-title', title: typeof stored.selectionTitle === 'string' ? stored.selectionTitle : undefined });
        }
      } catch {
        // Ignore malformed data from another tab.
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const addProduct = useCallback(
    (product: CatalogProduct, quantity = defaultQuoteQuantity(product), color?: ProductColor) => {
      const colorKey = color?.name.trim().toLocaleLowerCase('pt-BR') || 'sem-cor';
      dispatch({
        type: 'add',
        item: {
          key: `${product.id}::${color?.variantId ? `variante-${color.variantId}` : colorKey}`,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          sku: product.sku,
          imageUrl: color?.imageUrl || product.imageUrl,
          minQuantity: product.minQuantity,
          quantity: clampQuoteQuantity(quantity, product.minQuantity),
          variantId: color?.variantId,
          colorName: color?.name,
          colorHex: color?.hex,
        },
      });
      trackFunnelEvent('product_saved', {
        product_id: product.id,
        category_id: product.mainCategoryId || product.categoryId || 'nao-informada',
        has_color: Boolean(color),
      });
      setDrawerOpen(true);
    },
    [],
  );

  const value = useMemo<QuoteCartValue>(
    () => ({
      items: state.items,
      campaign: state.campaign,
      selectionTitle: state.selectionTitle,
      itemCount: state.items.length,
      drawerOpen,
      setDrawerOpen,
      addProduct,
      removeItem: (key) => {
        const index = state.items.findIndex((item) => item.key === key);
        const item = state.items[index];
        if (!item) return;
        setLastRemoved({ item, index });
        dispatch({ type: 'remove', key });
      },
      updateQuantity: (key, quantity) => dispatch({ type: 'quantity', key, quantity }),
      setItemDecisionGroup: (key, group) => dispatch({ type: 'decision-group', key, group }),
      replaceItems: (items) => dispatch({ type: 'replace', items }),
      setCampaign: (campaign) => dispatch({ type: 'campaign', campaign: normalizeCampaignBrief(campaign) }),
      setSelectionTitle: (title) => dispatch({ type: 'selection-title', title }),
      clear: () => {
        if (state.items.length) setLastCleared(state);
        setLastRemoved(null);
        dispatch({ type: 'clear' });
      },
      reset: () => {
        setLastCleared(null);
        dispatch({ type: 'reset' });
      },
      canUndoClear: Boolean(lastCleared),
      restoreLastClear: () => {
        if (!lastCleared) return;
        dispatch({ type: 'replace', items: lastCleared.items });
        dispatch({ type: 'campaign', campaign: lastCleared.campaign });
        setLastCleared(null);
      },
      dismissLastClear: () => setLastCleared(null),
      canUndoRemoval: Boolean(lastRemoved),
      restoreLastRemoval: () => {
        if (!lastRemoved) return;
        dispatch({ type: 'restore', item: lastRemoved.item, index: lastRemoved.index });
        setLastRemoved(null);
      },
      dismissLastRemoval: () => setLastRemoved(null),
    }),
    [addProduct, drawerOpen, lastCleared, lastRemoved, state],
  );

  return <QuoteCartContext.Provider value={value}>{children}</QuoteCartContext.Provider>;
}

export function useQuoteCart(): QuoteCartValue {
  const value = useContext(QuoteCartContext);
  if (!value) throw new Error('useQuoteCart precisa estar dentro de QuoteCartProvider.');
  return value;
}
