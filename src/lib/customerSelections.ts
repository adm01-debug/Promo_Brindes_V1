import type { CampaignBrief, QuoteItem } from '../types';
import type { Json } from '../types/site-database.types';
import { normalizeCampaignBrief } from './campaignBrief';
import { fetchProductsByIds } from './catalog';
import { normalizeQuoteItems } from './quoteItems';
import { hydrateSharedSelectionDetails, type SharedSelectionItem } from './sharedSelection';
import { siteSupabase } from './siteSupabase';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface SavedSelectionReference extends SharedSelectionItem {
  d?: 'alternative';
}

export interface SavedSelection {
  id: string;
  title: string;
  references: SavedSelectionReference[];
  campaign?: CampaignBrief;
  version: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function referencesFromCart(items: QuoteItem[]): SavedSelectionReference[] {
  return normalizeQuoteItems(items).map((item) => ({
    id: item.productId,
    q: item.quantity,
    ...(item.variantId ? { v: item.variantId } : {}),
    ...(item.decisionGroup === 'alternative' ? { d: 'alternative' as const } : {}),
  }));
}

function parseReferences(value: unknown): SavedSelectionReference[] {
  if (!Array.isArray(value) || value.length > 50) throw new Error('invalid_saved_selection');
  return value.map((candidate) => {
    const item = record(candidate);
    if (!item || typeof item.id !== 'string' || !UUID_PATTERN.test(item.id)
      || !Number.isInteger(item.q) || Number(item.q) < 1 || Number(item.q) > 999_999
      || (item.v !== undefined && typeof item.v !== 'string')
      || (item.d !== undefined && item.d !== 'alternative')) throw new Error('invalid_saved_selection');
    return {
      id: item.id,
      q: Number(item.q),
      ...(typeof item.v === 'string' ? { v: item.v } : {}),
      ...(item.d === 'alternative' ? { d: 'alternative' as const } : {}),
    };
  });
}

function parseSelection(value: unknown): SavedSelection {
  const item = record(value);
  if (!item || typeof item.id !== 'string' || !UUID_PATTERN.test(item.id)
    || typeof item.title !== 'string' || item.title.length > 100
    || !Number.isInteger(item.version) || Number(item.version) < 1
    || typeof item.createdAt !== 'string' || typeof item.updatedAt !== 'string'
    || (item.archivedAt !== null && typeof item.archivedAt !== 'string')) throw new Error('invalid_saved_selection');
  return {
    id: item.id,
    title: item.title,
    references: parseReferences(item.references),
    campaign: normalizeCampaignBrief(item.campaign),
    version: Number(item.version),
    archivedAt: item.archivedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function client() {
  if (!siteSupabase) throw new Error('customer_area_not_configured');
  return siteSupabase;
}

function handleRpcError(error: { message?: string } | null): never {
  const message = error?.message || '';
  if (message.includes('selection_version_conflict')) throw new Error('selection_version_conflict');
  if (message.includes('selection_limit_reached')) throw new Error('selection_limit_reached');
  throw new Error('saved_selection_unavailable');
}

export async function listMySelections(includeArchived = true): Promise<SavedSelection[]> {
  const { data, error } = await client().rpc('list_my_selections', { p_include_archived: includeArchived });
  if (error) handleRpcError(error);
  const result = record(data);
  if (!result || !Array.isArray(result.items)) throw new Error('saved_selection_unavailable');
  return result.items.map(parseSelection);
}

export async function saveMySelection(
  title: string,
  items: QuoteItem[],
  campaign?: CampaignBrief,
  current?: Pick<SavedSelection, 'id' | 'version'>,
): Promise<void> {
  const references = referencesFromCart(items);
  if (!references.length || title.trim().length < 1 || title.trim().length > 100) throw new Error('invalid_saved_selection');
  const { data, error } = await client().rpc('save_my_selection', {
    p_title: title.trim(),
    p_references: references as unknown as Json,
    p_campaign: campaign ? campaign as unknown as Json : undefined,
    p_id: current?.id,
    p_expected_version: current?.version,
  });
  if (error) handleRpcError(error);
  const result = record(data);
  if (!result || typeof result.id !== 'string' || !UUID_PATTERN.test(result.id) || !Number.isInteger(result.version)) {
    throw new Error('saved_selection_unavailable');
  }
}

export async function setMySelectionArchived(selection: SavedSelection, archived: boolean): Promise<void> {
  const { error } = await client().rpc('set_my_selection_archived', {
    p_id: selection.id,
    p_expected_version: selection.version,
    p_archived: archived,
  });
  if (error) handleRpcError(error);
}

export async function deleteMySelection(selection: SavedSelection): Promise<void> {
  const { error } = await client().rpc('delete_my_selection', {
    p_id: selection.id,
    p_expected_version: selection.version,
  });
  if (error) handleRpcError(error);
}

export async function hydrateMySelection(selection: SavedSelection, signal?: AbortSignal): Promise<QuoteItem[]> {
  const products = await fetchProductsByIds(selection.references.map((item) => item.id), signal, selection.references.length);
  const hydration = hydrateSharedSelectionDetails(selection.references, products);
  if (hydration.unavailableProductReferences.length || hydration.unavailableVariantReferences.length) {
    throw new Error('selection_catalog_changed');
  }
  const priorities = new Map(selection.references.map((item) => [`${item.id}:${item.v || ''}`, item.d]));
  return hydration.items.map((item) => ({
    ...item,
    ...(priorities.get(`${item.productId}:${item.variantId || ''}`) === 'alternative' ? { decisionGroup: 'alternative' as const } : {}),
  }));
}
