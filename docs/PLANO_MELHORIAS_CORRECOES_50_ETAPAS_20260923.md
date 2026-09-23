# Plano de melhorias e correções — 50 etapas — 23/09/2026

**Projeto:** Promo_Brindes_V1. **Estado do documento:** proposto; nenhuma etapa foi executada por este pedido de planejamento.

**Base:** auditoria de 23/09/2026, SHA `11f0d358d86a192a01acc1dedca198e7d4ea8440`. Relaciona os cinco achados reproduzidos e as lacunas dos sete planos anteriores. Não são 50 funcionalidades novas: há correções, complementos, decisões e homologações.

Fontes: [parecer](REVISAO_PLANOS_20260923.md), [230 referências de produto](REVISAO_PLANOS_20260923_ANEXO_PRODUTO.md), [150 referências técnicas](REVISAO_PLANOS_20260923_ANEXO_TECNICO.md) e [governança](GOVERNANCA_FECHAMENTO.md). A auditoria distingue cinco defeitos/seis simulações dos 348 testes e 533 asserções SQL locais que passaram. Esses números são evidências anteriores, não novos testes deste planejamento.

O Graphify foi consultado pelo wrapper do site e estava atual: 1.825 nós/3.643 relações. Localizou favoritos, ranking, hooks de catálogo e notificações. A saída foi limitada a 42 de 311 nós; não foi tratada como cobertura integral nem prova causal. A leitura das fontes e da auditoria prevalece. Sem nova extração semântica ou uso de provedor externo nesta rodada.

## Objetivo e fronteiras

Concluir as correções e os aceites pendentes com segurança, rastreabilidade e qualidade de uso. “10/10” é uma aspiração, não uma métrica auditável nem promessa de ausência futura de bugs.

Regras permanentes:

- Alterar somente o site e, quando necessário e autorizado na execução, seu Supabase isolado `xlzmclcjdncjfdrjxclt`.
- Não modificar Promo_Gifts_V4 nem o banco `doufsxqlfjyuvxuezpln`. Um item histórico não se autoriza sozinho.
- Não há checkout: a pessoa monta uma seleção e solicita orçamento. Não bloquear catálogo por estoque informado pelo fornecedor.
- Preservar campos/contratos e entregas existentes: badge único, frases da marca, campanhas, kits, compartilhamento, conta, biblioteca e calendário.
- Resend, WhatsApp, segredos de webhooks, alertas e `SITE_SUPABASE_SERVICE_JWT` permanecem **adiados por escolha do usuário**. Preparar e testar sem ativar serviços.
- O acervo aprovado foi declarado disponível; falta localizar arquivos e permissões específicas. Não inventar cases, fotografias de operação ou regras comerciais.
- Nenhuma chave será solicitada em texto aberto, versionada ou incluída em testes/relatórios.
- Não prometer sincronia bidirecional de “todos os dados”: Git versiona código/migrations; banco contém dados operacionais; segredos ficam nos cofres. São fontes diferentes com critérios de reconciliação diferentes.

## Como executar e medir

**Prioridade:** P1 = risco/correção importante ou condição necessária antes da ativação; P2 = complemento de qualidade/maturidade. A revisão não confirmou um incidente P0 ativo de produção. A05 é originalmente P2, mas entra cedo pelo custo baixo e impacto direto na escolha do usuário.

**Porte relativo:** P = pequeno, M = médio, G = grande. Não são horas nem compromisso de prazo. Os responsáveis são **papéis propostos**, não pessoas já designadas nem agentes já criados.

**Dependências:** os números são pré-requisitos locais. Etapas independentes podem progredir em paralelo quando a execução for autorizada. Não é necessário concluir todas as fases antes de publicar um hotfix seguro. Cada release executa os controles 46–50 no recorte de seu lote.

**Regra de aceite:** uma etapa só é encerrada no escopo completo quando entrega, teste, ativação aplicável e aceite humano exigido têm evidência. Uma decisão de adiamento não vira implementação. Se o escopo mudar, registrar a decisão e o critério substituto, preservando o original.

O CSV vigente continua sendo a fonte canônica do estado dos 230 requisitos. Este plano é sequenciamento da execução; não cria um segundo ledger concorrente nem altera os rótulos existentes por si só.

## Mapa de execução

| Bloco | Etapas | Saída esperada |
|---|---|---|
| 1. Preparação e governança | 1–5 | Fixar evidências e limites, sem atrasar o primeiro lote corretivo. |
| 2. Favoritos e isolamento de sessão | 6–10 | Resolver A01–A03 antes de ampliar a experiência de conta. |
| 3. Busca, ordenação e descoberta | 11–15 | Resolver A04–A05 e medir relevância com produtos, não apenas palavras. |
| 4. Solicitações, mensagens e atendimento | 16–20 | Concluir os contratos e o fluxo comercial; ativação externa permanece condicional. |
| 5. Contratos, segurança e dados comerciais | 21–25 | Garantir integridade e autorização sem presumir que dados desconhecidos sejam fatos. |
| 6. Conteúdo e experiência editorial | 26–30 | Usar o acervo aprovado e completar jornadas existentes, sem refazer identidade ou inventar cases. |
| 7. Validação com pessoas e qualidade de uso | 31–35 | Complementar testes automatizados com evidência humana, dispositivos e canais reais. |
| 8. Banco de dados e operação | 36–40 | Ir além do ledger, com ensaios isolados e sem alterações no Promo Gifts. |
| 9. Graphify como ferramenta de engenharia | 41–45 | Completar os critérios úteis preservando as alternativas arquiteturais já aprovadas. |
| 10. Regressão, publicação e fechamento | 46–50 | Liberar lotes seguros e encerrar somente o que tiver evidência suficiente. |

### Lotes de publicação sugeridos

- **Lote corretivo imediato:** preparação mínima 1/3/4/5; favoritos 6–10; ordenação 11–12. Atualização documental 2 acompanha o PR. Validar e liberar pelo recorte 46–50, sem esperar todos os blocos.
- **Lote de contratos e proteção:** 16–25 e 36–37 conforme dependências, sem ativar provedores adiados.
- **Lote de descoberta e conteúdo:** 13–15, 22 e 26–35, conforme dados e materiais aprovados.
- **Lote de operação e ferramentas:** 38–45 e 47, com infraestrutura/autoridade disponíveis e sem bloquear correções de produto.
- **Fechamento integral:** revisão de todas as etapas em 50; listar explicitamente o que ainda depende de operação, pesquisa, terceiros ou decisão do usuário.

A sequência é por risco e dependência, não por ordem visual dos documentos históricos.

## Cenários antecipados para validar a abordagem

Esta seção é análise preventiva; **não significa que os cenários foram executados nesta rodada**. A execução deve produzir evidência nova.

| Cenário | Falha a evitar | Controle planejado | Etapas |
|---|---|---|---|
| Login após favoritos anônimos | Cache perde autoria antes de promoção | Capturar origem, persistência confirmada e união idempotente | 6–7 |
| Conta B entra com rede indisponível | Favoritos de A continuam visíveis | Estado/cache por titular, sem fallback cruzado | 8/10 |
| Operação de A falha depois da entrada de B | Rollback modifica nova sessão | Geração da identidade e revisão da intenção | 9/10 |
| Cliente escolhe Nome ou Mais recentes | Curadoria contradiz escolha explícita | Ranking condicional e contrato entre páginas | 11/13 |
| Relacionados passam por dois sorts | Diversidade calculada é perdida | Estratégia final única e fixture de materiais | 12/14 |
| Pedido com kit, alternativa, verba e prazo | E-mail omite contexto ou diverge do histórico | Snapshot/versionamento e template por contrato | 16–17/21 |
| Provedor aceita mas resposta se perde | Reenvio duplicado ou sucesso fictício | Idempotência, estado inconclusivo e reconciliação | 18/20 |
| Anexo tem assinatura PDF válida e conteúdo indevido | Magic bytes confundidos com segurança integral | Política de validação/quarentena e limites | 23 |
| Preview recebe configuração de produção | Acesso indevido a dados reais | Guardas, credenciais segregadas e fixtures | 37 |
| Backup restaurado ativa crons reais | Mensagens/efeitos externos inesperados | Destino descartável e integrações desativadas | 38 |
| Grafo fica incompleto durante falha | Mapa inválido substitui último válido | Promoção atômica e ensaios adversariais | 43/45 |
| CI verde mas aceite real não aconteceu | Declaração falsa de conclusão | Matriz por evidência, com condição de ativação | 2/49/50 |

