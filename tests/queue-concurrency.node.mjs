import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';

// Etapa 37 do plano de correções: testa concorrência real da fila — dois "workers"
// reivindicando ao mesmo tempo devem obter conjuntos DISJUNTOS de jobs (for update
// skip locked, Etapa 12/25), nunca o mesmo job duas vezes. pgTAP roda numa sessão só
// por natureza; isto precisa de duas conexões de verdade ao Postgres, por isso é um
// teste Node com dois processos `psql` concorrentes, não mais um arquivo .test.sql.
//
// Requer o stack local do Supabase rodando (`npm run db:site:reset` antes). Não faz
// parte de `npm run check` por esse motivo — rodar manualmente com
// `npm run test:queue-concurrency` depois de subir o stack local.

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:56322/postgres';
const QUOTE_COUNT = 50;

function psql(sql) {
  return execFileSync('psql', [DB_URL, '-At', '-c', sql], { encoding: 'utf8' }).trim();
}

test('duas reivindicações concorrentes da fila obtêm conjuntos disjuntos de jobs', { timeout: 30_000 }, async () => {
  const runId = Date.now().toString(36);

  // Fixture: 50 quote_requests, cada uma gera 1 job 'email' pendente via o trigger
  // enqueue_quote_confirmations já existente (nenhuma dependência de mock).
  psql(`
    insert into site_private.quote_requests (client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at)
    select 'concurrency-${runId}-' || g, repeat('c', 64), 'site-promo-brindes', 'Fixture', 'Fixture Co', 'fixture' || g || '@example.test', '11999999999', now()
    from generate_series(1, ${QUOTE_COUNT}) g;
  `);

  const totalPending = Number(psql(`
    select count(*) from site_private.notification_deliveries delivery
    join site_private.quote_requests request on request.id = delivery.request_id
    where request.client_request_id like 'concurrency-${runId}-%' and delivery.channel = 'email';
  `));
  assert.equal(totalPending, QUOTE_COUNT, 'pré-condição: a fixture criou exatamente 50 jobs pendentes');

  // Duas conexões psql reais, disparadas ao mesmo tempo (Promise.all, não sequencial).
  // Cada uma reivindica 25 (o máximo de notification_policy().batch_max) — as duas
  // juntas cobrem exatamente os 50 da fixture, então disputam linhas de verdade em
  // vez de cada uma ter uma metade garantida sem conflito.
  const claim = () => new Promise((resolve, reject) => {
    try {
      const out = execFileSync('psql', [DB_URL, '-At', '-c', `
        select string_agg(payload ->> 'id', ',')
        from jsonb_array_elements(public.claim_site_notification_deliveries(array['email'], 25)) as payload;
      `], { encoding: 'utf8' });
      resolve(out.trim());
    } catch (error) {
      reject(error);
    }
  });

  const [resultA, resultB] = await Promise.all([claim(), claim()]);
  const idsA = resultA ? resultA.split(',').filter(Boolean) : [];
  const idsB = resultB ? resultB.split(',').filter(Boolean) : [];

  assert.ok(idsA.length + idsB.length > 0, 'pelo menos uma das duas reivindicações obteve jobs');
  assert.ok(idsA.length + idsB.length <= QUOTE_COUNT, 'as duas juntas nunca reivindicam mais jobs do que existem');

  const setA = new Set(idsA);
  const overlap = idsB.filter((id) => setA.has(id));
  assert.deepEqual(overlap, [], 'nenhum job foi reivindicado pelas duas conexões ao mesmo tempo (for update skip locked funciona sob concorrência real)');

  const distinctLeaseTokens = Number(psql(`
    select count(distinct lease_token) from site_private.notification_deliveries delivery
    join site_private.quote_requests request on request.id = delivery.request_id
    where request.client_request_id like 'concurrency-${runId}-%' and delivery.status = 'processing';
  `));
  const claimedTotal = idsA.length + idsB.length;
  assert.equal(distinctLeaseTokens, claimedTotal, 'todo job reivindicado tem um lease_token próprio (nenhum lease compartilhado por engano)');
});

