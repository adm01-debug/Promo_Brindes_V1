#!/usr/bin/env node
/**
 * Inventario do banco do site -> inventario/estado/banco.json (fonte de consulta dos agentes).
 *
 * Tudo sai de comando: o SQL de leitura `scripts/inventario/banco.sql` e o uso de cada tabela
 * no codigo (`.from('tabela')` / `.schema('site_private')` em src/, api/ e shared/). Nada
 * escrito a mao. O que o snapshot de `docs/contexto/supabase/` nao da hoje (ele depende do
 * secret SITE_SUPABASE_DB_URL) este inventario da com o SUPABASE_ACCESS_TOKEN que o repo
 * ja tem: o estado vivo do banco + alertas acionaveis.
 *
 * Dois jeitos de rodar:
 *   1) Com token (CI semanal / maquina com acesso):
 *        SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs
 *      Le pela Management API: POST /database/query/read-only (transacao so leitura).
 *      Projeto fixo: o Supabase ISOLADO DO SITE (SUPABASE_PROJECT_REF so troca para teste;
 *      qualquer outro valor exige INVENTARIO_PERMITIR_OUTRO_PROJETO=1, e o catalogo canonico
 *      e recusado sempre).
 *   2) Sessao de agente sem token: rodar banco.sql no MCP do projeto do site, salvar a
 *      resposta num arquivo e
 *        node scripts/inventario/gerar-banco.mjs --entrada /caminho/resposta.json
 *      Aceita a resposta crua do MCP ({"rows":[{"inventario":{...}}]}) ou o objeto direto.
 *
 * `--saida <arquivo>` grava em outro lugar (teste/inspecao); `--help` mostra o uso.
 *
 * Antes de gravar, recusa resposta parcial (secao faltando ou malformada), resposta lida sob
 * RLS e saida com cara de credencial (Bearer, JWT, sb_secret_, sbp_, URL com senha, o proprio
 * token). A gravacao e atomica: ou o arquivo inteiro, ou nada.
 * Exit: 0 = gravado (ou --help); 2 = argumento/entrada invalida, consulta falhou ou saida com
 * credencial — nada e gravado.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SQL_PATH = path.join(RAIZ, 'scripts/inventario/banco.sql');
const SAIDA = path.join(RAIZ, 'inventario/estado/banco.json');
const MIGRATIONS_DIR = 'site-supabase/supabase/migrations';
const PASTAS_CODIGO = { src: ['src'], api: ['api', 'shared'] };
const EXTENSOES = /\.(ts|tsx|js|jsx|mjs)$/;
/** Supabase isolado do site (leads, area do cliente) — o unico que este repo versiona. */
export const PROJETO_SITE = 'xlzmclcjdncjfdrjxclt';
/** Catalogo canonico: externo, somente leitura, sem migrations daqui. Nunca inventariado. */
export const PROJETO_CATALOGO_CANONICO = 'doufsxqlfjyuvxuezpln';
const API_PADRAO = 'https://api.supabase.com';
const TENTATIVAS = 3;
const ESPERA_MS = [2_000, 6_000];
const TIMEOUT_MS = 120_000;
const HTTP_TRANSITORIO = new Set([408, 425, 429, 500, 502, 503, 504]);
const DICA_HTTP = {
  400: 'o banco recusou a consulta; rode scripts/inventario/banco.sql a mao para ver o erro',
  401: 'SUPABASE_ACCESS_TOKEN invalido ou expirado',
  403: 'o token nao tem acesso a este projeto',
  404: 'projeto ou endpoint nao encontrado',
};

// Limiares dos alertas: o que um agente precisa saber antes de mexer no sistema.
export const LIMIARES = {
  taxaFalhaCronPct: 5,
  historicoCronMaisDe7Dias: 50000,
  remocaoStorageHoras: 48,
};

