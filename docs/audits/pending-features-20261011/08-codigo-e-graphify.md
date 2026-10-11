# H — Auditoria de código (funcionalidades incompletas) e Graphify (50 etapas)

Data: 11/10/2026 · Repositório: `/home/user/Promo_Brindes_V1` · HEAD `3f82233` (06/10/2026) · Modo: somente leitura (nenhum arquivo do repositório alterado, nenhum commit).

## 0. Condições e limites desta auditoria

| Item | Situação | Consequência |
|---|---|---|
| `node_modules` | Ausente; nada instalado (auditoria somente leitura) | `tsc`, Vitest e Playwright **não executados**. Achados estáticos (grep + script local de varredura de exports, não versionado). |
| Node local | v22.22.0 (o projeto exige `>=24.15.0 <25`) | Apenas scripts Node sem dependências foram executados. |
| Graphify local | `graphify-out/` ausente; pacote `graphifyy` não instalado | `npm run graph:status` **falha antes de responder** (`ERR_MODULE_NOT_FOUND: typescript`, importado no topo de `scripts/graphify-quality.mjs:3`). A varredura foi manual, como o AGENTS.md prevê quando o grafo está ausente. |
| Git | Clone raso (104 commits) | Os commits auditados da matriz (`f20df445`, `25be22f7`, `9ae11772`) não existem localmente. `scripts/validate-closure-ledger.mjs` falha aqui por esse motivo (é ambiental, não é defeito do ledger). |
| CI Graphify | Consultado via `gh` (somente leitura) | Run `37488430420` (push em `main`, SHA `3f82233`, 06/10): **sucesso**; mapa principal com 1.491 nós e 4.174 relações, mapa de banco com 386 nós e 320 relações, 600 referências TypeScript, benchmark 10/10, 17 testes do wrapper. |
| Estado remoto (Vercel/Supabase) | Não consultado | Afirmações sobre produção citam `AUDITORIA.md` (24/09) e estão marcadas **NÃO VERIFICADO hoje**. |

Classificações usadas: **NÃO INICIADO**, **PARCIAL**, **CÓDIGO MORTO**, **PROMESSA SEM ENTREGA**. Quando algo foi verificado e está entregue, aparece como **OK**, apenas para registro.

---

# PARTE 1 — Funcionalidades incompletas no código-fonte

## 1.1 Marcadores (TODO/FIXME/XXX/HACK/"em breve"/"not implemented"/stub/501)

Resultado da varredura em `src/`, `api/`, `shared/`, `scripts/`, `e2e/` e `tests/`:

- **Zero** `TODO`, `FIXME`, `XXX`, `HACK`, "em breve", "coming soon", "não implementado", "not implemented", `stub`, `throw new Error('…not implemented')` e respostas HTTP 501.
- As ocorrências de "todo"/"temporária" em `e2e/smoke.spec.ts:1153,1240,1304`, `tests/queue-concurrency.node.mjs:120`, `CommemorativeDatesPage.tsx:326,341` e `commemorativeDates.ts:112` são a palavra portuguesa "todo" ou nomes de teste. Não são achados.
- `placeholder` aparece apenas como atributo de input ou como fallback legítimo `/images/product-placeholder.svg`. `mock` aparece apenas em testes.

| Arquivo:linha | Achado | Classificação | Impacto |
|---|---|---|---|
| `src/lib/catalog.ts:329-336` | "Compatibilidade temporária": quando a view retorna 404, o código recua de `v_site_products_public` para a view legada `v_products_public`. O README registra que o contrato mínimo foi aplicado em 08/09; o recuo continua no código. | PARCIAL (dívida temporária que não foi removida) | Baixo no funcionamento. Mantém viva a dependência da view legada, que é mais ampla (relaciona-se a A-022 da AUDITORIA). Um 404 transitório troca a fonte do catálogo de forma permanente para a sessão (`activeProductResource` é global). |
| `src/pages/QuotePage.tsx:357-364` | Comentário "Decisão provisória enquanto o produto não define formalmente entre resumo e cópia integral (Etapa 31)". | PARCIAL (decisão de produto pendente) | Médio. O texto do checkbox de WhatsApp ainda promete "cópia" (ver 1.5). |

## 1.2 Feature flags e variáveis que desligam funcionalidades

