# Auditoria de movimento — React Bits para Promo Brindes

Última revisão: 8 de setembro de 2026.

## 1. Decisão executiva

O React Bits oferece 32 animações de texto na revisão analisada. O site não deve parecer uma vitrine de efeitos: o público é criativo, mas está trabalhando sob prazo e precisa defender uma escolha dentro da empresa. A direção aprovada usa somente dois efeitos em produção:

1. **Fold Text — aprovado para a headline principal.** Traduz descoberta e abertura de possibilidades, executa uma vez e preserva a frase estática ao final.
2. **Glitch Text — aprovado de forma adaptada para “Drop da vez”.** Comunica novidade e repertório digital em uma área editorial secundária. O loop infinito original foi removido.

Próximos candidatos, apenas quando houver conteúdo real que os justifique: **Count Up** para métricas auditáveis; **Stroke Text** para uma landing page de campanha; **Masked Heading** para uma história visual sazonal. Não entram na home atual.

## 2. Critérios

Cada efeito foi avaliado de 1 a 5 em seis dimensões: aderência ao repertório visual da audiência; coerência com o trabalho B2B; legibilidade; experiência móvel; acessibilidade; custo técnico/perceptivo.

Regras de corte:

- movimento deve explicar hierarquia, estado ou personalidade de um momento específico;
- títulos, códigos de produto, filtros, quantidades e CTAs nunca dependem da animação para serem compreendidos;
- nenhum texto essencial troca continuamente ou exige hover;
- nenhum loop automático decorativo permanece ativo;
- `prefers-reduced-motion: reduce` entrega imediatamente o estado final;
- transformações usam prioritariamente `transform` e `opacity`; efeitos com canvas, WebGL, física ou blur contínuo exigem benefício proporcional;
- o conjunto deve continuar parecendo Promo Brindes, não uma demonstração do React Bits.

## 3. Avaliação das 32 animações

| Efeito | Nota | Veredito para este site | Leitura de UX e marca |
|---|---:|---|---|
| Fold Text | 5,0 | **Usar na headline** | A metáfora de algo que se abre combina com descoberta e curadoria. Uma execução curta cria assinatura sem prejudicar o escaneamento. |
| Glitch Text | 4,2 adaptado / 2,0 original | **Usar só em “Drop da vez”** | O código visual digital combina com marketing jovem, mas jitter e loop permanente parecem ruído. A versão adotada roda uma vez e no hover, em área pequena. |
| Stroke Text | 4,0 | Reservar para campanha | Tem linguagem gráfica/editorial forte e boa relação com criação de marca; em muitos títulos, reduz a sobriedade comercial. |
| Masked Heading | 3,9 | Reservar para conteúdo sazonal | Pode unir produto e tipografia em uma landing page; na home competiria com a fotografia do hero. |
| Split Text | 3,8 | Não somar ao Fold | Entrada escalonada é clara, mas cumpre o mesmo papel do Fold Text e criaria redundância gestual. |
| Blur Text | 3,7 | Não usar na jornada principal | Revelação suave é elegante, porém blur atrasa leitura e adiciona pouco à linguagem mais gráfica da marca. |
| Count Up | 3,7 | Usar apenas com número auditável | Excelente para prova concreta, mas o site hoje não possui métricas públicas verificadas. Inventar números destruiria confiança. |
| Echo Text | 3,5 | Reservar para campanha | Tem personalidade editorial e reforça memória, mas cópias fantasma em texto longo reduzem nitidez. |
| Split Flap Text | 3,4 | Reservar para status real | Combina com prazo, produção ou despacho se houver dado operacional; como ornamento, sugere funcionalidade inexistente. |
| Text Loop | 3,3 | Não usar na home | Pode funcionar como faixa cultural curta, mas o site já tem uma signal strip e um loop constante disputaria atenção. |
| Circular Text | 3,3 | Possível sticker futuro | Cabe em selo decorativo, desde que estático em movimento reduzido. O sticker atual já resolve essa função sem nova dependência. |
| Curved Loop | 3,2 | Possível peça de campanha | Expressivo e social-first, mas loop e arraste acrescentam interação sem apoiar descoberta de produto. |
| Gradient Text | 3,1 | Usar só em arte especial | A cor em movimento é atual, porém pode comprometer contraste e parecer genérica quando aplicada à tipografia central. |
| Shiny Text | 3,0 | Evitar em CTAs | O brilho pode sugerir acabamento premium, mas um CTA deve manter contraste estável e não parecer anúncio ou estado de loading. |
| Depth Text | 3,0 | Reservar para manifesto | O volume dá presença, mas interação por ponteiro perde valor no celular e compete com o sistema visual já forte. |
| Rotating Text | 2,9 | Não usar na home | Permitiria alternar ocasiões, mas muda conteúdo durante a leitura, cria largura variável e dificulta previsibilidade cognitiva. |
| True Focus | 2,8 | Não usar em texto essencial | Direciona atenção palavra a palavra, ao custo de borrar o restante e controlar o ritmo do visitante. |
| Text Type | 2,8 | Reservar para demonstração | É familiar ao universo criativo/IA, porém digitação é lenta para uma mensagem que precisa ser entendida imediatamente. |
| Shuffle | 2,7 | Não usar na navegação | Pode comunicar experimentação, mas caracteres instáveis prejudicam reconhecimento rápido e localização por baixa visão. |
| Decrypted Text | 2,6 | Apenas campanha tech | A estética hacker é estreita demais para o catálogo geral e pode associar a marca a insegurança, não curadoria. |
| Scrambled Text | 2,5 | Não usar | Distorção guiada por cursor favorece desktop e torna parágrafos menos legíveis por uma recompensa puramente decorativa. |
| Variable Proximity | 2,5 | Não usar | Sofisticado com mouse, pouco descobrível e sem equivalente natural no toque; agrega peso sem melhorar a decisão. |
| Text Pressure | 2,4 | Não usar | A deformação responsiva chama atenção, mas funciona melhor em portfólio experimental do que em catálogo comercial. |
| Scroll Reveal | 2,4 | Não usar nesta home | Revelações podem organizar uma narrativa, mas esconder texto até o scroll torna a página longa mais lenta de escanear e aumenta o orçamento de movimento. |
| Scroll Float | 2,0 | Rejeitar | Parallax de texto é uma fonte conhecida de desconforto vestibular e não melhora a seleção de brindes. |
| Scroll Velocity | 1,9 | Rejeitar | Marquee reativo ao scroll introduz movimento imprevisível e compete com filtros, cards e leitura. |
| Fuzzy Text | 1,8 | Rejeitar | Vibração constante parece falha de renderização, reduz nitidez e não conversa com confiança B2B. |
| Falling Text | 1,7 | Rejeitar | A física é divertida, mas desmonta a mensagem e infantiliza uma tarefa profissional. |
| Particle Text | 1,6 | Rejeitar | Alto impacto e custo visual/computacional; adequado a abertura de campanha, não a uma ferramenta de pesquisa. |
| ASCII Text | 1,5 | Rejeitar | A estética retro-tech é específica, pesada e desalinhada com a fotografia humana e os materiais dos produtos. |
| Warp Text | 1,4 | Rejeitar | WebGL e refração por ponteiro custam desempenho, têm baixo retorno no celular e prejudicam legibilidade. |
| Text Cursor | 1,2 | Rejeitar | Uma trilha que segue o ponteiro distrai da ação, não funciona de modo equivalente no toque e pode encobrir conteúdo. |