## As 50 etapas

## Bloco 1 — Preparação e governança

### Etapa 01 — Fixar a linha de base e o escopo protegido

**Prioridade/porte:** P1 / P. **Responsável proposto:** Engenharia/QA. **Depende de:** nenhuma; linha de base. **Rastreabilidade:** UX01, UX98, UX100; T17-02/03/04.

- **Entrega:** Registrar SHA, árvore de trabalho, versões das ferramentas, resultados da auditoria e banco-alvo. Distinguir a consulta anterior de produção de qualquer nova execução. Identificar documentos locais ainda não publicados.
- **Critério de aceite:** Manifesto reproduzível com Promo_Brindes_V1 e xlzmclcjdncjfdrjxclt como únicos alvos de alteração; nenhuma escrita no Promo Gifts; nenhuma credencial em artefatos.
- **Validação/simulação:** Conferir git status, HEAD, remotos e guardas do banco; comparar com 11f0d35 sem sobrescrever alterações de terceiros.
- **Risco e contenção:** Confundir o diretório inicial com o site. Usar workdir explícito e abortar em project-ref divergente.

### Etapa 02 — Reconciliar requisitos e estados documentais

**Prioridade/porte:** P1 / M. **Responsável proposto:** Engenharia/Produto. **Depende de:** 01. **Rastreabilidade:** UX02/03/35/49/88/98/100; LK10/37/50; GR08/13; T17-48.

- **Entrega:** Relacionar as 380 referências auditadas às entregas existentes e a este plano; atualizar a matriz canônica sem apagar relatórios históricos. Distinguir ausência, implementação parcial, defeito e aceite externo.
- **Critério de aceite:** Cada referência tem destino: preservada, corrigida por etapa, alternativa documentada ou pendência explícita com responsável por definir. Nenhuma vira I apenas por existir arquivo ou merge.
- **Validação/simulação:** ledger:check; revisão do diff por requisito; confirmar que favoritos/ranking/categorias não continuam descritos como ausentes.
- **Risco e contenção:** Inventar 380 funcionalidades independentes. Manter as sobreposições e o significado de I técnico.

### Etapa 03 — Converter os cinco achados em regressões corretivas

**Prioridade/porte:** P1 / M. **Responsável proposto:** QA/Frontend. **Depende de:** 01. **Rastreabilidade:** A01–A05; UX03/99; AC30.

- **Entrega:** Preservar os probes históricos e criar testes permanentes que esperem o comportamento correto, inicialmente vermelhos no recorte afetado. Separar seis cenários: três de favoritos, um de diversidade e dois de ordenação.
- **Critério de aceite:** Cada novo teste falha pela causa real no código atual e passa somente após sua correção; não adicionar testes que esperem bugs ao gate principal.
- **Validação/simulação:** Vitest com relógio/promises controlados, verificação de chamadas e UI; demonstrar falha antes e sucesso depois no mesmo cenário.
- **Risco e contenção:** Mock mascarar o defeito. Usar componente/hook real e mocks só nas fronteiras.

### Etapa 04 — Definir invariantes de dados e critérios de produto

**Prioridade/porte:** P1 / M. **Responsável proposto:** Arquitetura/Produto. **Depende de:** 01. **Rastreabilidade:** UX35/46/62/65/79; LK23/29; AC11/12.

- **Entrega:** Especificar isolamento por titular, ausência de checkout, nenhum filtro por estoque positivo, mínimo desconhecido a confirmar, ordem explícita respeitada e limites de anexos. Registrar decisões pendentes de dados comerciais.
- **Critério de aceite:** Contratos verificáveis, exemplos válidos/inválidos e política de dados desconhecidos; sem inventar preço, disponibilidade, prazo, técnica ou estoque.
- **Validação/simulação:** Revisão de payloads de visitante/conta/kits e tabela de casos-limite; nenhuma informação comercial inferida como fato.
- **Risco e contenção:** Corrigir UX alterando regra comercial silenciosamente. Exigir aceite de Produto para qualquer mudança de semântica.

### Etapa 05 — Preparar entregas pequenas e reversão segura

**Prioridade/porte:** P1 / P. **Responsável proposto:** Engenharia/Release. **Depende de:** 01, 03. **Rastreabilidade:** UX98/100; T13-50; T17-50.

- **Entrega:** Definir PRs pequenos por domínio, responsáveis de revisão, testes mínimos por risco e reversão de frontend/configuração. Para SQL necessário, projetar expand/migrate/contract e compatibilidade com a versão anterior.
- **Critério de aceite:** Primeiro lote de favoritos pode sair sem esperar pesquisa, conteúdo ou Graphify. Rollback não depende de apagar dados nem reescrever migrations aplicadas.
- **Validação/simulação:** Simular antes do merge: código novo/banco antigo, código antigo/banco novo e falha de deploy; documentar comportamento seguro.
- **Risco e contenção:** Reverter integralmente código inseguro. Preferir fix-forward ou desativar apenas o recurso afetado preservando dados.

## Bloco 2 — Favoritos e isolamento de sessão

### Etapa 06 — Isolar o estado de favoritos em um módulo testável

**Prioridade/porte:** P1 / M. **Responsável proposto:** Frontend. **Depende de:** 03, 04, 05. **Rastreabilidade:** UX88; AC10; A01–A03.

- **Entrega:** Extrair persistência/sincronização de CommemorativeDatesPage para hook/módulo com estados explícitos: anônimo, carregando, sincronizado, falha e mudança de identidade.
- **Critério de aceite:** Uma autoridade para proprietário, leitura, persistência e geração da sessão; renderização nunca usa cache de outro titular como estado inicial.
- **Validação/simulação:** Máquina de estados com auth carregando, storage indisponível/corrompido, remount e React StrictMode; sem efeitos duplicados destrutivos.
- **Risco e contenção:** Refatorar UI e protocolo juntos. Preservar contrato das RPCs salvo necessidade demonstrada.

### Etapa 07 — Corrigir a promoção dos favoritos anônimos

**Prioridade/porte:** P1 / M. **Responsável proposto:** Frontend/Backend. **Depende de:** 06. **Rastreabilidade:** A01; UX88.

- **Entrega:** Capturar origem anônima antes de gravar proprietário; implementar união determinística com favoritos remotos e política explícita para o limite. Marcar promoção somente após confirmação da persistência correspondente.
- **Critério de aceite:** Login com conta vazia/preenchida não perde favoritos; promoção repetida não duplica; falha parcial preserva possibilidade de repetir sem importar dados de outra conta.
- **Validação/simulação:** A01 invertido para resultado correto; limite da RPC, duplicatas, falha no meio, resposta vazia e nova tentativa. Se atomicidade exigir SQL, validar migration somente no site.
- **Risco e contenção:** Marcar sucesso cedo ou truncar silenciosamente. Exibir excesso e manter intenção recuperável.

### Etapa 08 — Corrigir a separação do cache entre contas

