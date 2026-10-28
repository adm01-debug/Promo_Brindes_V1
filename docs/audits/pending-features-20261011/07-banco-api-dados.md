# G — Auditoria backend/dados: funcionalidades planejadas e não executadas ou parciais

Data: 11/10/2026 · Repositório: `/home/user/Promo_Brindes_V1` (HEAD `3f82233`) · Modo: **somente leitura** (nenhum arquivo do repositório alterado, nenhum commit, nenhum acesso a Supabase remoto, Vercel ou Promo Gifts).

## Método e limites

- Inventário estático de 65 migrations (`site-supabase/supabase/migrations`), 28 arquivos pgTAP (`site-supabase/supabase/tests/database`), `api/*.ts`, `api/_lib/*.ts`, `src/lib/*`, `src/types/site-database.types.ts`, docs de referência indicados e `docs/sql/`.
- Cruzamento por `grep` de cada função `public.*`/`site_private.*` criada nas migrations com `api/`, `src/`, `shared/`, `scripts/`, `tests/`, `e2e/` (separando consumo de produção de consumo só em teste).
- `npm run graph:status` falhou (`ERR_MODULE_NOT_FOUND: typescript` — sem `node_modules`); o Graphify **não** foi usado. Nada foi inferido do grafo.
- Estado remoto (ledger, ACL efetiva, envs Vercel) foi lido **apenas de documentos datados** (AUDITORIA.md 24/09, UX_AUDIT_REPORT.md 05/10, EXECUCAO_PLANO_FECHAMENTO 01/10). Não foi verificado ao vivo.
- Classificações: **NÃO INICIADO** (nada além do esquema/plano), **PARCIAL** (parte pronta, ciclo incompleto), **BLOQUEADO-EXTERNO** (depende de credencial, decisão do responsável ou do banco canônico/Promo Gifts), **DIVERGÊNCIA** (doc/contrato ≠ implementação).

## Resumo executivo

1. **Sem fila de encaminhamento comercial.** Orçamentos, contatos e pedidos de ajuste são gravados, mas ninguém da equipe é avisado. O esquema já previa `audience='commercial_team'` e `request_kind='contact'`, porém nada é enfileirado com esses valores (Etapas 031–035 do plano de fechamento, bloqueadas pela decisão sobre CRM).
2. **Pipeline de notificação ao cliente completo no código, mas inoperante em produção.** Não há `RESEND_*`/`WHATSAPP_*` em produção. O cron `/api/notifications` responde 503 a cada 15 min sem medir a saúde da fila, e o backlog cresce sem limite de idade. Quando os provedores forem ativados, todas as confirmações antigas serão enviadas de uma vez.
3. **Operação comercial sem ferramentas.** A publicação de propostas (`proposal_documents`), as mudanças de status (`status_transitions`) e o tratamento de ajustes dependem de SQL manual no Studio. Após 3 ajustes pendentes, o cliente fica **bloqueado para sempre** naquele orçamento, porque nada move o status para `resolved`/`closed`.
4. **LGPD parcial.** O apagamento existe só como SQL manual. Não há exportação/acesso, correção, exclusão de conta pelo próprio titular nem canal de pedido. `erase_customer_data` não limpa `request_metadata`, `kit_name_snapshot` nem as entregas pendentes. Eventos de provedor órfãos nunca são purgados.
5. **Contratos documentados com nomes inexistentes** (`purge_site_admin_audit_log`, `get_site_storage_retention_candidates`) e uma função legada órfã ainda com GRANT (`finalize_briefing_asset_retention`). O pgTAP testa a função legada, e a usada pelo cron (`finalize_site_storage_retention`) **não tem teste de banco**.
6. **Tipos gerados sincronizados** (42 RPCs públicas, 0 divergências de nome/assinatura). Porém 28 das 42 retornam `Json` (10 `boolean`, 3 `number`, 1 `string`), e `api/` não usa os tipos (`fetch` cru). A Etapa 023 continua parcial.

---

## 1. Objetos SQL criados sem consumidor (backend pronto, sem front/API)

Comando base do grep negativo: `grep -rn "<nome>" api src shared scripts --include=*.ts --include=*.tsx --include=*.mjs | grep -v -E "\.test\.|site-database\.types"`.

