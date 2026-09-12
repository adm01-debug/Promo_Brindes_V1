# Revisão dos planos — após reconciliação das migrations

Data: 12/09/2026. Projeto: `Promo_Brindes_V1`.

## 1. Conclusão executiva

**Não implementamos integralmente todas as melhorias aprovadas.** A base possui funcionalidades reais, testes amplos e banco isolado reconciliado, mas ainda há entregas ausentes, funcionalidades parciais e problemas reproduzíveis.

A revisão encontrou seis problemas funcionais/de experiência (B01–B06) e uma falha intermitente de teste (B07). Dois itens antes classificados como implementados voltam a parciais: limpeza do rascunho e detalhe do orçamento. Quatro avançam: tratamento de rotas inválidas, desfazer/confirmar substituição, modelo de compartilhamento e proteção de indexação/métricas privadas.

Não há evidência para classificar o projeto como “10/10”, “tudo validado” ou “faltam apenas credenciais”. O envio automático da cópia do orçamento, por exemplo, ainda exige desenvolvimento, além de configuração operacional.

### Escopo e preservação

- Código auditado: `b789e45f3171ce56a9e5eff4f8bbb3d6acc145c7`; `main` remoto aponta para o mesmo commit.
- Site publicado inspecionado: <https://promo-brindes-v1.vercel.app>.
- Banco do site: `xlzmclcjdncjfdrjxclt`; consultas administrativas somente leitura.
- Promo Gifts e seu banco `doufsxqlfjyuvxuezpln`: nenhuma alteração. O contrato público de catálogo permanece somente leitura.
- Esta rodada gerou apenas documentos e diagnósticos locais. Não implementou correções, não publicou commits e não executou migrations, tarefas destrutivas ou envios reais.

## 2. Inventário e método

Foram confrontados quatro documentos persistidos:

| Plano | Referências | Documento |
| --- | ---: | --- |
| Experiência geral | 100 | [UX](PLANO_UX_100_ETAPAS_20260909.md) |
| Benchmark Lukka | 50 | [Lukka](LUKKA_BENCHMARK_PLANO_50_ETAPAS_20260909.md) |
| Graphify | 50 | [Graphify](PLANO_GRAPHIFY_50_ETAPAS_20260911.md) |
| Área do Cliente | 30 | [Portal](CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md) |

São **230 referências sobrepostas**, não 230 funcionalidades independentes. Não é correto transformar as contagens abaixo em percentual global de produto pronto.

Os planos originais separados de 50 etapas de catálogos e de datas comemorativas não foram localizados como listas completas no repositório. Seus módulos foram revisados pelo código e pelos itens correspondentes dos planos recuperados; não é possível atestar o fechamento literal de duas listas indisponíveis.

Método: navegação inicial com Graphify, inspeção das fontes e contratos por módulo, confronto dos testes existentes, novas simulações locais, leitura do site publicado, CI/GitHub e verificação do ledger/permissões via `pg_catalog`. O grafo não foi usado como prova de implementação, autorização, causalidade ou publicação.

### Classificação atual

| Plano | Implementado (I) | Parcial (P) | Não implementado (N) | Dependência externa (E) | Alternativa arquitetural (A) |
| --- | ---: | ---: | ---: | ---: | ---: |
| UX — 100 | 35 | 54 | 7 | 4 | 0 |
| Lukka — 50 | 12 | 25 | 6 | 7 | 0 |
| Graphify — 50 | 18 | 26 | 2 | 0 | 4 |
| Área do Cliente — 30 | 21 | 9 | 0 | 0 | 0 |
| **Total — 230** | **86** | **114** | **15** | **11** | **4** |

I significa implementação técnica sustentada no escopo da referência, não certificação universal de qualidade ou entrega real. P inclui comportamento incompleto, aceites não demonstrados ou defeitos. E não significa concluído: exige materiais, decisões ou participação externa. A identifica uma entrega diferente da especificação literal, que não deve ser contabilizada como atendimento integral silenciosamente.