**Prioridade/porte:** P1 / M. **Responsável proposto:** Frontend/Segurança. **Depende de:** 06, 07. **Rastreabilidade:** A02; UX79/88; AC10.

- **Entrega:** Particionar cache por titular ou ler chave validada por proprietário; limpar a projeção visível na transição e definir migração segura do formato anterior sem atribuir cache desconhecido à conta nova.
- **Critério de aceite:** A→B, logout e falha/offline nunca mostram favoritos de A em B, nem por um frame. Cache antigo de autoria incerta não é promovido automaticamente.
- **Validação/simulação:** A02 corretivo, duas abas, reload, troca com leitura pendente, storage bloqueado e evento de autenticação duplicado.
- **Risco e contenção:** Apagar intenção anônima legítima ou vazar estado. Migração versionada e aviso de recuperação quando necessário.

### Etapa 09 — Invalidar mutações e rollbacks de sessões antigas

**Prioridade/porte:** P1 / M. **Responsável proposto:** Frontend. **Depende de:** 06, 08. **Rastreabilidade:** A03; UX79/88.

- **Entrega:** Vincular cada salvar/remover/desfazer ao titular, à geração da sessão e à revisão da intenção. Guardar callbacks de sucesso, erro, toast e rollback; não confiar só em AbortController.
- **Critério de aceite:** Resposta tardia de A não muda UI, cache ou avisos de B; falha antiga não desfaz ação mais recente da mesma conta.
- **Validação/simulação:** A03 corretivo; salvar-remover-salvar com respostas fora de ordem; logout durante envio; undo durante falha; relógio/promises controlados.
- **Risco e contenção:** Backend concluir mesmo após cancelamento. UI ignora geração antiga e nova leitura revalida o titular correto.

### Etapa 10 — Homologar favoritos ponta a ponta e fechar o lote

**Prioridade/porte:** P1 / M. **Responsável proposto:** QA/Frontend. **Depende de:** 07, 08, 09. **Rastreabilidade:** UX88/99; AC10/30.

- **Entrega:** Adicionar E2E de visitante→conta, A→B, múltiplas abas, falha e retomada. Exercitar SQL de titularidade e limites com identidades sintéticas; incluir mensagens acessíveis de sincronização/erro.
- **Critério de aceite:** A01–A03 corrigidos com regressões permanentes, sem leitura/gravação cruzada e sem regressão do calendário/desfazer. Evidência local separada do ensaio autenticado de deployment.
- **Validação/simulação:** Vitest, pgTAP e navegadores configurados; ensaio autenticado em ambiente isolado, nunca contas de clientes reais.
- **Risco e contenção:** Testes somente anônimos passarem. Exigir duas identidades e transições reais de sessão no ambiente de teste.

## Bloco 3 — Busca, ordenação e descoberta

### Etapa 11 — Preservar a ordenação escolhida pelo comprador

**Prioridade/porte:** P1 / P. **Responsável proposto:** Frontend. **Depende de:** 03, 04, 05. **Rastreabilidade:** A05; UX35/39.

- **Entrega:** Aplicar ranking somente no modo de curadoria/relevância previsto; preservar a sequência da API para Nome e Mais recentes. Manter URL, seleção e retorno entre páginas.
- **Critério de aceite:** Alterar filtro/termo/página não ativa curadoria sobre uma ordem explícita; refresh e navegação mantêm a escolha.
- **Validação/simulação:** As duas regressões A05; dados com flags opostas à ordem alfabética/temporal; URL direta, mobile e paginação.
- **Risco e contenção:** Ordenar apenas a página alfabeticamente criando falsa ordem global. Preservar o contrato da origem e testar mais de uma página.

### Etapa 12 — Unificar afinidade e diversidade dos relacionados

**Prioridade/porte:** P2 / M. **Responsável proposto:** Frontend/Produto. **Depende de:** 03, 04, 11. **Rastreabilidade:** A04; UX49; LK25.

- **Entrega:** Definir score e desempate estáveis, aplicando diversificação depois dos critérios de afinidade. Excluir produto atual e duplicatas sem inventar atributos ausentes.
- **Critério de aceite:** Quando há alternativas equivalentes, primeiros resultados não repetem material/família desnecessariamente; nenhuma ordenação posterior anula a diversificação.
- **Validação/simulação:** A04 corretivo; materiais ausentes, acentos, empates, novidades e candidatos de famílias diferentes; pertinência julgada no passo 14.
- **Risco e contenção:** Diversidade derrubar relevância. Limitar penalidade e documentar o equilíbrio com exemplos aprovados.

### Etapa 13 — Definir o alcance da relevância e da paginação

**Prioridade/porte:** P2 / M. **Responsável proposto:** Arquitetura/Frontend. **Depende de:** 11, 12. **Rastreabilidade:** UX24/35/40; LK17/20.

- **Entrega:** Documentar que o ranking atual é local à página; avaliar ordenação global sobre contrato autorizado ou manter curadoria local explicitamente delimitada. Não baixar catálogo inteiro nem mudar o banco interno para simular ranking global.
- **Critério de aceite:** Decisão formal com limites, estabilidade de paginação e custo; interface não promete relevância global se não a entrega. Alternativa adotada deve ser aprovada, não marcada como entrega literal.
- **Validação/simulação:** Conjunto sintético com melhor candidato fora da página 1; duplicatas/omissões entre páginas e mudanças de filtro.
- **Risco e contenção:** Dependência de SQL no Promo Gifts. Registrar bloqueio específico e continuar correções locais independentes.

### Etapa 14 — Criar um conjunto julgado de busca e recomendações

**Prioridade/porte:** P2 / M. **Responsável proposto:** Produto/Marketing/QA. **Depende de:** 04, 11, 12, 13. **Rastreabilidade:** UX31/32/34/35/49; LK14/17/20.

- **Entrega:** Construir corpus versionado de pelo menos 30 intenções propostas: SKU, erro de digitação, sinônimo, campanha, faixa de quantidade e zero resultado. Identificar produtos relevantes por ID/SKU com julgamento humano.
- **Critério de aceite:** Medir P@5/nDCG@10 onde aplicável, taxa de buscas vazias e regressões por intenção; definir limiares aprovados após baseline. Teste de expansão de palavra não é teste de relevância.
- **Validação/simulação:** Executar o mesmo corpus antes/depois; tolerar retirada legítima de produto com revisão da fixture; usar dados públicos minimizados.
- **Risco e contenção:** Sobreajustar ao benchmark. Separar consultas de desenvolvimento e validação e registrar divergências de julgamento.

### Etapa 15 — Concluir a curadoria da home e das categorias

**Prioridade/porte:** P2 / M. **Responsável proposto:** Design/Frontend/Marketing. **Depende de:** 12, 14. **Rastreabilidade:** UX21/23; LK06/09/10/12/17.

- **Entrega:** Revisar produtos destacados e imagens reais das categorias, já existentes; equilibrar repertório e caminho para o catálogo. Preservar fallback, dimensões e identidade visual sem reconstruir hero/manifesto.
- **Critério de aceite:** Categoria com/sem foto continua compreensível e clicável; amostra não se repete sem justificativa; imagens não são apresentadas como produção própria. Aceite de tarefa no passo 32.
- **Validação/simulação:** Dados sem imagem, erro de carregamento, categoria vazia, mobile e contraste; comparação de descoberta antes/depois.
- **Risco e contenção:** Confundir fotografia de fornecedor com case próprio ou prejudicar carregamento. Proveniência e budget obrigatórios.

## Bloco 4 — Solicitações, mensagens e atendimento

### Etapa 16 — Completar o contrato da cópia de solicitação

