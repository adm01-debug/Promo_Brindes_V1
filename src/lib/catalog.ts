import type { CatalogProduct, Category, ProductColor } from '../types';
import { buildCatalogSearchGroups } from './search';
import { isCatalogCategoryId, parseCatalogPage, resolveColorValues, resolveMaterialValues } from './catalogFilters';

const CANONICAL_PROJECT_ID = 'doufsxqlfjyuvxuezpln';
const CANONICAL_URL = `https://${CANONICAL_PROJECT_ID}.supabase.co`;

export function resolveSupabaseUrl(candidate?: string): string {
  const value = candidate?.trim();
  if (!value) return CANONICAL_URL;
  try {
    const url = new URL(value);
    if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) return CANONICAL_URL;
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return url.origin;
    if (url.protocol === 'https:' && url.hostname === `${CANONICAL_PROJECT_ID}.supabase.co`) return CANONICAL_URL;
  } catch {
    return CANONICAL_URL;
  }
  return CANONICAL_URL;
}

export function resolvePublicApiKey(candidate?: string): string {
  const value = candidate?.trim();
  if (!value || value.startsWith('sb_secret_')) return '';
  const parts = value.split('.');
  if (parts.length === 3) {
    try {
      const encoded = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='))) as { role?: string };
      if (payload.role !== 'anon') return '';
    } catch {
      return '';
    }
  } else if (!value.startsWith('sb_publishable_')) {
    return '';
  }
  return value;
}

export function resolveProductResource(candidate?: string): typeof PUBLIC_PRODUCT_RESOURCE | typeof LEGACY_PRODUCT_RESOURCE {
  return candidate?.trim() === LEGACY_PRODUCT_RESOURCE ? LEGACY_PRODUCT_RESOURCE : PUBLIC_PRODUCT_RESOURCE;
}

function resolveUrl(): string {
  return resolveSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
}

const API_URL = `${resolveUrl()}/rest/v1`;
const LEGACY_PRODUCT_RESOURCE = 'v_products_public';
const PUBLIC_PRODUCT_RESOURCE = 'v_site_products_public';
const API_KEY = resolvePublicApiKey(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const PREFERRED_PRODUCT_RESOURCE = resolveProductResource(import.meta.env.VITE_PRODUCT_CATALOG_RESOURCE);
let activeProductResource = PREFERRED_PRODUCT_RESOURCE;

const PRODUCT_FIELDS = [
  'id',
  'name',
  'sku',
  'slug',
  'primary_image_url',
  'primary_image_fallback_url',
  'set_image_url',
  'og_image_url',
  'images',
  'category_id',
  'main_category_id',
  'short_description',
  'description',
  'ai_title',
  'ai_summary',
  'ai_description',
  'brand',
  'min_quantity',
  'is_new',
  'is_featured',
  'is_bestseller',
  'is_kit',
  'allows_personalization',
  'has_commercial_packaging',
  'color_swatches',
  'materials',
  'dimensions',
  'width_cm',
  'height_cm',
  'length_cm',
  'capacity_ml',
  'weight_g',
  'created_at',
].join(',');

export interface ProductRow {
  id: string | null;
  name: string | null;
  sku: string | null;
  slug: string | null;
  primary_image_url: string | null;
  primary_image_fallback_url: string | null;
  set_image_url: string | null;
  og_image_url: string | null;
  images: unknown;
  category_id: string | null;
  main_category_id: string | null;
  short_description: string | null;
  description: string | null;
  ai_title: string | null;
  ai_summary: string | null;
  ai_description: string | null;
  brand: string | null;
  min_quantity: number | null;
  is_new: boolean | null;
  is_featured: boolean | null;
  is_bestseller: boolean | null;
  is_kit: boolean | null;
  allows_personalization: boolean | null;
  has_commercial_packaging: boolean | null;
  color_swatches: unknown;
  materials: unknown;
  dimensions: unknown;
  width_cm: number | null;
  height_cm: number | null;
  length_cm: number | null;
  capacity_ml: number | null;
  weight_g: number | null;
  created_at?: string | null;
}

export interface CatalogQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  categoryIds?: string[];
  colors?: string[];
  materials?: string[];
  personalizable?: boolean;
  giftPackaging?: boolean;
  maxMinQuantity?: number;
  profile?: 'all' | 'featured' | 'new' | 'kits';
  sort?: 'curated' | 'newest' | 'name';
}

export interface CatalogResult {
  products: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normalizeImages(row: ProductRow): string[] {
  const images = stringArray(row.images);
  const candidates = [row.primary_image_url, row.primary_image_fallback_url, ...images];
  return [...new Set(candidates.filter((url): url is string => Boolean(url?.trim())))];
}

function normalizeColors(value: unknown): ProductColor[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    const name = typeof item.color_name === 'string' ? item.color_name.trim() : '';
    if (!name) return [];
    return [
      {
        variantId: typeof item.variant_id === 'string' ? item.variant_id : undefined,
        name,
        hex: typeof item.color_hex === 'string' ? item.color_hex : '#d7d7d2',
        imageUrl: typeof item.image_url === 'string' ? item.image_url : undefined,
      },
    ];
  });
}

