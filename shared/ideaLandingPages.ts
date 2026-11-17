/**
 * Fonte única do título e da descrição das quatro landings `/ideias/*`.
 *
 * O shell pré-renderizado (`api/site-page.ts`) e a página React
 * (`src/lib/ideaLandings.ts` + `src/components/Seo.tsx`) leem daqui, para o HTML
 * entregue ao crawler não contradizer o que o app escreve depois da hidratação.
 */
export type IdeaLandingId = 'onboarding' | 'eventos' | 'clientes-vip' | 'sustentaveis';

export interface IdeaLandingMeta {
  title: string;
  description: string;
}

export const ideaLandingMeta: Record<IdeaLandingId, IdeaLandingMeta> = {
  onboarding: {
    title: 'Onboarding que começa antes do primeiro dia.',
    description: 'Referências para transformar boas-vindas em pertencimento, utilidade e memória de marca.',
  },
  eventos: {
    title: 'Eventos que continuam depois da credencial.',
    description: 'Uma curadoria para criar pontos de contato úteis, fotografáveis e lembrados fora do evento.',
  },
  'clientes-vip': {
    title: 'Presentes para relações que merecem ficar.',
    description: 'Referências para agradecer, aproximar e demonstrar atenção sem transformar o gesto em protocolo.',
  },
  sustentaveis: {
    title: 'Escolhas de menor impacto, sem selo automático.',
    description: 'Produtos e perguntas para aproximar utilidade, material e narrativa com mais critério.',
  },
};

export const ideaLandingIds = Object.keys(ideaLandingMeta) as IdeaLandingId[];
