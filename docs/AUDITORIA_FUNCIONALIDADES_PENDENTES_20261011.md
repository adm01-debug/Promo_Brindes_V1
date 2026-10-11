# Auditoria de funcionalidades planejadas e não executadas — 11/10/2026

Levantamento exaustivo de tudo o que foi **planejado** para o site Promo Brindes (planos, revisões, auditorias, benchmarks, runbooks, contratos de banco, comentários no código) e que **não foi executado** ou foi executado **parcialmente**, confrontado com o código real.

| Campo | Valor |
| --- | --- |
| Base auditada | `main` = `3f82233` (06/10/2026, "fix(ux): elimina perdas de dados em fluxos assíncronos (#89)") |
| PRs abertas consideradas (fora de `main`) | #94 `feat/carnegie-briefing-confirmation` (resumo editável e confirmação do briefing) e #88 `fix/product-card-clean-image-background` |
| Escopo lido | 73 documentos em `docs/` + `AUDITORIA.md`, `PLANO_100.md`, `UX_AUDIT_REPORT.md`, `plano-50-etapas.html`, `AGENTS.md`; `src/` (pages, components, lib, context), `api/` e `api/_lib/`, `shared/`, 65 migrations e 28 arquivos pgTAP em `site-supabase/`, `scripts/`, `tests/`, `e2e/`, 12 workflows em `.github/`, `vercel.json`, `.env.example`, `package.json` |
| Planos auditados etapa a etapa | Matriz de 230 requisitos (UX/LK/GR/AC) · Plano de fechamento 100 (01/10) · Plano Carnegie UX 100 (05/10) · Plano de workflows 100 (27/09) · Plano Graphify 50 · Planos de correções 13/09, 16/09, 17/09, 23/09 e 24/09 (5 × 50) · Plano UX 100 (09/09) · Benchmarks Lukka, Freeshop, Gen Z · `PLANO_100.md` e `plano-50-etapas.html` |
| Método | Leitura integral dos planos; para cada etapa, busca do entregável no código (grep, leitura de arquivo, migrations, testes, workflows) com evidência `arquivo:linha` ou busca negativa reproduzível. Estado remoto (GitHub, Vercel) consultado só em leitura, quando a API permitiu. |
| Anexos (detalhe etapa a etapa) | [`docs/audits/pending-features-20261011/`](audits/pending-features-20261011/README.md) — 8 relatórios, um por frente |

## Limites desta auditoria (o que NÃO foi verificado)

- **Testes não executados.** O clone não tinha `node_modules`; Vitest, Playwright, `tsc` e pgTAP não rodaram. Afirmações sobre testes vêm da leitura do código e dos runs de CI no GitHub.
- **Graphify indisponível.** `npm run graph:status` falha sem `node_modules` (`ERR_MODULE_NOT_FOUND: typescript`, `scripts/graphify-quality.mjs:3`). A auditoria usou leitura direta, como o `AGENTS.md` prevê quando o grafo está ausente. Isso por si é um achado (ver PF-106).
- **Variáveis de ambiente da Vercel não lidas** (API respondeu 403). A ausência de `RESEND_*`, `WHATSAPP_*`, `OPERATIONS_ALERT_*` e `SITE_SUPABASE_SERVICE_JWT` em produção é **inferida** pelos logs (cron de notificações sem nenhum log em 72 h) e pela decisão registrada em `docs/EXECUCAO_PLANO_FECHAMENTO_20261001.md:65-66`.
- **Banco remoto não consultado.** O estado do Supabase isolado (`xlzmclcjdncjfdrjxclt`) e do canônico vem de documentos datados (`AUDITORIA.md` 24/09, `UX_AUDIT_REPORT.md` 05/10) e dos runs do `release.yml`.
- **Promo Gifts (sistema interno) fora do escopo**, conforme `AGENTS.md`. Itens dele aparecem só como dependência externa.

## Legenda

| Estado | Significado |
| --- | --- |
| **NÃO INICIADO** | Nenhum entregável da funcionalidade existe no código. |
| **PARCIAL** | Existe parte; o texto diz exatamente o que falta. |
| **PARCIAL-VALIDAÇÃO** | O código existe; falta teste, homologação real, aceite humano ou ensaio em produção. |
| **BLOQUEADO** | Depende de decisão do dono, credencial, conteúdo, dados comerciais, pessoas ou custo. A engenharia não avança sozinha. |
| **DIVERGÊNCIA** | Documento, contrato ou texto da interface afirma algo que o código não faz. |

Quem destrava: **ENG** = engenharia pode fazer agora · **DONO** = decisão de negócio · **CONTEÚDO** = marketing/comercial fornece material · **PESSOAS** = pesquisa, segundo revisor, homologação física.

---

## 1. Resumo para o dono (leitura de 2 minutos)

**O site funciona como vitrine e coleta briefings, mas o ciclo comercial depois do envio não existe.** O orçamento é gravado no banco e ninguém da Promo é avisado. A confirmação ao cliente por e-mail/WhatsApp está pronta no código, mas desligada. O portal do cliente mostra propostas e status, mas não existe ferramenta para a equipe publicar proposta, mudar status ou responder ajustes — tudo isso hoje só por SQL manual.

### Placar por plano (estado real em `main`)

| Plano | Etapas | Concluídas | Parciais | Não iniciadas | Bloqueadas (externo) | Anexo |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Matriz de fechamento (UX/LK/GR/AC) — só as 112 linhas não-I | 112 | 4 já resolvidas (matriz desatualizada) | 15 código + 63 validação | 3 | 27 | [01](audits/pending-features-20261011/01-matriz-230-requisitos.md) |
| Plano de fechamento (01/10) | 100 | 5 | 41 | 20 | 34 | [02](audits/pending-features-20261011/02-plano-fechamento-100.md) |
| Plano Carnegie UX (05/10) | 100 | 12 (todas anteriores ao plano) | 49 | 24 (+3 em PR aberta) | 12 | [03](audits/pending-features-20261011/03-plano-carnegie-ux-100.md) |
| Plano de workflows/CI (27/09) | 100 | 21 | 29 | 42 | 8 | [04](audits/pending-features-20261011/04-workflows-ci-operacao.md) |
| Graphify | 50 | 17 | 29 | 4 | — | [08](audits/pending-features-20261011/08-codigo-e-graphify.md) |
| Planos de correções 13/09–24/09 (5 × 50, deduplicados) | 250 | maioria técnica concluída | **41 pendências consolidadas** + 8 adiamentos formais | | | [06](audits/pending-features-20261011/06-planos-correcoes-50.md) |
| `PLANO_100.md` (24/09) | 22 | 17 | 3 | 0 | 2 | [05](audits/pending-features-20261011/05-ux-benchmarks-pesquisa.md) §1 |
| `plano-50-etapas.html` (13/09) | 50 | 32 | 17 | 0 | 1 | [05](audits/pending-features-20261011/05-ux-benchmarks-pesquisa.md) §2 |
| Docs de UX, benchmarks (Lukka, Freeshop, Gen Z), portal do cliente, guia de voz, `UX_AUDIT_REPORT.md` — funcionalidades prometidas (inclui as duas linhas acima) | 244 itens | 145 | 59 | 15 | 25 | [05](audits/pending-features-20261011/05-ux-benchmarks-pesquisa.md) |

Matriz oficial (`docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv`): **118 I / 100 P / 1 N / 11 E** — congelada desde 22/09 (`dafd3d9`), 104 commits atrás. Reconciliada com o código, ficaria **116 I / 102 P / 1 N / 11 E**, com 4 linhas já resolvidas, 1 linha (LK44) afirmando algo que não existe e outras 3 linhas I questionáveis (UX12, UX14, UX19 — ver seção 5).

### As 12 lacunas que mais custam ao negócio

