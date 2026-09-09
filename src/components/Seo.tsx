import { useEffect } from 'react';

const SITE_NAME = 'Promo Brindes';
const DEFAULT_DESCRIPTION =
  'Brindes corporativos personalizados para campanhas, eventos, reconhecimento e relacionamento.';

interface SeoProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = '/images/hero-gen-z-v2.webp',
  noIndex = false,
  jsonLd,
}: SeoProps) {
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_PUBLIC_URL?.replace(/\/$/, '') || 'https://promo-brindes-v1.vercel.app';
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Brindes corporativos personalizados`;
    const canonicalUrl = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const imageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;
    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noIndex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large');
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:locale', 'pt_BR');
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('name', 'twitter:card', 'summary_large_image');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const schemaId = 'page-json-ld';
    document.getElementById(schemaId)?.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = schemaId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => document.getElementById(schemaId)?.remove();
  }, [description, image, jsonLd, noIndex, path, title]);
  return null;
}
