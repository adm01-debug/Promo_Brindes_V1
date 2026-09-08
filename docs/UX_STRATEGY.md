# Estratégia de experiência — Site Promo Brindes

## 1. Papel do produto

O site público existe para transformar uma intenção ainda vaga — “preciso de um brinde para um evento” — em uma seleção suficientemente clara para iniciar uma conversa comercial. Ele não replica o Promo Gifts interno e não tenta ensinar ao cliente a operar um sistema de vendedores.

**Promessa principal:** descobrir boas opções com pouco esforço, entender o que pode ser personalizado e pedir uma proposta sem pagamento ou compromisso.

**Evento de conversão:** envio de uma solicitação de orçamento com ao menos um produto, quantidade estimada e dados mínimos de contato.

**Não objetivos:** checkout, preço fechado, cálculo de frete, aprovação de arte, login obrigatório, exposição de estoque numérico, custo, margem ou fornecedor.

**Público prioritário:** profissionais de marketing, comunicação, cultura e eventos, especialmente pessoas de 20 a 30 anos. Essa faixa não é tratada como um estereótipo geracional: o recorte de comportamento é “pessoa visualmente fluente, com prazo curto, muitas referências e necessidade de defender a escolha para outras áreas”. A base de evidências e suas limitações estão em [GEN_Z_RESEARCH.md](./GEN_Z_RESEARCH.md).

## 2. O que foi preservado do DNA Promo Gifts

A análise do sistema interno identificou como ativos centrais o catálogo Gold, a busca por nome/código, imagens de produto, categorias, variantes/cores, quantidade mínima, personalização, kits e o fluxo de cotação. O novo site preserva essa linguagem de produto e a mesma origem de dados, mas muda a hierarquia:

| Promo Gifts interno | Site Promo Brindes público |
|---|---|
| Densidade operacional | Curadoria visual e leitura confortável |
| Preços, estoque e ferramentas do vendedor | Intenção, benefício e disponibilidade para cotação |
| Orçamento operado pela equipe | Briefing iniciado pelo próprio cliente |
| Navegação ampla de backoffice | Jornada curta: explorar → selecionar → solicitar |
| Tema escuro e utilitário | Direção editorial expressiva, visual-first e preparada para decisão B2B |

## 3. Princípios de UX aplicados

1. **Intenção antes da taxonomia.** A home começa pelo benefício e oferece categorias como atalhos, sem despejar toda a árvore interna sobre o visitante.
2. **Transparência comercial.** “Proposta sob medida”, “sem checkout” e “não há pagamento” aparecem antes da ação principal. “Meus saves” substitui “carrinho” para não sugerir compra online.
3. **Progresso preservado.** A seleção fica em `localStorage`, sobrevive à troca de página e sincroniza entre abas.
4. **Pouca fricção e autonomia.** O visitante pode pesquisar, filtrar, abrir produtos e salvar referências sem login. O briefing pede somente nome, empresa, e-mail, telefone e consentimento; cidade, prazo e observações são opcionais.
5. **Filtros compreensíveis.** Estado em URL, filtros aplicados visíveis, remoção individual, limpeza global, paginação e mensagens úteis para zero resultados/erro.
6. **Decisão assistida.** Página de produto prioriza imagens, resumo, código, cores disponíveis, mínimo, medidas e contexto da personalização.
7. **Recuperação explícita.** Skeletons evitam salto de layout; falhas têm mensagem e nova tentativa; catálogo vazio oferece limpeza de filtros.
8. **Mobile como jornada completa.** Menu, busca, filtros, saves flutuantes, drawer e formulário foram desenhados para toque — não como redução tardia do desktop.
9. **Visual primeiro, contexto logo depois.** Imagem, hierarquia e atalhos permitem reconhecer uma direção em segundos; códigos, quantidades e detalhes continuam disponíveis para aprovação interna.
10. **Tom cultural sem caricatura.** “Radar”, “drop”, “moodboard” e “saves” aproximam o produto do workflow de marketing, mas clareza, acessibilidade e credibilidade comercial prevalecem sobre gírias.

## 4. Arquitetura da informação

```text
Início
├── Busca principal
├── Categorias por intenção
├── Curadoria de destaques
├── Ocasiões de uso
└── Explicação do processo

Catálogo
├── Busca por nome ou código
├── Perfil: todos / destaques / novidades / kits
├── Categorias hierárquicas e multisseleção
├── Cores visuais
├── Materiais
├── Personalização e embalagem
├── Chips de filtros ativos
├── Ordenação
└── Produto
    ├── Galeria e variantes
    ├── Quantidade estimada
    ├── Informações técnicas
    └── Produtos relacionados

Meus saves
├── Revisão de produtos e quantidades
└── Briefing
    └── Solicitação de proposta
```

Páginas institucionais completam confiança e conformidade: Como trabalhamos, Contato e Privacidade.

## 5. Sistema visual

