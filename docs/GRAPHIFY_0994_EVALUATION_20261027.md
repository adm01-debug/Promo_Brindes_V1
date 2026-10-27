# Avaliação isolada do Graphify 0.9.94 — 27/10/2026

## Método

Os dois candidatos foram instalados em ambientes Python separados e executados sobre o mesmo código do site, sem IA, rede de aplicação ou acesso ao Supabase. Foram usados os wrappers `graph:doctor`, `graph:build`, `graph:benchmark` e `graph:compare`. O benchmark contém os dez cenários versionados em `docs/graphify-benchmark.json`.

| Corpus | Versão 0.9.48 | Versão 0.9.94 |
| --- | ---: | ---: |
| Código: nós / relações | 1491 / 4174 | 1521 / 4766 |
| Código: arquivos removidos | — | 0 |
| SQL: nós / relações | 386 / 320 | 345 / 493 |
| SQL: nós com arquivo-fonte | 265 | 326 |
| SQL: nós sintéticos sem arquivo-fonte | 121 | 19 |
| Benchmark do código | 10/10 | 10/10 |

No corpus SQL, 118 IDs da versão antiga desapareceram. A revisão individual por `source_file` mostrou que 115 eram referências sintéticas sem fonte; os outros três eram falsas declarações de esquema (`site_private()` ou `public()`). A declaração real `site_private.admin_audit_log`, por exemplo, continua presente com a migration de origem. O novo extrator acrescentou 77 IDs e preservou todos os arquivos SQL do corpus.

## Decisão e limites

A versão 0.9.94 melhora a cobertura de declarações SQL com origem verificável e mantém o benchmark do código. O grafo continua **não direcionado**; suas relações servem para navegação estrutural, não para provar causalidade ou que uma migration foi aplicada no banco remoto. O pin do projeto e a verificação do `graph:doctor` devem avançar juntos com `requirements-graphify.txt`.
