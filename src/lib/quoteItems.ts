import type { QuoteItem } from '../types';

export const MAX_QUOTE_ITEMS = 50;
const MAX_QUANTITY = 999_999;
const PRODUCT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9-]{1,200}$/i;
const VARIANT_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,99}$/i;

function requiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().slice(0, maxLength);
  return normalized || null;
}

function optionalText(value: unknown, maxLength: number): string | undefined {
  return requiredText(value, maxLength) || undefined;
}

function safeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return '/images/product-placeholder.svg';
  const normalized = value.trim();
  return /^(https?:\/\/|\/)/i.test(normalized) ? normalized.slice(0, 2_000) : '/images/product-placeholder.svg';
}

export function clampQuoteQuantity(quantity: number, minimum: number): number {
  const safeMinimum = Number.isFinite(minimum) ? Math.min(MAX_QUANTITY, Math.max(1, Math.round(minimum))) : 1;
  const safeQuantity = Number.isFinite(quantity) ? Math.round(quantity) : safeMinimum;
  return Math.min(MAX_QUANTITY, Math.max(safeMinimum, safeQuantity));
}

export function normalizeQuoteItems(values: unknown): QuoteItem[] {
  if (!Array.isArray(values)) return [];
  const normalized = new Map<string, QuoteItem>();

  for (const value of values) {
    if (!value || typeof value !== 'object') continue;
    const raw = value as Partial<QuoteItem>;
    const productId = requiredText(raw.productId, 80);
    const slug = requiredText(raw.slug, 200);
    const name = requiredText(raw.name, 240);
    const sku = requiredText(raw.sku, 100);
    if (!productId || !PRODUCT_ID_PATTERN.test(productId) || !slug || !SLUG_PATTERN.test(slug) || !name || !sku) continue;

    const minQuantity = clampQuoteQuantity(Number(raw.minQuantity), 1);
    const quantity = clampQuoteQuantity(Number(raw.quantity), minQuantity);
    const variantIdCandidate = optionalText(raw.variantId, 100);
    const variantId = variantIdCandidate && VARIANT_ID_PATTERN.test(variantIdCandidate) ? variantIdCandidate : undefined;
    const colorName = optionalText(raw.colorName, 100);
    const colorHexCandidate = optionalText(raw.colorHex, 32);
    const colorHex = colorHexCandidate && /^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(colorHexCandidate)
      ? colorHexCandidate
      : undefined;
    // Duas variantes podem ter o mesmo nome comercial de cor. Quando a origem
    // publicar um identificador, ele é a chave estável; registros antigos seguem
    // compatíveis com a chave por cor.
    const colorKey = variantId ? `variante-${variantId}` : colorName?.toLocaleLowerCase('pt-BR') || 'sem-cor';
    const key = `${productId}::${colorKey}`;
    const item: QuoteItem = {
      key,
      productId,
      slug,
      name,
      sku,
      imageUrl: safeImageUrl(raw.imageUrl),
      minQuantity,
      quantity,
      ...(variantId ? { variantId } : {}),
      ...(colorName ? { colorName } : {}),
      ...(colorHex ? { colorHex } : {}),
    };
    const existing = normalized.get(key);
    normalized.set(key, existing ? { ...item, quantity: Math.max(existing.quantity, item.quantity) } : item);
    if (normalized.size >= MAX_QUOTE_ITEMS) break;
  }

  return [...normalized.values()];
}
