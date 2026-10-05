# Auditoria total de design, layout e UX

Data: 2026-10-05  
Base auditada: `origin/main` em `13c5238`  
Branch de correção: `audit/ux-master-100-stages`  
Escopo: frontend público, APIs Vercel, Supabase isolado `xlzmclcjdncjfdrjxclt` e contrato público somente leitura do catálogo canônico `doufsxqlfjyuvxuezpln`.

## Resumo executivo

1. Foram auditadas 18 rotas, 54 combinações de viewport, 21 tabelas privadas, 69 funções SQL, 99 checks e os cinco fluxos críticos.
2. A auditoria consolidou 8 achados: 1 crítico, 3 altos, 3 médios e 1 baixo.
3. Quatro achados foram corrigidos e verificados nesta branch; um quinto possui correção verificada no PR #88, ainda sem merge.
4. O maior defeito corrigido permitia que uma resposta tardia apagasse a seleção depois de o usuário sair do briefing no WebKit.
5. A autenticação agora diferencia “validando”, “verificada” e “falhou”, sem sucesso falso nem carregamento infinito.
6. Formulários de briefing, contato, login e seleção salva não aceitam edições que seriam descartadas durante uma requisição.
7. A matriz 360/768/1280 encontrou zero overflow horizontal, zero falha de landmark/h1 e zero violação Axe séria/crítica.
8. O banco local foi reconstruído por 64 migrations; 574 testes pgTAP e o lint SQL passaram.
9. As 64 versões de migration locais e remotas estão reconciliadas.
10. O catálogo canônico expôs 7.748 produtos e nenhuma coluna proibida de preço, estoque ou fornecedor.
11. Riscos restantes: PR #88 depende de revisão, há 86 avisos de nomes de cores na origem e provedores externos não foram ensaiados ponta a ponta.
12. A melhoria mais significativa é preservar a intenção do cliente sob rede lenta, troca de rota e falha de autenticação.

## Método e gates

| Fase | Etapas | Evidência / checkpoint | Resultado |
|---|---:|---|---|
| Reconhecimento | 1–10 | Graphify atualizado, `src/App.tsx`, endpoints, migrations e personas | concluída |
| Estados | 11–20 | matriz de 18 rotas × 5 estados | concluída |
| Navegação | 21–30 | diagramas e E2E de voltar, deep link, erro e pós-ação | concluída |
| Feedback | 31–40 | inventário de mutações/catches e simulação de rede lenta | concluída |
| Consistência | 41–50 | guia de linguagem, datas, status e controles | concluída |
| Formulários | 51–60 | contratos UI/API/banco e bloqueio durante submit | concluída |
| Acessibilidade | 61–70 | Axe, teclado, foco, alvos e reduced motion | concluída |
| Responsividade | 71–80 | 54 renderizações em 360/768/1280 | concluída |
| Dados/performance | 81–90 | `pg_catalog`, stats remotos, EXPLAIN/pgTAP e contrato do catálogo | concluída |
| Correção | 91–100 | diffs mínimos, testes, achados e pendências | concluída |

O grafo estrutural foi atualizado antes da leitura: 2.097 nós e 4.505 relações no commit-base. Ele foi usado como mapa; todo achado foi confirmado no código, browser ou banco.

## Checkpoint 1 — Mapa do sistema

### Stack

- React 19 + TypeScript + Vite 8; roteamento com React Router 7.
- Estado local/contextos para carrinho e autenticação; persistência seletiva em `localStorage`/`sessionStorage`.
- Catálogo por PostgREST sobre view pública do Supabase canônico, somente leitura.
- Dados privados do site por APIs Vercel e RPCs do Supabase isolado.
- Autenticação via `@supabase/supabase-js`; RLS forçada no schema privado.
- CSS autoral em `src/styles.css`, tokens em `:root`, Space Grotesk e ícones Lucide.
- Testes Vitest, Playwright/Axe, Node test runner e pgTAP.

