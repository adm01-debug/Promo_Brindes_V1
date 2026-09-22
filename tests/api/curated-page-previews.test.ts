import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalogPreviews, occasionPreviews } from '../../api/_lib/curatedPagePreviews.js';
import { catalogEditorialEntries } from '../../shared/catalogEditorial.js';

function idsFromArraySource(path: string, declaration: string): string[] {
  const source = readFileSync(join(process.cwd(), path), 'utf8');
  const start = source.indexOf(declaration);
  const end = source.indexOf('\n];', start);
  if (start < 0 || end < 0) throw new Error(`Coleção não localizada em ${path}`);
  return Array.from(source.slice(start, end).matchAll(/\bid:\s*'([^']+)'/g), (match) => match[1] || '');
}

describe('previews das rotas editoriais', () => {
  it('mantém todas as coleções públicas sincronizadas com a biblioteca', () => {
    expect(Object.keys(catalogPreviews).sort()).toEqual(
      Object.keys(catalogEditorialEntries).sort(),
    );
  });

  it('mantém todas as datas públicas sincronizadas com a agenda', () => {
    expect(Object.keys(occasionPreviews).sort()).toEqual(
      idsFromArraySource('src/lib/commemorativeDates.ts', 'export const commemorativeOccasions').sort(),
    );
  });
});
