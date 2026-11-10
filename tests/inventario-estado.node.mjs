// Guarda do inventário do estado real: funções puras e CLI de scripts/inventario/.
// Nenhum teste toca banco, rede externa ou credencial — respostas sintéticas, `fetch` falso e,
// nos testes de CLI, um servidor HTTP em 127.0.0.1 e um repositório git descartável.
// O banco.sql contra um PostgreSQL de verdade fica em tests/inventario-banco-sql.node.mjs.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFile, execFileSync, spawnSync } from 'node:child_process';

import {
  CODIGO_DE_ERRO,
  LIMIARES,
  PARECE_CREDENCIAL,
  PROJETO_CATALOGO_CANONICO,
  PROJETO_SITE,
  conferirOrigem,
  consultarApi,
  contarRpcNoCodigo,
  contarUsoNoCodigo,
  cruzarRpcs,
  extrairInventario,
  lerArgumentos,
  montarInventario,
  rodaTodoDia,
  salvarInventario,
  tabelasDasMigrations,
  versoesDoRepo,
} from '../scripts/inventario/gerar-banco.mjs';
import { mudou, semCarimbos } from '../scripts/inventario/mudou-conteudo.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const GERAR = path.join(RAIZ, 'scripts/inventario/gerar-banco.mjs');
const MUDOU = path.join(RAIZ, 'scripts/inventario/mudou-conteudo.mjs');
const SQL = fs.readFileSync(path.join(RAIZ, 'scripts/inventario/banco.sql'), 'utf8');
// Montado em partes: um literal sbp_ com 40 hex é barrado pelo secret scanning do GitHub.
const TOKEN_FALSO = `sbp_${'0123456789abcdef'.repeat(2)}01234567`;

const temporarias = [];
function pastaTemporaria(prefixo) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefixo));
  temporarias.push(dir);
  return dir;
}
after(() => { for (const dir of temporarias) fs.rmSync(dir, { recursive: true, force: true }); });