function dimensionValue(rowValue: unknown, json: Record<string, unknown>, key: string): number | undefined {
  const value = safeNumber(rowValue, Number.NaN);
  if (Number.isFinite(value) && value > 0) return value;
  const nested = safeNumber(json[key], Number.NaN);
  return Number.isFinite(nested) && nested > 0 ? nested : undefined;
}

export function mapProductRow(row: ProductRow): CatalogProduct | null {
  if (!row.id || !row.name || !row.sku) return null;
  const images = normalizeImages(row);
  const dimensions = row.dimensions && typeof row.dimensions === 'object'
    ? (row.dimensions as Record<string, unknown>)
    : {};
  const shortDescription = row.ai_summary?.trim() || row.short_description?.trim() || '';

  return {
    id: row.id,
    name: row.name.trim(),
    sku: row.sku.trim(),
    slug: row.slug?.trim() || row.id,
    description:
      row.ai_description?.trim() || row.description?.trim() || shortDescription ||
      'Um brinde pensado para valorizar a presença da sua marca.',
    shortDescription,
    imageUrl: images[0] || '/images/product-placeholder.svg',
    images: images.length ? images : ['/images/product-placeholder.svg'],
    categoryId: row.category_id,
    mainCategoryId: row.main_category_id,
    brand: row.brand,
    minQuantity: Math.max(1, safeNumber(row.min_quantity, 1)),
    isNew: Boolean(row.is_new),
    isFeatured: Boolean(row.is_featured),
    isBestseller: Boolean(row.is_bestseller),
    isKit: Boolean(row.is_kit),
    allowsPersonalization: row.allows_personalization !== false,
    hasCommercialPackaging: Boolean(row.has_commercial_packaging),
    colors: normalizeColors(row.color_swatches),
    materials: stringArray(row.materials),
    dimensions: {
      widthCm: dimensionValue(row.width_cm, dimensions, 'width_cm'),
      heightCm: dimensionValue(row.height_cm, dimensions, 'height_cm'),
      lengthCm: dimensionValue(row.length_cm, dimensions, 'length_cm'),
      capacityMl: dimensionValue(row.capacity_ml, dimensions, 'capacity_ml'),
      weightG: dimensionValue(row.weight_g, dimensions, 'weight_g'),
    },
  };
}