### Rotas

| # | Rota | Componente raiz | Guarda/parâmetros |
|---:|---|---|---|
| 1 | `/` | `HomePage` | pública |
| 2 | `/catalogo` | `CatalogPage` | pública; `q`, filtros, perfil e paginação na URL |
| 3 | `/catalogos` | `CatalogsPage` | pública; pesquisa/coleção |
| 4 | `/montar-kit` | `KitBuilderPage` | pública; template e pesquisa |
| 5 | `/datas-comemorativas` | `CommemorativeDatesPage` | pública; ano, busca e favoritos |
| 6 | `/produto/:identifier` | `ProductPage` | slug/UUID/SKU validado; falha fechada |
| 7 | `/orcamento` | `QuotePage` | seleção local; sem checkout |
| 8 | `/selecoes/compartilhada` | `SharedSelectionPage` | token público revogável |
| 9 | `/ideias/:topic` | `IdeaLandingPage` | tópico editorial |
| 10 | `/sobre` | `AboutPage` | pública |
| 11 | `/contato` | `ContactPage` | pública |
| 12 | `/privacidade` | `PrivacyPage` | pública |
| 13 | `/entrar` | `CustomerLoginPage` | `next` limitado a `/minha-conta` |
| 14 | `/auth/confirm` | `AuthConfirmPage` | callback de autenticação; `next` sanitizado |
| 15 | `/definir-senha` | `SetPasswordPage` | exige sessão de recuperação |
| 16 | `/minha-conta` | `CustomerAccountPage` | `CustomerRoute`; busca/status/página |
| 17 | `/minha-conta/orcamentos/:id` | `CustomerQuotePage` | `CustomerRoute`; UUID validado |
| 18 | `*` | `NotFoundPage` | recuperação para início e catálogo |

### Rota → dados

```text
Home/Catálogo/Produto/Kit/Datas
  → src/lib/catalog.ts → view pública canônica → products/product_variants (somente leitura)

Orçamento
  → /api/quote-requests → preflight/rate limit → RPC store_quote_request
  → quote_requests + quote_items + consent_receipts
  → trigger/outbox → notification_deliveries

Contato
  → /api/contact-requests → RPC store_contact_request
  → contact_requests + consent_receipts + notification_deliveries

Seleção compartilhada
  → /api/shared-selections → RPCs create/read/revoke
  → shared_selections + shared_selection_rate_limits

Área do cliente
  → Supabase Auth + RPCs get/claim/request
  → customer_profiles + quote_requests + quote_request_events
  → proposal_documents + quote_adjustment_requests
  → customer_selections + customer_occasion_favorites + customer_briefing_assets

Notificações/webhooks/retention
  → APIs Vercel + cron → notification_deliveries/provider_events
  → storage_deletion_queue + erased_customer_identities + logs de auditoria
```

### Banco relevante à UI

Consulta executada em banco local reconstruído via migrations:

```sql
select table_name,
       count(*) as columns,
       count(*) filter (where is_nullable = 'NO') as required,
       count(*) filter (where column_default is not null) as defaulted
from information_schema.columns
where table_schema = 'site_private'
group by table_name;
```

| Grupo | Tabelas | Regras UX invisíveis confirmadas |
|---|---|---|
| Leads | `quote_requests`, `quote_items`, `contact_requests`, `consent_receipts` | limites de 2–800 caracteres, telefone 10–24, 1–999.999 unidades, 1–50 itens, e-mail normalizado, protocolo `PB#########` |
| Conta | `customer_profiles`, `customer_selections`, `customer_occasion_favorites` | seleção 1–100 chars, versão > 0, favorito com slug normalizado |
| Propostas | `proposal_documents`, `quote_adjustment_requests`, `quote_request_events` | versão 1–999, ajuste 2–800 chars, status e eventos fechados por checks |
| Arquivos | `customer_briefing_assets`, `storage_deletion_queue` | PNG/JPEG/WebP, até 10 MiB, caminho sem traversal |
| Compartilhamento | `shared_selections`, `shared_selection_rate_limits` | 1–50 itens; expiração > criação e ≤ 31 dias |
| Entrega | `notification_deliveries`, `notification_provider_events` | canais/status/audiência fechados, lease coerente, tentativa 0–20 |
| Governança | `admin_audit_log`, `admin_ddl_log`, `erased_customer_identities`, `rate_limit_buckets`, `status_transitions` | auditoria, retenção, hash e transições válidas |

