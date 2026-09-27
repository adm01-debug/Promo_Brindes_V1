import { afterEach, describe, expect, it, vi } from 'vitest';
import { reconcileQuoteItems } from '../../api/_lib/catalogValidation.js';
import { type NormalizedQuotePayload } from '../../api/_lib/contracts.js';

const productId = '11111111-1111-4111-8111-111111111111';

function payload(overrides: Partial<NormalizedQuotePayload['items'][number]> = {}): NormalizedQuotePayload {
  return {
    source: 'site-promo-brindes', submittedAt: new Date().toISOString(), pageUrl: 'https://promo-brindes-v1.vercel.app/orcamento', clientRequestId: 'catalog-validation-test-001',
    consent: { accepted: true, noticeVersion: '2026-09-08', acceptedAt: new Date().toISOString() },
    contact: { name: 'Ana Teste', company: 'Empresa Teste', email: 'ana@example.test', phone: '11955551111', city: '', deadline: '', notes: '' },
    notificationPreferences: { emailCopy: true, whatsappCopy: false },
    items: [{ key: `${productId}::azul-petroleo`, productId, slug: 'legado', name: 'Legado', sku: 'LEG-1', imageUrl: '', quantity: 50, minQuantity: 1, decisionGroup: 'primary', colorName: 'Azul petróleo', ...overrides }],
  };
}

function publishedProduct(colorSwatches: unknown) {
  return new Response(JSON.stringify([{
    id: productId, slug: 'garrafa-publicada', name: 'Garrafa publicada', sku: 'PB-100', min_quantity: 30,
    primary_image_url: 'https://images.example.test/garrafa.webp', color_swatches: colorSwatches,
  }]), { status: 200 });
}

describe('reconcileQuoteItems', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('reconcilia a cor legada pelo nome e a converte para o ID canônico publicado', async () => {
    vi.stubEnv('CATALOG_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(publishedProduct([{ variant_id: 'azul-petroleo', color_name: ' AZUL PETRÓLEO ', color_hex: '#004466' }])));

    await expect(reconcileQuoteItems(payload())).resolves.toMatchObject({
      items: [expect.objectContaining({ variantId: 'azul-petroleo', colorName: 'AZUL PETRÓLEO', colorHex: '#004466', minQuantity: 30 })],
    });
  });

  it('não aceita uma cor legada que não está mais publicada', async () => {
    vi.stubEnv('CATALOG_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(publishedProduct([{ variant_id: 'preto', color_name: 'Preto' }])));

    await expect(reconcileQuoteItems(payload())).rejects.toMatchObject({
      status: 422, code: 'catalog_variant_unavailable',
    });
  });

  it('reconcilia swatch público sem variant_id por nome inequívoco', async () => {
    vi.stubEnv('CATALOG_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(publishedProduct([{ color_name: ' AZUL PETRÓLEO ', color_hex: '#004466', image_url: 'https://images.example.test/azul.webp' }])));

    await expect(reconcileQuoteItems(payload({ variantId: undefined }))).resolves.toMatchObject({
      items: [expect.objectContaining({ colorName: 'AZUL PETRÓLEO', colorHex: '#004466', imageUrl: 'https://images.example.test/azul.webp' })],
    });
  });

  it('recusa swatches públicos ambíguos em vez de escolher uma cor por suposição', async () => {
    vi.stubEnv('CATALOG_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(publishedProduct([
      { color_name: 'Azul petróleo', color_hex: '#004466' },
      { color_name: 'AZUL PETRÓLEO', color_hex: '#003355' },
    ])));

    await expect(reconcileQuoteItems(payload({ variantId: undefined }))).rejects.toMatchObject({
      status: 422, code: 'catalog_variant_unavailable',
    });
  });
});
