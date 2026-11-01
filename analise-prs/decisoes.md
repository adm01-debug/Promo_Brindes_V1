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

- **Contexto:** após reconciliar 109 PRs com AUDITORIA.md (22 achados) e auditoria 11/10 (127 PFs), era preciso decidir se faltava alguma PR de código.
- **Alternativas:** (a) abrir PRs de código para PFs P1; (b) não abrir, pois PFs P1 dependem de decisão do dono (D1–D12) ou são onda 0 de configuração.
- **Decisão:** nenhuma PR de aplicação. PFs P1 de engenharia pura (onda 0: PF-66/67/70) são configuração em Settings, não código — vão em tarefa própria.
- **Justificativa:** abrir PR de código sem D1 (destino do lead) ou D2 (credenciais) geraria código morto ou feature flagada sem consumidor.

## D-03 · 2026-11-01 — Vereditos sobre as 18 PRs fechadas sem merge

- **Contexto:** 18/109 PRs foram fechadas sem merge. Era preciso julgar se algo de valor foi perdido.
- **Alternativas:** (a) reabrir alguma; (b) confirmar descarte.
- **Decisão:** descarte confirmado para as 18. 13 são dependabot superseded (versão mais nova mergeada depois: #15→#20/#85, #56/#84/#97/#101→#104, #58→#87, #60→#85, #61/#62→#99, #86 duplicata da #18, #98→#102, #100→#105, #57 grupo pip, #59 major absorvido). 4 agente-copilot superseded/abandonadas com escopo absorvido (#69→#73→abandonada/coberta por #71; #74 resolvida via #78). 1 rejeitada e refeita (#66→#72).
- **Justificativa:** evidência em `prs.csv` (merged_at preenchido nas sucessoras, closed_at sem merge nas descartadas).

## D-04 · 2026-11-01 — Contagem real: 109 PRs (#1..#109, #75 inexistente)

- **Contexto:** o escopo citava "108 PRs (#1..#110)". O `prs.csv` contém 109 linhas (#1..#109, sem #75).
- **Alternativas:** (a) forçar o número 108/110 do escopo; (b) reportar o real.
- **Decisão:** reportar 109 PRs analisadas, com a #75 inexistente e a #110 entendida como a PR de inventário da sessão anterior (já mergeada).
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
- **Alternativas:** (a) bloquear sem CLI; (b) documentar os 12 workflows lidos no repo + runs citados nas auditorias.
- **Decisão:** (b) — `baseline/ci-checks.md` descreve os 5 checks obrigatórios a partir dos arquivos `.github/workflows/` e registra a limitação (histórico de runs NÃO VERIFICADO nesta sessão).
- **Justificativa:** afirmar resultado de run sem evidência violaria a regra "sem evidência = NÃO VERIFICADO".
