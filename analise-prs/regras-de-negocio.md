# Regras de Negócio — Promo Brindes V1

**Gerado em:** 2026-11-01
**SHA main referência:** b19311989efe273e47dd8949ef126225206ad208
**Fontes:** `AUDITORIA.md` (A-001..A-022), `docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md` (PF-01..PF-127), código `src/`, `api/`, `site-supabase/supabase/migrations/`

Legenda de status: **VIGENTE** = aplicada no código · **SUSPEITA** = código diverge do documento · **CONTRADITÓRIA** = documentos afirmam coisas opostas.

---

## 1. Catálogo

| ID | Regra | Fonte | Status |
|---|---|---|---|
| RN-CAT-01 | Catálogo público B2B sem checkout; só vitrine + solicitação de orçamento | AUDITORIA.md §1 | VIGENTE |
| RN-CAT-02 | Reconciliação de itens do orçamento contra catálogo canônico (`reconcileQuoteItems`) | `api/_lib/catalogValidation.ts:33-38,102-121` | VIGENTE |
| RN-CAT-03 | Cor sem `variantId` NÃO é reconciliada (swatches públicos sem ID interno) | `api/_lib/catalogValidation.ts:33-38` + AUDITORIA.md A-021 | VIGENTE |
| RN-CAT-04 | Ordenação "Curadoria Promo" aplicada no navegador só sobre a página carregada | `src/pages/CatalogPage.tsx:30,44,64` + PF-18 | SUSPEITA — texto promete curadoria humana inexistente |
| RN-CAT-05 | Descrição padrão "Personalize este produto…" exibida mesmo com `allowsPersonalization=false` | `src/components/ProductCard.tsx:43-49` + PF-19 | SUSPEITA |
| RN-CAT-06 | Faixa de público "Escala: 51–200 un." exibe pessoas como unidades | `src/lib/campaignPresets.ts:98` + PF-20 | SUSPEITA |
| RN-CAT-07 | Contrato público monitorado por sonda diária (36 colunas) | PR #83 `feat/catalog-contract-monitor` | VIGENTE |
| RN-CAT-08 | Recuo temporário para view legada `v_products_public` ativo em 3 pontos (fase B pendente) | `src/lib/catalog.ts:52,326-336` + PF-83 | VIGENTE |
| RN-CAT-09 | `variant_id` tratado no código mas nunca exposto → gera 422 (código morto) | `api/_lib/catalogValidation.ts:38-39,114-115` + PF-83 | SUSPEITA |
| RN-CAT-10 | Catálogo sem prazo máximo de leitura (skeleton infinito se conexão travar) | `src/lib/catalog.ts:276-310` + AUDITORIA.md A-011 | VIGENTE |
| RN-CAT-11 | Personalização por família limitada a `allows_personalization` + `min_quantity` | `src/lib/catalog.ts:58-92` + PF-46 | VIGENTE |

## 2. Orçamentos / Brindes

