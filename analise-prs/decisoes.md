# Log de Decisões — Análise Complementar analise-prs/

**Período:** 2026-10-31 → 2026-11-01
**Branch:** `claude/docs-analise-complementar-261101-0912`
**SHA base:** b19311989efe273e47dd8949ef126225206ad208

---

## D-01 · 2026-10-31 — Escopo doc-only, sem tocar código da aplicação

- **Contexto:** a tarefa pedia 7 documentos complementares em `analise-prs/`. Qualquer mudança em `src/`, `api/`, migrations ou workflows acionaria CI pesado e risco de regressão.
- **Alternativas:** (a) gerar docs + ajustes de código juntos; (b) só docs.
- **Decisão:** só docs (CSV, Markdown, JSON). Nenhum arquivo de aplicação alterado.
- **Justificativa:** análise é leitura + síntese; não há bug a corrigir neste escopo. Diff mínimo, zero churn.

## D-02 · 2026-10-31 — Nenhuma PR nova de aplicação necessária

- **Contexto:** após reconciliar 107 PRs com AUDITORIA.md (22 achados) e auditoria 11/10 (127 PFs), era preciso decidir se faltava alguma PR de código.
- **Alternativas:** (a) abrir PRs de código para PFs P1; (b) não abrir, pois PFs P1 dependem de decisão do dono (D1–D12) ou são onda 0 de configuração.
- **Decisão:** nenhuma PR de aplicação. PFs P1 de engenharia pura (onda 0: PF-66/67/70) são configuração em Settings, não código — vão em tarefa própria.
- **Justificativa:** abrir PR de código sem D1 (destino do lead) ou D2 (credenciais) geraria código morto ou feature flagada sem consumidor.

## D-03 · 2026-11-01 — Vereditos sobre as 18 PRs fechadas sem merge

- **Contexto:** 18/107 PRs foram fechadas sem merge. Era preciso julgar se algo de valor foi perdido.
- **Alternativas:** (a) reabrir alguma; (b) confirmar descarte.
- **Decisão:** descarte confirmado para as 18. 14 são dependabot — 12 superseded de fato (versão mais nova mergeada depois: #15→#20/#85, #56/#84/#97/#101→#104, #58→#87, #60→#85, #61/#62→#99, #86 duplicata da #18, #98→#102, #100→#105), **#57 e #59 NUNCA aplicados** (deps ainda pinadas: `requirements-graphify.txt` com `tree_sitter_sql==0.3.5` e `actions/github-script@v7.0.1` em 6 workflows — "superseded" não verificado); os outros 2 dependabot fechados sem sucessora mergeada (#86 relata duplicata, #101 contido). 4 agente-copilot superseded/abandonadas com escopo absorvido (#69→#73→abandonada/coberta por #71; #66→#72 refeita; #74 resolvida via #78). 1 rejeitada e refeita (#66→#72).
- **Justificativa:** evidência em `prs.csv` (merged_at preenchido nas sucessoras, closed_at sem merge nas descartadas) + `git grep` em `origin/main` nas linhas de dependência citadas acima.

## D-04 · 2026-11-01 — Contagem real: 107 PRs (#1..#109, #75 e #80 inexistentes)

- **Contexto:** o escopo citava "108 PRs (#1..#110)". O `prs.csv` contém 107 registros (#1..#109, sem #75 e #80).
- **Alternativas:** (a) forçar o número 108/110 do escopo; (b) reportar o real.
- **Decisão:** reportar 107 PRs analisadas, com #75 e #80 inexistentes (a #110/#111 são PRs de documentação da própria análise, já mergeadas).
- **Justificativa:** verdade acima de validação — número inventado quebraria a reconciliação com `prs.csv`.

## D-05 · 2026-11-01 — `funcionalidades.csv` com 127 linhas (F-01..F-127)

- **Contexto:** mapear funcionalidades × PRs × achados × prioridade.
- **Alternativas:** (a) só PFs da auditoria 11/10; (b) PFs + entregas das PRs mergeadas.
- **Decisão:** (b) — F-01..F-92 espelham os PFs (estado/completude da auditoria), F-93..F-127 registram o que as PRs mergeadas entregaram (COMPLETA, com PRs citadas).
- **Justificativa:** sem a parte (b), o CSV contaria só o que falta e esconderia o que foi feito.

## D-06 · 2026-11-01 — Regras com status VIGENTE/SUSPEITA/CONTRADITÓRIA em vez de binário

- **Contexto:** extrair regras de negócio de docs + código.
- **Alternativas:** (a) listar só regras confirmadas; (b) incluir divergências documento×código.
- **Decisão:** (b) — 3 status; SUSPEITA e CONTRADITÓRIA apontam exatamente onde texto promete o que o código não faz (PF-14..PF-21, PF-27, PF-42, PF-17/PF-30).
- **Justificativa:** o valor da auditoria está nas divergências, não na repetição do óbvio.

## D-07 · 2026-11-01 — CI documentado por leitura de workflows, sem `gh run list`

- **Contexto:** o escopo pedia `gh run list` para histórico real de runs.
- **Alternativas:** (a) bloquear sem CLI; (b) documentar os 14 workflows lidos no repo + runs citados nas auditorias.
- **Decisão:** (b) — `baseline/ci-checks.md` descreve os 4 checks obrigatórios do merge a partir dos arquivos `.github/workflows/` (CodeQL e dependency-review documentados como checks independentes, não gates) e registra a limitação (histórico de runs NÃO VERIFICADO nesta sessão).
- **Justificativa:** afirmar resultado de run sem evidência violaria a regra "sem evidência = NÃO VERIFICADO". **Atualização 2026-11-10:** histórico verificado via `gh run list` (10 runs success em 2026-11-10, SHA d312cad) — seção 3 do ci-checks deixou de ser pendente.
