# Avaliação isolada do Graphify 0.9.105 — 17/11/2026

Esta avaliação fecha a lacuna aberta por três bumps mergeados sem laudo: [#123](https://github.com/adm01-debug/Promo_Brindes_V1/pull/123) (0.9.97), [#126](https://github.com/adm01-debug/Promo_Brindes_V1/pull/126) (0.9.103) e [#147](https://github.com/adm01-debug/Promo_Brindes_V1/pull/147) (0.9.105). O pin em uso rodava desde então sem comparação com a última versão avaliada.

## Método

As duas versões foram instaladas em ambientes Python separados e executadas sobre o mesmo commit do site, sem IA, sem rede de aplicação e sem acesso ao Supabase, pelos wrappers `graph:doctor`, `graph:build`, `graph:benchmark` e `graph:compare`. O benchmark são os dez cenários versionados em `docs/graphify-benchmark.json`. Para executar a versão antiga foi necessário apontar `graphifyVersion` do `.graphify.project.json` para ela temporariamente, porque o wrapper recusa interpretador divergente do pin (`Versão incompatível: esperado graphify 0.9.105, recebido graphify 0.9.94`) — a alteração foi local e revertida.

| Corpus | Versão 0.9.94 | Versão 0.9.105 |
| --- | ---: | ---: |
| Código: nós / relações | 2141 / 6257 | 2144 / 6264 |
| Código: referências TypeScript | 619 | 619 |
| Código: IDs removidos | — | 0 |
| Código: IDs acrescentados | — | 3 |
| Código: arquivos removidos | — | 0 |
| SQL: nós / relações | 366 / 540 | 367 / 542 |
| SQL: nós com arquivo-fonte | 345 | 347 |
| SQL: nós sintéticos sem arquivo-fonte | 21 | 20 |
| Benchmark do código | 10/10 | 10/10 |

## O que mudou, item por item

As três declarações novas no corpus de código têm arquivo-fonte real, ou seja, são declarações que a versão antiga não capturava:

- `api/notifications.ts` → `WhatsAppRequestConfig`;
- `scripts/automation.mjs` → `approved`;
- `shared/ideaLandingPages.ts` → `ideaLandingMeta`.

No corpus SQL, um único ID deixou de existir — e a revisão individual mostra substituição, não perda. O ID antigo `site_private_erased_customer_identities` tinha `source_file` **vazio**: era uma referência sintética sem origem. Na 0.9.105 o mesmo objeto aparece com o rótulo idêntico `site_private.erased_customer_identities` e com a migration que o declara:

```
source_file = site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql
```

É o mesmo padrão que a [avaliação da 0.9.94](GRAPHIFY_0994_EVALUATION_20261027.md) registrou contra a 0.9.48: IDs sintéticos cedendo lugar a declarações com origem verificável. Nenhum arquivo SQL saiu do corpus.

O `graph:compare` confirma o balanço: `2141 → 2144` nós, `6257 → 6264` relações, **0 nós removidos** e **0 arquivos removidos**.

## Decisão e limites

A 0.9.105 é homologada. Ela não remove nada, mantém o benchmark em 10/10 nos dois métodos, preserva o enriquecimento TypeScript em 619 referências e melhora marginalmente a cobertura de declarações com origem verificável — tanto no código quanto no SQL. O pin permanece em `graphifyy[sql]==0.9.105`; nenhum arquivo de pin foi alterado por esta avaliação.

Os limites não mudaram: o grafo continua **não direcionado**, então `graph:impact` é vizinhança estrutural para orientar leitura e testes, não prova de causalidade reversa. A presença de uma migration no mapa de banco continua sem significar que ela foi aplicada remotamente.
