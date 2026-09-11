import type { CatalogProduct, QuoteItem } from '../types';
import { clampQuoteQuantity, normalizeQuoteItems } from './quoteItems';

const VERSION = 1;
// O moodboard aceita até 50 referências; o link persistente deve representar a
// mesma seleção, sem cortar silenciosamente a parte final.
export const MAX_SHARED_SELECTION_ITEMS = 50;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VARIANT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/;
const MANAGED_LINK_PREFIX = 'promo-brindes:shared-selection-management:';
const ephemeralManagementTokens = new Map<string, string>();

interface SharedSelectionItem {
  id: string;
  q: number;
  v?: string;
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
  // Cinquenta UUIDs e variantes válidas ainda cabem com folga no limite
  // conservador de URL; rejeitamos cargas anormalmente grandes antes de decodificar.
  if (!value || value.length > 8_000) return [];
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

function toReferences(items: QuoteItem[]): SharedSelectionItem[] {
  return decodeSharedSelection(encodeSharedSelection(items));
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
  ephemeralManagementTokens.set(token, managementToken);
  try { safeLocalStorage()?.setItem(`${MANAGED_LINK_PREFIX}${token}`, JSON.stringify({ managementToken, expiresAt } satisfies StoredManagementToken)); } catch { /* armazenamento pode estar indisponível; o link continua compartilhável nesta sessão */ }
}

export function managedSharedSelectionToken(token: string): string | null {
  if (!UUID_PATTERN.test(token)) return null;
  const inMemory = ephemeralManagementTokens.get(token);
  if (inMemory && UUID_PATTERN.test(inMemory)) return inMemory;
  try {
    const value = safeLocalStorage()?.getItem(`${MANAGED_LINK_PREFIX}${token}`) || null;
    if (value && UUID_PATTERN.test(value)) return value; // compatibilidade com links criados antes deste formato.
    const parsed = value ? JSON.parse(value) as StoredManagementToken : null;
    return parsed && UUID_PATTERN.test(parsed.managementToken) ? parsed.managementToken : null;
  } catch { return null; }
}

/**
 * Links criados neste navegador continuam revogáveis depois de recarregar.
 * A chave de gestão nunca sai deste dispositivo nem é apresentada na interface.
 */
export function managedSharedSelectionTokens(now = Date.now()): string[] {
  const storage = safeLocalStorage();
  if (!storage) return [...ephemeralManagementTokens.keys()];
  const tokens = new Set<string>(ephemeralManagementTokens.keys());
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(MANAGED_LINK_PREFIX)) continue;
      const token = key.slice(MANAGED_LINK_PREFIX.length);
      if (!UUID_PATTERN.test(token)) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;
      if (UUID_PATTERN.test(raw)) { tokens.add(token); continue; }
      const value = JSON.parse(raw) as StoredManagementToken;
      if (!UUID_PATTERN.test(value.managementToken)) { storage.removeItem(key); continue; }
      if (value.expiresAt && Date.parse(value.expiresAt) <= now) { storage.removeItem(key); continue; }
      tokens.add(token);
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
    return { items: decodeSharedSelection(toBase64Url(JSON.stringify({ v: VERSION, i: payload.items }))), expiresAt: String(payload.expiresAt || '') };
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
