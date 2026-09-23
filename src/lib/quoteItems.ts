import type { CatalogProduct, QuoteItem } from '../types';

export const MAX_QUOTE_ITEMS = 50;
const MAX_QUANTITY = 999_999;
/** UUIDs gerados pelo Postgres, compartilhado com a leitura do portal do cliente. */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9-]{1,200}$/i;
const VARIANT_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,99}$/i;
const KIT_GROUP_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNSAFE_DISPLAY_CODE_POINTS = new Set([0x200b, 0x200e, 0x200f, 0x2060, 0xfeff]);

function hasUnsafeDisplayControls(value: string): boolean {
  return Array.from(value).some((character) => {
    const point = character.codePointAt(0) || 0;
    return point <= 0x1f || (point >= 0x7f && point <= 0x9f)
      || (point >= 0x202a && point <= 0x202e) || (point >= 0x2066 && point <= 0x2069)
      || UNSAFE_DISPLAY_CODE_POINTS.has(point);
  });
}

function requiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().slice(0, maxLength);
  return normalized || null;
}

function optionalText(value: unknown, maxLength: number): string | undefined {
  return requiredText(value, maxLength) || undefined;
}

export function normalizePublicLabel(value: unknown, maxLength = 100): string | null {
  const normalized = requiredText(value, maxLength)?.normalize('NFC') || null;
  return normalized && !hasUnsafeDisplayControls(normalized) ? normalized : null;
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
    if (!productId || !UUID_PATTERN.test(productId) || !slug || !SLUG_PATTERN.test(slug) || !name || !sku) continue;

    const minQuantity = clampQuoteQuantity(Number(raw.minQuantity), 1);
    const quantity = clampQuoteQuantity(Number(raw.quantity), minQuantity);
    const variantIdCandidate = optionalText(raw.variantId, 100);
    const variantId = variantIdCandidate && VARIANT_ID_PATTERN.test(variantIdCandidate) ? variantIdCandidate : undefined;
    const colorName = normalizePublicLabel(raw.colorName, 100) || undefined;
    const colorHexCandidate = optionalText(raw.colorHex, 32);
    const colorHex = colorHexCandidate && /^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(colorHexCandidate)
      ? colorHexCandidate
      : undefined;
    const decisionGroup = raw.decisionGroup === 'alternative' ? 'alternative' : 'primary';
    const kitGroupId = optionalText(raw.kitGroupId, 36);
    const kitName = normalizePublicLabel(raw.kitName, 100) || undefined;
    const kitQuantity = Number(raw.kitQuantity);
    const unitsPerKit = Number(raw.unitsPerKit);
    const hasValidKit = Boolean(
      kitGroupId && KIT_GROUP_PATTERN.test(kitGroupId) && kitName
      && Number.isInteger(kitQuantity) && kitQuantity >= 1 && kitQuantity <= MAX_QUANTITY
      && Number.isInteger(unitsPerKit) && unitsPerKit >= 1 && unitsPerKit <= 100
      && quantity === kitQuantity * unitsPerKit,
    );
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
      ...(raw.variantUnavailable && variantId ? { variantUnavailable: true } : {}),
      ...(raw.productUnavailable ? { productUnavailable: true } : {}),
      ...(decisionGroup === 'alternative' ? { decisionGroup } : {}),
      ...(hasValidKit ? { kitGroupId, kitName, kitQuantity, unitsPerKit } : {}),
    };
    const existing = normalized.get(key);
    normalized.set(key, existing ? { ...item, quantity: Math.max(existing.quantity, item.quantity) } : item);
    if (normalized.size >= MAX_QUOTE_ITEMS) break;
  }

  const items = [...normalized.values()];
  const kitGroups = new Map<string, QuoteItem[]>();
  for (const item of items) {
    if (!item.kitGroupId) continue;
    kitGroups.set(item.kitGroupId, [...(kitGroups.get(item.kitGroupId) || []), item]);
  }
  const invalidGroups = new Set([...kitGroups.entries()]
    .filter(([, group]) => group.length < 2 || group.some((item) => item.kitName !== group[0]?.kitName || item.kitQuantity !== group[0]?.kitQuantity))
    .map(([groupId]) => groupId));
  return items.map((item) => {
    if (!item.kitGroupId || !invalidGroups.has(item.kitGroupId)) return item;
    const { kitGroupId: _group, kitName: _name, kitQuantity: _quantity, unitsPerKit: _units, ...standalone } = item;
    return standalone;
  });
}

/**
 * Fronteira fail-closed para envio e compartilhamento. A restauração local pode
 * recuperar referências avulsas de dados antigos, mas uma transmissão nunca deve
 * apagar silenciosamente a identidade de um kit ou algum item inválido.
 */
export function normalizeQuoteItemsForTransmission(values: QuoteItem[]): QuoteItem[] {
  const normalized = normalizeQuoteItems(values);
  const inputKitCount = values.filter((item) => Boolean(item.kitGroupId || item.kitName || item.kitQuantity || item.unitsPerKit)).length;
  const normalizedKitCount = normalized.filter((item) => Boolean(item.kitGroupId)).length;
  const changedCriticalField = normalized.some((item, index) => {
    const input = values[index];
    return !input || input.productId !== item.productId || input.quantity !== item.quantity
      || input.variantId !== item.variantId
      || (input.colorName ? normalizePublicLabel(input.colorName, 100) || undefined : undefined) !== item.colorName
      || (input.decisionGroup === 'alternative' ? 'alternative' : undefined) !== item.decisionGroup
      || input.kitGroupId !== item.kitGroupId || input.kitName?.trim().normalize('NFC') !== item.kitName
      || input.kitQuantity !== item.kitQuantity || input.unitsPerKit !== item.unitsPerKit;
  });
  if (normalized.length !== values.length || inputKitCount !== normalizedKitCount || changedCriticalField) {
    throw new Error('A seleção contém itens inválidos, repetidos ou uma composição inválida. Revise antes de continuar.');
  }
  return normalized;
}

/**
 * Revalida uma seleção histórica sem apagar silenciosamente o que mudou.
 * Referências indisponíveis permanecem visíveis e bloqueiam o novo envio até revisão.
 */
export function reconcileHistoricalQuoteItems(items: QuoteItem[], products: CatalogProduct[]): QuoteItem[] {
  const productsById = new Map(products.map((product) => [product.id, product]));
  return normalizeQuoteItems(items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) return { ...item, productUnavailable: true };
    const variant = item.variantId
      ? product.colors.find((color) => color.variantId === item.variantId)
      : item.colorName
        ? product.colors.find((color) => color.name.localeCompare(item.colorName!, 'pt-BR', { sensitivity: 'base' }) === 0)
        : undefined;
    const variantUnavailable = Boolean(item.variantId && !variant);
    const colorKey = variant?.variantId
      ? `variante-${variant.variantId}`
      : variant?.name.toLocaleLowerCase('pt-BR') || item.colorName?.toLocaleLowerCase('pt-BR') || 'sem-cor';
    return {
      ...item,
      key: `${product.id}::${colorKey}`,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      imageUrl: variant?.imageUrl || product.imageUrl,
      minQuantity: product.minQuantity,
      quantity: clampQuoteQuantity(item.quantity, product.minQuantity),
      ...(variant?.variantId ? { variantId: variant.variantId } : {}),
      ...(variant?.name ? { colorName: variant.name, colorHex: variant.hex } : {}),
      variantUnavailable: variantUnavailable || undefined,
      productUnavailable: false,
    };
  }));
}
