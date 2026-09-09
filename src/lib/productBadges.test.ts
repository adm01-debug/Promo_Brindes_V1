import { describe, expect, it } from 'vitest';
import { isCatalogKit, isWithinNoveltyWindow, productBadgeConfig } from './productBadges';

describe('badges de produto', () => {
  const now = Date.parse('2026-09-09T12:00:00.000Z');

  it('replica a janela de 30 dias do Promo Gifts sem aceitar datas futuras', () => {
    expect(productBadgeConfig.noveltyWindowDays).toBe(30);
    expect(isWithinNoveltyWindow('2026-09-09T12:00:00.000Z', now)).toBe(true);
    expect(isWithinNoveltyWindow('2026-08-10T12:00:00.000Z', now)).toBe(true);
    expect(isWithinNoveltyWindow('2026-08-09T11:59:59.000Z', now)).toBe(false);
    expect(isWithinNoveltyWindow('2026-09-10T12:00:00.000Z', now)).toBe(false);
    expect(isWithinNoveltyWindow('data-invalida', now)).toBe(false);
  });

  it('prioriza is_kit e usa categoria ou prefixo somente como fallback legado', () => {
    expect(isCatalogKit({ isKit: true, name: 'Mochila' }, 'Bolsas')).toBe(true);
    expect(isCatalogKit({ isKit: false, name: 'Conjunto churrasco' }, 'Kits | Churrasco')).toBe(true);
    expect(isCatalogKit({ isKit: false, name: 'Kit boas-vindas' }, 'Presentes')).toBe(true);
    expect(isCatalogKit({ isKit: false, name: 'Kitten decorativo' }, 'Casa')).toBe(false);
    expect(isCatalogKit({ isKit: false, name: 'Caneca' }, 'Cozinha')).toBe(false);
  });
});
