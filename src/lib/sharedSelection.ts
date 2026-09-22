import type { CatalogProduct, QuoteItem } from '../types';
import { clampQuoteQuantity, normalizePublicLabel, normalizeQuoteItems, normalizeQuoteItemsForTransmission } from './quoteItems';

const VERSION = 2;
// O moodboard aceita até 50 referências; o link persistente deve representar a
// mesma seleção, sem cortar silenciosamente a parte final.
export const MAX_SHARED_SELECTION_ITEMS = 50;
// Links legados levam as referências na URL. O formato persistente usa token
// opaco e não pode herdar essa limitação de transporte.
const MAX_LEGACY_SHARED_SELECTION_PAYLOAD_LENGTH = 8_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VARIANT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/;
const MANAGED_LINK_PREFIX = 'promo-brindes:shared-selection-management:';
const ephemeralManagementTokens = new Map<string, StoredManagementToken>();

export interface SharedSelectionItem {
  id: string;
  q: number;
  v?: string;
  /** Nome da cor legado, usado somente quando o fornecedor não publica variantId. */
  c?: string;
  d?: 'alternative';
  k?: string;
  kn?: string;
  kq?: number;
  ku?: number;
}

interface SharedSelectionPayload {
  v: typeof VERSION;
  i: SharedSelectionItem[];
}

interface StoredManagementToken {
  managementToken: string;
  expiresAt?: string;
}

export interface PersistentSharedSelection {
  token: string;
  expiresAt: string;
  url: string;
}

export interface SharedSelectionHydration {
  items: QuoteItem[];
  /** Produtos que deixaram de estar publicados e, portanto, não podem ser duplicados silenciosamente. */
  unavailableProductReferences: SharedSelectionItem[];
  /** Variantes que a pessoa referenciou, mas que não existem mais no produto publicado. */
  unavailableVariantReferences: SharedSelectionItem[];
  /** Composições que perderiam sua identidade após mudanças no catálogo. */
  invalidKitReferences: SharedSelectionItem[];
}

function normalizeSharedSelectionItems(value: unknown): SharedSelectionItem[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_SHARED_SELECTION_ITEMS) return [];
  const result = new Map<string, SharedSelectionItem>();
  let invalid = false;
  value.forEach((item) => {
    if (!item || typeof item !== 'object') { invalid = true; return; }
    const candidate = item as Partial<SharedSelectionItem>;
    const id = String(candidate.id || '');
    if (!UUID_PATTERN.test(id) || (candidate.d !== undefined && candidate.d !== 'alternative')) { invalid = true; return; }
    const quantity = Number(candidate.q);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999_999) { invalid = true; return; }
    const variant = typeof candidate.v === 'string' && VARIANT_PATTERN.test(candidate.v) ? candidate.v : undefined;
    if (candidate.v !== undefined && !variant) { invalid = true; return; }
    const legacyColor = candidate.v === undefined ? normalizePublicLabel(candidate.c, 100) || undefined : undefined;
    if (candidate.c !== undefined && !legacyColor) { invalid = true; return; }
    const hasKit = ['k', 'kn', 'kq', 'ku'].some((field) => (candidate as Record<string, unknown>)[field] !== undefined);
    const kit = hasKit && typeof candidate.k === 'string' && UUID_PATTERN.test(candidate.k)
      && typeof candidate.kn === 'string' && Boolean(normalizePublicLabel(candidate.kn, 100))
      && Number.isInteger(candidate.kq) && Number(candidate.kq) >= 1 && Number(candidate.kq) <= 999_999
      && Number.isInteger(candidate.ku) && Number(candidate.ku) >= 1 && Number(candidate.ku) <= 100
      && quantity === Number(candidate.kq) * Number(candidate.ku)
      ? { k: candidate.k, kn: normalizePublicLabel(candidate.kn, 100)!, kq: Number(candidate.kq), ku: Number(candidate.ku) }
      : undefined;
    if (hasKit && !kit) { invalid = true; return; }
    const key = `${id}:${variant || legacyColor || ''}:${kit?.k || ''}`;
    if (result.has(key)) { invalid = true; return; }
    result.set(key, { id, q: quantity, ...(variant ? { v: variant } : legacyColor ? { c: legacyColor } : {}), ...(candidate.d === 'alternative' ? { d: 'alternative' as const } : {}), ...kit });
  });
  return invalid || result.size !== value.length ? [] : [...result.values()];
}

