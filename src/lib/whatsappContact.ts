/**
 * Contato via WhatsApp iniciado pelo visitante (F-47).
 *
 * O link wa.me é aberto no app/navegador do próprio visitante; não depende de
 * nenhum secret da Vercel (o envio transacional da confirmação, que usa a
 * WhatsApp Cloud API, continua governado pelas WHATSAPP_* no backend).
 */
export const DEFAULT_WHATSAPP_NUMBER = '551146375517';

export function resolveWhatsAppNumber(): string {
  const configured = import.meta.env.VITE_CONTACT_WHATSAPP?.trim();
  return configured?.replace(/[^\d]/g, '') || DEFAULT_WHATSAPP_NUMBER;
}

export function buildWhatsAppHref(
  message: string,
  number: string = resolveWhatsAppNumber(),
): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildDefaultWhatsAppHref(
  number: string = resolveWhatsAppNumber(),
): string {
  return buildWhatsAppHref(
    'Olá! Vim pelo site da Promo Brindes e gostaria de falar com o time de especialistas.',
    number,
  );
}