| ID | Regra | Fonte | Status |
|---|---|---|---|
| RN-ORC-01 | Orçamento anônimo permitido; conta opcional | `src/pages/QuotePage.tsx:369,372` + PF-28 | VIGENTE |
| RN-ORC-02 | Timeout de envio 15 s no cliente; pipeline servidor soma ~22 s (catálogo 5 s + persistência 10 s + confirmação 7 s) | `src/lib/http.ts:1` + `api/_lib/leadHandler.ts:105-117` + AUDITORIA.md A-019 | VIGENTE |
| RN-ORC-03 | Idempotência do envio (chave de idempotência; duplicata não cria 2 pedidos) | `api/_lib/leadHandler.ts` | VIGENTE |
| RN-ORC-04 | Timeout limpa timer antes de `response.json()` — trava no corpo não respeita limite | `src/lib/http.ts:87-90` + AUDITORIA.md A-006 | VIGENTE |
| RN-ORC-05 | Quantidade antiga ajustada ao novo mínimo sem aviso ao repetir orçamento | `src/lib/quoteItems.ts:173` + PF-43 | SUSPEITA |
| RN-ORC-06 | Cliente bloqueado após 3 ajustes pendentes (`too_many_pending_adjustments` permanente, pois nada muda status) | `20260923120000_audit_security_reliability_hardening.sql:202-205` + PF-04 | VIGENTE |
| RN-ORC-07 | Pedidos de ajuste atrás de flag `VITE_CUSTOMER_ADJUSTMENTS_ENABLED`, sem roteamento ao comercial | `src/lib/siteFeatureFlags.ts:6` + PF-25 | VIGENTE |
| RN-ORC-08 | Grupos de decisão (principal/alternativa) e links persistentes atrás de flags; selo "Referência principal" vaza na impressão com flag off | `siteFeatureFlags.ts:5-7` + PF-51 | SUSPEITA |
| RN-ORC-09 | Rascunho "fica salvo" mesmo com falha no `sessionStorage` (`saveQuoteDraft` retorna void) | `src/lib/quoteDraft.ts:52,62-83` + PF-21 | SUSPEITA |
| RN-ORC-10 | Formulário começa por dados pessoais; contexto do briefing só leitura no orçamento | `src/pages/QuotePage.tsx:434,439-446` + PF-41 | VIGENTE |
| RN-ORC-11 | Telefone obrigatório no orçamento, opcional no contato | `src/pages/QuotePage.tsx:442` vs `ConversationForm.tsx:110` + PF-42 | CONTRADITÓRIA — sem decisão do dono |
| RN-ORC-12 | Nenhum aviso ao time comercial quando chega orçamento/contato/ajuste (lead parado no banco) | PF-01 | VIGENTE (ausência) |
| RN-ORC-13 | Sem responsável, estados operacionais ou SLA por pedido | PF-02 | VIGENTE (ausência) |

## 3. Favoritos

| ID | Regra | Fonte | Status |
|---|---|---|---|
| RN-FAV-01 | Favoritos por conta (`customer_occasion_favorites`), 24 testes do hook | PRs #33 #35 #36 #44 #45 #47 | VIGENTE |
| RN-FAV-02 | Revisão reutilizada permite rollback de ação antiga (contador apagado no finally) | `src/lib/useOccasionFavorites.ts:211-218,230-233` + AUDITORIA.md A-003 | VIGENTE |
| RN-FAV-03 | Escritas paralelas podem divergir da última intenção (sem serialização nem revisão monotônica no SQL) | `src/lib/useOccasionFavorites.ts:215-217` + AUDITORIA.md A-004 | VIGENTE |
| RN-FAV-04 | Cache legado de outra conta promovido como anônimo (chave anônima = chave legada) | `src/lib/useOccasionFavorites.ts:36-42,125-151` + AUDITORIA.md A-007 | VIGENTE |
| RN-FAV-05 | Promoção de favoritos ressuscita data removida durante importação (origem anônima priorizada) | `src/lib/useOccasionFavorites.ts:144-151` + AUDITORIA.md A-010 | VIGENTE |
| RN-FAV-06 | Sem e2e multi-aba, sem offline, sem tratamento no limite de 100 | PF-53 | VIGENTE (ausência) |
| RN-FAV-07 | ACL das RPCs endurecida (`20260927103000_harden_occasion_favorites_rpc_acl.sql:6-10`); grants `service_role` divergem local/remoto | AUDITORIA.md A-016 | VIGENTE |

## 4. Autenticação / Conta / LGPD

