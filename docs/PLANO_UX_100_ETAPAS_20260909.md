# Promo Brindes — plano de evolução da experiência em 100 etapas

Data: 9 de setembro de 2026. Status: **planejamento; não implementado por este documento**.

Base: [auditoria de experiência de marketing](RELATORIO_EXPERIENCIA_MARKETING_GEN_Z_20260909.md), com 36 visitas desktop/mobile, percursos adicionais e evidências locais. Os resultados de autenticação e envio daquela auditoria incluem simulações, não comprovação operacional integral.

## Direção estratégica

Transformar o site de uma vitrine expressiva em um parceiro de planejamento: **descobrir → escolher → organizar → apresentar → solicitar → acompanhar → repetir**. A identidade continua jovem e criativa; a operação deve ser clara, confiável e capaz de lembrar o trabalho da pessoa.

O público prioritário é quem organiza campanhas, eventos e relacionamento com marcas. A geração Z orienta o recrutamento de pesquisa e o posicionamento; não serve como justificativa para presumir preferências idênticas, excesso de gírias ou animação obrigatória.

### Invariantes

- Não alterar o projeto interno Promo Gifts. Nenhuma etapa autoriza escrita no seu repositório ou banco de origem.
- Preservar os limites entre o banco do site (`xlzmclcjdncjfdrjxclt`) e a fonte canônica de produtos (`doufsxqlfjyuvxuezpln`). Propor mudanças de dados do site separadamente; qualquer necessidade na origem exige decisão expressa do responsável.
- Manter o catálogo completo acessível, sem excluir produtos por estoque de fornecedor. Não confundir ordenação editorial com ocultação comercial.
- Não criar checkout, pagamento ou promessa de disponibilidade. A conversão é uma solicitação de orçamento.
- Manter um badge de imagem por card; a regra de novidade/kit prevalece sobre “Sua marca aqui”, segundo prioridade documentada.
- Preservar as quatro frases aprovadas e usar “nosso time de especialistas” nas referências ao atendimento, com concordância natural.
- Não inventar preços, prazos, certificações ambientais, cases, depoimentos ou números de clientes.
- Não exigir conta para pesquisar, selecionar e solicitar. Login agrega continuidade, não cria uma barreira inicial.
- Propostas de infraestrutura, serviços pagos, novos canais, materiais de clientes e mudanças de schema dependem das aprovações específicas descritas abaixo. Aprovar o plano não equivale a autorizar mensagens a clientes reais.

### Como executar sem retrabalho

Os números são identificadores de entrega, não uma obrigação de desenvolver tudo em cascata. Pesquisa, acessibilidade, segurança e testes dos itens 91–99 começam no primeiro bloco e acompanham cada entrega. Protótipos dos blocos editoriais podem avançar enquanto as correções são verificadas; não devem provocar um redesenho geral antes da estabilização.

Cada item deve ter responsável nominal, tamanho estimado após inspeção técnica, evidência antes/depois, critérios abaixo e registro de decisão. Não há promessa de prazo total sem capacidade do time e dependências externas confirmadas.

Responsabilidades de referência: **UX** (pesquisa/design/conteúdo), **FE** (interface), **BE** (serviços/dados), **QA** (qualidade), **COM** (operação comercial), **PO** (decisão de produto). São funções sugeridas, não agentes já contratados ou acionados.

Prioridades: **P1** corrige bloqueio/perda de trabalho; **P2** melhora decisão/confiança/continuidade; **P3** aprofunda diferenciação. Uma dependência de segurança é obrigatória mesmo quando a funcionalidade associada é P3.

## Bloco 1 — Estabilizar a jornada essencial | etapas 01–10

Responsáveis: FE, BE e QA; validação de UX. Prioridade: P1 e dependências imediatas. Não depende de um novo layout.

### 01. Consolidar a linha de base e a matriz de cobertura

Relacionar cada rota, componente compartilhado e estado importante às evidências da auditoria; identificar versão local/publicada e registrar diferenças antes de mexer. Incluir navegação direta, retorno, vazio, erro, anônimo e autenticado.

**Aceite:** os 15 tipos de rota e os 28 achados UX têm destino no backlog; observação real, simulação e hipótese permanecem distinguidas.

### 02. Definir o contrato de continuidade e as métricas iniciais

Especificar o que deve sobreviver a voltar, recarregar, expirar sessão, trocar campanha e concluir envio. Definir duração do rascunho e estratégia mínima de dados pessoais. Registrar denominadores de conclusão do briefing, erros e recuperação, sem inventar uma taxa atual.

**Aceite:** tabela de estados aprovada e cada perda aceitável explicada ao usuário; métricas distinguem interesse, tentativa e solicitação efetivamente aceita pelo servidor.

### 03. Reproduzir as falhas com testes de contrato

Criar casos para novidades, autocomplete fechado, retorno ao briefing, comparação e contexto da campanha. Consultas de catálogo devem ser exercitadas em leitura contra um contrato realista, não apenas comparadas com strings esperadas iguais ao código defeituoso.

**Aceite:** os testes detectam as regressões conhecidas antes das correções; respostas simuladas não são apresentadas como validação de produção.

### 04. Corrigir a consulta de novidades

Revisar a composição lógica rejeitada pelo serviço, os limites de data e o comportamento sem resultados. Verificar todas as entradas que apontam para novidades: navegação, catálogo e biblioteca.

**Aceite:** nenhuma entrada reproduz HTTP 400/PGRST100; resultados ou vazio legítimo aparecem, sem necessidade presumida de migration na origem.

### 05. Corrigir o autocomplete que encobre atalhos

Eliminar a colisão de estilos que mantém a lista fechada ocupando espaço e recebendo cliques. Tratar abertura, fechamento, ausência de sugestões, foco e seleção por teclado.

**Aceite:** atalhos respondem a mouse/toque; lista fechada não bloqueia nenhum alvo; setas, Enter e Esc funcionam quando há sugestões.

### 06. Substituir erros técnicos por recuperação útil

Diferenciar consulta inválida, instabilidade, falta de conexão e resultado inexistente. Registrar detalhes técnicos de forma sanitizada na observabilidade e oferecer uma saída compatível com a causa.

**Aceite:** nenhuma mensagem mostra SQL, stack ou expressão interna; erros determinísticos não induzem um ciclo inútil de “tentar novamente”.

### 07. Preservar o rascunho do orçamento

