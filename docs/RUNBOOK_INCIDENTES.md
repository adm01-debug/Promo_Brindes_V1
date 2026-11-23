# Runbooks de incidente (Etapa 49)

Índice dos runbooks já existentes + os dois cenários operacionais que faltavam
(fila travada, provedor de notificação fora do ar). Os demais cenários do plano
original já têm runbook dedicado:

- **Chave vazada / rotação de segredo** → `docs/RUNBOOK_ROTACAO_SEGREDOS.md`.
- **Pedido de apagamento do titular** → `docs/RUNBOOK_PEDIDO_TITULAR.md`.
- **Reconciliação do ledger de migrations** → `docs/RUNBOOK_RECONCILIACAO_LEDGER.md`.
- **Cutover para a role `site_api`** → `docs/RUNBOOK_SITE_API_CUTOVER.md`.
- **Verificação em 5 comandos do banco remoto** → `docs/RUNBOOK_VERIFICACAO_DB.md`.
- **Restore de backup** → `docs/RUNBOOK_RESTORE_SITE.md` documenta o ensaio seguro.
  A restauração real, os alvos RPO/RTO e o custo do destino ainda precisam de
  aprovação operacional; runbook não é prova de recuperação executada.

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
   esgotaram as 5 tentativas) e `uncertainCount` (WhatsApp cuja chamada externa
   começou, mas o aceite não pôde ser confirmado — ver seção seguinte).
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

## WhatsApp com `uncertainCount > 0`

O marcador `last_error_code = 'whatsapp_dispatch_started'` é gravado **antes** da
chamada à Meta. Se a rede cair ou a Meta responder `2xx` sem ID, o job permanece em
`processing` e não é reivindicado outra vez: é uma escolha at-most-once para não
duplicar mensagem ao cliente.

1. Consulte o job pelo período, canal e protocolo; não altere em massa.
2. Procure no painel da Meta o envio correspondente. Se houver `wamid`, registre-o com
   `record_site_notification_provider_acceptance` usando o `id` e `lease_token` atuais;
   o worker seguinte apenas reconciliará/finalizará, sem enviar de novo.
3. Se a Meta comprovar que não recebeu a chamada, documente a evidência e só então
   libere uma nova tentativa de forma administrativa. Substitua o UUID abaixo pelo
   único job reconciliado; a guarda impede alterar qualquer outro estado:
   ```sql
   update site_private.notification_deliveries
   set status = 'failed', lease_token = null, lease_expires_at = null,
       last_error_code = 'manual_meta_not_received', next_attempt_at = now(),
       updated_at = now()
   where id = '00000000-0000-0000-0000-000000000000'
     and channel = 'whatsapp'
     and status = 'processing'
     and last_error_code = 'whatsapp_dispatch_started'
     and provider_message_id is null
   returning id;
   ```
   Exija exatamente uma linha retornada. Zero linhas significa estado divergente e
   interrompe a operação; uma ausência de log no painel não é prova suficiente.
4. Toda decisão deve ficar no ticket do incidente; `admin_audit_log` registra a escrita
   administrativa, e o cron de retenção mantém essa trilha por 400 dias.

## Recuperar entrega bloqueada por supressão de e-mail (bounce/complaint)

Quando um e-mail volta com bounce ou complaint, o evento fica em
`notification_provider_events` (deduplicado por `provider` + `provider_event_id`) e a entrega
correspondente passa a `delivery_state = 'bounced'` (ou ganha `complained_at`). A partir daí
`site_private.notification_request_suppressed(request_kind, request_id)` retorna `true` para
**todo pedido daquele endereço**, porque o predicado compara o hash do e-mail das entregas ao
titular — não os eventos. Consequência: o cron não reivindica novas confirmações e encerra as
que estão na fila com `status = 'exhausted'` e `last_error_code = 'recipient_suppressed'`.