| Arquivo:linha | Flag / variável | O que fica oculto ou degradado quando está desligada | Classificação | Impacto |
|---|---|---|---|---|
| `src/lib/siteFeatureFlags.ts:5`; uso em `QuoteDrawer.tsx:226`, `QuotePage.tsx:420`, `CustomerQuotePage.tsx:231` | `VITE_QUOTE_DECISION_GROUPS_ENABLED` (padrão `false` em `.env.example:27`) | Seletor "Como considerar" (principal/alternativa) e o selo no portal. | PARCIAL (depende de ativação remota) | Médio. Os docs (EXECUCAO_UX_20260910.md:50) dizem que está ativo em Production. **NÃO VERIFICADO hoje.** |
| `src/pages/QuotePage.tsx:420` + `src/styles.css:1292,6779` | O `<span class="quote-item__print-decision">` fica **fora** da condição da flag. | Com a flag desligada, a impressão/PDF ainda exibe "Referência principal" em todo item. | PARCIAL (a flag não cobre a impressão) | Baixo. A funcionalidade desativada vaza para o PDF impresso. |
| `siteFeatureFlags.ts:6`; `CustomerQuotePage.tsx:234` | `VITE_CUSTOMER_ADJUSTMENTS_ENABLED` | Formulário "Precisa ajustar algo?" no detalhe do orçamento. | PARCIAL | Médio. Mesmo ativo, nenhuma notificação chega ao time comercial (ver 1.5). |
| `siteFeatureFlags.ts:7`; `QuoteDrawer.tsx:115,216`; `SharedSelectionPage.tsx:20` | `VITE_PERSISTENT_SHARED_SELECTIONS_ENABLED` | Link opaco, com expiração e revogável. Sem a flag, o compartilhamento usa URL codificada sem revogação, e links `?token=` são ignorados. | PARCIAL | Médio (privacidade e controle do link). |
| `src/vite-env.d.ts:3-16` | Tipagem de `ImportMetaEnv` | Não declara `VITE_QUOTE_DECISION_GROUPS_ENABLED` nem `VITE_CUSTOMER_ADJUSTMENTS_ENABLED`; só a terceira flag está tipada. | PARCIAL | Baixo. Um erro de digitação no nome não é detectado. |
| `src/lib/quoteRequest.ts:88-92`; `src/lib/contactRequest.ts:46-50` | `VITE_QUOTE_REQUEST_ENDPOINT` / `VITE_CONTACT_REQUEST_ENDPOINT` | Sem a variável, o envio vira `mailto:`: sem protocolo, sem persistência, sem histórico no portal, sem confirmações e sem anexos. | OK, com degradação intencional | Alto se faltar em produção. A AUDITORIA (24/09) lista as duas como presentes. |
| `src/components/Layout.tsx:46,146,197,220`; `CustomerRoute.tsx:9-11`; `CustomerLoginPage.tsx:100` | `VITE_SITE_SUPABASE_URL` / `VITE_SITE_SUPABASE_PUBLISHABLE_KEY` (`hasSiteAuthConfiguration`) | Some "Meus orçamentos"; o portal exibe "Acesso em configuração"; upload de anexos, favoritos sincronizados e seleções salvas ficam indisponíveis. | OK (estado honesto) | Alto se faltar. |
| `api/notifications.ts:379-384, 642-645`; `api/_lib/leadHandler.ts:130-133` | `RESEND_API_KEY` + `SITE_EMAIL_FROM`; `WHATSAPP_ACCESS_TOKEN`/`PHONE_NUMBER_ID`/`QUOTE_TEMPLATE`/`GRAPH_API_VERSION` | Sem essas chaves nenhum canal é configurado. A resposta de envio traz `email:'pending'` e o cron `/api/notifications` (a cada 15 min, `vercel.json:8`) responde **503** em toda execução. | PROMESSA SEM ENTREGA (ver 1.5) | **Alto.** Em 24/09 essas chaves estavam ausentes em Production "por decisão do usuário" (AUDITORIA.md:241,269). **NÃO VERIFICADO hoje.** |
| `api/notification-events-resend.ts:59`; `api/notification-events-whatsapp.ts:80,133` | `RESEND_WEBHOOK_SECRET`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Os webhooks respondem 503 e não há rastreio de entrega ou devolução. | PARCIAL | Médio. Ausentes em produção em 24/09. |
| `api/_lib/operationalAlerts.ts:8`; `api/notifications.ts:572,694`; `api/retention.ts:186` | `OPERATIONS_ALERT_WEBHOOK_URL/TOKEN` | Nenhum alerta de saúde da fila ou de falha de cron. | PARCIAL | Alto operacionalmente: crons podem falhar sem ninguém saber. Ausentes em 24/09. |
| `api/_lib/siteDatabase.ts:57-58`; `retention.ts:128,152`; `briefing-assets.ts:115`; `customer-proposals.ts:121` | `SITE_SUPABASE_SERVICE_JWT` (privilégio mínimo) | Sem ela, o backend usa a chave secret completa. Mesmo com o JWT, Storage/retenção continuam exigindo `SITE_SUPABASE_SECRET_KEY`. | PARCIAL (corte de privilégio incompleto) | Médio (segurança). |
| `api/notifications.ts:379`; `api/_lib/siteDatabase.ts:70-79` | `VERCEL_ENV=preview` / `SITE_PREVIEW_SUPABASE_PROJECT_REF` | Em Preview, as notificações ficam sempre desativadas e o backend recusa escrita sem um ref próprio de preview. | OK (falha fechada intencional) | Previews não testam o envio de ponta a ponta. |
| `api/_lib/catalogValidation.ts:66` | `CATALOG_SUPABASE_PUBLISHABLE_KEY` | Override não documentado em `.env.example` (há fallback para a chave VITE). | PARCIAL (documentação) | Baixo. |

## 1.3 Rotas, páginas, componentes e exports sem uso

**Rotas:** as 18 páginas de `src/pages` estão todas roteadas (`src/App.tsx:110-127`). Nenhuma rota aponta para página inexistente. Todo componente de `src/components` tem ao menos um importador.