/** Roda `fn` com variáveis de ambiente trocadas e devolve tudo ao estado anterior. */
async function comAmbiente(variaveis, fn) {
  const antes = Object.fromEntries(Object.keys(variaveis).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(variaveis)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(antes)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

/** Ambiente limpo para o CLI: nada do ambiente de quem roda o teste vaza para o script. */
function ambienteDoCli(extra = {}) {
  const env = { ...process.env, ...extra };
  for (const chave of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'SUPABASE_API_URL', 'INVENTARIO_PERMITIR_OUTRO_PROJETO']) {
    if (!(chave in extra)) delete env[chave];
  }
  return env;
}

const rodarCli = (script, args, opcoes = {}) => spawnSync(process.execPath, [script, ...args], {
  encoding: 'utf8', env: ambienteDoCli(opcoes.env), cwd: opcoes.cwd ?? RAIZ,
});

/** Resposta do banco.sql coerente com as migrations reais do repo (passa na prova de origem). */
function respostaDoSite(extra = {}) {
  const versoes = versoesDoRepo(RAIZ);
  return resposta({
    resumo: { ledger_registros: versoes.length, ledger_versao_max: [...versoes].sort().at(-1), leitura_filtrada_por_rls: 0 },
    tabelas: tabelasDasMigrations(RAIZ).map((nome) => ({
      nome, esquema: 'site_private', rls: true, policies: 0, linhas: 1, citada_no_banco: true,
    })),
    ...extra,
  });
}

function resposta(extra = {}) {
  return {
    format_version: 1,
    medido_em: '2026-11-08T12:00:00Z',
    resumo: { ledger_registros: 65, ledger_versao_max: '20261006134751' },
    tabelas: [
      { nome: 'quote_requests', esquema: 'site_private', rls: true, policies: 2, linhas: 10, citada_no_banco: true },
      { nome: 'contact_requests', esquema: 'site_private', rls: true, policies: 0, linhas: 0, citada_no_banco: false },
      { nome: 'admin_ddl_log', esquema: 'site_private', rls: false, policies: 0, linhas: 3, citada_no_banco: true },
    ],
    funcoes: [
      {
        nome: 'get_my_quote_requests', esquema: 'public', security_definer: true,
        executa_anon: true, executa_authenticated: true, search_path_fixo: true,
      },
      {
        nome: 'interna_sem_grant', esquema: 'public', security_definer: false,
        executa_anon: false, executa_authenticated: false, search_path_fixo: true,
      },
    ],
    cron: { disponivel: false, jobs: [], horas_paradas_7d: [], historico: { linhas: 0, mais_de_7_dias: 0 } },
    fila: {
      notificacao_por_status: { pending: 1 }, notificacao_vencidas: 0,
      notificacao_tentativas_max: 1, notificacao_erros_7d: {},
      remocao_storage_pendente: 0, remocao_storage_mais_antiga: null,
    },
    ...extra,
  };
}

test('extrairInventario aceita objeto direto, envelope do PostgREST e envelope do MCP', () => {
  const direto = resposta();
  assert.equal(extrairInventario(direto).format_version, 1);
  assert.equal(extrairInventario({ rows: [{ inventario: direto }] }).format_version, 1);
  assert.equal(
    extrairInventario({ result: { content: [{ type: 'text', text: JSON.stringify({ inventario: direto }) }] } }).format_version,
    1,
  );
  assert.equal(extrairInventario(JSON.stringify(direto)).format_version, 1);
});

test('extrairInventario recusa entrada sem as chaves obrigatórias, sem tabelas ou de outra versão', () => {
  const semFila = Object.fromEntries(Object.entries(resposta()).filter(([chave]) => chave !== 'fila'));
  assert.throws(() => extrairInventario(semFila), /entrada sem as chaves: fila/);
  assert.throws(() => extrairInventario(resposta({ tabelas: [] })), /sem tabelas/);
  assert.throws(() => extrairInventario(resposta({ format_version: 2 })), /format_version 2/);
});

// 65 migrations no repo, a mais recente igual à `ledger_versao_max` de `resposta()`.
const VERSOES_OK = [
  ...Array.from({ length: 64 }, (_, i) => `202609${String(i + 1).padStart(2, '0')}000000`),
  '20261006134751',
];

test('conferirOrigem aprova a resposta que cobre as tabelas das migrations e o ledger', () => {
  const origem = conferirOrigem(resposta(), ['quote_requests', 'contact_requests', 'admin_ddl_log'], VERSOES_OK);
  assert.equal(origem.tabelas_das_migrations_presentes, 3);
  assert.equal(origem.ledger_registros, 65);
});

test('conferirOrigem recusa um banco irmão: as tabelas das migrations não estão lá', () => {
  assert.throws(
    () => conferirOrigem(resposta(), ['products', 'product_variants', 'categories', 'brands']),
    /nao parece ser do banco do site/,
  );
});

test('conferirOrigem recusa ledger atrasado e ledger com total muito diferente do repo', () => {
  const versoes = Array.from({ length: 30 }, (_, i) => `202610${String(i + 10).padStart(2, '0')}000000`);
  const tabelas = ['quote_requests', 'contact_requests', 'admin_ddl_log'];
  assert.throws(() => conferirOrigem(resposta(), tabelas, versoes), /nao parece ser do banco do site/);
  assert.throws(
    () => conferirOrigem(resposta({ resumo: { ledger_registros: 65 } }), tabelas, ['20261006134751']),
    /ledger_versao_max/,
  );
});

test('montarInventario aponta tabela sem RLS, RLS sem policy e órfã', () => {
  const uso = { quote_requests: { src: 1, api: 0 }, contact_requests: { src: 0, api: 0 }, admin_ddl_log: { src: 0, api: 0 } };
  const inv = montarInventario(resposta(), uso, {}, {});
  const tipos = inv.alertas.map((a) => a.tipo);
  assert.deepEqual(inv.alertas.find((a) => a.tipo === 'tabela_sem_rls').detalhe, ['admin_ddl_log']);
  assert.deepEqual(inv.alertas.find((a) => a.tipo === 'rls_sem_policy').detalhe, ['contact_requests']);
  assert.deepEqual(inv.tabelas_orfas.lista, ['contact_requests']);
  assert.ok(!tipos.includes('cron_falhando'));
});

test('montarInventario alerta fila travada, erro de entrega e remoção de storage atrasada', () => {
  const inv = montarInventario(resposta({
    fila: {
      notificacao_por_status: { failed: 2 }, notificacao_vencidas: 2, notificacao_tentativas_max: 5,
      notificacao_erros_7d: { smtp_timeout: 2, sem_codigo: 1 },
      remocao_storage_pendente: 1, remocao_storage_mais_antiga: '2026-11-01T12:00:00Z',
    },
  }), {}, {}, {});
  const porTipo = Object.fromEntries(inv.alertas.map((a) => [a.tipo, a.detalhe]));
  assert.match(porTipo.fila_notificacao_travada[0], /^2 entrega/);
  assert.deepEqual(porTipo.fila_notificacao_com_erro, ['smtp_timeout: 2']); // 'sem_codigo' não é erro nomeado
  assert.match(porTipo.remocao_storage_atrasada[0], /2026-11-01T12:00:00Z/);
  assert.ok(LIMIARES.remocaoStorageHoras > 0);
});

test('montarInventario alerta cron falhando, cron mudo e histórico sem limpeza', () => {
  const inv = montarInventario(resposta({
    cron: {
      disponivel: true,
      jobs: [
        { nome: 'retencao', agenda: '*/5 * * * *', ativo: true, taxa_falha_7d_pct: 40, execucoes_24h: 10 },
        { nome: 'fila', agenda: '0 3 * * *', ativo: true, taxa_falha_7d_pct: 0, execucoes_24h: 0 },
      ],
      horas_paradas_7d: [{ hora: '2026-11-07T03:00Z', execucoes: 2, falhas: 2 }],
      historico: { linhas: 90000, mais_de_7_dias: 60000 },
    },
  }), {}, {}, {});
  const porTipo = Object.fromEntries(inv.alertas.map((a) => [a.tipo, a.detalhe]));
  assert.deepEqual(porTipo.cron_falhando, ['retencao (40% em 7d)']);
  assert.deepEqual(porTipo.cron_sem_execucao, ['fila']);
  assert.deepEqual(porTipo.cron_parado, ['2026-11-07T03:00Z']);
  assert.ok(porTipo.historico_cron_sem_limpeza);
});

test('rodaTodoDia reconhece agenda diária e descarta agenda semanal', () => {
  assert.equal(rodaTodoDia('*/5 * * * *'), true);
  assert.equal(rodaTodoDia('0 3 * * *'), true);
  assert.equal(rodaTodoDia('30 seconds'), true);
  assert.equal(rodaTodoDia('0 3 * * 1'), false);
  assert.equal(rodaTodoDia(''), false);
});

test('cruzarRpcs separa função exposta sem chamada de chamada sem função', () => {
  const r = cruzarRpcs(resposta().funcoes, { get_my_quote_requests: { src: 2, api: 0 }, funcao_que_nao_existe: { src: 1, api: 0 } });
  assert.deepEqual(r.sem_chamada, []);
  assert.deepEqual(r.sem_funcao, ['funcao_que_nao_existe']);
  const semUso = cruzarRpcs(resposta().funcoes, {});
  assert.deepEqual(semUso.sem_chamada, ['get_my_quote_requests']); // interna_sem_grant não é exposta
});

test('montarInventario promove as divergências de RPC a alerta', () => {
  const inv = montarInventario(resposta(), {}, {}, { nao_existe: { src: 1, api: 0 } });
  const tipos = inv.alertas.map((a) => a.tipo);
  assert.ok(tipos.includes('rpc_chamada_sem_funcao_no_banco'));
  assert.ok(tipos.includes('rpc_exposta_sem_chamada_no_codigo'));
  assert.deepEqual(inv.rpcs.sem_funcao, ['nao_existe']);
});

test('contarUsoNoCodigo conta .from() por pasta e ignora storage.from e teste', () => {
  const dir = pastaTemporaria('inv-uso-');
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'api'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/a.ts'), "db.from('quote_requests'); storage.from('quote_requests');");
  fs.writeFileSync(path.join(dir, 'api/b.ts'), "fetch('/rest/v1/quote_requests');");
  fs.writeFileSync(path.join(dir, 'src/a.test.ts'), "db.from('quote_requests');");
  assert.deepEqual(contarUsoNoCodigo(dir, ['quote_requests']), { quote_requests: { src: 1, api: 1 } });
});

test('contarRpcNoCodigo conta .rpc() por pasta e ignora teste', () => {
  const dir = pastaTemporaria('inv-rpc-');
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'shared'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/a.ts'), "c.rpc('save_my_selection'); c.rpc('save_my_selection');");
  fs.writeFileSync(path.join(dir, 'shared/b.ts'), "c.rpc('list_my_selections');");
  fs.writeFileSync(path.join(dir, 'src/a.spec.ts'), "c.rpc('nunca_contada');");
  const uso = contarRpcNoCodigo(dir);
  assert.deepEqual(uso.save_my_selection, { src: 2, api: 0 });
  assert.deepEqual(uso.list_my_selections, { src: 0, api: 1 });
  assert.equal(uso.nunca_contada, undefined);
});

test('PARECE_CREDENCIAL pega token, JWT e chave de serviço', () => {
  assert.ok(PARECE_CREDENCIAL.test('Authorization: Bearer abcdefghijklmnopqrstuvwxyz'));
  assert.ok(PARECE_CREDENCIAL.test('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig'));
  assert.ok(PARECE_CREDENCIAL.test('sb_secret_xyz'));
  assert.ok(!PARECE_CREDENCIAL.test('quote_requests'));
});

test('o projeto do site e o catálogo canônico são refs diferentes e conhecidos', () => {
  assert.equal(PROJETO_SITE, 'xlzmclcjdncjfdrjxclt');
  assert.equal(PROJETO_CATALOGO_CANONICO, 'doufsxqlfjyuvxuezpln');
});

test('as tabelas e as migrations saem das migrations reais do repo', () => {
  const tabelas = tabelasDasMigrations(RAIZ);
  assert.ok(tabelas.includes('quote_requests'), 'quote_requests deveria estar nas migrations');
  assert.ok(tabelas.includes('notification_deliveries'));
  // 'CREATE TABLE AS' aparece como texto em 20260922140000_reconcile_schema_drift.sql.
  assert.ok(!tabelas.some((t) => t.toLowerCase() === 'as'), 'palavra-chave não é tabela');
  assert.ok(versoesDoRepo(RAIZ).every((v) => /^\d{14}$/.test(v)));
});

test('semCarimbos ignora data e telemetria, mas enxerga mudança estrutural', () => {
  const antes = JSON.stringify(resposta());
  const soData = JSON.stringify(resposta({ medido_em: '2026-12-01T00:00:00Z' }));
  assert.equal(semCarimbos(antes), semCarimbos(soData));
  const soFila = JSON.stringify(resposta({
    fila: { ...resposta().fila, notificacao_por_status: { pending: 99 }, notificacao_vencidas: 7 },
  }));
  assert.equal(semCarimbos(antes), semCarimbos(soFila));
  const estrutural = JSON.stringify(resposta({ tabelas: resposta().tabelas.slice(1) }));
  assert.notEqual(semCarimbos(antes), semCarimbos(estrutural));
});

test('semCarimbos normaliza o texto dos alertas de telemetria', () => {
  const com = (pct, n) => JSON.stringify({
    alertas: [
      { tipo: 'cron_falhando', detalhe: [`retencao (${pct}% em 7d)`] },
      { tipo: 'fila_notificacao_travada', detalhe: [`${n} entrega(s) com next_attempt_at vencido ha mais de 15 min`] },
      { tipo: 'fila_notificacao_com_erro', detalhe: [`smtp_timeout: ${n}`] },
    ],
  });
  assert.equal(semCarimbos(com(9, 1)), semCarimbos(com(40, 12)));
  const outroCodigo = JSON.stringify({ alertas: [{ tipo: 'fila_notificacao_com_erro', detalhe: ['dns_falhou: 1'] }] });
  assert.notEqual(semCarimbos(outroCodigo), semCarimbos(com(9, 1)));
});

test('mudou trata arquivo novo e apagado como mudança', () => {
  const texto = JSON.stringify(resposta());
  assert.equal(mudou(['a.json'], () => null, () => texto), true);
  assert.equal(mudou(['a.json'], () => texto, () => null), true);
  assert.equal(mudou(['a.json'], () => texto, () => texto), false);
});

test('salvarInventario lança se o texto contém credencial', () => {
  assert.throws(
    () => salvarInventario('Bearer abcdefghijklmnopqrstuvwxyz01234567890', '/tmp/inventario-test-nao-criar.json'),
    /credencial/,
  );
  assert.throws(
    () => salvarInventario('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig', '/tmp/inventario-test-nao-criar.json'),
    /credencial/,
  );
});

test('extrairInventario lança erro diagnóstico para envelope MCP sem campo text', () => {
  assert.throws(
    () => extrairInventario({ result: { content: [{ type: 'tool_result', data: 'algo' }] } }),
    /envelope MCP inesperado/,
  );
  assert.throws(
    () => extrairInventario({ content: [{ type: 'image', url: 'data:...' }] }),
    /envelope MCP inesperado/,
  );
});

// ---------------------------------------------------------------------------------------------
// Regressões: resposta parcial, PII, alvo ambíguo, segredo em erro, escrita atômica e CLI.
// ---------------------------------------------------------------------------------------------

test('extrairInventario recusa seção faltando ou malformada em vez de publicar "não existe"', () => {
  const malformadas = [
    { cron: {} }, { cron: null }, { cron: { jobs: [null], horas_paradas_7d: [], historico: {} } },
    { fila: null }, { fila: { notificacao_por_status: {}, notificacao_erros_7d: {} } },
    { funcoes: {} }, { funcoes: [{ esquema: 'public' }] },
    { resumo: null }, { medido_em: 12345 }, { medido_em: 'ontem' },
    { tabelas: [null] }, { tabelas: [{ linhas: 0 }] },
    { tabelas: [{ nome: 't', rls: true, policies: 0, linhas: null, citada_no_banco: false }] },
  ];
  for (const extra of malformadas) {
    assert.throws(() => extrairInventario(resposta(extra)), /secao faltando ou malformada/, JSON.stringify(extra));
  }
  for (const naoObjeto of [42, 'null', { rows: [] }, []]) {
    assert.throws(() => extrairInventario(naoObjeto), /entrada sem as chaves/, JSON.stringify(naoObjeto));
  }
});

test('extrairInventario dá erro acionável para entrada que não é JSON, sem ecoar o conteúdo', () => {
  for (const texto of ['', '<html>gateway SEGREDO</html>', '[{"inventario":{"format_version":1,"medido_em":"2026']) {
    assert.throws(() => extrairInventario(texto), (erro) => /nao e JSON valido/.test(erro.message) && !/SEGREDO|html|2026/.test(erro.message));
  }
  assert.throws(
    () => extrairInventario({ content: [{ type: 'text', text: 'Below is the result <untrusted-data>' }] }),
    /nao e JSON valido/,
  );
  // BOM e CRLF de arquivo salvo no Windows não atrapalham.
  assert.equal(extrairInventario(`\ufeff${JSON.stringify({ rows: [{ inventario: resposta() }] }).replace(/,/g, ',\r\n')}\r\n`).format_version, 1);
});

test('extrairInventario recusa resposta lida por papel sujeito a RLS (contagens seriam 0 falsos)', () => {
  const sobRls = resposta({ resumo: { ...resposta().resumo, leitura_filtrada_por_rls: 23 } });
  assert.throws(() => extrairInventario(sobRls), /sujeito a RLS em 23/);
  const semRls = resposta({ resumo: { ...resposta().resumo, leitura_filtrada_por_rls: 0 } });
  assert.equal(extrairInventario(semRls).format_version, 1);
});

test('conferirOrigem distingue banco sem ledger de migrations', () => {
  const tabelas = ['quote_requests', 'contact_requests', 'admin_ddl_log'];
  assert.throws(
    () => conferirOrigem(resposta({ resumo: { ledger_registros: 0, ledger_versao_max: null } }), tabelas, VERSOES_OK),
    /nao tem ledger de migrations/,
  );
});

test('montarInventario não publica texto livre de last_error_code (pode citar destinatário)', () => {
  const inv = montarInventario(resposta({
    fila: {
      ...resposta().fila,
      notificacao_erros_7d: {
        'Falha ao enviar para maria.silva@cliente.com.br (+55 11 99999-0000)': 2,
        'fetch failed': 1, 5511999990000: 1, smtp_timeout: 4, 'resend.http_422': 1, sem_codigo: 3,
      },
    },
  }), {}, {}, {});
  assert.deepEqual(inv.fila.notificacao_erros_7d, { fora_do_padrao: 4, 'resend.http_422': 1, sem_codigo: 3, smtp_timeout: 4 });
  assert.deepEqual(
    inv.alertas.find((a) => a.tipo === 'fila_notificacao_com_erro').detalhe,
    ['fora_do_padrao: 4', 'resend.http_422: 1', 'smtp_timeout: 4'],
  );
  assert.doesNotMatch(JSON.stringify(inv), /maria|cliente\.com|99999|fetch failed/);
  assert.ok(CODIGO_DE_ERRO.test('email_provider_not_configured'));
  assert.ok(!CODIGO_DE_ERRO.test('a'.repeat(81)));
});

test('montarInventario ordena códigos de erro por caractere, igual em qualquer locale', () => {
  const inv = montarInventario(resposta({
    fila: { ...resposta().fila, notificacao_erros_7d: { a_1: 1, a1: 1, Z9: 1 } },
  }), {}, {}, {});
  assert.deepEqual(inv.alertas.find((a) => a.tipo === 'fila_notificacao_com_erro').detalhe, ['Z9: 1', 'a1: 1', 'a_1: 1']);
});

test('montarInventario alerta entrega esgotada e não chama estado final de fila travada', () => {
  const inv = montarInventario(resposta({
    fila: { ...resposta().fila, notificacao_vencidas: 0, notificacao_por_status: { exhausted: 2, cancelled: 1, sent: 9 } },
  }), {}, {}, {});
  const porTipo = Object.fromEntries(inv.alertas.map((a) => [a.tipo, a.detalhe]));
  assert.match(porTipo.fila_notificacao_esgotada[0], /^2 entrega/);
  assert.equal(porTipo.fila_notificacao_travada, undefined);
});

test('montarInventario dá nome ao job do pg_cron que não tem nome', () => {
  const inv = montarInventario(resposta({
    cron: {
      disponivel: true,
      jobs: [
        { nome: null, agenda: '*/5 * * * *', ativo: true, taxa_falha_7d_pct: 100, execucoes_24h: 3 },
        { nome: null, agenda: '0 3 * * *', ativo: true, taxa_falha_7d_pct: 0, execucoes_24h: 0 },
      ],
      horas_paradas_7d: [], historico: { linhas: 0, mais_de_7_dias: 0 },
    },
  }), {}, {}, {});
  const porTipo = Object.fromEntries(inv.alertas.map((a) => [a.tipo, a.detalhe]));
  assert.deepEqual(porTipo.cron_falhando, ['(job sem nome) (100% em 7d)']);
  assert.deepEqual(porTipo.cron_sem_execucao, ['(job sem nome)']);
});

test('nome de tabela ou função igual a propriedade herdada de objeto não corrompe a contagem', () => {
  const dado = resposta({
    tabelas: [{ nome: 'constructor', esquema: 'public', rls: true, policies: 1, linhas: 0, citada_no_banco: false }],
    funcoes: [
      { nome: 'constructor', esquema: 'public', executa_anon: true, executa_authenticated: true },
      { nome: 'dup', esquema: 'public', executa_anon: true, executa_authenticated: true },
      { nome: 'dup', esquema: 'public', executa_anon: true, executa_authenticated: true },
    ],
  });
  const inv = montarInventario(dado, {}, {}, {});
  assert.deepEqual(inv.tabelas[0].uso_no_codigo, { api: 0, src: 0 });
  assert.deepEqual(inv.tabelas_orfas.lista, ['constructor']);
  assert.deepEqual(inv.funcoes[0].chamadas_no_codigo, { api: 0, src: 0 });
  assert.deepEqual(inv.rpcs.sem_chamada, ['constructor', 'dup']); // sobrecarga não duplica o nome

  const dir = pastaTemporaria('inv-proto-');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src/a.ts'), "db.from('constructor'); db.from('toString'); c.rpc('constructor'); c.rpc('__proto__');");
  assert.deepEqual(contarUsoNoCodigo(dir, ['quote_requests']), { quote_requests: { src: 0, api: 0 } });
  const rpcs = contarRpcNoCodigo(dir);
  assert.deepEqual(rpcs.constructor, { src: 1, api: 0 });
  assert.deepEqual(Object.keys(rpcs).sort(), ['__proto__', 'constructor']);
  assert.equal({}.src, undefined, 'Object.prototype não pode ser tocado');
});

test('contarRpcNoCodigo conta a chamada direta ao PostgREST (/rest/v1/rpc/nome) das funções serverless', () => {
  const dir = pastaTemporaria('inv-rest-');
  fs.mkdirSync(path.join(dir, 'api/_lib'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'api/a.ts'), [
    'await fetch(`${config.url}/rest/v1/rpc/get_my_proposal_document`, {});',
    'await fetch(`${config.url}/rest/v1/rpc/${name}`, {});',
    'await fetch(`${config.url}/rest/v1/rpc/prefixo_${sufixo}`, {});',
    "await fetch(base + '/rest/v1/rpc/preflight_site_lead_request');",
  ].join('\n'));
  fs.writeFileSync(path.join(dir, 'api/_lib/a.test.ts'), 'fetch(`/rest/v1/rpc/so_no_teste`);');
  assert.deepEqual(contarRpcNoCodigo(dir), {
    get_my_proposal_document: { src: 0, api: 1 },
    preflight_site_lead_request: { src: 0, api: 1 },
  });
  // No repo de verdade: função chamada por api/customer-proposals.ts não pode sair como "sem chamada".
  assert.ok(contarRpcNoCodigo(RAIZ).get_my_proposal_document?.api >= 1);
});

test('PARECE_CREDENCIAL pega também token pessoal do Supabase e URL de banco com senha', () => {
  assert.ok(PARECE_CREDENCIAL.test(TOKEN_FALSO));
  assert.ok(PARECE_CREDENCIAL.test('postgresql://postgres.abc:s3nha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'));
  assert.ok(!PARECE_CREDENCIAL.test('postgres 17.6'));
  assert.ok(!PARECE_CREDENCIAL.test('sbp_curto'));
});

test('salvarInventario grava de forma atômica e recusa o próprio token do ambiente', async () => {
  const dir = pastaTemporaria('inv-salvar-');
  const saida = path.join(dir, 'sub pasta', 'banco.json');
  salvarInventario('{"a":1}\n', saida);
  salvarInventario('{"a":2}\n', saida);
  assert.equal(fs.readFileSync(saida, 'utf8'), '{"a":2}\n');
  assert.deepEqual(fs.readdirSync(path.dirname(saida)), ['banco.json'], 'sem arquivo temporário sobrando');

  // Falha no meio (destino é um diretório): nada fica pela metade nem sobra temporário.
  const ocupado = path.join(dir, 'ocupado');
  fs.mkdirSync(ocupado);
  assert.throws(() => salvarInventario('{"a":3}\n', ocupado));
  assert.deepEqual(fs.readdirSync(dir).sort(), ['ocupado', 'sub pasta']);

  await comAmbiente({ SUPABASE_ACCESS_TOKEN: 'segredo-sem-padrao-conhecido' }, () => {
    assert.throws(() => salvarInventario('{"x":"segredo-sem-padrao-conhecido"}', saida), /credencial/);
  });
  assert.equal(fs.readFileSync(saida, 'utf8'), '{"a":2}\n');
});

test('lerArgumentos aceita --entrada/--saida/--help e recusa o que não conhece', () => {
  assert.deepEqual(
    { ...lerArgumentos(['--entrada', 'a.json', '--saida=b.json']), ajuda: undefined },
    { entrada: 'a.json', saida: 'b.json', ajuda: undefined },
  );
  assert.equal(lerArgumentos(['-h']).ajuda, true);
  assert.equal(lerArgumentos([]).entrada, null);
  assert.match(lerArgumentos([]).saida, /inventario[\\/]estado[\\/]banco\.json$/);
  assert.throws(() => lerArgumentos(['--entrda', 'a.json']), /argumento desconhecido: --entrda/);
  assert.throws(() => lerArgumentos(['a.json']), /argumento desconhecido/);
  assert.throws(() => lerArgumentos(['--entrada']), /--entrada exige/);
  assert.throws(() => lerArgumentos(['--entrada', '--saida', 'b.json']), /--entrada exige/);
  assert.throws(() => lerArgumentos(['--entrada=']), /--entrada exige/);
  assert.throws(() => lerArgumentos(['--saida']), /--saida exige/);
});

const AMBIENTE_PADRAO = {
  SUPABASE_ACCESS_TOKEN: TOKEN_FALSO, SUPABASE_PROJECT_REF: undefined,
  SUPABASE_API_URL: undefined, INVENTARIO_PERMITIR_OUTRO_PROJETO: undefined,
};
const respostaHttp = (status, corpo) => new Response(corpo, { status });

test('consultarApi consulta só o projeto do site, pelo endpoint somente leitura', async () => {
  const chamadas = [];
  const dado = await comAmbiente(AMBIENTE_PADRAO, () => consultarApi('/database/query/read-only', { query: 'select 1' }, {
    fetchImpl: async (url, init) => { chamadas.push({ url, init }); return respostaHttp(201, '[{"inventario":{"ok":true}}]'); },
  }));
  assert.deepEqual(dado, [{ inventario: { ok: true } }]);
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, `https://api.supabase.com/v1/projects/${PROJETO_SITE}/database/query/read-only`);
  assert.equal(chamadas[0].init.method, 'POST');
  assert.equal(chamadas[0].init.headers.Authorization, `Bearer ${TOKEN_FALSO}`);
  assert.deepEqual(JSON.parse(chamadas[0].init.body), { query: 'select 1' });
  assert.ok(chamadas[0].init.signal instanceof AbortSignal, 'toda chamada tem timeout');
});

