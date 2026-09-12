# Revisão de implementação — Promo Brindes — 12/09/2026

## Conclusão

**Não implementamos integralmente os planos. Não há evidência para declarar o projeto encerrado ou “10/10”.** Há correções efetivas, funções parcialmente construídas e funções que dependem de operação, conteúdo autorizado ou credenciais. A auditoria abaixo registrou uma falha crítica na publicação; ela foi endereçada no lote de estabilização descrito a seguir e precisa de confirmação pós-deploy.

O levantamento inicial foi uma auditoria. Depois de sua aprovação, este mesmo documento recebeu o lote de estabilização local; nenhuma migration, configuração remota ou dado de cliente foi alterado. O Promo Gifts e seu banco de origem não foram modificados.

### Lote de estabilização após a auditoria

Implementado localmente, com testes de regressão:

- A01: o shell agora vem da origem pública canônica, recusa redirects/HTML de autenticação e valida `#root` + assets antes de renderizar metadados. Não depende mais de `VERCEL_URL` protegido.
- A02: quantidade da ficha usa rascunho e validação em blur/Enter/adição; apagar e digitar `250` com mínimo 50 mantém `250`.
- A03: variantes ausentes preservam seu ID e quantidade, produtos removidos são informados e a duplicação fica bloqueada até revisão; nenhuma referência é unificada como “sem-cor”.
- A06: onboarding deixou de impor `perfil=kits`; kits continuam em entrada própria.
- Cobertura adicionada para os quatro comportamentos em unitários/API e browser desktop/mobile.

Essas mudanças precisam ser publicadas e verificadas no alias real antes de reclassificar a falha de produção como encerrada. Migrations remotas, notificações transacionais, anexos privados, campanhas remotas e configurador de kits continuam abertos.

### Escopo e rastreabilidade

- Repositório: `adm01-debug/Promo_Brindes_V1`.
- Commit auditado: `561a5488cdbb146724b25d3d598b7f29aecb8358`. `git ls-remote` confirmou o mesmo SHA no `main` remoto.
- Site observado: `https://promo-brindes-v1.vercel.app`.
- Banco do site: `xlzmclcjdncjfdrjxclt`; origem de catálogo: `doufsxqlfjyuvxuezpln`, sem alteração.
- Planos rastreados: [UX, 100 etapas](PLANO_UX_100_ETAPAS_20260909.md), [benchmark Lukka, 50 etapas](LUKKA_BENCHMARK_PLANO_50_ETAPAS_20260909.md), [Graphify, 50 etapas](PLANO_GRAPHIFY_50_ETAPAS_20260911.md) e [portal do cliente, 30 etapas](CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md).
- [Matriz desta revisão — 230 referências](MATRIZ_REVISAO_ATUAL_20260912.csv). São referências sobrepostas entre planos, não 230 funcionalidades independentes.
- A matriz anterior é mantida como histórico; observações como “ainda local”, “limite de oito” e “404 editorial retorna 200” não descrevem mais, isoladamente, o HEAD atual.

Foram reavaliadas 92 referências por evidência de código, testes ou estado remoto; outras 138 conservam a avaliação documental anterior, explicitamente marcadas **sem reteste integral do aceite**. Não afirmo ter executado 230 testes de aceitação independentes. Os módulos de catálogos e datas estão cobertos pelas referências acima; não foi localizada uma lista autônoma que permita certificar literalmente cada uma das 50 etapas originalmente solicitadas para cada módulo.

### Leitura correta dos estados

| Estado de implementação | Referências | Significado |
|---|---:|---|
| I — implementado no escopo técnico registrado | 84 | Não significa funcionamento remoto integral certificado |
| P — parcial | 116 | Há base implementada, mas faltam comportamento, integração ou aceite |
| N — não implementado | 15 | A função esperada não foi encontrada operacionalmente |
| E — dependência externa | 11 | Exige material, validação humana ou operação que não pode ser presumida |
| A — alternativa arquitetural | 4 | Entrega estrutural diferente da função originalmente prevista; não contar como conclusão equivalente |

