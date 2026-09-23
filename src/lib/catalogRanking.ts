import { normalizeSearchText } from './search';
import type { CampaignSelection } from './campaignPresets';
import type { CatalogProduct } from '../types';

export interface CatalogRankingContext {
  query?: string;
  campaign?: CampaignSelection;
}

interface RankedProduct {
  product: CatalogProduct;
  score: number;
  categoryKey: string;
  materialKey: string;
}

/**
 * Camada determinística de curadoria do cliente. Ela somente reorganiza
 * produtos já publicados pela API: não infere preço, estoque, prazo, técnica
 * de personalização ou qualquer promessa comercial.
 */
function searchableProductText(product: CatalogProduct): string {
  return normalizeSearchText([
    product.name,
    product.sku,
    product.shortDescription,
    product.description,
    product.brand || '',
    ...product.materials,
  ].join(' '));
}

function queryTokens(query = ''): string[] {
  return [...new Set(normalizeSearchText(query).split(' ').filter((token) => token.length > 1))];
}

function campaignScore(product: CatalogProduct, campaign?: CampaignSelection): number {
  if (!campaign) return 0;
  let score = 0;
  const haystack = searchableProductText(product);
  if (campaign.audience === 'publico-evento' && product.allowsPersonalization) score += 6;
  if (campaign.scale === '500-mais' && product.minQuantity <= 500) score += 6;
  if (campaign.scale === '201-500' && product.minQuantity <= 500) score += 4;
  if (campaign.scale === '51-200' && product.minQuantity <= 200) score += 4;
  if (campaign.scale === 'ate-50' && product.minQuantity <= 50) score += 4;
  if (campaign.mood === 'sustentavel' && /(recicl|reutiliz|bambu|cortica|cortiça|eco)/.test(haystack)) score += 8;
  if (campaign.mood === 'tech' && /(tech|cabo|carreg|fone|power|usb|bluetooth)/.test(haystack)) score += 8;
  if (campaign.mood === 'afetivo' && (product.isKit || product.hasCommercialPackaging)) score += 6;
  if (campaign.mood === 'premium' && (product.isFeatured || product.isBestseller)) score += 3;
  return score;
}

function scoreProduct(product: CatalogProduct, context: CatalogRankingContext): number {
  const haystack = searchableProductText(product);
  const matches = queryTokens(context.query).reduce((total, token) => total + (haystack.includes(token) ? 12 : 0), 0);
  return matches
    + (product.isFeatured ? 5 : 0)
    + (product.isBestseller ? 3 : 0)
    + (product.isNew ? 2 : 0)
    + (product.isKit ? 1 : 0)
    + campaignScore(product, context.campaign);
}

function stableOrder(left: RankedProduct, right: RankedProduct): number {
  return right.score - left.score || left.product.name.localeCompare(right.product.name, 'pt-BR') || left.product.id.localeCompare(right.product.id);
}

/**
 * Evita que os primeiros cards sejam cópias da mesma família quando há opções
 * equivalentes. A primeira ocorrência mantém a relevância; repetições recebem
 * um pequeno recuo, sem esconder nenhum produto da página.
 */
function diversify(ranked: RankedProduct[]): CatalogProduct[] {
  const pending = [...ranked].sort(stableOrder);
  const selected: CatalogProduct[] = [];
  const categoryCounts = new Map<string, number>();
  const materialCounts = new Map<string, number>();

  while (pending.length) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    pending.forEach((candidate, index) => {
      const diversityPenalty = (categoryCounts.get(candidate.categoryKey) || 0) * 3
        + (materialCounts.get(candidate.materialKey) || 0) * 1.25;
      const adjusted = candidate.score - diversityPenalty;
      if (adjusted > bestScore || (adjusted === bestScore && stableOrder(candidate, pending[bestIndex]!) < 0)) {
        bestScore = adjusted;
        bestIndex = index;
      }
    });
    const [next] = pending.splice(bestIndex, 1);
    if (!next) break;
    selected.push(next.product);
    categoryCounts.set(next.categoryKey, (categoryCounts.get(next.categoryKey) || 0) + 1);
    materialCounts.set(next.materialKey, (materialCounts.get(next.materialKey) || 0) + 1);
  }
  return selected;
}

export function rankCatalogProducts(products: CatalogProduct[], context: CatalogRankingContext = {}): CatalogProduct[] {
  const unique = new Map(products.map((product) => [product.id, product]));
  const ranked = [...unique.values()].map((product) => ({
    product,
    score: scoreProduct(product, context),
    categoryKey: product.mainCategoryId || product.categoryId || 'sem-categoria',
    materialKey: normalizeSearchText(product.materials[0] || 'sem-material') || 'sem-material',
  }));
  return diversify(ranked);
}

/** Curadoria da página de produto: prioriza a mesma família, mas mistura materiais e novidades. */
export function rankRelatedProducts(products: CatalogProduct[], product: CatalogProduct): CatalogProduct[] {
  const anchorMaterials = new Set(product.materials.map(normalizeSearchText).filter(Boolean));
  return rankCatalogProducts(products.filter((candidate) => candidate.id !== product.id), {
    query: product.name,
  }).sort((left, right) => {
    const leftScore = Number(left.mainCategoryId === product.mainCategoryId) * 10
      + Number(left.isNew) * 2 + Number(left.materials.some((material) => anchorMaterials.has(normalizeSearchText(material))));
    const rightScore = Number(right.mainCategoryId === product.mainCategoryId) * 10
      + Number(right.isNew) * 2 + Number(right.materials.some((material) => anchorMaterials.has(normalizeSearchText(material))));
    return rightScore - leftScore || left.name.localeCompare(right.name, 'pt-BR') || left.id.localeCompare(right.id);
  });
}
