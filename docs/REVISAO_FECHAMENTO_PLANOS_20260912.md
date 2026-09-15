# Revisão de fechamento dos planos — 12/09/2026

## Conclusão

**Ainda não implementamos integralmente os planos.** O código publicado e as migrations estão sincronizados, mas isso não equivale a concluir todas as funcionalidades e seus critérios de aceite.

A revisão confrontou 230 referências de quatro documentos: 100 UX, 50 do benchmark Lukka, 50 Graphify e 30 da Área do Cliente. Há sobreposição; esses números não são 230 funcionalidades independentes nem permitem calcular um percentual global de produto pronto.

Resultado: **94 implementadas tecnicamente, 109 parciais, 12 não implementadas, 11 dependentes de materiais/pesquisa/operação externa e 4 alternativas à especificação literal.** As sete correções B01–B07 foram entregues no escopo dos defeitos originais. Cinco novos cenários de falha foram reproduzidos localmente; três outras lacunas das notificações foram identificadas por inspeção.

O envio de comprovantes avançou de ausente para parcial. Ainda requer correções de aplicação/banco e operação, além das credenciais dos provedores. A afirmação “falta apenas configurar uma chave” não descreve o estado encontrado.

## Versão, escopo e método

- Projeto auditado: `Promo_Brindes_V1`; commit `f20df4452f0d70f295154b0ba8bd9af8f8be64dd`.
- Base da revisão anterior: `b789e45f3171ce56a9e5eff4f8bbb3d6acc145c7`.
- Fontes de requisitos: [UX](PLANO_UX_100_ETAPAS_20260909.md), [Lukka](LUKKA_BENCHMARK_PLANO_50_ETAPAS_20260909.md), [Graphify](PLANO_GRAPHIFY_50_ETAPAS_20260911.md) e [Área do Cliente](CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md).
- Fonte por item: [matriz de 230 referências](MATRIZ_FECHAMENTO_PLANOS_20260912.csv). Cada linha mantém requisito, estado anterior/atual, natureza da pendência, fontes e conclusão.
- Método: consulta inicial ao Graphify, leitura dos planos, comparação do delta de código, inspeção de módulos/contratos/testes e reprodução direcionada das lacunas. O grafo tem 1.099 nós, 2.416 relações, 146 arquivos, 19 SQL e nenhum Markdown; auxilia navegação e não comprova aceite ou publicação.
- Critérios sem mudança relevante mantêm a avaliação anterior após confronto com o delta; isso está identificado na matriz. Não foram executados 230 testes novos nem uma nova navegação manual em todas as páginas nesta rodada.
- Suítes do mesmo commit já aprovadas na validação imediatamente anterior foram reutilizadas. Os novos diagnósticos foram executados nesta revisão e não acessaram provedores reais.
- Não foram recuperadas no repositório as listas literais separadas de 50 etapas de catálogos e 50 etapas de datas comemorativas. Esses módulos estão cobertos pelos requisitos correspondentes dos planos disponíveis; não é possível atestar o fechamento literal das listas indisponíveis.
- Esta entrega contém documentos e diagnósticos locais. Não altera funcionalidades, não envia mensagens, não aplica migrations e não publica commits. O projeto interno Promo Gifts e seu banco não foram modificados.

## Classificação por plano

| Plano | Implementado técnico (I) | Parcial (P) | Ausente (N) | Externo (E) | Alternativa (A) |
|---|---:|---:|---:|---:|---:|
| UX — 100 | 41 | 50 | 5 | 4 | 0 |
| Lukka — 50 | 12 | 26 | 5 | 7 | 0 |
| Graphify — 50 | 18 | 26 | 2 | 0 | 4 |
| Área do Cliente — 30 | 23 | 7 | 0 | 0 | 0 |
| Total — 230 | 94 | 109 | 12 | 11 | 4 |

I indica implementação técnica no escopo delimitado do item. Não substitui pesquisa com compradores nem certifica toda a jornada. P inclui código incompleto, defeito reproduzido ou aceite operacional ainda não demonstrado. E e A não são entregas integralmente concluídas. A natureza da pendência na matriz diferencia trabalho de código, dados, operação e validação.