## 4. Análise específica do Glitch Text original

A implementação oficial é pequena e não exige biblioteca adicional, mas sua configuração padrão não é adequada para a Promo Brindes:

- anima continuamente duas cópias pseudo-elemento em velocidades diferentes;
- usa deslocamentos RGB vermelho/ciano e cortes rápidos;
- força texto branco, fundo escuro, `white-space: nowrap` e cursor de clique;
- não contém tratamento nativo para `prefers-reduced-motion`;
- no modo hover, a recompensa não aparece de forma equivalente em telas de toque.

A adaptação corrige esses pontos: herda tipografia e cores da marca, não força cursor, permite quebra natural, começa quando o bloco editorial entra no viewport, termina em cerca de um segundo, repete somente no hover e desaparece totalmente sob movimento reduzido. O texto real permanece no DOM; as cópias são apenas decoração CSS.

## 5. Orçamento de movimento aprovado

| Momento | Efeito | Gatilho | Duração | Repetição |
|---|---|---|---:|---|
| Headline do hero | Fold Text por palavra | montagem da home | até 1,1 s com stagger | uma vez |
| “Drop da vez” | Glitch Text pequeno | entrada no viewport | até 1,05 s | uma vez + hover intencional |
| Estados do sistema | transições CSS existentes | ação do visitante | 160–240 ms | por interação |

Nenhum CTA, preço, filtro, código, quantidade ou instrução muda de conteúdo. O motion budget pode ser revisto depois de teste moderado com profissionais de marketing brasileiros entre 20 e 30 anos.

## 6. Evidências e fontes

- [React Bits — índice atual](https://reactbits.dev/get-started/index) e [repositório oficial](https://github.com/DavidHDev/react-bits), revisão `4bb4491` de 8 de setembro de 2026.
- [React Bits — Fold Text](https://reactbits.dev/text-animations/fold-text).
- [React Bits — Glitch Text](https://reactbits.dev/text-animations/glitch-text).
- [W3C — Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
- [W3C — Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html).
- [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion).
- [web.dev — High-performance CSS animations](https://web.dev/articles/animations-guide).
- [Pesquisa de audiência do projeto](./GEN_Z_RESEARCH.md).