/** Algo com cara de credencial no texto? */
export const PARECE_CREDENCIAL = /Bearer\s+[A-Za-z0-9._-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.|sb_secret_|sbp_[A-Za-z0-9]{20,}|postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/;

/** `last_error_code` e texto livre no banco; so o que tem forma de codigo entra no inventario. */
export const CODIGO_DE_ERRO = /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/;

const CHAVES_OBRIGATORIAS = ['format_version', 'medido_em', 'resumo', 'tabelas', 'funcoes', 'cron', 'fila'];

const eObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function lerJson(texto) {
  try {
    return JSON.parse(texto);
  } catch {
    // Sem repassar a mensagem do JSON.parse: ela cita um trecho do conteudo.
    throw new Error('entrada nao e JSON valido (esperado a resposta do banco.sql: '
      + '{"rows":[{"inventario":{...}}]}, o envelope do MCP ou o objeto direto)');
  }
}

/**
 * Forma minima de cada secao. Resposta parcial e recusada inteira: publicar `fila: null` ou
 * `cron: {}` apagaria os alertas da secao e leria como "nao existe problema".
 */
function conferirForma(dado) {
  const ruim = [];
  if (typeof dado.medido_em !== 'string' || !Number.isFinite(Date.parse(dado.medido_em))) ruim.push('medido_em (data ISO)');
  if (!eObjeto(dado.resumo)) ruim.push('resumo');
  if (!dado.tabelas.every((t) => eObjeto(t) && typeof t.nome === 'string' && t.nome !== ''
      && typeof t.rls === 'boolean' && Number.isFinite(t.policies) && Number.isFinite(t.linhas)
      && typeof t.citada_no_banco === 'boolean')) {
    ruim.push('tabelas[] (nome, rls, policies, linhas, citada_no_banco)');
  }
  if (!Array.isArray(dado.funcoes) || !dado.funcoes.every((f) => eObjeto(f) && typeof f.nome === 'string')) {
    ruim.push('funcoes[] (nome)');
  }
  if (!eObjeto(dado.cron) || !Array.isArray(dado.cron.jobs) || !dado.cron.jobs.every(eObjeto)
      || !Array.isArray(dado.cron.horas_paradas_7d) || !eObjeto(dado.cron.historico)) {
    ruim.push('cron (jobs[], horas_paradas_7d[], historico)');
  }
  if (!eObjeto(dado.fila) || !Number.isFinite(dado.fila.notificacao_vencidas)
      || !eObjeto(dado.fila.notificacao_por_status) || !eObjeto(dado.fila.notificacao_erros_7d)) {
    ruim.push('fila (notificacao_vencidas, notificacao_por_status, notificacao_erros_7d)');
  }
  if (ruim.length) throw new Error(`entrada com secao faltando ou malformada: ${ruim.join('; ')}`);
  const sobRls = dado.resumo.leitura_filtrada_por_rls;
  if (sobRls > 0) {
    throw new Error(`a consulta rodou com um papel sujeito a RLS em ${sobRls} relacao(oes): contagens e filas `
      + 'sairiam 0 falsos. Use o endpoint read-only da Management API ou um papel com BYPASSRLS.');
  }
}

/** Extrai o objeto do inventario da Management API, do MCP (resposta ou envelope tools/call) ou do objeto direto. */
export function extrairInventario(bruto) {
  let dado = typeof bruto === 'string' ? lerJson(bruto.trim()) : bruto;
  // Envelope cru de tools/call do MCP: { result: { content: [{ type: 'text', text: '<json>' }] } }.
  const conteudo = dado?.result?.content ?? dado?.content;
  if (Array.isArray(conteudo)) {
    if (typeof conteudo[0]?.text === 'string') dado = lerJson(conteudo[0].text);
    else if (conteudo.length > 0) throw new Error(`envelope MCP inesperado: content[0] sem campo "text" (type="${conteudo[0]?.type ?? 'ausente'}")`);
  }
  if (dado && Array.isArray(dado.rows)) dado = dado.rows[0];
  if (Array.isArray(dado)) dado = dado[0];
  if (dado && dado.inventario) dado = dado.inventario;
  if (typeof dado === 'string') dado = lerJson(dado);
  const faltando = CHAVES_OBRIGATORIAS.filter((chave) => !(eObjeto(dado) && chave in dado));
  if (faltando.length) throw new Error(`entrada sem as chaves: ${faltando.join(', ')}`);
  if (dado.format_version !== 1) throw new Error(`format_version ${dado.format_version} desconhecido (esperado 1)`);
  if (!Array.isArray(dado.tabelas) || dado.tabelas.length === 0) throw new Error('entrada sem tabelas');
  conferirForma(dado);
  return dado;
}

function listarArquivos(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name.startsWith('.')) continue;
    const p = path.join(dir, entrada.name);
    if (entrada.isDirectory()) listarArquivos(p, acc);
    else if (EXTENSOES.test(entrada.name)) acc.push(p);
  }
  return acc;
}

