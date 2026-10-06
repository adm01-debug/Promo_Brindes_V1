import { describe, expect, it } from 'vitest';
import type { QuoteItem } from '../types';
import { remainingItemsAfterSubmission, sameQuoteSelection, sameQuoteSelectionContext } from './quoteSubmission';

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
  it('considera inalterada uma seleção recriada por render sem edição', () => {
    const submittedItem = item('a');
    const submitted = { items: [submittedItem], campaign: { source: 'finder' as const, moment: 'evento' as const }, selectionTitle: 'Ação de verão' };
    const recreated = { items: [{ ...submittedItem }], campaign: { ...submitted.campaign }, selectionTitle: 'Ação de verão' };
    expect(sameQuoteSelection(submitted, recreated)).toBe(true);
    expect(sameQuoteSelectionContext(submitted, recreated)).toBe(true);
  });

  it('distingue edição de produto ou contexto da seleção enviada', () => {
    const submitted = { items: [item('a')], campaign: { source: 'finder' as const, moment: 'evento' as const }, selectionTitle: 'Ação de verão' };
    expect(sameQuoteSelection(submitted, { ...submitted, items: [item('a', { quantity: 250 })] })).toBe(false);
    expect(sameQuoteSelectionContext(submitted, { ...submitted, selectionTitle: 'Nova ação' })).toBe(false);
  });

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

  it('preserva os componentes restantes quando um item do kit é removido', () => {
    const submitted = [
      item('a', { kitGroupId: 'kit-1', unitsPerKit: 1 }),
      item('b', { kitGroupId: 'kit-1', unitsPerKit: 2 }),
      item('c', { kitGroupId: 'kit-1', unitsPerKit: 3 }),
    ];
    const current = submitted.slice(1);
    expect(remainingItemsAfterSubmission(submitted, current)).toEqual(current);
  });
});