test('recuperação de lease expirada: duas conexões disputam o MESMO job preso, só uma vence', { timeout: 30_000 }, async () => {
  const runId = Date.now().toString(36);

  // Fixture: 1 quote_request, reivindicada normalmente uma vez (attempts 0 -> 1),
  // depois a lease é retroagida para o passado sem tocar status/attempts (nenhum
  // trigger da Etapa 9 dispara — simula só "o tempo passou", não uma transição).
  psql(`
    insert into site_private.quote_requests (client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at)
    values ('lease-recovery-${runId}-1', repeat('e', 64), 'site-promo-brindes', 'Fixture', 'Fixture Co', 'fixture-lease@example.test', '11999999999', now());
  `);
  const firstClaimIds = psql(`
    select string_agg(payload ->> 'id', ',')
    from jsonb_array_elements(public.claim_site_notification_deliveries(array['email'], 25)) as payload;
  `).trim();
  assert.equal(firstClaimIds.split(',').filter(Boolean).length, 1, 'pré-condição: a reivindicação inicial pegou exatamente o job da fixture');

  psql(`
    update site_private.notification_deliveries
    set lease_expires_at = now() - interval '1 minute'
    where id = '${firstClaimIds}'::uuid;
  `);
  const attemptsBeforeRecovery = Number(psql(`select attempts from site_private.notification_deliveries where id = '${firstClaimIds}'::uuid;`));
  assert.equal(attemptsBeforeRecovery, 1, 'pré-condição: job preso está na 1ª tentativa antes da recuperação');

  const claim = () => new Promise((resolve, reject) => {
    try {
      const out = execFileSync('psql', [DB_URL, '-At', '-c', `
        select string_agg(payload ->> 'id', ',')
        from jsonb_array_elements(public.claim_site_notification_deliveries(array['email'], 25)) as payload;
      `], { encoding: 'utf8' });
      resolve(out.trim());
    } catch (error) {
      reject(error);
    }
  });

  const [resultA, resultB] = await Promise.all([claim(), claim()]);
  const idsA = resultA ? resultA.split(',').filter(Boolean) : [];
  const idsB = resultB ? resultB.split(',').filter(Boolean) : [];

  assert.equal(idsA.length + idsB.length, 1, 'exatamente uma das duas conexões recupera o job preso — nunca as duas, nunca nenhuma');

  const winnerId = [...idsA, ...idsB][0];
  assert.equal(winnerId, firstClaimIds, 'o job recuperado é o mesmo da fixture (nenhum outro job elegível existe neste teste)');

  const [attemptsAfter, leaseTokenAfter] = psql(`
    select attempts, lease_token from site_private.notification_deliveries where id = '${winnerId}'::uuid;
  `).split('|');
  assert.equal(Number(attemptsAfter), 2, 'attempts incrementou para 2 na recuperação (nova tentativa de verdade, Etapa 9)');
  assert.ok(leaseTokenAfter && leaseTokenAfter.length > 0, 'a recuperação gerou um lease_token novo');
});

test('exhausted sob concorrência: duas conexões terminalizam o mesmo job preso, nenhuma o reivindica como novo', { timeout: 30_000 }, async () => {
  const runId = Date.now().toString(36);

  // Fixture: job já no limite de tentativas (5) e com lease expirada — housekeeping
  // de claim_site_notification_deliveries deveria terminalizá-lo como 'exhausted' em
  // vez de reivindicá-lo, em qualquer uma das duas conexões concorrentes. Pula direto
  // para o estado final (não simula 5 tentativas reais) — desabilita os triggers da
  // Etapa 9 só para este setup, mesmo padrão já usado nas fixtures pgTAP.
  psql(`
    insert into site_private.quote_requests (client_request_id, request_hash, source, contact_name, company, email, phone, client_submitted_at)
    values ('exhausted-concurrency-${runId}-1', repeat('f', 64), 'site-promo-brindes', 'Fixture', 'Fixture Co', 'fixture-exhausted@example.test', '11999999999', now());
  `);
  const deliveryId = psql(`
    select delivery.id from site_private.notification_deliveries delivery
    join site_private.quote_requests request on request.id = delivery.request_id
    where request.client_request_id = 'exhausted-concurrency-${runId}-1' and delivery.channel = 'email';
  `);
  psql(`alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_status_transition;`);
  psql(`alter table site_private.notification_deliveries disable trigger notification_deliveries_enforce_lease_and_attempts;`);
  psql(`
    update site_private.notification_deliveries
    set status = 'processing', attempts = 5, lease_token = gen_random_uuid(),
        claimed_at = now() - interval '20 minutes', lease_expires_at = now() - interval '10 minutes'
    where id = '${deliveryId}'::uuid;
  `);
  psql(`alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_status_transition;`);
  psql(`alter table site_private.notification_deliveries enable trigger notification_deliveries_enforce_lease_and_attempts;`);

  const claim = () => new Promise((resolve, reject) => {
    try {
      const out = execFileSync('psql', [DB_URL, '-At', '-c', `
        select string_agg(payload ->> 'id', ',')
        from jsonb_array_elements(public.claim_site_notification_deliveries(array['email'], 25)) as payload;
      `], { encoding: 'utf8' });
      resolve(out.trim());
    } catch (error) {
      reject(error);
    }
  });

  const [resultA, resultB] = await Promise.all([claim(), claim()]);
  const idsA = resultA ? resultA.split(',').filter(Boolean) : [];
  const idsB = resultB ? resultB.split(',').filter(Boolean) : [];

  assert.deepEqual([...idsA, ...idsB], [], 'nenhuma das duas conexões reivindica o job esgotado como uma nova tentativa');

  const finalStatus = psql(`select status from site_private.notification_deliveries where id = '${deliveryId}'::uuid;`);
  assert.equal(finalStatus, 'exhausted', 'o job foi terminalizado como exhausted por uma das duas conexões (a outra não encontrou nada para fazer, sem erro)');
});