| Arquivo:linha | Achado | Classificação | Impacto |
|---|---|---|---|
| `src/App.tsx:118`; `src/pages/IdeaLandingPage.tsx`; `src/lib/ideaLandings.ts:16-42`; `api/sitemap.ts:34-37`; `api/site-page.ts:45-48` | As 4 landings `/ideias/{onboarding,eventos,clientes-vip,sustentaveis}` existem, têm SSR e estão no sitemap, mas **nenhum link interno** aponta para elas (Layout e HomePage não as citam). Também não há e2e. | PARCIAL (páginas órfãs de navegação) | Médio. Conteúdo SEO sem descoberta interna nem teste. |
| `src/lib/catalog.ts:501-505` | `export const catalogConfig` sem nenhuma referência. | CÓDIGO MORTO | Baixo. |
| `src/lib/siteSupabase.ts:20` | `export const siteAuthConfigured` sem uso; foi substituído por `hasSiteAuthConfiguration()`. | CÓDIGO MORTO | Baixo. |
| `api/_lib/siteDatabase.ts:264-267` | `assertSafeSiteDatabaseConfiguration()` nunca é chamada: não existe preflight de configuração no boot. A validação só acontece quando cada requisição chama `getSiteDatabaseConfig()`. | CÓDIGO MORTO (verificação de segurança abandonada) | Baixo/médio. Uma configuração errada só aparece na primeira requisição real. |
| `src/lib/quoteBriefing.ts:119-122` | `validateQuoteBriefing()`, wrapper de "compatibilidade", usado só em teste; a página usa `getQuoteBriefingValidationError`. | CÓDIGO MORTO (apenas teste) | Baixo. |
| `src/lib/sharedSelection.ts:328-331` | `hydrateSharedSelection()`, wrapper de "compatibilidade", usado só em teste. | CÓDIGO MORTO (apenas teste) | Baixo. |
| `src/lib/searchRelevance.ts:11-49` | Módulo inteiro usado apenas por `searchRelevance.test.ts`. O próprio arquivo diz: "corpus técnico inicial; a homologação comercial pode ampliar…". | PARCIAL (harness de teste em `src/`; homologação comercial não feita) | Baixo. |
| `shared/catalogEditorial.ts:77-90` (+ `:14-20`) | `catalogEditorialIssues()` só é chamada em `src/lib/catalogLibrary.test.ts:40`. Não há verificação em runtime nem em job agendado. O `reviewDueAt` comum é `2027-09-22`; a partir dessa data o teste unitário quebra ("revisão editorial vencida"). | PARCIAL (governança editorial só como "bomba-relógio" em teste) | Baixo hoje; quebra o CI em 22/09/2027. |
| `scripts/sql/verify-shared-selection-contract.sql` | Ensaio SQL transacional sem referência em script, workflow ou runbook. | CÓDIGO MORTO / ferramenta não documentada | Baixo. |
| `public/brand/promo-brindes-logo-v1-360.webp` | Asset sem nenhuma referência (todo o código usa a v2-800). | CÓDIGO MORTO (asset) | Desprezível (peso no deploy). |
| ~50 tipos e constantes exportados e usados só no próprio módulo (ex.: `FunnelEventMap`, `CartAction`, `MAX_BRIEFING_ASSET_BYTES`) | Exportações excessivas | — | Sem impacto. |

## 1.4 Analytics (`src/lib/analytics.ts`)

- **31 eventos definidos** (`analytics.ts:5-35`) e **31 disparados** em produção. Nenhum evento está definido sem disparo. `search_started` tem 11 pontos de disparo; os demais, entre 1 e 3. A tipagem `FunnelEventMap` impede disparos fora do contrato.

| Arquivo:linha | Achado | Classificação | Impacto |
|---|---|---|---|
| `src/lib/clientObservability.ts:12-15` | `track('frontend_error', …)` é chamado diretamente, fora de `FunnelEventMap`/`ALLOWED_PROPERTIES`. | PARCIAL (evento disparado sem definição no contrato) | Baixo. Escapa da lista branca e da revisão de propriedades. |
| `src/components/ConversationForm.tsx:70-78` | O envio do formulário de contato (sucesso ou falha) não gera evento. | PARCIAL (lacuna de funil) | Médio. A conversão de contato fica invisível. |
| `src/components/BriefingAssetUploader.tsx`, `SavedSelections.tsx`, `IdeaLandingPage.tsx`, `SharedSelectionPage.tsx`, `CustomerLoginPage.tsx:50` | Sem evento para: upload de anexo, salvar seleção na conta, visualização de landing `/ideias`, abertura ou duplicação de seleção compartilhada, revogação de link, login concluído (só existe `customer_access_requested`). | PARCIAL | Médio. Os funis de conta e de compartilhamento ficam incompletos. |
| `src/App.tsx:103` + AUDITORIA A-013 | Todos os eventos dependem do Vercel Web Analytics. Em 24/09, `/_vercel/insights/script.js` retornava 404 em produção. | PARCIAL. **NÃO VERIFICADO hoje** | Alto se persistir: nenhum evento de funil nem `frontend_error` chegaria. Não há outro coletor de erros (ex.: Sentry); `api/_lib/observability.ts` é só `console.*`. |

## 1.5 Botões, links e textos que prometem algo

Não foi encontrado nenhum `href="#"`, `href="javascript:"` ou `onClick` vazio. Os únicos `#` são o skip-link `#conteudo` e a âncora `#referencias`, ambos legítimos.

