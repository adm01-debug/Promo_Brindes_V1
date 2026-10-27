# Auditoria do Plano Carnegie de UX (100 etapas) contra o código atual

Data da auditoria: 11/10/2026. Modo somente leitura; nenhum arquivo do repositório foi alterado.

- Plano auditado: `docs/PLANO_CARNEGIE_UX_100_ETAPAS_20261005.md` (831 linhas), mesclado em `62a38b3` (#93).
- Base oficial: `origin/main` = HEAD local = `3f82233` ("fix(ux): elimina perdas de dados em fluxos assíncronos", #89).
- Commits posteriores ao plano em main: `77f0ff1` Gift Lovers (#92) e `3f82233` (#89). A ficha compacta (#91, `f7022c4`) entrou **antes** do plano (09:04 vs 09:24 de 06/10).
- PRs abertas (REST GitHub): **#94** `feat/carnegie-briefing-confirmation` ("resumo editável e confirmação do briefing", atualizada com main em `a07836c`) e **#88** `fix/product-card-clean-image-background` (fundo das fotos dos cards).
- O próprio plano declara "planejadas, não executadas" (linha 5) e `docs/MATRIZ_INDEX.md:5` repete que não é evidência de conclusão. Não há documento de execução Carnegie nem matriz atualizada.

## Legenda

| Classificação | Significado |
| --- | --- |
| CONCLUÍDA (pré-existente) | O código em main já atende ao critério de aceite da etapa, mas o recurso é anterior ao plano (ou veio de #89/#91/#92). **Nenhuma etapa tem o registro de aceite exigido pelo plano** (linha 68: requisito, SHA, cenário, captura, responsável). |
| PARCIAL | Existe base reaproveitável; o texto diz exatamente o que falta. |
| EM ANDAMENTO (PR #94) | Coberta pela PR aberta #94, ainda fora de main. O estado oficial é o de main, indicado entre parênteses. |
| NÃO INICIADA | Nada da entrega foi encontrado no código ou nos documentos. |
| BLOQUEADA-EXTERNA | Depende de conteúdo, pesquisa, aprovação visual, dado comercial, credencial ou ambiente fora do controle da engenharia. |
| **[AV]** | Mudança visual: pela regra do `AGENTS.md:1-12` e pela linha 56 do plano, exige proposta em imagens (desktop e celular) e **aprovação explícita do dono antes de implementar**. |

Observação sobre aprovação visual: as PRs #91, #92 e #94 dizem implementar desenhos aprovados (a #94 fala em "quatro mockups aprovados"). Nenhuma imagem ou registro de aprovação está versionado no repositório (`git ls-files` só mostra capturas de auditoria de 09/09 em `docs/audits/marketing-20260909/`). Por isso, a conformidade com o `AGENTS.md` não pode ser verificada pelo repositório.

## Tabela das 100 etapas

### Bloco 1: base de produto e necessidades humanas (001–010)

| Etapa | Título | Classificação | O que falta | Evidência |
| --- | --- | --- | --- | --- |
| 001 | Registrar a versão de partida | PARCIAL | O plano registra `13c5238`/`629196f` e PRs 90–92 abertas, mas esse retrato ficou obsoleto: main está em `3f82233`, #90/#91/#92 foram mescladas e #94/#88 estão abertas. Falta um registro novo antes da execução. | Plano:30-43; `git log` (3f82233, 77f0ff1, f7022c4) |
| 002 | Relacionar o plano aos requisitos anteriores | PARCIAL | Existe o mapa por componentes (tabela do plano), mas não por etapa → requisito/teste anterior com a classificação reaproveitar/evoluir/validar/novo. | Plano:32-43; `docs/MATRIZ_INDEX.md:5` ("reconciliação futura") |
| 003 | Definir a promessa de experiência | BLOQUEADA-EXTERNA | O texto proposto ("entender sua campanha… com nosso time de especialistas") não tem aprovação de Produto. As promessas atuais divergem: "Receba uma proposta real" e "proposta… pronta para levar ao time". | Plano:92; `HomePage.tsx:211`, `HomePage.tsx:353-362` |
| 004 | Validar perfis por necessidades | PARCIAL | Há personas, mas definidas por idade ("20–35 anos"), o que o plano proíbe. Faltam perfis por necessidade (pressa, pouca familiaridade, baixo orçamento, tecnologia assistiva). | `UX_AUDIT_REPORT.md:139-144`; Plano:60 |
| 005 | Mapear a jornada e suas dúvidas | PARCIAL | Os fluxos críticos e as rotas estão mapeados. Falta registrar dúvida, informação necessária e próximo passo em cada momento, incluindo a entrada direta por produto ou calendário. | `UX_AUDIT_REPORT.md:130-137` e matriz de rotas |
| 006 | Planejar pesquisa sem indução | BLOQUEADA-EXTERNA | Não há protocolo nem participantes. O guia de voz já registra que os testes de compreensão estão pendentes. | `docs/GUIA_DE_VOZ.md:42`; nenhuma ocorrência de protocolo de pesquisa em `docs/` |
| 007 | Inventariar afirmações comerciais | NÃO INICIADA | Falta o inventário com fonte e responsável. Afirmações que precisam entrar nele: "curadoria humana", "Curadoria viva · atualizada pelo catálogo", "proposta real", "Materiais de menor impacto", "Sua marca aqui". | `CatalogPage.tsx:30`, `ProductPage.tsx:187`, `HomePage.tsx:211,220`, `campaignPresets.ts:50`, `ProductCard.tsx:45` |
| 008 | Mapear capacidades operacionais | BLOQUEADA-EXTERNA | Canais, horários e estados do pedido dependem de confirmação do Atendimento. Resend e WhatsApp estão adiados. | Plano:57; nenhuma ocorrência de horário ou SLA em `src/` |
| 009 | Estabelecer limites de persuasão | NÃO INICIADA | Não existe o checklist (urgência fictícia, culpa, prova social etc.). O guia de voz só cobre "promessas não verificadas". | `docs/GUIA_DE_VOZ.md:42` |
| 010 | Definir indicadores e linha de base | NÃO INICIADA | Não há indicadores com denominador, janela e fonte nem linha de base pré-mudança. Os eventos do funil existem, mas o recebimento do Analytics ainda aguarda homologação. | `src/lib/analytics.ts:4-36`; `docs/MATRIZ_INDEX.md:11` |

### Bloco 2: linguagem e propostas visuais (011–020)

| Etapa | Título | Classificação | O que falta | Evidência |
| --- | --- | --- | --- | --- |
| 011 | Guia de voz de relacionamento | PARCIAL | O guia de 22/09 cobre voz por situação. Faltam a camada Carnegie (escuta, reconhecimento sem bajulação) e o glossário dos termos que exigem explicação (briefing, curadoria, personalização). | `docs/GUIA_DE_VOZ.md:1-42` |
| 012 | Organizar termos e CTAs | PARCIAL | A tabela de nomes existe, mas o código diverge: o guia diz "Solicitar orçamento" e o botão diz "Enviar briefing"; o campo se chama "Nome da campanha" no drawer e "Como você chama esta ação?" no orçamento; há também "Ver minha curadoria" e "Transformar seleção em briefing". | `GUIA_DE_VOZ.md:12`; `QuotePage.tsx:459,445`; `QuoteDrawer.tsx:212`; `Layout.tsx:196`; `CampaignFinder.tsx:102` |
| 013 | Aplicar a marca sem atrapalhar tarefas | PARCIAL | A assinatura Gift Lovers foi implementada no manifesto e no rodapé (#92). Falta a proposta de uso contextual das quatro frases e da assinatura por momento da jornada. | `GiftLoversSignature.tsx:3-10`; `HomePage.tsx:295`; `Layout.tsx:210` |
| 014 | Projetar hierarquia e leitura | NÃO INICIADA | Não há especificação de hierarquia, largura de leitura, foco ou contraste. Existem apenas os tokens em `styles.css`. | nenhuma ocorrência de especificação em `docs/` |
| 015 | Regras para fotos e movimento | NÃO INICIADA | Faltam regras de foto autorizada e de movimento reduzido. A PR #88 (fundo das fotos dos cards) segue aberta. | PR #88 aberta; `docs/REACT_BITS_MOTION_AUDIT.md` é anterior ao plano |
| 016 | Home orientada a intenções [AV] | NÃO INICIADA | Não há mockups da home em desktop e celular. | nenhuma imagem de proposta versionada |
| 017 | Escuta e revisão do briefing [AV] | PARCIAL | A PR #94 declara mockups aprovados do resumo editável, mas as imagens não estão no repositório. Não há mockup de conflito entre campanha nova e seleção existente, nem de intenção versus filtro aplicado. | corpo da PR #94; nenhuma imagem em `git ls-files` |
| 018 | Apoio à decisão [AV] | NÃO INICIADA | Faltam mockups de catálogo, comparação, seleção e estados sem dados. A ficha (#91) é anterior ao plano. | — |
| 019 | Formulários e retorno honesto [AV] | PARCIAL | A PR #94 declara mockup aprovado da confirmação. Faltam preenchimento, correção, espera, falha, "e-mail apenas preparado", teclado virtual e histórico. | corpo da PR #94 |
| 020 | Aprovação visual rastreável | BLOQUEADA-EXTERNA | Não há registro de aprovação por versão, página e viewport. Esta etapa bloqueia todas as etapas [AV]. | `AGENTS.md:1-12`; nenhum registro de aprovação em `docs/` |

### Bloco 3: entrada e descoberta (021–030)

| Etapa | Título | Classificação | O que falta | Evidência |
| --- | --- | --- | --- | --- |
| 021 | Abertura centrada na campanha [AV] | NÃO INICIADA | O hero é anterior ao plano ("…brinde que ninguém esquece"). Não há versão aprovada. | `HomePage.tsx:149-176` |
| 022 | Entradas por objetivo [AV] | PARCIAL | Os cards de ocasião já levam aos presets. Falta informar a seleção resultante (quais filtros) e revisar rótulos em inglês ("PEOPLE", "LIVE"). | `HomePage.tsx:345-348`, `HomePage.tsx:197` |
| 023 | Caminho para quem ainda não sabe [AV] | NÃO INICIADA | Não existe o caminho "Ainda não sei o que escolher". | nenhuma ocorrência de "Ainda não sei" em `src/` |
| 024 | Busca direta como atalho | CONCLUÍDA (pré-existente) | Falta só o reteste formal (Enter, acentos, sem resultado, retorno). | `search.ts:13,35`; `Layout.tsx:160`; e2e `smoke.spec.ts:481,1296,1426` |
| 025 | Explicar o processo de orçamento | PARCIAL + EM ANDAMENTO (PR #94) | Main explica em três movimentos, diz "sem pagamento" e tem FAQ. A PR #94 adiciona "O que acontece agora", mas promete "recomendação sob medida". Falta a revisão Carnegie da promessa (proposta vs. solicitação). | `HomePage.tsx:206-213,353-362`; `QuotePage.tsx:399`; `ContextualFaq.tsx:18-19`; PR #94 `QuotePage.tsx:375-379` |
| 026 | Frases de marca no contexto [AV] | PARCIAL | As quatro frases estão no manifesto e Gift Lovers foi adicionada. Falta ligar "Entender para atender" ao momento de escuta (briefing), conforme mockup. | `HomePage.tsx:260-297` |
| 027 | Navegação e rodapé por tarefa [AV] | NÃO INICIADA | A #92 só ajustou a rolagem por perfil e a assinatura no rodapé. Não há reorganização aprovada. | `Layout.tsx:52-97` (diff 77f0ff1) |
| 028 | Prova social verdadeira [AV] | BLOQUEADA-EXTERNA | Faltam cases e depoimentos com autorização. O estado bloqueado também não foi registrado. | nenhuma ocorrência de "depoimento"/"testimonial" em `src/` |
| 029 | Biblioteca de catálogos por intenção [AV] | PARCIAL | Já existem temas ("Pessoas & cultura", "Datas & eventos"), PDF/online e `catalog_briefing_started`. Falta governança de validade, PDF desatualizado e retorno à seleção. | `catalogLibrary.ts:31-35`; `CatalogsPage.tsx:116,226,298`; nenhuma ocorrência de "validade" |
| 030 | Datas comemorativas e planejamento | PARCIAL | Já há contexto de ocasião, data do evento separada do recebimento e validação recebimento ≤ evento. Falta iniciar a campanha por público e intenção a partir da data. | `campaignBrief.ts:58-62`; `QuotePage.tsx:444,446`; `quoteBriefing.ts:111-114` |

### Bloco 4: escuta e continuidade do briefing (031–040)

| Etapa | Título | Classificação | O que falta | Evidência |
| --- | --- | --- | --- | --- |
| 031 | Revisar as quatro perguntas | NÃO INICIADA | A copy não foi revisada: "Sustentável" vira "Materiais de menor impacto" e filtro `reciclado`; "Liderança" sugere "presença premium". O risco de induzir a opção mais cara e de dar status de certificação continua. | `campaignPresets.ts:24-54,139` |
| 032 | Ausência de respostas sem bloquear | NÃO INICIADA | Com 0 respostas o CTA fica desabilitado e não há saída explícita para o catálogo completo. A PR #94 não muda isso. | `CampaignFinder.tsx:101` |
| 033 | Avanço e progresso previsíveis [AV] | NÃO INICIADA | O avanço automático foi mantido. A PR #94 só adiciona `aria-current` e um modo de revisão sequencial; não há avanço explícito nem teste de toque duplo ou leitor de tela. | `CampaignFinder.tsx:34`; PR #94 `CampaignFinder.tsx:45,56,118` |
| 034 | Resumo "O que entendemos" | EM ANDAMENTO (PR #94); main: NÃO INICIADA | Na PR, o resumo só aparece com 4/4 respostas; com 1–3 respostas não há resumo (cenário transversal 2). Faltam também o merge e a aprovação visual verificável. | main: nenhuma ocorrência de "O que entendemos"; PR #94 `CampaignFinder.tsx:52,129` |
| 035 | Revisão pontual do resumo | EM ANDAMENTO (PR #94); main: NÃO INICIADA | A PR permite remover e editar um item e revisar todos. Falta "cancelar edição" com retorno ao resumo; remover leva à etapa e o resumo some até completar 4/4; não há foco devolvido ao controle acionado. | PR #94 `CampaignFinder.tsx:139,145`; `CampaignFinder.test.tsx` (PR) |
| 036 | Separar intenção de filtros efetivos | NÃO INICIADA | O catálogo mostra um texto genérico ("apenas sinais confiáveis") sem listar quais respostas viraram filtro. A faixa de público aparece como "Escala: 51–200 **un.**", ou seja, como quantidade. O que já está certo: mínimo desconhecido não é eliminado. | `CatalogPage.tsx:44`; `campaignPresets.ts:98,122-135`; `catalog.ts:396` |
| 037 | Manter contexto na navegação | PARCIAL | Valores inválidos da URL são ignorados e não há dado pessoal na URL. Mas a campanha da URL sobrescreve silenciosamente o contexto do carrinho (outra aba ou link direto). | `campaignPresets.ts:63-74`; `campaignBrief.ts:30-45`; `useCatalogPageState.ts:132-137` |
| 038 | Mudanças de campanha conscientes [AV] | NÃO INICIADA | Não há decisão manter/substituir/cancelar. `setCampaign` troca sem aviso, e "Limpar tudo" no catálogo não limpa o contexto, que continua no orçamento. | `useCatalogPageState.ts:134,234`; `QuoteCartContext.test.ts:41` |
| 039 | Unificar contexto no orçamento [AV] | PARCIAL | O contexto aparece no orçamento só para leitura ("Contexto recuperado") e o payload usa o contexto do carrinho. Falta conferir e ajustar o contexto na própria página. | `QuotePage.tsx:434`; `QuotePage.tsx` submit (`submittedSelection.campaign`) |
| 040 | Compatibilidade e descarte do contexto | PARCIAL | Já há normalização de storage corrompido e reset por troca de titular. Falta descarte explícito do contexto pela interface e teste de versão antiga do carrinho. | `QuoteCartContext.test.ts:73`; `personalDataReset.ts:21`; `QuoteCartContext.tsx:17` (chave v1) |

### Bloco 5: catálogo (041–050)

| Etapa | Título | Classificação | O que falta | Evidência |
| --- | --- | --- | --- | --- |
| 041 | Explicar a seleção exibida [AV] | PARCIAL | Falta explicar quais filtros foram aplicados e dar acesso à revisão do briefing. A página afirma "curadoria" ("Curadoria iniciada pelo seu briefing", "curadoria humana"), o que o plano manda evitar. | `CatalogPage.tsx:30,44,62` |
| 042 | Reversibilidade dos filtros | CONCLUÍDA (pré-existente) | Os chips são removíveis por chave de campanha, o painel separa o sinal derivado e há abort de requisição antiga. Falta o registro de aceite. | `CatalogPage.tsx:65-73`; `useCatalogPageState.ts:242-244,267-269`; `hooks.ts:33,41`; e2e `smoke.spec.ts:1011` |
| 043 | Buscas sem correspondência | PARCIAL | "Você quis dizer" é opcional (não substitui a busca em silêncio). Falta distinguir SKU exato de nome desconhecido e sugerir revisar filtros do briefing. | `search.ts:147`; `CatalogFeedback.tsx:32-42`; `CatalogPage.tsx:76` |
| 044 | Catálogo vazio ≠ falha | CONCLUÍDA (pré-existente) | Falta o registro de aceite. Estados de vazio, falha e retry manual já estão separados. | `CatalogFeedback.tsx:21-42`; `CatalogPage.tsx:74-76` |
| 045 | Cards claros e honestos [AV] | PARCIAL | Já mostra "Quantidade a confirmar" e badge único. A descrição padrão "Personalize este produto…" aparece mesmo quando `allowsPersonalization` é falso, e a PR #88 (fotos) está aberta. | `ProductCard.tsx:43-49,57,60`; e2e `smoke.spec.ts:887` |
| 046 | Explicações de compatibilidade [AV] | NÃO INICIADA | Não há regra determinística de "por que este produto". | nenhuma ocorrência de razão de adequação em `ProductCard.tsx` |
| 047 | Transparência da ordenação | NÃO INICIADA | "Curadoria Promo" não tem descrição, e o ranking é aplicado no cliente só sobre a página carregada (o risco que a etapa nomeia). | `CatalogPage.tsx:64`; `useCatalogPageState.ts:112-115` |
| 048 | Evoluir a comparação [AV] | PARCIAL | A tabela trata ausência de dado como "A confirmar". O 4º item só desabilita o botão, com `title`, sem explicação acessível do limite. | `CatalogComparisonTray.tsx:52-58`; `ProductCard.tsx:72-76`; e2e `smoke.spec.ts:916` |
| 049 | Ajuda no momento de dúvida | PARCIAL | Os acordeões são acessíveis por teclado. Falta pergunta sobre mínimos, e "Posso consultar amostra…? Sim." se aproxima de promessa. | `ContextualFaq.tsx:7-21,15,41` |
| 050 | Validar catálogo com sinais incertos | PARCIAL | Há testes de estoque não confiável, badge e comparação. Falta a suíte consolidada (imagem quebrada, metadados contraditórios, categoria indisponível). | e2e `smoke.spec.ts:491,887,916,464`; `catalog.ts:226` (mínimo nulo vira 1) |

### Bloco 6: produto e apoio à decisão (051–060)

| Etapa | Título | Classificação | O que falta | Evidência |
| --- | --- | --- | --- | --- |
| 051 | Conciliar a ficha com o desenho aprovado | PARCIAL | A PR #91 foi mesclada (ficha compacta em main). Falta o registro rastreável da aprovação usada e a conciliação documentada. | `f7022c4`; `ProductPage.tsx:144-211` |
| 052 | Observação confortável do produto | CONCLUÍDA (via #91) | Falta homologação assistiva humana (093). Galeria acessível: posição anunciada, zoom em `dialog` e foco devolvido ao fechar. | `ProductGallery.tsx:30-66,73-85`; e2e `smoke.spec.ts:1320,1336`; `e2e/product-detail.spec.ts` |
| 053 | Reorganizar a apresentação inicial | CONCLUÍDA (via #91) | Falta o registro de aceite. Há resumo com expansão e a sintaxe bruta é tratada. | `ProductDescription.tsx:13-48`; `ProductDescription.test.tsx` |
| 054 | Aplicações com evidência [AV] | BLOQUEADA-EXTERNA | Não existe seção "ideias de uso". Depende de conteúdo com fonte e de aprovação visual. | nenhuma ocorrência de "ideias de uso" em `src/` |
| 055 | Limites sem desvalorizar a escolha | PARCIAL | Há aviso geral ("confirma personalização e prazo") e estado de especificações vazias. Falta a nota junto a cada ponto (cor, gravação, embalagem). | `ProductPage.tsx:157,209` |
| 056 | Preferência de cor | CONCLUÍDA (pré-existente) | Falta o registro de aceite. "A definir", nome junto à amostra e `aria-pressed` já existem. | `ProductPage.tsx:160-171` |
| 057 | Estimativa de quantidade | PARCIAL | Rótulo "Quantidade estimada" e dica de mínimo já existem. Zero, negativo e colagem são corrigidos para o mínimo em silêncio, sem orientação, e o padrão de 100 unidades é um número criado. | `ProductPage.tsx:65-83,175-178`; `catalog.ts:497-498` |
| 058 | Retorno claro ao adicionar [AV] | PARCIAL | Deduplicação e limite já funcionam. O retorno é abrir o drawer sem anunciar produto, cor e quantidade (o plano pede "sem modal desnecessário"). | `QuoteCartContext.tsx:81-113` |
| 059 | Fontes para fichas e documentos | BLOQUEADA-EXTERNA | Não há fonte aprovada. O recurso está corretamente omitido, mas a dependência externa não foi registrada. | nenhuma ocorrência de "ficha técnica"/"datasheet" |
| 060 | Compartilhar produto | CONCLUÍDA (pré-existente) | Falta o registro de aceite. Cancelamento não aparece como sucesso, falha de clipboard é tratada e só título e URL são compartilhados. | `ProductPage.tsx:108-124,146` |

### Bloco 7: seleção colaborativa (061–070)

| Etapa | Título | Classificação | O que falta | Evidência |
| --- | --- | --- | --- | --- |
| 061 | Consolidar o resumo da seleção [AV] | PARCIAL | Itens e unidades já aparecem separados, sem total fictício. O contexto revisável não aparece no drawer nem na seleção. | `QuotePage.tsx:414`; `QuoteDrawer.tsx:206-216` |
| 062 | Editar e desfazer | PARCIAL | O desfazer de limpeza e remoção já existe. No drawer, limpar pede confirmação; na página de orçamento, limpa direto. | `QuoteDrawer.tsx:209`; `QuotePage.tsx:414`; `QuoteCartContext.tsx:142-157` |
| 063 | Utilidade do nome da ação | CONCLUÍDA (pré-existente) | O nome não vai para analytics nem para o link compartilhado, e há rótulo neutro. A divergência de nome do campo fica na etapa 012. | `QuoteDrawer.tsx:211-215`; `QuotePage.tsx:406`; `sharedSelection.ts` sem `selectionTitle` |
| 064 | Referências e alternativas | PARCIAL | O código existe sob a flag `VITE_QUOTE_DECISION_GROUPS_ENABLED`, desligada por padrão. A ativação depende de confirmar a migration no ambiente. | `siteFeatureFlags.ts:5`; `QuotePage.tsx:420`; `QuoteDrawer.tsx:226` |
| 065 | Alcance de salvar e retomar | PARCIAL | O rascunho "24 h nesta aba" e a seleção salva na conta estão explicados. Falta dizer que "Minha seleção" é local ao navegador, e o aviso do rascunho é estático. | `quoteDraft.ts:8`; `SavedSelections.tsx:94`; `QuotePage.tsx:432` |
| 066 | Apresentação útil ao gestor [AV] | PARCIAL | A impressão já distingue "Seleção para cotação" e há teste de PDF. Faltam objetivo, especificações e revisão antes de compartilhar. | `QuotePage.tsx:395,400,405-410`; e2e `smoke.spec.ts:1447` |
| 067 | Composição de kits | PARCIAL | Unidades por kit e mínimo calculado já aparecem. Embalagem opcional e múltiplo desconhecido não são tratados no texto. | `KitBuilderPage.tsx:87-88,121`; e2e `smoke.spec.ts:192` |
| 068 | Compartilhamento consciente | CONCLUÍDA (pré-existente) | O alcance do link é declarado e há revogação e tratamento de expirado/revogado. O link persistente depende de flag. | `QuoteDrawer.tsx:216`; `SharedSelectionPage.tsx:67`; `siteFeatureFlags.ts:7` |
| 069 | Seleção de quem recebe | CONCLUÍDA (pré-existente) | Falta o registro de aceite. Há confirmação antes de substituir e tratamento de variantes e kits. | `SharedSelectionPage.tsx:195`; e2e `smoke.spec.ts:332,345,364` |
| 070 | Atribuição e histórico de decisões | PARCIAL | O conflito entre dispositivos na seleção salva é tratado. Falta o teste de duas abas × orçamento enviado. | `SavedSelections.tsx:137`; e2e `smoke.spec.ts:1114` |

### Bloco 8: formulários (071–080)

| Etapa | Título | Classificação | O que falta | Evidência |
| --- | --- | --- | --- | --- |
| 071 | Reduzir repetição | PARCIAL | Só a repetição de orçamento pré-preenche. Não há inventário das fontes, e o e-mail da conta autenticada não é aproveitado. | `QuotePage.tsx:58` |
| 072 | Ordenar campos pela conversa [AV] | NÃO INICIADA | O formulário começa por nome, empresa, e-mail e telefone; o contexto da ação vem depois. | `QuotePage.tsx:439-446` |
| 073 | Opcionalidade e finalidade | PARCIAL | Os rótulos "opcional" e "*" existem. Telefone é obrigatório no orçamento e opcional no contato. O checkbox promete "cópia… pelo WhatsApp" com o WhatsApp adiado, e a finalidade do canal preferido não é explicada. | `QuotePage.tsx:442,457`; `ConversationForm.tsx:110` |
| 074 | Rascunho com transparência | PARCIAL | A expiração de 24 h funciona. O aviso "ficam salvos" aparece mesmo quando o `sessionStorage` falha (`saveQuoteDraft` retorna void), e "Apagar rascunho" não pede confirmação. | `QuotePage.tsx:431-432`; `quoteDraft.ts:52,62-83` |
| 075 | Prevenir erros antes do envio | PARCIAL | As regras entre data e faixa de investimento existem, mas só aparecem no envio, sem orientação antecipada. | `quoteBriefing.ts:105-114`; `QuotePage.tsx:38` |
| 076 | Mensagens de campo construtivas | PARCIAL | Erro junto ao campo com `aria-describedby` e foco no primeiro erro. Só texto, sem ícone; só um erro de briefing por vez. Falta o catálogo de mensagens revisado. | `QuotePage.tsx:34-39,439-442` |
| 077 | Aviso vs. impedimento | PARCIAL | Falha de anexo não transforma o sucesso em erro. Não há classificação informação / aviso / bloqueio. | `QuotePage.tsx` submit (comentário "O orçamento já foi persistido") |
| 078 | Proteger contra envio duplicado | CONCLUÍDA (pré-existente + #89) | Falta o registro de aceite. Já existem trava, chave idempotente, cancelamento por titular ou rota e distinção entre 429 e 409. | `QuotePage.tsx` (`submittingRef`, `getOrCreateSubmissionAttempt`); `http.ts:89-95`; e2e `smoke.spec.ts:562-668,817` |
| 079 | Confirmar apenas o que aconteceu | PARCIAL + EM ANDAMENTO (PR #94) | Main já separa recebido com protocolo, e-mail preparado, anexo pendente e protocolo inválido. O timeout diz "Tente novamente" sem informar que o recebimento é incerto. Na PR #94, "Registrado para envio" aparece com ícone de check. | `QuotePage.tsx:354,366-372`; `http.ts:87,98-100,106`; PR #94 `QuotePage.tsx:389` |
| 080 | Personalizar com parcimônia | EM ANDAMENTO (PR #94); main: NÃO INICIADA | A PR usa o primeiro nome e a quantidade, com alternativa neutra. Falta o merge. | PR #94 `quoteConfirmation.ts:3-8`, `QuotePage.tsx:369` |

### Bloco 9: continuidade do relacionamento (081–090)

| Etapa | Título | Classificação | O que falta | Evidência |
| --- | --- | --- | --- | --- |
| 081 | Respeitar o canal preferido | PARCIAL | A preferência é persistida no contrato e no banco. Falta explicá-la como orientação ao retorno e tornar auditável a mudança de preferência. | `api/notifications.ts:62,145`; migration `20260910120000_preserve_variant_and_contact_preference.sql` |
| 082 | Cópias por e-mail e WhatsApp | BLOQUEADA-EXTERNA | O código de webhook existe, mas a ativação está adiada por decisão. Faltam consentimento, template e teste controlado. | `api/notification-events-resend.ts:58`; `api/notification-events-whatsapp.ts:79`; Plano:57 |
| 083 | Conta como benefício opcional | PARCIAL | O orçamento anônimo funciona e o histórico só é associado com identidade confirmada. Falta explicar o benefício e o caráter opcional da conta. | `QuotePage.tsx:369,372` |
| 084 | Histórico pela intenção | CONCLUÍDA (pré-existente) | Falta o registro de aceite. Busca por nome ou protocolo, status, paginação e "retrato" do envio já existem. | `CustomerAccountPage.tsx:88-95`; `CustomerQuotePage.tsx:231` |
| 085 | Explicar a linha do tempo | PARCIAL | Mostra os eventos reais com data. Falta o próximo passo por status, e status desconhecido vira "Em acompanhamento". | `CustomerQuotePage.tsx:236`; `customerAccount.ts:36-45` |
| 086 | Apoiar pedidos de ajuste | BLOQUEADA-EXTERNA | O código está pronto sob a flag `VITE_CUSTOMER_ADJUSTMENTS_ENABLED`. A homologação depende do ambiente. | `siteFeatureFlags.ts:6`; `CustomerQuotePage.tsx:186-214,234` |
| 087 | Repetir sem esconder mudanças | PARCIAL | Há confirmação antes de substituir e marcação de itens indisponíveis. A quantidade antiga é ajustada ao novo mínimo em silêncio. | `CustomerQuotePage.tsx:123-145`; `quoteItems.ts:152-180` (linha 173) |
| 088 | Contato como conversa contextual [AV] | NÃO INICIADA | A base existe (canal, protocolo, e-mail preparado). Falta o contexto opcional da campanha conforme mockup. | `ConversationForm.tsx:10-14,72-77` |
| 089 | Admitir incidentes de forma útil | PARCIAL | Error boundary, 404 e mensagens HTTP existem. Faltam padrão de manutenção ou falha de provedor e identificador técnico sanitizado. | `AppErrorBoundary.tsx:33`; `NotFoundPage.tsx`; `http.ts:89-106`; nenhuma ocorrência de "manutenção" |
| 090 | Feedback opcional | NÃO INICIADA | Não há pergunta curta de clareza. | nenhuma ocorrência de evento ou texto de feedback |

### Bloco 10: qualidade, medição e encerramento (091–100)

| Etapa | Título | Classificação | O que falta | Evidência |
| --- | --- | --- | --- | --- |
| 091 | Contratos unitários permanentes | PARCIAL | Há muitos testes de base (rascunho, carrinho, presets, envio). Faltam testes Carnegie de precedência de contexto, conflito de campanha e redaction de novos eventos. Os testes do resumo e da confirmação só existem na PR #94. | `quoteDraft.test.ts`; `QuoteCartContext.test.ts`; `campaignPresets.test.ts`; PR #94 `CampaignFinder.test.tsx` |
| 092 | Jornadas ponta a ponta | PARCIAL | Há e2e por trechos. Falta a jornada anônima home → briefing → catálogo → produto → seleção → orçamento → confirmação em um só cenário, com rede lenta e storage bloqueado. | `e2e/smoke.spec.ts` (56 testes), `e2e/product-detail.spec.ts` (8) |
| 093 | Acessibilidade assistiva | PARCIAL | Axe WCAG A/AA roda no e2e. Faltam leitor de tela humano e dispositivo real (externo). | e2e `smoke.spec.ts:173,1045` |
| 094 | Responsividade e fidelidade visual | BLOQUEADA-EXTERNA | Não há mockups aprovados versionados para comparar em 320–1440 px. | depende da etapa 020 |
| 095 | Instrumentar com privacidade | NÃO INICIADA | A base com lista de propriedades permitidas existe. Não há eventos das hipóteses Carnegie (resumo editado, conflito, feedback). A PR #94 não altera `analytics.ts`. | `analytics.ts:4-36`; nenhuma ocorrência de `summary_edited`/`campaign_conflict`/`feedback_` |
| 096 | Desempenho após instrumentação | NÃO INICIADA | Depende de 092, 094 e 095. Os gates de CI existem. | `UX_AUDIT_REPORT.md:388-392` |
| 097 | Avaliar entendimento e esforço | BLOQUEADA-EXTERNA | Faltam participantes e linha de base. | depende de 006/010 |
| 098 | Piloto operacional | BLOQUEADA-EXTERNA | Falta autorização para solicitações sintéticas e Atendimento disponível. | depende de 008 |
| 099 | Publicar por lotes reversíveis | NÃO INICIADA | Nenhum lote Carnegie foi publicado. As PRs #94 e #88 estão abertas, e o plano trava a promoção enquanto houver PR aberta. | REST GitHub (#94, #88 abertas); Plano:783 |
| 100 | Encerrar com evidência | NÃO INICIADA | A matriz não foi atualizada e não há documento de execução Carnegie. | `docs/MATRIZ_INDEX.md:5` |

## Contagem

| Classificação | Qtd. | Etapas |
| --- | ---: | --- |
| CONCLUÍDA (pré-existente/#89/#91) | 12 | 024, 042, 044, 052, 053, 056, 060, 063, 068, 069, 078, 084 |
| PARCIAL | 49 | 001, 002, 004, 005, 011, 012, 013, 017, 019, 022, 025*, 026, 029, 030, 037, 039, 040, 041, 043, 045, 048, 049, 050, 051, 055, 057, 058, 061, 062, 064, 065, 066, 067, 070, 071, 073, 074, 075, 076, 077, 079*, 081, 083, 085, 087, 089, 091, 092, 093 |
| EM ANDAMENTO (PR #94) | 3 | 034, 035, 080 (*025 e 079 também recebem parte da PR #94) |
| NÃO INICIADA | 24 | 007, 009, 010, 014, 015, 016, 018, 021, 023, 027, 031, 032, 033, 036, 038, 046, 047, 072, 088, 090, 095, 096, 099, 100 |
| BLOQUEADA-EXTERNA | 12 | 003, 006, 008, 020, 028, 054, 059, 082, 086, 094, 097, 098 |
| **Exigem aprovação visual [AV]** | 24 | 016, 017, 018, 019, 021, 022, 023, 026, 027, 028, 029, 033, 038, 039, 041, 045, 046, 048, 054, 058, 061, 066, 072, 088. Também dependem de insumo visual 014–015 (especificação) e 094 (comparação com mockup). 031 e 049 são mudanças de texto (aprovação editorial). |

**Aceite formal pelo critério do plano (linha 68): 0 de 100.** Nenhuma etapa tem registro com requisito, SHA, cenário, captura e responsável.

## Conclusão por jornada

Método: CONCLUÍDA = 1; PARCIAL = 0,5; NÃO INICIADA, BLOQUEADA e EM ANDAMENTO = 0, porque o estado oficial é o de main. Entre parênteses, a projeção se a PR #94 for mesclada (034, 035 e 080 passam a PARCIAL).

| Jornada | Etapas | Conclusão aprox. (main) | Com PR #94 | Comentário |
| --- | --- | ---: | ---: | --- |
| Fundação e governança | 001–020 | 22% | 22% | Sem promessa aprovada, sem indicadores e sem mockups e aprovação rastreáveis (020 bloqueia todo o trabalho visual). |
| Descoberta | 021–030 | 35% | 35% | Busca e frases de marca existem; não há caminho para indecisos nem home orientada a intenção aprovada. |
| Briefing: escuta (CampaignFinder e contexto) | 031–040 | 15% | 25% | É a jornada mais fraca: conflito de campanha silencioso, intenção confundida com filtro, sem saída com 0 respostas. |
| Catálogo | 041–050 | 50% | 50% | Filtros e estados vazio/erro são sólidos; falta explicar critérios e ordenação. |
| Produto | 051–060 | 60% | 60% | A #91 entregou galeria e descrição; faltam limites por campo, retorno ao adicionar e ideias de uso. |
| Seleção | 061–070 | 65% | 65% | Compartilhamento e importação são maduros; faltam escopo local, confirmação consistente e kits. |
| Briefing: formulário e confirmação | 071–080 | 45% | 50% | Idempotência forte; ordem dos campos, rascunho honesto e personalização ainda pendentes. |
| Pós-solicitação | 081–090 | 35% | 35% | Histórico bom; ajustes e mensageria dependem de flag ou adiamento; falta feedback. |
| Qualidade, medição e encerramento | 091–100 | 15% | 15% | Testes técnicos existem; pesquisa, piloto, fidelidade e publicação estão por fazer. |
| **Total ponderado** | 001–100 | **≈36%** | **≈38%** | A maior parte do que conta vem de código **anterior** ao plano; o trabalho Carnegie novo está quase todo na PR #94. |

## Top 10 lacunas por impacto comercial

1. **Contexto de campanha trocado ou contraditório em silêncio (037/038).** Um link ou briefing novo sobrescreve a direção do carrinho, e "Limpar tudo" no catálogo não limpa o contexto, que segue para o time comercial. Risco: proposta montada sobre o briefing errado. Evidência: `useCatalogPageState.ts:132-137,234`.
2. **Intenção apresentada como filtro e "curadoria" (036/041/047).** O catálogo diz "Curadoria iniciada pelo seu briefing" e "curadoria humana" sem mostrar quais filtros valeram. A faixa de público aparece como "un." e a ordenação "Curadoria Promo" só vale na página carregada. Risco: expectativa falsa e perda de confiança. Evidência: `CatalogPage.tsx:30,44,64`; `campaignPresets.ts:98`; `useCatalogPageState.ts:112-115`.
3. **Indecisos sem caminho (023/032).** Não existe "Ainda não sei o que escolher", e com 0 respostas o CTA fica desabilitado, sem saída para o catálogo. Afeta o topo do funil. Evidência: `CampaignFinder.tsx:101`.
4. **Resumo editável fora de main e incompleto (034/035, PR #94).** Só aparece com 4/4 respostas; com 1–3 respostas a confirmação de escuta, que é o centro do plano, não acontece.
5. **Promessa de WhatsApp com o canal adiado e telefone obrigatório (073/082).** O checkbox promete "cópia… pelo WhatsApp" e o telefone é exigido no orçamento (opcional no contato), gerando fricção e promessa não cumprida. Evidência: `QuotePage.tsx:442,457`; `ConversationForm.tsx:110`.
6. **Formulário começa por dados pessoais e contexto não é editável (072/039).** O cliente não consegue corrigir no orçamento o contexto que o time vai receber. Evidência: `QuotePage.tsx:434,439-446`.
7. **"Rascunho salvo" sem garantia (074).** O aviso é fixo mesmo se o `sessionStorage` falhar, e "Apagar rascunho" não pede confirmação. Risco de perda de trabalho em briefings longos. Evidência: `QuotePage.tsx:431-432`; `quoteDraft.ts:62-83`.
8. **Repetir orçamento muda a quantidade em silêncio (087).** A quantidade antiga é ajustada ao novo mínimo sem aviso, e o cliente recorrente pode enviar volumes que não escolheu. Evidência: `quoteItems.ts:173`.
9. **Retorno ao adicionar e limpeza inconsistentes (058/062).** Adicionar só abre o drawer, sem anunciar produto, cor e quantidade. "Limpar seleção" no orçamento apaga sem confirmar, enquanto o drawer confirma. Evidência: `QuoteCartContext.tsx:113`; `QuotePage.tsx:414`; `QuoteDrawer.tsx:209`.
10. **Confiança B2B sem lastro e sem medição (007/028/054/010/095).** Não há inventário de afirmações ("proposta real", "materiais de menor impacto", "recomendação sob medida" na PR #94), prova social, ideias de uso com fonte, indicadores nem linha de base. Assim, nenhum ganho comercial poderá ser demonstrado.

## Pontos de governança

- **Aprovação visual (AGENTS.md):** 24 etapas exigem mockup aprovado antes de código. A etapa 020 (registro rastreável) não existe, então as PRs #91, #92 e #94 se apoiam em aprovações que não estão no repositório. Recomenda-se versionar imagens e aceite (página × viewport × versão) antes de mesclar a #94.
- **PR #94** também introduz texto comercial novo ("Você recebe uma recomendação sob medida") que deveria passar pelas etapas 007 e 009, e mostra ícone de check ao lado de "Registrado para envio" (estado pendente), o que conflita com o princípio C7 da etapa 079.
- **Flags dependentes de ambiente** (grupos de decisão, ajustes, links persistentes): o código existe, mas não há evidência de ativação. Não contam como concluídas.