Implementar persistência coerente com a etapa 02, preferencialmente restrita à sessão para dados de contato. Cobrir ida ao catálogo, retorno, reload e falha de armazenamento. Limpar após sucesso confirmado, descarte explícito ou expiração definida.

**Aceite:** o cenário “preencher → salvar mais produtos → voltar” mantém campos e seleção; falha no envio nunca limpa o trabalho; dados não reaparecem indevidamente para outra conta.

### 08. Preservar a comparação ao navegar

Retirar a comparação do ciclo de vida exclusivo da página do catálogo. Manter identificadores estáveis, remover itens inexistentes com aviso e respeitar o limite de três.

**Aceite:** abrir uma ficha, voltar e recarregar mantém o conjunto conforme o contrato; adicionar o quarto item oferece explicação clara.

### 09. Transportar o contexto da campanha

Definir uma estrutura compartilhada de momento, público, faixa de quantidade, estilo e data. Levar o contexto do questionário e da agenda ao catálogo e ao briefing sem colocar dados pessoais na URL.

**Aceite:** o cliente revisa um resumo editável; uma faixa de 51–200 pessoas não vira uma quantidade exata assumida; valores digitados não são sobrescritos.

### 10. Aprovar a primeira entrega de estabilização

Reexecutar os cenários de falha em desktop/mobile e em dados controlados representativos. Comparar seleção, briefing e requisições antes/depois; revisar efeitos em catálogo, ficha e contato.

**Aceite:** zero bloqueios P1 reproduzidos na matriz desta entrega, sem perda de trabalho nos percursos essenciais e com evidência anexada. Esta correção pode ser publicada separadamente das expansões.

## Bloco 2 — Tornar a navegação e a linguagem previsíveis | etapas 11–20

Responsáveis: UX e FE, com QA. Prioridade: P2. Depende do inventário e do contrato das etapas 01–02; as regras de componentes orientam os blocos seguintes.

### 11. Reorganizar a arquitetura da informação

Separar descoberta (produtos, coleções e datas), trabalho em andamento (seleção) e relacionamento (orçamentos e atendimento). Evitar destinos redundantes e páginas sem saída.

**Aceite:** cada destino tem propósito e ação principal; testes de localização usam tarefas de comprador, não nomes internos.

### 12. Padronizar os nomes das tarefas

Adotar “Minha seleção”, “Comparar”, “Solicitar orçamento” e “Meus orçamentos” nos controles. Reservar “drop”, “moodboard” e “radar” para contextos editoriais em que não escondam o significado.

**Aceite:** o mesmo objeto recebe o mesmo nome no menu, card, painel, formulário, confirmação e histórico.

### 13. Criar um guia de voz da Promo

Definir voz criativa em descoberta, precisa em especificação e tranquila em erro. Incorporar “nosso time de especialistas” com concordância; reduzir anglicismos onde exigem explicação.

**Aceite:** exemplos de títulos, botões, erros e confirmações aprovados; busca textual não encontra referências antigas ao atendimento que deveriam ter sido substituídas.

### 14. Consolidar o sistema visual

Organizar cores, tipografia, espaçamento, bordas, sombras, estados e camadas em tokens. Preservar o contraste expressivo e melhorar o peso relativo de códigos, medidas e ajuda.

**Aceite:** componentes essenciais compartilham regras; textos auxiliares são legíveis nas telas-alvo, sem diminuir controles para acomodar conteúdo.

### 15. Redesenhar o cabeçalho desktop por tarefa

Priorizar busca, catálogo, seleção e histórico; manter acesso editorial sem competir com todas as ações. Testar comportamento fixo apenas se trouxer benefício real.

**Aceite:** nenhuma faixa fixa encobre conteúdo/foco; o comprador encontra produto e seleção sem explorar vários menus.

### 16. Tornar a busca acessível no celular

Prototipar busca mais direta e identificação compreensível da seleção. Comparar cabeçalho compacto com alternativas sem acumular barras fixas no topo e no rodapé.

**Aceite:** pesquisar e retomar seleção não dependem de reconhecer um ícone ambíguo; teclado virtual e áreas seguras não ocultam ações.

### 17. Unificar painéis, menus e diálogos

Padronizar título, fechar, Esc, bloqueio de rolagem, foco inicial e devolução do foco. Tratar combinação de painéis e atalhos de forma consistente.

**Aceite:** foco não escapa de um diálogo modal; fechar sempre devolve à origem adequada; ações disponíveis não dependem apenas de hover.

### 18. Preservar orientação e posição de navegação

Melhorar breadcrumbs, indicação de filtros, título da página e retorno à lista. Guardar posição de rolagem quando a pessoa inspeciona uma ficha.

**Aceite:** voltar leva ao recorte e produto que estavam sendo avaliados; URLs representam busca/filtros sem carregar informações de contato.

### 19. Unificar páginas de erro e estados vazios

Projetar zero resultados, seleção vazia, conteúdo removido e 404 de marca. Reconciliar rotas diretas na hospedagem sem converter indevidamente qualquer erro em página válida HTTP 200.

**Aceite:** endereços inválidos oferecem busca e navegação; respostas e indexação correspondem ao estado, sem tela técnica genérica da hospedagem.

### 20. Validar a navegação com tarefas curtas

Testar onde buscar novidades, guardar três opções, retomar pedido e pedir ajuda. Usar protótipos antes de refatorações amplas e registrar confusões de vocabulário.

**Aceite:** nenhuma tarefa crítica depende de explicação do moderador; dificuldades recorrentes têm ajuste e nova verificação antes da publicação do bloco.

## Bloco 3 — Demonstrar valor e confiança na home | etapas 21–30

Responsáveis: UX, FE e COM. Prioridade: P2. Depende de navegação/tokens; cases, canais e dados comerciais dependem de material autorizado.

### 21. Reordenar a home pela intenção do comprador

Prototipar a sequência proposta: abertura → busca/entrada guiada → produtos reais → ocasiões/coleções → prova e processo → contato. Ajustar a posição do questionário conforme teste, sem obrigar seu preenchimento.

**Aceite:** a primeira seleção real aparece antes dos longos blocos institucionais; tarefas ficam acessíveis por atalhos e leitura normal.

### 22. Esclarecer a promessa no primeiro bloco

Comunicar brindes personalizados, atendimento consultivo e solicitação sem compra online. Hierarquizar uma ação principal e uma alternativa para quem precisa de orientação.

