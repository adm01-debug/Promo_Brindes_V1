# Promo Brindes — experiência de uma pessoa de marketing

Avaliação de UX, conteúdo e jornada comercial · 9 de setembro de 2026

Site observado: <https://promo-brindes-v1.vercel.app>
Código de referência: `049f7f5dfdcafb54c3f0a6742d9fc5d1a26a9cf6`
Perspectiva: profissional de marketing que pesquisa brindes, organiza referências, apresenta opções e solicita propostas.

## 1. Minha percepção principal

**Eu me interessaria pela Promo Brindes e começaria uma seleção. Ainda precisaria sair do site para organizar parte da decisão e confirmar se consigo executar a campanha.**

A marca tem uma personalidade reconhecível: contraste forte, cores vivas, títulos expressivos, linguagem de campanha e uma proposta comercial que respeita a etapa de pesquisa. O site deixa claro que posso explorar sem pagar e sem abrir uma conta imediatamente. Isso é um bom começo.

O principal desequilíbrio aparece depois dessa primeira impressão. A promessa é de curadoria, contexto e colaboração; a experiência ainda funciona, em vários momentos, como uma extensa lista de produtos. Respostas dadas no início não acompanham a pessoa até o briefing. A comparação desaparece ao visitar um produto. O briefing preenchido se perde ao sair para escolher mais itens. Esses problemas têm mais impacto sobre minha confiança do que acrescentar um efeito visual.

Há, além disso, dois defeitos reproduzidos no catálogo: o filtro de novidades retorna erro e uma caixa vazia de sugestões encobre atalhos de busca. Eles precisam ser tratados antes de ampliar o investimento em divulgação dessas entradas.

Minha avaliação heurística global é **aproximadamente 6,5/10 para a experiência de trabalho**, com uma identidade visual mais madura do que a continuidade da jornada. Essa nota é um julgamento do avaliador, não uma média de usuários, um índice de conversão ou uma certificação.

## 2. Como esta avaliação foi realizada

Adotei uma persona hipotética: **Ana, 25 anos, analista de marketing**, que alterna celular e computador, precisa selecionar brindes para 150 pessoas, apresentar opções a uma liderança e obter uma proposta com prazo viável. Também examinei tarefas de reconhecimento, eventos, relacionamento com clientes e planejamento sazonal.

