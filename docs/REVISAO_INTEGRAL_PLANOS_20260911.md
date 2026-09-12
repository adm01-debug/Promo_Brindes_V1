# Revisão integral de implementação — Promo Brindes

Data: 11/09/2026. Código auditado: `7104660`.

> Registro histórico. Para o estado posterior em `90761ab` e as alterações locais ainda não publicadas, consulte a [revisão atual](REVISAO_IMPLEMENTACAO_ATUAL_20260911.md) e sua matriz de rastreabilidade. Os achados e números abaixo não devem ser interpretados como validação atual de produção.

## 1. Conclusão executiva

**Não implementamos integralmente todos os planos.** Há uma base funcional relevante, mas também funções ausentes, entregas parciais, critérios de aceite sem comprovação e defeitos reproduzidos em funcionalidades já publicadas. Aprovação de testes existentes não equivale a aprovação de todos os requisitos.

Esta revisão confronta **100 etapas UX, 50 etapas do benchmark Lukka, 50 etapas Graphify e 30 checkpoints da área do cliente**. São 230 referências com sobreposição, não 230 funcionalidades independentes. Não atribuí nota 10/10 nem percentual de conclusão do produto.

Principais pendências:

- Compartilhamento persistente: estado de carregamento incorreto, substituição silenciosa da seleção e perda do acesso à revogação após recarga.
- Privacidade: sanitização de analytics preserva identificadores de solicitações no caminho; `noindex` das páginas sensíveis não aparece no HTML inicial observado.
- Operação comercial: cópia automática por e-mail/WhatsApp, entrega operacional ao atendimento e publicação de propostas não estão comprovadas como fluxo completo.
- Funcionalidades ausentes: construtor de kits, anexos do cliente, várias seleções com sincronização por conta e gestão de conflitos.
- Curadoria: campanhas diferentes ainda convergem para filtros amplos; falta avaliação de relevância com consultas e produtos reais.
- Graphify: integração estrutural útil, mas não entrega integralmente direção de dependências, atualização incremental, enriquecimento semântico e comparação base/head.
- Publicação: Vercel está Ready, mas o check **Supabase Preview está falhando**. A causa ainda exige investigação; não pode ser considerada resolvida apenas porque o deploy web funciona.

## 2. Escopo, método e limites

Repositório analisado: `Promo_Brindes_V1`. Site observado: `https://promo-brindes-v1.vercel.app`. Banco administrativo em escopo: `xlzmclcjdncjfdrjxclt`.

O projeto interno Promo Gifts e seu banco canônico `doufsxqlfjyuvxuezpln` **não foram alterados**. Nesta revisão não apliquei migrations, não publiquei código, não criei clientes/orçamentos remotos e não alterei configurações de produção. As interações de criação/duplicação usadas nos testes de navegador tiveram respostas interceptadas e dados sintéticos locais.

Usei o Graphify para orientação estrutural e confirmei conclusões no código. O mapa foi atualizado localmente em artefatos ignorados pelo Git: 1.006 nós, 2.205 relações não direcionais, 135 arquivos de código. Esses números medem estrutura extraída, não cobertura funcional.

Fontes dos planos:

- [Plano UX — 100 etapas](PLANO_UX_100_ETAPAS_20260909.md).
- [Benchmark Lukka — 50 etapas](LUKKA_BENCHMARK_PLANO_50_ETAPAS_20260909.md).
- [Graphify — 50 etapas](PLANO_GRAPHIFY_50_ETAPAS_20260911.md).
- [Área do cliente — 30 checkpoints](CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md).
- [Estratégia UX](UX_STRATEGY.md), [benchmark Freeshop](FREESHOP_BENCHMARK_20260909.md), [movimento](REACT_BITS_MOTION_AUDIT.md) e [relatório de experiência](RELATORIO_EXPERIENCIA_MARKETING_GEN_Z_20260909.md).

Não localizei documentos autônomos contendo os 50 itens originais de catálogos e os 50 de datas comemorativas citados no histórico. Seus módulos e os requisitos presentes nos planos disponíveis foram revisados; **não é possível certificar itens de documentos ausentes**. Também não tratei um pedido adiado de posicionamento de texto institucional como entrega obrigatória já encerrada.

### Classificação

| Código | Significado |
|---|---|
| I | Implementação identificada, coerente com o requisito no recorte inspecionado e apoiada em código/testes. Não certifica todos os dispositivos ou toda a operação remota. |
| P | Parcial: existe implementação, mas falta parte do comportamento, evidência de aceite ou há defeito relacionado. |
| N | Não encontrei implementação correspondente no repositório auditado. Não significa impossibilidade técnica. |
| E | Depende principalmente de decisão, conteúdo, acesso ou operação externa ainda não comprovada. Não conta como entregue. |
| A | Foi adotada alternativa técnica diferente do plano original. Precisa aceite explícito de escopo; não conta como cumprimento literal. |

“Não comprovado” não significa “certamente nunca ocorreu”. Significa que não há evidência suficiente para encerrar o requisito nesta revisão. Os status consideram o critério de aceite original, não apenas a presença de uma tela ou tabela.

### Contagem das classificações

Contagens conferidas contra todas as linhas, sem IDs ausentes ou duplicados:

| Plano | I | P | N | E | A | Referências |
|---|---:|---:|---:|---:|---:|---:|
| UX | 32 | 57 | 5 | 6 | 0 | 100 |
| Lukka | 12 | 25 | 5 | 8 | 0 | 50 |
| Graphify | 18 | 26 | 2 | 0 | 4 | 50 |
| Área do cliente | 21 | 9 | 0 | 0 | 0 | 30 |

Não somar essas colunas para estimar percentual do produto: há requisitos repetidos, critérios de esforços muito diferentes e itens P cuja pendência é validação, não ausência de código.

## 3. Validações realizadas nesta revisão

| Validação | Resultado e limite |
|---|---|
| Vitest | **141 testes aprovados, 29 arquivos**, com `npm run test -- --maxWorkers=2`. |
| Primeira execução Vitest | Teve sete falhas de inicialização de workers por timeout. Não foi contabilizada como sucesso; a execução limitada acima terminou sem erros. |
| Banco local | `npm run db:site:test`: **96 asserções pgTAP aprovadas**. Não equivale a executar a suíte destrutiva no banco remoto. |
| Graphify | `npm run test:graphify`: **6 testes aprovados**. |
| TypeScript e build | `npm run build`: aprovados, incluindo `tsc -b`. |
| Orçamento de assets | Aprovado: CSS 156,3 KiB, JS total 806,3 KiB, entrada 351,8 KiB. Não é medição de Core Web Vitals em campo. |
| Navegador com cenários adicionais | Reproduzidos carregamento inválido prematuro, substituição sem confirmação e revogação inacessível após reload. APIs de criação foram simuladas. |
| HTML de produção | Verificados títulos, robots e status de rotas públicas, privadas e inválidas descritas abaixo. |
| GitHub no HEAD | `validate`, `Migrations and pgTAP` e `Build structural Graphify map`: success. `Supabase Preview`: failure. |
| Vercel | Deployment `dpl_6qiYH2ArVRYxUSm7Lh7mPAQ9Gy2f` observado Ready e associado ao domínio principal. Ready não elimina falhas funcionais. |
| Banco remoto, somente leitura | Consulta administrativa via `pg_catalog` verificou RLS e permissões das tabelas/funções de compartilhamento. Detalhamento abaixo. |

A suíte Playwright completa não foi reexecutada nesta revisão. Seu código e o resultado do CI foram inspecionados; os novos cenários foram executados separadamente. Não há validação nova em aparelhos físicos, leitores de tela ou com compradores reais.

### Banco e migrations: implementação não é a mesma coisa que operação

A última reconciliação administrativa registrada no trabalho anterior encontrou 12 migrations alinhadas no banco isolado e dry-run sem pendências, após aplicar `20260911170000_add_revocable_shared_selections.sql`. Isso é evidência anterior, não uma nova aplicação nesta revisão.

A leitura remota atual confirmou:

- RLS ativo em `site_private.shared_selections` e `site_private.shared_selection_rate_limits`.
- `anon` e `authenticated` sem SELECT direto nessas tabelas.
- Funções públicas create/read/revoke de compartilhamento sem EXECUTE para `anon`/`authenticated` e com EXECUTE para `service_role`.
- Essas três funções são `security invoker`, com `search_path` vazio. Não confundir com RPCs do portal que usam outro modelo.

Isso valida esse subconjunto, **não** uma auditoria completa de todos os triggers, policies, grants, backups ou execuções de retenção do projeto.

O check de integração retorna: `Remote migration versions not found in local migrations directory.` Não há evidência suficiente para atribuir definitivamente o erro ao working directory, a versões antigas ou ao serviço. O diretório configurado pelo usuário deve ser conferido contra o branch e os logs efetivamente usados pela integração. Não executar `migration repair`, renomear arquivos aplicados ou apagar histórico com base em hipótese.

## 4. Defeitos e lacunas prioritários

### F01 — “Link inválido” aparece enquanto a seleção ainda carrega

**Prioridade alta · reproduzido · UX 06/57/99; Lukka 37.**

Em [SharedSelectionPage](../src/pages/SharedSelectionPage.tsx), o primeiro efeito inicia a consulta persistente. O segundo encontra `payload` vazio e executa `setLoading(false)` antes da resposta. A tela conclui prematuramente que o link é inválido.

Simulação: abrir link persistente com UUID sintético, interceptar a leitura e manter a resposta pendente. Resultado observado: `invalidState: true`, `loading: false`.

Aceite para correção: estados distintos para consulta do link e hidratação dos produtos; nenhuma tela inválida enquanto uma consulta necessária estiver pendente; testes para demora, expiração, revogação, falha, resposta vazia e troca de link durante a requisição.

### F02 — Duplicar uma seleção apaga os itens atuais sem confirmação

**Prioridade alta · reproduzido · UX 52/53/57/60; Lukka 37.**

`duplicate()` chama `cart.replaceItems(items)` diretamente. O reducer substitui itens, mas mantém nome e contexto da campanha anterior. Não é o mesmo fluxo de “solicitar novamente” do histórico, que tem confirmação.

Simulação: seleção local “Campanha anterior QA” com produto A; abrir link com produto B; clicar “Duplicar e ajustar”. Resultado: apenas B permanece, sem confirmação, com o título anterior. Além da perda de trabalho local, o contexto pode passar a descrever produtos de outra campanha.

Aceite: escolher substituir/mesclar/criar nova seleção de forma explícita, preservar o original até confirmação e atualizar ou limpar metadados de campanha de forma atômica. Cobrir cancelamento e recuperação.

### F03 — Revogação prometida não permanece acessível após recarregar

**Prioridade alta · reproduzido e confirmado no código · UX 56/57/79; Lukka 37.**

Em [QuoteDrawer](../src/components/QuoteDrawer.tsx), o botão depende de `persistentShareToken`, guardado apenas em `useState`. A chave administrativa fica em localStorage, mas não existe restauração/lista de links gerenciáveis.

Simulação: criar link com API interceptada; botão existe; recarregar e abrir a seleção. Resultado: zero botões de revogação, embora a chave ainda esteja armazenada. Gerar outro link também deixa o anterior fora desse controle.

Há um segundo problema estático em [sharedSelection](../src/lib/sharedSelection.ts): falha de localStorage é ignorada, o segredo de gerenciamento não é devolvido nem mantido em memória e revogar depende exclusivamente do armazenamento. O comentário que promete funcionamento na sessão não corresponde ao código.

Aceite: gerenciamento recuperável dos links, estado de expiração/revogação, fallback seguro para armazenamento indisponível e nunca anunciar revogabilidade que a interface não permite exercer.

### F04 — Sanitização de analytics mantém identificador de orçamento

**Prioridade alta · simulação de função · UX 79/92; portal 28.**

[redactAnalyticsUrl](../src/lib/analytics.ts) remove query e fragmento, mas conserva todo o pathname. [App](../src/App.tsx) aplica esse sanitizador globalmente.

Entrada sintética: `/minha-conta/orcamentos/11111111-1111-4111-8111-111111111111?origem=teste`. Saída: o mesmo caminho com UUID, sem query. A allowlist dos eventos personalizados não protege automaticamente os pageviews.

Não foi comprovado envio desse identificador ao provedor nesta revisão; foi comprovado que o sanitizador **não o remove**. Aceite: excluir rotas privadas ou normalizá-las para um template sem identificadores, testar callback, sessão, protocolo, seleção e navegação direta; depois confirmar a chegada apenas dos eventos permitidos.

### F05 — `noindex`, títulos e status HTTP incompletos no HTML inicial

**Prioridade alta · leitura de produção · UX 19/58/97; Lukka 48; portal 28.**

Resultados observados sem depender de execução JavaScript:

| Rota | HTTP/metadata inicial |
|---|---|
| `/catalogos` | 200, título genérico do site. |
| `/datas-comemorativas` | 200, título genérico do site. |
| `/minha-conta/orcamentos/<UUID sintético>` | 200, robots `index,follow,max-image-preview:large`; sem X-Robots-Tag. |
| `/selecoes/compartilhada?s=<UUID sintético>` | 200, mesmo robots indexável inicial; sem X-Robots-Tag. |
| `/ideias/nao-existe` | 200 com HTML genérico; tela React de erro não equivale a HTTP 404. |

`robots.txt` observado permite `/`. [Seo](../src/components/Seo.tsx) pode corrigir metadados no cliente, mas prévias sociais e rastreadores nem sempre executam essa atualização. Não houve conteúdo privado de orçamento no HTML observado; este achado **não comprova acesso indevido a dados de clientes**.

Aceite: contrato de HTML/status por rota, `noindex` inicial nas rotas sensíveis, previews públicos por conteúdo e 404 real para subrotas inválidas. A rota de produto tem tratamento próprio e não deve ser regredida.

### F06 — Retenção não cobre as novas tabelas de compartilhamento

**Prioridade média · análise estática · UX 80/98.**

[retention](../api/retention.ts) e a [orquestração de retenção](../site-supabase/supabase/migrations/20260911150000_fix_retention_storage_orchestration.sql) não incluem `shared_selections` nem `shared_selection_rate_limits`. A migration seguinte introduz expiração de acesso, não exclusão física. As chaves administrativas locais também não têm limpeza por validade.

Aceite: definir retenção e descarte para ambas as tabelas e para o navegador, preservar links válidos, limitar lotes, medir execução e ensaiar erro/repetição. Um link expirar não comprova que seus dados foram eliminados.

### F07 — Retry de ajuste pode duplicar a solicitação e mostra erro inadequado

**Prioridade alta · análise estática e cenário de falha derivado · UX 06/77/99.**

[CustomerQuotePage](../src/pages/CustomerQuotePage.tsx) cria novo `clientRequestId` em cada tentativa. Se o banco persistir e a resposta se perder, tentar novamente usa outra chave e não é deduplicado pela restrição existente. Alterar o texto durante o envio também muda o estado para `idle`, removendo o bloqueio do botão enquanto a operação anterior pode estar pendente.

Toda falha termina em “Escreva ao menos dois caracteres…”, mesmo quando o conteúdo é válido e o problema é de rede.

Aceite: identidade estável por tentativa lógica, trava independente da edição, distinção entre validação/rede/permissão e teste de resposta perdida. Não realizei gravação remota para reproduzir duplicatas.

### F08 — Briefing ainda aceita informações comercialmente ambíguas

**Prioridade média · análise estática · UX 62/63/64.**

`budgetRange` e `budgetScope` são opcionais independentes no [normalizador](../src/lib/quoteBriefing.ts) e nos [contratos do servidor](../api/_lib/contracts.ts). Pode chegar verba sem esclarecer se é por pessoa ou total. As faixas pequenas são reaproveitadas para verba total. Evento e recebimento têm validação individual, mas não encontrei validação relacional entre ambos.