**Prioridade/porte:** P1 / M. **Responsável proposto:** Backend/Produto. **Depende de:** 04, 05. **Rastreabilidade:** UX61/62/63/68; LK30/45; T13-31.

- **Entrega:** Mapear snapshot persistido para mensagem: protocolo, itens/variantes, kits/alternativas, campanha, verba e escopo, datas e observações permitidas. Classificar campos que ficam apenas no portal por privacidade.
- **Critério de aceite:** Mensagem e portal não divergem sobre o pedido original; nenhum campo relevante some sem regra explícita; não expor notas internas, tokens ou links privados duradouros.
- **Validação/simulação:** Fixtures de visitante/conta, 50 itens, kit completo, acentos, texto longo, sem verba/data e snapshot histórico.
- **Risco e contenção:** Chamar resumo parcial de cópia integral. Aprovar especificação de conteúdo e indicar o que exige acesso autenticado.

### Etapa 17 — Refinar templates e acessibilidade das mensagens

**Prioridade/porte:** P2 / M. **Responsável proposto:** Backend/Design/Marketing. **Depende de:** 16. **Rastreabilidade:** UX67/68/69; LK45.

- **Entrega:** Implementar renderização HTML e texto puro sobre o contrato aprovado; CTA claro para acompanhar solicitação, não pagamento. WhatsApp usa conteúdo e versão de template aprovados, sem presumir paridade com e-mail.
- **Critério de aceite:** Escaping contra injeção, leitura móvel, conteúdo coerente e sem promessas comerciais não confirmadas; ausência de variáveis não simula envio.
- **Validação/simulação:** Snapshots de conteúdo e testes estruturais, caracteres maliciosos, tamanho máximo, URL de origem e fallback texto puro.
- **Risco e contenção:** Inserir PII em URL, assunto ou log. Minimizar esses campos e manter dados completos apenas em canais autorizados.

### Etapa 18 — Projetar e implementar o encaminhamento ao comercial

**Prioridade/porte:** P1 / G. **Responsável proposto:** Backend/Operação/Produto. **Depende de:** 04, 16. **Rastreabilidade:** UX70/75/77; T17-47.

- **Entrega:** Definir destino aprovado (fila interna, CRM ou atendimento existente), responsável e evento de recebimento. Implementar adaptador/outbox idempotente no site após essa escolha; não criar integração implícita com o sistema interno.
- **Critério de aceite:** Solicitação e pedido de ajuste chegam ao destino correto uma única vez do ponto de vista operacional, com deduplicação e rastreabilidade; ausência do destino permanece pendência, não sucesso.
- **Validação/simulação:** Destino simulado: indisponível, timeout, aceite sem resposta, duplicata e retry; ensaio real somente após aprovação do destino.
- **Risco e contenção:** Disparar mensagens a pessoas erradas ou presumir exactly-once externo. Lista controlada de destinatários e reconciliação.

### Etapa 19 — Definir responsabilidade, estados e prazo de atendimento

**Prioridade/porte:** P1 / M. **Responsável proposto:** Produto/Operação/Backend. **Depende de:** 18. **Rastreabilidade:** UX67/70/75/77.

- **Entrega:** Estabelecer estados operacionais, responsável, horário de atendimento e metas aprovadas; refletir eventos públicos na timeline sem revelar registros internos. Aproveitar máquina de estados existente.
- **Critério de aceite:** Cada pedido tem próximo passo verificável; prazo público só aparece quando aprovado e sustentado pela operação; atraso é identificável.
- **Validação/simulação:** Pedido sem responsável, transferência, ajuste, status fora de ordem, feriado/fuso e falha de integração; não fabricar evento comercial.
- **Risco e contenção:** Promessa automática sem capacidade operacional. Manter linguagem de confirmação até homologação.

### Etapa 20 — Preparar homologação dos provedores sem ativá-los agora

**Prioridade/porte:** P1 / M. **Responsável proposto:** Backend/QA/Operação. **Depende de:** 16, 17, 18, 19. **Rastreabilidade:** UX06/68/69/70; T13-19/20/29/30/41.

- **Entrega:** Ampliar testes locais de assinatura de webhook, duplicação, reordenação, lease expirado, rate limit e resultado inconclusivo. Criar checklist de ativação futura por canal, separando aceite, entrega e leitura.
- **Critério de aceite:** Parte técnica pode ser concluída sem segredos reais; recebimento real continua adiado por decisão do usuário. Ativar exige destinatário controlado, consentimento quando aplicável e evidência.
- **Validação/simulação:** Mock/sandbox autorizado e falhas determinísticas; depois, quando liberado, protocolo→outbox→provedor→callback→destinatário.
- **Risco e contenção:** Ativar por encontrar credencial ou marcar provider-accepted como entregue. Gates de configuração e de homologação separados.

## Bloco 5 — Contratos, segurança e dados comerciais

### Etapa 21 — Completar tipos e contratos entre SQL, API e frontend

**Prioridade/porte:** P2 / M. **Responsável proposto:** Backend/Frontend. **Depende de:** 04, 16. **Rastreabilidade:** T16-21/22/23; T17-23/24; AC18.

- **Entrega:** Conectar tipos gerados aos contratos de RPC; manter validação runtime nas fronteiras JSON e adaptar explicitamente snapshots históricos. Evitar casts para esconder divergências.
- **Critério de aceite:** Mudança incompatível de payload/SQL falha em compilação ou teste de contrato; geração não remove exports exigidos; nenhuma adoção de tipos reduz a validação.
- **Validação/simulação:** Payloads faltantes, extras, nulos, versões anteriores, casts suspeitos; typecheck e diff de tipos gerados.
- **Risco e contenção:** Tratar TypeScript como validação de dados externos. Manter parser e evolução compatível de contratos.

### Etapa 22 — Formalizar dados comerciais, personalização e kits

**Prioridade/porte:** P2 / G. **Responsável proposto:** Produto/Marketing/Backend. **Depende de:** 04, 14, 21. **Rastreabilidade:** UX41/43/46/47; LK22/23/27/29/30.

- **Entrega:** Revisar amostra estratificada por família/fornecedor; documentar proveniência de mínimo, múltiplo, técnica, área e componentes. Modelar apenas regras aprovadas em contrato do site ou origem autorizada; manter desconhecidos visíveis.
- **Critério de aceite:** Mínimo e múltiplo não se confundem; kit não altera quantidade individual sem recalcular grupo; não há preço, estoque ou viabilidade inferidos. Regras externas não localizadas permanecem pendentes.
- **Validação/simulação:** Mínimo ausente/zero, múltiplo incompatível, limite global, kit incompleto, variante removida e payload adulterado; fontes por família.
- **Risco e contenção:** Inventar regra comercial ou escrever na origem protegida. Sem aprovação/dado, usar a confirmar e registrar dependência.

### Etapa 23 — Fechar o requisito de segurança de anexos

**Prioridade/porte:** P1 / G. **Responsável proposto:** Segurança/Backend. **Depende de:** 04, 05, 21. **Rastreabilidade:** UX65; LK43; T16-32.

- **Entrega:** Especificar tratamento de PDF ativo/malformado além de magic bytes: rejeição, quarentena ou sanitização controlada. Avaliar solução local primeiro; nenhum envio de arquivo de cliente a terceiro sem autorização.
- **Critério de aceite:** Arquivo não aprovado nunca é vinculado/servido como verificado; validação falha fechada, limita CPU/memória/tempo/tamanho e preserva privacidade. A política de formatos deve ser explícita.
- **Validação/simulação:** Fixtures benignas/adversariais sintéticas, polyglot, PDF truncado/ativo, MIME falso, timeout e limpeza de órfão; regressão de acesso cruzado.
- **Risco e contenção:** Parser introduzir vulnerabilidade ou custo descontrolado. Isolamento, limites e manutenção; não executar conteúdo ativo nos testes.

