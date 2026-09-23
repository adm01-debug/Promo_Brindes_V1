import { siteSupabase } from './siteSupabase';

const OCCASION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+){0,15}$/;

function client() {
  if (!siteSupabase) throw new Error('customer_area_not_configured');
  return siteSupabase;
}

function normalizeOccasionId(value: string): string {
  const normalized = value.trim().toLocaleLowerCase('pt-BR');
  if (!OCCASION_ID_PATTERN.test(normalized) || normalized.length > 80) throw new Error('invalid_occasion_id');
  return normalized;
}

function parseItems(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('occasion_favorites_unavailable');
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length > 100) throw new Error('occasion_favorites_unavailable');
  try {
    return [...new Set(items.map((item) => typeof item === 'string' ? normalizeOccasionId(item) : ''))].filter(Boolean);
  } catch {
    // Uma leitura remota inválida não deve ser confundida com erro de digitação
    // da pessoa na interface; ela sinaliza contrato indisponível/inconsistente.
    throw new Error('occasion_favorites_unavailable');
  }
}

/** Lista somente IDs editoriais; título e descrição continuam no catálogo estático do site. */
export async function listMyOccasionFavorites(): Promise<string[]> {
  const { data, error } = await client().rpc('list_my_occasion_favorites');
  if (error) throw new Error('occasion_favorites_unavailable');
  return parseItems(data);
}

/** Alteração idempotente e exclusiva da sessão autenticada atual. */
export async function setMyOccasionFavorite(occasionId: string, saved: boolean): Promise<void> {
  const { data, error } = await client().rpc('set_my_occasion_favorite', {
    p_occasion_id: normalizeOccasionId(occasionId),
    p_saved: saved,
  });
  if (error?.message?.includes('occasion_favorite_limit_reached')) throw new Error('occasion_favorite_limit_reached');
  if (error || !data || typeof data !== 'object' || (data as { saved?: unknown }).saved !== saved) {
    throw new Error('occasion_favorites_unavailable');
  }
}
