# Fechamento de navegação, impressão e governança editorial — 22/09/2026

## Resultado

Código funcional: `909b1eff043a45690a8b08f3b0f55d1dd624474f`.

Esta rodada fechou lacunas técnicas reproduzíveis de restauração de posição, exportação para aprovação e ciclo editorial das coleções. O trabalho ficou restrito ao `Promo_Brindes_V1`; não criou migration e não alterou o Promo Gifts nem o banco canônico.

## Cenários entregues

| Cenário | Resultado verificável |
| --- | --- |
| Voltar de um produto para uma lista carregada por rota lazy | A posição salva é restaurada progressivamente enquanto o documento cresce, por até 1,5 s. |
| Pessoa interage durante a restauração | Roda, toque, ponteiro ou teclado cancelam a automação; a navegação não disputa o controle da página. |
| Conteúdo não volta a ter a altura anterior | O processo termina no limite e preserva a maior posição alcançável, sem loop permanente. |
| Seleção extensa para aprovação | O Chromium gera PDF A4 multipágina, com identidade, oito produtos, imagens contidas e itens protegidos contra quebra interna. |
| Coleção em rascunho, retirada, futura ou expirada | Não entra na biblioteca pública, nos metadados server-side nem no sitemap. |
| Revisão editorial vencida ou sem responsável | O teste de governança falha e força uma revisão explícita antes de o pipeline aprovar. |

## Arquitetura

- `shared/catalogEditorial.ts` é a fonte compartilhada de título, descrição, responsável, estado, publicação, revisão e expiração.
- A SPA deriva suas coleções públicas dessa fonte.
- O HTML inicial e o sitemap derivam a mesma lista pública; não há uma segunda relação manual de coleções indexáveis.
- `src/lib/scrollRestoration.ts` isola a política de restauração e permite simular crescimento, timeout e cancelamento sem depender do navegador.
- O estilo de impressão define A4, margens, layout estável, imagens contidas e elementos interativos ausentes.

## Validação

- `npm run check`: lint, TypeScript, `323` testes Vitest/API, contratos Node, build, orçamento de assets e `90` cenários Chromium aprovados; `4` skips condicionais.
- `npm run test:coverage`: limiares aprovados; `54,20%` de linhas no agregado e `90,93%` nas APIs.
- `npm run test:e2e:cross-browser`: `82` cenários Firefox/WebKit aprovados; `12` skips condicionais, incluindo PDF por ser uma API do Chromium.
- `npm audit --audit-level=moderate`: zero vulnerabilidades reportadas.
- Baseline do banco, executado antes deste lote sem mudanças SQL: `474` asserções pgTAP e lint local sem erros; dry-run remoto `upToDate: true`.

## Limites preservados

- UX84 continua parcial: a governança está implementada, mas PDFs/revistas reais e autorizados ainda precisam ser localizados, vinculados e operados.
- LK10 continua ausente: não foram inventadas fotografias de categorias nem direitos de uso.
- Resend, WhatsApp, webhooks, alertas e a role limitada continuam adiados pelo usuário; esta rodada não afirma entrega real de mensagens.
- Testes automatizados não substituem compradores reais, leitor de tela, aparelhos físicos, métricas de campo ou drill de restore.
