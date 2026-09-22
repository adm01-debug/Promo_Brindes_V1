import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QuoteItem } from '../types';
import { deleteMySelection, listMySelections, referencesFromCart, saveMySelection, setMySelectionArchived, type SavedSelection } from './customerSelections';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('./siteSupabase', () => ({ siteSupabase: { rpc } }));

const product: QuoteItem = {
  key: '11111111-1111-4111-8111-111111111111::azul',
  productId: '11111111-1111-4111-8111-111111111111',
  slug: 'garrafa', name: 'Garrafa', sku: 'PB-1', imageUrl: '/garrafa.webp',
  minQuantity: 50, quantity: 100, variantId: 'azul', decisionGroup: 'alternative',
};
const saved: SavedSelection = {
  id: '22222222-2222-4222-8222-222222222222', title: 'Feira',
  references: [{ id: product.productId, q: 100, v: 'azul', d: 'alternative' }],
  campaign: { source: 'finder', moment: 'evento' }, version: 3, archivedAt: null,
  createdAt: '2026-09-22T12:00:00Z', updatedAt: '2026-09-22T12:00:00Z',
};

describe('seleções privadas da conta', () => {
  afterEach(() => rpc.mockReset());

  it('envia somente referências públicas e preserva o grupo alternativo', () => {
    expect(referencesFromCart([product])).toEqual(saved.references);
    expect(JSON.stringify(referencesFromCart([product]))).not.toContain('Garrafa');
  });

  it('preserva o nome da cor quando o catálogo não fornece variantId', () => {
    expect(referencesFromCart([{ ...product, variantId: undefined, colorName: 'Azul petróleo' }])).toEqual([
      { id: product.productId, q: 100, c: 'Azul petróleo', d: 'alternative' },
    ]);
  });

  it('lista, cria e atualiza usando a versão recebida do servidor', async () => {
    rpc.mockResolvedValueOnce({ data: { items: [saved] }, error: null })
      .mockResolvedValueOnce({ data: { id: saved.id, version: 1 }, error: null })
      .mockResolvedValueOnce({ data: { id: saved.id, version: 4 }, error: null });
    const [selection] = await listMySelections(false);
    expect(selection).toMatchObject(saved);
    expect(rpc).toHaveBeenCalledWith('list_my_selections', { p_include_archived: false });
    await saveMySelection(' Nova campanha ', [product]);
    expect(rpc).toHaveBeenCalledWith('save_my_selection', expect.objectContaining({
      p_title: 'Nova campanha', p_references: saved.references, p_id: undefined,
    }));
    await saveMySelection('Feira', [product], undefined, selection);
    expect(rpc).toHaveBeenCalledWith('save_my_selection', expect.objectContaining({
      p_id: saved.id, p_expected_version: 3,
    }));
  });

  it('não encobre conflito de edição concorrente e exige nova leitura', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'selection_version_conflict' } });
    await expect(saveMySelection('Feira', [product], undefined, saved)).rejects.toThrow('selection_version_conflict');
    await expect(setMySelectionArchived(saved, true)).rejects.toThrow('selection_version_conflict');
    await expect(deleteMySelection(saved)).rejects.toThrow('selection_version_conflict');
  });

  it('não aceita resposta de seleção de outro formato', async () => {
    rpc.mockResolvedValue({ data: { items: [{ ...saved, id: 'forged' }] }, error: null });
    await expect(listMySelections()).rejects.toThrow('invalid_saved_selection');
  });
});