Inventário: 21 tabelas, 15 FKs, 67 índices, 41 triggers de usuário ativos, 99 checks. As 21 tabelas têm RLS habilitada e forçada. `anon` não possui EXECUTE nas RPCs privadas; `authenticated` tem 19 grants e `site_api`, 22.

### Fluxos críticos

1. Descobrir produto → filtrar/comparar → adicionar à seleção.
2. Revisar seleção → preencher briefing → enviar → receber protocolo/confirmações.
3. Autenticar → vincular histórico → consultar/repetir orçamento → pedir ajuste/abrir proposta.
4. Montar, salvar, restaurar e compartilhar uma seleção/kit.
5. Enviar contato e acompanhar o retorno preferido.

### Personas

- Profissional de marketing/comunicação, principalmente 20–35 anos, mobile-first e sob prazo de campanha.
- Compras/RH/People, desktop, precisa comparar, documentar e recuperar contexto.
- Cliente recorrente, alterna dispositivos e espera histórico, protocolo e segurança.
- Pessoa anônima em descoberta, não quer criar conta antes do primeiro briefing.

## Checkpoint 2 — Matriz dos cinco estados

Legenda: ✅ explícito/adequado; ⚠️ não aplicável ou depende de subfluxo; referências centrais: `CatalogFeedback`, `CustomerRoute`, `AppErrorBoundary`, páginas abaixo e `e2e/smoke.spec.ts`.

| Rota | Loading | Vazio | Erro + recuperação | Parcial | Permissão |
|---|---|---|---|---|---|
| `/` | ✅ seções do catálogo | ✅ curadorias com CTA | ✅ fallback por seção | ✅ conteúdo editorial permanece | ⚠️ pública |
| `/catalogo` | ✅ skeleton | ✅ sugestão/limpar filtros | ✅ retry | ✅ taxonomia pode falhar fechada | ⚠️ pública |
| `/catalogos` | ✅ | ✅ pesquisa sem resultado | ✅ mensagem/CTA | ✅ coleções independentes | ⚠️ pública |
| `/montar-kit` | ✅ catálogo | ✅ slot orientado | ✅ retry | ✅ composição local preservada | ⚠️ pública |
| `/datas-comemorativas` | ✅ favoritos | ✅ “Minhas datas” | ✅ erro sem cache alheio | ✅ calendário continua | ✅ login é opcional e explicado |
| `/produto/:identifier` | ✅ | ✅ não encontrado | ✅ retry e `noindex` | ✅ galeria/fallback | ⚠️ pública |
| `/orcamento` | ✅ envio | ✅ seleção vazia com CTA | ✅ inline/retry | ✅ arquivo pode ficar pendente sem duplicar pedido | ⚠️ conta opcional |
| compartilhada | ✅ consulta | ✅ sem itens | ✅ retry/expirada/revogada | ✅ indisponíveis sinalizados | ⚠️ token explícito |
| `/ideias/:topic` | ✅ produtos | ✅ CTA catálogo | ✅ conteúdo editorial permanece | ✅ | ⚠️ pública |
| `/sobre` | ⚠️ estática | ⚠️ | ✅ boundary global | ⚠️ | ⚠️ pública |
| `/contato` | ✅ envio | ⚠️ formulário | ✅ inline | ⚠️ | ⚠️ pública |
| `/privacidade` | ⚠️ estática | ⚠️ | ✅ boundary global | ⚠️ | ⚠️ pública |
| `/entrar` | ✅ sessão | ⚠️ formulário | ✅ retry após F02 | ⚠️ | ✅ configuração/sessão distintas |
| `/auth/confirm` | ✅ após F01 | ⚠️ | ✅ retry/voltar | ⚠️ | ✅ identidade não confirmada não vaza histórico |
| `/definir-senha` | ✅ pending | ⚠️ | ✅ mensagem humana | ⚠️ | ✅ redireciona sem sessão |
| `/minha-conta` | ✅ | ✅ orientação catálogo | ✅ retry | ✅ seleções independentes do histórico | ✅ `CustomerRoute` |
| detalhe orçamento | ✅ | ✅ não encontrado | ✅ retry sem dado antigo | ✅ proposta falha sem derrubar timeline | ✅ titular/RLS |
| `*` | ⚠️ | ⚠️ | ✅ início + catálogo | ⚠️ | ⚠️ pública |

