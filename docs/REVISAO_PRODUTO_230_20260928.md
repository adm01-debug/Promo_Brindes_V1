# Rastreabilidade das 230 referências de produto — revisão 28/09/2026

Fonte: [matriz canônica](MATRIZ_FECHAMENTO_PLANOS_20260912.csv). Este anexo não altera o ledger histórico nem transforma declaração I em novo aceite funcional. Todas as linhas foram inventariadas; recertificações e contraprovas desta rodada estão indicadas. Leia o [parecer](REVISAO_PLANOS_20260928.md).

Distribuição histórica: UX50I/46P/4E; LK19I/23P/1N/7E; GR26I/24P; AC23I/7P. Total118I/100P/1N/11E. Não usar como percentual atual de conclusão: há notas vencidas, especialmente LK10, UX35/49/88.

I = implementação declarada no escopo histórico; P = parcial; N = não localizada à época; E = dependência externa. “Histórico preservado” significa evidência herdada, não reteste individual feito hoje. Fontes detalhadas no CSV original. Pesquisa, operação e acervo não são supridos por simulações.

| ID | Estado histórico | Entrega | Revisão atual / limite de evidência |
|---|---|---|---|
| UX01 | I | Linha de base e cobertura | Histórico preservado, sem recertificação individual: Inventário e planos localizados; esta revisão atualiza evidências e distingue simulações de produção. |
| UX02 | P | Continuidade e métricas | Conflito guiado de campanhas já existe; não é sincronização automática do carrinho. Métricas/ensaio real pendentes. |
| UX03 | I | Testes de contrato das falhas | Histórico preservado, sem recertificação individual: Regressões B01–B07 incorporadas aos testes pertinentes; endpoint persistente explicitamente configurado no E2E. Novos achados R01–R08 têm diagnósticos, ainda não correções. |
| UX04 | I | Consulta de novidades | Histórico preservado, sem recertificação individual: Novidades consultáveis em produção e lógica coberta; catálogo não exige estoque positivo. |
| UX05 | I | Autocomplete e atalhos | Histórico preservado, sem recertificação individual: Autocomplete fechado não intercepta atalhos; teclado e aria-activedescendant cobertos. |
| UX06 | P | Erros com recuperação útil | Histórico preservado, sem recertificação individual: R01/R02/R03/R04 têm contratos de finalização, reconciliação, recuperação e precedência; mensagens e retry estão implementados. Homologação dos provedores reais foi adiada pelo usuário. |
| UX07 | I | Rascunho de orçamento | Histórico preservado, sem recertificação individual: Rascunho é preservado em falha e limpo após sucesso ou troca de sessão. R08 está corrigido; testes exercitam logout entre abas e envio em andamento. |
| UX08 | I | Comparação ao navegar | Histórico preservado, sem recertificação individual: Comparação em sessão revalida IDs e avisa sobre remoção ou fallback; não é sincronização entre dispositivos. |
| UX09 | I | Contexto da campanha | Histórico preservado, sem recertificação individual: Contexto estruturado acompanha descoberta e briefing; duplicação de link limpa contexto anterior. |
| UX10 | I | Aceitar estabilização | Histórico preservado, sem recertificação individual: Lote original de estabilização B01–B07 entregue, publicado e com suites aprovadas no commit; não representa encerramento das expansões nem dos novos achados. |
| UX11 | P | Arquitetura da informação | Histórico preservado, sem recertificação individual: Destinos por tarefa implementados; testes de localização com compradores ainda ausentes. |
| UX12 | I | Nomes das tarefas | Histórico preservado, sem recertificação individual: Ações de seleção vazia usam Explorar catálogo; termos editoriais continuam nos títulos. Vocabulário funcional documentado sem prometer venda online. |
| UX13 | P | Guia de voz | Histórico preservado, sem recertificação individual: Guia de voz com nomes, exemplos, frases aprovadas e revisão por PR implementado. Exemplos novos ainda requerem aceite editorial de marketing. |
| UX14 | I | Sistema visual | Histórico preservado, sem recertificação individual: Tokens e componentes compartilhados presentes; não equivale à certificação manual de acessibilidade. |
| UX15 | I | Cabeçalho por tarefa | Histórico preservado, sem recertificação individual: Cabeçalho oferece catálogo busca seleção e conta; percursos desktop/mobile automatizados. |
| UX16 | I | Busca móvel | Histórico preservado, sem recertificação individual: Busca e menu móvel funcionam na cobertura automatizada; dispositivos físicos ficam em UX95. |
| UX17 | P | Painéis e diálogos | Histórico preservado, sem recertificação individual: Diálogos de repetição, compartilhamento e campanhas bloqueiam scroll e controlam foco/Escape. Resta revisão assistiva manual além dos testes de teclado. |
| UX18 | I | Orientação e posição | Histórico preservado, sem recertificação individual: Restauração por chave aguarda conteúdo lazy crescer, respeita a intenção da pessoa e tem regressões unitária e de navegador para retorno ao catálogo. |
| UX19 | I | Erros e vazios | Histórico preservado, sem recertificação individual: Rotas inválidas retornam 404 com shell próprio; estados vazio e recuperação presentes. |
| UX20 | E | Testar navegação com tarefas | Histórico preservado, sem recertificação individual: Não há sessões documentadas com compradores reais; auditoria técnica é evidência distinta. |
| UX21 | P | Ordem da home por intenção | Histórico preservado, sem recertificação individual: Produtos reais foram antecipados para depois do hero e da explicação curta do fluxo, antes de briefing, biblioteca e manifesto. Resta avaliar a hierarquia com compradores. |
| UX22 | I | Promessa no primeiro bloco | Histórico preservado, sem recertificação individual: Promessa e ausência de pagamento explícitas; compreensão por público real não certificada. |
| UX23 | P | Produtos que mostrem repertório | Histórico preservado, sem recertificação individual: Produtos reais aparecem; seleção editorial responsável e revisão de diversidade não demonstradas. |
| UX24 | P | Campanhas distintas | Histórico preservado, sem recertificação individual: Onboarding não impõe mais kits; diferenciar resultados por intenção e validar pertinência ainda pendente. |
| UX25 | I | Quatro frases da marca | Histórico preservado, sem recertificação individual: Quatro frases exatas presentes no manifesto e verificadas pelos testes. |
| UX26 | E | Case comercial real | Histórico preservado, sem recertificação individual: Modelo completo de case com material autorizado e resultado documentado não localizado. |
| UX27 | P | Como funciona | Histórico preservado, sem recertificação individual: Processo apresentado; etapas de arte produção e entrega dependem de validação comercial. |
| UX28 | E | Operação e limites | Histórico preservado, sem recertificação individual: Fotos próprias autorizadas e capacidades/prazos operacionais precisam confirmação. |
| UX29 | I | Necessidade no contato | Histórico preservado, sem recertificação individual: Contato inclui mensagem e preferência de canal; persistência não equivale a notificação. |
| UX30 | P | Redes e atendimento oficial | Histórico preservado, sem recertificação individual: Quatro redes e links acessíveis presentes; titularidade horários e atendimento real não revalidados. |
| UX31 | P | Taxonomia de campanhas | Histórico preservado, sem recertificação individual: Taxonomia implementada; sem avaliação comercial sistemática dos rótulos editoriais. |
| UX32 | P | Sinônimos por intenção | Histórico preservado, sem recertificação individual: Sinônimos e onboarding separados de kit; ausência de conjunto julgado limita aceite de relevância. |
| UX33 | I | Erros de digitação | Histórico preservado, sem recertificação individual: Correção sugerida de digitação e preservação de códigos cobertas por testes. |
| UX34 | P | Amostra de relevância | Histórico preservado, sem recertificação individual: Há 20 julgamentos editoriais versionados e testados como baseline técnico; ainda falta homologação comercial com consultas e resultados reais. |
| UX35 | P | Ordenação editorial | Ranking por intenção/diversidade existe em catalogRanking.ts; testes atuais aprovados. Alcance por página e curadoria humana permanecem parciais. |
| UX36 | I | Novidades, kits, badge único | Histórico preservado, sem recertificação individual: Badge único com prioridade novidade-kit-personalização e janela temporal testados. |
| UX37 | I | Grupos do superfiltro | Histórico preservado, sem recertificação individual: Grupos filtros por IDs chips e busca interna implementados/testados. |
| UX38 | I | Refinamento móvel | Histórico preservado, sem recertificação individual: Painel móvel combina filtros preserva URL e retorna foco. |
| UX39 | I | Densidade, paginação, retorno | Histórico preservado, sem recertificação individual: Paginação e filtros permanecem na URL; o retorno restaura a posição exata mesmo quando a rota recompõe altura de forma assíncrona. |
| UX40 | P | Explicar recomendações e vazios | Histórico preservado, sem recertificação individual: Filtros e vazios explicáveis; pertinência comercial de recomendações ainda sem aceite. |
| UX41 | P | Qualidade dos dados | Histórico preservado, sem recertificação individual: B02 corrigido. A amostra histórica não é estratificada nem valida completude/consistência do catálogo inteiro; não houve escrita na origem. |
| UX42 | I | Resumo e descrição completa | Histórico preservado, sem recertificação individual: Resumo e descrição completa separados na ficha; não implica qualidade factual de todo cadastro. |
| UX43 | P | Especificações e unidades | Histórico preservado, sem recertificação individual: Ausências e unidades apresentadas; comparabilidade por família exige revisão dos dados. |
| UX44 | I | Galeria com ampliação | Histórico preservado, sem recertificação individual: Miniaturas zoom Escape e fallback implementados; testes aprovados nos recortes de galeria. |
| UX45 | I | Cores e variantes | Histórico preservado, sem recertificação individual: Variante estável é validada contra o produto; quando o catálogo não fornece variant_id, o nome da cor é preservado, reconciliado somente por correspondência única e sinalizado quando removido ou ambíguo. Histórico, conta e links não descartam a escolha silenciosamente. |
| UX46 | I | Mínimo e ajuste de quantidade | Histórico preservado, sem recertificação individual: Mínimo desconhecido usa piso técnico de uma unidade e rótulo a confirmar; mínimo conhecido é conferido no servidor. Digitação corrigida e regressão WebKit encerrada. |
| UX47 | P | Personalização comprovada | Histórico preservado, sem recertificação individual: FAQ orienta personalização; matriz de técnicas/áreas e exemplos reais por família ausentes. |
| UX48 | I | FAQ contextual | Histórico preservado, sem recertificação individual: FAQ contextual centralizada no catálogo produto e briefing; cobertura existente aprovada. |
| UX49 | P | Relacionados relevantes | rankRelatedProducts implementado/testado; diagnóstico antigo superado. Julgamento comercial permanece pendente. |
| UX50 | I | Comparação decisória | Histórico preservado, sem recertificação individual: Comparação de até três referências com dimensões material capacidade e ausências implementada. |
| UX51 | I | Feedback ao salvar | Histórico preservado, sem recertificação individual: Salvar atualizar contador e limite de cinquenta possuem feedback e testes. |
| UX52 | I | Remover/limpar com proteção | Histórico preservado, sem recertificação individual: Desfazer remoção/limpeza e confirmar substituição estão implementados; antigos gaps de duplicação encerrados. |
| UX53 | I | Seleções por campanha | Histórico preservado, sem recertificação individual: Biblioteca por conta permite várias campanhas nomeadas, retomada, atualização, arquivamento e exclusão com confirmação. Persistência usa controle de versão. |
| UX54 | P | Alternativas de decisão | Histórico preservado, sem recertificação individual: Prioridade alternativa agora acompanha serialização, API, persistência, leitura e duplicação. Página compartilhada identifica as alternativas. Resta teste de compreensão com compradores. |
| UX55 | I | Impressão/PDF | Histórico preservado, sem recertificação individual: Seleção extensa gera PDF A4 multipágina com identidade, imagens contidas, itens sem quebra interna e controles/formulário ocultos. |
| UX56 | I | Modelo de compartilhamento | Histórico preservado, sem recertificação individual: Modelo opaco revogável com segredo separado e prazo definido implementado; links antigos têm contrato distinto. |
| UX57 | P | Link de leitura | Histórico preservado, sem recertificação individual: Leitura e revogação implementadas com limite 50 aplicado; falta novo ciclo real criar-abrir-revogar no deployment. |
| UX58 | P | Prévia de links por conteúdo | Histórico preservado, sem recertificação individual: Coleções e datas conhecidas recebem título, descrição e canonical específicos na resposta HTML inicial, e o sitemap publica somente combinações curadas. A imagem social continua compartilhada entre essas páginas e a renderização nos canais reais ainda precisa de validação operacional. |
| UX59 | P | Sincronização após login | Histórico preservado, sem recertificação individual: Biblioteca remota está implementada e publicada na base 91653ab; pgTAP cobre titularidade e E2E exercita dois navegadores com API simulada. Falta homologação de retomada autenticada em dispositivos físicos; não há sincronização automática do carrinho. |
| UX60 | I | Conflitos/ciclo de campanhas | Histórico preservado, sem recertificação individual: Versão otimista impede sobrescrita concorrente; arquivo e restauração funcionam. Ao detectar edição em outro dispositivo, a interface compara versões e oferece usar a conta, preservar as duas como cópia ou substituir conscientemente, sem perda silenciosa. |
| UX61 | I | Resumo editável da campanha | Histórico preservado, sem recertificação individual: Resumo editável de nome ocasião intenção e briefing presente. |
| UX62 | I | Verba sem preço fictício | Histórico preservado, sem recertificação individual: Verba opcional exige escopo quando definida; sem preço comercial calculado. |
| UX63 | I | Evento versus recebimento | Histórico preservado, sem recertificação individual: Validação de evento passado e recebimento incompatível antes do POST; calendário de São Paulo compartilhado conceitualmente entre UI/API e testes de instantes absolutos. |
| UX64 | P | Formulário com menos esforço | Histórico preservado, sem recertificação individual: R08 está corrigido; regressões cobrem sucesso, falha, logout e envio em andamento. Resta avaliação de esforço e compreensão do formulário com compradores. |
| UX65 | I | Anexos protegidos | Guardas presentes; PDF atualmente recusado. Assinatura/prefixo de imagem não certifica saneamento estrutural completo. |
| UX66 | I | Envio único do orçamento | Histórico preservado, sem recertificação individual: Identidade da tentativa e transação idempotente no fluxo principal testadas; entrega de mensagens é requisito separado. |
| UX67 | P | Confirmação e próximo passo | Histórico preservado, sem recertificação individual: Registro mantém protocolo e limpa o rascunho; finalização false não é sucesso e aceite de provedor tem reconciliação. Prazo, responsável e recebimento pelo atendimento continuam dependentes de homologação operacional. |
| UX68 | P | Cópia por e-mail | api/notifications.ts já inclui kits, alternativas, datas e verba. Configuração/entrega real e aceite editorial permanecem adiados. |
| UX69 | P | WhatsApp opcional automático | Histórico preservado, sem recertificação individual: Opt-in, template Meta, callback e reconciliação de aceite implementados. Configuração, conteúdo aprovado e homologação real foram adiados pelo usuário; aceite do provedor não prova entrega ao destinatário. |
| UX70 | P | Passagem ao atendimento | Fila de confirmação ao cliente não encaminha ao comercial; adaptador/destino operacional não localizado. |
| UX71 | I | Método principal de acesso | Histórico preservado, sem recertificação individual: Login opcional com escolhas de método; visitante consegue solicitar sem conta. |
| UX72 | I | Campos de autenticação | Histórico preservado, sem recertificação individual: Campos validação mostrar senha e mensagens implementados/testados. |
| UX73 | P | Recuperação e expiração | Histórico preservado, sem recertificação individual: Callback e recuperação implementados; e-mail real expiração reenvio e redefinição não reexecutados nesta revisão. |
| UX74 | I | Histórico por campanha | Histórico preservado, sem recertificação individual: Lista por titular com busca filtros paginação e nome de ação implementada. |
| UX75 | P | Timeline acionável | Histórico preservado, sem recertificação individual: B04 corrigido; eventos reais do banco continuam disponíveis. Responsável, SLA e evidência do fluxo operacional ainda não fechados. |
| UX76 | P | Versões de proposta | Histórico preservado, sem recertificação individual: B06 encerrado: última versão vencida recebe indicação de validade encerrada. Permanece aceite publicação real de PDF, titular autorizado, expiração do link e recuperação. |
| UX77 | P | Pedidos de ajuste | Histórico preservado, sem recertificação individual: Ajuste idempotente, recuperação do detalhe e troca de ID sem vazamento de dados ou ações da rota anterior estão implementados e cobertos. Falta comprovar que o pedido chega ao responsável e percorre a operação. |
| UX78 | I | Repetir campanha sem perda | Histórico preservado, sem recertificação individual: Repetição agora consulta catálogo atual antes de substituir, preserva referências removidas como bloqueios visíveis e confirma troca de seleção existente. |
| UX79 | P | Isolamento e compartilhamento | Projeção de favoritos corrigida, mas F28-01 despacha ação após troca de titular; isolamento global não fechado. |
| UX80 | P | Dados e preferências | Histórico preservado, sem recertificação individual: Limpeza entre sessões foi corrigida; runbook de solicitação do titular existe. Resta homologação operacional de acesso/apagamento e preferências; não confundir teste de isolamento com operação de atendimento. |
| UX81 | I | Online/PDF/revista distintos | Histórico preservado, sem recertificação individual: Tipos online PDF digital distintos; dez publicações atuais são explicitamente online. |
| UX82 | I | Capas com produtos reais | Histórico preservado, sem recertificação individual: Capas consultam produtos reais com carregamento e fallback. |
| UX83 | I | Coleções por campanha | Histórico preservado, sem recertificação individual: Dez coleções têm responsável, publicação, revisão e prazo de nova revisão em fonte compartilhada pelo site, HTML inicial e sitemap. |
| UX84 | P | Governar publicações/downloads | Dez coleções online; PDFs/revistas reais não localizados. Usuário declarou materiais aprovados; falta localização verificável. |
| UX85 | I | Oportunidades futuras | Histórico preservado, sem recertificação individual: Próximas oportunidades priorizadas sem esconder passadas; virada de ano coberta. |
| UX86 | P | Proximidade e viabilidade | Histórico preservado, sem recertificação individual: Janelas são orientativas; viabilidade comercial não comprovada por esses cálculos. |
| UX87 | I | Agenda móvel | Histórico preservado, sem recertificação individual: Lista calendário filtros e detalhes móveis presentes/testados. |
| UX88 | P | Favoritos no planejamento | Nota histórica incorreta: sincronização por conta e storage existem. F24 corrigidos; F28-01/02 impedem fechamento de concorrência. |
| UX89 | P | Exportação de calendário | Histórico preservado, sem recertificação individual: ICS com datas móveis escape e UID testado; importação/reimportação em calendários reais pendente. |
| UX90 | I | Ocasião→coleção→briefing | Histórico preservado, sem recertificação individual: Contexto de ocasião segue até o briefing e pode ser revisado. |
| UX91 | E | Compradores reais | Histórico preservado, sem recertificação individual: Sem pesquisa documentada com participantes reais. |
| UX92 | P | Funil com minimização | Web Analytics desabilitado na API Vercel; smoke404. Minimização implementada, recepção real não homologada. |
| UX93 | P | Orçamento de desempenho | Histórico preservado, sem recertificação individual: Budget de assets aprovado; sem evidência de CWV p75 em campo ou baseline comparável. |
| UX94 | P | Acessibilidade manual | Histórico preservado, sem recertificação individual: Axe nos templates e testes de teclado passam; leitor de tela zoom e reflow completos não avaliados. |
| UX95 | P | Dispositivos/navegadores reais | Histórico preservado, sem recertificação individual: Chromium desktop/mobile e Firefox/WebKit fazem parte dos gates. Emulação não certifica Safari/iOS ou Android físicos, teclado virtual e matriz assistiva completa. |
| UX96 | I | Movimento intencional | Histórico preservado, sem recertificação individual: Fold/Glitch pontuais com movimento reduzido coberto; conteúdo textual preservado. |
| UX97 | P | SEO técnico | Histórico preservado, sem recertificação individual: Metadados, canonical, 404 e sitemap incluem produtos, coleções curadas e datas do ano vigente. Permanecem o acompanhamento de indexação em ferramenta externa e a validação dos previews nos canais reais. |
| UX98 | P | Dados seguros/reversíveis | 62 migrations; dry-run atual sem pendências. Não certifica ACL/schema/dados completos nem drill RPO/RTO. |
| UX99 | P | Matriz ponta a ponta/resiliência | 399 testes aprovados, mas dois probes F28 falham; cobertura não prova ausência de defeitos. |
| UX100 | P | Publicar e reavaliar | Main40e05ab publicada; release falha no Analytics e PR67 aberto. Critérios externos não encerrados. |
| LK01 | I | Linha de base real | Histórico preservado, sem recertificação individual: Linha de base atualizada com commit HTTP browser e pg_catalog separados. |
| LK02 | E | Tarefas com compradores | Histórico preservado, sem recertificação individual: Sessões com compradores não localizadas. |
| LK03 | E | Acervo autorizado | Histórico preservado, sem recertificação individual: Inventário de material autorizado e direitos de uso não encontrado. |
| LK04 | I | Contratos visuais/marca | Histórico preservado, sem recertificação individual: Tokens frases e badge único presentes; validação humana do redesign é separada. |
| LK05 | P | Protótipo antes do desenvolvimento | Histórico preservado, sem recertificação individual: Interface construída; protótipos e aceite prévios com público não comprovados. |
| LK06 | P | Hero fotográfico próprio | Histórico preservado, sem recertificação individual: Hero ilustrativo próprio existe; acervo real de execução autorizada ainda pendente. |
| LK07 | I | Hero móvel | Histórico preservado, sem recertificação individual: Hero com texto HTML e recortes responsivos; motion reduzido testado. |
| LK08 | I | Manifesto protegido | Histórico preservado, sem recertificação individual: Quatro frases reunidas e cobertas em desktop/mobile. |
| LK09 | P | Reduzir repetição da home | Histórico preservado, sem recertificação individual: Vitrine de produtos foi antecipada sem remover o manifesto. Resta observar descoberta e redundância com compradores. |
| LK10 | N | Categorias fotográficas | N histórico desatualizado: HomePage.tsx possui categorias fotográficas. Código entregue; curadoria e homologação permanecem parciais. |
| LK11 | I | Cabeçalho por tarefas | Histórico preservado, sem recertificação individual: Cabeçalho por tarefas disponível. |
| LK12 | P | Menu visual de categorias | Histórico preservado, sem recertificação individual: Menu e agrupamentos acessíveis; dimensão fotográfica e teste de localização pendentes. |
| LK13 | I | Navegação móvel | Histórico preservado, sem recertificação individual: Busca seleção e filtros móveis cobertos. |
| LK14 | P | Coleções por campanha | Histórico preservado, sem recertificação individual: Coleções existem; onboarding corrigido; pertinência/distinção comercial não certificada. |
| LK15 | I | Editorial com revisão/validade | Histórico preservado, sem recertificação individual: Coleções possuem responsável, estado editorial, publicação, última revisão, revisão futura e expiração opcional; rascunho/retirada/expirado não são publicados. |
| LK16 | I | Imagens e fallback | Histórico preservado, sem recertificação individual: Dimensões carregamento e fallback implementados; amostra tinha fotos principais ausentes com alternativas. |
| LK17 | P | Curadoria real | Histórico preservado, sem recertificação individual: Produtos públicos reais; curadoria por propósito/diversidade ainda sem julgamento comercial. |
| LK18 | I | Um badge por card | Histórico preservado, sem recertificação individual: Um badge por card testado em todas as combinações previstas. |
| LK19 | I | Informações no card | Histórico preservado, sem recertificação individual: Card mostra mínimo/cores/resumo; mínimo desconhecido recebe Quantidade a confirmar. Regras de múltiplos permanecem em LK23. |
| LK20 | P | Busca aprofundada | Histórico preservado, sem recertificação individual: Busca semântica leve e correções existem; falta amostra real julgada. |
| LK21 | I | Galeria | Histórico preservado, sem recertificação individual: Galeria miniaturas zoom e fallback implementados. |
| LK22 | P | Técnica/personalização | Histórico preservado, sem recertificação individual: Ficha e FAQ disponíveis; lastro de personalização e revisão por família incompletos. |
| LK23 | P | Mínimo/múltiplo/estimativa | Histórico preservado, sem recertificação individual: B02 e B07 corrigidos. Contrato não modela múltiplo de compra confirmado quando aplicável; é necessário levantar dados comerciais e diferenciar mínimo/múltiplo/estimativa. |
| LK24 | I | Comparar três produtos | Histórico preservado, sem recertificação individual: Até três produtos comparáveis com persistência em sessão. |
| LK25 | P | Relacionados/compartilhar produto | Histórico preservado, sem recertificação individual: Compartilhar/relacionados presentes; diversidade por intenção e todos os cancelamentos nativos sem aceite. |
| LK26 | I | SKU kit versus composição | Histórico preservado, sem recertificação individual: Badge de kit continua representando SKU do catálogo; a rota Monte seu kit cria composição do visitante com identificador próprio, sem alterar o catálogo canônico. |
| LK27 | P | Modelos de composição | Histórico preservado, sem recertificação individual: Três estruturas neutras permitem escolher produtos reais e substituí-los; sugestões comerciais por intenção ainda dependem de curadoria aprovada. |
| LK28 | I | Escolher/substituir componentes | Histórico preservado, sem recertificação individual: Composição flexível oferece dois componentes obrigatórios e dois opcionais. Adição, substituição e remoção preservam seleção e totais; testes cobrem retirar extra e impedir kit incompleto. |
| LK29 | I | Aritmética dos conjuntos | Histórico preservado, sem recertificação individual: Número de kits × unidades por componente respeita mínimos, inteiros, teto global e consistência de grupo em frontend, drawer, transmissão, API e banco. Mutação individual é redirecionada ao grupo e payload adulterado falha fechado. |
| LK30 | I | Composição no briefing | Histórico preservado, sem recertificação individual: Grupo, nome, quantidade de kits e unidades por componente sobrevivem ao rascunho local, conta, compartilhamento, envio e histórico. Serialização estrita recusa truncamento, arredondamento ou desmembramento; colisões e kits unitários não degradam silenciosamente. |
| LK31 | E | Prova social autorizada | Histórico preservado, sem recertificação individual: Prova social autorizada depende de acervo e validação. |
| LK32 | E | Três cases reais | Histórico preservado, sem recertificação individual: Três cases reais verificáveis não publicados. |
| LK33 | E | Personalização em detalhe | Histórico preservado, sem recertificação individual: Fotos correspondentes de peça-base simulação e produção real precisam material autorizado. |
| LK34 | E | Time e bastidores | Histórico preservado, sem recertificação individual: Bastidores e pessoas reais precisam conteúdo e autorização de imagem. |
| LK35 | P | Qualidade/ambiente comprovados | Histórico preservado, sem recertificação individual: Linguagem cautelosa existe; lastro documental de alegações não integralmente demonstrado. |
| LK36 | P | Catálogo editorial nativo | Histórico preservado, sem recertificação individual: Coleções online nativas funcionam; revisão editorial e curadoria ainda parciais. |
| LK37 | P | Compartilhar seleção inteira | Histórico preservado, sem recertificação individual: Link persistente com 50 itens e revogação implementados; falta novo ciclo real no deployment e contrato de composição. |
| LK38 | I | Exportar para aprovação | Histórico preservado, sem recertificação individual: Links preservam composição e alternativas; impressão gera PDF A4 multipágina legível com imagens e itens íntegros para aprovação. |
| LK39 | P | Guias úteis | Histórico preservado, sem recertificação individual: Landings explicativas presentes; autoria revisão e profundidade prática ainda pendentes. |
| LK40 | E | Projeto especial | Histórico preservado, sem recertificação individual: Jornada de desenvolvimento especial depende de confirmação comercial do serviço. |
| LK41 | I | Selecionar versus enviar | Histórico preservado, sem recertificação individual: Salvar e solicitar diferenciados; tela de sucesso exige protocolo do endpoint quando habilitado. |
| LK42 | P | Formulário enxuto | Histórico preservado, sem recertificação individual: Limpeza R08 e troca de sessão corrigidas/testadas. Resta medir esforço do formulário e validar linguagem com compradores. |
| LK43 | I | Logo/referências privadas | Histórico preservado, sem recertificação individual: Logo e referências ficam privados por titular, expiram, não atravessam troca de sessão e têm assinatura binária inspecionada no backend antes de qualquer vínculo ao briefing. |
| LK44 | P | WhatsApp iniciado pelo visitante | Histórico preservado, sem recertificação individual: WhatsApp iniciado pelo visitante existe; operação/destinatário oficial precisam validação. |
| LK45 | P | E-mail auditável | Cópia enriquecida já implementada; aceite editorial e entrega real pendentes. Não anunciar cópia integral/recebimento. |
| LK46 | P | Acessibilidade contínua | Histórico preservado, sem recertificação individual: Automação e padrões existem; revisão assistiva e física pendente. |
| LK47 | P | Desempenho real | Histórico preservado, sem recertificação individual: Budget aprovado; CWV e comparação de uso real ausentes. |
| LK48 | P | SEO sem checkout | Histórico preservado, sem recertificação individual: Shell corrigido e sem ofertas fictícias; prévias específicas/indexação fina não encerradas. |
| LK49 | P | Medir funil seguro | Mesmo limite de UX92: Analytics desabilitado/404. |
| LK50 | P | Publicar com reversão | Main publicada e ledger alinhado; release/smoke ainda falha. Fechamento integral não demonstrado. |
| GR01 | I | Delimitar raiz/site | Histórico preservado, sem recertificação individual: Wrapper fixa raiz e corpus do site. |
| GR02 | I | Linha de base | Histórico preservado, sem recertificação individual: Metadados fingerprint e commit de origem registrados; status atual no corpus técnico. |
| GR03 | I | Dez perguntas de valor | Histórico preservado, sem recertificação individual: Dez perguntas estruturais versionadas e benchmark reproduzível com busca direta, conforme escopo técnico adotado. Não mede entendimento humano ou precisão semântica. |
| GR04 | P | Responsabilidades | Histórico preservado, sem recertificação individual: Papéis técnicos definidos; responsável nominal e transferência não registrados. |
| GR05 | I | Decisão arquitetural | Histórico preservado, sem recertificação individual: Ferramenta de engenharia local/CI sem dependência do runtime. |
| GR06 | I | Versão/ambiente fixos | Histórico preservado, sem recertificação individual: Graphify 0.9.48 fixado em configuração e CI. |
| GR07 | I | Configuração versionada | Histórico preservado, sem recertificação individual: Configuração versionada e validada pelo wrapper. |
| GR08 | P | Corpus inicial | Mapa atual1950 nós/3915 relações; números históricos superados. Continua AST, sem corpus documental/semântico. |
| GR09 | I | Exclusões e caminhos | Histórico preservado, sem recertificação individual: Raiz extensões exclusões e symlinks controlados no wrapper; teste hostil integral fica em GR45. |
| GR10 | I | Armazenamento/retenção | Histórico preservado, sem recertificação individual: Grafo ignorado no Git e artefatos CI com retenção de 14 dias. |
| GR11 | I | Doctor | Histórico preservado, sem recertificação individual: Doctor disponível com diagnóstico de versão/raiz. |
| GR12 | I | Geração estrutural sem IA | Histórico preservado, sem recertificação individual: Extração estrutural code-only sem uso de chaves de IA ou Supabase. |
| GR13 | I | Reconstruir mapa | Histórico preservado, sem recertificação individual: Mapa atual validado: 1099 nós e 2416 relações, gerado a partir de f20df44; artefatos não são entregues no frontend. |
| GR14 | I | Direção das relações | Histórico preservado, sem recertificação individual: Decisão arquitetural datada: manter relações não direcionadas e declarar a limitação; o produto não anuncia causalidade que a extração não prova. |
| GR15 | P | Identidades/caminhos | Histórico preservado, sem recertificação individual: Caminhos normalizados; homônimos aliases e chamadas indiretas ainda sem amostra completa. |
| GR16 | P | Evidência por relação | Histórico preservado, sem recertificação individual: Nó mostra fonte/linha; auditabilidade e classificação por relação não integralmente validadas. |
| GR17 | I | Integridade do grafo | Histórico preservado, sem recertificação individual: IDs endpoints e caminhos inválidos bloqueados por validadores/testes. |
| GR18 | P | Comunidades | Histórico preservado, sem recertificação individual: Comunidades automáticas com nomes genéricos; curadoria de nomes/coesão não concluída. |
| GR19 | I | Saídas JSON/relatório/HTML | Histórico preservado, sem recertificação individual: JSON HTML e relatório gerados no mesmo processo. |
| GR20 | P | Promoção atômica | Histórico preservado, sem recertificação individual: Candidato e lock existem; ausência de teste integral de interrupção/disco cheio. |
| GR21 | I | Query/path/explain | Histórico preservado, sem recertificação individual: Wrapper oferece query, path e explain; caminho mínimo, direção disponível, ambiguidade e ausência são testados. Saída preserva fontes e limites do grafo. |
| GR22 | I | Vocabulário português | Histórico preservado, sem recertificação individual: Aliases em português e expansão textual implementados/testados. |
| GR23 | I | Limites de contexto | Histórico preservado, sem recertificação individual: Consulta limitada a 1200 tokens e truncamento explicitado. |
| GR24 | I | Impacto direcional | Histórico preservado, sem recertificação individual: Decisão arquitetural datada: graph:impact é uma vizinhança técnica com aviso explícito, usada para orientar leitura e testes, não para alegar dependentes causais. |
| GR25 | P | Impacto→testes | Histórico preservado, sem recertificação individual: Navegação até testes possível; seleção de testes afetados não validada por benchmark. |
| GR26 | I | Atualização incremental | Histórico preservado, sem recertificação individual: Decisão arquitetural datada: para este corpus pequeno, graph:update é uma reconstrução completa e atômica, preferida à atualização incremental que poderia ocultar corrupção estrutural. |
| GR27 | P | Renomes/exclusões/branches | Histórico preservado, sem recertificação individual: Rebuild/status tratam corpus; matriz de renome branch e exclusão incompleta. |
| GR28 | I | Atualidade/check | Histórico preservado, sem recertificação individual: Status/check por fingerprint disponíveis e executados. |
| GR29 | I | Instruções aos agentes | Histórico preservado, sem recertificação individual: AGENTS do site orienta consulta e conferência nas fontes. |
| GR30 | I | Hooks Git | Histórico preservado, sem recertificação individual: Decisão arquitetural datada: não instalar hooks locais; comando explícito e workflow reproduzível mantêm a geração observável em todos os clones. |
| GR31 | P | Documentos selecionados | Histórico preservado, sem recertificação individual: Pass de documentação previsto; nenhum .md representado no grafo atual. |
| GR32 | P | Pass semântico separado | Histórico preservado, sem recertificação individual: Automação estrutural isolada; pass semântico separado não entregue. |
| GR33 | P | Contratos até RPC/SQL | Histórico preservado, sem recertificação individual: SQL está no grafo; cadeia completa payload-handler-RPC-migration ainda não validada. |
| GR34 | P | Fronteiras dos bancos | Histórico preservado, sem recertificação individual: Guardas nos arquivos; mapa direcional de fronteiras não entregue. |
| GR35 | P | Código/flag/migration/deploy | Histórico preservado, sem recertificação individual: Flags/migrations/ativação diferenciadas em docs; representação de evidências de deploy no grafo incompleta. |
| GR36 | P | Requisitos→implementação | 230 referências no ledger; vínculo requisito-grafo não implementado. Planos técnicos posteriores fora do validador. |
| GR37 | P | Memória técnica revisável | Histórico preservado, sem recertificação individual: Memórias e reflexão locais foram usadas, mas não há ensaio completo do ciclo de correção de memória errada, vínculo de validade e atualização por commit. |
| GR38 | I | Runbook para o time | Histórico preservado, sem recertificação individual: Runbook com instalação comandos limitações e recuperação disponível. |
| GR39 | P | Visualização local | Histórico preservado, sem recertificação individual: HTML local existe; acessibilidade filtros e segurança visual não retestados integralmente. |
| GR40 | I | Medir utilidade | Histórico preservado, sem recertificação individual: Benchmark versionado compara dez perguntas estruturais ao arquivo recuperado pelo grafo e à busca direta; mede recuperação técnica, não entendimento humano. |
| GR41 | I | Workflow específico | Histórico preservado, sem recertificação individual: Workflow dedicado com versão fixa e check aprovado no commit. |
| GR42 | P | Permissões/artefatos | Secret scanning/push protection desativados; Actions ainda com permissões amplas. Guardas locais não substituem essas camadas. |
| GR43 | P | Gatilhos/cache específicos | Histórico preservado, sem recertificação individual: Cache npm existe; gatilhos por caminhos e cache de grafo por corpus ausentes. |
| GR44 | I | Relatório base/head | Histórico preservado, sem recertificação individual: Em pull requests, o workflow cria um mapa da base em worktree temporário e publica comparação de nós, relações e arquivos com o head no artefato Graphify. |
| GR45 | P | Conteúdo hostil | Histórico preservado, sem recertificação individual: Seis testes incluem scanner sintético; HTML hostil comentários e symlinks não têm matriz completa. |
| GR46 | P | Falhas e concorrência | Histórico preservado, sem recertificação individual: Lock e validadores existem; parser timeout disco e interrupção ainda sem simulações completas. |
| GR47 | P | Cobertura/precisão | Histórico preservado, sem recertificação individual: Benchmark estrutural recupera dez cenários e comandos path/explain têm testes. Precisão semântica, aliases e relações indiretas ainda não foram certificadas. |
| GR48 | P | Desempenho/regressões | Histórico preservado, sem recertificação individual: Geração operacional; medição controlada completa/incremental/fixture grande ausente. |
| GR49 | P | Recuperação/upgrade | Histórico preservado, sem recertificação individual: Procedimento de candidato existe; restauração e upgrade ainda sem ensaio completo. |
| GR50 | P | Publicar/acompanhar | Mapa estrutural operacional, demais critérios semânticos/adversariais não certificados. |
| AC01 | I | Primeiro orçamento sem cadastro | Histórico preservado, sem recertificação individual: Primeiro orçamento continua sem cadastro obrigatório. |
| AC02 | I | Entrada Meus orçamentos | Histórico preservado, sem recertificação individual: Entradas Meus orçamentos presentes na navegação. |
| AC03 | I | Tela de acesso responsiva | Histórico preservado, sem recertificação individual: Tela de login responsiva observada e testada. |
| AC04 | P | Link/código por e-mail | Histórico preservado, sem recertificação individual: Código/link suportado; entrega real de autenticação não reexecutada nesta rodada. |
| AC05 | I | Entrada com senha | Histórico preservado, sem recertificação individual: Login por senha implementado e contratos cobertos. |
| AC06 | P | Criar senha/confirmar e-mail | Histórico preservado, sem recertificação individual: Criação/confirmacão existem; e-mail real e ciclo de senha precisam aceite atual. |
| AC07 | P | Recuperar/redefinir senha | Histórico preservado, sem recertificação individual: Recuperação/redefinição existem; expiração e recebimento reais não retestados. |
| AC08 | I | Redirect interno restrito | Histórico preservado, sem recertificação individual: Redirecionamento restringido a destinos internos testados. |
| AC09 | I | Callback inválido recuperável | Histórico preservado, sem recertificação individual: Callback inválido gera recuperação sem indexação. |
| AC10 | P | Sessão persistente/refresh | F28-01 reproduz despacho de favorito após mudança de sessão; refresh real não homologado. |
| AC11 | I | Rejeitar secret no bundle | Histórico preservado, sem recertificação individual: Cliente recusa credencial secreta; guardas e testes passam. |
| AC12 | I | Auth no banco isolado | Histórico preservado, sem recertificação individual: Auth do site aponta para projeto isolado confirmado. |
| AC13 | I | Titular opcional | Histórico preservado, sem recertificação individual: Titular opcional preserva pedidos de visitantes. |
| AC14 | I | Associar e-mail confirmado | Histórico preservado, sem recertificação individual: Associação limitada a e-mail confirmado e identidade; pgTAP aprovado. |
| AC15 | I | Associação idempotente | Histórico preservado, sem recertificação individual: Reivindicação idempotente sem transferência entre titulares testada. |
| AC16 | I | Lista por titular | Histórico preservado, sem recertificação individual: RPC lista apenas pedidos da identidade e valida filtros/paginação. |
| AC17 | I | Detalhe do titular | Histórico preservado, sem recertificação individual: Servidor controla detalhe por auth.uid; B04 é estado da UI e não leitura cruzada do banco. |
| AC18 | I | Snapshot original | Histórico preservado, sem recertificação individual: Snapshot original preservado; repetição cria nova intenção. |
| AC19 | I | Timeline pública separada | Histórico preservado, sem recertificação individual: Eventos públicos separados dos internos. |
| AC20 | I | Eventos reais de status | Histórico preservado, sem recertificação individual: Eventos associados a transições persistidas; operação humana não comprovada por isso. |
| AC21 | I | Busca/filtros/paginação/estados | Histórico preservado, sem recertificação individual: Busca filtros paginação recuperação e vazio na lista cobertos. |
| AC22 | I | Detalhe completo | Histórico preservado, sem recertificação individual: Detalhe limpa orçamento anterior na mudança de ID e apresenta recuperação se nova leitura falhar; B04 encerrado por E2E. |
| AC23 | I | Solicitar novamente | Histórico preservado, sem recertificação individual: Repetição agora consulta catálogo atual antes de substituir, preserva referências removidas como bloqueios visíveis e confirma troca de seleção existente. |
| AC24 | P | Versões publicadas | Histórico preservado, sem recertificação individual: Metadados/versionamento e semântica de validade corrigidos; falta aceite atual do ciclo comercial de publicação/acesso/ajuste com documento controlado. |
| AC25 | I | Bucket PDF privado/limites | Histórico preservado, sem recertificação individual: Bucket privado PDF/20MB e negação cruzada cobertos localmente; sem upload real nesta revisão. |
| AC26 | I | URL assinada de 60 segundos | Histórico preservado, sem recertificação individual: URL assinada de 60s exige autorização antes de assinar; testes negativos aprovados. |
| AC27 | I | Origem/UUID/bucket/host | Histórico preservado, sem recertificação individual: Origem UUID bucket e host controlados pelos testes da API. |
| AC28 | I | Noindex/analytics sem protocolo | Histórico preservado, sem recertificação individual: Noindex na resposta inicial e UUID de orçamento redigido em analytics; antigo achado corrigido. |
| AC29 | P | Aviso de privacidade | Histórico preservado, sem recertificação individual: R08 foi corrigido; aviso de privacidade e procedimento do titular existentes. Validação operacional de atendimento de direitos permanece pendente. |
| AC30 | P | Cobertura automatizada completa | Suíte atual verde; F28 reproduz duas lacunas. Entrega de mensagens/Auth/operação não certificada. |
