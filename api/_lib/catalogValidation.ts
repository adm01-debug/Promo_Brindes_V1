import { RequestValidationError, type NormalizedQuotePayload } from './contracts.js';

const CANONICAL_CATALOG_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
const REQUEST_TIMEOUT_MS = 5_000;

interface CatalogRow {
  id?: string;
  slug?: string;
  name?: string;
  sku?: string;
  min_quantity?: number | null;
  color_swatches?: unknown;
  primary_image_url?: string | null;
  primary_image_fallback_url?: string | null;
  set_image_url?: string | null;
  og_image_url?: string | null;
}

interface CatalogVariant {
  variantId: string;
  name?: string;
  hex?: string;
  imageUrl?: string;
}

function catalogMinimum(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? Math.min(value, 999_999)
    : 1;
}

function catalogVariants(value: unknown): CatalogVariant[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const variant = raw as Record<string, unknown>;
    if (typeof variant.variant_id !== 'string' || !variant.variant_id.trim()) return [];
    return [{
      variantId: variant.variant_id.trim(),
      ...(typeof variant.color_name === 'string' && variant.color_name.trim() ? { name: variant.color_name.trim() } : {}),
      ...(typeof variant.color_hex === 'string' && variant.color_hex.trim() ? { hex: variant.color_hex.trim() } : {}),
      ...(typeof variant.image_url === 'string' && variant.image_url.trim() ? { imageUrl: variant.image_url.trim() } : {}),
    }];
  });
}

function canonicalImage(row: CatalogRow): string {
  return [row.primary_image_url, row.primary_image_fallback_url, row.set_image_url, row.og_image_url]
    .find((candidate): candidate is string => typeof candidate === 'string' && (candidate.startsWith('/') || /^https:\/\//i.test(candidate))) || '';
}

function catalogKey(): string {
  const key = process.env.CATALOG_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!key || key.startsWith('sb_secret_')) {
    throw new RequestValidationError('A validação do catálogo está indisponível. Tente novamente em alguns instantes.', 503, 'catalog_validation_unavailable');
  }
  return key;
}

export async function reconcileQuoteItems(payload: NormalizedQuotePayload): Promise<NormalizedQuotePayload> {
  const ids = Array.from(new Set(payload.items.map((item) => item.productId)));
  const key = catalogKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    const url = new URL(`${CANONICAL_CATALOG_URL}/rest/v1/v_site_products_public`);
    url.searchParams.set('select', 'id,slug,name,sku,min_quantity,primary_image_url,primary_image_fallback_url,set_image_url,og_image_url,color_swatches');
    url.searchParams.set('id', `in.(${ids.join(',')})`);
    response = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
  } catch {
    throw new RequestValidationError('Não foi possível validar os produtos agora. Tente novamente em alguns instantes.', 503, 'catalog_validation_unavailable');
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new RequestValidationError('Não foi possível validar os produtos agora. Tente novamente em alguns instantes.', 503, 'catalog_validation_unavailable');
  }
  const rows = await response.json().catch(() => null) as CatalogRow[] | null;
  if (!Array.isArray(rows)) {
    throw new RequestValidationError('Não foi possível validar os produtos agora. Tente novamente em alguns instantes.', 503, 'catalog_validation_unavailable');
  }
  const products = new Map(rows.filter((row) => (
    typeof row.id === 'string' && typeof row.slug === 'string' && typeof row.name === 'string'
      && typeof row.sku === 'string'
  )).map((row) => [row.id!, row]));

  return {
    ...payload,
    items: payload.items.map((item, index) => {
      const product = products.get(item.productId);
      if (!product) {
        throw new RequestValidationError(`O produto ${index + 1} não está mais disponível para briefing. Atualize sua seleção.`, 422, 'catalog_item_unavailable');
      }
      const minimum = catalogMinimum(product.min_quantity);
      if (item.quantity < minimum) {
        throw new RequestValidationError(`A quantidade do produto ${index + 1} está abaixo do mínimo atual.`, 422, 'catalog_minimum_not_met');
      }
      const variants = catalogVariants(product.color_swatches);
      const variant = item.variantId ? variants.find((candidate) => candidate.variantId === item.variantId) : undefined;
      if (item.variantId && !variant) {
        throw new RequestValidationError(`A variante do produto ${index + 1} não está mais disponível. Revise a cor escolhida.`, 422, 'catalog_variant_unavailable');
      }
      const variantImage = variant?.imageUrl && (variant.imageUrl.startsWith('/') || /^https:\/\//i.test(variant.imageUrl))
        ? variant.imageUrl
        : undefined;
      return {
        ...item,
        key: variant ? `${product.id!}::variante-${variant.variantId}` : item.key,
        slug: product.slug!,
        name: product.name!,
        sku: product.sku!,
        minQuantity: minimum,
        imageUrl: variantImage || canonicalImage(product),
        ...(variant?.name ? { colorName: variant.name } : {}),
        ...(variant?.hex ? { colorHex: variant.hex } : {}),
      };
    }),
  };
}
