/**
 * Verificações de regressão que sucederam os diagnósticos da auditoria de
 * 22/09/2026. O evidence.json registra o estado histórico; este arquivo verifica
 * que as duas falhas client-side já corrigidas não regressaram e que o teste real
 * de concorrência permanece versionado.
 * Código real transpilado em memória; storage/analytics sintéticos; sem rede/DB.
 * Executar da raiz: node docs/audits/plan-review-20260922/reproduce.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const stored = new Map();
const events = [];
const browser = {
  location: { pathname: '/minha-conta/orcamentos/11111111-1111-4111-8111-111111111111' },
  sessionStorage: {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, String(value)),
    removeItem: (key) => stored.delete(key),
  },
};
const modules = new Map();

function load(relativePath) {
  const filename = path.resolve(root, relativePath);
  assert.ok(filename.startsWith(`${root}${path.sep}`), 'módulo dentro deste repositório');
  if (modules.has(filename)) return modules.get(filename);
  const mod = { exports: {} };
  modules.set(filename, mod.exports);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  vm.runInNewContext(compiled, {
    module: mod,
    exports: mod.exports,
    require: (name) => {
      if (name === '@vercel/analytics') return { track: (event, data) => events.push({ event, data }) };
      assert.ok(name.startsWith('.'), `dependência inesperada: ${name}`);
      return load(path.relative(root, path.resolve(path.dirname(filename), `${name}.ts`)));
    },
    window: browser,
    Error,
    URL,
  }, { filename });
  return mod.exports;
}

const repeat = load('src/lib/quoteRepeat.ts');
repeat.saveQuoteRepeat({
  quoteId: '11111111-1111-4111-8111-111111111111',
  briefing: { actionName: 'Campanha sintética da conta anterior', budgetRange: '51-100' },
});
load('src/lib/personalDataReset.ts').clearPersonalQuoteStorage();
const restored = repeat.loadQuoteRepeat('11111111-1111-4111-8111-111111111111');
assert.equal(restored, null, 'regressão: repetição não pode sobreviver ao reset de dados pessoais');

load('src/lib/clientObservability.ts').reportClientError(new Error('Mensagem sintética não enviada'));
assert.equal(events[0]?.data?.route, '/minha-conta/orcamentos/:id',
  'regressão: telemetria não pode manter UUID privado na rota');

// A reprodução histórica com processos Node bloqueantes não modelava o Postgres e
// não demonstrava concorrência. A garantia executável vive no teste que abre duas
// sessões psql reais; aqui apenas protegemos sua presença no repositório. Para
// validá-la integralmente: npm run test:queue-concurrency (com stack local ativo).
const queueConcurrencyTest = fs.readFileSync(path.join(root, 'tests/queue-concurrency.node.mjs'), 'utf8');
assert.match(queueConcurrencyTest, /for update skip locked/i,
  'regressão: teste de concorrência deve documentar locks reais do Postgres');
assert.match(queueConcurrencyTest, /overlappingClaims\(\)/,
  'regressão: teste de concorrência deve manter duas reivindicações sobrepostas');

console.log(JSON.stringify({
  meaning: 'exit 0 confirma as proteções de regressão deste arquivo; não certifica a operação externa',
  historicalEvidence: 'evidence.json preserva os achados de 22/09/2026',
  quoteRepeatClearedByPersonalReset: restored === null,
  privateIdentifierRedactedInErrorTelemetry: events[0]?.data?.route === '/minha-conta/orcamentos/:id',
  realQueueConcurrencyTestVersioned: true,
  networkRequests: 0,
  databaseWrites: 0,
}, null, 2));
