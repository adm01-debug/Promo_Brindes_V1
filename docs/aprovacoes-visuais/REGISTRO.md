# Registro de aprovação visual

Regra de origem: [`docs/agentes/aprovacao-visual-design.md`](../agentes/aprovacao-visual-design.md) — nenhuma
mudança de design pode entrar no projeto sem proposta em imagens aprovada pelo dono.

Este documento existe porque os mockups estavam versionados desde a PR #103, mas **nada dizia quem aprovou,
quando, para qual PR e qual versão do arquivo**. Um PNG podia ser trocado sem deixar rastro, e um documento
de auditoria não conseguia provar que o que foi implementado é o que foi aprovado.

Fonte de verdade legível por máquina: [`registro.json`](registro.json). Ele guarda, por arquivo, o **SHA-256**,
a largura, a altura e o tamanho em bytes, além do vínculo com a aprovação correspondente. O validador
`scripts/validate-visual-approvals.mjs` (rodado por `npm run approvals:visual:check`, dentro de `npm run check`)
reprova a mudança quando:

- um PNG versionado nas pastas de mockup **não** está no registro;
- o hash ou as dimensões do arquivo em disco divergem do registro (a imagem aprovada foi trocada);
- uma imagem marcada como `proposta` não aponta para uma aprovação `aprovado`;
- uma aprovação não tem `approvedBy`, `approvedAt`, número de PR, `mergeCommit` de 40 caractéres ou evidência;
- duas aprovações usam o mesmo `id`, ou o mesmo arquivo é registrado duas vezes;
- existe pasta `docs/mockups-*` fora de `roots` no registro (mockup novo entra versionado sem dono nem data);
- um PNG dentro de uma pasta de `roots` está em subpasta e fora do registro (a varredura desce todos os níveis);
- um asset tem `kind` diferente de `base` ou `proposta` (um typo em `kind` esconderia a exigência de aprovação).

Para trocar um mockup de propósito: substituir o PNG e atualizar o `sha256`, as dimensões e o `bytes` (o tamanho
do arquivo é conferido junto com o hash — só ele explica no erro que a imagem foi reexportada), e, se a decisão mudou,
criar uma nova entrada em `approvals` com **id novo** (id repetido é reprovado: os mockups antigos passariam a
apontar para a aprovação nova). Atualizar só o hash é aceitável para correção de export
sem mudança visual; mudança de design exige nova aprovação do dono.

## Aprovações registradas

| ID | PR | Merge | Aprovado em | Por | Tela | Propostas vinculadas |
| --- | --- | --- | --- | --- | --- | --- |
| `AV-2026-10-06-ficha-produto` | [#91](https://github.com/adm01-debug/Promo_Brindes_V1/pull/91) | `f7022c4` | 2026-10-06 | adm01-debug | Ficha de produto compacta com cards alinhados | nenhuma versionada (mockup ficou fora do repo) |
| `AV-2026-10-06-assinatura-gift-lovers` | [#92](https://github.com/adm01-debug/Promo_Brindes_V1/pull/92) | `77f0ff1` | 2026-10-06 | adm01-debug | Assinatura Gift Lovers by Promo na home e no rodapé | 5 PNGs em `docs/mockups-gift-lovers-20261005/` |
| `AV-2026-10-20-importacao-ativos` | [#103](https://github.com/adm01-debug/Promo_Brindes_V1/pull/103) | `4c60959` | 2026-10-20 | adm01-debug | Versionamento dos 16 PNGs já aprovados | todas as propostas (importadas byte a byte) |
| `AV-2026-10-27-briefing-confirmacao` | [#94](https://github.com/adm01-debug/Promo_Brindes_V1/pull/94) | `7100e1c` | 2026-10-27 | adm01-debug | Resumo editável e confirmação do briefing | 4 PNGs em `docs/mockups-carnegie-20261005/` |

Evidência de cada aprovação vem do corpo da PR mergeada, que cita a proposta visual aprovada e a faixa de
larguras verificada. O `mergeCommit` permite ir do registro ao código real: `git show <mergeCommit>`.

## Imagens de base (não são propostas)

Os arquivos `base-*.png` (7 no total) são capturas de estado atual, não propostas de design. Ficam no
registro com `kind: "base"` para que o hash também seja protegido, mas não exigem aprovação — servem de
comparação antes/depois.

## Lacunas conhecidas

- O mockup da ficha de produto (PR #91) nunca foi versionado; só existe a evidência textual no corpo da PR.
  Se esse mockup aparecer, entra em `docs/mockups-ficha-produto-20261006/` e ganha `approvalId: "AV-2026-10-06-ficha-produto"`.
- Aprovações anteriores a 06/10/2026 não têm mockup nem PR rastreável no repositório e não foram inventadas aqui.