Aceite: exigir escopo quando houver faixa definida, adaptar faixas ao contexto e sinalizar datas incompatíveis sem prometer produção ou entrega.

### F09 — “Ache pelo briefing” ainda pode reduzir demais o universo

**Prioridade média · análise estática · UX 24/31/32/34/35/49/83.**

[resolveCampaignFilters](../src/lib/campaignPresets.ts) direciona onboarding, clima afetivo **ou público colaboradores** para kits. Várias outras intenções recebem o mesmo perfil de destaques. [catalogLibrary](../src/lib/catalogLibrary.ts) e [ideaLandings](../src/lib/ideaLandings.ts) também mantêm atalhos onboarding→kits.

A correção do sinônimo na busca textual não resolve esses outros caminhos. A ordenação editorial utiliza flags e nome, não avaliação de adequação à intenção. Não há filtro de estoque identificado nesse caminho, o que preserva a orientação do usuário.

Aceite: avaliar consultas e campanhas reais com o comercial, oferecer produtos avulsos pertinentes, distinguir recomendação de restrição e explicar/remover filtros sugeridos.

### F10 — Quantidade é normalizada durante a digitação

**Prioridade média · análise estática · UX 46; Lukka 23.**

Os campos usam normalização imediata ao atualizar item/produto. Isso dificulta estados intermediários como apagar o valor ou digitar um número abaixo do mínimo antes de completá-lo. A existência de mínimo correto no contrato não garante edição natural.

Aceite: buffer de texto local, validação em blur/confirmação, explicação de ajustes e coerência cliente/servidor, sem inventar múltiplos desconhecidos.

### F11 — Sincronização e ciclo de vida de seleções não estão completos

**Prioridade média · análise estática · UX 53/59/60/79.**

O carrinho tem uma seleção ativa em localStorage e sincronização entre abas, não biblioteca por conta/dispositivo. Não há revisão otimista, arquivamento ou resolução explícita de conflito. No [CustomerAuthContext](../src/context/CustomerAuthContext.tsx), a limpeza de rascunho ocorre no signOut explícito; o callback de mudança de sessão não realiza a mesma limpeza em eventos externos/troca de identidade.

Isso é uma lacuna de ciclo de vida local; não demonstra quebra das políticas de acesso do banco. Aceite: especificar anonimato, vinculação, logout cruzado, troca de conta e conflito sem transferir silenciosamente dados de contato.

### F12 — Limite e compatibilidade do compartilhamento não cumprem todo o plano

**Prioridade média · código e leitura HTTP · UX 57/99; Lukka 30/37.**

O link suporta 8 itens, enquanto a seleção suporta 50. Seu payload contém produto/quantidade/variante, não grupos decisórios ou composição versionada de kits. Compartilhar “a seleção inteira” ainda não é verdadeiro para todos os casos permitidos pelo carrinho.

Teste de origem: chamada de leitura à API com Origin da URL do deployment, diferente do alias principal, recebeu `403 origin_not_allowed`. Isso prova a rejeição dessa origem no ambiente observado, **não** que todos os projetos Preview estejam quebrados. Falta validar a matriz de URLs de deployment/Preview contra a configuração efetiva.

Risco adicional a testar: aguardar criação remota antes de `navigator.share`/clipboard pode perder ativação transitória em alguns navegadores. Não classifiquei esse risco como defeito reproduzido em Safari físico.

### F13 — Comunicação e atendimento continuam incompletos

**Prioridade alta de negócio · ausência de cadeia completa · UX 68/69/70/75/76/77; Lukka 45.**

O [README](../README.md) informa notificações automáticas desativadas. Uma tabela de entregas não equivale a worker/outbox operante. `mailto:` e `wa.me` iniciados pelo visitante não comprovam cópia recebida nem envio automático. Área do cliente e download privado de proposta existem, mas falta comprovar quem recebe o lead, publica a proposta, responde ao ajuste e monitora falhas.

Aceite: provedor/remetente autorizados, domínio autenticado, fila idempotente, retries/bounces, opt-in e template quando aplicável, teste de recebimento com destinatário autorizado e trilha de operação comercial. Não enviar mensagens de teste a clientes reais.

### F14 — A documentação superestima ou descreve estados antigos

**Prioridade média · confronto documental.**

- [EXECUCAO_UX](EXECUCAO_UX_20260910.md) mistura bloqueio administrativo antigo com ativação posterior; precisa cronologia e estado atual por item.
- [UX_STRATEGY](UX_STRATEGY.md) afirma que dados pessoais não são gravados no navegador, mas o rascunho atual preserva contato por até 24 horas em sessionStorage. Também descreve bloqueio de robots não observado no arquivo servido.
- O checkpoint 28 do portal afirma minimização/noindex completa, contrariada por F04/F05.
- Contagens históricas de testes não são resultados atuais. Os relatórios anteriores continuam úteis como histórico, não certificado permanente.

Aceite: uma matriz datada com commit, fonte e estado remoto separado. Esta revisão é essa referência de auditoria; não reescreve retroativamente as evidências anteriores.

## 5. Índice de evidências para as matrizes

## 6. Execução corretiva posterior à auditoria

Esta seção separa a fotografia da auditoria (commit `7104660`) da execução corretiva seguinte. Ela não transforma pendências externas em itens concluídos, nem confirma aplicação remota sem evidência administrativa.

| Achado | Estado após a execução | Evidência principal |
|---|---|---|
| F01 | Corrigido no cliente: o link persistente permanece em carregamento até a leitura terminar. | Cenário E2E com resposta retardada. |
| F02 | Mitigado: substituição exige confirmação e zera título/contexto da campanha; mesclar e criar seleção independente permanecem como evolução de produto. | `replace-selection` e cenário E2E. |
| F03 | Corrigido para links criados neste dispositivo: as chaves de gerenciamento têm validade registrada, são recuperadas após reload e podem ser revogadas. | Testes unitários e drawer. |
| F04 | Corrigido: URLs de solicitações da área do cliente são reduzidas a uma rota-modelo antes da instrumentação. | Testes de `redactAnalyticsUrl`. |
| F05 | Parcial: rotas privadas e de compartilhamento agora recebem `X-Robots-Tag` no servidor. Metadados públicos iniciais específicos e 404 HTTP para todas as subrotas continuam pendentes. | `vercel.json`. |
| F06 | Implementado e testado localmente: seleção expirada/revogada e buckets antigos entram na retenção. A ativação no Supabase isolado depende da aplicação remota da migration. | Migration `20260911180000` e 99 testes pgTAP locais. |
| F07 | Corrigido: novo envio de ajuste reutiliza a mesma identidade até sucesso, bloqueia edição concorrente e mostra erro compatível com a falha. | `CustomerQuotePage`. |
| F08 | Mitigado no cliente e servidor: escopo obrigatório para faixa numérica e recebimento não pode suceder o evento. A modelagem comercial das faixas continua decisão do negócio. | Testes de briefing e 18 contratos de API. |
| F09 | Mitigado: somente a intenção afetiva sugere kits automaticamente; a curadoria ainda requer validação com repertório comercial real. | Testes de `campaignPresets`. |
| F10 | Pendente: edição de quantidade com buffer textual local. | Requisito de UX ainda aberto. |
| F11 | Parcial: rascunho local é limpo também em troca/encerramento externo de sessão. Biblioteca multi-seleção sincronizada por conta segue fora de escopo deste ciclo. | `CustomerAuthContext`. |
| F12 | Parcial: o limite persistente foi ampliado de 8 para 50 e a origem é validada contra domínio público ou deployment atual; composição versionada de kits permanece futura. | API, migration e testes. |
| F13 | Externo e pendente: exige provedor, remetente autenticado, opt-in/templates e operação comercial definida. | Sem envio automático habilitado. |
| F14 | Parcial: esta seção fornece cronologia do ciclo; documentos históricos ainda exigem consolidação editorial própria. | Este documento. |