| # | Lacuna | Efeito no negócio | Estado | Quem destrava |
| --- | --- | --- | --- | --- |
| 1 | **Nenhum aviso ao time comercial** quando chega orçamento, contato ou pedido de ajuste (PF-01) | Lead parado no banco até alguém abrir o Supabase | NÃO INICIADO | DONO decide destino (recomendação: Bitrix24 via N8N) → ENG |
| 2 | **Sem ferramenta interna**: publicar proposta, mudar status, responder ajuste (PF-03) | Portal do cliente promete propostas e linha do tempo que só existem com SQL manual; cliente **trava** após 3 ajustes pendentes | NÃO INICIADO | ENG (após 1) |
| 3 | **Confirmação ao cliente desligada** (Resend/WhatsApp) e tela diz "registrada para envio" (PF-07, PF-14) | Cliente não recebe nada; ao ligar, confirmações antigas sairão todas de uma vez | BLOQUEADO + PARCIAL | DONO (credenciais) + ENG (corte de backlog) |
| 4 | **Checkbox "cópia pelo WhatsApp"** sempre visível, sem WhatsApp ligado e sem ser cópia (PF-15) | Consentimento coletado para algo que não acontece | DIVERGÊNCIA | ENG + aprovação de texto |
| 5 | **Repositório público com secret scanning e push protection desligados** (PF-66) | Segredo commitado por engano fica exposto | NÃO INICIADO | ENG (configuração, custo zero) |
| 6 | **Restore nunca ensaiado**, sem RPO/RTO, Storage (PDFs/anexos) sem backup (PF-86) | Perda de dados sem prazo de recuperação conhecido | BLOQUEADO | DONO (meta e custo) |
| 7 | **Crons sem vigia**: notificações respondem 503 ~96×/dia sem log; nada avisa se o cron parar (PF-10, PF-87, PF-88) | Falha silenciosa | NÃO INICIADO | ENG |
| 8 | **LGPD parcial**: apagamento só por SQL manual e incompleto; sem acesso/exportação/correção/autoexclusão, apesar da Política de Privacidade prometer (PF-17, PF-30, PF-31) | Risco regulatório | PARCIAL | ENG + jurídico |
| 9 | **Briefing "escuta" fraco**: troca de campanha silenciosa, intenção vira filtro sem explicação, quem não sabe o que quer não tem caminho (PF-37 a PF-40) | Proposta montada sobre briefing errado; perda no topo do funil | NÃO INICIADO / PR #94 parcial | ENG + mockup aprovado |
| 10 | **Domínio oficial indefinido**: canonical, sitemap e robots apontam para `promo-brindes-v1.vercel.app` (PF-59) | SEO trabalha para o domínio errado | BLOQUEADO | DONO |
| 11 | **Conteúdo de confiança ausente**: catálogos PDF/revista, cases, prova social, fotos próprias, bastidores (PF-57, PF-58) | Site B2B sem prova de execução | BLOQUEADO | CONTEÚDO |
| 12 | **Governança de revisão inefetiva**: único colaborador; PRs #82 e #83 mergeados sem nenhuma aprovação registrada; migrations aplicadas em produção sem recibo (PF-69, PF-77) | Qualquer erro vai direto para produção | BLOQUEADO / NÃO INICIADO | DONO (2º revisor) + ENG |

---

## 2. Backlog consolidado (deduplicado entre todos os planos)

Cada item junta todas as origens que pedem a mesma coisa. "Origens" usa: **MZ** = matriz (ID), **FE** = plano de fechamento 01/10 (etapa), **CA** = Carnegie (etapa), **WF** = workflows (etapa), **GR** = Graphify, **P13/P16/P17/P23/P24** = planos de correção (etapa), **AUD** = `AUDITORIA.md`/`AUDIT_REPORT_20260908.md`, **UXA** = `UX_AUDIT_REPORT.md`.

### 2.1 Atendimento comercial — o lead chega a alguém?

| ID | Funcionalidade planejada | Estado | O que falta (concreto) | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-01 | Encaminhar orçamento, contato e pedido de ajuste ao time comercial (outbox comercial idempotente + adaptador de destino) | NÃO INICIADO | Decidir destino (CRM/e-mail/WhatsApp interno); criar outbox `audience='commercial_team'` (o CHECK já prevê); adaptador com timeout/backoff/reconciliação; testes com destino simulado | `commercial_team` só no CHECK `site-supabase/supabase/migrations/20260908230000_create_site_lead_storage.sql:89` (e um fixture pgTAP); outbox só gera `customer` (`20260912170000_add_quote_notification_outbox.sql:22,29`); canais só ao cliente (`api/notifications.ts:72`); 0 ocorrências de `crm`/`hubspot`/`pipedrive`/`bitrix` em `api/` `src/` | MZ UX70, UX77; FE 031–034, 040; P23:18; P24:35–36 | DONO → ENG |
| PF-02 | Responsável, estados operacionais e prazo (SLA) por pedido | BLOQUEADO | Comercial define estados, atribuição, SLA e feriados; banco ganha colunas de responsável/prazo; tela de sucesso e portal passam a informar prazo | `site_private.quote_requests` sem coluna de responsável/prazo; 0 ocorrências de `assigned`/`sla`/`due_at` em migrations; `QuotePage.tsx:355` sem prazo | MZ UX67, UX75; FE 035; P13:27; P23:19; P24:37 | DONO |
| PF-03 | Back-office mínimo: mudar status, triar ajustes, publicar proposta (PDF) | NÃO INICIADO | Hoje: status só por `UPDATE` direto; propostas só inseridas por pgTAP; ajustes nunca saem de `new/triaged` | `site_private.proposal_documents` recebe INSERT só em `site-supabase/supabase/tests/database/*.test.sql`; máquina de estados `20260916100000_add_quote_event_sequence_and_status_state_machine.sql:89-160` sem RPC de triagem; `SITE_SUPABASE_SETUP.md:111` (upload manual) | MZ UX75, UX76, UX77, AC24; FE 017 | ENG |
| PF-04 | **Cliente bloqueado após 3 ajustes pendentes** | DIVERGÊNCIA (bug latente) | Como nada muda o status do ajuste para `resolved/closed`, a 4ª tentativa recebe `too_many_pending_adjustments` para sempre | `20260923120000_audit_security_reliability_hardening.sql:202-205` (limite) + `20260910130000_customer_adjustments_and_preferences.sql:11` (estados nunca usados) | anexo 07 §1 | ENG (com PF-03) |
| PF-05 | Mensagens da equipe ao cliente e evento "proposta publicada" na linha do tempo | NÃO INICIADO | Eventos `message` e `proposal_published` existem só no CHECK; nenhum trigger/RPC os gera | `20260909180000_create_customer_quote_portal.sql:30`; `20260910130000:33` | anexo 07 §1, §7 | ENG |
| PF-06 | "Fale conosco" com destino | PARCIAL | `contact_requests` é gravado (com canal preferido) e retido 24 meses, sem nenhum consumidor | `20260908230000:51-66`; `api/contact-requests.ts` | FE 034 | ENG (com PF-01) |

### 2.2 Confirmações ao cliente (e-mail e WhatsApp)

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-07 | Confirmação por e-mail (Resend) | BLOQUEADO (adiado pelo dono) | `RESEND_API_KEY` + `SITE_EMAIL_FROM` em Production, domínio remetente com SPF/DKIM (`.env.example` ainda usa `seudominio.com.br`), redeploy, homologação com caixa real | `api/notifications.ts:292-320,376-386`; `EXECUCAO_PLANO_FECHAMENTO_20261001.md:65-66` | MZ UX68, LK45; FE 036–037; P13:29–30; P23:20; P24:38 | DONO |
| PF-08 | Confirmação por WhatsApp (Cloud API) | BLOQUEADO (adiado) | 4 variáveis `WHATSAPP_*`, template Meta aprovado, token de system user, verificação do Business | `api/notifications.ts:322-374` | MZ UX69; FE 038; CA 082 | DONO |
| PF-09 | Webhooks de entrega (Resend/WhatsApp) | BLOQUEADO + bug | Secrets de webhook e cadastro das URLs. **Bug:** entrada inválida responde 500, o provedor reentrega em loop (contrato promete 400) | `api/notification-events-resend.ts:58-59,111-116`; `api/notification-events-whatsapp.ts:79-80,120-125`; `docs/DATABASE_FUNCTION_CONTRACTS.md:42` | FE 039 | DONO + ENG |
| PF-10 | Saúde da fila medida mesmo sem provedor | NÃO INICIADO | O cron `*/15` retorna 503 **antes** de `reportQueueHealth()`: ~96 execuções/dia sem log; 0 logs em 72 h | `api/notifications.ts:642-646` vs `:689`; `vercel.json:8` | anexo 04 §6 | ENG |
| PF-11 | Corte de idade/cancelamento do backlog antes de ligar provedores; não enviar a pedidos `spam` nem a titular apagado | NÃO INICIADO | `claim_site_notification_deliveries` não filtra idade, `spam` nem `@erased.invalid`; status `cancelled` existe e é inalcançável pela API | `20260923200000_enrich_quote_confirmation_contract.sql:80-110`; `api/notifications.ts:390` | anexo 07 §7 | ENG |
| PF-12 | Lista de supressão (bounce/complaint), ferramenta de reprocessamento (`exhausted→pending`), re-vínculo de evento que chega antes do aceite e purga de órfãos | NÃO INICIADO | Hoje reprocessar é SQL manual; eventos órfãos (`delivery_id NULL`) nunca são apagados | `20260916140000_add_provider_event_precedence.sql:50-88`; `RUNBOOK_INCIDENTES.md:61-68` | anexo 07 §5, §7 | ENG |
| PF-13 | Conteúdo das confirmações: "resumo" ou "cópia integral" (Etapa 31) | BLOQUEADO (decisão de produto) | Decisão provisória registrada em comentário; texto do e-mail diverge do comentário (o e-mail já leva ação, verba e prazo) | `src/pages/QuotePage.tsx:357-364` vs `api/notifications.ts:261-280` | P13:31; P23:16–17; P24:34; FE 036 | DONO |