| Item | Classificação | O que falta | Evidência (arquivo:linha) |
|---|---|---|---|
| `public.erase_customer_data(text)` — apagamento LGPD | PARCIAL | Não há consumidor em `api/`/`src/` (grep → 0 resultados). Só roda manualmente via Studio como `service_role`. Faltam um endpoint/fluxo administrativo autenticado, o registro do pedido e o encadeamento com o cron. | `migrations/20260923120000_audit_security_reliability_hardening.sql:244`, GRANT `:609-610`; `docs/RUNBOOK_PEDIDO_TITULAR.md:1-5,20-22` |
| `public.finalize_briefing_asset_retention(text[],int)` | DIVERGÊNCIA (órfã) | Foi substituída por `finalize_site_storage_retention(jsonb,int)`, mas não foi dropada e ainda tem GRANT para `site_api`/`service_role`. Fere a convenção de versionamento (contracts:219-224). Grep → 0 resultados em `api/`. | `20260922150000_add_private_briefing_assets.sql:259`, GRANT `:327`; uso real `api/retention.ts:157-163` |
| `quote_request_events.event_type` = `'message'` e `'proposal_published'` | NÃO INICIADO | Nenhum trigger/RPC produz esses eventos. Não existem mensagens da equipe para o cliente nem evento de "proposta publicada". `grep -n "proposal_published\|'message'" migrations` encontra só o CHECK. | `20260909180000_create_customer_quote_portal.sql:30`; `20260910130000_customer_adjustments_and_preferences.sql:33` |
| `notification_deliveries.audience='commercial_team'` / `request_kind='contact'` | NÃO INICIADO | O enqueue só cria `quote`/`customer`, e o claim filtra exatamente isso. Não há aviso de lead à equipe nem confirmação de contato. Bloqueado pelas Etapas 031–033 (destino/CRM). | `20260908230000_create_site_lead_storage.sql:86,89`; `20260912170000_add_quote_notification_outbox.sql:12-34`; `20260923200000_enrich_quote_confirmation_contract.sql:54-55,82-83,98-99,143-146`; `docs/EXECUCAO_PLANO_FECHAMENTO_20261001.md:62` |
| `site_private.contact_requests` (+ `preferred_channel`) | PARCIAL | É persistido e retido por 24 meses, mas não tem consumidor: nenhuma notificação, painel ou exportação. "Fale conosco" fica só no banco. | `20260908230000:51-66`; `20260910120000_preserve_variant_and_contact_preference.sql:10-11` |
| `site_private.proposal_documents` + bucket `customer-proposals` | PARCIAL | A leitura está pronta (`get_my_quote_request`, `get_my_proposal_document`, `api/customer-proposals.ts`), mas **não há produtor**: nenhuma RPC/API publica PDF, versiona ou marca `superseded_at`. Hoje é INSERT/upload manual (`SITE_SUPABASE_SETUP.md:111`). | `20260909180000:41-68` |
| `quote_adjustment_requests.status` (`new→triaged→resolved→closed`) | PARCIAL | Nenhuma função muda o status. O limite de 3 pendentes (`new`/`triaged`) **bloqueia o cliente permanentemente** naquele orçamento. Também não há notificação à equipe. | `20260910130000:11`; limite `20260923120000:202-205`; RPC sem side-effect de notificação `:210-215` |
| Máquina de estados de `quote_requests`/`contact_requests` (`status_transitions`) | PARCIAL | Só é exercida por update administrativo direto. Não há RPC/painel para triagem. A linha do tempo do cliente (eventos `status_changed`) depende de SQL manual. | `20260916100000_add_quote_event_sequence_and_status_state_machine.sql:89-127,132-160` |
| `customer_profiles.company` / `display_name` | PARCIAL | `company` nunca é escrito. Não há RPC de leitura ou edição de perfil, embora a página de privacidade prometa correção de dados. | `20260909180000:15-23`; único INSERT `20260923120000:350-353`; `src/pages/PrivacyPage.tsx:17` |
| `notification_deliveries.status='cancelled'` e requeue `exhausted→pending` | PARCIAL | A API só finaliza `sent`/`failed`. Cancelar ou reprocessar exige update manual. | `api/notifications.ts:390`; `20260916220000_add_notification_delivery_status_machine.sql:44,48`; `docs/RUNBOOK_INCIDENTES.md:61-68` |
| `delivery_state`/`bounce_reason`/`complained_at` | PARCIAL | São gravados pelos webhooks, mas sem consumidor: não entram em `site_notification_queue_health`, não geram alerta e não há lista de supressão de e-mail devolvido ou com reclamação. | `20260916140000_add_provider_event_precedence.sql:69-88`; `20260915150000_add_notification_delivery_events.sql:16-22` |
| Migration `20260910130000_customer_adjustments_and_preferences` | NÃO INICIADO (parte "preferences") | O nome promete preferências, mas a migration só cria ajustes. Nenhum objeto de preferências do cliente existe. | `20260910130000:5-112` (DDL listada) |

