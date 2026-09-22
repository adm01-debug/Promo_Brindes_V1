# Execução complementar e correção das evidências — 22/09/2026

## Resultado e escopo

Base publicada da rodada anterior: `91653abaecd574722c6534ef271b7c078c8d8a47`, PR #24. Código funcional auditado nesta rodada: `ef97fc75e4109b90e5b25d14d9418d6557bb4640`.

**O conjunto integral dos planos não está certificado como concluído.** Há critérios técnicos, editoriais e operacionais restantes, discriminados em [MATRIZ_INDEX.md](MATRIZ_INDEX.md). A resposta anterior que declarou conclusão integral foi ampla demais. Esta execução corrige funcionalidades reproduzíveis e atualiza 37 referências da matriz; não promove automaticamente todas as linhas para I.

Todo trabalho ocorre no Promo_Brindes_V1 e no Supabase isolado `xlzmclcjdncjfdrjxclt`. Os relatórios locais de auditoria preexistentes foram preservados sem inclusão no commit.

## Cenários simulados e corrigidos

| Cenário | Comportamento entregue | Evidência |
| --- | --- | --- |
| Kit com extras opcionais | Dois componentes essenciais; até dois extras adicionáveis/removíveis, mantendo cálculo e mínimos | kitBuilder.test.ts e E2E desktop/mobile |
| Kits × unidades ultrapassa 999.999 | Recusa a composição em vez de limitá-la e transformá-la em avulsos | kitBuilder.test.ts |
| Compartilhar uma alternativa | Prioridade preservada na API, no JSONB, no link, na leitura e na duplicação | Vitest/API e pgTAP shared_selection_priorities |
| Nome do kit com emoji/Unicode | Link v2 UTF-8; leitura de v1 Latin-1 preservada | sharedSelection.test.ts |
| Mínimo de componente muda | Link aponta necessidade de revisão e bloqueia duplicação silenciosa | sharedSelection.test.ts e E2E |
| Grupo incompleto/divergente ou colisão avulso-kit | API rejeita com 400 antes da persistência; banco mantém defesa independente | tests/api/shared-selections.test.ts e guardas SQL |
| Upload termina após logout/troca de conta | Resultado não repopula anexos nem seleção da nova sessão | BriefingAssetUploader.test.tsx |
| Compartilhamento expõe nome escolhido | Texto explica visibilidade dos nomes dos kits a quem possui o link | QuoteDrawer e SharedSelectionPage |
| Home demora a mostrar produtos | Vitrine antecipada, antes do questionário e manifesto; frases preservadas | HomePage e smoke/axe |
| Ação usa jargão editorial | Seleção vazia oferece Explorar catálogo; guia de voz versionado | GUIA_DE_VOZ.md |
| Graphify sem path/explain | Wrapper oferece caminho mínimo e relações, com desambiguação e fontes | 11 contratos Node de Graphify |
| Matriz aponta evidência inexistente | Validador exige IDs exatos, fontes reais e SHA registrado | 5 testes do ledger |

## Validação executada

- `npm run check`: lint, TypeScript, 296 testes Vitest/API, contratos Node, build e orçamento de assets aprovados; Chromium 86 aprovados e 4 skips por projeto/viewport.
- `npm run test:coverage`: limiares configurados aprovados; cobertura agregada de linhas 52,88% e 47,93% de statements, não 100% de regras/UI.
- `npm run test:e2e:cross-browser`: Firefox/WebKit com 80 aprovados e 10 skips por configuração; não são dispositivos físicos.
- `npm audit --audit-level=moderate`: zero vulnerabilidades reportadas.
- `npm run db:site:test`: 458 asserções em 23 arquivos aprovadas; lint local sem erros ou avisos.
- `npm run test:graphify`: 11 testes aprovados; benchmark estrutural 10/10, sem pretensão de precisão semântica universal.
- `npm run ledger:check`: 230 referências e testes do validador; fontes e IDs conferidos.
- Migration `20260922200000_preserve_shared_selection_priorities.sql` aditiva, aplicada localmente e no banco isolado após dry-run que listou somente essa migration.
- Migration `20260922210000_close_selection_and_asset_integrity_gaps.sql` validada por reset, pgTAP e lint local; sua aplicação remota e a reconciliação do ledger são registradas na auditoria dos cinco especialistas.
- Dicionário regenerado via catálogo PostgreSQL local; nenhuma alteração de dados no sistema interno.

Os testes de provedores usam simulações. Este relatório não comprova recebimento de e-mail/WhatsApp, entrevistas, dispositivos físicos ou restauração de produção. Resultados finais de CI, merge e deployment são rastreáveis pelo PR desta rodada; não inferir publicação a partir de um teste local.

## Auditoria posterior com cinco especialistas

A revisão independente de banco, segurança, frontend/acessibilidade, contratos e CI encontrou e corrigiu gaps adicionais em sessão, kits, cores sem `variant_id`, limites numéricos, rate limit e metadados de upload. O inventário, as correções e as limitações residuais estão em [AUDITORIA_5_ESPECIALISTAS_20260922.md](AUDITORIA_5_ESPECIALISTAS_20260922.md).

## Dependências restantes

O usuário manteve adiadas as variáveis de integração e confirmou possuir material editorial aprovado. A localização dos PDFs/fotos/cases foi solicitada; nenhum conteúdo de terceiros ou capacidade comercial foi inventado para marcar esses itens como concluídos. Consultar o índice para as funções ainda parciais, inclusive inspeção binária de anexos, gestão editorial e conflito guiado de campanhas.
