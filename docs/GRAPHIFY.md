# Graphify no Promo Brindes

Graphify é uma ferramenta local de engenharia para navegar relações estruturais do código. Não é parte do site público, não altera a Vercel, não acessa o Supabase e não é uma fonte de verdade para comportamento de produção.

## Segurança e escopo

- A raiz é fixada em `Promo_Brindes_V1`; o wrapper recusa projeto diferente.
- A rotina automática é `code-only`: AST local, sem provedor de IA e sem envio de conteúdo a rede.
- `.graphifyignore` exclui variáveis de ambiente, chaves, saídas de build, ativos públicos, material de auditoria e artefatos do próprio Graphify.
- `graphify-out/` é ignorado pelo Git. Configuração, comandos, testes e este runbook são versionados.
- A promoção do grafo é atômica: um candidato é validado e examinado antes de substituir o último mapa válido.
- A versão fixada é `graphifyy 0.9.48`. Atualizações exigem candidato separado, testes e mudança explícita em `.graphify.project.json`.

## Comandos

```bash
npm run graph:doctor          # ambiente, raiz e versão esperada
npm run graph:build           # reconstrução estrutural segura
npm run graph:update          # reconciliação segura (rebuild completo para este corpus pequeno)
npm run graph:status          # atual, ausente, inválido ou defasado
npm run graph:check           # status com código de erro em CI se não estiver atual
npm run graph:query -- "como funciona o orçamento?"
npm run graph:impact -- "QuotePage"
npm run graph:tree            # atualiza a árvore HTML local
npm run graph:benchmark       # testa 10 perguntas estruturais contra busca direta
npm run graph:compare -- --base /caminho/base.json --head graphify-out/graph.json
npm run test:graphify         # testes dos guardas do wrapper
```

Após `graph:build`, abra localmente `graphify-out/graph.html` para comunidades e `graphify-out/GRAPH_TREE.html` para hierarquia. O arquivo `project-meta.json` registra commit, versão, impressão digital das fontes, tamanho e limitações da geração.

## Como interpretar o mapa

O Graphify 0.9.48 usado aqui emite o grafo estrutural como **não direcionado** no comando headless. Assim, `graph:impact` é uma vizinhança técnica para orientar leitura e testes; não prova causalidade reversa nem substitui busca no código, testes ou revisão. A relação exibida é evidência estrutural, não autorização para alterar banco, infraestrutura ou o projeto interno Promo Gifts.

Os termos do domínio em português recebem expansão controlada nas consultas: por exemplo, `orçamento` acrescenta `quote request` e `carrinho` acrescenta `quote cart`. A consulta é passada como argumento literal, nunca para um shell.

## Operação diária

1. Antes de investigar arquitetura, execute `npm run graph:status`.
2. Se estiver defasado, execute `npm run graph:update` e leia o resumo de integridade.
3. Faça a consulta ou abra a visualização.
4. Confirme conclusões importantes no arquivo e nos testes citados pelo grafo.
5. Após uma alteração de engenharia, execute `npm run graph:build` antes da revisão ou deixe o CI executar o mesmo fluxo.

O hook nativo do Graphify não é instalado por padrão: ele reconstrói em segundo plano após commits e torna o estado mais difícil de observar. A integração do repositório privilegia comandos explícitos e CI reproduzível. Se o time optar por instalá-lo, registre essa decisão, confira `graphify hook status` e use `GRAPHIFY_SKIP_HOOK=1` para uma desativação pontual.

## Benchmark e relatório de pull request

`docs/graphify-benchmark.json` contém dez perguntas representativas. `npm run graph:benchmark` exige que cada pergunta recupere, no mapa, o arquivo esperado e que a busca direta encontre o mesmo ponto de implementação. O resultado é salvo localmente em `graphify-out/BENCHMARK.md`.

Em pull requests, o workflow também constrói o mapa da base em um worktree temporário e cria `graphify-out/BASE_HEAD_REPORT.md`. O relatório compara nós, relações e arquivos entre base e head; ele é publicado junto do artefato do workflow. É uma comparação estrutural — não afirma causalidade em um grafo não direcionado. As decisões arquiteturais vigentes estão em [Governança do fechamento](GOVERNANCA_FECHAMENTO.md).

## Recuperação

Se a geração falhar, o último `graphify-out/` válido permanece intacto. Remova somente o diretório de trabalho `.graphify-work/` quando não houver processo de geração e execute `npm run graph:build` novamente. Nunca copie artefatos de outro projeto nem use `--force` para mascarar redução inesperada.

Para um passe semântico de documentação, abra uma tarefa separada: selecione fontes técnicas revisadas, defina orçamento e retenção, e registre a origem de cada relação. Esse passe não faz parte da automação atual por privacidade e previsibilidade.