**Aceite:** em teste de compreensão, o comprador explica o que a Promo oferece, como começar e que não está concluindo uma compra.

### 23. Antecipar produtos que demonstrem repertório

Exibir uma vitrine curta com diversidade de aplicação e imagens reais, vinculada a critérios editoriais verificáveis. Não chamar todo produto de destaque.

**Aceite:** vitrine varia por propósito, tem links funcionais e não oculta o acesso aos demais produtos; seleção editorial tem responsável e revisão prevista.

### 24. Diferenciar entradas por campanha

Criar portas para onboarding, eventos, relacionamento e reconhecimento com propostas específicas. Mostrar exemplos coerentes, sem duplicar o mesmo conjunto sob capas diferentes.

**Aceite:** cada entrada possui um recorte verificável e explica sua finalidade; o contexto acompanha a navegação.

### 25. Dar função às quatro frases da marca

Propor “Conectando Marcas e Pessoas” no posicionamento; “Entender para atender” no briefing; “Excelência em cada detalhe” na personalização; “Encantar pessoas, somos bons nisso!” junto de trabalhos/contato. Validar ritmo e evitar repetições extensas.

**Aceite:** as quatro permanecem localizáveis e contextualizadas, sem esconder produtos ou aumentar desnecessariamente a rolagem.

### 26. Criar um modelo de case comercial real

Estruturar desafio, público, escolha, personalização e resultado documentado. Obter autorização de nomes, fotos e marcas antes de usar; sem material, usar demonstração claramente identificada, nunca depoimento fictício.

**Aceite:** todo case publicado possui origem e permissão registradas; afirmações de resultado têm evidência.

### 27. Explicar o processo em “Como funciona”

Mostrar seleção, briefing, curadoria, proposta, aprovação de arte e coordenação de entrega, conforme a operação real. Esclarecer o papel do cliente em cada etapa.

**Aceite:** o comprador entende que solicitar não aprova automaticamente produção e sabe quando deverá revisar uma proposta ou arte.

### 28. Demonstrar a operação e seus limites

Apresentar identificação comercial, fotos autorizadas, responsáveis de atendimento e informações reais sobre amostras, frete e prazos de produção. Separar prazo de primeiro retorno do prazo de entrega.

**Aceite:** cada afirmação tem dono e fonte; informação desconhecida é marcada como sob consulta, sem contador de urgência inventado.

### 29. Permitir explicar a necessidade no contato

Adicionar mensagem curta opcional e preferência de canal ao formulário. Preservar preenchimento em erro, revisar confirmação e encaminhar o contexto para a operação.

**Aceite:** quem ainda não escolheu produtos consegue contar uma campanha; validações são claras e nenhum campo desaparece ao corrigir outro.

### 30. Conectar rodapé, redes e atendimento oficial

Validar titularidade dos perfis, telefone e eventual WhatsApp comercial; organizar links, identificação e horários. Planejar domínio de marca sem alterar DNS ou contratar serviço nesta fase de planejamento.

**Aceite:** destinos aprovados, rótulos acessíveis e horários reais; não há canal anunciado que ninguém atende.

## Bloco 4 — Fazer busca e filtros entregarem relevância | etapas 31–40

Responsáveis: UX, FE, BE e COM. Prioridade: P2. Depende dos contratos de catálogo; não requer nem autoriza escrita na origem dos produtos.

### 31. Definir uma taxonomia orientada a campanhas

Mapear tipo de produto, ocasião, público, objetivo e atributos confirmados. Distinguir propriedades do cadastro de recomendações editoriais do site.

**Aceite:** cada classificação indica origem e regra; “premium”, “sustentável” e “onboarding” não são tratados como fatos sem critério.

### 32. Refinar os sinônimos por intenção

Preservar equivalências úteis como squeeze/garrafa, mas evitar que onboarding se reduza a qualquer kit. Priorizar correspondência específica antes da expansão ampla.

**Aceite:** um conjunto de consultas documentadas mantém intenção; expansão fica compreensível e não substitui silenciosamente a busca do cliente.

### 33. Recuperar erros simples de digitação

Oferecer sugestões para consultas como “squese”, preservando o texto original e a opção de buscar exatamente o que foi digitado. Evitar correções arriscadas de SKU.

**Aceite:** sugestões plausíveis são acionáveis; códigos exatos não são alterados automaticamente; sem boa sugestão, a interface oferece alternativas honestas.

### 34. Criar uma amostra de avaliação de relevância

Montar consultas reais representativas de campanhas, materiais, códigos, sinônimos e erros; classificar a adequação dos primeiros resultados com o comercial.

**Aceite:** consultas prioritárias possuem exemplos relevantes e irrelevantes; regressões de ordenação são detectáveis sem depender de opiniões improvisadas.

### 35. Ajustar a ordenação editorial

Combinar precisão da busca, coerência da campanha, diversidade e atualidade pertinente. Tratar produtos datados no contexto certo, sem retirá-los do catálogo.

**Aceite:** primeiras posições melhoram na amostra da etapa 34; não há regra de esconder item por estoque e o critério editorial é explicável.

### 36. Documentar novidades, kits e badge único

Confirmar, em leitura, a semântica dos sinais herdados do Promo Gifts. Separar “produto novo”, “novo no catálogo” e “kit”, definindo precedência, janela temporal e fallback.

**Aceite:** cada card tem no máximo um badge de imagem; “Sua marca aqui” desaparece quando outro tem prioridade; data ausente/futura não gera novidade enganosa.

### 37. Simplificar os nomes e grupos do superfiltro

Agrupar categorias extensas em rótulos de comprador, com busca interna e opção de explorar todos os grupos. Explicar materiais e personalização quando necessário.

**Aceite:** mapeamento é reversível e não perde categorias; filtros com nomes amigáveis continuam consultando os identificadores corretos.

### 38. Melhorar o refinamento no celular

Exibir filtros ativos, limpar individualmente e quantidade de resultados compatível com o estado aplicado. Avaliar aplicação imediata versus botão de aplicar no painel.

**Aceite:** usuário diferencia alterações pendentes/aplicadas; fechar não muda filtros inadvertidamente; foco e seleção são preservados.

### 39. Otimizar densidade, paginação e retorno

Testar cards mais eficientes e acesso à próxima página sem perder orientação. Preservar URL, ordenação e posição; não adotar rolagem infinita sem evidência de benefício.