Não transformar esses números em percentual de progresso: esforço, criticidade e sobreposição variam. A falha de publicação afeta funções cujo código pode continuar corretamente classificado como implementado.

## 1. Evidências e limites dos testes

| Verificação | Resultado | O que não comprova |
|---|---|---|
| Vitest executado nesta rodada | 33 arquivos, 161 testes aprovados | Todos os cenários de negócio e runtime da Vercel |
| pgTAP executado no banco local | 2 arquivos, 101 testes aprovados | Migrations/policies efetivamente presentes no remoto |
| CI do commit: Chromium | 64 aprovados, 4 excluídos | Dispositivo físico e backend real em cada cenário |
| CI do commit: Firefox + WebKit | 58 aprovados, 10 excluídos | Safari/iOS físico; exclusões não são testes aprovados |
| Build, types e orçamento de assets | Check `validate` aprovado | Experiência real/CWV e HTML correto na hospedagem |
| Auditoria de dependências no CI | Nenhuma vulnerabilidade reportada naquele run | Ausência de falhas de segurança na aplicação |
| Graphify | Mapa atual, 1.045 nós e 2.299 arestas; workflow aprovado | Relações direcionais ou schema remoto aplicado |
| Smoke HTTP do alias público | Home correta; diversas rotas com HTML estrangeiro | Status 200, sozinho, não é sucesso |
| Chromium no alias público | Home com aplicação; `/catalogo` com títulos “Log in to Vercel” | Não foi uma anomalia exclusiva de um HEAD request |
| Dry-run administrativo do banco | Falhou com 403, privilégios insuficientes | Não permite afirmar quais migrations faltam remotamente |

Fontes remotas: [Quality/validação e navegadores](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/34689975892), [migrations e pgTAP no CI](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/34689975864), [Graphify no CI](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/34689975865).

No endpoint de checks do commit foram observados **quatro checks aprovados e um reprovado**: `cross-browser`, `validate`, `Migrations and pgTAP` e `Build structural Graphify map` aprovados; `Supabase Preview` reprovado. Três workflows aprovados não significam todos os checks verdes.

Os testes de banco rodam no ambiente local. Os ensaios adicionais de seleção/quantidade usaram produtos e respostas sintéticos no navegador local, sem criar solicitações ou enviar mensagens a clientes. O portal possui evidência histórica de testes reais em 09/09; ela não foi apagada nem considerada prova automática do estado de 12/09.

## 2. Defeitos e lacunas prioritários

### A01 — Crítico: HTML de autenticação da Vercel servido como página do site

**Reproduzido no alias público, inclusive em Chromium.**

| Rota | HTTP | Root React do site | HTML de proteção/login |
|---|---:|---|---|
| `/` | 200 | Presente | Não |
| `/index.html` | 200 | Presente | Não |
| `/catalogo` | 200 | Ausente | Sim |
| `/catalogos` | 200 | Ausente | Sim |
| `/datas-comemorativas` | 200 | Ausente | Sim |
| `/minha-conta` | 200 | Ausente | Sim |
| `/entrar` | 200 | Ausente | Sim |
| `/ideias/nao-existe` | 404 | Ausente | Sim |
| `/produto/produto-inexistente-auditoria` | 404 | Ausente | Sim |

Os títulos das rotas já são da Promo Brindes e as rotas privadas amostradas já possuem `X-Robots-Tag: noindex, nofollow, noarchive`. Isso mascara a falha se o teste verificar apenas status, title e canonical. Não foi certificado nesta rodada o acesso direto a um produto existente; o mesmo carregador é compartilhado pelas páginas de produto.

