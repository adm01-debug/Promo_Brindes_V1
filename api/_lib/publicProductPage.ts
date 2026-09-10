import { fallbackPageShell, renderPageShell, type PublicPageMetadata } from './pageShell.js';

const CANONICAL_PROJECT_ID = 'doufsxqlfjyuvxuezpln';
const CATALOG_URL = `https://${CANONICAL_PROJECT_ID}.supabase.co`;
const FALLBACK_SITE_URL = 'https://promo-brindes-v1.vercel.app';
const PRODUCT_FIELDS = 'id,name,sku,slug,short_description,description,ai_summary,ai_description,primary_image_url,primary_image_fallback_url,set_image_url,og_image_url,images';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,198}[a-z0-9])?$/i;

export interface PublicProductRow {
  id: string;
  name: string;
  sku: string;
  slug: string | null;
  short_description: string | null;
  description: string | null;
  ai_summary: string | null;
  ai_description: string | null;
  primary_image_url: string | null;
  primary_image_fallback_url: string | null;
  set_image_url: string | null;
  og_image_url: string | null;
  images: unknown;
}

export class PublicProductPageError extends Error {
  constructor(readonly status: 400 | 503, message: string) {
    super(message);
  }
}

function publicApiKey(candidate?: string): string {
  const value = candidate?.trim();
  if (!value || value.startsWith('sb_secret_')) return '';
  const parts = value.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '='))) as { role?: string };
      return payload.role === 'anon' ? value : '';
    } catch {
      return '';
    }
  }
  return value.startsWith('sb_publishable_') ? value : '';
}

function catalogResource(candidate?: string): 'v_site_products_public' | 'v_products_public' {
  return candidate?.trim() === 'v_products_public' ? 'v_products_public' : 'v_site_products_public';
}

function imageCandidates(row: PublicProductRow): string[] {
  const fromImages = Array.isArray(row.images) ? row.images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0) : [];
  return [row.og_image_url, row.primary_image_url, row.set_image_url, row.primary_image_fallback_url, ...fromImages]
    .filter((image): image is string => Boolean(image?.trim()));
}

export function configuredSiteOrigin(): string {
  const candidate = process.env.VITE_PUBLIC_URL?.trim() || process.env.SITE_PUBLIC_ORIGIN?.trim() || FALLBACK_SITE_URL;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.origin : FALLBACK_SITE_URL;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

function deployedAppOrigin(): string {
  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost && /^[a-z0-9.-]+$/i.test(deploymentHost)) return `https://${deploymentHost}`;
  return configuredSiteOrigin();
}

export function validProductIdentifier(value: string): boolean {
  return UUID_PATTERN.test(value) || SLUG_PATTERN.test(value);
}

export async function fetchPublicProduct(identifier: string): Promise<PublicProductRow | null> {
  if (!validProductIdentifier(identifier)) throw new PublicProductPageError(400, 'Identificador de produto inválido.');
  const apiKey = publicApiKey(process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!apiKey) throw new PublicProductPageError(503, 'Catálogo público não configurado.');
  const isUuid = UUID_PATTERN.test(identifier);
  const params = new URLSearchParams({ select: PRODUCT_FIELDS, is_active: 'eq.true', limit: '1' });
  params.set(isUuid ? 'id' : 'slug', `eq.${identifier}`);
  const get = async (resource: string) => fetch(`${CATALOG_URL}/rest/v1/${resource}?${params.toString()}`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  let response: Response;
  try {
    response = await get(catalogResource(process.env.VITE_PRODUCT_CATALOG_RESOURCE));
    if (response.status === 404 && catalogResource(process.env.VITE_PRODUCT_CATALOG_RESOURCE) !== 'v_products_public') response = await get('v_products_public');
  } catch {
    throw new PublicProductPageError(503, 'Catálogo temporariamente indisponível.');
  }
  if (!response.ok) throw new PublicProductPageError(503, 'Catálogo temporariamente indisponível.');
  const products = await response.json().catch(() => null);
  if (!Array.isArray(products) || !products[0] || typeof products[0] !== 'object') return null;
  const row = products[0] as Partial<PublicProductRow>;
  if (typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.sku !== 'string') return null;
  return row as PublicProductRow;
}

export async function loadAppShell(): Promise<string> {
  try {
    const response = await fetch(`${deployedAppOrigin()}/index.html`, { headers: { Accept: 'text/html' } });
    if (!response.ok) throw new Error('app shell unavailable');
    return await response.text();
  } catch {
    throw new PublicProductPageError(503, 'Site temporariamente indisponível.');
  }
}

export function productMetadata(row: PublicProductRow): PublicPageMetadata {
  const siteOrigin = configuredSiteOrigin();
  const slug = row.slug?.trim() || row.id;
  const description = (row.ai_summary || row.short_description || row.ai_description || row.description || DEFAULT_PRODUCT_DESCRIPTION)
    .replace(/\s+/g, ' ').trim().slice(0, 300);
  const images = imageCandidates(row);
  const imageUrl = images[0] || `${siteOrigin}/images/product-placeholder.svg`;
  return {
    title: `${row.name.trim()} | Promo Brindes`,
    description,
    canonicalUrl: `${siteOrigin}/produto/${encodeURIComponent(slug)}`,
    imageUrl,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: row.name.trim(),
      sku: row.sku.trim(),
      description,
      image: images.length ? images : [imageUrl],
      url: `${siteOrigin}/produto/${encodeURIComponent(slug)}`,
      brand: { '@type': 'Brand', name: 'Promo Brindes' },
    },
  };
}

const DEFAULT_PRODUCT_DESCRIPTION = 'Brinde corporativo para personalizar a experiência da sua marca.';

export function unavailableProductShell(shell: string, canonicalUrl: string, title: string, description: string, status: 404 | 503): string {
  return renderPageShell(shell, {
    title,
    description,
    canonicalUrl,
    imageUrl: `${configuredSiteOrigin()}/images/hero-gen-z-v2.webp`,
    noIndex: true,
  });
}

export function emergencyPageShell(canonicalUrl: string, title: string, description: string): string {
  return fallbackPageShell({ title, description, canonicalUrl, imageUrl: `${configuredSiteOrigin()}/images/hero-gen-z-v2.webp`, noIndex: true });
}