A [matriz atualizada](MATRIZ_POS_MIGRATIONS_20260912.csv) registra, para cada ID, entrega original, estado anterior, estado atual, fontes, conclusão e aceite restante. As 230 linhas têm avaliação explícita; os testes dinâmicos são por módulo/cenário, não 230 testes independentes.

## 3. Pendências antigas que não devem continuar abertas

| Tema | Evidência atual | Limite da conclusão |
| --- | --- | --- |
| Duas últimas migrations | As versões `20260911180000` e `20260911190000` estão no ledger remoto; 14 locais = 14 remotas | Não comprova operação comercial completa |
| `CRON_SECRET` | Variável presente e sensível em Production na Vercel | Não executamos a rotina de expurgo; presença não comprova agendamento ou execução bem-sucedida |
| Shell público | Rotas retornam HTML próprio, assets e metadados; sem tela de login da Vercel nas respostas amostradas | Não equivale a testar todos os fluxos |
| URL inexistente | Três rotas inválidas retornam 404 com shell próprio | É o comportamento correto, não indisponibilidade do site |
| Compartilhamento | Contrato opaco/revogável e limite de 50 itens confirmados no código e banco | Ciclo real criar–abrir–revogar ainda precisa reteste no deployment |
| Quantidades | Rascunho de digitação implementado em produto, seleção e orçamento | B02 e B07 continuam abertos |
| Variantes em link compartilhado | Identidades ausentes/obsoletas são tratadas na hidratação | Isso não corrige a reconciliação de variantes da API de orçamento, B03 |
| Onboarding | Não impõe automaticamente o filtro de kits | Relevância comercial da curadoria ainda não medida |
| Frases da marca | As quatro frases aprovadas estão no manifesto da home e nos testes | Não foram removidas no commit auditado |
| Badge dos cards | Prioridade única novidade → kit → personalização implementada | Card não é o mesmo componente que os destaques da ficha |
| Desfazer | Remoção/limpeza e confirmações de substituição estão presentes | Não equivalem a versionamento de várias campanhas |
| Privacidade de navegação | `noindex` em rotas privadas e redação de UUID de orçamento em analytics | Não comprova todo o tratamento de dados ou retenção real |

Os relatórios anteriores permanecem como histórico. Onde contradisserem esta evidência datada, especialmente sobre migrations, shell ou limite de compartilhamento, não devem orientar a próxima execução.

## 4. Problemas reproduzidos e critérios de correção

### B01 — Alta: rascunho reaparece com contato e consentimento após sucesso

Fontes: `src/pages/QuotePage.tsx:78`, `src/pages/QuotePage.tsx:164` e seção 3 de `src/pages/PrivacyPage.tsx`.

O sucesso limpa o armazenamento, mas mantém `contact` e altera `briefing`. O efeito que salva ambos roda novamente e recria o rascunho. Simulação com resposta de sucesso, seleção e contato sintéticos: um POST, tela “Sua solicitação chegou.” e `draftExists=true`, `contactRetained=true`, `consentRetained=true`.

Impacto: persistência contrária ao comportamento informado na página de privacidade; dados/consentimento anteriores podem reaparecer na mesma aba. A simulação não demonstra acesso por outra conta ou vazamento remoto.

Aceite: rascunho ausente após sucesso confirmado; contato e consentimento não restaurados na próxima solicitação; falha de envio preserva o trabalho; descarte manual, recarga e saída da conta cobertos. Deve haver teste do componente completo, não apenas da função que remove a chave.

### B02 — Alta: mínimo desconhecido aceito na interface e recusado no servidor

Fontes: `src/lib/catalog.ts:224`, `src/lib/catalog.ts:383` e `api/_lib/catalogValidation.ts:57`.

A interface normaliza mínimo nulo/zero para 1. A reconciliação só considera válidas linhas cujo mínimo seja número inteiro. Produto publicado com `min_quantity=null` vira `catalog_item_unavailable`; com zero, a função devolve `minQuantity=0`, inconsistindo com a normalização do cliente.

