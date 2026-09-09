import { RequestValidationError, type NormalizedQuotePayload } from './contracts.js';

const CANONICAL_CATALOG_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
const REQUEST_TIMEOUT_MS = 5_000;

interface CatalogRow {
  id?: string;
  slug?: string;
  name?: string;
  sku?: string;
  min_quantity?: number;
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
    url.searchParams.set('select', 'id,slug,name,sku,min_quantity');
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
      && typeof row.sku === 'string' && typeof row.min_quantity === 'number' && Number.isInteger(row.min_quantity)
  )).map((row) => [row.id!, row]));

  return {
    ...payload,
    items: payload.items.map((item, index) => {
      const product = products.get(item.productId);
      if (!product) {
        throw new RequestValidationError(`O produto ${index + 1} não está mais disponível para briefing. Atualize sua seleção.`, 422, 'catalog_item_unavailable');
      }
      if (item.quantity < product.min_quantity!) {
        throw new RequestValidationError(`A quantidade do produto ${index + 1} está abaixo do mínimo atual.`, 422, 'catalog_minimum_not_met');
      }
      return {
        ...item,
        slug: product.slug!,
        name: product.name!,
        sku: product.sku!,
        minQuantity: product.min_quantity!,
      };
    }),
  };
}