Houve onze mudanças de classificação: oito referências passaram de P para I; UX68, UX69 e LK45 passaram de N para P. O [resumo gerado](audits/closure-review-20260912/matrix-summary.json) lista cada mudança. Outros itens tiveram a justificativa atualizada sem trocar de categoria, pois a correção de um defeito não encerra todos os seus critérios.

## Correções anteriores efetivamente encerradas

| Defeito anterior | Evidência atual | Limite |
|---|---|---|
| B01 — rascunho recriado após sucesso | `QuotePage.tsx:84` limpa no sucesso e evita nova gravação; E2E confirma ausência de contato/consentimento | O caso distinto de logout R08 continua aberto |
| B02 — mínimo desconhecido rejeitado | `catalogValidation.ts` usa piso técnico de 1; teste de API com mínimo nulo; card diz “Quantidade a confirmar” | Não representa mínimo comercial confirmado nem regra de múltiplos |
| B03 — variante inexistente aceita | API verifica variante no produto; repetição consulta catálogo atual | Qualidade factual dos cadastros não é certificada pela validação de ID |
| B04 — detalhe antigo sob nova URL | Efeito limpa `quote`; E2E A → B com erro comprova remoção de dados e ações anteriores | Ciclo completo de atendimento/ajuste ainda precisa aceite operacional |
| B05 — data passada chega ao POST | Validação local com foco e erro; servidor e testes usam calendário de São Paulo | Não calcula viabilidade real de produção/entrega |
| B06 — proposta vencida parece vigente | Interface diferencia última versão de validade encerrada; teste unitário e E2E | Arquivo histórico continua consultável por seu titular |
| B07 — quantidade sobrescrita no WebKit | Inicialização de produto em `useLayoutEffect`; suíte cruzada aprovada | Não comprova comportamento em todos os dispositivos físicos |

Também permanecem implementados: descoberta sem conta obrigatória; catálogo sem ocultação por estoque; um badge por card; as quatro frases da marca; links sociais; superfiltro, sinônimos e sugestões de digitação; FAQ contextual; seleção e comparação; impressão; agenda e ICS; histórico por titular, propostas privadas e compartilhamento revogável.

## Novas falhas e lacunas confirmadas

### R08 — Alta: dados e consentimento permanecem no formulário após logout

Fontes: `src/context/CustomerAuthContext.tsx:37`, `src/pages/QuotePage.tsx:53` e `src/pages/QuotePage.tsx:84`. Referências: UX07, UX64, UX79, UX80, AC10, AC29.

Cenário executado com duas abas, autenticação simulada e chamadas externas interceptadas: preencher e-mail/consentimento no orçamento; sair da conta no histórico aberto em outra aba; esperar o SDK limpar a sessão e o rascunho; voltar ao formulário; editar empresa.

Resultado: o storage foi limpo, mas e-mail e consentimento continuaram nos estados React do formulário. Editar empresa gravou novamente o contato anterior. Isso demonstra exposição local em navegador compartilhado; não demonstra acesso cruzado às tabelas do Supabase.

Aceite: mudanças de titular/logout precisam invalidar os estados pessoais ativos, consentimentos, contexto privado de repetição e tentativas pertinentes, além do storage. Preservar a seleção anônima apenas conforme contrato deliberado. Cobrir logout em outra aba, troca A → B, edição após logout e término de uma requisição em andamento.

Reprodução: [logout.mjs](audits/closure-review-20260912/logout.mjs).

### R01 — Alta antes de ativar notificações: retorno falso do banco é tratado como sucesso

Fontes: `api/notifications.ts:152` e `api/notifications.ts:171`. Referências: UX67–UX69, LK45.

`finalize_site_notification_delivery` retorna boolean. A aplicação aguarda a chamada, mas ignora `false` e retorna sucesso. No diagnóstico, o provedor simulado aceitou a mensagem e o RPC retornou `false`; `deliverQuoteConfirmationsNow` respondeu `email: sent`.

