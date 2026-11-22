import { describe, expect, it } from 'vitest';
import { productApplicationIdeas, productHasApplications, productMaterialLabels, productReasons } from './productApplications';
import type { CatalogProduct } from '../types';

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 'p1', name: 'Caneca executiva', sku: 'SKU-1', slug: 'caneca-executiva',
    description: '', shortDescription: '', imageUrl: '', images: [],
    categoryId: 'categoria-a', mainCategoryId: 'categoria-a', brand: null, minQuantity: 100,
    isNew: false, isFeatured: false, isBestseller: false, isKit: false, allowsPersonalization: false,
    hasCommercialPackaging: false, colors: [], materials: [], dimensions: {},
    ...overrides,
  };
}

describe('product applications', () => {
  it('omite razão de material quando a ficha não declara material', () => {
    const reasons = productReasons(product());
    expect(reasons.every((reason) => !reason.title.toLowerCase().includes('material'))).toBe(true);
  });

  it('declara apenas os materiais presentes no cadastro, normalizados', () => {
    expect(productMaterialLabels(product({ materials: ['Aço Inox', 'Metal', 'Material importado'] })))
      .toEqual(['aço inox', 'metal']);
  });

  it('descreve material durável sem prometer desempenho da campanha', () => {
    const material = productReasons(product({ materials: ['Aço Inox'] })).find((reason) => reason.title.includes('aço inox'));
    expect(material?.detail).toContain('Material durável segundo a ficha do fornecedor');
    expect(material?.detail).not.toMatch(/garante|garantia|resultado/i);
  });

  it('marca sugestões como editoriais e não como garantia', () => {
    const ideas = productApplicationIdeas(product({ allowsPersonalization: true, dimensions: { capacityMl: 500 } }));
    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas.join(' ')).not.toMatch(/garantimos|garantia de resultado/i);
  });

  it('não cria razão de capacidade abaixo de 300 ml nem de cores quando há uma única cor', () => {
    const reasons = productReasons(product({ dimensions: { capacityMl: 250 }, colors: [{ name: 'Azul', hex: '#00f' }] }));
    expect(reasons.some((reason) => reason.title.includes('ml'))).toBe(false);
    expect(reasons.some((reason) => reason.title.includes('cores'))).toBe(false);
  });

  it('respeita o mínimo de tiragem como dado, não como benefício', () => {
    const reasons = productReasons(product({ minQuantity: 300 }));
    const minimum = reasons.find((reason) => reason.title.includes('Tiragem'));
    expect(minimum?.detail).toContain('abaixo disso o pedido não é produzido');
  });

  it('limita a quantidade de razões e ideias para não dominar a ficha', () => {
    const heavy = product({
      isKit: true, allowsPersonalization: true, hasCommercialPackaging: true, isBestseller: true, isNew: true,
      materials: ['Aço', 'Vidro'], minQuantity: 500, colors: [{ name: 'A', hex: '#000' }, { name: 'B', hex: '#fff' }],
      dimensions: { capacityMl: 750, weightG: 300, heightCm: 20 },
    });
    expect(productReasons(heavy).length).toBeLessThanOrEqual(5);
    expect(productApplicationIdeas(heavy).length).toBeLessThanOrEqual(4);
    expect(productHasApplications(heavy)).toBe(true);
  });

  it('sinaliza produto sem nenhum atributo aproveitável', () => {
    expect(productHasApplications(product({ minQuantity: 1 }))).toBe(false);
  });
});