test('consultarApi falha fechado, sem nenhuma requisição, quando o alvo é ambíguo ou proibido', async () => {
  const casos = [
    [{ SUPABASE_PROJECT_REF: PROJETO_CATALOGO_CANONICO, INVENTARIO_PERMITIR_OUTRO_PROJETO: '1' }, /catalogo canonico/],
    [{ SUPABASE_PROJECT_REF: PROJETO_CATALOGO_CANONICO.toUpperCase(), INVENTARIO_PERMITIR_OUTRO_PROJETO: '1' }, /catalogo canonico/],
    [{ SUPABASE_PROJECT_REF: ` ${PROJETO_CATALOGO_CANONICO}\n`, INVENTARIO_PERMITIR_OUTRO_PROJETO: '1' }, /catalogo canonico/],
    [{ SUPABASE_PROJECT_REF: `${PROJETO_CATALOGO_CANONICO}\u200b`, INVENTARIO_PERMITIR_OUTRO_PROJETO: '1' }, /formato de ref/],
    [{ SUPABASE_PROJECT_REF: `${PROJETO_SITE}/../${PROJETO_CATALOGO_CANONICO}`, INVENTARIO_PERMITIR_OUTRO_PROJETO: '1' }, /formato de ref/],
    [{ SUPABASE_PROJECT_REF: '   ', INVENTARIO_PERMITIR_OUTRO_PROJETO: '1' }, /formato de ref/],
    [{ SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst' }, /nao e o banco do site/],
    [{ SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst', INVENTARIO_PERMITIR_OUTRO_PROJETO: 'true' }, /nao e o banco do site/],
    [{ SUPABASE_API_URL: 'https://evil.example.com' }, /so e enviado a api\.supabase\.com/],
    [{ SUPABASE_API_URL: 'http://api.supabase.com' }, /so e enviado a api\.supabase\.com/],
    [{ SUPABASE_API_URL: 'https://api.supabase.com.evil.example' }, /so e enviado a api\.supabase\.com/],
    [{ SUPABASE_API_URL: 'nao e url' }, /nao e uma URL valida/],
    [{ SUPABASE_ACCESS_TOKEN: undefined }, /SUPABASE_ACCESS_TOKEN ausente/],
    [{ SUPABASE_ACCESS_TOKEN: '   ' }, /SUPABASE_ACCESS_TOKEN ausente/],
  ];
  for (const [variaveis, esperado] of casos) {
    let chamadas = 0;
    await comAmbiente({ ...AMBIENTE_PADRAO, ...variaveis }, () => assert.rejects(
      consultarApi('/database/query/read-only', {}, { fetchImpl: async () => { chamadas += 1; return respostaHttp(200, '[]'); } }),
      esperado,
      JSON.stringify(variaveis),
    ));
    assert.equal(chamadas, 0, `nenhuma requisição com ${JSON.stringify(variaveis)}`);
  }
  // Outro projeto só com a liberação explícita, e nunca o canônico.
  const urls = [];
  await comAmbiente({ ...AMBIENTE_PADRAO, SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst', INVENTARIO_PERMITIR_OUTRO_PROJETO: '1', SUPABASE_API_URL: 'http://127.0.0.1:1/' },
    () => consultarApi('/x', {}, { fetchImpl: async (url) => { urls.push(url); return respostaHttp(200, '[]'); } }));
  assert.deepEqual(urls, ['http://127.0.0.1:1/v1/projects/abcdefghijklmnopqrst/x']);
});

test('consultarApi nunca deixa o token aparecer na mensagem de erro', async () => {
  for (const token of ['sbp_PARTE_UM\nSEGUNDA_LINHA_SECRETA', 'sbp_com espaco_SECRETO', 'sbp_açento_SECRETO']) {
    let chamadas = 0;
    await comAmbiente({ ...AMBIENTE_PADRAO, SUPABASE_ACCESS_TOKEN: token }, () => assert.rejects(
      consultarApi('/database/query/read-only', {}, { fetchImpl: async () => { chamadas += 1; return respostaHttp(200, '[]'); } }),
      (erro) => /SUPABASE_ACCESS_TOKEN tem espaco/.test(erro.message) && !/SECRET|sbp_/.test(erro.message),
    ));
    assert.equal(chamadas, 0);
  }
  // Corpo de erro que ecoa o cabeçalho não é repassado.
  await comAmbiente(AMBIENTE_PADRAO, () => assert.rejects(
    consultarApi('/database/query/read-only', {}, {
      fetchImpl: async (_url, init) => respostaHttp(401, JSON.stringify({ message: `eco ${init.headers.Authorization}` })),
    }),
    (erro) => /HTTP 401 \(SUPABASE_ACCESS_TOKEN invalido ou expirado\)/.test(erro.message) && !erro.message.includes(TOKEN_FALSO),
  ));
});

test('consultarApi repete só o que é transitório e desiste com mensagem acionável', async () => {
  const rodar = (respostas, opcoes = {}) => {
    const fila = [...respostas];
    const esperas = [];
    let chamadas = 0;
    const promessa = comAmbiente(AMBIENTE_PADRAO, () => consultarApi('/database/query/read-only', {}, {
      fetchImpl: async () => { chamadas += 1; const r = fila.shift(); if (r instanceof Error) throw r; return r; },
      esperar: async (ms) => { esperas.push(ms); },
      ...opcoes,
    }));
    return { promessa, esperas, chamadas: () => chamadas };
  };
  const rede = Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }) });
  const tempo = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });

  const recupera = rodar([respostaHttp(503, '{}'), rede, respostaHttp(200, '[{"inventario":1}]')]);
  assert.deepEqual(await recupera.promessa, [{ inventario: 1 }]);
  assert.equal(recupera.chamadas(), 3);
  assert.equal(recupera.esperas.length, 2);

  for (const status of [400, 401, 403, 404]) {
    const definitivo = rodar([respostaHttp(status, '{"message":"detalhe interno"}'), respostaHttp(200, '[]')]);
    await assert.rejects(definitivo.promessa, (erro) => new RegExp(`HTTP ${status}`).test(erro.message) && !/detalhe interno/.test(erro.message));
    assert.equal(definitivo.chamadas(), 1, `HTTP ${status} não se repete`);
  }

  const semRede = rodar([rede, rede, rede, respostaHttp(200, '[]')]);
  await assert.rejects(semRede.promessa, /falha de rede \(ECONNREFUSED\) em 3 tentativas/);
  assert.equal(semRede.chamadas(), 3);

  const lento = rodar([tempo, tempo, tempo], { timeoutMs: 5000 });
  await assert.rejects(lento.promessa, /sem resposta em 5 s em 3 tentativas/);

  const sempre429 = rodar([respostaHttp(429, ''), respostaHttp(429, ''), respostaHttp(429, '')]);
  await assert.rejects(sempre429.promessa, /HTTP 429 em 3 tentativas/);

  for (const corpo of ['<html>gateway SEGREDO</html>', '[{"inventario":{"format_version":1,"medido_em":"2026', '']) {
    const naoJson = rodar([respostaHttp(200, corpo), respostaHttp(200, '[]')]);
    await assert.rejects(naoJson.promessa, (erro) => /corpo que nao e JSON/.test(erro.message) && !/SEGREDO|html/.test(erro.message));
    assert.equal(naoJson.chamadas(), 1);
  }
});