Itens verificados que **não** são lacuna:
- `owns_my_briefing_asset_path`, `matches_my_briefing_asset_upload` e `can_delete_my_unverified_briefing_asset_path` são usados pelas policies de `storage.objects` (`20260922150000:333-353`, `20260922210000:315`, `20260922230000:54`).
- `rls_auto_enable` é um event trigger.
- `run_site_data_retention` foi dropada (`20260911150000:5`).
- Todas as funções `site_private.*` têm chamador (trigger ou outra função).

## 2. Chamadas a objetos inexistentes nas migrations / tipos

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| `public.v_site_products_public` (catálogo canônico `doufsxqlfjyuvxuezpln`) | BLOQUEADO-EXTERNO | Não está em nenhuma migration do site; há só um espelho em `docs/sql/canonical/`. O ledger do canônico registra o mesmo contrato como `20260908191530_site_products_public_contract_20260908` (`list_migrations`, leitura em 27/10); o espelho mantém a versão original (`20260908190000`) e o cabeçalho dele registra a versão do ledger. | `src/lib/catalog.ts:53`; `api/_lib/catalogValidation.ts:80`; `api/sitemap.ts:64-65`; `api/_lib/publicProductPage.ts:52-53`; `docs/DATABASE_PUBLIC_CONTRACT.md:27,62` |
| `public.v_products_public` (fallback legado) | BLOQUEADO-EXTERNO / PARCIAL | O recuo "temporário" em caso de 404 continua em 3 pontos. A fase B (revogar `anon` do legado) não foi iniciada, e a chave pública ainda lê `sale_price`/`supplier_*` (A-022). | `src/lib/catalog.ts:52,326-330`; `api/sitemap.ts:146-148`; `api/_lib/publicProductPage.ts:96`; `AUDITORIA.md:232-235`; `DATABASE_PUBLIC_CONTRACT.md:45-73` |
| `public.categories` (canônico) | BLOQUEADO-EXTERNO | Leitura direta de uma tabela do banco interno, fora da view mínima. Depende do GRANT `anon` legado. | `src/lib/catalog.ts:471,488` |
| `variant_id` em `color_swatches` | DIVERGÊNCIA (código morto) | A view canônica não expõe `variant_id`, mas `reconcileQuoteItems` e os links compartilhados (`v`) ainda tratam `variantId`. Um item com `variantId` sempre resulta em 422. | `docs/sql/canonical/20260908190000_...sql:62-77`; `api/_lib/catalogValidation.ts:38-39,114-115`; `api/_lib/sharedSelections.ts` (campo `v`) |
| `src/types/site-database.types.ts` × migrations | OK (sem divergência de nome/args) | As 42 funções públicas batem; só ficam de fora `rls_auto_enable` (event trigger) e `run_site_data_retention` (dropada). Args conferidos para as 22 RPCs chamadas pela API. | `package.json:46` (`db:site:types`); `.github/workflows/database.yml:49-56` (drift gate) |
| Contrato de **retorno** das RPCs | PARCIAL | 28 das 42 retornam `Json` (as outras 14 têm retorno escalar já tipado: 10 `boolean`, 3 `number`, 1 `string`). Para as que retornam `Json`, os parsers são manuais (`customerQuoteContract.ts`, `parseJobs`, `parseQueueHealth`, `parseProviderEventApplyResponse`). `api/` não importa os tipos gerados (`grep site-database.types api` → 0) e os nomes `p_*` não são checados em compilação. | `docs/EXECUCAO_PLANO_FECHAMENTO_20261001.md:28` (Etapa 023 "Parcial") |
| Migration `20261006134751_make_briefing_asset_attachment_idempotent` | PARCIAL (aplicação remota não evidenciada) | A última reconciliação documentada vai até 64 versões (`…20261001130320`). O front assume idempotência no retry de vínculo. | `UX_AUDIT_REPORT.md:301-305`; `src/pages/QuotePage.tsx:344,366` |

## 3. Endpoints `api/` dependentes de env/flag ou incompletos

Não há endpoint com 501, `not implemented` ou stub. Os bloqueios são 503 por configuração ausente.