| Arquivo:linha | Promessa | Fluxo existe? | Classificação | Impacto |
|---|---|---|---|---|
| `src/pages/QuotePage.tsx:457` | Checkbox "Quero receber **uma cópia desta solicitação** também pelo WhatsApp". | (a) Aparece sempre, sem condição de provedor configurado. (b) O template envia só nome, protocolo e empresa (`api/notifications.ts:337-356`, `.env.example`), o que não é uma "cópia"; a própria Etapa 31 corrigiu esse termo na tela de sucesso, mas não no checkbox. (c) Sem `WHATSAPP_*` (ausente em 24/09) nada é enviado. | PROMESSA SEM ENTREGA | **Alto.** Consentimento coletado para algo que não acontece; texto inconsistente com a Política. |
| `src/pages/QuotePage.tsx:365` | "Confirmação por e-mail registrada para envio" / "Confirmação pelo WhatsApp autorizada e registrada para envio". | Sem `RESEND_API_KEY`/`SITE_EMAIL_FROM`, `deliverQuoteConfirmationsNow` retorna `pending` (`notifications.ts:588-593`) e o cron responde 503 para sempre (`:642-645`). O job fica na fila sem prazo e sem alerta. | PROMESSA SEM ENTREGA (condicionada à configuração; **NÃO VERIFICADO hoje**) | **Alto.** |
| `src/pages/QuotePage.tsx:355`; `CustomerQuotePage.tsx:234` ("Ele aparecerá na linha do tempo"); `ConversationForm.tsx:76` ("Nosso time… vai falar com você") | Promessas de que o time comercial recebe e responde. | Orçamentos (`api/quote-requests.ts`), contatos (`api/contact-requests.ts`) e pedidos de ajuste são **apenas persistidos** no Supabase isolado. Não há notificação interna ao time: os canais são só e-mail e WhatsApp **ao cliente** (`notifications.ts:72`); não existe e-mail para `adm01@`, `pg_net` nem webhook comercial. Os docs reconhecem o problema (REVISAO_IMPLEMENTACAO_ATUAL_20260912.md:176; REVISAO_INTEGRAL_PLANOS_20260911.md:17). | PARCIAL / PROMESSA SEM ENTREGA operacional | **Crítico para o negócio.** O lead só é atendido se alguém consultar o banco. Em 24/09 a contagem remota de `quote_requests` era zero. |
| `src/pages/CustomerQuotePage.tsx:233`; `api/customer-proposals.ts` | Seção "Propostas — Versões disponibilizadas pelo nosso time" e botão "Abrir proposta". | O download (URL assinada) está implementado. **Não existe** no repositório nenhum fluxo ou ferramenta de **publicação** (insert em `site_private.proposal_documents` + upload no bucket `customer-proposals`); só fixtures pgTAP. A seção só aparece quando há proposta, então não engana o cliente. | PARCIAL (ciclo comercial depende de operação externa sem ferramenta) | Alto para a proposta de valor do portal. `proposal_documents` = 0 em 24/09. |
| `src/pages/CatalogsPage.tsx:63-64,226`; `src/lib/catalogLibrary.ts:5,180-183`; `analytics.ts:14-15` | Formatos "Abrir PDF" e "Abrir revista" ("Quando houver um material fechado, ele aparecerá… como PDF ou revista digital"). | As 10 coleções são `format: 'online'` (`catalogLibrary.ts:42-146`). O suporte a PDF e revista é só estrutura. | NÃO INICIADO (texto honesto) | Baixo. |
| `src/pages/QuotePage.tsx:400` | "Imprimir / salvar em PDF" | Usa `window.print`; e2e em `smoke.spec.ts:1447`. | OK | — |
| `src/pages/CommemorativeDatesPage.tsx:55-61,347` | "Adicionar à agenda" / "Lembrar quando começar" | Gera `.ics` local. | OK | — |
| `src/pages/QuotePage.tsx:354` (modo `mailto:`) | "Seu e-mail está pronto" | Abre o cliente de e-mail; sem protocolo nem persistência. | OK (degradação declarada) | — |

## 1.6 Testes pulados e cobertura e2e

| Arquivo:linha | Achado | Classificação | Impacto |
|---|---|---|---|
| (todas as suítes) | Zero `it.skip`, `describe.skip`, `.todo`, `.only` ou `xit`. | OK | — |
| `e2e/product-detail.spec.ts:29`; `e2e/smoke.spec.ts:951,1012,1046,1321,1373,1448` | 7 `test.skip` **condicionais** ao projeto Playwright (viewport ou navegador). | OK (legítimos) | — |
| `vite.config.ts:51` | O comentário cita "72 testes E2E"; existem **64** (56 em `smoke` + 8 em `product-detail`), executados em 2 a 4 projetos. | PARCIAL (documentação desatualizada) | Baixo. |
| `playwright.config.ts:22` | O build do e2e liga **todas** as flags e define só `VITE_QUOTE_REQUEST_ENDPOINT`. | PARCIAL | Médio. O estado padrão do `.env.example` (flags `false`), o fallback `mailto:` do orçamento e o envio de contato via API nunca são exercitados em e2e. |
| `e2e/smoke.spec.ts:52-73` e demais `page.route` | Todos os e2e simulam Supabase e as APIs; nenhum roda contra funções Vercel reais (`vite preview` não executa `api/`). | PARCIAL | Médio. SSR, sitemap, 404 do servidor e handlers só têm testes unitários. `scripts/smoke-deployment.mjs` cobre parte disso depois do deploy. |