### 2.3 Promessas da interface sem entrega

| ID | Texto na tela | Por que é promessa sem entrega | Evidência | Quem |
| --- | --- | --- | --- | --- |
| PF-14 | "Confirmação por e-mail registrada para envio" / "…pelo WhatsApp autorizada e registrada para envio" | Sem provedor, o job fica `pending` para sempre e o cron só responde 503 | `src/pages/QuotePage.tsx:365`; `api/notifications.ts:588-593,642-646` | ENG + texto aprovado |
| PF-15 | Checkbox "Quero receber **uma cópia desta solicitação** também pelo WhatsApp" | Aparece sempre (sem checar provedor); o template envia só nome, protocolo e empresa — não é cópia; WhatsApp adiado | `src/pages/QuotePage.tsx:457`; `api/notifications.ts:337-356` | ENG + texto aprovado |
| PF-16 | "Nosso time de especialistas vai analisar os itens e entrar em contato" / "Ele aparecerá na linha do tempo" / "Nosso time… vai falar com você" | Não existe handoff (PF-01) nem quem escreva na linha do tempo (PF-03) | `QuotePage.tsx:355`; `CustomerQuotePage.tsx:234`; `ConversationForm.tsx:76` | ENG (PF-01/03) |
| PF-17 | Política de Privacidade: confirmação transacional por e-mail; exclusão da conta; direitos de acesso e correção | Sem provedor; sem autoexclusão; sem RPC de acesso/exportação/correção | `src/pages/PrivacyPage.tsx:12,16,17` | ENG + jurídico |
| PF-18 | "Curadoria iniciada pelo seu briefing", "curadoria humana", ordenação "Curadoria Promo" | A ordenação por intenção é aplicada no navegador **só sobre a página carregada**; não há curadoria humana registrada | `src/pages/CatalogPage.tsx:30,44,64`; `src/lib/useCatalogPageState.ts:112-115` | DONO (decisão de alcance) + ENG |
| PF-19 | Descrição padrão "Personalize este produto…" | Aparece mesmo quando `allowsPersonalization` é falso | `src/components/ProductCard.tsx:43-49,57,60` | ENG |
| PF-20 | Faixa de público "Escala: 51–200 **un.**" | Faixa de pessoas exibida como quantidade de unidades | `src/lib/campaignPresets.ts:98` | ENG |
| PF-21 | Aviso "ficam salvos" do rascunho | Aparece mesmo quando a gravação no `sessionStorage` falha (`saveQuoteDraft` retorna `void`) | `src/lib/quoteDraft.ts:52,62-83`; `QuotePage.tsx:431-432` | ENG |
| PF-22 | "Abrir PDF" / "Abrir revista" na biblioteca de catálogos | As 10 coleções são `format: 'online'`; PDF e revista são só estrutura (texto atual é honesto) | `src/lib/catalogLibrary.ts:42-146` | CONTEÚDO |

### 2.4 Portal do cliente e conta

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-23 | Propostas versionadas no portal | PARCIAL | Leitura e URL assinada de 60 s prontas; sem produtor (PF-03); nenhuma proposta publicada | `api/customer-proposals.ts:121-125`; `20260909180000:41-68` | MZ UX76, AC24; FE 017 | ENG |
| PF-24 | Perfil do cliente (empresa, nome) editável | PARCIAL | `customer_profiles.company` nunca é escrito; não há RPC de leitura/edição | `20260909180000:15-23`; único INSERT `20260923120000:350-353` | anexo 07 §1 | ENG |
| PF-25 | Pedidos de ajuste | PARCIAL | Atrás de `VITE_CUSTOMER_ADJUSTMENTS_ENABLED`; não roteado (PF-01); bloqueio após 3 (PF-04); sem e2e | `src/lib/siteFeatureFlags.ts:6`; `CustomerQuotePage.tsx:186-214,234` | MZ UX77; CA 086 | ENG |
| PF-26 | Ciclo real de autenticação (e-mail recebido, expiração, refresh, recuperação) | PARCIAL-VALIDAÇÃO | Ensaio com contas controladas e e-mail real | `CustomerLoginPage.tsx:52-89`; `SetPasswordPage.tsx:28` | MZ AC04, AC06, AC07, AC10, UX73; FE 016 | PESSOAS |
| PF-27 | Rate limit de propostas e anexos responde 429 | DIVERGÊNCIA | Estouro vira 404 "não encontrado" | `api/customer-proposals.ts:114`; `api/briefing-assets.ts:128` | anexo 07 §4 | ENG |
| PF-28 | Conta como benefício opcional, explicada | PARCIAL | Orçamento anônimo funciona; falta explicar benefício e opcionalidade | `QuotePage.tsx:369,372` | CA 083 | ENG + mockup |
| PF-29 | Linha do tempo com próximo passo por status | PARCIAL | Status desconhecido vira "Em acompanhamento"; sem próximo passo | `CustomerQuotePage.tsx:236`; `customerAccount.ts:36-45` | CA 085 | ENG |

### 2.5 Privacidade e LGPD

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-30 | Direitos do titular: acesso/exportação, correção, autoexclusão, canal e registro do pedido | NÃO INICIADO (exceto apagamento manual) | RPCs e fluxo; ensaio com identidades sintéticas; revisão jurídica | 0 ocorrências de `export_my`/`portabilidade`; `erase_customer_data` sem consumidor em `api/` `src/` | FE 020; MZ UX80, AC29 | ENG + jurídico |
| PF-31 | Apagamento completo | PARCIAL | `erase_customer_data` não limpa `quote_requests.request_metadata`, `contact_requests.request_metadata`, `quote_items.kit_name_snapshot` nem entregas pendentes (com provedor ligado, enviaria para `titular-…@erased.invalid`) | `20260923120000:244,290-301`; `20260922160000_preserve_kit_composition.sql:7`; `RUNBOOK_PEDIDO_TITULAR.md:30` | anexo 07 §4 | ENG |
| PF-32 | Retenção por tabela completa | PARCIAL | Eventos órfãos nunca purgados; contas/perfis inativos, seleções e favoritos sem prazo; `spam` com o mesmo prazo dos legítimos; 8 tabelas sem `comment on table` de finalidade | `20260916140000:56,64-66`; `DATABASE_DICTIONARY.md:36,52,105,187,204,246,262,312` | FE 025; P16:35; P17:31 | ENG + DONO |
| PF-33 | Evento `erased` na linha do tempo (criar ou dispensar formalmente) | BLOQUEADO (decisão) | Sem decisão nem implementação | 0 ocorrências de `'erased'` em `quote_request_events` | P16:32; P23:25; P24:18 | DONO |
| PF-34 | Auditoria de leitura (SELECT em PII) | NÃO INICIADO | Só há auditoria de escrita e DDL | `20260916210000_add_admin_write_audit.sql:15,92` | FE 025 | ENG |
| PF-35 | Saneamento de anexos (reencode, remoção de EXIF, limite de dimensões); PDF | PARCIAL | Hoje só checa assinatura em 1 KiB; PDF em quarentena permanente | `api/_lib/fileSignatures.ts:3-8`; `api/briefing-assets.ts:77-81` | FE 019; P23:23; P24:16–17 | ENG |
| PF-36 | Criptografia de PII em repouso, telefone E.164, rate limit de borda | BLOQUEADO (adiados formalmente) | Spikes e decisões | `DATABASE_FUNCTION_CONTRACTS.md:122-212` | P16:27, P16:30, P16:24 | DONO |

