import type { CatalogProduct, QuoteItem } from '../types';
import { clampQuoteQuantity, normalizeQuoteItems } from './quoteItems';

const VERSION = 1;
export const MAX_SHARED_SELECTION_ITEMS = 8;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VARIANT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/;

interface SharedSelectionItem {
  id: string;
  q: number;
  v?: string;
}

interface SharedSelectionPayload {
  v: typeof VERSION;
  i: SharedSelectionItem[];
}

function toBase64Url(value: string): string {
  return btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(value: string): string | null {
  try {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  } catch {
    return null;
  }
}

/**
 * O link contém apenas IDs públicos, quantidade e variante. Não leva nome de
 * campanha, dados de contato, observações ou contexto que possam identificar alguém.
 */
export function encodeSharedSelection(items: QuoteItem[]): string | null {
  const unique = new Map<string, SharedSelectionItem>();
  for (const item of normalizeQuoteItems(items)) {
    if (!UUID_PATTERN.test(item.productId)) continue;
    const key = `${item.productId}:${item.variantId || ''}`;
    unique.set(key, {
      id: item.productId,
      q: clampQuoteQuantity(item.quantity, item.minQuantity),
      ...(item.variantId && VARIANT_PATTERN.test(item.variantId) ? { v: item.variantId } : {}),
    });
    if (unique.size >= MAX_SHARED_SELECTION_ITEMS) break;
  }
  if (!unique.size) return null;
  return toBase64Url(JSON.stringify({ v: VERSION, i: [...unique.values()] } satisfies SharedSelectionPayload));
}

export function decodeSharedSelection(value: string | null): SharedSelectionItem[] {
  if (!value || value.length > 2_000) return [];
  const raw = fromBase64Url(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<SharedSelectionPayload>;
    if (parsed.v !== VERSION || !Array.isArray(parsed.i) || parsed.i.length < 1 || parsed.i.length > MAX_SHARED_SELECTION_ITEMS) return [];
    const result = new Map<string, SharedSelectionItem>();
    parsed.i.forEach((item) => {
      if (!item || typeof item !== 'object' || !UUID_PATTERN.test(String(item.id || ''))) return;
      const quantity = Number(item.q);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999_999) return;
      const variant = typeof item.v === 'string' && VARIANT_PATTERN.test(item.v) ? item.v : undefined;
      result.set(`${item.id}:${variant || ''}`, { id: item.id, q: quantity, ...(variant ? { v: variant } : {}) });
    });
    return [...result.values()];
  } catch {
    return [];
  }
}

export function sharedSelectionUrl(items: QuoteItem[], origin = typeof window === 'undefined' ? 'https://promo-brindes-v1.vercel.app' : window.location.origin): string | null {
  const payload = encodeSharedSelection(items);
  if (!payload) return null;
  const url = new URL('/selecoes/compartilhada', origin);
  url.searchParams.set('s', payload);
  return url.href;
}

/** Recompõe uma seleção somente a partir do catálogo público atual. */
export function hydrateSharedSelection(payload: SharedSelectionItem[], products: CatalogProduct[]): QuoteItem[] {
  const productById = new Map(products.map((product) => [product.id, product]));
  return normalizeQuoteItems(payload.flatMap((shared) => {
    const product = productById.get(shared.id);
    if (!product) return [];
    const color = shared.v ? product.colors.find((candidate) => candidate.variantId === shared.v) : undefined;
    return [{
      key: `${product.id}::${color?.variantId ? `variante-${color.variantId}` : color?.name?.toLocaleLowerCase('pt-BR') || 'sem-cor'}`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      imageUrl: color?.imageUrl || product.imageUrl,
      minQuantity: product.minQuantity,
      quantity: clampQuoteQuantity(shared.q, product.minQuantity),
      ...(color?.variantId ? { variantId: color.variantId } : {}),
      ...(color?.name ? { colorName: color.name, colorHex: color.hex } : {}),
    }];
  }));
}