**Causa no código:** `api/_lib/publicProductPage.ts:69` prefere `VERCEL_URL` em `deployedAppOrigin()`. Em `loadAppShell()` (linha 113), a função busca `/index.html` nesse endereço de deployment, segue redirecionamentos e aceita qualquer resposta HTTP bem-sucedida. Não verifica se a origem final, conteúdo e assets pertencem à aplicação. O endereço protegido redireciona para autenticação; o HTML final é aceito. `api/site-page.ts` injeta metadados da Promo Brindes nesse corpo estrangeiro.

**Impacto:** entrada por link, resultado de busca e reload podem impedir descoberta, consulta e acesso à conta. Navegação interna já iniciada pela home pode escapar da falha por usar o roteador SPA; isso é uma inferência arquitetural, não um aceite completo dessa jornada.

**Por que escapou:** `tests/api/site-page.test.ts` simula sempre um shell correto. O Playwright usa build/preview do Vite, não as functions/rewrites reais da Vercel. Falta um gate pós-deploy que confirme raiz da aplicação, assets próprios e conteúdo da rota, além de status/metadados.

**Correção proposta, não executada nesta auditoria:** definir uma fonte confiável do shell vinculada à versão publicada, evitar aceitar redirecionamento/HTML de autenticação, validar o conteúdo e manter fallback controlado. Preferir estudar distribuição do shell com a function/build; simplesmente trocar pelo alias pode buscar assets de outra versão durante promoção. Testar também timeout, HTML inesperado, redirect, 404 e ausência de assets; renovar os caches envolvidos após publicação.

**Retificação:** a explicação anterior de que bastaria desativar o SSO da Vercel era incompleta. Não é necessário presumir que a proteção de deployments deva ser removida: o defeito confirmado está no modo como o site carrega e aceita seu HTML-base.

Referências afetadas: UX06/19/58/73/97/99/100, LK48/50, AC28/30 e acesso direto aos módulos dependentes.

### A02 — Alto: edição de quantidade corrigida no drawer, mas não na ficha

- Fonte: `src/pages/ProductPage.tsx:201`.
- Cenário local em Chromium: produto com mínimo 50; apagar o campo; digitar `250` com eventos de teclado sucessivos.
- Resultado observado: **50250**, não 250.
- Causa: o valor é imediatamente limitado ao mínimo em cada `onChange`, alterando o texto intermediário antes de a pessoa terminar.
- A implementação por rascunho/validação ao sair do campo já existe no drawer. A correção não foi propagada a todos os pontos de edição.

Aceite faltante: digitação natural, seleção/substituição de texto, vazio temporário, colar, blur, mínimo desconhecido, limites, botões e submissão tanto na ficha quanto na seleção. Usar teste de teclado sucessivo, não somente `fill('250')`.

Referências: UX46, LK23, UX99.

### A03 — Alto: variantes ausentes podem perder identidade e quantidade

- Fontes: `src/lib/sharedSelection.ts:242` e `src/lib/quoteItems.ts:74`.
- Entrada simulada: mesmo produto, variante azul com 100 unidades e verde com 200; catálogo atual sem essas variantes.
- Resultado observado: um item `sem-cor` com **200 unidades**, em vez de duas referências que totalizavam 300.
- Causa: a hidratação usa somente a variante encontrada no catálogo atual; ambas viram a mesma chave. A normalização deduplica pela chave usando o maior valor, não a soma.
- Produto ausente também é descartado pela hidratação; não há discriminação por referência ausente no retorno dessa função. A página só conhece a lista reidratada, prejudicando a comunicação de perdas parciais.

Não corrigir simplesmente somando tudo: variantes distintas e duplicações acidentais são situações diferentes. O contrato precisa preservar as referências originais indisponíveis, sinalizar o que mudou e exigir revisão antes de adicionar/enviar. Também considerar mínimo atualizado e produto removido sem depender de estoque de fornecedor.

Referências: UX45 reclassificado de I para P; UX56/57/78, LK37, AC23.

### A04 — Alto: equivalência das migrations remotas não comprovada

Existem 14 arquivos de migration no diretório versionado `site-supabase/supabase/migrations`. Os dois finais de retenção são:

