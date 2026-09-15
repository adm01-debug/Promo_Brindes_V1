import { describe, expect, it } from 'vitest';
import { customerAuthRedirect } from '../lib/customerAuthRedirect';

describe('redirects da Área do Cliente', () => {
  it('mantém links de autenticação na origem pública canônica', () => {
    expect(customerAuthRedirect('/minha-conta/orcamentos/123')).toBe('https://promo-brindes-v1.vercel.app/auth/confirm?next=%2Fminha-conta%2Forcamentos%2F123');
  });
});