Validação desta execução: TypeScript, 149 testes Vitest, build de produção, orçamento de assets, 68 cenários Playwright desktop/mobile, 99 asserções pgTAP locais, Graphify e verificação de diffs. A tentativa de `db push --dry-run` para `xlzmclcjdncjfdrjxclt` foi bloqueada pelo Supabase com HTTP 403 de privilégio administrativo; nenhuma migration remota foi aplicada nesta etapa.

Os códigos abaixo identificam fontes inspecionadas; F01–F14 apontam para os achados detalhados acima. Os testes associados ficam junto aos módulos, em `tests/api`, `tests/graphify-tools.node.mjs`, `e2e/smoke.spec.ts` e `site-supabase/supabase/tests`.

| Código | Fontes principais |
|---|---|
| NAV | [App](../src/App.tsx), componentes de navegação, [smoke](../e2e/smoke.spec.ts). |
| HOME | [HomePage](../src/pages/HomePage.tsx), [AboutPage](../src/pages/AboutPage.tsx), [UX_STRATEGY](UX_STRATEGY.md). |
| CAT | [CatalogPage](../src/pages/CatalogPage.tsx), [catalog](../src/lib/catalog.ts), [catalogFilters](../src/lib/catalogFilters.ts), [search](../src/lib/search.ts). |
| CUR | [campaignPresets](../src/lib/campaignPresets.ts), [catalogLibrary](../src/lib/catalogLibrary.ts), [ideaLandings](../src/lib/ideaLandings.ts). |
| PROD | [ProductPage](../src/pages/ProductPage.tsx), [ProductCard](../src/components/ProductCard.tsx), [quoteItems](../src/lib/quoteItems.ts), FAQ e comparação. |
| CART | [QuoteCartContext](../src/context/QuoteCartContext.tsx), [QuoteDrawer](../src/components/QuoteDrawer.tsx), [quoteDraft](../src/lib/quoteDraft.ts). |
| SHARE | [sharedSelection](../src/lib/sharedSelection.ts), [SharedSelectionPage](../src/pages/SharedSelectionPage.tsx), [API](../api/shared-selections.ts), migration `20260911170000`. |
| QUOTE | [QuotePage](../src/pages/QuotePage.tsx), [quoteBriefing](../src/lib/quoteBriefing.ts), [contracts](../api/_lib/contracts.ts), [http](../src/lib/http.ts). |
| ACCOUNT | [CustomerQuotePage](../src/pages/CustomerQuotePage.tsx), [CustomerAccountPage](../src/pages/CustomerAccountPage.tsx), [customerAccount](../src/lib/customerAccount.ts), [CustomerAuthContext](../src/context/CustomerAuthContext.tsx). |
| AUTH | [CustomerLoginPage](../src/pages/CustomerLoginPage.tsx), [AuthConfirmPage](../src/pages/AuthConfirmPage.tsx), [SetPasswordPage](../src/pages/SetPasswordPage.tsx), configuração isolada e testes do portal. |
| LIB | [CatalogsPage](../src/pages/CatalogsPage.tsx), [catalogLibrary](../src/lib/catalogLibrary.ts). |
| DATE | [CommemorativeDatesPage](../src/pages/CommemorativeDatesPage.tsx), contratos/cálculos de datas, testes e exportação ICS. |
| SEO | [Seo](../src/components/Seo.tsx), [vercel.json](../vercel.json), [produto no servidor](../api/product-page.ts), sitemap e HTTP observado. |
| DATA | [migrations](../site-supabase/supabase/migrations), [retention](../api/retention.ts), testes pgTAP, contrato público e leitura remota `pg_catalog`. |
| METRIC | [analytics](../src/lib/analytics.ts), testes de analytics, [performance budget](../scripts/check-performance-budget.mjs). |
| QA | [smoke](../e2e/smoke.spec.ts), [Playwright](../playwright.config.ts), testes reexecutados e cenários desta revisão. |
| GRAPH | [wrapper](../scripts/graphify.mjs), [configuração](../.graphify.project.json), [runbook](GRAPHIFY.md), [testes](../tests/graphify-tools.node.mjs), [workflow](../.github/workflows/graphify.yml). |
| DOC | Planos originais e documentos listados na seção 2; ausência de evidência externa não é preenchida por suposição. |

## 6. Matriz UX — 100 etapas