test('consultarApi aborta de verdade a requisição que não responde', async () => {
  const servidor = http.createServer(() => { /* nunca responde */ });
  await new Promise((resolve) => { servidor.listen(0, '127.0.0.1', resolve); });
  try {
    const inicio = Date.now();
    await comAmbiente({ ...AMBIENTE_PADRAO, SUPABASE_API_URL: `http://127.0.0.1:${servidor.address().port}` }, () => assert.rejects(
      consultarApi('/database/query/read-only', {}, { timeoutMs: 150, esperar: async () => {} }),
      /sem resposta em 0 s em 3 tentativas/,
    ));
    assert.ok(Date.now() - inicio < 5000);
  } finally {
    servidor.closeAllConnections();
    servidor.close();
  }
});

// ------------------------------------- CLI: gerar-banco.mjs -------------------------------------

test('CLI gerar-banco: --help não consulta nada e argumento errado sai com 2', () => {
  // Com token no ambiente e a API apontada para uma porta fechada: se tentasse consultar, falharia.
  const env = { SUPABASE_ACCESS_TOKEN: TOKEN_FALSO, SUPABASE_API_URL: 'http://127.0.0.1:1' };
  for (const flag of ['--help', '-h']) {
    const ajuda = rodarCli(GERAR, [flag], { env });
    assert.equal(ajuda.status, 0, ajuda.stderr);
    assert.match(ajuda.stdout, /^Uso: node scripts\/inventario\/gerar-banco\.mjs/);
    assert.equal(ajuda.stderr, '');
  }
  for (const args of [['--entrda', 'x.json'], ['x.json'], ['--entrada'], ['--saida']]) {
    const errado = rodarCli(GERAR, args, { env });
    assert.equal(errado.status, 2, args.join(' '));
    assert.equal(errado.stdout, '');
    assert.match(errado.stderr, /^ERRO: /);
  }
  const semNada = rodarCli(GERAR, []);
  assert.equal(semNada.status, 2);
  assert.match(semNada.stderr, /sem --entrada e sem SUPABASE_ACCESS_TOKEN/);
});

