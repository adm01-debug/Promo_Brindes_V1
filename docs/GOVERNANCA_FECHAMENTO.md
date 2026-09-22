# Governança do fechamento técnico

## Fonte de verdade

`docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv` é o ledger único do estado dos requisitos dos planos UX, Lukka, Graphify e Área do Cliente. Planos, relatórios e auditorias antigas preservam contexto histórico, mas não alteram o estado de uma referência por si só.

Estados usados no ledger:

- `I`: implementação técnica concluída no escopo delimitado da linha, com evidência de código e teste.
- `P`: há código parcial, aceite operacional pendente ou validação insuficiente.
- `N`: entrega de engenharia ainda ausente.
- `E`: depende de material, pesquisa, decisão comercial ou operação externa.
- `A`: alternativa arquitetural aguardando decisão explícita.

Uma entrega só pode mudar uma linha para `I` quando registra arquivos, teste executável e condição de ativação. Uma simulação local não substitui aceite de operação, pesquisa com compradores, credencial de provedor ou publicação remota.

## Regra de atualização

Todo pull request que muda o estado de uma referência deve atualizar a mesma linha no CSV: `estado_revisado`, `natureza_pendencia`, `fontes`, `conclusao_e_aceite_restante`, `metodo` e `commit_auditado`. O autor também executa `npm run ledger:check` e inclui no PR os comandos de validação realmente rodados.

O validador exige os 230 IDs exatos, estados válidos, evidências preenchidas, SHA auditado e fontes existentes dentro deste repositório. Ele não tenta inferir cumprimento funcional, publicação ou aceite humano a partir de um diff. O índice vigente e os limites da revisão estão em [MATRIZ_INDEX.md](MATRIZ_INDEX.md).

## Decisões Graphify — 15/09/2026

As quatro alternativas antes sem dono passam a ser especificação vigente do projeto:

| Referência | Decisão | Motivo | Evidência de revisão |
| --- | --- | --- | --- |
| GR14 | Manter o grafo não direcionado. | A extração estrutural local disponível produz relações de vizinhança confiáveis; não vamos apresentar causalidade que o dado não contém. | `npm run graph:check`; `docs/GRAPHIFY.md` |
| GR24 | `graph:impact` permanece uma vizinhança com aviso explícito. | Impacto reverso causal exige grafo direcionado e uma validação diferente; o comando atual serve para orientar leitura e testes. | `scripts/graphify.mjs`; `tests/graphify-tools.node.mjs` |
| GR26 | `graph:update` faz reconstrução atômica completa. | O corpus é pequeno, o processo é reproduzível e evita corrupção incremental silenciosa. | `scripts/graphify.mjs`; `npm run graph:check` |
| GR30 | Não instalar hooks Git locais; usar comando explícito e CI. | Hooks ocultam trabalho no computador da pessoa e não são reproduzíveis em todos os clones. O workflow constrói o mapa e bloqueia estado defasado. | `.github/workflows/graphify.yml`; `docs/GRAPHIFY.md` |

GR40 é atendida por um benchmark versionado de dez perguntas estruturais; GR44 por um relatório base/head gerado no workflow de pull request. Ambos são deliberadamente honestos: medem recuperação estrutural, não compreensão humana e nem causalidade.
