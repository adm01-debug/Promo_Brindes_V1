import { describe, expect, it } from 'vitest';
import { evaluateSearchRelevance, searchRelevanceJudgments } from './searchRelevance';

describe('baseline editorial de relevância', () => {
  it('mantém cobertura integral do corpus versionado', () => {
    expect(searchRelevanceJudgments.length).toBeGreaterThanOrEqual(20);
    const evaluation = evaluateSearchRelevance();
    expect(evaluation.results.filter((item) => !item.passed)).toEqual([]);
    expect(evaluation.score).toBe(1);
  });

  it('expõe falhas em vez de arredondar a métrica', () => {
    const evaluation = evaluateSearchRelevance([{ id: 'falha', query: 'caneca', expectedConcepts: ['mochila'], rationale: 'controle negativo' }]);
    expect(evaluation).toMatchObject({ score: 0, passed: 0, total: 1 });
  });
});