test('CLI gerar-banco: --entrada grava o inventário em --saida, igual a cada execução', () => {
  const dir = pastaTemporaria('inv cli ');
  const entrada = path.join(dir, 'resposta ação.json');
  const saida = path.join(dir, 'saida', 'banco.json');
  fs.writeFileSync(entrada, `\ufeff${JSON.stringify({ rows: [{ inventario: respostaDoSite() }] })}\r\n`);
  const primeira = rodarCli(GERAR, ['--entrada', entrada, `--saida=${saida}`], { cwd: dir });
  assert.equal(primeira.status, 0, primeira.stderr);
  assert.match(primeira.stdout, /^banco\.json: \d+ tabelas, 2 funcoes, 0 cron jobs, \d+ tabelas orfas, \d+ rpcs sem chamada, \d+ alertas \(medido_em 2026-11-08T12:00:00Z\)\.\n$/);
  const texto = fs.readFileSync(saida, 'utf8');
  const inventario = JSON.parse(texto);
  assert.equal(inventario.origem.tabelas_das_migrations_presentes, inventario.origem.tabelas_nas_migrations);
  assert.equal(inventario.origem.migrations_no_repo, versoesDoRepo(RAIZ).length);
  assert.ok(texto.endsWith('}\n') && !texto.includes('\r'));
  assert.deepEqual(Object.keys(inventario), Object.keys(inventario).toSorted(), 'chaves em ordem estável');
  assert.deepEqual(fs.readdirSync(path.dirname(saida)), ['banco.json']);

  const segunda = rodarCli(GERAR, ['--entrada', entrada, '--saida', saida]);
  assert.equal(segunda.status, 0, segunda.stderr);
  assert.equal(fs.readFileSync(saida, 'utf8'), texto, 'mesma entrada, mesmo arquivo byte a byte');
});

