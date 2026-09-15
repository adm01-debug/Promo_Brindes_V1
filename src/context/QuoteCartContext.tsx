import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { defaultQuoteQuantity } from '../lib/catalog';
import { trackFunnelEvent } from '../lib/analytics';
import { clampQuoteQuantity, MAX_QUOTE_ITEMS, normalizeQuoteItems } from '../lib/quoteItems';
import { normalizeCampaignBrief } from '../lib/campaignBrief';
import type { CatalogProduct, ProductColor, QuoteItem } from '../types';
import { QuoteCartContext, type QuoteCartValue } from './quoteCart';
import { cartReducer, loadInitialQuoteCartState, type CartState } from './quoteCartReducer';

const STORAGE_KEY = 'promo-brindes:quote-selection:v1';

export function QuoteCartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadInitialQuoteCartState);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastCleared, setLastCleared] = useState<CartState | null>(null);
  const [lastRemoved, setLastRemoved] = useState<{ item: QuoteItem; index: number } | null>(null);
  const [selectionLimitReached, setSelectionLimitReached] = useState(false);

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
    if (!selectionLimitReached) return;
    const timeout = window.setTimeout(() => setSelectionLimitReached(false), 8_000);
    return () => window.clearTimeout(timeout);
  }, [selectionLimitReached]);

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
      const key = `${product.id}::${color?.variantId ? `variante-${color.variantId}` : colorKey}`;
      if (!state.items.some((item) => item.key === key) && state.items.length >= MAX_QUOTE_ITEMS) {
        setSelectionLimitReached(true);
        setDrawerOpen(true);
        trackFunnelEvent('selection_limit_reached', { item_count: state.items.length });
        return;
      }
      setSelectionLimitReached(false);
      dispatch({
        type: 'add',
        item: {
          key,
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
    [state.items],
  );

  const value = useMemo<QuoteCartValue>(
    () => ({
      items: state.items,
      campaign: state.campaign,
      selectionTitle: state.selectionTitle,
      itemCount: state.items.length,
      drawerOpen,
      selectionLimitReached,
      setDrawerOpen,
      dismissSelectionLimit: () => setSelectionLimitReached(false),
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
      replaceSelection: (items) => dispatch({ type: 'replace-selection', items }),
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
        dispatch({ type: 'restore-selection', state: lastCleared });
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
    [addProduct, drawerOpen, lastCleared, lastRemoved, selectionLimitReached, state],
  );

  return <QuoteCartContext.Provider value={value}>{children}</QuoteCartContext.Provider>;
}
