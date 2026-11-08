---
name: promo-brindes-v1
description: Convenções de código e commit do site Promo Brindes V1 (TypeScript, React 19 + Vite, funções serverless Vercel). Use ao alterar código, criar testes ou escrever mensagem de commit neste repositório; as regras operacionais ficam em AGENTS.md.
---

# Promo Brindes V1 — convenções

As regras de trabalho (banco, fluxo Git, PR, comunicação) estão em `AGENTS.md` na raiz — este skill só
resume convenções de código e commit. Onde fica cada coisa: `docs/agentes/mapa-repo.md`.

## Commits

`<tipo>: <assunto>` ou `<tipo>(<escopo>): <assunto>` em PT-BR, modo imperativo, primeira linha curta e
sem ponto final. Tipos que o `AGENTS.md` lista: `fix` `feat` `chore` `infra`; o histórico da `main` usa
também `docs`, `ci` e `test` (`fix` em ~55% dos commits).
**Não há hook `commit-msg` neste repo** — o padrão é cobrado na revisão da PR, não por script.

Exemplo: `fix: restaura contrato público do catálogo na view do site`

## Código

- Linguagem: TypeScript. Front React 19 + Vite em `src/`; back = funções serverless Vercel em `api/*.ts`
  (helpers em `api/_lib/`); código compartilhado entre os dois em `shared/`. Não há Supabase Edge Functions.
- Funções `camelCase`, componentes/classes `PascalCase`, constantes `SCREAMING_SNAKE_CASE`; arquivos de
  página/componente em `PascalCase.tsx`, módulos de `src/lib` e `api/_lib` em `camelCase.ts`.
- Exports nomeados; siga o padrão de import do arquivo vizinho.
- Testes ao lado do módulo (`src/lib/catalog.test.ts`, `src/pages/QuotePage.test.ts`), testes de API em
  `tests/api/*.test.ts`, guardas em `tests/*.node.mjs` (`node --test`) e E2E Playwright em `e2e/`.
  Rode só o que tocou: `npx vitest run <caminho>` · `node --test tests/<arquivo>.node.mjs`.
- SQL do banco isolado: migration aditiva em `site-supabase/supabase/migrations/` com nome
  `YYYYMMDDHHMMSS_descricao.sql` e teste pgTAP em `site-supabase/supabase/tests/database/`.
- Siga os padrões já existentes no módulo; não desvie sem motivo registrado na PR.