**Aceite:** localizar, abrir e voltar a um produto não reinicia a pesquisa; textos e alvos continuam legíveis em mobile.

### 40. Explicar recomendações e recuperar buscas vazias

Mostrar quais respostas do briefing influenciaram o recorte e oferecer ajustes simples quando não há correspondência. Começar com opções pertinentes e permitir ampliar a exploração.

**Aceite:** toda justificativa corresponde a uma regra/dado real; ampliar a busca exige transparência, não a substituição oculta da intenção.

## Bloco 5 — Dar segurança para escolher produtos | etapas 41–50

Responsáveis: UX, FE, BE e COM. Prioridade: P2. Depende da taxonomia e da amostra; correções de dados devem respeitar a propriedade da fonte.

### 41. Auditar a qualidade dos dados exibidos

Executar verificações de completude, unidades, textos truncados, variantes e divergências em amostra estratificada por categoria/fornecedor. Dimensionar incidência antes de generalizar problemas.

**Aceite:** cada ocorrência registra campo, evidência e encaminhamento; o site não corrige silenciosamente um fato desconhecido nem altera o sistema interno.

### 42. Separar resumo e descrição completa

Evitar cortes como “Personalizável com lo”; apresentar resumo completo semanticamente e descrição expandida organizada. Remover ou revisar promessas genéricas sem apoio.

**Aceite:** não há frases cortadas na ficha; descrição comercial não contradiz especificações conhecidas.

### 43. Padronizar especificações e unidades

Organizar dimensões, capacidade, peso, materiais por parte e embalagem. Exibir ausência como informação a confirmar, em vez de zero, campo vazio ou preenchimento imaginado.

**Aceite:** produtos da mesma categoria são comparáveis; “capa de PU” e “estrutura de cartão” só aparecem separados quando essa interpretação for confirmada.

### 44. Aprimorar a galeria com ampliação

Adicionar zoom acessível, miniaturas identificáveis e navegação por teclado/toque. Reservar dimensões das imagens e garantir alternativa quando uma foto não carrega.

**Aceite:** é possível conferir acabamento, fechar a ampliação e retornar ao mesmo ponto; não há perda de foco ou imagem indispensável apenas em hover.

### 45. Esclarecer cores e variantes

Associar nome, imagem e identificador da variante escolhida. Diferenciar opções cadastradas de outras eventualmente consultáveis, sem prometer estoque por cor.

**Aceite:** a cor salva é a mesma mostrada no briefing e histórico; recarregar ou trocar imagem não altera a escolha silenciosamente.

### 46. Tornar quantidade mínima e ajustes coerentes

Unificar regra entre card, ficha, seleção e servidor. Permitir digitação natural, explicar mínimo conhecido e tratar desconhecido como consulta; não confundir quantidade desejada com disponibilidade.

**Aceite:** valores inválidos recebem orientação, não mudanças silenciosas; mínimos conhecidos são consistentes em toda a jornada.

### 47. Explicar a personalização sem simular certezas

Informar técnicas e áreas somente quando confirmadas; mostrar exemplos autorizados e distinguir imagem ilustrativa de prova de produção. Orientar envio de marca e revisão posterior.

**Aceite:** cliente sabe o que é exemplo e o que será confirmado na proposta; nenhuma montagem visual é vendida como aprovação técnica automática.

### 48. Tornar a FAQ contextual

Exibir dúvidas pertinentes à categoria e ao momento: aplicação da marca, embalagem, mínimo, arte, amostra e prazo. Manter uma fonte editorial comum para respostas repetidas.

**Aceite:** ficha e orçamento não dão respostas conflitantes; “depende” vem acompanhado do que o especialista precisa saber.

### 49. Melhorar alternativas e produtos relacionados

Usar intenção, atributos e variedade de aplicação para sugerir alternativas. Evitar uma prateleira composta apenas por quase duplicatas quando o cliente busca opções.

**Aceite:** recomendações têm relação explicável com a campanha e não perdem filtros/contexto quando abertas.

### 50. Enriquecer a comparação decisória

Além de mínimo, cores e material, incorporar capacidade, dimensões, embalagem e aplicação quando disponíveis. Destacar diferenças e preservar a leitura acessível da tabela em mobile.

**Aceite:** o comprador identifica diferenças sem abrir todas as fichas; atributos ausentes são explícitos e o conjunto continua preservado pela etapa 08.

## Bloco 6 — Organizar e apresentar seleções | etapas 51–60

Responsáveis: UX, FE, BE e QA. Prioridade: P2/P3. Etapas 56–60 exigem desenho de permissões antes de persistência remota; não bloqueiam os reparos essenciais.

### 51. Dar retorno claro ao salvar um produto

Mostrar item, variante, quantidade e local da seleção. Reduzir interrupções repetidas do painel sem esconder a confirmação; preservar caminho rápido para continuar pesquisando.

**Aceite:** o usuário sabe se o produto foi incluído, atualizado ou já existia; clique repetido não gera duplicidade inesperada.

### 52. Proteger remoção e limpeza

Oferecer desfazer remoção e confirmação proporcional ao limpar todo o conjunto. Diferenciar remover item, arquivar campanha e apagar definitivamente.

**Aceite:** uma ação acidental comum é recuperável; cancelar preserva integralmente o conjunto e devolve o foco.

### 53. Nomear seleções por campanha

Permitir título e breve objetivo sem obrigar cadastro. Definir seleção ativa e duração local; reaproveitar o título no briefing e depois no histórico.

**Aceite:** duas campanhas não se confundem; renomear uma seleção não modifica solicitações já enviadas.

### 54. Organizar alternativas para decisão

Prototipar grupos simples, como “principal” e “alternativa”, ou prioridades por item. Não transformar a seleção em um gerenciador complexo antes de observar necessidade.

**Aceite:** usuários de teste entendem a organização e conseguem desfazê-la; ordenação não depende exclusivamente de arrastar.

### 55. Refinar impressão e apresentação em PDF

Incluir título da campanha, fotos, códigos, variantes, quantidades e data da seleção. Evitar blocos cortados e explicar que o material não é uma proposta comercial final.

**Aceite:** impressão longa, nomes extensos e imagens ausentes têm apresentação legível; nenhum contato privado entra por padrão em versão compartilhável.

### 56. Definir o modelo de compartilhamento seguro

