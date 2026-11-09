# AGENTS.md — Promo_Brindes_V1

Regras do dono para qualquer agente de IA. Se `docs/` contradisser, este arquivo vence (docs antigos são histórico). Responda sempre em PT-BR.
Versão enxuta do texto-mestre adm01-debug (2026-11-02); íntegra em `docs/agentes/texto-mestre-adm01-debug.md`.
Referência longa fica em `docs/agentes/<tema>.md`, citada aqui como "ler quando <situação>"; divergiu da realidade → corrija no mesmo PR do fix.

## Postura

- Execução ponta a ponta via MCP (GitHub, Supabase, Vercel). O dono não é dev: descreve, o agente resolve inteiro. Nunca "roda aí".
- Decida como dev sênior. Pergunte só por custo, arquitetura, dado destrutivo em produção, trade-off de negócio ou regra 8 do Fluxo Git. Para ler/inspecionar, nunca peça permissão.
- Verdade acima de validação. Não sabe → diga. Falhou → diga. Afirmação sobre código cita evidência (arquivo:linha, diff, saída); sem evidência = "NÃO VERIFICADO" + motivo. Branch/commit/PR não provam nada — leia o código.
- Diff mínimo, zero churn: causa raiz, não reescrita. Não refatore, renomeie, "melhore" nem comente o que não foi pedido. Dependência nova ou bump major só se indispensável — avise na PR.
- `APROVADO` = execute o plano exatamente como descrito, sem reconfirmar.
- Uma tarefa por vez, cada uma com sua branch/PR. Outro bug? Anote em "Próximos passos", não conserte. Travou → reporte o erro exato e pare; não contorne regra. Antes de concluir, releia o pedido.
- Antes de qualquer tarefa: `git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md` — estado real do banco, do código e das regras, regerado a cada 10 min. Detalhe em `docs/agentes/contexto-agentes.md`.
- Tokens: leia só o trecho necessário; grafo antes de busca textual; exploração ampla → subagente. Sem tool "por garantia" nem código não aplicado. Princípio: qualidade + velocidade.
- Segredos só em env/secret do serviço (nomes em `.env.example`). Nunca secret em `VITE_*`; nunca commite `.env.local`, chaves de API ou service_role; nunca imprima token, secret ou variável sensível em output ou commit. Preview usa projeto Supabase próprio.
- Nunca: narrar o que faz; perguntar "quer que eu faça?" após o pedido; sugerir passo manual do dono quando há MCP; plano de 12 fases para fix de 20 linhas; ler o repo inteiro para achar 1 função.

## Bugs e funcionalidades

- Diagnóstico antes de patch: logs e estado real, ponto exato (arquivo:linha), causa declarada. Várias causas → liste todas, corrija a pedida.
- Antes da PR: typecheck/lint/testes dos arquivos tocados. Mexeu em `AGENTS.md`, `CLAUDE.md`, `docs/agentes/*.md` ou nos skills → `npm run agents:instructions:check`. Só erro seu conta; erro herdado do `main` vai para "Próximos passos".
- "Pronto" (bug) = PR mergeada + deploy confirmado + comportamento verificado (log, query ou request real). Faltou um → diga onde parou.
- "Pronta" (feature) = integrada ponta a ponta: UI, rota, serviço, tabela com RLS, estados erro/loading/vazio, handlers e submit. Sem mock, hardcode, TODO. Fluxo pela metade não é pronto. Não coube → entregue o funcional e liste o que falta, em ordem, com arquivos.
- Mudança visual: mockup (desktop e celular quando afetar ambos) aprovado explicitamente pelo dono antes de tocar o código; íntegra em `docs/agentes/aprovacao-visual-design.md`. Fix só funcional dispensa mockup.

## Comunicação

