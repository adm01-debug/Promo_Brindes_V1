import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCatalogParams, buildNoveltyProfileFilter, defaultQuoteQuantity, fetchCatalog, fetchProduct, mapProductRow, parseContentRange, resolveProductResource, resolvePublicApiKey, resolveSupabaseUrl, sanitizeSearch, type ProductRow } from './catalog';

const rootCategoryId = '11111111-1111-4111-8111-111111111111';
const childCategoryId = '22222222-2222-4222-8222-222222222222';

const row: ProductRow = {
  id: 'a74ae6e5-b462-4c9e-8108-663f7fd11e70',
  name: ' Squeeze Térmico ',
  sku: ' PB-100 ',
  slug: null,
  primary_image_url: 'https://cdn.example.com/main.webp',
  primary_image_fallback_url: null,
  set_image_url: null,
  og_image_url: null,
  images: ['https://cdn.example.com/main.webp', 'https://cdn.example.com/detail.webp'],
  category_id: 'category-child',
  main_category_id: 'category-root',
  short_description: 'Descrição editorial',
  description: 'Descrição completa',
  ai_title: null,
  ai_summary: null,
  ai_description: null,
  brand: 'Promo',
  min_quantity: 50,
  is_new: true,
  is_featured: true,
  is_bestseller: false,
  is_kit: false,
  allows_personalization: true,
  has_commercial_packaging: true,
  color_swatches: [{ color_name: 'Azul', color_hex: '#0047ab', stock_quantity: 0, is_in_stock: false }],
  materials: ['Aço inox'],
  dimensions: { height_cm: 20 },
  width_cm: 7,
  height_cm: null,
  length_cm: null,
  capacity_ml: 500,
  weight_g: 280,
};