Listas: catálogo é paginado; histórico normaliza página e RPC limita paginação; seleções têm limite 30; compartilhamento/carrinho têm limite 50. Produção isolada tem volume ainda pequeno (stats remotos: 298 logs DDL, 30 transições, 2 buckets de rate limit, 1 seleção compartilhada; tabelas de leads estimadas em 0 no instante da consulta), enquanto o catálogo real tinha 7.748 produtos.

## Checkpoint 3 — Navegação e controle de fluxo

```text
Catálogo → Produto → Seleção → Briefing → Sucesso
   ↑          ↘ voltar      ↘ erro inline + retry
   └────────────────────────── continuar escolhendo

Briefing → navegar para fora durante envio
  antes: resposta tardia podia limpar a seleção [F04]
  agora: AbortController + identidade + rota de origem invalidam a resposta

Login → confirmação → claim do histórico → destino `next`
  falha SDK → estado acionável + tentar novamente [F02]
  callback inválido → voltar ao acesso

Conta → detalhe → proposta/ajuste → conta
  detalhe inválido/falha → retry/voltar; dado da rota anterior é removido
```

- Drawers e dialogs têm Escape, foco e retorno de foco cobertos nos E2E.
- A seleção confirma substituição/limpeza e oferece desfazer quando reversível.
- Deep links de produto possuem shell SSR/Vercel; rotas SPA profundas retornam 200 nas origens Vercel.
- Rotas protegidas preservam `next` apenas dentro de `/minha-conta`, evitando open redirect.
- Pós-envio oferece protocolo, acompanhamento e retorno ao catálogo.

## Checkpoint 4 — Ação e feedback

| Ação | Feedback atual verificado | Proteção |
|---|---|---|
| Adicionar/remover/limpar seleção | drawer, confirmação e desfazer | limite 50 e estado persistido |
| Enviar briefing | `Enviando…`, controles congelados, sucesso com protocolo ou erro acionável | idempotency key, abort e resposta obsoleta ignorada |
| Enviar contato | `Enviando…`, sucesso/protocolo ou fallback de e-mail | idempotency key e fieldset bloqueado |
| Login/cadastro/recuperação | loading, mensagem por método, erro traduzido | botões/modo congelados durante request |
| Salvar/restaurar seleção | status, confirmação e conflito otimista explícito | versão e rollback visual |
| Pedir ajuste | sending/success/error inline | client request id e limite 800 |
| Abrir proposta | `Abrindo…`, erro com nova tentativa | URL assinada e titular verificado |
| Upload de briefing | processamento, erro e remoção | tipo/tamanho/assinatura e storage privado |

Auditoria de `catch`: não restou `catch` vazio em ação do usuário. Catches de parsing (`response.json().catch`) são fronteiras deliberadas e o chamador converte para erro humano. Fallbacks não fatais estão documentados em `QuotePage` (pedido persistido, anexo pendente), `SavedSelections` (preserva carrinho) e `useOccasionFavorites` (rollback). O `getSession()` sem tratamento de reject/`error` foi corrigido em `src/context/CustomerAuthContext.tsx:34-51`.