Simulação da função real: nulo rejeitado; zero aceito e preservado como zero; 50 aceito. A amostra pública desta rodada não continha mínimo nulo/zero; incidência atual no catálogo inteiro não foi medida.

Aceite: contrato explícito e uniforme para mínimo confirmado, desconhecido e inválido, sem inventar condição comercial; produto com mínimo a confirmar deve seguir o fluxo consultivo previsto. Não introduzir filtro por estoque. Testar também alteração de mínimo entre seleção e envio, produto removido e mensagem acionável.

### B03 — Alta: variante informada não é reconciliada com o produto

Fontes: `api/_lib/catalogValidation.ts:39`, `api/_lib/catalogValidation.ts:72`, `api/_lib/contracts.ts` e `src/pages/CustomerQuotePage.tsx:77`.

A API recarrega identidade/mínimo/imagens, mas não a relação de variantes; o spread do item preserva `variantId` e `colorName` do payload. A função real aceitou `variante-que-nao-existe` para produto com mínimo 50. A repetição do histórico também repõe itens antigos diretamente na seleção.

Impacto: briefing pode representar como variante válida uma opção sem vínculo com aquele produto. É um problema de integridade; não foi demonstrada exploração de autorização, execução de código ou vazamento.

Aceite: validar a identidade da variante contra o contrato público atual. Se cor livre for permitida comercialmente, distingui-la de variante confirmada. Cobrir variante removida, variante de outro produto, cor sem ID, repetição histórica e referência ausente, preservando o pedido de consulta quando aplicável.

### B04 — Alta: detalhe anterior permanece sob URL de outro orçamento após erro

Fontes: `src/pages/CustomerQuotePage.tsx:44` e `src/pages/CustomerQuotePage.tsx:139`.

Ao mudar o ID, o efeito inicia a carga sem limpar/associar o registro antigo à nova identidade. Se a consulta falha, a tela de erro só aparece quando não existe `quote` anterior.

Simulação: abrir A; navegar para B sem desmontar o componente; responder 503 para B. A URL aponta para B, mas o título de A continua visível e a tela de erro não aparece. As ações também continuam baseadas no objeto anterior.

Aceite: impedir dados/ações de uma identidade anterior sob outra rota; erro e nova tentativa claros; testar navegação rápida, retorno, falha na atualização após ajuste e respostas fora de ordem. O cenário é da mesma conta e não comprova falha de isolamento no banco.

### B05 — Média: data de evento passada chega à API sem validação local

Fontes: `src/pages/QuotePage.tsx:257`, `src/pages/QuotePage.tsx:267`, `src/lib/quoteBriefing.ts` e `api/_lib/contracts.ts:143`.

O formulário usa `noValidate`; `min` do input não impede o envio. Sem data de recebimento, o evento `2020-01-01` saiu no payload da simulação.

**O contrato real do servidor rejeita a data passada.** A simulação interceptou a resposta; não houve gravação desse dado em produção. O problema é a inconsistência e o retorno tardio/genérico para o usuário. Há ainda regras locais/UTC diferentes que merecem teste na virada do dia; essa falha de fuso não foi reproduzida nesta rodada.

Aceite: validar no campo antes do envio, com erro associado e foco; definir referência de calendário coerente entre cliente/servidor e testar evento versus recebimento, ano bissexto e virada do dia.

### B06 — Média: proposta vencida não é distinguida da versão vigente comercialmente

Fonte: `src/pages/CustomerQuotePage.tsx:152`.

`isCurrent` controla o destaque e o rótulo “Versão atual”, independentemente de `validUntil`. A simulação mostrou proposta vencida desde 2020 com esse destaque e botão de abertura. A data aparece, mas não há indicação explícita de vencimento.

É uma lacuna de experiência/semântica: “última versão” não significa “dentro da validade”. Não é necessário impedir a consulta histórica do arquivo.

