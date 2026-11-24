import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/site-page.js';
import { CATALOGS_INDEX_DESCRIPTION, CATALOGS_INDEX_TITLE, catalogCollectionTitle } from '../../shared/catalogMeta';
import { catalogSocialImage } from '../../shared/socialImages';
import { Seo } from '../../src/components/Seo';
import { publicCatalogCollections } from '../../src/lib/catalogLibrary';

// A mesma URL e servida duas vezes: o shell pre-renderizado (api/site-page.ts) e,
// depois da hidratacao, o que <Seo /> escreve no <head>. Se os dois lados
// divergirem, o buscador recebe dois pares de metadados para a mesma pagina.
function responseDouble() {
  const result = { headers: new Map<string, string>(), statusCode: 0, body: '' };
  const response = {
    setHeader(name: string, value: string) { result.headers.set(name, value); },
    status(code: number) { result.statusCode = code; return response; },
    send(body: string) { result.body = body; },
  };
  return { result, response };
}

function headOf(html: string, attribute: string): string {
  const match = html.match(new RegExp(`<meta (?:property|name)="${attribute}" content="([^"]*)"`));
  if (!match) throw new Error(`sem ${attribute} no shell`);
  return match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function shellTitleOf(html: string): string {
  return html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
}

describe('paridade entre o shell prerenderizado e a hidratacao em /catalogos', () => {
  beforeEach(() => {
    vi.stubEnv('SITE_TEST_APP_SHELL', '1');
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(readFileSync('tests/fixtures/app-shell.html', 'utf8'), { status: 200 })));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('o indice entrega o mesmo titulo e descricao nas duas camadas', async () => {
    const shell = responseDouble();
    await handler({ method: 'GET', query: { page: 'catalogos' } }, shell.response);

    render(<Seo title={CATALOGS_INDEX_TITLE} description={CATALOGS_INDEX_DESCRIPTION} path="/catalogos" />);

    expect(shellTitleOf(shell.result.body)).toBe(document.title);
    expect(headOf(shell.result.body, 'og:title')).toBe(document.title);
    expect(headOf(shell.result.body, 'og:description')).toBe(CATALOGS_INDEX_DESCRIPTION);
  });

  it('a colecao compartilhada entrega o mesmo titulo, descricao e capa', async () => {
    const collection = publicCatalogCollections().find((item) => item.id === 'onboarding-com-cultura');
    if (!collection) throw new Error('colecao de teste ausente');
    const shell = responseDouble();
    await handler({ method: 'GET', query: { page: 'catalogos', colecao: collection.id } }, shell.response);

    render(
      <Seo
        title={catalogCollectionTitle(collection.title)}
        description={collection.description}
        path={`/catalogos?colecao=${encodeURIComponent(collection.id)}`}
        image={catalogSocialImage(collection.id)}
      />,
    );

    expect(shellTitleOf(shell.result.body)).toBe(document.title);
    expect(headOf(shell.result.body, 'og:description')).toBe(collection.description);
    expect(headOf(shell.result.body, 'og:image')).toBe(`https://promo-brindes-v1.vercel.app${catalogSocialImage(collection.id)}`);
  });
});
