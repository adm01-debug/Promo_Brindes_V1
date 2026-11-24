import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/site-page.js';
import { CATALOGS_INDEX_DESCRIPTION, CATALOGS_INDEX_TITLE, catalogCollectionTitle } from '../../shared/catalogMeta';
import { catalogSocialImage } from '../../shared/socialImages';
import { publicCatalogCollections } from '../lib/catalogLibrary';
import { Seo } from './Seo';

// A mesma URL é servida duas vezes: o shell pré-renderizado (api/site-page.ts) e,
// depois da hidratação, o que <Seo /> escreve no <head>. Se os dois lados
// divergirem, o buscador recebe dois pares de metadados para a mesma página.
function responseDouble() {
  const result = { headers: new Map<string, string>(), statusCode: 0, body: '' };
  const response = {
    setHeader(name: string, value: string) { result.headers.set(name, value); },
    status(code: number) { result.statusCode = code; return response; },
    send(body: string) { result.body = body; },
  };
  return { result, response };
}

function headOf(html: string, attribute: string) {
  const pattern = new RegExp(`<meta (?:property|name)="${attribute}" content="([^"]*)"`);
  const match = html.match(pattern);
  if (!match) throw new Error(`sem ${attribute} no shell`);
  return match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

describe('paridade entre o shell pré-renderizado e a hidratação em /catalogos', () => {
  beforeEach(() => {
    vi.stubEnv('SITE_TEST_APP_SHELL', '1');
    vi.stubEnv('VITE_PUBLIC_URL', 'https://promo-brindes-v1.vercel.app');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      await (await import('node:fs/promises')).readFile('tests/fixtures/app-shell.html', 'utf8'),
      { status: 200 },
    )));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('o índice entrega o mesmo título e descrição nas duas camadas', async () => {
    const shell = responseDouble();
    await handler({ method: 'GET', query: { page: 'catalogos' } }, shell.response);

    render(<Seo title={CATALOGS_INDEX_TITLE} description={CATALOGS_INDEX_DESCRIPTION} path="/catalogos" />);

    const shellTitle = shell.result.body.match(/<title>([^<]*)<\/title>/)?.[1];
    expect(shellTitle).toBe(document.title);
    expect(headOf(shell.result.body, 'og:description')).toBe(CATALOGS_INDEX_DESCRIPTION);
    expect(headOf(shell.result.body, 'og:title')).toBe(document.title);
  });

  it('a coleção compartilhada entrega o mesmo título, descrição e capa', async () => {
    const collection = publicCatalogCollections().find((item) => item.id === 'onboarding-com-cultura')!;
    const path = `/catalogos?colecao=${encodeURIComponent(collection.id)}`;
    const shell = responseDouble();
    await handler({ method: 'GET', query: { page: 'catalogos', colecao: collection.id } }, shell.response);

    render(
      <Seo
        title={catalogCollectionTitle(collection.title)}
        description={collection.description}
        path={path}
        image={catalogSocialImage(collection.id)}
      />,
    );

    const shellTitle = shell.result.body.match(/<title>([^<]*)<\/title>/)?.[1];
    expect(shellTitle).toBe(document.title);
    expect(headOf(shell.result.body, 'og:description')).toBe(collection.description);
    expect(headOf(shell.result.body, 'og:image')).toBe(`https://promo-brindes-v1.vercel.app${catalogSocialImage(collection.id)}`);
  });
});
