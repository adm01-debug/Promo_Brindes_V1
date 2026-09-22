# Fechamento das lacunas técnicas priorizadas — 22/09/2026

## Resultado

Código funcional auditado: `fabb52bc0acbbe8146da7c0ceabada13316991db`.

Esta rodada fechou três lacunas reproduzíveis que ainda estavam abertas na matriz: inspeção binária dos anexos privados, resolução guiada de concorrência entre campanhas salvas e metadados iniciais específicos para coleções e datas. O trabalho ocorreu somente no `Promo_Brindes_V1` e no Supabase isolado `xlzmclcjdncjfdrjxclt`. O Promo Gifts e o banco canônico `doufsxqlfjyuvxuezpln` permaneceram fora do escopo e não foram alterados.

## Entregas

| Frente | Comportamento entregue | Defesas principais |
| --- | --- | --- |
| Anexos privados | PNG, JPEG, WebP e PDF são lidos no backend após o upload; assinatura incompatível é recusada e o objeto é removido | titular autenticado, origem exata, caminho seguro, leitura limitada a 1 KiB, conferência com metadados do Storage, recibo `verified_at` e trigger que impede vínculo não verificado |
| Concorrência de campanhas | Ao encontrar versão mais nova na conta, a pessoa compara as versões e escolhe usar a remota, preservar ambas ou substituir conscientemente | revisão otimista já existente, carrinho local preservado, nenhuma sobrescrita automática e diálogo acessível |
| Coleções e datas | O link compartilhado aponta para uma URL editorial estável; a resposta HTML inicial contém título, descrição e canonical próprios | fonte server-side única, teste que compara todos os IDs da interface, sitemap apenas com combinações curadas e limite global de 50 mil URLs preservado |

## Validações locais

- Banco recriado do zero com todas as migrations; `469` asserções pgTAP em `23` arquivos passaram.
- Lint do schema passou sem erro ou aviso e os tipos TypeScript foram regenerados do catálogo local.
- Vitest/API: `311` testes em `49` arquivos passaram.
- Chromium: `84` cenários passaram e `4` skips condicionais esperados.
- Firefox/WebKit: `80` cenários passaram e `10` skips condicionais esperados.
- Cobertura: `53,84%` de linhas no agregado; API com `90,86%` de linhas.
- Graphify estrutural: `1710` nós, `3415` relações, benchmark `10/10` e `11` contratos aprovados.
- `npm audit --audit-level=moderate`: zero vulnerabilidades conhecidas reportadas.

Os números acima não equivalem a entrevistas, aparelhos físicos, leitores de tela reais, restauração de produção ou entrega por provedores externos.

## Supabase isolado

A guarda confirmou o destino `xlzmclcjdncjfdrjxclt`. O primeiro dry-run listou somente `20260922220000_verify_briefing_asset_content.sql`; a migration foi aplicada e o dry-run posterior retornou `upToDate: true`. O ledger local/remoto ficou alinhado até `20260922220000` e o lint remoto não encontrou erros.

Um dump de schema somente leitura, removido após a conferência, confirmou pelo catálogo PostgreSQL remoto a coluna `verified_at`, as duas RPCs, os dois triggers de vínculo e os grants restritos para `authenticated`, `site_api` e `service_role`. Nenhum dado de cliente foi lido ou criado nessa verificação.

## Limites que permanecem explícitos

- Resend, WhatsApp, webhooks, alertas e a credencial JWT de role limitada continuam adiados pelo usuário; não há alegação de envio real em produção.
- PDFs/revistas, fotografias, bastidores e cases precisam de localização, direitos e governança editorial, embora o usuário tenha informado possuir materiais aprovados.
- SEO técnico publica rotas curadas, mas indexação e cache de previews precisam ser observados nos serviços externos; coleções e datas ainda compartilham a imagem social institucional.
- Relevância comercial, técnicas de personalização e diversidade de relacionados dependem de dados aprovados e julgamento do time responsável.
- Testes com compradores, leitor de tela, dispositivos físicos e drill de restore com RPO/RTO continuam sendo aceites humanos ou operacionais.

Esses limites não são funções parcialmente implementadas escondidas: estão classificados individualmente na matriz e não foram promovidos a concluídos por uma passagem de pipeline.
