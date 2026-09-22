import { createHash, createHmac, randomUUID } from 'node:crypto';
import { getSiteDatabaseConfig, SiteDatabaseError, type RequestMetadata } from './siteDatabase.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VARIANT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/;
export const TIMEOUT_MS = 10_000;
const MAX_SHARED_SELECTION_ITEMS = 50;

export interface SharedSelectionReference {
  id: string;
  q: number;
  v?: string;
  d?: 'alternative';
  k?: string;
  kn?: string;
  kq?: number;
  ku?: number;
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function identifierHash(ip: string, salt: string) {
  return createHmac('sha256', salt).update(ip || 'unknown').digest('hex');
}

export function normalizeSharedSelectionReferences(value: unknown): SharedSelectionReference[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_SHARED_SELECTION_ITEMS) {
    throw new SiteDatabaseError(`Escolha entre 1 e ${MAX_SHARED_SELECTION_ITEMS} referências para compartilhar.`, 'invalid_shared_selection', 400);
  }
  const unique = new Map<string, SharedSelectionReference>();
  value.forEach((candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new SiteDatabaseError('Uma referência da seleção é inválida.', 'invalid_shared_selection', 400);
    }
    const record = candidate as Record<string, unknown>;
    const id = String(record.id || '');
    const quantity = Number(record.q);
    const variant = record.v == null ? undefined : String(record.v);
    const hasKit = ['k', 'kn', 'kq', 'ku'].some((field) => record[field] !== undefined);
    const kitGroupId = record.k == null ? undefined : String(record.k);
    const kitName = record.kn == null ? undefined : String(record.kn).trim();
    const kitQuantity = Number(record.kq);
    const unitsPerKit = Number(record.ku);
    if (!UUID_PATTERN.test(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999_999 || (variant && !VARIANT_PATTERN.test(variant))
      || (record.d !== undefined && record.d !== 'alternative')) {
      throw new SiteDatabaseError('Uma referência da seleção é inválida.', 'invalid_shared_selection', 400);
    }
    if (hasKit && (!kitGroupId || !UUID_PATTERN.test(kitGroupId) || !kitName || kitName.length > 100
      || !Number.isInteger(kitQuantity) || kitQuantity < 1 || kitQuantity > 999_999
      || !Number.isInteger(unitsPerKit) || unitsPerKit < 1 || unitsPerKit > 100
      || quantity !== kitQuantity * unitsPerKit)) {
      throw new SiteDatabaseError('A composição de kit da seleção é inválida.', 'invalid_shared_selection', 400);
    }
    const normalized = { id: id.toLowerCase(), q: quantity, ...(variant ? { v: variant } : {}), ...(record.d === 'alternative' ? { d: 'alternative' as const } : {}), ...(hasKit ? { k: kitGroupId!.toLowerCase(), kn: kitName!, kq: kitQuantity, ku: unitsPerKit } : {}) };
    const key = `${normalized.id}:${normalized.v || ''}`;
    if (unique.has(key)) throw new SiteDatabaseError('A seleção contém referências repetidas.', 'invalid_shared_selection', 400);
    unique.set(key, normalized);
  });
  const references = Array.from(unique.values());
  const kits = new Map<string, SharedSelectionReference[]>();
  for (const reference of references) {
    if (reference.k) kits.set(reference.k, [...(kits.get(reference.k) || []), reference]);
  }
  for (const components of Array.from(kits.values())) {
    if (components.length < 2 || components.some((component) => component.kn !== components[0]!.kn || component.kq !== components[0]!.kq)) {
      throw new SiteDatabaseError('Revise os componentes e as quantidades do kit antes de compartilhar.', 'invalid_shared_selection', 400);
    }
  }
  return references;
}

async function rpc<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  const config = getSiteDatabaseConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: config.serviceCredential, Authorization: `Bearer ${config.serviceCredential}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null) as T | { message?: string } | null;
    if (!response.ok) {
      if ((result as { message?: string } | null)?.message?.includes('shared_selection_rate_limit_exceeded')) {
        throw new SiteDatabaseError('Muitos links criados em pouco tempo. Aguarde alguns minutos.', 'shared_selection_rate_limited', 429);
      }
      throw new SiteDatabaseError('Não conseguimos preparar este link agora.', 'shared_selection_unavailable');
    }
    return result as T;
  } catch (error) {
    if (error instanceof SiteDatabaseError) throw error;
    throw new SiteDatabaseError('Não conseguimos preparar este link agora.', 'shared_selection_unavailable');
  } finally {
    clearTimeout(timeout);
  }
}

export async function createSharedSelection(items: unknown, metadata: RequestMetadata) {
  const references = normalizeSharedSelectionReferences(items);
  const managementToken = randomUUID();
  const config = getSiteDatabaseConfig();
  const result = await rpc<{ token?: string; expiresAt?: string }>('create_site_shared_selection', {
    p_items: references,
    p_management_token_hash: hash(managementToken),
    p_identifier_hash: identifierHash(metadata.ip, config.requestHashSalt),
  });
  if (!result.token || !UUID_PATTERN.test(result.token) || !result.expiresAt || Number.isNaN(Date.parse(result.expiresAt))) {
    throw new SiteDatabaseError('O serviço não confirmou um link válido.', 'invalid_shared_selection_response');
  }
  return { token: result.token, managementToken, expiresAt: result.expiresAt };
}

export async function readSharedSelection(token: string) {
  if (!UUID_PATTERN.test(token)) throw new SiteDatabaseError('Este link não é válido.', 'invalid_shared_selection', 400);
  const result = await rpc<{ items?: unknown; expiresAt?: string } | null>('get_site_shared_selection', { p_token: token });
  if (!result) return null;
  const items = normalizeSharedSelectionReferences(result.items);
  if (!result.expiresAt || Number.isNaN(Date.parse(result.expiresAt))) throw new SiteDatabaseError('Este link não está disponível.', 'invalid_shared_selection_response');
  return { items, expiresAt: result.expiresAt };
}

export async function revokeSharedSelection(token: string, managementToken: string) {
  if (!UUID_PATTERN.test(token) || !UUID_PATTERN.test(managementToken)) {
    throw new SiteDatabaseError('Não foi possível confirmar a propriedade deste link.', 'invalid_shared_selection_management_token', 400);
  }
  const result = await rpc<{ revoked?: boolean }>('revoke_site_shared_selection', {
    p_token: token,
    p_management_token_hash: hash(managementToken),
  });
  return Boolean(result.revoked);
}
