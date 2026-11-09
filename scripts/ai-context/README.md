# ai-context — contexto de código para agentes de IA

**O que faz:** `gerar.mjs` lê o repositório (zero dependências, Node ≥ 18) e escreve JSONs + `INDEX.md`
com rotas, menu, módulos, componentes, hooks, rotas HTTP de backend, banco (migrations/types), testes, CI,
scripts, convenções e baseline. Genérico: React/Next/Vue/Svelte/Nuxt/Remix/Astro, Express/Hono/Fastify/Nest,
funções serverless por arquivo (Vercel `api/`), FastAPI/Flask/Django, Supabase/Prisma/Drizzle/TypeORM/SQL.
Saída determinística para o mesmo checkout: entre duas execuções só muda `manifest.json → gerado_em`, e a
ordenação não depende de locale, fuso, versão do Node ou do git. `baseline.json`/`INDEX.md` trazem janelas
do `git log` (7/30/90 dias), que andam com o calendário e com a profundidade do clone.

**Como rodar:** `node scripts/ai-context/gerar.mjs [--root <dir>] [--out <dir>] [--quiet] [--help]`
(`--out` relativo é resolvido contra a raiz; padrão de saída `inventario/ia`, ou `ai-context.config.json →
out`, ou env `AI_CONTEXT_DIR`; `--root=<dir>`/`--out=<dir>` também valem).
Neste repo: `npm run contexto:ia` escreve em `docs/contexto/codigo/`.
Código de saída: `0` gerou (seção que falhou fica em `manifest.json → erros`, em `baseline.json →
erros_do_gerador` e em stderr, mesmo com `--quiet`); `1` não conseguiu escrever a saída; `2` argumento
desconhecido, valor ausente, raiz inexistente ou saída apontando para a raiz do repo — nada é escrito.
Os arquivos só vão para o disco depois de tudo montado, com `manifest.json` por último.

**Testes:** `npm run contexto:ia:test` (`node --test scripts/ai-context/gerar.unit.mjs`, segundos; roda no
job `codigo` do `contexto.yml` antes de gerar). **Cenários:** `node scripts/ai-context/cenarios.mjs
[--only <trecho>] [--keep]` monta ~240 repositórios sintéticos (SQL, rotas, menus, edges, serverless,
workflows, monorepo, Python, CLI, arquivos corrompidos, fuzz) e leva ~1 min; sai com `1` se algum falha
ou se `--only` não casa com nenhum cenário. Não está ligado a npm script nem a workflow: rode à mão ao
mexer no gerador.

**Config opcional** (`ai-context.config.json` na raiz): `out`, `skipDirs`, `srcDirs`, `menuFiles`,
`routeFiles`, `aliases`, `typesFile`, `maxFileMB`, `graphifyDir`, `publicacao` (texto do rodapé do
`INDEX.md` dizendo onde o contexto é publicado neste repo; env `AI_CONTEXT_PUBLICACAO` tem precedência).

**Neste repo** (`ai-context.config.json`): `srcDirs = src, api, shared` — o backend são as funções
serverless da Vercel em `api/`, e `shared/` é código de aplicação compartilhado, não ferramenta.
`typesFile = src/types/site-database.types.ts` (tipos do Supabase isolado do site). Não há Supabase Edge
Functions: `edge-functions.json` sai vazio e as funções de `api/` aparecem em `rotas.json →
rotas_http_backend`.

## O que o gerador entende sem configuração

- **Funções serverless da Vercel** (`api/**/*.ts|js|py|go` com `vercel.json`): cada arquivo é uma rota,
  menos pasta/arquivo começando com `_` ou `.`, testes e `.d.ts`. Em `rotas_http_backend` cada uma traz
  `metodo` (lido do teste de `request.method` no handler ou no módulo que ele importa; `ANY` se não houver),
  `rpcs`/`tabelas`/`env` do fecho transitivo de imports e `diretos` (só o que está no próprio arquivo),
  `rewrites_de`, `cron` e `max_duration` do `vercel.json` e `chamada_por` (arquivos da aplicação que citam
  o caminho).
