import { describe, expect, it } from 'vitest';
import { buildDefaultWhatsAppHref, buildWhatsAppHref, DEFAULT_WHATSAPP_NUMBER } from './whatsappContact';

describe('contato via WhatsApp (F-47)', () => {
  it('monta link wa.me com mensagem codificada', () => {
    expect(buildWhatsAppHref('Olá!', '551146375517')).toBe('https://wa.me/551146375517?text=Ol%C3%A1!');
  });

  it('usa o numero padrao quando nao ha mensagem personalizada', () => {
    const href = buildDefaultWhatsAppHref('551146375517');
    expect(href).toMatch(/^https:\/\/wa\.me\/551146375517\?text=/);
    expect(decodeURIComponent(href)).toContain('Vim pelo site da Promo Brindes');
  });

  it('codifica espacos e caracteres especiais', () => {
    const href = buildWhatsAppHref('Vim pelo site', '551146375517');
    expect(href).toContain('https://wa.me/551146375517?text=');
    expect(href).toContain('Vim%20pelo%20site');
  });

  it('expoe um numero padrao em formato internacional', () => {
    expect(DEFAULT_WHATSAPP_NUMBER).toBe('551146375517');
    expect(DEFAULT_WHATSAPP_NUMBER).toMatch(/^55\d{10}$/);
  });
});
