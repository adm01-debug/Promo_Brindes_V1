# ai-context — contexto de código para agentes de IA

**O que faz:** `gerar.mjs` lê o repositório (zero dependências, Node ≥ 18) e escreve JSONs + `INDEX.md`
com rotas, menu, módulos, componentes, hooks, rotas HTTP de backend, banco (migrations/types), testes, CI,
scripts, convenções e baseline. Genérico: React/Next/Vue/Svelte/Nuxt/Remix/Astro, Express/Hono/Fastify/Nest,
FastAPI/Flask/Django, Supabase/Prisma/Drizzle/TypeORM/SQL. Saída determinística (só `manifest.json` tem data).

**Como rodar:** `node scripts/ai-context/gerar.mjs [--root <dir>] [--out <dir>] [--quiet]`
(padrão de saída `inventario/ia`, ou `ai-context.config.json → out`, ou env `AI_CONTEXT_DIR`).
Neste repo: `npm run contexto:ia` escreve em `docs/contexto/codigo/`.
Testes: `npm run contexto:ia:test` (`node --test scripts/ai-context/gerar.unit.mjs`). Cenários: `cenarios.mjs`.

**Config opcional** (`ai-context.config.json` na raiz): `out`, `skipDirs`, `srcDirs`, `menuFiles`,
`routeFiles`, `aliases`, `typesFile`, `maxFileMB`, `publicacao` (texto do rodapé do `INDEX.md` dizendo
onde o contexto é publicado neste repo; env `AI_CONTEXT_PUBLICACAO` tem precedência).

**Neste repo** (`ai-context.config.json`): `srcDirs = src, api, shared` — o backend são as funções
serverless da Vercel em `api/`, e `shared/` é código de aplicação compartilhado, não ferramenta.
`typesFile = src/types/site-database.types.ts` (tipos do Supabase isolado do site). Não há Supabase Edge
Functions: `edge-functions.json` sai vazio e as rotas de `api/` aparecem em `rotas.json →
rotas_http_backend`.

O workflow `.github/workflows/contexto.yml` roda o gerador a cada push em `main` e a cada 10 min e
publica em `docs/contexto/codigo/` na branch `contexto` (índice único em `docs/contexto/00-INDEX.md`).
O grafo do graphify (`grafo-graphify.json`, `GRAPH_REPORT.md`) só entra quando o dispatch é feito com
`graphify=true`, porque exige `npm ci` + `pip install -r requirements-graphify.txt`; no agendamento o
gerador roda sem nenhuma dependência.

**Secrets:** nenhum (lê só arquivos do repo e `git log`).

## Alcance dos alertas

- O schema reconstruído ignora os diretórios `_foreign/` e `_superseded/`: são histórico, não migrations
  vigentes. Os demais SQLs e diretórios de migrations continuam sendo considerados.
- Alertas de tabela/RPC inexistente e o mapa de chamadores da aplicação excluem testes, stories e
  raízes de ferramentas/documentação (`scripts/`, `bin/`, `tools/`, `.github/`, `docs/`, `inventario/`,
  `analise/`, `examples/`, `samples/`). Esses arquivos continuam nos inventários próprios. Uma raiz
  desse tipo que contenha aplicação pode ser declarada em `srcDirs`.
- As relações são extraídas estaticamente: referência encontrada não prova execução; ausência de
  chamador no mapa não prova que uma função não tenha consumidor externo. Marcadores `TODO` também são
  candidatos para revisão — texto em português sem pontuação pode ser ambíguo.
