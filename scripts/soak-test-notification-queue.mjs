import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Etapa 38 do plano de correções
// (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md): confirma ou recalibra o
// limiar de alerta operacional (QUEUE_AGE_ALERT_SECONDS em api/notifications.ts) com
// dados reais de tempo de processamento sob carga — o valor existente já tinha uma
// justificativa própria (tolerância à cadência do cron), mas nunca fora comparado ao
// tempo real de fila. Enfileira JOB_COUNT quote_requests sintéticas
// (o caminho real de criação de job — trigger enqueue_quote_confirmations, não um
// insert direto em notification_deliveries) e drena com o contrato real de
// claim_site_notification_deliveries/finalize_site_notification_delivery, injetando
// latência e uma taxa de falha no "provedor" (aqui, um atraso simulado — não uma
// chamada HTTP real, mesma fronteira que os testes vitest de api/notifications.ts já
// mockam). Não faz parte de npm run check: é uma calibração pontual, não um gate de
// CI, e sua duração real depende do backoff exponencial de verdade (site_private.
// next_retry_at) — rodar manualmente com `npm run db:site:reset` antes.
//
// Requer o stack local do Supabase rodando.

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:56322/postgres';
const JOB_COUNT = Number(process.env.SOAK_JOB_COUNT || 1000);
const FAILURE_RATE = Number(process.env.SOAK_FAILURE_RATE || 0.1);
const BATCH_SIZE = 25; // notification_policy().batch_max
const MAX_ATTEMPTS = 5; // notification_policy().max_attempts
const MIN_LATENCY_MS = 50;
const MAX_LATENCY_MS = 300;
const POLL_INTERVAL_MS = 3_000;
const HARD_CAP_MS = 20 * 60 * 1000; // segurança: nunca roda mais que 20 min

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN_ID = Date.now().toString(36);

function psql(sql) {
  return execFileSync('psql', [DB_URL, '-At', '-c', sql], { encoding: 'utf8' }).trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return null;
  const index = Math.min(sortedValues.length - 1, Math.ceil((p / 100) * sortedValues.length) - 1);
  return sortedValues[Math.max(0, index)];
}