Aceite: separar última versão, prazo comercial e necessidade de atualização; tratar validade ausente e data limite; manter download histórico autorizado sem sugerir validade comercial inexistente.

### B07 — Qualidade: falha intermitente de quantidade em WebKit

Fonte: `e2e/smoke.spec.ts:342`, asserção de quantidade na linha 355.

A suíte cruzada produziu 59 aprovados, 10 ignorados e uma falha: esperava `250`, recebeu `50`. O mesmo teste isolado passou três vezes, sem alteração de código.

Isso não comprova regressão determinística nem encerra a falha. É preciso investigar foco, digitação, recarga de estado e timing na execução conjunta, incluindo o papel do ambiente local. Aceite: causa explicada, teste confiável e suíte integral aprovada; não apenas aumentar retries ou substituir o esperado por 50.

Reprodução e saídas: [diagnósticos](audits/plan-review-20260912/README.md) e [simulações](audits/plan-review-20260912/simulations.json).

## 5. Funções sugeridas ainda não implementadas

| Entrega | O que existe | O que falta | Referências |
| --- | --- | --- | --- |
| Cópia por e-mail | Protocolo na tela e tabela de auditoria de notificações | Alimentação transacional de fila, processamento, provedor, template, idempotência, tentativas e prova de entrega/falha | UX68, LK45 |
| Cópia automática por WhatsApp | Link para conversa e preferência de canal | Integração de envio, escolha específica do cliente, template aplicável, processamento e acompanhamento de entrega | UX69 |
| Campanhas entre dispositivos | Uma seleção local nomeável; histórico de solicitações enviadas | Biblioteca de rascunhos por conta, sincronização optativa e recuperação em outro dispositivo | UX59 |
| Versionamento de campanhas | Sincronização simples via evento de armazenamento | Conflitos entre abas, versões, arquivar/restaurar e várias campanhas independentes | UX60 |
| Upload de logo/referência | Campo de situação da identidade visual | Upload privado, validação, limites, autorização por titular, remoção/retenção e vínculo ao briefing | UX65, LK43 |
| Kit configurável | Produtos identificados como kit e filtros | Templates reais de componentes, substituição e cálculo quantidade de kits × unidades por componente | LK27–LK29 |
| Biblioteca de arquivos | Dez catálogos editoriais com formato `online` | Operação real de PDF/revista, arquivos, revisão, publicação e expiração; tipos/labels não são entrega de arquivos | UX84 |
| Categorias fotográficas | Entradas iconográficas | Entradas fotográficas previstas no benchmark, com material autorizado | LK10 |
| Avaliação da busca | Dicionário de sinônimos, normalização e testes | Consultas reais/julgadas com resultados esperados e avaliação de relevância | UX34 |
| Benchmark Graphify | Consultas e testes da ferramenta | Comparação das dez perguntas com busca direta e medição de precisão/utilidade | GR40 |
| Comparação estrutural de commits | Geração do grafo no CI | Comparação base/head e relatório de mudanças/impacto com limites explícitos | GR44 |

Ausência de e-mail/WhatsApp foi confirmada pela inspeção do fluxo `persistLead`, dos handlers e do README; **não é apenas “ativar uma chave”**. Uma tabela chamada `notification_deliveries` não constitui um serviço de entrega. E-mails de login são outra função e não comprovam envio de cópia do orçamento.

## 6. Funcionalidades parciais por módulo

### Navegação, home e marca

Cabeçalho, busca, seleção, conta, redes sociais, manifesto e linguagem consultiva estão implementados. A navegação tem cobertura automatizada e a amostra móvel não apresentou overflow horizontal nos estados medidos.

Permanecem: avaliação com compradores reais, compreensão de rótulos — ainda existe “Abrir radar” no orçamento vazio —, curadoria da ordem/conteúdo da home, casos autorizados, fotos próprias e comprovação operacional dos textos de processo. Efeitos visuais não demonstram por si só melhora de conversão ou acessibilidade.

### Catálogo, superfiltro, busca e curadoria

