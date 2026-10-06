# Avaliação isolada do Graphify 0.9.68

Data: 2026-10-05
Decisão: **não substituir a versão homologada 0.9.48 nesta revisão**.

## Objetivo

Verificar se a versão `0.9.68` entregaria um grafo realmente direcionado, melhoraria a recuperação estrutural e reduziria as lacunas observadas, sem alterar o ambiente homologado. A avaliação foi executada em ambientes virtuais e diretórios de saída separados; não acessou rede durante a extração, Supabase ou produção.

## Método controlado

1. Criar um ambiente Python isolado para `graphifyy[sql]==0.9.48` e outro para `graphifyy[sql]==0.9.68`.
2. Executar extração `code-only` sobre o mesmo snapshot e o mesmo corpus, com `PYTHONHASHSEED=0`.
3. Comparar `graph.json`, `GRAPH_REPORT.md` e a recuperação das dez perguntas de `docs/graphify-benchmark.json`.
4. Rodar o diagnóstico read-only da `0.9.68` com simulação dirigida.
5. Conferir diretamente tipos/interfaces representativos que o extrator nativo tratava como pouco conectados.

Os artefatos experimentais ficaram em `.graphify-work/experiments/`, diretório ignorado e descartável. Somente esta conclusão e a implementação homologada são versionadas.

## Resultado comparativo

| Critério | 0.9.48 | 0.9.68 | Leitura |
| --- | ---: | ---: | --- |
| Nós | 2.028 | 2.099 | +71 nós líquidos |
| Relações | 4.056 | 4.523 | +467 relações |
| Comunidades | 223 | 201 | alteração de agrupamento |
| “Isolated nodes” no relatório upstream | 418 | 439 | regressão de ruído, +21 |
| Comunidades finas omitidas no relatório upstream | 58 | 102 | regressão de ruído, +44 |
| Benchmark estrutural | 10/10 | 10/10 | empate |
| `graph.json.directed` | `false` | `false` | sem ganho de direção serializada |
| Referências dos tipos amostrados | não capturadas | não capturadas | lacuna persiste |

A comparação estrutural registrou 120 nós adicionados e 49 removidos. Parte relevante do crescimento veio de referências a pacotes/configuração e índices SQL, não de melhor cobertura dos consumidores TypeScript. Os exemplos `CustomerQuoteEvent`, `CartAction`, `SeoProps` e `OccasionIdea` continuaram dependentes apenas das relações nativas incompletas.

## O que significa o modo `--directed`

Na `0.9.68`, o comando de diagnóstico:

```bash
graphify diagnose multigraph --directed --json --graph <candidato>/graph.json
```

conseguiu montar uma simulação `DiGraph` em memória (`effective_directed: true`, 2.099 nós, 4.523 relações). Isso não converte nem reextrai o artefato: o próprio diagnóstico informa que um `graph.json` normal já está pós-build, e o arquivo produzido pela extração permaneceu com `directed: false`. Logo, esse modo é útil para inspecionar colisões de arestas, mas não fornece a causalidade dirigida exigida para substituir `graph:impact`.

O diagnóstico também encontrou sete self-loops e nenhuma colisão de pares direcionados. Esses dados não compensam a ausência de direção persistida.

## Decisão e critério de reavaliação

O pin `graphifyy[sql]==0.9.48` permanece em `requirements-graphify.txt` e `.graphify.project.json`. A atualização agora aumentaria a variabilidade do mapa sem melhorar o benchmark, a direção ou as referências TypeScript.

Em vez de trocar a versão, esta revisão aplica melhorias determinísticas no wrapper:

- dois corpora independentes para aplicação e SQL;
- enriquecimento local de `type_reference` pelo parser TypeScript;
- métrica de nós de baixa conectividade filtrada;
- benchmark 10/10 mantido sem aumentar o orçamento de consulta.

Uma nova versão só deve substituir a homologada se, no mesmo snapshot:

1. produzir `graph.json.directed: true` ou documentar formalmente uma representação equivalente consumível pelo wrapper;
2. manter 10/10 no benchmark;
3. não aumentar injustificadamente lacunas e comunidades pequenas;
4. preservar a separação de corpora e os guardas de segurança;
5. superar ou tornar desnecessário o enriquecimento de tipos com evidência em testes.