/**
 * Uso de cada tabela no codigo de producao (testes fora): `.from('tabela')` do cliente
 * Supabase (sem `storage.from`, que e bucket) e acesso direto ao PostgREST `/rest/v1/tabela`.
 * `src` = front; `api` = funcoes serverless da Vercel (api/) e codigo compartilhado (shared/).
 * Limite conhecido: `.from(variavel)` nao e resolvido.
 */
export function contarUsoNoCodigo(raiz, nomes) {
  const uso = Object.fromEntries(nomes.map((n) => [n, { src: 0, api: 0 }]));
  const reFrom = /(\bstorage\s*)?\.from\(\s*['"`]([A-Za-z0-9_]+)['"`]/g;
  const reRest = /\/rest\/v1\/([A-Za-z0-9_]+)/g;
  for (const [chave, pastas] of Object.entries(PASTAS_CODIGO)) {
    for (const pasta of pastas) {
      for (const arquivo of listarArquivos(path.join(raiz, pasta))) {
        if (/(\.test\.|\.spec\.|__tests__)/.test(arquivo)) continue;
        const texto = fs.readFileSync(arquivo, 'utf8');
        for (const m of texto.matchAll(reFrom)) if (!m[1] && Object.hasOwn(uso, m[2])) uso[m[2]][chave] += 1;
        for (const m of texto.matchAll(reRest)) if (m[1] !== 'rpc' && Object.hasOwn(uso, m[1])) uso[m[1]][chave] += 1;
      }
    }
  }
  return uso;
}

/**
 * Chamadas de RPC no codigo de producao (testes fora), por pasta: `.rpc('nome')` do cliente
 * Supabase (front) e `/rest/v1/rpc/nome` direto no PostgREST (funcoes serverless de api/). No
 * site isto e o acesso real ao banco: o app nao usa `.from()` em tabela, chama funcao em `public`.
 * Limite conhecido: nome montado em variavel (`/rest/v1/rpc/${nome}`) nao e resolvido.
 */
export function contarRpcNoCodigo(raiz) {
  const uso = new Map();
  const reRpc = /\.rpc\(\s*['"`]([A-Za-z0-9_]+)['"`]/g;
  const reRest = /\/rest\/v1\/rpc\/([A-Za-z0-9_]+)(?![A-Za-z0-9_$])/g;
  for (const [chave, pastas] of Object.entries(PASTAS_CODIGO)) {
    for (const pasta of pastas) {
      for (const arquivo of listarArquivos(path.join(raiz, pasta))) {
        if (/(\.test\.|\.spec\.|__tests__)/.test(arquivo)) continue;
        const texto = fs.readFileSync(arquivo, 'utf8');
        for (const m of [...texto.matchAll(reRpc), ...texto.matchAll(reRest)]) {
          const atual = uso.get(m[1]) ?? { src: 0, api: 0 };
          atual[chave] += 1;
          uso.set(m[1], atual);
        }
      }
    }
  }
  return Object.fromEntries(uso);
}

/** Versoes (prefixo numerico) dos .sql de site-supabase/supabase/migrations/. */
export const versoesDoRepo = (raiz) => fs.readdirSync(path.join(raiz, MIGRATIONS_DIR))
  .filter((f) => /^\d+_.*\.sql$/.test(f)).map((f) => f.split('_')[0]);

/**
 * Tabelas declaradas nas migrations do repo (`create table [if not exists] <schema>.<nome> (`).
 * O `(` final e obrigatorio: sem ele, textos como `'CREATE TABLE AS'` (lista de command_tag em
 * 20260922140000_reconcile_schema_drift.sql) entrariam como se fossem tabelas.
 */
export function tabelasDasMigrations(raiz) {
  const dir = path.join(raiz, MIGRATIONS_DIR);
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?(?:site_private|public)"?\.)?"?([a-z0-9_]+)"?\s*\(/gi;
  const nomes = new Set();
  for (const arquivo of fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    const texto = fs.readFileSync(path.join(dir, arquivo), 'utf8');
    for (const m of texto.matchAll(re)) nomes.add(m[1]);
  }
  return [...nomes].sort();
}

/**
 * A resposta e mesmo do banco do site? Duas provas independentes do arquivo de entrada:
 * (1) ao menos 90% das tabelas declaradas nas migrations do repo aparecem na resposta — um
 * banco irmao (o catalogo canonico, por exemplo) nao tem essas tabelas; (2) o ledger remoto
 * tem as migrations recentes do repo e um total parecido — e a mesma invariante que o
 * `release.yml` cobra antes de promover.
 */
export const LEDGER_TOLERANCIA = { versoesRecentes: 20, registrosPct: 10 };
export function conferirOrigem(dado, tabelasEsperadas, versoesRepo = null) {
  const resposta = new Set(dado.tabelas.map((t) => t.nome));
  const esperadas = new Set(tabelasEsperadas);
  const comuns = [...esperadas].filter((t) => resposta.has(t)).length;
  const cobertura = esperadas.size ? comuns / esperadas.size : 0;
  if (cobertura < 0.9) {
    throw new Error(`a resposta nao parece ser do banco do site: ${comuns} de ${esperadas.size} tabelas das `
      + `migrations do repo presentes (${Math.round(cobertura * 100)}%). `
      + `Confira se o projeto consultado e ${PROJETO_SITE}.`);
  }
  const origem = { tabelas_das_migrations_presentes: comuns, tabelas_nas_migrations: esperadas.size };
  if (!versoesRepo?.length) return origem;
  const { ledger_versao_max: max, ledger_registros: registros } = dado.resumo ?? {};
  if (max === null && registros === 0) {
    throw new Error('a resposta nao parece ser do banco do site: o banco consultado nao tem ledger de migrations '
      + `(supabase_migrations.schema_migrations vazio ou ausente) e o repo tem ${versoesRepo.length} migrations.`);
  }
  if (!max || !Number.isFinite(registros)) {
    throw new Error('a resposta nao traz resumo.ledger_versao_max/ledger_registros; rode o banco.sql atual.');
  }
  const recentes = [...versoesRepo].sort().reverse();
  const limite = recentes[Math.min(LEDGER_TOLERANCIA.versoesRecentes, recentes.length) - 1];
  const difPct = Math.abs(registros - versoesRepo.length) * 100 / versoesRepo.length;
  if (String(max) < limite || difPct > LEDGER_TOLERANCIA.registrosPct) {
    throw new Error(`a resposta nao parece ser do banco do site: ledger com ${registros} registros e maior versao ${max}; `
      + `o repo tem ${versoesRepo.length} migrations e a ${LEDGER_TOLERANCIA.versoesRecentes}a mais recente e ${limite}. `
      + 'Divergencia real de ledger: docs/RUNBOOK_RECONCILIACAO_LEDGER.md.');
  }
  return { ...origem, ledger_registros: registros, migrations_no_repo: versoesRepo.length };
}

/** Ordena chaves recursivamente: o diff entre execucoes fica so no que mudou. */
function ordenar(valor) {
  if (Array.isArray(valor)) return valor.map(ordenar);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.keys(valor).sort().map((k) => [k, ordenar(valor[k])]));
  }
  return valor;
}

/**
 * A agenda do pg_cron roda ao menos uma vez por dia? 'N seconds', ou dia do mes, mes e dia da
 * semana cobrindo tudo: `*`, `*\/1` ou a faixa inteira (1-31, 1-12, 0-6/0-7).
 */
const CAMPO_TODO = [/^(\*|\*\/1|1-31)$/, /^(\*|\*\/1|1-12)$/, /^(\*|\*\/1|0-6|0-7|1-7)$/];
export function rodaTodoDia(agenda) {
  const a = String(agenda ?? '').trim();
  if (/^\d+\s+seconds?$/i.test(a)) return true;
  const campos = a.split(/\s+/);
  return campos.length === 5 && CAMPO_TODO.every((re, i) => re.test(campos[i + 2]));
}

/**
 * Funcao do banco x `.rpc()` no codigo. Devolve a lista enriquecida e as duas divergencias
 * que importam: funcao exposta ao cliente que ninguem chama, e chamada no codigo sem funcao
 * no banco (erro em producao na primeira vez que a tela roda).
 */
export function cruzarRpcs(funcoesDoBanco, rpcsNoCodigo) {
  const funcoes = (funcoesDoBanco ?? []).map((f) => ({
    ...f,
    chamadas_no_codigo: Object.hasOwn(rpcsNoCodigo, f.nome) ? rpcsNoCodigo[f.nome] : { src: 0, api: 0 },
  }));
  const exposta = (f) => f.executa_anon === true || f.executa_authenticated === true;
  const chamada = (f) => f.chamadas_no_codigo.src + f.chamadas_no_codigo.api > 0;
  const nomesNoBanco = new Set(funcoes.map((f) => f.nome));
  return {
    funcoes,
    sem_chamada: [...new Set(funcoes.filter((f) => exposta(f) && !chamada(f)).map((f) => f.nome))].sort(),
    sem_funcao: Object.keys(rpcsNoCodigo).filter((n) => !nomesNoBanco.has(n)).sort(),
  };
}

/** Junta os codigos que nao tem forma de codigo (texto livre: pode citar destinatario) em 'fora_do_padrao'. */
function errosPorCodigo(erros) {
  const soma = new Map();
  for (const [codigo, n] of Object.entries(erros ?? {})) {
    const chave = CODIGO_DE_ERRO.test(codigo) ? codigo : 'fora_do_padrao';
    soma.set(chave, (soma.get(chave) ?? 0) + n);
  }
  return Object.fromEntries(soma);
}

/** Junta banco + codigo e calcula orfas e alertas. Funcao pura (testada em tests/). */
export function montarInventario(dado, uso, origem = {}, rpcsNoCodigo = {}) {
  const tabelas = dado.tabelas.map((t) => ({
    ...t,
    uso_no_codigo: Object.hasOwn(uso, t.nome) ? uso[t.nome] : { src: 0, api: 0 },
  }));
  const orfas = tabelas
    .filter((t) => t.linhas === 0 && !t.citada_no_banco && t.uso_no_codigo.src + t.uso_no_codigo.api === 0)
    .map((t) => t.nome);

  const alertas = [];
  const semRls = tabelas.filter((t) => !t.rls).map((t) => t.nome);
  if (semRls.length) alertas.push({ tipo: 'tabela_sem_rls', detalhe: semRls });
  // RLS ligado sem nenhuma policy nega tudo para authenticated/anon (service_role sempre passa
  // por cima, rolbypassrls). Pode ser de proposito (tabela so-interna, escrita pela API com
  // service_role), mas sem o aviso isso fica invisivel: nem tabela_sem_rls (tem RLS) nem
  // nenhum outro alerta aponta.
  const rlsSemPolicy = tabelas.filter((t) => t.rls && t.policies === 0).map((t) => t.nome);
  if (rlsSemPolicy.length) alertas.push({ tipo: 'rls_sem_policy', detalhe: rlsSemPolicy });

  const jobs = dado.cron?.jobs ?? [];
  const nomeDoJob = (j) => j.nome ?? '(job sem nome)';
  const cronRuim = jobs
    .filter((j) => j.ativo && j.taxa_falha_7d_pct >= LIMIARES.taxaFalhaCronPct)
    .map((j) => `${nomeDoJob(j)} (${j.taxa_falha_7d_pct}% em 7d)`);
  if (cronRuim.length) alertas.push({ tipo: 'cron_falhando', detalhe: cronRuim });
  // Cron 100% parado nao grava linha em job_run_details: some de horas_paradas_7d e a taxa fica 0.
  // Job ativo que deveria rodar todo dia (dia/mes/semana = *) sem nenhuma execucao em 24 h.
  const mudos = jobs.filter((j) => j.ativo && j.execucoes_24h === 0 && rodaTodoDia(j.agenda)).map(nomeDoJob);
  if (mudos.length) alertas.push({ tipo: 'cron_sem_execucao', detalhe: mudos });
  if (dado.cron?.horas_paradas_7d?.length) {
    alertas.push({ tipo: 'cron_parado', detalhe: dado.cron.horas_paradas_7d.map((h) => h.hora) });
  }
  if ((dado.cron?.historico?.mais_de_7_dias ?? 0) > LIMIARES.historicoCronMaisDe7Dias) {
    alertas.push({
      tipo: 'historico_cron_sem_limpeza',
      detalhe: [`${dado.cron.historico.mais_de_7_dias} linhas com mais de 7 dias`],
    });
  }

  // Fila de notificacao de lead: orcamento que chegou e ninguem do comercial foi avisado.
  const fila = dado.fila ? { ...dado.fila, notificacao_erros_7d: errosPorCodigo(dado.fila.notificacao_erros_7d) } : {};
  if ((fila.notificacao_vencidas ?? 0) > 0) {
    alertas.push({
      tipo: 'fila_notificacao_travada',
      detalhe: [`${fila.notificacao_vencidas} entrega(s) com next_attempt_at vencido ha mais de 15 min`],
    });
  }
  // 'exhausted' e estado final (nao conta como travada), mas e o pior desfecho: a notificacao nunca saiu.
  const esgotadas = fila.notificacao_por_status?.exhausted ?? 0;
  if (esgotadas > 0) {
    alertas.push({
      tipo: 'fila_notificacao_esgotada',
      detalhe: [`${esgotadas} entrega(s) em exhausted: tentativas esgotadas, a notificacao nunca saiu`],
    });
  }
  const erros = Object.entries(fila.notificacao_erros_7d ?? {}).filter(([codigo]) => codigo !== 'sem_codigo');
  if (erros.length) {
    alertas.push({
      tipo: 'fila_notificacao_com_erro',
      // Ordem por codigo de caractere, nao por locale: o mesmo banco da o mesmo arquivo em qualquer maquina.
      detalhe: erros.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([codigo, n]) => `${codigo}: ${n}`),
    });
  }
  const antiga = fila.remocao_storage_mais_antiga ? Date.parse(fila.remocao_storage_mais_antiga) : NaN;
  const medido = Date.parse(dado.medido_em);
  if (Number.isFinite(antiga) && Number.isFinite(medido)
      && (medido - antiga) / 3_600_000 > LIMIARES.remocaoStorageHoras) {
    alertas.push({
      tipo: 'remocao_storage_atrasada',
      detalhe: [`arquivo na fila desde ${fila.remocao_storage_mais_antiga}`
        + ` (> ${LIMIARES.remocaoStorageHoras} h)`],
    });
  }

  const rpc = cruzarRpcs(dado.funcoes, rpcsNoCodigo);
  if (rpc.sem_funcao.length) alertas.push({ tipo: 'rpc_chamada_sem_funcao_no_banco', detalhe: rpc.sem_funcao });
  if (rpc.sem_chamada.length) alertas.push({ tipo: 'rpc_exposta_sem_chamada_no_codigo', detalhe: rpc.sem_chamada });

  return ordenar({
    ...dado,
    ...(dado.fila ? { fila } : {}),
    fonte: 'scripts/inventario/banco.sql + .from()/.rpc() em src/, api/ e shared/ (scripts/inventario/gerar-banco.mjs)',
    origem,
    tabelas,
    tabelas_orfas: {
      criterio: '0 linhas + nao citada em funcao/view do banco + nenhum .from() em src/, api/ ou shared/',
      lista: orfas,
    },
    funcoes: rpc.funcoes,
    rpcs: {
      criterio: 'sem_chamada = funcao executavel por anon/authenticated sem nenhum .rpc() nem /rest/v1/rpc/ no codigo; '
        + 'sem_funcao = chamada no codigo sem funcao com esse nome no banco',
      sem_chamada: rpc.sem_chamada,
      sem_funcao: rpc.sem_funcao,
    },
    alertas,
  });
}

function projeto() {
  const ref = (process.env.SUPABASE_PROJECT_REF || PROJETO_SITE).trim();
  if (ref.toLowerCase() === PROJETO_CATALOGO_CANONICO) {
    throw new Error(`SUPABASE_PROJECT_REF=${PROJETO_CATALOGO_CANONICO} e o catalogo canonico (somente leitura, sem migrations deste repo).`);
  }
  // Ref do Supabase: 20 letras minusculas/digitos. Fora disso o alvo e ambiguo e nada e consultado.
  if (!/^[a-z0-9]{20}$/.test(ref)) {
    throw new Error('SUPABASE_PROJECT_REF nao tem formato de ref do Supabase (20 letras minusculas ou digitos).');
  }
  if (ref !== PROJETO_SITE && process.env.INVENTARIO_PERMITIR_OUTRO_PROJETO !== '1') {
    throw new Error(`SUPABASE_PROJECT_REF=${ref} nao e o banco do site (${PROJETO_SITE}).`);
  }
  return ref;
}

/** SUPABASE_API_URL so existe para o teste apontar um servidor local: o token nao vai a outro host. */
function baseDaApi() {
  const bruta = (process.env.SUPABASE_API_URL || '').trim() || API_PADRAO;
  let url;
  try {
    url = new URL(bruta);
  } catch {
    throw new Error('SUPABASE_API_URL nao e uma URL valida.');
  }
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (url.origin !== API_PADRAO && !local) {
    throw new Error(`SUPABASE_API_URL aponta para ${url.host}: o token so e enviado a api.supabase.com ou a um servidor local de teste.`);
  }
  return `${bruta.replace(/\/+$/, '')}/v1/projects`;
}

/**
 * POST na Management API do projeto do site. Timeout por tentativa; so repete o que e
 * transitorio (rede, timeout, 408/425/429/5xx) — a consulta e somente leitura, repetir e seguro.
 * `fetchImpl`/`esperar` existem para o teste.
 */
export async function consultarApi(caminho, corpo, {
  token = process.env.SUPABASE_ACCESS_TOKEN?.trim(),
  fetchImpl = fetch,
  esperar = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); }),
  timeoutMs = TIMEOUT_MS,
} = {}) {
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN ausente.');
  // Cabecalho invalido faz o fetch lancar um erro que cita o valor inteiro: barra antes.
  if (!/^[\x21-\x7e]+$/.test(token)) {
    throw new Error('SUPABASE_ACCESS_TOKEN tem espaco, quebra de linha ou caractere fora do ASCII no meio; confira o secret.');
  }
  const url = `${baseDaApi()}/${encodeURIComponent(projeto())}${caminho}`;
  let falha = '';
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa += 1) {
    if (tentativa > 1) await esperar(ESPERA_MS[tentativa - 2]);
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        body: JSON.stringify(corpo),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (HTTP_TRANSITORIO.has(res.status)) {
        falha = `HTTP ${res.status}`;
        await res.body?.cancel().catch(() => {});
        continue;
      }
      // Nunca repassa o corpo do erro: pode ecoar cabecalho ou parte da consulta.
      if (!res.ok) {
        const dica = DICA_HTTP[res.status] ? ` (${DICA_HTTP[res.status]})` : '';
        throw Object.assign(new Error(`Management API ${caminho} respondeu HTTP ${res.status}${dica}`), { definitivo: true });
      }
      const texto = await res.text();
      try {
        return JSON.parse(texto);
      } catch {
        throw Object.assign(new Error(`Management API ${caminho} respondeu HTTP ${res.status} com corpo que nao e JSON`), { definitivo: true });
      }
    } catch (error) {
      if (error?.definitivo) throw error;
      falha = error?.name === 'TimeoutError' || error?.name === 'AbortError'
        ? `sem resposta em ${Math.round(timeoutMs / 1000)} s`
        : `falha de rede (${error?.cause?.code ?? String(error?.cause?.message ?? error?.name ?? 'erro').slice(0, 80)})`;
    }
  }
  throw new Error(`Management API ${caminho}: ${falha} em ${TENTATIVAS} tentativas`);
}

