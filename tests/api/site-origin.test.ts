import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { allowedSiteOrigins } from '../../api/_lib/siteOrigin.js';

/**
 * allowedSiteOrigins e o guarda de CSRF de toda a API (leadHandler, contracts,
 * shared-selections, customer-proposals, briefing-assets). Antes deste arquivo ele nao
 * tinha teste direto: um erro aqui abre a API para qualquer origem ou a fecha para a
 * origem legitima, e nos dois casos o sintoma so aparece em producao.
 */
describe('allowedSiteOrigins', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.SITE_PUBLIC_ORIGIN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('sem configuracao devolve conjunto vazio (falha fechada)', () => {
    expect(allowedSiteOrigins().size).toBe(0);
  });

  it('producao aceita exatamente a origem configurada', () => {
    process.env.SITE_PUBLIC_ORIGIN = 'https://brindes.example.com';
    expect([...allowedSiteOrigins()]).toEqual(['https://brindes.example.com']);
  });

  it('rejeita origin com caminho, com barra final ou com porta implicita', () => {
    for (const value of [
      'https://brindes.example.com/',
      'https://brindes.example.com/catalogo',
      'https://brindes.example.com/index.html',
    ]) {
      process.env.SITE_PUBLIC_ORIGIN = value;
      expect(allowedSiteOrigins().size, value).toBe(0);
    }
  });

  it('rejeita http puro (cookie de sessao viajaria em claro)', () => {
    process.env.SITE_PUBLIC_ORIGIN = 'http://brindes.example.com';
    expect(allowedSiteOrigins().size).toBe(0);
  });

  it('rejeita string que nao e URL', () => {
    process.env.SITE_PUBLIC_ORIGIN = 'brindes.example.com';
    expect(allowedSiteOrigins().size).toBe(0);
  });

  it('rejeita subcaminho disfarcado de origem (sufixo nao autoriza vizinho)', () => {
    process.env.SITE_PUBLIC_ORIGIN = 'https://brindes.example.com.evil.test';
    expect([...allowedSiteOrigins()]).toEqual(['https://brindes.example.com.evil.test']);
    expect(allowedSiteOrigins().has('https://brindes.example.com')).toBe(false);
  });

  it('preview confia apenas no proprio host Vercel, nunca em producao', () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'promo-brindes-git-abc.adm01.vercel.app';
    process.env.SITE_PUBLIC_ORIGIN = 'https://brindes.example.com';
    const origins = allowedSiteOrigins();
    expect([...origins]).toEqual(['https://promo-brindes-git-abc.adm01.vercel.app']);
    expect(origins.has('https://brindes.example.com')).toBe(false);
  });

  it('preview sem VERCEL_URL valido fica fechado (nao cai para producao)', () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.SITE_PUBLIC_ORIGIN = 'https://brindes.example.com';
    expect(allowedSiteOrigins().size).toBe(0);
    process.env.VERCEL_URL = 'evil.test/path';
    expect(allowedSiteOrigins().size).toBe(0);
    process.env.VERCEL_URL = '-leading-dash.vercel.app';
    expect(allowedSiteOrigins().size).toBe(0);
  });

  it('development nao usa a regra de preview', () => {
    process.env.VERCEL_ENV = 'development';
    process.env.VERCEL_URL = 'promo-brindes.vercel.app';
    expect(allowedSiteOrigins().size).toBe(0);
    process.env.SITE_PUBLIC_ORIGIN = 'https://brindes.example.com';
    expect([...allowedSiteOrigins()]).toEqual(['https://brindes.example.com']);
  });
});