### 2.6 Experiência: briefing, catálogo, produto, seleção e formulário

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-37 | Resumo "O que entendemos" editável após as 4 perguntas | PARCIAL (PR #94 aberta) | Na PR o resumo só aparece com 4/4 respostas; falta "cancelar edição", foco devolvido e merge; imagens de aprovação não versionadas | `origin/feat/carnegie-briefing-confirmation`: `CampaignFinder.tsx:52,129,139,145` | CA 017, 034, 035 | ENG + DONO |
| PF-38 | Caminho "Ainda não sei o que escolher" e saída com 0 respostas | NÃO INICIADO | Com 0 respostas o CTA fica desabilitado e não há saída para o catálogo | `src/components/CampaignFinder.tsx:101`; 0 ocorrências de "Ainda não sei" | CA 023, 032 | ENG + mockup |
| PF-39 | Troca de campanha consciente (manter/substituir/cancelar) | NÃO INICIADO | `setCampaign` sobrescreve o contexto do carrinho em silêncio; "Limpar tudo" não limpa o contexto, que segue para o orçamento | `src/lib/useCatalogPageState.ts:132-137,234` | CA 037, 038 | ENG + mockup |
| PF-40 | Separar intenção de filtros efetivos; explicar a seleção exibida e a ordenação | NÃO INICIADO | Mostrar quais respostas viraram filtro; descrever "Curadoria Promo"; decidir ranking local × global | `CatalogPage.tsx:44,64`; `catalogRanking.ts:18-21` | CA 036, 041, 047; FE 043; P23:13; P24:27 | DONO + ENG |
| PF-41 | Contexto editável no próprio orçamento; campos na ordem da conversa | NÃO INICIADO | Formulário começa por dados pessoais; contexto só leitura | `QuotePage.tsx:434,439-446` | CA 039, 072 | ENG + mockup |
| PF-42 | Telefone coerente entre orçamento e contato | PARCIAL | Obrigatório no orçamento, opcional no contato | `QuotePage.tsx:442`; `ConversationForm.tsx:110` | CA 073 | DONO |
| PF-43 | Repetir orçamento sem esconder mudanças | PARCIAL | Quantidade antiga ajustada ao novo mínimo sem aviso | `src/lib/quoteItems.ts:173` | CA 087 | ENG |
| PF-44 | Retorno claro ao adicionar e confirmação consistente ao limpar | PARCIAL | Adicionar só abre o drawer; "Limpar seleção" na página não confirma (no drawer confirma); "Apagar rascunho" sem confirmação | `QuoteCartContext.tsx:81-113`; `QuotePage.tsx:414`; `QuoteDrawer.tsx:209` | CA 058, 062, 074 | ENG |
| PF-45 | "Por que este produto" (compatibilidade) e ideias de uso com fonte | NÃO INICIADO / BLOQUEADO | Regra determinística de adequação; conteúdo de aplicações | 0 ocorrências em `ProductCard.tsx`; 0 de "ideias de uso" | CA 046, 054 | ENG + CONTEÚDO |
| PF-46 | Personalização por família (técnicas, áreas, exemplos) e múltiplo de compra | BLOQUEADO (dados comerciais) | Contrato do catálogo só expõe `allows_personalization` e `min_quantity` | `src/lib/catalog.ts:58-92,76,226`; `src/types.ts:20` | MZ UX47, LK22, LK23; FE 046–047 | CONTEÚDO + ENG |
| PF-47 | WhatsApp iniciado pelo visitante (link `wa.me` contextual) | NÃO INICIADO (**matriz diz que existe**) | Link com número comercial validado | 0 ocorrências de `wa.me`/`api.whatsapp.com`/`whatsapp://` em `src/` `api/` `e2e/`; só opção de canal em `ConversationForm.tsx:13` | MZ LK44; FE 059 | DONO + ENG |
| PF-48 | Menu visual (fotográfico) de categorias | PARCIAL | Cabeçalho só com links de texto | `src/components/Layout.tsx:154-158,191-197` | MZ LK12 | ENG + mockup |
| PF-49 | Landings `/ideias/*` descobríveis | PARCIAL | 4 páginas com SSR e no sitemap, mas nenhum link interno e nenhum e2e | `src/App.tsx:118`; `src/lib/ideaLandings.ts:16-42`; `api/sitemap.ts:34-37` | anexo 08 §1.3 | ENG |
| PF-50 | Vitrine da home e catálogo com diversidade global | PARCIAL | Home ordena só por flags; diversificação vale só na página corrente | `HomePage.tsx:105`; `catalog.ts:413` | MZ UX23, UX35 | ENG + DONO |
| PF-51 | Grupos de decisão (principal/alternativa), links persistentes revogáveis | PARCIAL | Atrás de flags (`VITE_QUOTE_DECISION_GROUPS_ENABLED`, `VITE_PERSISTENT_SHARED_SELECTIONS_ENABLED`); documentos dizem que estão ativas em produção (não verificado hoje); o selo "Referência principal" vaza na impressão com a flag desligada; flags não tipadas em `vite-env.d.ts` | `siteFeatureFlags.ts:5-7`; `QuotePage.tsx:420`; `src/vite-env.d.ts:3-16` | CA 064, 068 | ENG |
| PF-52 | Sincronização automática do carrinho entre dispositivos | BLOQUEADO (decisão de produto) | Hoje só por seleções salvas explícitas | `QuoteCartContext.tsx` sem sync remoto | MZ UX02, UX59 | DONO |
| PF-53 | Favoritos: e2e multi-aba, offline, promoção no limite de 100 | PARCIAL | Lógica com 24 testes do hook; sem e2e Playwright de favoritos; sem tratamento offline | 0 ocorrências de `favorit` em `e2e/`; 0 de `navigator.onLine` em `src/` | FE 014; P23:07,10; P24:11–12 | ENG |
| PF-54 | Feedback opcional de clareza; eventos das hipóteses Carnegie; indicadores e linha de base | NÃO INICIADO | Sem evento `feedback_`/`summary_edited`/`campaign_conflict`; sem baseline | `src/lib/analytics.ts:4-36` | CA 010, 090, 095 | ENG + DONO |
| PF-55 | Inventário de afirmações comerciais e limites de persuasão | NÃO INICIADO | "proposta real", "materiais de menor impacto", "curadoria humana", "recomendação sob medida" (PR #94) sem fonte/dono | `HomePage.tsx:211,220`; `campaignPresets.ts:50`; `CatalogPage.tsx:30` | CA 007, 009 | DONO |
| PF-56 | Registro rastreável de aprovação visual (página × viewport × versão) | NÃO INICIADO | Bloqueia as 24 etapas Carnegie que exigem mockup; aprovações citadas nas PRs #91, #92 e #94 não estão no repositório | `AGENTS.md`; nenhum mockup versionado após 09/09 | CA 020, 094 | DONO + ENG |

### 2.7 Conteúdo, marca e SEO

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-57 | Catálogos PDF e revistas reais na biblioteca | BLOQUEADO | Localizar arquivos aprovados e direitos; 0 `.pdf` em `public/` | `catalogLibrary.ts:42-146` | MZ UX84; FE 054–055; P13:49 | CONTEÚDO |
| PF-58 | Três cases verificáveis, prova social, bastidores, fotos de produção, hero fotográfico próprio | BLOQUEADO | Acervo e autorizações de imagem | `public/images` só com hero ilustrado e placeholder | MZ UX26, UX28, LK03, LK06, LK31–LK34; FE 051–053, 056–057; CA 028 | CONTEÚDO |
| PF-59 | Domínio oficial (apex + www) | BLOQUEADO | Canonical, sitemap e robots em `promo-brindes-v1.vercel.app`; `allowedSiteOrigins()` aceita uma só origem; CSP precisa acompanhar | `public/robots.txt`; `src/components/Seo.tsx:35`; `api/_lib/siteOrigin.ts:2-17`; `vercel.json:83` | MZ UX97, LK48; UXA F08 | DONO |
| PF-60 | Imagem social por coleção e data | PARCIAL | Imagem única (WebP) para todas as páginas curadas | `api/site-page.ts:18,86,96` | MZ UX58; FE 070 | ENG + mockup |
| PF-61 | Governança editorial real das coleções | DIVERGÊNCIA | Um único `commonGovernance` (dono genérico, revisado em 22/09) aplicado às 10 coleções; teste unitário vai quebrar em 22/09/2027 | `shared/catalogEditorial.ts:14-20,77-90` | MZ UX83, LK15 (marcadas I), LK36 | CONTEÚDO |
| PF-62 | Guia de voz atualizado e aplicado | PARCIAL | "Gift Lovers by Promo" fora do guia; CTA "Solicitar orçamento" no guia × "Enviar briefing" no botão; nomes de campo divergentes; "radar" usado em ações ("Explorar o radar", "Afinar o radar", "Radar completo"), o que o guia reserva a títulos; template de PR sem item de voz | `docs/GUIA_DE_VOZ.md:12,17`; `QuotePage.tsx:445,459`; `QuoteDrawer.tsx:212`; `CustomerAccountPage.tsx:93`; `CatalogPage.tsx:53`; `Layout.tsx:214` | MZ UX12, UX13; CA 011–012; FE 058 | DONO + ENG |
| PF-63 | Corpus julgado de relevância de busca (≥30 intenções, por SKU) | BLOQUEADO + NÃO INICIADO | Hoje 20 julgamentos por conceito, sem produto nem métrica | `src/lib/searchRelevance.ts:16-45` | MZ UX32, UX34, LK20; FE 041–042; P23:14 | DONO + ENG |
| PF-64 | Página de projeto especial | BLOQUEADO | Confirmação comercial do serviço | sem rota em `src/App.tsx:110-127` | MZ LK40 | DONO |
| PF-65 | Redes, horário e canal de atendimento oficiais confirmados | PARCIAL-VALIDAÇÃO | Sem horário de atendimento no site | `Layout.tsx:23-26,230-231` | MZ UX30; FE 059 | DONO |

### 2.8 Segurança e governança do repositório

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-66 | Secret scanning + push protection (repositório **público**) | NÃO INICIADO | Ativar em Settings (gratuito) | API GitHub 11/10: `security_and_analysis.*` = disabled | WF 33; FE 008; GR42 | ENG |
| PF-67 | Dependabot security updates; `allowed_actions: selected`; SHA pinning obrigatório | NÃO INICIADO | Settings → Actions/Code security | API: `allowed_actions: all`, `sha_pinning_required: false`, auto security fixes off | WF 31, 32, 34; FE 008 | ENG |
| PF-68 | Segredos por Environment, `environment:` nos jobs, política de branches | NÃO INICIADO | Secrets estão no nível do repositório; Environments sem regras | API: `Production` com 0 secrets, `deployment_branch_policy: null`; nenhum `environment:` em `.github/workflows/` | WF 38, 39, 84; FE 009 | ENG |
| PF-69 | Revisão legítima de PR (segundo revisor) | BLOQUEADO | CODEOWNERS = `* @adm01-debug`; PRs #82 e #83 mergeados em 01/10 **sem nenhuma review APPROVED** (só comentários de bots e do dono) — conferir audit log | `.github/CODEOWNERS:3`; API reviews #82 | WF 74; FE 006; P23:04 | DONO |
| PF-70 | Ruleset, `strict`, `delete_branch_on_merge`, `allow_update_branch`, histórico linear, CodeQL e dependency review obrigatórios | NÃO INICIADO | `rulesets: []`; `strict: false` (o runbook diz o contrário) | API proteção `main`; `RUNBOOK_RELEASE.md:9-10` | WF 75–79; FE 007 | ENG |
| PF-71 | Conta de serviço Supabase no lugar do PAT pessoal | BLOQUEADO | O release executa SQL via Management API com PAT pessoal com acesso a todos os projetos | `release.yml:79-92` | WF 40 | DONO |
| PF-72 | Rotação de segredos executada | NÃO INICIADO | Issue #80 (Q4/2026) aberta desde 01/10 sem ação; lembrete e runbook cobrem conjuntos diferentes; runbook diz que trocar `CRON_SECRET` não exige redeploy (provavelmente falso na Vercel) | `secrets-rotation-reminder.yml:28-44`; `RUNBOOK_ROTACAO_SEGREDOS.md:17-40` | WF 41; FE 090; P16:29 | ENG + DONO |
| PF-73 | Privilégio mínimo: cutover `SITE_SUPABASE_SERVICE_JWT` + credencial mínima de Storage + renovação do JWT | BLOQUEADO (adiado) + PARCIAL | Storage ainda exige `service_role`; JWT expira em 30 dias sem renovação nem alerta | `api/_lib/siteDatabase.ts:56-88`; `RUNBOOK_SITE_API_CUTOVER.md` | FE 024; P16:25; P23:39 | DONO + ENG |
| PF-74 | Endurecimento de workflows: `harden-runner`, `zizmor`, `persist-credentials:false` em todos, `permissions` por job, SBOM, `npm audit signatures` bloqueante | NÃO INICIADO / PARCIAL | Detalhe no anexo 04 | `workflows-lint.yml:21-37`; `stale-branches.yml:22-25`; `quality.yml:40-41` | WF 35, 36, 43, 44, 48, 49; FE 080–081, 086 | ENG |
| PF-75 | Verificação de configuração do banco no boot | NÃO INICIADO (código morto) | `assertSafeSiteDatabaseConfiguration()` nunca é chamada | `api/_lib/siteDatabase.ts:264-267` | anexo 08 §1.3 | ENG |
| PF-76 | Banco principal: revogar `mcp_kv_get` (SECURITY DEFINER executável por `authenticated`, com literal de segredo) | BLOQUEADO (Promo Gifts, fora do escopo) | Item de **maior severidade** sem recibo de aplicação | `docs/sql/canonical-principal/URGENTE_revogar_mcp_kv_get.sql` | P17:39; AUD A01 | DONO (repo interno) |

### 2.9 Banco de dados e contratos

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-77 | Fluxo versionado de aplicação de migrations, com recibo | NÃO INICIADO | Nenhum workflow aplica migrations; `20261001130320` e `20261006134751` chegaram ao remoto sem registro de quem/quando | `database.yml` (só local); `release.yml:77-106` (só lê o ledger) | FE 021, 092; WF 90 | ENG + DONO |
| PF-78 | Diff integral de schema/ACL remoto e Security Advisor recorrente | PARCIAL / NÃO INICIADO | Só ACL dos favoritos foi tratada; `db lint` só local | `20260927103000_harden_occasion_favorites_rpc_acl.sql:6-10`; `database.yml:48` | P16:31, P16:48; P23:36; P24:20 | ENG |
| PF-79 | API usando os tipos gerados; inventário de contratos JSON | PARCIAL | 42 RPCs tipadas, mas retornos `Json` e `api/` não importa os tipos | 0 ocorrências de `site-database.types` em `api/` | FE 023; P16:21; P17:23; P23:21; P24:19 | ENG |
| PF-80 | Contratos documentados coerentes | DIVERGÊNCIA | `purge_site_admin_audit_log` (real: `…_logs`), `get_site_storage_retention_candidates` (não existe), função legada descrita como usada, 400 × 500 nos webhooks, `SITE_SUPABASE_SETUP.md` ("18 versões", "security invoker"), portal "sem policy em `storage.objects`" | `DATABASE_FUNCTION_CONTRACTS.md:42,49,50,65`; `SITE_SUPABASE_SETUP.md:28,116`; `CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md:58` | anexo 07 §4 | ENG |
| PF-81 | Remover função legada e testar a vigente | DIVERGÊNCIA | `finalize_briefing_asset_retention` ainda com GRANT e é a testada; `finalize_site_storage_retention` (usada pelo cron) sem pgTAP | `20260922150000:259,327`; `tests/database/briefing_assets.test.sql:169-172` | anexo 07 §6 | ENG |
| PF-82 | pgTAP de políticas de Storage com `authenticated` cruzado, captura real de DDL, estouro de rate limit de seleção compartilhada | NÃO INICIADO | Testes só contam policies como `postgres` | `briefing_assets.test.sql:33-35,109-111`; `admin_write_audit.test.sql:75` | anexo 07 §6 | ENG |
| PF-83 | Remover o recuo "temporário" para a view legada `v_products_public` (fase B) | BLOQUEADO (canônico) | Recuo ativo em 3 pontos; `variant_id` tratado mas nunca exposto (código morto que gera 422) | `src/lib/catalog.ts:52,326-336`; `api/sitemap.ts:146-148`; `api/_lib/catalogValidation.ts:38-39,114-115` | AUD A-022; P16:46 | DONO (Promo Gifts) |
| PF-84 | Preferências do cliente (prometidas no nome da migration) | NÃO INICIADO | `20260910130000_customer_adjustments_and_preferences` só cria ajustes | `20260910130000:5-112` | anexo 07 §1 | ENG/DONO |
| PF-85 | Retenção com drenagem | PARCIAL | Lote fixo de 100 por dia com timeout único de 10 s | `api/retention.ts:7-8,119-170` | anexo 04 §6 | ENG |

### 2.10 Operação, recuperação e observabilidade

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-86 | Restore medido (RPO/RTO), PITR e backup do Storage | BLOQUEADO | Nunca ensaiado; Storage (PDFs/anexos) sem cópia; destino descartável e custo | `RUNBOOK_RESTORE_SITE.md:3,7,10,14` | MZ UX98; FE 029; P16:39; P23:38; P24:23 | DONO |
| PF-87 | Vigia independente dos crons (heartbeat/`lastRunAt`) | NÃO INICIADO | 0 ocorrências de `heartbeat`/`lastRunAt` | `vercel.json:6-9` | FE 030; P13:27; P16:34; P17:30; P24:24 | ENG |
| PF-88 | Alertas operacionais funcionando | BLOQUEADO + PARCIAL | `OPERATIONS_ALERT_WEBHOOK_URL` ausente; payload genérico que Slack/PagerDuty recusam (precisa relay, ex.: N8N); sem alerta para falha de webhook, de recebimento de orçamento ou rate limit | `api/_lib/operationalAlerts.ts:5-32` | WF 71; P13:41; P16:42 | DONO + ENG |
| PF-89 | Preview isolado com banco próprio | BLOQUEADO (custo) | Sem `preview.yml`, sem branch Supabase, Git integration desligada | `vercel.json:3-5`; `RUNBOOK_PREVIEW_ISOLADO.md:16-18` | FE 028, 088; WF 86–88; P13:46 | DONO |
| PF-90 | Revisão mensal do banco executada | NÃO INICIADO | Nunca rodou em produção; query com coluna duplicada | `RUNBOOK_REVISAO_MENSAL_BANCO.md:51,72` | FE 027; P16:18 | ENG |
| PF-91 | Runbooks atualizados e revisados por pares | DIVERGÊNCIA | Release descreve rollback manual (o workflow já é automático); contagens de tabelas antigas (19/17 × 21 atuais); sem revisor nominal | `RUNBOOK_RELEASE.md:15-16,36-38`; `RUNBOOK_RESTORE_SITE.md:15`; `RUNBOOK_VERIFICACAO_DB.md` | WF 85; P16:49; P17:49 | ENG + PESSOAS |
| PF-92 | Funil de analytics homologado, coletor de erros e CWV de campo (p75) | PARCIAL-VALIDAÇÃO | Coleta instalada (Vercel Analytics/Speed Insights); recepção e baseline não registradas; `frontend_error` fora do contrato tipado; sem eventos de contato, upload, seleção salva, landing, login | `src/App.tsx:103-104`; `src/lib/clientObservability.ts:12-15`; `ConversationForm.tsx:70-78` | MZ UX92, UX93, LK47, LK49; FE 066–069; P13:37, P13:42 | ENG |
| PF-93 | Ensaio do rollback automático | NÃO INICIADO | O passo de rollback nunca foi exercitado | `release.yml:262-292` | FE 097; WF 07 | ENG |
| PF-94 | Soak test representativo da fila | PARCIAL | Só local, com polling de 3 s; ignora o cron de 15 min | `scripts/soak-test-notification-queue.mjs:23,26,30` | P16:38 | ENG |

### 2.11 CI/CD — custo e confiabilidade

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-95 | Pipeline sem duplicação | NÃO INICIADO | `validate` roda Vitest 2× e build 3×; sem cache de browsers Playwright; composite `setup-node-project` existe e ninguém usa; PRs só de docs rodam tudo | `quality.yml:46-67`; `.github/actions/setup-node-project/action.yml` | WF 24, 26, 27, 51, 55, 56; FE 083–084 | ENG |
| PF-96 | Release orientado a evento e robusto | PARCIAL | Polling 90×20 s em vez de `workflow_run`; ordenação de check-runs sem filtro de app nem paginação; sem `LC_ALL=C`; sem backoff; sem timeouts por passo; sem issue automática "release quebrado" | `release.yml:3-6,54-76,85-105` | WF 12–16, 65–66, 72; FE 082 | ENG |
| PF-97 | Relatórios de CI acionáveis, SLO e métricas | PARCIAL | Summary repete `${{ job.status }}`; sem p50/p95, delta de cobertura nem SLO | `quality.yml:78-81`; `ci-health.yml` | WF 67–70, 99; FE 087 | ENG |
| PF-98 | Ferramentas locais equivalentes ao CI | NÃO INICIADO | `npm run ci:local`, `.npmrc` com `engine-strict`, Lighthouse CI, política de majors (ESLint 10/TS 7) e `ignore` no Dependabot | `package.json:11-66` | WF 53, 95; FE 068, 078–079; P17:07–08; P24:46 | ENG |
| PF-99 | Tags de release | NÃO INICIADO | Só tags `backup/recovered-*` | `git ls-remote --tags origin` | P16:50; P24:50 | ENG |

### 2.12 Testes

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-100 | E2E das jornadas ainda descobertas | NÃO INICIADO | 12 jornadas sem e2e: landings `/ideias`; troca de senha e "esqueci a senha"; criação de conta e login real; envio do contato via API; upload/remoção de anexos; pedido de ajuste; revogação de link; arquivar/restaurar/excluir seleção; 404 genérico; fallback `mailto:`; flags desligadas; `/sobre` e `/privacidade` | `e2e/smoke.spec.ts` (56) e `e2e/product-detail.spec.ts` (8) | anexo 08 §1.6; FE 077 | ENG |
| PF-101 | E2E com configuração realista | PARCIAL | Build do e2e liga todas as flags e simula todas as APIs; funções Vercel nunca rodam em e2e | `playwright.config.ts:20-26`; `e2e/smoke.spec.ts:52-73` | anexo 08 §1.6 | ENG |
| PF-102 | Jornada anônima ponta a ponta única (home → briefing → catálogo → produto → seleção → orçamento → confirmação) com rede lenta e storage bloqueado | PARCIAL | Hoje e2e por trechos | `e2e/smoke.spec.ts` | CA 092 | ENG |
| PF-103 | Matriz requisito/risco → camada de teste; cenários adversos (token expira durante upload; duas máquinas editam campanha) | NÃO INICIADO | — | — | FE 076–077 | ENG |
| PF-104 | Acessibilidade manual e dispositivos físicos | BLOQUEADO | Leitor de tela, zoom 200/400%, iOS/Android reais | só axe automatizado | MZ UX94, UX95, LK46; FE 063–064; CA 093 | PESSOAS |
| PF-105 | Pesquisa com compradores reais | BLOQUEADO | Roteiro, recrutamento (5–8), consentimento | nenhum artefato de pesquisa em `docs/` | MZ UX11, UX20, UX21, UX54, UX64, UX91, LK02, LK05, LK09, LK42; FE 061–062; CA 006, 097 | PESSOAS |

### 2.13 Graphify (mapa de código)

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-106 | Graphify reproduzível em clone limpo | PARCIAL | Todos os `graph:*` quebram sem `node_modules` (inclusive `status`); `doctor` não checa Python/`tree_sitter_sql`; docs sem passo de instalação; `requirements-graphify.txt` sem hashes e cita `.in` inexistente | `scripts/graphify-quality.mjs:3`; `scripts/graphify.mjs:754-766`; `requirements-graphify.txt:1-5` | GR06, GR11, GR38 | ENG |
| PF-107 | Conhecimento técnico no grafo: passe documental, passe semântico, impacto → testes, fronteiras dos bancos, memória técnica | NÃO INICIADO | GR25, GR31, GR32, GR34, GR37 sem código | `.graphify.project.json:9-31` (`code-only`) | GR25, GR31–GR37; FE 072; P23:41 | ENG |
| PF-108 | Qualidade do grafo | PARCIAL | `.graphifyignore` não é lido pela automação; scanner não cobre `sb_secret_`, `re_`, `whsec_` nem JWT; benchmark cobre 3 de 9 temas e mede só acerto; sem filtro `paths:`; comunidades sem nome | `scripts/graphify.mjs:51-60,143-158,445,580-588`; `graphify.yml:3-6` | GR03, GR09, GR18, GR40, GR42–GR44 | ENG |

### 2.14 Governança documental (ledger e planos)

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-109 | Matriz de 230 requisitos reconciliada com o código | NÃO INICIADO | Congelada desde 22/09; LK10, UX35, UX49, UX88 já resolvidas; LK44 errada; UX83/LK15 otimistas; 13 divergências GR; `MATRIZ_INDEX.md` chama 118/100/1/11 de "vigente" | `git log -- docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv` → `dafd3d9` | FE 002–003, 099; P13:50; P17:48; P23:02; P24:02 | ENG |
| PF-110 | Planos novos mapeados (Carnegie, UX_AUDIT, workflows, fechamento) e donos nomeados | NÃO INICIADO | Validador aceita só os 230 IDs; nenhuma etapa tem dono nomeado | `scripts/validate-closure-ledger.mjs:35-42`; `GOVERNANCA_FECHAMENTO.md` | FE 002, 004; WF 97 | DONO + ENG |
| PF-111 | Planos sem contradições internas | DIVERGÊNCIA | Checklists `[ ]` em etapas implementadas (P16); P13 linha 100 diz `noUncheckedIndexedAccess` revertida (está ativa); P17 linha 500 "Fase 3 integralmente fechada" com etapa 19 aberta; `vite.config.ts:51` cita 72 e2e (são 64); cabeçalhos de `PLANO_100.md:5` e `plano-50-etapas.html:1055` dizem "nenhuma etapa executada" (17/22 e 32/50 estão no código) | arquivos citados | AUD A12 | ENG |
| PF-112 | Remover código morto / abandonado | NÃO INICIADO | `catalogConfig` (`src/lib/catalog.ts:501-505`), `siteAuthConfigured` (`src/lib/siteSupabase.ts:20`), `validateQuoteBriefing` e `hydrateSharedSelection` (só testes), `scripts/sql/verify-shared-selection-contract.sql`, `public/brand/promo-brindes-logo-v1-360.webp`, variáveis GitHub `VERCEL_PROJECT_ID`/`VERCEL_SCOPE` não lidas, `CATALOG_SUPABASE_PUBLISHABLE_KEY` não documentada | arquivos citados | anexo 08 §1.3; anexo 04 §4 | ENG |
| PF-113 | Páginas e CSS decompostos | PARCIAL (regrediu) | `QuotePage.tsx` 467 linhas (era 348); Home 370, Datas 350, Catálogos 303; `styles.css` com 6.783 linhas (213 KB, sem divisão por rota) | `wc -l` | P13:35, P13:48; P23:33; P24:43; plano-50 #35, #48 | ENG |

### 2.15 Recomendações de UX, benchmarks e pesquisa que ficaram fora da matriz

Itens prometidos em `PLANO_UX_100`, `FREESHOP_BENCHMARK`, `LUKKA_BENCHMARK`, `RELATORIO_EXPERIENCIA_MARKETING_GEN_Z`, `GEN_Z_RESEARCH`, `UX_STRATEGY`, `UX_AUDIT_REPORT`, `GUIA_DE_VOZ` e `CUSTOMER_PORTAL_IMPLEMENTATION` que não viraram linha da matriz ou que a matriz marca como implementados sem estar. Detalhe no [anexo 05](audits/pending-features-20261011/05-ux-benchmarks-pesquisa.md).

| ID | Funcionalidade planejada | Estado | O que falta | Evidência | Origens | Quem |
| --- | --- | --- | --- | --- | --- | --- |
| PF-114 | Produto inexistente com mensagem própria (≠ falha temporária) | DIVERGÊNCIA (matriz UX19 = I) | Produto que não existe mostra "O catálogo fez uma pausa." | `src/components/CatalogFeedback.tsx:25`; `ProductPage.tsx:133` | PLANO_UX UX19; Gen Z §23 | ENG |
| PF-115 | Selo "Em alta" só com dado real de uso | DIVERGÊNCIA | O rótulo vem da flag editorial `featured`, não de telemetria (contraria os guardrails dos benchmarks) | `src/lib/catalogFilters.ts:10`; `useCatalogPageState.ts:95` | Freeshop 5.5; Lukka LK17 | DONO + ENG |
| PF-116 | Textos auxiliares legíveis | PARCIAL (matriz UX14 = I) | 77 declarações `font-size` ≤ 0,69rem (9–11 px) | `src/styles.css:68,109,118,123,140,169…` | PLANO_UX UX14/UX24; Gen Z | ENG + mockup |
| PF-117 | Fundo limpo atrás da foto do card (F05) | PARCIAL (PR #88 aberta) | Padrão pontilhado segue em `main` | `src/styles.css:4457-4460`; `origin/fix/product-card-clean-image-background` | UXA F05 | DONO (aprovar e mesclar) |
| PF-118 | Privacidade cobrindo "Minhas datas" e "Minhas datas" acessível sem rolar a agenda | PARCIAL | Aviso não menciona favoritos de datas (locais e por conta); seção continua no fim da agenda | `src/pages/PrivacyPage.tsx:11-12`; `CommemorativeDatesPage.tsx:307,330-336` | PLANO_UX UX80, UX88; Gen Z; MZ AC29 | ENG + mockup |
| PF-119 | Descoberta (Freeshop): BreadcrumbList, histórico de busca recente no dispositivo, "recentemente vistos", landings `/datas/natal` e `/datas/dia-do-cliente`, ampliação automática quando o briefing dá zero resultado, SSR de conteúdo de categoria, `ItemList` no HTML inicial, segunda imagem no card, recomendações complementares por material/ocasião/kit | NÃO INICIADO / PARCIAL | Nenhuma ocorrência de `BreadcrumbList` nem de histórico/recentes; datas só via `?data=`; relacionados só por categoria | `src/App.tsx:110-127`; `api/site-page.ts:33-75`; `ProductPage.tsx:31-32`; `CommemorativeDatesPage.tsx:272-274` | Freeshop 5.1, 5.2, 5.3, 5.8, 5.9, P2 | ENG + mockup |
| PF-120 | Métricas prometidas sem evento | NÃO INICIADO | Remoção/limpeza da seleção, abertura de seleção compartilhada (retorno do compartilhamento), abandono por campo, tempo até a primeira seleção, abertura de WhatsApp, busca vazia distinguível de filtro vazio; dashboards de funil | `src/lib/analytics.ts:4-35` (sem `*_removed`, `shared_selection_opened`, `has_query`) | UX_STRATEGY 131–139; Freeshop §7; Lukka cenário WhatsApp | ENG |
| PF-121 | Comparação salva em bloco e compartilhável | NÃO INICIADO | Bandeja só oculta, limpa ou remove | `src/components/CatalogComparisonTray.tsx:30-41` | Gen Z 210–213 | ENG + mockup |
| PF-122 | Explicar no fluxo onde a seleção fica guardada (navegador × conta) | PARCIAL | Explicação só na privacidade e no botão de salvar na conta | `QuoteDrawer.tsx:201-208`; `SavedSelections.tsx:183` | Gen Z 91, 229; CA 065 | ENG |
| PF-123 | Acesso à conta: "Reenviar código" e "Usar outro e-mail" evidentes | PARCIAL | Reenvio só pelo mesmo botão | `src/pages/CustomerLoginPage.tsx:95-137` | PLANO_UX UX73; Gen Z 327 | ENG |
| PF-124 | Anexos do briefing visíveis no detalhe do orçamento (portal) | NÃO INICIADO | O detalhe mostra produtos, contato, prazo e contexto, mas não os anexos | `CustomerQuotePage.tsx:231-232` | PORTAL item 22 | ENG |
| PF-125 | Preferências e exclusão de dados dentro da conta | NÃO INICIADO | Conta sem seção de preferências; só runbook manual (ver PF-30) | `CustomerAccountPage.tsx:76-98` | PLANO_UX UX80; PORTAL extras | ENG |
| PF-126 | E-mail de contato dedicado (não a caixa `adm01`) e horário de atendimento | BLOQUEADO | Percepção de canal improvisado registrada na pesquisa | `src/pages/ContactPage.tsx:18-20`; `.env.example:15` | Gen Z 316–317; PLANO_UX UX30 | DONO |
| PF-127 | Hero fotográfico de equipe real | BLOQUEADO | Hero atual é imagem gerada | `public/images/hero-gen-z-v2*.webp` | GEN_Z_RESEARCH 129, 164; MZ LK06 | CONTEÚDO |

---

## 3. Decisões que só o dono pode tomar

| # | Decisão | Itens destravados | Recomendação técnica | Custo/risco |
| --- | --- | --- | --- | --- |
| D1 | **Para onde vai o lead** (CRM/canal interno) e quem responde | PF-01, PF-02, PF-05, PF-06, PF-16, PF-25 | Bitrix24 (já é o CRM central) recebendo via webhook no N8N existente, com aviso no WhatsApp interno pela Evolution (`wpp2`) | Sem custo novo de ferramenta; ~3–5 dias de engenharia |
| D2 | Ligar Resend e WhatsApp Cloud | PF-07, PF-08, PF-09, PF-14, PF-15 | Resend primeiro (domínio próprio), com corte de backlog (PF-11) antes; WhatsApp depois do template aprovado | Resend tem plano gratuito até ~3 mil e-mails/mês; Meta cobra por conversa |
| D3 | Domínio oficial | PF-59, PF-60 | Definir apex + www e apontar canonical/sitemap/CSP | Registro de domínio, se ainda não houver |
| D4 | Meta de recuperação (RPO/RTO) e PITR | PF-86 | RPO 24 h / RTO 4 h como ponto de partida; backup diário do Storage | PITR é add-on pago no Supabase |
| D5 | Segundo revisor de PR | PF-69, PF-70 | Um revisor técnico (pode ser terceirizado) ou aceitar formalmente revisão única | Pessoa |
| D6 | "Resumo" × "cópia integral" nas confirmações e texto do checkbox | PF-13, PF-15 | Resumo + protocolo; checkbox só aparece quando o WhatsApp estiver ligado | Nenhum |
| D7 | Ranking local × global ("Curadoria Promo") | PF-18, PF-40, PF-50 | Assumir local e explicar na tela, ou mover ranking para o servidor | Global exige trabalho no banco canônico |
| D8 | Preview isolado (banco de testes por PR) | PF-89 | Branch Supabase só quando houver segundo revisor | Custo mensal de branch |
| D9 | Conteúdo: PDFs, cases, fotos, bastidores, dados técnicos por família | PF-46, PF-57, PF-58, PF-61, PF-63, PF-64 | Indicar onde está o acervo e quem aprova | Tempo do marketing/comercial |
| D10 | Cutover do JWT `site_api` | PF-73 | Fazer depois da renovação automática do JWT existir | Baixo |
| D11 | Promo Gifts: `mcp_kv_get` e permissões legadas do catálogo | PF-76, PF-83 | Executar no repositório interno com urgência | Fora deste repositório |
| D12 | Pesquisa com compradores e acessibilidade manual | PF-104, PF-105 | 5–8 participantes; um roteiro único cobre UX, Lukka e Carnegie | Tempo de recrutamento |

---

## 4. Sequência recomendada

**Onda 0 — hoje, custo zero, sem decisão:** PF-66 e PF-67 (secret scanning, push protection, Dependabot security, SHA pinning), PF-70 parcial (`delete_branch_on_merge`, `allow_update_branch`, `strict`).

**Onda 1 — engenharia, sem depender de decisão (1–2 semanas):**
PF-10 (medir fila sem provedor) · PF-11 (corte de backlog) · PF-09 (webhook 4xx) · PF-27 (429) · PF-31 (apagamento completo) · PF-81/PF-82 (pgTAP) · PF-80 (contratos) · PF-87 (vigia dos crons) · PF-75 · PF-43/PF-44 (repetição e confirmações) · PF-19/PF-20/PF-21 (textos que enganam) · PF-49 (links para `/ideias`) · PF-114 (produto inexistente) · PF-120 (eventos de funil faltantes) · PF-123/PF-124 (conta e anexos no portal) · PF-95 (CI mais barato) · PF-106 (Graphify reproduzível) · PF-109 (reconciliar a matriz) · PF-112 (código morto).

**Onda 2 — após D1:** PF-01 → PF-03 → PF-04/PF-05 → PF-25 (ciclo comercial completo).

**Onda 3 — após D2/D6:** PF-07/PF-08 com PF-14/PF-15 ajustados.

**Onda 4 — com mockup aprovado (regra do `AGENTS.md`):** PF-37 a PF-41, PF-48, PF-60 (bloco "escuta" do Carnegie) · PF-116 a PF-119 e PF-121 (legibilidade, card, "Minhas datas", descoberta Freeshop, comparação). PF-117 já tem PR aberta (#88) aguardando aprovação.

**Contínuo, dependente de pessoas/conteúdo:** PF-57, PF-58, PF-63, PF-86, PF-104, PF-105.

---

## 5. Divergências entre documentação e código (o que os documentos dizem e não é verdade hoje)

| Documento | Afirma | Realidade | Evidência |
| --- | --- | --- | --- |
| `MATRIZ_FECHAMENTO_PLANOS_20260912.csv` LK44 | WhatsApp iniciado pelo visitante existe | Não existe link de WhatsApp | 0 ocorrências de `wa.me` |
| Matriz LK10 (único N) | Categorias seguem iconográficas | Categorias fotográficas entregues em 23/09 | `HomePage.tsx:60-93,313` |
| Matriz UX35, UX49, UX88 | Ranking/diversidade e favoritos por conta ausentes | Entregues | `catalogRanking.ts:37-137`; `customerOccasionFavorites.ts:31-39` |
| Matriz UX83, LK15 (I) | Governança editorial com responsável e revisão | Metadados sintéticos idênticos para as 10 coleções | `shared/catalogEditorial.ts:14-20` |
| Matriz UX19, UX12, UX14 (I) | 404 distinto, nomes funcionais, textos legíveis | Produto inexistente com mensagem de falha temporária; "radar" e "Em alta" em ações; 77 fontes ≤ 0,69rem | `CatalogFeedback.tsx:25`; `CatalogPage.tsx:53`; `src/styles.css` |
| Matriz GR (26 I) | — | 9 linhas I são parciais; 4 linhas P não foram iniciadas | anexo 08 §2.2 |
| `MATRIZ_INDEX.md` | 118/100/1/11 é a distribuição "vigente" | Não reflete 104 commits | `dafd3d9` |
| `EXECUCAO_PLANO_FECHAMENTO_20261001.md` | PRs #82/#83 "em revisão"; migration aplicada só "após revisão e merge pelo fluxo integrado" | Mergeados sem aprovação; aplicação remota sem fluxo versionado | API reviews; `release.yml` só lê o ledger |
| `RUNBOOK_RELEASE.md` | Proteção exige branch atualizada; rollback manual | `strict: false`; rollback automático | API; `release.yml:262-292` |
| `RUNBOOK_INCIDENTES.md` | Alerta de SLA da fila "já dispara" | Retorno 503 antes do cálculo; URL de alerta ausente | `api/notifications.ts:642-646` |
| `RUNBOOK_ROTACAO_SEGREDOS.md` | `CRON_SECRET` não precisa de redeploy | Variáveis da Vercel só valem em novo deploy | `api/notifications.ts:637-641` |
| `RUNBOOK_PEDIDO_TITULAR.md` | Apaga "inclusive notas e texto livre" | `request_metadata` e `kit_name_snapshot` ficam intactos | `20260923120000:290-301` |
| `DATABASE_FUNCTION_CONTRACTS.md` | Nomes e códigos HTTP (ver PF-80) | Divergem | anexo 07 §4 |
| `SITE_SUPABASE_SETUP.md` | 18 versões; RPCs só `security invoker` | 65 migrations; 42 RPCs, várias `security definer` | anexo 07 §4 |
| Comentário `QuotePage.tsx:357-364` | E-mail vai sem ação/prazo/verba | O e-mail inclui ação, verba e prazo | `api/notifications.ts:261-280` |
| `docs/GRAPHIFY.md:8` | `.graphifyignore` exclui arquivos | A automação não lê o arquivo | `scripts/graphify.mjs:143-158` |
| `vite.config.ts:51` | 72 testes e2e | 64 | `e2e/*.spec.ts` |

---

## 6. Itens já resolvidos depois dos planos (não reabrir)

Favoritos por conta e correções F24/F28 com 24 testes do hook · ranking por intenção e diversidade (`catalogRanking.ts`) · categorias fotográficas na home · preflight de rate limit antes do catálogo (`20261001130320`) · sonda diária do contrato público do catálogo (36 colunas, verde 02–11/10) · release candidato → smoke → promote → rollback · produção = `main` com detector de drift diário · Node 24 alinhado em repositório, CI e Vercel · idempotência do vínculo de anexos (`20261006134751`) · galeria e ficha de produto compactas (#91) · retenção diária executando (logs de 09, 10 e 11/10) · PDF recusado em anexos (falha fechada) · correções A04, A05, A07, A10, A11 da revisão independente.

---

## 7. Anexos

| Anexo | Conteúdo |
| --- | --- |
| [01 — Matriz de 230 requisitos](audits/pending-features-20261011/01-matriz-230-requisitos.md) | As 112 linhas não-I verificadas uma a uma; amostragem de 33 linhas I; divergências |
| [02 — Plano de fechamento 100](audits/pending-features-20261011/02-plano-fechamento-100.md) | As 100 etapas com classificação e evidência; riscos; itens que a execução diz feitos e o código não confirma |
| [03 — Plano Carnegie UX 100](audits/pending-features-20261011/03-plano-carnegie-ux-100.md) | As 100 etapas; etapas que exigem aprovação visual; conclusão por jornada; top 10 lacunas |
| [04 — Workflows, CI e operação](audits/pending-features-20261011/04-workflows-ci-operacao.md) | As 100 etapas de workflows; runbooks; integrações adiadas; variáveis de ambiente; crons |
| [05 — UX, benchmarks e pesquisa](audits/pending-features-20261011/05-ux-benchmarks-pesquisa.md) | Plano UX 100, Lukka, Freeshop, Gen Z, UX_AUDIT_REPORT, portal do cliente, `PLANO_100.md`, `plano-50-etapas.html` |
| [06 — Planos de correções](audits/pending-features-20261011/06-planos-correcoes-50.md) | 41 pendências deduplicadas dos 5 planos de 50 etapas; lista por plano; achados de revisores nunca corrigidos |
| [07 — Banco, API e dados](audits/pending-features-20261011/07-banco-api-dados.md) | Objetos SQL sem consumidor; endpoints; contratos; LGPD; pgTAP; pipeline de notificações |
| [08 — Código e Graphify](audits/pending-features-20261011/08-codigo-e-graphify.md) | Varredura linha a linha; flags; código morto; analytics; promessas; e2e; 50 etapas do Graphify |