Aceite: distinguir aceite do provedor, confirmação de persistência e entrega final; validar o boolean da finalização; tratar resultado inconclusivo com reconciliação e sem reenviar automaticamente uma mensagem possivelmente aceita.

### R02 — Alta antes de ativar WhatsApp: possível reenvio após aceite sem finalização

Fonte: `api/notifications.ts:116` e `api/notifications.ts:161`. Referência: UX69.

Simulação: Meta aceita; finalização no banco falha; o job volta a ser elegível; nova tentativa chama o transporte com o mesmo destinatário e conteúdo. Foram observadas duas submissões idênticas ao provedor simulado. O código não fornece uma chave de idempotência nesse POST nem reconcilia o aceite anterior.

O teste não demonstra duas entregas na Meta real. Demonstra que a aplicação permite as duas submissões no cenário de retomada. O e-mail possui chave de idempotência, cuja janela/garantias do provedor também precisam ser confrontadas com a política de retry antes do aceite operacional.

Aceite: estado explícito de resultado ambíguo, correlação com o provedor e política de recuperação adequada a cada canal. Não prometer exatamente uma entrega com base apenas na unicidade da linha da fila.

### R03 — Alta antes de ativar notificações: quinta tentativa interrompida fica presa

Fonte: migration `20260912170000_add_quote_notification_outbox.sql:66`.

O filtro `attempts < 5` também limita a recuperação de `processing` expirado. No banco local, um job em `processing`, com cinco tentativas e atualização de vinte minutos atrás, não foi recuperado. Permaneceu `processing` sem terminalização ou alerta próprio.

Aceite: recuperação de processamento interrompido precisa distinguir nova tentativa de reconciliação/encerramento; a tentativa final deve chegar a estado terminal ou de revisão operacional. Cobrir interrupção antes do envio e depois do aceite do provedor.

### R04 — Média, defesa de concorrência: finalização não identifica a tentativa

Fonte: a mesma migration, função `finalize_site_notification_delivery`, condição na linha 145.

O UPDATE verifica somente ID e `status=processing`. Não exige token ou número da reivindicação. No banco local, um job expirado na tentativa 4 foi reivindicado para a tentativa 5; uma chamada no formato da tentativa anterior ainda conseguiu finalizá-lo.

O cenário foi injetado localmente; não é evidência de ocorrência em produção. Os timeouts atuais de 7/20 segundos são menores que a janela de recuperação de 10 minutos, o que reduz sua probabilidade no fluxo usual. O contrato do banco, porém, não impede um trabalhador antigo de finalizar a reivindicação seguinte.

Aceite: identificação da tentativa/lease, comparação na finalização e teste de concorrência com retorno tardio.

Reprodução conjunta R03/R04: [outbox.sql](audits/closure-review-20260912/outbox.sql), executado exclusivamente no container local, com `ROLLBACK`.

### R05 — Parcial: capacidade e prazo de recuperação da fila

Fontes: `api/notifications.ts:5`, `api/notifications.ts:231` e `vercel.json:5`.

O cron está configurado uma vez por dia, e o handler reivindica um lote de dez mensagens, sem drenar lotes adicionais. O backoff marca elegibilidade a partir de minutos, mas isso não cria um agendamento em minutos. O orçamento novo possui tentativa imediata; a limitação é principalmente da recuperação e do backlog.

Exemplo de capacidade, sem novas falhas: cem mensagens acumuladas exigiriam pelo menos dez execuções diárias somente desse cron. Duas mensagens por orçamento consomem duas posições. O tempo global de vinte segundos do lote pode ainda fazer os itens finais herdarem um sinal já abortado; esse esgotamento não foi simulado nesta rodada.

Aceite: definir prazo e volume esperados, estratégia de drenagem compatível com a hospedagem, monitoramento da idade da fila, alertas de falha e descarte/revisão dos jobs esgotados. Não anunciar recuperação em cinco minutos com a configuração atual.

### R06 — Parcial: confirmação não equivale à cópia integral do briefing

Fonte: `api/notifications.ts:86` e `api/notifications.ts:128`.