- `20260911180000_expand_shared_selection_retention.sql`;
- `20260911190000_harden_retention_metadata.sql`.

O guard confirmou o destino isolado. `npm run db:site:dry-run` retornou erro administrativo 403 de privilégios insuficientes. O check `Supabase Preview` informa `Remote migration versions not found in local migrations directory.`

**Conclusão permitida:** há um problema de integração/ledger que exige reconciliação. **Conclusões não permitidas:** “todas aplicadas”, “exatamente duas faltam” ou “basta marcar como aplicada”. O check pode envolver o ambiente de preview; sua mensagem não substitui inventário do schema de produção.

Aceite faltante: acesso administrativo efetivo ao projeto isolado; leitura do ledger e de `pg_catalog`; comparação das definições/RLS/GRANTs/triggers/funções; identificação da origem de cada divergência; decisão revisada de aplicação/reparo; smoke após a mudança. Não usar PostgREST/OpenAPI como auditoria de schema. Não alterar o banco de origem do Promo Gifts.

Referências: UX79/80/98/100, LK50, AC12–27 no que depende do estado remoto.

### A05 — Alto: cobertura de testes não acompanha o ambiente de publicação

As suítes verdes coexistem com A01–A03. Isso é uma lacuna concreta de cobertura, não evidência de que testes são inúteis.

Aceite faltante:

1. Smoke do deployment promovido com conteúdo real, root, assets e navegação por entrada direta.
2. Teste do shell com HTML de autenticação, redirecionamento e status 200 enganoso.
3. Edição natural de quantidade em cada componente.
4. Seleção compartilhada com referências removidas, variantes renomeadas/ausentes e mínimo alterado.
5. Regressões de rede após persistência, sessão expirada, abas concorrentes e APIs limitadas.
6. Exclusões browser documentadas por razão; não somá-las aos aprovados.

Referências: UX03/10/94/95/99/100, LK46/50, AC30.

### A06 — Médio: curadoria e busca implementadas, relevância ainda parcial

Sinônimos, finder, perfis, filtros e ordenação existem. A correção de onboarding no finder não cobre todas as entradas: `src/lib/ideaLandings.ts` e `src/lib/catalogLibrary.ts` ainda encaminham onboarding com `perfil=kits`.

Isso pode ser uma escolha editorial legítima para uma coleção de kits, mas não cumpre automaticamente a intenção mais ampla “presentear no onboarding”. Falta distinguir intenção ampla de coleção restrita, alinhar títulos/resultados e testar uma amostra julgada pelo comercial, com termos, erros, objetivos e resultados esperados.

Não filtrar todos os produtos pelo estoque: a orientação do usuário permanece válida. Relevância comercial e situação de estoque são critérios distintos.

Referências: UX24/31–35/40/49/83, LK14/17/20/36.

### A07 — Alto: persistência não equivale a entrega de e-mail/WhatsApp ou atendimento

`README.md:67` informa que confirmações automáticas não estão habilitadas. `api/_lib/siteDatabase.ts` persiste o lead e devolve protocolo/duplicidade; isso não é uma cadeia de entrega de mensagem.

Não foi encontrada a implementação operacional completa de cópia automática da solicitação: fila/outbox alimentada, consumidor, provedor, retries, idempotência de entrega, falhas definitivas e confirmação ao destinatário. A tabela `notification_deliveries` sozinha não entrega isso. E-mail de autenticação e link `mailto` também não são recibo do orçamento. WhatsApp aberto pelo visitante não é disparo automático.

Por isso UX68/69 e LK45 passam de dependência externa para **não implementado**, com dependências externas adicionais. Não é apenas “inserir uma chave”.

Também permanece sem aceite atual o ciclo comercial completo: solicitação → responsável recebe → proposta publicada → cliente abre PDF privado → solicita ajuste → responsável recebe o ajuste. Histórico, RPC e URL assinada implementados são partes desse ciclo.

