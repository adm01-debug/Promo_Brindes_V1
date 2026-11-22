# Plano de navegação e fluidez em 200 etapas — Promo Brindes V1

Data: 22/11/2026. Base: `main` em `18eebb5704943b58c162630bb9a18a6c0e805948`. Autoria: auditoria de produto e design conduzida nesta sessão.
Estado: **planejado. Nenhuma etapa deste documento foi executada.**

Documento irmão: `docs/PLANO_CORRECOES_190_ETAPAS_20261122.md` (correções técnicas). Quando as duas tratam do mesmo ponto, a referência cruzada está na etapa.

## Método, e o que esta auditoria não fez

Cada dimensão foi auditada por um agente independente que leu o código-fonte e precisou provar cada achado com arquivo, linha e trecho literal. Os achados de duas dimensões passaram por um segundo agente que tentou refutá-los; nessa checagem, **dois achados de uma auditoria técnica paralela caíram e foram corrigidos neste documento**: o login já permite reenviar o acesso (a etapa N-144 foi reescrita para tratar o que realmente falta, que é a visibilidade do reenvio) e o cliente HTTP já trata as mensagens de erro de transporte. Nove achados foram verificados por leitura direta nesta sessão, entre eles os botões sem estilo do back-office (N-101), o menu de celular sem rolagem (N-124), a ausência de manifesto na pasta pública (N-186) e o caminho de reenvio do login.

**O que não foi feito:** nenhuma etapa foi executada; o site não foi operado em produção; não houve teste com usuários, mapa de calor, gravação de sessão nem medição de campo. Onde este plano fala de impacto, é estimativa de design informada pelo código, não resultado medido. O bloco 10 existe justamente porque hoje não há como medir: os indicadores começam sem linha de base, e isso está declarado em N-200.

Mudança visual exige mockup aprovado pelo dono antes do código. As etapas marcadas **[mockup]** não começam pelo código.

## O que foi auditado

Dez dimensões da transição entre telas e funções, cada uma por um agente que leu o código: botão de retorno e histórico; orientação e trilha de navegação; transições, carregamento e feedback; sobreposições (painéis, menus, diálogos) e o botão Voltar do navegador; fluxos de várias etapas, salvar e retomar; busca, filtros e estado na URL; consistência de padrões de interface; acessibilidade da navegação; celular, tablet e gestos; métricas e validação.

O site tem 34 rotas, 19 páginas, 41 componentes e nove sobreposições. A jornada que importa é catálogo → ficha de produto → seleção → briefing → orçamento enviado. Não há preço nem checkout: cada atrito na navegação é um pedido de orçamento que não chega.

## Diagnóstico: o estado da navegação hoje

Cinco fatos medidos no código explicam a maior parte das 200 etapas.

**1. Não existe um padrão de retorno.** Há três posicionamentos e três vocabulários diferentes para a ação de voltar (`src/styles.css:521-535, 1865-1875, 2692, 6276`). Páginas de segundo nível (ideias, catálogos, datas, montar kit, seleção compartilhada) não têm caminho de volta no conteúdo. A trilha de navegação existe só na ficha de produto (`src/pages/ProductPage.tsx:140-142`) e aponta para o catálogo sem filtro, descartando a busca que o visitante acabou de fazer.

**2. Nenhuma sobreposição está ligada ao histórico.** Painel de seleção, menu de celular, painel de filtros e ampliação de foto abrem sem criar entrada no histórico (`src/context/QuoteCartContext.tsx:21`, `src/lib/useCatalogPageState.ts:244`, `src/components/ProductGallery.tsx:7`). No celular, o gesto de voltar fecha a página inteira em vez de fechar o painel, no exato momento em que o visitante está decidindo.

**3. A troca de rota apaga a tela.** O conteúdo é substituído por um bloco de altura de janela inteira (`src/styles.css:1837-1842`, `src/App.tsx:86-88`) e o primeiro desenho da aplicação é uma tela branca, porque o documento entrega apenas o contêiner vazio (`index.html:23`). Não há barra de progresso, o indicador de carregamento é congelado pela preferência de menos movimento (`src/styles.css:3962-3971`), e nenhuma classe de ação tem estado "pressionado" (`src/styles.css:285-287`).

**4. Dados digitados se perdem.** A quantidade digitada no painel de seleção é descartada ao fechar com a tecla de escape ou clique fora (`src/components/QuoteDrawer.tsx:51, 170, 177, 248`). O formulário de contato não tem rascunho nem aviso de saída, ao contrário do briefing. A composição do montar kit é perdida ao ir ao orçamento e voltar (`src/pages/KitBuilderPage.tsx:16, 79-82`).

**5. O retorno depois do login descarta o destino.** Quem entra para anexar um arquivo ao briefing volta para a área do cliente, não para o briefing (`src/components/BriefingAssetUploader.tsx:115`, `src/lib/customerAccount.ts:225-231`).

## Como ler cada etapa

`N-NNN · [impacto · esforço] · título`, seguido de o que é, como fazer (com arquivo e exemplo concreto), o benefício e a referência de boa prática.

Impacto: **alto** muda taxa de conclusão ou evita perda de dado; **médio** reduz atrito percebido; **baixo** polimento. Esforço: S (até meio dia), M (um a três dias), L (mais que isso). A ordem dentro de cada bloco é por impacto sobre esforço.

Etapas marcadas **[mockup]** mudam o visual e exigem mockup aprovado pelo dono antes do código, conforme `docs/agentes/aprovacao-visual-design.md`. Etapas marcadas **[190]** têm uma etapa equivalente no plano técnico; executar uma das duas, não as duas.

## Índice dos blocos

| Bloco | Etapas | Tema |
|---|---|---|
| 1 | N-001 a N-028 | Botão de retorno: onde fica, quando aparece, como se comporta |
| 2 | N-029 a N-050 | Histórico, sobreposições e o botão Voltar do navegador |
| 3 | N-051 a N-074 | Orientação: trilha, menu ativo, títulos, hierarquia |
| 4 | N-075 a N-100 | Transições, carregamento e feedback visual |
| 5 | N-101 a N-118 | Consistência, padrões de interface e micro-interações |
| 6 | N-119 a N-138 | Acessibilidade e inclusão na navegação |
| 7 | N-139 a N-160 | Fluxos de várias etapas: progresso, salvar, retomar, sair |
| 8 | N-161 a N-178 | Busca, filtros, estado na URL e múltiplas abas |
| 9 | N-179 a N-190 | Celular, tablet, gestos e multi-dispositivo |
| 10 | N-191 a N-200 | Métricas, testes e iteração contínua |

---

# Bloco 1 — Botão de retorno (N-001 a N-028)

## A decisão de produto que governa o bloco

Três perguntas do pedido, respondidas com base no código:

**Onde fica?** No cabeçalho da própria página, como primeiro elemento do conteúdo, alinhado à esquerda, em todas as páginas de segundo nível e mais profundas. No celular, o mesmo lugar: o site não tem barra de navegação inferior, e criar uma só para o retorno duplicaria o gesto nativo do sistema. O que falta no celular não é um botão novo, é o gesto de voltar fechar a sobreposição em vez de sair da página (bloco 2).

**Sempre visível ou contextual?** Sempre visível em página de segundo nível. Ausente na home e no catálogo (que são raízes). Em sobreposição, o retorno é o fechar, não um "voltar" extra.

**Como se comporta?** Por rota explícita, nunca por "uma posição atrás no histórico" sozinho. O site recebe tráfego de busca e de links compartilhados: em uma entrada direta na ficha de produto, voltar uma posição leva o visitante para fora do site. A regra adotada é: destino explícito quando a página tem pai claro; origem preservada quando houve navegação interna; e "voltar uma posição" apenas como ação extra nas telas de erro, e só quando existe entrada anterior dentro do site.

### N-001 · [alto · S] · Preservar a origem no link de produto
- **O que é:** o cartão de produto passa a informar de onde o visitante saiu, para que a ficha saiba para onde voltar.
- **Como fazer:** em `src/components/ProductCard.tsx:29, 55`, o link do produto leva no estado de navegação o caminho e a busca atuais. Mesma mudança nos links de produto do painel de seleção (`src/components/QuoteDrawer.tsx:220-224`) e da bandeja de comparação (`src/components/CatalogComparisonTray.tsx:40, 49`).
- **Benefício:** habilita todas as etapas de retorno aos resultados sem tocar em nenhuma página.
- **Referência:** Baymard, "Back to results" em páginas de produto.

### N-002 · [alto · S] · "Voltar aos resultados" na ficha de produto
- **O que é:** a ficha ganha um retorno que reconstrói exatamente a lista de onde o visitante veio, com busca, filtros e página.
- **Como fazer:** em `src/pages/ProductPage.tsx:141`, ler a origem do estado de navegação e renderizar o retorno para ela, com `/catalogo` como destino de reserva quando a entrada foi direta (link compartilhado ou resultado de busca).
- **Benefício:** elimina o reinício da pesquisa no ciclo mais frequente do funil. Hoje a trilha aponta para o catálogo sem filtro.
- **Referência:** NN/g, "Breadcrumbs: 11 design guidelines" (trilha não substitui retorno).

### N-003 · [alto · S] · Componente único de retorno
- **O que é:** um componente que concentra ícone, texto, área de toque e posição do retorno, substituindo os três padrões atuais.
- **Como fazer:** novo `src/components/BackLink.tsx` com destino, destino de reserva e rótulo; usar em `src/pages/QuotePage.tsx:461`, `CustomerQuotePage.tsx:240`, `ProductPage.tsx:140`, `KitBuilderPage.tsx:87`, `SharedSelectionPage.tsx:191`, `IdeaLandingPage.tsx:40`. No estilo, uma classe só, com altura mínima de 44 pixels, substituindo `src/styles.css:521-535, 1865-1875, 2692, 6276`.
- **Benefício:** o visitante aprende uma vez onde fica o retorno e isso vale em todo o site.
- **Referência:** Apple HIG, barras de navegação (retorno sempre no mesmo lugar); WCAG 2.5.8 (tamanho de alvo).
- **[mockup]**

### N-004 · [alto · S] · Allowlist de rotas de retorno depois do login
- **O que é:** o parâmetro de retorno do login passa a aceitar as rotas internas de onde o login é oferecido, não só a área do cliente.
- **Como fazer:** em `src/lib/customerAccount.ts:225-231`, ampliar a validação para uma lista explícita de caminhos internos (orçamento, datas comemorativas, montar kit, além da área do cliente), mantendo a recusa de destino externo.
- **Benefício:** quem entra para anexar um arquivo volta ao briefing que estava preenchendo, em vez de recomeçar.
- **Referência:** OWASP, redirecionamento não validado (lista de permissão de caminhos relativos).
- **[190]** equivalente ao achado de retorno após login.

### N-005 · [alto · S] · Propagar o destino de retorno em todos os convites de login
- **O que é:** todo ponto que manda o visitante para o login passa a informar de onde ele saiu.
- **Como fazer:** em `src/components/BriefingAssetUploader.tsx:115` e `src/pages/CommemorativeDatesPage.tsx:332`, acrescentar o caminho atual ao link de login, como já faz `src/components/CustomerRoute.tsx:13`.
- **Benefício:** completa a etapa anterior; sem isso a lista de permissão não recebe destino nenhum.
- **Referência:** NN/g, paredes de login.
- Depende de: N-004.

### N-006 · [alto · S] · Memória da última lista vista
- **O que é:** o site passa a lembrar a última URL de catálogo com filtros, para que "continuar escolhendo" signifique continuar de onde parou.
- **Como fazer:** novo `src/lib/catalogReturn.ts` com gravação no armazenamento de sessão a cada mudança de parâmetros em `src/lib/useCatalogPageState.ts`, e leitura nos pontos que hoje apontam para `/catalogo` fixo: `src/pages/QuotePage.tsx:461, 492`, `src/components/QuoteDrawer.tsx:269`, `src/pages/CustomerAccountPage.tsx:87`.
- **Benefício:** o rótulo "continuar" passa a ser verdadeiro; o visitante não reconfigura momento, público e clima a cada ida ao orçamento.
- **Referência:** NN/g, reconhecimento e memória em interfaces.

### N-007 · [alto · S] · "Voltar ao kit" quando a seleção nasceu no montar kit
- **O que é:** o orçamento oferece retorno para a composição de origem, não para o catálogo.
- **Como fazer:** `src/pages/KitBuilderPage.tsx:82` navega para o orçamento informando a origem; `src/pages/QuotePage.tsx:461` usa essa origem no retorno quando ela existe.
- **Benefício:** quem monta um kit e vai ao orçamento consegue voltar e ajustar a composição.
- **Referência:** Material Design 3, navegação e retorno contextual.
- Depende de: N-006.

### N-008 · [médio · S] · Preservar os filtros da lista ao abrir e voltar do detalhe do orçamento
- **O que é:** a lista de orçamentos do cliente mantém filtro, busca e página quando o visitante abre um orçamento e volta.
- **Como fazer:** o cartão da lista (`src/pages/CustomerAccountPage.tsx:95`) leva a busca atual no estado; o detalhe (`src/pages/CustomerQuotePage.tsx:240`) usa essa busca no retorno.
- **Benefício:** quem gerencia vários pedidos não refaz o filtro a cada consulta.
- **Referência:** Baymard, listas e retorno com estado.

### N-009 · [médio · S] · Ações de retorno nas telas de "não encontrado"
- **O que é:** um componente de saída com retorno real para a tela anterior, quando ela existe dentro do site, mais uma saída fixa.
- **Como fazer:** novo `src/components/ReturnActions.tsx` usado em `src/pages/NotFoundPage.tsx:6`, `ProductPage.tsx:133`, `IdeaLandingPage.tsx:36`, `SharedSelectionPage.tsx:188`, `CustomerQuotePage.tsx:231`. O botão de voltar uma posição aparece apenas quando a entrada atual não é a primeira do site (verificação pela chave da localização).
- **Benefício:** quem caiu em um link interno quebrado volta em um toque, em vez de ser mandado só para o catálogo.
- **Referência:** NN/g, "404 error pages: 10 guidelines".

### N-010 · [médio · S] · Vocabulário único de direção
- **O que é:** ícone de seta para a esquerda significa voltar; seta para a direita significa avançar ou abrir. Hoje os dois aparecem trocados nas telas de erro.
- **Como fazer:** padronizar nos cinco pontos de `N-009` e nos retornos de `N-003`, com o mesmo tamanho de ícone e a mesma ordem (ícone antes do texto no retorno, depois do texto no avanço).
- **Benefício:** o visitante não precisa ler para saber o que o botão faz.
- **Referência:** Material Design 3, ícones de navegação.
- Depende de: N-003, N-009.

### N-011 · [médio · S] · Retorno na área do cliente com sessão visível
- **O que é:** o detalhe do orçamento mostra onde o visitante está e de onde veio, e a área do cliente indica a conta ativa.
- **Como fazer:** usar o componente de trilha do bloco 3 em `src/pages/CustomerQuotePage.tsx:240` e exibir o e-mail da sessão junto à ação de sair em `src/pages/CustomerAccountPage.tsx:81`.
- **Benefício:** reduz a dúvida "estou na conta certa?" em computador compartilhado.
- **Referência:** NN/g, orientação em áreas autenticadas.
- Depende de: N-051.

### N-012 · [médio · S] · Mensagem contextual quando o link de acesso expirou
- **O que é:** o visitante com link expirado chega ao login já sabendo o que aconteceu e com o caminho para pedir outro.
- **Como fazer:** `src/pages/SetPasswordPage.tsx:38` redireciona com um motivo na URL; `src/pages/CustomerLoginPage.tsx` lê o motivo e inicializa o modo e a mensagem correspondentes.
- **Benefício:** evita o beco sem saída de "solicite um novo link" sem link.
- **Referência:** NN/g, recuperação de erro.

### N-013 · [médio · S] · Saída explícita para o catálogo na seleção compartilhada
- **O que é:** quem recebe um link de seleção ganha um caminho para explorar o catálogo, não só nos estados de erro.
- **Como fazer:** acrescentar a saída ao cabeçalho da página em `src/pages/SharedSelectionPage.tsx:191`.
- **Benefício:** transforma o visitante que recebeu um link em visitante do catálogo.
- **Referência:** Baymard, páginas de entrada compartilhada.