`exhausted` é terminal para o sistema automático, mas deliberadamente reabrível pelo operador —
é o mesmo estado que o painel reprocessa. Por isso a supressão **não** grava `cancelled`:
`cancelled` é terminal por omissão na matriz de transições e deixaria a confirmação ao titular
morta depois de um bounce temporário.

1. **Confirme a causa** no painel do provedor: bounce temporário (caixa cheia, domínio fora do
   ar) é recuperável; bounce permanente (usuário desconhecido) e complaint **não devem** ser
   desbloqueados.
2. **Identifique os IDs das entregas antes de limpar**: a limpeza tem de atingir só as
   entregas daquele bounce temporário. Mensagem já entregue (`delivery_state = 'delivered'`)
   não pode perder o histórico, e endereço com complaint não pode ser desbloqueado por engano.
   ```sql
   -- notification_provider_events nao tem coluna delivery_state: ele guarda o evento
   -- (event_type/delivery_id) e nunca e alterado aqui. O predicado de supressao le
   -- exclusivamente notification_deliveries, entao e essa tabela que precisa ser limpa.
   -- Passo 2a: listar o que sera afetado (bounced sem complaint).
   select delivery.id, delivery.request_kind, delivery.request_id, delivery.channel,
          delivery.delivery_state, delivery.bounce_reason, delivery.complained_at,
          delivery.delivery_state_at
   from site_private.notification_deliveries delivery
   where delivery.audience = 'customer'
     and site_private.email_hash(
           case delivery.request_kind
             when 'quote' then (select request.email from site_private.quote_requests request
                                where request.id = delivery.request_id)
             else (select request.email from site_private.contact_requests request
                   where request.id = delivery.request_id)
           end) = site_private.email_hash('<email-do-titular>')
     and (delivery.delivery_state = 'bounced' or delivery.complained_at is not null)
   order by delivery.created_at;
   ```
   Confira que **toda** linha listada é do bounce temporário. Se aparecer
   `complained_at` preenchido ou um `delivery_state_at` de outro incidente, não siga: o
   endereço tem bloqueio legítimo e não deve ser desbloqueado.
3. **Limpe a supressão apenas nos IDs confirmados** (bounce temporário):
   ```sql
   update site_private.notification_deliveries delivery
   set delivery_state = null, delivery_state_at = null,
       delivery_state_source_event_id = null, complained_at = null, updated_at = now()
   where delivery.id in (
     '00000000-0000-4000-8000-000000000000', -- IDs copiados do passo 2
     '00000000-0000-4000-8000-000000000000'
   )
     and delivery.delivery_state = 'bounced'
     and delivery.complained_at is null;
   ```
   Consulta sem `where delivery.id in (...)`, ou sem as duas últimas condições, apaga o
   registro de entrega de mensagem já entregue e desfaz bloqueio por complaint.
   Sem esse passo a supressão continua valendo e a entrega reaberta é encerrada de novo no
   tick seguinte.
4. **Reabra o que o cron encerrou** pelo painel (`reprocess_site_notification_deliveries`), que
   faz `exhausted -> pending` com `attempts = 0`. Só esse caminho passa pela matriz de
   transições: um `update ... set status = 'pending'` direto numa entrega `cancelled` é rejeitado
   com `22023`, e entrega que já saiu como `sent` não é reenviada. Entregas que continuaram em
   `pending`/`failed` voltam sozinhas no próximo tick, sem reabertura.
5. Documente no ticket: data, motivo do desbloqueio, quem autorizou.

> **Nota de auditoria:** `suppress_notification_delivery` grava o motivo em
> `notification_deliveries.last_error_code` (`recipient_suppressed` ou `recipient_erased`) e não
> escreve em `admin_audit_log` — esse caminho é automático, não uma escrita administrativa. A
> trilha do bounce fica no evento do provedor (`notification_provider_events`) e a reabertura
> feita pelo painel é auditada (`reprocess_site_notification_deliveries` insere em
> `admin_audit_log`). Pedido apagado pela autoexclusão (F-30) é diferente: vai para `cancelled`
> com `recipient_erased` e **não** é reabrível, porque o dado não existe mais.

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
