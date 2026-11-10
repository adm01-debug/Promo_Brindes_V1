#!/usr/bin/env node
/**
 * O inventario mudou de verdade? Compara cada arquivo de inventario/estado/ com a versao do
 * HEAD depois de tirar os carimbos de data (`medido_em`, `gerado_em`, em qualquer nivel) e a
 * telemetria de janela rolante. Imprime `true` ou `false` (usado pelo
 * inventario-estado-semanal.yml para decidir se abre PR).
 *
 * Uso: node scripts/inventario/mudou-conteudo.mjs [arquivo...]   (padrao: banco.json)
 * Caminhos relativos a raiz do repo (a mesma do `HEAD:<caminho>` do git), de qualquer cwd.
 * stdout: so `true` ou `false`. Exit: 0 = decidiu; 2 = argumento invalido; 1 = git nao rodou
 * (nesses dois nada sai no stdout, para o workflow nao ler um valor que nao foi decidido).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const PADRAO = ['inventario/estado/banco.json'];
const CARIMBOS = new Set(['medido_em', 'gerado_em']);
// Telemetria viva: muda em quase toda coleta so pela janela rolante de 7 dias ou pelo movimento
// normal da fila, sem nenhuma mudanca estrutural. Abrir PR por causa de "taxa_falha_7d_pct de 9
// para 9,3" ou de uma notificacao que saiu da fila e ruido semanal garantido. O que importa
// dessas metricas chega como alerta em `alertas[]`, que continua comparado.
const TELEMETRIA = new Set([
  'execucoes_24h', 'falhas_24h', 'execucoes_7d', 'falhas_7d', 'taxa_falha_7d_pct',
  'ultima_falha', 'duracao_max_s_7d', 'horas_paradas_7d', 'mais_de_7_dias',
  'notificacao_por_status', 'notificacao_vencidas', 'notificacao_tentativas_max',
  'notificacao_erros_7d', 'remocao_storage_pendente', 'remocao_storage_mais_antiga',
]);
const IGNORADOS = new Set([...CARIMBOS, ...TELEMETRIA]);
// `historico.linhas` tambem rola com a retencao do pg_cron, mas o nome `linhas` e compartilhado
// com cada tabela em `tabelas[]`, onde a contagem real importa. So ignora dentro de `historico`.
function limparHistoricoCron(historico) {
  if (!historico || typeof historico !== 'object') return historico;
  return Object.fromEntries(Object.entries(historico).filter(([chave]) => chave !== 'linhas'));
}

// A telemetria tambem vaza para o TEXTO de alertas[].detalhe, que a lista IGNORADOS (por nome de
// campo) nao alcanca: `cron_falhando` grava "nome (9.0% em 7d)" e `fila_notificacao_travada`
// grava a contagem da fila. So o texto e normalizado; se um job entra ou sai da lista, ou se o
// alerta aparece/desaparece, a mudanca de verdade continua sendo pega.
const PORCENTAGEM_7D = /\s*\([\d.]+%\s*em\s*7d\)\s*$/;
const SO_O_CODIGO = /^(.+):\s*\d+$/;
function normalizarAlerta(a) {
  if (!a || typeof a !== 'object' || !('tipo' in a) || !Array.isArray(a.detalhe)) return a;
  if (a.tipo === 'cron_falhando') {
    return { ...a, detalhe: a.detalhe.map((d) => (typeof d === 'string' ? d.replace(PORCENTAGEM_7D, '') : d)) };
  }
  // `smtp_timeout: 3` -> `smtp_timeout`: o codigo de erro novo importa, a contagem nao.
  if (a.tipo === 'fila_notificacao_com_erro') {
    return {
      ...a,
      detalhe: a.detalhe.map((d) => (typeof d === 'string' ? d.replace(SO_O_CODIGO, '$1') : d)),
    };
  }
  // Contagem/instante puros: a existencia do alerta e o sinal, o numero rola toda hora.
  if (['cron_parado', 'historico_cron_sem_limpeza', 'fila_notificacao_travada', 'fila_notificacao_esgotada',
    'remocao_storage_atrasada'].includes(a.tipo)) {
    return { ...a, detalhe: [] };
  }
  return a;
}

/** JSON canonico sem os carimbos de data e sem a telemetria viva. Texto que nao e JSON volta como esta. */
export function semCarimbos(texto) {
  if (texto === null) return null;
  let dado;
  try { dado = JSON.parse(texto); } catch { return texto; }
  const limpar = (v, chave) => {
    if (Array.isArray(v)) return v.map((x) => limpar(chave === 'alertas' ? normalizarAlerta(x) : x));
    if (v && typeof v === 'object') {
      const base = chave === 'historico' ? limparHistoricoCron(v) : v;
      return Object.fromEntries(
        Object.keys(base).filter((k) => !IGNORADOS.has(k)).sort().map((k) => [k, limpar(base[k], k)]),
      );
    }
    return v;
  };
  return JSON.stringify(limpar(dado));
}

/** true se algum arquivo mudou alem dos carimbos (arquivo novo ou apagado conta). */
export function mudou(arquivos, lerAntes, lerDepois) {
  return arquivos.some((f) => semCarimbos(lerAntes(f)) !== semCarimbos(lerDepois(f)));
}

/** Bytes -> texto sem perda: UTF-8 valido como texto; o resto byte a byte, para binario diferente nao empatar. */
function comoTexto(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return bytes.toString('latin1');
  }
}

/** Versao do HEAD (null se o arquivo nao esta no HEAD ou nao ha HEAD). */
function lerDoHead(arquivo) {
  const noRepo = path.relative(RAIZ, path.resolve(RAIZ, arquivo)).split(path.sep).join('/');
  try {
    // `./`: relativo ao cwd (RAIZ), mesmo se RAIZ nao for o topo do repositorio git.
    // maxBuffer: o padrao (1 MB) estoura num inventario grande e o erro leria como "arquivo novo".
    return comoTexto(execFileSync('git', ['show', `HEAD:./${noRepo}`], {
      cwd: RAIZ, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1024 * 1024 * 1024,
    }));
  } catch (error) {
    // Com codigo de saida, o git rodou e disse que nao tem o arquivo. Sem codigo, o git nem rodou.
    if (typeof error.status === 'number') return null;
    throw new Error(`nao consegui rodar o git para ler HEAD:${noRepo} (${error.code ?? error.message})`, { cause: error });
  }
}

function lerDoDisco(arquivo) {
  const caminho = path.resolve(RAIZ, arquivo);
  return fs.existsSync(caminho) ? comoTexto(fs.readFileSync(caminho)) : null;
}

const USO = `Uso: node scripts/inventario/mudou-conteudo.mjs [arquivo...]

Imprime true se algum arquivo mudou em relacao ao HEAD alem dos carimbos de data e da
telemetria de janela rolante; false se nao. Padrao: ${PADRAO.join(', ')}.
Caminhos relativos a raiz do repo.`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USO);
  } else {
    const opcao = args.find((a) => a.startsWith('-'));
    if (opcao) {
      console.error(`ERRO: argumento desconhecido: ${opcao} (use --help)`);
      process.exit(2);
    }
    try {
      console.log(String(mudou(args.length ? args : PADRAO, lerDoHead, lerDoDisco)));
    } catch (error) {
      console.error(`ERRO: ${error.message}`);
      process.exit(1);
    }
  }
}
