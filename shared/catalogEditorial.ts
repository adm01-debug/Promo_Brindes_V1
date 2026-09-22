export type CatalogEditorialStatus = 'published' | 'draft' | 'retired';

export interface CatalogEditorialEntry {
  title: string;
  description: string;
  status: CatalogEditorialStatus;
  owner: string;
  publishedAt: string;
  reviewedAt: string;
  reviewDueAt: string;
  expiresAt?: string;
}

const commonGovernance = {
  status: 'published' as const,
  owner: 'Marketing Promo Brindes',
  publishedAt: '2026-09-09',
  reviewedAt: '2026-09-22',
  reviewDueAt: '2027-09-22',
};

const catalogEditorialSource = {
  'onboarding-com-cultura': { ...commonGovernance, title: 'Onboarding com cultura', description: 'Boas-vindas que apresentam a empresa antes mesmo da primeira reunião.' },
  'eventos-que-continuam': { ...commonGovernance, title: 'Eventos que continuam', description: 'Produtos úteis e compartilháveis para a experiência continuar depois do credenciamento.' },
  'reconhecimento-com-desejo': { ...commonGovernance, title: 'Reconhecimento com desejo', description: 'Presentes à altura de metas, marcos de carreira e conquistas que merecem memória.' },
  'relacionamento-que-fica': { ...commonGovernance, title: 'Relacionamento que fica', description: 'Ideias para clientes e parceiros levarem a sua marca para a rotina.' },
  'novos-drops': { ...commonGovernance, title: 'Novos drops', description: 'Lançamentos e achados recentes para quem quer fugir do briefing previsível.' },
  'escolhas-de-menor-impacto': { ...commonGovernance, title: 'Escolhas de menor impacto', description: 'Materiais e ideias para alinhar utilidade, mensagem e escolhas mais conscientes.' },
  'tech-que-resolve': { ...commonGovernance, title: 'Tech que resolve', description: 'Tecnologia para mesa, mobilidade e rotina — com função antes do efeito.' },
  'celebracoes-com-significado': { ...commonGovernance, title: 'Celebrações com significado', description: 'Datas especiais, encerramentos de ciclo e encontros que pedem algo além do protocolo.' },
  'kits-prontos-para-combinar': { ...commonGovernance, title: 'Kits prontos para combinar', description: 'Pontos de partida para compor experiências com diferentes produtos e embalagens.' },
  'sua-marca-em-cena': { ...commonGovernance, title: 'Sua marca em cena', description: 'Produtos com potencial para receber a identidade da campanha e circular de verdade.' },
} satisfies Record<string, CatalogEditorialEntry>;

export type CatalogEditorialId = keyof typeof catalogEditorialSource;
export const catalogEditorialEntries: Record<CatalogEditorialId, CatalogEditorialEntry> = catalogEditorialSource;

function time(value: string): number {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

export function isCatalogEditorialEntryPublic(entry: CatalogEditorialEntry, now = new Date()): boolean {
  const current = now.getTime();
  return entry.status === 'published'
    && time(entry.publishedAt) <= current
    && (!entry.expiresAt || time(entry.expiresAt) > current);
}

export function publicCatalogEditorialEntries(now = new Date()): Partial<Record<CatalogEditorialId, CatalogEditorialEntry>> {
  return Object.fromEntries(
    Object.entries(catalogEditorialEntries).filter(([, entry]) => isCatalogEditorialEntryPublic(entry, now)),
  );
}

export function catalogEditorialIssues(now = new Date()): string[] {
  const issues: string[] = [];
  for (const [id, entry] of Object.entries(catalogEditorialEntries)) {
    if (!entry.owner.trim()) issues.push(`${id}: responsável ausente`);
    if (time(entry.reviewedAt) < time(entry.publishedAt)) issues.push(`${id}: revisão anterior à publicação`);
    if (time(entry.reviewDueAt) <= now.getTime()) issues.push(`${id}: revisão editorial vencida`);
    if (entry.expiresAt && time(entry.expiresAt) <= time(entry.publishedAt)) issues.push(`${id}: expiração anterior à publicação`);
  }
  return issues;
}
