export interface CuratedPagePreview {
  title: string;
  description: string;
}

export function catalogPreviews(now = new Date()): Record<string, CuratedPagePreview> {
  return publicCatalogEditorialEntries(now);
}

export const occasionPreviews: Record<string, CuratedPagePreview> = {
  'ano-novo': { title: 'Ano Novo', description: 'Comece o ciclo com uma lembrança útil, otimista e alinhada à cultura da marca.' },
  'volta-ao-trabalho': { title: 'Volta ao trabalho', description: 'Acolha o reencontro do time com itens que apoiam uma rotina mais leve.' },
  carnaval: { title: 'Carnaval', description: 'Crie uma ativação vibrante com brindes práticos para eventos e celebrações.' },
  'dia-da-mulher': { title: 'Dia Internacional da Mulher', description: 'Construa uma ação relevante, cuidadosa e coerente com os valores da marca.' },
  'dia-do-consumidor': { title: 'Dia do Consumidor', description: 'Reconheça clientes com uma experiência que fortalece relacionamento e lembrança.' },
  'dia-da-felicidade': { title: 'Dia Internacional da Felicidade', description: 'Espalhe bem-estar e conexão com uma campanha leve e compartilhável.' },
  pascoa: { title: 'Páscoa', description: 'Transforme a data em uma experiência de afeto, encontro e significado.' },
  'dia-da-terra': { title: 'Dia da Terra', description: 'Conecte utilidade, educação e escolhas de menor impacto em uma ação coerente.' },
  'dia-do-trabalho': { title: 'Dia do Trabalho', description: 'Valorize quem constrói resultados com reconhecimento presente na rotina.' },
  'dia-do-marketing': { title: 'Dia do Profissional de Marketing', description: 'Celebre criatividade e estratégia com uma lembrança tão original quanto o time.' },
  'dia-das-maes': { title: 'Dia das Mães', description: 'Planeje uma homenagem sensível, inclusiva e carregada de significado.' },
  'dia-da-industria': { title: 'Dia da Indústria', description: 'Fortaleça relações com clientes, parceiros e equipes que movem a produção.' },
  'dia-do-meio-ambiente': { title: 'Dia Mundial do Meio Ambiente', description: 'Dê forma a compromissos ambientais com escolhas úteis e comunicação transparente.' },
  'dia-dos-namorados': { title: 'Dia dos Namorados', description: 'Crie conexões afetivas com experiências que a pessoa queira guardar.' },
  'festas-juninas': { title: 'Festas Juninas', description: 'Leve cor, sabor e cultura brasileira para encontros de clientes e equipes.' },
  'dia-do-amigo': { title: 'Dia do Amigo', description: 'Reforce vínculos importantes com gestos simples, úteis e memoráveis.' },
  'dia-da-amizade': { title: 'Dia Internacional da Amizade', description: 'Celebre comunidades e relações que aproximam pessoas e marcas.' },
  'dia-dos-pais': { title: 'Dia dos Pais', description: 'Desenvolva uma homenagem acolhedora e inclusiva para diferentes histórias.' },
  'dia-do-estudante': { title: 'Dia do Estudante', description: 'Inspire aprendizado e protagonismo com itens presentes na jornada.' },
  'dia-do-estagiario': { title: 'Dia do Estagiário', description: 'Reconheça talentos em formação e fortaleça a experiência de pertencimento.' },
  'dia-do-cliente': { title: 'Dia do Cliente', description: 'Agradeça a confiança com um presente que prolonga a relação com a marca.' },
  'dia-da-arvore': { title: 'Dia da Árvore', description: 'Crie uma campanha educativa ligada à regeneração e às escolhas conscientes.' },
  'dia-da-secretaria': { title: 'Dia da Secretária', description: 'Reconheça organização, cuidado e parceria com um presente pensado nos detalhes.' },
  'dia-do-vendedor': { title: 'Dia do Vendedor', description: 'Celebre quem conecta necessidades e soluções com energia e relacionamento.' },
  'dia-das-criancas': { title: 'Dia das Crianças', description: 'Planeje experiências alegres, seguras e adequadas ao público da campanha.' },
  'dia-do-professor': { title: 'Dia do Professor', description: 'Valorize quem transforma conhecimento em futuro com uma lembrança significativa.' },
  halloween: { title: 'Halloween', description: 'Dê personalidade a eventos e ativações com uma campanha divertida e marcante.' },
  'empreendedorismo-feminino': { title: 'Dia do Empreendedorismo Feminino', description: 'Amplifique histórias, protagonismo e conexões com uma ação relevante.' },
  'consciencia-negra': { title: 'Dia da Consciência Negra', description: 'Planeje uma iniciativa respeitosa, representativa e alinhada a compromissos reais.' },
  'black-friday': { title: 'Black Friday', description: 'Crie uma ativação de alto impacto com utilidade além do momento promocional.' },
  'dia-da-pessoa-com-deficiencia': { title: 'Dia Internacional da Pessoa com Deficiência', description: 'Promova inclusão com acessibilidade, escuta e escolhas coerentes.' },
  natal: { title: 'Natal', description: 'Encerre o ano com uma experiência afetiva que reconhece e aproxima.' },
  confraternizacao: { title: 'Confraternização de fim de ano', description: 'Celebre resultados e relações com um kit que traduz a cultura da empresa.' },
};
import { publicCatalogEditorialEntries } from '../../shared/catalogEditorial.js';