test('CLI gerar-banco: entrada ruim sai com 2 e não grava nem sobrescreve nada', () => {
  const dir = pastaTemporaria('inv-cli-ruim-');
  const saida = path.join(dir, 'banco.json');
  fs.writeFileSync(saida, 'INTACTO');
  const ruins = {
    'cron-vazio': respostaDoSite({ cron: {} }),
    'cron-null': respostaDoSite({ cron: null }),
    'fila-null': respostaDoSite({ fila: null }),
    'sob-rls': respostaDoSite({ resumo: { ...respostaDoSite().resumo, leitura_filtrada_por_rls: 21 } }),
    'banco-irmao': respostaDoSite({ tabelas: ['products', 'categories'].map((nome) => ({ nome, esquema: 'public', rls: true, policies: 1, linhas: 5, citada_no_banco: true })) }),
    'ledger-atrasado': respostaDoSite({ resumo: { ledger_registros: 3, ledger_versao_max: '20200101000000' } }),
    credencial: respostaDoSite({ funcoes: [{ nome: TOKEN_FALSO, esquema: 'public' }] }),
  };
  for (const [nome, dado] of Object.entries(ruins)) {
    const entrada = path.join(dir, `${nome}.json`);
    fs.writeFileSync(entrada, JSON.stringify(dado));
    const r = rodarCli(GERAR, ['--entrada', entrada, '--saida', saida]);
    assert.equal(r.status, 2, `${nome}: ${r.stdout}${r.stderr}`);
    assert.equal(r.stdout, '', nome);
    assert.match(r.stderr, /^ERRO: /, nome);
    assert.doesNotMatch(r.stderr, new RegExp(TOKEN_FALSO), nome);
    assert.equal(fs.readFileSync(saida, 'utf8'), 'INTACTO', nome);
  }
  for (const [nome, conteudo] of [['vazio', ''], ['html', '<html></html>'], ['truncado', JSON.stringify(respostaDoSite()).slice(0, 300)]]) {
    const entrada = path.join(dir, `${nome}.txt`);
    fs.writeFileSync(entrada, conteudo);
    const r = rodarCli(GERAR, ['--entrada', entrada, '--saida', saida]);
    assert.equal(r.status, 2, nome);
    assert.match(r.stderr, /nao e JSON valido/, nome);
  }
  assert.equal(rodarCli(GERAR, ['--entrada', path.join(dir, 'nao-existe.json'), '--saida', saida]).status, 2);
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')), []);
  assert.equal(fs.readFileSync(saida, 'utf8'), 'INTACTO');
});

test('CLI gerar-banco: com token, manda o banco.sql ao endpoint somente leitura do projeto do site', async () => {
  const pedidos = [];
  let modo = 'ok';
  const servidor = http.createServer((req, res) => {
    let corpo = '';
    req.on('data', (parte) => { corpo += parte; });
    req.on('end', () => {
      pedidos.push({ metodo: req.method, url: req.url, auth: req.headers.authorization, corpo });
      if (modo === '401') {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ message: `token ${req.headers.authorization} recusado` }));
        return;
      }
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify([{ inventario: respostaDoSite() }]));
    });
  });
  await new Promise((resolve) => { servidor.listen(0, '127.0.0.1', resolve); });
  const dir = pastaTemporaria('inv-cli-api-');
  const saida = path.join(dir, 'banco.json');
  const cli = (env) => new Promise((resolve) => {
    execFile(process.execPath, [GERAR, '--saida', saida], { env: ambienteDoCli(env), encoding: 'utf8' },
      (erro, stdout, stderr) => resolve({ status: erro ? erro.code : 0, stdout, stderr }));
  });
  try {
    const base = { SUPABASE_API_URL: `http://127.0.0.1:${servidor.address().port}/`, SUPABASE_ACCESS_TOKEN: ` ${TOKEN_FALSO}\n` };
    const ok = await cli(base);
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(pedidos.length, 1);
    assert.equal(pedidos[0].metodo, 'POST');
    assert.equal(pedidos[0].url, `/v1/projects/${PROJETO_SITE}/database/query/read-only`);
    assert.equal(pedidos[0].auth, `Bearer ${TOKEN_FALSO}`);
    assert.deepEqual(JSON.parse(pedidos[0].corpo), { query: SQL });
    assert.equal(JSON.parse(fs.readFileSync(saida, 'utf8')).format_version, 1);
    assert.doesNotMatch(fs.readFileSync(saida, 'utf8') + ok.stdout + ok.stderr, new RegExp(TOKEN_FALSO));

    fs.rmSync(saida);
    modo = '401';
    const recusado = await cli(base);
    assert.equal(recusado.status, 2);
    assert.match(recusado.stderr, /^ERRO: Management API \/database\/query\/read-only respondeu HTTP 401/);
    assert.doesNotMatch(recusado.stdout + recusado.stderr, new RegExp(TOKEN_FALSO));
    assert.equal(fs.existsSync(saida), false);

    const antes = pedidos.length;
    const canonico = await cli({ ...base, SUPABASE_PROJECT_REF: PROJETO_CATALOGO_CANONICO.toUpperCase(), INVENTARIO_PERMITIR_OUTRO_PROJETO: '1' });
    assert.equal(canonico.status, 2);
    assert.match(canonico.stderr, /catalogo canonico/);
    const tokenQuebrado = await cli({ ...base, SUPABASE_ACCESS_TOKEN: `${TOKEN_FALSO}\nSEGUNDA_LINHA_SECRETA` });
    assert.equal(tokenQuebrado.status, 2);
    assert.doesNotMatch(tokenQuebrado.stdout + tokenQuebrado.stderr, /SEGUNDA_LINHA_SECRETA|sbp_/);
    assert.equal(pedidos.length, antes, 'nenhuma requisição nos dois casos recusados');
  } finally {
    servidor.closeAllConnections();
    servidor.close();
  }
});

// ---------------------------------------- banco.sql (estático) ----------------------------------

/** O SQL sem os comentários `--` (o conteúdo de string e de bloco $x$ fica: também é executado). */
const SQL_SEM_COMENTARIO = SQL.split('\n').map((linha) => linha.replace(/--.*$/, '')).join('\n');

