import type { CatalogQuery } from './catalog';

export interface IdeaLanding {
  id: 'onboarding' | 'eventos' | 'clientes-vip' | 'sustentaveis';
  title: string;
  eyebrow: string;
  description: string;
  detail: string;
  catalogQuery: CatalogQuery;
  catalogUrl: string;
  checkpoints: Array<{ title: string; text: string }>;
}

export const ideaLandings: IdeaLanding[] = [
  {
    id: 'onboarding', eyebrow: 'People experience', title: 'Onboarding que começa antes do primeiro dia.',
    description: 'Referências para transformar boas-vindas em pertencimento, utilidade e memória de marca.',
    detail: 'Comece pelo contexto de quem chega, pela rotina que a pessoa vai viver e pelo que merece acompanhar esse início.',
    catalogQuery: { search: 'kit', profile: 'kits', pageSize: 8, sort: 'curated' },
    catalogUrl: '/catalogo?momento=onboarding&publico=colaboradores&perfil=kits',
    checkpoints: [{ title: 'Cultura antes do logo', text: 'Escolha algo que ajude a pessoa a se reconhecer na experiência.' }, { title: 'Uso real', text: 'Priorize rotina, mobilidade e momentos de trabalho que continuam depois da entrega.' }, { title: 'Curadoria ajustável', text: 'Quantidade, personalização e apresentação entram na proposta — não são promessa automática.' }],
  },
  {
    id: 'eventos', eyebrow: 'Live marketing', title: 'Eventos que continuam depois da credencial.',
    description: 'Uma curadoria para criar pontos de contato úteis, fotografáveis e lembrados fora do evento.',
    detail: 'O brinde não resolve sozinho a experiência: ele pode prolongar uma conversa, facilitar o dia ou virar um objeto de uso recorrente.',
    catalogQuery: { search: 'copo', pageSize: 8, sort: 'curated' },
    catalogUrl: '/catalogo?momento=evento&publico=publico-evento',
    checkpoints: [{ title: 'Contexto de uso', text: 'Pense na circulação, na duração e no que o público leva para fora do espaço.' }, { title: 'Escala honesta', text: 'Volume e data ajudam a orientar o briefing, mas prazo e disponibilidade são confirmados depois.' }, { title: 'Uma ideia reconhecível', text: 'Evite o item genérico: uma escolha com função cria mais chance de permanência.' }],
  },
  {
    id: 'clientes-vip', eyebrow: 'Relacionamento', title: 'Presentes para relações que merecem ficar.',
    description: 'Referências para agradecer, aproximar e demonstrar atenção sem transformar o gesto em protocolo.',
    detail: 'Um presente corporativo funciona melhor quando enxerga o contexto de quem recebe — e não apenas quem entrega.',
    catalogQuery: { search: 'garrafa', pageSize: 8, sort: 'curated' },
    catalogUrl: '/catalogo?momento=relacionamento&publico=clientes',
    checkpoints: [{ title: 'Utilidade com intenção', text: 'Um objeto que acompanha a rotina dá continuidade à lembrança da marca.' }, { title: 'Acabamento importa', text: 'Material, embalagem e técnica dependem do produto escolhido e serão confirmados pela curadoria.' }, { title: 'Menos ruído', text: 'Uma seleção pequena e coerente ajuda a apresentar uma decisão internamente.' }],
  },
  {
    id: 'sustentaveis', eyebrow: 'Impacto com contexto', title: 'Escolhas de menor impacto, sem selo automático.',
    description: 'Produtos e perguntas para aproximar utilidade, material e narrativa com mais critério.',
    detail: 'Alegações ambientais precisam ser confirmadas por produto e fornecedor. Aqui, a curadoria abre possibilidades — não certifica o que não está documentado.',
    catalogQuery: { search: 'reciclado', pageSize: 8, sort: 'curated' },
    catalogUrl: '/catalogo?clima=sustentavel',
    checkpoints: [{ title: 'Pergunte pelo material', text: 'Evite inferir impacto apenas pela aparência, cor ou linguagem do produto.' }, { title: 'Pense na permanência', text: 'Um item útil e durável pode manter a marca em circulação por mais tempo.' }, { title: 'Valide no briefing', text: 'Certificações, composição, personalização e prazo entram como confirmação comercial.' }],
  },
];

export function getIdeaLanding(id?: string): IdeaLanding | null {
  return ideaLandings.find((landing) => landing.id === id) || null;
}
