import { describe, expect, it } from 'vitest';
import { customerStatusLabel, customerStatusTone, isProposalExpired, normalizeCustomerHistoryPage, sanitizeCustomerNextPath } from './customerAccount';

describe('contrato da Área do Cliente', () => {
  it('traduz somente estados operacionais reais', () => {
    expect(customerStatusLabel('new')).toBe('Recebida');
    expect(customerStatusLabel('quoted')).toBe('Proposta disponível');
    expect(customerStatusTone('in_progress')).toBe('progress');
    expect(customerStatusTone('closed')).toBe('closed');
  });

  it('aceita retorno apenas para dentro da Área do Cliente', () => {
    expect(sanitizeCustomerNextPath('/minha-conta/orcamentos/abc')).toBe('/minha-conta/orcamentos/abc');
    expect(sanitizeCustomerNextPath('//evil.test')).toBe('/minha-conta');
    expect(sanitizeCustomerNextPath('/catalogo')).toBe('/minha-conta');
  });

  it('distingue a versão mais recente de uma proposta ainda válida', () => {
    expect(isProposalExpired({ validUntil: '2026-09-11' }, '2026-09-12')).toBe(true);
    expect(isProposalExpired({ validUntil: '2026-09-12' }, '2026-09-12')).toBe(false);
    expect(isProposalExpired({ validUntil: null }, '2026-09-12')).toBe(false);
  });

  it('aceita somente páginas inteiras dentro do limite do histórico', () => {
    expect(normalizeCustomerHistoryPage(null)).toBe(1);
    expect(normalizeCustomerHistoryPage('1')).toBe(1);
    expect(normalizeCustomerHistoryPage('2.5')).toBe(1);
    expect(normalizeCustomerHistoryPage('-2')).toBe(1);
    expect(normalizeCustomerHistoryPage('999')).toBe(834);
  });
});
