const CANONICAL_PROJECT_ID = 'doufsxqlfjyuvxuezpln';
const SUPABASE_URL = `https://${CANONICAL_PROJECT_ID}.supabase.co`;
const FALLBACK_SITE_URL = 'https://promo-brindes-v1.vercel.app';
export const REQUEST_TIMEOUT_MS = 8_000;

interface VercelRequest {
  method?: string;
}

interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  send(body: string): void;
}

interface ProductSitemapRow {
  id: string;
  slug: string | null;
}

const MAX_SITEMAP_URLS = 50_000;
const STATIC_URL_COUNT = 11;
const MAX_PRODUCT_URLS = MAX_SITEMAP_URLS - STATIC_URL_COUNT;

class CatalogHttpError extends Error {
  constructor(readonly status: number) {
    super(`Catalog request failed (${status})`);
  }
}

function publicApiKey(candidate?: string): string {
  const value = candidate?.trim();
  if (!value || value.startsWith('sb_secret_')) return '';
  const parts = value.split('.');
  if (parts.length === 3) {
    try {
      const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='))) as { role?: string };
      if (payload.role !== 'anon') return '';
    } catch {
      return '';
    }
  } else if (!value.startsWith('sb_publishable_')) return '';
  return value;
}

function productResource(candidate?: string): 'v_site_products_public' | 'v_products_public' {
  return candidate?.trim() === 'v_products_public' ? 'v_products_public' : 'v_site_products_public';
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character] || character);
}

function urlEntry(location: string, changeFrequency: string, priority: string, lastModified?: string | null) {
  return [
    '  <url>',
    `    <loc>${escapeXml(location)}</loc>`,
    lastModified ? `    <lastmod>${escapeXml(lastModified.slice(0, 10))}</lastmod>` : '',
    `    <changefreq>${changeFrequency}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n');
}

async function fetchAllProducts(resource: string, apiKey: string): Promise<ProductSitemapRow[]> {
  const pageSize = 1000;
  const products: ProductSitemapRow[] = [];
  for (let offset = 0; products.length < MAX_PRODUCT_URLS; offset += pageSize) {
    const limit = Math.min(pageSize, MAX_PRODUCT_URLS - products.length);
    const params = new URLSearchParams({
      select: 'id,slug',
      is_active: 'eq.true',
      slug: 'not.is.null',
      order: 'created_at.desc.nullslast,id.asc',
      limit: String(limit),
      offset: String(offset),
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let catalogResponse: Response;
    try {
      catalogResponse = await fetch(`${SUPABASE_URL}/rest/v1/${resource}?${params.toString()}`, {
        signal: controller.signal,
        headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!catalogResponse.ok) throw new CatalogHttpError(catalogResponse.status);
    const page = await catalogResponse.json() as ProductSitemapRow[];
    products.push(...page.slice(0, limit));
    if (page.length < limit) break;
  }
  return products;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method && !['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    response.status(405).send('Method Not Allowed');
    return;
  }

  if (request.method === 'HEAD') {
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.status(200).send('');
    return;
  }

  const siteUrl = (process.env.VITE_PUBLIC_URL || FALLBACK_SITE_URL).replace(/\/$/, '');
  const apiKey = publicApiKey(process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const preferredResource = productResource(process.env.VITE_PRODUCT_CATALOG_RESOURCE);
  let products: ProductSitemapRow[] = [];
  let catalogAvailable = true;

  try {
    products = await fetchAllProducts(preferredResource, apiKey);
  } catch (error) {
    if (preferredResource !== 'v_products_public' && error instanceof CatalogHttpError && error.status === 404) {
      try {
        products = await fetchAllProducts('v_products_public', apiKey);
      } catch {
        catalogAvailable = false;
      }
    } else {
      catalogAvailable = false;
    }
  }

  if (!catalogAvailable) {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Retry-After', '300');
    response.status(503).send(request.method === 'HEAD' ? '' : 'Sitemap temporariamente indisponível.');
    return;
  }

  const staticEntries = [
    urlEntry(`${siteUrl}/`, 'weekly', '1.0'),
    urlEntry(`${siteUrl}/catalogo`, 'daily', '0.9'),
    urlEntry(`${siteUrl}/catalogos`, 'weekly', '0.8'),
    urlEntry(`${siteUrl}/datas-comemorativas`, 'monthly', '0.8'),
    urlEntry(`${siteUrl}/sobre`, 'monthly', '0.6'),
    urlEntry(`${siteUrl}/contato`, 'monthly', '0.6'),
    urlEntry(`${siteUrl}/privacidade`, 'yearly', '0.2'),
    urlEntry(`${siteUrl}/ideias/onboarding`, 'monthly', '0.7'),
    urlEntry(`${siteUrl}/ideias/eventos`, 'monthly', '0.7'),
    urlEntry(`${siteUrl}/ideias/clientes-vip`, 'monthly', '0.7'),
    urlEntry(`${siteUrl}/ideias/sustentaveis`, 'monthly', '0.7'),
  ];
  const seenSlugs = new Set<string>();
  const productEntries = products.flatMap((product) => {
    const slug = product.slug?.trim();
    if (!slug || seenSlugs.has(slug)) return [];
    seenSlugs.add(slug);
    return [urlEntry(`${siteUrl}/produto/${encodeURIComponent(slug)}`, 'weekly', '0.8')];
  });
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...productEntries,
    '</urlset>',
  ].join('\n');

  response.setHeader('Content-Type', 'application/xml; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  response.status(200).send(request.method === 'HEAD' ? '' : xml);
}
