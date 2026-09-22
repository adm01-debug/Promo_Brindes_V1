import { describe, expect, it } from 'vitest';
import { cartReducer } from './quoteCartReducer';
import { MAX_QUOTE_ITEMS, normalizeQuoteItems } from '../lib/quoteItems';
import type { QuoteItem } from '../types';

const item: QuoteItem = {
  key: '11111111-1111-4111-8111-111111111111::azul',
  productId: '11111111-1111-4111-8111-111111111111',
  slug: 'produto-1',
  name: 'Produto 1',
  sku: 'P-1',
  imageUrl: '/produto.webp',
  quantity: 100,
  minQuantity: 50,
  colorName: 'Azul',
};

describe('seleção para orçamento', () => {
  it('adiciona e mantém uma linha por produto e cor', () => {
    const added = cartReducer({ items: [] }, { type: 'add', item });
    const repeated = cartReducer(added, { type: 'add', item: { ...item, quantity: 80 } });
    expect(repeated.items).toEqual([item]);
  });

  it('respeita a quantidade mínima do item', () => {
    const state = cartReducer({ items: [item] }, { type: 'quantity', key: item.key, quantity: 1 });
    expect(state.items[0]?.quantity).toBe(50);
  });

  it('limita quantidades acidentalmente excessivas', () => {
    const state = cartReducer({ items: [item] }, { type: 'quantity', key: item.key, quantity: 2_000_000 });
    expect(state.items[0]?.quantity).toBe(999_999);
  });

  it('remove uma linha sem afetar as demais', () => {
    const other = { ...item, key: '22222222-2222-4222-8222-222222222222::azul', productId: '22222222-2222-4222-8222-222222222222' };
    const state = cartReducer({ items: [item, other] }, { type: 'remove', key: item.key });
    expect(state.items).toEqual([other]);
  });

  it('limpa a seleção sem perder a direção de campanha e permite reset completo após envio', () => {
    const campaign = { source: 'finder' as const, moment: 'onboarding' as const };
    const cleared = cartReducer({ items: [item], campaign }, { type: 'clear' });
    expect(cleared).toEqual({ items: [], campaign });
    expect(cartReducer(cleared, { type: 'reset' })).toEqual({ items: [] });
  });

  it('preserva a direção de campanha ao adicionar, alterar quantidade, remover e restaurar itens', () => {
    const campaign = { source: 'finder' as const, moment: 'onboarding' as const };
    const added = cartReducer({ items: [], campaign }, { type: 'add', item });
    expect(added.campaign).toEqual(campaign);
    const updated = cartReducer(added, { type: 'quantity', key: item.key, quantity: 300 });
    expect(updated.campaign).toEqual(campaign);
    const removed = cartReducer(updated, { type: 'remove', key: item.key });
    expect(removed).toEqual({ items: [], campaign });
    expect(cartReducer(removed, { type: 'restore', item, index: 0 })).toEqual({ items: [item], campaign });
  });

  it('mantém o nome opcional da seleção até o reset definitivo após envio', () => {
    const named = cartReducer({ items: [item] }, { type: 'selection-title', title: 'Boas-vindas do time' });
    expect(named.selectionTitle).toBe('Boas-vindas do time');
    expect(cartReducer(named, { type: 'clear' }).selectionTitle).toBe('Boas-vindas do time');
    expect(cartReducer(named, { type: 'reset' })).toEqual({ items: [] });
  });

  it('separa referência principal de alternativa sem perder o item', () => {
    const alternative = cartReducer({ items: [item] }, { type: 'decision-group', key: item.key, group: 'alternative' });
    expect(alternative.items[0]).toMatchObject({ ...item, decisionGroup: 'alternative' });
    const primary = cartReducer(alternative, { type: 'decision-group', key: item.key, group: 'primary' });
    expect(primary.items[0]).toEqual(item);
  });

  it('normaliza storage corrompido, remove extras e consolida duplicatas', () => {
    const values = [
      { ...item, key: 'forjado', quantity: -777, admin: true },
      { ...item, key: 'duplicado', quantity: 80 },
      { ...item, productId: 'inválido', slug: undefined },
    ];
    const normalized = normalizeQuoteItems(values);
    expect(normalized).toEqual([{ ...item, quantity: 80 }]);
    expect(normalized[0]).not.toHaveProperty('admin');
  });

  it('limita a seleção restaurada para manter o briefing utilizável', () => {
    const values = Array.from({ length: MAX_QUOTE_ITEMS + 10 }, (_, index) => ({
      ...item,
      key: `ignorado-${index}`,
      productId: `${String(index).padStart(8, '0')}-1111-4111-8111-111111111111`,
      slug: `produto-${index}`,
    }));
    expect(normalizeQuoteItems(values)).toHaveLength(MAX_QUOTE_ITEMS);
  });

  it('atualiza todos os componentes de um kit sem quebrar a aritmética', () => {
    const group = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const first = { ...item, kitGroupId: group, kitName: 'Kit', kitQuantity: 100, unitsPerKit: 2, quantity: 200, minQuantity: 50 };
    const second = { ...item, key: `${item.productId}::azul`, colorName: 'Azul', kitGroupId: group, kitName: 'Kit', kitQuantity: 100, unitsPerKit: 1, quantity: 100, minQuantity: 120 };
    const updated = cartReducer({ items: [first, second] }, { type: 'kit-quantity', kitGroupId: group, quantity: 80 });
    expect(updated.items.map((current) => current.kitQuantity)).toEqual([120, 120]);
    expect(updated.items.map((current) => current.quantity)).toEqual([240, 120]);
  });

  it('redireciona edição individual de componente para a quantidade inteira do kit', () => {
    const group = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const first = { ...item, kitGroupId: group, kitName: 'Kit', kitQuantity: 100, unitsPerKit: 2, quantity: 200, minQuantity: 50 };
    const second = { ...item, key: '22222222-2222-4222-8222-222222222222::azul', productId: '22222222-2222-4222-8222-222222222222', kitGroupId: group, kitName: 'Kit', kitQuantity: 100, unitsPerKit: 1, quantity: 100, minQuantity: 50 };
    const updated = cartReducer({ items: [first, second] }, { type: 'quantity', key: first.key, quantity: 202 });
    expect(updated.items.map((current) => current.kitQuantity)).toEqual([101, 101]);
    expect(updated.items.map((current) => current.quantity)).toEqual([202, 101]);
  });

  it('ao remover um dos dois componentes, converte o item restante em referência avulsa', () => {
    const group = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const first = { ...item, kitGroupId: group, kitName: 'Kit', kitQuantity: 100, unitsPerKit: 1 };
    const second = { ...item, key: '22222222-2222-4222-8222-222222222222::azul', productId: '22222222-2222-4222-8222-222222222222', kitGroupId: group, kitName: 'Kit', kitQuantity: 100, unitsPerKit: 1 };
    const updated = cartReducer({ items: [first, second] }, { type: 'remove', key: first.key });
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0]).toMatchObject({ key: second.key, productId: second.productId, quantity: second.quantity });
    expect(updated.items[0]).not.toHaveProperty('kitGroupId');
  });

  it('substitui o moodboard por um orçamento anterior normalizado', () => {
    const previous = { ...item, quantity: 250 };
    expect(cartReducer({ items: [] }, { type: 'replace', items: [previous] }).items).toEqual([previous]);
  });

  it('limpa o contexto anterior quando uma seleção compartilhada substitui a atual', () => {
    const replacement = { ...item, quantity: 250 };
    const state = cartReducer(
      { items: [item], campaign: { source: 'finder', moment: 'onboarding' }, selectionTitle: 'Campanha anterior' },
      { type: 'replace-selection', items: [replacement] },
    );
    expect(state).toEqual({ items: [replacement] });
  });

  it('restaura itens, campanha e título juntos ao desfazer uma limpeza', () => {
    const saved = { items: [item], campaign: { source: 'finder' as const, moment: 'onboarding' as const }, selectionTitle: 'Boas-vindas do time' };
    expect(cartReducer({ items: [] }, { type: 'restore-selection', state: saved })).toEqual(saved);
  });

  it('retoma uma seleção da conta em uma única transição, sem misturar a campanha anterior', () => {
    const restored = cartReducer(
      { items: [item], campaign: { source: 'finder', moment: 'onboarding' }, selectionTitle: 'Antiga' },
      { type: 'restore-saved-selection', items: [{ ...item, quantity: 250, decisionGroup: 'alternative' }], campaign: { source: 'finder', moment: 'evento' }, title: 'Feira de outubro' },
    );
    expect(restored).toMatchObject({
      items: [{ ...item, quantity: 250, decisionGroup: 'alternative' }],
      campaign: { source: 'finder', moment: 'evento' },
      selectionTitle: 'Feira de outubro',
    });
  });
});
