// Reconciliação documental por delta; não altera código de aplicação ou dados remotos.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../../../', import.meta.url);
const baselineCommit = 'b789e45f3171ce56a9e5eff4f8bbb3d6acc145c7';
const auditedCommit = 'f20df4452f0d70f295154b0ba8bd9af8f8be64dd';
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), auditedCommit,
  'Esta matriz documenta um commit específico. Reavaliar as conclusões antes de gerar para outra versão.');
function csvRead(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (char === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift();
  return rows.map(row => Object.fromEntries(headers.map((header, i) => [header, row[i]])));
}
const rows = csvRead(readFileSync(new URL('docs/MATRIZ_POS_MIGRATIONS_20260912.csv', root), 'utf8'));
assert.equal(rows.length, 230);
assert.equal(new Set(rows.map(row => row.id)).size, 230);
const deltas = new Map();
function revise(ids, state, nature, note, sources = '') {
  for (const id of ids.split(' ')) {
    assert(rows.some(row => row.id === id), id);
    deltas.set(id, { state, nature, note, sources });
  }
}
const regressionSources = 'docs/EXECUCAO_CORRECOES_20260912.md; e2e/smoke.spec.ts; tests/api/lead-requests.test.ts; src/lib/quoteItems.test.ts';
const notificationSources = 'api/notifications.ts; api/_lib/leadHandler.ts; site-supabase/supabase/migrations/20260912170000_add_quote_notification_outbox.sql; docs/audits/closure-review-20260912/notifications.mjs; docs/audits/closure-review-20260912/outbox.sql';
const logoutSources = 'src/context/CustomerAuthContext.tsx; src/pages/QuotePage.tsx; docs/audits/closure-review-20260912/logout.mjs';

revise('UX03', 'I', 'nenhuma_no_escopo_tecnico', 'Regressões B01–B07 incorporadas aos testes pertinentes; endpoint persistente explicitamente configurado no E2E. Novos achados R01–R08 têm diagnósticos, ainda não correções.', regressionSources);
revise('UX06', 'P', 'codigo_validacao', 'B02 e B04 corrigidos. Faltam taxonomia completa de falhas determinísticas e observabilidade sanitizada verificável; as falhas de confirmação R01/R03 não possuem recuperação pelo cliente.', notificationSources);
revise('UX07', 'P', 'codigo', 'B01 encerrado: sucesso confirmado limpa e não recria o rascunho. R08 reproduzido: logout em outra aba limpa storage mas não campos/consentimento em memória; próxima edição os persiste novamente.', logoutSources);
revise('UX10', 'I', 'nenhuma_no_escopo_tecnico', 'Lote original de estabilização B01–B07 entregue, publicado e com suites aprovadas no commit; não representa encerramento das expansões nem dos novos achados.', regressionSources);
revise('UX21', 'P', 'codigo_validacao', 'Produtos reais continuam depois do questionário, teaser de biblioteca, manifesto e categorias (HomePage). A ordem prevista de antecipar produtos ainda requer ajuste e avaliação com compradores.');
revise('UX41', 'P', 'dados_validacao', 'B02 corrigido. A amostra histórica não é estratificada nem valida completude/consistência do catálogo inteiro; não houve escrita na origem.', regressionSources);
revise('UX45', 'I', 'nenhuma_no_escopo_tecnico', 'Servidor valida vínculo da variante ao produto; nome/imagem são reconciliados quando cadastrados. Histórico reconcilia variantes e marca remoções antes do reenvio; sem promessa de estoque.', 'api/_lib/catalogValidation.ts; src/lib/quoteItems.ts; tests/api/lead-requests.test.ts');
revise('UX46', 'I', 'nenhuma_no_escopo_tecnico', 'Mínimo desconhecido usa piso técnico de uma unidade e rótulo a confirmar; mínimo conhecido é conferido no servidor. Digitação corrigida e regressão WebKit encerrada.', regressionSources);
revise('UX63', 'I', 'nenhuma_no_escopo_tecnico', 'Validação de evento passado e recebimento incompatível antes do POST; calendário de São Paulo compartilhado conceitualmente entre UI/API e testes de instantes absolutos.', 'src/pages/QuotePage.tsx; src/pages/QuotePage.test.ts; src/lib/quoteBriefing.ts; tests/api/lead-requests.test.ts');
revise('UX64 LK42', 'P', 'codigo', 'B01/B02/B05 corrigidos e regressões verdes; R08 impede o aceite completo da preservação/limpeza dos campos em troca de sessão.', logoutSources);
revise('UX67', 'P', 'codigo_operacao', 'Sucesso confirmado mantém protocolo e limpa contato. Comprovantes exibem sent/pending, mas R01 pode afirmar envio sem finalização no banco; prazo/recebimento pelo responsável ainda não comprovados.', notificationSources);
revise('UX68 LK45', 'P', 'codigo_operacao', 'Fila transacional, Resend, template e tentativas implementados. Faltam credenciais em produção, eventos de entrega/bounce, retorno falso tratado, recuperação terminal, reconciliação de tentativa e aceite com destinatário autorizado. Resumo não contém todo o briefing.', notificationSources);
revise('UX69', 'P', 'codigo_operacao', 'Opt-in e envio Meta por template implementados. Faltam configuração e template aprovado, prova de entrega e recuperação sem duplicação após aceite do provedor. Payload atual contém nome/protocolo/empresa, não os itens.', notificationSources);
revise('UX70', 'P', 'codigo_operacao', 'A fila nova gera audience=customer; não gera notificação ao comercial. Persistência e histórico existem; faltam encaminhamento ao responsável, monitoramento de prazo e ciclo real de atendimento.', notificationSources);
revise('UX75', 'P', 'operacao', 'B04 corrigido; eventos reais do banco continuam disponíveis. Responsável, SLA e evidência do fluxo operacional ainda não fechados.', regressionSources);
revise('UX76', 'P', 'operacao_validacao', 'B06 encerrado: última versão vencida recebe indicação de validade encerrada. Permanece aceite publicação real de PDF, titular autorizado, expiração do link e recuperação.', 'src/pages/CustomerQuotePage.tsx; src/lib/customerAccount.test.ts; e2e/smoke.spec.ts');
revise('UX77', 'P', 'operacao_validacao', 'Ajuste idempotente e recuperação do detalhe implementados. Falta comprovar que o pedido chega ao responsável e percorre a operação; também falta cenário de troca de ID com ajuste em edição.', 'src/pages/CustomerQuotePage.tsx; src/lib/customerAccount.ts');
revise('UX78 AC23', 'I', 'nenhuma_no_escopo_tecnico', 'Repetição agora consulta catálogo atual antes de substituir, preserva referências removidas como bloqueios visíveis e confirma troca de seleção existente.', 'src/pages/CustomerQuotePage.tsx; src/lib/quoteItems.ts; src/lib/quoteItems.test.ts; e2e/smoke.spec.ts');
revise('UX79 UX80 AC10 AC29', 'P', 'codigo_validacao', 'Isolamento servidor e limpeza após envio estão cobertos. R08 reproduz retenção/regravação de contato e consentimento do formulário após logout em outra aba; aceite de sessão/privacidade permanece aberto.', logoutSources);
revise('UX95', 'P', 'validacao_externa', 'B07 encerrado: Chromium 72 aprovados/4 skips; Firefox+WebKit 66 aprovados/10 skips na validação do commit. Safari/iOS e Android físicos, teclado virtual e matriz completa de zoom não demonstrados.', regressionSources);
revise('UX98', 'P', 'validacao_operacao', '15 migrations reconciliadas e 118 pgTAP locais aprovados. Novas funções exigem fechamento R01–R04; faltam ensaio de restauração/backup e execução operacional controlada do expurgo.', notificationSources);
revise('UX99 AC30', 'P', 'codigo_validacao', 'Regressões B01–B07 verdes e endpoint E2E explícito. Diagnósticos desta revisão confirmam R01/R02/R03/R04/R08; cobertura de entrega real, sessão concorrente e falhas extremas ainda incompleta.', regressionSources + '; ' + notificationSources + '; ' + logoutSources);
revise('UX100 LK50', 'P', 'operacao_validacao', 'Código local/GitHub/produção reconciliados em f20df44 e migrations 15/15. Check Supabase Preview continua vermelho; demais gates verdes. Novos achados e aceites dos planos impedem conclusão integral.');
revise('LK19', 'I', 'nenhuma_no_escopo_tecnico', 'Card mostra mínimo/cores/resumo; mínimo desconhecido recebe Quantidade a confirmar. Regras de múltiplos permanecem em LK23.', 'src/components/ProductCard.tsx');
revise('LK23', 'P', 'dados_codigo', 'B02 e B07 corrigidos. Contrato não modela múltiplo de compra confirmado quando aplicável; é necessário levantar dados comerciais e diferenciar mínimo/múltiplo/estimativa.', regressionSources);
revise('GR08', 'P', 'codigo_validacao', 'Grafo atual representa 146 arquivos, dos quais 19 SQL e nenhum Markdown. Passe documental e cobertura por símbolo permanecem incompletos.');
revise('GR13', 'I', 'nenhuma_no_escopo_tecnico', 'Mapa atual validado: 1099 nós e 2416 relações, gerado a partir de f20df44; artefatos não são entregues no frontend.');
revise('GR37', 'P', 'validacao', 'Memórias e reflexão locais foram usadas, mas não há ensaio completo do ciclo de correção de memória errada, vínculo de validade e atualização por commit.');
revise('AC22', 'I', 'nenhuma_no_escopo_tecnico', 'Detalhe limpa orçamento anterior na mudança de ID e apresenta recuperação se nova leitura falhar; B04 encerrado por E2E.', 'src/pages/CustomerQuotePage.tsx; e2e/smoke.spec.ts');
revise('AC24', 'P', 'operacao_validacao', 'Metadados/versionamento e semântica de validade corrigidos; falta aceite atual do ciclo comercial de publicação/acesso/ajuste com documento controlado.', 'src/pages/CustomerQuotePage.tsx; src/lib/customerAccount.test.ts');

const codePending = new Set('UX02 UX12 UX13 UX17 UX18 UX35 UX39 UX47 UX49 UX53 UX54 UX55 UX58 UX60 UX65 UX84 UX92 UX97 LK12 LK15 LK26 LK30 LK38 GR20 GR21 GR25 GR31 GR32 GR33 GR34 GR35 GR36 GR43'.split(' '));
const summary = {};
const output = rows.map(row => {
  const delta = deltas.get(row.id);
  const state = delta?.state || row.estado_revisado;
  const group = row.id.match(/^[A-Z]+/)[0];
  summary[group] ||= { I: 0, P: 0, N: 0, E: 0, A: 0 };
  summary[group][state]++;
  return {
    id: row.id, entrega: row.entrega, estado_antes: row.estado_revisado, estado_revisado: state,
    natureza_pendencia: delta?.nature || (state === 'I' ? 'nenhuma_no_escopo_tecnico' : state === 'E' ? 'material_pesquisa_operacao' : state === 'A' ? 'alternativa_arquitetural' : state === 'N' ? 'entrega_ausente' : codePending.has(row.id) ? 'codigo_validacao' : 'validacao_operacao'),
    fontes: [...new Set([row.fontes, delta?.sources].filter(Boolean).flatMap(text => text.split(';').map(s => s.trim())))].join('; '),
    conclusao_e_aceite_restante: delta?.note || row.conclusao_e_aceite_restante,
    metodo: delta ? 'Reavaliado pelo delta de implementação, fontes atuais e evidências especificadas no relatório de fechamento.' : 'Revisão anterior confrontada com planos e diff; critério pendente permanece. Não representa novo teste individual desta linha.',
    commit_base: baselineCommit, commit_auditado: auditedCommit,
  };
});
assert.equal(output.length, 230);
for (const [group, count] of Object.entries({ UX: 100, LK: 50, GR: 50, AC: 30 })) {
  assert.equal(output.filter(row => row.id.startsWith(group)).length, count);
}
const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
const columns = Object.keys(output[0]);
const csv = [columns, ...output.map(row => columns.map(column => row[column]))].map(row => row.map(escape).join(',')).join('\n') + '\n';
writeFileSync(new URL('docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv', root), csv);
const totals = Object.values(summary).reduce((total, counts) => { for (const key of Object.keys(total)) total[key] += counts[key]; return total; }, { I: 0, P: 0, N: 0, E: 0, A: 0 });
const result = { commit: auditedCommit, referencias: output.length, fontesDePlanos: 4, referenciasSobrepostas: true,
  contagens: summary, total: totals,
  mudancasDeEstado: output.filter(row => row.estado_antes !== row.estado_revisado).map(({id, estado_antes, estado_revisado}) => ({ id, antes: estado_antes, depois: estado_revisado })),
  limites: ['I significa implementação técnica no escopo da linha, não certificação de toda a jornada.', 'Não foi recuperada a lista literal de 50 etapas de catálogos nem a de 50 etapas de datas.', 'Aceites externos não são concluídos por testes simulados.'] };
writeFileSync(new URL('matrix-summary.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