Categorias, cores, materiais, personalização, embalagem, chips, painel móvel, URL e estados vazios estão presentes. Busca por sinônimos, sugestão de digitação, preservação de código e curadoria por briefing têm implementação/testes. A seleção não deve depender de estoque positivo, conforme orientação comercial.

Permanecem: B02/B03, conjunto representativo para relevância, diversidade/ranking por intenção, revisão de taxonomia e retorno à posição após carga assíncrona. Foram observados 76 produtos distintos nas respostas públicas amostradas: nenhum mínimo nulo/zero e sete sem imagem primária; isso não prova defeito de fallback nem representa o catálogo inteiro. O campo de estoque ausente não foi interpretado como estoque zero.

### Produto, seleção e comparação

Galeria, zoom, informações de mínimo, FAQ contextual, comparação de até três referências, limite de 50 itens, feedback, desfazer e confirmações estão implementados. Os rascunhos de digitação foram corrigidos nos três pontos relevantes.

Permanecem: B02/B03/B07; qualidade/comparabilidade de atributos por família; técnicas e áreas de personalização sustentadas em dados reais; pertinência de relacionados; várias campanhas e sincronização; exportação impressa com listas extensas, imagens ausentes e paginação. A classificação principal/alternativa existe, mas não integra o contrato completo do link compartilhado.

### Briefing, confirmação e atendimento

Nome da ação, orçamento opcional com escopo, evento/recebimento, canal, contexto recuperado, rascunho, idempotência e protocolo existem. Cadastro não é obrigatório para o primeiro pedido.

Permanecem: B01/B02/B05; upload real; cópias automáticas; comprovação do encaminhamento ao responsável, prazo de resposta e retomada da conversa. “Persistiu no banco” não prova que um especialista recebeu e atenderá o pedido.

### Área do Cliente e propostas

Login por senha/link/código, callback, recuperação, associação a e-mail confirmado, histórico, paginação, filtros, detalhe, eventos, repetição e propostas privadas estão implementados. Os testes locais cobrem negação entre titulares, anonimato, identidade não confirmada e acesso aos documentos.

Permanecem: B04/B06; repetição com reconciliação do catálogo atual; ciclo real de confirmação/recuperação de acesso nesta rodada; recebimento/encaminhamento do pedido de ajuste; demonstração do ciclo operacional publicação de proposta → acesso do cliente → ajuste → atendimento. Bucket, RPC e botão não demonstram essa operação ponta a ponta.

### Compartilhamento, catálogos e datas

Links revogáveis, expiração e limite de 50 estão modelados/aplicados. Catálogos editoriais têm filtros, prévias e continuidade até a seleção. Datas têm favoritos locais, desfazer e exportação ICS.

Permanecem: novo ciclo real de compartilhamento e expiração no deployment; semântica de título/grupos decisórios no compartilhamento; biblioteca de arquivos além das dez entradas online; governança editorial; importação ICS real em Google/Outlook/Apple; continuidade de favoritos entre dispositivos e critérios de curadoria sazonal. Não se deve afirmar que “não há desfazer nas datas”: ele existe.

### Métricas, SEO, acessibilidade e performance

Whitelist de eventos, retirada de parâmetros/fragmentos e redação de identificadores privados estão implementadas. Shell/metadados públicos, `noindex` e 404 foram rechecados. Orçamento de assets passou.

Permanecem: provar recepção e deduplicação de eventos no ambiente efetivo, validar funil com dados operacionais, metadados específicos de coleções/datas selecionadas por parâmetros, medições de campo, leitores de tela e dispositivos físicos. A confirmação de repetição de orçamento tem foco/Escape, mas não o mesmo bloqueio de scroll do compartilhamento. Não foi feita certificação integral de acessibilidade.

### Graphify

O estado local estava atual pelo fingerprint: 1.052 nós, 2.311 relações e 142 arquivos representados, incluindo **17 SQL**. Nenhum Markdown estava representado. O commit de origem do artefato é anterior ao HEAD, mas o fingerprint do corpus era atual; isso não é, sozinho, divergência de código.