Escolher entre seleção privada, convite autenticado e link de leitura deliberadamente criado pelo dono. Documentar exposição, prazo, revogação e diferença entre fotografia da seleção e versão viva.

**Aceite:** decisão aprovada antes de implementar; orçamento, contatos, anexos e proposta comercial ficam fora de links abertos por padrão.

### 57. Implementar seleção compartilhável de leitura

Após a etapa 56 e revisão de dados, criar visualização identificada, mobile e sem edição indevida. Permitir ao proprietário revogar acesso e explicar se alterações futuras aparecem no link.

**Aceite:** testar dono, convidado, link expirado e revogado; conhecimento de um identificador não abre outros registros; botões não sugerem colaboração que não existe.

### 58. Melhorar prévias de links por conteúdo

Entregar metadados na resposta inicial para produtos, coleções e datas públicas. Para seleções compartilhadas, respeitar o nível de privacidade e não expor dados em robôs de prévia.

**Aceite:** HTML inicial identifica a referência correta; previews públicos usam foto/nome reais; conteúdo privado permanece protegido e fora da indexação.

### 59. Oferecer sincronização opcional após login

Permitir continuar a seleção em outro dispositivo sem tornar autenticação obrigatória na descoberta. Explicar quais rascunhos serão associados à conta e pedir confirmação em conflito.

**Aceite:** login e logout não misturam dados entre pessoas; sincronização falha de forma recuperável; a seleção local não é apagada antes de confirmação remota.

### 60. Resolver conflitos e ciclo de vida das campanhas

Tratar duas abas, dispositivos concorrentes, duplicação, arquivamento e exclusão. Definir versionamento e recuperação antes de oferecer edição simultânea sofisticada.

**Aceite:** alterações concorrentes não provocam perda silenciosa; usuário consegue entender qual versão foi salva e recuperar uma seleção arquivada.

## Bloco 7 — Transformar seleção em pedido bem explicado | etapas 61–70

Responsáveis: UX, FE, BE, COM e QA. Prioridade: P2; envio íntegro é requisito de qualquer release. Comunicação externa depende de provedores e destinatários de teste autorizados.

### 61. Apresentar um resumo editável da campanha

Reunir seleção, questionário, ocasião e título em uma revisão curta. Identificar sugestões versus informações confirmadas e evitar dupla digitação.

**Aceite:** contexto inicial chega ao pedido sem sobrescrever edição do cliente; campos desconhecidos não se tornam fatos.

### 62. Capturar verba sem simular preço

Oferecer campo opcional com distinção entre orçamento total e valor desejado por pessoa, quantidade e itens incluídos. Aceitar “a definir”.

**Aceite:** o comercial recebe unidade e contexto inequívocos; não há cálculo de preço apresentado como cotação aprovada.

### 63. Separar data do evento e necessidade de recebimento

Pedir prazo e local quando úteis, aceitar flexibilidade e explicar consulta de viabilidade. Não gerar promessa automática baseada em estoque ou antecedência genérica.

**Aceite:** datas passadas/incompatíveis geram orientação; falta de CEP ou data não impede toda consulta se a operação aceitar esclarecimento posterior.

### 64. Reduzir esforço no formulário

Separar informações essenciais e opcionais, oferecer preenchimento automático adequado e mensagens junto aos campos. Rever o rótulo “e-mail corporativo” para não excluir freelancers inadvertidamente.

**Aceite:** erros mantêm valores, resumo de validação leva ao campo e correção não exige reiniciar etapas.

### 65. Planejar e disponibilizar anexos com proteção

Somente após aprovação de necessidade e armazenamento, permitir logo/referência com tipos e limites claros, validação no servidor e acesso privado. Considerar upload pendente, falha, remoção e conteúdo não seguro.

**Aceite:** pedido pode continuar sem anexo; arquivos não ficam em URL pública permanente; envio bloqueado informa alternativa ao cliente.

### 66. Garantir envio único e persistência íntegra

Validar dados no servidor, tratar clique duplo e timeout, usar idempotência e preservar o retrato da seleção enviada. Distinguir pedido registrado de resposta perdida na rede.

**Aceite:** repetir a mesma tentativa não cria pedidos duplicados; teste inclui resposta tardia, falha parcial e retomada, sem limpar o rascunho prematuramente.

### 67. Criar uma confirmação que esclareça o próximo passo

Mostrar protocolo, resumo, canal e prazo de primeiro retorno efetivamente aprovados. Oferecer impressão e acompanhamento sem induzir nova solicitação.

**Aceite:** usuário consegue explicar se o pedido foi recebido e o que acontecerá agora; “recebido” não é confundido com produção aprovada.

### 68. Comprovar e completar a cópia por e-mail

Verificar primeiro se há integração externa existente. Se incompleta, definir remetente, template, fila/repetição, deduplicação e registros; usar destinatários de teste autorizados e não acoplar falha de e-mail à perda do pedido.

**Aceite:** evidência distingue aceitação pelo provedor, entrega e falha; recebimento de teste é verificado; não se anuncia “e-mail enviado” sem estado correspondente.

### 69. Disponibilizar WhatsApp como canal opcional

Validar número, provedor, política aplicável, custo e autorização específica antes da ativação. Começar com escopo transacional aprovado, sem inserir campanhas de marketing ou contatos de teste reais indevidos.

**Aceite:** não aderir ao WhatsApp não bloqueia orçamento; falha e reenvio não duplicam mensagens; desativação mantém acesso ao protocolo e atendimento alternativo.

### 70. Fechar a passagem para o atendimento humano

Definir quem recebe o briefing, como acompanha prazo de retorno e como o cliente referencia o pedido ao falar com nosso time de especialistas. Evitar chatbot sem integração que obrigue a repetir tudo.

**Aceite:** teste operacional controlado confirma que o responsável recebe contexto completo; horário e promessa exibidos correspondem à capacidade acordada.

## Bloco 8 — Evoluir a área do cliente com segurança | etapas 71–80

Responsáveis: UX, FE, BE, QA e COM. Prioridade: P2/P3. Depende de identidade e propriedade dos dados; controles da etapa 79 precedem a ativação de qualquer novo dado remoto.

### 71. Simplificar a escolha do método de acesso

Dar destaque ao método principal realmente suportado, com alternativa de senha compreensível. Alinhar texto da tela com o conteúdo real do e-mail e evitar instruções condicionais confusas.