describe('catálogo público', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('normaliza apenas os dados necessários para a experiência do cliente', () => {
    const product = mapProductRow(row);
    expect(product).toMatchObject({
      id: row.id,
      name: 'Squeeze Térmico',
      sku: 'PB-100',
      slug: row.id,
      minQuantity: 50,
      dimensions: { widthCm: 7, heightCm: 20, capacityMl: 500, weightG: 280 },
    });
    expect(product?.images).toHaveLength(2);
    expect(product?.colors[0]).toMatchObject({ name: 'Azul' });
    expect(product?.colors).toHaveLength(1);
  });

  it('marca como novidade um produto dentro da janela canônica mesmo sem flag explícita', () => {
    const recentProduct = mapProductRow({ ...row, is_new: false, created_at: new Date().toISOString() });
    expect(recentProduct?.isNew).toBe(true);
  });

  it('não confirma personalização quando o dado público ainda é desconhecido', () => {
    const product = mapProductRow({ ...row, allows_personalization: null });
    expect(product?.allowsPersonalization).toBe(false);
  });

  it('consulta todos os produtos ativos sem confiar no estoque do fornecedor', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([row]), {
      status: 200,
      headers: { 'content-range': '0-0/1' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchCatalog({ pageSize: 1 });
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(requestUrl.searchParams.get('is_active')).toBe('eq.true');
    expect(requestUrl.searchParams.has('stock_quantity')).toBe(false);
    expect(requestUrl.searchParams.get('select')).not.toContain('stock_quantity');
    expect(result.products).toHaveLength(1);
  });

  it('repete uma vez uma leitura transitória sem exigir nova ação do cliente', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Falha transitória' }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([row]), {
        status: 200,
        headers: { 'content-range': '0-0/1' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchCatalog({ search: 'kit onboarding' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.products).toHaveLength(1);
  });

  it('recupera uma página fora do intervalo sem deixar a tela em retry infinito', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Requested range not satisfiable' }), {
        status: 416,
        headers: { 'content-range': '*/1' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify([row]), {
        status: 200,
        headers: { 'content-range': '0-0/1' },
      }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchCatalog({ page: 10_000, pageSize: 24 });
    expect(result.page).toBe(1);
    expect(result.products).toHaveLength(1);
    expect(new URL(String(fetchMock.mock.calls[1]?.[0])).searchParams.get('offset')).toBe('0');
  });

  it('compõe dimensões independentes do superfiltro com AND e alternativas com OR', () => {
    const params = buildCatalogParams({
      search: 'squeeze premium',
      categoryIds: [rootCategoryId, childCategoryId],
      colors: ['preto', 'azul'],
      materials: ['aco-inox', 'bambu'],
      personalizable: true,
      giftPackaging: true,
      maxMinQuantity: 200,
    });
    const and = params.get('and') || '';

    expect(and).toContain(`category_id.in.(${rootCategoryId},${childCategoryId})`);
    expect(and).toContain('or(name.ilike.*squeeze*');
    expect(and).toContain('or(name.ilike.*premium*');
    expect(and).toContain('colors.cs."[\\"PRETO\\"]"');
    expect(and).toContain('materials.cs."[\\"Aço Inox\\"]"');
    expect(params.get('allows_personalization')).toBe('eq.true');
    expect(params.get('has_commercial_packaging')).toBe('eq.true');
    expect(and).toContain('or(min_quantity.lte.200,min_quantity.is.null)');
    expect(params.has('stock_quantity')).toBe(false);
  });

  it('expande sinônimos dentro de OR sem transformar alternativas em exigências simultâneas', () => {
    const and = buildCatalogParams({ search: 'power bank' }).get('and') || '';
    expect(and).toContain('name.ilike.*powerbank*');
    expect(and).toContain('name.ilike.*carregador portatil*');
    expect(and.match(/or\(/g)).toHaveLength(1);
  });

  it('descarta IDs de categoria capazes de alterar a expressão PostgREST', () => {
    const params = buildCatalogParams({ categoryIds: [rootCategoryId, 'bad),or(is_active.eq.false'] });
    expect(params.get('and')).toContain(rootCategoryId);
    expect(params.get('and')).not.toContain('is_active.eq.false');
  });

  it('protege valores JSON com caracteres reservados na árvore lógica do PostgREST', () => {
    const params = buildCatalogParams({ materials: ['plastico', 'couro-sintetico'] });
    const and = params.get('and') || '';
    expect(and).toContain('materials.cs."[\\"Polipropileno (PP)\\"]"');
    expect(and).toContain('materials.cs."[\\"Couro Sintético (Ecológico)\\"]"');
  });

  it('mantém offset inteiro e limitado para paginação adversarial', () => {
    expect(buildCatalogParams({ page: 2.9 }).get('offset')).toBe('24');
    expect(buildCatalogParams({ page: Number.POSITIVE_INFINITY }).get('offset')).toBe('0');
    expect(buildCatalogParams({ page: 999_999_999 }).get('offset')).toBe(String((10_000 - 1) * 24));
  });

  it('usa ID como desempate para impedir repetição entre páginas', () => {
    expect(buildCatalogParams({ sort: 'curated' }).get('order')).toBe('is_featured.desc.nullslast,is_bestseller.desc.nullslast,name.asc,id.asc');
    expect(buildCatalogParams({ sort: 'newest' }).get('order')).toBe('created_at.desc.nullslast,name.asc,id.asc');
    expect(buildCatalogParams({ sort: 'name' }).get('order')).toBe('name.asc,id.asc');
  });

  it('alinha o filtro Novos drops à mesma janela do badge, sem aceitar data futura', () => {
    const now = Date.parse('2026-09-09T12:00:00.000Z');
    expect(buildNoveltyProfileFilter(now)).toBe('or(is_new.eq.true,and(created_at.gte.2026-08-10T12:00:00.000Z,created_at.lte.2026-09-09T12:00:00.000Z))');
    expect(buildCatalogParams({ profile: 'new' }).get('or')).toMatch(/^or\(is_new\.eq\.true,and\(created_at\.gte\./);
  });

  it('recusa registros sem identidade pública completa', () => {
    expect(mapProductRow({ ...row, sku: null })).toBeNull();
  });

  it('higieniza operadores do PostgREST antes da busca', () => {
    expect(sanitizeSearch('  caneca%, premium_(azul)*  ')).toBe('caneca premium azul');
    expect(sanitizeSearch('\u0000),or(is_active.eq.false')).toBe('or is active eq false');
  });

  it('mantém códigos pesquisáveis mesmo quando possuem pontuação do fornecedor', () => {
    const params = buildCatalogParams({ search: 'P@02040' });
    const and = params.get('and') || '';
    expect(and).toContain('sku.ilike.*02040*');
    expect(and).not.toContain('sku.ilike.*P 02040*');
  });

  it('recusa identificadores de produto abusivos antes de consultar a API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchProduct(`${'slug-'.repeat(2_000)}fim`)).resolves.toBeNull();
    await expect(fetchProduct('produto),or(is_active.eq.false')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aceita apenas a origem canônica ou o Supabase local', () => {
    expect(resolveSupabaseUrl('https://doufsxqlfjyuvxuezpln.supabase.co/rest/v1')).toBe('https://doufsxqlfjyuvxuezpln.supabase.co');
    expect(resolveSupabaseUrl('http://127.0.0.1:54321/rest/v1')).toBe('http://127.0.0.1:54321');
    expect(resolveSupabaseUrl('https://evil.test/?doufsxqlfjyuvxuezpln')).toBe('https://doufsxqlfjyuvxuezpln.supabase.co');
    expect(resolveSupabaseUrl('https://evil.test/localhost')).toBe('https://doufsxqlfjyuvxuezpln.supabase.co');
  });

  it('não permite chave secreta nem recurso arbitrário no bundle público', () => {
    const serviceRole = `header.${btoa(JSON.stringify({ role: 'service_role' }))}.signature`;
    expect(resolvePublicApiKey('sb_secret_super-segredo')).not.toContain('super-segredo');
    expect(resolvePublicApiKey(serviceRole)).not.toBe(serviceRole);
    expect(resolveProductResource('tabela_interna')).toBe('v_site_products_public');
    expect(resolveProductResource('v_products_public')).toBe('v_products_public');
  });

  it('interpreta o total do Content-Range com fallback seguro', () => {
    expect(parseContentRange('0-23/1824', 24)).toBe(1824);
    expect(parseContentRange(null, 7)).toBe(7);
  });

  it('propõe 100 unidades sem ignorar mínimos maiores', () => {
    expect(defaultQuoteQuantity({ minQuantity: 20 })).toBe(100);
    expect(defaultQuoteQuantity({ minQuantity: 250 })).toBe(250);
  });
});