As falas em primeira pessoa deste relatório representam essa perspectiva simulada. Não são depoimentos coletados com clientes reais. Não presumi que toda pessoa da geração Z tenha o mesmo gosto ou comportamento. A pesquisa pública do Nielsen Norman Group sobre jovens adultos também adverte contra estereótipos e considera eficiência, busca, credibilidade e formulários, além do visual. Consultei a apresentação pública da pesquisa, não usei seus resultados como se fossem uma pesquisa com compradores da Promo. [Referência](https://www.nngroup.com/reports/designing-for-young-adults/)

### Cobertura e limites concretos

- Navegação no site publicado, com dados reais do catálogo, em Chromium desktop **1440 × 1000** e mobile **390 × 844**.
- **36 registros de navegação**: 18 rotas/estados em duas telas, cobrindo todos os 15 tipos de rota do aplicativo, incluindo estados anônimos das páginas protegidas, kits e novidades.
- Percursos adicionais de busca, comparação, salvar, briefing, filtros, catálogos, agenda, compartilhamento e impressão.
- Histórico, detalhes de orçamento, propostas e definição de senha examinados com **respostas fictícias interceptadas no navegador**. Nenhuma conta real foi acessada.
- Sucesso e erro do envio de orçamento examinados por simulação local das respostas. **Não foram enviados pedidos, e-mails ou mensagens de WhatsApp reais.** Isso permite avaliar a interface, não comprovar entrega de notificações.
- Nove verificações automáticas de acessibilidade em páginas/viewport selecionados, complementadas por inspeção visual, foco, teclado e movimento reduzido.
- Inspeção direcionada do código para explicar comportamentos observados e delimitar funcionalidades disponíveis.
- O catálogo exibiu **7.524 produtos**. Examinei os templates, resultados amostrados e uma ficha completa com galeria; não cada um dos 7.524 registros individualmente.
- Não medi conversão, abandono real, satisfação de clientes ou Core Web Vitals de campo. Alturas de página abaixo são geometria da interface, não tempos de uso.

Os testes automatizados apresentados nas entregas anteriores constituem uma evidência diferente. Nesta auditoria, dados e respostas reais revelaram problemas que os cenários simulados anteriores não cobriam. Portanto, a conclusão anterior de que estava tudo validado precisa ser delimitada: publicação e testes locais aprovados não garantem uma boa experiência em todos os fluxos reais.

### Classificação das conclusões

**Observado:** reproduzido na interface publicada. **Simulado:** interface publicada com respostas fictícias e sem escrita remota. **Código:** comportamento sustentado pela implementação, sem confirmação operacional de ponta a ponta. **Percepção:** avaliação profissional a validar com compradores.

## 3. O que uma pessoa de marketing precisa resolver aqui

Além de encontrar um objeto bonito, preciso responder a perguntas de trabalho:

1. Isso combina com a campanha, o público e a identidade da marca?
2. Quais três opções merecem ir para uma apresentação?
3. A quantidade pretendida é viável e o prazo precisa de atenção?
4. Como a marca será aplicada e o que preciso enviar para aprovação?
5. Como compartilho a seleção sem remontar tudo em uma planilha?
6. Como retomo o trabalho depois de uma interrupção?
7. Quem vai me responder e qual é o próximo passo?

Não considero a ausência de preço público ou checkout um defeito: ela é coerente com o modelo de orçamento aprovado. A oportunidade é ajudar a pessoa a explicar **verba, prioridade e prazo**, sem inventar preços ou disponibilidade. Tampouco recomendo esconder produtos por estoque de fornecedor: a necessidade é melhorar a ordenação e a contextualização, preservando a consulta ao catálogo completo.

## 4. Diário resumido dos percursos

| Tarefa | O que encontrei | Minha percepção | Evidência |
|---|---|---|---|
| Entender a proposta | Exploração livre, seleção e orçamento sem compra online | “Posso pesquisar sem assumir compromisso.” | Observado |
| Procurar novidades | Erro HTTP 400 e mensagem técnica | “A área que promete descoberta não abre.” | Observado, desktop e mobile |
| Buscar squeeze | 996 resultados, também encontrados por “garrafa” | “A busca entende um sinônimo útil.” | Observado |
| Digitar “squese” | Zero resultados | “Um erro simples me deixa sem ajuda específica.” | Observado |
| Buscar “kit onboarding” | 1.250 resultados; conjuntos de cozinha/churrasco nas primeiras posições | “Vou precisar fazer a curadoria por conta própria.” | Observado |
| Responder ao briefing guiado | Opções e contexto aparecem no catálogo | “O início é fácil e promissor.” | Observado |
| Levar esse contexto ao orçamento | Campo de observações vazio; quantidade inicial 100 | “Preciso contar a campanha de novo.” | Observado |
| Comparar três produtos | Comparação abre e impede um quarto item | “Ajuda a reduzir a lista.” | Observado |
| Abrir uma ficha e voltar | A comparação desaparece | “Perdi o conjunto que estava avaliando.” | Observado |
| Salvar e recarregar | Produtos continuam na seleção | “Posso interromper a pesquisa.” | Observado |
| Preencher briefing e buscar mais produtos | Os produtos ficam; nome e observações voltam vazios | “Meu trabalho de explicar a campanha foi perdido.” | Observado |
| Falha no envio | Dados permanecem e aparece uma mensagem | “Consigo tentar de novo.” | Simulado |
| Sucesso no envio | Protocolo e acesso ao histórico | “Recebi uma confirmação, mas falta saber quando terei retorno.” | Simulado |
| Planejar Dia do Cliente | Data, conceito, antecedência, favoritos e arquivo de calendário | “Há algo útil para levar ao meu planejamento.” | Observado |
| Ir da data para produtos | Chego a uma busca por mochila premium, sem a ocasião | “A ideia da campanha ficou para trás.” | Observado |
| Consultar histórico | Cards, status, detalhes e propostas | “A base para relacionamento recorrente existe.” | Simulado |
| Abrir endereço inexistente | Página técnica da Vercel | “Saí da experiência da marca.” | Observado |

## 5. Navegação global, identidade e linguagem

**O que funciona.** O logo está presente, as áreas principais aparecem no menu e o contador de itens dá retorno imediato. O menu móvel reúne busca, produtos, catálogos, datas e histórico. O acesso não é exigido para começar. A hierarquia de cor e contraste cria uma identidade própria.

**Onde preciso pensar demais.** “Radar”, “saves”, “moodboard”, “briefing”, “curadoria”, “drop” e “matchs” aparecem como vocabulário de operação. Uma pessoa de marketing pode conhecer esses termos, mas precisa aprender quais deles representam a mesma coisa no site. “Meus saves” e “Meus orçamentos” são próximos visualmente, porém guardam estados diferentes: seleção ainda não enviada e solicitações já registradas.

No celular, o cabeçalho reduz a seleção a um ícone com contador. É econômico em espaço, mas exige reconhecer sua função. A busca global fica dentro do menu; na home, a busca principal aparece abaixo da primeira tela medida.

**Minha preferência:** manter a voz criativa nos títulos e adotar rótulos mais literais nas tarefas. Exemplos: “Minha seleção”, “Solicitar orçamento”, “Meus orçamentos” e “Novidades”. “Moodboard” pode continuar como explicação editorial, sem ser obrigatório para compreender o fluxo.

**Evolução indicada:** hierarquia consistente de ações, explicação breve de onde os itens são guardados e acesso mais direto à pesquisa no celular. Preservar as cores e a personalidade; reduzir a quantidade de traduções mentais.

## 6. Home: boa primeira impressão, demonstração do produto tardia

A abertura comunica campanha, criatividade e uso de brindes em contexto. A fotografia dá escala humana aos objetos. O título é memorável, e “Montar minha seleção” funciona como próximo passo.

O efeito de abertura não impediu a leitura no cenário de movimento reduzido: os oito elementos testados ficaram visíveis e sem transformação. A proposta de consulta sem pagamento também está explícita.

O problema é a distribuição do conteúdo. A home mede aproximadamente **10.257 px no desktop e 13.361 px no mobile**. Na largura de 390 px, o título “Drop da vez”, que introduz a vitrine de produtos, aparece por volta de **6.359 px** do topo. Antes disso estão abertura, questionário, chamada de catálogos, manifesto e categorias.

> “Eu gosto da direção criativa. Agora quero ver rapidamente o que vocês conseguem entregar.”

As frases “Entender para atender”, “Excelência em cada detalhe”, “Conectando Marcas e Pessoas” e “Encantar pessoas, somos bons nisso!” estão presentes. Elas funcionam como posicionamento, mas a home repete explicações sobre contexto, intenção e curadoria em vários blocos. A promessa é reforçada mais vezes do que demonstrada por trabalhos concretos.

Os módulos por ocasião são boas portas de entrada. Entretanto, se conduzem a recortes amplos e pouco distintos, o ganho editorial se perde no catálogo.

**Evolução indicada:** antecipar uma pequena seleção real, inserir prova visual de campanhas executadas quando houver material autorizado e encurtar blocos repetitivos. Reposicionar as frases, não eliminá-las. O CTA “Ver o drop da vez” já oferece um atalho útil e deve continuar funcionando.

Evidências: [desktop](audits/marketing-20260909/desktop-home-top.png), [mobile](audits/marketing-20260909/mobile-home-top.png).

## 7. “Ache pelo briefing”: a melhor promessa, com continuidade incompleta

As quatro dimensões — momento, público, escala e clima — fazem sentido para o comprador. Posso pular etapas, voltar, recomeçar e ver resultados sem cadastro. No percurso móvel escolhi onboarding, colaboradores, 51–200 pessoas e premium. O catálogo recebeu esses parâmetros e mostrou os filtros aplicados.

**O que me frustra:** o resultado exibiu **978 produtos**. A interpretação de “premium para onboarding” ainda é ampla; a implementação usa sinais como kit, destaque, material, cor e limite de quantidade mínima. Não há evidência de uma seleção editorial específica de produtos premium para aquele contexto.

Ao salvar um item e ir ao orçamento, as observações ficaram vazias e a quantidade começou em 100. Uma faixa de pessoas não deve virar automaticamente uma quantidade exata sem confirmação, mas o site poderia lembrar o que já foi informado e pedir o refinamento.

> “Eu respondi quatro perguntas esperando que vocês carregassem a conversa adiante.”

**Evolução indicada:** mostrar uma recomendação inicial mais curta, explicar por que cada grupo combina com a campanha, manter acesso ao catálogo completo e transportar um resumo editável das respostas para o briefing. Diferenciar “filtros sugeridos” de uma curadoria individualizada.

## 8. Catálogo e busca: abrangência boa, dois defeitos e relevância irregular

O catálogo exibiu 7.524 produtos, filtros por categoria e atributos, ordenação e paginação. Os cards oferecem acesso à ficha, comparação, seleção e informação mínima disponível. Não encontrei preço fictício ou promessa de estoque na interface examinada.

### 8.1 Caixa vazia bloqueando os atalhos — observado

Existe uma faixa branca vazia logo abaixo da busca. Ela aparece no desktop e no celular. Não é apenas um detalhe estético: a lista de autocomplete permanece com `display: grid` mesmo sem a classe de abertura e intercepta o clique em “camiseta”.

A tentativa de clique convencional falhou porque o elemento `search-suggestions` recebia o ponteiro. A inspeção dos estilos encontrou sobreposição entre a regra genérica `.catalog-search > div` e a regra de ocultação da lista. Isso explica por que uma verificação automática de contraste não acusou o defeito: o problema é de apresentação e interação.

**Impacto:** atalhos parecem inexistentes ou não respondem. **Prioridade:** alta.

Evidências: [desktop](audits/marketing-20260909/desktop-catalogo-top.png), [mobile](audits/marketing-20260909/mobile-catalogo-top.png).

### 8.2 “Novos drops” indisponível — observado

O acesso a `/catalogo?perfil=novos` retornou **HTTP 400, código PGRST100**, em navegação desktop, mobile e repetição separada. A montagem do filtro de novidades é rejeitada pelo serviço de consulta.

O usuário vê “O catálogo fez uma pausa” seguido de texto técnico em inglês sobre interpretação da consulta. “Tentar novamente” não resolve uma consulta determinística inválida. O problema também afeta entradas da biblioteca e do menu que apontam para esse mesmo filtro.

**Impacto:** uma seção comercial anunciada fica inutilizável e expõe linguagem interna. **Prioridade:** alta. É um defeito de integração da consulta; esta auditoria não encontrou motivo para atribuí-lo à falta de produtos ou sugerir uma migration.

Evidência: [erro reproduzido](audits/marketing-20260909/novidades-erro-reproduzido.png).

### 8.3 Sinônimos ajudam; intenção ainda se dilui

“Squeeze” e “garrafa” retornaram os mesmos 996 resultados: uma equivalência útil. “Squese” retornou zero, sem uma correção específica. “Kit onboarding” trouxe 1.250 produtos, incluindo conjuntos de cozinha e churrasco nas primeiras posições. A ampliação de onboarding para kit explica parte desse efeito.

> “Não preciso que a busca adivinhe tudo. Preciso que as primeiras opções façam sentido e que ela me ajude quando eu escrevo errado.”

A ordenação “Curadoria Promo” prioriza destaques e outros sinais, com desempate por nome. Isso pode colocar produtos alfabeticamente antes de itens mais pertinentes à campanha. Na visita de setembro, “Agenda diária 2026” foi a primeira referência do catálogo; não está necessariamente errada para toda compra, mas não demonstra por si uma seleção atual para os próximos meses.

**Evolução indicada:** intenção específica antes da expansão ampla, correção de digitação, explicação da busca ampliada, variedade nas primeiras posições e recortes de campanha com seleção editorial real. Preservar consulta aos demais produtos.

## 9. Superfiltro, ordenação e paginação

O filtro reúne uma taxonomia extensa, busca de categoria, cores, materiais, personalização e embalagem. A combinação móvel **vermelho + plástico** produziu **410 resultados**, foi registrada na URL e permaneceu depois do recarregamento. O painel devolveu o foco ao botão que o abriu.

Isso é funcionalmente valioso: posso compartilhar um recorte reproduzível e refinar a pesquisa sem depender de cadastro.

O esforço visual é alto. Há muitas categorias, nomes longos e termos herdados de cadastro, como “Esportes & Aventura & Lazer & Viagem”. Os filtros fazem sentido individualmente, mas a pessoa precisa decidir quais são relevantes antes de ver uma recomendação.

No mobile, a primeira página de 24 produtos ocupa cerca de **18.765 px**, incluindo os demais elementos. Chegar à próxima página demanda um percurso longo. O topo também dedica bastante área a título e explicação antes dos resultados.

**Evolução indicada:** compactar o cabeçalho funcional, agrupar categorias com rótulos de comprador, tornar filtros principais mais fáceis de alcançar e avaliar densidade dos cards sem sacrificar texto e toque. “Carregar mais”, paginação e retorno à posição anterior devem ser comparados com usuários; rolagem infinita não é uma solução automática.

Evidência: [painel móvel](audits/marketing-20260909/mobile-filtros-viewport.png).

## 10. Cards, badges e kits

O card mostra foto, nome, código, breve descrição, quantidade mínima quando conhecida, número de cores e ação de salvar. A regra de um badge por card mantém a imagem limpa. Quando a quantidade não é conhecida, “Quantidade a confirmar” é mais honesto do que inventar um mínimo.

Minha dificuldade é comparar qualidades práticas. Os cards frequentemente parecem variações do mesmo componente com textos longos, sem dizer rapidamente “por que escolher este”. Alguns dados ainda exigem abrir ficha ou falar com atendimento.

A seção “Kits & onboarding” reúne kits, mas o rótulo combina duas intenções diferentes. Um kit de cozinha ou de pintura pode ser adequado a uma campanha específica; não é automaticamente um kit de boas-vindas ao trabalho. No percurso guiado também apareceram kits de canetinhas.

**Evolução indicada:** manter o badge único e separar o fato “é um kit” da recomendação “serve para onboarding”. Exibir composição e contexto de uso quando confirmados. Investir na qualidade da primeira seleção em vez de acrescentar badges promocionais.

## 11. Ficha do produto: ótima base visual, informação precisa de revisão

Ficha examinada em profundidade: **Agenda diária 2026, código 02469**.

**Pontos positivos:** imagem grande, sete miniaturas disponíveis, cor identificada por texto, quantidade editável, mínimo explícito de dez unidades, botão de salvar evidente, compartilhamento individual, informações de material/dimensões/peso/embalagem e perguntas sobre personalização.

**Problemas observados:**

- O resumo termina abruptamente em “Personalizável com lo”. Na ficha, isso parece conteúdo incompleto, não um resumo deliberado.
- A descrição fala em capa de PU; o campo estruturado “Material” mostra “Cartão”. As duas informações podem se referir a partes distintas, mas a interface não explica essa relação.
- A descrição menciona variedade de cores, enquanto a seleção mostrada apresenta apenas preto. Não há indicação de se tratar de outras opções sob consulta.
- O texto longo mistura especificação e promessa de marketing, como “mais de 365 dias de exposição”, pouco esclarecedora para uma agenda de ano determinado consultada em setembro.
- Não identifiquei controle de zoom/ampliação na galeria. Para conferir acabamento e área da marca, isso faria falta.
- Não há uma simulação visual da marca nem envio de arte nesse ponto. A FAQ orienta a contar a necessidade no briefing, o que é coerente, mas deixa a validação visual para fora da experiência.

> “Gostei do produto. Agora preciso de uma ficha confiável para defender essa escolha para outra pessoa.”

**Evolução indicada:** revisar os dados apresentados, separar especificação de descrição editorial, explicar partes do material, expor técnica/área de personalização apenas quando conhecidas e oferecer ampliação da foto. A origem de cada correção de dados precisa ser respeitada; não recomendo editar o sistema interno indiscriminadamente.

Evidência: [ficha desktop](audits/marketing-20260909/desktop-produto-top.png).

## 12. Comparação: útil, mas ainda pouco robusta para decisão

Consegui selecionar três produtos; o quarto foi desabilitado. A tabela compara quantidade mínima, personalização, cores e materiais. No celular, o painel pode ser expandido e a tabela permanece dentro do componente.

**Defeito de continuidade:** abri uma ficha e usei voltar; a comparação deixou de existir. O estado está restrito à página do catálogo. Esse é justamente o momento em que comparar deveria ajudar: alternar entre detalhes e visão conjunta.

As linhas de personalização são muito parecidas e vários campos dizem “a confirmar”. Para uma apresentação, ainda faltam diferenças como capacidade, dimensões, embalagem e finalidade sugerida, quando disponíveis.

Também não identifiquei compartilhamento da comparação como conjunto. O usuário pode compartilhar produtos isolados, mas precisa recompor o raciocínio para o time.

**Evolução indicada:** preservar a comparação durante a sessão, permitir salvar seus itens sem desmontá-la e oferecer um resumo compartilhável. Usar apenas atributos confirmados e declarar ausências.

Evidências: [desktop](audits/marketing-20260909/desktop-comparacao.png), [mobile](audits/marketing-20260909/mobile-comparacao-viewport.png).

## 13. Seleção, favoritos e impressão

Salvar abre um painel com produtos, quantidades e caminho para o briefing. A seleção permaneceu depois do recarregamento. O usuário pode ajustar quantidades e remover itens. A exportação por impressão produz uma seleção com identificação da Promo, produto, código e quantidade.

Há três oportunidades importantes:

1. **“Limpar tudo” é imediato.** Na reprodução, o item desapareceu sem uma segunda confirmação e sem opção de desfazer. O painel que continua aberto é o próprio painel da seleção, não uma confirmação de exclusão.
2. **Um único conjunto de produtos.** Não há organização visível por campanha, alternativas A/B ou seleção específica para cada cliente. Isso limita o uso por quem gerencia mais de um projeto.
3. **Compartilhamento incompleto do conjunto.** Imprimir é útil, mas um PDF é uma fotografia do trabalho; não oferece revisão colaborativa, comentários ou continuidade em outro dispositivo.

O termo “moodboard” promete uma dimensão visual e organizacional maior do que a lista atual entrega. Renomear para “seleção” é uma correção de expectativa; evoluir para coleções nomeadas é uma melhoria de produto.

**Evolução indicada:** desfazer remoções, proteção ao limpar uma seleção, nome da campanha e resumo compartilhável. Distinguir claramente seleção local de histórico vinculado à conta.

Evidências: [painel móvel](audits/marketing-20260909/mobile-selecao-viewport.png), [PDF gerado na auditoria](audits/marketing-20260909/selecao-impressao.pdf).

## 14. Orçamento: estrutura clara, rascunho perdido

O formulário organiza produtos e briefing em duas etapas visuais. Pede nome, empresa, e-mail e telefone; cidade, prazo e contexto são opcionais. Indica ausência de compromisso comercial e oferece impressão. Ao tentar enviar vazio, mostrou cinco erros e posicionou o foco no nome.

**O maior problema desse fluxo foi reproduzido assim:**

1. Salvei um produto e abri `/orcamento`.
2. Preenchi nome, empresa, e-mail, telefone e observações.
3. Usei “Salvar mais produtos”.
4. Voltei ao orçamento.
5. O produto continuava salvo; nome e observações estavam vazios.

> “Sair para complementar a seleção é uma ação normal. Eu não esperava perder o que já tinha escrito.”

A navegação incentiva uma operação que elimina o rascunho do formulário. Isso merece prioridade alta. Qualquer persistência futura deve definir duração e informação armazenada, com cuidado especial para campos pessoais; não basta guardar tudo indefinidamente.

Outras lacunas: não há resumo da ocasião/questionário, campo próprio de verba, preferência de canal, espaço específico para aplicação da marca ou anexo. O campo de 800 caracteres pode absorver parte disso, mas obriga a pessoa a lembrar quais detalhes informar. “E-mail corporativo” também pode afastar freelancers que atendem marcas e usam outro endereço, embora a validação não exija domínio empresarial.

**Evolução indicada:** preservar rascunho durante a sessão, incorporar contexto anterior, oferecer perguntas opcionais úteis e informar o prazo de primeiro retorno quando comercialmente definido. Não transformar o formulário em um cadastro longo.

## 15. Confirmação, falhas e expectativa de retorno

Em uma resposta de erro simulada, o formulário exibiu a mensagem e manteve os dados. Em sucesso simulado, mostrou protocolo, explicação sobre a análise e acesso ao histórico. Também orientou usar o mesmo e-mail do briefing. São decisões boas.

O que eu ainda quero saber: “Recebi uma cópia?”, “Em quanto tempo alguém me responde?”, “Quem cuida disso?” e “O que faço se o prazo é urgente?”. A confirmação atual não apresenta essas respostas.

**Sobre e-mail e WhatsApp:** esta auditoria não comprovou entregas reais. Na versão examinada, o handler persiste a solicitação e devolve o protocolo; a tabela de notificações é descrita na migration como preparada para entregas futuras. Não encontrei nesse fluxo do repositório um disparador completo de cópia ao cliente. Uma integração externa não inspecionada pode existir, por isso não afirmo que nenhuma mensagem seja enviada por qualquer sistema. A conclusão correta é: **a entrega automática precisa de comprovação própria; não deve ser anunciada como validada por este teste de interface.**

**Evolução indicada:** resumo após envio, canal esperado e prazo real de retorno; ao implementar cópias, validar recebimento, duplicidade, falha e recuperação. E-mail de autenticação e e-mail de cópia do orçamento são funções diferentes.

Evidência: [confirmação simulada](audits/marketing-20260909/desktop-orcamento-sucesso-simulado.png).

## 16. Biblioteca de catálogos

A página tem uma composição editorial forte e dez coleções. Os temas e descrições ajudam a começar por uma intenção; busca, filtros e estado vazio estão presentes. O filtro “Linhas de produto” apresentou as coleções Novos drops, Tech que resolve e Kits prontos para combinar. O compartilhamento copiou o destino da coleção para a área de transferência.

Os dez registros atuais são **coleções online**. O componente prevê PDF e revista digital, mas não há uma publicação desses formatos na amostra atual. A interface identifica o formato e informa que materiais fechados aparecerão quando disponíveis.

> “As capas me dão vontade de abrir. Quero que o conteúdo cumpra a promessa daquela capa.”

Ao abrir, chego a filtros do catálogo. Isso é legítimo para uma coleção online, mas ainda fica aquém da expectativa de um material editorial com seleção enxuta, combinações e justificativa. O nome “catálogo”, as capas e o texto podem criar uma expectativa de revista ou PDF mesmo com a identificação existente.

A página mede cerca de 13.380 px no mobile para dez coleções. As capas ocupam bastante espaço e não mostram produtos reais que eu encontrarei em cada seleção.

**Evolução indicada:** colocar uma pequena prévia de produtos e tornar explícito “coleção online” no CTA. Quando houver PDF, informar edição, data e tamanho. Uma opção compacta de navegação ajudaria a comparar coleções.

Evidência: [abertura da biblioteca](audits/marketing-20260909/desktop-catalogos-top.png).

## 17. Datas comemorativas: potencial real de retorno recorrente

A agenda traz 33 ocasiões, busca, públicos, meses, dois anos, lista/calendário, favoritos, fontes e detalhes. Consegui salvar Dia do Cliente, recarregar e reencontrar a data. Também exportei o arquivo `.ics` e alternei para 2027.

O painel combina conceito, público e sugestão de antecedência. É útil para uma pessoa de marketing planejar, não só procurar um item. O arquivo de calendário é um resultado concreto que sai do site e entra no trabalho do usuário.

Há quatro pontos de atenção:

- **A entrada padrão lista o ano inteiro a partir de janeiro.** Em setembro, o primeiro item da lista era Ano Novo já passado. O hero mostra a próxima data, mas a navegação principal ainda começa no passado.
- **A próxima data não é necessariamente a próxima oportunidade viável.** Dia do Cliente estava a seis dias, enquanto a janela sugerida era de cinco a oito semanas. “Consulte a viabilidade agora” é honesto; faltaria também uma recomendação para planejar com folga.
- **Lista muito extensa.** A página anual mediu 22.570 px no celular. “Minhas datas” fica depois dos 33 cards, distante do momento em que salvei.
- **Perda de contexto.** Ao explorar uma ideia de Dia do Cliente, fui para `/catalogo?q=mochila%20premium`. A ocasião e sua data não chegaram ao catálogo ou briefing.

No calendário móvel, o componente tem 358 px visíveis para 760 px de conteúdo. A rolagem horizontal ficou dentro dele; não houve estouro da página. Ainda assim, dias e eventos podem ficar fora do campo visível. A lista compacta é uma alternativa melhor para leitura rápida em tela pequena.

**Evolução indicada:** abrir nas próximas oportunidades, destacar também a janela de planejamento, dar acesso rápido às datas salvas, transportar a ocasião até o orçamento e manter opção de ano inteiro. Campanhas de causa merecem orientação editorial de pertinência; um brinde não substitui uma ação coerente da marca.

Evidências: [painel da data](audits/marketing-20260909/desktop-data-detalhe.png), [calendário móvel](audits/marketing-20260909/mobile-calendario-viewport.png), [arquivo exportado](audits/marketing-20260909/dia-cliente.ics).

## 18. “Como funciona” e confiança comercial

A página explica descoberta, briefing, curadoria e personalização. Os princípios de utilidade, coerência e experiência estão alinhados à marca. O processo é compreensível e não apresenta a solicitação como uma compra.

Ela, entretanto, fala mais sobre a filosofia de atendimento do que sobre evidências do atendimento. Não encontrei nessa página exemplos concretos de campanhas, apresentação do time, bastidores identificados ou explicação operacional suficiente sobre amostras, aprovação e entrega.

> “Entendi o discurso. Quero enxergar quem vai fazer isso acontecer e como será a colaboração.”

A marca pode ganhar confiança com trabalhos reais autorizados, fotos de personalização, exemplos de prova digital, identificação comercial verificável e um processo de aprovação. Não recomendo inventar cases, números de clientes, prazos ou depoimentos para preencher esses espaços.

## 19. Contato: convite bom, espaço de conversa curto demais

Telefone e e-mail são clicáveis; a localização é apresentada como São Paulo. O formulário tem nome, e-mail, telefone opcional e aceite. Validação vazia mostrou erros e foco no primeiro campo. A exigência inicial é pequena.

Porém, o convite diz para trazer intenção, prazo e verba, e o formulário **não tem campo de mensagem**. Se ainda não escolhi produtos e quero explicar uma campanha, preciso enviar somente meus dados e esperar outra interação ou usar meu aplicativo de e-mail.

Também não encontrei um link direto de WhatsApp na navegação inspecionada, apenas referência ao canal nos campos e textos. “Catálogo sempre disponível” não esclarece horário de atendimento. O e-mail com prefixo `adm01` pode parecer operacional, em vez de um canal dedicado a campanhas; isso é percepção, não problema de funcionamento.

**Evolução indicada:** mensagem curta opcional, preferência de contato e horário/prazo de resposta aprovado pelo time. Se houver WhatsApp comercial oficial, oferecer o acesso com número verificado. Localização e alcance de atendimento devem ser esclarecidos com informação real.

## 20. Login, cadastro e recuperação

O acesso por link/código reduz a obrigação de criar senha. A alternativa de senha está disponível, e o site explica que o primeiro orçamento não exige cadastro. Rotas protegidas redirecionaram corretamente para o acesso; a confirmação sem credencial válida apresentou uma saída para tentar novamente.

No modo de senha, não identifiquei botão para mostrar/ocultar a digitação. A mensagem de erro para um e-mail malformado foi genérica: “Não conseguimos concluir o acesso agora. Tente novamente.” O teste isolado não chegou ao endpoint interceptado; o que importa para o usuário é que o campo não recebeu orientação específica de correção.

A opção de cadastro e recuperação mantém a identidade visual. O usuário, entretanto, ainda precisa entender a diferença entre receber link, digitar código, criar senha e recuperar senha. A microcopy “link e, quando disponível, um código” merece alinhar-se ao conteúdo efetivamente enviado pelo serviço.

**Evolução indicada:** mensagens específicas no campo, mostrar senha, instrução clara após solicitar acesso e uma forma evidente de corrigir o e-mail. Entrega e expiração reais de link/código não foram testadas nesta auditoria.

## 21. Minha conta, orçamento recebido, proposta e nova senha

**Avaliação desta seção feita em simulação**, com uma conta e solicitação fictícias dentro do navegador.

### Histórico

O histórico oferece empresa, protocolo, status, quantidade, data e produtos, além de busca e filtro. É uma base boa para reutilização. Como usuária, eu procuraria pelo nome da campanha, não só pela empresa. Vários orçamentos da mesma organização tenderiam a ficar visualmente parecidos.

**Evolução:** título de campanha, miniaturas de produtos, última movimentação e próximo passo. Acesso a outra empresa ou compartilhamento com colegas precisa de modelo de permissão próprio; não deve ser inferido apenas pelo domínio de e-mail.

### Detalhe da solicitação

O detalhe separa seleção enviada, briefing, propostas e linha do tempo. O registro original permanece visível, o que reduz dúvidas sobre o que foi solicitado. A ideia de proposta versionada é adequada a uma compra consultiva.

Faltam ações evidentes para esclarecer uma dúvida sobre aquela solicitação, pedir um ajuste e entender quando devo agir. “Curadoria em andamento” informa estado, mas não necessariamente responsável ou expectativa de retorno.

### Propostas

Simulei uma falha ao abrir a proposta: a interface apresentou mensagem recuperável. Não validei um PDF comercial real, sua correção, validade ou entrega. Há apresentação de versão e validade quando fornecidas. A avaliação operacional desse módulo precisa incluir o processo pelo qual o time publica e atualiza propostas.

### Solicitar novamente

A confirmação antes de substituir a seleção atual é uma boa proteção, reproduzida em desktop e mobile. Esse cuidado deveria orientar também o comportamento de “Limpar tudo”. Repetir um orçamento deve lembrar que quantidade, disponibilidade e condições comerciais precisam de nova confirmação; não significa reaproveitar automaticamente a proposta anterior.

### Definir senha

O formulário de nova senha e confirmação apareceu no contexto autenticado simulado. É simples, mas pode apresentar melhor os requisitos e permitir visualizar a digitação. O ciclo real de envio de recuperação, consumo de link e alteração de senha não foi executado.

Evidências: [histórico simulado](audits/marketing-20260909/desktop-portal-simulado.png), [detalhe simulado](audits/marketing-20260909/desktop-solicitacao-simulada.png).

## 22. Privacidade, rodapé e redes sociais

O aviso de privacidade é dividido por assunto e explica seleção local, área do cliente e métricas. Isso melhora a transparência. Como leitora, eu valorizaria também clareza sobre favoritos de datas e como remover cada tipo de informação guardada no navegador.

Esta é uma avaliação de compreensão e coerência da interface, não um parecer jurídico. O texto sobre notificações deve acompanhar o estado operacional efetivamente verificado.

Os quatro ícones sociais — Instagram, Facebook, Pinterest e YouTube — estão presentes, com nomes acessíveis e links externos identificáveis. Examinei esses destinos no código e nos links renderizados; não certifiquei a titularidade, atualização do conteúdo ou funcionamento de cada plataforma após login externo.

O rodapé oferece rotas úteis, mas fica muito distante em páginas longas. Redes sociais podem contribuir mais para confiança quando uma amostra real e autorizada de trabalho aparece durante a descoberta. Os ícones sozinhos não demonstram a qualidade das campanhas.

Também existe oportunidade de reforçar identificação comercial e domínio próprio no lançamento definitivo. O endereço atual da Vercel é funcional; como comprador de uma empresa, eu reconheceria mais facilmente um endereço alinhado à marca.

## 23. Erros, estados vazios e saída de becos sem saída

Os estados de seleção vazia, biblioteca sem resultado e confirmação de acesso inválida oferecem próximos passos. Isso é positivo.

Há duas inconsistências importantes:

- Um produto inexistente mostra “O catálogo fez uma pausa” junto de “Não encontramos este produto”. Ausência definitiva e indisponibilidade temporária não deveriam usar a mesma abertura: a pessoa precisa saber se deve esperar, corrigir endereço ou escolher outra referência.
- Abrir diretamente uma rota desconhecida retornou **404 da Vercel, em inglês, sem navegação da Promo**. O aplicativo tem uma página de não encontrado, mas a regra de hospedagem não a apresentou nessa entrada direta.

**Evolução indicada:** mensagens adequadas a cada causa, saída para busca/catálogo e página de erro com identidade da marca. Mensagens internas de serviço devem ficar na observabilidade, não no texto mostrado ao comprador.

Evidência: [404 em produção](audits/marketing-20260909/mobile-404-top.png).

## 24. Compartilhamento social e apresentação para o time

Compartilhar o produto individual e copiar o link da coleção funcionam como ações de interface. Entretanto, a primeira resposta HTML da home, de uma ficha de produto e da agenda contém **o mesmo título, descrição e imagem Open Graph da home**. O título correto aparece depois da execução do aplicativo no navegador.

**Inferência sustentada por essa resposta:** serviços de prévia que dependem do HTML inicial podem mostrar o cartão genérico, em vez da foto e nome da referência. Não enviei links a contatos para validar a aparência no WhatsApp; cada plataforma pode ter cache e regras próprias.

> “Se eu mando uma mochila para aprovação, quero que o link pareça uma mochila, não a página inicial da empresa.”

**Evolução indicada:** metadados por rota já na resposta inicial, com foto/nome reais e previews específicos de coleções/datas. Depois, verificar a renderização nos canais usados pelos compradores. Complementar com um link de seleção nomeada e permissões claras.

## 25. Acessibilidade, conforto e velocidade percebida

As nove verificações automáticas executadas nesta auditoria não reportaram violações para o conjunto de regras selecionado: cinco páginas no desktop e quatro no mobile. Testei também movimento reduzido, foco ao fechar filtros e `Esc` no detalhe da data. São qualidades a preservar.

Isso **não certifica conformidade integral** nem qualidade de todas as interações. A caixa vazia bloqueando atalhos é um exemplo de defeito real que passou por essa verificação. Tampouco todos os estados de diálogo, leitor de tela, dispositivos físicos, Safari e Firefox foram examinados.

Encontrei textos auxiliares próximos de 10–11 px. Isso não é, isoladamente, uma violação automática, mas aumenta o esforço em telas pequenas. Grandes títulos convivem com detalhes comerciais muito pequenos; eu daria mais espaço relativo às informações que ajudam a escolher.

As referências WCAG 2.2 reforçam aspectos relevantes a esta jornada: foco não encoberto, tamanho de alvos, ajuda consistente, evitar entrada redundante e autenticação acessível. Usei essas dimensões como orientação; não atribuí uma infração formal sem avaliação específica do critério. [Referência W3C](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)

### Dimensão física das páginas observadas

| Página | Altura desktop | Altura mobile | Leitura da experiência |
|---|---:|---:|---|
| Home | 10.257 px | 13.361 px | Muito conteúdo de posicionamento antes da vitrine |
| Catálogo, 24 produtos | 5.492 px | 18.765 px | Refinar cedo é importante; próxima página fica distante |
| Biblioteca, 10 coleções | 6.842 px | 13.380 px | Capas atraentes, comparação entre coleções custosa |
| Agenda, 33 ocasiões | 11.848 px | 22.570 px | Entrada anual extensa; favoritos no fim |
| Produto amostrado | 4.136 px | 7.998 px | Foto e informação detalhada exigem rolagem |
| Como funciona | 3.259 px | 4.870 px | Boa oportunidade de trocar repetição por prova |
| Contato | 3.488 px | 4.399 px | Formulário poderia ser alcançado mais cedo |

As alturas incluem cabeçalho e rodapé. Uma página longa não é automaticamente ruim. O problema é quando o comprimento atrasa a tarefa, repete uma explicação ou esconde a ação seguinte. Não encontrei overflow horizontal do documento nas 36 visitas; o calendário utiliza rolagem interna.

Não há neste relatório uma medição válida de LCP/INP/CLS em condições reais dos compradores. O atraso funcional observado em novidades é erro de consulta, não evidência de servidor lento.

## 26. Prioridades recomendadas

P1: alta prioridade por bloqueio ou perda de trabalho. P2: impacto relevante na decisão e continuidade. P3: refinamento a validar. Nenhuma das recomendações abaixo foi implementada durante esta auditoria.

| ID | Prioridade | Achado ou oportunidade | Resultado esperado para o usuário |
|---|---|---|---|
| UX-01 | P1 | Novidades retorna consulta inválida | Abrir novidades por todas as entradas e obter produtos ou vazio legítimo |
| UX-02 | P1 | Autocomplete fechado ocupa espaço e intercepta atalhos | Atalhos visíveis e acionáveis por mouse, toque e teclado |
| UX-03 | P1 | Briefing preenchido se perde ao buscar mais produtos | Voltar e continuar do ponto em que parou |
| UX-04 | P1 | Erro técnico do catálogo exposto ao comprador | Entender o problema e ter uma alternativa útil |
| UX-05 | P2 | Questionário e ocasião não chegam ao briefing | Revisar um resumo existente, sem repetir toda a campanha |
| UX-06 | P2 | Comparação desaparece ao visitar ficha | Investigar detalhes e continuar comparando |
| UX-07 | P2 | Busca onboarding produz opções genéricas cedo | Primeiras posições coerentes com a intenção expressa |
| UX-08 | P2 | Limpar seleção sem desfazer | Recuperar-se de uma remoção acidental |
| UX-09 | P2 | Descrições incompletas e atributos sem contexto | Defender a escolha com informação confiável |
| UX-10 | P2 | Falta prazo/canal esperado após solicitação | Saber quando e como acompanhar |
| UX-11 | P2 | Cópia automática não comprovada no fluxo auditado | Receber confirmação verificável quando o recurso for anunciado |
| UX-12 | P2 | Formulário de contato sem mensagem | Explicar uma necessidade mesmo sem escolher produto |
| UX-13 | P2 | Prévia social recebe HTML genérico | Compartilhar referência reconhecível por foto e nome |
| UX-14 | P2 | Endereço desconhecido cai no erro da hospedagem | Recuperar a navegação dentro da marca |
| UX-15 | P2 | Home mostra produtos tarde | Ver exemplos reais sem percorrer o manifesto inteiro |
| UX-16 | P2 | Agenda anual começa no passado | Encontrar oportunidades futuras e viáveis logo na entrada |
| UX-17 | P2 | Salvos/seleções limitados ao dispositivo | Entender esse limite e retomar campanhas quando houver sincronização |
| UX-18 | P2 | Falta prova de execução e identificação do atendimento | Confiar na capacidade de entrega |
| UX-19 | P3 | Rótulos numerosos para etapas semelhantes | Compreender seleção, orçamento e histórico sem aprender um vocabulário |
| UX-20 | P3 | Login com erros genéricos e sem mostrar senha | Corrigir a entrada com menos tentativas |
| UX-21 | P3 | Comparação com poucos atributos decisórios | Avaliar diferenças relevantes sem várias abas |
| UX-22 | P3 | Coleções sem prévia concreta dos produtos | Saber o que vou encontrar antes de abrir |
| UX-23 | P3 | Calendário móvel largo e favoritos distantes | Planejar e revisar datas com menos deslocamento |
| UX-24 | P3 | Textos auxiliares pequenos | Ler códigos, materiais e ajuda confortavelmente |
| UX-25 | P3 | Histórico sem nome de campanha | Distinguir várias solicitações da mesma empresa |
| UX-26 | P3 | Galeria sem ampliação | Conferir textura, detalhes e área de marca |
| UX-27 | P3 | Digitação aproximada não recebe ajuda | Recuperar buscas como “squese” |
| UX-28 | P3 | Formulário não captura verba/prioridades de forma guiada | Informar limites sem esperar preço público |

### Ordem de execução que eu adotaria

**Primeiro:** corrigir os quatro P1, reproduzir com dados reais e proteger essas regressões. Na falha de novidades, não basta testar uma string contra outra string esperada: a consulta precisa ser aceita pelo serviço real ou por um teste de contrato equivalente.

**Depois:** preservar o contexto entre descoberta, seleção e briefing; melhorar relevância de onboarding e continuidade da comparação. Esse conjunto é o que mais aproxima a promessa de curadoria da experiência entregue.

**Em seguida:** clareza de retorno, contato, prova comercial, ficha de produto e compartilhamento. Esses pontos aumentam a capacidade de apresentar uma escolha e confiar no atendimento.

**Por fim:** reduzir repetição visual, refinar densidade e evoluir coleções/agenda com testes de compradores. Não colocaria novos efeitos de animação à frente dessas etapas.

## 27. Como validar a experiência com pessoas reais

O próximo passo de pesquisa é observar compradores, não apenas perguntar se gostaram do layout. Sugiro sessões com analistas de marketing, profissionais de eventos e pessoas de RH/people que compram brindes, incluindo usuários da faixa etária desejada e diferentes níveis de experiência.

Tarefas propostas:

1. Encontrar três alternativas para onboarding de 150 pessoas.
2. Comparar, abrir fichas e retornar à seleção.
3. Preparar uma versão para apresentar à liderança.
4. Informar contexto, sair para adicionar um produto e continuar.
5. Planejar uma data futura com antecedência adequada.
6. Explicar, com suas palavras, o que acontecerá depois de solicitar orçamento.
7. Retomar uma solicitação antiga e pedir uma nova proposta.

Registrar conclusão sem ajuda, pontos de hesitação, retornos, perda de dados, entendimento de preço/estoque/prazo e confiança na próxima etapa. As respostas mais úteis serão sobre o que a pessoa conseguiu fazer e o que precisou adivinhar.

Antes de qualquer campanha de tráfego direcionada, os critérios de aceitação mínimos deveriam incluir: novidades funcionando, atalhos acionáveis, rascunho preservado, contexto reaproveitado e mensagens de retorno compreensíveis.

## 28. Parecer final como usuária de marketing

> “A Promo parece ter repertório e vontade de construir uma campanha comigo. Eu gosto da energia visual, de poder pesquisar sem cadastro e de ter um lugar para guardar referências. Mas, quando preciso transformar inspiração em uma decisão apresentável, ainda faço trabalho demais: filtro muita coisa, repito informações e perco contexto ao navegar. Quero sentir que o site acompanha meu projeto até a proposta.”

Eu preservaria a identidade visual, as frases da marca, a liberdade de pesquisa, a lógica de orçamento e a atenção à acessibilidade. O investimento mais importante agora é fazer o site **lembrar o trabalho da pessoa, apresentar escolhas mais pertinentes e explicar o próximo passo**.

## Anexo — evidências e rastreabilidade

Arquivos locais da auditoria:

- [Inventário das 36 visitas](audits/marketing-20260909/page-inventory.json): rotas, textos, links, campos, dimensões, imagens e respostas com erro.
- [Percursos e consultas](audits/marketing-20260909/journeys.json): buscas reais, comparação, produto, briefing e estados simulados de envio. Um registro do rascunho tem `name` vazio porque contém o valor do campo observado; `notes` vazio e `selectionItems: 1` registram a perda do formulário com a seleção preservada.
- [Mobile e portal simulado](audits/marketing-20260909/portal-mobile.json): menu, filtros, questionário, calendário e telas autenticadas fictícias.
- [Verificações complementares](audits/marketing-20260909/final-probes.json): filtros combinados, persistência, biblioteca, acessibilidade móvel e HTML de prévia social.
- [Índice das capturas e limites](audits/marketing-20260909/README.md).

Pontos de código consultados para explicar os achados:

- `src/lib/catalog.ts`: construção do filtro de novidades e ordenação.
- `src/styles.css` e `src/components/SearchAutocomplete.tsx`: exibição do autocomplete e colisão de estilos.
- `src/pages/QuotePage.tsx`: estado do formulário, validação, envio e confirmação.
- `src/pages/CatalogPage.tsx`: comparação e filtros.
- `src/lib/campaignPresets.ts`: transformação de respostas em recortes do catálogo.
- `src/pages/CommemorativeDatesPage.tsx`: favoritos locais e passagem para produtos.
- `src/lib/catalogLibrary.ts`: dez coleções online e seus destinos.
- `src/context/QuoteCartContext.tsx`: seleção, persistência e limpeza.
- `api/_lib/leadHandler.ts`: persistência e resposta da solicitação.
- `site-supabase/supabase/migrations/20260908230000_create_site_lead_storage.sql`: estrutura preparada para auditoria de notificações futuras; o identificador histórico foi normalizado em 15/09/2026 sem reaplicação do SQL.
- `vercel.json`: rotas que chegam ao aplicativo.

Este trabalho produziu documentação e evidências locais. O aplicativo, o GitHub, a hospedagem e os bancos de dados não foram modificados.
