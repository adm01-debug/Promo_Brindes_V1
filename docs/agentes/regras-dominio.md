# Regras de domínio que o código não deixa óbvio — referência para agentes

Ler quando mexer em orçamento/lead, fila de notificação, webhook de provedor, seleção compartilhada ou
retenção de dado.

## O que o site é

Catálogo B2B + pedido de orçamento. **Não** exibe preço, **não** cobra e **não** cria pedido
(`README.md`). O visitante monta uma seleção, descreve o briefing e envia; o comercial responde fora do
site. Qualquer tela que sugira preço, carrinho ou checkout está fora do produto.

## Lead e orçamento

- Entrada: `api/quote-requests.ts` e `api/contact-requests.ts`, com a regra em `api/_lib/leadHandler.ts`.
- Rate limit de preflight no banco: migration `20261001130320_preflight_lead_rate_limit.sql`, teste
  `site-supabase/supabase/tests/database/lead_preflight_rate_limit.test.sql`.
- Protocolo e estados do orçamento são contrato de banco verificado por pgTAP (`quote_protocol`,
  `status_state_machine`, `admin_write_audit`); mudar o fluxo = mudar migration + pgTAP juntos.

## Fila de notificação (a parte que mais morde)

- Outbox no banco isolado: `notification_deliveries`, status `pending` · `processing` · `failed` ·
  `sent` · `cancelled`. Job em `processing` há mais de **10 minutos** volta a ser elegível (lease);
  backoff e política em `20260916110000_add_notification_queue_policy_lease_and_backoff.sql`.
- Consumidor: `api/notifications.ts`, chamado pelo cron da Vercel a cada 15 min (`vercel.json`).
  `BATCH_SIZE = 10`; `OVERALL_TIME_BUDGET_MS = 25_000` + `QUEUE_HEALTH_TIMEOUT_MS = 3_000` +
  alerta operacional precisam caber no `maxDuration: 30` declarado em `vercel.json` — isso é cobrado por
  `tests/api/maxDuration.test.ts`. **Mudar um dos números sem o outro quebra o teste de propósito.**
- Limite de **5 tentativas** antes de `exhausted` (`api/notifications.ts`); sinal de saúde da fila e
  alerta quando há job elegível velho. Calibração registrada em
  `docs/RELATORIO_SOAK_TEST_FILA_20260916.md`; concorrência em `npm run test:queue-concurrency`.
- As rotas de cron (`/api/notifications`, `/api/retention`) só respondem com
  `Authorization: Bearer $CRON_SECRET`, comparado em tempo constante e com **mínimo de 32 caracteres**
  (`api/notifications.ts`). Secret curto = rota recusando tudo.

## Webhooks de provedor

- E-mail: Resend (`api/notification-events-resend.ts`), assinatura Svix verificada com
  `RESEND_WEBHOOK_SECRET`.
- WhatsApp: Cloud API da Meta (`api/notification-events-whatsapp.ts`), `X-Hub-Signature-256` com
  `WHATSAPP_APP_SECRET` e handshake de verificação com `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- Toda verificação passa por `api/_lib/webhookSignature.ts` (HMAC-SHA256 + `timingSafeEqual`). Comparação
  de segredo fora desse módulo é regressão: o guard `npm run test:timing-safe-secrets` existe para isso.
- Evento de provedor atualiza o outbox só pelos estados permitidos (`sent`, `failed`, `cancelled`) —
  pgTAP `notification_provider_events` e `notification_delivery_status_machine`.

## Seleção compartilhada e retenção

- Link de seleção é **revogável** e expira (`20260911170000_add_revocable_shared_selections.sql`,
  `20260911180000_expand_shared_selection_retention.sql`); prioridade e integridade de anexo em
  `shared_selection_priorities` / `selection_asset_integrity`.
- Retenção: cron diário `/api/retention` às 03:00 UTC apaga dado vencido, incluindo arquivo no Storage
  (`20260911130000_add_site_data_retention.sql` e seguintes). Apagar dado por fora disso é item de
  "chame o dono".
- Direito de exclusão do cliente é contrato de banco (`customer_data_erasure`), não rotina manual.

## Catálogo

O site lê o catálogo canônico somente por view pública; nada de escrita, nada de cópia de tabela do
sistema interno. Detalhe e runbook: `docs/agentes/banco.md`.