E-mail inclui nome, empresa, protocolo, produtos, quantidades e cores; não inclui todo o briefing, como ação, prazo, verba, observações e contexto. WhatsApp envia ao template apenas nome, protocolo e empresa; a lista de produtos não faz parte do payload. Não foi inspecionado um template real aprovado.

Aceite: definir se o produto oferece um comprovante resumido ou uma cópia integral; fazer o texto da interface corresponder ao conteúdo entregue. Para cópia, incluir os campos acordados ou acesso autenticado ao conteúdo, preservando privacidade e versionamento.

### R07 — Parcial: não há acompanhamento de entrega/bounce

Fontes: `api/notifications.ts`, inventário de `api/` e schema da fila.

Um HTTP aceito com ID do provedor resulta em `sent`. Não foram encontrados endpoints de webhook de entrega/devolução, validação de assinatura desses eventos ou estados específicos de entregue/devolvido. Portanto o código não comprova que a caixa postal recebeu a mensagem, e não satisfaz o aceite de bounce de LK45.

Aceite: callbacks autenticados, deduplicação e ordenação de eventos, estados de entrega/falha, observabilidade sem conteúdo pessoal e validação com destinatários controlados. Tratar aceite e entrega como eventos distintos.

R01/R02/R06 foram exercitados pelo [diagnóstico de notificações](audits/closure-review-20260912/notifications.mjs). R05/R07 são conclusões de inspeção, sem teste de carga ou envio real.

## As 12 referências classificadas como ausentes

| IDs | Entrega faltante | O que não a substitui | Aceite para implementação |
|---|---|---|---|
| UX34 | Conjunto de avaliação da relevância da busca | Testes de normalização e dicionário de sinônimos | Consultas e julgamentos comerciais, resultados esperados e avaliação reproduzível |
| UX59 | Seleções sincronizadas opcionalmente entre dispositivos | Histórico de orçamentos já enviados | Propriedade por conta, confirmação de merge e recuperação de falhas |
| UX60 | Ciclo de vida e conflitos de campanhas | Evento `storage` que substitui estado local | Versões, múltiplas campanhas, arquivar/restaurar e resolução de concorrência |
| UX65, LK43 | Upload privado de logo/referência | Campo “situação da identidade visual” ou bucket de propostas do comercial | Tipo/tamanho, upload autorizado, vínculo ao pedido, remoção e retenção |
| UX84 | Biblioteca operacional de PDF/revista | Dez coleções com `format: online` e labels de formatos possíveis | Arquivos reais, origem, edição, revisão, publicação, expiração e links válidos |
| LK10 | Categorias com entradas fotográficas | Ícones atuais | Imagens autorizadas, fallback e correspondência com destino |
| LK27 | Modelos de kits compostos | Produto já cadastrado como kit | Componentes reais e substituíveis por intenção |
| LK28 | Configurador de kit | Seleção comum ou grupo principal/alternativa | Troca de componentes e preservação do conjunto |
| LK29 | Aritmética de composição | Quantidade individual de SKU | Ex.: 100 kits × 2 cadernos = 200 cadernos, conferindo regras reais |
| GR40 | Benchmark de dez perguntas do Graphify | Grafo gerado e consulta possível | Comparação controlada com busca direta, acertos, omissões e tempo |
| GR44 | Diferença estrutural entre base/head | Artefato do grafo por commit | Comparação de commits, fontes e limites do impacto |

As doze referências se agrupam em onze linhas porque UX65 e LK43 se referem ao mesmo upload.

## Funcionalidades parciais por módulo