### Etapa 24 — Homologar o ciclo completo de conta e sessão

**Prioridade/porte:** P1 / M. **Responsável proposto:** Frontend/Backend/QA. **Depende de:** 10, 21, 23. **Rastreabilidade:** UX59/73/76/79; AC04/06/07/10/24/26.

- **Entrega:** Testar confirmação/recuperação, expiração/refresh, callback inválido, duas identidades, histórico/proposta privada e links assinados. Distinguir e-mail de autenticação do e-mail comercial do Resend.
- **Critério de aceite:** A sessão correta governa todos os módulos; links expirados recuperáveis; visitante continua solicitando sem cadastro. Homologação de e-mail real não é substituída por mock.
- **Validação/simulação:** Ambiente isolado com contas sintéticas, relógio controlado, revogação e troca de ID; rejeitar redirecionamento externo e acesso cruzado.
- **Risco e contenção:** Usar usuários reais ou enviar e-mails sem controle. Destinatários e ambiente de homologação explicitamente delimitados.

### Etapa 25 — Validar privacidade, retenção e apagamento ponta a ponta

**Prioridade/porte:** P1 / G. **Responsável proposto:** Backend/Operação/Responsável por privacidade. **Depende de:** 08, 09, 18, 23, 24. **Rastreabilidade:** UX80/98; AC29; T16-32/33/35/36.

- **Entrega:** Mapear preferências/favoritos, snapshots, outbox, arquivos e logs; atualizar avisos e runbook segundo práticas efetivas. Testar tombstone, auth, Storage e retenção; decidir se evento histórico erased continua necessário e seguro.
- **Critério de aceite:** Pedido de acesso/apagamento tem fluxo verificável e minimizado; falha parcial permite retomada e não restaura dados de titular apagado; retenção e comunicação aprovadas pelo responsável.
- **Validação/simulação:** Somente identidades sintéticas; falha no Storage, callback tardio, FK, lote parcial e reconciliação. Sem exclusão de dados reais nesta etapa de ensaio.
- **Risco e contenção:** Apagar demais, manter órfãos ou vazar PII no tombstone. Inventário de impacto e revisão antes de qualquer operação real.

## Bloco 6 — Conteúdo e experiência editorial

### Etapa 26 — Localizar e catalogar o acervo aprovado

**Prioridade/porte:** P2 / M. **Responsável proposto:** Marketing/Conteúdo. **Depende de:** 02, 04. **Rastreabilidade:** UX26/28/84; LK03/31/32/33/34.

- **Entrega:** Receber caminhos/arquivos dos materiais já aprovados; registrar proprietário, autorização, versão, validade, tipo, tamanho, descrição acessível e destino editorial. Não supor que o acervo está ausente.
- **Critério de aceite:** Cada arquivo candidato tem origem e aprovação rastreáveis; dados de clientes e imagens de terceiros não são publicados por associação.
- **Validação/simulação:** Inventário sem links quebrados/duplicatas, revisão de metadados sensíveis, expiração e autorização por ativo.
- **Risco e contenção:** Publicar material aprovado para outro canal/contexto. Conferir autorização específica e manter rascunho até aceite.

### Etapa 27 — Publicar catálogos PDF e revistas reais

**Prioridade/porte:** P2 / G. **Responsável proposto:** Conteúdo/Frontend/Backend. **Depende de:** 23, 26. **Rastreabilidade:** UX81/82/83/84; LK15/36.

- **Entrega:** Usar os tipos e a biblioteca existentes para PDFs/revistas autorizados; incluir capa, data, tamanho, formato, fallback e retirada. Distinguir download público editorial de proposta privada.
- **Critério de aceite:** Formato prometido corresponde ao conteúdo real; mobile consegue abrir/baixar; rascunho/expirado não aparece em biblioteca, sitemap ou preview. Nenhum documento privado vira catálogo público.
- **Validação/simulação:** Abrir, baixar, substituir, retirar e expirar em ambiente de teste; URL inválida, falha de visualizador e arquivo grande.
- **Risco e contenção:** Cache continuar servindo versão retirada. Estratégia de versão/invalidação e critérios de retirada definidos.

### Etapa 28 — Publicar cases e conteúdo de personalização verificáveis

**Prioridade/porte:** P2 / M. **Responsável proposto:** Marketing/Design. **Depende de:** 22, 26. **Rastreabilidade:** UX26/27/28/47; LK31/32/33/34/35/39/40.

- **Entrega:** Criar pelo menos três cases somente se houver material autorizado suficiente, com contexto, solução e resultado comprovável. Separar simulação, peça-base e produção real; documentar serviços especiais realmente oferecidos.
- **Critério de aceite:** Nenhum depoimento, métrica, selo ambiental ou capacidade inventados; evidência e responsável editorial por página. Quantidade insuficiente permanece pendência, sem case fictício.
- **Validação/simulação:** Revisão factual e de direitos, leitura móvel, links para referências atuais e indicação de produto descontinuado.
- **Risco e contenção:** Usar imagem de fornecedor como prova social própria. Rótulos e proveniência obrigatórios.

### Etapa 29 — Concluir o comportamento de filtros e navegação móvel

**Prioridade/porte:** P2 / M. **Responsável proposto:** Design/Frontend/Produto. **Depende de:** 04, 11. **Rastreabilidade:** UX11/15/16/17/18/38/39; LK11/12/13.

- **Entrega:** Avaliar aplicação imediata versus rascunho+Aplicar no painel; escolher uma política explícita com indicação de filtros ativos, cancelar/limpar e restauração de foco/posição. Não trocar o modelo só para obedecer checkbox antigo.
- **Critério de aceite:** Fechar painel não altera filtros de modo inesperado; quantidade exibida corresponde ao estado aplicado; URL compartilhável, voltar e seleção funcionam.
- **Validação/simulação:** Teclado, Escape, scroll, refresh, navegação anterior, painel estreito, combinação sem resultado e latência de API.
- **Risco e contenção:** Introduzir dois estados contraditórios. Uma fonte para estado aplicado e contrato claro do estado provisório.

### Etapa 30 — Consolidar linguagem, marca e estados de interface

**Prioridade/porte:** P2 / M. **Responsável proposto:** Design/Conteúdo/Frontend. **Depende de:** 15, 17, 19, 28, 29. **Rastreabilidade:** UX12/13/14/19/25/30/64/67/96; LK04/08/18/41/42/44.

- **Entrega:** Revisar textos, CTAs, erros, vazios e carregamento; preservar quatro frases aprovadas, badge único e nosso time de especialistas. Conferir redes oficiais e distinção entre salvar seleção e enviar solicitação.
- **Critério de aceite:** Sem jargão desnecessário, gíria forçada ou promessa de venda/estoque; motion reduzido preserva conteúdo; estados de falha oferecem recuperação sem perda.
- **Validação/simulação:** Checklist de conteúdo por rota, combinações de badges, teclado/movimento reduzido e coerência entre portal/e-mail/WhatsApp.
- **Risco e contenção:** Redesign amplo apagar identidade já aprovada. Alterações incrementais orientadas a tarefa e revisão editorial.

## Bloco 7 — Validação com pessoas e qualidade de uso

### Etapa 31 — Homologar acessibilidade além da automação

**Prioridade/porte:** P1 / G. **Responsável proposto:** Design/QA. **Depende de:** 10, 24, 27, 29, 30. **Rastreabilidade:** UX17/94/95/96; LK46.

