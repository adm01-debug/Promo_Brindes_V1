# Plano em 100 etapas para aplicar os princípios de Carnegie à experiência da Promo Brindes

Data: 05/10/2026. Projeto: Promo Brindes V1. Público deste documento: responsável pelo produto, design, conteúdo, engenharia, QA e atendimento.

**Estado: planejamento para aprovação. As 100 etapas estão planejadas, não executadas.** O pedido atual autoriza somente elaborar e versionar este documento. Não autoriza implementar telas, gerar migrations, ativar serviços, mesclar PRs ou publicar mudanças no site. Os exemplos de texto são propostas editoriais, não promessas comerciais aprovadas.

O objetivo é fazer o visitante perceber que sua campanha foi compreendida e que ele tem apoio para escolher e solicitar um orçamento. A aplicação se concentra em descoberta por intenção, escuta pelo briefing, clareza na decisão, liberdade de escolha, recuperação respeitosa de erros e continuidade do atendimento. Não é uma estratégia de pressão psicológica nem uma promessa de aumento de conversão.

## Fundamentos e interpretação

As referências de relacionamento vêm de *Como fazer amigos e influenciar pessoas*, de Dale Carnegie. A organização Dale Carnegie apresenta princípios como interesse genuíno, escuta, respeito pela perspectiva alheia, reconhecimento sincero e admissão dos próprios erros. A referência oficial é [Human Relations Principles](https://www.dalecarnegie.com/en-gb/about/culture). Na elaboração, o conteúdo foi localizado no índice de busca; a abertura direta retornou 403. Esta é uma síntese temática, não transcrição, conferência de uma edição específica ou associação comercial com a instituição.

Os códigos abaixo são agrupamentos de trabalho deste plano, não a numeração original do livro. Todas as soluções de interface são propostas próprias para a Promo Brindes.

| Código | Princípio de relacionamento sintetizado | Aplicação proposta |
| --- | --- | --- |
| C1 | Interesse genuíno pelas pessoas | Começar pela campanha, pelo público e pelas restrições declaradas. |
| C2 | Escutar e considerar a perspectiva do outro | Confirmar o entendimento e evitar perguntas repetidas. |
| C3 | Conversar sobre o que importa para o interlocutor | Explicar utilidade e apoiar a apresentação da escolha ao gestor. |
| C4 | Respeitar opiniões e convidar à participação | Permitir editar, pular, comparar, recusar sugestões e voltar. |
| C5 | Reconhecer sinceramente e acolher | Confirmar ações reais com linguagem humana, sem bajulação. |
| C6 | Corrigir com respeito e incentivar a recuperação | Orientar sem constranger e preservar o esforço do visitante. |
| C7 | Admitir erros e assumir responsabilidades | Diferenciar falha do sistema, pendência e recebimento confirmado. |
| C8 | Tratar cada pessoa com consideração | Usar dados voluntários com parcimônia e respeitar privacidade e canal escolhido. |

Como apoio de UX, as [heurísticas de Jakob Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/) orientam controle, visibilidade de estado e linguagem compreensível. As [diretrizes de mensagens de erro](https://www.nngroup.com/articles/error-message-guidelines/) apoiam orientação contextual e preservação das entradas. Para acessibilidade, usar os critérios aplicáveis da [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/). Essas fontes não comprovam eficácia comercial das propostas; isso dependerá da pesquisa e da medição previstas.

## Evidências e limites da leitura atual

O plano parte da `origin/main` em `13c52380671f253f095c53a8068fc1fc4fa1f4ee`, consultada em 05/10/2026. A navegação pelo Graphify e a leitura dirigida ocorreram na worktree da ficha compacta, em `629196fb05fe92bfaba584efcbac2540dc41f829`; diferenças dessa branch não são atribuídas à produção. Esta foi uma inspeção para planejamento, não uma auditoria integral, homologação funcional ou consulta ao banco remoto.

| Frente | Evidência localizada | Consequência para o plano |
| --- | --- | --- |
| Descoberta | [CampaignFinder](../src/components/CampaignFinder.tsx) e [campaignPresets](../src/lib/campaignPresets.ts) já têm quatro perguntas, saltos e navegação para o catálogo. | Evoluir compreensão e revisão; não criar outro questionário concorrente. |
| Contexto da campanha | [campaignBrief](../src/lib/campaignBrief.ts), [useCatalogPageState](../src/lib/useCatalogPageState.ts) e [QuoteCartContext](../src/context/QuoteCartContext.tsx) já transportam contexto. | Verificar conflitos, edição e descarte antes de adicionar persistência. |
| Catálogo | [CatalogPage](../src/pages/CatalogPage.tsx) já apresenta contexto, filtros removíveis, comparação e FAQ. | Explicar critérios e melhorar estados sem reiniciar o superfiltro. |
| Orçamento | [QuotePage](../src/pages/QuotePage.tsx) já mostra resumo da campanha, dados opcionais, canal preferido e rascunho. | Fazer o resumo mais revisável e a transição mais clara. |
| Rascunho | [quoteDraft](../src/lib/quoteDraft.ts) usa sessionStorage com limite de 24 horas na aba. | Não anunciar sincronização automática nem salvamento permanente. |
| Contato | [ConversationForm](../src/components/ConversationForm.tsx) já contém preferência de canal e estados de erro/sucesso. | Refinar clareza, acessibilidade e fidelidade ao resultado real. |
| Histórico | [CustomerQuotePage](../src/pages/CustomerQuotePage.tsx) tem contexto original, repetição e ajustes condicionados a configuração. | Preservar privacidade e distinguir capacidade no código de disponibilidade no ambiente. |
| Medição | [analytics](../src/lib/analytics.ts) já limita propriedades e reduz URLs. | Ampliar somente eventos necessários, sem conteúdo pessoal ou texto livre. |
| Ficha compacta | [PR 91](https://github.com/adm01-debug/Promo_Brindes_V1/pull/91), aberto na consulta. | Reconciliar o desenho aprovado e o estado do PR antes de editar ProductPage. |
| Gift Lovers | [PR 92](https://github.com/adm01-debug/Promo_Brindes_V1/pull/92), aberto na consulta. | Reaproveitar a assinatura aprovada; não afirmar que está publicada. |

O [índice de planos](MATRIZ_INDEX.md) e o [plano de fechamento de 01/10](PLANO_FECHAMENTO_100_ETAPAS_20261001.md) continuam válidos em seus próprios escopos. Este documento complementa a experiência de relacionamento; não substitui seus requisitos, reabre aceites comprovados nem altera a contagem histórica de implementação.

## Restrições e decisões preservadas

- Trabalhar somente no site Promo Brindes. O código e o banco do Promo Gifts V4 permanecem fora do escopo.
- O site recebe solicitações de orçamento; não há checkout ou pagamento online. Não criar cadastro obrigatório para o primeiro pedido.
- Manter todos os produtos elegíveis no catálogo, inclusive quando o estoque do fornecedor for zero ou incerto. Não usar estoque como garantia de entrega nem criar falsa escassez.
- Preço, prazo, quantidade mínima, técnica, embalagem e alegações ambientais precisam de fonte e validação apropriadas. Valor desconhecido não vira zero, promessa ou certificação.
- Preservar Tendências, badge único por card, fotos desobstruídas, comparação, kits, catálogos, calendário e recursos da conta. Novos textos não autorizam regressões nesses contratos.
- Preservar as quatro frases aprovadas: “Entender para atender”, “Excelência em cada detalhe”, “Conectando Marcas e Pessoas” e “Encantar pessoas, somos bons nisso!”. Respeitar a terminologia “nosso time de especialistas” para o atendimento da Promo, sem substituir indevidamente referências ao time do cliente.
- Preservar a direção aprovada de Gift Lovers by Promo: Space Grotesk e Inter, sem criar comunidade, assinatura, programa de pontos ou adesão implícita.
- **Antes de qualquer alteração visual, produzir imagens separadas do código da aplicação, apresentar desktop e celular quando afetados e aguardar aprovação explícita.** Plano textual e pedido genérico de execução não substituem esse aceite. A regra vale mesmo se o PR que a documenta ainda estiver aberto.
- Resend, WhatsApp, webhooks, alertas e credenciais anteriormente adiadas continuam adiados. Preferência de contato não equivale a consentimento de marketing ou canal automático ativo. Nenhuma etapa exige ativá-los para maquiar conclusão.
- Nenhum novo schema ou serviço é pressuposto. Se o contrato atual não comportar uma necessidade aprovada, abrir decisão técnica e obter autorização específica para eventual migration no ambiente isolado do site; nunca alterar o sistema interno.
- Não versionar segredos, mensagens reais de clientes ou dados pessoais. Fotos, depoimentos, cases e marcas de terceiros exigem materiais identificados e autorização de uso; a informação de que existem não autoriza inventar conteúdo.
- Não coletar idade ou inferir traços pessoais para classificar visitantes como geração Z. O público de marketing é uma hipótese de pesquisa, não justificativa para estereótipos, gírias forçadas ou exclusão de outros usuários.

## Execução futura e critérios comuns

Cada etapa abaixo começa em **planejada**. Estados futuros possíveis: em execução, bloqueada com motivo, validada tecnicamente, publicada quando aplicável e homologada. “Dispensada por evidência” e “adiada por decisão” são estados separados, nunca implementação concluída. Recurso já existente é reaproveitado e retestado, não refeito para satisfazer uma contagem.

P1 indica continuidade, confiança, acessibilidade essencial ou pré-requisito; P2 indica aprimoramento. Responsáveis são funções propostas, ainda sem pessoas ou prazos atribuídos. Dependências numéricas são pré-requisitos de aceite; preparação independente pode ocorrer sem promovê-los a concluídos. Todas as etapas de implementação visual dependem também da etapa 020 e de nova aprovação caso o desenho mude substancialmente.

Para aceitar qualquer etapa, registrar requisito, evidência anterior, diff ou justificativa de reaproveitamento, cenário, resultado observado, teste, SHA, ambiente, captura sanitizada quando visual, limitações e responsável pelo aceite. Uma captura de mockup não comprova implementação; código não comprova publicação; CI verde não substitui teste humano.

Sequência de marcos proposta: 001–010 estabelecem a base; 011–020 aprovam a experiência; 021–090 entregam lotes pequenos; 091–100 consolidam verificação, pesquisa e eventual publicação autorizada. Testes específicos acompanham cada lote desde o início. A primeira fatia funcional sugerida após aprovação é revisar o contexto do briefing, levá-lo ao orçamento e confirmar recebimento real, antes de ampliar conteúdo editorial.

## Bloco 1 Base de produto e necessidades humanas

### Etapa 001 Registrar a versão de partida

P1 · Engenharia e QA · C1, C7 · Depende de: nenhuma.

- **Entrega:** registrar SHAs, alterações locais, PRs 90–92, configuração relevante e evidência disponível de publicação antes da execução futura.
- **Cenários e aceite:** branch atrasada, PR não mesclado e preview diferente de produção ficam identificados; nenhum trabalho alheio é sobrescrito e nenhum estado remoto é presumido.

### Etapa 002 Relacionar este plano aos requisitos anteriores

P1 · Produto e QA · C2 · Depende de: 001.

- **Entrega:** mapear cada melhoria aos componentes, planos e testes existentes, classificando reaproveitar, evoluir, validar ou propor novo recurso.
- **Cenários e aceite:** resumo de campanha, rascunho e canal preferido não aparecem como funcionalidades inexistentes; divergências entre requisitos recebem decisão explícita sem alterar aceites históricos automaticamente.

### Etapa 003 Definir a promessa de experiência

P1 · Produto e Conteúdo · C1, C3, C7 · Depende de: 002.

- **Entrega:** aprovar a proposta “entender sua campanha, apoiar escolhas e construir uma proposta com nosso time de especialistas”, distinguindo descoberta, solicitação e negociação.
- **Cenários e aceite:** visitante novo consegue explicar que não está comprando nem recebendo garantia de disponibilidade; verbos e promessas são comercialmente realizáveis.

### Etapa 004 Validar perfis por necessidades

P2 · Pesquisa e Produto · C1, C8 · Depende de: 003.

- **Entrega:** formular perfis provisórios para profissional de marketing, organizador de evento e pessoa que aprova a seleção, com experiência, contexto e restrições.
- **Cenários e aceite:** pressa, pouca familiaridade, baixo orçamento e navegação assistiva são contemplados; idade, cargo ou estilo visual não são tratados como comportamento comprovado.

### Etapa 005 Mapear a jornada e suas dúvidas

P1 · Pesquisa e Design · C2, C3 · Depende de: 004.

- **Entrega:** descrever chegada, briefing, exploração, decisão, compartilhamento, solicitação e retorno, registrando dúvida, informação necessária e próximo passo em cada momento.
- **Cenários e aceite:** entrada direta em produto ou calendário também tem caminho compreensível; ninguém precisa passar pela home ou pelo questionário para solicitar orçamento.

### Etapa 006 Planejar pesquisa sem indução

P2 · Pesquisa · C1, C2, C8 · Depende de: 005.

- **Entrega:** preparar tarefas abertas e convite consentido a participantes representativos, sem pedir concordância com o design nem coletar dados pessoais desnecessários.
- **Cenários e aceite:** perguntas como “como você escolheria?” substituem “você gostou?”; protocolo define gravação opcional, anonimização, análise e limitações da amostra.

### Etapa 007 Inventariar afirmações comerciais

P1 · Conteúdo e Atendimento · C3, C7 · Depende de: 003.

- **Entrega:** relacionar textos sobre materiais, impacto ambiental, qualidade, estoque, mínimos, prazo, personalização, atendimento e entrega de mensagens às respectivas fontes e responsáveis.
- **Cenários e aceite:** alegações sem suporte são qualificadas ou retiradas da proposta; um dado de fornecedor não é automaticamente tratado como garantia da Promo.

### Etapa 008 Mapear capacidades operacionais

P1 · Produto e Atendimento · C2, C7, C8 · Depende de: 007.

- **Entrega:** documentar canais realmente atendidos, origem do protocolo, estados do pedido e horários ou prazos somente quando confirmados pelo responsável.
- **Cenários e aceite:** integração desativada, feriado, ausência de atendente e pedido sem preferência têm comportamento honesto; nenhuma variável de ambiente é ativada nesta etapa por inferência.

### Etapa 009 Estabelecer limites de persuasão

P1 · Produto e Design · C4, C5, C8 · Depende de: 003, 008.

- **Entrega:** checklist contra urgência fictícia, culpa ao recusar, elogios automáticos exagerados, dados presumidos, prova social inventada e consentimento disfarçado.
- **Cenários e aceite:** sair, pular ou escolher outro produto não produz mensagem depreciativa; a aprovação do checklist é exigida em cada revisão de interface.

### Etapa 010 Definir indicadores e linha de base

P1 · Produto e Dados · C2, C7 · Depende de: 005, 009.

- **Entrega:** definir conclusão de tarefa, entendimento do próximo passo, erros recuperados, repetição de perguntas e envio confirmado, com denominador, janela e fonte, e registrar as observações pré-mudança disponíveis antes de iniciar os lotes de interface.
- **Cenários e aceite:** a linha de base identifica data, versão, amostra, método e limitações. Se os dados existentes não sustentarem um indicador, registrar uma linha de base qualitativa controlada ou antecipar, por decisão explícita e revisão de privacidade, somente a instrumentação indispensável antes da implementação; amostra pequena, tráfego automatizado e bloqueio de analytics são explicitados, e nenhum ganho percentual ou causalidade é anunciado sem medição comparável.

## Bloco 2 Linguagem e propostas visuais

### Etapa 011 Criar o guia de voz de relacionamento

P1 · Conteúdo e Produto · C3, C5, C6 · Depende de: 003, 009.

- **Entrega:** definir voz clara, calorosa e profissional, exemplos por contexto e palavras que exigem explicação, incluindo briefing, curadoria e personalização.
- **Cenários e aceite:** erro não vira piada; mensagem institucional não encobre instrução; leitores pouco familiarizados com marketing conseguem entender o que fazer.

### Etapa 012 Organizar termos e chamadas para ação

P1 · Conteúdo e Design · C3, C4 · Depende de: 011.

- **Entrega:** inventariar rótulos de seleção, orçamento, compartilhamento, conta e contato, distinguindo adicionar, salvar, enviar e solicitar.
- **Cenários e aceite:** botão não sugere compra imediata nem salvamento em conta quando só altera estado local; ações iguais mantêm nomes consistentes em desktop e celular.

### Etapa 013 Aplicar a marca sem atrapalhar tarefas

P2 · Design e Conteúdo · C5 · Depende de: 001, 011.

- **Entrega:** propor uso contextual das quatro frases e da assinatura Gift Lovers aprovada, reaproveitando os componentes disponíveis após conciliar os PRs.
- **Cenários e aceite:** assinatura não vira segundo botão, cadastro ou promessa de clube; títulos funcionais continuam identificáveis e a marca institucional mantém precedência.

### Etapa 014 Projetar hierarquia e leitura confortável

P1 · Design e Acessibilidade · C3, C8 · Depende de: 012, 013.

- **Entrega:** especificar hierarquia, largura de leitura, espaçamentos, bordas, foco, contraste e uso limitado de cores fortes, preservando os tokens da marca.
- **Cenários e aceite:** textos longos, chips quebrados e zoom não unem cards indevidamente, ocultam CTAs ou sobrepõem imagens; requisitos serão medidos nas etapas 091–093.

### Etapa 015 Definir regras para fotos e movimento

P2 · Design e Conteúdo · C5, C8 · Depende de: 007, 014.

- **Entrega:** especificar fotos reais autorizadas, alternativas sem imagem e movimento reduzido, evitando usar efeitos como informação essencial.
- **Cenários e aceite:** ornamentos nunca cobrem o produto; imagem indisponível tem tratamento claro; redução de movimento mantém todo conteúdo e nenhuma pessoa ou case é inventado.

### Etapa 016 Desenhar a home orientada a intenções

P1 · Design · C1, C3 · Depende de: 005, 012, 014.

- **Entrega:** criar mockups em imagens para desktop e celular com objetivos de campanha, busca direta, acesso ao briefing e próximo passo principal.
- **Cenários e aceite:** caminhos atendem tanto visitante decidido quanto indeciso; imagens são rotuladas como proposta e produzidas fora do código da aplicação.

### Etapa 017 Desenhar escuta e revisão do briefing

P1 · Design · C2, C4 · Depende de: 005, 014, 016.

- **Entrega:** criar mockups do resumo editável, etapas opcionais, retorno ao catálogo e conflito entre campanha nova e seleção existente.
- **Cenários e aceite:** mostrar respostas parciais, nenhuma resposta, edição e remoção; distinguir intenção declarada de filtro realmente aplicado, em desktop e celular.

### Etapa 018 Desenhar apoio à decisão

P1 · Design · C3, C4 · Depende de: 014, 017.

- **Entrega:** propor em imagens evolução do catálogo, ficha, comparação, seleção, compartilhamento e estados sem dados, respeitando a ficha já aprovada.
- **Cenários e aceite:** demonstrar produto com muitos materiais, título longo, sem imagem e sem medida; preservar separações, alinhamento e prioridade da foto.

### Etapa 019 Desenhar formulários e retorno honesto

P1 · Design e Conteúdo · C5, C6, C7 · Depende de: 008, 014, 018.

- **Entrega:** produzir imagens para preenchimento, correção, espera, falha, recebimento confirmado, e-mail apenas preparado e consulta ao histórico.
- **Cenários e aceite:** todos os estados têm próximo passo compatível; feedback não depende somente de cor e a proposta mostra telas pequenas e teclado virtual.

### Etapa 020 Obter aprovação visual rastreável

P1 · Responsável pelo produto e Design · C4 · Depende de: 016, 017, 018, 019.

- **Entrega:** apresentar imagens, decisões, limitações e escopo de cada lote; registrar aprovação explícita por versão, página e viewport.
- **Cenários e aceite:** ausência de resposta não é aprovação; texto do plano não substitui imagem; mudanças relevantes posteriores voltam a este marco antes de código visual.

## Bloco 3 Entrada acolhedora e descoberta por intenção

### Etapa 021 Implementar a abertura centrada na campanha

P1 · Frontend e Conteúdo · C1, C3 · Depende de: 020.

- **Entrega:** ajustar a abertura da home conforme proposta aprovada, mostrando benefício concreto, ação principal e acesso direto ao catálogo.
- **Cenários e aceite:** sem JavaScript carregado por completo ou com título em várias linhas, a mensagem continua compreensível; não introduzir prazo, preço ou resultado garantido.

### Etapa 022 Implementar entradas por objetivo

P2 · Frontend e Produto · C1, C3 · Depende de: 021.

- **Entrega:** conectar entradas como boas-vindas, eventos e relacionamento aos presets existentes, com rótulos claros e informação sobre a seleção resultante.
- **Cenários e aceite:** cada entrada gera contexto válido, respeita voltar/avançar e funciona por teclado; não criar coleção vazia ou classificação comercial sem dados aprovados.

### Etapa 023 Oferecer um caminho para quem ainda não sabe

P1 · Frontend e Conteúdo · C2, C4 · Depende de: 021.

- **Entrega:** disponibilizar o caminho aprovado “Ainda não sei o que escolher”, levando ao briefing opcional ou contato existente, sem barreira de cadastro.
- **Cenários e aceite:** visitante sem produto, verba ou data consegue explorar; a opção não abre formulário invasivo nem obriga a responder todas as perguntas.

### Etapa 024 Preservar a busca direta como atalho

P1 · Frontend e QA · C3, C4 · Depende de: 021.

- **Entrega:** manter busca por nome, código e sinônimos acessível a quem já sabe o que procura, com sugestões orientativas.
- **Cenários e aceite:** tecla Enter, acentos, busca sem resultado e retorno ao resultado funcionam; o novo percurso por intenção não acrescenta etapas obrigatórias à busca atual.

### Etapa 025 Explicar o processo de orçamento

P1 · Conteúdo e Frontend · C3, C7 · Depende de: 008, 021.

- **Entrega:** revisar a explicação existente de explorar, selecionar, enviar e alinhar detalhes, informando onde atua nosso time de especialistas.
- **Cenários e aceite:** distinguir solicitação de proposta pronta, ausência de pagamento online e confirmação comercial posterior; usuário identifica o que acontece depois de clicar.

### Etapa 026 Integrar as frases de marca ao contexto

P2 · Conteúdo e Frontend · C1, C5 · Depende de: 013, 021.

- **Entrega:** posicionar as frases aprovadas nos momentos definidos em mockup, ligando “Entender para atender” à escuta e mantendo Gift Lovers como assinatura.
- **Cenários e aceite:** nenhuma frase desaparece por substituição acidental; não repetir slogans em cada card ou erro; testar legibilidade sem carregar fontes externas novas sem necessidade.

### Etapa 027 Organizar navegação e rodapé por tarefa

P2 · Frontend e Design · C3, C4 · Depende de: 012, 020, 025.

- **Entrega:** ajustar apenas a navegação aprovada, preservando busca, seleção, conta, contato, biblioteca, calendário, kits e Tendências.
- **Cenários e aceite:** menu móvel, retorno do foco, largura intermediária e nomes longos não escondem destinos; links institucionais e de privacidade continuam alcançáveis.

### Etapa 028 Planejar e publicar prova social verdadeira

P2 · Conteúdo e Produto · C3, C5, C8 · Depende de: 007, 015, 020.

- **Entrega:** associar cada case ou depoimento proposto a material aprovado, autorização, contexto e revisão; publicar somente após identificar esses insumos.
- **Cenários e aceite:** sem insumo, manter estado explicitamente bloqueado ou dispensado por decisão; nunca preencher o espaço com nomes, números ou elogios fictícios.

### Etapa 029 Conectar a biblioteca de catálogos à intenção

P2 · Frontend e Conteúdo · C1, C3 · Depende de: 022, 027.

- **Entrega:** contextualizar catálogos existentes por uso e ajudar a voltar à seleção, preservando governança de validade e distinção entre PDF e catálogo online.
- **Cenários e aceite:** arquivo ausente, link externo, PDF desatualizado e retorno ao site têm orientação clara; baixar material não exige fornecer contato sem decisão explícita posterior.

### Etapa 030 Conectar datas comemorativas ao planejamento

P2 · Frontend e Conteúdo · C1, C3, C7 · Depende de: 022, 027.

- **Entrega:** aproveitar o contexto de ocasião existente para iniciar campanha por público e intenção, distinguindo data do evento e recebimento desejado.
- **Cenários e aceite:** data passada, mudança de ano e evento próximo não geram falsa garantia de entrega; favoritos e exportação existentes permanecem funcionais.

## Bloco 4 Escuta e continuidade do briefing

### Etapa 031 Revisar o entendimento das quatro perguntas

P1 · Conteúdo e Frontend · C1, C2 · Depende de: 020, 023.

- **Entrega:** refinar momento, público, escala e clima em CampaignFinder, mantendo explicações breves e respostas opcionais.
- **Cenários e aceite:** pessoa sem experiência entende as opções; “sustentável” expressa intenção e não certifica produtos; perguntas não induzem opção mais cara nem presumem valores pessoais.

### Etapa 032 Tratar a ausência de respostas sem bloquear

P1 · Frontend e QA · C4, C6 · Depende de: 031.

- **Entrega:** manter saltos individuais e oferecer saída explícita para o catálogo completo quando nenhuma resposta estiver selecionada.
- **Cenários e aceite:** zero, uma e quatro respostas produzem caminhos válidos; botão desabilitado não é a única orientação e não são criadas respostas padrão silenciosas.

### Etapa 033 Tornar avanço e progresso previsíveis

P1 · Frontend e Acessibilidade · C2, C4 · Depende de: 031, 032.

- **Entrega:** ajustar o avanço automático atual conforme mockup e teste, mantendo estado, foco e anúncio de progresso coerentes; usar avanço explícito se necessário.
- **Cenários e aceite:** teclado, leitor de tela, toque duplo e retorno à pergunta anterior não pulam respostas ou provocam mudança de contexto inesperada.

### Etapa 034 Apresentar o resumo do entendimento

P1 · Frontend e Conteúdo · C2, C5 · Depende de: 033.

- **Entrega:** mostrar “O que entendemos da sua campanha” a partir das respostas válidas, reaproveitando os rótulos e normalizadores existentes.
- **Cenários e aceite:** campos omitidos não são inferidos; exemplo “Evento · Colaboradores · 51–200 pessoas” corresponde exatamente ao estado, sem tratar faixa de público como quantidade de compra confirmada.

### Etapa 035 Permitir revisão pontual do resumo

P1 · Frontend e QA · C2, C4 · Depende de: 034.

- **Entrega:** habilitar edição e remoção de cada resposta sem apagar as outras, com retorno ao resumo e foco no controle acionado.
- **Cenários e aceite:** trocar público não redefine momento; cancelar edição preserva valores anteriores; remover a última resposta oferece catálogo completo sem resumo vazio enganoso.

### Etapa 036 Separar intenção de filtros efetivos

P1 · Frontend e Produto · C2, C7 · Depende de: 035.

- **Entrega:** explicitar quais respostas geraram filtros comprováveis e quais apenas acompanham a análise humana, reutilizando campaignPresets e useCatalogPageState.
- **Cenários e aceite:** “premium” ou “afetivo” não aparecem como compatibilidade garantida; escala não elimina produtos de mínimo desconhecido; critérios exibidos correspondem à consulta real.

### Etapa 037 Manter o contexto na navegação

P1 · Frontend e QA · C2, C4 · Depende de: 036.

- **Entrega:** revisar transições briefing → catálogo → produto → seleção, precedência entre URL e estado local, retorno do navegador e links diretos.
- **Cenários e aceite:** abrir outra aba ou recarregar não mistura silenciosamente campanhas; valores de URL inválidos são ignorados com comportamento seguro e dados pessoais não são colocados na URL.

### Etapa 038 Resolver mudanças de campanha conscientemente

P1 · Frontend e Produto · C2, C4 · Depende de: 037.

- **Entrega:** definir e implementar a decisão aprovada quando uma nova intenção encontra seleção já preenchida, oferecendo manter, substituir contexto ou cancelar sem perda dos itens.
- **Cenários e aceite:** briefing de aniversário não herda contexto de evento anterior; remover todos os filtros não mantém descrição contraditória no orçamento; o efeito das opções é claro.

### Etapa 039 Unificar o contexto apresentado no orçamento

P1 · Frontend e QA · C2, C3 · Depende de: 035, 037, 038.

- **Entrega:** evoluir o resumo já existente em QuotePage para conferir e ajustar contexto, mantendo compatibilidade entre CampaignBrief e QuoteBriefingDetails.
- **Cenários e aceite:** ocasião, escala e nome da ação chegam sem duplicação ou conflito; alteração é refletida no payload real e não somente no texto da tela.

### Etapa 040 Verificar compatibilidade e descarte do contexto

P1 · Engenharia e QA · C2, C8 · Depende de: 039.

- **Entrega:** testar persistência existente, versão antiga do carrinho, dados corrompidos, bloqueio de storage, descarte explícito e reset de dados pessoais.
- **Cenários e aceite:** estado incompatível tem recuperação previsível; trocar de identidade não expõe contexto privado de outra pessoa; não ampliar retenção ou criar sincronização remota implicitamente.

## Bloco 5 Catálogo que orienta sem pressionar

### Etapa 041 Explicar a seleção exibida

P1 · Frontend e Conteúdo · C2, C3, C7 · Depende de: 020, 036.

- **Entrega:** aprimorar o contexto existente no catálogo com explicação curta baseada nos filtros realmente aplicados e acesso à revisão.
- **Cenários e aceite:** visitante entende por que chegou ali; filtros insuficientes não geram afirmação de curadoria individual ou promessa de inteligência artificial que não existe.

### Etapa 042 Garantir reversibilidade dos filtros

P1 · Frontend e QA · C4 · Depende de: 038, 041.

- **Entrega:** revisar chips, remover filtro e limpar todos, mantendo distinção entre seleção explícita e sinal derivado do briefing.
- **Cenários e aceite:** remover “clima” elimina somente seus efeitos; voltar restaura URL e resultados; contagem, resumo e filtros não mostram versões conflitantes após resposta de rede atrasada.

### Etapa 043 Orientar buscas sem correspondência

P1 · Conteúdo e Frontend · C3, C6 · Depende de: 024, 041.

- **Entrega:** reaproveitar sinônimos e sugestões existentes para oferecer termos alternativos ou revisão de filtros, sempre com escolha do visitante.
- **Cenários e aceite:** erro de digitação, SKU exato e nome desconhecido são distintos; correção não substitui a busca silenciosamente e sugestão não aparece como produto encontrado.

### Etapa 044 Diferenciar catálogo vazio de falha

P1 · Frontend e QA · C6, C7 · Depende de: 043.

- **Entrega:** revisar estados de carregamento, nenhum resultado, falha de consulta e nova tentativa, preservando os filtros digitados.
- **Cenários e aceite:** timeout nunca diz “não temos produtos”; botão de recuperação executa a ação indicada; repetição não causa chamadas ilimitadas nem esconde erro persistente.

### Etapa 045 Manter cards claros e honestos

P1 · Frontend e Conteúdo · C3, C7 · Depende de: 007, 020, 041.

- **Entrega:** revisar título, categoria, código, mínimo, cores e CTA preservando badge único e foto limpa; priorizar informação útil à escolha.
- **Cenários e aceite:** mínimo desconhecido aparece como “a confirmar”, não zero; título longo e múltiplas cores não quebram layout; não exibir urgência por estoque incerto.

### Etapa 046 Testar explicações de compatibilidade

P2 · Produto e Engenharia · C3, C7 · Depende de: 036, 045.

- **Entrega:** criar regras determinísticas e revisadas para apresentar uma razão curta de adequação, apenas quando houver vínculo verificável entre atributo e intenção.
- **Cenários e aceite:** ausência de evidência omite a razão; preferências não viram prova de adequação; não acrescentar mais um badge ou serviço de IA para preencher o card.

### Etapa 047 Preservar transparência da ordenação

P1 · Frontend e Produto · C3, C4, C7 · Depende de: 041, 046.

- **Entrega:** revisar os nomes das ordenações e a descrição de Curadoria Promo sem alegar ranking global quando a lógica atua em resultados paginados.
- **Cenários e aceite:** página seguinte e mudança de filtro não contradizem o critério anunciado; nenhuma posição é apresentada como recomendação humana individual ou publicidade sem fundamento.

### Etapa 048 Evoluir a comparação existente

P2 · Frontend e Design · C3, C4 · Depende de: 045, 047.

- **Entrega:** aprimorar a comparação de até três itens com atributos úteis, rótulos consistentes e remoção simples, sem transformar ausência de dado em desvantagem.
- **Cenários e aceite:** três produtos de categorias diferentes, campo ausente e tela pequena mantêm leitura compreensível; selecionar o quarto explica o limite e preserva os anteriores.

### Etapa 049 Aproximar a ajuda do momento de dúvida

P2 · Conteúdo e Frontend · C2, C3 · Depende de: 007, 045.

- **Entrega:** revisar ContextualFaq para responder mínimos, personalização, orçamento e confirmação de disponibilidade onde a dúvida surge.
- **Cenários e aceite:** respostas não prometem amostra, prazo ou técnica sem aprovação; acordeões operam por teclado e não abrem obrigatoriamente durante a escolha.

### Etapa 050 Validar o catálogo completo com sinais incertos

P1 · Engenharia e QA · C1, C7 · Depende de: 042, 044, 045, 046, 047, 048, 049.

- **Entrega:** consolidar testes de catálogo com estoque zero, mínimo ausente, imagem quebrada, categoria indisponível e metadados contraditórios.
- **Cenários e aceite:** produtos não são ocultados apenas por estoque; filtros não inventam capacidades; recuperação e comparação funcionam sem remover as salvaguardas existentes.

## Bloco 6 Produto e apoio à decisão

### Etapa 051 Conciliar a ficha com o desenho aprovado

P1 · Design e Frontend · C3, C4 · Depende de: 001, 018, 020.

- **Entrega:** confirmar o estado do PR 91 e a última aprovação da ficha antes de tocar em ProductPage, preservando o arranjo aprovado de proposta e informações.
- **Cenários e aceite:** nenhuma variante antiga de mockup substitui a aprovada; alturas, bordas, respiro e leitura longa são tratados sem impor altura fixa que corte conteúdo.

### Etapa 052 Garantir observação confortável do produto

P1 · Frontend e QA · C3, C8 · Depende de: 015, 051.

- **Entrega:** preservar foto desobstruída, controles da galeria, miniaturas, ampliação e orientação de posição, com nomes acessíveis.
- **Cenários e aceite:** imagem ausente, foto vertical, múltiplos ângulos, toque e teclado não deslocam controles sobre detalhes importantes; ampliar devolve o foco ao fechar.

### Etapa 053 Reorganizar a apresentação inicial

P2 · Conteúdo e Frontend · C3 · Depende de: 007, 051.

- **Entrega:** apresentar resumo factual curto, especificações relevantes e expansão da descrição longa, mantendo conteúdo completo acessível.
- **Cenários e aceite:** título extenso, descrição em formato inesperado e conteúdo ausente não exibem sintaxe bruta nem repetição; não reescrever dados do fornecedor com alegações inventadas.

### Etapa 054 Explicar aplicações com evidência

P2 · Conteúdo e Engenharia · C1, C3, C7 · Depende de: 046, 053.

- **Entrega:** apresentar a seção aprovada de ideias de uso com base em atributos confirmados e contexto declarado, sem alterar características do produto.
- **Cenários e aceite:** amplificador só é descrito como sem bateria se houver fonte; uso em mesa pode ser sugestão editorial identificada, não garantia de resultado da campanha.

### Etapa 055 Comunicar limites sem desvalorizar a escolha

P1 · Conteúdo e Frontend · C6, C7 · Depende de: 007, 053.

- **Entrega:** esclarecer que cores, gravação, embalagem e prazo serão confirmados, junto ao ponto relevante, sem banner alarmista genérico.
- **Cenários e aceite:** disponibilidade incerta não desabilita indevidamente a solicitação; dado conhecido permanece visível e informação ausente não é apresentada como defeito do cliente ou do produto.

### Etapa 056 Respeitar a preferência de cor

P1 · Frontend e QA · C4, C8 · Depende de: 051, 055.

- **Entrega:** revisar identificação de cor, opção “A definir” e comunicação de preferência, mantendo seleção inequívoca sem depender só da amostra colorida.
- **Cenários e aceite:** nome longo, uma cor, nenhuma cor e variante indisponível mantêm comportamento correto; a escolha não é tratada como reserva de estoque.

### Etapa 057 Apoiar a estimativa de quantidade

P1 · Frontend e QA · C3, C6, C7 · Depende de: 055, 056.

- **Entrega:** manter campo e controles acessíveis, limites reais e distinção entre público estimado, quantidade desejada e mínimo confirmado.
- **Cenários e aceite:** colagem, zero, valor negativo, quantidade extrema e mínimo desconhecido têm orientação específica; nenhum número comercial é criado para liberar o formulário.

### Etapa 058 Dar retorno claro ao adicionar

P1 · Frontend e Conteúdo · C4, C5 · Depende de: 057.

- **Entrega:** confirmar produto, cor e quantidade adicionados e oferecer continuar ou revisar seleção, respeitando deduplicação e limites já existentes.
- **Cenários e aceite:** clique duplo não duplica intenção; limite atingido não finge sucesso; feedback é anunciado sem roubar foco ou bloquear a visualização com modal desnecessário.

### Etapa 059 Inventariar fontes para fichas e documentos

P1 · Frontend e QA · C3, C7 · Depende de: 007, 053.

- **Entrega:** identificar se há fonte aprovada para fichas técnicas ou documentos de produto e, antes de expor qualquer link, definir contrato de dados, propriedade responsável, autorização, formato e política de indisponibilidade. Na ausência dessa fonte, manter o recurso omitido e registrar a dependência externa.
- **Cenários e aceite:** fonte ausente, URL quebrada, resposta HTML no lugar de PDF, documento privado e arquivo indisponível não geram link falso; só depois de uma origem aprovada o teste valida abertura ou download sem contornar permissões.

### Etapa 060 Compartilhar produto com contexto apropriado

P2 · Frontend e Conteúdo · C3, C8 · Depende de: 054, 059.

- **Entrega:** revisar “Mandar para o time” para compartilhar título e URL pública correta, com alternativa de copiar e feedback correspondente ao resultado.
- **Cenários e aceite:** cancelamento do compartilhamento não aparece como envio concluído; clipboard negado é tratado; não incluir nome, verba ou anotações privadas automaticamente.

## Bloco 7 Seleção colaborativa e autonomia

### Etapa 061 Consolidar o resumo da seleção

P1 · Frontend e Conteúdo · C2, C3 · Depende de: 039, 058.

- **Entrega:** combinar itens, quantidades, variantes e contexto revisável na seleção, com próximos passos claros e aproveitamento de QuoteDrawer e QuotePage.
- **Cenários e aceite:** contagem de produtos não é confundida com soma de unidades; duplicação por cor segue contrato existente; não exibir total de compra fictício.

### Etapa 062 Facilitar editar e desfazer

P1 · Frontend e QA · C4, C6 · Depende de: 061.

- **Entrega:** revisar alteração de quantidade, remoção, limpar seleção e desfazer já disponíveis, preservando consistência entre drawer e página.
- **Cenários e aceite:** limpar acidentalmente, desfazer após outra edição e item removido do catálogo não apagam trabalho novo; ações destrutivas explicam seu alcance.

### Etapa 063 Dar utilidade ao nome da ação

P2 · Frontend e Conteúdo · C1, C5, C8 · Depende de: 061.

- **Entrega:** aproveitar o nome opcional da ação para identificação no briefing e nas seleções salvas, sem obrigar nome antes de explorar.
- **Cenários e aceite:** título vazio recebe rótulo neutro; texto longo ou contendo marca privada não é enviado ao analytics, URL pública ou compartilhamento sem escolha consciente.

### Etapa 064 Diferenciar referências e alternativas

P2 · Frontend e Produto · C3, C4 · Depende de: 048, 061.

- **Entrega:** revisar a capacidade existente e sua flag para indicar referências principais e alternativas, explicando que comparação não significa compra de todos os itens.
- **Cenários e aceite:** flag desligada não deixa controles órfãos; envio preserva a intenção; critérios de somatória são explícitos e não confundem opções com componentes de kit.

### Etapa 065 Explicar o alcance de salvar e retomar

P1 · Frontend e Conteúdo · C2, C7, C8 · Depende de: 040, 063.

- **Entrega:** distinguir seleção local, rascunho na aba e campanha salva na conta, com opção de continuidade correspondente às capacidades existentes.
- **Cenários e aceite:** visitante sem login não recebe promessa de acesso em outro dispositivo; storage bloqueado não exibe “salvo”; troca de usuário respeita isolamento e limpeza.

### Etapa 066 Preparar uma apresentação útil ao gestor

P2 · Frontend e Conteúdo · C3, C4 · Depende de: 061, 063, 064.

- **Entrega:** evoluir impressão e resumo compartilhável existentes para mostrar objetivo, referências e especificações relevantes, com revisão antes de compartilhar.
- **Cenários e aceite:** 1 e 50 itens, título longo, imagem falha e quebras de página não perdem informação; documentos distinguem seleção para cotação de proposta comercial aprovada.

### Etapa 067 Explicar a composição de kits

P1 · Frontend e Conteúdo · C2, C3, C7 · Depende de: 055, 057, 061.

- **Entrega:** tornar clara a relação entre quantidade de kits, componentes e embalagem, usando regras já aprovadas e diferenciação de alternativas.
- **Cenários e aceite:** componente ausente, múltiplo desconhecido e embalagem opcional não produzem composição comercial inventada; confirmação final continua com nosso time de especialistas.

### Etapa 068 Tornar o compartilhamento consciente

P1 · Frontend e Segurança · C4, C8 · Depende de: 063, 066.

- **Entrega:** revisar criação de link, conteúdo exposto, expiração e revogação conforme capacidade atual, apresentando claramente o alcance de acesso.
- **Cenários e aceite:** link público não leva contato ou observação privada; revogado/expirado não revela seleção; falha de cópia não cria falsa confirmação nem exige tornar recursos privados públicos.

### Etapa 069 Respeitar a seleção de quem recebe

P1 · Frontend e QA · C4, C6 · Depende de: 068.

- **Entrega:** revisar importação de seleção compartilhada com confirmação antes de substituir itens existentes e informação sobre produtos que mudaram.
- **Cenários e aceite:** seleção já cheia, limite excedido, item removido ou variante desconhecida têm resolução explícita; compartilhar não altera automaticamente a seleção de outra pessoa.

### Etapa 070 Preservar atribuição e histórico de decisões

P1 · Engenharia e QA · C2, C4, C8 · Depende de: 062, 065, 067, 069.

- **Entrega:** validar salvar, reabrir, editar e compartilhar campanha sem presumir colaboração simultânea ou sincronização em segundo plano inexistente.
- **Cenários e aceite:** duas abas e versões concorrentes não sobrescrevem silenciosamente a escolha; campos revisados continuam coerentes no orçamento e alterações não atingem pedidos já enviados.

## Bloco 8 Formulários que escutam e protegem o esforço

### Etapa 071 Reduzir repetição entre contato e orçamento

P1 · Produto e Frontend · C2, C8 · Depende de: 039, 061.

- **Entrega:** inventariar dados já fornecidos no briefing, seleção e sessão para evitar novas perguntas, usando preenchimento somente quando a origem for confiável e editável.
- **Cenários e aceite:** informação incompleta, desatualizada ou de outra identidade não é copiada; o visitante pode corrigir qualquer valor e campos voluntários permanecem opcionais.

### Etapa 072 Ordenar campos pela conversa do cliente

P1 · Design, Conteúdo e Frontend · C1, C2 · Depende de: 019, 020, 071.

- **Entrega:** implementar a ordem aprovada que começa pelo contexto necessário e deixa detalhes complementares agrupados, mantendo dados mínimos para retorno e privacidade.
- **Cenários e aceite:** teclado virtual, preenchimento automático e tela pequena seguem ordem lógica; a pessoa entende por que o dado é solicitado antes de enviá-lo.

### Etapa 073 Explicar opcionalidade e finalidade

P1 · Conteúdo e Privacidade · C4, C8 · Depende de: 071, 072.

- **Entrega:** indicar campos obrigatórios, opcionais e a finalidade do canal preferido, anexos e observações, sem transformar preferência em autorização de marketing.
- **Cenários e aceite:** deixar telefone vazio é válido quando permitido; optar por WhatsApp não promete envio automático; privacidade usa linguagem clara e link acessível.

### Etapa 074 Preservar o rascunho com transparência

P1 · Frontend e QA · C6, C7, C8 · Depende de: 040, 072.

- **Entrega:** revisar o rascunho existente de 24 horas na aba, seus avisos, expiração, descarte e comportamento quando sessionStorage falhar.
- **Cenários e aceite:** mensagem de “rascunho salvo” só aparece após gravação real; expiração não deixa dados residuais apresentados como atuais; apagar pede confirmação proporcional e funciona.

### Etapa 075 Prevenir erros antes do envio

P1 · Frontend e Conteúdo · C6 · Depende de: 072, 073.

- **Entrega:** adicionar orientações antecipadas apenas para formatos suscetíveis a erro, limites e dependências entre data, escopo e faixa de investimento.
- **Cenários e aceite:** não validar campo vazio opcional ao perder foco; exemplos não viram dados padrão; data inválida e orçamento incoerente explicam como corrigir sem culpar.

### Etapa 076 Tornar mensagens de campo construtivas

P1 · Conteúdo, Frontend e Acessibilidade · C6 · Depende de: 011, 075.

- **Entrega:** revisar o catálogo de mensagens para indicar problema e solução junto ao campo, com texto, ícone ou semântica além da cor.
- **Cenários e aceite:** e-mail incompleto, telefone sem DDD e arquivo recusado preservam a entrada; foco vai ao primeiro erro no envio sem impedir revisão dos demais.

### Etapa 077 Distinguir aviso de impedimento

P1 · Frontend e Produto · C4, C6, C7 · Depende de: 076.

- **Entrega:** classificar informação, aviso recuperável e erro bloqueante, reservando modal para decisões graves e mantendo ajuda próxima ao contexto.
- **Cenários e aceite:** prazo apertado pode ser levado à análise se essa for a regra comercial; falha de anexo posterior ao orçamento não transforma persistência concluída em envio fracassado duplicável.

### Etapa 078 Proteger contra envio duplicado

P1 · Engenharia e QA · C6, C7 · Depende de: 077.

- **Entrega:** manter bloqueio de duplo clique, idempotência, cancelamento por troca de identidade e diferenciação entre timeout, conflito e limitação de requisições.
- **Cenários e aceite:** resposta tardia, recarregamento, duas abas e retry não criam duas solicitações; o controle volta a ficar utilizável apenas quando a próxima ação é segura.

### Etapa 079 Confirmar apenas o que aconteceu

P1 · Frontend, Backend e Conteúdo · C5, C7 · Depende de: 008, 078.

- **Entrega:** separar estados “recebido com protocolo”, “mensagem de e-mail preparada”, “anexo pendente” e “não foi possível confirmar”, exibindo próximos passos reais.
- **Cenários e aceite:** abrir mailto não diz que a Promo recebeu; ausência de requestId não fabrica protocolo; sucesso do pedido permanece verdadeiro quando somente o vínculo posterior do arquivo falha.

### Etapa 080 Personalizar confirmação com parcimônia

P2 · Conteúdo e Frontend · C5, C8 · Depende de: 079.

- **Entrega:** usar primeiro nome fornecido voluntariamente e quantidade factual da seleção somente na confirmação apropriada, com alternativa neutra.
- **Cenários e aceite:** nome vazio, composto, contendo caracteres inesperados ou sessão trocada não produz saudação invasiva; elogio automático não atribui qualidade à escolha sem análise humana.

## Bloco 9 Continuidade do relacionamento

### Etapa 081 Respeitar o canal preferido

P1 · Produto, Atendimento e Frontend · C2, C8 · Depende de: 008, 073, 079.

- **Entrega:** preservar a preferência no contrato do pedido e explicá-la como orientação ao retorno, mantendo alternativa sem preferência.
- **Cenários e aceite:** canal indisponível não é silenciosamente tratado como envio concluído; mudança de preferência fica auditável; consentimentos comerciais permanecem separados.

### Etapa 082 Planejar cópias por e-mail e WhatsApp

P2 · Produto, Segurança e Atendimento · C5, C7, C8 · Depende de: 008, 079, 081.

- **Entrega:** especificar conteúdo mínimo, consentimento, destinatário, template, retry, opt-out e evidência operacional para futura ativação, sem usar credenciais adiadas.
- **Cenários e aceite:** e-mail rejeitado, número inválido, provedor fora do ar e evento duplicado têm política definida; etapa fica bloqueada até autorização, configuração e teste controlado reais.

### Etapa 083 Tornar a conta um benefício opcional

P1 · Produto e Frontend · C3, C4, C8 · Depende de: 065, 079.

- **Entrega:** explicar que a conta permite acompanhar solicitações e campanhas, oferecendo acesso depois do primeiro pedido sem impedir orçamento anônimo.
- **Cenários e aceite:** visitante recusa cadastro sem perder envio; e-mail divergente exige verificação apropriada; nenhum histórico é associado apenas por texto digitado sem identidade confirmada.

### Etapa 084 Organizar o histórico pela intenção

P2 · Frontend e Conteúdo · C1, C3 · Depende de: 063, 083.

- **Entrega:** revisar listagem e detalhe por nome da ação, protocolo, data e status compreensível, distinguindo retrato enviado de catálogo atual.
- **Cenários e aceite:** solicitação sem nome, produto despublicado e muitos pedidos continuam identificáveis; filtros não expõem dados de outro titular nem perdem estado sem aviso.

### Etapa 085 Explicar a linha do tempo

P1 · Frontend, Backend e Atendimento · C2, C7 · Depende de: 008, 084.

- **Entrega:** apresentar somente estados reais e suas datas, explicando o que foi feito e o próximo passo, sem inventar SLA ou atuação humana.
- **Cenários e aceite:** evento atrasado, fora de ordem ou duplicado não cria história contraditória; status técnico interno é traduzido sem esconder falha relevante.

### Etapa 086 Apoiar pedidos de ajuste

P1 · Frontend e Backend · C2, C4, C6 · Depende de: 078, 084, 085.

- **Entrega:** homologar o fluxo existente sob flag para quantidade, cor, embalagem e contexto, preservando mensagem e vínculo com a solicitação correta.
- **Cenários e aceite:** flag desligada não promete recurso; duplo envio, sessão expirada e falha de rede mantêm texto para retry seguro; sucesso só aparece após persistência confirmada.

### Etapa 087 Permitir repetir sem esconder mudanças

P1 · Frontend e QA · C3, C4, C7 · Depende de: 069, 084.

- **Entrega:** revisar “Solicitar novamente” para restaurar briefing e itens como ponto de partida, informar diferenças do catálogo e exigir revisão antes de novo envio.
- **Cenários e aceite:** item removido, nova variante, quantidade antiga e seleção atual não são substituídos silenciosamente; pedido anterior permanece imutável no histórico.

### Etapa 088 Transformar contato em conversa contextual

P2 · Frontend e Conteúdo · C1, C2 · Depende de: 071, 076, 079.

- **Entrega:** evoluir ConversationForm conforme mockup aprovado, preservando preferência de canal e permitindo contexto opcional da campanha sem duplicar QuotePage.
- **Cenários e aceite:** contato geral não exige seleção; mensagem vazia opcional é válida; sucesso, e-mail preparado e falha usam os mesmos contratos de verdade do orçamento.

### Etapa 089 Admitir incidentes de forma útil

P1 · Conteúdo, Engenharia e Suporte · C6, C7 · Depende de: 044, 077, 079, 085.

- **Entrega:** criar padrões para indisponibilidade, manutenção, falha parcial e erro inesperado, com preservação do trabalho, alternativa segura e identificador técnico sanitizado quando necessário.
- **Cenários e aceite:** erro 404, API fora do ar e falha do provedor não culpam o visitante nem expõem segredo; “tente novamente” só aparece quando retry é apropriado.

### Etapa 090 Fechar o ciclo com feedback opcional

P2 · Pesquisa e Produto · C1, C2, C4 · Depende de: 079, 084.

- **Entrega:** propor uma pergunta curta e opcional sobre clareza da escolha ou do envio, com alternativa de comentário voluntário fora da telemetria ampla.
- **Cenários e aceite:** recusar não altera atendimento; não coletar texto livre em analytics; amostra e viés ficam documentados e feedback não vira depoimento público sem consentimento específico.

## Bloco 10 Qualidade, medição e encerramento

### Etapa 091 Criar contratos unitários permanentes

P1 · QA e Engenharia · C2, C6, C7 · Depende de: 031–090 conforme o lote.

- **Entrega:** acrescentar testes para normalização, resumo editável, precedência de contexto, mensagens, rascunho, idempotência, confirmação e redaction, testando comportamento e não detalhes cosméticos.
- **Cenários e aceite:** fixtures cobrem vazio, inválido, limite, concorrência e recuperação; teste falha ao reintroduzir promessa falsa, perda de dados ou vazamento de propriedade analítica.

### Etapa 092 Certificar jornadas ponta a ponta

P1 · QA · C1–C8 · Depende de: 050, 060, 070, 080, 090, 091.

- **Entrega:** testar a jornada anônima home → briefing → catálogo → produto → seleção → orçamento → confirmação e oferta opcional de conta; testar separadamente a jornada autenticada até histórico, além de busca direta, compartilhamento e repetição.
- **Cenários e aceite:** desktop e celular, visitante anônimo até a confirmação, pessoa autenticada até o histórico, rede lenta, resposta tardia e storage bloqueado concluem ou recuperam a etapa autorizada sem sucesso falso; o cenário anônimo nunca pressupõe associação ao histórico sem identidade verificada.

### Etapa 093 Validar acessibilidade assistiva

P1 · Acessibilidade e QA · C4, C6, C8 · Depende de: 092.

- **Entrega:** combinar verificação automática com teclado, zoom, movimento reduzido, contraste, leitores de tela e dispositivos físicos quando disponíveis.
- **Cenários e aceite:** foco, anúncio de progresso, erros, modais, galerias e drawers são compreensíveis; ausência de ensaio humano ou aparelho real permanece limitação explícita, não aprovação presumida.

### Etapa 094 Validar responsividade e fidelidade visual

P1 · Design e QA · C3, C8 · Depende de: 020, 092, 093.

- **Entrega:** comparar capturas reais aos mockups aprovados em 320, 390, 768, 1024 e 1440 px, nos navegadores configurados, documentando diferenças intencionais.
- **Cenários e aceite:** texto ampliado, teclado virtual, chips longos, imagens e cards não se fundem, cortam ou sobrepõem; qualquer desvio relevante volta para aprovação visual.

### Etapa 095 Instrumentar com privacidade

P1 · Dados, Privacidade e Engenharia · C2, C8 · Depende de: 010, 090, 091.

- **Entrega:** adicionar apenas eventos necessários às hipóteses aprovadas, com nomes enumerados, propriedades permitidas e caminhos sanitizados seguindo analytics.ts.
- **Cenários e aceite:** nomes, e-mails, empresas, mensagens, orçamento e URLs privadas não saem na telemetria; analytics ausente ou bloqueado nunca impede a tarefa.

### Etapa 096 Proteger desempenho e estabilidade após instrumentação

P1 · Engenharia e QA · C3, C6 · Depende de: 092, 094, 095.

- **Entrega:** depois dos eventos aprovados estarem presentes, executar lint, TypeScript, unitários, build, orçamento de assets, E2E e cross-browser; medir o impacto final de fontes, imagens e instrumentação antes da publicação.
- **Cenários e aceite:** conexão lenta e dispositivo intermediário mantêm conteúdo essencial; não reduzir qualidade de foto nem desabilitar gate para fazer o lote passar; regressão ganha correção ou rollback, e qualquer alteração posterior de telemetria exige repetir os checks afetados.

### Etapa 097 Avaliar entendimento e esforço

P2 · Pesquisa e Produto · C1, C2 · Depende de: 006, 010, 092, 095, 096.

- **Entrega:** conduzir tarefas moderadas e não moderadas, comparar linha de base e registrar evidência, falhas e diferenças entre perfis sem generalização excessiva.
- **Cenários e aceite:** observar entendimento do orçamento, edição do resumo e recuperação de erro; participantes não são conduzidos à resposta e pequenas amostras são descritas como sinais qualitativos.

### Etapa 098 Fazer piloto operacional controlado

P1 · Atendimento, Produto e QA · C2, C7, C8 · Depende de: 008, 079, 085, 092, 096.

- **Entrega:** executar solicitações sintéticas autorizadas do início ao atendimento, verificando protocolo, contexto, titularidade, anexos e próximo passo sem contatar pessoas reais indevidamente.
- **Cenários e aceite:** horário sem atendimento, anexo pendente, canal indisponível e ajuste posterior ficam reproduzíveis; logs e evidências são sanitizados e removidos conforme política.

### Etapa 099 Publicar por lotes reversíveis

P1 · DevOps, Produto e Engenharia · C7 · Depende de: 093, 094, 096, 098.

- **Entrega:** preparar PRs pequenos, evidências, plano de rollback e flags quando adequadas; publicar pelo fluxo vigente somente após reviews e checks obrigatórios.
- **Cenários e aceite:** branch concorrente, PR 91/92 ainda aberto, falha de release e deployment de SHA divergente bloqueiam promoção; nenhum merge forçado ou proteção reduzida para concluir o plano.

### Etapa 100 Encerrar com evidência e aprendizado

P1 · Produto, QA e Responsável pelo aceite · C1–C8 · Depende de: 001–099.

- **Entrega:** atualizar matriz de requisitos e documentação com estado de cada etapa, SHAs, ambientes, testes, pesquisa, publicação, bloqueios, decisões e riscos residuais.
- **Cenários e aceite:** nenhuma etapa é concluída somente por existir código, mockup ou CI verde; usuário responsável homologa os resultados visuais e operacionais; pendências externas continuam nomeadas e nenhum percentual “10/10” substitui evidência.

## Cenários transversais para simulação antes de cada lote

1. Visitante sem saber o produto e visitante que chega por SKU devem alcançar orçamento sem caminhos artificiais.
2. Zero, uma e quatro respostas do briefing devem gerar estados coerentes e totalmente editáveis.
3. Uma nova campanha não pode substituir silenciosamente itens, contexto ou rascunho existentes.
4. Estoque zero, mínimo desconhecido, ausência de preço e imagem quebrada não podem produzir promessa falsa nem impedir consulta válida.
5. Link direto, voltar/avançar, recarregar e duas abas não podem misturar pessoas ou perder trabalho sem aviso.
6. Rede lenta, timeout, resposta tardia, limitação de requisições e retry devem preservar idempotência e distinguir incerteza de sucesso.
7. “E-mail preparado”, “pedido persistido”, “anexo vinculado” e “cópia entregue” são fatos diferentes e devem permanecer separados.
8. Erros precisam preservar entradas e orientar recuperação por texto e semântica, inclusive com leitor de tela.
9. Compartilhamento e analytics não podem carregar dados pessoais, briefing privado, tokens ou URLs protegidas.
10. Layout deve suportar zoom, 320–1440 px, títulos longos, chips múltiplos, teclado virtual, movimento reduzido e ausência de imagem.
11. Conta e histórico devem respeitar identidade confirmada; primeiro pedido continua possível sem cadastro obrigatório.
12. Com Resend ou WhatsApp adiados, a interface não pode prometer envio automático; futura ativação exige homologação separada.

## Lotes de implementação propostos

| Lote | Etapas | Resultado verificável | Condição de entrada |
| --- | --- | --- | --- |
| A | 001–020 | Pesquisa, contratos de conteúdo e mockups aprovados | Repositório e baseline identificados; escopo, responsáveis e regra de aprovação visual confirmados. |
| B | 021–040 | Entrada por intenção e briefing revisável | Aprovação visual do lote B. |
| C | 041–060 | Catálogo e produto com justificativas verificáveis | Fontes editoriais inventariadas, estado do PR 91 conhecido e última aprovação visual localizada; a conciliação ocorre na etapa 051. |
| D | 061–080 | Seleção, formulário e confirmação honestos | Contratos de persistência e mensagens aprovados. |
| E | 081–090 | Histórico, ajustes e relacionamento contextual | Capacidades operacionais confirmadas; integrações adiadas não são pré-requisito. |
| F | 091–100 | Testes, pesquisa, piloto, publicação e encerramento | Entregas aplicáveis dos lotes anteriores implementadas e aceitas; etapas formalmente adiadas, dispensadas ou retiradas de escopo têm responsável, justificativa e impacto registrados, sem serem contadas como implementadas. |

## Condições que impedem declarar implementação total

- Falta de aprovação visual explícita para qualquer tela alterada.
- Ausência de pesquisa com usuários quando a etapa exige evidência humana.
- Conteúdo, case, foto, técnica ou alegação comercial sem fonte e autorização identificadas.
- Serviço, canal ou credencial adiado, indisponível ou não homologado.
- Migração necessária sem autorização e fluxo aprovado no Supabase isolado do site.
- PR aberto, conflito, check obrigatório pendente ou deployment de SHA diferente.
- Testes assistivos, operacionais ou de dispositivo real não executados quando o aceite os exige.
- Divergência entre sucesso mostrado ao cliente e persistência ou entrega realmente comprovada.

## Definição de concluído do programa

O programa estará concluído somente quando as 100 etapas tiverem estado e evidência individual, todos os lotes aplicáveis estiverem aprovados, testados, revisados e publicados no ambiente correto, e os bloqueios externos estiverem resolvidos ou formalmente retirados do escopo pelo responsável pelo produto. Qualidade será demonstrada por compreensão, segurança, acessibilidade, recuperação e coerência operacional; “10/10” permanece uma meta de excelência, não um resultado autodeclarado.