Aceite faltante: escolher provedores/remetente/número com o usuário, acordar conteúdo e consentimento, implementar entrega resiliente, usar destinatários de teste autorizados e demonstrar o recebimento e o tratamento de falhas. Não iniciar envios reais durante uma auditoria.

Referências: UX67–70/75–77, LK45, AC24/30.

### A08 — Funcionalidades sugeridas ainda não construídas integralmente

| Função desejada | O que existe | O que falta | Referências |
|---|---|---|---|
| Montagem de kits | SKU identificado como kit e coleção de kits | Modelo de componentes, substituição, quantidade de kits × unidades, composição versionada | LK26–30 |
| Logo/referência enviada pelo cliente | Campo sobre estado da identidade; PDF comercial privado | Upload privado, validação/inspeção, titularidade, retenção e remoção | UX65, LK43 |
| Várias campanhas salvas | Uma seleção local com título/contexto | Biblioteca por conta, criar/duplicar/arquivar/restaurar campanhas | UX53/59/60 |
| Sincronização entre dispositivos | Sessão/armazenamento local e histórico de pedidos | Persistência remota de rascunhos, merge e resolução explícita de conflitos | UX02/59/60/88 |
| PDF/revista de catálogo governados | Dez coleções de formato online e modelo de tipos | Arquivos/publicação, revisão, validade, downloads e manutenção editorial | UX81/83/84 |
| Relevância de busca comprovada | Sinônimos e testes de normalização | Dataset julgado e critérios de relevância acordados | UX34 |
| Categorias fotográficas | Navegação/categorias com ícones e imagens de produtos em outros blocos | Composição fotográfica específica prevista no benchmark | LK10/12 |

As preferências por grupos de decisão no orçamento não substituem um configurador de kits. Uma biblioteca de pedidos enviados não substitui campanhas em rascunho. Tipos TypeScript `pdf`/`digital` não substituem publicações nesses formatos.

### A09 — Aceites humanos/operacionais ainda pendentes

- Cases, depoimentos, bastidores e imagens de pessoas com autorização; não inventar prova social ou capacidade produtiva.
- Validação de vocabulário, compreensão e tarefas com compradores reais. Simulação de persona não equivale à pesquisa com participantes.
- Matriz comprovada de personalização por família/produto e afirmações ambientais respaldadas.
- Leitor de tela, zoom/reflow, teclado virtual e dispositivos físicos. Axe e emulação não certificam tudo isso.
- CWV de campo por dispositivo, observação do funil real, minimização e deduplicação no destino das métricas.
- Importação de ICS em calendários reais, ciclo anual dos favoritos e paginação de PDFs/seleções longas impressas.
- SLA, responsável comercial, preferências/direitos do cliente, rotina editorial e exercício de recuperação.

Não classificar toda pendência de evidência como “código ausente”; também não certificar qualidade sem a evidência exigida pelo próprio plano.

### A10 — Graphify: camada estrutural entregue; plano de 50 etapas não encerrado

Confirmados: wrapper, geração AST local, exclusões, mapa, status, consulta, vizinhança de impacto, limites e workflow. As instruções impedem acesso ao Promo Gifts/bancos durante geração.

Ainda não equivalentes ao plano integral:

- Relações e impacto direcionais: formato atual é não direcionado.
- Atualização incremental: wrapper reconstrói o mapa.
- Hooks Git: integração existente prioriza wrapper/CI; não afirmar hooks entregues.
- Conjunto completo `query/path/explain` e explicações por caminho.
- Rastreabilidade semântica requisito → código → teste → SQL → flag → deploy.
- Benchmark de utilidade/precisão e relatório comparativo base/head.
- Aceite integral de concorrência, recuperação, upgrades e qualidade das relações.

As quatro alternativas arquiteturais devem permanecer explícitas. É razoável manter a solução estrutural segura, mas encerrar as etapas originais exige revisão de escopo com o usuário, não renomear ausência como implementação.

## 3. Correções anteriores que continuam válidas

