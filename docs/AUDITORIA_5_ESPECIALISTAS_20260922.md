# Auditoria técnica dos cinco especialistas — 22/09/2026

## Escopo e fronteiras

Cinco frentes independentes revisaram banco de dados, segurança, frontend/acessibilidade, contratos de domínio e CI/governança no projeto `Promo_Brindes_V1`. O Supabase considerado é exclusivamente o projeto isolado `xlzmclcjdncjfdrjxclt`. Nenhum arquivo ou dado do Promo Gifts e nenhum objeto do banco canônico `doufsxqlfjyuvxuezpln` foi alterado.

Código funcional auditado: `ef97fc75e4109b90e5b25d14d9418d6557bb4640`.

## Falhas encontradas e correções entregues

| Frente | Gap reproduzido | Correção e defesa |
| --- | --- | --- |
| Sessão e anexos | Uma listagem assíncrona podia restaurar IDs da conta anterior após troca de identidade | Geração de sessão, chave de identidade e referência da seleção atual impedem fechamento obsoleto |
| Kits no drawer | Editar um componente podia descaracterizar silenciosamente o conjunto | Controle altera a quantidade do grupo; reducer redireciona mutação individual; serialização falha fechada |
| Kits no montador | Decimais e multiplicações acima de 999.999 atravessavam estados intermediários | Quantidades inteiras, máximo dinâmico por unidades do componente e normalização estrita |
| Templates de kit | Trocar o modelo apagava escolhas compatíveis | Escolhas são preservadas por slot e somente o foco muda para a próxima lacuna |
| Acessibilidade | Após escolher um produto, o foco de teclado era perdido | Foco previsível no próximo slot, `aria-pressed` e nomes acessíveis |
| Layout | O resumo do kit podia aparecer depois de todo o catálogo; o grid compartilhado ficava denso em 320 px | Linhas/colunas explícitas e breakpoint final de uma coluna até 420 px |
| Cores históricas | O catálogo atual não fornece `variant_id` para as 16.993 amostras observadas; o nome da cor podia desaparecer | Fallback compacto `c`, reconciliação por nome único e bloqueio de ambiguidade/remoção |
| Links compartilhados | Links legados toleravam perda parcial e leitura/revogação não tinham limitador próprio | Hidratação atômica, limites por ação/IP e remoção das assinaturas antigas sem limite |
| Unicode público | Controles bidi/invisíveis podiam entrar em nomes de cor, kit ou seleção | Normalização NFC no cliente/API e recusa independente no PostgreSQL |
| Payload | O limite de 16 KiB recusava um conjunto válido de 50 referências no pior caso | Limite HTTP bounded de 32 KiB com teste que excede 16 KiB |
| Upload privado | `size_bytes` reservado podia divergir do metadado gravado no Storage | Policy cruza proprietário, caminho, expiração, MIME e tamanho do objeto com a reserva |
| Banco | Números enormes podiam vazar `22003`; prioridade `null` era aceita | Regex delimitada antes do cast e erro contratual `22023` uniforme |
| Conteúdo | Estado vazio ainda usava jargão “abra o radar” | Texto direto e orientado à tarefa |

## Evidências executadas

- `npm run check`: lint e TypeScript aprovados; 296 testes Vitest/API; contratos Node; build; orçamento de performance; 86 cenários Chromium aprovados e 4 skips esperados por viewport.
- `npm run test:coverage`: 296 testes; 52,88% de linhas e 47,93% de statements no agregado; API com 91,42% de linhas e `src/lib` com 82,48%.
- `npm run test:e2e:cross-browser`: Firefox e WebKit executados; skips são condicionais documentadas de projeto/viewport.
- `npm run db:site:test`: 458 asserções pgTAP em 23 arquivos.
- `npm run db:site:lint`: nenhum erro ou aviso de schema.
- Supabase isolado: dry-run listou somente `20260922210000_close_selection_and_asset_integrity_gaps.sql`; push concluído; ledger local/remoto alinhado até `20260922210000`; lint remoto sem erros.
- Ensaio remoto transacional: criar, ler com fallback de cor, revogar e confirmar indisponibilidade retornou `true`; a transação terminou com `ROLLBACK`, sem deixar registros sintéticos.
- `npm audit --audit-level=moderate`: zero vulnerabilidades conhecidas reportadas.
- `git diff --check`: sem erro de whitespace.

## Simulações adversariais cobertas

- Logout ou troca de conta durante listagem/upload de anexos.
- Kit incompleto, unitário, divergente, duplicado, decimal e acima do teto global.
- Duas cores sem identificador no mesmo produto, cor removida e nome ambíguo.
- Payload de 50 referências no pior envelope permitido.
- Controle bidi em conteúdo exibível e número JSON fora da faixa de inteiro.
- Leitura e revogação repetidas de link por bucket separado.
- Metadado de Storage com MIME ou tamanho divergente da reserva.
- Operação por teclado, transição de foco e viewport estreita.

## Limites que permanecem explícitos

- A policy valida o MIME e o tamanho registrados pelo Storage, mas não faz inspeção de assinatura binária; isso requer processamento confiável server-side.
- Resend, WhatsApp, webhooks e alertas operacionais continuam adiados pelo usuário; testes desses provedores são simulações e não comprovam entrega real.
- Entrevistas com compradores, leitores de tela reais, aparelhos físicos e restore com RPO/RTO continuam sendo aceites humanos/operacionais.
- A proteção de branch atual não exige revisão humana nem CodeQL/Vercel como checks obrigatórios. Em um repositório individual, exigir aprovação pode bloquear todos os merges; a política deve ser decidida pelo proprietário, não alterada silenciosamente.
- O grafo do Graphify é apoio estrutural e não substitui código, testes, catálogo PostgreSQL nem confirmação de deployment.

## Critério de encerramento

A migration e o Supabase isolado estão reconciliados. A rodada foi encerrada pelo PR #26, mesclado em `main` no commit `1eb8e50fb475d22167ad0f8403811ce7e4242a92`. Quality Gate, Firefox/WebKit, pgTAP, CodeQL e Graphify passaram no PR e novamente em `main`; o deployment de produção da Vercel foi concluído.

O smoke público pós-deploy confirmou `200` na home, catálogo, montador, produto real e sitemap; a rota inexistente retornou `404`; a API de seleção compartilhada retornou `404` contratual para token inexistente. O dry-run final do Supabase informou `upToDate: true`; consulta ao catálogo remoto confirmou as novas RPCs limitadas, a guarda de Storage e a remoção das assinaturas antigas sem rate limit.

Os relatórios locais de revisão pertencentes ao usuário permaneceram fora dos commits. Nenhuma passagem técnica autoriza declarar os aceites externos concluídos: provedores adiados, inspeção binária, entrevistas, dispositivos físicos e ensaio de restore continuam explicitamente fora desta certificação.
