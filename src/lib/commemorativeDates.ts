import { normalizeSearchText } from './search';

export type OccasionAudience = 'clientes' | 'colaboradores' | 'eventos' | 'comunidade';
export type OccasionKind = 'relacionamento' | 'cultura' | 'impacto' | 'sazonal';
export type OccasionRule =
  | { type: 'fixed'; month: number; day: number }
  | { type: 'easter'; offsetDays: number }
  | { type: 'nth-weekday'; month: number; weekday: number; occurrence: number };

export interface OccasionIdea {
  label: string;
  query: string;
  reason: string;
}

export interface CommemorativeOccasion {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  concept: string;
  audiences: OccasionAudience[];
  kind: OccasionKind;
  rule: OccasionRule;
  leadWeeks: [number, number];
  ideas: OccasionIdea[];
  tags: string[];
  source?: { label: string; href: string };
}

export interface DatedOccasion extends CommemorativeOccasion {
  date: Date;
  dateKey: string;
}

const sebraeSource = {
  label: 'Calendário Promocional Sebrae',
  href: 'https://cliente.sebraees.com.br/calendario-promocional',
};

const unitedNationsSource = {
  label: 'Calendário de observâncias da ONU',
  href: 'https://www.un.org/en/observances/list-days-weeks',
};

function fixed(month: number, day: number): OccasionRule {
  return { type: 'fixed', month, day };
}

function idea(label: string, query: string, reason: string): OccasionIdea {
  return { label, query, reason };
}

export const occasionAudienceOptions: Array<{ id: 'todos' | OccasionAudience; label: string }> = [
  { id: 'todos', label: 'Todos os públicos' },
  { id: 'clientes', label: 'Clientes & parceiros' },
  { id: 'colaboradores', label: 'Colaboradores' },
  { id: 'eventos', label: 'Eventos & comunidades' },
  { id: 'comunidade', label: 'Causas & impacto' },
];

export const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'] as const;