test('banco.sql é uma consulta só, somente leitura, sem nenhum comando de escrita', () => {
  assert.equal(SQL_SEM_COMENTARIO.trim().split(';').filter((parte) => parte.trim()).length, 1, 'um único statement');
  assert.match(SQL_SEM_COMENTARIO.trim(), /^WITH\b[\s\S]*;$/);
  const proibidas = [
    'insert', 'update', 'delete', 'truncate', 'drop', 'alter', 'create', 'grant', 'revoke', 'copy', 'call', 'do',
    'merge', 'vacuum', 'analyze', 'reindex', 'cluster', 'lock', 'set', 'reset', 'prepare', 'deallocate', 'listen',
    'notify', 'comment', 'refresh', 'into', 'begin', 'commit', 'rollback', 'savepoint', 'load', 'import', 'security',
  ];
  for (const palavra of proibidas) {
    assert.doesNotMatch(SQL_SEM_COMENTARIO, new RegExp(`(^|[^a-z0-9_'])${palavra}([^a-z0-9_']|$)`, 'i'), `palavra proibida: ${palavra}`);
  }
  assert.doesNotMatch(SQL_SEM_COMENTARIO, /\bfor\s+(update|share|no\s+key|key\s+share)\b/i, 'sem trava de linha');
  // EXECUTE só como nome de privilégio em has_function_privilege(..., 'EXECUTE').
  const executes = SQL_SEM_COMENTARIO.match(/execute/gi) ?? [];
  assert.equal(executes.length, (SQL_SEM_COMENTARIO.match(/has_function_privilege\('[a-z]+', p\.oid, 'EXECUTE'\)/g) ?? []).length);
});

