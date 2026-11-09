// Guarda do inventário do estado real: funções puras de scripts/inventario/.
// Nenhum teste toca banco, rede ou credencial — tudo a partir de respostas sintéticas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  LIMIARES,
  PARECE_CREDENCIAL,
  PROJETO_CATALOGO_CANONICO,
  PROJETO_SITE,
  conferirOrigem,
  contarRpcNoCodigo,
  contarUsoNoCodigo,
  cruzarRpcs,
  extrairInventario,
  montarInventario,
  rodaTodoDia,
  salvarInventario,
  tabelasDasMigrations,
  versoesDoRepo,
} from '../scripts/inventario/gerar-banco.mjs';
import { mudou, semCarimbos } from '../scripts/inventario/mudou-conteudo.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-uso-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'api'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/a.ts'), "db.from('quote_requests'); storage.from('quote_requests');");
  fs.writeFileSync(path.join(dir, 'api/b.ts'), "fetch('/rest/v1/quote_requests');");
  fs.writeFileSync(path.join(dir, 'src/a.test.ts'), "db.from('quote_requests');");
  assert.deepEqual(contarUsoNoCodigo(dir, ['quote_requests']), { quote_requests: { src: 1, api: 1 } });
});

test('contarRpcNoCodigo conta .rpc() por pasta e ignora teste', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-rpc-'));
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
