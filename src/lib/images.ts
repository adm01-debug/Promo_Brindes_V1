import type { SyntheticEvent } from 'react';

const PRODUCT_PLACEHOLDER = '/images/product-placeholder.svg';

export function replaceBrokenProductImage(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.src.endsWith(PRODUCT_PLACEHOLDER)) return;
  image.onerror = null;
  image.src = PRODUCT_PLACEHOLDER;
}