## Checkpoint 5 — Guia de consistência

| Tema | Padrão adotado |
|---|---|
| Datas | armazenamento UTC/timestamptz; input `YYYY-MM-DD`; exibição `Intl.DateTimeFormat('pt-BR')`, data civil ancorada em 12:00 quando não há horário |
| Moeda/estoque | não expor no site; proposta é sob medida e estoque de fornecedor não é prometido |
| Telefone | máscara `(DD) 99999-9999` na UI; API normaliza/valida antes do banco |
| Termos | “seleção” antes do envio; “briefing/solicitação” depois; “proposta” para documento comercial; “nosso time de especialistas” para atendimento |
| Status | Recebida, Briefing em análise, Curadoria em andamento, Proposta disponível, Encerrada |
| Botão primário | verde/ácido para avanço; dark para ação segura; outline/textual para alternativa; destrutivo sempre verbalizado |
| Erros/sucesso | `role=alert` para falha; `role=status` para progresso/sucesso; mensagem humana e próxima ação |
| Capitalização | sentence case em labels/botões; kickers podem usar caixa alta visual via CSS |
| Ícones | decorativos com `aria-hidden`; botões só-ícone com nome acessível |
| Layout | tokens de `src/styles.css`; componentes responsivos com `clamp`, grid e breakpoints consolidados |

O contrato público contém 36 campos e proíbe recursivamente nomes ligados a preço, custo, estoque, fornecedor, integração e variante interna.

## Checkpoint 6 — Formulários

| Formulário/campos | Label/tipo | UI | API/banco | Rascunho/conflito |
|---|---|---|---|---|
| Briefing: nome, empresa, e-mail, telefone | labels; email/tel/inputmode | obrigatórios, foco no primeiro erro | checks de 2–160/telefone 10–24 | sessão por prazo definido; limpo só no sucesso |
| Briefing: prazo/evento | date/min hoje | passado bloqueado inline | normalização/validação da API | preservado |
| Briefing: notas/ação/verba/canal | labels/select/textarea | limites e dependências explicadas | checks/JSON validados | preservado |
| Briefing: consentimentos | checkbox + texto | comercial obrigatório; WhatsApp opcional | `consent_receipts.accepted=true` | dados pessoais limpos na troca de titular |
| Contato | labels, email/tel/select/textarea | nome/e-mail/consentimento; telefone opcional | `contact_requests` espelha limites | tentativa idempotente |
| Login | email/password/OTP corretos | modo e controles congelados no request | Supabase Auth/rate limits | sem armazenar senha |
| Senha | `new-password`, confirmação | ≥8 e igualdade | Auth valida | pending bloqueia repetição |
| Ajuste | label/textarea | 2–800 | check 2–800 + idempotência | conflito não apaga texto |
| Seleção salva | label/título | 1–100, bloqueada em mutação | check + versão otimista | diálogo de conflito preserva duas versões |
| Assets | file input rotulado | PNG/JPEG/WebP ≤10 MiB | assinatura real, RLS e checks | upload privado, vínculo retryável |

Não foram encontrados inputs interativos sem nome acessível nos templates exercitados pelo Axe. Tabulação segue o DOM visual; autocomplete de busca aceita teclado; erros críticos usam `aria-describedby`.

## Checkpoint 7 — Acessibilidade

