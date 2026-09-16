# Relatório do soak test da fila de notificações (Etapa 38)

Gerado por `npm run db:site:soak-test` contra o banco local em 2026-09-16T18:27:15.874Z.

- Jobs sintéticos enfileirados: **1000** (via `quote_requests` reais → trigger `enqueue_quote_confirmations`, canal `email`).
- Taxa de falha injetada no "provedor" simulado: **10%** por tentativa (latência simulada de 50–300 ms).
- Drenado com o contrato real: `claim_site_notification_deliveries`/`finalize_site_notification_delivery`, backoff exponencial real (`site_private.next_retry_at`, sem aceleração).
- Duração total do drain: **1194s**.

## Resultado

| Métrica | Valor |
|---|---|
| Entregues (`sent`) | 1000 |
| Esgotados (`failed`, 5 tentativas) | 0 |
| Não concluídos até o fim do teste | 0 |
| Tempo de fila p50 | 129.7s |
| Tempo de fila p95 | 243.3s |
| Tempo de fila máximo observado | 1194.0s |

## Calibração de `QUEUE_AGE_ALERT_SECONDS` (`api/notifications.ts`)

O valor de 45 min (2700s) já tinha uma justificativa (3x a cadência do cron de 15 min,
tolerando duas invocações perdidas), mas nunca fora comparado ao tempo real de
processamento sob carga — este teste supre esse segundo eixo, independente do primeiro.

**Decisão: mantido em 45 min.** p50/p95 desta rodada (129,7s / 243,3s) batem com a
rodada anterior (119,2s / 223,2s, mesmos parâmetros) — margem estável de ~11x entre o
p95 e o limiar. O máximo observado (1194,0s ≈ 19,9 min) é bem maior que na rodada
anterior (405,0s): um único job, sob 10% de falha independente por tentativa, encadeou
falhas por 4 tentativas seguidas antes de ser entregue na 5ª — estatisticamente raro
(≈0,1 evento esperado a cada 1000 jobs assim), mas real, não um artefato do script (o
job foi *entregue*, não ficou pendurado; o teto de segurança do script é 1200s e não foi
atingido). Mesmo esse pior caso observado fica abaixo do limiar de 45 min — não muda a
decisão, mas confirma que o limiar precisa de fato tolerar a cauda longa do backoff
exponencial (até ~4 tentativas encadeadas), não só o caso comum.

## Reprodução

```bash
npm run db:site:reset
npm run db:site:soak-test
```

Parâmetros ajustáveis via env: `SOAK_JOB_COUNT` (padrão 1000), `SOAK_FAILURE_RATE` (padrão 0.1).