export const commemorativeOccasions: CommemorativeOccasion[] = [
  {
    id: 'ano-novo', name: 'Ano Novo', eyebrow: 'Recomeços', kind: 'sazonal', rule: fixed(1, 1), audiences: ['clientes', 'colaboradores'], leadWeeks: [5, 8],
    description: 'Uma virada com espaço para agradecer, renovar vínculos e apresentar a energia do novo ciclo.', concept: 'Um novo capítulo começa com quem constrói ao seu lado.', tags: ['virada', 'agradecimento', 'planejamento'], source: sebraeSource,
    ideas: [idea('Kits para um novo ciclo', 'kit onboarding', 'Organizam boas-vindas, metas e rituais de começo de ano.'), idea('Papelaria com intenção', 'caderno', 'Transforma planos em um objeto presente na rotina.')],
  },
  {
    id: 'volta-ao-trabalho', name: 'Volta ao trabalho', eyebrow: 'People experience', kind: 'cultura', rule: fixed(1, 15), audiences: ['colaboradores'], leadWeeks: [3, 6],
    description: 'Uma oportunidade editorial para reativar a cultura depois das férias e começar o ano com cuidado.', concept: 'Voltar também pode ser uma forma de acolher.', tags: ['cultura', 'retorno', 'onboarding'],
    ideas: [idea('Mesa renovada', 'papelaria escritorio', 'Ajuda a reorganizar a rotina de um jeito útil.'), idea('Bem-estar no retorno', 'garrafa squeeze', 'Incentiva hábitos positivos sem pesar no discurso.')],
  },
  {
    id: 'carnaval', name: 'Carnaval', eyebrow: 'Cultura brasileira', kind: 'sazonal', rule: { type: 'easter', offsetDays: -47 }, audiences: ['eventos', 'clientes', 'colaboradores'], leadWeeks: [5, 9],
    description: 'Cor, encontro e movimento para ativações que pedem presença de marca e alta circulação.', concept: 'Sua marca no ritmo da rua, do bloco e das pessoas.', tags: ['verão', 'festa', 'ativação'], source: sebraeSource,
    ideas: [idea('Kit de rua', 'sacochila garrafa', 'Reúne utilidade e visibilidade durante a experiência.'), idea('Acessórios compartilháveis', 'oculos leque', 'Cria pontos de contato espontâneos e fotogênicos.')],
  },
  {
    id: 'dia-da-mulher', name: 'Dia Internacional da Mulher', eyebrow: '08 de março', kind: 'impacto', rule: fixed(3, 8), audiences: ['colaboradores', 'clientes', 'comunidade'], leadWeeks: [5, 8],
    description: 'Uma data para apoiar reconhecimento e equidade com uma mensagem coerente com as práticas da organização.', concept: 'Reconhecer histórias. Ampliar vozes. Criar espaço.', tags: ['mulheres', 'equidade', 'reconhecimento'], source: unitedNationsSource,
    ideas: [idea('Presente de escolha', 'kit premium', 'Permite adequar a curadoria a diferentes perfis.'), idea('Rotina com autoria', 'caderno premium', 'Abre espaço para mensagens e histórias reais.')],
  },
  {
    id: 'dia-do-consumidor', name: 'Dia do Consumidor', eyebrow: '15 de março', kind: 'relacionamento', rule: fixed(3, 15), audiences: ['clientes'], leadWeeks: [4, 7],
    description: 'Um ponto de contato para agradecer confiança, ouvir melhor e fortalecer a experiência do cliente.', concept: 'Entender para atender — e surpreender no detalhe.', tags: ['clientes', 'relacionamento', 'experiência'], source: sebraeSource,
    ideas: [idea('Utilidade que acompanha', 'copo termico', 'Mantém a marca presente sem parecer uma campanha descartável.'), idea('Afeto em formato compacto', 'kit presente', 'Combina produtos em uma entrega com mais significado.')],
  },
  {
    id: 'dia-da-felicidade', name: 'Dia Internacional da Felicidade', eyebrow: '20 de março', kind: 'impacto', rule: fixed(3, 20), audiences: ['colaboradores', 'comunidade'], leadWeeks: [3, 6],
    description: 'Um convite para criar pequenos momentos de bem-estar, conexão e cuidado coletivo.', concept: 'Boas memórias também fazem parte do trabalho.', tags: ['bem-estar', 'pessoas', 'cultura'], source: unitedNationsSource,
    ideas: [idea('Pausa com afeto', 'caneca', 'Conecta o presente a um ritual simples do dia.'), idea('Kit desconexão', 'kit bem estar', 'Cria uma pausa tangível em campanhas internas.')],
  },
  {
    id: 'pascoa', name: 'Páscoa', eyebrow: 'Data móvel', kind: 'sazonal', rule: { type: 'easter', offsetDays: 0 }, audiences: ['clientes', 'colaboradores'], leadWeeks: [5, 8],
    description: 'Uma celebração de partilha que funciona melhor quando a embalagem e a mensagem também contam a história.', concept: 'Um gesto para compartilhar. Uma lembrança para ficar.', tags: ['afeto', 'partilha', 'presente'], source: sebraeSource,
    ideas: [idea('Embalagem que continua', 'bolsa necessaire', 'A experiência permanece útil depois do conteúdo sazonal.'), idea('Mesa compartilhada', 'caneca copo', 'Aproxima a marca de um momento de convivência.')],
  },
  {
    id: 'dia-da-terra', name: 'Dia da Terra', eyebrow: '22 de abril', kind: 'impacto', rule: fixed(4, 22), audiences: ['clientes', 'colaboradores', 'comunidade'], leadWeeks: [5, 9],
    description: 'Uma ocasião para dar visibilidade a compromissos ambientais concretos e escolhas mais conscientes.', concept: 'Toda escolha deixa uma marca. Que ela faça sentido.', tags: ['sustentabilidade', 'planeta', 'impacto'], source: unitedNationsSource,
    ideas: [idea('Materiais de menor impacto', 'reciclado sustentavel', 'A materialidade reforça a mensagem da ação.'), idea('Cultivar vínculos', 'semente planta', 'Traduz continuidade em um gesto simples e simbólico.')],
  },
  {
    id: 'dia-do-trabalho', name: 'Dia do Trabalho', eyebrow: '01 de maio', kind: 'cultura', rule: fixed(5, 1), audiences: ['colaboradores'], leadWeeks: [5, 8],
    description: 'Uma data para reconhecer contribuição, trajetórias e tudo o que só acontece porque existe um time.', concept: 'Excelência em cada detalhe. Pessoas em cada conquista.', tags: ['reconhecimento', 'trabalho', 'cultura'], source: sebraeSource,
    ideas: [idea('Reconhecimento que acompanha', 'mochila', 'Entrega valor percebido e uso recorrente.'), idea('Kit para celebrar juntos', 'kit churrasco', 'Transforma a homenagem em experiência compartilhada.')],
  },
  {
    id: 'dia-do-marketing', name: 'Dia do Profissional de Marketing', eyebrow: '08 de maio', kind: 'cultura', rule: fixed(5, 8), audiences: ['colaboradores', 'clientes'], leadWeeks: [3, 6],
    description: 'A data de quem transforma contexto em ideia, ideia em campanha e campanha em conexão.', concept: 'Para quem faz a marca acontecer antes de todo mundo ver.', tags: ['marketing', 'criatividade', 'marca'], source: sebraeSource,
    ideas: [idea('Desk kit criativo', 'kit escritorio', 'Acompanha brainstorms, reuniões e repertório.'), idea('Tech para produzir', 'carregador portatil', 'Resolve fricções reais da rotina de criação.')],
  },
  {
    id: 'dia-das-maes', name: 'Dia das Mães', eyebrow: '2º domingo de maio', kind: 'sazonal', rule: { type: 'nth-weekday', month: 5, weekday: 0, occurrence: 2 }, audiences: ['clientes', 'colaboradores'], leadWeeks: [6, 10],
    description: 'Uma campanha que pede escuta, pluralidade e liberdade para reconhecer diferentes formas de cuidado.', concept: 'Cuidado é presença. Presente é significado.', tags: ['mães', 'cuidado', 'afeto'], source: sebraeSource,
    ideas: [idea('Escolhas para diferentes rotinas', 'kit premium', 'Evita uma única ideia de maternidade e amplia identificação.'), idea('Autocuidado útil', 'necessaire', 'Combina leveza, função e boa possibilidade de personalização.')],
  },
  {
    id: 'dia-da-industria', name: 'Dia da Indústria', eyebrow: '25 de maio', kind: 'relacionamento', rule: fixed(5, 25), audiences: ['clientes', 'colaboradores'], leadWeeks: [4, 8],
    description: 'Uma ocasião para valorizar parceiros, produção, inovação e as pessoas por trás de cada entrega.', concept: 'Quem transforma ideia em realidade merece reconhecimento.', tags: ['indústria', 'parceria', 'produção'], source: sebraeSource,
    ideas: [idea('Kit de campo e operação', 'kit ferramenta', 'Conecta o presente ao cotidiano do setor.'), idea('Tech funcional', 'tecnologia', 'Reforça inovação com utilidade imediata.')],
  },
  {
    id: 'dia-do-meio-ambiente', name: 'Dia Mundial do Meio Ambiente', eyebrow: '05 de junho', kind: 'impacto', rule: fixed(6, 5), audiences: ['clientes', 'colaboradores', 'comunidade'], leadWeeks: [6, 10],
    description: 'Uma oportunidade para envolver pessoas em compromissos ambientais reais e mensuráveis.', concept: 'Conectar marcas e pessoas também é cuidar do futuro.', tags: ['meio ambiente', 'ESG', 'sustentabilidade'], source: unitedNationsSource,
    ideas: [idea('Curadoria sustentável', 'reciclado', 'Conecta materiais e mensagem em uma mesma escolha.'), idea('Reuso na rotina', 'garrafa ecologica', 'A utilidade diária ajuda a prolongar a campanha.')],
  },
  {
    id: 'dia-dos-namorados', name: 'Dia dos Namorados', eyebrow: '12 de junho', kind: 'sazonal', rule: fixed(6, 12), audiences: ['clientes'], leadWeeks: [5, 8],
    description: 'Uma data para marcas de hospitalidade, varejo e relacionamento criarem experiências a dois.', concept: 'Boas conexões merecem ser celebradas.', tags: ['relacionamento', 'experiência', 'afeto'], source: sebraeSource,
    ideas: [idea('Experiência compartilhada', 'kit vinho', 'Cria um ritual para duas pessoas.'), idea('Casa e afeto', 'casa cozinha', 'Leva a campanha para momentos cotidianos.')],
  },
  {
    id: 'festas-juninas', name: 'Festas Juninas', eyebrow: 'Temporada de junho', kind: 'sazonal', rule: fixed(6, 24), audiences: ['eventos', 'colaboradores', 'clientes'], leadWeeks: [5, 9],
    description: 'Uma temporada rica em linguagem visual, encontro e experiências internas ou abertas ao público.', concept: 'Uma festa com sotaque brasileiro e a sua marca no arraial.', tags: ['são joão', 'festa', 'evento'], source: sebraeSource,
    ideas: [idea('Kit de arraial', 'caneca sacola', 'Ajuda a compor a experiência e continua útil depois da festa.'), idea('Brinde para compartilhar', 'kit cozinha', 'Aproxima produto, tradição e convivência.')],
  },
  {
    id: 'dia-do-amigo', name: 'Dia do Amigo', eyebrow: '20 de julho', kind: 'relacionamento', rule: fixed(7, 20), audiences: ['clientes', 'colaboradores'], leadWeeks: [3, 6],
    description: 'Uma boa deixa para reconhecer parcerias, comunidades e relações que tornam o caminho melhor.', concept: 'Tem conexão que começa no trabalho e vira história.', tags: ['amizade', 'parceria', 'comunidade'], source: sebraeSource,
    ideas: [idea('Duplas que combinam', 'kit copo', 'Cria uma mecânica de compartilhar ou presentear alguém.'), idea('Pequenos gestos', 'chaveiro', 'Funciona em ações amplas e mensagens personalizadas.')],
  },
  {
    id: 'dia-da-amizade', name: 'Dia Internacional da Amizade', eyebrow: '30 de julho', kind: 'impacto', rule: fixed(7, 30), audiences: ['eventos', 'comunidade', 'colaboradores'], leadWeeks: [3, 6],
    description: 'Uma observância para fortalecer pontes entre pessoas, culturas e comunidades.', concept: 'Mais encontros. Mais pontes. Mais histórias em comum.', tags: ['amizade', 'comunidade', 'conexão'], source: unitedNationsSource,
    ideas: [idea('Ação de comunidade', 'ecologico', 'Conecta o brinde a uma experiência coletiva.'), idea('Símbolos de pertencimento', 'camiseta', 'Ajuda grupos e comunidades a se reconhecerem.')],
  },
  {
    id: 'dia-dos-pais', name: 'Dia dos Pais', eyebrow: '2º domingo de agosto', kind: 'sazonal', rule: { type: 'nth-weekday', month: 8, weekday: 0, occurrence: 2 }, audiences: ['clientes', 'colaboradores'], leadWeeks: [6, 10],
    description: 'Uma campanha para celebrar vínculos de cuidado de forma contemporânea, diversa e afetiva.', concept: 'Presença que ensina. Histórias que ficam.', tags: ['pais', 'família', 'reconhecimento'], source: sebraeSource,
    ideas: [idea('Experiência para aproveitar', 'kit churrasco', 'Transforma o presente em um momento compartilhado.'), idea('Companheiro de rotina', 'copo termico', 'Entrega função e alto potencial de permanência.')],
  },
  {
    id: 'dia-do-estudante', name: 'Dia do Estudante', eyebrow: '11 de agosto', kind: 'cultura', rule: fixed(8, 11), audiences: ['eventos', 'comunidade'], leadWeeks: [4, 7],
    description: 'Uma oportunidade para instituições e marcas apoiarem jornadas de aprendizado e pertencimento.', concept: 'Toda grande trajetória começa com curiosidade.', tags: ['educação', 'estudantes', 'aprendizado'], source: sebraeSource,
    ideas: [idea('Kit de estudos', 'caderno caneta', 'Resolve necessidades reais da rotina acadêmica.'), idea('Tech para aprender', 'carregador fone', 'Acompanha mobilidade, conteúdo e colaboração.')],
  },
  {
    id: 'dia-do-estagiario', name: 'Dia do Estagiário', eyebrow: '18 de agosto', kind: 'cultura', rule: fixed(8, 18), audiences: ['colaboradores'], leadWeeks: [3, 6],
    description: 'Uma chance de reconhecer quem está começando e reforçar uma cultura que abre espaço para aprender.', concept: 'Talento cresce quando encontra espaço.', tags: ['talentos', 'carreira', 'reconhecimento'],
    ideas: [idea('Começo com identidade', 'kit onboarding', 'Marca a jornada e reforça pertencimento.'), idea('Ferramentas para crescer', 'caderno garrafa', 'Combina acolhimento com uso recorrente.')],
  },
  {
    id: 'dia-do-cliente', name: 'Dia do Cliente', eyebrow: '15 de setembro', kind: 'relacionamento', rule: fixed(9, 15), audiences: ['clientes'], leadWeeks: [5, 8],
    description: 'Uma das melhores oportunidades do ano para agradecer, fidelizar e mostrar que a relação vai além da entrega.', concept: 'Encantar pessoas, somos bons nisso.', tags: ['cliente', 'fidelização', 'relacionamento'], source: sebraeSource,
    ideas: [idea('Presente que permanece', 'mochila premium', 'Entrega valor percebido e uso frequente.'), idea('Kit de relacionamento', 'kit cliente', 'Permite construir uma narrativa completa de agradecimento.')],
  },
  {
    id: 'dia-da-arvore', name: 'Dia da Árvore', eyebrow: '21 de setembro', kind: 'impacto', rule: fixed(9, 21), audiences: ['comunidade', 'colaboradores', 'clientes'], leadWeeks: [4, 8],
    description: 'Uma data para conectar educação ambiental, voluntariado e escolhas de materiais mais responsáveis.', concept: 'Plante intenção. Cultive impacto.', tags: ['árvore', 'natureza', 'sustentabilidade'], source: sebraeSource,
    ideas: [idea('Cultivar uma ideia', 'semente planta', 'Torna a mensagem parte de um pequeno ritual.'), idea('Materiais com história', 'bambu reciclado', 'Dá visibilidade às escolhas que sustentam a campanha.')],
  },
  {
    id: 'dia-da-secretaria', name: 'Dia da Secretária', eyebrow: '30 de setembro', kind: 'cultura', rule: fixed(9, 30), audiences: ['colaboradores'], leadWeeks: [3, 6],
    description: 'Um momento para reconhecer organização, cuidado e as conexões que mantêm a rotina funcionando.', concept: 'Excelência também é fazer tudo acontecer.', tags: ['reconhecimento', 'profissionais', 'cultura'], source: sebraeSource,
    ideas: [idea('Organização com estilo', 'caderno premium', 'Conecta a homenagem ao trabalho sem limitar o presente a ele.'), idea('Pausa merecida', 'caneca termica', 'Cria um gesto de cuidado na rotina.')],
  },
  {
    id: 'dia-do-vendedor', name: 'Dia do Vendedor', eyebrow: '01 de outubro', kind: 'cultura', rule: fixed(10, 1), audiences: ['colaboradores'], leadWeeks: [4, 7],
    description: 'Uma ocasião para celebrar quem escuta, entende e transforma necessidade em relacionamento.', concept: 'Entender para atender. Conectar para crescer.', tags: ['vendas', 'metas', 'reconhecimento'], source: sebraeSource,
    ideas: [idea('Mobilidade comercial', 'mochila pasta', 'Acompanha visitas, reuniões e viagens.'), idea('Tech para performance', 'power bank', 'Resolve uma dor real de quem trabalha em movimento.')],
  },
  {
    id: 'dia-das-criancas', name: 'Dia das Crianças', eyebrow: '12 de outubro', kind: 'sazonal', rule: fixed(10, 12), audiences: ['eventos', 'colaboradores', 'clientes'], leadWeeks: [6, 10],
    description: 'Uma campanha lúdica para eventos familiares, ações sociais e experiências de marca cheias de imaginação.', concept: 'Criatividade não tem idade.', tags: ['crianças', 'família', 'evento'], source: sebraeSource,
    ideas: [idea('Criar e brincar', 'kit desenho', 'Estimula participação além do momento da entrega.'), idea('Dia ao ar livre', 'sacola squeeze', 'Funciona em eventos com movimento e família.')],
  },
  {
    id: 'dia-do-professor', name: 'Dia do Professor', eyebrow: '15 de outubro', kind: 'cultura', rule: fixed(10, 15), audiences: ['colaboradores', 'comunidade'], leadWeeks: [4, 8],
    description: 'Uma data para agradecer a quem compartilha conhecimento e abre caminhos todos os dias.', concept: 'Quem ensina deixa marcas que o tempo não apaga.', tags: ['educação', 'professores', 'reconhecimento'], source: sebraeSource,
    ideas: [idea('Escrever novas histórias', 'caneta caderno', 'Dialoga com conhecimento sem cair no óbvio quando bem personalizado.'), idea('Cuidado na rotina', 'copo termico', 'Entrega conforto e utilidade diária.')],
  },
  {
    id: 'halloween', name: 'Halloween', eyebrow: '31 de outubro', kind: 'sazonal', rule: fixed(10, 31), audiences: ['eventos', 'colaboradores', 'clientes'], leadWeeks: [4, 7],
    description: 'Uma ocasião visual e descontraída para campanhas internas, experiências e ativações temáticas.', concept: 'Uma ideia assustadoramente boa para tirar a marca do comum.', tags: ['halloween', 'criatividade', 'evento'], source: sebraeSource,
    ideas: [idea('Kit noite temática', 'copo sacola', 'Ajuda a compor a experiência e circular a identidade da ação.'), idea('Dress code da campanha', 'camiseta', 'Transforma participantes em parte do conceito visual.')],
  },
  {
    id: 'empreendedorismo-feminino', name: 'Dia do Empreendedorismo Feminino', eyebrow: '19 de novembro', kind: 'impacto', rule: fixed(11, 19), audiences: ['clientes', 'colaboradores', 'comunidade'], leadWeeks: [5, 8],
    description: 'Uma ocasião para reconhecer lideranças, negócios e redes que ampliam oportunidades para mulheres.', concept: 'Ideias lideradas por mulheres transformam futuros.', tags: ['empreendedorismo', 'mulheres', 'liderança'], source: sebraeSource,
    ideas: [idea('Liderança em movimento', 'mochila executiva', 'Une presença, função e valor percebido.'), idea('Rede de ideias', 'caderno premium', 'Apoia encontros, mentorias e histórias de negócio.')],
  },
  {
    id: 'consciencia-negra', name: 'Dia da Consciência Negra', eyebrow: '20 de novembro', kind: 'impacto', rule: fixed(11, 20), audiences: ['colaboradores', 'comunidade'], leadWeeks: [6, 10],
    description: 'Uma data de memória, reconhecimento e compromisso que exige protagonismo, contexto e ação concreta.', concept: 'Representatividade se constrói com presença e compromisso.', tags: ['diversidade', 'equidade', 'cultura'], source: sebraeSource,
    ideas: [idea('Conteúdo com autoria', 'livro caderno', 'Pode integrar narrativas e criadores à ação com contexto.'), idea('Identidade compartilhada', 'camiseta ecologica', 'Funciona quando o conceito é cocriado e respeita a ocasião.')],
  },
  {
    id: 'black-friday', name: 'Black Friday', eyebrow: '4ª sexta de novembro', kind: 'sazonal', rule: { type: 'nth-weekday', month: 11, weekday: 5, occurrence: 4 }, audiences: ['clientes', 'eventos'], leadWeeks: [7, 12],
    description: 'Uma oportunidade para surpreender clientes, creators e parceiros antes, durante ou depois da alta temporada comercial.', concept: 'A campanha passa rápido. A lembrança pode ficar.', tags: ['varejo', 'campanha', 'relacionamento'], source: sebraeSource,
    ideas: [idea('Unboxing de campanha', 'kit embalagem', 'Amplia a experiência de creators e parceiros.'), idea('Agradecimento pós-compra', 'brinde pequeno', 'Estende o relacionamento para além da conversão.')],
  },
  {
    id: 'dia-da-pessoa-com-deficiencia', name: 'Dia Internacional da Pessoa com Deficiência', eyebrow: '03 de dezembro', kind: 'impacto', rule: fixed(12, 3), audiences: ['colaboradores', 'comunidade'], leadWeeks: [6, 10],
    description: 'Uma observância para ampliar participação, acessibilidade e protagonismo de pessoas com deficiência.', concept: 'Incluir é criar espaço para todas as pessoas participarem.', tags: ['acessibilidade', 'inclusão', 'diversidade'], source: unitedNationsSource,
    ideas: [idea('Experiência acessível', 'produto ergonomico', 'A curadoria deve partir de necessidades reais e consulta ao público.'), idea('Comunicação multissensorial', 'kit textura', 'Pode apoiar experiências inclusivas quando cocriada com especialistas.')],
  },
  {
    id: 'natal', name: 'Natal', eyebrow: '25 de dezembro', kind: 'sazonal', rule: fixed(12, 25), audiences: ['clientes', 'colaboradores'], leadWeeks: [8, 14],
    description: 'O grande momento de agradecer o ano com uma experiência que traduza a personalidade da marca.', concept: 'Presentear com significado é lembrar de cada detalhe.', tags: ['natal', 'fim de ano', 'agradecimento'], source: sebraeSource,
    ideas: [idea('Kit assinatura', 'kit premium', 'Combina narrativa, embalagem e produtos em uma experiência completa.'), idea('Celebração compartilhada', 'kit churrasco vinho', 'Transforma o presente em um momento para viver junto.')],
  },
  {
    id: 'confraternizacao', name: 'Confraternização de fim de ano', eyebrow: 'Temporada de dezembro', kind: 'cultura', rule: fixed(12, 10), audiences: ['colaboradores', 'eventos'], leadWeeks: [7, 12],
    description: 'Um marco para reunir pessoas, reconhecer entregas e fechar o ciclo com memória afetiva.', concept: 'O melhor do ano foi construir tudo isso juntos.', tags: ['confraternização', 'time', 'celebração'],
    ideas: [idea('Kit para celebrar', 'kit churrasco', 'Leva a experiência para além do evento.'), idea('Reconhecimento com desejo', 'mochila premium', 'Marca a conquista com um produto de alto valor percebido.')],
  },
];

