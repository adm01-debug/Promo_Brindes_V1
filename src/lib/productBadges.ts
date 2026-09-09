const NOVELTY_WINDOW_DAYS = 30;
const MS_PER_DAY = 86_400_000;
const KIT_TOKEN = /(^|\s|[-_/|])kits?(\s|$|[-_/|])/i;

function normalized(value: string | null | undefined): string {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** Mesma janela canônica de novidade usada pelo Promo Gifts. */
export function isWithinNoveltyWindow(createdAt: unknown, now = Date.now()): boolean {
  if (typeof createdAt !== 'string' || !createdAt) return false;
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) return false;
  const elapsedDays = (now - timestamp) / MS_PER_DAY;
  return elapsedDays >= 0 && elapsedDays <= NOVELTY_WINDOW_DAYS;
}

/**
 * O campo canônico continua soberano; a taxonomia é apenas um fallback para
 * registros legados em que `is_kit` ainda não foi preenchido.
 */
export function isCatalogKit(
  product: { isKit: boolean; name: string },
  categoryName?: string | null,
): boolean {
  if (product.isKit) return true;
  return KIT_TOKEN.test(normalized(categoryName)) || /^kits?(\s|$|[-_/|])/i.test(normalized(product.name));
}

export const productBadgeConfig = { noveltyWindowDays: NOVELTY_WINDOW_DAYS } as const;