- **Supabase em subpasta** (`<app>/supabase`): migrations, `config.toml`, `functions/` e testes pgTAP
  (`tests/**/*.sql`) seguem essa raiz. Havendo pasta de migrations, SQL solto de `docs/` ou `scripts/` não
  entra no schema reconstruído.
- **Schema fora de `public`**: tabela, função, view, enum e função de trigger levam o prefixo do schema
  (`site_private.x`); o arquivo de tipos é lido para todos os schemas, então `drift` vale para eles também.
  Sobrecarga de função é acompanhada por número de argumentos: `drop function f(uuid)` não apaga `f(uuid, text)`.
- **RPC**: `.rpc('nome')`, helper `rpc<T>(…, 'nome')`, URL `/rest/v1/rpc/nome` e literal igual ao nome de
  uma função SQL do repo em arquivo que fala com RPC (cobre `const nome = cond ? 'a' : 'b'`).
- **Proteção de rota** vem do wrapper (`<RequireAuth><Pagina/></RequireAuth>`), não do nome da página.
  Checagem de sessão feita dentro do componente não é visível aqui.
- **Papéis**: `role="status"`/`role: 'dialog'` (WAI-ARIA) não contam como papel de permissão.
- **Flags**: `isFeatureEnabled('x')` e afins, `FEATURE_*`, `FF_*`, `ENABLE_*` e `*_ENABLED`.
- **Env não declarada**: ignora as do runtime/plataforma (`NODE_ENV`, `CI`, `VERCEL_*`, `MODE`…) e as que o
  `.env.example` cita em comentário.
- **Graphify**: o commit do grafo vem de `graph.json → built_at_commit` ou de `project-meta.json → commit`;
  as instruções de gerar/consultar usam os scripts `graph:*` do `package.json` quando existem.

O workflow `.github/workflows/contexto.yml` roda o gerador a cada push em `main` e a cada 10 min e
publica em `docs/contexto/codigo/` na branch `contexto` (índice único em `docs/contexto/00-INDEX.md`).
O grafo do graphify (`grafo-graphify.json`, `GRAPH_REPORT.md`) só entra quando o dispatch é feito com
`graphify=true`, porque exige `npm ci` + `pip install -r requirements-graphify.txt`; no agendamento o
gerador roda sem nenhuma dependência.

**Secrets:** nenhum (lê só arquivos do repo e `git log`).

## Alcance dos alertas

- O schema reconstruído ignora os diretórios `_foreign/` e `_superseded/`: são histórico, não migrations
  vigentes. Os demais SQLs do diretório de migrations continuam sendo considerados.
- Alertas de tabela/RPC inexistente, o mapa de chamadores e os fatos de aplicação (rotas HTTP, hooks,
  flags, papéis, hosts externos, tabelas de ORM) excluem testes, stories, arquivos `*.config.*` e raízes
  de ferramentas/documentação (`scripts/`, `bin/`, `tools/`, `.github/`, `docs/`, `inventario/`,
  `analise/`, `examples/`, `samples/`). Esses arquivos continuam nos inventários próprios e contam como
  ponto de entrada no grafo (não aparecem como órfãos). Uma raiz desse tipo que contenha aplicação pode
  ser declarada em `srcDirs`.
- `possiveis_segredos_no_codigo` varre tudo, inclusive testes e ferramentas; a linha reportada é a do
  arquivo.
- As relações são extraídas estaticamente: referência encontrada não prova execução; ausência de
  chamador no mapa não prova que uma função não tenha consumidor externo. Marcadores `TODO` também são
  candidatos para revisão — texto em português sem pontuação pode ser ambíguo.
- Limite conhecido: os comentários são removidos por expressão regular antes da análise; `//` ou `/*`
  dentro de string (URL sem `:` antes, glob `**/*`) pode esconder o resto da linha ou do trecho.
