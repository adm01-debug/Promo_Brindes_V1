import { describe, expect, it } from 'vitest';
import { localDateInputValue } from './QuotePage';

describe('data mínima do briefing', () => {
  it('usa o calendário local em vez de converter o instante para UTC', () => {
    expect(localDateInputValue(new Date(2026, 8, 8, 23, 45))).toBe('2026-09-08');
    expect(localDateInputValue(new Date(2026, 0, 2, 0, 5))).toBe('2026-01-02');
  });
});