| ID | Entrega prevista | Status | Implementação / pendência de aceite |
|---|---|---|---|
| UX01 | Linha de base e cobertura | I | Inventário e auditorias existem; esta revisão atualiza estado no HEAD. DOC/QA. |
| UX02 | Continuidade e métricas | P | Contratos locais existem; métricas operacionais e continuidade entre dispositivos não estão completas. CART/METRIC/F11. |
| UX03 | Testes de contrato das falhas | P | Suítes amplas; faltam regressões dos novos defeitos F01–F12. QA. |
| UX04 | Consulta de novidades | I | Perfil e testes implementados sem depender de estoque positivo. CAT/PROD. |
| UX05 | Autocomplete e atalhos | I | Tratamento de sugestões e navegação coberto no fluxo existente. CAT/NAV/QA. |
| UX06 | Erros com recuperação útil | P | Retry em catálogo/conta existe; compartilhamento e ajustes ainda falham. F01/F07. |
| UX07 | Rascunho de orçamento | I | Rascunho com prazo de 24h em sessionStorage e testes; limites entre contas estão em UX79. CART/QUOTE. |
| UX08 | Comparação ao navegar | I | Persistência de comparação em sessão, remoção e limite de três. PROD/QA. |
| UX09 | Contexto da campanha | P | Contexto acompanha descoberta e briefing, mas duplicação compartilhada mistura contexto anterior. CUR/QUOTE/F02. |
| UX10 | Aceitar estabilização | P | Testes básicos passam; não encerrar enquanto regressões de continuidade persistirem. QA/F01–F03. |
| UX11 | Arquitetura da informação | P | Rotas e navegação por tarefa existem; compreensão por compradores reais não comprovada. NAV/DOC. |
| UX12 | Nomes das tarefas | P | Rótulos ajustados; documentação mantém nomenclatura anterior e falta validação consistente de compreensão. NAV/DOC/F14. |
| UX13 | Guia de voz | P | Estratégia define tom, mas não há guia consolidado atualizado com exemplos e governança de todos os contextos. HOME/DOC. |
| UX14 | Sistema visual | I | Tokens, padrões visuais e layouts compartilhados implementados. HOME/NAV/QA. |
| UX15 | Cabeçalho por tarefa | I | Acessos de catálogo, busca, seleção e conta implementados. NAV. |
| UX16 | Busca móvel | I | Entrada e navegação móvel presentes e cobertas no smoke. NAV/CAT/QA. |
| UX17 | Painéis e diálogos | P | Padrões de foco/Escape existem; confirmação não cobre duplicação compartilhada. NAV/CART/F02. |
| UX18 | Orientação e posição | P | Breadcrumbs/URL/foco presentes; retorno exato de scroll em todas as combinações não demonstrado. NAV/CAT/QA. |
| UX19 | Erros e vazios | P | Componentes existem; subrota editorial inválida retorna HTTP 200. SEO/F05. |
| UX20 | Testar navegação com tarefas | E | Automação não substitui sessões com compradores; resultados de participantes não encontrados. DOC/QA. |
| UX21 | Ordem da home por intenção | P | Home reorganizada; eficácia e antecipação ideal dos produtos ainda sem validação com público. HOME. |
| UX22 | Promessa no primeiro bloco | I | Proposta sob medida e fluxo sem compra são explícitos. HOME/QUOTE. |
| UX23 | Produtos que mostrem repertório | P | Produtos reais aparecem; seleção editorial diversa com responsável/revisão ainda não comprovada. HOME/CUR. |
| UX24 | Campanhas distintas | P | Entradas existem; várias convergem para kits/destaques amplos. CUR/F09. |
| UX25 | Quatro frases da marca | I | Frases incorporadas e protegidas por testes de presença. HOME/QA. |
| UX26 | Case comercial real | E | Não há case publicado com conjunto completo de evidências/autorização identificado. HOME/DOC. |
| UX27 | Como funciona | P | Fluxo explicado; validação formal das etapas de arte/produção e operação comercial ainda necessária. HOME/QUOTE. |
| UX28 | Operação e limites | E | Depende de fotos reais autorizadas e confirmação de capacidades/prazos; conteúdo genérico não é comprovação. HOME/DOC. |
| UX29 | Necessidade no contato | I | Formulário permite explicar necessidade e indicar contexto; envio automático é outro requisito. QUOTE/NAV. |
| UX30 | Redes e atendimento oficial | P | Ícones/links existem e são testados; titularidade de todos os canais, horários e domínio não confirmada nesta revisão. NAV/QA. |
| UX31 | Taxonomia de campanhas | P | Taxonomia e tradução de filtros existem; adequação semântica dos atalhos ainda limitada. CAT/CUR/F09. |
| UX32 | Sinônimos por intenção | P | Busca textual refinada; outros caminhos ainda restringem onboarding a kits. CAT/CUR/F09. |
| UX33 | Erros de digitação | I | Normalização/sugestões e proteção de códigos cobertas nos testes de busca. CAT. |
| UX34 | Amostra de relevância | N | Não encontrei dataset real julgado com esperado/obtido por intenção; fixtures não substituem avaliação comercial. CAT/DOC. |
| UX35 | Ordenação editorial | P | Ordenação por flags existe; não há ranking avaliado por intenção/diversidade. CAT/F09. |
| UX36 | Novidades, kits, badge único | I | Precedência único badge e critérios de novidade implementados/testados. PROD. |
| UX37 | Grupos do superfiltro | I | Agrupamentos, busca e chips legíveis implementados. CAT/QA. |
| UX38 | Refinamento móvel | I | Painel móvel, combinação de filtros, URL e retorno de foco cobertos. CAT/QA. |
| UX39 | Densidade, paginação, retorno | P | Paginação e estado de filtro existem; toda a matriz de retorno/posição ainda sem comprovação. CAT/QA. |
| UX40 | Explicar recomendações e vazios | P | Recuperação de vazio existe; justificativa de pertinência depende de melhorar a curadoria. CAT/CUR/F09. |
| UX41 | Qualidade dos dados | P | Normalizadores/contrato público protegem exibição; falta auditoria estratificada recorrente com amostra e responsáveis. PROD/DATA. |
| UX42 | Resumo e descrição completa | I | Separação de leitura implementada no detalhe. PROD. |
| UX43 | Especificações e unidades | P | Campos e ausência tratados; qualidade/unidades de todas as famílias não auditadas em amostra representativa. PROD/DATA. |
| UX44 | Galeria com ampliação | I | Miniaturas, ampliação e fallback presentes; testes de galeria existentes. PROD/QA. |
| UX45 | Cores e variantes | I | Identidade da variante preservada em seleção e contratos; dados publicados governam apresentação. PROD/CART/SHARE. |
| UX46 | Mínimo e ajuste de quantidade | P | Mínimo validado, mas edição intermediária é normalizada cedo demais. PROD/F10. |
| UX47 | Personalização comprovada | P | Textos cautelosos/FAQ existem; matriz de técnicas e exemplos reais por produto não está completa. PROD/DOC. |
| UX48 | FAQ contextual | I | Perguntas por contexto de catálogo/produto/orçamento implementadas. PROD/QUOTE. |
| UX49 | Relacionados relevantes | P | Relacionados por categoria existem; diversidade/adequação à campanha não demonstradas. PROD/CUR/F09. |
| UX50 | Comparação decisória | I | Até três itens com atributos úteis e ausências tratadas; testes cobrem persistência. PROD/QA. |
| UX51 | Feedback ao salvar | I | Estados de inclusão/atualização, contador e limite presentes. CART/PROD/QA. |
| UX52 | Remover/limpar com proteção | P | Remoção/limpeza têm recuperação; substituição por compartilhamento escapa da proteção. CART/F02. |
| UX53 | Seleções por campanha | P | Nome de uma seleção ativa existe; múltiplas campanhas independentes não. CART/F11. |
| UX54 | Alternativas de decisão | P | Grupos/prioridades implementados; entendimento pelos compradores e preservação no link não comprovados. CART/QUOTE/F12. |
| UX55 | Impressão/PDF | P | Estilo de impressão existe; paginação longa, imagens, observações e QA do PDF final ainda pendentes. CART/QUOTE/QA. |
| UX56 | Modelo de compartilhamento | P | Token opaco, validade e segredo separado existem; gerenciamento/limpeza ainda incompletos. SHARE/F03/F06. |
| UX57 | Link de leitura | P | API e página existem, mas há falhas de carregamento, duplicação e revogação; limite de oito. SHARE/F01–F03/F12. |
| UX58 | Prévia de links por conteúdo | P | Produto tem camada própria; catálogos/datas e páginas sensíveis falham no HTML inicial. SEO/F05. |
| UX59 | Sincronização após login | N | Não há biblioteca remota de seleções por usuário; histórico de pedidos não é sincronização de rascunhos. CART/ACCOUNT/F11. |
| UX60 | Conflitos/ciclo de campanhas | N | Não há versionamento concorrente, arquivamento e restauração de várias seleções. CART/F11. |
| UX61 | Resumo editável da campanha | I | Contexto e campos de briefing revisáveis no fluxo principal. QUOTE. |
| UX62 | Verba sem preço fictício | P | Campo existe, mas escopo não é exigido quando há valor/faixa. QUOTE/F08. |
| UX63 | Evento versus recebimento | P | Campos separados existem; relação entre datas e faixas ainda incompleta. QUOTE/F08. |
| UX64 | Formulário com menos esforço | P | Labels/validação/rascunho presentes; inconsistências do briefing e falhas de ajuste continuam. QUOTE/F07/F08. |
| UX65 | Anexos protegidos | N | Não encontrei upload de logo/referência do cliente. PDF comercial privado é outro fluxo. QUOTE/DATA. |
| UX66 | Envio único do orçamento | I | Fluxo principal tem identidade de tentativa/persistência e testes; não estender essa conclusão ao ajuste. QUOTE/DATA/F07. |
| UX67 | Confirmação e próximo passo | P | Confirma persistência/protocolo; expectativa operacional/SLA e recebimento comercial não demonstrados. QUOTE/F13. |
| UX68 | Cópia por e-mail | E | Provedor/remetente/domínio e cadeia de entrega não ativos/comprovados; implementação operacional também falta. README/F13. |
| UX69 | WhatsApp opcional automático | E | Links iniciados pelo visitante existem; automação requer opt-in/provedor/template e worker. F13. |
| UX70 | Passagem ao atendimento | P | Solicitação persiste; responsável, fila comercial e acompanhamento real não comprovados. DATA/ACCOUNT/F13. |
| UX71 | Método principal de acesso | I | Login sem obrigatoriedade no primeiro orçamento e opções explícitas de acesso. AUTH. |
| UX72 | Campos de autenticação | I | Exibição/ocultação, validação e mensagens implementadas. AUTH/QA. |
| UX73 | Recuperação e expiração | P | Rotas e estados existem; entrega de e-mail/expiração/reenvio não revalidados ponta a ponta com contas reais. AUTH. |
| UX74 | Histórico por campanha | I | Lista com busca/filtros/paginação e contexto de pedidos implementada. ACCOUNT/DATA. |
| UX75 | Timeline acionável | P | Eventos reais são apresentados; responsabilidade e ação comercial seguinte não estão fechadas. ACCOUNT/F13. |
| UX76 | Versões de proposta | P | Metadados/versionamento/download privado presentes; operação de publicação e ciclo de validade precisam comprovação. ACCOUNT/DATA/F13. |
| UX77 | Pedidos de ajuste | P | Persistência existe; retry pode duplicar, mensagem de erro é incorreta e entrega comercial não comprovada. ACCOUNT/F07/F13. |
| UX78 | Repetir campanha sem perda | P | Histórico confirma substituição e preserva snapshot; revalidação completa de produtos retirados/regras atuais não demonstrada. ACCOUNT/PROD. |
| UX79 | Isolamento e compartilhamento | P | Isolamento RPC/Storage testado; analytics, revogação e ciclo de rascunho têm lacunas. DATA/F03/F04/F11. |
| UX80 | Dados e preferências | P | Aviso e retenção parcial existem; autosserviço de direitos/preferências e descarte de links não completos. DATA/F06/F11. |
| UX81 | Online/PDF/revista distintos | I | Modelo distingue formatos e entradas atuais são corretamente online; isso não entrega biblioteca PDF. LIB. |
| UX82 | Capas com produtos reais | I | Prévia por consulta pública, carregamento/fallback implementados. LIB. |
| UX83 | Coleções por campanha | P | Dez coleções editoriais online; resultados ainda genéricos e governança de curadoria incompleta. LIB/CUR/F09. |
| UX84 | Governar publicações/downloads | N | Não há fluxo completo de PDFs/revistas com publicação, edição, revisão e download governado. LIB. |
| UX85 | Oportunidades futuras | I | Agenda calcula datas por ano e privilegia planejamento futuro. DATE. |
| UX86 | Proximidade e viabilidade | P | Janelas de planejamento existem; não equivalem a viabilidade operacional confirmada. DATE/DOC. |
| UX87 | Agenda móvel | I | Modos de consulta/filtros e layout móvel implementados. DATE/QA. |
| UX88 | Favoritos no planejamento | P | Favoritos locais existem; sincronização e validação de recorrência/undo no ciclo anual incompletas. DATE/F11. |
| UX89 | Exportação de calendário | P | ICS tem cálculo/escape/UID e testes; importação em calendários reais não comprovada. DATE/QA. |
| UX90 | Ocasião→coleção→briefing | I | Contexto trafega por URLs/seleção e pode ser revisado. DATE/CUR/QUOTE. |
| UX91 | Compradores reais | E | Não há relatório de sessões reais; persona simulada e auditoria técnica não substituem participantes. DOC. |
| UX92 | Funil com minimização | P | Allowlist presente; pathname sensível não redigido, chegada/deduplicação de métricas não comprovadas. METRIC/F04. |
| UX93 | Orçamento de desempenho | P | Gate de assets passa; faltam CWV de campo por dispositivo e comparação de jornada real. METRIC/QA. |
| UX94 | Acessibilidade manual | P | Automação e padrões presentes; leitores de tela/reflow completo/interações novas ainda não certificados. QA/F01–F03. |
| UX95 | Dispositivos/navegadores reais | P | Projetos Chromium/Firefox/WebKit existem; emulação não substitui Safari/iOS e Android físicos. QA. |
| UX96 | Movimento intencional | I | Fold/Glitch pontuais e redução de movimento implementados. HOME/QA. |
| UX97 | SEO técnico | P | Produto/sitemap evoluídos; HTML inicial e HTTP de outras rotas incompletos. SEO/F05. |
| UX98 | Dados seguros/reversíveis | P | Guardas e testes bons; retenção nova, prova de recuperação e integração remota ainda incompletas. DATA/F06. |
| UX99 | Matriz ponta a ponta/resiliência | P | E2E não força flag persistente no comando de build; novos cenários revelaram falhas não cobertas. QA/F01–F12. |
| UX100 | Publicar e reavaliar | P | Deploy Ready/CI principal verde; Supabase Preview falha e não há ciclo completo de métricas/aceite. QA/DOC. |

