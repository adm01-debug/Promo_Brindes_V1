import { describe, expect, it } from 'vitest';
import type { CatalogProduct } from '../types';
import { buildKitQuoteItems, kitTemplates, kitTotalUnits, mergeKitIntoSelection, minimumKitQuantity, missingRequiredKitSlots, type KitComponent } from './kitBuilder';

function product(id: string, name: string, minimum: number): CatalogProduct {
  return { id, name, sku: name, slug: name.toLowerCase(), description: '', shortDescription: '', imageUrl: '/x.png', images: [], categoryId: null, mainCategoryId: null, brand: null, minQuantity: minimum, isNew: false, isFeatured: false, isBestseller: false, isKit: false, allowsPersonalization: true, hasCommercialPackaging: false, colors: [], materials: [], dimensions: {} };
}

const components: KitComponent[] = [
  { slotId: 'a', slotLabel: 'A', product: product('11111111-1111-4111-8111-111111111111', 'A', 100), unitsPerKit: 2 },
  { slotId: 'b', slotLabel: 'B', product: product('22222222-2222-4222-8222-222222222222', 'B', 60), unitsPerKit: 1 },
];

describe('composição de kits', () => {
  it('permite omitir extras, mas exige os dois componentes obrigatórios', () => {
    const template = kitTemplates.find((item) => item.id === 'completo')!;
    expect(missingRequiredKitSlots(template, [])).toHaveLength(2);
    expect(missingRequiredKitSlots(template, [{ ...components[0]!, slotId: 'apoio' }, { ...components[1]!, slotId: 'surpresa' }])).toHaveLength(2);
    expect(missingRequiredKitSlots(template, [{ ...components[0]!, slotId: 'principal' }, { ...components[1]!, slotId: 'rotina' }])).toEqual([]);
  });

  it('recusa estouro de unidades sem degradar o kit para itens avulsos', () => {
    expect(buildKitQuoteItems({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Kit', quantity: 500_000, components })).toEqual([]);
    const boundary = buildKitQuoteItems({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Kit', quantity: 499_999, components });
    expect(boundary).toHaveLength(2);
    expect(boundary[0]).toMatchObject({ quantity: 999_998, kitQuantity: 499_999, unitsPerKit: 2 });
  });
  it('calcula o mínimo pelo componente mais restritivo', () => {
    expect(minimumKitQuantity(components)).toBe(60);
    expect(kitTotalUnits(60, components)).toBe(180);
  });

  it('preserva kits × unidades por componente no item do orçamento', () => {
    const items = buildKitQuoteItems({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Kit boas-vindas', quantity: 60, components });
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ quantity: 120, kitQuantity: 60, unitsPerKit: 2, kitName: 'Kit boas-vindas' });
    expect(items[1]).toMatchObject({ quantity: 60, kitQuantity: 60, unitsPerKit: 1 });
    expect(mergeKitIntoSelection([], items)).toHaveLength(2);
  });

  it('recusa mínimo insuficiente, produto duplicado e composição incompleta', () => {
    expect(buildKitQuoteItems({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Kit', quantity: 59, components })).toEqual([]);
    expect(buildKitQuoteItems({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Kit', quantity: 60, components: [components[0]!, components[0]!] })).toEqual([]);
    expect(buildKitQuoteItems({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Kit', quantity: 100, components: [components[0]!] })).toEqual([]);
  });

  it('não mistura silenciosamente componente de kit com item avulso existente', () => {
    const items = buildKitQuoteItems({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Kit boas-vindas', quantity: 60, components });
    const existing = { ...items[0]!, kitGroupId: undefined, kitName: undefined, kitQuantity: undefined, unitsPerKit: undefined };

    expect(mergeKitIntoSelection([existing], items)).toBeNull();
  });
});
