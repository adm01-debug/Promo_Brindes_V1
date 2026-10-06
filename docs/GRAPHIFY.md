# Graphify no Promo Brindes

Graphify é uma ferramenta local de engenharia para navegar relações estruturais do código. Não é parte do site público, não altera a Vercel, não acessa o Supabase e não é uma fonte de verdade para comportamento de produção.

## Segurança e escopo

- A raiz é fixada em `Promo_Brindes_V1`; o wrapper recusa projeto diferente.
- A rotina automática é `code-only`: AST local, sem provedor de IA e sem envio de conteúdo a rede.
- `.graphifyignore` exclui variáveis de ambiente, chaves, saídas de build, ativos públicos, material de auditoria e artefatos do próprio Graphify.
- `graphify-out/` é ignorado pelo Git. Configuração, comandos, testes e este runbook são versionados.
- A promoção do grafo é atômica: um candidato é validado e examinado antes de substituir o último mapa válido.
- A versão homologada permanece `graphifyy 0.9.48`. A `0.9.68` foi avaliada isoladamente e não substituiu o pin; veja [a avaliação comparativa](GRAPHIFY_0968_EVALUATION_20261005.md).

## Dois mapas, dois propósitos

O build produz corpora separados antes da extração, em vez de misturar toda a engenharia em um único mapa:

- `graphify-out/graph.json`: aplicação, APIs, scripts, testes TypeScript/JavaScript e configuração de execução explicitamente selecionada;
- `graphify-out/database/graph.json`: somente migrations, testes SQL/pgTAP e verificadores SQL de engenharia.

O wrapper valida as duas fronteiras antes da promoção: SQL no mapa principal ou fonte não SQL no mapa de banco bloqueia o build. A existência de uma migration no mapa de banco continua sem significar que ela foi aplicada remotamente.

## Comandos

```bash
npm run graph:doctor          # ambiente, raiz e versão esperada
npm run graph:build           # reconstrução estrutural segura
npm run graph:update          # reconciliação segura (rebuild completo para este corpus pequeno)
npm run graph:status          # atual, ausente, inválido ou defasado
npm run graph:check           # status com código de erro em CI se não estiver atual
npm run graph:query -- "como funciona o orçamento?"
npm run graph:path -- "KitTemplate" "QuoteItem"
npm run graph:explain -- "KitTemplate"
npm run graph:impact -- "QuotePage"
npm run graph:tree            # atualiza a árvore HTML local
npm run graph:db:query -- "qual migration criou notification_deliveries?"
npm run graph:db:path -- "20260908230000_create_site_lead_storage.sql" "notification_deliveries_set_updated_at"
npm run graph:db:explain -- "notification_deliveries_set_updated_at"
npm run graph:db:tree         # atualiza a árvore HTML do corpus SQL
npm run graph:benchmark       # testa 10 perguntas estruturais contra busca direta
npm run graph:compare -- --base /caminho/base.json --head graphify-out/graph.json
npm run test:graphify         # testes dos guardas do wrapper
```

Após `graph:build`, abra localmente `graphify-out/graph.html` para comunidades e `graphify-out/GRAPH_TREE.html` para hierarquia. Para o banco, use os equivalentes em `graphify-out/database/`. O arquivo `project-meta.json` registra commit, versão, impressão digital das fontes, contagens dos dois corpora, enriquecimento TypeScript e limitações da geração.

Objetos SQL podem aparecer em várias migrations com o mesmo rótulo. Nesses casos, `graph:db:path` e `graph:db:explain` recusam a ambiguidade e listam os IDs exatos; use um desses IDs para selecionar deliberadamente a versão desejada.

## Como interpretar o mapa

O Graphify 0.9.48 usado aqui emite o grafo estrutural como **não direcionado** no comando headless. Assim, `graph:impact` é uma vizinhança técnica para orientar leitura e testes; não prova causalidade reversa nem substitui busca no código, testes ou revisão. A relação exibida é evidência estrutural, não autorização para alterar banco, infraestrutura ou o projeto interno Promo Gifts.

