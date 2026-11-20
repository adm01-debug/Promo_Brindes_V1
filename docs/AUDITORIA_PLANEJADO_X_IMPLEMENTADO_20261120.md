# Auditoria planejado × implementado — 20/11/2026

Levantamento exaustivo de tudo o que foi **planejado** para o site Promo Brindes (planos de 50 e 100 etapas, matriz de 230 requisitos, benchmarks, runbooks, contratos de banco, textos da interface, auditorias anteriores) confrontado com o **código de hoje**. Lista o que **não foi implementado** ou foi implementado **parcialmente**, item a item, com evidência.

| Campo | Valor |
| --- | --- |
| Base auditada | `main` = `40f6420` (19/11/2026, "infra(ci): verify-db tolera espera dos gates…" #210) |
| PRs abertas consideradas | #211 (caminho "ainda não sei o que escolher" — PF-38), #212 (limpar contexto da campanha — PF-39), #213 (contexto editável no orçamento — PF-41). Nenhuma conta como implementada. |
| Ponto de partida | `docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md` (128 itens PF, base `3f82233`) e `docs/AUDITORIA_PENDENCIAS_ENG_VERIFICACAO_20261117.md` (58 itens ENG). Entre 11/10 e 19/11 entraram 111 commits (PRs #88–#210); cada item foi **reverificado no código de hoje**, não assumido. |
| Escopo lido | `docs/` (planos, revisões, execuções, runbooks, contratos, matrizes), `AUDITORIA.md`, `PLANO_100.md`, `UX_AUDIT_REPORT.md`, `PENDENCIAS.md`, `analise-prs/`; `src/`, `api/`, `shared/`, `site-supabase/` (69 migrations, 29 pgTAP), `scripts/`, `tests/`, `e2e/`, `.github/` (15 workflows), `vercel.json`, `.env.example`, `package.json` |
| Método | 8 lotes de verificação em paralelo (um por bloco de itens), cada afirmação com `arquivo:linha` no HEAD ou busca negativa reproduzível (`grep … = 0`). Estado remoto lido pela API do GitHub e pelo snapshot do banco publicado na branch `contexto` (19/11 15:08). A Vercel recusou o token disponível: variáveis de produção **não verificadas**. |
| Anexos | [`docs/audits/planejado-x-implementado-20261120/`](audits/planejado-x-implementado-20261120/) — 9 relatórios com a tabela completa de cada lote (inclui as 100 etapas do plano de fechamento, as 100 do Carnegie, as 100 de workflows, as 41 pendências dos planos de correções, as 50 do Graphify e o estado remoto) |

## Limites desta auditoria

- **Testes não executados**: Vitest, Playwright e pgTAP não rodaram; afirmações sobre teste vêm da leitura dos arquivos e dos runs do CI.
- **Vercel**: a API devolveu `Not authorized` ao token do proxy. Presença de `RESEND_API_KEY`, `WHATSAPP_*`, `COMMERCIAL_TEAM_WEBHOOK_URL`, `OPERATIONS_ALERT_WEBHOOK_URL`, `SITE_EMAIL_FROM` e das flags `VITE_*_ENABLED` em produção é **inferida**, não lida.
- **Banco isolado** (`xlzmclcjdncjfdrjxclt`): sem MCP nesta sessão; estado vem do snapshot automático em `origin/contexto:docs/contexto/supabase/` (69 migrations aplicadas e iguais ao repositório; `quote_requests`, `contact_requests`, `proposal_documents` e `quote_adjustment_requests` com 0 linhas; 1 usuário Auth).
- **Varredura documento a documento** (130 agentes adicionais) foi interrompida por limite de uso do modelo: 4 de 130 concluíram. A cobertura exaustiva aqui vem dos 8 lotes por ID (que releram os planos e anexos) e não de uma segunda leitura independente de cada arquivo de `docs/`. Verificação adversarial dos vereditos: pendente (ver "Próximos passos").
- **Promo Gifts** (banco canônico e sistema interno) fora do escopo; aparece só como dependência.

## Legenda

| Estado | Significado |
| --- | --- |
| **IMPLEMENTADO** | Entregável completo no código de hoje. |
| **PARCIAL** | Existe parte; a coluna "o que falta" diz exatamente o quê. |
| **PARCIAL-VALIDAÇÃO** | Código existe; falta homologação real, ensaio, configuração em produção ou aceite humano. |
| **NÃO INICIADO** | Nenhum entregável no código. |
| **BLOQUEADO** | Depende de decisão do dono, credencial, conteúdo, pessoas ou custo. |
| **DIVERGÊNCIA** | Documento, contrato ou texto da interface afirma algo que o código não faz. |

Quem destrava: **ENG** = engenharia pode fazer agora · **DONO** = decisão/credencial do dono · **CONTEÚDO** = marketing/comercial fornece material · **PESSOAS** = pesquisa, revisor, homologação física.

---

## 1. Resumo para o dono

**O site vende a vitrine e coleta o briefing; o ciclo comercial depois do envio continua manual.** Desde 11/10 a engenharia fechou 14 dos 128 itens e avançou outros 30, mas as três coisas que mais custam continuam iguais: (1) nenhuma proposta jamais foi publicada no portal porque não existe ferramenta para publicar, mudar status ou responder ajuste (PF-03/04/05/23); (2) e-mail e WhatsApp de confirmação dependem de credenciais na Vercel que esta auditoria **não conseguiu ler** (PF-07/08/09 — estado inferido da decisão registrada em `EXECUCAO_PLANO_FECHAMENTO_20261001.md:65-66` e de `notification_deliveries` com 4 linhas no snapshot de 19/11; NÃO VERIFICADO em produção), e a tela ainda diz ao cliente que o e-mail foi "registrado para envio" mesmo quando não há provedor (PF-14); (3) o aviso ao time comercial agora existe no código para orçamento e contato (#116, #158), mas só funciona se `COMMERCIAL_TEAM_WEBHOOK_URL` estiver configurada na Vercel, o que não pôde ser confirmado, e o pedido de ajuste não gera aviso nenhum (PF-01).

### Placar dos 128 itens da auditoria de 11/10, reverificados hoje

| Estado hoje | Itens | IDs |
| --- | ---: | --- |
| IMPLEMENTADO | 14 | PF-10, 27, 31 (código; aplicação remota a confirmar), 49, 66, 67 (com divergência: `allowed_actions: selected`), 77, 80, 85, 102, 103, 112, 117, 128 |
| PARCIAL | 49 | PF-01, 11, 14, 15, 16, 17, 18, 23, 24, 25, 28, 29, 32, 35, 37, 40, 42, 43, 44, 48, 50, 53, 56, 60, 62, 63, 70, 71, 72, 73, 74, 78, 79, 88, 94, 96, 97, 100, 101, 106, 108, 109, 111, 114, 116, 118, 119, 122, 123 |
| PARCIAL-VALIDAÇÃO | 5 | PF-06, 26, 51, 65, 92 |
| NÃO INICIADO | 28 | PF-03, 05, 12, 30, 34, 38 (PR #211), 39 (PR #212), 41 (PR #213), 45, 47, 54, 55, 68, 82, 84, 87, 90, 93, 95, 98, 99, 107, 110, 113, 120, 121, 124, 125 |
| BLOQUEADO (externo) | 23 | PF-02, 07, 08, 09, 13, 22, 33, 36, 46, 52, 57, 58, 59, 64, 69, 76, 83, 86, 89, 104, 105, 126, 127 |
| DIVERGÊNCIA | 9 | PF-04, 19, 20, 21, 61, 75, 81, 91, 115 |

**114 dos 128 itens continuam pendentes.** Somam-se **108 itens novos** (não mapeados pela auditoria de 11/10) encontrados na releitura etapa a etapa dos planos e dos runbooks, dos quais 2 já estão implementados (seção 3).

### Placar por plano (etapas, estado de hoje contado linha a linha nos anexos)

| Plano | Etapas | Concluídas | Parciais (+validação) | Não iniciadas | Bloqueadas | Em 11/10 | Anexo |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Plano de fechamento (01/10) | 100 | 8 | 43 (+4) | 13 | 32 | 5 / 41 / 20 / 34 | [06](audits/planejado-x-implementado-20261120/06-plano-fechamento-100-e-carnegie-100.md) |
| Plano Carnegie UX (05/10) | 100 | 14 | 50 (+4) | 21 | 11 | 12 / 49 / 24 / 12 | [06](audits/planejado-x-implementado-20261120/06-plano-fechamento-100-e-carnegie-100.md) |
| Plano de workflows/CI (27/09) | 100 | 21 | 32 (+3) | 35 | 7 (+1 divergência, 1 não verificado) | 21 / 29 / 42 / 8 | [07](audits/planejado-x-implementado-20261120/07-workflows-100-correcoes-5x50-graphify-50.md) |
| Planos de correções 13/09–24/09 (41 pendências deduplicadas) | 41 | 0 | 17 (+1) | 9 | 14 | 9 avançaram, nenhuma fechou | [07](audits/planejado-x-implementado-20261120/07-workflows-100-correcoes-5x50-graphify-50.md) |
| Graphify (11/09) | 50 | 19 | 26 | 4 | 1 | 17 / 29 / 4 | [07](audits/planejado-x-implementado-20261120/07-workflows-100-correcoes-5x50-graphify-50.md) |
| Matriz de 230 requisitos (12/09) | 230 | — | — | — | — | CSV congelado em `dafd3d9` (22/09); só o `MATRIZ_INDEX.md` deixou de chamá-lo de vigente (#208) | PF-109 |

### As 12 lacunas que mais custam ao negócio (estado de hoje)

| # | Lacuna | Estado | Mudou desde 11/10? | Quem destrava |
| --- | --- | --- | --- | --- |
| 1 | Aviso ao comercial quando chega orçamento/contato/ajuste (PF-01) | PARCIAL: orçamento e contato enfileiram e o cron `/api/commercial-alerts` entrega por webhook; **ajuste não**; destino depende de env remota | sim (#116, #158) | DONO (URL/token) + ENG (ajuste) |
| 2 | Ferramenta interna para publicar proposta, mudar status e responder ajuste (PF-03/04/05/23) | NÃO INICIADO; cliente ainda trava após 3 ajustes pendentes | não | ENG após decisão D1 |
| 3 | Confirmação ao cliente por e-mail/WhatsApp (PF-07/08/09) e texto "registrado para envio" (PF-14) | BLOQUEADO (ativação em produção NÃO VERIFICADA: depende de `RESEND_API_KEY`/`SITE_EMAIL_FROM`/`WHATSAPP_*` na Vercel, lidas por `api/notifications.ts:385-393`); WhatsApp já mostra "Indisponível" quando falta canal (#181), e-mail não | parcial (#181) | DONO (credenciais) + ENG |
| 4 | Checkbox de WhatsApp sempre visível sem canal ligado (PF-15) | PARCIAL: texto corrigido (#160), exibição incondicional | parcial | ENG + DONO |
| 5 | Secret scanning e push protection (PF-66) | IMPLEMENTADO (API 20/11) | sim | — |
| 6 | Restore nunca ensaiado, sem RPO/RTO, Storage sem backup (PF-86) | BLOQUEADO | não | DONO |
| 7 | Crons sem vigia independente (PF-87); fila agora medida mesmo sem provedor (PF-10) | PF-10 IMPLEMENTADO (#190); PF-87 NÃO INICIADO | parcial | ENG |
| 8 | LGPD: apagamento ficou completo (#161), mas sem autoexclusão, exportação ou correção (PF-17/30/125) | PARCIAL / NÃO INICIADO | parcial (#161) | ENG + jurídico |
| 9 | Briefing "escuta" fraco (PF-37 a PF-41) | PF-37 PARCIAL (#94 mergeada); 38/39/41 com PRs abertas hoje | sim | ENG + mockup |
| 10 | Domínio oficial (PF-59): canonical, sitemap, robots e CSP em `promo-brindes-v1.vercel.app`; `prod-readiness.md` diz que `www.promobrindes.com.br` já responde | BLOQUEADO | não | DONO |
| 11 | Conteúdo de confiança (PDFs, cases, fotos próprias) (PF-57/58/127) | BLOQUEADO | não | CONTEÚDO |
| 12 | Governança: 0 aprovações nas 25 últimas PRs mergeadas; revisor único; sem ruleset; sem tag de release (PF-69/70/99) | BLOQUEADO / PARCIAL / NÃO INICIADO | não | DONO + ENG |

### Estado remoto lido em 20/11 (GitHub) — detalhe no [anexo 09](audits/planejado-x-implementado-20261120/09-estado-remoto-github-vercel-supabase.md)

- Secret scanning, push protection e Dependabot security **ativos**. `allowed_actions` estava em **`selected`** (AGENTS.md manda `all` e registra que `selected` travou o CI em 14–16/11); isso derrubou o Quality gate (`gitleaks/gitleaks-action`, de terceiro) com `startup_failure` em todas as PRs de 20/11 (#211–#214) e 8 runs de 19/11 à noite (drift detector, contexto). **Restaurado para `all` às 10:36 UTC de 20/11**; `sha_pinning_required` segue true. O inventário semanal não rodou em 16/11.
- Proteção de `main`: `strict` = true, resolução de conversa obrigatória, `enforce_admins` = true, **0 aprovações exigidas**, sem histórico linear, **nenhum ruleset**; checks obrigatórios só os 4 (CodeQL e dependency review não).
- Environments `Production`/`Preview`/`copilot` sem regra nem segredo; nenhum job declara `environment:`.
- **Nenhuma tag** no repositório. Secrets do repositório: `E2E_PADRAO_EMAIL`, `E2E_PADRAO_PASSWORD`, `RESEND_API_KEY` (desde 11/11 e **nenhum workflow a usa**), `SITE_SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`.
- Release: 9 das 13 últimas execuções em `main` (17–19/11) falharam em "Wait for every protected main-branch gate" e não geraram deploy próprio; o run de `40f6420` promoveu, logo produção = HEAD. Nenhum rollback real jamais ocorreu (PF-93).
- Issue #80 (rotação de segredos Q4/2026) aberta desde 01/10.

---

## 2. Os 128 itens da auditoria de 11/10 — estado em `40f6420`

Tabela consolidada (uma linha por item). Evidência completa, comandos reproduzíveis e divergências por item nos anexos 01 a 05.

### 2.1 Atendimento comercial, confirmações e promessas da interface (anexo 01)

| ID | Funcionalidade planejada | Estado HOJE | O que falta | Evidência-chave | Mudou | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-01 | Encaminhar orçamento, contato e ajuste ao comercial | PARCIAL | Ajuste não enfileira (`request_kind` só `quote|contact`); destino = env remota `COMMERCIAL_TEAM_WEBHOOK_URL/_TOKEN`; comentário desatualizado em `commercialTeamAlerts.ts:5` | `20261106150448:34-38`; `20261117010000:35-58,103-194`; `api/commercial-alerts.ts:51-124`; `vercel.json:9`; `20260908230000:86` | sim (#116, #158) | DONO + ENG |
| PF-02 | Responsável, estados operacionais e SLA por pedido | BLOQUEADO | Tudo | `grep assigned_to\|sla\|due_at migrations` = 0; `QuotePage.tsx:376` sem prazo | não | DONO |
| PF-03 | Back-office mínimo (status, triagem, publicar proposta) | NÃO INICIADO | Tudo | `grep publish_proposal\|set_quote_status\|triage_` = 0; `proposal_documents` só inserido em pgTAP | não | ENG (após D1) |
| PF-04 | Cliente bloqueado após 3 ajustes pendentes | DIVERGÊNCIA | Nada move `quote_adjustment_requests.status` para `resolved/closed` | `20260923120000:205`; updates só anonimização | não | ENG (com PF-03) |
| PF-05 | Mensagens da equipe e evento `proposal_published` | NÃO INICIADO | Produtor dos eventos | só CHECK `20260909180000:30`, `20260910130000:33` | não | ENG |
| PF-06 | "Fale conosco" com destino | PARCIAL-VALIDAÇÃO | Webhook configurado em produção | `20261117010000:55-58`; `leadHandler.ts:147-149` | sim (#158) | DONO |
| PF-07 | Confirmação por e-mail (Resend) | BLOQUEADO | `RESEND_API_KEY` + `SITE_EMAIL_FROM` em produção; `.env.example:60` remetente fictício | `api/notifications.ts:293-320,390` | não | DONO |
| PF-08 | Confirmação por WhatsApp | BLOQUEADO | 4 vars `WHATSAPP_*`, template Meta | `api/notifications.ts:337-375,391-392` | não | DONO |
| PF-09 | Webhooks de entrega | BLOQUEADO + residual | Secrets/URLs remotos; payload malformado já dá 400, mas erro da RPC (`invalid_notification_provider_event_input`) ainda vira 500 e o provedor reentrega | `notification-events-resend.ts:73-79,111-116`; `siteDatabase.ts:274`; `20260916140000:48` | sim (#185 só doc) | DONO + ENG |
| PF-10 | Saúde da fila medida sem provedor | IMPLEMENTADO | — | `api/notifications.ts:662-672,564-596` | sim (#190) | — |
| PF-11 | Corte de idade/cancelamento do backlog; não enviar a `spam` | PARCIAL | Claim sem filtro de idade nem `spam`; sem RPC de cancelamento; titular apagado já cancelado | `20260923200000:94-116`; `20261117030000:59-60,205-209` | sim (#161) | ENG |
| PF-12 | Supressão, reprocessamento, re-vínculo, purga de órfãos | NÃO INICIADO | Os 4 | greps = 0; `20260916140000:51-62` | não | ENG |
| PF-13 | "Resumo" × "cópia integral" nas confirmações | BLOQUEADO | Decisão D6 | `api/notifications.ts:262-279,300-310,356-358` | parcial (#160, #181) | DONO |
| PF-14 | "Confirmação por e-mail registrada para envio" sem provedor | PARCIAL | E-mail sempre `pending` → "Registrado para envio"; falta estado `unavailable` como o do WhatsApp | `api/notifications.ts:603,608,611`; `quoteConfirmation.ts:12,15` | sim (#181 só WhatsApp) | ENG + DONO |
| PF-15 | Checkbox de WhatsApp | PARCIAL | Aparece sempre (`QuotePage.tsx:492`); `PrivacyPage.tsx:16` ainda diz "cópia" | `QuotePage.tsx:492`; sem `VITE_*` de canal | sim (#160) | ENG + DONO |
| PF-16 | "Nosso time vai analisar… entrar em contato" / "aparecerá na linha do tempo" | PARCIAL | Promessa só tem base com webhook ligado; ajuste sem roteamento e sem quem responda | `QuotePage.tsx:376,469,480,494`; `CustomerQuotePage.tsx:246` | sim (#158) | DONO + ENG |
| PF-17 | Política de Privacidade: confirmação transacional, exclusão, acesso/correção | PARCIAL (DIVERGÊNCIA) | Depende de Resend; sem autoexclusão/exportação/correção | `PrivacyPage.tsx:16-17`; `erase_customer_data` só `service_role` (`20260916200000:106-107`) | sim (#161) | ENG + jurídico |
| PF-18 | "Curadoria humana" / "Curadoria iniciada pelo seu briefing" / "Curadoria Promo" | PARCIAL (DIVERGÊNCIA) | Ranking roda no navegador só sobre 24 itens; decisão D7 | `CatalogPage.tsx:30,44,62,64`; `useCatalogPageState.ts:101,114-116`; `catalog.ts:406` | não | DONO + ENG |
| PF-19 | "Personalize este produto…" sem checar `allowsPersonalization` | DIVERGÊNCIA | Condicionar fallback | `ProductCard.tsx:57` | não | ENG |
| PF-20 | "Escala: 51–200 un." (faixa de pessoas) | DIVERGÊNCIA | Trocar "un." | `campaignPresets.ts:98`; e-mail usa "pessoas" (`notifications.ts:250`) | não | ENG |
| PF-21 | Aviso "ficam salvos" mesmo quando o rascunho falha | DIVERGÊNCIA | `saveQuoteDraft` devolver resultado | `QuotePage.tsx:467`; `quoteDraft.ts:62,80-82` | não | ENG |
| PF-22 | "Abrir PDF" / "Abrir revista" | BLOQUEADO | Arquivos reais | `catalogLibrary.ts:42-146` 10× `online` | não | CONTEÚDO |

### 2.2 Portal do cliente, LGPD e experiência (anexo 02)

| ID | Funcionalidade planejada | Estado HOJE | O que falta | Evidência-chave | Mudou | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-23 | Propostas versionadas no portal | PARCIAL | Produtor (publicação) | `api/customer-proposals.ts:134`; INSERT só em pgTAP | não | ENG |
| PF-24 | Perfil do cliente editável | PARCIAL | RPC de leitura/edição; `company` nunca escrita | `20260909180000:15-25`; `20260923120000:350-353` | não | ENG |
| PF-25 | Pedidos de ajuste | PARCIAL | Flag `false` por padrão; sem roteamento; bloqueio após 3; sem e2e | `siteFeatureFlags.ts:6`; `.env.example:30`; `CustomerQuotePage.tsx:246` | não | ENG + DONO |
| PF-26 | Ciclo real de autenticação | PARCIAL-VALIDAÇÃO | Ensaio humano com e-mail real | `CustomerLoginPage.tsx:52,59,89`; e2e mocka `/auth/v1/user` | não | PESSOAS |
| PF-27 | Rate limit de propostas/anexos → 429 | IMPLEMENTADO | — | `customer-proposals.ts:119`; `briefing-assets.ts:129` | sim (#183) | — |
| PF-28 | Conta como benefício opcional explicado | PARCIAL | Explicar antes/durante o formulário | `QuotePage.tsx:403` | não | ENG + mockup |
| PF-29 | Linha do tempo com próximo passo por status | PARCIAL | Mapa status→próximo passo | `customerAccount.ts:27-37` | não | ENG |
| PF-30 | Direitos do titular (exportação, correção, autoexclusão) | NÃO INICIADO | RPCs, UI, registro | greps = 0; `PrivacyPage.tsx:17` | não | ENG + jurídico |
| PF-31 | Apagamento completo | IMPLEMENTADO (código) | Confirmar aplicação remota (snapshot 19/11 mostra `20261117030000/030100` aplicadas) | `20261117030000:83-118,205-234` | sim (#161) | DONO (reparo retroativo) |
| PF-32 | Retenção por tabela completa | PARCIAL | Prazo para perfis inativos/favoritos; `spam` = legítimo; 8 tabelas sem `comment on table`; órfãos de `provider_events` | `20260911130000:28-75`; `20260908230000:27,63` | parcial (#184, #189) | ENG + DONO |
| PF-33 | Evento `erased` na linha do tempo | BLOQUEADO | Decisão | `20260910130000:32-33` | não | DONO |
| PF-34 | Auditoria de leitura (SELECT em PII) | NÃO INICIADO | pgaudit ou RPC com log | `20260916210000:18` | não | ENG + DONO |
| PF-35 | Saneamento de anexos; PDF | PARCIAL | Reencode/EXIF/dimensões; PDF em quarentena | `fileSignatures.ts:3-8`; `briefing-assets.ts:69,80-81` | não | ENG |
| PF-36 | Criptografia de PII, E.164, rate limit de borda | BLOQUEADO | Decisão | só `DATABASE_FUNCTION_CONTRACTS.md` | não | DONO |
| PF-37 | Resumo "O que entendemos" editável | PARCIAL | Só com 4/4 respostas; sem "cancelar edição"; sem registro de aprovação dos mockups | `CampaignFinder.tsx:62-66,76-81,145-170` | sim (#94 em 27/10, #159, #103) | ENG + DONO |
| PF-38 | "Ainda não sei o que escolher" | NÃO INICIADO | CTA desabilitado sem resposta (PR #211 aberta) | `CampaignFinder.tsx:109,199` | não | ENG + mockup |
| PF-39 | Troca de campanha consciente | NÃO INICIADO | `setCampaign` sobrescreve; "Limpar tudo" não limpa contexto (PR #212 aberta) | `useCatalogPageState.ts:134-139,236` | não | ENG + mockup |
| PF-40 | Separar intenção de filtros; explicar seleção/ordenação | PARCIAL | Mostrar qual resposta virou filtro; descrever "Curadoria Promo" | `CatalogPage.tsx:44,62-67`; `useCatalogPageState.ts:80-102,115` | não | DONO + ENG |
| PF-41 | Contexto editável no orçamento; ordem da conversa | NÃO INICIADO | Formulário começa por dados pessoais (PR #213 aberta) | `QuotePage.tsx:469-488` | não | ENG + mockup |
| PF-42 | Telefone coerente orçamento × contato | PARCIAL | Decisão de regra | `QuotePage.tsx:39,477`; `ConversationForm.tsx:110` | não | DONO |
| PF-43 | Repetir orçamento sem esconder mudanças | PARCIAL | Aviso ao ajustar quantidade ao mínimo | `quoteItems.ts:174` | não | ENG |
| PF-44 | Retorno ao adicionar; confirmação ao limpar | PARCIAL | "Limpar seleção" na página sem confirmação; "Apagar rascunho" avisa depois | `QuotePage.tsx:449,466`; `QuoteDrawer.tsx:209,274-278` | não | ENG |
| PF-45 | "Por que este produto"; ideias de uso | NÃO INICIADO / BLOQUEADO | Regra + conteúdo | grep = 0 | não | ENG + CONTEÚDO |
| PF-46 | Personalização por família; múltiplo de compra | BLOQUEADO | Contrato só `allows_personalization`/`min_quantity` | `catalog.ts:76,81,226` | não | CONTEÚDO |
| PF-47 | WhatsApp iniciado pelo visitante (`wa.me`) | NÃO INICIADO | Número validado + link | `grep wa.me src api e2e` = 0 | não | DONO + ENG |
| PF-48 | Menu fotográfico de categorias | PARCIAL | Cabeçalho só texto | `Layout.tsx:12,154-159,192-197` | não | ENG + mockup |
| PF-49 | Landings `/ideias/*` descobríveis | IMPLEMENTADO | — | `HomePage.tsx:354-357`; `Layout.tsx:225-228`; e2e | sim (#166, #170, #177, #182) | — |
| PF-50 | Vitrine com diversidade global | PARCIAL | Home só por flags; `diversify()` só na página | `HomePage.tsx:105`; `catalogRanking.ts:73-85` | não | ENG + DONO |
| PF-51 | Grupos de decisão; links persistentes | PARCIAL-VALIDAÇÃO | Flags `false` por padrão; estado em produção remoto | `siteFeatureFlags.ts:5,7`; `.env.example:32,35` | sim (#156) | DONO |
| PF-52 | Sync do carrinho entre dispositivos | BLOQUEADO | Decisão | `QuoteCartContext.tsx:57,77` | não | DONO |
| PF-53 | Favoritos: e2e multi-aba, offline, limite 100 | PARCIAL | e2e do limite de 100 e tratamento offline | `e2e/favorites.spec.ts:14,30`; `grep navigator.onLine` = 0 | sim (#193) | ENG |
| PF-54 | Feedback de clareza; eventos Carnegie; baseline | NÃO INICIADO | `feedback_*`, `summary_edited`, `campaign_conflict` | `analytics.ts:1-40` | não | ENG + DONO |
| PF-55 | Inventário de afirmações comerciais | NÃO INICIADO | Documento com fonte/dono | `HomePage.tsx:211`; `CatalogPage.tsx:30`; `QuotePage.tsx:385` | não | DONO |
| PF-56 | Registro rastreável de aprovação visual | PARCIAL | Mockups versionados (#103) sem registro quem/quando/versão | `docs/mockups-*` 16 PNG; `aprovacao-visual-design.md:8-13` | sim (#103) | DONO + ENG |

### 2.3 Conteúdo, SEO, segurança do repositório, banco e contratos (anexo 03)

| ID | Funcionalidade planejada | Estado HOJE | O que falta | Evidência-chave | Mudou | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-57 | Catálogos PDF e revistas reais | BLOQUEADO | Arquivos e direitos | `find public -iname '*.pdf'` = 0 | não | CONTEÚDO |
| PF-58 | Cases, prova social, bastidores, fotos próprias | BLOQUEADO | Acervo | `public/images/` só hero + placeholder | não | CONTEÚDO |
| PF-59 | Domínio oficial | BLOQUEADO | Decisão; 1 origem em `siteOrigin.ts`; literais hardcoded | `robots.txt:4`; `Seo.tsx:35`; `siteOrigin.ts:2-17`; `vercel.json:85` | não | DONO |
| PF-60 | Imagem social por coleção e data | PARCIAL | `og:image` único | `api/site-page.ts:20,94,104` | não | ENG + mockup |
| PF-61 | Governança editorial real | DIVERGÊNCIA | Único `commonGovernance` ×10 (vence 22/09/2027) | `shared/catalogEditorial.ts:14-32,86` | não | CONTEÚDO |
| PF-62 | Guia de voz aplicado | PARCIAL | Gift Lovers fora do guia; "Solicitar orçamento" × "Enviar briefing"; "radar" em ações (novo em `HomePage.tsx:231`, #166); template de PR sem voz | `GUIA_DE_VOZ.md:12,17`; `QuotePage.tsx:494`; `CatalogPage.tsx:53`; `Layout.tsx:215` | não | DONO + ENG |
| PF-63 | Corpus de relevância ≥30 por SKU | PARCIAL | 33 intenções por conceito; sem SKU nem métrica | `searchRelevance.ts:16-49,66` | sim (#163) | DONO + ENG |
| PF-64 | Página de projeto especial | BLOQUEADO | Confirmação comercial | `App.tsx:110-127` | não | DONO |
| PF-65 | Redes, horário e canal oficiais | PARCIAL-VALIDAÇÃO | Horário de atendimento (0 ocorrências) | `Layout.tsx:22-27,238-240` | não | DONO |
| PF-66 | Secret scanning + push protection | IMPLEMENTADO | — | API GitHub 20/11: enabled | sim | — |
| PF-67 | Dependabot security, SHA pinning, Actions | IMPLEMENTADO | `allowed_actions` estava em `selected` (contra AGENTS.md) e derrubava o Quality gate de todas as PRs desde 20/11 00:05; restaurado para `all` nesta auditoria às 10:36 UTC | API 20/11; 100% `uses:` por SHA | sim | — |
| PF-68 | Segredos por Environment; `environment:` nos jobs | NÃO INICIADO | `grep environment: workflows` = 0; Environments sem regra | API 20/11 | não | ENG |
| PF-69 | Revisão legítima (2º revisor) | BLOQUEADO | 0 aprovações nas 25 últimas PRs; CODEOWNERS único | API 20/11; `.github/CODEOWNERS:3` | não | DONO |
| PF-70 | Ruleset, linear history, CodeQL/dep-review obrigatórios | PARCIAL | `strict` e conversa ok; rulesets `[]`; linear `false`; só 4 checks | API 20/11 | parcial | ENG (regra 8) |
| PF-71 | Conta de serviço Supabase | PARCIAL | Ledger e inventário ainda com `SUPABASE_ACCESS_TOKEN` | `release.yml:81,106,116` | sim (#165) | DONO |
| PF-72 | Rotação de segredos | PARCIAL | Lembrete e runbook com conjuntos disjuntos; `SITE_SUPABASE_DB_URL`, `RESEND_API_KEY`, webhooks em nenhum; issue #80 aberta | `secrets-rotation-reminder.yml:36-40`; `RUNBOOK_ROTACAO_SEGREDOS.md:19-40` | não | ENG + DONO |
| PF-73 | Privilégio mínimo (cutover JWT, Storage) | PARCIAL | Storage exige `sb_secret_`; sem renovação do JWT | `siteDatabase.ts:59-60,84` | não | DONO + ENG |
| PF-74 | Endurecimento de workflows | PARCIAL | harden-runner 0; zizmor só comentários; SBOM 0; `persist-credentials` em 2; `permissions` por job em 2 | `release.yml:47`; `stale-branches.yml:24` | sim (pins) | ENG (regra 8) |
| PF-75 | Verificação de configuração no boot | DIVERGÊNCIA | Função morta removida (#191); preflight não existe | `grep assertSafeSiteDatabaseConfiguration` = 0 | sim (#191) | ENG (decidir) |
| PF-76 | Revogar `mcp_kv_get` no canônico | BLOQUEADO | Sem recibo | `docs/sql/canonical-principal/URGENTE_*.sql` | não | DONO |
| PF-77 | Migrations aplicadas com recibo | IMPLEMENTADO | — | `release.yml:77-143` | sim (#165) | — |
| PF-78 | Diff integral schema/ACL + Advisor | PARCIAL | Sem `db diff` remoto, grants, Advisor | `database.yml:48`; `gerar-banco.mjs:318-324` | não | ENG |
| PF-79 | API com tipos gerados | PARCIAL | 2 `name: string`, 6 `fetch` diretos, 30/58 RPCs `Json` | `siteRpcContract.ts:1-18`; `commercialTeamAlerts.ts:101` | sim (#192) | ENG |
| PF-80 | Contratos documentados coerentes | IMPLEMENTADO | Linhas defasadas por #189 | `DATABASE_FUNCTION_CONTRACTS.md:43,49-51` | sim (#185) | — |
| PF-81 | Remover função legada; testar vigente | DIVERGÊNCIA | `finalize_briefing_asset_retention` com GRANT e testada; `finalize_site_storage_retention` sem pgTAP | `20260922150000:259,319,327`; `briefing_assets.test.sql:169-170` | não | ENG (regra 8) |
| PF-82 | pgTAP `authenticated` em Storage, DDL real, rate limit | NÃO INICIADO | Os 3 | `grep "role authenticated" tests/` = 0 | não | ENG |
| PF-83 | Remover recuo `v_products_public` | BLOQUEADO | Recuo em 3 pontos; "variant_id morto" já não vale | `catalog.ts:52,325-336`; `sitemap.ts:146-148`; `catalogValidation.ts:38-39,114-120` | não | DONO |
| PF-84 | Preferências do cliente | NÃO INICIADO | Nenhum objeto | `20260910130000:5-28` | não | ENG/DONO |
| PF-85 | Retenção com drenagem | IMPLEMENTADO | — | `api/retention.ts:9-21,133-138,258-282` | sim (#184, #189) | — |

### 2.4 Operação, CI/CD, testes, Graphify e governança documental (anexo 04)

| ID | Funcionalidade planejada | Estado HOJE | O que falta | Evidência-chave | Mudou | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-86 | Restore medido (RPO/RTO), PITR, backup do Storage | BLOQUEADO | Decisão, destino, drill | `RUNBOOK_RESTORE_SITE.md:3,7,10,15` | não | DONO |
| PF-87 | Vigia independente dos crons | NÃO INICIADO | `lastRunAt` por cron + verificador externo | `grep heartbeat\|lastRunAt\|watchdog` = 0; 3 crons | não | ENG |
| PF-88 | Alertas operacionais | PARCIAL + BLOQUEADO | URL remota; payload genérico (relay); sem alerta para webhook de provedor, recebimento de orçamento, rate limit | `operationalAlerts.ts:5,32` (6 eventos) | sim (#178, #184) | DONO + ENG |
| PF-89 | Preview isolado | BLOQUEADO | Sem `preview.yml`; custo | `vercel.json:3-5` | não | DONO |
| PF-90 | Revisão mensal do banco | NÃO INICIADO | Nunca executada; query com coluna duplicada | `RUNBOOK_REVISAO_MENSAL_BANCO.md:51,68-72` | não | ENG + DONO |
| PF-91 | Runbooks atualizados e revisados | DIVERGÊNCIA | 6 runbooks parados desde set/2026 (ver seção 4) | últimos commits 16–30/09 | não | ENG + PESSOAS |
| PF-92 | Funil homologado, coletor de erros, CWV p75 | PARCIAL-VALIDAÇÃO | Evento de contato/upload; `frontend_error` tipado; baseline remoto | `analytics.ts:4-36`; `clientObservability.ts:12` | sim (#168, #175) | ENG |
| PF-93 | Ensaio do rollback automático | NÃO INICIADO | Nunca exercitado (35 falhas de release, nenhum rollback) | `release.yml:289-319` | não | ENG |
| PF-94 | Soak test representativo | PARCIAL | DB_URL fixo, poll 3 s, relatório único | `soak-test-notification-queue.mjs:23,32,216` | não | ENG |
| PF-95 | Pipeline sem duplicação | NÃO INICIADO | Vitest 2×, build 3×, sem cache de browsers, composite não usado | `quality.yml:86,89,105` | não | ENG (regra 8) |
| PF-96 | Release orientado a evento e robusto | PARCIAL | Polling 120×20 s; sem paginação/filtro de app; sem `LC_ALL=C`; sem backoff; sem issue automática; 9/13 últimas execuções falharam esperando gates | `release.yml:3-6,54-76` | sim (#165, #204, #210) | ENG (regra 8) |
| PF-97 | Relatórios de CI acionáveis, SLO | PARCIAL | p50/p95, delta de cobertura, SLO | `ci-health.yml:40-96` | sim (#162) | ENG |
| PF-98 | Ferramentas locais = CI | NÃO INICIADO | `ci:local`, `.npmrc`, Lighthouse, política de majors, `ignore` Dependabot | `grep ci:local package.json` = 0 | não | ENG |
| PF-99 | Tags de release | NÃO INICIADO | 0 tags no remoto | `git ls-remote --tags` = 0 | não | ENG |
| PF-100 | E2E das 12 jornadas | PARCIAL | 3 ✅ (ideias, upload, /sobre+/privacidade), 8 ❌ (senha/esqueci, conta real, contato via API, remoção de anexo, ajuste, revogação, arquivar seleção, 404 de rota, mailto, flags off) | 6 specs / 75 testes | sim (#193, #199, #201, #206) | ENG |
| PF-101 | E2E com configuração realista | PARCIAL | Flags off; função serverless real | `playwright.config.ts:21` | não | ENG |
| PF-102 | Jornada anônima única (rede lenta, storage bloqueado) | IMPLEMENTADO | — | `e2e/journey.spec.ts` | sim (#199) | — |
| PF-103 | Matriz risco→camada; cenários adversos | IMPLEMENTADO | Matriz já defasada (diz 3 specs; são 6); vazios abertos | `MATRIZ_RISCO_CAMADA_TESTE.md`; `concurrency.spec.ts` | sim (#200, #201, #205) | — |
| PF-104 | Acessibilidade manual, dispositivos físicos | BLOQUEADO | Sessão com registro | só axe | não | PESSOAS |
| PF-105 | Pesquisa com compradores | BLOQUEADO | Roteiro, recrutamento | sem artefato em `docs/` | não | PESSOAS |
| PF-106 | Graphify reproduzível em clone limpo | PARCIAL | `doctor` sem Python/`tree_sitter_sql`; hashes não aplicados (decisão) | `graphify.mjs:890-903`; `requirements-graphify.txt:6-12` | sim (#196, #197) | ENG |
| PF-107 | Conhecimento técnico no grafo | NÃO INICIADO | Tudo (`code-only`) | `.graphify.project.json` | não | ENG + DONO |
| PF-108 | Qualidade do grafo | PARCIAL | Benchmark só acerto; comunidades sem nome | `graphify.mjs:68-71,178-181` | sim (#194, #198) | ENG |
| PF-109 | Matriz 230 reconciliada | PARCIAL | CSV intocado desde `dafd3d9` | `MATRIZ_INDEX.md:15,19` | sim (#208) | ENG |
| PF-110 | Planos novos mapeados; donos nomeados | NÃO INICIADO | Validador só UX/LK/GR/AC | `validate-closure-ledger.mjs:67-75` | não | DONO + ENG |
| PF-111 | Planos sem contradições | PARCIAL | 5 frases em planos datados (histórico) | `vite.config.ts` corrigido (#195) | sim | ENG (se o dono pedir) |
| PF-112 | Código morto removido | IMPLEMENTADO | — | greps = 0 | sim (#186, #191) | — |
| PF-113 | Páginas e CSS decompostos | NÃO INICIADO | `styles.css` 6.793 linhas; `QuotePage` 502 (regrediu) | `wc -l` | não | ENG (DONO decide) |
| PF-128 | Teste com data fixa vencida | IMPLEMENTADO | — | `sharedSelection.test.ts:115` | sim (#103) | — |

### 2.5 Recomendações de UX, benchmarks e pesquisa (anexo 05)

| ID | Funcionalidade planejada | Estado HOJE | O que falta | Evidência-chave | Mudou | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-114 | Produto inexistente ≠ falha temporária | PARCIAL | Reusa `CatalogError` com h2 "O catálogo fez uma pausa." + `role=alert` | `ProductPage.tsx:130-133`; `CatalogFeedback.tsx:21-30` | não | ENG + mockup |
| PF-115 | "Em alta" só com dado real | DIVERGÊNCIA | Chip vem de `is_featured`; 3 nomes para 2 conceitos (Em alta / Destaques da curadoria / Tendências) | `catalogFilters.ts:10-11`; `CatalogPage.tsx:62`; `HomePage.tsx:105,221` | não | DONO + ENG |
| PF-116 | Textos auxiliares legíveis | PARCIAL | **142** `font-size` ≤ 0,69rem (auditoria anterior contou 77) | `src/styles.css` | não | ENG + mockup |
| PF-117 | Fundo limpo atrás da foto do card | IMPLEMENTADO | — | `styles.css:4449-4452` (#88, 27/10) | sim | — |
| PF-118 | Privacidade cobre "Minhas datas"; seção acessível | PARCIAL | `PrivacyPage.tsx` sem "datas"; seção após toda a agenda | `CommemorativeDatesPage.tsx:292,326-336` | não | ENG + mockup |
| PF-119 | Descoberta Freeshop (BreadcrumbList, histórico, recentes, `/datas/*`, 2ª imagem, SSR de categoria) | PARCIAL (quase tudo NÃO INICIADO) | Só relacionados por categoria+material | `App.tsx:110-127`; `ProductCard.tsx:29-40`; `catalogRanking.ts:116-126` | não | ENG + mockup |
| PF-120 | Métricas prometidas sem evento | NÃO INICIADO | remoção/limpeza de seleção, `shared_selection_opened`, abandono por campo, `has_query` | `analytics.ts:4-38` (36 eventos) | não | ENG |
| PF-121 | Comparação salva e compartilhável | NÃO INICIADO | Bandeja só ver/limpar/remover | `CatalogComparisonTray.tsx:30-41` | não | ENG + mockup |
| PF-122 | Onde a seleção fica (navegador × conta) | PARCIAL | Drawer não explica | `QuoteDrawer.tsx`; `SavedSelections.tsx:178-185` | não | ENG |
| PF-123 | "Reenviar código" / "Usar outro e-mail" | PARCIAL | Reenvio = repetir submit | `CustomerLoginPage.tsx:59-65,126-132` | não | ENG + mockup |
| PF-124 | Anexos no detalhe do orçamento (portal) | NÃO INICIADO | RPC não devolve anexos; UI sem seção | `20260922160000:145-200`; `CustomerQuotePage.tsx:243-246` | não | ENG (DDL → regra 8) |
| PF-125 | Preferências e exclusão dentro da conta | NÃO INICIADO | Conta só sair/seleções/histórico | `CustomerAccountPage.tsx:77-99` | não | ENG + DONO |
| PF-126 | E-mail dedicado + horário | BLOQUEADO | `ContactPage.tsx:19` e-mail **hardcoded** (ignora `VITE_CONTACT_EMAIL`) | `ContactPage.tsx:18-21` | não | DONO; ENG troca texto |
| PF-127 | Hero fotográfico real | BLOQUEADO | `hero-gen-z-v2*.webp` | `HomePage.tsx:132-140` | não | CONTEÚDO |

---

## 3. Itens novos — não mapeados pela auditoria de 11/10

Encontrados na releitura etapa a etapa dos planos (anexos 06 e 07), dos runbooks e documentos recentes (anexo 08) e dos benchmarks (anexo 05). Cada ID tem evidência completa no anexo indicado.

### 3.1 Engenharia — produto, API, banco e testes

| ID | Funcionalidade planejada (origem) | Estado | O que falta | Evidência-chave | Quem |
| --- | --- | --- | --- | --- | --- |
| NOVO-DB-01 | Alerta comercial para **pedido de ajuste** (anexo 08) | NÃO INICIADO | Ampliar CHECK `request_kind`; trigger em `quote_adjustment_requests`; claim filtra só quote/contact | `20260908230000:86`; `20261117010000:116,161` | ENG |
| NOVO-DB-02 | Apagamento LGPD cancela alertas comerciais pendentes de **contato** | PARCIAL | `erase_customer_data` cancela só `request_kind='quote'`; `20261117030100` afirma "nada enfileira contact", mas `20261117010000` enfileira | `20261117030000:127-136,205-209` | ENG |
| NOVO-DB-03 | pgTAP de `finalize_site_storage_retention` (função usada em produção) | NÃO INICIADO | Só Vitest com `fetch` mockado | `grep tests/` = 0 | ENG |
| NOVO-DB-04 | `allowedSiteOrigins` multi-domínio sem teste direto | PARCIAL | Teste importando `siteOrigin.ts` | `api/_lib/siteOrigin.ts:1-20` | ENG |
| NOVO-FE-03 | Limite de corpo e timeout em **todas** as rotas (FE 012) | PARCIAL | 413 só em 6/14 rotas; abort/timeout em 8/14 arquivos `api/*.ts` | `leadHandler.ts:107`; `briefing-assets.ts:8,35` | ENG |
| NOVO-FE-05 | Compartilhamento/PDF sem cortar itens (50 itens/kits) + e2e após revogação (FE 018) | PARCIAL | Teste com 50 itens; e2e de acesso após revogação | `e2e/smoke.spec.ts:1545` | ENG |
| NOVO-FE-10 | Integridade do kit na jornada: e2e em conta/histórico/confirmação (FE 049) | PARCIAL | E2E ponta a ponta do kit | `kit_composition.test.sql`; `smoke.spec.ts` | ENG |
| NOVO-FE-12 | Datas/ICS sem deslocamento: teste bissexto/escape; importação em 2 clientes (FE 060) | PARCIAL | Casos bissexto/escape | `commemorativeDates.test.ts:6-10` | ENG |
| NOVO-FE-13 | Estado offline explícito (FE 065) | PARCIAL | `navigator.onLine` = 0 em `src/` | `e2e/journey.spec.ts:144` cobre só storage bloqueado | ENG |
| NOVO-FE-14 | Contrato Vercel testado: rewrites, headers, `crons`, auth de cron (FE 089) | PARCIAL | `crons` e `headers` sem teste de contrato | `tests/api/maxDuration.test.ts:48-90` | ENG |
| NOVO-FE-15 | Bateria final de regressão sobre o **candidato final** (FE 093) | PARCIAL | `prod-readiness.md` avaliou `8a810bd`, não `40f6420` | `docs/prod-readiness.md:3-5,63` | ENG |
| NOVO-CA-22 | Buscas sem correspondência: SKU exato × nome; sugerir revisar briefing (CA 043) | PARCIAL | `grep sku src/lib/search.ts` = 0 | `CatalogFeedback.tsx:32-41` | ENG |
| NOVO-CA-30 | Resumo da seleção com contexto da campanha no drawer (CA 061) [AV] | PARCIAL | Drawer sem campanha | `QuoteDrawer.tsx:206-216` | ENG + mockup |
| NOVO-CA-34 | Pré-preencher e-mail da conta no orçamento (CA 071) | PARCIAL | `auth.user` só usado para anexos | `QuotePage.tsx:249,283` | ENG |
| NOVO-CA-35 | Validação antecipada antes do envio (CA 075) | PARCIAL | Só no submit | `QuotePage.tsx:241` | ENG |
| NOVO-CA-38 | Timeout de envio sem dizer "recebimento incerto" (CA 079) | PARCIAL | Mensagem de incerteza | `src/lib/http.ts:87,106` | ENG |
| NOVO-CA-21 | Descarte do contexto da campanha pela interface (CA 040) | PARCIAL | Ação visível | `personalDataReset.ts` | ENG |
| NOVO-CA-23 | Limite de comparação acessível: explicar o 4º item (CA 048) [AV] | PARCIAL | Só `title` | `ProductCard.tsx:72-76` | ENG |
| NOVO-CA-27 | Limites por ponto (cor/gravação/embalagem) na ficha (CA 055) | PARCIAL | Aviso geral só | `ProductPage.tsx:157` | ENG + CONTEÚDO |
| NOVO-CA-28 | Estimativa de quantidade: padrão 100 "inventado"; correção silenciosa (CA 057) | PARCIAL | Orientar correção | `catalog.ts:497-498`; `ProductPage.tsx:50-51,69,80` | ENG + DONO |
| NOVO-CA-32 | Kits: texto de embalagem/múltiplo (CA 067) | PARCIAL | grep em `KitBuilderPage.tsx` = 0 | — | ENG + DONO |
| NOVO-CA-33 | Teste "duas abas × orçamento enviado" (CA 070) | PARCIAL-VALIDAÇÃO | Só seleção coberta (#201) | `e2e/concurrency.spec.ts:69,97` | ENG |
| NOVO-CA-36 | Catálogo de mensagens construtivas (CA 076) | PARCIAL | — | `QuotePage.tsx:34-41` | CONTEÚDO/ENG |
| NOVO-CA-37 | Aviso × impedimento classificados (CA 077) | PARCIAL | Anexo pendente como warning | `QuotePage.tsx:400` | ENG |
| NOVO-CA-39 | Canal preferido explicado e auditável (CA 081) | PARCIAL | — | `QuotePage.tsx:485` | ENG |
| NOVO-CA-40 | Incidentes úteis: padrão de manutenção, identificador (CA 089) | PARCIAL | "manutenção" = 0 | `AppErrorBoundary.tsx:35` | ENG |
| NOVO-CA-41 | Testes unitários de conflito de campanha (CA 091) | PARCIAL | Virão com PR #212 | `CampaignFinder.test.tsx` | ENG |
| NOVO-CA-18 | Datas → campanha por público/intenção (CA 030) | PARCIAL | `campaignBrief.ts:58-62` só ocasião | — | ENG |
| NOVO-CA-24 | FAQ de mínimos; "Sim." em amostra (CA 049) | PARCIAL | — | `ContextualFaq.tsx:15` | CONTEÚDO |
| NOVO-CA-25 | Suíte de sinais incertos consolidada (CA 050) | PARCIAL-VALIDAÇÃO | — | `catalog.ts:226` | ENG |
| NOVO-UX-01 | Confirmação pós-envio com resumo da seleção, imprimir e prazo (PLANO_UX UX67; Gen Z) | PARCIAL | Sucesso não lista itens nem imprime; prazo = PF-02 | `QuotePage.tsx:370-403,435` | ENG + mockup |
| NOVO-UX-02 | Breadcrumb nomeado em todas as páginas internas (UX_STRATEGY) | PARCIAL | Só produto tem trilha | `ProductPage.tsx:140-141` | ENG + mockup |
| NOVO-UX-03 | E2E troca de conta A→B na mesma aba (plano-50 #13; PORTAL 30) | PARCIAL | — | `smoke.spec.ts:790-850` | ENG |
| NOVO-UX-04 | Catches silenciosos instrumentados (plano-50 #39) | PARCIAL | `reportClientError` e `operationalAlerts` engolem motivo | `clientObservability.ts:16-18`; `operationalAlerts.ts:35-36` | ENG |
| NOVO-UX-05 | Comparador 2–4 itens no moodboard; ausências como "consultar" (Freeshop 5.7) | PARCIAL (desvio) | Limite 3; na bandeja do catálogo | `catalogComparison.ts:4` | DONO ou ENG |
| NOVO-UX-06 | Editorial com vínculo mensurável a buscas/saves (Freeshop P2) | PARCIAL | Eventos sem `source`/`collection_id` | `analytics.ts:8-9,14-15,35-36` | ENG |
| NOVO-WF-02 | `SITE_SUPABASE_DB_URL` (credencial de DDL, #165) fora de lembrete, runbooks e preflight | PARCIAL | Incluir | `release.yml:79-103`; `secrets-rotation-reminder.yml:37-40` | ENG |
| NOVO-WF-04 | Release espera 4 gates fixos; `Contratos da automação local` e CodeQL fora da espera e da proteção | PARCIAL | Decidir e alinhar | `release.yml:53`; `automation-local.yml:23-24` | ENG + DONO |
| NOVO-PC-03 | Alerta comercial silencioso sem `COMMERCIAL_TEAM_WEBHOOK_URL` (mesmo padrão de PF-88) | PARCIAL | Alerta/medição quando a URL está ausente | `commercialTeamAlerts.ts:20-22` | ENG + DONO |
| NOVO-GR-02 | `doctor` do Graphify não checa `tree_sitter_sql` localmente | PARCIAL | — | `graphify.mjs:890-902` | ENG |

### 3.2 Divergências entre documentos, workflows e código (itens novos)

| ID | Onde | Afirma | Realidade | Quem |
| --- | --- | --- | --- | --- |
| NOVO-RB-01 | `RUNBOOK_RELEASE.md:11` | Integração Supabase aplica migrations | `release.yml:79-103` aplica (#165) | ENG |
| NOVO-RB-02 | `RUNBOOK_INCIDENTES.md:24-27,108-115` | Sem provedor, 503 sem processar; alerta "já dispara" | Mede antes do 503 (#190); alerta depende de webhook | ENG |
| NOVO-RB-03 | `RUNBOOK_VERIFICACAO_DB.md:93-99` e `RUNBOOK_RESTORE_SITE.md:15` | 17 / 19 tabelas | 21 tabelas `site_private` | ENG |
| NOVO-RB-04 | `RUNBOOK_PEDIDO_TITULAR.md:22,30,84-86` | 28/513 contratos; função de `20260923120000` | `plan(43)`; 608; vigente `20261117030000` | ENG |
| NOVO-RB-05 | `RUNBOOK_ROTACAO_SEGREDOS.md:19-22` | `CRON_SECRET` não exige redeploy | Contradiz `RUNBOOK_SITE_API_CUTOVER.md:67-68`; lido por 3 crons | ENG |
| NOVO-RB-06 | `RUNBOOK_REVISAO_MENSAL_BANCO.md` | Rotina mensal | Nunca executada; sem automação; query com `last_autovacuum` duplicado (`:51`) | ENG + DONO |
| NOVO-DOC-01 | `AGENTS.md:15,74`; `docs/agentes/contexto-agentes.md:21,38` | Contexto regerado a cada 10 min | `contexto.yml:48-49` roda de hora em hora (#140) | ENG |
| NOVO-DOC-02 | `docs/agentes/vercel-deploy.md:12` | 2 crons | 3 (`/api/commercial-alerts` */5) | ENG |
| NOVO-DOC-03 | `MATRIZ_RISCO_CAMADA_TESTE.md` | 3 specs e2e; vazios de anexo/jornada/concorrência | 6 specs; 3 vazios fechados (#199/#201/#206); restam `/montar-kit` só no smoke, `/minha-conta` sem spec, alerta sem destino | ENG |
| NOVO-DOC-05 | `docs/prod-readiness.md:72` | `www.promobrindes.com.br` responde 200 | Canonical/sitemap/robots/CSP em `promo-brindes-v1.vercel.app` (reforça PF-59) | DONO |
| NOVO-DOC-06 | `prod-readiness.md:57`; `AUTOMACAO_LOCAL.md:86` | 66 migrations / 14 workflows | 69 / 15 | ENG |
| NOVO-DOC-08 | `analise-prs/funcionalidades.csv` | F-06, F-10, F-27, F-31, F-75, F-80, F-85, F-98 pendentes | Fechados em 17/11; F-01, F-09, F-14/15, F-63, F-77, F-79, F-96, F-101 avançaram | ENG |
| NOVO-DOC-09 | `analise-prs/regras-de-negocio.md` | RN-ORC-12, RN-NOT-02, RN-NOT-04, RN-AUTH-04, RN-AUTH-09, RN-FIN-02, RN-FIN-04 como ausências | Resolvidas (ver PFs correspondentes) | ENG |
| NOVO-DOC-10 | `PENDENCIAS.md` | Conflito do PR #99 pendente | Resolvido (`eslint-plugin-jsx-a11y-x@0.2.0`, `package.json:128`); Copilot 402 = quota externa | DONO |
| NOVO-DOC-12 | `AUDITORIA.md` A-01..A-22 | 22 achados abertos | Só A-018 segue aberto (shell monta URL com `VITE_PUBLIC_URL`/`SITE_PUBLIC_ORIGIN`, `publicProductPage.ts:63`), A-022 bloqueado (canônico), A-013 remoto; demais fechados | ENG/DONO |
| NOVO-WF-01 | `automation-local.yml:25,33` | Padrão dos workflows | `ubuntu-latest`, `setup-node` com pin divergente, sem `defaults:` (regressão de WF03/WF54) | ENG |
| NOVO-WF-03 | `.github/actions/setup-node-project/action.yml:15` | Composite reutilizável | Nenhum workflow o usa; pin interno divergente | ENG |
| NOVO-WF-05 | `.github/CODEOWNERS:1-2` | "requer aprovação de @adm01-debug" | Proteção exige 0 aprovações | ENG |
| NOVO-WF-06 | `package.json:124` (`db:site:dry-run`) | — | `npx supabase@latest` enquanto CI/release fixam `2.115.0` | ENG |
| NOVO-PC-01 | `scripts/soak-test-notification-queue.mjs:216` | Relatório datado 16/09 | Sobrescrito a cada execução | ENG |
| NOVO-TODO-01 | `src/lib/catalog.ts:329` "Compatibilidade temporária" | Recuo temporário | Único marcador de provisório no código de produção (= PF-83) | DONO |
| NOVO-DOC-11 | `RELATORIO_CI.md` "publicar diagnóstico da sonda" | pendente | IMPLEMENTADO (#139) | — |
| NOVO-DOC-04 | `AUDITORIA_REFS_AUTOSAVE_20261118.md` (`retryOnAuth401`) | correção estacionada | IMPLEMENTADO (#202) | — |

### 3.3 Decisões, conteúdo e pessoas (itens novos bloqueados fora da engenharia)

| ID | Funcionalidade planejada (origem) | Estado | Quem |
| --- | --- | --- | --- |
| NOVO-FE-01 / NOVO-CA-01 | Registro datado da base (PRs, aliases, runtime) e versão de partida do Carnegie (FE 001, CA 001) | PARCIAL | ENG |
| NOVO-FE-02 | Registro formal de liberações/bloqueios com autor, data e custo (FE 005) | PARCIAL | DONO → ENG |
| NOVO-FE-04 | Homologação da continuidade de campanhas em contas controladas (FE 015) | PARCIAL-VALIDAÇÃO | PESSOAS |
| NOVO-FE-06 | Metas de concorrência e carga aprovadas (FE 026) | PARCIAL | DONO → ENG |
| NOVO-FE-07 / NOVO-FE-08 / NOVO-FE-09 | Julgamento de briefing/coleções/relacionados; qualidade dos dados exibidos (86 avisos de swatch); modelos comerciais de kits (FE 044, 045, 048) | BLOQUEADO / PARCIAL | CONTEÚDO / DONO |
| NOVO-FE-11 | Catálogo e filtros móveis homologados fisicamente (FE 050) | PARCIAL-VALIDAÇÃO | PESSOAS |
| NOVO-FE-16 / 17 / 18 / 19 / 20 | Aceite editorial, prontidão assinada, lote final com tag, observação pós-publicação, encerramento (FE 094–100) | BLOQUEADO / NÃO INICIADO | DONO / ENG |
| NOVO-CA-02 / 04 / 05 | Mapa etapa→requisito, perfis por necessidade, jornada com dúvidas (CA 002, 004, 005) | PARCIAL | ENG / CONTEÚDO |
| NOVO-CA-03 / 06 | Promessa de experiência aprovada ("proposta real"); capacidades operacionais/horário (CA 003, 008) | BLOQUEADO | DONO |
| NOVO-CA-07 / 08 / 09 | Marca sem atrapalhar tarefas; hierarquia e leitura; regras de foto e movimento (CA 013–015) | PARCIAL / NÃO INICIADO | CONTEÚDO |
| NOVO-CA-10 / 11 / 12 / 13 / 14 / 15 / 16 / 17 | Mockups e aprovações visuais [AV]: home por intenções, apoio à decisão, formulários, hero, entradas por objetivo, frases de marca, navegação/rodapé, biblioteca por intenção (CA 016, 018, 019, 021, 022, 026, 027, 029) | NÃO INICIADO / PARCIAL | DONO |
| NOVO-CA-19 / 20 | Revisar as quatro perguntas; avanço previsível [AV] (CA 031, 033) | NÃO INICIADO / PARCIAL | CONTEÚDO / DONO |
| NOVO-CA-26 / 29 / 31 | Mockup da ficha; fontes para fichas; apresentação ao gestor no PDF [AV] (CA 051, 059, 066) | PARCIAL / BLOQUEADO | DONO / CONTEÚDO |
| NOVO-CA-42 / 43 / 44 / 45 | Desempenho após instrumentação; piloto operacional; publicar por lotes; documento de execução Carnegie (CA 096, 098, 099, 100) | NÃO INICIADO / BLOQUEADO / PARCIAL | ENG / DONO |
| NOVO-UX-07 | Quadro compartilhado com comentários (Freeshop P2, "se houver demanda") | BLOQUEADO | DONO |
| NOVO-UX-08 | Prettier + `--check` no CI (plano-50 #06, descartado com registro) | NÃO INICIADO | DONO |
| NOVO-UX-09 | Higienizar swatches sem nome/duplicados na origem (UX_AUDIT F06) | BLOQUEADO (canônico) | DONO |
| NOVO-DOC-07 | Timer noturno 04:30 e hooks locais (`AUTOMACAO_LOCAL.md`) | BLOQUEADO (máquina do dono) | DONO |
| NOVO-GR-01 | Hashes no `requirements-graphify.txt` exigem ajustar `session-start.sh:73` | BLOQUEADO (decisão registrada) | DONO |

---

## 4. Divergências documento × código (consolidado)

| Documento | Afirma | Realidade | Evidência |
| --- | --- | --- | --- |
| `AGENTS.md` (Serviços › GitHub/CI) | `allowed_actions: all`; nunca `selected` | Repositório está em `selected` (API 20/11) | anexo 09 |
| `AGENTS.md:15,74`; `docs/agentes/contexto-agentes.md` | Contexto a cada 10 min | Cron horário | `contexto.yml:48-49` |
| `docs/agentes/vercel-deploy.md:12` | 2 crons | 3 crons | `vercel.json:6-9` |
| `docs/RUNBOOK_RELEASE.md:11,15-16,36-38` | Integração aplica migrations; rollback manual | `release.yml` aplica e faz rollback automático | `release.yml:79-103,289-319` |
| `docs/RUNBOOK_INCIDENTES.md:24-27,108-115` | 503 sem processar; alerta já dispara | Mede antes do 503; alerta exige webhook | `api/notifications.ts:662-672` |
| `docs/RUNBOOK_RESTORE_SITE.md:15`; `RUNBOOK_VERIFICACAO_DB.md:93-99` | 19 / 17 tabelas | 21 | migrations |
| `docs/RUNBOOK_PEDIDO_TITULAR.md:22,84-86` | 28/513 contratos; `20260923120000` | `plan(43)`; 608; `20261117030000` | pgTAP |
| `docs/RUNBOOK_ROTACAO_SEGREDOS.md:17-22` | 1 consumidor por segredo; `CRON_SECRET` sem redeploy | 3 crons leem `CRON_SECRET`; contradiz cutover | `api/*.ts` |
| `docs/RUNBOOK_REVISAO_MENSAL_BANCO.md:51` | Query de bloat | `last_autovacuum, last_autovacuum` | — |
| `docs/DATABASE_FUNCTION_CONTRACTS.md:43` | 500 para o provedor reentregar | Entrada permanentemente inválida reentrega em loop (doc alinhado ao bug) | `notification-events-*.ts:116,158` |
| `docs/DATABASE_FUNCTION_CONTRACTS.md:49,51,66-67,118-120` | Linhas de `retention.ts`; remoção manual do bucket | Linhas defasadas (#189); cron remove | `api/retention.ts:180-183` |
| `docs/MATRIZ_RISCO_CAMADA_TESTE.md:15,17,32,34-35` | 23 node/3 e2e; vazios; "até #199/#201 entrar" | 24/6; vazios fechados; PRs mergeadas | `ls e2e` |
| `docs/prod-readiness.md:57,72`; `AUTOMACAO_LOCAL.md:86` | 66 migrations; 14 workflows; domínio próprio ativo | 69; 15; canonical em `.vercel.app` | — |
| `docs/GUIA_DE_VOZ.md:12,17` | "Solicitar orçamento"; "radar" só em títulos; sem Gift Lovers | "Enviar briefing"/"Transformar em briefing"/"Ver minha curadoria"; "radar" em 5 ações (nova em `HomePage.tsx:231`); assinatura publicada | `QuotePage.tsx:494`; `Layout.tsx:211,215` |
| `docs/PLANO_CORRECOES_50_ETAPAS_20260913.md:100` | `noUncheckedIndexedAccess` adiada | Ativa | `tsconfig.app.json:11` |
| `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md:500` | Fase 3 fechada | Etapa 19 aberta | `:513` |
| `docs/PLANO_WORKFLOWS_100_ETAPAS_20260927.md:75` | 6 workflows | 15 | `.github/workflows` |
| `docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv` | 118 I / 100 P / 1 N / 11 E | LK10, UX35, UX49, UX88 já resolvidas; LK44 errada; UX83/LK15/UX12/UX14/UX19 otimistas; GR03/06/11/38 "I" ainda parciais; GR14/24/40/44 "I" atendidos no escopo estrutural por decisão registrada em `GOVERNANCA_FECHAMENTO.md:22-34` (melhorias além do escopo, não pendências); GR25/31/34/37 "P" não iniciadas | PF-109 |
| `docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md` | PR #94 e #88 abertas; "nenhum mockup após 09/09"; 77 fontes pequenas; PF-49/53/117 pendentes | #94 (27/10) e #88 (27/10) mergeadas; 16 PNGs (#103); 142; PF-49/117 fechados, PF-53 parcial | anexos 02, 05 |
| `docs/AUDITORIA_PENDENCIAS_ENG_VERIFICACAO_20261117.md` | PF-10 aberto; `e2e/` só 2 specs; 3 tags `backup/*` | #190; 6 specs; 0 tags | anexos 01, 04 |
| `analise-prs/funcionalidades.csv`, `analise-prs/regras-de-negocio.md`, `PENDENCIAS.md` | ver NOVO-DOC-08/09/10 | defasados | anexo 08 |
| `.github/CODEOWNERS:1-2` | Requer aprovação | 0 aprovações exigidas | API 20/11 |
| `src/pages/PrivacyPage.tsx:16-17` | Confirmação transacional; direitos de acesso/correção/eliminação; "cópia pelo WhatsApp" | Sem provedor; sem RPC self-service; template não é cópia | PF-15/17/30 |
| `src/pages/QuotePage.tsx:371,376,385` | Time analisa e entra em contato; recomendação sob medida | Depende de webhook remoto; sem back-office | PF-01/03/16 |
| `src/pages/CatalogPage.tsx:30,44,62` | Curadoria humana / iniciada pelo briefing / Curadoria Promo | Ranking determinístico só na página | PF-18 |
| `src/components/ProductCard.tsx:57`; `src/lib/campaignPresets.ts:98`; `QuotePage.tsx:467` | Personalize; "un."; "ficam salvos" | ver PF-19/20/21 | — |
| `src/lib/catalogFilters.ts:10-11`; `CatalogPage.tsx:62`; `HomePage.tsx:221` | "Em alta" / "Destaques da curadoria" / "Tendências" | Três nomes para dois conceitos; nenhum de uso real | PF-115 |
| `20261117030100_repair_incomplete_customer_data_erasure.sql` (cabeçalho) | Nada enfileira `request_kind='contact'` | `20261117010000` enfileira | NOVO-DB-02 |

---

## 5. Decisões que só o dono pode tomar (inalteradas desde 11/10, salvo nota)

| # | Decisão | Itens destravados | Nota de hoje |
| --- | --- | --- | --- |
| D1 | Destino do lead (CRM/canal interno) e quem responde | PF-01, 03, 04, 05, 06, 16, 25, NOVO-DB-01 | Código do webhook pronto; presença de `COMMERCIAL_TEAM_WEBHOOK_URL/_TOKEN` em produção NÃO VERIFICADA (Vercel inacessível); back-office inexistente |
| D2 | Ligar Resend e WhatsApp Cloud | PF-07, 08, 09, 13, 14, 15 | `RESEND_API_KEY` existe como secret do **GitHub** (sem uso em workflow); a ativação real depende das variáveis na **Vercel**, não lidas — NÃO VERIFICADO |
| D3 | Domínio oficial | PF-59, 60, NOVO-DOC-05 | `prod-readiness.md` já cita `www.promobrindes.com.br` |
| D4 | RPO/RTO e PITR | PF-86 | — |
| D5 | Segundo revisor de PR | PF-69, 70 | 25 últimas PRs com 0 aprovações |
| D6 | Resumo × cópia; exibição do checkbox de WhatsApp | PF-13, 15 | Texto do checkbox já corrigido (#160) |
| D7 | Ranking local × global ("Curadoria") | PF-18, 40, 50, 115 | — |
| D8 | Preview isolado | PF-89 | — |
| D9 | Conteúdo (PDFs, cases, fotos, dados por família) | PF-22, 46, 57, 58, 61, 63, 64, 127 | — |
| D10 | Cutover do JWT `site_api` | PF-73 | — |
| D11 | Promo Gifts: `mcp_kv_get`, `pendente_*`, recuo `v_products_public`, swatches | PF-76, 83, NOVO-UX-09 | 4 SQLs sem recibo de aplicação |
| D12 | Pesquisa com compradores; acessibilidade manual | PF-104, 105 | — |
| D13 (novo) | `allowed_actions` | PF-67 | **Resolvido em 20/11 10:36 UTC**: o valor `selected` fazia o Quality gate falhar na inicialização em todas as PRs (#211–#214, 12 `startup_failure` entre 00:05 e 10:32), bloqueando `validate`/`cross-browser`; restaurado para `all` + `sha_pinning_required: true`, como AGENTS.md exige. Resta ao dono decidir se quer um guard contra regressão |
| D14 (novo) | Aplicar o reparo retroativo `20261117030100` (destrutivo) | PF-31 | Snapshot indica aplicado; confirmar no projeto |
| D15 (novo) | Mockups [AV] para 8 etapas Carnegie ainda sem proposta visual | NOVO-CA-10..17, PF-37/38/39/41/48/60/116/118/119/121 | PRs #211–#213 avançam sem mockup aprovado versionado |

---

## 6. Itens fechados desde 11/10 (não reabrir)

PF-10 (#190) · PF-27 (#183) · PF-31 código (#161) · PF-49 (#166/#170/#177/#182) · PF-66 e PF-67 (Settings, 16–17/11) · PF-77 (#165) · PF-80 (#185) · PF-85 (#184/#189) · PF-102 (#199) · PF-103 (#200/#201/#205) · PF-112 (#186/#191) · PF-117 (#88, 27/10) · PF-128 (#103) · FE 032/033 (#116) · GR09 (#198) · GR42 (#194) · WF25 (#188) · correção `retryOnAuth401` (#202) · diagnóstico da sonda no CI (#139).

---

## 7. Não verificado nesta auditoria

- Variáveis de ambiente de produção na Vercel (API recusou o token): `RESEND_API_KEY`, `SITE_EMAIL_FROM`, `WHATSAPP_*`, `RESEND_WEBHOOK_SECRET`, `WHATSAPP_APP_SECRET`, `COMMERCIAL_TEAM_WEBHOOK_URL/_TOKEN`, `OPERATIONS_ALERT_WEBHOOK_URL/_TOKEN`, `VITE_CUSTOMER_ADJUSTMENTS_ENABLED`, `VITE_QUOTE_DECISION_GROUPS_ENABLED`, `VITE_PERSISTENT_SHARED_SELECTIONS_ENABLED`. Decide na prática PF-01, 06, 07, 08, 09, 14, 16, 25, 51, 88.
- Logs dos 3 crons na Vercel (saúde da fila após #190, entregas comerciais, retenção).
- Execução dos 4 SQL de `docs/sql/canonical-principal/` no banco canônico (PF-76) e permissões legadas (PF-83).
- Comportamento da Vercel ao trocar env var sem redeploy (PF-72/NOVO-RB-05).
- Ensaios humanos: autenticação real (PF-26), acessibilidade (PF-104), dispositivos (NOVO-FE-11), continuidade de campanhas (NOVO-FE-04).
- Testes não executados localmente; Graphify não usado para a varredura.
- Verificação adversarial dos 298 vereditos (um agente cético por item) não concluída por limite de uso do modelo.

---

## Próximos passos

1. **Ligar o aviso ao comercial de ponta a ponta** — o código de orçamento e contato está pronto e silencioso sem a URL; falta configurar `COMMERCIAL_TEAM_WEBHOOK_URL`/`_TOKEN` na Vercel (decisão D1: N8N→Bitrix), estender o alerta ao pedido de ajuste (NOVO-DB-01: CHECK `request_kind` + trigger em `quote_adjustment_requests`) e medir a ausência da URL (NOVO-PC-03) · `site-supabase/supabase/migrations`, `api/_lib/commercialTeamAlerts.ts`, Vercel env.
2. **Parar de prometer o que não acontece** — e-mail "Registrado para envio" vira "Indisponível" quando não há Resend (PF-14), checkbox de WhatsApp só aparece com canal ligado (PF-15), textos "Personalize este produto…" (PF-19), "51–200 un." (PF-20), "ficam salvos" (PF-21) e `PrivacyPage.tsx:16-17` corrigidos (PF-17) · `api/notifications.ts`, `src/pages/QuotePage.tsx`, `src/components/ProductCard.tsx`, `src/lib/campaignPresets.ts`, `src/lib/quoteDraft.ts`, `src/pages/PrivacyPage.tsx`.
3. **Realinhar documentação e configuração que mentem hoje** — `allowed_actions` de volta a `all` (D13), 6 runbooks (RELEASE, INCIDENTES, RESTORE, VERIFICACAO_DB, PEDIDO_TITULAR, ROTACAO: inclui `SITE_SUPABASE_DB_URL`), `AGENTS.md`/`contexto-agentes.md` (cron horário), `vercel-deploy.md` (3 crons), `MATRIZ_RISCO_CAMADA_TESTE.md`, `analise-prs/funcionalidades.csv` e `regras-de-negocio.md`, `.github/CODEOWNERS` · `docs/`, `.github/`, Settings do GitHub.