**Jornadas sem nenhum e2e:**
1. Landings `/ideias/:topic` (4 páginas).
2. `/definir-senha` (troca de senha) e o modo "Esqueci minha senha".
3. Criação de conta (`mode === 'create'`) e login real por OTP ou senha (há só verificação de acessibilidade do formulário em `smoke.spec.ts:1100`).
4. Envio bem-sucedido do formulário de contato (`/api/contact-requests`); só a validação é testada (`smoke.spec.ts:964-975`).
5. Upload e remoção de anexos de briefing (`BriefingAssetUploader` → `/api/briefing-assets`).
6. Pedido de ajuste do cliente (`CustomerQuotePage.tsx:234`).
7. Revogação de link compartilhado persistente (`QuoteDrawer.tsx:144`).
8. Arquivar, restaurar e excluir seleção salva (`SavedSelections.tsx:198-203`); só salvar e recuperar são testados.
9. Página 404 genérica (`NotFoundPage`); só existe o caso de produto inválido.
10. Fallback `mailto:` de orçamento e contato.
11. Funcionamento com flags desligadas.
12. Páginas `/sobre` e `/privacidade`: só aparecem no laço do axe (`smoke.spec.ts:1047`) e em um teste de foco.

Módulos de API sem teste unitário: `api/_lib/observability.ts` e `api/_lib/siteOrigin.ts` (cobertos indiretamente).

## 1.7 Assets referenciados em `public/`

| Arquivo:linha | Achado | Classificação | Impacto |
|---|---|---|---|
| `HomePage.tsx:134`, `public/hero-preload.js:6-7`, `index.html:15,18-19`, `Layout.tsx:152,208`, `QuotePage.tsx:395`, fallback `product-placeholder.svg` | Todos os caminhos referenciados existem em `public/`. | OK | — |
| `/images/garrafa.webp` | Aparece só em fixtures de teste unitário (`customerQuoteContract.test.ts`); nunca é servido. | OK | — |
| `public/brand/promo-brindes-logo-v1-360.webp` | Arquivo órfão (ver 1.3). | CÓDIGO MORTO | Desprezível. |

## 1.8 Resumo da Parte 1 por classificação

- **PROMESSA SEM ENTREGA (3):** checkbox "cópia pelo WhatsApp"; "confirmação registrada para envio" sem provedor; promessa de atendimento sem handoff ao time comercial.
- **PARCIAL (≈20):** ciclo de publicação de propostas; landings `/ideias` órfãs; corte de privilégio do JWT; alertas operacionais; webhooks de entrega; lacunas de funil no analytics; `frontend_error` fora do contrato; flag que vaza na impressão; tipagem das flags; recuo para a view legada; decisão provisória da Etapa 31; governança editorial só em teste; harness de relevância; cobertura e2e (12 jornadas sem e2e, flags desligadas e `mailto:` nunca testados).
- **NÃO INICIADO (1):** formatos PDF e revista digital na biblioteca de catálogos.
- **CÓDIGO MORTO (7):** `catalogConfig`, `siteAuthConfigured`, `assertSafeSiteDatabaseConfiguration`, `validateQuoteBriefing`, `hydrateSharedSelection`, `verify-shared-selection-contract.sql` e o logo v1.

---

# PARTE 2 — Graphify

## 2.1 Achados transversais do Graphify

