import type { CatalogProduct } from '../types';

const STORAGE_KEY = 'promo-brindes:catalog-comparison:v1';
export const MAX_COMPARISON_ITEMS = 3;

function isCatalogProduct(value: unknown): value is CatalogProduct {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<CatalogProduct>;
  return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.sku === 'string'
    && typeof item.slug === 'string' && typeof item.imageUrl === 'string'
    && typeof item.minQuantity === 'number' && Array.isArray(item.colors)
    && Array.isArray(item.materials) && Boolean(item.dimensions);
}

export function normalizeComparison(value: unknown): CatalogProduct[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    if (!isCatalogProduct(item) || seen.has(item.id) || item.id.length > 100) return [];
    seen.add(item.id);
    return [item];
  }).slice(0, MAX_COMPARISON_ITEMS);
}

export function loadCatalogComparison(): CatalogProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    return normalizeComparison(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '[]') as unknown);
  } catch {
    return [];
  }
}

export function saveCatalogComparison(products: CatalogProduct[]): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizeComparison(products);
    if (normalized.length) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Browsing in a restricted storage context must not block comparison.
  }
}
