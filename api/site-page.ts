import { fallbackPageShell, renderPageShell, type PublicPageMetadata } from './_lib/pageShell.js';
import { configuredSiteOrigin, loadAppShell } from './_lib/publicProductPage.js';
import { catalogPreviews, occasionPreviews } from './_lib/curatedPagePreviews.js';
import { normalizeCampaignYear } from '../shared/campaignYears.js';
import { resolveCatalogEditorialId } from '../shared/catalogEditorial.js';
import { ideaLandingIds, ideaLandingMeta } from '../shared/ideaLandingPages.js';
import { CATALOGS_INDEX_DESCRIPTION, CATALOGS_INDEX_TITLE, catalogCollectionTitle } from '../shared/catalogMeta.js';
import { catalogSocialImage, occasionSocialImage } from '../shared/socialImages.js';
import { SITE_NAME } from '../shared/siteName.js';

interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  send(body: string): void;
}

const heroImage = () => `${configuredSiteOrigin()}/images/hero-gen-z-v2.webp`;

interface StaticPage {
  path: string;
  title: string;
  description: string;
  noIndex?: boolean;
  /** Caminho absoluto na raiz do site (ex.: /images/og/colecao-...png). */
  image?: string;
}

const pages: Record<string, StaticPage> = {
  catalogo: { path: '/catalogo', title: 'Catálogo de brindes | Promo Brindes', description: 'Encontre brindes corporativos para campanhas, eventos, relacionamento e reconhecimento.' },
  catalogos: { path: '/catalogos', title: `${CATALOGS_INDEX_TITLE} | ${SITE_NAME}`, description: CATALOGS_INDEX_DESCRIPTION },
  montarKit: { path: '/montar-kit', title: 'Monte seu kit de brindes | Promo Brindes', description: 'Combine produtos reais do catálogo em um kit corporativo e envie a composição no seu briefing.' },
  datas: { path: '/datas-comemorativas', title: 'Datas comemorativas para campanhas | Promo Brindes', description: 'Planeje brindes corporativos a partir das próximas datas e ocasiões da sua marca.' },
  sobre: { path: '/sobre', title: 'Sobre a Promo Brindes | Promo Brindes', description: 'Entender para atender: conheça a forma da Promo Brindes conectar marcas e pessoas.' },
  contato: { path: '/contato', title: 'Fale com nosso time de especialistas | Promo Brindes', description: 'Conte sua ideia e receba orientação do nosso time de especialistas para a sua campanha.' },
  privacidade: { path: '/privacidade', title: 'Privacidade | Promo Brindes', description: 'Entenda como a Promo Brindes trata os dados usados em solicitações e na Área do Cliente.' },
  orcamento: { path: '/orcamento', title: 'Solicitar orçamento | Promo Brindes', description: 'Revise sua seleção e envie seu briefing para receber uma proposta personalizada.', noIndex: true },
  compartilhada: { path: '/selecoes/compartilhada', title: 'Seleção compartilhada | Promo Brindes', description: 'Referências compartilhadas para começar uma conversa sobre a próxima campanha.', noIndex: true },
  entrar: { path: '/entrar', title: 'Acessar meus orçamentos | Promo Brindes', description: 'Acesse sua Área do Cliente para acompanhar seus briefings.', noIndex: true },
  confirmar: { path: '/auth/confirm', title: 'Confirmar acesso | Promo Brindes', description: 'Conclua seu acesso à Área do Cliente.', noIndex: true },
  senha: { path: '/definir-senha', title: 'Definir senha | Promo Brindes', description: 'Defina sua senha para acessar seus orçamentos.', noIndex: true },
  conta: { path: '/minha-conta', title: 'Meus orçamentos | Promo Brindes', description: 'Consulte suas solicitações de orçamento.', noIndex: true },
  detalheOrcamento: { path: '/minha-conta/orcamentos', title: 'Detalhe do orçamento | Promo Brindes', description: 'Consulte o detalhe da sua solicitação.', noIndex: true },
  backoffice: { path: '/admin/orcamentos', title: 'Back-office comercial | Promo Brindes', description: 'Fila de orçamentos do time comercial.', noIndex: true },
};

// Derivado de shared/ideaLandingPages.ts: o shell pre-renderizado precisa servir
// exatamente o titulo e a descricao que src/components/Seo.tsx grava depois da
// hidratacao, senao a mesma URL entrega dois pares de metadados ao buscador.
// O retorno anotado como [string, StaticPage] e necessario: sem ele o literal
// fica dentro do callback sem tipo de contexto e o TypeScript para de recusar
// campo desconhecido (um `noindex` mal grafado compilaria e a pagina ficaria
// indexavel em silencio).
const ideas: Record<string, StaticPage> = Object.fromEntries(ideaLandingIds.map((id): [string, StaticPage] => [id, {
  path: `/ideias/${id}`,
  title: `${ideaLandingMeta[id].title} | ${SITE_NAME}`,
  description: ideaLandingMeta[id].description,
}]));

function queryValue(request: VercelRequest, key: string): string {
  const value = request.query?.[key];
  return typeof value === 'string' ? value : '';
}

function pageFrom(request: VercelRequest): StaticPage | null {
  const page = queryValue(request, 'page');
  if (page === 'ideia') return ideas[queryValue(request, 'topic')] || null;
  if (page === 'catalogos') {
    const collectionId = resolveCatalogEditorialId(queryValue(request, 'colecao'));
    const collection = collectionId ? catalogPreviews()[collectionId] : undefined;
    if (collectionId && collection) return {
      path: `/catalogos?colecao=${encodeURIComponent(collectionId)}`,
      title: `${catalogCollectionTitle(collection.title)} | ${SITE_NAME}`,
      description: collection.description,
      image: catalogSocialImage(collectionId),
    };
  }
  if (page === 'datas') {
    const year = normalizeCampaignYear(queryValue(request, 'ano'));
    const occasionId = queryValue(request, 'data');
    const occasion = occasionPreviews[occasionId];
    if (occasion) return {
      path: `/datas-comemorativas?ano=${year}&data=${encodeURIComponent(occasionId)}`,
      title: `${occasion.title} ${year} | Promo Brindes`,
      description: occasion.description,
      image: occasionSocialImage(occasionId),
    };
  }
  return pages[page] || null;
}

function metadata(page: StaticPage): PublicPageMetadata {
  return {
    title: page.title,
    description: page.description,
    canonicalUrl: `${configuredSiteOrigin()}${page.path}`,
    imageUrl: page.image ? `${configuredSiteOrigin()}${page.image}` : heroImage(),
    noIndex: page.noIndex,
  };
}

function notFoundMetadata(): PublicPageMetadata {
  return {
    title: 'Página não encontrada | Promo Brindes',
    description: 'Este endereço não existe. Continue explorando o catálogo da Promo Brindes.',
    canonicalUrl: `${configuredSiteOrigin()}/404`,
    imageUrl: heroImage(),
    noIndex: true,
  };
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method && !['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    response.status(405).send('Method Not Allowed');
    return;
  }

  const page = pageFrom(request);
  const resolvedMetadata = page ? metadata(page) : notFoundMetadata();
  const status = page ? 200 : 404;
  try {
    const shell = await loadAppShell();
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', page?.noIndex ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=3600');
    if (page?.noIndex) response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    response.status(status).send(request.method === 'HEAD' ? '' : renderPageShell(shell, resolvedMetadata));
  } catch {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Retry-After', '60');
    response.status(503).send(request.method === 'HEAD' ? '' : fallbackPageShell({ ...resolvedMetadata, noIndex: true }));
  }
}