/** Verifica credencial e grava o inventário. Exportada para ser testável de forma isolada. */
export function salvarInventario(texto, saida = SAIDA) {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (PARECE_CREDENCIAL.test(texto) || (token && token.length >= 8 && texto.includes(token))) {
    throw new Error('a saida tem algo com cara de credencial; nada foi gravado. Revise banco.sql.');
  }
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  // Grava ao lado e renomeia: quem le (mudou-conteudo.mjs, o PR) nunca ve o arquivo pela metade.
  const temporario = path.join(path.dirname(saida), `.${path.basename(saida)}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(temporario, texto);
    fs.renameSync(temporario, saida);
  } catch (error) {
    fs.rmSync(temporario, { force: true });
    throw error;
  }
}

const USO = `Uso: node scripts/inventario/gerar-banco.mjs [--entrada <arquivo.json>] [--saida <arquivo.json>]

Grava inventario/estado/banco.json: estado do banco ISOLADO DO SITE (${PROJETO_SITE}) + alertas.

  (sem --entrada)      le pela Management API (somente leitura); exige SUPABASE_ACCESS_TOKEN
  --entrada <arquivo>  usa a resposta do banco.sql ja salva (MCP, CLI ou o objeto direto)
  --saida <arquivo>    grava em outro arquivo (padrao: inventario/estado/banco.json)
  -h, --help           mostra este texto

Exit: 0 = gravado; 2 = argumento/entrada invalida, consulta falhou ou saida com credencial.`;

/** `--flag valor` ou `--flag=valor`. Argumento desconhecido e erro: digitar errado nao vira consulta. */
export function lerArgumentos(argv) {
  const opcoes = { entrada: null, saida: SAIDA, ajuda: false };
  for (let i = 0; i < argv.length; i += 1) {
    const [nome, colado] = argv[i].split(/=(.*)/s, 2);
    if (argv[i] === '--help' || argv[i] === '-h') {
      opcoes.ajuda = true;
    } else if (nome === '--entrada' || nome === '--saida') {
      const valor = colado ?? argv[i += 1];
      if (!valor || valor.startsWith('--')) {
        throw new Error(nome === '--entrada'
          ? '--entrada exige o caminho do arquivo com a resposta do banco.sql'
          : '--saida exige o caminho do arquivo a gravar');
      }
      opcoes[nome.slice(2)] = valor;
    } else {
      throw new Error(`argumento desconhecido: ${argv[i]} (use --help)`);
    }
  }
  return opcoes;
}

async function main(argv) {
  const opcoes = lerArgumentos(argv);
  if (opcoes.ajuda) {
    console.log(USO);
    return;
  }
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  let bruto;
  if (opcoes.entrada) {
    bruto = fs.readFileSync(opcoes.entrada, 'utf8');
  } else {
    if (!token) throw new Error('sem --entrada e sem SUPABASE_ACCESS_TOKEN: nada para ler (veja o cabecalho do script).');
    bruto = await consultarApi('/database/query/read-only', { query: fs.readFileSync(SQL_PATH, 'utf8') });
  }

  const dado = extrairInventario(bruto);
  const origem = conferirOrigem(dado, tabelasDasMigrations(RAIZ), versoesDoRepo(RAIZ));
  const uso = contarUsoNoCodigo(RAIZ, dado.tabelas.map((t) => t.nome));
  const inventario = montarInventario(dado, uso, origem, contarRpcNoCodigo(RAIZ));
  const texto = JSON.stringify(inventario, null, 2) + '\n';
  // O resumo e montado antes de gravar: nada pode falhar depois que o arquivo existe.
  const resumo = `banco.json: ${inventario.tabelas.length} tabelas, ${inventario.funcoes.length} funcoes, `
    + `${inventario.cron.jobs.length} cron jobs, ${inventario.tabelas_orfas.lista.length} tabelas orfas, `
    + `${inventario.rpcs.sem_chamada.length} rpcs sem chamada, ${inventario.alertas.length} alertas `
    + `(medido_em ${inventario.medido_em}).`;
  salvarInventario(texto, path.resolve(opcoes.saida));
  console.log(resumo);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    // Ultima barreira: nenhuma mensagem de erro sai com o token dentro.
    const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
    const mensagem = String(error?.message ?? error);
    console.error(`ERRO: ${token && token.length >= 8 ? mensagem.split(token).join('***') : mensagem}`);
    process.exit(2);
  });
}