- **Entrega:** Executar auditoria manual de foco, diálogo, teclado, leitor de tela, zoom/reflow, contraste e anúncios de status. Incluir seleção, kits, conta, anexos, calendário e filtros.
- **Critério de aceite:** Nenhum bloqueio crítico nas jornadas; achados têm reprodução, correção e reteste. Axe verde não vira declaração de acessibilidade integral.
- **Validação/simulação:** Combinações assistivas documentadas; zoom 200%/400%, textos longos, erro de formulário, menu e modal; ajustes sem depender apenas de cor.
- **Risco e contenção:** Testar só páginas estáticas. Cobrir mudanças de estado, falhas e conteúdo lazy.

### Etapa 32 — Validar tarefas com compradores e dispositivos reais

**Prioridade/porte:** P2 / G. **Responsável proposto:** Pesquisa/Produto/QA. **Depende de:** 10, 15, 24, 27, 29, 30, 31. **Rastreabilidade:** UX20/22/54/64/91/95; LK02/05/09/42.

- **Entrega:** Propor rodada formativa de cinco a oito profissionais de marketing com perfis variados, incluindo o público jovem pretendido. Testar encontrar brinde, comparar, montar kit, pedir orçamento e retomar; incluir iOS/Android físicos.
- **Critério de aceite:** Registrar conclusão sem ajuda, tempo, erros críticos e compreensão de que não há compra online; definir metas antes das sessões e corrigir bloqueios. Amostra formativa não é prova estatística de toda geração.
- **Validação/simulação:** Roteiro padronizado, consentimento e registros minimizados; teclado virtual, compartilhamento nativo, rede instável e retomada.
- **Risco e contenção:** Confundir gosto visual da equipe com sucesso do comprador. Priorizar observação de tarefa e não estereótipos geracionais.

### Etapa 33 — Reduzir custo de carregamento e dívida de componentes

**Prioridade/porte:** P2 / G. **Responsável proposto:** Frontend/QA. **Depende de:** 10, 12, 15, 27, 29. **Rastreabilidade:** UX93; LK47; T13-32/33/34/35/36/37/48.

- **Entrega:** Medir por rota; decompor páginas longas por responsabilidade, revisar CSS, imagens, imports e lazy loading. Avaliar o alvo histórico de 300 linhas sem fragmentação artificial; manter budgets bloqueantes.
- **Critério de aceite:** Não regredir budgets, layout ou intenção de navegação; registrar antes/depois. Para p75 real, instalar coleta aprovada/minimizada e aguardar amostra suficiente antes de declarar ganho.
- **Validação/simulação:** Build/budgets, cobertura da refatoração, perfis móvel/rede definida e comparação controlada; campo separado de laboratório.
- **Risco e contenção:** Reduzir bytes deslocando custo ou quebrando acessibilidade. Avaliar a jornada completa, não só a entrada.

### Etapa 34 — Fechar a instrumentação segura do funil

**Prioridade/porte:** P2 / M. **Responsável proposto:** Frontend/Backend/Produto. **Depende de:** 16, 18, 25, 29. **Rastreabilidade:** UX02/92; LK49; T13-38/39/40/41/42.

- **Entrega:** Definir eventos e propriedades permitidas para descoberta→seleção→envio→retomada; separar sucesso transacional de entrega de mensagem. Correlacionar falhas com IDs opacos, sem e-mail, telefone, briefing ou token.
- **Critério de aceite:** Eventos duplicados identificáveis, consentimento/preferências respeitados conforme política aprovada; nenhum segredo/PII em URL ou payload. Recepção e painel dependem de ferramenta configurada.
- **Validação/simulação:** Dedupe, retries, navegação SPA, bloqueador/offline e varredura de payload; não quebrar orçamento se analytics falhar.
- **Risco e contenção:** Medir invasivamente ou inflar conversão com tentativa. Esquema allowlist e métricas definidas antes da coleta.

### Etapa 35 — Homologar saídas externas: SEO, prévias e calendário

**Prioridade/porte:** P2 / M. **Responsável proposto:** Frontend/QA/Conteúdo. **Depende de:** 27, 28, 30. **Rastreabilidade:** UX58/83/85/86/89/97; LK48.

- **Entrega:** Conferir HTML inicial, canonical/noindex/sitemap, imagem social com fallback e indexação das coleções/datas. Em trilha separada na mesma etapa, homologar ICS em calendários reais, fuso, UID e reimportação.
- **Critério de aceite:** Página privada não indexável; conteúdo retirado sai do sitemap; prévia corresponde à URL. ICS não duplica indevidamente nem muda dia; proximidade não promete prazo comercial.
- **Validação/simulação:** 200/404 reais, crawler sem JS, preview controlado e importação/reimportação em dois clientes de calendário; registrar ferramentas/canais testados.
- **Risco e contenção:** Tratar validação técnica como indexação garantida ou acesso autenticado como teste de crawler. Evidências distintas por subcritério.

## Bloco 8 — Banco de dados e operação

### Etapa 36 — Auditar o schema remoto do site além do ledger

**Prioridade/porte:** P1 / M. **Responsável proposto:** Banco de dados/Segurança. **Depende de:** 01, 04, 05. **Rastreabilidade:** UX98; T16-01/26/48; T17-03/26.

- **Entrega:** Comparar migrations com retrato administrativo via pg_catalog: tabelas/views, funções, triggers, RLS/policies, grants, roles e jobs. Inventariar configuração de Storage/Auth por mecanismo apropriado. Sem exportar linhas de clientes.
- **Critério de aceite:** Diferenças classificadas por causa e risco; zero repair/reaplicação às cegas. Igualdade do ledger não é reportada como igualdade integral de schema ou dados.
- **Validação/simulação:** Queries de metadados somente leitura; schema limpo local para comparação normalizada; dry-run antes de eventual migration futura.
- **Risco e contenção:** Auditoria revelar segredos em function bodies. Sanitizar artefatos e restringir acesso; alvo isolado obrigatório.

### Etapa 37 — Completar o preview realmente isolado

**Prioridade/porte:** P1 / G. **Responsável proposto:** Infraestrutura/Backend/QA. **Depende de:** 05, 21, 36. **Rastreabilidade:** T16-47; T17-38; AC12.

- **Entrega:** Definir mecanismo aprovado para DB de preview/branch, fixtures sintéticas, URL/chaves/CSP e callbacks. Automatizar ciclo criar-validar-expirar com controle de custo e sem credencial de produção em PR não confiável.
- **Critério de aceite:** Preview funciona autenticado e não acessa dados privados de produção; ausência de configuração falha fechada; cleanup não alcança banco principal/site de produção.
- **Validação/simulação:** Dois previews distintos, fork externo, variável ausente, ref errado, callback de host incorreto e encerramento do preview.
- **Risco e contenção:** Custos ou vazamento por CI. Aprovar infraestrutura antes de provisionar e conferir project-ref em cada operação.

### Etapa 38 — Executar ensaio seguro de backup e restauração

**Prioridade/porte:** P1 / G. **Responsável proposto:** Banco de dados/Operação/Produto. **Depende de:** 36, 37. **Rastreabilidade:** UX98; T16-39; T17-33/49.

- **Entrega:** Confirmar modalidade de backup/PITR e cobertura de arquivos/configuração, definir RPO/RTO e custos com responsável; restaurar em destino descartável autorizado, nunca sobre produção.
- **Critério de aceite:** Dados sintéticos, schema, permissões e vínculos de arquivos restaurados com tempos medidos; lacunas de cobertura e passos manuais explícitos. Runbook sozinho não fecha etapa.
- **Validação/simulação:** Simular perda e recuperação no ambiente isolado; conferir auth, storage, migrations e smoke; exercitar retorno do serviço sem enviar mensagens.
- **Risco e contenção:** Ativar crons/webhooks do backup ou sobrescrever produção. Destino validado, integrações externas desabilitadas e plano de descarte autorizado.