function referencesFromQuoteItems(items: QuoteItem[]): SharedSelectionItem[] {
  const unique = new Map<string, SharedSelectionItem>();
  const normalizedItems = normalizeQuoteItemsForTransmission(items);
  for (const item of normalizedItems) {
    if (!UUID_PATTERN.test(item.productId)) throw new Error('A seleção contém uma referência de produto inválida.');
    const colorReference = item.variantId || normalizePublicLabel(item.colorName, 100) || '';
    const key = `${item.productId}:${colorReference}:${item.kitGroupId || ''}`;
    unique.set(key, {
      id: item.productId,
      q: clampQuoteQuantity(item.quantity, item.minQuantity),
      ...(item.variantId && VARIANT_PATTERN.test(item.variantId) ? { v: item.variantId } : item.colorName ? { c: normalizePublicLabel(item.colorName, 100) || undefined } : {}),
      ...(item.decisionGroup === 'alternative' ? { d: 'alternative' as const } : {}),
      ...(item.kitGroupId ? { k: item.kitGroupId, kn: item.kitName, kq: item.kitQuantity, ku: item.unitsPerKit } : {}),
    });
    if (unique.size >= MAX_SHARED_SELECTION_ITEMS) break;
  }
  return [...unique.values()];
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
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
 * O link contém referências, quantidades, variantes, prioridades e composição
 * de kits (inclusive o nome escolhido). Não inclui contato nem o briefing.
 */
export function encodeSharedSelection(items: QuoteItem[]): string | null {
  const references = referencesFromQuoteItems(items);
  if (!references.length) return null;
  return toBase64Url(JSON.stringify({ v: VERSION, i: references } satisfies SharedSelectionPayload));
}

export function decodeSharedSelection(value: string | null): SharedSelectionItem[] {
  if (!value || value.length > MAX_LEGACY_SHARED_SELECTION_PAYLOAD_LENGTH) return [];
  const raw = fromBase64Url(value);
  if (!raw) return [];
  try {
    const version = (JSON.parse(raw) as { v?: number }).v;
    if (version !== 1 && version !== VERSION) return [];
    // v1 usava Latin-1 via btoa; v2 usa UTF-8 para nomes com emoji e acentos.
    const text = version === 1 ? raw : new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(raw, (char) => char.charCodeAt(0)));
    const parsed = JSON.parse(text) as Partial<SharedSelectionPayload>;
    return normalizeSharedSelectionItems(parsed.i);
  } catch {
    return [];
  }
}

export function sharedSelectionUrl(items: QuoteItem[], origin = typeof window === 'undefined' ? 'https://promo-brindes-v1.vercel.app' : window.location.origin): string | null {
  const payload = encodeSharedSelection(items);
  if (!payload || payload.length > MAX_LEGACY_SHARED_SELECTION_PAYLOAD_LENGTH) return null;
  const url = new URL('/selecoes/compartilhada', origin);
  url.searchParams.set('s', payload);
  return url.href;
}

function toReferences(items: QuoteItem[]): SharedSelectionItem[] {
  return referencesFromQuoteItems(items);
}

function persistentSelectionUrl(token: string, origin = window.location.origin) {
  const url = new URL('/selecoes/compartilhada', origin);
  url.searchParams.set('s', token);
  return url.href;
}

function safeLocalStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

function saveManagementToken(token: string, managementToken: string, expiresAt?: string) {
  const value = { managementToken, expiresAt } satisfies StoredManagementToken;
  ephemeralManagementTokens.set(token, value);
  try { safeLocalStorage()?.setItem(`${MANAGED_LINK_PREFIX}${token}`, JSON.stringify(value)); } catch { /* armazenamento pode estar indisponível; o link continua compartilhável nesta sessão */ }
}