| ID | Regra | Fonte | Status |
|---|---|---|---|
| RN-AUTH-01 | `get_my_quote_request` filtra `request.id` + `customer_user_id = auth.uid()`; spam excluído | AUDITORIA.md §2 | VIGENTE |
| RN-AUTH-02 | `claim_my_quote_requests` exige e-mail confirmado; só associa sem titular com e-mail correspondente | AUDITORIA.md §2 | VIGENTE |
| RN-AUTH-03 | Proposta via URL assinada de 60 s vinculada ao titular (`get_my_proposal_document`) | `api/customer-proposals.ts:121-125` | VIGENTE |
| RN-AUTH-04 | Rate limit de propostas/anexos estourado vira 404 em vez de 429 | `api/customer-proposals.ts:114` + PF-27 | SUSPEITA |
| RN-AUTH-05 | Atualização de senha sem bloqueio de submissão concorrente (sem pending/disabled/try-catch) | `src/pages/SetPasswordPage.tsx:15-24` + AUDITORIA.md A-009 | VIGENTE |
| RN-AUTH-06 | Paginação `?page=1.1` vira offset fracionário; `?page=999` sem reconciliação com total | `src/pages/CustomerAccountPage.tsx:24,37,75-77` + AUDITORIA.md A-008 | VIGENTE |
| RN-AUTH-07 | Dados/consentimento persistem após logout (`emailRemainsInForm`, `consentRemainsInForm`) — parcialmente corrigido | REVISAO_FECHAMENTO_20260912 R08 | SUSPEITA |
| RN-AUTH-08 | `customer_profiles.company` nunca escrito; sem RPC leitura/edição de perfil | PF-24 | VIGENTE (ausência) |
| RN-AUTH-09 | Apagamento `erase_customer_data` não limpa `request_metadata`, `kit_name_snapshot` nem entregas pendentes | `20260923120000:244,290-301` + PF-31 | VIGENTE |
| RN-AUTH-10 | Sem RPCs de acesso/exportação/correção/autoexclusão; Política promete o que não existe | `src/pages/PrivacyPage.tsx:12,16,17` + PF-17/PF-30 | CONTRADITÓRIA |
| RN-AUTH-11 | Auditoria só de escrita/DDL; sem auditoria de leitura (SELECT em PII) | `20260916210000_add_admin_write_audit.sql:15,92` + PF-34 | VIGENTE |

## 5. Notificações

| ID | Regra | Fonte | Status |
|---|---|---|---|
| RN-NOT-01 | Confirmação ao cliente desligada (Resend/WhatsApp adiados pelo dono); tela diz "registrada para envio" | `api/notifications.ts:588-593,642-646` + PF-07/PF-14 | VIGENTE |
| RN-NOT-02 | Cron `*/15` retorna 503 antes de `reportQueueHealth()` — ~96 execuções/dia sem log | `api/notifications.ts:642-646` + PF-10 | VIGENTE |
| RN-NOT-03 | Webhook com JSON válido mas estrutura errada derruba handler (500 em vez de 400) | `api/notification-events-resend.ts:60-67` + AUDITORIA.md A-012 | VIGENTE |
| RN-NOT-04 | Sem corte de idade/cancelamento: ao ligar provedores, backlog antigo + `spam` + `@erased.invalid` serão enviados | `20260923200000:80-110` + PF-11 | VIGENTE |
| RN-NOT-05 | Sem lista de supressão, sem reprocessamento `exhausted→pending`, sem purga de órfãos | PF-12 | VIGENTE (ausência) |
| RN-NOT-06 | Checkbox "cópia pelo WhatsApp" sempre visível; template envia só nome/protocolo/empresa (não é cópia) | `src/pages/QuotePage.tsx:457` + PF-15 | SUSPEITA |
| RN-NOT-07 | Sem vigia independente dos crons (heartbeat/lastRunAt); sem alertas (`OPERATIONS_ALERT_WEBHOOK_URL` ausente) | PF-87/PF-88 | VIGENTE (ausência) |

## 6. Finance / Operação

| ID | Regra | Fonte | Status |
|---|---|---|---|
| RN-FIN-01 | Sem ferramenta interna: status, triagem e proposta só via SQL manual | PF-03 | VIGENTE (ausência) |
| RN-FIN-02 | Retenção diária executando (logs 09–11/10); lote fixo 100/dia, timeout único 10 s | `api/retention.ts:7-8,119-170` + PF-85 | VIGENTE |
| RN-FIN-03 | Restore nunca ensaiado; sem RPO/RTO; Storage sem backup | PF-86 | VIGENTE (ausência) |
| RN-FIN-04 | Migrations aplicadas sem fluxo versionado nem recibo (release só lê o ledger) | `release.yml:77-106` + PF-77 | VIGENTE |
| RN-FIN-05 | Preço público consultável direto (`sale_price`, `supplier_id` via chave pública) apesar da view mínima | AUDITORIA.md A-022 | VIGENTE |
| RN-FIN-06 | Domínio oficial indefinido; canonical/sitemap/robots apontam `vercel.app` | PF-59 | VIGENTE |