export function sanitizeSearch(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export function parseContentRange(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const total = Number(value.split('/')[1]);
  return Number.isFinite(total) ? total : fallback;
}

async function rest<T>(resource: string, params: URLSearchParams, signal?: AbortSignal): Promise<{ data: T; total: number }> {
  const response = await fetch(`${API_URL}/${resource}?${params.toString()}`, {
    signal,
    headers: {
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
      Accept: 'application/json',
      Prefer: 'count=exact',
    },
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { message?: string } | null;
    const error = new Error(detail?.message || `Não foi possível carregar o catálogo (${response.status}).`);
    const rangeTotal = Number(response.headers.get('content-range')?.split('/')[1]);
    Object.assign(error, { status: response.status, total: Number.isFinite(rangeTotal) ? rangeTotal : undefined });
    throw error;
  }
  const data = await response.json() as T;
  const fallback = Array.isArray(data) ? data.length : 0;
  return { data, total: parseContentRange(response.headers.get('content-range'), fallback) };
}

async function productRest<T>(params: URLSearchParams, signal?: AbortSignal): Promise<{ data: T; total: number }> {
  try {
    return await rest<T>(activeProductResource, params, signal);
  } catch (error) {
    // Compatibilidade temporária: a nova view é preferida automaticamente assim que a
    // migração for aprovada. Até lá, só um 404 permite recuar para o contrato legado.
    if (
      activeProductResource !== LEGACY_PRODUCT_RESOURCE &&
      error instanceof Error &&
      (error as Error & { status?: number }).status === 404
    ) {
      activeProductResource = LEGACY_PRODUCT_RESOURCE;
      return rest<T>(activeProductResource, params, signal);
    }
    throw error;
  }
}

function safeCatalogId(value: string): string {
  return isCatalogCategoryId(value) ? value : '';
}

function jsonContains(column: 'colors' | 'materials', value: string): string {
  const json = JSON.stringify([value]);
  const quoted = json.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  return `${column}.cs."${quoted}"`;
}

export function buildCatalogParams(query: CatalogQuery = {}): URLSearchParams {
  const pageSize = Math.min(48, Math.max(1, query.pageSize ?? 24));
  const page = parseCatalogPage(query.page);
  const params = new URLSearchParams({
    select: PRODUCT_FIELDS,
    is_active: 'eq.true',
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
  });
  const andGroups: string[] = [];
  const categoryIds = [...new Set([...(query.categoryIds ?? []), ...(query.categoryId ? [query.categoryId] : [])]
    .map(safeCatalogId)
    .filter(Boolean))]
    .slice(0, 500);
  if (categoryIds.length) {
    const list = categoryIds.join(',');
    // `category_id` é completo no contrato público; `main_category_id` da origem não é.
    andGroups.push(`category_id.in.(${list})`);
  }

  const search = sanitizeSearch(query.search ?? '');
  buildCatalogSearchGroups(search).forEach((alternatives) => {
    const fields = alternatives.flatMap((term) => [
      `name.ilike.*${term}*`,
      `sku.ilike.*${term}*`,
      `short_description.ilike.*${term}*`,
      `ai_title.ilike.*${term}*`,
    ]);
    andGroups.push(`or(${fields.join(',')})`);
  });

  const colorValues = resolveColorValues(query.colors ?? []);
  if (colorValues.length) {
    andGroups.push(`or(${colorValues.map((value) => jsonContains('colors', value)).join(',')})`);
  }

  const materialValues = resolveMaterialValues(query.materials ?? []);
  if (materialValues.length) {
    andGroups.push(`or(${materialValues.map((value) => jsonContains('materials', value)).join(',')})`);
  }

  const maxMinQuantity = Math.trunc(query.maxMinQuantity ?? 0);
  if (maxMinQuantity > 0 && maxMinQuantity <= 999_999) {
    andGroups.push(`or(min_quantity.lte.${maxMinQuantity},min_quantity.is.null)`);
  }

  if (andGroups.length) params.set('and', `(${andGroups.join(',')})`);
  if (query.personalizable) params.set('allows_personalization', 'eq.true');
  if (query.giftPackaging) params.set('has_gift_box', 'eq.true');
  if (query.profile === 'featured') params.set('is_featured', 'eq.true');
  if (query.profile === 'new') params.set('is_new', 'eq.true');
  if (query.profile === 'kits') params.set('is_kit', 'eq.true');

  const sort = query.sort ?? 'curated';
  params.set(
    'order',
    sort === 'newest'
      ? 'created_at.desc.nullslast,name.asc,id.asc'
      : sort === 'name'
        ? 'name.asc,id.asc'
        : 'is_featured.desc.nullslast,is_bestseller.desc.nullslast,name.asc,id.asc',
  );
  return params;
}

export async function fetchCatalog(query: CatalogQuery = {}, signal?: AbortSignal): Promise<CatalogResult> {
  const pageSize = Math.min(48, Math.max(1, query.pageSize ?? 24));
  const page = parseCatalogPage(query.page);
  let result: { data: ProductRow[]; total: number };
  let resolvedPage = page;
  try {
    result = await productRest<ProductRow[]>(buildCatalogParams(query), signal);
  } catch (error) {
    const catalogError = error as Error & { status?: number; total?: number };
    if (catalogError.status !== 416) throw error;
    resolvedPage = Math.max(1, Math.ceil((catalogError.total ?? 0) / pageSize));
    result = await productRest<ProductRow[]>(buildCatalogParams({ ...query, page: resolvedPage }), signal);
  }
  return {
    products: result.data.map(mapProductRow).filter((item): item is CatalogProduct => item !== null),
    total: result.total,
    page: resolvedPage,
    pageSize,
  };
}

export async function fetchProduct(identifier: string, signal?: AbortSignal): Promise<CatalogProduct | null> {
  const value = identifier.trim();
  const params = new URLSearchParams({ select: PRODUCT_FIELDS, is_active: 'eq.true', limit: '1' });
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const isSlug = /^[a-z0-9](?:[a-z0-9-]{0,198}[a-z0-9])?$/i.test(value);
  if (!isUuid && !isSlug) return null;
  params.set(isUuid ? 'id' : 'slug', `eq.${value}`);
  const result = await productRest<ProductRow[]>(params, signal);
  return result.data[0] ? mapProductRow(result.data[0]) : null;
}

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const params = new URLSearchParams({
    select: 'id,name,parent_id',
    is_active: 'eq.true',
    parent_id: 'is.null',
    order: 'name.asc',
    limit: '100',
  });
  const result = await rest<Array<{ id: string; name: string; parent_id: string | null }>>(
    'categories',
    params,
    signal,
  );
  return result.data
    .filter((category) => category.name !== 'Outros' && !category.name.startsWith('Brindes |'))
    .map((category) => ({ id: category.id, name: category.name, parentId: category.parent_id }));
}

export async function fetchAllCategories(signal?: AbortSignal): Promise<Category[]> {
  const params = new URLSearchParams({
    select: 'id,name,parent_id',
    is_active: 'eq.true',
    order: 'name.asc',
    limit: '1000',
  });
  const result = await rest<Array<{ id: string; name: string; parent_id: string | null }>>(
    'categories',
    params,
    signal,
  );
  return result.data
    .filter((category) => category.name !== 'Outros' && !category.name.startsWith('Brindes |'))
    .map((category) => ({ id: category.id, name: category.name, parentId: category.parent_id }));
}

export function defaultQuoteQuantity(product: Pick<CatalogProduct, 'minQuantity'>): number {
  return Math.max(product.minQuantity, 100);
}

export const catalogConfig = {
  canonicalProjectId: CANONICAL_PROJECT_ID,
  isCanonical: resolveUrl().includes(CANONICAL_PROJECT_ID),
  preferredProductResource: PREFERRED_PRODUCT_RESOURCE,
};