async function main() {
  console.log(`Semeando ${JOB_COUNT} quote_requests sintéticas (run ${RUN_ID})...`);
  psql(`
    insert into site_private.quote_requests (client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at)
    select 'soak-${RUN_ID}-' || g, repeat('f', 64), 'site-promo-brindes', 'Fixture Soak', 'Fixture Co', 'soak' || g || '@example.test', '11999999999', now()
    from generate_series(1, ${JOB_COUNT}) g;
  `);

  const seeded = Number(psql(`
    select count(*) from site_private.notification_deliveries delivery
    join site_private.quote_requests request on request.id = delivery.request_id
    where request.client_request_id like 'soak-${RUN_ID}-%' and delivery.channel = 'email';
  `));
  if (seeded !== JOB_COUNT) {
    throw new Error(`pré-condição falhou: esperava ${JOB_COUNT} jobs semeados, encontrou ${seeded}`);
  }

  const startedAt = Date.now();
  let claimedTotal = 0;
  let deliveredTotal = 0;
  let exhaustedTotal = 0;
  const terminalDurationsMs = [];
  let consecutiveEmptyPolls = 0;

  while (Date.now() - startedAt < HARD_CAP_MS) {
    const claimedRaw = psql(`
      select coalesce(jsonb_agg(jsonb_build_object('id', payload ->> 'id', 'requestId', payload ->> 'requestId', 'attempt', (payload ->> 'attempt')::int)), '[]'::jsonb)::text
      from jsonb_array_elements(public.claim_site_notification_deliveries(array['email'], ${BATCH_SIZE})) as payload;
    `);
    const claimed = JSON.parse(claimedRaw || '[]');

    if (claimed.length === 0) {
      const remaining = Number(psql(`
        select count(*) from site_private.notification_deliveries delivery
        join site_private.quote_requests request on request.id = delivery.request_id
        where request.client_request_id like 'soak-${RUN_ID}-%' and delivery.channel = 'email'
          and delivery.status in ('pending', 'processing', 'failed') and delivery.attempts < ${MAX_ATTEMPTS};
      `));
      if (remaining === 0) break;
      consecutiveEmptyPolls += 1;
      if (consecutiveEmptyPolls % 10 === 0) {
        console.log(`  aguardando backoff: ${remaining} jobs ainda elegíveis para nova tentativa mais tarde (${Math.round((Date.now() - startedAt) / 1000)}s decorridos)...`);
      }
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    consecutiveEmptyPolls = 0;
    claimedTotal += claimed.length;

    for (const job of claimed) {
      const latencyMs = MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
      await sleep(latencyMs);
      const providerFails = Math.random() < FAILURE_RATE;
      const status = providerFails ? 'failed' : 'sent';

      psql(`
        select public.finalize_site_notification_delivery(
          '${job.id}'::uuid,
          (select lease_token from site_private.notification_deliveries where id = '${job.id}'::uuid),
          '${status}',
          'soak-simulated-provider',
          null,
          ${providerFails ? "'soak_simulated_failure'" : 'null'},
          null
        );
      `);

      if (status === 'sent') {
        deliveredTotal += 1;
      } else if (job.attempt >= MAX_ATTEMPTS) {
        exhaustedTotal += 1;
      }
    }
  }

  const finalRows = psql(`
    select
      request.client_request_id,
      extract(epoch from delivery.created_at) as enqueued_epoch,
      extract(epoch from delivery.updated_at) as terminal_epoch,
      delivery.status,
      delivery.attempts
    from site_private.notification_deliveries delivery
    join site_private.quote_requests request on request.id = delivery.request_id
    where request.client_request_id like 'soak-${RUN_ID}-%' and delivery.channel = 'email';
  `)
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [clientRequestId, enqueuedEpoch, terminalEpoch, status, attempts] = line.split('|');
      return { clientRequestId, enqueuedEpoch: Number(enqueuedEpoch), terminalEpoch: Number(terminalEpoch), status, attempts: Number(attempts) };
    });

  let inconclusiveTotal = 0;
  for (const row of finalRows) {
    const isTerminal = row.status === 'sent' || (row.status === 'failed' && row.attempts >= MAX_ATTEMPTS);
    if (!isTerminal) {
      inconclusiveTotal += 1;
      continue;
    }
    terminalDurationsMs.push((row.terminalEpoch - row.enqueuedEpoch) * 1000);
  }
  terminalDurationsMs.sort((a, b) => a - b);

  const totalElapsedS = Math.round((Date.now() - startedAt) / 1000);
  const p50Ms = percentile(terminalDurationsMs, 50);
  const p95Ms = percentile(terminalDurationsMs, 95);
  const maxMs = terminalDurationsMs.length > 0 ? terminalDurationsMs[terminalDurationsMs.length - 1] : null;

  const report = {
    runId: RUN_ID,
    jobCount: JOB_COUNT,
    failureRateInjected: FAILURE_RATE,
    totalElapsedSeconds: totalElapsedS,
    claimedTotal,
    deliveredTotal,
    exhaustedTotal,
    inconclusiveTotal,
    p50Ms,
    p95Ms,
    maxMs,
  };
  console.log(JSON.stringify(report, null, 2));

  const reportPath = path.join(ROOT, 'docs', 'RELATORIO_SOAK_TEST_FILA_20260916.md');
  writeFileSync(
    reportPath,
    [
      '# Relatório do soak test da fila de notificações (Etapa 38)',
      '',
      `Gerado por \`npm run db:site:soak-test\` contra o banco local em ${new Date().toISOString()}.`,
      '',
      `- Jobs sintéticos enfileirados: **${JOB_COUNT}** (via \`quote_requests\` reais → trigger \`enqueue_quote_confirmations\`, canal \`email\`).`,
      `- Taxa de falha injetada no "provedor" simulado: **${(FAILURE_RATE * 100).toFixed(0)}%** por tentativa (latência simulada de ${MIN_LATENCY_MS}–${MAX_LATENCY_MS} ms).`,
      `- Drenado com o contrato real: \`claim_site_notification_deliveries\`/\`finalize_site_notification_delivery\`, backoff exponencial real (\`site_private.next_retry_at\`, sem aceleração).`,
      `- Duração total do drain: **${totalElapsedS}s**.`,
      '',
      '## Resultado',
      '',
      '| Métrica | Valor |',
      '|---|---|',
      `| Entregues (\`sent\`) | ${deliveredTotal} |`,
      `| Esgotados (\`failed\`, ${MAX_ATTEMPTS} tentativas) | ${exhaustedTotal} |`,
      `| Não concluídos até o fim do teste | ${inconclusiveTotal} |`,
      `| Tempo de fila p50 | ${p50Ms !== null ? `${(p50Ms / 1000).toFixed(1)}s` : '—'} |`,
      `| Tempo de fila p95 | ${p95Ms !== null ? `${(p95Ms / 1000).toFixed(1)}s` : '—'} |`,
      `| Tempo de fila máximo observado | ${maxMs !== null ? `${(maxMs / 1000).toFixed(1)}s` : '—'} |`,
      '',
      '## Calibração de `QUEUE_AGE_ALERT_SECONDS` (`api/notifications.ts`)',
      '',
      'O valor de 45 min (2700s) já tinha uma justificativa (3x a cadência do cron de 15 min, tolerando duas invocações perdidas), mas nunca fora comparado ao tempo real de processamento sob carga — este teste supre esse segundo eixo, independente do primeiro.',
      p95Ms !== null
        ? `p95 medido (${(p95Ms / 1000).toFixed(1)}s) sob ${(FAILURE_RATE * 100).toFixed(0)}% de falha injetada é a base para confirmar ou ajustar o limiar — ver valor atual e justificativa no comentário ao lado da constante em \`api/notifications.ts\`.`
        : 'Nenhum job atingiu estado terminal dentro do teto de segurança do teste; limiar mantido sem alteração até uma nova rodada.',
      '',
      '## Reprodução',
      '',
      '```bash',
      'npm run db:site:reset',
      'npm run db:site:soak-test',
      '```',
      '',
      `Parâmetros ajustáveis via env: \`SOAK_JOB_COUNT\` (padrão ${JOB_COUNT}), \`SOAK_FAILURE_RATE\` (padrão ${FAILURE_RATE}).`,
      '',
    ].join('\n'),
  );
  console.log(`Escrito ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