## 7. Matriz benchmark Lukka — 50 etapas

| ID | Entrega prevista | Status | Implementação / pendência de aceite |
|---|---|---|---|
| LK01 | Linha de base real | I | Inventário e confronto atual registrados; evidências remotas separadas. DOC/QA. |
| LK02 | Tarefas com compradores | E | Falta recrutamento e sessões documentadas. UX20/91. |
| LK03 | Acervo autorizado | E | Registro de direitos/fontes/responsáveis para prova social não encontrado. DOC. |
| LK04 | Contratos visuais/marca | I | Tokens, frases e badge único protegidos em implementação/testes. HOME/PROD. |
| LK05 | Protótipo antes do desenvolvimento | P | Interface implementada não comprova prototipação e aceite prévios com público. DOC/NAV. |
| LK06 | Hero fotográfico próprio | P | Asset editorial e CTAs presentes; não confundir imagem ilustrativa com prova de operação real. HOME/DOC. |
| LK07 | Hero móvel | I | Texto HTML, composição responsiva e dimensões implementados. HOME/QA. |
| LK08 | Manifesto protegido | I | Quatro frases presentes com cobertura textual. HOME/QA. |
| LK09 | Reduzir repetição da home | P | Melhorias estruturais existem; auditoria de compreensão/seções redundantes não encerrada. HOME. |
| LK10 | Categorias fotográficas | N | Cards principais continuam dominados por ícones. HOME. |
| LK11 | Cabeçalho por tarefas | I | Navegação por destino/tarefa implementada. NAV. |
| LK12 | Menu visual de categorias | P | Agrupamentos/menu acessível existem; proposta fotográfica e sua validação não completas. NAV/CAT. |
| LK13 | Navegação móvel | I | Busca, filtros e seleção acessíveis no fluxo móvel automatizado. NAV/QA. |
| LK14 | Coleções por campanha | P | Atalhos/editoriais existem; intenção nem sempre produz seleção distinta. CUR/F09. |
| LK15 | Editorial com revisão/validade | P | Conteúdo cadastrado em código; rotina com responsável e expiração editorial não encontrada. LIB/CUR. |
| LK16 | Imagens e fallback | I | Dimensões, carregamento e fallback implementados em catálogo/produto. PROD/LIB. |
| LK17 | Curadoria real | P | Usa produtos reais e flags; critérios de escolha/revisão/diversidade não comprovados. CUR/F09. |
| LK18 | Um badge por card | I | Novidade/kit/personalização têm precedência única testada. PROD. |
| LK19 | Informações no card | I | Mínimo, cores, resumo e ausência de mínimo conhecidos têm apresentação própria. PROD. |
| LK20 | Busca aprofundada | P | Sinônimos e testes existem; falta matriz de relevância real revisada pelo comercial. CAT/F09. |
| LK21 | Galeria | I | Miniaturas, variante, zoom e fallback implementados. PROD/QA. |
| LK22 | Técnica/personalização | P | Ficha e FAQ existem; exemplos/técnicas confirmados por família não completos. PROD/UX47. |
| LK23 | Mínimo/múltiplo/estimativa | P | Mínimo tratado; edição natural e múltiplos comprovados precisam contrato/validação adicionais. PROD/F10. |
| LK24 | Comparar três produtos | I | Comparação enxuta e persistente em sessão implementada. PROD/QA. |
| LK25 | Relacionados/compartilhar produto | P | Funções existem; diversidade por intenção e cancelamento/nativo em toda a matriz não comprovados. PROD/QA. |
| LK26 | SKU kit versus composição | P | Kit SKU identificado; modelo completo de conjunto montado ainda não existe. PROD/CART. |
| LK27 | Modelos de composição | N | Coleções de kits não são templates substituíveis de componentes reais. CUR/PROD. |
| LK28 | Escolher/substituir componentes | N | Configurador de composição não encontrado. PROD/CART. |
| LK29 | Aritmética dos conjuntos | N | Não há modelo kits × unidades de componentes com validação dedicada. QUOTE. |
| LK30 | Composição no briefing | P | Variantes/grupos decisórios persistem, mas não representam composição versionada de kits. CART/QUOTE/F12. |
| LK31 | Prova social autorizada | E | Falta acervo com comprovação/permissão de uso. DOC. |
| LK32 | Três cases reais | E | Não encontrei três estudos verificáveis publicados. HOME/DOC. |
| LK33 | Personalização em detalhe | E | Depende de fotos correspondentes base/simulação/produção real autorizadas. DOC/PROD. |
| LK34 | Time e bastidores | E | Texto institucional não equivale a pessoas/processos reais com consentimento de imagem. HOME/DOC. |
| LK35 | Qualidade/ambiente comprovados | P | Linguagem cautelosa existe; lastro documental e revisão de todas as alegações não demonstrados. HOME/PROD. |
| LK36 | Catálogo editorial nativo | P | Biblioteca online existe; curadoria efetiva e conteúdo de campanha ainda precisam evolução. LIB/CUR/F09. |
| LK37 | Compartilhar seleção inteira | P | Persistência opaca ativa, mas oito itens e falhas de revogação/continuidade/indexação. SHARE/F01–F05/F12. |
| LK38 | Exportar para aprovação | P | Impressão disponível; PDF final longo e contratos de composição não totalmente validados. CART/QUOTE. |
| LK39 | Guias úteis | P | Landings editoriais existem; autoria/revisão e profundidade prática precisam comprovação. CUR/DOC. |
| LK40 | Projeto especial | E | Depende de confirmação comercial de serviço; formulário genérico não equivale a jornada específica aprovada. DOC/QUOTE. |
| LK41 | Selecionar versus enviar | I | Estados e textos distinguem salvar de solicitar; sucesso principal depende de persistência. CART/QUOTE. |
| LK42 | Formulário enxuto | P | Rascunho/labels/servidor presentes; gaps de verba e datas permanecem. QUOTE/F08. |
| LK43 | Logo/referências privadas | N | Upload do cliente ausente; não confundir com propostas do atendimento. QUOTE/DATA. |
| LK44 | WhatsApp iniciado pelo visitante | P | Links contextuais existem; número oficial e todas as mensagens precisam validação operacional. NAV/QUOTE. |
| LK45 | E-mail auditável | E | Provedor/configuração e implementação completa de entrega ainda pendentes. F13. |
| LK46 | Acessibilidade contínua | P | Automação existe; novos fluxos e testes assistivos manuais pendentes. QA. |
| LK47 | Desempenho real | P | Gate de assets passa; comparação de laboratório/CWV de campo não concluída. METRIC. |
| LK48 | SEO sem checkout | P | Produto sem ofertas fictícias; rotas SPA ainda têm problemas de metadata/status. SEO/F05. |
| LK49 | Medir funil seguro | P | Eventos tipados existem; sanitização/chegada/deduplicação não encerradas. METRIC/F04. |
| LK50 | Publicar com reversão | P | Site publicado, mas integração Supabase Preview falha e faltam aceites operacionais. QA/DATA. |