**Aceite:** cliente sabe se deve abrir um link ou digitar código; a seleção anterior continua acessível ao iniciar o login.

### 72. Melhorar campos e mensagens de autenticação

Adicionar mostrar/ocultar senha, requisitos claros e orientação para e-mail malformado. Manter mensagens cuidadosas para não revelar indevidamente a existência de contas.

**Aceite:** erro de formato é corrigível no campo; gerenciadores de senha, colar e preenchimento automático continuam utilizáveis.

### 73. Tratar recuperação, expiração e reenvio

Cobrir link expirado/usado, código incorreto, redirecionamento seguro e nova senha. Evitar que sessão expirada destrua rascunho ou faça a pessoa perder sua rota de destino.

**Aceite:** cada estado tem caminho recuperável; testes de entrega e alteração real usam contas próprias de teste, não clientes.

### 74. Organizar histórico por campanha

Apresentar título, miniaturas, protocolo, data, status e última movimentação, com busca/filtros pertinentes. Distinguir seleção em rascunho de solicitação registrada.

**Aceite:** várias solicitações da mesma empresa são reconhecíveis; vazio e filtro sem resultado oferecem ações diferentes e úteis.

### 75. Tornar a linha do tempo acionável

Usar estados de negócio aprovados e indicar próximo passo, pendência e responsável/canal quando disponíveis. Atualização deve ter origem operacional real, não progresso artificial.

**Aceite:** toda transição vem de evento verificável; cliente sabe quando precisa fornecer informação ou apenas aguardar.

### 76. Dar clareza às versões de proposta

Identificar versão atual, emissão, validade e relação com a solicitação original. Proteger documentos e tratar expiração de link/download com recuperação.

**Aceite:** proposta antiga não parece vigente; nenhum documento é acessível a outro cliente e falha no arquivo não destrói a navegação.

### 77. Facilitar esclarecimentos e pedidos de ajuste

Projetar uma ação contextual que carregue protocolo e proposta relacionada. Só implementar conversa interna se houver operação responsável; caso contrário, usar canal existente com confirmação apropriada.

**Aceite:** o pedido de ajuste chega ao responsável certo, fica identificável e não é confundido com nova aprovação ou compra.

### 78. Repetir uma campanha sem sobrescrever trabalho

Oferecer nova seleção baseada no histórico, preservando a solicitação original. Revisar itens removidos, quantidade, cor e condições que precisam ser confirmadas novamente.

**Aceite:** seleção atual só é substituída mediante escolha explícita; nova solicitação não herda validade comercial de proposta antiga.

### 79. Validar isolamento de conta e compartilhamento

Testar autorização no servidor e políticas de acesso com duas contas e papéis distintos. Verificar documentos, rascunhos, anexos, propostas e links; domínio de e-mail não concede acesso empresarial automático.

**Aceite:** usuário A não lê nem altera dados de B por URL, identificador, API ou arquivo; credenciais administrativas nunca chegam ao navegador.

### 80. Dar controle sobre dados e preferências

Explicar o que está local ou na conta, duração, sincronização e canais habilitados. Definir procedimentos de remoção e tratamento das solicitações registradas com responsável competente, sem prometer exclusão técnica instantânea indiscriminada.

**Aceite:** interface e comportamento correspondem; preferências opcionais não são impostas para solicitar orçamento e logout elimina exposição indevida no dispositivo.

## Bloco 9 — Tornar catálogos e datas instrumentos de planejamento | etapas 81–90

Responsáveis: UX, FE e COM, com BE quando houver persistência. Prioridade: P2/P3. Depende da relevância do catálogo e do contrato de contexto.

### 81. Distinguir coleção online, PDF e revista digital

Tornar formato e ação explícitos antes do clique. Não criar download fictício onde existe apenas um recorte de produtos.

**Aceite:** cada card anuncia o formato que entrega; formato ainda indisponível não tem CTA enganoso.

### 82. Mostrar produtos reais nas capas e prévias

Combinar identidade editorial com exemplos do conteúdo; oferecer visão compacta da biblioteca. Evitar que dez capas exijam rolagem desproporcional para comparar opções.

**Aceite:** prévia e coleção correspondem; mobile mantém legibilidade e acesso rápido à busca e filtros.

### 83. Construir coleções com argumento de campanha

Selecionar produtos, combinações e justificativas para públicos específicos. Tratar onboarding como necessidade e não sinônimo automático de kit.

**Aceite:** coleção tem responsável, propósito e revisão; não é apenas uma cópia de outra lista com título diferente.

### 84. Governar publicações e downloads

Quando materiais reais estiverem disponíveis, informar edição, atualização, tamanho e acessibilidade; checar links e permissão de imagens. Prever substituição ou retirada sem becos sem saída.

**Aceite:** cada arquivo tem origem e destino válidos; publicação desatualizada não promete condição comercial atual.

### 85. Abrir a agenda nas oportunidades futuras

Priorizar próximas datas e manter acesso ao ano inteiro/passado por escolha. Tratar fuso e virada do ano sem ordenar indevidamente por texto.

**Aceite:** abrir em setembro não força começar em janeiro; nenhum evento desaparece e anos selecionáveis continuam coerentes.

### 86. Separar proximidade de viabilidade de planejamento

Mostrar data do evento e janela sugerida de preparação. Para evento próximo, oferecer consulta de viabilidade e alternativas futuras, sem garantir entrega.

**Aceite:** orientação não se contradiz, por exemplo evento em seis dias versus produção recomendada de semanas; recomendação permanece claramente indicativa.

### 87. Melhorar agenda e calendário no celular

Criar lista compacta por mês, acesso rápido aos próximos eventos e controles compreensíveis. Manter calendário como opção, com aviso de rolagem quando necessário.

**Aceite:** datas e ações não ficam inacessíveis fora da área visível; navegação mensal funciona por toque e teclado.

### 88. Aproximar favoritos do planejamento

Levar “Minhas datas” para uma posição acessível, explicar se favorito representa uma ocasião recorrente ou uma edição anual e permitir remover/desfazer.

**Aceite:** trocar o ano não surpreende o usuário; persistência e eventual sincronização seguem o mesmo contrato de privacidade das seleções.

### 89. Validar exportação de calendário

Testar eventos de dia inteiro, fuso, caracteres, datas móveis, UID e reimportação em calendários-alvo. Distinguir download de um arquivo de uma assinatura com atualizações.