| Item anterior | Evidência atual | Limite da conclusão |
|---|---|---|
| R01: seleção de 50 mostrava oito | Browser local pediu e exibiu 50 produtos sintéticos | Referências removidas continuam em A03 |
| R02: payload longo herdava limite da URL | Caminho persistente separado; teste de 50 variantes com 96 caracteres passou | Não afirmar ensaio de todos os limites possíveis |
| R03: gestão pulava links após remover chave | Fotografia das chaves e tratamento por registro; testes expirado/corrompido/ativo aprovados | Não prova retenção remota |
| R04: troca SPA para link revogado retinha itens acionáveis | Simulação: zero itens, duplicação desabilitada | Abertura direta remota continua em A01 |
| Quantidade no drawer | Rascunho/validação posterior implementados | Ficha não recebeu a mesma correção, A02 |
| Metadata e HTTP | Títulos específicos, noindex privado amostrado, 404 editorial | Corpo da página errado, A01 |
| Verba e contexto | Escopo validado e duplicação limpa contexto anterior; contratos aprovados | Não comprova atendimento e mensagens |
| Autocomplete, modal e analytics | Correções versionadas no HEAD; testes pertinentes passam | Acessibilidade manual e coleta real ainda parciais |
| Badges e frases | Regra de badge único e textos de marca preservados | Não prova todo o redesign/aceite do usuário |

Não reabrir R01–R04 como se as correções não existissem. A revisão anterior misturava alguns apontamentos anteriores ao commit com conclusões posteriores; esta matriz atualiza essa distinção.

## 4. Ordem recomendada para encerrar as lacunas

Esta sequência é uma recomendação para o próximo lote, não autorização autogerada para executar infraestrutura.

1. **Restaurar entrada direta em produção:** A01 e gate de hospedagem de A05. Aceite: rotas públicas e privadas carregam a aplicação; inexistentes exibem a tela correta com 404; nenhum HTML de login de terceiro incorporado.
2. **Eliminar alteração/perda de seleção:** A02–A03. Aceite: digitação natural exata e referências indisponíveis comunicadas sem perda silenciosa.
3. **Reconciliar o banco isolado com evidência:** A04. Aceite: acesso válido, ledger/catalog comparados, aplicação/reparo revisados, checks/smoke coerentes. Não migrar às cegas.
4. **Fechar ciclo de orçamento:** retries pós-persistência, ajuste, responsável comercial e proposta privada; só então ativar cópias automáticas com provedores/destinatários acordados.
5. **Completar as funções ausentes por lote:** campanhas remotas, anexos, kits e biblioteca PDF/revista, com contrato e privacidade definidos antes das migrations.
6. **Validar descoberta e operação:** relevância, material autorizado, acessibilidade humana, calendários, desempenho e métricas reais.
7. **Fechar Graphify por escopo explícito:** decidir o que continua estrutural e o que será expandido, sem usar o grafo para certificar deployment/banco.

Cada lote precisa registrar: requisito → arquivos → cenário → resultado local → commit remoto → verificação na hospedagem/banco pertinente → pendências. Publicar não é equivalente a funcionar; ter teste não é equivalente a cobrir todos os critérios.

## 5. Encerramento desta auditoria

- Código local e `main` remoto coincidem no commit auditado.
- Testes locais executados passaram, com limitações acima.
- Há defeito de produção confirmado e divergência administrativa/ledger ainda sem solução demonstrada.
- Não houve envio de orçamento, e-mail ou WhatsApp de teste a pessoas reais nesta rodada.
- Não foram reutilizados/expostos tokens do histórico nos artefatos. Credenciais administrativas já compartilhadas em conversa devem ser rotacionadas e fornecidas por armazenamento seguro; gerar outro token da mesma conta não necessariamente muda suas permissões.
- Os arquivos desta auditoria são locais; não foram commitados nem publicados como parte de uma solicitação de revisão.

**Decisão: planos continuam abertos. Prioridade imediata é a página correta chegar ao cliente, seguida de integridade da seleção e comprovação do banco isolado.**