| Arquivo:linha | Achado | Classificação | Impacto |
|---|---|---|---|
| `scripts/graphify-quality.mjs:3`; `scripts/graphify.mjs:9-15` | O wrapper importa `typescript` estaticamente. Sem `npm ci`, **todos** os comandos `graph:*`, inclusive `status` e `help`, terminam em `ERR_MODULE_NOT_FOUND`. Isso foi reproduzido nesta sessão. O AGENTS.md manda rodar `graph:status` primeiro. | PARCIAL (etapa 11) | Médio. O diagnóstico falha justamente no ambiente incompleto. |
| `scripts/graphify.mjs:754-766` | `doctor` verifica a versão, a raiz e os hooks. Não verifica o interpretador Python nem `tree_sitter_sql`, e não orienta a instalação: sem o binário, o erro é um `ENOENT` cru. | PARCIAL | Médio. |
| `docs/GRAPHIFY.md` (inteiro); `README.md:6` | Não há passo de instalação (`pip install -r requirements-graphify.txt`, Python 3.11); ele só existe em `graphify.yml:41-43`. O README tem apenas o badge. | PARCIAL (etapa 38) | Médio. Quem clona o repositório não reproduz o fluxo só lendo os docs. |
| `requirements-graphify.txt:1-5` | Fixa só os pacotes de topo (`graphifyy[sql]==0.9.48`, `tree_sitter_sql==0.3.5`), sem hashes nem dependências transitivas. O comentário cita `requirements-graphify.in`, que **não existe**. | PARCIAL (etapa 6) | Médio. A instalação não é totalmente reprodutível. |
| `.graphifyignore` vs `scripts/graphify.mjs:143-158`, `graphify-quality.mjs:148-155` | **O `.graphifyignore` não é consumido pela automação.** O wrapper seleciona arquivos por `git ls-files -co --exclude-standard`, `sourceRoots` e lista de extensões, e copia o corpus para `os.tmpdir()` sem levar o ignore. A proteção real é a lista de permissão. `docs/GRAPHIFY.md:8` afirma que o `.graphifyignore` "exclui…", o que é impreciso. | PARCIAL (etapa 9) | Baixo no risco; alto na precisão documental. |
| `scripts/graphify.mjs:51-60` | O scanner de segredos não cobre as famílias usadas **neste** projeto: `sb_secret_…`, `re_…` (Resend), `whsec_…` e JWT `eyJ…`. | PARCIAL (etapa 42) | Baixo/médio (o grafo guarda rótulos, não conteúdo). |
| `.github/workflows/graphify.yml:3-6` | Sem `paths:`. Roda em PRs só de documentação (ex.: `audit/ux-master-100-stages`, 6 runs em 06/10). | PARCIAL (etapa 43) | Baixo (custo de CI). |
| `scripts/graphify.mjs:445,455` | `cluster-only --no-label`: as comunidades não recebem nome por construção. | PARCIAL (etapa 18) | Baixo. |
| `scripts/graphify.mjs:580-588` | No benchmark, `directFound` só confirma que uma string fixa existe no arquivo esperado, o que é trivialmente verdadeiro. Não há comparação de tempo ou de contexto entre métodos. | PARCIAL (etapa 40) | Médio. A "medição de utilidade" é fraca. |
| `docs/graphify-benchmark.json` | Os 10 casos cobrem só 3 dos 9 temas da etapa 3 (autenticação, filtros, seleção compartilhada). Faltam impacto de QuoteItem, variantes, ajustes, busca, sitemap e isolamento de dados. O caso `GR40-10` é autorreferente (o Graphify perguntando sobre o próprio Graphify). | PARCIAL (etapa 3) | Médio. |
| `.github/workflows/graphify.yml:55-69`; `scripts/graphify.mjs:258-311` | O relatório base/head lista nós, arestas e arquivos (até 100). Não aponta módulos afetados nem testes sugeridos e não é publicado em `$GITHUB_STEP_SUMMARY`; existe apenas como artefato. | PARCIAL (etapa 44) | Baixo/médio. |
| `scripts/graphify.mjs:350-353, 369, 402-408` | O lock é removido automaticamente após 30 min. Os metadados registram o commit, mas não se a árvore estava suja. O `.previous` é apagado após o sucesso, então não há snapshot persistente para rollback. | PARCIAL (etapas 20, 28, 49) | Baixo. |
| `graphify.yml:80` vs `.graphify.project.json:28` | A retenção de 14 dias está fixa no workflow; `ciArtifactRetentionDays` da configuração nunca é lido. | PARCIAL (etapa 7) | Baixo. |
| `docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv` (linhas GR) | **A matriz está defasada.** A última alteração é de 22/09 (`dafd3d9`), e os commits auditados são anteriores a `8ca1228` (#95, que introduziu dois corpora e o enriquecimento TS). Números citados: GR08 "259 arquivos/1.647 nós", GR13 "1.099 nós/2.416 relações", GR45 "seis testes". O CI atual mostra 1.491 nós/4.174 relações (principal), 386/320 (banco) e 17 testes. | Coerência | Médio. O ledger "fonte de verdade" não reflete o código vigente. |

## 2.2 As 50 etapas: status, evidência e coerência com a matriz (GR01–GR50)

Legenda da matriz: I = implementado; P = parcial; A→I = aceito por decisão arquitetural.

| # | Etapa | Status nesta auditoria | Evidência principal | Matriz | Coerente? |
|---|---|---|---|---|---|
| 1 | Delimitar a integração | CONCLUÍDA | `assertSafeRoot` (`graphify.mjs:66-79`): nome do pacote e projeto; `PROJECT_ROOT` derivado do diretório do script (`:27`). Não há teste automatizado da recusa. | I | Sim (ressalva: sem teste) |
| 2 | Linha de base | CONCLUÍDA | Seção "Diagnóstico observado" do plano; `project-meta.json` com commit, fingerprint e contagens (`:364-391`). | I | Sim |
| 3 | Perguntas de valor | PARCIAL | `docs/graphify-benchmark.json` com 10 casos, mas só 3 dos 9 temas do plano; GR40-10 autorreferente. | I | **Não** (matriz otimista) |
| 4 | Responsabilidades | PARCIAL | Papéis genéricos; sem nomes nem procedimento de transferência. | P | Sim |
| 5 | Decisão de arquitetura | CONCLUÍDA | `docs/GRAPHIFY.md:1-15`; `GOVERNANCA_FECHAMENTO.md:23-34`; `automation` em `.graphify.project.json:30-35`. | I | Sim |
| 6 | Fixar ferramenta e ambiente | PARCIAL | Pin 0.9.48 (requirements, config, `doctor:758`, avaliação da 0.9.68). Transitivas sem pin e sem hash; `.in` inexistente. | I | **Não** (leve) |
| 7 | Configuração versionada | CONCLUÍDA (ressalva) | `.graphify.project.json`; `readProjectConfig` (`:81-92`). Não valida `queryTokenBudget`/`visualizationNodeLimit`; `ciArtifactRetentionDays` não é lido. | I | Sim (ressalva) |
| 8 | Corpus inicial | PARCIAL | `sourceRoots` e `databaseSourceRoots`; documentação fora do corpus por decisão. | P | Sim |
| 9 | Exclusões e proteção de caminhos | PARCIAL | Lista de permissão, `lstat` contra symlinks e `ensureWithinRoot` (`:137-158`). `.graphifyignore` não é usado pela automação; não há fixture de `.env`/symlink em `tests/graphify-tools.node.mjs`. | I | **Não** |
| 10 | Armazenamento e retenção | CONCLUÍDA | `.gitignore:12-13`; artefato de 14 dias com nome por SHA; fora de `dist`/`public`. | I | Sim |
| 11 | Comando de diagnóstico | PARCIAL | `doctor` existe, mas não verifica Python/`tree_sitter_sql`, não orienta instalação e o wrapper quebra sem `node_modules` (reproduzido). | I | **Não** |
| 12 | Geração estrutural sem IA | CONCLUÍDA | `extract --code-only` (`:438,453`); `mode==='code-only'` obrigatório (`:87`); CI sem chaves. | I | Sim |
| 13 | Reconstruir o mapa atual | CONCLUÍDA | Candidato temporário com promoção; CI 06/10 com 1.491/4.174. | I | Sim (números da matriz defasados) |
| 14 | Direção das relações | PARCIAL (substituída por decisão) | Grafo `directed:false`; decisão em GOVERNANCA:29; o aceite "A importa B → A afetado" não é atendido. | A→I | Parcial: coerente com a decisão, não com o aceite literal |
| 15 | Identidades e caminhos | PARCIAL | `resolveGraphNode` recusa homônimos (`:677-686`); teste de ambiguidade TS (`tests:174`). | P | Sim |
| 16 | Evidência por relação | PARCIAL | `confidence`/`source_file` nas arestas; `explain` mostra a confiança (`:713-726`). | P | Sim |
| 17 | Integridade | CONCLUÍDA | `validateGraph` (`:190-211`): IDs duplicados, endpoints ausentes, caminhos. Autorrelações são só contadas; perdas por colapso não são medidas. | I | Sim (ressalva) |
| 18 | Comunidades | PARCIAL | `cluster-only --no-label`: sem nomes nem curadoria de coesão. | P | Sim |
| 19 | Saídas úteis | CONCLUÍDA | `graph.json`, `graph.html`, `GRAPH_REPORT.md`, `GRAPH_TREE.html`, `project-meta.json` (`:39-49`). | I | Sim |
| 20 | Promoção atômica | PARCIAL | `promoteCandidate` (`:393-415`) e lock (`:341-362`); o teste cobre só a cópia; nada de interrupção ou concorrência. | P | Sim |
| 21 | Consultas simples | CONCLUÍDA | `query`/`path`/`explain` (`:617-623, 728-745`) via `spawnSync` com argumentos em lista. | I | Sim |
| 22 | Vocabulário em português | CONCLUÍDA | `normalizeQuery` (`:531-561`) imprime a expansão (`:621`); teste em `tests:97-107`. | I | Sim |
| 23 | Limites de contexto | CONCLUÍDA | `--budget 1200`; `explain` limita a 40, `impact` a 25 por nível, com aviso. | I | Sim |
| 24 | Análise de impacto | PARCIAL (substituída por decisão) | Vizinhança de até 2 saltos com aviso (`:625-675`); não separa o que é inferido. | A→I | Parcial (mesma ressalva da etapa 14) |
| 25 | Impacto → testes | **NÃO INICIADA** | Nenhum código sugere ou associa testes; só é possível navegar manualmente. | P | **Não** (matriz otimista) |
| 26 | Atualização incremental | CONCLUÍDA por decisão | `update` = `build` (`:777`); GOVERNANCA:31 (rebuild atômico). | A→I | Sim |
| 27 | Renomes, exclusões e branches | PARCIAL | O rebuild completo elimina órfãos; o fingerprint inclui arquivos não rastreados (`-co`); sem testes. | P | Sim |
| 28 | Verificação de atualidade | CONCLUÍDA | `status`/`check` (`:489-529`): ATUAL, DEFASADO, AUSENTE e INVÁLIDO; fingerprint inclui o lockfile. Não registra árvore suja. | I | Sim |
| 29 | Instruções aos agentes | CONCLUÍDA | Seção Graphify em `AGENTS.md`. | I | Sim |
| 30 | Fluxo Git local (hooks) | CONCLUÍDA por decisão | GOVERNANCA:32 (não instalar); `doctor` informa o estado dos hooks (`:760`); `.graphifyrc`. | A→I | Sim |
| 31 | Selecionar documentação | **NÃO INICIADA** | Não há lista de documentos nem código; nenhum `.md` está no grafo. | P | **Não** (matriz otimista) |
| 32 | Separar estrutural e semântico | PARCIAL | Só existe a rotina estrutural; o passe semântico não existe. | P | Sim |
| 33 | Contratos de dados | PARCIAL | SQL em mapa separado (`validateSeparatedCorpora`, `graphify-quality.mjs:357-363`), o que impede ligar TS → RPC → migration num único grafo. | P | Sim |
| 34 | Fronteiras entre bancos | **NÃO INICIADA** | Nada no grafo nem no wrapper; os guardas existem só no código da aplicação. | P | **Não** (leve) |
| 35 | Implementação, ativação e deploy | PARCIAL | Apenas avisos textuais (`GRAPHIFY.md:20`, AGENTS.md); nenhuma representação no grafo. | P | Sim |
| 36 | Requisitos → implementação | PARCIAL | Ledger CSV manual com 230 IDs; sem vínculo com o grafo. | P | Sim |
| 37 | Memória técnica | **NÃO INICIADA** | Nenhum artefato ou comando de memória no repositório. | P ("memórias locais usadas") | **Não** |
| 38 | Instruções para o time | PARCIAL | `docs/GRAPHIFY.md` cobre comandos, limites e recuperação, mas **não a instalação**; o README só tem o badge. | I | **Não** |
| 39 | Visualização local | PARCIAL | HTML nativo e árvore; MCP não adotado; filtros e acessibilidade não testados. | P | Sim |
| 40 | Métricas de utilidade | PARCIAL | Benchmark mede só acerto; sem tempo e contexto; `directFound` trivial. | N→I | **Não** |
| 41 | Workflow no GitHub | CONCLUÍDA | `graphify.yml`: `contents: read`, actions fixadas por SHA, versão fixa; CI verde em `3f82233`. | I | Sim |
| 42 | Permissões e artefatos | PARCIAL | `persist-credentials: false`, retenção de 14 dias, nome por SHA. O scanner não cobre `sb_secret_`, `re_`, `whsec_` nem JWT. | P | Sim |
| 43 | Gatilhos e cache | PARCIAL | Sem filtro de caminhos (roda em PR só de docs); cache npm/pip por lockfile; sem cache de grafo. | P | Sim |
| 44 | Relatório de impacto base/head | PARCIAL | `compare` (`:237-311`) e workflow (`:55-69`); sem módulos afetados, testes sugeridos ou step summary. | N→I | **Não** |
| 45 | Conteúdo hostil | PARCIAL | Testes do scanner (`tests:256-283`) e limite de 500 caracteres na consulta; sem fixtures de HTML, comentários ou symlinks. A matriz fala em "seis testes" (hoje são 17). | P | Sim (texto defasado) |
| 46 | Falhas e concorrência | PARCIAL | Lock e validações existem; não há simulação de timeout, disco cheio ou interrupção. | P | Sim |
| 47 | Cobertura e precisão | PARCIAL | Benchmark 10/10; precisão, aliases e chamadas indiretas não auditados. | P | Sim |
| 48 | Desempenho | PARCIAL | Medição observada só em log de CI (extração ≈8 s, etapa ≈12 s, job ≈45 s em 06/10). `timeout-minutes: 10` sem base documentada; sem fixture maior. | P | Sim |
| 49 | Recuperação e atualização | PARCIAL | A 0.9.68 foi avaliada isoladamente (`GRAPHIFY_0968_EVALUATION_20261005.md`). A restauração de snapshot não foi ensaiada; o `.previous` é apagado após o sucesso. | P | Sim |
| 50 | Publicar e acompanhar | PARCIAL | Versionado, CI verde, artefato oficial gerado; passe documental, recuperação adversarial e aceites literais pendentes. | P | Sim |

### Contagem

| Status | Quantidade | Etapas |
|---|---:|---|
| CONCLUÍDA (inclui 2 "por decisão") | 17 | 1, 2, 5, 7, 10, 12, 13, 17, 19, 21, 22, 23, 26, 28, 29, 30, 41 |
| PARCIAL (inclui 2 "substituídas por decisão") | 29 | 3, 4, 6, 8, 9, 11, 14, 15, 16, 18, 20, 24, 27, 32, 33, 35, 36, 38, 39, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50 |
| NÃO INICIADA | 4 | 25, 31, 34, 37 |

A matriz registra **26 I / 24 P / 0 N**. Há **13 divergências**:
- **9 linhas em que a matriz marca I e esta auditoria encontrou PARCIAL:** GR03, GR06, GR09, GR11, GR14, GR24, GR38, GR40, GR44. GR14 e GR24 são "I por decisão", mas o aceite literal não foi cumprido.
- **4 linhas em que a matriz marca P e esta auditoria encontrou NÃO INICIADA:** GR25, GR31, GR34, GR37.

Além disso, os números e textos de evidência da matriz (GR08, GR13, GR45) e os `commit_auditado` são anteriores à refatoração `8ca1228`, com dois corpora e o enriquecimento TS.

## 2.3 Conclusão sobre o Graphify

A camada estrutural local e de CI funciona e está verde: build atômico, check de atualidade, benchmark 10/10, separação dos mapas de aplicação e de banco, enriquecimento de tipos TS e guardas de raiz, IA e Supabase. O título do plano ("execução concluída para a camada estrutural") é defensável **só** para os lotes 2, 3 e 5 em sua parte determinística.

O lote 4 (conhecimento técnico: etapas 31 a 37) está majoritariamente **não iniciado ou apenas documental**. As promessas de direção e de impacto causal (14, 24, 25) foram trocadas por decisões de escopo. A reprodutibilidade em clone limpo (6, 11, 38) tem lacunas reais, comprovadas nesta sessão: sem `node_modules`, nenhum comando `graph:*` funciona, e não há instrução de instalação do Python. Recomenda-se atualizar a matriz GR com o estado pós-#95 e reclassificar as 13 linhas divergentes.