## 8. Matriz Graphify — 50 etapas

Graphify está integrado como ferramenta de engenharia local/CI, não como funcionalidade do comprador. O grafo estrutural não é um inventário completo do banco nem prova de ativação de migrations.

| ID | Entrega prevista | Status | Implementação / pendência de aceite |
|---|---|---|---|
| GR01 | Delimitar raiz/site | I | Wrapper e configuração fixam escopo do site. GRAPH. |
| GR02 | Linha de base | I | Metadados, versão e commit registrados; mapa atual conferido. GRAPH. |
| GR03 | Dez perguntas de valor | P | Perguntas documentadas; benchmark reproduzível com respostas julgadas não entregue. GRAPH/DOC. |
| GR04 | Responsabilidades | P | Papéis descritos; responsável nominal e transferência operacional não comprovados. DOC. |
| GR05 | Decisão arquitetural | I | Geração local/artefatos CI, sem dependência do runtime público. GRAPH. |
| GR06 | Versão/ambiente fixos | I | Graphify 0.9.48 fixado; doctor/CI verificam ambiente. GRAPH. |
| GR07 | Configuração versionada | I | Arquivo próprio com escopo, limites e validação. GRAPH. |
| GR08 | Corpus inicial | P | Código coberto; documentação/migrations ainda não integradas por passes completos. GRAPH. |
| GR09 | Exclusões e caminhos | I | Exclusões e guardas de fronteira implementadas/testadas. GRAPH. |
| GR10 | Armazenamento/retenção | I | Artefatos fora do Git e retenção CI de 14 dias. GRAPH. |
| GR11 | Doctor | I | Diagnóstico disponível e executável. GRAPH. |
| GR12 | Geração estrutural sem IA | I | Extração estrutural não depende de chaves de IA/Supabase. GRAPH. |
| GR13 | Reconstruir mapa | I | Novo candidato validado/promovido; mapa atual consultado. GRAPH. |
| GR14 | Direção das relações | A | Grafo atual é não direcional; limitações documentadas, mas requisito direcional não atendido. GRAPH. |
| GR15 | Identidades/caminhos | P | Normalização existe; precisão em todos os homônimos/escopos/aliases não avaliada por amostra. GRAPH. |
| GR16 | Evidência por relação | P | Fontes estruturais disponíveis; classificação/localização completa por relação ainda não comprovada. GRAPH. |
| GR17 | Integridade do grafo | I | Validação de IDs/endpoints e estrutura presente com testes. GRAPH. |
| GR18 | Comunidades | P | Agrupamento automático existe; nomes genéricos e ausência de avaliação de coesão/utilidade. GRAPH. |
| GR19 | Saídas JSON/relatório/HTML | I | Saídas e metadados presentes. GRAPH. |
| GR20 | Promoção atômica | P | Candidato/validação/lock existem; matriz completa de interrupção/disco cheio não testada. GRAPH/GR46. |
| GR21 | Query/path/explain | P | Query disponível; wrappers estáveis path/explain não implementados. GRAPH. |
| GR22 | Vocabulário português | I | Expansão de termos para símbolos do projeto implementada. GRAPH. |
| GR23 | Limites de contexto | I | Limites/truncamento implementados e observados em consulta. GRAPH. |
| GR24 | Impacto direcional | A | Comando atual mostra vizinhança não direcional; não equivale a dependentes diretos/transitivos. GRAPH. |
| GR25 | Impacto→testes | P | Referências ajudam navegação; sugestão validada de testes por dependência não está completa. GRAPH. |
| GR26 | Atualização incremental | A | `update` reconstrói o grafo; hashes detectam defasagem, não extração incremental. GRAPH. |
| GR27 | Renomes/exclusões/branches | P | Rebuild/status ajudam; matriz de renomes e redução legítima não completamente ensaiada. GRAPH. |
| GR28 | Atualidade/check | I | Status/check com metadados/hashes disponíveis. GRAPH. |
| GR29 | Instruções aos agentes | I | AGENTS local orienta consulta e validação na fonte. GRAPH. |
| GR30 | Hooks Git | A | Integração automática via hook foi deliberadamente adiada; status manual não cumpre o item literal. GRAPH/DOC. |
| GR31 | Documentos selecionados | P | Escopo documentado; enriquecimento desses documentos não executado como entrega. GRAPH. |
| GR32 | Pass semântico separado | P | Estrutural está isolado; pass semântico com orçamento/evidências não implementado/executado. GRAPH. |
| GR33 | Contratos até RPC/SQL | P | Código TS extraído; relações completas até migrations/RPCs não demonstradas no grafo. GRAPH/DATA. |
| GR34 | Fronteiras dos bancos | P | Guardas existem no código; representação direcionada e rastreável no grafo não completa. GRAPH/DATA. |
| GR35 | Código/flag/migration/deploy | P | Documentos distinguem conceitos; modelo de conhecimento com evidências separadas não completo. GRAPH/DOC. |
| GR36 | Requisitos→implementação | P | Esta auditoria fornece matriz manual; integração rastreável no grafo e manutenção ainda pendentes. DOC/GRAPH. |
| GR37 | Memória técnica revisável | P | Orientação existe; ciclo operacional de memória com fonte/commit/correção não comprovado. GRAPH. |
| GR38 | Runbook para o time | I | README/runbook com instalação, comandos e limitações. GRAPH. |
| GR39 | Visualização local | P | HTML gerado; teste completo de filtros/busca/segurança/usabilidade não demonstrado. GRAPH. |
| GR40 | Medir utilidade | N | Benchmark equivalente grafo versus busca direta nas dez perguntas não encontrado. GRAPH/DOC. |
| GR41 | Workflow específico | I | Workflow próprio, leitura mínima, versão fixada e check bem-sucedido. GRAPH/QA. |
| GR42 | Permissões/artefatos | P | Permissões e retenção existem; revisão abrangente de visibilidade/segredos nos artefatos precisa evidência. GRAPH. |
| GR43 | Gatilhos/cache específicos | P | Cache npm existe; sem filtro de caminhos e cache do grafo por corpus. GRAPH. |
| GR44 | Relatório base/head | N | Workflow não calcula diff estrutural e testes afetados entre commits. GRAPH. |
| GR45 | Conteúdo hostil | P | Guardas cobertas parcialmente; fixtures completas de labels HTML/instruções/segredos sintéticos faltam. GRAPH. |
| GR46 | Falhas e concorrência | P | Seis testes não cobrem toda a matriz parser/timeout/disco/lock/interrupção. GRAPH. |
| GR47 | Cobertura/precisão | P | Mapa consultável; dez perguntas e imports indiretos/dinâmicos não validados integralmente. GRAPH. |
| GR48 | Desempenho/regressões | P | Geração atual funciona; benchmark maior/comparação incremental/visualização não completo. GRAPH. |
| GR49 | Recuperação/upgrade | P | Procedimento e preservação de candidato existem; ensaio completo de restauração/upgrade não comprovado. GRAPH. |
| GR50 | Publicar/acompanhar | P | Integração versionada e CI ativo; ciclo de utilidade/recuperação/aceite ainda não encerrado. GRAPH/QA. |

