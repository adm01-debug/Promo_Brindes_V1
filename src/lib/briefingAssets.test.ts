import { afterEach, describe, expect, it, vi } from 'vitest';
import { briefingAssetValidationError, deleteMyBriefingAsset, MAX_BRIEFING_ASSET_BYTES, type BriefingAsset } from './briefingAssets';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), remove: vi.fn() }));
vi.mock('./siteSupabase', () => ({
  siteSupabase: {
    rpc: mocks.rpc,
    storage: { from: () => ({ remove: mocks.remove }) },
  },
}));

describe('arquivos privados do briefing', () => {
  afterEach(() => { mocks.rpc.mockReset(); mocks.remove.mockReset(); });

  it('aceita somente os formatos publicados dentro de 10 MB', () => {
    expect(briefingAssetValidationError({ name: 'logo.png', type: 'image/png', size: 2_048 } as File)).toBeNull();
    expect(briefingAssetValidationError({ name: 'referencia.pdf', type: 'application/pdf', size: MAX_BRIEFING_ASSET_BYTES } as File)).toBeNull();
    expect(briefingAssetValidationError({ name: 'vetor.svg', type: 'image/svg+xml', size: 2_048 } as File)).toBe('Envie PNG, JPG, WebP ou PDF.');
    expect(briefingAssetValidationError({ name: 'grande.webp', type: 'image/webp', size: MAX_BRIEFING_ASSET_BYTES + 1 } as File)).toBe('Cada arquivo deve ter até 10 MB.');
  });

  it('recusa arquivos vazios e nomes maiores que o contrato do banco', () => {
    expect(briefingAssetValidationError({ name: 'vazio.jpg', type: 'image/jpeg', size: 0 } as File)).toBe('Cada arquivo deve ter até 10 MB.');
    expect(briefingAssetValidationError({ name: `${'a'.repeat(161)}.png`, type: 'image/png', size: 1 } as File)).toBe('Use um nome de arquivo com até 160 caracteres.');
  });

  it('revoga o metadado e delega a remoção física à fila protegida', async () => {
    const asset: BriefingAsset = {
      id: '11111111-1111-4111-8111-111111111111', kind: 'logo', name: 'logo.png', path: 'owner/logo.png',
      mimeType: 'image/png', sizeBytes: 2048, quoteRequestId: null, verifiedAt: '2026-09-22T12:00:00Z',
      createdAt: '2026-09-22T12:00:00Z', expiresAt: '2026-10-22T12:00:00Z',
    };
    mocks.rpc.mockResolvedValue({ data: true, error: null });

    await deleteMyBriefingAsset(asset);

    expect(mocks.rpc).toHaveBeenCalledWith('delete_my_briefing_asset', { p_id: asset.id });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
