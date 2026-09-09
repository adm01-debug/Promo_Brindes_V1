# Benchmark estratégico — Free Shop × Promo Brindes

**Data:** 9 de setembro de 2026  
**Escopo:** aquisição, descoberta, catálogo, superfiltro, produto, moodboard, briefing, confiança, SEO, acessibilidade e desempenho.  
**Premissas fixas:** público comprador formado principalmente por profissionais de marketing; linguagem contemporânea com DNA Gen Z; o site não vende; preços e estoques de fornecedores não são publicados; todos os produtos ativos continuam visíveis; o banco canônico de catálogo é somente leitura; leads pertencem ao Supabase isolado do site.

## 1. Veredito executivo

A Free Shop é uma referência de **amplitude e geração de demanda**: declara cerca de 300 lojas, 70 mil produtos, mais de 1.800 categorias e acesso a mais de 180 mil profissionais. Sua melhor competência é criar muitas portas de entrada — busca, A–Z, ocasião, público, cor, datas, ofertas, novidades, estilos, blog e fornecedores.

A Promo Brindes não deve copiar a forma de megamarketplace. Deve apropriar-se da **profundidade de descoberta** e superar a concorrente em **clareza, curadoria e continuidade do atendimento**. A Free Shop conecta o comprador a vários anunciantes e informa que não é responsável pela negociação ou comercialização. A nossa oportunidade é a posição oposta: uma interface editorial que transforma uma intenção vaga em moodboard, briefing e proposta conduzida por uma única equipe responsável.

**Tese recomendada:**

> A Free Shop ajuda a encontrar muitos fornecedores. A Promo Brindes ajuda o time de marketing a tomar uma boa decisão — mais rápido, sem login, sem ruído e com curadoria humana.

O próximo salto de qualidade não é aumentar a quantidade de blocos na home nem reconstruir o superfiltro. É adicionar uma camada de **descoberta por intenção**, melhorar a busca por linguagem real e tornar a passagem do moodboard ao briefing ainda mais segura e colaborativa.

## 2. Método e limitações

A análise combinou:

1. inspeção das páginas públicas da Free Shop — home, “Quem somos”, “Como funciona”, A–Z, estilos, ocasiões, público, cor, ofertas e perfis de fornecedores;
2. inspeção visual em viewport desktop de 1440 × 1000 e mobile de 390 × 844;
3. leitura automatizada do DOM após cinco segundos, comparando a home da Free Shop e a produção da Promo Brindes;
4. inspeção do código e do grafo do projeto Promo Brindes;
5. contraste com pesquisas atuais de UX da Baymard, documentação do Google Search, WCAG 2.2 e Core Web Vitals.

As métricas de DOM abaixo são uma fotografia de laboratório, não dados de usuários reais nem uma certificação WCAG. Conteúdo lazy-loaded, testes A/B, cache, consentimento e terceiros podem variar. A contagem de alvos menores que 24 px é heurística e inclui possíveis exceções normativas.

## 3. Anatomia competitiva da Free Shop

### 3.1 O que a concorrente faz muito bem

| Capacidade | Evidência observada | Aprendizado para a Promo Brindes |
|---|---|---|
| Autoridade de mercado | 41+ anos, 180 mil profissionais, 300+ fornecedores e 1.800+ categorias declaradas | Construir prova real e verificável, sem inventar números, clientes ou selos |
| Amplitude de catálogo | Cerca de 70 mil produtos e 1.781 entradas na página A–Z durante a captura | Deixar explícita a profundidade dos nossos 7,5 mil produtos e 400+ categorias, sem despejar a taxonomia inteira na tela |
| Busca central | Campo de busca ocupa posição dominante e recebe termos populares | Transformar busca em porta de entrada assistida, com sugestões, sinônimos e categorias |
| Diversidade de caminhos | Cor, ocasião, público-alvo, datas, estilos, ofertas e novidades | Criar atalhos por intenção de campanha, não apenas por atributos do objeto |
| Merchandising dinâmico | “Top 30” de buscas recentes, vitrines de destaque, novidades e temas sazonais | Alimentar tendências somente com telemetria real; não usar “em alta” inventado |
| Educação e SEO | FAQ, explicação do processo, textos de categoria, blog e calendário | Construir conteúdo útil, conciso e conectado ao catálogo; evitar texto genérico repetitivo |
| Confiança | Certificações, associações, história, ecossistema de eventos e fornecedores | Exibir processo, prazos de resposta, casos e credenciais apenas após validação interna |
| Orçamento multitem | Produtos entram numa seleção e o orçamento é finalizado depois | Nosso moodboard já resolve isso com menos atrito e sem cadastro prévio |