export function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

export function nthWeekdayOfMonth(year: number, month: number, weekday: number, occurrence: number): Date {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const day = 1 + ((7 + weekday - first.getUTCDay()) % 7) + (occurrence - 1) * 7;
  return new Date(Date.UTC(year, month - 1, day));
}

export function resolveOccasionDate(rule: OccasionRule, year: number): Date {
  if (rule.type === 'fixed') return new Date(Date.UTC(year, rule.month - 1, rule.day));
  if (rule.type === 'nth-weekday') return nthWeekdayOfMonth(year, rule.month, rule.weekday, rule.occurrence);
  const date = easterDate(year);
  date.setUTCDate(date.getUTCDate() + rule.offsetDays);
  return date;
}

export function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function occasionsForYear(year: number): DatedOccasion[] {
  return commemorativeOccasions
    .map((occasion) => {
      const date = resolveOccasionDate(occasion.rule, year);
      return { ...occasion, date, dateKey: toDateKey(date) };
    })
    .sort((left, right) => left.date.getTime() - right.date.getTime());
}

export function filterOccasions(occasions: DatedOccasion[], filters: { month: number | null; audience: OccasionAudience | null; query: string }): DatedOccasion[] {
  const query = normalizeSearchText(filters.query);
  return occasions.filter((occasion) => {
    if (filters.month !== null && occasion.date.getUTCMonth() !== filters.month) return false;
    if (filters.audience && !occasion.audiences.includes(filters.audience)) return false;
    if (!query) return true;
    const haystack = normalizeSearchText([occasion.name, occasion.eyebrow, occasion.description, occasion.concept, ...occasion.tags].join(' '));
    return query.split(' ').filter(Boolean).every((term) => haystack.includes(term));
  });
}