| Endpoint | Classificação | Estado / o que falta para funcionar | Evidência |
|---|---|---|---|
| `GET /api/notifications` (cron */15) | BLOQUEADO-EXTERNO | Sem `RESEND_API_KEY`+`SITE_EMAIL_FROM` ou `WHATSAPP_ACCESS_TOKEN/PHONE_NUMBER_ID/QUOTE_TEMPLATE/GRAPH_API_VERSION`, retorna **503 antes de `reportQueueHealth`**: o backlog cresce sem sinal. Falta: liberação formal, domínio remetente verificado no Resend, template Meta aprovado (nome, protocolo, empresa), `OPERATIONS_ALERT_WEBHOOK_URL`, política de expiração/cancelamento do backlog antigo, homologação (Etapas 036–040). | `api/notifications.ts:376-385,642-646,689`; `AUDITORIA.md:269`; `docs/EXECUCAO_PLANO_FECHAMENTO_20261001.md:65` |
| `POST /api/notification-events-resend` | BLOQUEADO-EXTERNO | Sem `RESEND_WEBHOOK_SECRET`, retorna 503. Falta cadastrar o webhook Svix no Resend e o secret, e resolver eventos que chegam antes do aceite (ver §7). | `api/notification-events-resend.ts:58-59` |
| `GET/POST /api/notification-events-whatsapp` | BLOQUEADO-EXTERNO | Sem `WHATSAPP_WEBHOOK_VERIFY_TOKEN`/`WHATSAPP_APP_SECRET`, retorna 503 (a verificação GET em produção confirmada como 503 em `AUDITORIA.md:301`). Falta app Meta, assinatura e URL cadastrada. | `api/notification-events-whatsapp.ts:80,133` |
| `POST /api/customer-proposals` | PARCIAL | O código está pronto e assina a URL com `SITE_SUPABASE_SECRET_KEY` (presente). Não há produtor de propostas (§1). Quando o rate limit `proposal_download` estoura, a resposta é **404 `proposal_not_found`** em vez de 429. Exige a chave `service_role` mesmo após o cutover. | `api/customer-proposals.ts:114,121-124`; `20260927161243_harden_briefing_assets_and_audits.sql:167-168` |
| `GET /api/retention` (cron diário) | PARCIAL | `CRON_SECRET` e a secret key existem e o cron executa: logs de produção `site_retention_completed` em 09, 10 e 11/10 às 03:00 UTC (anexo 04 §6). Falta heartbeat independente que avise se ele parar. Alertas sem destino (`OPERATIONS_ALERT_WEBHOOK_URL` ausente). Um único timeout de 10 s cobre 7 RPCs + DELETEs de Storage. | `api/retention.ts:117-170`; logs Vercel de produção (anexo 04 §6); Etapa 030 (`PLANO_FECHAMENTO_100:283-290`) |
| `POST /api/briefing-assets` | PARCIAL | Depende da secret `service_role` para Storage. PDF fica em **quarentena permanente**: o saneamento de PDF/CDR previsto (Etapa 019) não foi iniciado. Rate limit estourado vira 404. | `api/briefing-assets.ts:79-81,115,128` |
| Cutover `SITE_SUPABASE_SERVICE_JWT` (role `site_api`) | PARCIAL / BLOQUEADO (decisão do usuário) | A role e os GRANTs existem, mas a variável está ausente em produção. Storage continua exigindo `sb_secret_` (não há credencial mínima de Storage). | `api/_lib/siteDatabase.ts:56-59`; `.env.example:40-46`; `AUDITORIA.md:241`; `REVISAO_INDEPENDENTE_PLANOS_20260922.md:150-170` |
| `POST /api/contact-requests` | PARCIAL | Persiste com rate limit e idempotência, mas não tem downstream (§1). | `api/contact-requests.ts`; `api/_lib/leadHandler.ts:125-138` |
| Flags `VITE_CUSTOMER_ADJUSTMENTS/QUOTE_DECISION_GROUPS/PERSISTENT_SHARED_SELECTIONS_ENABLED` | OK (ativas segundo doc) | O default é `false` (`.env.example:25-30`). Os nomes existem em produção, e a ativação está documentada. | `AUDITORIA.md:265`; `docs/EXECUCAO_UX_20260910.md:50-52` |
| `allowedSiteOrigins()` | PARCIAL | Aceita só uma origem (`SITE_PUBLIC_ORIGIN`). O domínio próprio (apex + www) exigirá várias origens e mudança na CSP. | `api/_lib/siteOrigin.ts:2-17`; `vercel.json:83`; `AUDIT_REPORT_20260908.md:52-54` |

## 4. Contratos documentados × implementação