| Módulo | Implementação presente | Pendência concreta |
|---|---|---|
| Home/marca | Hero, quatro frases, Fold Text, entradas e vitrine | Antecipar produtos reais na hierarquia, reduzir repetição, validar compreensão e acervo autorizado |
| Navegação | Cabeçalho, menu móvel, busca, seleção e conta | CTA “Abrir radar”, guia de voz, consistência de modais/scroll e teste de localização com compradores |
| Busca/superfiltro | Sinônimos, correção sugerida, grupos por IDs, chips e URL | Dataset julgado, ranking por intenção/diversidade, taxonomia revisada e retorno à posição após carga assíncrona |
| Produto | Galeria/zoom, mínimo, cor, variantes e FAQ | Dados comparáveis por família, múltiplos comprovados, áreas/técnicas reais e relacionados contextualizados |
| Seleção | Persistência local, título, limite 50, grupos e desfazer | Várias campanhas, conflitos e sincronização; impressão longa com imagens ausentes/paginação |
| Compartilhamento | Token opaco, validade, leitura e revogação | Título/grupos/composição não são transmitidos; novo ciclo real criar → abrir → revogar não realizado nesta revisão |
| Briefing | Contexto, verba, datas, validação e idempotência | R08, anexos e passagem operacional do pedido para o especialista |
| Comprovantes | Fila, tentativa imediata, worker, Resend e Meta | R01–R07, provedores configurados, template aprovado e prova de recebimento |
| Conta e propostas | Login, histórico, versões, validade e acesso privado | Recuperação por e-mail real, ciclo comercial de publicação/ajuste e tratamento completo de troca de sessão |
| Catálogos | Biblioteca online com busca, filtros e capas de produtos | Arquivos PDF/revista, curadoria distinta por campanha, revisão e governança editorial |
| Datas | Próximas oportunidades, filtros, calendário/lista, favoritos e ICS | Calendários-alvo reais, reimportação, revisão editorial e continuidade entre dispositivos |
| Marketing/conteúdo | Landings, processo, redes e contato | Cases autorizados, bastidores, titulares/canais/horários e validação da operação anunciada |
| Métricas/SEO | Eventos permitidos, URLs privadas redigidas, metadados e 404 | Recepção/deduplicação efetiva, funil operacional e prévias específicas de coleção/data por parâmetros |
| Qualidade | Unitários, API, E2E, axe, pgTAP e orçamento de assets | Leitores de tela, dispositivos físicos, métricas de campo, restauração e cenários novos de resiliência |

Exemplos de diferenças importantes: favoritos locais não são sincronização; um link de WhatsApp não é mensagem automática; uma tabela de eventos não comprova que o especialista recebeu o pedido; um arquivo SQL aplicado não comprova que o provedor entregou a mensagem.

## Graphify: desvios e entregas restantes

Quatro itens possuem alternativa documentada, sem cumprimento literal: GR14 usa grafo não direcionado; GR24 oferece vizinhança em vez de dependentes direcionais; GR26 reconstrói todo o corpus em vez de extração incremental; GR30 não instala os hooks previstos. É necessário decidir formalmente se essas alternativas satisfazem o produto de engenharia ou implementar a especificação original.

Também permanecem: wrappers `path/explain`; passe semântico documental; cadeia requisito → código → teste → deploy mantida; benchmark; relatório base/head; filtros de paths/cache estrutural no CI; nomes de comunidades; testes de parser, disco, interrupção e lock; restauração/upgrade; inspeção completa de HTML e aliases. Os seis testes da ferramenta não cobrem todos esses aceites.

## Dependências externas: o que precisa existir fora do código

- Materiais/fotos/cases autorizados e identificação correta das capacidades comerciais: UX26/28, LK03/31–34/40.
- Pesquisa com compradores e validação de tarefas: UX20/91 e LK02. Auditoria técnica não é pesquisa com pessoas reais.
- Confirmação de remetente/domínio e credenciais Resend; número, token, versão de API e template Meta. A listagem de produção reconsultada contém `CRON_SECRET`, mas não as seis variáveis de provedores exigidas pelo código.
- Destinatários de teste controlados, demonstração de recebimento e fluxo de atendimento/publicação/ajuste. Nenhuma mensagem foi enviada nesta auditoria.
- Medições de campo e uso de leitores de tela, Safari/iOS e Android físicos. Ausência de equipamento/dados é registrada como limite.

Mesmo após resolver essas dependências, ainda será necessário implementar as entregas ausentes e corrigir os cenários reproduzidos.

## Banco, publicação e evidências de testes

