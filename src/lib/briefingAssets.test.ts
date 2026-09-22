import { describe, expect, it } from 'vitest';
import { briefingAssetValidationError, MAX_BRIEFING_ASSET_BYTES } from './briefingAssets';

describe('arquivos privados do briefing', () => {
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
});
