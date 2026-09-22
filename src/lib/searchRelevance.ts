import { buildCatalogSearchGroups, normalizeSearchText } from './search';

export interface SearchRelevanceJudgment {
  id: string;
  query: string;
  expectedConcepts: string[];
  forbiddenConcepts?: string[];
  rationale: string;
}

/**
 * Baseline editorial versionada para impedir regressões óbvias na interpretação
 * do briefing. É um corpus técnico inicial; a homologação comercial pode ampliar
 * ou reclassificar julgamentos sem apagar o histórico.
 */
export const searchRelevanceJudgments: SearchRelevanceJudgment[] = [
  { id: 'bebida-01', query: 'squeezes para evento', expectedConcepts: ['squeeze'], rationale: 'Plural e contexto de evento não podem esconder o objeto.' },
  { id: 'bebida-02', query: 'garrafinha personalizada', expectedConcepts: ['garrafa'], rationale: 'Variação coloquial deve chegar à família de garrafas.' },
  { id: 'tech-01', query: 'power bank para onboarding', expectedConcepts: ['powerbank'], rationale: 'Expressão composta deve permanecer uma única intenção.' },
  { id: 'tech-02', query: 'fones para o time', expectedConcepts: ['fone'], rationale: 'Plural e contexto genérico devem recuperar tecnologia de áudio.' },
  { id: 'roupa-01', query: 'camisetas para colaboradores', expectedConcepts: ['camiseta'], rationale: 'Plural deve convergir para o conceito do produto.' },
  { id: 'papel-01', query: 'moleskine para boas-vindas', expectedConcepts: ['caderno'], rationale: 'Nome popular deve recuperar a família editorial.' },
  { id: 'impacto-01', query: 'opções sustentáveis e recicladas', expectedConcepts: ['sustentavel'], rationale: 'Atributos de menor impacto devem formar um único universo.' },
  { id: 'bolsa-01', query: 'sacochilas para congresso', expectedConcepts: ['sacochila'], rationale: 'Plural deve ser entendido sem depender do título literal.' },
  { id: 'evento-01', query: 'lanyard para credencial', expectedConcepts: ['lanyard'], rationale: 'Termo do mercado deve alcançar cordões.' },
  { id: 'rotina-01', query: 'canecas para home office', expectedConcepts: ['caneca'], rationale: 'Plural e contexto devem manter a categoria central.' },
  { id: 'impacto-02', query: 'ecobag reutilizável', expectedConcepts: ['ecobag'], rationale: 'Objeto e atributo ambiental devem continuar pesquisáveis.' },
  { id: 'clima-01', query: 'guarda-chuva personalizado', expectedConcepts: ['guarda chuva'], rationale: 'Pontuação não deve separar o objeto composto.' },
  { id: 'kit-01', query: 'kit de onboarding para 100 pessoas', expectedConcepts: ['onboarding'], forbiddenConcepts: ['100'], rationale: 'Quantidade do briefing não deve virar termo de produto.' },
  { id: 'kit-02', query: 'kits corporativos', expectedConcepts: ['kit'], rationale: 'Flexão plural deve manter o universo de kits.' },
  { id: 'publico-01', query: 'brindes para geração z', expectedConcepts: ['gen z'], rationale: 'Público jovem deve produzir uma intenção editorial pesquisável.' },
  { id: 'preco-01', query: 'garrafa barata', expectedConcepts: ['garrafa'], forbiddenConcepts: ['barata'], rationale: 'Preço não é publicado e não pode restringir os resultados.' },
  { id: 'quantidade-01', query: '500 cadernos', expectedConcepts: ['caderno'], forbiddenConcepts: ['500'], rationale: 'Quantidade não é característica do produto.' },
  { id: 'estojo-01', query: 'nécessaires premium', expectedConcepts: ['necessaire'], rationale: 'Acento e plural não podem impedir a intenção.' },
  { id: 'termico-01', query: 'copo térmico tipo stanley', expectedConcepts: ['termico'], rationale: 'Expressão composta e referência popular convergem.' },
  { id: 'chaveiro-01', query: 'chaveiros para clientes', expectedConcepts: ['chaveiro'], rationale: 'Plural deve recuperar a família de produto.' },
];

export function evaluateSearchRelevance(judgments = searchRelevanceJudgments) {
  const results = judgments.map((judgment) => {
    const concepts = new Set(buildCatalogSearchGroups(judgment.query).flat().map(normalizeSearchText));
    const expected = judgment.expectedConcepts.map(normalizeSearchText);
    const forbidden = (judgment.forbiddenConcepts || []).map(normalizeSearchText);
    const passed = expected.every((concept) => concepts.has(concept)) && forbidden.every((concept) => !concepts.has(concept));
    return { id: judgment.id, passed, concepts: [...concepts] };
  });
  const passed = results.filter((item) => item.passed).length;
  return { score: judgments.length ? passed / judgments.length : 1, passed, total: judgments.length, results };
}