- Resultado primeiro; só o que muda uma decisão do dono. Sem introdução, recapitulação, hedging, disclaimers, lição de moral. Único fechamento: "Próximos passos".
- O que mudou e o efeito no negócio; técnica só se perguntarem. Resposta proporcional ao fix. Não despeje log/tool — cite a linha que importa. Caminhos, comandos e links completos.
- Destrutivo de verdade: uma linha ("isso apaga X, sem volta — confirma?").
- Fim de execução: exatamente 3 "Próximos passos" por impacto (`N. [título] — [por quê] · [arquivo/camada]`), do que viu nesta sessão, executáveis via MCP, para não-dev. Nada genérico ("adicionar testes", "melhorar docs", "revisar segurança"). É um menu: `1`, `APROVADO 2`, "todos" ou o bloco devolvido = executar na ordem, sem reconfirmar. Só consulta, sugestões que o dono já rejeitou ou nada pendente → `Próximos passos: nada pendente neste escopo.`

## Fluxo Git — detalhe em `docs/agentes/github-ci.md`

Escrita no GitHub: MCP **`GITHUB - MCP - FOREVER`** (o padrão dá 403 em write; `git push`/`gh` só com repo autorizado).

1. Nunca commite em `main`. Toda mudança nasce em branch própria.
2. Só escreva em branch que **você** criou nesta sessão; branch alheia é somente leitura.
3. Antes de começar, liste PRs abertas: `github_graphql` com `pullRequests(states:OPEN){ nodes { number files { nodes { path } } } }`. PR aberta nos mesmos arquivos → pare e avise o dono.
4. Branch de `main` atualizado: `claude/<tipo>-<slug>-<AAMMDD-HHMM>`, tipo `fix`|`feat`|`chore`|`infra`. Uma tarefa = uma branch = uma PR. Antes de cada push, confirme que o último commit é seu.
5. Commits curtos em PT-BR com prefixo (`fix:`, `feat:`, `chore:`, `infra:`), de preferência 1 commit atômico.
6. PR sempre. Título = o que muda. Corpo = causa/por quê + o que foi verificado de verdade, com evidência.
7. Mergeie sem aprovação as PRs suas já prontas: CI verde, sem conflito, escopo comum (front, função serverless, workflow, config). Squash-merge e apague a branch. Única exceção: regra 8.
8. Deixe aberta e chame o dono quando envolver: DDL/migration em produção; CI/workflows, segredos, Dockerfile, stack/Swarm, Traefik; deleção de dado, arquitetura ou custo; conflito com PR de outro agente.
9. Conflito: rebase em `main`; `--force-with-lease` só na sua branch. Nunca force-push em `main` nem toque em branch alheia.
10. Após merge, confira que o deploy subiu e reporte. CI vermelha → leia o resumo; vermelho do seu merge → `fix:` em branch nova na mesma sessão.
11. Reporte no fim: link da PR + estado (mergeada / aberta aguardando o dono / CI vermelha e por quê).

## Banco — ler `docs/agentes/banco.md` antes de SQL, migration ou deploy

- Supabase **canônico** `doufsxqlfjyuvxuezpln` (catálogo): somente leitura via views `v_site_products_public`/`v_products_public`; sem migrations daqui; MCP `SUPABASE - GESTÃO DE PRODUTOS`; contrato quebrou → `docs/RUNBOOK_BANCO_PRINCIPAL.md`.
- Supabase **isolado do site** `xlzmclcjdncjfdrjxclt` (leads, área do cliente): migrations em `site-supabase/supabase/migrations`, pgTAP em `site-supabase/supabase/tests/database`. Não há MCP deste projeto — use os comandos `npm run db:site:*`.
- Não altere o projeto interno Promo Gifts (`Promo_Gifts_V4`) por este site.
- Aplicar migration: `npm run db:site:guard` (bloqueia o ref canônico) → `npm run db:site:dry-run` → `SUPABASE_WORKDIR=site-supabase npx supabase@latest db push`. Nunca `db reset --linked`.
- Migration `YYYYMMDDHHMMSS_descricao.sql`, aditiva; nunca reverta schema destrutivamente em produção. `release.yml` exige ledger remoto idêntico às migrations do repo; divergiu → `docs/RUNBOOK_RECONCILIACAO_LEDGER.md`.
- Mudou estado de requisito do ledger de fechamento? `docs/GOVERNANCA_FECHAMENTO.md` + `npm run ledger:check`.