**Aceite:** datas importadas não deslocam um dia; repetição não cria duplicatas evitáveis; lembrete só é incluído quando deliberadamente escolhido.

### 90. Conectar ocasião, coleção e briefing

Oferecer “Planejar esta campanha” levando nome, data, público e intenção à seleção. Acrescentar orientação editorial responsável para causas e temas sensíveis, sem exploração promocional automática.

**Aceite:** o pedido final mantém a ocasião escolhida; usuário pode corrigir ou retirar o contexto sem reiniciar.

## Bloco 10 — Medir, testar e publicar com evidência | etapas 91–100

Responsáveis: QA, UX, FE e BE, com aprovação de PO/COM. **Atividades transversais desde o início**, consolidadas aqui como entregas específicas. Segurança e acessibilidade não são opcionais.

### 91. Testar protótipos com compradores reais

Recrutar, mediante coordenação autorizada, pessoas de marketing, eventos e RH, incluindo o público jovem prioritário. Observar tarefas e recuperação de erros antes de construir expansões complexas.

**Aceite:** problemas recorrentes têm decisão documentada; feedback hipotético do avaliador não aparece como depoimento de participante. Amostra qualitativa não vira percentual representativo de mercado.

### 92. Instrumentar o funil com minimização de dados

Medir busca, resultado vazio, seleção, início/revisão de briefing, tentativa, aceite do pedido e acesso ao histórico. Evitar texto livre, e-mail, telefone, anexos ou URLs sensíveis em analytics; tratar duplicidade e tráfego de teste.

**Aceite:** eventos podem ser auditados sem revelar conteúdo pessoal; contagens separam eventos de sessão e solicitações únicas, e regras de retenção/preferência estão definidas.

### 93. Estabelecer orçamento de desempenho

Medir páginas prioritárias em condições reproduzíveis e, quando houver dados suficientes, em campo; reduzir peso de imagens, fontes, bibliotecas e processamento da busca. Preservar a imagem principal sem aplicar lazy loading indiscriminado.