### N-014 · [médio · M] · Rota própria para a confirmação do orçamento
- **O que é:** a tela de "pedido enviado" passa a ter URL própria, de forma que recarregar a página ou usar voltar e avançar não desfaça a confirmação.
- **Como fazer:** nova rota e página de confirmação em `src/App.tsx` e `src/pages/QuoteSentPage.tsx`, substituindo o estado interno de `src/pages/QuotePage.tsx:398-440`; registrar a rota na lista pública de `src/lib/analytics.ts:105` e no mapeamento de rotas servidas.
- **Benefício:** a confirmação deixa de ser um estado volátil; o visitante pode compartilhar ou revisitar.
- **Referência:** Material Design 3, navegação por URL como fonte de verdade.

### N-015 · [médio · S] · Retorno do briefing para a seleção sem perder itens
- **O que é:** sair do briefing para ajustar a seleção e voltar mantém tudo preenchido.
- **Como fazer:** o retorno em `src/pages/QuotePage.tsx:461` usa a memória da lista (N-006) e o rascunho do briefing já existente, garantindo que a ida e volta não limpe campo nenhum. Teste de ponta a ponta cobrindo o ciclo.
- **Benefício:** remove o medo de "se eu sair, perco o que escrevi", que faz o visitante abandonar em vez de ajustar.
- **Referência:** NN/g, prevenção de perda de dados.
- Depende de: N-006.

### N-016 · [médio · S] · Política explícita de empilhar ou substituir no histórico
- **O que é:** uma regra única para quando uma mudança de parâmetro cria entrada no histórico. Hoje o catálogo empilha a cada filtro, enquanto a lista de orçamentos e os catálogos substituem.
- **Como fazer:** em `src/lib/useCatalogPageState.ts:262-266, 279`, aceitar a política como opção nomeada; empilhar para mudança de lugar (busca, categoria, página) e substituir para refinamento (ordenação, cor, faixa). Alinhar `src/pages/CustomerAccountPage.tsx:59` e `src/pages/CatalogsPage.tsx:142`.
- **Benefício:** voltar passa a ter significado previsível: desfaz uma decisão, não um ajuste fino.
- **Referência:** Material Design 3, comportamento de retorno previsível.

### N-017 · [médio · S] · Histórico navegável no back-office
- **O que é:** abrir um pedido na fila comercial cria entrada no histórico, para que voltar feche o pedido em vez de sair da fila inteira.
- **Como fazer:** em `src/pages/BackofficePage.tsx:457-463, 583, 604`, manter substituição para filtros e passar a empilhar na abertura e no fechamento de pedido; trocar os botões de abrir por links (`:179` e `:257`).
- **Benefício:** o operador percorre a fila com voltar e avançar, e pode abrir pedidos em abas.
- **Referência:** NN/g, listas e detalhes em ferramentas internas.
- Depende de: N-016.

### N-018 · [baixo · S] · Trilha completa na ficha de produto
- **O que é:** a trilha passa a incluir o nome do produto como item atual, marcado como página corrente.
- **Como fazer:** `src/pages/ProductPage.tsx:140-142` usa o componente de trilha do bloco 3, com lista ordenada e marcação do item atual.
- **Benefício:** o visitante sabe em que nível está, e o item atual deixa de parecer clicável.
- **Referência:** WAI-ARIA Authoring Practices, padrão de trilha.
- Depende de: N-051.

### N-019 · [baixo · S] · Persistir a posição de rolagem entre recarregamentos
- **O que é:** a posição de rolagem sobrevive a recarregar a página e ao retorno de fora do site.
- **Como fazer:** espelhar o mapa de posições de `src/App.tsx:40, 51-53` no armazenamento de sessão por chave de localização, e não forçar o topo na primeira renderização quando a navegação foi recarregamento ou retorno.
- **Benefício:** quem recarrega uma lista longa não perde o lugar.
- **Referência:** especificação de restauração de rolagem do navegador.

### N-020 · [médio · S] · Testes de retorno no fluxo principal
- **O que é:** cobertura automática do que as etapas anteriores prometem.
- **Como fazer:** em `e2e/smoke.spec.ts`, casos para: filtrar o catálogo, abrir um produto, voltar e conferir filtros e rolagem; entrar na ficha por link direto e conferir o destino de reserva; entrar pelo login a partir do briefing e voltar ao briefing.
- **Benefício:** impede que a próxima mudança de rota desfaça o ganho.
- **Referência:** prática de teste de jornada.
- Depende de: N-002, N-005, N-006.

### N-021 · [médio · S] · Retorno visível no cabeçalho das landings de ideias
- **O que é:** as landings de ideias ganham retorno para o índice de ideias e para a home.
- **Como fazer:** usar a trilha do bloco 3 em `src/pages/IdeaLandingPage.tsx:40`, com os níveis início, ideias e o título da landing.
- **Benefício:** quem entra por busca em uma landing encontra o resto do site.
- **Referência:** NN/g, páginas de entrada e navegação de saída.
- Depende de: N-051, N-065.

### N-022 · [médio · S] · Retorno no cabeçalho das coleções e das datas
- **O que é:** mesmo tratamento para catálogos e datas comemorativas, hoje sem caminho de volta no conteúdo.
- **Como fazer:** trilha em `src/pages/CatalogsPage.tsx:200` quando há coleção selecionada, e em `src/pages/CommemorativeDatesPage.tsx` quando há data selecionada.
- **Benefício:** reduz saída do site em páginas de entrada de campanha.
- **Referência:** NN/g, hierarquia visível.
- Depende de: N-051.

### N-023 · [baixo · S] · Retorno no montar kit
- **O que é:** a página de composição ganha retorno para o catálogo preservando a lista de origem.
- **Como fazer:** usar o componente de retorno em `src/pages/KitBuilderPage.tsx:87` com a memória da lista.
- **Benefício:** o visitante alterna entre explorar e compor sem recomeçar.
- **Referência:** Material Design 3, navegação lateral entre tarefas.
- Depende de: N-003, N-006.

### N-024 · [baixo · S] · Rótulo de retorno que nomeia o destino
- **O que é:** o retorno diz para onde leva, não apenas "voltar".
- **Como fazer:** no componente de retorno, o rótulo recebe o destino ("Voltar aos resultados", "Voltar ao kit", "Voltar aos orçamentos"), com "Voltar" como texto de reserva quando o destino é desconhecido.
- **Benefício:** menos cliques exploratórios e menos frustração em telas profundas.
- **Referência:** NN/g, rótulos de link informativos.
- Depende de: N-003.

### N-025 · [baixo · S] · Área de toque e espaçamento do retorno no celular
- **O que é:** o retorno recebe altura mínima de 44 pixels e espaçamento que evita toque acidental no título.
- **Como fazer:** uma regra única na classe do componente de retorno em `src/styles.css`, substituindo as variações por página.
- **Benefício:** menos toques errados na navegação mais usada do celular.
- **Referência:** WCAG 2.5.8; Apple HIG, alvos de toque.
- Depende de: N-003.
- **[mockup]**

### N-026 · [baixo · S] · Ordem de tabulação do retorno
- **O que é:** o retorno é o primeiro elemento tabulável do conteúdo da página, depois do atalho de pular para o conteúdo.
- **Como fazer:** posicionar o componente como primeiro filho do cabeçalho de página nas seis páginas de `N-003`, e cobrir com teste de ordem de foco.
- **Benefício:** quem navega por teclado alcança o retorno sem percorrer a página.
- **Referência:** WCAG 2.4.3 (ordem de foco).
- Depende de: N-003.

### N-027 · [baixo · S] · Evento de uso do retorno
- **O que é:** instrumentação para saber se o retorno é usado e de onde.
- **Como fazer:** disparar um evento no componente de retorno com origem e destino, registrado em `src/lib/analytics.ts`.
- **Benefício:** mede se as etapas deste bloco mudaram o comportamento, em vez de supor.
- **Referência:** prática de instrumentação de navegação.
- Depende de: N-003, N-191.

### N-028 · [baixo · S] · Documentar a política de retorno
- **O que é:** registrar a decisão de produto deste bloco para que telas futuras não reabram a discussão.
- **Como fazer:** uma seção em `docs/agentes/regras-dominio.md` com as três regras (destino explícito, origem preservada, voltar uma posição só nas telas de erro).
- **Benefício:** consistência sem depender de quem implementa a próxima tela.
- **Referência:** prática de sistema de design.
- Depende de: N-003, N-016.

---

# Bloco 2 — Histórico, sobreposições e o Voltar do navegador (N-029 a N-050)

## O problema central

O site tem nove sobreposições (painel de seleção, menu de celular, painel de filtros, ampliação de foto, bandeja de comparação, seleções salvas com dois diálogos, confirmação de limpar, retorno de campanha). Nenhuma cria entrada no histórico. No celular, onde o gesto de voltar é o controle mais usado, isso significa que o visitante que abre a seleção e faz o gesto para fechá-la sai da página e perde o contexto. O painel de datas comemorativas é a única exceção: ele vive na URL, e serve de referência para as demais.

### N-029 · [alto · M] · Ligar as sobreposições ao histórico
- **O que é:** um hook que, ao abrir uma sobreposição, cria uma entrada no histórico, e fecha a sobreposição quando o visitante volta.
- **Como fazer:** novo `src/lib/useOverlayHistory.ts` que empilha uma entrada ao abrir e escuta o evento de retorno para fechar; quando o fechamento vem do botão, da tecla de escape ou do clique fora, consome a entrada. Usar em `src/components/QuoteDrawer.tsx:42`, `src/lib/useCatalogPageState.ts:244` (filtros), `src/components/Layout.tsx:105-111` (menu) e `src/components/ProductGallery.tsx:55` (ampliação).
- **Benefício:** no celular o gesto de voltar fecha o painel em vez de abandonar a página, no momento da decisão de compra.
- **Referência:** Material Design 3, comportamento de retorno e retorno preditivo; NN/g, expectativa sobre o botão voltar.

### N-030 · [alto · S] · Comitar o que foi digitado antes de qualquer fechamento
- **O que é:** a quantidade digitada no painel de seleção deixa de ser descartada quando o painel fecha pela tecla de escape ou clique fora.
- **Como fazer:** em `src/components/QuoteDrawer.tsx`, guardar os rascunhos em uma referência e confirmá-los no encerramento, em todos os caminhos de fechamento (`:51`, `:170`, `:177`, `:192`, `:269`).
- **Benefício:** evita perda de dado silenciosa na tela que define a quantidade do pedido.
- **Referência:** NN/g, prevenção de perda de dados.
- **[190]** relacionado às etapas de rascunho de quantidade.

### N-031 · [alto · S] · Não abrir o painel a cada produto adicionado
- **O que é:** adicionar um produto deixa de interromper a navegação com um painel modal; passa a mostrar uma confirmação discreta.
- **Como fazer:** em `src/context/QuoteCartContext.tsx:113`, abrir o painel apenas no primeiro item da sessão e quando o limite é atingido; nos demais casos, registrar o último adicionado e exibir um aviso não modal no rodapé, no mesmo lugar do aviso de desfazer (`src/components/Layout.tsx:265-278`).
- **Benefício:** o visitante continua navegando o catálogo e adiciona mais itens, em vez de ser parado a cada clique.
- **Referência:** Baymard, confirmação de adição sem interromper a navegação.
- **[mockup]**

### N-032 · [alto · L] · Um componente único de sobreposição
- **O que é:** concentrar em um componente o papel de diálogo, o nome acessível, a armadilha de foco, o travamento de rolagem, a tecla de escape, o clique fora e o retorno de foco.
- **Como fazer:** novo `src/components/Overlay.tsx` substituindo os blocos de efeito de `src/components/QuoteDrawer.tsx:42-99`, `src/components/Layout.tsx:100-132`, `src/lib/useCatalogPageState.ts:243-261`, `src/components/SavedSelections.tsx:50`, `src/components/ProductGallery.tsx:54` e `src/pages/SharedSelectionPage.tsx:138`. A ampliação de foto, que já usa o elemento nativo de diálogo corretamente, serve de modelo.
- **Benefício:** nove comportamentos diferentes passam a ser um só; cada correção futura vale para todas as sobreposições.
- **Referência:** WAI-ARIA Authoring Practices, padrão de diálogo modal.

### N-033 · [médio · S] · Travamento de rolagem com contagem de camadas
- **O que é:** um único mecanismo de travar a rolagem do corpo, com contador, em vez de seis implementações independentes.
- **Como fazer:** novo `src/lib/useBodyScrollLock.ts` com contador no módulo, removendo as cópias de `QuoteDrawer.tsx:46`, `Layout.tsx:103`, `useCatalogPageState.ts:244`, `SavedSelections.tsx:50`, `ProductGallery.tsx:54` e `SharedSelectionPage.tsx:138`. Acrescentar a regra de reserva da barra de rolagem no estilo global para eliminar o salto horizontal ao abrir.
- **Benefício:** fecha o bug de uma camada destravar a rolagem enquanto outra ainda está aberta, e remove o salto de layout.
- **Referência:** prática de gerenciamento de camadas modais.
- Depende de: N-032.

### N-034 · [médio · M] · Impedir duas sobreposições modais ao mesmo tempo
- **O que é:** o menu de celular e o painel de seleção podem ficar abertos juntos, com duas armadilhas de foco competindo.
- **Como fazer:** fechar o menu ao abrir qualquer outra sobreposição em `src/components/Layout.tsx:175, 260`, e centralizar a armadilha no componente único de sobreposição.
- **Benefício:** o foco deixa de ficar preso entre duas camadas, o que hoje prende o visitante de teclado.
- **Referência:** WAI-ARIA Authoring Practices, modais aninhados.
- Depende de: N-032.

### N-035 · [médio · S] · Fundo escurecido e fechar ao toque fora no menu de celular
- **O que é:** o menu de celular ganha o mesmo tratamento das outras sobreposições: fundo escurecido e fechar ao tocar fora.
- **Como fazer:** envolver o painel de `src/components/Layout.tsx:185-202` no mesmo padrão de fundo já usado no painel de seleção, com fechamento no clique no próprio fundo.
- **Benefício:** o gesto mais natural para fechar passa a funcionar; hoje é preciso achar o botão.
- **Referência:** Material Design 3, painéis laterais e fundo de modal.
- **[mockup]**

### N-036 · [médio · S] · Menu de celular com rolagem interna
- **O que é:** o menu deixa de esconder os últimos links em telas baixas.
- **Como fazer:** limitar a altura do painel à janela visível e permitir rolagem interna em `src/styles.css:734-751`.
- **Benefício:** os itens de menu voltam a ser alcançáveis no celular na horizontal e em telas pequenas.
- **Referência:** WCAG 1.4.10 (refluxo).
- **[190]** mesma correção do plano técnico.

### N-037 · [médio · S] · Aviso de desfazer não pode ficar sob o painel
- **O que é:** o aviso de desfazer é pintado sobre o rodapé do painel de seleção e cobre o botão principal.
- **Como fazer:** deslocar o aviso quando o painel está aberto, ou movê-lo para dentro do painel nesse estado (`src/styles.css:3201-3205`, `src/components/Layout.tsx:264-278`).
- **Benefício:** o botão de enviar briefing deixa de ficar coberto exatamente quando o visitante acabou de remover um item.
- **Referência:** Material Design 3, ordem de empilhamento de camadas.

### N-038 · [médio · S] · Escala de camadas em variáveis
- **O que é:** os dez valores de empilhamento espalhados no estilo passam a vir de uma escala nomeada.
- **Como fazer:** definir variáveis para fixo, botão flutuante, cabeçalho, sobreposição, sobreposição aninhada, aviso e atalho, e substituir os valores em `src/styles.css:346, 579, 1196, 2345, 2658, 3203, 5377, 6221, 6327, 6606`.
- **Benefício:** o próximo componente não precisa adivinhar um número maior que o anterior.
- **Referência:** prática de sistema de design.

### N-039 · [médio · S] · Avisos com pausa e duração mínima
- **O que é:** os avisos de desfazer expiram em oito segundos fixos, sem pausa e sem foco, e contêm uma ação.
- **Como fazer:** extrair um hook de aviso dispensável que pausa a contagem quando o ponteiro ou o foco entram, com piso de dez segundos, substituindo os três temporizadores de `src/context/QuoteCartContext.tsx:31, 37, 43`.
- **Benefício:** quem lê devagar ou usa teclado consegue acionar o desfazer antes de ele desaparecer.
- **Referência:** WCAG 2.2.1 (ajuste de tempo).

