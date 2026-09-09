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
import type { CatalogProduct, ProductColor, QuoteItem } from '../types';

const STORAGE_KEY = 'promo-brindes:quote-selection:v1';

interface CartState {
  items: QuoteItem[];
}

type CartAction =
  | { type: 'add'; item: QuoteItem }
  | { type: 'remove'; key: string }
  | { type: 'quantity'; key: string; quantity: number }
  | { type: 'clear' }
  | { type: 'replace'; items: QuoteItem[] };

const initialState: CartState = { items: [] };

function loadInitialState(): CartState {
  if (typeof window === 'undefined') return initialState;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as unknown;
    return { items: normalizeQuoteItems(parsed) };
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
      if (!existing) return state.items.length >= MAX_QUOTE_ITEMS ? state : { items: [...state.items, normalizedItem] };
      return {
        items: state.items.map((item) =>
          item.key === normalizedItem.key
            ? { ...item, quantity: Math.max(item.quantity, normalizedItem.quantity) }
            : item,
        ),
      };
    }
    case 'remove':
      return { items: state.items.filter((item) => item.key !== action.key) };
    case 'quantity':
      return {
        items: state.items.map((item) =>
          item.key === action.key
            ? { ...item, quantity: clampQuoteQuantity(action.quantity, item.minQuantity) }
            : item,
        ),
      };
    case 'clear':
      return initialState;
    case 'replace':
      return { items: normalizeQuoteItems(action.items) };
    default:
      return state;
  }
}

interface QuoteCartValue {
  items: QuoteItem[];
  itemCount: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addProduct: (product: CatalogProduct, quantity?: number, color?: ProductColor) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  replaceItems: (items: QuoteItem[]) => void;
  clear: () => void;
}

const QuoteCartContext = createContext<QuoteCartValue | null>(null);

export function QuoteCartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadInitialState);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      if (state.items.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private browsing or a full storage quota must not block the quote journey.
    }
  }, [state.items]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (!event.newValue) {
        dispatch({ type: 'clear' });
        return;
      }
      try {
        const value = JSON.parse(event.newValue) as unknown;
        if (Array.isArray(value)) dispatch({ type: 'replace', items: normalizeQuoteItems(value) });
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
          key: `${product.id}::${colorKey}`,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          sku: product.sku,
          imageUrl: color?.imageUrl || product.imageUrl,
          minQuantity: product.minQuantity,
          quantity: clampQuoteQuantity(quantity, product.minQuantity),
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
      itemCount: state.items.length,
      drawerOpen,
      setDrawerOpen,
      addProduct,
      removeItem: (key) => dispatch({ type: 'remove', key }),
      updateQuantity: (key, quantity) => dispatch({ type: 'quantity', key, quantity }),
      replaceItems: (items) => dispatch({ type: 'replace', items }),
      clear: () => dispatch({ type: 'clear' }),
    }),
    [addProduct, drawerOpen, state.items],
  );

  return <QuoteCartContext.Provider value={value}>{children}</QuoteCartContext.Provider>;
}

export function useQuoteCart(): QuoteCartValue {
  const value = useContext(QuoteCartContext);
  if (!value) throw new Error('useQuoteCart precisa estar dentro de QuoteCartProvider.');
  return value;
}