| Item | Classificação | Divergência / correção necessária | Evidência |
|---|---|---|---|
| Nome `purge_site_admin_audit_log` | DIVERGÊNCIA | A função real é `purge_site_admin_audit_logs` (plural). | `docs/DATABASE_FUNCTION_CONTRACTS.md:49`; `20260923120000:88` |
| `get_site_storage_retention_candidates` | DIVERGÊNCIA | A função **não existe**; a real é `get_briefing_asset_retention_candidates`. | `DATABASE_FUNCTION_CONTRACTS.md:50`; `20260923120000:361` |
| `finalize_briefing_asset_retention` descrita como usada por `api/retention.ts` | DIVERGÊNCIA | O cron usa `finalize_site_storage_retention`. | `DATABASE_FUNCTION_CONTRACTS.md:65`; `api/retention.ts:157-163` |
| `invalid_notification_provider_event_input` → "400" | DIVERGÊNCIA | Os handlers retornam **500** (`apply_failed`), o que faz o provedor reentregar em loop um evento permanentemente inválido. | `DATABASE_FUNCTION_CONTRACTS.md:42`; `api/notification-events-resend.ts:111-116`; `api/notification-events-whatsapp.ts:120-125,158` |
| `invalid_notification_channel` → "500 + retry pelo cron" | DIVERGÊNCIA (leve) | O caminho imediato engole o erro como `pending`, e o cron nunca chama `claim_site_quote_notification`. | `DATABASE_FUNCTION_CONTRACTS.md:38`; `api/notifications.ts:602-612` |
| Apagamento: "objetos de Storage precisam ser removidos manualmente" | DIVERGÊNCIA (doc desatualizado) | Desde a migration de 23/09, os objetos são enfileirados em `storage_deletion_queue` e drenados pelo cron. | `DATABASE_FUNCTION_CONTRACTS.md:111-120`; `20260923120000:283-289`; `RUNBOOK_PEDIDO_TITULAR.md:40-45` |
| Runbook: "Anonimiza … inclusive notas e texto livre" | DIVERGÊNCIA | Não toca em `quote_requests.request_metadata` (`briefing.actionName`, `campaign.occasion.name`, `userAgent`, `origin`, `identifierHash`), `contact_requests.request_metadata`, `quote_items.kit_name_snapshot` (texto livre) nem nas `notification_deliveries` pendentes. Com provedores ativos, isso enviaria mensagem para `titular-…@erased.invalid`. | `RUNBOOK_PEDIDO_TITULAR.md:30`; `20260923120000:290-301` (sem `request_metadata`); `20260922160000_preserve_kit_composition.sql:7`; `api/_lib/siteDatabase.ts:226-238` |
| Decisão "token de seleção compartilhada" (premissa: "hoje só tem id/q/v") | DIVERGÊNCIA | O payload agora tem `c`, `d`, `k`, `kn` (nome de kit **livre**), `kq`, `ku`. A condição de reavaliação registrada já foi atingida. | `DATABASE_FUNCTION_CONTRACTS.md:152-168`; `api/_lib/sharedSelections.ts:9-19,70` |
| `SITE_SUPABASE_SETUP.md`: "únicos RPCs públicos usam security invoker … somente service_role"; "18 versões" | DIVERGÊNCIA | Hoje são 42 RPCs, várias `security definer` concedidas a `authenticated`/`site_api`, e 65 migrations. | `docs/SITE_SUPABASE_SETUP.md:28,116` |
| Portal: "nenhum cliente recebe política direta em `storage.objects`" | DIVERGÊNCIA | Existem 3 policies `customer_briefing_assets_*` para `authenticated`. | `docs/CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md:58`; `20260922150000:333-353`; `20260922230000:49-54` |
| Rate limit → HTTP 429 (catálogo de erros) | DIVERGÊNCIA | `proposal_download` e `briefing_asset_verification` estouram e viram 404/"não encontrado". | `api/customer-proposals.ts:114`; `api/briefing-assets.ts:128` |
| Privacidade: "geramos uma confirmação transacional por e-mail"; "Ao excluir a conta…"; direitos de acesso/correção | DIVERGÊNCIA (promessa sem operação) | Sem provedor em produção, a confirmação nunca sai (a UI diz "registrada para envio"). Não existe exclusão de conta pelo titular nem RPC de acesso/exportação/correção. | `src/pages/PrivacyPage.tsx:12,16,17`; `src/pages/QuotePage.tsx:365` |
| `DATABASE_PUBLIC_CONTRACT.md`: "recuo temporário" | PARCIAL | Ainda ativo. A fase B (endurecimento/revogação do legado) não foi iniciada. | `DATABASE_PUBLIC_CONTRACT.md:7,45-73` |