### N-040 · [médio · S] · Retorno de foco com verificação de existência
- **O que é:** ao fechar uma sobreposição, o foco volta ao gatilho só se ele ainda existir; se não, vai para uma âncora estável.
- **Como fazer:** em `src/components/QuoteDrawer.tsx:72`, `src/pages/CommemorativeDatesPage.tsx:196` e `src/lib/useCatalogPageState.ts:261`, verificar se o elemento continua no documento e usar o conteúdo principal como destino de reserva.
- **Benefício:** evita o foco perdido no início da página quando o gatilho era um item removido.
- **Referência:** WAI-ARIA Authoring Practices, gerenciamento de foco.
- Depende de: N-032.

### N-041 · [médio · S] · Tirar a confirmação de limpar do ciclo do painel
- **O que é:** abrir a confirmação de limpar reexecuta o efeito do painel e causa salto de foco e destravamento momentâneo da rolagem.
- **Como fazer:** em `src/components/QuoteDrawer.tsx:42-99`, ler o estado da confirmação por referência dentro do manipulador em vez de mantê-lo nas dependências, ou renderizar a confirmação como sobreposição própria.
- **Benefício:** a confirmação deixa de bagunçar o painel que a abriu.
- **Referência:** prática de camadas independentes.
- Depende de: N-032.

### N-042 · [baixo · S] · Fechar o fundo no clique completo, não no pressionar
- **O que é:** os fundos fecham no pressionar do botão, o que descarta o painel em toque acidental ou ao selecionar texto arrastando.
- **Como fazer:** nos quatro fundos (`QuoteDrawer.tsx:176`, `CatalogPage.tsx:54`, `CommemorativeDatesPage.tsx:347`, `SharedSelectionPage.tsx:204`), fechar apenas quando o pressionar e o soltar ocorrem no próprio fundo.
- **Benefício:** menos fechamentos acidentais com dados digitados dentro.
- **Referência:** comportamento nativo do elemento de diálogo.
- Depende de: N-032.

### N-043 · [médio · M] · Marcar o fundo como inerte enquanto há sobreposição
- **O que é:** hoje a armadilha cobre apenas a tecla de tabulação; o conteúdo de fundo continua acessível por leitor de tela e por busca do navegador.
- **Como fazer:** no componente único de sobreposição, marcar o contêiner do conteúdo e o cabeçalho como inertes enquanto houver camada aberta.
- **Benefício:** o leitor de tela deixa de ler conteúdo que o visitante não pode usar.
- **Referência:** WAI-ARIA Authoring Practices, modal e conteúdo inerte.
- Depende de: N-032.

### N-044 · [baixo · S] · Dois diálogos de seleções salvas com a mesma referência
- **O que é:** em seleções salvas, dois diálogos compartilham a mesma referência e a tecla de escape fecha os dois estados ao mesmo tempo.
- **Como fazer:** uma referência por diálogo em `src/components/SavedSelections.tsx:53, 209, 217`, fechando apenas a camada do topo.
- **Benefício:** cancelar uma confirmação não fecha a tela que estava por trás.
- **Referência:** WAI-ARIA Authoring Practices, modais aninhados.
- Depende de: N-032.

### N-045 · [baixo · S] · Gatilhos declarando que abrem diálogo
- **O que é:** os botões que abrem sobreposição informam isso ao leitor de tela, como já faz o botão de filtros.
- **Como fazer:** acrescentar a declaração em `src/components/Layout.tsx:175, 181, 260` e `src/components/ProductGallery.tsx:79`.
- **Benefício:** o visitante sabe que algo vai abrir antes de acionar.
- **Referência:** WAI-ARIA, propriedade de menu suspenso.

### N-046 · [médio · M] · Alternativa de histórico via URL para o painel de seleção
- **O que é:** além da entrada no histórico, o painel pode viver na URL, como já faz o painel de datas.
- **Como fazer:** em `src/components/QuoteDrawer.tsx`, abrir e fechar por parâmetro de consulta, com empilhamento no histórico, espelhando `src/lib/useCatalogPageState.ts:243`.
- **Benefício:** o estado do painel sobrevive a recarregamento e pode ser compartilhado em link de suporte.
- **Referência:** Material Design 3, estado em URL.
- Depende de: N-029.

### N-047 · [médio · S] · Guarda de saída com dados não salvos
- **O que é:** sair de um formulário com conteúdo digitado passa a pedir confirmação.
- **Como fazer:** um hook de aviso de saída aplicado ao briefing (que já salva rascunho) e ao formulário de contato (que não salva), além do envio de anexo em andamento (`src/components/ConversationForm.tsx:36-41`, `src/components/BriefingAssetUploader.tsx:76-96`).
- **Benefício:** evita perda do texto escrito, principal causa de abandono em formulário longo.
- **Referência:** NN/g, confirmação de ação destrutiva.

### N-048 · [médio · S] · Rascunho do formulário de contato
- **O que é:** o formulário de contato ganha o mesmo rascunho que o briefing já tem.
- **Como fazer:** reaproveitar as funções de rascunho usadas em `src/pages/QuotePage.tsx:184` para o lead de contato em `src/components/ConversationForm.tsx`, com aviso de rascunho recuperado.
- **Benefício:** quem fecha a aba por acidente volta e continua.
- **Referência:** NN/g, salvamento automático.
- Depende de: N-047.

### N-049 · [médio · S] · Instrumentar abertura e fechamento de sobreposição
- **O que é:** eventos que registram qual sobreposição abriu, por qual gatilho, e como foi fechada.
- **Como fazer:** acrescentar os eventos ao mapa de `src/lib/analytics.ts` e disparar no componente único de sobreposição.
- **Benefício:** mostra se o painel automático a cada item estava atrapalhando, com dado em vez de opinião.
- **Referência:** prática de instrumentação de interface.
- Depende de: N-032, N-191.

### N-050 · [médio · S] · Testes de sobreposição: retorno, foco e empilhamento
- **O que é:** cobertura automática do comportamento prometido neste bloco.
- **Como fazer:** em `e2e/smoke.spec.ts`, junto dos casos de diálogo existentes: abrir o painel e usar voltar do navegador esperando que ele feche e a página permaneça; fechar e conferir o foco de volta no gatilho; abrir menu e painel e conferir que só um fica aberto; digitar quantidade, fechar com a tecla de escape e conferir o valor preservado.
- **Benefício:** o comportamento de histórico não se perde na próxima alteração.
- **Referência:** prática de teste de jornada.
- Depende de: N-029, N-030, N-034, N-040.

---

# Bloco 3 — Orientação: trilha, menu ativo, títulos e hierarquia (N-051 a N-074)

## O problema central

O visitante não sabe onde está. O menu só marca a seção quando a rota é exatamente igual ao link (`src/components/Layout.tsx:50-54`), então na ficha de produto, nas ideias, no orçamento e na área do cliente nenhum item aparece ativo. A trilha existe em uma única página e não segue o padrão acessível. O título do documento servido pelo servidor difere do que a aplicação grava em cinco rotas públicas. Cinco páginas de segundo nível não têm nenhum caminho de volta no conteúdo.

### N-051 · [alto · S] · Componente de trilha reutilizável
- **O que é:** uma trilha com lista ordenada, separadores decorativos e o item atual marcado como página corrente.
- **Como fazer:** novo `src/components/Breadcrumbs.tsx` recebendo os níveis; substituir a marcação de `src/pages/ProductPage.tsx:140-142` e reaproveitar o estilo existente em `src/styles.css:1865-1877`, elevando o tamanho do texto, hoje em 10,9 pixels.
- **Benefício:** um padrão único de orientação, pronto para as seis páginas que hoje não têm nenhum.
- **Referência:** WAI-ARIA Authoring Practices, padrão de trilha; NN/g, diretrizes de trilha.
- **[mockup]**

### N-052 · [alto · S] · Menu ativo por seção, não por igualdade de rota
- **O que é:** o item de menu da seção fica marcado também nas rotas filhas.
- **Como fazer:** em `src/components/Layout.tsx:50-54`, derivar a seção por prefixo de rota (ficha de produto conta como catálogo, detalhe do orçamento conta como área do cliente, landings de ideias contam como ideias) e aplicar a marcação de página corrente em `:156-159` e `:194-197`.
- **Benefício:** o visitante vê onde está em toda a profundidade, não só nas raízes.
- **Referência:** WCAG 3.2.3 (navegação consistente); Material Design 3, estado de item de navegação.

### N-053 · [alto · S] · Trilha publicada também como dado estruturado
- **O que é:** a trilha visível e a trilha lida por mecanismos de busca passam a ser a mesma.
- **Como fazer:** emitir a trilha no dado estruturado do servidor em `api/_lib/publicProductPage.ts:140-149`, no mesmo bloco do produto, e espelhar no cliente via `src/components/Seo.tsx`.
- **Benefício:** o resultado de busca mostra o caminho em vez da URL crua, o que aumenta o clique.
- **Referência:** documentação de dados estruturados de trilha.
- **[190]** mesma etapa do plano técnico.
- Depende de: N-051.

### N-054 · [alto · S] · Fonte única de título e descrição por rota
- **O que é:** o título que o servidor entrega e o que a aplicação grava passam a vir do mesmo lugar.
- **Como fazer:** extrair o mapa de páginas de `api/site-page.ts:30-44` para `shared/`, no mesmo padrão já usado para as landings de ideias, e consumir nas páginas (`CatalogPage.tsx:28`, `AboutPage.tsx:8`, `ContactPage.tsx:11`, `PrivacyPage.tsx:9`, `KitBuilderPage.tsx:87`).
- **Benefício:** o nome da aba deixa de mudar depois do carregamento, o que hoje confunde quem navega com várias abas abertas.
- **Referência:** WCAG 2.4.2 (página com título).
- **[190]** mesma etapa do plano técnico.

### N-055 · [alto · S] · Anunciar a mudança de página para leitor de tela
- **O que é:** ao trocar de rota, o novo título é anunciado; hoje o foco vai para o conteúdo ainda vazio e o título muda depois.
- **Como fazer:** novo `src/components/RouteAnnouncer.tsx` montado ao lado do gerenciador de rolagem em `src/App.tsx:106`, com uma região de status que recebe o título após a rota resolver; `src/components/Seo.tsx:34-68` sinaliza quando o título foi aplicado.
- **Benefício:** quem usa leitor de tela sabe que a navegação aconteceu e para onde foi.
- **Referência:** WCAG 4.1.3 (mensagens de status); padrão de anunciador de rota em aplicações de página única.

### N-056 · [alto · M] · Contexto de origem no catálogo
- **O que é:** chegar ao catálogo por uma ideia, uma coleção ou a home passa a mostrar de onde o visitante veio, com retorno. Hoje o catálogo exibe "Curadoria iniciada pelo seu briefing" mesmo sem briefing nenhum.
- **Como fazer:** acrescentar um parâmetro de origem aos destinos de `src/lib/ideaLandings.ts:25, 32, 39, 46`, `src/lib/catalogLibrary.ts:44-126` e `src/pages/HomePage.tsx:356`; em `src/lib/useCatalogPageState.ts` expor a origem e, em `src/pages/CatalogPage.tsx:44, 62`, exibir o rótulo correto com link de volta.
- **Benefício:** acaba a mensagem falsa e o visitante consegue voltar à ideia que o trouxe.
- **Referência:** NN/g, continuidade de contexto entre páginas de entrada e listas.

### N-057 · [alto · M] · Nome da data comemorativa visível no catálogo
- **O que é:** vindo de uma data, o catálogo mostra qual data está filtrando e permite remover o filtro. Hoje o parâmetro é enviado, mas nunca exibido nem contado como filtro ativo.
- **Como fazer:** em `src/lib/campaignBrief.ts:58-62` e `src/lib/useCatalogPageState.ts:64-67, 144-147`, incluir a data na contagem de filtros e expor o rótulo; em `src/pages/CatalogPage.tsx:62-73`, acrescentar o chip removível.
- **Benefício:** o visitante entende por que a lista está diferente e consegue voltar ao catálogo completo.
- **Referência:** Baymard, filtros aplicados visíveis e removíveis.

### N-058 · [médio · S] · Vocabulário único de navegação
- **O que é:** uma fonte única de seções, com rótulo e descrição, alimentando cabeçalho, menu de celular, rodapé e os rótulos de seção das páginas. Hoje menu, rodapé, título e primeiro título da página não coincidem para o mesmo destino.
- **Como fazer:** novo `src/lib/navigation.ts` consumido por `src/components/Layout.tsx:13-21, 214-223` e pelos rótulos de seção das páginas.
- **Benefício:** o visitante reconhece o destino pelo nome, em vez de descobrir que dois nomes levam ao mesmo lugar.
- **Referência:** NN/g, consistência de rótulos.

### N-059 · [médio · S] · Desambiguar "minha seleção"
- **O que é:** o mesmo nome identifica hoje dois destinos: o painel lateral e a página de orçamento.
- **Como fazer:** manter "Minha seleção" para o painel e nomear a página como "Briefing do orçamento" em `src/components/Layout.tsx:177, 198, 221` e `src/pages/QuotePage.tsx:457-463`.
- **Benefício:** o visitante sabe se o clique abre um painel ou troca de página.
- **Referência:** NN/g, rótulos que revelam o resultado da ação.
- Depende de: N-058.

### N-060 · [médio · S] · Indicador visível do item ativo no menu de celular
- **O que é:** no celular o item ativo é invisível: a classe muda a cor para a mesma cor do texto e o sublinhado só existe na versão de desktop.
- **Como fazer:** no estilo, marcar o item pela própria marcação de página corrente em `src/styles.css:643-645, 744-751`, com cor e marcador próprios.
- **Benefício:** orientação no dispositivo em que o menu é mais usado.
- **Referência:** WCAG 1.4.1 (uso de cor); Material Design 3, item ativo.
- Depende de: N-052.
- **[mockup]**

### N-061 · [médio · S] · Trilha nas páginas de segundo nível
- **O que é:** ideias, coleções, datas, montar kit e seleção compartilhada ganham trilha no cabeçalho.
- **Como fazer:** usar o componente de trilha nos cabeçalhos de `src/pages/IdeaLandingPage.tsx:40`, `CatalogsPage.tsx:200`, `CommemorativeDatesPage.tsx`, `KitBuilderPage.tsx:87` e `SharedSelectionPage.tsx:191`.
- **Benefício:** cinco páginas de entrada deixam de ser becos sem saída.
- **Referência:** NN/g, hierarquia visível.
- Depende de: N-051.

### N-062 · [médio · S] · Primeiro título único e coerente com o menu
- **O que é:** cada rota tem um único título de primeiro nível, com o mesmo nome do item de menu que leva a ela.
- **Como fazer:** conferir as 19 páginas contra a fonte única de seções e corrigir onde divergir, começando por catálogo, orçamento e área do cliente.
- **Benefício:** o visitante confirma, ao chegar, que clicou no lugar certo.
- **Referência:** WCAG 2.4.6 (cabeçalhos e rótulos).
- Depende de: N-058.

### N-063 · [médio · S] · Home espelhando a hierarquia do menu
- **O que é:** a home não leva a duas seções do menu principal, e a numeração do bloco de pontos de partida salta de 02 para 04.
- **Como fazer:** acrescentar os cartões de datas comemorativas e montar kit ao bloco de `src/pages/HomePage.tsx:310-358` e corrigir a numeração.
- **Benefício:** quem entra pela home encontra todas as portas do site.
- **Referência:** NN/g, arquitetura de informação visível na página inicial.
- **[mockup]**

### N-064 · [médio · S] · Botão de voltar ao topo e foco nos resultados ao paginar
- **O que é:** listas longas ganham retorno ao topo, e paginar ou filtrar leva o foco ao título dos resultados.
- **Como fazer:** novo `src/components/BackToTop.tsx` montado no layout, aparecendo após uma rolagem mínima; em `src/pages/CatalogPage.tsx:79`, mover o foco para o título dos resultados após a troca de página.
- **Benefício:** no celular, a volta ao topo depois de 24 cartões deixa de ser uma rolagem longa.
- **Referência:** Material Design 3, botão de ação de rolagem; WCAG 2.4.3.
- **[mockup]**

### N-065 · [médio · M] · Índice de ideias e entrada no menu
- **O que é:** as landings de ideias existem, mas não há índice e a seção só aparece no rodapé.
- **Como fazer:** nova página de índice em `src/pages/IdeaIndexPage.tsx`, rota em `src/App.tsx`, item no menu via a fonte única de seções, mapeamento em `vercel.json` e `api/site-page.ts`, e entrada no sitemap.
- **Benefício:** transforma páginas isoladas de busca em uma seção navegável.
- **Referência:** NN/g, páginas de índice de categoria.
- Depende de: N-058.

