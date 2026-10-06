import { describe, expect, it } from 'vitest';
import type { QuoteItem } from '../types';
import { remainingItemsAfterSubmission } from './quoteSubmission';

const item = (key: string, overrides: Partial<QuoteItem> = {}): QuoteItem => ({
  key,
  productId: key,
  slug: key,
  name: `Produto ${key}`,
  sku: key,
  imageUrl: '/produto.webp',
  minQuantity: 1,
  quantity: 100,
  ...overrides,
});

describe('reconciliação da seleção após o envio', () => {
  it('remove somente os snapshots efetivamente enviados', () => {
    const submitted = [item('a')];
    expect(remainingItemsAfterSubmission(submitted, [item('a'), item('b')])).toEqual([item('b')]);
  });

  it('preserva um item alterado durante a requisição', () => {
    const submitted = [item('a')];
    expect(remainingItemsAfterSubmission(submitted, [item('a', { quantity: 250 })])).toEqual([item('a', { quantity: 250 })]);
  });

  it('preserva todos os componentes quando um kit muda', () => {
    const submitted = [item('a', { kitGroupId: 'kit-1', unitsPerKit: 1 }), item('b', { kitGroupId: 'kit-1', unitsPerKit: 2 })];
    const current = [item('a', { kitGroupId: 'kit-1', unitsPerKit: 1, quantity: 200 }), item('b', { kitGroupId: 'kit-1', unitsPerKit: 2 })];
    expect(remainingItemsAfterSubmission(submitted, current)).toEqual(current);
  });
});