- 54 combinações de rota/viewport: zero violação Axe séria/crítica WCAG A/AA/2.1/2.2.
- Suíte Playwright cobre fluxo apenas por teclado, foco após rota, menu Escape, dialogs com trap/retorno e autocomplete.
- `:focus-visible` permanece visível; não há remoção global sem substituto.
- Cada render auditizado continha exatamente um `h1` e um `main`.
- Imagens de produto decorativas usam `alt=""` quando o link já nomeia o produto; imagens significativas têm texto alternativo.
- Reduced motion é respeitado pelos componentes animados e pelos testes.
- Alvos menores que 24 px medidos eram links inline (exceção de texto) ou checkbox dentro de label clicável; botões críticos têm área ampliada.
- Não há status comunicado apenas por cor: todos apresentam texto e/ou ícone.
- Fluxos críticos foram cobertos em Chromium, Firefox e WebKit; a corrida encontrada no WebKit originou F04.

## Checkpoint 8 — Responsividade

Matriz automatizada: 18 rotas × 360/768/1280 = 54 renderizações.

| Família de tela | 360 px | 768 px | 1280 px | Evidência |
|---|---|---|---|---|
| Home/editorial | ✅ | ✅ | ✅ | overflow 0, 1 h1/main |
| Catálogo/produto | ✅ | ✅ | ✅ | produto real `agenda-diaria-2026-02469` |
| Catálogos/kit/datas | ✅ | ✅ | ✅ | Axe sem sério/crítico |
| Seleção/briefing | ✅ | ✅ | ✅ | vazio + fluxo preenchido nos E2E |
| Contato/privacidade/sobre | ✅ | ✅ | ✅ | labels e CTA visíveis |
| Auth/conta protegida | ✅ | ✅ | ✅ | redirects/estados renderizados |
| Compartilhada/ideias | ✅ | ✅ | ✅ | erro vazio e conteúdo real |
| 404 | ✅ | ✅ | ✅ | recuperação presente |

Resultado agregado: 0 overflow horizontal, 0 falha de navegação, 0 página sem/excesso de h1, 0 página sem/excesso de main. Os dois 404 de console por rota no preview local eram exclusivamente `/ _vercel/insights` e `/ _vercel/speed-insights`; nas duas origens Vercel publicadas o catálogo retornou 200 e zero erro de console.

## Checkpoint 9 — Integridade dados/interface e performance

### Status banco × UI

| Entidade | Banco | UI/contrato |
|---|---|---|
| orçamento | `new, triaged, in_progress, quoted, closed, spam` | cinco estados de cliente mapeados; `spam` é excluído do RPC e rejeitado pelo parser público |
| contato | `new, triaged, in_progress, closed, spam` | não exposto como painel ao cliente |
| ajuste | `new, triaged, resolved, closed` | timeline recebe evento e mensagem humana |
| entrega | `pending, processing, sent, failed, cancelled, exhausted` | fila operacional, não vazada ao cliente; confirmação é `sent/pending/not_requested` |
| delivery state | `delivered, bounced` | observabilidade/webhook, sem promessa falsa no front |

### Consultas reais executadas

```sql
-- Inventário estrutural: 21 tabelas / 15 FKs / 67 índices / 41 triggers / 99 checks.
select ... from pg_catalog.pg_class, pg_catalog.pg_constraint,
                pg_catalog.pg_trigger, pg_catalog.pg_index;

-- Segurança: todas as 21 tabelas privadas com RLS e FORCE RLS.
select count(*) filter (where relrowsecurity),
       count(*) filter (where relforcerowsecurity)
from pg_catalog.pg_class
where relnamespace = 'site_private'::regnamespace and relkind = 'r';

-- Ledger local: 64 migrations, de 20260908230000 a 20261001130320.
select count(*), min(version), max(version)
from supabase_migrations.schema_migrations;
```

No remoto, `supabase migration list --linked` retornou as mesmas 64 versões, sem local-only ou remote-only. `supabase inspect db table-stats --linked` confirmou o volume real pequeno descrito no Checkpoint 2. A RPC segura `site_notification_queue_health()` retornou email e WhatsApp com `eligible=0`, `exhausted=0`, `uncertain=0`.

