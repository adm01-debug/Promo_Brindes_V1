const DEFAULT_TITLE = 'Promo Brindes | Brindes corporativos personalizados';
const DEFAULT_DESCRIPTION = 'Brindes corporativos personalizados para campanhas, eventos, reconhecimento e relacionamento.';

export interface PublicPageMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] || character);
}

function replaceTag(html: string, expression: RegExp, replacement: string): string {
  return expression.test(html) ? html.replace(expression, replacement) : html;
}

function jsonForScript(value: Record<string, unknown>): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Mantém o app SPA como experiência de navegação, mas entrega a mesma identidade
 * documental já no HTML inicial. Valores vindos do catálogo são escapados antes
 * de entrarem em atributos ou no JSON-LD.
 */
export function renderPageShell(appShell: string, metadata: PublicPageMetadata): string {
  const title = escapeHtml(metadata.title || DEFAULT_TITLE);
  const description = escapeHtml(metadata.description || DEFAULT_DESCRIPTION);
  const canonicalUrl = escapeHtml(metadata.canonicalUrl);
  const imageUrl = escapeHtml(metadata.imageUrl);
  const robots = metadata.noIndex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large';

  let html = appShell;
  html = replaceTag(html, /<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  html = replaceTag(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="description" content="${description}" />`);
  html = replaceTag(html, /<meta\s+name="robots"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="robots" content="${robots}" />`);
  html = replaceTag(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:title" content="${title}" />`);
  html = replaceTag(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:description" content="${description}" />`);
  html = replaceTag(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
  html = replaceTag(html, /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:image" content="${imageUrl}" />`);
  html = replaceTag(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?\s*>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
  html = html.replace(/<script id="page-json-ld" type="application\/ld\+json">[\s\S]*?<\/script>/i, '');
  if (metadata.jsonLd) {
    const script = `<script id="page-json-ld" type="application/ld+json">${jsonForScript(metadata.jsonLd)}</script>`;
    html = html.replace('</head>', `  ${script}\n  </head>`);
  }
  return html;
}

export function fallbackPageShell(metadata: PublicPageMetadata): string {
  const title = escapeHtml(metadata.title || DEFAULT_TITLE);
  const description = escapeHtml(metadata.description || DEFAULT_DESCRIPTION);
  const robots = metadata.noIndex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${title}</title><meta name="description" content="${description}" /><meta name="robots" content="${robots}" /><link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" /></head><body><main><h1>${title}</h1><p>${description}</p></main></body></html>`;
}