## 5. Recomendações de auditorias/relatórios não executadas

| Item (origem) | Classificação | O que falta | Evidência |
|---|---|---|---|
| P0 permissões legadas do canônico (`v_products_public`, `product_variants`, `v_variant_sale_prices_public`) — AUDIT_REPORT 08/09; A-022 | BLOQUEADO-EXTERNO | Inventário de consumidores, plano transacional `REVOKE` + smoke e aprovação do PO. Proibido alterar Promo Gifts nesta frente. | `AUDIT_REPORT_20260908.md:46-50`; `AUDITORIA.md:232-235`; `DATABASE_PUBLIC_CONTRACT.md:64-73` |
| SSOT da migration canônica | RESOLVIDO (27/10) | O ledger do canônico já registra o contrato como `20260908191530`. Não criar outra migration para a mesma view. O espelho e `DATABASE_PUBLIC_CONTRACT.md` já citam essa versão. A presença do arquivo no repositório Promo_Gifts_V4 não foi verificada (fora do escopo). | `AUDIT_REPORT_20260908.md:60-62`; `DATABASE_PUBLIC_CONTRACT.md:27,62` |
| SQL pendente do banco principal (`URGENTE_revogar_mcp_kv_get`, `pg_graphql`, policy `system_settings`, índices FK de kit) | BLOQUEADO-EXTERNO (status desconhecido) | Nenhum registro de aplicação. O `mcp_kv_get` está marcado como **URGENTE** (segredo hardcoded executável por `authenticated`). | `docs/sql/canonical-principal/*.sql:1-30`; `docs/RUNBOOK_BANCO_PRINCIPAL.md:32-33,76-78` |
| Provedores e-mail/WhatsApp — AUDIT_REPORT P1; IMPLEMENTATION_REPORT | BLOQUEADO-EXTERNO | Ver §3. | `AUDIT_REPORT_20260908.md:56-58`; `SITE_SUPABASE_IMPLEMENTATION_REPORT_20260908.md:131` |
| Privilégio mínimo `site_api` (Etapa 024; A "NÃO VERIFICADO") | PARCIAL | Cutover e credencial de Storage. | `AUDITORIA.md:241`; `EXECUCAO_PLANO_FECHAMENTO_20261001.md:29` |
| Backup/PITR e restore medido (Etapa 029) | NÃO INICIADO | O runbook existe, mas nenhum ensaio foi feito. Faltam RPO/RTO e cobertura de Storage/Auth. | `AUDITORIA.md:242`; `docs/RUNBOOK_RESTORE_SITE.md:7-8` |
| Detecção de silêncio dos crons/heartbeat (Etapa 030) | NÃO INICIADO | `grep heartbeat\|lastRunAt` → 0 resultados. O retaguarda `pg_cron` foi adiado. | `PLANO_FECHAMENTO_100_ETAPAS_20261001.md:283-290`; `DATABASE_FUNCTION_CONTRACTS.md:82-103` |
| Direitos do titular (acesso, correção, exportação, apagamento) — Etapa 020 | NÃO INICIADO (exceto apagamento manual) | Faltam RPC de exportação, correção de perfil, exclusão de conta pelo titular e canal/registro do pedido. | `PLANO_FECHAMENTO_100:201-207`; `PrivacyPage.tsx:17` |
| Retenção por tabela (Etapa 025) | PARCIAL | Ver lacunas de retenção abaixo. | ver abaixo |
| Auditoria de leitura (SELECT/PII) | NÃO INICIADO | Só há auditoria de escrita e DDL (`admin_audit_log`/`admin_ddl_log`, 400 dias). Nenhum pgaudit ou rastreio de leitura no Studio. | `20260916210000_add_admin_write_audit.sql:15,92`; `PLANO_FECHAMENTO_100:247` |
| Rate limit de borda (Vercel Firewall) | NÃO INICIADO (adiado formalmente) | Só existe a camada de banco. Sem teste de carga do rate limit. | `DATABASE_FUNCTION_CONTRACTS.md:192-212` |
| Criptografia de PII em repouso (pgsodium) | NÃO INICIADO (adiado) | Spike de design. | `DATABASE_FUNCTION_CONTRACTS.md:122-143` |
| Normalização de telefone E.164 | NÃO INICIADO (adiado) | Escolher biblioteca e definir país padrão. | `DATABASE_FUNCTION_CONTRACTS.md:170-190` |
| Saneamento integral de anexos/PDF (A-005, Etapa 019) | PARCIAL | Mitigado por quarentena total de PDF. Reencode de imagem e limites de dimensão/metadados não implementados. | `api/briefing-assets.ts:77-81`; `PLANO_FECHAMENTO_100:193-199` |
| Inventário de contratos JSON e política de depreciação (Etapa 023) | PARCIAL | Ver §2. | `EXECUCAO_PLANO_FECHAMENTO_20261001.md:28` |
| Carga/concorrência do portal (Etapa 026) | PARCIAL | Metas e ensaio representativo do portal e da paginação. | `EXECUCAO_PLANO_FECHAMENTO_20261001.md:30` |
| A-006, A-012, A-016, A-017, A-019, A-021 (AUDITORIA 24/09) | EXECUTADOS (verificado no código) | `siteDatabase.ts:188-202`; `notification-events-*.ts parsePayload`; migrations `20260927103000`, `20260927200000`; `src/lib/http.ts:3` (28 s) vs `leadHandler.ts:9` (24 s); `catalogValidation.ts:110-121` | — |