### N-066 · [médio · S] · Atalhos de pular para filtros e resultados
- **O que é:** além do atalho para o conteúdo, o catálogo oferece pular para os filtros e para os resultados.
- **Como fazer:** acrescentar os destinos em `src/pages/CatalogPage.tsx:29, 48, 62` e os atalhos no bloco de `src/styles.css:344-359`.
- **Benefício:** quem usa teclado alcança o que importa sem percorrer o cabeçalho e a busca.
- **Referência:** WCAG 2.4.1 (ignorar blocos).

### N-067 · [médio · S] · 404 com busca e caminhos populares
- **O que é:** a página de não encontrado oferece uma única saída; passa a oferecer busca, home, contato e catálogo.
- **Como fazer:** reaproveitar o componente de busca existente em `src/pages/NotFoundPage.tsx:6`, levando o termo ao catálogo.
- **Benefício:** recupera a visita em vez de encerrá-la.
- **Referência:** NN/g, "404 error pages: 10 guidelines".
- **[190]** mesma etapa do plano técnico.

### N-068 · [baixo · M] · Página de mapa do site
- **O que é:** uma página que lista todas as seções, gerada das mesmas fontes do arquivo de sitemap.
- **Como fazer:** nova página em `src/pages/SiteMapPage.tsx`, derivando as rotas das fontes já usadas por `api/sitemap.ts`, com link no rodapé.
- **Benefício:** saída de emergência para quem se perdeu e caminho de descoberta para mecanismos de busca.
- **Referência:** NN/g, mapas de site.
- Depende de: N-058.

### N-069 · [baixo · S] · Trilha e sessão na área do cliente
- **O que é:** o detalhe do orçamento mostra o caminho (área do cliente, orçamentos, protocolo) e a conta ativa fica visível.
- **Como fazer:** trilha em `src/pages/CustomerQuotePage.tsx:240` e identificação da sessão em `src/pages/CustomerAccountPage.tsx:81`.
- **Benefício:** orientação em área autenticada, onde o erro de conta é mais custoso.
- **Referência:** NN/g, orientação em áreas autenticadas.
- Depende de: N-051.

### N-070 · [médio · S] · Rótulos de seção coerentes nos painéis
- **O que é:** o rótulo de seção do painel de filtros e os nomes das ações de limpar variam dentro do mesmo fluxo.
- **Como fazer:** unificar em `src/pages/CatalogPage.tsx:49, 53, 56, 58, 72` e `src/components/CatalogFeedback.tsx:256`: título e botão "Filtros", rótulo "Catálogo", e toda ação de reinício como "Limpar filtros".
- **Benefício:** o visitante não precisa reinterpretar o mesmo controle em cada tela.
- **Referência:** NN/g, consistência de rótulos.
- **[190]** mesma etapa do plano técnico.

### N-071 · [baixo · S] · Rótulo do destino nos chips da home
- **O que é:** os chips de busca da home mostram um rótulo e buscam outro termo.
- **Como fazer:** igualar rótulo e termo em `src/pages/HomePage.tsx:198-200`, ou passar um nome de exibição que o catálogo mostre no título, como já faz para categorias.
- **Benefício:** o resultado corresponde ao que foi clicado.
- **Referência:** NN/g, correspondência entre rótulo e resultado.
- **[190]** mesma etapa do plano técnico.

### N-072 · [baixo · S] · Rótulo ambíguo de abertura da seleção na home
- **O que é:** um chamado para ação na home se confunde com a seleção do cabeçalho.
- **Como fazer:** renomear em `src/pages/HomePage.tsx:223` para o que a ação realmente faz.
- **Benefício:** evita o clique que o visitante acha que abre a seleção.
- **Referência:** NN/g, rótulos que revelam o resultado.
- Depende de: N-059.

### N-073 · [médio · S] · Eventos de orientação
- **O que é:** instrumentar uso de trilha, retorno aos resultados e item de menu ativo.
- **Como fazer:** eventos no componente de trilha e no de retorno, registrados em `src/lib/analytics.ts`.
- **Benefício:** mostra se a orientação nova é usada, por tela.
- **Referência:** prática de instrumentação.
- Depende de: N-051, N-191.

### N-074 · [médio · M] · Testes de orientação
- **O que é:** cobertura de item de menu ativo, título por rota, trilha e retorno com filtros.
- **Como fazer:** novo `e2e/navigation.spec.ts` percorrendo cada seção e exigindo o item marcado como página corrente, o título esperado e a trilha presente nas páginas de segundo nível.
- **Benefício:** impede a regressão silenciosa da orientação, que hoje não tem teste nenhum.
- **Referência:** prática de teste de jornada.
- Depende de: N-051, N-052, N-054, N-061.

---

# Bloco 4 — Transições, carregamento e feedback visual (N-075 a N-100)

## O problema central

A navegação parece travar porque não há feedback nenhum entre a intenção e o resultado. O primeiro desenho é tela branca; a troca de rota apaga o conteúdo e empurra o rodapé; o único indicador de carregamento é desligado pela preferência de menos movimento; nenhuma classe de ação tem estado pressionado, e o realce nativo de toque foi removido no estilo.

### N-075 · [alto · S] · Barra de progresso de rota no topo
- **O que é:** uma barra fina e fixa no topo que aparece quando a troca de rota passa de um limiar curto, evitando piscar em navegação rápida.
- **Como fazer:** novo `src/components/RouteProgress.tsx` montado ao lado do gerenciador de rolagem em `src/App.tsx:106`, reagindo à mudança de localização com atraso de cerca de 150 milissegundos.
- **Benefício:** o clique passa a ter resposta imediata, o que elimina o clique repetido por impressão de travamento.
- **Referência:** Material Design 3, indicadores de progresso lineares.
- **[mockup]**

### N-076 · [alto · M] · Conteúdo inicial no documento em vez de tela branca
- **O que é:** o documento passa a entregar um esqueleto mínimo dentro do contêiner da aplicação, removido quando a aplicação monta.
- **Como fazer:** em `index.html:22-25`, incluir uma barra de topo com a marca e algumas linhas de esqueleto com estilo em linha; `src/main.tsx:6-9` remove o nó ao montar.
- **Benefício:** acaba a tela branca da primeira visita, que é a maior parte da impressão de lentidão.
- **Referência:** padrão de esqueleto de aplicação; Core Web Vitals, primeira pintura com conteúdo.
- **[mockup]**
- **[190]** complementa a etapa de conteúdo servido no shell.

### N-077 · [alto · M] · Esqueleto por rota, com a silhueta da página de destino
- **O que é:** o bloco único de espera dá lugar a um esqueleto que imita o layout da rota que está carregando.
- **Como fazer:** transformar o bloco de espera de `src/App.tsx:86-88, 109` em um esqueleto que recebe a forma por rota (grade para catálogo, duas colunas para ficha, formulário para orçamento), reaproveitando `src/components/CatalogFeedback.tsx`.
- **Benefício:** o visitante percebe para onde está indo durante a espera, o que reduz a espera percebida.
- **Referência:** NN/g, telas de espera e progresso percebido.
- **[mockup]**

### N-078 · [alto · M] · Manter a tela atual durante a troca de rota
- **O que é:** em vez de apagar o conteúdo, a tela atual permanece visível e levemente esmaecida até a nova estar pronta.
- **Como fazer:** envolver as navegações programáticas de `src/components/Layout.tsx:138, 169, 172` em uma transição não bloqueante e aplicar o estado de "navegando" ao conteúdo.
- **Benefício:** a navegação deixa de ter um salto de layout a cada clique de menu.
- **Referência:** Material Design 3, continuidade entre telas.

### N-079 · [alto · S] · Indicador de carregamento que sobrevive à preferência de menos movimento
- **O que é:** hoje a preferência de menos movimento congela o único indicador de carregamento, deixando a tela parecer travada.
- **Como fazer:** dentro do bloco de preferência de menos movimento em `src/styles.css:3962-3971`, reativar os indicadores com uma animação longa de opacidade, que não envolve deslocamento.
- **Benefício:** quem usa a preferência (por enxaqueca, vertigem ou escolha) continua sabendo que o site está trabalhando.
- **Referência:** WCAG 2.3.3 (animação a partir de interação); as diretrizes pedem reduzir movimento, não remover feedback.

### N-080 · [alto · S] · Estado pressionado em toda a camada de ação
- **O que é:** nenhum botão ou link do site tem estado pressionado, e o realce nativo de toque foi removido.
- **Como fazer:** um bloco de estado ativo para as classes de ação existentes, próximo à definição de botão em `src/styles.css:439`, revertendo a remoção do realce em `:285-287` ou substituindo-a por um estado próprio.
- **Benefício:** no celular, cada toque passa a ter confirmação imediata, o que reduz toques repetidos.
- **Referência:** Material Design 3, estados de interação; Apple HIG, feedback de toque.
- **[mockup]**

### N-081 · [alto · S] · Indicador de envio no botão do briefing
- **O que é:** o envio do briefing muda apenas o texto do botão, e o estilo anula a pista de formulário bloqueado.
- **Como fazer:** indicador circular dentro do próprio botão mantendo largura e texto em `src/pages/QuotePage.tsx:549`, com estado desabilitado declarado e uma região de status anunciando o envio; ajustar `src/styles.css:6164`.
- **Benefício:** reduz envio duplicado e a dúvida "clicou ou não?" no momento mais importante do funil.
- **Referência:** NN/g, feedback de envio de formulário; WCAG 4.1.3.

### N-082 · [alto · S] · Mesmo indicador no formulário de contato
- **O que é:** o formulário de contato recebe o mesmo tratamento de envio do briefing.
- **Como fazer:** aplicar o padrão de `N-081` ao botão de envio de `src/components/ConversationForm.tsx`, com o estilo correspondente.
- **Benefício:** consistência entre os dois formulários de conversão.
- **Referência:** NN/g, consistência de feedback.
- Depende de: N-081.

### N-083 · [alto · M] · Pré-carregar a rota pela intenção
- **O que é:** nenhuma rota é pré-carregada: todo primeiro clique paga o download do pedaço de código da página.
- **Como fazer:** novo `src/components/PrefetchLink.tsx` que, ao passar o ponteiro ou receber foco, dispara a mesma importação da rota; usar nos links de menu de `src/components/Layout.tsx:156-159, 194-197`.
- **Benefício:** o clique de menu passa a abrir quase imediatamente, sem mudar nada no servidor.
- **Referência:** padrão de pré-carregamento por intenção.

### N-084 · [alto · S] · Erro de rota dentro do layout
- **O que é:** um erro de renderização derruba o site inteiro: sem cabeçalho, sem menu, sem saída.
- **Como fazer:** inverter a ordem em `src/App.tsx:107-108`, com a barreira de erro dentro do layout, envolvendo apenas o conteúdo; em `src/components/AppErrorBoundary.tsx:29-38`, usar um bloco de alerta em vez de substituir o conteúdo principal, com ações de recarregar e voltar.
- **Benefício:** o visitante sempre tem como sair da tela de erro.
- **Referência:** NN/g, recuperação de erro.
- **[190]** mesma etapa do plano técnico.

### N-085 · [alto · S] · Esqueleto do produto alinhado ao layout real
- **O que é:** o esqueleto da ficha não corresponde ao layout final, o que garante deslocamento de layout em toda abertura de produto.
- **Como fazer:** alinhar as colunas e o espaçamento do esqueleto em `src/styles.css:2327-2339` ao layout real de `:1879-1884`, e reservar o espaço da trilha no bloco de espera de `src/pages/ProductPage.tsx:127`.
- **Benefício:** a ficha para de pular quando o conteúdo chega, o que hoje faz o visitante clicar no lugar errado.
- **Referência:** Core Web Vitals, deslocamento cumulativo de layout.

### N-086 · [médio · S] · Esqueleto da ficha anunciado para leitor de tela
- **O que é:** o esqueleto da ficha é mudo, ao contrário do do catálogo, que já anuncia.
- **Como fazer:** aplicar o mesmo contrato de região de status e estado ocupado em `src/pages/ProductPage.tsx:126-128`, marcando os quadros internos como decorativos.
- **Benefício:** quem usa leitor de tela sabe que a página está carregando em vez de encontrar silêncio.
- **Referência:** WCAG 4.1.3; WAI-ARIA, estado ocupado.

### N-087 · [médio · S] · Contrato único de acessibilidade dos esqueletos
- **O que é:** extrair o padrão de superfície de carregamento para um componente, para que cada esqueleto novo nasça anunciado.
- **Como fazer:** um componente de superfície de carregamento em `src/components/CatalogFeedback.tsx`, usado por catálogo, ficha, relacionados, filtros e prévias da home.
- **Benefício:** acaba a divergência entre esqueletos anunciados e mudos.
- **Referência:** prática de sistema de design.
- Depende de: N-086.

### N-088 · [médio · S] · Região de espera com texto real
- **O que é:** a região de espera de rota não tem texto, então o anúncio é improvável.
- **Como fazer:** incluir um texto só para leitor de tela em `src/App.tsx:86-88`, mantendo os quadros visuais como decorativos.
- **Benefício:** o anúncio de carregamento passa a acontecer de fato.
- **Referência:** WCAG 4.1.3.
- Depende de: N-077.

### N-089 · [médio · M] · Transições de elemento entre lista e ficha
- **O que é:** a imagem do cartão e a imagem da ficha passam a ser percebidas como o mesmo objeto durante a navegação, como camada progressiva onde o navegador suportar.
- **Como fazer:** nomear a transição na imagem de `src/components/ProductCard.tsx:31` e na imagem principal de `src/components/ProductGallery.tsx:70-72`, com as regras correspondentes no estilo, respeitando a preferência de menos movimento.
- **Benefício:** continuidade visual entre lista e detalhe, que é a transição mais repetida do site.
- **Referência:** especificação de transições de visualização; Material Design 3, transição de container.
- **[mockup]**

### N-090 · [médio · S] · Paginar e filtrar sem apagar a grade
- **O que é:** hoje qualquer mudança de filtro substitui a grade por esqueleto; passa a esmaecer o resultado anterior enquanto o novo carrega.
- **Como fazer:** em `src/pages/CatalogPage.tsx:74-80`, usar esqueleto apenas quando não há nada em tela, e aplicar um estado de atualização à grade existente nos demais casos.
- **Benefício:** o visitante mantém a referência visual do que estava vendo ao refinar a busca.
- **Referência:** NN/g, atualização de listas sem perda de contexto.
- **[mockup]**

### N-091 · [médio · S] · Comportamento de rolagem respeitando a preferência de movimento
- **O que é:** a rolagem suave programática ignora a preferência de menos movimento.
- **Como fazer:** novo `src/lib/scrollBehavior.ts` com a decisão centralizada, usado em `src/lib/useCatalogPageState.ts:262-268` e nos demais pontos de rolagem programática.
- **Benefício:** quem tem sensibilidade a movimento não é levado por uma rolagem longa animada.
- **Referência:** WCAG 2.3.3.
- **[190]** mesma etapa do plano técnico.

### N-092 · [médio · S] · Mensagem escalonada para espera longa
- **O que é:** entre o início da espera e o tempo limite não há comunicação; o visitante conclui que travou.
- **Como fazer:** novo `src/lib/useSlowLoadingNotice.ts` que, após alguns segundos, mostra uma linha de explicação em `src/pages/CatalogPage.tsx:63` e no envio de `src/pages/QuotePage.tsx:549`.
- **Benefício:** transforma espera silenciosa em espera explicada, que é tolerada por muito mais tempo.
- **Referência:** NN/g, limites de tempo de resposta.

### N-093 · [médio · S] · Nova tentativa com estado próprio
- **O que é:** o botão de tentar novamente não mostra que está tentando, então o visitante clica várias vezes.
- **Como fazer:** aceitar um estado de tentativa em `src/components/CatalogFeedback.tsx:21-30`, usado por `src/pages/CatalogPage.tsx:75` e `src/pages/ProductPage.tsx:130`.
- **Benefício:** menos chamadas repetidas e menos impressão de falha.
- **Referência:** NN/g, feedback de ação.

### N-094 · [médio · S] · Reservar a caixa da imagem ampliada
- **O que é:** a ampliação de foto abre sem dimensões declaradas, deslocando o conteúdo dentro do diálogo.
- **Como fazer:** declarar dimensões ou proporção em `src/components/ProductGallery.tsx:89` e no estilo do diálogo.
- **Benefício:** a ampliação deixa de pular no momento em que o visitante examina o produto.
- **Referência:** Core Web Vitals, deslocamento de layout.
- **[190]** mesma etapa do plano técnico.