- **Tom:** criativo, humano, seguro e culturalmente atual, evitando tanto o marketplace genérico quanto uma imitação superficial de rede social.
- **Cores:** verde Promo como ação; azul-cobalto como energia; lima ácida, coral e lavanda como acentos; grafite para autoridade e marfim para respiro.
- **Tipografia:** Inter para leitura funcional e Space Grotesk para títulos, CTAs e momentos de personalidade.
- **Imagem principal:** fotografia editorial original de um time jovem e diverso de marketing criando uma ação com brindes, sem logos ou texto incorporado e com área negativa para conteúdo responsivo.
- **Componentes:** bordas de alto contraste, sombras deslocadas, cards modulares, stickers e estados de interação evidentes. A expressividade nunca reduz a legibilidade.
- **Movimento:** a headline inicial se desdobra uma única vez com Fold Text. “Drop da vez” recebe um Glitch Text curto ao entrar na tela e no hover. A combinação reforça revelação e novidade sem atrasar a navegação, repetir em loop ou competir com os CTAs.
- **Conteúdo:** português brasileiro direto, sem jargão interno, sem promessas de preço/prazo que os dados públicos não sustentam.

## 6. Acessibilidade

- HTML semântico, landmarks, headings e breadcrumb nomeado.
- Link “Pular para o conteúdo”.
- Foco visível com contraste alto e `scroll-margin`/offset do cabeçalho.
- Alvos interativos dimensionados para toque.
- Labels persistentes, `autocomplete`, tipos de teclado móvel, erros próximos ao campo e foco no primeiro erro.
- Drawer com `role="dialog"`, foco inicial, contenção de Tab, Escape e devolução do foco ao elemento anterior.
- `aria-live` para quantidade de resultados e `aria-pressed` para escolhas.
- Imagens decorativas com `alt=""`; imagens de produto com nome contextual.
- `prefers-reduced-motion` respeitado; Fold Text e Glitch Text são exibidos imediatamente em seus estados finais, sem animação.

Meta de aceite: WCAG 2.2 AA para os templates principais, validada também com navegação apenas por teclado e leitor de tela.

## 7. Performance e SEO

- Hero WebP de aproximadamente 107 KB, dimensões declaradas, preload e prioridade alta.
- Imagens de produtos fora da primeira dobra usam lazy loading; cards iniciais podem ter prioridade.
- Rotas secundárias são carregadas sob demanda.
- Skeletons reservam espaço e reduzem CLS percebido.
- Meta tags, canonical, Open Graph e JSON-LD por página.
- `Product` schema sem `Offer`: coerente com um catálogo que não vende nem publica preço.
- Sitemap dinâmico com todas as páginas de produto ativas, independentemente do estoque informado pelo fornecedor; orçamento fica `noindex` e bloqueado no robots.

Metas de campo no percentil 75: LCP ≤ 2,5 s; INP ≤ 200 ms; CLS ≤ 0,1. Devem ser monitoradas em produção por tipo de página e dispositivo.

## 8. Privacidade, segurança e limites de dados

O frontend consulta somente a interface pública Gold. A lista explícita de colunas funciona como minimização defensiva: não busca preço, custo, margem, dados de fornecedor ou campos internos mesmo que a view evolua. A view mínima `v_site_products_public` e seu rollout seguro estão documentados em [DATABASE_PUBLIC_CONTRACT.md](./DATABASE_PUBLIC_CONTRACT.md); sua aplicação depende de acesso administrativo autorizado.

O estoque informado por fornecedores não é usado para filtrar produtos ou cores. A disponibilidade real é confirmada pela equipe durante a elaboração da proposta.

Controles implementados:

- guarda para o projeto Supabase canônico `doufsxqlfjyuvxuezpln`;
- somente chave publicável/anon no browser;
- busca higienizada antes de formar filtros PostgREST;
- endpoint de briefing permitido somente em HTTPS;
- honeypot no formulário e limite de caracteres;
- dados da seleção persistidos localmente, mas dados pessoais não são gravados no navegador;
- cabeçalhos `nosniff`, frame deny, política de referrer e permissões restritas.

O fallback por e-mail mantém o produto funcional sem criar infraestrutura não autorizada. Antes do lançamento, o texto final de privacidade e retenção deve ser aprovado pelo responsável jurídico/privacidade.

## 9. Métricas recomendadas

Quando a camada de analytics for aprovada e implementada com consentimento adequado, acompanhar:

- busca iniciada e busca sem resultado;
- categoria/filtro utilizado;
- visualização de produto;
- adição e remoção da seleção;
- início e sucesso do briefing;
- taxa de abandono por campo, sem capturar conteúdo pessoal;
- tempo até a primeira seleção;
- conversão por dispositivo e origem;
- Core Web Vitals por template.

Eventos devem usar IDs de produto e categorias, nunca nome, e-mail, telefone ou texto livre.

## 10. Critérios para publicação

- Catálogo real responde em produção sem campos sensíveis.
- Página de produto e seleção funcionam por slug, cor e quantidade mínima.
- Endpoint comercial autorizado recebe, valida e protege o briefing — ou o time aceita formalmente o fallback por e-mail.
- Telefone, e-mail, domínio e links sociais foram confirmados.
- Conteúdo de privacidade foi aprovado.
- Testes unitários, typecheck, build e smoke tests desktop/mobile passam.
- Verificação manual de teclado, zoom 200%, contraste e leitores de tela concluída.
- Lighthouse e dados de campo atendem ao orçamento de performance.
- Nenhuma alteração, migration ou dependência foi introduzida no repositório Promo Gifts.