## Serviços

- **Vercel** — ler `docs/agentes/vercel-deploy.md` ao confirmar deploy ou mexer em env var, domínio ou cron. Merge em `main` = produção. Deploy Git da Vercel desligado; `release.yml` faz ledger → build do SHA → promoção → smoke, com rollback automático. Falha/rollback → `docs/RUNBOOK_RELEASE.md`.
- **GitHub/CI** — ler `docs/agentes/github-ci.md` ao mexer em settings, branch protection ou workflows. Checks obrigatórios: `validate` e `cross-browser` (quality.yml), `Migrations and pgTAP` (database.yml), `Build structural Graphify map` (graphify.yml). CODEOWNERS pede review de `@adm01-debug` em toda PR, mas o merge não exige aprovação; `strict` e conversa de review aberta bloqueiam.
- **Notificação e webhooks** — fila de e-mail/WhatsApp em `api/notifications.ts` com outbox no banco isolado; provedores Resend e WhatsApp Cloud API, assinatura verificada em `api/_lib/webhookSignature.ts`. Antes de mexer, ler `docs/agentes/regras-dominio.md`.
- **Regras de domínio** — ler `docs/agentes/regras-dominio.md` ao mexer em lead/orçamento, fila de notificação, seleção compartilhada ou retenção de dado.

## Stack e comandos — detalhe em `docs/agentes/mapa-repo.md`

- Repo `adm01-debug/Promo_Brindes_V1`. Site público B2B de catálogo e orçamento, sem preço nem pedido. Produção https://promo-brindes-v1.vercel.app (Vercel `juca1/promo-brindes-v1`).
- Stack: React 19 + Vite + TypeScript, supabase-js. Backend = funções serverless Vercel em `api/*.ts` (sem Supabase Edge Functions). Node 24.15.0 / npm 11.17.0. Vitest, Playwright.
- Pastas: `src/`, `api/`, `shared/`, `site-supabase/`, `scripts/`, `tests/`, `e2e/`; `vercel.json`; `.env.example`; `docs/RUNBOOK_*`, `docs/DATABASE_*`; `graphify-out/` ignorado. Onde fica o quê: `docs/agentes/mapa-repo.md`.
- Convenções de código e commit: `.claude/skills/promo-brindes-v1/SKILL.md` (cópia idêntica em `.agents/skills/promo-brindes-v1/SKILL.md` para o Codex). Hooks de sessão e guardas do grafo: `.claude/settings.json` + `.claude/hooks/session-start.sh`; baseline do Codex em `.codex/`.
- `npm run dev` · `lint` · `typecheck` · `test` · `test:e2e` · `build` · `check` (gate completo, o mesmo do check `validate`).
- Contexto para agentes: `npm run contexto:ia` · `contexto:regras` · `inventario:banco` · `contexto:test` · `test:inventario`. Publicação automática na branch `contexto` (`contexto.yml`, 10 min) e no PR `automation/inventario-estado` (semanal); regras humanas em `docs/contexto/regras/manual/`. Nunca abra PR da branch `contexto`.

## Grafo de código (graphify)

`npm run graph:status`; atual → `npm run graph:query -- "<pergunta>"` (banco: `graph:db:query`). Defasado → `npm run graph:update`, nunca `graphify update .`. Regras do grafo (impact é só pista, sem IA/rede, não commitar): `docs/agentes/graphify-regras-agentes.md`; versão fixada do CLI e detalhes do wrapper em `docs/agentes/mapa-repo.md`.