test('banco.sql só chama função de leitura conhecida (função nova entra na lista de propósito)', () => {
  const permitidas = new Set([
    // agregação, texto, data e JSON
    'count', 'sum', 'max', 'min', 'round', 'coalesce', 'unnest', 'format', 'replace', 'regexp_replace',
    'regexp_matches', 'encode', 'decode', 'convert_to', 'convert_from', 'to_char', 'date_trunc', 'extract', 'now',
    'jsonb_build_object', 'jsonb_agg', 'jsonb_object_agg', 'jsonb_array_length', 'jsonb_array_elements',
    // catálogo e introspecção (somente leitura)
    'pg_total_relation_size', 'pg_database_size', 'pg_get_viewdef', 'pg_get_function_identity_arguments',
    'current_setting', 'current_database', 'to_regclass', 'has_function_privilege', 'row_security_active',
    // texto dinâmico: só para objeto opcional (pg_cron, ledger) e count(*) por tabela
    'query_to_xml', 'xpath',
    // palavras-chave seguidas de parêntese
    'in', 'exists', 'filter', 'as', 'and', 'or', 'not', 'when', 'then', 'else', 'from', 'select', 'by', 'on', 'where',
    'over', 'array', 'case', 'join', 'all', 'union', 'with',
  ]);
  // Regex e nomes de schema dentro de string não são chamada: tira strings simples antes de procurar.
  const semStrings = SQL_SEM_COMENTARIO.replace(/'(?:[^']|'')*'/g, "''");
  const chamadas = new Set([...semStrings.matchAll(/([a-z_][a-z0-9_]*)\s*\(/gi)].map((m) => m[1].toLowerCase()));
  const novas = [...chamadas].filter((nome) => !permitidas.has(nome)).sort();
  assert.deepEqual(novas, [], `função fora da lista de leitura: ${novas.join(', ')}`);
  // query_to_xml só executa texto fixo ou count(*) com identificador citado por %I.
  const dinamicos = [...SQL_SEM_COMENTARIO.matchAll(/query_to_xml\(\s*(\S+)/g)].map((m) => m[1]);
  assert.deepEqual(dinamicos, ["format('SELECT", '(SELECT', '$l$']);
  assert.match(SQL_SEM_COMENTARIO, /query_to_xml\(format\('SELECT count\(\*\) AS n FROM %I\.%I', b\.esquema, b\.nome\),/);
});

test('banco.sql não lê linha de lead: fila só em contagem, e o comando do pg_cron nunca sai inteiro', () => {
  const tabelasLidas = [...SQL_SEM_COMENTARIO.matchAll(/\bFROM\s+(site_private\.[a-z_]+|cron\.[a-z_]+|supabase_migrations\.[a-z_]+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(tabelasLidas)].sort(), [
    'cron.job', 'cron.job_run_details', 'site_private.notification_deliveries',
    'site_private.storage_deletion_queue', 'supabase_migrations.schema_migrations',
  ]);
  for (const coluna of ['email', 'phone', 'contact_name', 'recipient', 'payload', 'object_path', 'return_message', 'bounce_reason', 'provider_message_id']) {
    assert.doesNotMatch(SQL_SEM_COMENTARIO, new RegExp(`\\b${coluna}\\b`, 'i'), `coluna com dado de linha: ${coluna}`);
  }
  // j.command só entra em regexp_matches (nome de função chamada); last_error_code só passa pelo filtro de forma.
  assert.deepEqual(SQL_SEM_COMENTARIO.match(/j\.command/g), ['j.command']);
  assert.match(SQL_SEM_COMENTARIO, /FROM regexp_matches\(j\.command,/);
  assert.match(SQL_SEM_COMENTARIO, /WHEN last_error_code ~ '\^\[A-Za-z\]\[A-Za-z0-9_\.:-\]\{0,79\}\$' THEN last_error_code\s+ELSE 'fora_do_padrao'/);
  assert.equal(`^${CODIGO_DE_ERRO.source.slice(1)}`, SQL_SEM_COMENTARIO.match(/last_error_code ~ '([^']+)'/)[1], 'mesma forma de código no SQL e no JS');
});

test('banco.sql só chama de fila travada o que ainda vai ser tentado', () => {
  const vencidas = SQL_SEM_COMENTARIO.match(/'notificacao_vencidas', \(([\s\S]*?)\n {4}\),/)[1];
  assert.match(vencidas, /status IN \('pending', 'failed'\) AND next_attempt_at <= now\(\) - interval '15 minutes'/);
  assert.match(vencidas, /status = 'processing' AND lease_expires_at <= now\(\) - interval '15 minutes'/);
  assert.doesNotMatch(vencidas, /NOT IN/, 'estado final (cancelled, exhausted) não pode contar como travado');
});

test('banco.sql ordena toda lista com desempate', () => {
  const agregados = [...SQL_SEM_COMENTARIO.matchAll(/jsonb_(?:agg|object_agg)\(/g)].length;
  const ordenados = [...SQL_SEM_COMENTARIO.matchAll(/\bORDER BY\b/g)].length;
  assert.equal(ordenados, agregados, 'todo jsonb_agg/jsonb_object_agg tem ORDER BY');
  assert.match(SQL_SEM_COMENTARIO, /ORDER BY n\.nspname, p\.proname, pg_get_function_identity_arguments\(p\.oid\)/);
  assert.match(SQL_SEM_COMENTARIO, /ORDER BY coalesce\(j\.jobname, 'job_' \|\| j\.jobid\), j\.jobid/);
  assert.match(SQL_SEM_COMENTARIO, /ORDER BY t\.esquema, t\.nome/);
});

// --------------------------------------- mudou-conteudo.mjs --------------------------------------

test('semCarimbos trata o alerta de entrega esgotada e código de erro com ponto como telemetria', () => {
  const com = (n) => JSON.stringify({
    alertas: [
      { tipo: 'fila_notificacao_esgotada', detalhe: [`${n} entrega(s) em exhausted: tentativas esgotadas, a notificacao nunca saiu`] },
      { tipo: 'fila_notificacao_com_erro', detalhe: [`resend.http_422: ${n}`, `fora_do_padrao: ${n}`] },
    ],
  });
  assert.equal(semCarimbos(com(1)), semCarimbos(com(7)));
  const semAlerta = JSON.stringify({ alertas: [] });
  assert.notEqual(semCarimbos(com(1)), semCarimbos(semAlerta));
});

test('semCarimbos: espaço, EOL e ordem de chave não contam; ordem de lista e texto que não é JSON contam', () => {
  const dado = resposta();
  const compacto = JSON.stringify(dado);
  const windows = JSON.stringify(Object.fromEntries(Object.entries(dado).reverse()), null, '\t').replace(/\n/g, '\r\n');
  assert.equal(semCarimbos(compacto), semCarimbos(windows));
  assert.notEqual(semCarimbos(compacto), semCarimbos(JSON.stringify({ ...dado, tabelas: dado.tabelas.toReversed() })));
  assert.notEqual(semCarimbos(compacto), semCarimbos(compacto.slice(0, 200)), 'JSON truncado é mudança');
  assert.notEqual(semCarimbos(compacto), semCarimbos(`\ufeff${compacto}`), 'BOM é mudança (o gerador nunca grava BOM)');
  assert.equal(mudou(['a.json'], () => null, () => null), false, 'ausente dos dois lados não é mudança');
  assert.equal(mudou(['a.json', 'b.json'], () => compacto, (f) => (f === 'b.json' ? null : compacto)), true);
});

/** Repositório git descartável com uma cópia do script (a raiz dele sai do caminho do próprio script). */
function repositorioComInventario(conteudo) {
  const dir = pastaTemporaria('inv repo ');
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  git('init', '-q', '.');
  git('config', 'user.email', 'teste@example.invalid');
  git('config', 'user.name', 'teste');
  git('config', 'commit.gpgsign', 'false');
  fs.mkdirSync(path.join(dir, 'scripts/inventario'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'inventario/estado'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'sub pasta'));
  fs.copyFileSync(MUDOU, path.join(dir, 'scripts/inventario/mudou-conteudo.mjs'));
  const arquivo = path.join(dir, 'inventario/estado/banco.json');
  fs.writeFileSync(arquivo, conteudo);
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  const rodar = (args = [], opcoes = {}) => spawnSync(process.execPath, [path.join(dir, 'scripts/inventario/mudou-conteudo.mjs'), ...args], {
    encoding: 'utf8', cwd: opcoes.cwd ?? dir, env: opcoes.env ?? process.env,
  });
  return { dir, arquivo, git, rodar };
}

test('CLI mudou-conteudo: imprime só true/false e decide igual de qualquer pasta', () => {
  const base = resposta();
  const repo = repositorioComInventario(`${JSON.stringify(base, null, 2)}\n`);
  const decide = (opcoes) => {
    const r = repo.rodar([], opcoes);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^(true|false)\n$/);
    return r.stdout.trim();
  };
  assert.equal(decide(), 'false');
  fs.writeFileSync(repo.arquivo, JSON.stringify({ ...base, medido_em: '2030-01-01T00:00:00Z' }).replace(/,/g, ',\r\n'));
  assert.equal(decide(), 'false', 'só carimbo e formatação');
  assert.equal(decide({ cwd: path.join(repo.dir, 'sub pasta') }), 'false', 'rodando de subpasta');
  assert.equal(decide({ cwd: os.tmpdir() }), 'false', 'rodando de fora do repo');
  assert.equal(repo.rodar([repo.arquivo]).stdout, 'false\n', 'caminho absoluto');
  assert.equal(repo.rodar(['./inventario/estado/banco.json']).stdout, 'false\n');

  fs.writeFileSync(repo.arquivo, JSON.stringify({ ...base, tabelas: base.tabelas.slice(1) }));
  assert.equal(decide(), 'true', 'mudança estrutural');
  assert.equal(decide({ cwd: path.join(repo.dir, 'sub pasta') }), 'true');
  fs.rmSync(repo.arquivo);
  assert.equal(decide(), 'true', 'arquivo apagado');
  assert.equal(repo.rodar(['inventario/estado/nunca-existiu.json']).stdout, 'false\n');
  fs.writeFileSync(path.join(repo.dir, 'inventario/estado/novo.json'), '{}');
  assert.equal(repo.rodar(['inventario/estado/novo.json']).stdout, 'true\n', 'arquivo novo');
});

test('CLI mudou-conteudo: raiz do script dentro de um repositório maior compara o arquivo certo', () => {
  const repo = repositorioComInventario(JSON.stringify(resposta()));
  const aninhada = path.join(repo.dir, 'vendor/copia');
  fs.mkdirSync(path.join(aninhada, 'scripts/inventario'), { recursive: true });
  fs.mkdirSync(path.join(aninhada, 'inventario/estado'), { recursive: true });
  fs.copyFileSync(MUDOU, path.join(aninhada, 'scripts/inventario/mudou-conteudo.mjs'));
  fs.writeFileSync(path.join(aninhada, 'inventario/estado/banco.json'), JSON.stringify(resposta({ funcoes: [] })));
  repo.git('add', '-A');
  repo.git('commit', '-q', '-m', 'copia aninhada');
  const rodar = () => spawnSync(process.execPath, [path.join(aninhada, 'scripts/inventario/mudou-conteudo.mjs')], { encoding: 'utf8', cwd: repo.dir });
  assert.equal(rodar().stdout, 'false\n', 'compara com vendor/copia/inventario/..., não com o da raiz do repositório');
  fs.writeFileSync(path.join(aninhada, 'inventario/estado/banco.json'), JSON.stringify(resposta()));
  assert.equal(rodar().stdout, 'true\n');
});

test('CLI mudou-conteudo: inventário maior que 1 MB igual ao HEAD não vira "mudou"', () => {
  const grande = { tabelas: Array.from({ length: 12000 }, (_, i) => ({ nome: `tabela_${i}`, esquema: 'site_private', linhas: i, bytes: 8192 })) };
  const texto = JSON.stringify(grande, null, 2);
  assert.ok(Buffer.byteLength(texto) > 1024 * 1024);
  const repo = repositorioComInventario(texto);
  assert.equal(repo.rodar().stdout, 'false\n');
  fs.writeFileSync(repo.arquivo, JSON.stringify({ tabelas: grande.tabelas.slice(1) }));
  assert.equal(repo.rodar().stdout, 'true\n');
});

test('CLI mudou-conteudo: binário diferente é mudança; clone raso funciona', () => {
  const repo = repositorioComInventario(Buffer.from([0xff, 0x00, 0x01]));
  assert.equal(repo.rodar().stdout, 'false\n');
  fs.writeFileSync(repo.arquivo, Buffer.from([0xfe, 0x00, 0x01]));
  assert.equal(repo.rodar().stdout, 'true\n');

  const origem = repositorioComInventario(JSON.stringify(resposta()));
  origem.git('commit', '-q', '--allow-empty', '-m', 'segundo');
  const raso = pastaTemporaria('inv-raso-');
  execFileSync('git', ['clone', '-q', '--depth', '1', `file://${origem.dir}`, raso], { stdio: 'ignore' });
  const noRaso = (args = []) => spawnSync(process.execPath, [path.join(raso, 'scripts/inventario/mudou-conteudo.mjs'), ...args], { encoding: 'utf8', cwd: raso });
  assert.equal(noRaso().stdout, 'false\n');
  fs.writeFileSync(path.join(raso, 'inventario/estado/banco.json'), JSON.stringify(resposta({ funcoes: [] })));
  assert.equal(noRaso().stdout, 'true\n');
});

test('CLI mudou-conteudo: sem decisão não imprime valor (argumento errado = 2, git ausente = 1)', () => {
  const repo = repositorioComInventario(JSON.stringify(resposta()));
  const flag = repo.rodar(['--xyz']);
  assert.equal(flag.status, 2);
  assert.equal(flag.stdout, '');
  assert.match(flag.stderr, /argumento desconhecido: --xyz/);
  const ajuda = repo.rodar(['--help']);
  assert.equal(ajuda.status, 0);
  assert.match(ajuda.stdout, /^Uso: /);
  const semGit = repo.rodar([], { env: { ...process.env, PATH: path.join(repo.dir, 'sem-binarios') } });
  assert.equal(semGit.status, 1);
  assert.equal(semGit.stdout, '');
  assert.match(semGit.stderr, /nao consegui rodar o git/);
});