### N-095 · [médio · S] · Foco no título ao chegar à confirmação
- **O que é:** a tela de sucesso rola para o topo mas não recebe foco nem é anunciada.
- **Como fazer:** dar foco programático ao título do painel de sucesso em `src/pages/QuotePage.tsx:402`, no mesmo efeito que rola para o topo, seguindo o padrão já usado no questionário de campanha.
- **Benefício:** quem usa leitor de tela sabe que o envio foi concluído.
- **Referência:** WCAG 2.4.3; WAI-ARIA, mensagens de status.

### N-096 · [médio · S] · Instrumentar falha de carregamento
- **O que é:** falhas de carregamento de catálogo, ficha, relacionados e pedaços de código não são registradas.
- **Como fazer:** acrescentar o evento com superfície e motivo ao mapa de `src/lib/analytics.ts:4-46` e disparar em `src/lib/useCatalogPageState.ts:228-239` e `src/pages/ProductPage.tsx:129`.
- **Benefício:** permite saber se a impressão de lentidão é erro de rede ou de servidor.
- **Referência:** prática de observabilidade de cliente.
- Depende de: N-191.

### N-097 · [baixo · S] · Transição de entrada do painel respeitando a preferência
- **O que é:** as sobreposições entram sem transição declarada e sem alternativa para quem reduz movimento.
- **Como fazer:** declarar a transição de entrada e saída no componente único de sobreposição, com variante sem deslocamento sob a preferência de menos movimento.
- **Benefício:** abertura e fechamento ficam legíveis em vez de instantâneos.
- **Referência:** Material Design 3, movimento de painéis.
- Depende de: N-032.
- **[mockup]**

### N-098 · [baixo · S] · Transição de hover e foco somente onde há ponteiro
- **O que é:** transições e estados de passagem aplicados em dispositivos de toque criam camadas e efeitos que não fazem sentido.
- **Como fazer:** condicionar as regras de passagem do mouse ao suporte real a ponteiro, começando pelos cartões de produto.
- **Benefício:** menos trabalho de composição no celular e menos estados presos depois do toque.
- **Referência:** consultas de mídia de ponteiro.
- **[190]** relacionado à etapa de modo de mesclagem nos cartões.

### N-099 · [médio · S] · Testes de feedback de navegação
- **O que é:** cobertura de barra de progresso, esqueleto por rota, estado de envio e anúncio de rota.
- **Como fazer:** casos em `e2e/smoke.spec.ts` com rede desacelerada: conferir a barra de progresso visível na troca de rota, o esqueleto correspondente à rota, o botão de envio em estado de envio e o anúncio da nova página.
- **Benefício:** garante que o feedback não desapareça na próxima mudança.
- **Referência:** prática de teste de jornada.
- Depende de: N-075, N-077, N-081, N-055.

### N-100 · [médio · S] · Orçamento de deslocamento de layout nas rotas principais
- **O que é:** um teto declarado de deslocamento de layout para home, catálogo e ficha, verificado no CI.
- **Como fazer:** acrescentar a medição ao gate de performance em `.github/workflows/quality.yml` e `scripts/check-performance-budget.mjs`, nas três rotas.
- **Benefício:** impede que um esqueleto desalinhado ou uma imagem sem dimensão volte sem ser notado.
- **Referência:** Core Web Vitals.
- **[190]** mesma etapa do plano técnico.
- Depende de: N-085, N-094.

---

# Bloco 5 — Consistência, padrões de interface e micro-interações (N-101 a N-118)

## O problema central

Não existe um sistema: existem duas camadas de design no mesmo arquivo de estilo (`src/styles.css:235` e `:3999` definem o mesmo conjunto de variáveis; `:426` e `:4067` definem o mesmo botão), dez variantes de botão sem papel declarado, e um conjunto de classes que não existe em lugar nenhum. O mesmo destino tem três nomes e o mesmo nome tem dois destinos.

### N-101 · [alto · S] · Botões do back-office sem estilo nenhum
- **O que é:** o back-office usa classes de botão que não existem no projeto, então 11 botões aparecem sem nenhum estilo.
- **Como fazer:** trocar as ocorrências de `src/pages/BackofficePage.tsx:113, 119, 129, 141, 188, 194, 247, 248, 257, 283, 356, 389, 567` para as variantes reais do sistema. **Verificado por leitura direta nesta sessão:** `grep "\.btn" src/styles.css` não retorna nada, e 11 linhas do arquivo usam essas classes.
- **Benefício:** a tela que a equipe comercial usa todo dia deixa de ter botões sem aparência de botão.
- **Referência:** Material Design 3, botões e hierarquia de ação.

### N-102 · [alto · M] · Reduzir as variantes de botão a quatro papéis declarados
- **O que é:** dez variantes sem regra de uso passam a quatro papéis: principal, secundário, terciário e discreto.
- **Como fazer:** renomear por papel no bloco de variantes de `src/styles.css:451-520`, mantendo os nomes antigos como apelido por um ciclo, e fundir a camada duplicada de `:4067-4096`.
- **Benefício:** cada tela passa a ter uma única ação principal visível, o que é o fator mais forte na escolha do visitante.
- **Referência:** Material Design 3, ênfase de botão.
- **[mockup]**

### N-103 · [alto · M] · Eliminar a camada de design duplicada
- **O que é:** variáveis, botão e chamada final estão definidos duas vezes no mesmo arquivo, com valores diferentes, e a segunda definição vence por ordem.
- **Como fazer:** consolidar os dois blocos de variáveis (`src/styles.css:235` e `:3999`), as duas definições de botão (`:426` e `:4067`) e as duas da chamada final (`:1427` e `:4895`), mantendo os valores da camada vencedora e movendo para ela o que só existe na primeira.
- **Benefício:** mudar uma cor passa a ter efeito previsível; hoje depende de qual bloco vence.
- **Referência:** prática de sistema de design.
- **[190]** relacionado à etapa de tokens duplicados.

### N-104 · [alto · S] · Indicador de seção atual no menu de celular
- **O que é:** o item ativo no menu de celular não recebe a classe que o marca, e o indicador do desktop é um sublinhado que não funciona em lista vertical.
- **Como fazer:** aplicar a mesma expressão de estado ativo de `src/components/Layout.tsx:158` na linha 196, e criar um indicador próprio para a lista vertical em `src/styles.css:744-751` (barra lateral ou marcador), baseado na marcação de página corrente.
- **Benefício:** orientação no dispositivo onde o menu é mais usado.
- **Referência:** Material Design 3, item de navegação ativo.
- Depende de: N-052.
- **[mockup]**

### N-105 · [alto · S] · Glossário de rótulos em um só arquivo
- **O que é:** cinco palavras nomeiam o mesmo objeto de negócio: orçamento, briefing, proposta, pedido e solicitação. E "minha seleção" nomeia dois destinos.
- **Como fazer:** um arquivo de rótulos consumido por `src/components/Layout.tsx:14, 147, 177, 198, 216, 221`, `src/components/QuoteDrawer.tsx:267`, `src/pages/HomePage.tsx:211`, `src/pages/CatalogsPage.tsx:285`, `src/pages/BackofficePage.tsx:179` e `src/pages/ProductPage.tsx:141`.
- **Benefício:** o visitante deixa de precisar deduzir que dois nomes são a mesma coisa.
- **Referência:** NN/g, consistência de terminologia.
- Equivalente a N-058; executar uma das duas.

### N-106 · [alto · S] · Navegação principal enxugada
- **O que é:** o menu tem sete itens, dois deles institucionais, que competem com os caminhos de conversão.
- **Como fazer:** manter no cabeçalho catálogo, coleções, datas comemorativas, montar kit e tendências; deixar sobre e contato apenas no rodapé, onde já existem (`src/components/Layout.tsx:13-21`).
- **Benefício:** menos escolhas no topo, mais peso para os caminhos que levam ao orçamento.
- **Referência:** NN/g, limites de navegação principal.
- **[mockup]**

### N-107 · [médio · S] · Acesso permanente à seleção no celular
- **O que é:** o botão flutuante de seleção aparece apenas quando há itens, então o visitante não aprende que ele existe.
- **Como fazer:** manter o botão em estado educativo e reduzido quando a seleção está vazia, em `src/components/Layout.tsx:259-263` e `src/styles.css:2656-2682`.
- **Benefício:** o visitante descobre o mecanismo de seleção antes de precisar dele.
- **Referência:** Material Design 3, botão de ação flutuante.
- **[mockup]**

### N-108 · [médio · S] · Estado ativo e foco próprios nos botões
- **O que é:** o botão não tem estado pressionado nem anel de foco próprio.
- **Como fazer:** completar os estados em `src/styles.css:426-520`, com variante sem deslocamento sob a preferência de menos movimento.
- **Benefício:** cada ação passa a confirmar que foi acionada.
- **Referência:** Material Design 3, estados de interação.
- Equivalente a N-080; executar uma das duas.

### N-109 · [médio · S] · Estados do botão de texto
- **O que é:** o botão de texto não tem estado de passagem nem desabilitado, mas é usado com desabilitado.
- **Como fazer:** acrescentar as regras em `src/styles.css:538-553`.
- **Benefício:** ações secundárias deixam de parecer inativas quando estão ativas, e vice-versa.
- **Referência:** Material Design 3, botão de texto.

### N-110 · [médio · S] · Cursor coerente com o motivo do bloqueio
- **O que é:** todo botão desabilitado mostra cursor de espera, inclusive os que não esperam rede.
- **Como fazer:** em `src/styles.css:442-445`, usar cursor de ação indisponível no desabilitado e reservar o de espera para o estado de ocupado declarado.
- **Benefício:** o visitante distingue "não pode" de "estou processando".
- **Referência:** convenção de cursores.

### N-111 · [médio · S] · Alvo de "adicionar" do cartão de produto
- **O que é:** o alvo de adicionar tem 40 pixels no celular, abaixo do mínimo recomendado.
- **Como fazer:** elevar o alvo no bloco de tela pequena que já trata o rodapé do cartão em `src/styles.css:3865-3867`, sem mudar a aparência do botão.
- **Benefício:** menos toques errados na ação mais repetida do catálogo.
- **Referência:** WCAG 2.5.8; Apple HIG e Material Design 3, tamanho de alvo.
- **[mockup]**

### N-112 · [médio · S] · Navegação secundária do rodapé com alvo e estado
- **O que é:** 17 links de rodapé sem altura mínima e sem indicação de página atual.
- **Como fazer:** altura mínima e espaçamento em `src/styles.css:3702-3712`, e marcação de página corrente nos links de `src/components/Layout.tsx:214-243`.
- **Benefício:** o rodapé passa a ser navegável no celular e orienta como o menu.
- **Referência:** WCAG 2.5.8 e 3.2.3.

### N-113 · [médio · S] · Contato acessível no celular
- **O que é:** telefone e contato por mensagem desaparecem por completo no celular.
- **Como fazer:** acrescentar um bloco de contato ao fim da navegação de celular em `src/components/Layout.tsx:200`, reaproveitando os destinos já usados no cabeçalho.
- **Benefício:** o canal mais usado em compra B2B volta a existir no dispositivo mais usado.
- **Referência:** NN/g, acesso a contato em site de serviço.
- **[mockup]**

### N-114 · [médio · S] · Botão de fechar único para as sobreposições
- **O que é:** cada sobreposição tem seu próprio botão de fechar, com tamanhos e nomes diferentes.
- **Como fazer:** um componente de botão de fechar usado em `src/components/Layout.tsx:269, 276`, `src/pages/CommemorativeDatesPage.tsx:337, 347`, `src/components/QuoteDrawer.tsx` e `src/components/ProductGallery.tsx`.
- **Benefício:** o visitante encontra o fechar no mesmo lugar e com o mesmo tamanho em toda sobreposição.
- **Referência:** prática de sistema de design.
- Depende de: N-032.

### N-115 · [médio · M] · Um só padrão de chip de filtro
- **O que é:** quatro famílias de botão de filtro com aparências diferentes para a mesma função.
- **Como fazer:** uma classe de chip com estado pressionado, substituindo as variantes de `src/styles.css:96, 6158`, `src/pages/CatalogsPage.tsx:241-247` e `src/pages/CommemorativeDatesPage.tsx`.
- **Benefício:** o visitante reconhece o que é filtro e o que está ativo em qualquer tela.
- **Referência:** Material Design 3, chips de filtro.
- **[mockup]**

### N-116 · [baixo · S] · Âncoras de rolagem diferentes de troca de rota
- **O que é:** âncoras que rolam na mesma página têm exatamente a aparência dos chamados que trocam de rota.
- **Como fazer:** ícone de direção para baixo e um modificador próprio nas âncoras de `src/pages/CatalogsPage.tsx:204`, `src/pages/CommemorativeDatesPage.tsx:292` e `src/pages/HomePage.tsx:177`, reservando a seta para a direita para navegação.
- **Benefício:** o visitante sabe se o clique troca de página ou desce na mesma.
- **Referência:** Material Design 3, ícones de direção.

### N-117 · [baixo · S] · Variante de link declarada de fato
- **O que é:** uma variante de link é usada em uma página mas nunca definida no estilo, e há regras mortas no ponto de quebra de celular.
- **Como fazer:** definir a variante junto das demais em `src/styles.css:533` e remover as regras mortas de `:6410-6412`.
- **Benefício:** o link em fundo escuro deixa de herdar a cor errada.
- **Referência:** prática de sistema de design.

### N-118 · [médio · S] · Documentar o sistema de navegação no próprio repositório
- **O que é:** registrar as variantes válidas de botão, o glossário de rótulos e a política de retorno onde quem implementa vai ler.
- **Como fazer:** uma seção no arquivo de convenções do projeto (`.claude/skills/promo-brindes-v1/SKILL.md` e a cópia em `.agents/`), com três tabelas curtas. Rodar `npm run agents:instructions:check` no mesmo PR.
- **Benefício:** a próxima tela nasce consistente sem depender de quem a escreve.
- **Referência:** prática de sistema de design.
- Depende de: N-102, N-105, N-028.

---

# Bloco 6 — Acessibilidade e inclusão na navegação (N-119 a N-138)

## O problema central

A navegação por teclado quebra em três pontos: campos de busca que perdem o indicador de foco por completo, opções de sugestão que são botões focáveis dentro de um padrão que não admite isso, e sobreposições que declaram ser modais sem neutralizar o resto da página. A troca de rota move o foco, mas não anuncia nada.

### N-119 · [alto · S] · Devolver o indicador de foco aos campos de busca
- **O que é:** a busca de celular e o controle de quantidade removem o contorno de foco sem colocar nada no lugar.
- **Como fazer:** remover a anulação do contorno em `src/styles.css:764-769` e `:2240-2249`, deixando o padrão global agir, ou espelhar o anel já usado nos outros campos.
- **Benefício:** quem navega por teclado volta a ver onde está nos dois controles mais usados.
- **Referência:** WCAG 2.4.7 (foco visível).

### N-120 · [alto · S] · Token único de anel de foco
- **O que é:** o anel de foco dos campos muda de intensidade entre telas e em uma delas fica abaixo do contraste mínimo.
- **Como fazer:** um token de anel de foco nas variáveis de `src/styles.css:239`, aplicado nas quatro regras de `:662-667, 881-884, 1486-1488, 5164-5167`, com variante clara para os blocos escuros, no padrão já usado no rodapé.
- **Benefício:** o foco fica igualmente visível em fundo claro e escuro.
- **Referência:** WCAG 2.4.11 e 1.4.11 (contraste não textual).
- Depende de: N-119.

### N-121 · [alto · M] · Sugestões de busca no padrão correto
- **O que é:** as opções de sugestão são botões focáveis, o que quebra o padrão de caixa de combinação: o leitor de tela anuncia a lista de forma errada e a tabulação entra na lista.
- **Como fazer:** em `src/components/SearchAutocomplete.tsx:119-134`, trocar os botões por elementos de opção não focáveis, mantendo a navegação por setas e a seleção por clique que já existem.
- **Benefício:** a busca passa a ser utilizável por leitor de tela, hoje o caminho mais rápido para o produto.
- **Referência:** WAI-ARIA Authoring Practices, padrão de caixa de combinação.

### N-122 · [alto · S] · Anunciar quantas sugestões apareceram
- **O que é:** a lista de sugestões aparece sem anúncio, então quem não vê a tela não sabe que ela existe.
- **Como fazer:** uma região de status ao lado da lista em `src/components/SearchAutocomplete.tsx`, informando a contagem, e restaurar o termo digitado ao pressionar a tecla de escape.
- **Benefício:** paridade entre quem vê a lista e quem a ouve.
- **Referência:** WCAG 4.1.3.
- Depende de: N-121.