Consulta estrutural, orçamento de resposta, aliases, validadores, scanner e workflow existem; os seis testes passaram. O grafo auxiliou a navegação, sem substituir a leitura de fontes.

Permanecem: passagem documental/semântica, benchmark de dez perguntas, relação mantida requisito–código–teste–deploy, comparação base/head, cobertura de aliases e ligações indiretas, falhas de parser/timeout/disco/interrupção, restauração/upgrade e avaliação do HTML. O workflow tem cache npm, mas não cache estrutural por corpus nem filtros de caminhos.

Quatro desvios explícitos: grafo não direcionado (GR14), vizinhança em vez de impacto causal (GR24), reconstrução total em vez de incremental (GR26) e ausência dos hooks locais previstos (GR30). Não devem ser chamados de requisitos literais concluídos sem ajuste aprovado do plano.

## 7. Banco isolado e segurança: estado efetivamente observado

Consulta em 12/09/2026 às 16:12 UTC: ledger remoto com 14 versões, sem diferença em relação aos arquivos locais. As duas últimas migrations não estão pendentes.

O retrato via `pg_catalog` verificou:

- 12 tabelas de `site_private` com RLS habilitada.
- Sem `SELECT` direto para `anon` e `authenticated` nessas tabelas.
- Ausência de policies nessas tabelas compatível com negação por padrão e acesso por RPC autorizado; criar policies indiscriminadamente não é uma correção.
- Funções inspecionadas com `search_path` vazio; escrita privilegiada não executável por anon/auth; funções de cliente com acesso autenticado previsto.
- Limite de 50 itens no compartilhamento e guarda de retenção presentes.

O advisor retornou 12 avisos INFO de RLS sem policy e cinco WARN de funções `SECURITY DEFINER` executáveis por autenticados. Isso **não é zero alertas**, nem prova automática de vulnerabilidade: a arquitetura usa essas funções intencionalmente. Cada função deve continuar exigindo identidade/titularidade e manter testes negativos; a consulta desta rodada não pretende cobrir toda função possível do projeto.

Os 101 testes pgTAP locais passaram, incluindo isolamento e controles de escrita/leitura. Não foi realizado novo ciclo autenticado com dados reais em produção, upload de proposta ou expurgo. Evidência local e inspeção remota não são substitutos integrais desses aceites operacionais.

Não houve alteração de configuração ou dados do Promo Gifts.

## 8. Testes e publicação

| Verificação nesta rodada | Resultado | Interpretação |
| --- | --- | --- |
| Tipos, build e orçamento de assets | Aprovados | Integridade estática/empacotamento no ambiente local |
| Vitest | 164 testes em 33 arquivos aprovados | Cobertura existente; não inclui automaticamente B01–B06 |
| E2E Chromium | 66 aprovados, 4 ignorados | Desktop/móvel dentro dos cenários existentes |
| E2E Firefox/WebKit | 59 aprovados, 10 ignorados, 1 falha | B07 permanece aberto |
| Repetição isolada de B07 | 3 aprovados | Indício de intermitência; não apaga a falha inicial |
| pgTAP local | 101 aprovados em 2 arquivos | Banco local; sem escritas reais no site |
| Ferramentas Graphify | 6 aprovados | Não equivale ao aceite das 50 etapas |
| `npm audit` | 0 vulnerabilidades reportadas | Não é auditoria completa da aplicação |
| HTTP produção | 17 rotas válidas 200; 3 inválidas 404 | Shell próprio e cabeçalhos esperados nas amostras |
| Navegador produção | 12 destinos mais uma ficha real, largura 390px | Sem overflow medido; não é certificação de todos os estados |
| Migrations remotas | 14/14, sem diferenças | Pendência de aplicação encerrada |

Limitações importantes:

