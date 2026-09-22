# Fechamento das lacunas técnicas priorizadas — 22/09/2026

## Resultado

Código funcional auditado: `fabb52bc0acbbe8146da7c0ceabada13316991db` e endurecimento final `a84ce19b44f66ef87463ca10e65edc0800253223`.

Esta rodada fechou três lacunas reproduzíveis que ainda estavam abertas na matriz: inspeção binária dos anexos privados, resolução guiada de concorrência entre campanhas salvas e metadados iniciais específicos para coleções e datas. O trabalho ocorreu somente no `Promo_Brindes_V1` e no Supabase isolado `xlzmclcjdncjfdrjxclt`. O Promo Gifts e o banco canônico `doufsxqlfjyuvxuezpln` permaneceram fora do escopo e não foram alterados.

## Entregas

| Frente | Comportamento entregue | Defesas principais |
| --- | --- | --- |
| Anexos privados | PNG, JPEG, WebP e PDF são lidos no backend após o upload; assinatura incompatível é recusada e o objeto é removido | titular autenticado, origem exata, caminho seguro, leitura limitada a 1 KiB, conferência com metadados do Storage, recibo `verified_at` e trigger que impede vínculo não verificado |
| Concorrência de campanhas | Ao encontrar versão mais nova na conta, a pessoa compara as versões e escolhe usar a remota, preservar ambas ou substituir conscientemente | revisão otimista já existente, carrinho local preservado, nenhuma sobrescrita automática e diálogo acessível |
| Coleções e datas | O link compartilhado aponta para uma URL editorial estável; a resposta HTML inicial contém título, descrição e canonical próprios | fonte server-side única, teste que compara todos os IDs da interface, sitemap apenas com combinações curadas e limite global de 50 mil URLs preservado |

## Revisão final do PR

A revisão automatizada independente encontrou quatro cenários adicionais, todos reproduzidos e corrigidos antes do merge:

- substituição de um blob depois do recibo de verificação: o objeto verificado agora é imutável para o titular, a API faz uma segunda leitura depois do bloqueio e descarta qualquer troca ocorrida na janela TOCTOU;
- anexos antigos ainda não verificados: continuam indisponíveis para anexação, mas podem ser removidos imediatamente da biblioteca;
- seleção arquivada por outra sessão: o diálogo informa o estado e não oferece uma sobrescrita que o contrato do banco recusaria;
- ano editorial fora da janela: SSR e SPA usam a mesma normalização, no fuso `America/Sao_Paulo`, aceitando apenas o ano corrente e o seguinte.

## Validações locais

- Banco recriado do zero com todas as migrations; `474` asserções pgTAP em `23` arquivos passaram.
- Lint do schema passou sem erro ou aviso e os tipos TypeScript foram regenerados do catálogo local.
- Vitest/API: `318` testes em `50` arquivos passaram.
- Chromium: `86` cenários passaram e `4` skips condicionais esperados.
- Firefox/WebKit: `80` cenários passaram e `10` skips condicionais esperados.
- Cobertura: `54,25%` de linhas no agregado; API com `90,93%` de linhas.
- Graphify estrutural: `1722` nós, `3444` relações, benchmark `10/10` e `11` contratos aprovados.
- `npm audit --audit-level=moderate`: zero vulnerabilidades conhecidas reportadas.

Os números acima não equivalem a entrevistas, aparelhos físicos, leitores de tela reais, restauração de produção ou entrega por provedores externos.

## Supabase isolado

A guarda confirmou o destino `xlzmclcjdncjfdrjxclt`. Após a verificação binária inicial, a revisão final listou somente `20260922230000_lock_verified_briefing_assets.sql`; a migration foi aplicada e o dry-run posterior retornou `upToDate: true`. O ledger local/remoto ficou alinhado até `20260922230000` e o lint remoto não encontrou erros.

Um dump de schema somente leitura, removido após a conferência, confirmou pelo catálogo PostgreSQL remoto a coluna `verified_at`, as RPCs e triggers de vínculo, a guarda `can_delete_my_unverified_briefing_asset_path`, a policy de exclusão restrita e os grants esperados. Nenhum dado de cliente foi lido ou criado nessa verificação.

## Limites que permanecem explícitos

- Resend, WhatsApp, webhooks, alertas e a credencial JWT de role limitada continuam adiados pelo usuário; não há alegação de envio real em produção.
- PDFs/revistas, fotografias, bastidores e cases precisam de localização, direitos e governança editorial, embora o usuário tenha informado possuir materiais aprovados.
- SEO técnico publica rotas curadas, mas indexação e cache de previews precisam ser observados nos serviços externos; coleções e datas ainda compartilham a imagem social institucional.
- Relevância comercial, técnicas de personalização e diversidade de relacionados dependem de dados aprovados e julgamento do time responsável.
- Testes com compradores, leitor de tela, dispositivos físicos e drill de restore com RPO/RTO continuam sendo aceites humanos ou operacionais.

Esses limites não são funções parcialmente implementadas escondidas: estão classificados individualmente na matriz e não foram promovidos a concluídos por uma passagem de pipeline.