## 9. Área do cliente — revisão dos 30 checkpoints

O título antigo “Trinta checkpoints executados” precisa ser lido com as ressalvas abaixo. Testes locais de banco dão evidência de isolamento; não atestam entrega de e-mail nem execução diária do processo comercial.

| ID | Checkpoint | Status | Evidência / ressalva |
|---|---|---|---|
| AC01 | Primeiro orçamento sem cadastro | I | Fluxo visitante preservado. QUOTE. |
| AC02 | Entrada Meus orçamentos | I | Acessos de navegação implementados. NAV. |
| AC03 | Tela de acesso responsiva | I | AUTH/QA. |
| AC04 | Link/código por e-mail | P | Suporte de autenticação existe; envio/recebimento real não revalidado nesta auditoria. AUTH. |
| AC05 | Entrada com senha | I | Fluxo implementado e coberto nos contratos existentes. AUTH. |
| AC06 | Criar senha/confirmar e-mail | P | UI e integração existem; ciclo real de confirmação não reexecutado. AUTH. |
| AC07 | Recuperar/redefinir senha | P | Tratamentos presentes; expiração e entrega real precisam aceite operacional. AUTH. |
| AC08 | Redirect interno restrito | I | Validação de destino local implementada/testada. AUTH. |
| AC09 | Callback inválido recuperável | I | Estado de erro e teste correspondente presentes. AUTH/QA. |
| AC10 | Sessão persistente/refresh | P | SDK integrado; troca de identidade e limpeza local ainda têm lacunas. AUTH/F11. |
| AC11 | Rejeitar secret no bundle | I | Configuração pública validada por guardas e testes. AUTH/DATA. |
| AC12 | Auth no banco isolado | I | Destino protegido na configuração do site. AUTH/DATA. |
| AC13 | Titular opcional | I | Contrato preserva envio anônimo. DATA. |
| AC14 | Associar e-mail confirmado | I | Regras/RPC e testes de identidades confirmadas/não confirmadas. DATA. |
| AC15 | Associação idempotente | I | Restrição de titularidade e testes pgTAP. DATA. |
| AC16 | Lista por titular | I | RPC limita por identidade e parâmetros validados. ACCOUNT/DATA. |
| AC17 | Detalhe do titular | I | Controle por `auth.uid()` e isolamento testado. ACCOUNT/DATA. |
| AC18 | Snapshot original | I | Pedido original preservado; repetição cria nova intenção. ACCOUNT/DATA. |
| AC19 | Timeline pública separada | I | Modelo e consulta separados de eventos internos. ACCOUNT/DATA. |
| AC20 | Eventos reais de status | I | Persistência/eventos previstos em SQL; não equivale a operador atuando. DATA. |
| AC21 | Busca/filtros/paginação/estados | I | Lista e recuperação de erro implementadas. ACCOUNT/QA. |
| AC22 | Detalhe completo | I | Itens, contato e contexto apresentados ao titular. ACCOUNT. |
| AC23 | Solicitar novamente | P | Confirma substituição, mas revalidação completa das regras atuais ainda pendente. ACCOUNT/UX78. |
| AC24 | Versões publicadas | P | Modelo e leitura existem; publicação comercial ponta a ponta não comprovada. DATA/F13. |
| AC25 | Bucket PDF privado/limites | I | Bucket/políticas e validações de formato/tamanho previstos e testados. DATA. |
| AC26 | URL assinada de 60 segundos | I | API exige sessão/autorização antes de assinar. ACCOUNT/DATA. |
| AC27 | Origem/UUID/bucket/host | I | Guardas e testes negativos de API presentes. DATA/QA. |
| AC28 | Noindex/analytics sem protocolo | P | HTML inicial indexável e UUID de pedido preservado no pathname. F04/F05. |
| AC29 | Aviso de privacidade | P | Texto existe; divergências com rascunho/retenção e revisão operacional precisam reconciliação. F06/F11/F14. |
| AC30 | Cobertura automatizada completa | P | Suítes passam, mas flags novas/cenários de falha não estão integralmente cobertos. QA/F01–F12. |

## 10. Ordem recomendada de fechamento

Esta é uma sequência de correção proposta, não alterações executadas nesta revisão.

1. **Privacidade e preservação do trabalho:** F02, F03, F04 e contrato de `noindex` de F05. Criar primeiro testes que reproduzam os defeitos.
2. **Compartilhamento estável:** F01, limite de itens, ciclos de criação/revogação, armazenamento bloqueado, duplo clique e matriz de origens. Habilitar explicitamente a flag persistente nos testes correspondentes.
3. **Confiabilidade do briefing/conta:** F07/F08/F10/F11, mantendo identidade de tentativa em falhas e sem substituir dados locais silenciosamente.
4. **Retenção e integração:** ampliar descarte com segurança, auditar execução; investigar logs do Supabase Preview e comparar o checkout/ledger corretos antes de qualquer reparo.
5. **Atendimento realmente operacional:** escolher/configurar provedores e responsável comercial; implementar outbox, entrega, publicação de propostas e retorno dos ajustes com observabilidade.
6. **Curadoria com relevância:** construir amostra julgada de buscas/campanhas e corrigir atalhos restritivos antes de adicionar mais coleções genéricas.
7. **Evoluções ainda ausentes:** anexos, construtor de kits e várias seleções por conta, cada qual com contrato próprio e isolamento no banco do site.
8. **Conteúdo autorizado:** cases, bastidores, técnicas e prova social; nenhuma fotografia ou alegação de concorrente deve ser usada como prova da nossa operação.
9. **Completar ou renegociar o Graphify:** aprovar explicitamente alternativas não direcionais/rebuild/hooks ou executar os critérios originais; não chamar esses itens de concluídos por equivalência implícita.
10. **Aceite final:** testar com compradores reais, tecnologias assistivas e dispositivos físicos, confirmar métricas permitidas no destino, repetir regressões no commit a publicar e encerrar somente os critérios comprovados.

## 11. Definição de encerramento da auditoria

Esta auditoria entrega a rastreabilidade dos planos disponíveis e os principais gaps encontrados. **Não declara ausência de outros bugs**, conformidade jurídica integral, validação de todos os registros do catálogo ou cobertura total de produção.

Para encerrar a implementação, cada linha P/N/E/A precisa de: responsável, critério de aceite, teste ou evidência, commit e estado de ativação/publicação quando aplicável. Itens com dependência externa permanecem abertos até a dependência e a implementação correspondente estarem prontas.

O relatório é um artefato local desta revisão. Não foi feito commit/push/deploy nem alteração de schema para produzir esta conclusão.
