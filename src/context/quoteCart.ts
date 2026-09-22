import { createContext, useContext } from 'react';
import type { CampaignBrief, CatalogProduct, ProductColor, QuoteItem } from '../types';

export interface QuoteCartValue {
  items: QuoteItem[];
  campaign?: CampaignBrief;
  selectionTitle?: string;
  itemCount: number;
  drawerOpen: boolean;
  selectionLimitReached: boolean;
  setDrawerOpen: (open: boolean) => void;
  dismissSelectionLimit: () => void;
  addProduct: (product: CatalogProduct, quantity?: number, color?: ProductColor) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  setItemDecisionGroup: (key: string, group: 'primary' | 'alternative') => void;
  replaceItems: (items: QuoteItem[]) => void;
  replaceSelection: (items: QuoteItem[]) => void;
  restoreSavedSelection: (items: QuoteItem[], campaign?: CampaignBrief, title?: string) => void;
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

export const QuoteCartContext = createContext<QuoteCartValue | null>(null);

export function useQuoteCart(): QuoteCartValue {
  const value = useContext(QuoteCartContext);
  if (!value) throw new Error('useQuoteCart precisa estar dentro de QuoteCartProvider.');
  return value;
}