**Aceite:** metas de campo propostas no percentil 75: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1, segmentadas por dispositivo. Dados insuficientes são declarados; teste de laboratório não substitui INP de campo. Referência: [Web Vitals](https://web.dev/articles/vitals).

### 94. Validar acessibilidade além do teste automático

Adotar WCAG 2.2 AA como alvo e revisar teclado, leitores de tela, foco, formulários, zoom, contraste e autenticação. Para controles principais móveis, propor 44 × 44 CSS px como meta de conforto do projeto, sem confundi-la com o mínimo AA de 24 × 24 e suas exceções.

**Aceite:** falhas críticas de acesso corrigidas e critérios não testados declarados; automação sem alertas não é rotulada certificação. Referência: [W3C — WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).

### 95. Testar responsividade e navegadores reais

Cobrir 320, 390, 768 e 1440 px, zoom e orientação; executar Chromium, Firefox e WebKit e validar amostra em Safari/iOS e Android físicos quando disponíveis. Incluir teclado virtual, scroll interno e menus.

**Aceite:** nenhum fluxo crítico fica cortado ou bloqueado; limitações de dispositivos não disponíveis são registradas, não presumidas aprovadas.

### 96. Regular animações e microinterações

Manter Fold Text e efeitos expressivos apenas quando apoiam leitura/feedback; evitar glitch contínuo em informação decisória. Respeitar movimento reduzido, pausar movimento prolongado quando aplicável e não bloquear ações por animação.

**Aceite:** títulos permanecem legíveis e acessíveis, sem flashes perigosos ou conteúdo invisível no modo reduzido; efeito não provoca deslocamentos perceptíveis ou atraso da tarefa.

### 97. Revisar indexação e metadados técnicos

Validar títulos, descrições, canonicals, sitemap, rotas removidas e comportamento de parâmetros. Proteger área privada e compartilhamentos; dados estruturados não incluem preço, estoque, avaliação ou oferta inexistentes.

**Aceite:** conteúdo público tem identidade correta e indexação deliberada; rotas privadas não vazam informações pelo HTML, sitemap ou prévias.

### 98. Planejar dados, segurança e mudanças reversíveis

Para novos recursos, comparar schema e políticas existentes via `pg_catalog`, revisar privilégio mínimo e mudanças aditivas no banco do site. Definir backup/recuperação e compatibilidade com a versão anterior; não executar DDL na origem de produtos.

**Aceite:** alvo, migration, teste e reversão estão revisados antes de qualquer aplicação; rollback de aplicação não depende de apagar dados; segredos permanecem fora de cliente, Git e evidências.

### 99. Executar a matriz ponta a ponta e de resiliência

Combinar unitários, contratos, integração e navegador com dados reais em leitura e contas/destinatários de teste para escrita autorizada. Cobrir rede lenta, timeout após persistência, limite de serviço, reload, abas concorrentes e sessão expirada.

**Aceite:** anexar evidências por cenário e classificar simulado versus real; defeito sem cobertura recebe teste; nenhuma conta de cliente é usada para demonstrar sucesso.

### 100. Publicar por lotes e reavaliar a experiência

Liberar estabilização antes de expansões; usar configuração para desativar recursos novos quando apropriado. Verificar commit, build, deploy, contratos de dados e smoke pós-publicação; observar indicadores por janela definida e comparar a auditoria antes/depois.

**Aceite:** cada lote tem responsável, critérios de interrupção e retorno seguro; nenhuma pendência é escondida sob uma nota “10/10”. Encerramento exige evidência dos objetivos acordados, não apenas conclusão de uma lista.

## Dependências e pontos de aprovação

| Entrega | Pré-requisitos | Decisão/checagem que impede ativação prematura |
|---|---|---|
| Correções essenciais, 04–09 | 01–03 e testes de 94/99 pertinentes | Não esperar redesign ou provedores novos |
| Curadoria e recomendações, 23–24/31–40/49/83 | Contratos de catálogo e taxonomia | COM valida relevância; não inventar atributos |
| Rascunhos e contexto, 07/09/53/61 | Contrato 02 e privacidade 80 | Retenção, descarte, conta e expiração claros |
| Seleções remotas/compartilhadas, 56–60 | 53, 56, 79, 80, 98 | Modelo de acesso e armazenamento aprovados antes da implementação |
| Anexos, 65 | 79, 80, 98 | Propriedade, tipo/tamanho, inspeção e retenção aprovados |
| E-mail/WhatsApp, 68–70 | 66–67, operação COM, teste 99 | Provedor, remetente/número, custo e destinatários autorizados |
| Cases e canais, 26/28/30 | Material e dados oficiais | Autorização de uso e operação comprovada |
| Mudanças de banco/hospedagem, 98/100 | Revisão técnica e autorização de execução | Nenhuma autorização implícita para alterar Promo Gifts |

## Cenários de validação prioritários

| Cenário | Falha a prevenir | Etapas centrais |
|---|---|---|
| Pessoa pesquisa novidades por três entradas diferentes | Consulta inválida ou tratamento divergente | 03–06, 36, 99 |
| Digita “kit onboarding” para 150 pessoas | Kits irrelevantes e escala convertida em certeza | 09, 31–35, 40, 46, 61 |
| Preenche briefing, abre catálogo, volta e recarrega | Perda de campos ou seleção | 02, 07, 18, 64, 99 |
| Compara três opções, abre uma ficha e volta | Reinício da comparação e posição | 08, 18, 50 |
| Salva cor distinta ou produto com mínimo desconhecido | Variante errada ou mínimo inventado | 41, 45–46, 51, 66 |
| Limpa tudo por engano | Remoção irreversível | 52, 60 |
| Duas abas editam campanhas diferentes | Sobrescrita silenciosa | 53, 59–60, 99 |
| Rede cai depois de o servidor registrar o pedido | Duplicidade ou perda do protocolo | 66–68, 99 |
| E-mail falha e WhatsApp não foi autorizado | Falsa confirmação ou contato indevido | 67–70, 80 |
| Sessão expira durante o trabalho | Perda do rascunho ou exposição a outra conta | 07, 59, 73, 79–80 |
| Pessoa abre link de outro cliente ou link revogado | Vazamento de seleção privada ou proposta | 56–58, 76, 79, 98 |
| Planeja ocasião próxima sem prazo viável | Promessa implícita de entrega | 63, 85–90 |
| Usa leitor de tela ou movimento reduzido | Ação indisponível ou conteúdo ilegível | 14, 17, 44, 94–96 |

## Rastreabilidade dos 28 achados da auditoria

| Achado | Etapas do plano |
|---|---|
| UX-01 Novidades inválidas | 03, 04, 36, 99 |
| UX-02 Autocomplete bloqueando atalhos | 03, 05, 17, 99 |
| UX-03 Perda do briefing | 02, 07, 64, 99 |
| UX-04 Mensagem técnica exposta | 06, 19 |
| UX-05 Contexto não reaproveitado | 09, 40, 61, 90 |
| UX-06 Comparação perdida | 08, 18, 50 |
| UX-07 Onboarding genérico | 24, 31–35, 40, 83 |
| UX-08 Limpeza sem desfazer | 52, 60 |
| UX-09 Dados incompletos | 41–43, 45–48 |
| UX-10 Falta expectativa de retorno | 28, 63, 67, 70, 75 |
| UX-11 Cópia não comprovada | 68–69, 99 |
| UX-12 Contato sem mensagem | 29 |
| UX-13 Prévia genérica | 58, 97 |
| UX-14 404 da hospedagem | 19, 97 |
| UX-15 Produto aparece tarde | 21–23 |
| UX-16 Agenda começa no passado | 85–87 |
| UX-17 Limite de dados locais | 02, 53, 56–60, 80, 88 |
| UX-18 Falta prova comercial | 26–28, 30, 70 |
| UX-19 Vocabulário excessivo | 11–13, 20 |
| UX-20 Autenticação pouco orientativa | 71–73 |
| UX-21 Comparação insuficiente | 43, 50 |
| UX-22 Coleções sem prévia concreta | 81–83 |
| UX-23 Calendário/favoritos móveis | 87–89 |
| UX-24 Textos pequenos | 14, 39, 94–95 |
| UX-25 Histórico sem campanha | 53, 61, 74 |
| UX-26 Galeria sem ampliação | 44 |
| UX-27 Busca com erro de digitação | 33–34 |
| UX-28 Verba e prioridades sem orientação | 61–64 |

## O que significa qualidade suficiente para publicar

- Falhas P1 da auditoria não se reproduzem na matriz aprovada.
- Dados de campanha, variantes e quantidades chegam corretamente à solicitação; voltar/recarregar não causa perda nos estados definidos.
- Nenhum isolamento de conta, exposição de documento ou permissão de link permanece sem teste nos recursos liberados.
- A experiência de teclado e mobile permite concluir os percursos essenciais; verificação automática é complementada por revisão manual.
- Envio, entrega de notificação e atualização de status são estados distintos e comprováveis quando anunciados.
- Compradores observados entendem a proposta do site, conseguem selecionar e explicar o próximo passo; problemas críticos de pesquisa têm correção/reteste.
- Desempenho e métricas possuem baseline, alvo e limitações declarados; nenhuma melhoria percentual é prometida sem dados.
- Publicação pode ser revertida sem apagar solicitações, e toda pendência residual fica explícita.

## Fundamentação e limites

As recomendações específicas vêm da auditoria local vinculada no início. Controle sobre ações, consistência de linguagem, visibilidade de estado e recuperação de erros também orientam o plano, em linha com as [heurísticas de usabilidade do Nielsen Norman Group](https://www.nngroup.com/articles/ten-usability-heuristics/). Não há aqui uma alegação de pesquisa de mercado nova ou preferência universal da geração Z.

O Graphify foi usado como apoio às dependências já mapeadas: o grafo registrou a importação de `QuoteCartContext.tsx` por `QuotePage.tsx` como relação extraída, e localizou catálogo/seleção/formulário. Isso ajudou a planejar o contrato de estado antes das expansões. O grafo de 8 de setembro não cobre integralmente adições posteriores; não substitui a auditoria de 9 de setembro ou inspeção técnica na execução. A consulta ampla foi limitada a cerca de 1.500 tokens; não houve nova extração semântica nem custo de API externa medido nesta atividade. Não se apresenta esse limite como consumo total da sessão.

Este documento não aplica correções, migrations, mensagens, commits, deploys ou configurações. Recursos condicionais continuam sujeitos às decisões registradas; o objetivo é uma evolução verificável, não uma promessa de perfeição absoluta.