### N-123 · [alto · M] · Neutralizar o fundo das sobreposições
- **O que é:** as sobreposições declaram ser modais sem tornar o resto da página inerte, então leitor de tela e busca do navegador continuam alcançando o conteúdo de trás.
- **Como fazer:** aplicar a propriedade de inércia ao conteúdo principal e ao cabeçalho enquanto houver camada aberta, em `src/components/Layout.tsx:142, 205`, `src/components/QuoteDrawer.tsx:172` e `src/pages/CatalogPage.tsx:55`.
- **Benefício:** a promessa de "modal" passa a valer para todas as formas de navegação, não só para a tabulação.
- **Referência:** WAI-ARIA Authoring Practices, diálogo modal.
- Equivalente a N-043; executar uma das duas.

### N-124 · [alto · S] · Rolagem interna no painel do menu de celular
- **O que é:** com a rolagem do corpo travada, o menu não rola e corta os últimos destinos.
- **Como fazer:** altura máxima e rolagem interna em `src/styles.css:734-738`, com contenção de rolagem.
- **Benefício:** todos os destinos voltam a ser alcançáveis no celular.
- **Referência:** WCAG 1.4.10 (refluxo).
- Equivalente a N-036 e à etapa correspondente do plano técnico; executar uma só.

### N-125 · [médio · S] · Menu de celular: escolher entre revelação e modal
- **O que é:** o painel declara ser modal e ao mesmo tempo se comporta como revelação simples, sem botão de fechar dentro da armadilha de foco.
- **Como fazer:** ou remover a declaração de modal em `src/components/Layout.tsx:186`, mantendo-o como revelação com o botão do cabeçalho como alternância, ou acrescentar um botão de fechar como primeiro filho do painel e um título ligado por identificador.
- **Benefício:** o comportamento passa a ser o que o leitor de tela anuncia.
- **Referência:** WAI-ARIA Authoring Practices, revelação e diálogo.

### N-126 · [médio · S] · Papel nos contêineres que hoje têm nome ignorado
- **O que é:** o nome acessível aplicado a elementos sem papel é descartado pela interface de acessibilidade, em três pontos de navegação.
- **Como fazer:** acrescentar papel de grupo em `src/pages/CatalogPage.tsx:43, 65` e `src/components/QuoteDrawer.tsx:237`, ou trocar por título oculto com ligação por identificador.
- **Benefício:** os agrupamentos de busca rápida e de filtros ativos passam a ter nome.
- **Referência:** WAI-ARIA, nomes proibidos em papel genérico.
- **[190]** mesma etapa do plano técnico.

### N-127 · [médio · S] · Anunciar a nova página na troca de rota
- **O que é:** a troca de rota move o foco, mas não anuncia nada.
- **Como fazer:** uma região de status no layout alimentada após a troca de caminho, lendo o título da página.
- **Benefício:** quem usa leitor de tela sabe que a navegação ocorreu.
- **Referência:** WCAG 4.1.3.
- Equivalente a N-055; executar uma das duas.

### N-128 · [médio · M] · Altura do cabeçalho medida de verdade
- **O que é:** o deslocamento de rolagem usa uma altura de cabeçalho fixa em pixels, então em zoom ou com texto maior o alvo da âncora fica atrás do cabeçalho.
- **Como fazer:** medir o cabeçalho e publicar a altura como variável em `src/components/Layout.tsx:150`, usada por `src/styles.css:258, 265-268`.
- **Benefício:** com zoom de 200 por cento, o conteúdo apontado por uma âncora deixa de ficar encoberto.
- **Referência:** WCAG 2.4.11 (foco não obscurecido).

### N-129 · [médio · S] · Aviso de desfazer com tempo suficiente e foco gerenciado
- **O que é:** o aviso desaparece em oito segundos, embora contenha uma ação.
- **Como fazer:** elevar o prazo ou remover o descarte automático em `src/context/QuoteCartContext.tsx:29-39`, deixando o fechamento no botão que já existe, e mover o foco para a ação quando a limpeza for total.
- **Benefício:** quem lê devagar ou usa teclado consegue desfazer.
- **Referência:** WCAG 2.2.1 (ajuste de tempo).
- Equivalente a N-039; executar uma das duas.

### N-130 · [médio · S] · Segundo atalho para os resultados do catálogo
- **O que é:** o site tem um único atalho de pular, para o conteúdo; os filtros e os resultados não têm.
- **Como fazer:** um atalho para o título dos resultados em `src/pages/CatalogPage.tsx:27, 62`, com o estilo de atalho já existente em `src/styles.css:344`.
- **Benefício:** quem usa teclado chega aos produtos sem percorrer cabeçalho, busca e filtros.
- **Referência:** WCAG 2.4.1 (ignorar blocos).
- Equivalente a N-066; executar uma das duas.

### N-131 · [médio · M] · Marcação de página atual além do menu principal
- **O que é:** a marcação de página corrente existe só nos itens do menu principal.
- **Como fazer:** exportar a função de comparação de caminho para um módulo de navegação e aplicá-la também no rodapé e na barra de atendimento, tratando as rotas filhas (ficha de produto conta como catálogo, orçamento conta como seleção).
- **Benefício:** orientação consistente nas três superfícies de navegação.
- **Referência:** WCAG 3.2.3.
- Depende de: N-052, N-105.

### N-132 · [médio · S] · Alvo de toque dos atalhos de atendimento
- **O que é:** os links da barra de atendimento têm cerca de 17 pixels de altura de área de toque.
- **Como fazer:** altura mínima nos links e na própria barra em `src/styles.css:556-564, 4099-4100`, sem mudança visual perceptível.
- **Benefício:** telefone e contato por mensagem ficam acionáveis no celular.
- **Referência:** WCAG 2.5.8.

### N-133 · [médio · S] · Trilha como lista ordenada
- **O que é:** a trilha do produto não é uma lista, então o leitor de tela não informa a posição nem o total de níveis.
- **Como fazer:** envolver em lista ordenada com um item por nível e marcar o último como página corrente em `src/pages/ProductPage.tsx:140-142`; o estilo atual continua valendo.
- **Benefício:** a trilha passa a ser navegável por estrutura.
- **Referência:** WAI-ARIA Authoring Practices, padrão de trilha.
- Equivalente a N-051; executar uma das duas.

### N-134 · [baixo · L] · Pontos de quebra e alturas em unidades relativas
- **O que é:** os 38 pontos de quebra estão em pixels, e as alturas de controle são fixas, então aumentar o tamanho da fonte do sistema não reorganiza o layout.
- **Como fazer:** converter os pontos de quebra para unidades relativas e trocar altura fixa por altura mínima nos campos de busca em `src/styles.css`.
- **Benefício:** quem aumenta a fonte do navegador passa a receber o layout de tela menor, em vez de texto cortado.
- **Referência:** WCAG 1.4.4 (redimensionar texto) e 1.4.10.

### N-135 · [baixo · S] · Miniaturas da galeria navegáveis por teclado
- **O que é:** a faixa de miniaturas rola horizontalmente sem alternativa de teclado, embora o projeto já tenha esse padrão em outro lugar.
- **Como fazer:** aplicar em `src/components/ProductGallery.tsx:81` o mesmo padrão de região rolável com nome e foco já usado na grade de destaques.
- **Benefício:** quem usa teclado alcança todas as fotos do produto.
- **Referência:** WCAG 2.1.1 (teclado).

### N-136 · [baixo · S] · Setas de navegação também na galeria em linha
- **O que é:** as setas do teclado trocam a foto apenas na ampliação, não na galeria da página.
- **Como fazer:** extrair o tratador de teclas de `src/components/ProductGallery.tsx:38-53` e aplicá-lo também à galeria em linha.
- **Benefício:** mesma interação dentro e fora da ampliação.
- **Referência:** WAI-ARIA Authoring Practices, carrossel.

### N-137 · [médio · M] · Testes de acessibilidade da navegação
- **O que é:** cobertura de atalho de pular, sobreposições abertas e tela estreita, hoje ausente.
- **Como fazer:** em `e2e/smoke.spec.ts`, junto dos blocos de verificação automática: tabular e conferir o atalho de pular; rodar a verificação com painel de seleção, menu e filtros abertos; repetir em 360 pixels de largura.
- **Benefício:** as etapas deste bloco deixam de depender de inspeção manual.
- **Referência:** prática de teste de acessibilidade.
- **[190]** complementa as etapas de varredura em sobreposições.
- Depende de: N-119, N-121, N-123, N-124.

### N-138 · [médio · M] · Foco programático nos estados vazio e de erro
- **O que é:** submeter uma busca ou cair em erro não move o foco, então quem usa leitor de tela não percebe o resultado.
- **Como fazer:** dar foco ao título dos resultados após submeter a busca em `src/pages/CatalogPage.tsx:62` e `src/lib/useCatalogPageState.ts`, e ao bloco de erro em `src/components/CatalogFeedback.tsx`.
- **Benefício:** o resultado da ação chega a quem não vê a tela.
- **Referência:** WCAG 2.4.3; WAI-ARIA, mensagens de status.
- Depende de: N-127.

---

# Bloco 7 — Fluxos de várias etapas: progresso, salvar, retomar e sair (N-139 a N-160)

## O problema central

O briefing tem rascunho, mas ele é recuperado em silêncio: os campos voltam preenchidos sem nenhum aviso de onde vieram. A barra de etapas não diz em que passo o visitante está. A confirmação e o número de protocolo existem só na memória da aplicação: recarregar apaga a prova do envio. A composição do montar kit não é persistida em lugar nenhum. E apagar o rascunho é irreversível, embora remover um produto tenha desfazer.

### N-139 · [alto · S] · Aviso de rascunho recuperado, com data e saída
- **O que é:** quando o briefing volta preenchido, o visitante é avisado de quando aquele rascunho foi salvo e pode descartá-lo.
- **Como fazer:** `src/lib/quoteDraft.ts` já grava o instante da última alteração; expor esse valor no carregamento e exibir um aviso em `src/pages/QuotePage.tsx:71, 82, 497` com a data e a ação de descartar.
- **Benefício:** acaba a confusão de "quem preencheu isso?", que faz o visitante apagar tudo por desconfiança.
- **Referência:** NN/g, salvamento automático e transparência de estado.

### N-140 · [alto · S] · Progresso textual e etapa atual marcada
- **O que é:** a barra de etapas passa a dizer "Passo 2 de 3" em texto e a marcar a etapa atual para leitor de tela.
- **Como fazer:** em `src/pages/QuotePage.tsx:466`, acrescentar a contagem acima da lista, marcar o item atual como etapa corrente e tornar o ícone de concluído decorativo.
- **Benefício:** o visitante sabe quanto falta, o que é o principal determinante de conclusão em formulário longo.
- **Referência:** NN/g, indicadores de progresso; WAI-ARIA, etapa atual.

### N-141 · [alto · M] · Protocolo com endereço próprio, sobrevivente a recarregar
- **O que é:** a confirmação do envio ganha URL própria e um registro que sobrevive a recarregar a página.
- **Como fazer:** gravar os dados da confirmação no armazenamento de sessão ao receber a resposta de criação em `src/pages/QuotePage.tsx:330`, e registrar a rota de confirmação em `src/App.tsx` lendo esse registro.
- **Benefício:** o visitante não perde o número de protocolo por recarregar, e pode mostrá-lo a um colega.
- **Referência:** Material Design 3, estado em URL.
- Equivalente a N-014; executar uma das duas.

### N-142 · [alto · M] · Rascunho da composição do kit
- **O que é:** o montar kit passa a salvar a composição no mesmo padrão do briefing.
- **Como fazer:** novo `src/lib/kitDraft.ts` espelhando `src/lib/quoteDraft.ts` (mesma validação de forma, mesma expiração), guardando estrutura escolhida, espaços preenchidos, nome e quantidade; hidratar no carregamento de `src/pages/KitBuilderPage.tsx:17-25`.
- **Benefício:** sair da página deixa de destruir uma composição que leva vários minutos para montar.
- **Referência:** NN/g, salvar e retomar.

### N-143 · [alto · S] · Desfazer ao apagar o rascunho
- **O que é:** apagar o rascunho passa a ter desfazer, como já tem a remoção de produto.
- **Como fazer:** guardar o conteúdo apagado em uma referência em `src/pages/QuotePage.tsx:238-245` e exibir o mesmo aviso de desfazer usado pela seleção.
- **Benefício:** remove uma ação destrutiva sem volta de uma tela que contém dados pessoais já digitados.
- **Referência:** NN/g, desfazer em vez de confirmar.

### N-144 · [alto · M] · Tornar o reenvio do acesso visível, com contagem e foco
- **O que é:** o reenvio existe, mas ninguém o encontra: submeter com o campo de código vazio reenvia o e-mail, e nada na tela diz isso.
- **Como fazer:** após o envio em `src/pages/CustomerLoginPage.tsx:64-66`, mover o foco ao campo de código e exibir um bloco "Não recebeu? Reenviar" com contagem mínima entre tentativas, mostrando o e-mail de destino. **Verificado por leitura direta nesta sessão:** `CustomerLoginPage.tsx:50` só valida o código quando ele está preenchido; com o campo vazio o fluxo cai em `:58-66` e reenvia.
- **Benefício:** quem não recebe o e-mail tem saída dentro da tela, em vez de abandonar o acesso.
- **Referência:** NN/g, autenticação sem senha.

### N-145 · [alto · M] · Diagnóstico correto do link expirado
- **O que é:** um link de acesso vencido recebe hoje o diagnóstico errado e nenhum caminho de recuperação.
- **Como fazer:** ler o código de erro devolvido na URL em `src/pages/AuthConfirmPage.tsx:18-21, 35` e ramificar a mensagem (vencido, já usado, inválido), cada uma com a ação correspondente.
- **Benefício:** transforma um beco sem saída no fluxo de login em um novo pedido de acesso.
- **Referência:** NN/g, mensagens de erro acionáveis.
- Depende de: N-012.

### N-146 · [médio · M] · Aviso ao trocar a estrutura do kit
- **O que é:** trocar a estrutura esconde componentes já escolhidos, sem aviso e sem forma de ver o que saiu.
- **Como fazer:** em `src/pages/KitBuilderPage.tsx:42-48`, comparar os espaços preenchidos com os da nova estrutura e, havendo perda, pedir confirmação nomeando o que sai.
- **Benefício:** evita perda silenciosa de escolhas no meio da composição.
- **Referência:** NN/g, prevenção de erro.

### N-147 · [médio · M] · Validação por campo no momento de sair do campo
- **O que é:** nenhum campo é validado antes do envio: o visitante só descobre os erros depois de preencher tudo.
- **Como fazer:** validar ao sair de cada campo em `src/pages/QuotePage.tsx:191-196, 264-268, 510-513`, reaproveitando a função de validação existente para uma chave só, e manter o foco no primeiro erro no envio. Acrescentar um resumo de erros no topo do formulário com âncoras.
- **Benefício:** corrige o erro mais custoso do formulário longo: descobrir tudo no fim.
- **Referência:** NN/g, validação em linha.

### N-148 · [médio · S] · Erro por campo e medidor de força ao definir senha
- **O que é:** três falhas distintas são colapsadas em um erro só, sem validação em linha e sem indicação de força.
- **Como fazer:** separar as mensagens por campo em `src/pages/SetPasswordPage.tsx:22, 40`, marcar os campos como inválidos, ligar à mensagem, focar o primeiro inválido e exibir a força da senha.
- **Benefício:** o visitante entende qual campo corrigir, em vez de tentar de novo às cegas.
- **Referência:** WCAG 3.3.1 e 3.3.3; NN/g, criação de senha.
- **[190]** relacionado à etapa de separação de mensagens.

### N-149 · [médio · S] · Recibo visível da senha alterada
- **O que é:** a senha é trocada sem confirmação visível: o visitante é redirecionado e não sabe se funcionou.
- **Como fazer:** redirecionar com um indicador na URL em `src/pages/SetPasswordPage.tsx:39` e exibir a confirmação como mensagem de status na área do cliente.
- **Benefício:** fecha o ciclo da ação mais sensível da conta.
- **Referência:** NN/g, confirmação de ação.

### N-150 · [médio · S] · Rascunho do formulário de contato
- **O que é:** o formulário de contato não salva nada, ao contrário do briefing.
- **Como fazer:** novo `src/lib/contactDraft.ts` no mesmo padrão do rascunho do briefing, consumido por `src/components/ConversationForm.tsx:36, 130`, com aviso de recuperação.
- **Benefício:** quem fecha a aba sem enviar volta e continua.
- **Referência:** NN/g, salvamento automático.
- Equivalente a N-048; executar uma das duas.

