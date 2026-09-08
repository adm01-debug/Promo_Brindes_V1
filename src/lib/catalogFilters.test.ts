import { describe, expect, it } from 'vitest';
import {
  categoryDescendantIds,
  categoryQueryIds,
  colorFilterIds,
  materialFilterIds,
  parseCatalogPage,
  parseCategoryIds,
  parseFilterIds,
  resolveColorValues,
  resolveMaterialValues,
  serializeFilterIds,
} from './catalogFilters';

describe('estado do superfiltro público', () => {
  it('aceita apenas IDs conhecidos e remove repetições da URL', () => {
    expect(parseFilterIds('preto,azul,preto,inventado', colorFilterIds)).toEqual(['preto', 'azul']);
    expect(parseFilterIds('bambu,nao-existe', materialFilterIds)).toEqual(['bambu']);
    expect(serializeFilterIds(['preto', 'azul', 'preto'])).toBe('preto,azul');
  });

  it('traduz IDs amigáveis para as grafias existentes no catálogo', () => {
    expect(resolveColorValues(['preto'])).toContain('PRETO');
    expect(resolveColorValues(['azul'])).toContain('AZUL CLARO');
    expect(resolveMaterialValues(['aco-inox'])).toEqual(['Aço Inox']);
    expect(resolveColorValues(['natural'])).toEqual(expect.arrayContaining(['NATURAL', 'NATURAL CLARO', 'NATURAL ESCURO']));
    expect(resolveMaterialValues(['reciclado'])).toEqual(expect.arrayContaining(['Plástico - rPET', 'Reciclado', 'Aço Inox Reciclado', 'Plásticos Ecológicos']));
  });

  it('aceita somente UUIDs de categoria e normaliza páginas externas', () => {
    const first = '11111111-1111-4111-8111-111111111111';
    const second = '22222222-2222-4222-8222-222222222222';
    expect(parseCategoryIds(`${first},inválido,${second},${first}`)).toEqual([first, second]);
    expect(parseCatalogPage('2.9')).toBe(2);
    expect(parseCatalogPage('1e309')).toBe(1);
    expect(parseCatalogPage('-4')).toBe(1);
    expect(parseCatalogPage('999999999')).toBe(10_000);
  });

  it('inclui todos os descendentes de uma categoria sem entrar em loop', () => {
    const categories = [
      { id: 'root', name: 'Tecnologia', parentId: null },
      { id: 'child', name: 'Áudio', parentId: 'root' },
      { id: 'grandchild', name: 'Fones', parentId: 'child' },
      { id: 'cycle-a', name: 'A', parentId: 'cycle-b' },
      { id: 'cycle-b', name: 'B', parentId: 'cycle-a' },
    ];
    expect(categoryDescendantIds(categories, ['root'])).toEqual(['root', 'child', 'grandchild']);
    expect(new Set(categoryDescendantIds(categories, ['cycle-a']))).toEqual(new Set(['cycle-a', 'cycle-b']));
    expect(categoryQueryIds(categories, ['root'])).toEqual(['root', 'child', 'grandchild']);
    expect(categoryQueryIds(categories, ['child'])).toEqual(['child', 'grandchild']);
  });
});