function isManagementTokenActive(value: StoredManagementToken, now: number): boolean {
  return UUID_PATTERN.test(value.managementToken) && (!value.expiresAt || (Number.isFinite(Date.parse(value.expiresAt)) && Date.parse(value.expiresAt) > now));
}

export function managedSharedSelectionToken(token: string, now = Date.now()): string | null {
  if (!UUID_PATTERN.test(token)) return null;
  const inMemory = ephemeralManagementTokens.get(token);
  if (inMemory) {
    if (isManagementTokenActive(inMemory, now)) return inMemory.managementToken;
    ephemeralManagementTokens.delete(token);
  }
  try {
    const value = safeLocalStorage()?.getItem(`${MANAGED_LINK_PREFIX}${token}`) || null;
    if (value && UUID_PATTERN.test(value)) return value; // compatibilidade com links criados antes deste formato.
    const parsed = value ? JSON.parse(value) as StoredManagementToken : null;
    if (parsed && isManagementTokenActive(parsed, now)) return parsed.managementToken;
    if (value) safeLocalStorage()?.removeItem(`${MANAGED_LINK_PREFIX}${token}`);
    return null;
  } catch { return null; }
}

/**
 * Links criados neste navegador continuam revogáveis depois de recarregar.
 * A chave de gestão nunca sai deste dispositivo nem é apresentada na interface.
 */
export function managedSharedSelectionTokens(now = Date.now()): string[] {
  const storage = safeLocalStorage();
  const tokens = new Set<string>();
  for (const [token, value] of ephemeralManagementTokens) {
    if (isManagementTokenActive(value, now)) tokens.add(token);
    else ephemeralManagementTokens.delete(token);
  }
  if (!storage) return [...tokens];
  try {
    // Remover uma entrada dentro de um loop indexado desloca a próxima chave e
    // faz um link válido desaparecer da lista. Percorremos uma fotografia.
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key));
    for (const key of keys) {
      if (!key?.startsWith(MANAGED_LINK_PREFIX)) continue;
      const token = key.slice(MANAGED_LINK_PREFIX.length);
      if (!UUID_PATTERN.test(token)) { storage.removeItem(key); continue; }
      const raw = storage.getItem(key);
      if (!raw) continue;
      if (UUID_PATTERN.test(raw)) { tokens.add(token); continue; }
      try {
        const value = JSON.parse(raw) as StoredManagementToken;
        if (!isManagementTokenActive(value, now)) { storage.removeItem(key); continue; }
        tokens.add(token);
      } catch {
        storage.removeItem(key);
      }
    }
  } catch {
    // A revogação do link corrente ainda funciona quando o armazenamento falha.
  }
  return [...tokens];
}

export function isPersistentSharedSelectionToken(value: string | null): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

async function selectionApi<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/shared-selections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message || 'Não conseguimos preparar este link agora.');
  return payload;
}

export async function createPersistentSharedSelection(items: QuoteItem[]): Promise<PersistentSharedSelection> {
  const references = toReferences(items);
  if (!references.length) throw new Error('Não há referências válidas para compartilhar.');
  const payload = await selectionApi<{ token?: string; managementToken?: string; expiresAt?: string }>({ action: 'create', items: references });
  if (!payload.token || !UUID_PATTERN.test(payload.token) || !payload.managementToken || !UUID_PATTERN.test(payload.managementToken) || !payload.expiresAt || Number.isNaN(Date.parse(payload.expiresAt))) {
    throw new Error('O serviço não confirmou um link válido.');
  }
  saveManagementToken(payload.token, payload.managementToken, payload.expiresAt);
  return { token: payload.token, expiresAt: payload.expiresAt, url: persistentSelectionUrl(payload.token) };
}