### N-151 · [médio · M] · Bloquear o envio durante o anexo e mostrar progresso por arquivo
- **O que é:** o envio do briefing não espera o anexo em andamento, e o progresso não é mostrado por arquivo.
- **Como fazer:** o componente de anexo informa seu estado de ocupado ao formulário (`src/components/BriefingAssetUploader.tsx:119, 126`), e o botão de envio de `src/pages/QuotePage.tsx:549` respeita esse estado; exibir progresso por arquivo.
- **Benefício:** evita o pedido enviado sem o anexo que o visitante acabou de escolher.
- **Referência:** NN/g, envio de arquivos.

### N-152 · [médio · S] · Anexos no rascunho do briefing
- **O que é:** os arquivos anexados não entram no rascunho, então retomar perde a referência a eles.
- **Como fazer:** incluir os identificadores dos anexos no rascunho em `src/pages/QuotePage.tsx:84, 182` e, na retomada, validar contra os anexos que ainda existem.
- **Benefício:** retomar o briefing deixa de pedir o mesmo arquivo de novo.
- **Referência:** NN/g, salvar e retomar com anexos.
- Depende de: N-139.

### N-153 · [médio · S] · Nomear o que veio do orçamento repetido
- **O que é:** o briefing pré-preenchido pela função de repetir orçamento não é anunciado quando a campanha está vazia, e o aviso não diz o que foi recuperado.
- **Como fazer:** ajustar a condição e o texto em `src/pages/QuotePage.tsx:72-77, 498`, nomeando os campos trazidos (verba, data do evento, canal de resposta).
- **Benefício:** o visitante confia no que está na tela porque sabe de onde veio.
- **Referência:** NN/g, transparência de pré-preenchimento.
- Depende de: N-139.

### N-154 · [médio · S] · Desfazer ao recomeçar o questionário de campanha
- **O que é:** recomeçar apaga todas as respostas sem confirmação, e descarta o próprio desfazer que o componente já possui.
- **Como fazer:** guardar o estado anterior na referência existente em `src/components/CampaignFinder.tsx:142-150` e exibir o aviso com desfazer.
- **Benefício:** o visitante explora o questionário sem medo de perder as respostas.
- **Referência:** NN/g, desfazer.

### N-155 · [médio · S] · Desfazer ao remover componente do kit
- **O que é:** remover um componente da composição não tem volta.
- **Como fazer:** guardar o componente removido em `src/pages/KitBuilderPage.tsx:105` e oferecer desfazer no resumo da composição.
- **Benefício:** simetria com a seleção de produtos, que já tem desfazer.
- **Referência:** NN/g, desfazer.
- Depende de: N-142.

### N-156 · [médio · S] · Etapas reais no montar kit
- **O que é:** os rótulos "01 estrutura" e "02 produtos" são decorativos; passam a indicar estado de conclusão.
- **Como fazer:** em `src/pages/KitBuilderPage.tsx:91, 112`, transformar os rótulos em um indicador de etapas com progresso ("2 de 3 espaços preenchidos"), com o estilo correspondente.
- **Benefício:** o visitante sabe o que falta para concluir a composição.
- **Referência:** NN/g, indicadores de progresso.
- **[mockup]**

### N-157 · [médio · S] · Separar as três causas do erro de saída do kit
- **O que é:** o erro ao levar o kit para a seleção mistura três causas distintas em uma frase só.
- **Como fazer:** ramificar conforme o retorno das funções de composição em `src/pages/KitBuilderPage.tsx:78`, nomeando o produto em conflito, o limite atingido ou a falha genérica, e comunicar o limite antes de o visitante chegar nele.
- **Benefício:** o visitante sabe o que fazer em vez de tentar de novo.
- **Referência:** NN/g, mensagens de erro acionáveis.

### N-158 · [baixo · S] · Gravação do rascunho com atraso curto
- **O que é:** o rascunho é gravado a cada caractere e também a cada mudança de aviso.
- **Como fazer:** aplicar um atraso curto antes de gravar e remover o aviso das dependências do efeito em `src/pages/QuotePage.tsx:177-189`.
- **Benefício:** menos escrita no armazenamento e menos trabalho por tecla em aparelho modesto.
- **Referência:** prática de salvamento com atraso.
- **[190]** mesma etapa do plano técnico.

### N-159 · [baixo · S] · Explicar a diferença entre seleção e rascunho na retenção
- **O que é:** o aviso de retenção trata seleção de produtos e dados pessoais do formulário como a mesma coisa, mas as regras de validade são diferentes.
- **Como fazer:** ajustar o texto de `src/pages/QuotePage.tsx:497` para distinguir os dois, com o prazo de cada um.
- **Benefício:** o visitante entende por que a seleção continua e os dados pessoais não.
- **Referência:** transparência de retenção.

### N-160 · [médio · S] · Eventos de funil dentro dos fluxos de várias etapas
- **O que é:** o funil não vê nada dentro do briefing: não há como saber onde as pessoas desistem.
- **Como fazer:** acrescentar ao mapa de eventos de `src/lib/analytics.ts:18-21` e à lista de propriedades permitidas: rascunho retomado com idade, validação falhada por campo, composição de kit iniciada e concluída, etapa de briefing alcançada.
- **Benefício:** mostra em qual campo o visitante para, que é a informação que falta para melhorar a conversão.
- **Referência:** prática de instrumentação de funil.
- Depende de: N-191.

---

# Bloco 8 — Busca, filtros, estado na URL e múltiplas abas (N-161 a N-178)

## O problema central

Os filtros vivem na URL, o que é correto, mas cada toque empilha uma entrada no histórico: depois de refinar seis vezes e abrir um produto, voltar exige seis cliques para sair do catálogo. Toda mudança de filtro troca a grade inteira por esqueleto, mesmo com os dados anteriores em memória. A comparação não está na URL nem sincroniza entre abas, ao contrário da seleção. E não há como compartilhar uma busca filtrada, embora o site tenha esse recurso em quatro outras telas.

### N-161 · [alto · S] · Histórico granular: substituir ao refinar, empilhar ao buscar
- **O que é:** refinamento de filtro passa a substituir a entrada do histórico; busca, código e página continuam empilhando.
- **Como fazer:** em `src/lib/useCatalogPageState.ts:262-268`, aceitar o modo de histórico como opção e aplicá-lo por tipo de mudança, nas chamadas de filtro, busca, código exato e limpar.
- **Benefício:** voltar passa a desfazer uma decisão, não um ajuste fino; sair do catálogo deixa de exigir seis cliques.
- **Referência:** Material Design 3, comportamento de retorno previsível.
- Equivalente a N-016; executar uma das duas.

### N-162 · [alto · S] · Resultados anteriores em estado desatualizado, não esqueleto
- **O que é:** mudar um filtro apaga a grade e mostra esqueleto, mesmo quando os produtos anteriores já estão em memória.
- **Como fazer:** em `src/pages/CatalogPage.tsx:74-78`, usar esqueleto apenas quando não há nada em tela e, nos demais casos, manter a grade marcada como ocupada e esmaecida.
- **Benefício:** o visitante mantém a referência do que estava vendo ao refinar, o que reduz o abandono no catálogo.
- **Referência:** NN/g, atualização de listas sem perda de contexto.
- Equivalente a N-090; executar uma das duas.
- **[mockup]**

### N-163 · [alto · S] · Compartilhar a busca filtrada
- **O que é:** não há como compartilhar o catálogo filtrado, embora o padrão exista em coleções, datas, seleção e produto.
- **Como fazer:** um botão de compartilhar na barra de resultados de `src/pages/CatalogPage.tsx:61`, reaproveitando o fluxo já implementado em `src/pages/CatalogsPage.tsx:161-178`, com cópia para a área de transferência como alternativa e mensagem de status.
- **Benefício:** em compra B2B a decisão é coletiva; sem isso o visitante manda uma captura de tela.
- **Referência:** Baymard, compartilhamento de listas.

### N-164 · [alto · M] · Chips como fonte única dos filtros ativos
- **O que é:** o contador de filtros ativos não bate com os chips mostrados quando o briefing aplica um sinal, então o visitante vê "3 filtros" e dois chips.
- **Como fazer:** derivar a contagem da própria lista de chips em `src/lib/useCatalogPageState.ts:146-147`, expondo uma lista com rótulo, origem e função de remoção, consumida por `src/pages/CatalogPage.tsx:65-72`.
- **Benefício:** o visitante consegue desfazer exatamente o que está aplicado, inclusive o que veio do briefing.
- **Referência:** Baymard, filtros aplicados visíveis e removíveis.

### N-165 · [médio · S] · "Limpar tudo" não deve apagar a ordenação
- **O que é:** limpar os filtros também apaga a ordenação escolhida, sem aviso e sem chip que a represente.
- **Como fazer:** preservar a ordenação em `src/lib/useCatalogPageState.ts:279`, e separar na interface o que é filtrar do que é ordenar.
- **Benefício:** o visitante não perde a ordem que escolheu ao limpar um filtro.
- **Referência:** NN/g, ordenação e filtragem como controles distintos.

### N-166 · [médio · M] · Comparação na URL e sincronizada entre abas
- **O que é:** a comparação não está na URL nem sincroniza entre abas, ao contrário da seleção de orçamento.
- **Como fazer:** refletir os identificadores comparados em um parâmetro de consulta e trocar o armazenamento de sessão por armazenamento compartilhado com escuta de alteração, em `src/lib/catalogComparison.ts:51-53` e `src/lib/useCatalogPageState.ts:71`.
- **Benefício:** a comparação passa a ser compartilhável e sobrevive a voltar e a abrir em outra aba.
- **Referência:** Material Design 3, estado em URL.

### N-167 · [médio · S] · Foco preservado ao remover um chip de filtro
- **O que é:** remover um chip perde o foco do teclado; o padrão de devolver o foco existe só na bandeja de comparação.
- **Como fazer:** replicar o padrão da bandeja na faixa de chips de `src/pages/CatalogPage.tsx:66-72`, focando o chip seguinte ou a ação de limpar quando era o último.
- **Benefício:** quem filtra por teclado não é jogado para o início da página a cada remoção.
- **Referência:** WCAG 2.4.3; WAI-ARIA Authoring Practices, gerenciamento de foco.

### N-168 · [médio · M] · Painel de filtros de celular no histórico
- **O que é:** o painel de filtros não participa do histórico, então o gesto de voltar muda um filtro em vez de fechar o painel.
- **Como fazer:** abrir o painel com entrada de histórico própria e fechá-lo no evento de retorno, em `src/lib/useCatalogPageState.ts:246-247`.
- **Benefício:** o gesto mais usado do celular passa a fazer o que o visitante espera dentro do painel.
- **Referência:** Material Design 3, retorno preditivo.
- Depende de: N-029.

### N-169 · [médio · M] · Estado vazio que remove um filtro por vez
- **O que é:** quando a busca não retorna nada, a única saída oferecida é limpar tudo.
- **Como fazer:** em `src/components/CatalogFeedback.tsx:32-42`, receber a lista de chips e oferecer a remoção individual, além da limpeza total.
- **Benefício:** o visitante chega a um resultado sem recomeçar a busca.
- **Referência:** Baymard, estados sem resultado.
- Depende de: N-164.

### N-170 · [médio · M] · Buscas recentes no campo de busca
- **O que é:** não existem buscas recentes em nenhum ponto do site; as sugestões rápidas são uma lista fixa no código.
- **Como fazer:** novo `src/lib/recentSearches.ts` gravando os últimos termos submetidos, exibidos no campo de sugestões quando o texto digitado é curto, com rótulo próprio e opção de limpar.
- **Benefício:** quem volta ao site retoma a pesquisa anterior em um toque.
- **Referência:** NN/g, histórico de busca.

### N-171 · [médio · S] · Primeira sugestão sempre "buscar o termo digitado"
- **O que é:** a lista de sugestões não oferece a busca literal pelo que foi digitado, então um termo sem correspondência exata parece não ter resultado.
- **Como fazer:** prefixar a lista em `src/lib/search.ts:195-216` com a opção de buscar o texto digitado.
- **Benefício:** nenhum termo digitado fica sem caminho.
- **Referência:** WAI-ARIA Authoring Practices, caixa de combinação com valor livre.

### N-172 · [médio · S] · Anunciar a contagem de filtros junto ao total de resultados
- **O que é:** a região que anuncia o total de produtos não menciona quantos filtros estão ativos.
- **Como fazer:** compor o texto da região já existente em `src/pages/CatalogPage.tsx:63` com a contagem de filtros.
- **Benefício:** quem usa leitor de tela entende por que o total mudou.
- **Referência:** WCAG 4.1.3.
- Depende de: N-164.

### N-173 · [médio · M] · Paginar com âncora nos resultados
- **O que é:** trocar de página rola para o topo da janela, acima do cabeçalho e dos filtros.
- **Como fazer:** rolar e mover o foco para o título dos resultados em `src/pages/CatalogPage.tsx:79`, em vez do topo absoluto, e oferecer salto direto de página.
- **Benefício:** o visitante continua de onde estava lendo, sem rolar de novo.
- **Referência:** NN/g, paginação.
- Depende de: N-064.

### N-174 · [médio · M] · Sinais do briefing como chips removíveis
- **O que é:** os sinais aplicados pelo briefing aparecem como texto explicativo, não como filtros que o visitante pode remover.
- **Como fazer:** transformar cada sinal de `src/pages/CatalogPage.tsx:44` em chip removível, usando a lista única de chips.
- **Benefício:** o visitante ajusta a curadoria em vez de abandoná-la por inteiro.
- **Referência:** Baymard, filtros aplicados.
- Depende de: N-164.

### N-175 · [baixo · S] · Vocabulário único de parâmetro de categoria
- **O que é:** dois vocabulários de URL para categoria convivem: a busca do cabeçalho e da home escrevem o parâmetro antigo.
- **Como fazer:** unificar em `src/components/Layout.tsx:172` e `src/pages/HomePage.tsx:191`, e migrar o parâmetro antigo no carregamento de `src/lib/useCatalogPageState.ts:50-52`.
- **Benefício:** um link antigo continua funcionando e passa a produzir a mesma URL dos novos.
- **Referência:** prática de contrato de URL.

### N-176 · [baixo · S] · Rascunho do termo de busca por sessão
- **O que é:** o termo digitado e não submetido vive só em memória; recarregar ou duplicar a aba o perde.
- **Como fazer:** gravar o rascunho no armazenamento de sessão com atraso curto em `src/lib/useCatalogPageState.ts:68` e reidratar quando não houver termo na URL.
- **Benefício:** quem recarrega a página não precisa digitar de novo.
- **Referência:** NN/g, salvamento automático.

### N-177 · [médio · M] · Canonical e indexação do catálogo por lista de parâmetros
- **O que é:** o canonical do catálogo ignora a consulta, então toda combinação filtrada aponta para o catálogo puro.
- **Como fazer:** canonical derivado de uma lista branca de parâmetros em ordem estável, e marcação de não indexar para combinações fora dessa lista ou páginas profundas, em `src/pages/CatalogPage.tsx:28` e `src/components/Seo.tsx:37`.
- **Benefício:** as combinações que valem tráfego passam a ter endereço próprio; o resto consolida.
- **Referência:** documentação de canonical e facetas.
- **[190]** mesma etapa do plano técnico.

### N-178 · [médio · S] · Evento por filtro aplicado
- **O que é:** nenhum evento distingue qual filtro foi aplicado ou removido.
- **Como fazer:** acrescentar o evento com dimensão, ação e contagem de filtros ativos em `src/lib/analytics.ts:4-46` e disparar em `src/lib/useCatalogPageState.ts:280-286`.
- **Benefício:** mostra quais filtros levam ao produto e quais são ruído, o que orienta o que simplificar.
- **Referência:** prática de instrumentação de catálogo.
- Depende de: N-191.

---

# Bloco 9 — Celular, tablet, gestos e multi-dispositivo (N-179 a N-190)

## O que foi conferido no código

O arquivo de estilo tem 38 blocos de consulta de mídia, todos em pixels. A área segura do iOS é respeitada em um ponto (`src/styles.css:2573`), não nos demais elementos fixos. A pasta pública tem marca, ícone, imagens e o arquivo de robôs, mas **não tem manifesto de aplicativo nem ícone de toque**, então "adicionar à tela inicial" não funciona como atalho nomeado. As sobreposições abrem como painel lateral também no celular, em vez de folha inferior.