O teste pgTAP `query_plans.test.sql` criou 6.000 solicitações sintéticas com distribuição realista e confirmou ausência de `Seq Scan` nas cinco consultas críticas: claim da fila, lease expirada, webhook por provider id, histórico por titular/data e retenção. As pré-condições impedem aprovação por vacuidade.

Contrato remoto canônico: 7.748 produtos, 36 colunas, zero campo proibido. Avisos: 2 swatches sem nome e 84 nomes duplicados (F06). Build pós-correção: JS inicial 95,2 KiB Brotli; maior chunk assíncrono 45,4 KiB Brotli, dentro do budget.

## Checkpoint 10 — Achados consolidados

### [CRÍTICO] #F04 — Resposta tardia apagava a seleção após sair do briefing

Camada: front  
Onde: `src/pages/QuotePage.tsx:77-82,225-285`; `/orcamento`  
Evidência: o novo E2E passou no Chromium/Firefox e inicialmente falhou no WebKit: esperado 1 item, recebido 0 depois de navegar durante request lento.  
Impacto no usuário: a pessoa mudava de página e perdia silenciosamente uma seleção trabalhada.  
Correção: abort no cleanup + rejeição da resposta se identidade ou `window.location.pathname` diferir da operação original.  
Status: **CORRIGIDO+VERIFICADO** — 3/3 repetições WebKit, 1/1 Firefox e matriz cross-browser completa após o fix.

### [ALTO] #F01 — Callback anunciava identidade verificada antes da verificação

Camada: front  
Onde: `src/pages/AuthConfirmPage.tsx:16-37`; `/auth/confirm`  
Evidência: `failed=false` renderizava “IDENTIDADE VERIFICADA” inclusive com `auth.loading=true`. Teste novo prova que loading não contém a mensagem.  
Impacto no usuário: sucesso falso em uma etapa sensível de identidade.  
Correção: estados exclusivos loading/falha/verificada, `role=status`/`role=alert` corretos.  
Status: **CORRIGIDO+VERIFICADO** — 3 testes Vitest.

### [ALTO] #F02 — Falha do SDK podia deixar autenticação infinita

Camada: integração/front  
Onde: `src/context/CustomerAuthContext.tsx:16-78`; `CustomerRoute`, login e callback  
Evidência: `getSession().then` não tratava rejeição nem `result.error`; cliente nulo retornava sem `setLoading(false)`.  
Impacto no usuário: tela presa em loading ou redirecionamento sem explicação.  
Correção: `initializationFailed`, telemetria, tratamento de todas as saídas e retry real que reinicializa assinatura/sessão.  
Status: **CORRIGIDO+VERIFICADO** — rejeição e erro resolvido pelo SDK cobertos; contrato conferido na documentação oficial Supabase.

### [ALTO] #F03 — Edições durante envio eram descartadas sem aviso

Camada: front  
Onde: `ConversationForm.tsx:95-141`, `CustomerLoginPage.tsx:118-132`, `SavedSelections.tsx:182-185`, `QuotePage.tsx:371-417`  
Evidência: somente submit ficava disabled; campos continuavam editáveis e o sucesso posterior zerava o estado.  
Impacto no usuário: texto, consentimento, quantidade ou modo digitado sob rede lenta desaparecia.  
Correção: `aria-busy`, fieldsets desabilitados e bloqueio das mutações adjacentes.  
Status: **CORRIGIDO+VERIFICADO** — testes unitários e E2E de request retida.

### [MÉDIO] #F05 — Padrão pontilhado compete com fotografia do produto

Camada: front/design  
Onde: `src/styles.css`, cards de catálogo; PR #88 (`4f88d86`)  
Evidência: screenshot fornecido pelo PO e inspeção do background aplicado na mídia.  
Impacto no usuário: as “bolinhas” passam visualmente sobre/atrás de objetos claros e reduzem a leitura do produto.  
Correção: fundo limpo na área de mídia, mantendo badge único e borda do card.  
Status: **PENDENTE** — correção e quality gate verificados no PR #88; merge exige revisão humana.