- Node local `24.19.0` difere do engine declarado `>=22.13 <23` e do CI `22.13.1`. Antes de fechar estabilidade, reproduzir na versão contratada.
- O servidor Playwright ativa várias flags, mas não força explicitamente o endpoint de envio de orçamento. Com a configuração local vazia, pode usar fallback de e-mail. Os novos cenários exigiram endpoint explícito. Falta gate de envio completo que garanta exercitar o caminho persistente.
- As novas simulações têm respostas interceptadas e dados sintéticos; não demonstram entrega de e-mail, gravação real ou autorização end-to-end de produção.
- Nenhuma execução ignorada foi contada como aprovação.
- As medições móveis são fotografias de estados; não houve ensaio humano de todas as combinações de conteúdo, conectividade e tecnologia assistiva.

### GitHub e histórico de CI

O `main` remoto corresponde ao HEAD auditado. Os checks de qualidade, cross-browser, banco e Graphify do commit estão aprovados: [qualidade](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/34692851871), [banco](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/34692851824), [Graphify](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/34692851832).

O check [Supabase Preview](https://github.com/adm01-debug/Promo_Brindes_V1/runs/103551147180) falhou às 12:08 UTC com versões remotas ausentes localmente, **antes** da reconciliação posterior. O ledger consultado às 16:12 UTC está alinhado. Esse check histórico não foi reexecutado nesta auditoria; não é correto usá-lo como prova de divergência atual, nem afirmar que todos os checks estão verdes.

Os novos documentos/diagnósticos desta revisão são locais e ainda não foram commitados/publicados. A coincidência entre HEAD e main se refere ao código auditado, não a esses arquivos novos.

## 9. Ordem recomendada para a próxima execução

1. Corrigir B01 e B04: estado de contato/consentimento e identidade do orçamento são prioritários.
2. Unificar contrato de mínimos e variantes, corrigindo B02/B03 sem excluir produtos por estoque.
3. Resolver B05/B06 e testar regras de calendário/validade e respostas de erro.
4. Transformar os diagnósticos em regressões permanentes; garantir endpoint persistente no teste de envio; reproduzir B07 em Node 22.13.1 e na suíte completa.
5. Reexecutar CI e validar o ciclo real visitante → persistência → conta confirmada → histórico → proposta privada → ajuste, com dados controlados e autorização apropriada.
6. Entregar a operação de notificações: definir provedor/remetente/canal, implementar fila/processamento/idempotência e comprovar entrega, falha e recuperação. Não comunicar ao cliente que a cópia foi enviada antes disso.
7. Implementar biblioteca de campanhas, sincronização optativa e conflitos antes de prometer continuidade entre dispositivos.
8. Implementar upload privado e kit configurável com contratos e testes próprios; não confundir com bucket de propostas ou badge de kit.
9. Completar catálogos de arquivos, governança de datas, curadoria e conteúdo autorizado; validar relevância com conjunto de consultas julgado.
10. Fechar aceites de acessibilidade, performance de campo e pesquisa com compradores; decidir explicitamente quais alternativas Graphify substituem o plano literal.

Cada lote deve fechar fontes, testes, aceites operacionais aplicáveis e documentação da mesma funcionalidade. Criar mais checklist sem encerrar esses critérios não torna o produto completo.

## 10. Entregáveis desta revisão

- [Matriz das 230 referências](MATRIZ_POS_MIGRATIONS_20260912.csv).
- [Resumo verificável das execuções](audits/plan-review-20260912/validation-summary.json).
- [Simulações reproduzíveis e limites](audits/plan-review-20260912/README.md).
- [Estado administrativo somente leitura](audits/plan-review-20260912/database-readonly.json).
- [Respostas HTTP de produção](audits/plan-review-20260912/http-production.json).
- [Observações móveis de produção](audits/plan-review-20260912/browser-production.json).

Conclusão final: a pendência de migrations foi encerrada, mas a conclusão integral dos planos não. O próximo ciclo deve priorizar os defeitos reproduzidos e a operação real do orçamento, sem reabrir problemas já corrigidos nem atribuir ao banco funcionalidades que ainda faltam na aplicação.