### N-179 · [alto · M] · Painel de seleção como folha inferior no celular
- **O que é:** o painel de seleção abre como painel lateral de altura cheia no celular, onde o alcance do polegar é o inverso disso.
- **Como fazer:** no ponto de quebra de celular, transformar em folha inferior com alça, altura máxima relativa à janela e cantos arredondados, em `src/styles.css:2343-2364, 3945-3948` e `src/components/QuoteDrawer.tsx:172-186`.
- **Benefício:** as ações principais ficam ao alcance do polegar, no padrão que o visitante já conhece de aplicativo.
- **Referência:** Material Design 3, folha inferior; Apple HIG, folhas.
- **[mockup]**

### N-180 · [alto · M] · Fechar a folha por gesto
- **O que é:** nenhuma sobreposição fecha por arrastar para baixo, gesto esperado em folha inferior.
- **Como fazer:** tratar o arraste vertical na alça da folha em `src/components/QuoteDrawer.tsx` e no painel de filtros de `src/pages/CatalogPage.tsx:54-61`, com limite de distância e alternativa por botão sempre presente.
- **Benefício:** fechar deixa de exigir mira no botão pequeno do canto.
- **Referência:** Material Design 3, folha inferior arrastável.
- Depende de: N-179.

### N-181 · [alto · S] · Painel de filtros também como folha inferior
- **O que é:** o painel de filtros do celular segue o mesmo formato lateral.
- **Como fazer:** aplicar o padrão de folha inferior ao painel de filtros, reaproveitando a estrutura do componente único de sobreposição.
- **Benefício:** consistência entre as duas sobreposições mais usadas no celular.
- **Referência:** Material Design 3, folha inferior.
- Depende de: N-032, N-179.
- **[mockup]**

### N-182 · [alto · S] · Deslizar entre fotos do produto
- **O que é:** a ampliação de foto não responde a deslizar, embora seja a interação esperada em galeria no celular.
- **Como fazer:** tratar o deslize horizontal na ampliação em `src/components/ProductGallery.tsx:86-96`, chamando a mesma função que as setas já usam, e manter os controles visíveis.
- **Benefício:** examinar o produto no celular passa a custar um gesto em vez de uma mira.
- **Referência:** Material Design 3, carrossel; Apple HIG, gestos.

### N-183 · [médio · S] · Não bloquear o gesto de voltar do sistema
- **O que é:** o travamento de rolagem e a contenção de rolagem nas sobreposições podem interferir no gesto de voltar na borda da tela.
- **Como fazer:** ao aplicar a contenção de rolagem no componente único de sobreposição, restringi-la ao painel e não ao documento, e conferir em aparelho real que o gesto de borda continua chegando ao navegador, agora fechando a sobreposição.
- **Benefício:** o gesto nativo passa a fechar a camada em vez de sair da página.
- **Referência:** Material Design 3, retorno preditivo.
- Depende de: N-029, N-033.

### N-184 · [médio · S] · Área segura em todos os elementos fixos
- **O que é:** a área segura do iOS é respeitada em um ponto do estilo, mas não no botão flutuante, no aviso de desfazer e no rodapé das sobreposições.
- **Como fazer:** aplicar o mesmo tratamento já usado em `src/styles.css:2573` ao botão flutuante (`:2656-2660`), ao aviso (`:3201-3205`) e ao rodapé das folhas.
- **Benefício:** no iPhone com barra inferior, esses controles deixam de ficar parcialmente cobertos.
- **Referência:** Apple HIG, áreas seguras.

### N-185 · [médio · M] · Teclado virtual não deve cobrir a ação principal
- **O que é:** com o teclado aberto, o botão de envio do briefing e o campo de código do login podem ficar sob o teclado.
- **Como fazer:** usar unidades de janela dinâmica nos contêineres de formulário e rolar o campo focado para a área visível ao receber foco, em `src/pages/QuotePage.tsx` e `src/pages/CustomerLoginPage.tsx`.
- **Benefício:** quem preenche no celular vê o que está digitando e alcança o envio.
- **Referência:** Apple HIG, teclado; Material Design 3, campos de texto.

### N-186 · [médio · S] · Manifesto de aplicativo e ícone de toque
- **O que é:** não há manifesto nem ícone de toque na pasta pública, então adicionar à tela inicial gera um atalho sem nome nem ícone adequados.
- **Como fazer:** acrescentar o manifesto com nome, cor de tema e ícones, e o ícone de toque, referenciados em `index.html`; incluir os dois no mapeamento de rotas estáticas para não caírem no tratamento de página não encontrada.
- **Benefício:** cliente recorrente passa a ter o site como atalho reconhecível no celular.
- **Referência:** especificação de manifesto de aplicativo web.
- **[190]** mesma lacuna registrada no plano técnico.

### N-187 · [médio · S] · Layout de tablet entre os dois extremos
- **O que é:** os pontos de quebra tratam celular e desktop; na faixa de tablet a grade fica larga demais para três colunas e estreita para quatro.
- **Como fazer:** revisar a grade do catálogo e o cabeçalho na faixa intermediária, usando os pontos de quebra consolidados.
- **Benefício:** o tablet deixa de receber um layout de celular esticado.
- **Referência:** Material Design 3, grades adaptativas.
- Depende de: N-134.
- **[mockup]**

### N-188 · [médio · S] · Interações que dependem de passar o mouse
- **O que é:** efeitos e informações que aparecem ao passar o mouse não têm equivalente no toque.
- **Como fazer:** condicionar essas regras ao suporte real a ponteiro e garantir que a informação exibida no estado de passagem também apareça no estado padrão ou ao tocar.
- **Benefício:** no celular nada fica escondido atrás de um gesto que não existe.
- **Referência:** WCAG 1.4.13 (conteúdo sob ponteiro ou foco).
- Equivalente a N-098; executar uma das duas.

### N-189 · [baixo · S] · Orientação horizontal no celular
- **O que é:** em celular na horizontal, a altura útil cai e as sobreposições de altura cheia ficam sem espaço para a ação principal.
- **Como fazer:** usar altura máxima relativa à janela nas folhas e permitir rolagem interna, o que também resolve o menu.
- **Benefício:** quem usa o aparelho na horizontal continua conseguindo concluir.
- **Referência:** WCAG 1.3.4 (orientação).
- Depende de: N-124, N-179.

### N-190 · [médio · M] · Teste de largura estreita nas rotas de conversão
- **O que é:** nenhum teste verifica estouro horizontal nas rotas que levam ao orçamento.
- **Como fazer:** casos em 360 pixels de largura para catálogo com bandeja de comparação, orçamento com itens, painel aberto e detalhe do orçamento, exigindo largura do documento igual à da janela.
- **Benefício:** impede a volta do estouro horizontal, que hoje só seria notado por um visitante.
- **Referência:** WCAG 1.4.10 (refluxo).
- **[190]** mesma etapa do plano técnico.

---

# Bloco 10 — Métricas, testes e iteração contínua (N-191 a N-200)

## O que existe hoje, e o buraco que a auditoria achou

Há um mapa de eventos de funil tipado em `src/lib/analytics.ts` com lista branca de propriedades, e um gancho de teste pronto para asserção de evento. O que falta é grave: **nenhum evento de navegação existe**, abrir o painel de seleção (a micro-conversão central, com seis pontos de entrada) não emite nada, e o envio de briefing pelo caminho de reserva por e-mail **não dispara o evento de envio**, então envios reais ficam fora do funil. Também não há evento de abandono de etapa, de retomada de rascunho, de erro de navegação nem de falha de carregamento. Há 62 testes de ponta a ponta e zero asserção de evento.

### N-191 · [alto · S] · Envio por caminho de reserva fora do funil
- **O que é:** o evento de briefing enviado dispara no caminho normal, mas não no caminho de reserva por e-mail, então parte dos pedidos reais não aparece no funil.
- **Como fazer:** disparar o mesmo evento no ramo de reserva de `src/pages/QuotePage.tsx:311-312, 360-363`, com a propriedade que distingue o caminho usado.
- **Benefício:** o número de pedidos medido passa a ser o número de pedidos recebidos. Sem isso, toda decisão de conversão parte de um total errado.
- **Referência:** prática de integridade de funil.

### N-192 · [alto · M] · Abrir a seleção passa a ser um evento
- **O que é:** abrir o painel de seleção não emite evento nenhum, nos seis pontos que o abrem.
- **Como fazer:** emitir o evento com o gatilho de origem (cabeçalho, botão flutuante, cartão, automático) em `src/context/QuoteCartContext.tsx:113, 126`, declarando o evento no mapa de `src/lib/analytics.ts:4-45`.
- **Benefício:** mede a micro-conversão central e mostra qual gatilho funciona, informação necessária para decidir a etapa N-031.
- **Referência:** prática de instrumentação de interface.

### N-193 · [alto · S] · Abandono de etapa visível
- **O que é:** as cinco saídas antecipadas do envio do briefing não emitem evento, então não se sabe por que o visitante não concluiu.
- **Como fazer:** emitir o evento de validação falhada com o nome do campo em cada uma das saídas de `src/pages/QuotePage.tsx:258-283`, sem nunca enviar o valor digitado.
- **Benefício:** aponta o campo que trava o pedido, que é a otimização mais rentável do site.
- **Referência:** NN/g, análise de formulários.

### N-194 · [alto · S] · Retomada e descarte de rascunho medidos
- **O que é:** o rascunho existe e é central, mas retomar e descartar não são medidos.
- **Como fazer:** emitir eventos em `src/pages/QuotePage.tsx:71` (retomada, com a idade do rascunho em faixas) e `:238-245` (descarte), ligando a retomada ao resultado final.
- **Benefício:** mostra se o rascunho salva pedidos ou se as pessoas o descartam por desconfiança, que é o que a etapa N-139 ataca.
- **Referência:** prática de instrumentação de salvamento automático.
- Depende de: N-139.

### N-195 · [alto · S] · Evento de navegação por destino e superfície
- **O que é:** nenhum evento distingue por onde o visitante chegou a um destino.
- **Como fazer:** declarar o evento com superfície (cabeçalho, menu de celular, rodapé, botão flutuante), destino e, no caso do retorno, origem; disparar nos componentes de navegação e no componente de retorno.
- **Benefício:** mede o que os blocos 1, 3 e 5 mudaram, inclusive o uso do retorno.
- **Referência:** prática de instrumentação de navegação.
- Depende de: N-003, N-051.

### N-196 · [médio · M] · Falha de carregamento e nova tentativa medidas
- **O que é:** falha de carregamento e clique em tentar novamente não são medidos em nenhuma das cinco telas que os têm; o evento de página não encontrada colapsa qualquer rota fora da lista.
- **Como fazer:** emitir o evento com superfície e motivo em `src/components/CatalogFeedback.tsx:21-30` e nas cinco telas, e separar a rota de página não encontrada na lista de rotas de `src/lib/analytics.ts:104-117`.
- **Benefício:** separa lentidão de falha e revela links internos quebrados.
- **Referência:** prática de observabilidade de cliente.

### N-197 · [médio · M] · Asserção de evento nos testes de jornada
- **O que é:** 62 testes de ponta a ponta e nenhuma asserção de evento, embora exista um gancho pronto para isso em `src/lib/analytics.ts:144-146`.
- **Como fazer:** um utilitário de leitura de eventos no diretório de testes de ponta a ponta e asserções nos pontos de jornada de `e2e/journey.spec.ts`, exigindo a sequência do funil.
- **Benefício:** impede que uma refatoração apague um evento sem ninguém notar, que é como um funil morre.
- **Referência:** prática de teste de instrumentação.
- Depende de: N-191, N-192, N-193.

### N-198 · [médio · S] · Guarda de contrato dos eventos
- **O que é:** nada garante que um evento declarado tenha ponto de disparo, nem que um disparo exista no mapa.
- **Como fazer:** um verificador em `scripts/` que compare o mapa de eventos com as chamadas no código, registrado no gate de qualidade.
- **Benefício:** o contrato de medição para de divergir em silêncio.
- **Referência:** prática de contrato verificado.
- Depende de: N-191.

### N-199 · [médio · M] · Base técnica para comparar duas variantes
- **O que é:** não há divisão por visitante, então não existe base para decidir por medição as mudanças arriscadas deste plano.
- **Como fazer:** um módulo de experimentos com divisão determinística por identificador local, exposto junto dos sinalizadores de `src/lib/siteFeatureFlags.ts:5-7`, enviando a variante como propriedade de todo evento de funil. Sem serviço externo e sem dado pessoal novo. Primeiros candidatos: abrir ou não o painel a cada item (N-031) e folha inferior contra painel lateral (N-179).
- **Benefício:** as duas mudanças de maior risco passam a ser decididas por dado.
- **Referência:** prática de experimentação.
- Depende de: N-191, N-031, N-179.

### N-200 · [médio · S] · Dicionário de métricas e respeito à preferência de não rastrear
- **O que é:** fechar o ciclo com um documento versionado de métricas e uma única guarda de consentimento. Hoje a coleta não observa a preferência de não rastrear do navegador nem oferece recusa.
- **Como fazer:** um documento em `docs/` com cada indicador, o evento que o alimenta, a meta e o valor atual declarado como desconhecido; e uma guarda única em `src/lib/analytics.ts:119-149` e `src/lib/clientObservability.ts:9-18` que respeite a preferência do navegador e a recusa do visitante, registrada no aviso de privacidade. Indicadores propostos: uso do retorno por visita ao produto, profundidade de filtros antes do primeiro produto aberto, tempo até o primeiro item adicionado em faixas, conclusão do briefing por etapa, retomada de rascunho ligada ao envio, e fechamento de sobreposição pelo gesto de voltar.
- **Benefício:** a medição cresce com base declarada e sem criar passivo de privacidade.
- **Referência:** LGPD, minimização de dados; prática de dicionário de métricas.
- Depende de: N-191, N-195.


---

# Anexo — Achados e sugestões que não entraram nas 200 etapas

Cabem em uma etapa cada, se o dono quiser ampliar o plano.

| Onde | Item |
|---|---|
| `src/styles.css:3880-3881`, `src/pages/CatalogPage.tsx:79` | Paginação vira só ícone no celular, sem nome acessível: ou mantém o texto reduzido, ou declara o nome. |
| `src/components/Layout.tsx:13-21, 194-197` | "Tendências" é um recorte do catálogo, mas aparece no menu como destino irmão: indentar no menu de celular deixaria a hierarquia visível. |
| `src/pages/CatalogPage.tsx:54-61` | Painel de filtros poderia aplicar ao fechar, com resumo do que mudou, em vez de aplicar a cada toque. |
| `src/components/Layout.tsx:175, 260`, `src/components/QuoteDrawer.tsx` | Proxy de mapa de calor com o serviço de análise já liberado na política de segurança: evento de clique com a posição relativa, sem gravação de sessão. |
| `src/pages/QuotePage.tsx` (bloco de sucesso) | Pesquisa de uma pergunta na confirmação do briefing, para capturar a intenção enquanto ela é fresca. |
| `src/lib/analytics.ts:49` | Segmentar o funil por dispositivo e por origem de campanha sem enviar a consulta da URL. |
| novo hook em `src/lib/` | Medir saída de etapa por mudança de visibilidade da aba, não por evento de descarregamento, que é descartado em celular. |
| `src/App.tsx:36-82`, `src/lib/customerAuthRedirect.ts` | Detecção de laço de redirecionamento na área do cliente, onde o risco existe de fato. |
| `scripts/smoke-deployment.mjs:90-101` | O smoke confirma a presença do script de análise, mas não prova que um evento é aceito, nem cobre o serviço de desempenho. |
| `src/components/SearchAutocomplete.tsx:51-56` | A tecla de escape no campo de busca poderia restaurar o termo digitado antes da navegação por setas. |
| `src/styles.css` (38 blocos de consulta de mídia) | Pontos de quebra consolidados em quatro valores, pré-requisito prático do layout de tablet (N-187). |
| `src/pages/BackofficePage.tsx:179, 257` | Abrir um pedido por link em vez de botão, para permitir abrir em nova aba (complementa N-017). |

> A dimensão de celular e gestos e a verificação achado por achado das dimensões de navegação ainda estavam em execução quando este documento foi fechado. O bloco 9 foi escrito a partir de fatos que eu mesmo confirmei no código (38 blocos de consulta de mídia em pixels, área segura aplicada em um único ponto, ausência de manifesto na pasta pública) e do material das dimensões de sobreposições e de consistência. Se a verificação pendente derrubar algum ponto, a correção entra como novo commit nesta mesma branch, com o motivo no texto da etapa, como foi feito no plano técnico.