Os termos do domínio em português recebem expansão controlada nas consultas: por exemplo, `orçamento` acrescenta `quote request` e `carrinho` acrescenta `quote cart`. A consulta é passada como argumento literal, nunca para um shell.

Depois da extração nativa, o wrapper usa o parser oficial do TypeScript para registrar relações `type_reference` entre consumidores e interfaces, aliases, classes e enums do próprio projeto. A etapa resolve imports relativos e `@/`, ignora tipos externos não resolvidos e cria um nó determinístico quando uma declaração local legítima não foi capturada pelo extrator. Isso corrige falsos nós de baixa conectividade como `CartAction`, `SeoProps`, `CustomerQuoteEvent` e `OccasionIdea` sem inventar vínculos semânticos.

Nos relatórios gerados, o termo upstream “isolated nodes” é apresentado como **nós de baixa conectividade**. A métrica do projeto significa “no máximo uma relação estrutural” e exclui:

- dependências externas e conceitos sem arquivo-fonte local;
- manifests, lockfiles, `tsconfig` e arquivos de configuração reconhecidos;
- nós que representam o próprio arquivo, em vez de uma declaração do código.

Esse número é uma fila de revisão, não um diagnóstico de código morto. Comunidades com menos de três nós relevantes são contabilizadas separadamente e permanecem acessíveis no JSON e nas visualizações.

`graph:path` encontra o menor caminho estrutural e `graph:explain` lista relações com fonte, confiança e direção disponível. Ambos aceitam ID exato ou rótulo único; homônimos exigem ID para evitar escolher uma função arbitrária. Um caminho ausente é informado como ausente. Nenhum comando escreve no grafo ou infere implantação remota.

## Operação diária

1. Antes de investigar arquitetura, execute `npm run graph:status`.
2. Se estiver defasado, execute `npm run graph:update` e leia o resumo de integridade.
3. Faça a consulta ou abra a visualização.
4. Confirme conclusões importantes no arquivo e nos testes citados pelo grafo.
5. Após uma alteração de engenharia, execute `npm run graph:build` antes da revisão ou deixe o CI executar o mesmo fluxo.

O hook nativo do Graphify não é instalado por padrão: ele reconstrói em segundo plano após commits e torna o estado mais difícil de observar. A integração do repositório privilegia comandos explícitos e CI reproduzível. Se o time optar por instalá-lo, registre essa decisão, confira `graphify hook status` e use `GRAPHIFY_SKIP_HOOK=1` para uma desativação pontual.

## Benchmark e relatório de pull request

`docs/graphify-benchmark.json` contém dez perguntas representativas. `npm run graph:benchmark` exige que cada pergunta recupere, no mapa, o arquivo esperado e que a busca direta encontre o mesmo ponto de implementação. O resultado é salvo localmente em `graphify-out/BENCHMARK.md`. O mesmo benchmark foi executado sobre os candidatos `0.9.48` e `0.9.68` antes da decisão de manter a versão homologada.

Em pull requests, o workflow também constrói o mapa da base em um worktree temporário e cria `graphify-out/BASE_HEAD_REPORT.md`. O relatório compara nós, relações e arquivos entre base e head; ele é publicado junto do artefato do workflow. É uma comparação estrutural — não afirma causalidade em um grafo não direcionado. As decisões arquiteturais vigentes estão em [Governança do fechamento](GOVERNANCA_FECHAMENTO.md).

## Recuperação

Se a geração falhar, o último `graphify-out/` válido permanece intacto. Remova somente o diretório de trabalho `.graphify-work/` quando não houver processo de geração e execute `npm run graph:build` novamente. Nunca copie artefatos de outro projeto nem use `--force` para mascarar redução inesperada.

Para um passe semântico de documentação, abra uma tarefa separada: selecione fontes técnicas revisadas, defina orçamento e retenção, e registre a origem de cada relação. Esse passe não faz parte da automação atual por privacidade e previsibilidade.
