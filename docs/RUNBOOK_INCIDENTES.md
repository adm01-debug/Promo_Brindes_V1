# Runbooks de incidente (Etapa 49)

Índice dos runbooks já existentes + os dois cenários operacionais que faltavam
(fila travada, provedor de notificação fora do ar). Os demais cenários do plano
original já têm runbook dedicado:

- **Chave vazada / rotação de segredo** → `docs/RUNBOOK_ROTACAO_SEGREDOS.md`.
- **Pedido de apagamento do titular** → `docs/RUNBOOK_PEDIDO_TITULAR.md`.
- **Reconciliação do ledger de migrations** → `docs/RUNBOOK_RECONCILIACAO_LEDGER.md`.
- **Cutover para a role `site_api`** → `docs/RUNBOOK_SITE_API_CUTOVER.md`.
- **Verificação em 5 comandos do banco remoto** → `docs/RUNBOOK_VERIFICACAO_DB.md`.
- **Restore de backup** → não coberto (Etapa 39, requer infraestrutura de
  billing/org do Supabase fora do alcance desta sessão — ver
  `docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md`).

## Fila travada (jobs não saem de `pending`/`processing`)

**Sintoma**: `site_notification_queue_health()` mostra `eligibleCount` crescendo ou
`oldestEligibleAgeSeconds` acima do normal (referência: SLA da Etapa 42 abaixo).

1. Confirme que o cron da Vercel está rodando: painel da Vercel > Project > Cron Jobs,
   ou `github_api`/logs da função `/api/notifications`. Se não rodou no horário
   esperado, é um problema de infraestrutura da Vercel, não da fila — abra um ticket
   com a Vercel em paralelo aos passos abaixo.
2. Confirme que pelo menos um provedor está configurado
   (`RESEND_API_KEY`+`SITE_EMAIL_FROM`, ou os quatro `WHATSAPP_*`) — sem nenhum dos
   dois, `configuredChannels()` retorna vazio e o worker responde 503 sem processar
   nada (`api/notifications.ts`).
3. Rode manualmente como `service_role` (Studio > SQL Editor):
   ```sql
   select public.site_notification_queue_health();
   ```
   Compare `eligibleCount` (deveria estar drenando) com `exhaustedCount` (jobs que
   esgotaram as 5 tentativas — ver seção seguinte).
4. Se `eligibleCount` está alto mas não cai mesmo com o cron rodando, suspeite de um
   provedor retornando erro sistemático (ver seção "provedor fora do ar" abaixo) — os
   jobs voltam para `pending`/`failed` com backoff (Etapa 11), não ficam presos, mas se
   o provedor nunca aceita, o ciclo se repete indefinidamente até esgotar tentativas.
5. Para destravar manualmente um job específico sem esperar o próximo ciclo do cron,
   **não** faça `update` direto no status (a invariante da Etapa 9 e a máquina de
   estados da Etapa 8 existem para impedir isso) — em vez disso, invoque
   `/api/notifications` manualmente com o `CRON_SECRET` correto:
   ```bash
   curl -X GET https://promo-brindes-v1.vercel.app/api/notifications -H "Authorization: Bearer $CRON_SECRET"
   ```

## Provedor de notificação fora do ar (Resend ou WhatsApp Cloud API)

**Sintoma**: `notification_deliveries.status = 'failed'` acumulando para um canal
específico, com `last_error_code` consistente entre as linhas.

1. Confirme o status do provedor: [status.resend.com](https://status.resend.com) para
   e-mail, ou o painel de Meta for Developers para WhatsApp Cloud API.
2. Se o provedor está de fato fora: nada a fazer no banco — o backoff exponencial com
   jitter (Etapa 11, `site_private.next_retry_at`) já espaça as tentativas
   automaticamente (60s, 120s, 240s... até o teto de 1h) e o job só vai para
   `exhausted` depois de 5 tentativas. Se o provedor volta antes disso, o job se
   recupera sozinho no próximo ciclo do cron.
3. Se o provedor caiu por mais tempo que o suficiente para esgotar as 5 tentativas
   (jobs em `exhausted`), depois que o provedor voltar:
   ```sql
   update site_private.notification_deliveries
   set status = 'pending', attempts = 0, next_attempt_at = now()
   where status = 'exhausted' and channel = 'email' -- ou 'whatsapp'
     and updated_at > now() - interval '2 hours'; -- só o lote afetado pelo incidente, nunca sem filtro de tempo
   ```
   Isto é um update administrativo direto — `exhausted -> pending` é uma transição de
   primeira classe na máquina de estados da Etapa 9 (`site_private.status_transitions`,
   migration `20260916220000`), desde que `attempts` volte a `0` junto (exigido pelo
   trigger `enforce_notification_delivery_lease_and_attempts`; qualquer outro valor é
   rejeitado com erro claro). Fica registrado em `site_private.admin_audit_log`
   (Etapa 36) porque não veio de uma RPC. Documente o incidente e o motivo do reset
   junto ao registro.
4. **Nunca** reenviar manualmente chamando o provedor direto por fora do worker — o
   mecanismo de reconciliação (R01/R02, `existingProviderMessageId`) existe
   justamente para não duplicar envio quando uma tentativa anterior já foi aceita pelo
   provedor mas não finalizada; contornar o worker perde essa proteção.

## SLA de referência (Etapa 42)

`oldestEligibleAgeSeconds` acima de 45 minutos (`QUEUE_AGE_ALERT_SECONDS` em
`api/notifications.ts`) já dispara o alerta operacional configurado em
`OPERATIONS_ALERT_WEBHOOK_URL` — calibrado como 3x a cadência do cron (15 min), para
tolerar até duas invocações perdidas sem soar o alarme por um atraso isolado. Confirmado
por soak test (Etapa 38, `docs/RELATORIO_SOAK_TEST_FILA_20260916.md`, duas rodadas):
sob 1000 jobs sintéticos e 10% de falha injetada, o p95 real de tempo de fila
(223-243s conforme a rodada) fica ~11x abaixo deste limiar — o valor não é só uma
tolerância de agendamento, também sobra margem larga sobre o tempo de processamento
observado, mesmo no pior caso raro (~20 min, um job que encadeou 4 falhas seguidas). Os
dois runbooks acima são a resposta a esse alerta.
