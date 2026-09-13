// Diagnóstico da implementação real com transportes inteiramente simulados.
// Não carrega .env, não acessa rede e não envia mensagens.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const root = new URL('../../../', import.meta.url);
const transpile = (path) => ts.transpileModule(readFileSync(new URL(path, root), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const databaseUrl = dataUrl(transpile('api/_lib/siteDatabase.ts'));
const notifications = await import(dataUrl(transpile('api/notifications.ts').replace("'./_lib/siteDatabase.js'", JSON.stringify(databaseUrl))));
const envBefore = { ...process.env };
const fetchBefore = globalThis.fetch;
const observations = [];
const job = {
  id: '11111111-1111-4111-8111-111111111111', requestId: '22222222-2222-4222-8222-222222222222',
  channel: 'email', attempt: 1, protocol: '22222222', recipientEmail: 'audit@example.invalid',
  recipientPhone: '11999999999', contactName: 'Pessoa sintética', company: 'Empresa sintética',
  submittedAt: '2026-09-12T12:00:00Z', items: [{ name: 'Produto sintético', sku: 'AUDIT', quantity: 100 }],
};
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
function configure() {
  Object.assign(process.env, {
    SITE_SUPABASE_URL: 'https://xlzmclcjdncjfdrjxclt.supabase.co', SITE_SUPABASE_SECRET_KEY: `sb_secret_${'x'.repeat(40)}`,
    SITE_REQUEST_HASH_SALT: 'synthetic-salt-with-more-than-32-characters', SITE_PUBLIC_ORIGIN: 'https://promo.invalid',
    RESEND_API_KEY: 'synthetic', SITE_EMAIL_FROM: 'audit@example.invalid',
    WHATSAPP_ACCESS_TOKEN: '', WHATSAPP_PHONE_NUMBER_ID: '', WHATSAPP_QUOTE_TEMPLATE: '', WHATSAPP_GRAPH_API_VERSION: '',
  });
}
try {
  configure();
  globalThis.fetch = async (url) => {
    const path = String(url);
    if (path.endsWith('/claim_site_quote_notification')) return json(job);
    if (path === 'https://api.resend.com/emails') return json({ id: 'accepted-synthetic' });
    if (path.endsWith('/finalize_site_notification_delivery')) return json(false);
    throw new Error('Unexpected mocked transport');
  };
  const falseFinalize = await notifications.deliverQuoteConfirmationsNow(job.requestId, false);
  assert.equal(falseFinalize.email, 'sent');
  observations.push({ id: 'R01', scenario: 'finalize_returns_false', actual: falseFinalize, defectReproduced: true,
    meaning: 'A aplicação informa sent mesmo quando o RPC confirma que nenhuma linha foi finalizada.' });

  configure();
  Object.assign(process.env, { RESEND_API_KEY: '', SITE_EMAIL_FROM: '', WHATSAPP_ACCESS_TOKEN: 'synthetic',
    WHATSAPP_PHONE_NUMBER_ID: '1234567890', WHATSAPP_QUOTE_TEMPLATE: 'confirmacao_auditoria', WHATSAPP_GRAPH_API_VERSION: 'v23.0' });
  let claimCount = 0;
  const providerPayloads = [];
  globalThis.fetch = async (url, init) => {
    const path = String(url);
    if (path.endsWith('/claim_site_quote_notification')) return json({ ...job, channel: 'whatsapp', attempt: ++claimCount });
    if (path.includes('graph.facebook.com')) { providerPayloads.push(JSON.parse(init.body)); return json({ messages: [{ id: `synthetic-${providerPayloads.length}` }] }); }
    if (path.endsWith('/finalize_site_notification_delivery')) return providerPayloads.length === 1 ? json({}, 503) : json(true);
    throw new Error('Unexpected mocked transport');
  };
  const first = await notifications.deliverQuoteConfirmationsNow(job.requestId, true);
  // Segunda chamada representa um job novamente elegível, após expiração do processing.
  const retry = await notifications.deliverQuoteConfirmationsNow(job.requestId, true);
  assert.equal(providerPayloads.length, 2);
  assert.deepEqual(providerPayloads[0], providerPayloads[1]);
  observations.push({ id: 'R02', scenario: 'provider_accepts_database_finalize_fails_then_retry', first, retry,
    sendsToMockProvider: providerPayloads.length, identicalPayloads: true, defectReproduced: true,
    meaning: 'O mesmo comprovante WhatsApp é submetido duas vezes ao transporte. Não é prova de entrega duplicada na Meta real.' });

  observations.push({ id: 'R06', scenario: 'whatsapp_message_content',
    bodyParameters: providerPayloads[0].template.components[0].parameters.length,
    includesProductList: JSON.stringify(providerPayloads[0]).includes('Produto sintético'),
    meaning: 'O payload fornece nome, protocolo e empresa; não envia a seleção. O template aprovado externo não foi inspecionado.' });
} finally {
  globalThis.fetch = fetchBefore;
  for (const key of Object.keys(process.env)) if (!(key in envBefore)) delete process.env[key];
  Object.assign(process.env, envBefore);
}
console.log(JSON.stringify({ environment: 'local-mocked-no-network', observations }, null, 2));