**Lacunas de retenção (LGPD):**
- `notification_provider_events` com `delivery_id NULL` (`delivery_not_found`) é inserido e **nunca purgado**. O próprio comentário registra que "nenhuma rotina apaga" (`20260916140000:56,64-66`; `20260920110000:7`). Se a conta Resend for compartilhada, todo e-mail alheio vira linha órfã permanente.
- Contas/perfis inativos (`auth.users`, `customer_profiles`), `customer_selections` não arquivadas e `customer_occasion_favorites` não têm prazo de retenção.
- `quote_requests` com status `spam` seguem os mesmos 24 meses dos pedidos legítimos.
- `request_metadata` (userAgent, origin, HMAC do IP) é mantido por 24 meses e não é afetado pelo apagamento.

## 6. pgTAP — funções e políticas sem teste

| Item | Classificação | O que falta | Evidência |
|---|---|---|---|
| `public.finalize_site_storage_retention(jsonb,int)` (usada pelo cron) | NÃO INICIADO | 0 referências em `tests/database`. O teste exercita a função **legada** `finalize_briefing_asset_retention`, e o teste da API usa `fetch` mockado. | `20260923120000:393`; `tests/database/briefing_assets.test.sql:169-172`; `tests/api/retention.test.ts:47,68` |
| Policies `customer_briefing_assets_*` em `storage.objects` | PARCIAL | Os testes só contam as policies e chamam as funções auxiliares como `postgres`. Não há `set role authenticated`/`anon` tentando SELECT/INSERT/DELETE cruzado entre titulares. | `briefing_assets.test.sql:33-35,109-111`; `grep "set local role" tests` → só `site_api`/`postgres` |
| `site_private.log_admin_ddl` (captura do event trigger) | PARCIAL | O teste insere direto em `admin_ddl_log` para validar a purga. A captura de DDL real não é testada. | `admin_write_audit.test.sql:75` |
| Estouro de rate limit de seleção compartilhada (`consume_shared_selection_action_limit` → `shared_selection_rate_limit_exceeded`) | PARCIAL | Só o consumo do bucket é testado; a exceção, não. | `selection_asset_integrity.test.sql:45-46`; `grep shared_selection_rate_limit_exceeded tests/database` → 0 |
| Exclusão de `spam`/titular apagado no claim da fila | NÃO INICIADO (sem implementação e sem teste) | O claim não filtra `request.status <> 'spam'` nem e-mail `@erased.invalid`. | `20260923200000:80-110` |
| Reconciliação de evento de provedor que chega antes do aceite | NÃO INICIADO | Só o retorno `delivery_not_found` é testado; não há re-vínculo. | `notification_provider_events.test.sql:185` |
| `erase_customer_data` × `request_metadata`/`kit_name_snapshot` | NÃO INICIADO | Sem teste e sem implementação (§4). | `customer_data_erasure.test.sql` (28 contratos, nenhum sobre metadata) |
| Fim de vida de `finalize_briefing_asset_retention` | DIVERGÊNCIA | O teste mantém viva uma função órfã. Deveria testar a substituta e verificar o DROP. | `briefing_assets.test.sql:170` |
| Triggers com cobertura apenas indireta (aceitável) | OK | `assign_quote_protocol`/`mod11` (`quote_protocol.test.sql`), `enforce_notification_delivery_lease_and_attempts` (`notification_delivery_status_machine.test.sql`), `erase_*_on_profile_change` (`briefing_assets.test.sql:178-185` e testes de seleções/favoritos), `quote_notification_payload` (`notification_outbox.test.sql:91-98`), `has_unsafe_display_controls` (`selection_asset_integrity.test.sql:20`). | — |