### Etapa 39 — Operacionalizar manutenção, auditoria e segredos

**Prioridade/porte:** P1 / G. **Responsável proposto:** Operação/Banco de dados/Segurança. **Depende de:** 19, 20, 25, 36, 38. **Rastreabilidade:** T17-19/20/29/31/32/34/35; T16-25/36/42.

- **Entrega:** Atribuir responsáveis e agenda para revisão mensal, retenção, estatísticas, rotação e incidentes. Definir auditoria administrativa proporcional e monitor de cron silencioso independente do cron monitorado.
- **Critério de aceite:** Cada rotina tem evidência, limite de custo/volume e escalonamento; acesso de leitura não é confundido com trilha de DDL. Cutover site_api, alertas e segredos continuam adiados até liberação.
- **Validação/simulação:** Failover/rotação em sandbox, fila atrasada, lease preso, retenção parcial e cron ausente; canal real somente quando liberado.
- **Risco e contenção:** Trocar chave interromper serviço ou excesso de logs expor dados. Sobreposição controlada de chaves, redação e rollback testados.

### Etapa 40 — Criar testes do contrato público entre projetos

**Prioridade/porte:** P1 / M. **Responsável proposto:** Backend/QA/Responsável pela origem. **Depende de:** 21, 36. **Rastreabilidade:** T16-43/45/46; T17-05/36/37/39/40/41/42/43/44/45.

- **Entrega:** Definir contrato público versionado e verificação somente leitura de campos/tipos/permissões, usando acesso autorizado. CI do site compara snapshot aprovado; verificações que exijam privilégio na origem dependem do responsável.
- **Critério de aceite:** Drift de coluna/campo crítico é detectado sem escrita na origem; mocks não são apresentados como prova cross-projeto. Mudanças de funções, GraphQL, policies e índices do Promo Gifts permanecem fora deste plano de execução.
- **Validação/simulação:** Fixture do contrato removendo/renomeando campo e teste live autorizado de leitura; nenhum segredo administrativo da origem em PRs.
- **Risco e contenção:** Transformar teste em autorização para corrigir o banco interno. Abrir dependência específica e não aplicar SQL.

## Bloco 9 — Graphify como ferramenta de engenharia

### Etapa 41 — Vincular requisitos e documentação ao mapa técnico

**Prioridade/porte:** P2 / G. **Responsável proposto:** Ferramentas/Engenharia. **Depende de:** 02, 04. **Rastreabilidade:** GR08/31/32/33/35/36/37.

- **Entrega:** Projetar corpus documental allowlist separado do AST; ligar IDs da matriz a fontes/testes/contratos com procedência. Extração semântica, se adotada, permanece local/controlada e fora do runtime, sem envio de conteúdo a provedor sem decisão.
- **Critério de aceite:** Grafo distingue extraído, inferido e ambíguo; documento não autoriza ações; implantação não é inferida pela presença de migration. Nenhuma chave/dado de cliente entra no corpus.
- **Validação/simulação:** Requisito sem implementação, documento obsoleto, fonte removida e relação contraditória; revisão humana de vínculos propostos.
- **Risco e contenção:** Pass semântico inventar causalidade. Revisão explícita, validade por commit e separação da fonte estrutural.

### Etapa 42 — Melhorar precisão e explicação das relações

**Prioridade/porte:** P2 / M. **Responsável proposto:** Ferramentas/QA. **Depende de:** 41. **Rastreabilidade:** GR04/15/16/18/25/33/34/37/39/47.

- **Entrega:** Validar aliases/homônimos/caminhos e links até testes/RPC/SQL; nomear comunidades úteis com evidência e responsável. Diferenciar vizinhança estrutural de dependência causal.
- **Critério de aceite:** Cada relação usada em decisão tem fonte/linha/limite; ambiguidade não vira afirmação. Manter escolhas aprovadas de grafo não direcionado, rebuild completo e ausência de hooks.
- **Validação/simulação:** Fixtures com símbolos homônimos, imports indiretos, fronteira entre bancos e correção de memória incorreta.
- **Risco e contenção:** Trocar decisões arquiteturais para cumprir texto antigo. Reabrir somente com justificativa e aceite explícito.

### Etapa 43 — Ensaiar falhas e conteúdo hostil do Graphify

**Prioridade/porte:** P2 / M. **Responsável proposto:** Ferramentas/Segurança/QA. **Depende de:** 41. **Rastreabilidade:** GR09/20/27/45/46/49.

- **Entrega:** Cobrir parser com erro/timeout, interrupção, lock órfão, concorrência, disco cheio simulado, symlinks externos, nomes hostis e HTML injetável; preservar último grafo válido.
- **Critério de aceite:** Falha não promove candidato parcial, não segue caminho proibido e não executa conteúdo do corpus; recuperação documentada sem apagar dados não relacionados.
- **Validação/simulação:** Diretório temporário isolado e fixtures sintéticas; simular falta de espaço por injeção, não encher disco da máquina; verificar atomicidade.
- **Risco e contenção:** Ensaio adversarial afetar workspace. Sandbox de teste e limites explícitos.

### Etapa 44 — Medir utilidade, cobertura e desempenho do Graphify

**Prioridade/porte:** P2 / M. **Responsável proposto:** Ferramentas/QA. **Depende de:** 41, 42, 43. **Rastreabilidade:** GR03/25/40/47/48.

- **Entrega:** Manter benchmark estrutural e adicionar amostra julgada documental, precisão de vínculos e recuperação de testes afetados. Medir tempo/memória em corpus atual e fixture maior.
- **Critério de aceite:** Relatório separa recuperação estrutural, precisão semântica e custo; limiares aprovados após baseline; 10/10 estrutural não é nota do site nem prova de entendimento.
- **Validação/simulação:** Consultas conhecidas, zero resultado, truncamento, relações falsas e comparação com busca direta; execução reprodutível sem rede.
- **Risco e contenção:** Otimizar número de nós em vez de qualidade. Julgar resultados por fonte correta e utilidade.

### Etapa 45 — Governar artefatos, cache e upgrades do Graphify

**Prioridade/porte:** P2 / M. **Responsável proposto:** Ferramentas/Infraestrutura. **Depende de:** 41, 43, 44. **Rastreabilidade:** GR06/10/28/38/41/42/43/44/49/50.

- **Entrega:** Revisar acesso/retenção de artefatos, scanner, gatilhos e eventual cache por fingerprint completo. Preparar ensaio de upgrade/restauração de candidato; adotar cache só se medição justificar.
- **Critério de aceite:** Cache inclui versão/configuração/corpus e nunca oculta grafo stale; sem arquivos do grafo no bundle público; upgrade não destrói evidência anterior.
- **Validação/simulação:** Mudança de branch/renome/remoção/config, artefato expirado, falso hit e versão incompatível; manter CI base/head.
- **Risco e contenção:** Cache barato devolver resultado velho. Preferir rebuild já aprovado quando não houver ganho comprovado.

## Bloco 10 — Regressão, publicação e fechamento

### Etapa 46 — Executar regressão integrada e cenários de falha

**Prioridade/porte:** P1 / G. **Responsável proposto:** QA/Engenharia. **Depende de:** 10, 11, 12, 21, 23, 24, 25, 29. **Rastreabilidade:** UX03/99; AC30; T17-46.