A validação imediatamente anterior deste mesmo commit confirmou local = GitHub = deployment de produção; 15 versões de migrations locais/remotas iguais e dry-run sem pendências no Supabase isolado `xlzmclcjdncjfdrjxclt`. Isso comprova reconciliação do histórico; não é certificação de todo o schema, dado operacional ou comportamento.

Os checks reconsultados nesta revisão continuam: `validate`, `cross-browser`, `Migrations and pgTAP` e Graphify aprovados; **Supabase Preview falhou**. O motivo histórico refere-se ao reconhecimento das migrations pela integração. A causa atual do check externo não foi resolvida nesta revisão, e não se deve alterar ledger para fabricar aprovação.

| Evidência | Resultado | Origem/limite |
|---|---|---|
| TypeScript/build/assets | Aprovados | Validação anterior, mesmo commit sem alteração de aplicação |
| Vitest | 180 aprovados | Suíte anterior do mesmo commit; seis são de notificações |
| E2E Chromium | 72 aprovados, 4 skips | Suíte anterior do mesmo commit, transportes de teste |
| Firefox/WebKit | 66 aprovados, 10 skips | Registro do lote e check cross-browser aprovado |
| pgTAP | 118 aprovados | Banco local; 17 da fila, sem matriz completa de retomadas |
| Graphify | Atual, seis testes aprovados | Consulta nesta rodada e validação anterior do mesmo commit |
| R01/R02 | Reproduzidos | Funções reais transpiladas, `fetch` inteiramente simulado |
| R03/R04 | Reproduzidos | SQL real no container local, transação revertida |
| R08 | Reproduzido | Chromium, duas abas locais, logout via SDK com transporte interceptado |
| R05/R06/R07 | Lacunas identificadas | Inspeção de contrato/configuração; R06 também observa o payload simulado |

Os diagnósticos têm exit code zero quando reproduzem o comportamento descrito. Isso **não** significa que os defeitos estejam corrigidos nem que se tornaram testes de regressão aprovados do produto.

## Ordem recomendada de fechamento e critérios

1. **Sessão e dados pessoais:** corrigir R08 e incorporar regressões de troca de conta/logout; revisar também repetição e requisições em andamento.
2. **Integridade da fila:** fechar R01/R03/R04 com contrato de tentativa, boolean validado e recuperação terminal. Manter migration aditiva exclusiva do site, testes locais e compatibilidade do deployment.
3. **Entrega transacional:** fechar R02/R05/R06/R07, definir conteúdo/canais/SLA e provar aceite, entrega, falha e recuperação em destinatários controlados. Configurar provedores após esses critérios.
4. **Operação comercial:** confirmar encaminhamento de pedido/ajuste, responsável, prazo e ciclo real até proposta privada. Verificar histórico de execução e falhas do cron.
5. **Continuidade:** campanhas independentes, sincronização opcional, conflitos, arquivar/restaurar e semântica do compartilhamento.
6. **Expansões de produto:** upload privado e composição de kits com aritmética/contratos próprios.
7. **Curadoria e conteúdo:** conjunto julgado de busca, imagens, arquivos de catálogo, revisão de datas/cases e material autorizado.
8. **Aceite transversal:** acessibilidade manual, dispositivos físicos, performance de campo, recepção de métricas, recuperação e check externo Supabase Preview.
9. **Graphify:** decidir as quatro alternativas e fechar o restante da matriz de engenharia sem transformá-la em dependência do site público.

Cada entrega deve fechar código, testes, ativação e evidência operacional aplicável. O próximo lote prioritário é R08 e a integridade das notificações; um novo redesign não encerra essas pendências.

## Artefatos

- [Matriz revisada, 230 referências](MATRIZ_FECHAMENTO_PLANOS_20260912.csv).
- [Contagens e mudanças de classificação](audits/closure-review-20260912/matrix-summary.json).
- [Reprodução, ambiente e resultados](audits/closure-review-20260912/README.md).
- [Gerador auditável da matriz](audits/closure-review-20260912/build-matrix.mjs).

Documentos históricos permanecem preservados como fotografias de suas versões. Esta revisão os sucede para o commit auditado e registra expressamente as correções e novas lacunas.