Fontes primárias: [home da Free Shop](https://www.freeshop.com.br/), [Quem somos](https://www.freeshop.com.br/a-empresa/quem-somos), [Como funciona](https://www.freeshop.com.br/saiba-como-funciona), [Estilos](https://www.freeshop.com.br/brindes/estilos) e [Brindes A–Z](https://www.freeshop.com.br/brindes-promocionais-de-a-z/brindes-a-z).

### 3.2 Onde a Free Shop abre espaço para superação

1. **Sobrecarga de navegação.** A home reúne muitos menus, submenus, vitrines, anúncios, fornecedores, FAQ, conteúdo longo, newsletter e rodapé extenso. A amplitude é valiosa, mas exige muito escaneamento.
2. **Arquitetura orientada ao estoque de anúncios.** “Produtos”, “lojas” e “fornecedores” dominam o modelo mental. O comprador com briefing abstrato ainda precisa traduzir sozinho “quero impressionar 300 convidados em novembro” em objetos e filtros.
3. **Experiência fragmentada.** A própria Free Shop se define como portal de anúncios e declara não ser responsável pela negociação e comercialização. A relação final ocorre com fornecedores diferentes.
4. **Densidade mobile.** A home medida em 390 px chegou a 14.529 px de altura, apresentou overflow horizontal e muitos alvos pequenos. Grandes espaços vazios surgiram durante a captura, compatíveis com módulos e imagens carregados tardiamente.
5. **Taxonomia enciclopédica.** Uma lista A–Z com 1.781 entradas é ótima como índice e superfície SEO, mas fraca como primeira experiência para quem ainda não sabe o nome do produto.
6. **Repetição editorial.** A página “Como funciona” repete blocos sobre amplitude, agilidade e economia. A página de estilos contém longos trechos genéricos antes da ação. Isso aumenta a página sem necessariamente aumentar decisão.
7. **Sinais técnicos públicos.** A página de estilos expôs warnings de `include()` no rodapé durante a leitura pública. Mesmo sem interromper o conteúdo, erros visíveis reduzem a percepção de acabamento.
8. **Patrocínio e ordem comercial.** Vitrines “vendido por” e posições patrocinadas favorecem a lógica de marketplace. A Promo Brindes pode ordenar pela adequação ao briefing e pela curadoria, desde que os critérios sejam honestos.

### 3.3 Fotografia quantitativa do mobile

| Métrica após 5 s | Free Shop | Promo Brindes | Leitura |
|---|---:|---:|---|
| Altura total | 14.529 px | 10.830 px | Ambas são extensas; a Promo está menos congestionada, mas também pode priorizar melhor o primeiro terço |
| Nós no DOM | 1.574 | 631 | Nossa interface tem aproximadamente 60% menos elementos |
| Links | 261 | 50 | A Free Shop oferece amplitude, com custo de decisão |
| Botões | 73 | 12 | Nossa hierarquia de ações é muito mais controlada |
| Imagens | 112 | 11 | Menor pressão visual e de carregamento na Promo Brindes |
| Alvos interativos menores que 24 px | 97 | 12 | Há oportunidade de revisão pontual em ambos; a diferença é relevante, mas não equivale a uma auditoria WCAG |
| Overflow horizontal | Sim | Não | Vantagem mobile objetiva da Promo Brindes nessa captura |
| Erros de console capturados | 2 de iframe sandbox | 0 | A Promo Brindes apresentou execução mais limpa |

## 4. Diagnóstico da Promo Brindes atual

### 4.1 O que já está forte e deve ser preservado

- **Superfiltro robusto:** árvore de categorias, pesquisa dentro da taxonomia, múltiplas categorias, cor, material, personalização, embalagem, coleções e ordenação. Ver [CatalogFilterPanel.tsx](../src/components/CatalogFilterPanel.tsx) e [catalogFilters.ts](../src/lib/catalogFilters.ts).
- **Visibilidade dos filtros aplicados:** chips removíveis, “limpar todos”, contagem e persistência por URL já seguem a recomendação central da Baymard. Ver [CatalogPage.tsx](../src/pages/CatalogPage.tsx).
- **Jornada sem login:** a pessoa pesquisa, salva e só informa dados ao enviar o briefing. É menos fricção que o fluxo orientado a conta da concorrente.
- **Posicionamento coerente:** “moodboard”, “saves”, “radar” e “curadoria humana” falam com o time de marketing sem fingir checkout.
- **Produto honesto:** quantidade mínima aparece no detalhe, seleção de cor é opcional e o site não exibe preço ou estoque pouco confiável. Ver [ProductPage.tsx](../src/pages/ProductPage.tsx).
- **Briefing bem estruturado:** empresa, e-mail, WhatsApp, cidade, prazo, contexto, consentimento, prevenção de duplicidade e protocolo. Ver [QuotePage.tsx](../src/pages/QuotePage.tsx).
- **Fundação técnica:** sitemap dinâmico, canonical, Open Graph, JSON-LD de produto, lazy routes, imagens dimensionadas, acessibilidade automatizada e ausência de overflow na captura mobile.

### 4.2 Gaps reais — sem reinventar o que já existe

| Gap | Evidência no projeto | Consequência |
|---|---|---|
| Busca literal | Termos são divididos e aplicados a nome, SKU, descrição curta e título de IA; não há dicionário de sinônimos, autocomplete ou correção de digitação em [catalog.ts](../src/lib/catalog.ts) | “Copo Stanley”, “brinde para onboarding” ou erros de grafia podem reduzir relevância |
| Intenção não é primeira classe | Filtros representam objeto, cor, material e flags; não há audiência, objetivo, ocasião ou faixa de quantidade como modelo explícito | O comprador continua fazendo parte do trabalho de tradução do briefing |
| “Em alta” é estático | Atalhos rápidos são um array local em [CatalogPage.tsx](../src/pages/CatalogPage.tsx) | O texto sugere atualidade sem comprovação comportamental |
| Quantidade mínima escondida no card | O dado aparece no detalhe e no briefing, mas não no [ProductCard.tsx](../src/components/ProductCard.tsx) | A pessoa pode salvar itens incompatíveis com o volume antes de descobrir a restrição |
| Recomendação superficial | Relacionados usam apenas a categoria principal | Perde-se a chance de sugerir conceito, kit complementar, material ou audiência |
| Prova institucional limitada | O site explica o processo, mas ainda não apresenta cases, depoimentos verificáveis, clientes autorizados, SLA ou credenciais | A estética convence antes da organização; falta reduzir risco percebido no B2B |
| Colaboração incompleta | Produto individual pode ser compartilhado, mas o moodboard inteiro não possui link compartilhável | O profissional de marketing ainda pode recorrer a prints e mensagens separadas |
| SEO dependente de JavaScript | Metadados específicos são inseridos no cliente; não existem landing pages dedicadas por ocasião/audiência | Menor controle sobre previews, indexação temática e intenção de busca |
| Ausência de telemetria de funil | Não foram encontrados eventos de busca, visualização, save, início e envio de briefing | Não há base confiável para “mais buscados”, priorização ou teste de hipótese |
| Conteúdo operacional insuficiente | Não há explicador de técnicas, arquivos de arte, prova digital, amostra, prazo por etapa ou FAQ contextual | Dúvidas previsíveis chegam tarde ao vendedor ou viram abandono silencioso |

## 5. Melhorias priorizadas

### P0 — maior impacto, menor risco

#### 5.1 “Ache pelo briefing” — camada de intenção sobre o superfiltro

Adicionar na home e no topo do catálogo um seletor progressivo, nunca um formulário longo:

1. **Qual é o momento?** Onboarding, evento, relacionamento, reconhecimento, campanha sazonal, imprensa/influenciadores.
2. **Para quem?** Clientes, colaboradores, liderança, parceiros, público de evento, creator kit.
3. **Qual é a escala?** Até 50, 51–200, 201–500, 500+ unidades.
4. **Qual é o clima?** Útil, premium, sustentável, tech, afetivo, divertido.

O resultado deve abrir o catálogo com filtros visíveis e uma curadoria inicial. A primeira versão pode usar presets versionados no frontend e os metadados existentes, portanto não exige migration nem escrita no banco canônico. Toda inferência deve ser explicável: “Selecionamos estes itens porque combinam com onboarding, 200 pessoas e materiais sustentáveis”.

**Critério de aceite:** concluir o seletor em até quatro escolhas, pular qualquer etapa, voltar sem perder estado, abrir URL compartilhável e nunca produzir resultado vazio sem rota de recuperação.

#### 5.2 Busca assistida com linguagem de comprador

- sugestões de categorias e produtos após 2–3 caracteres;
- sinônimos curados: garrafa/squeeze, copo térmico/Stanley, kit boas-vindas/onboarding, mochila saco/sacochila, carregador/power bank;
- remoção de acentos e tolerância a erros comuns;
- consulta por código preservada;
- histórico recente apenas no dispositivo;
- estado de zero resultado com correções e atalhos, não uma tela morta.

Não enviar texto livre contendo dados pessoais para analytics. A busca deve degradar com segurança para o comportamento atual.

#### 5.3 Cards mais decisivos

Manter o card limpo e acrescentar apenas sinais que evitam clique improdutivo:

- “Mín. 100 un.” quando `minQuantity > 1`;
- no máximo dois badges prioritários, com overflow em “+1”;
- segunda imagem somente se já existir e sem piorar LCP;
- ação “Salvar” permanece principal; quick view só entra se testes mostrarem ganho.

Não exibir fornecedor, preço estimado, promoção ou estoque.

#### 5.4 FAQ contextual e segurança do processo

Responder onde a dúvida aparece:

- catálogo: por que não há preço; quantidade mínima; todos os produtos são consultáveis;
- produto: técnicas possíveis, envio da logo, prova digital, amostra e variação de cor;
- briefing: o que acontece depois, prazo de contato, canais e ausência de compromisso.

O SLA só deve ser publicado após validação operacional. Se a equipe não sustenta “em até X horas”, usar linguagem factual: “Você recebe confirmação imediata e nossa equipe entra em contato pelos dados informados”.

#### 5.5 Instrumentação mínima antes de declarar tendências

Eventos sem PII:

`home_search_started` → `catalog_result_viewed` → `product_viewed` → `product_saved` → `briefing_started` → `quote_submitted`.

Dimensões permitidas: ID do produto, categoria, quantidade de resultados, filtros, posição, dispositivo e status técnico. Proibido registrar nome, e-mail, telefone, notas ou consulta livre não saneada. “Em alta agora” só deve refletir uma janela real com amostra mínima e fallback editorial claramente rotulado como “Sugestões”.

### P1 — diferenciação e crescimento orgânico

#### 5.6 Moodboard compartilhável para aprovação interna

Gerar um link com 2–8 produtos, quantidades e cores, em modo de leitura, com CTA “Duplicar e ajustar”. Para seleções pequenas, IDs compactados na URL evitam banco. Para seleções persistentes, usar exclusivamente o Supabase isolado de leads, com token opaco, expiração, RLS e sem PII. Nunca escrever no banco canônico.

#### 5.7 Comparador de 2–4 produtos

Comparar apenas atributos confiáveis: dimensões, capacidade, material, cores, mínimo, personalizável, embalagem e composição de kit. Campos ausentes devem aparecer como “consultar”, não como “não possui”. O comparador vive dentro do moodboard, não como nova navegação global.

#### 5.8 Landing pages de intenção

Criar páginas realmente úteis, não páginas-porta repetitivas:

- `/ideias/onboarding`
- `/ideias/eventos`
- `/ideias/clientes-vip`
- `/ideias/sustentaveis`
- `/datas/natal`
- `/datas/dia-do-cliente`

Cada página deve ter orientação editorial própria, seleção dinâmica, filtros predefinidos, FAQ visível e links para ampliar a busca. O Google recomenda breadcrumbs que representem um caminho típico do usuário, e não apenas espelhem a URL. Dados estruturados devem corresponder ao conteúdo visível.

#### 5.9 SEO técnico compatível com catálogo sem venda

- pré-renderizar ou renderizar no servidor produto, categoria e páginas de intenção;
- gerar `BreadcrumbList` no produto e nas landings;
- manter `Product` sem `Offer` quando não há preço confiável — o Google diferencia product snippets de páginas não transacionais e merchant listings de páginas compráveis;
- adicionar `ItemList` somente quando a lista estiver no HTML inicial;
- não criar rating, review, oferta, disponibilidade ou FAQ estruturado inexistente;
- manter sitemap completo, particionando somente quando o limite técnico justificar.

#### 5.10 Prova social com governança

Ordem recomendada:

1. explicar critérios e etapas da curadoria;
2. publicar um case autorizado com problema, solução e resultado comprovável;
3. exibir logos somente com autorização;
4. adicionar depoimentos identificados e aprovados;
5. mostrar certificações ou associações somente se vigentes.

Uma boa seção de confiança vale mais do que dezenas de logos sem contexto.

### P2 — maturidade

- coleções sazonais governadas pelo marketing, com validade e responsável;
- recentemente vistos no dispositivo;
- recomendações complementares por material, ocasião e kit;
- quadro compartilhado com comentários somente se houver demanda real;
- conta opcional para recorrência, nunca obrigatória para pesquisar ou pedir proposta;
- conteúdo editorial com calendário, responsável, data de revisão e vínculo mensurável com buscas e saves.

## 6. Simulações de jornada e falhas prevenidas

### Cenário A — briefing abstrato

**Entrada:** “preciso encantar 300 pessoas em um evento”.  
**Hoje:** a pessoa escolhe um termo ou explora categorias.  
**Com P0:** intenção “evento” + audiência + 201–500 + clima gera seleção inicial explicada.  
**Falha a prevenir:** presets estreitos retornando zero. O sistema deve ampliar progressivamente e explicar o que foi relaxado.

### Cenário B — campanha urgente

**Entrada:** ação em 12 dias.  
**Risco:** parecer que o catálogo garante prazo ou estoque.  
**Solução:** coletar data e quantidade, destacar “sujeito à confirmação”, priorizar briefing rápido e nunca prometer disponibilidade com dados de fornecedor.

### Cenário C — aprovação pelo time

**Entrada:** analista escolhe seis itens e precisa da gerente.  
**Hoje:** compartilha itens individualmente ou usa prints.  
**Com P1:** envia link de moodboard em leitura, preservando quantidades e cores.  
**Falha a prevenir:** URL com PII ou edição não autorizada; usar tokens opacos/expiração quando houver persistência.

### Cenário D — busca coloquial

**Entrada:** “copo Stanley barato para onboarding”.  
**Risco:** não existe marca/preço confiável e a busca literal pode falhar.  
**Solução:** interpretar “Stanley” como formato térmico e “onboarding” como intenção; explicar que valores vêm na proposta. Não alegar equivalência de marca.

### Cenário E — mobile com uma mão

**Entrada:** social/WhatsApp, tela estreita.  
**Risco:** chips, filtros e botão flutuante disputam espaço.  
**Solução:** alvos de pelo menos 24 × 24 CSS px, filtros aplicados em trilho rolável, CTA que não encubra foco e resumo compacto da seleção.

### Cenário F — SEO em escala

**Entrada:** geração de dezenas de páginas para datas e públicos.  
**Risco:** conteúdo duplicado, páginas vazias e promessas não sustentadas.  
**Solução:** publicar somente temas com curadoria, demanda e produtos suficientes; canonical consistente; revisão editorial; remoção/redirect após sazonalidade quando necessário.

## 7. Plano de execução proposto

| Fase | Entrega | Dependência | Validação |
|---|---|---|---|
| 0 — baseline | Eventos de funil, dicionário inicial e métricas atuais | Escolha de ferramenta de analytics e política de dados | Eventos sem PII; dashboards; teste de consentimento |
| 1 — decisão rápida | “Ache pelo briefing”, sugestões de busca, mínimo no card e FAQ contextual | Mapa editorial de intenção → filtros | unitários, E2E desktop/mobile, zero resultados, teclado, leitor de tela |
| 2 — colaboração | Moodboard compartilhável e comparador | Escolha URL versus persistência isolada | expiração, RLS, URLs sem PII, revogação, Open Graph |
| 3 — aquisição | Landings, prerender/SSR, breadcrumbs e schemas | Conteúdo aprovado e arquitetura SEO | Rich Results Test, Search Console, canonical, sitemap, 404 real |
| 4 — prova | Cases, credenciais e calendário editorial | Autorizações e processo de governança | verificação documental e revisão trimestral |

### Métricas de sucesso

- mediana de tempo entre chegada e primeiro produto relevante;
- buscas sem resultado e reformulações de busca;
- taxa `product_viewed → product_saved`;
- taxa `product_saved → briefing_started`;
- taxa `briefing_started → quote_submitted`;
- quantidade média de itens por moodboard;
- compartilhamentos que retornam ao site;
- LCP ≤ 2,5 s, INP ≤ 200 ms e CLS ≤ 0,1 no percentil 75, separados por mobile e desktop;
- WCAG 2.2 AA, incluindo alvo mínimo e foco não encoberto.

## 8. Mapeamento técnico no projeto

| Melhoria | Núcleo atual | Extensão recomendada |
|---|---|---|
| Presets de intenção | [CatalogPage.tsx](../src/pages/CatalogPage.tsx), [catalogFilters.ts](../src/lib/catalogFilters.ts) | `src/lib/campaignPresets.ts` + componente progressivo; serializar no query string |
| Busca assistida | [catalog.ts](../src/lib/catalog.ts), [CatalogPage.tsx](../src/pages/CatalogPage.tsx) | dicionário testado, suggestions com debounce/cancelamento e fallback atual |
| Mínimo no card | [ProductCard.tsx](../src/components/ProductCard.tsx) | render condicional sem aumentar altura em todas as variantes |
| Moodboard compartilhável | [QuoteCartContext.tsx](../src/context/QuoteCartContext.tsx), [QuoteDrawer.tsx](../src/components/QuoteDrawer.tsx) | codec versionado de seleção; persistência opcional apenas no projeto isolado |
| Comparador | [ProductPage.tsx](../src/pages/ProductPage.tsx), [types.ts](../src/types.ts) | matriz somente de campos públicos e confiáveis |
| FAQ | páginas de catálogo/produto/orçamento | componente acessível nativo, conteúdo contextual e testado |
| SEO | [Seo.tsx](../src/components/Seo.tsx), [sitemap.ts](../api/sitemap.ts), [App.tsx](../src/App.tsx) | prerender/SSR, novas rotas editoriais, BreadcrumbList e status HTTP correto |
| Analytics | não existe instrumentação no código atual | adaptador único, allowlist de eventos/propriedades e bloqueio de PII |

## 9. Guardrails — o que não copiar

- Não criar menu com dezenas de links na primeira camada.
- Não publicar índice A–Z como experiência primária; oferecer busca de categoria e índice secundário.
- Não cadastrar fornecedores como destino da jornada.
- Não criar conta obrigatória.
- Não mostrar promoções, preços, estoque ou prazo como fato sem fonte operacional confiável.
- Não usar “mais buscados” sem telemetria e amostra mínima.
- Não multiplicar páginas SEO com o mesmo texto.
- Não introduzir chat, pop-up, newsletter e WhatsApp flutuante ao mesmo tempo; cada interrupção deve provar valor.
- Não escrever no banco canônico para viabilizar recursos do site público.
- Não permitir que animações Fold/Glitch prejudiquem legibilidade, foco ou `prefers-reduced-motion`.

## 10. Decisão recomendada

Executar primeiro a combinação **instrumentação + descoberta por intenção + busca assistida + mínimo no card + FAQ contextual**. Ela captura as maiores virtudes da Free Shop — encontrabilidade e variedade — sem importar seus principais custos — densidade, fragmentação e aparência de diretório de anúncios.

Somente depois dos dados dessa fase, avançar para moodboard compartilhável, comparador e landings. Isso reduz retrabalho: as intenções realmente escolhidas e as consultas realmente feitas definirão quais páginas, sinônimos e coleções merecem investimento.

## 11. Referências

- Free Shop: [home](https://www.freeshop.com.br/), [Quem somos](https://www.freeshop.com.br/a-empresa/quem-somos), [Como funciona](https://www.freeshop.com.br/saiba-como-funciona), [Estilos](https://www.freeshop.com.br/brindes/estilos), [Brindes A–Z](https://www.freeshop.com.br/brindes-promocionais-de-a-z/brindes-a-z).
- Baymard Institute: [Product Lists & Filtering UX](https://baymard.com/research/ecommerce-product-lists), [estado de product lists em 2025](https://baymard.com/blog/current-state-product-list-and-filtering), [visibilidade dos filtros aplicados](https://baymard.com/blog/how-to-design-applied-filters), [promoção de filtros importantes](https://baymard.com/blog/promoting-product-filters), [tipos de consulta em busca](https://baymard.com/blog/ecommerce-search-query-types).
- Google Search Central: [dados estruturados para ecommerce](https://developers.google.com/search/docs/specialty/ecommerce/include-structured-data-relevant-to-ecommerce), [Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product), [BreadcrumbList](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), [diretrizes gerais de dados estruturados](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).
- W3C WAI: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow).
- web.dev: [Core Web Vitals](https://web.dev/articles/vitals).

## 12. Estado da execução

O bloco P0 foi implementado em 9 de setembro de 2026:

- “Ache pelo briefing” com quatro etapas opcionais, URL compartilhável e filtros explicáveis;
- sugestões de busca acessíveis por mouse e teclado, além de dicionário curado de sinônimos;
- quantidade mínima e variação de cores nos cards;
- FAQ contextual em catálogo, produto e briefing;
- Vercel Web Analytics com redaction de URL e eventos de funil sem texto pesquisado ou dados de contato.

A implementação não criou migrations, não escreveu no banco canônico e não passou a confiar em preço ou estoque de fornecedor.