### [MÉDIO] #F06 — Nomes de cores incompletos/duplicados na origem

Camada: dados/integração  
Onde: contrato público canônico `catalog_products_public.color_swatches`  
Evidência: auditor remoto de 7.748 produtos retornou 2 swatches sem nome e 84 nomes duplicados.  
Impacto no usuário: escolha de variação pode ficar ambígua em produtos afetados.  
Correção: higienizar a origem/ETL e manter o warning no gate; não alterar silenciosamente dados do Promo Gifts.  
Status: **PENDENTE** — banco canônico é somente leitura neste projeto.

### [MÉDIO] #F07 — Entrega real por e-mail/WhatsApp não foi ensaiada

Camada: integração/operação  
Onde: Vercel/Resend/WhatsApp; `api/notifications.ts`  
Evidência: fila remota saudável e vazia; contratos, webhooks e pgTAP passam, mas credenciais/provedores foram explicitamente deixados para depois.  
Impacto no usuário: não há prova desta rodada de que a confirmação chega ao dispositivo real.  
Correção: configurar segredos nos painéis e executar canário com destinatários controlados, validando `sent/delivered/bounced`.  
Status: **BLOQUEADO** — depende de configuração externa deliberadamente adiada.

### [BAIXO] #F08 — Origem pública local diverge da produção Vercel

Camada: configuração local  
Onde: `.env.local` (não versionado) versus `.vercel/.env.production.local`  
Evidência: local apontava `www.promobrindes.com.br` (WordPress; `/catalogo` 403); produção aponta `promo-brindes-v1.vercel.app` e as rotas testadas retornam 200.  
Impacto no usuário: nenhum em produção; pode confundir smoke test/SEO de desenvolvedor.  
Correção: alinhar o env local quando o domínio oficial do novo site for decidido; não modificar a infraestrutura por suposição.  
Status: **PENDENTE** — decisão de domínio.

## Verificação executada

- `npm run check` na linha de base: lint, TypeScript, 434 unitários, testes Node, build, budget e 96 E2E passaram; 4 skips condicionais.
- `npm run check` pós-correção: lint e TypeScript aprovados; 440 unitários e todos os gates Node aprovados; build/budget aprovados; 102 E2E executados, com 98 aprovações e 4 skips condicionais.
- Testes novos focados: 10/10 Vitest aprovados nas áreas alteradas.
- E2E novo: Chromium aprovado; Firefox aprovado; WebKit revelou F04 e depois passou 3 repetições.
- Cross-browser completo pós-fix: 102 cenários em Firefox/WebKit, com 90 aprovações, 12 skips condicionais por projeto/viewport e zero falha.
- `npm run db:site:reset`: 64 migrations aplicadas do zero.
- `npm run db:site:test`: 28 arquivos, 574 testes, PASS.
- `npm run db:site:lint`: zero warning/erro de schema.
- `supabase migration list --linked`: local/remoto reconciliados.
- `npm run check:catalog-contract`: 7.748 produtos e zero coluna proibida.
- Matriz Playwright/Axe: 54/54 navegações, zero overflow e zero violação séria/crítica.
- Origens Vercel `git-main` e alias de produção: `/catalogo?perfil=novos` = 200, zero erro de console.

## Pendências objetivas

1. Aprovar e mesclar PR #88 para levar o fundo limpo dos cards ao `main`.
2. Abrir tarefa de qualidade na fonte para os 86 avisos de swatches; não corrigir o canônico por este site.
3. Quando os provedores forem configurados, rodar canário real de e-mail/WhatsApp e anexar os IDs de entrega ao relatório operacional.
4. Definir o domínio canônico do novo site antes de trocar `VITE_PUBLIC_URL`/DNS; hoje a configuração Vercel publicada está coerente.

Não houve alteração estrutural nem destrutiva em produção. O Promo Gifts e seu banco canônico foram acessados apenas pela view pública/contrato de leitura.