export async function fetchPersistentSharedSelection(token: string): Promise<{ items: SharedSelectionItem[]; expiresAt: string } | null> {
  if (!UUID_PATTERN.test(token)) return null;
  try {
    const payload = await selectionApi<{ items?: unknown; expiresAt?: string }>({ action: 'read', token });
    const items = normalizeSharedSelectionItems(payload.items);
    if (!items.length) return null;
    return { items, expiresAt: String(payload.expiresAt || '') };
  } catch (error) {
    if (error instanceof Error && error.message === 'Esta seleção não está disponível.') return null;
    throw error;
  }
}

export async function revokePersistentSharedSelection(token: string): Promise<boolean> {
  const managementToken = managedSharedSelectionToken(token);
  if (!managementToken) throw new Error('Este dispositivo não possui a chave para revogar o link.');
  const payload = await selectionApi<{ revoked?: boolean }>({ action: 'revoke', token, managementToken });
  if (payload.revoked) {
    ephemeralManagementTokens.delete(token);
    try { safeLocalStorage()?.removeItem(`${MANAGED_LINK_PREFIX}${token}`); } catch { /* noop */ }
  }
  return Boolean(payload.revoked);
}

/**
 * Recompõe referências do catálogo atual sem esconder perdas parciais.
 * Produtos ausentes ficam separados para a interface orientar a revisão;
 * variantes ausentes preservam seu ID e não colapsam em "sem-cor".
 */
export function hydrateSharedSelectionDetails(payload: SharedSelectionItem[], products: CatalogProduct[]): SharedSelectionHydration {
  const productById = new Map(products.map((product) => [product.id, product]));
  const unavailableProductReferences: SharedSelectionItem[] = [];
  const unavailableVariantReferences: SharedSelectionItem[] = [];
  const items = normalizeQuoteItems(payload.flatMap((shared) => {
    const product = productById.get(shared.id);
    if (!product) {
      unavailableProductReferences.push(shared);
      return [];
    }
    const matchingColors = shared.v
      ? product.colors.filter((candidate) => candidate.variantId === shared.v)
      : shared.c
        ? product.colors.filter((candidate) => candidate.name.localeCompare(shared.c!, 'pt-BR', { sensitivity: 'base' }) === 0)
        : [];
    const color = matchingColors.length === 1 ? matchingColors[0] : undefined;
    const variantUnavailable = Boolean((shared.v || shared.c) && !color);
    if (variantUnavailable) unavailableVariantReferences.push(shared);
    return [{
      key: `${product.id}::${shared.v ? `variante-${shared.v}` : shared.c ? shared.c.toLocaleLowerCase('pt-BR') : color?.name?.toLocaleLowerCase('pt-BR') || 'sem-cor'}`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      imageUrl: color?.imageUrl || product.imageUrl,
      minQuantity: product.minQuantity,
      quantity: clampQuoteQuantity(shared.q, product.minQuantity),
      ...(shared.v ? { variantId: shared.v } : color?.variantId ? { variantId: color.variantId } : {}),
      ...(color?.name ? { colorName: color.name, colorHex: color.hex } : shared.c ? { colorName: shared.c } : {}),
      ...(variantUnavailable ? { variantUnavailable: true } : {}),
      ...(shared.d === 'alternative' ? { decisionGroup: 'alternative' as const } : {}),
      ...(shared.k ? { kitGroupId: shared.k, kitName: shared.kn, kitQuantity: shared.kq, unitsPerKit: shared.ku } : {}),
    }];
  }));
  const invalidKitReferences = payload.filter((reference) => reference.k && !items.some((item) =>
    item.productId === reference.id && (item.variantId || '') === (reference.v || '')
    && (!reference.c || item.colorName?.localeCompare(reference.c, 'pt-BR', { sensitivity: 'base' }) === 0)
    && item.kitGroupId === reference.k && item.kitName === reference.kn
    && item.kitQuantity === reference.kq && item.unitsPerKit === reference.ku && item.quantity === reference.q));
  return { items, unavailableProductReferences, unavailableVariantReferences, invalidKitReferences };
}

/** Compatibilidade para consumidores que só precisam dos itens ainda publicados. */
export function hydrateSharedSelection(payload: SharedSelectionItem[], products: CatalogProduct[]): QuoteItem[] {
  return hydrateSharedSelectionDetails(payload, products).items;
}