- **Entrega:** Cobrir jornadas visitante/conta da descoberta ao histórico, incluindo kits, alternativas, anexos, compartilhamento e ajustes. Integrar somente funcionalidades cujo lote estiver pronto, registrando exclusões reais.
- **Critério de aceite:** Nenhum A01–A05 aberto no lote de correção; contratos/frontend/SQL coerentes; nenhuma regressão crítica em envio, autorização ou preservação de intenção. Funcionalidade adiada não aparece como testada.
- **Validação/simulação:** Suítes locais, cobertura, pgTAP, concorrência SQL real e projetos Playwright existentes; timeout, offline, 429, duplicação, sessão expirada e replay.
- **Risco e contenção:** Um mega-lote atrasar hotfix. Executar recorte de risco em cada PR e regressão ampliada periodicamente.

### Etapa 47 — Consolidar compatibilidade de dependências e gates

**Prioridade/porte:** P2 / M. **Responsável proposto:** Engenharia/Infraestrutura. **Depende de:** 01, 05. **Rastreabilidade:** T13-02/04/05/07/08/43/44/45; T17-06/07/08/09/10.

- **Entrega:** Documentar incompatibilidades já observadas e avaliar majors em branch isolada, consultando documentação oficial vigente na execução. Manter versões compatíveis até prova de ganho e suporte; preservar gates de segurança e migrations.
- **Critério de aceite:** Instalação limpa sem ignorar peers, lint/typecheck/build/testes aprovados; nenhuma migração major automática por este plano. Registrar decisão de adiar quando apropriado.
- **Validação/simulação:** npm ci em ambiente limpo, matriz de plugins, build e regressão; não usar continue-on-error em gate obrigatório.
- **Risco e contenção:** Repetir upgrade incompatível que deixa main indisponível. PR independente, lockfile auditado e reversão delimitada.

### Etapa 48 — Publicar por lotes com banco e código compatíveis

**Prioridade/porte:** P1 / M. **Responsável proposto:** Release/Backend. **Depende de:** 05, 36, 46, 47. **Rastreabilidade:** UX98/100; LK50; T17-50.

- **Entrega:** Usar release controlado existente; verificar SHA testado, checks e ledger do banco isolado antes do deploy. Aplicar somente migrations necessárias, revisadas e aprovadas para o site; ensaiar falha parcial e concorrência.
- **Critério de aceite:** Sem merge/deploy neste pedido de planejamento. Na execução autorizada, nenhum SQL órfão/reaplicado, nenhum segredo no bundle e nenhum deploy de SHA diferente do validado.
- **Validação/simulação:** Preview/ambiente isolado e dry-run; simular migration atrasada/falha, gate vermelho e código anterior sobre schema expandido.
- **Risco e contenção:** Desfazer migration com perda de dados. Preferir fix-forward, compatibilidade retroativa e rollback de código seguro.

### Etapa 49 — Verificar a versão publicada e observar estabilidade

**Prioridade/porte:** P1 / M. **Responsável proposto:** QA/Operação. **Depende de:** 48. **Rastreabilidade:** UX67/97/98/99/100; LK50.

- **Entrega:** Conferir SHA do deployment, assets/headers, rotas públicas/privadas, 404/401 e jornadas críticas autorizadas. Monitorar erros e fila em janela de observação definida com a operação.
- **Critério de aceite:** Evidência distingue local, CI, preview e produção; zero regressão crítica observada na janela acordada. Não copiar banco de clientes para provar sincronização com Git.
- **Validação/simulação:** Smoke sem escrita por padrão; ensaio de gravação apenas com conta/destinatário controlados e autorização; métricas sem PII.
- **Risco e contenção:** 200 de home esconder quebra de conta/envio. Verificar cenários funcionais proporcionais e registrar o que ficou sem ensaio.

### Etapa 50 — Encerrar por evidências e registrar o escopo residual

**Prioridade/porte:** P1 / M. **Responsável proposto:** Produto/Engenharia/Operação. **Depende de:** 02, 49. **Rastreabilidade:** Todas as referências e etapas; GOVERNANCA_FECHAMENTO.

- **Entrega:** Atualizar matriz/índice com arquivos, testes, SHA, ativação e aceite por requisito; revisar cada uma das 50 etapas e classificar concluída, parcial, adiada ou dependência externa. Publicar relatório apenas quando solicitado/autorizado.
- **Critério de aceite:** Nenhum item descartado silenciosamente; defeitos P1/P2 do lote resolvidos; pendências humanas, de provedores e do Promo Gifts explícitas. Encerramento técnico de lote não é encerramento integral nem garantia de perfeição.
- **Validação/simulação:** ledger:check, revisão humana do conteúdo semântico e conferência das evidências; todos os 50 IDs únicos e dependências consistentes.
- **Risco e contenção:** Declarar 10/10 porque CI está verde. Usar critérios mensuráveis e aceite do responsável, nunca nota automática.

## Critérios transversais de conclusão

### Por mudança de aplicação

Teste corretivo demonstrado, quando aplicável; lint/typecheck; testes unitários/contratuais; teste de navegador proporcional; nenhuma regressão de autorização, envio ou preservação de dados; cobertura não reduzida para fazer o gate passar. Registrar comandos e resultados reais, não colar uma lista genérica de “testes feitos”.

### Por mudança de banco

Alvo isolado validado; SQL/migration revisados; teste SQL positivo e negativo; ensaio local; análise de bloqueios/volume e compatibilidade; dry-run remoto; migrations aplicadas pelo fluxo autorizado; consulta de metadados pós-release. Não fazer repair de histórico só para apagar diferença. Backups/drills e alterações de custo exigem decisões específicas.

### Por integração externa

Contrato local aprovado, configuração segura, destinatário controlado e ensaio observado. “Aceito pelo provedor”, “entregue”, “lido” e “atendido” são estados distintos. Enquanto a ativação estiver adiada, manter a etapa parcial/adiada sem impedir trabalhos independentes.

### Por conteúdo e experiência

Arquivo e direito de uso identificados; revisão editorial; links e acessibilidade; tarefa realizada pelo perfil pertinente quando exigido. Dados desconhecidos devem permanecer desconhecidos. Uma foto bonita não prova execução comercial, e teste de snapshot não prova entendimento.

### Por release

SHA e configuração identificados, checks obrigatórios aprovados, schema compatível, smoke e jornada crítica validados no alcance autorizado, evidência sem segredos, janela de observação definida e matriz atualizada. Só então declarar o lote concluído; manter pendências fora do lote explicitamente abertas.

## Evidência mínima por etapa

Usar o PR/registro de execução e a matriz vigente, sem criar nova base de status:

```text
Etapa: P50-20260923-NN
Referências dos planos anteriores:
Escopo efetivamente entregue:
Arquivos / migration / SHA:
Teste que demonstrava a falha, se aplicável:
Testes executados e resultado:
Ambiente: local / CI / preview / produção
Ativação / configuração:
Aceite humano e responsável, se aplicável:
Risco residual / rollback:
Estado: concluída / parcial / adiada / dependência externa
```

## O que não fazer ao executar

Não reimplementar diálogo de conflito, imagens de categoria ou sincronização como se fossem inexistentes. Corrigir seus limites identificados. Não trocar majors por impulso, instalar pg_cron contra decisão anterior, exigir grafo direcionado contra alternativa aprovada nem criar workflow em projetos de teste inexistentes. Não prometer pesquisa, recebimento real ou backup funcional sem ensaio.

Não tratar aprovação ampla deste plano como autorização para mudanças no Promo Gifts, custos externos, envio a clientes reais, restauração sobre produção ou uso de materiais não identificados. Esses limites permanecem válidos.

## Resultado esperado

Primeiro, eliminar os cinco defeitos confirmados e consolidar sua prevenção. Depois, completar os contratos comerciais, o conteúdo e as garantias técnicas pendentes, com aceites rastreáveis. Ao final, será possível afirmar exatamente quais jornadas estão implementadas, publicadas e homologadas — e quais continuam dependentes de decisões externas — sem confundir quantidade de etapas ou testes com perfeição.

