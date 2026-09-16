# Relatório do soak test da fila de notificações (Etapa 38)

Gerado por `npm run db:site:soak-test` contra o banco local em 2026-09-16T16:11:59.820Z.

- Jobs sintéticos enfileirados: **1000** (via `quote_requests` reais → trigger `enqueue_quote_confirmations`, canal `email`).
- Taxa de falha injetada no "provedor" simulado: **10%** por tentativa (latência simulada de 50–300 ms).
- Drenado com o contrato real: `claim_site_notification_deliveries`/`finalize_site_notification_delivery`, backoff exponencial real (`site_private.next_retry_at`, sem aceleração).
- Duração total do drain: **405s**.

## Resultado

| Métrica | Valor |
|---|---|
| Entregues (`sent`) | 1000 |
| Esgotados (`failed`, 5 tentativas) | 0 |
| Não concluídos até o fim do teste | 0 |
| Tempo de fila p50 | 119.2s |
| Tempo de fila p95 | 223.2s |
| Tempo de fila máximo observado | 405.0s |

## Calibração de `QUEUE_AGE_ALERT_SECONDS` (`api/notifications.ts`)

O valor de 45 min (2700s) já tinha uma justificativa (3x a cadência do cron de 15 min, tolerando duas invocações perdidas), mas nunca fora comparado ao tempo real de processamento sob carga — este teste supre esse segundo eixo, independente do primeiro.

**Decisão: mantido em 45 min, agora confirmado por dois eixos independentes.** p95 medido
(223,2s ≈ 3,7 min) sob 10% de falha injetada fica ~12x abaixo do limiar — mesmo o pior
caso observado (405,0s ≈ 6,75 min, um job que passou por várias tentativas) deixa
margem de mais de 6x. Não há indício de que o limiar seja apertado demais para o
volume/taxa de falha testados; ele continua calibrado principalmente pela tolerância a
cron perdido (seu racional original), e este teste é a evidência de que isso não deixa
passar batido um problema real de processamento antes de 45 minutos. Reavaliar se o
volume de produção ou a taxa de falha real dos provedores divergirem muito do testado
aqui (1000 jobs, 10% de falha).

## Reprodução

```bash
npm run db:site:reset
npm run db:site:soak-test
```

Parâmetros ajustáveis via env: `SOAK_JOB_COUNT` (padrão 1000), `SOAK_FAILURE_RATE` (padrão 0.1).