export function nextOccasion(now = new Date()): DatedOccasion {
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const thisYear = occasionsForYear(today.getUTCFullYear());
  return thisYear.find((occasion) => occasion.date >= today) || occasionsForYear(today.getUTCFullYear() + 1)[0];
}

export function planningDate(occasion: DatedOccasion): Date {
  const date = new Date(occasion.date);
  date.setUTCDate(date.getUTCDate() - occasion.leadWeeks[1] * 7);
  return date;
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function nextDateKey(date: Date): string {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return toDateKey(next).replaceAll('-', '');
}

export function occasionCalendarFile(occasion: DatedOccasion, pageUrl: string, planning = false): string {
  const start = planning ? planningDate(occasion) : occasion.date;
  const startKey = toDateKey(start).replaceAll('-', '');
  const title = planning ? `Começar planejamento — ${occasion.name}` : `${occasion.name} — campanha Promo Brindes`;
  const description = planning
    ? `Janela sugerida para iniciar a campanha de ${occasion.name}. Antecedência editorial: ${occasion.leadWeeks[0]} a ${occasion.leadWeeks[1]} semanas.`
    : `${occasion.concept} Veja ideias e prepare o briefing em ${pageUrl}`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Promo Brindes//Agenda de conexoes//PT-BR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${occasion.id}-${startKey}@promobrindes.com.br`, `DTSTART;VALUE=DATE:${startKey}`, `DTEND;VALUE=DATE:${nextDateKey(start)}`,
    `SUMMARY:${escapeIcs(title)}`, `DESCRIPTION:${escapeIcs(description)}`, `URL:${pageUrl}`, 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