## 7. Fila de notificações / outbox — o pipeline está completo?

| Etapa do pipeline | Estado | Evidência |
|---|---|---|
| Enfileirar | **Existe só para cliente/orçamento.** Trigger `AFTER INSERT` em `quote_requests`: e-mail sempre, WhatsApp só com opt-in. | `20260912170000:12-38` |
| Reivindicar (lease, `SKIP LOCKED`, backoff, máx. 5 tentativas → `exhausted`) | Existe (cron + caminho imediato pós-envio). | `20260923200000:58-120`; `api/notifications.ts:588-626,655-687` |
| Enviar | Existe (Resend com `Idempotency-Key`; Meta template com intenção durável `whatsapp_dispatch_started`). **Bloqueado por credenciais em produção.** | `api/notifications.ts:292-374,437-499`; `AUDITORIA.md:269` |
| Marcar (aceite, finalização com lease, retry-after) | Existe. | `api/notifications.ts:390-435`; `20260914120000:231` |
| Eventos de entrega (webhooks delivered/bounced/complained) | Existe, mas **bloqueado** (secrets ausentes). | §3 |
| Saúde/alerta | Existe (`site_notification_queue_health` + `sendOperationalAlert`), mas **não roda** quando os provedores não estão configurados (503 antes) e não há destino de alerta. | `api/notifications.ts:549-581,642-646,689` |
| Housekeeping/retenção | Entregas são apagadas junto com o pedido (24 meses). Eventos órfãos nunca são apagados. | `20260911190000:51-61`; §5 |

**O que falta para o pipeline ficar completo:**

1. **Fila comercial** (`audience='commercial_team'`) para orçamento, contato e ajuste, com destino ou CRM decidido (Etapas 031–034).
2. **Notificações de ciclo de vida ao cliente:** mudança de status, proposta publicada (evento `proposal_published` nunca emitido), resposta a ajuste e confirmação de contato.
3. **Política de expiração do backlog.** Hoje não há corte por idade: ao ligar o Resend, todas as confirmações acumuladas desde o lançamento serão enviadas. Também é preciso cancelar entregas de pedidos `spam` ou de titulares apagados (o status `cancelled` existe, mas está inalcançável pela API).
4. **Medir a saúde da fila mesmo sem provedor** e configurar `OPERATIONS_ALERT_WEBHOOK_URL`. Hoje o 503 a cada 15 min não diz quanto backlog acumulou.
5. **Reconciliar webhooks antecipados.** Um evento `delivered`/`bounced` que chega antes de `record_site_notification_provider_acceptance` é salvo com `delivery_id NULL`, recebe 200 (o provedor não reentrega) e nunca é re-vinculado (`20260916140000:50-66`). Também falta purgar esses órfãos.
6. **Consumir o resultado das entregas.** Falta lista de supressão para bounce/complaint e exposição do `delivery_state` em alerta ou relatório.
7. **Ferramenta de reprocessamento** (`exhausted→pending`, revisão manual de `whatsapp_dispatch_started` incerto), em vez de SQL manual (`RUNBOOK_INCIDENTES.md:61-68,82-102`).
8. **Corrigir o tratamento de entrada inválida nos webhooks:** responder 4xx em vez de 500, para não entrar em loop de reentrega (§4).
9. **Retaguarda** `pg_cron`/heartbeat independente: adiado; Etapa 030 não iniciada.

---

### Comandos de grep negativo usados (reprodutíveis)

```bash
for f in erase_customer_data finalize_briefing_asset_retention run_site_data_retention; do
  grep -rln "$f" api src shared scripts --include=*.ts --include=*.tsx --include=*.mjs | grep -v -E '\.test\.|site-database\.types'
done                                  # → vazio para os três
grep -n "proposal_published\|'message'" site-supabase/supabase/migrations/*.sql   # → só CHECK constraints
grep -n "commercial_team" site-supabase/supabase/migrations/*.sql                 # → só CHECK (20260908230000:89)
grep -rn "site-database.types" api                                                # → vazio
grep -rn "finalize_site_storage_retention" site-supabase/supabase/tests           # → vazio
grep -rn -i "heartbeat\|lastRunAt" api src scripts site-supabase .github          # → vazio
```
