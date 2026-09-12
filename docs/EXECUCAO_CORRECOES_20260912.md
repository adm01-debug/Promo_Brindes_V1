# Execução das correções prioritárias — 12/09/2026

Este documento registra a implementação posterior à revisão em
`REVISAO_POS_MIGRATIONS_20260912.md`. A revisão anterior permanece preservada como
fotografia do commit `b789e45f3171ce56a9e5eff4f8bbb3d6acc145c7`; este arquivo não reescreve
o resultado histórico.

## Escopo e invariantes

- Projeto alterado: `Promo_Brindes_V1`.
- Banco de escrita: somente o Supabase isolado `xlzmclcjdncjfdrjxclt`.
- Catálogo do Promo Gifts: consulta pública somente leitura.
- Banco canônico `doufsxqlfjyuvxuezpln`: nenhuma migration, escrita ou alteração.
- Estoque de fornecedor continua fora do critério de publicação e disponibilidade.

## Correções concluídas

| ID | Resultado implementado | Regressão permanente |
| --- | --- | --- |
| B01 | Sucesso impede a recriação do rascunho e remove contato, consentimento e opt-in da aba | E2E do componente completo |
| B02 | Mínimo nulo, zero ou inválido segue o contrato consultivo uniforme de uma unidade | Teste de API com linha canônica nula |
| B03 | A API comprova que a variante pertence ao produto e recusa referência removida ou forjada | Testes de contrato e ausência de escrita |
| B04 | Mudança de ID limpa o orçamento anterior antes da nova leitura | E2E de rota A → rota B com erro |
| B05 | Evento passado recebe erro no campo e foco antes de qualquer POST | E2E mais contrato em calendário de São Paulo |
| B06 | Última proposta vencida deixa de parecer comercialmente vigente | Teste unitário e E2E semântico |
| B07 | Inicialização do produto ocorre antes da interação, eliminando a sobrescrita tardia de quantidade no WebKit | Suíte integral Firefox/WebKit |

A repetição de uma solicitação histórica também consulta o catálogo vigente antes de
substituir a seleção. Produto ou variante removidos continuam visíveis, com explicação,
mas bloqueiam um novo envio até a revisão; nenhuma referência desaparece silenciosamente.

## Comprovantes transacionais

A migration `20260912170000_add_quote_notification_outbox.sql` adiciona uma fila
transacional privada ao Supabase do site. O mesmo commit que grava o orçamento cria:

- um job de e-mail para o cliente;
- um job de WhatsApp apenas após checkbox específico e opcional;
- unicidade por solicitação, canal e audiência;
- reivindicação concorrente com `SKIP LOCKED`;
- no máximo cinco tentativas, backoff e recuperação de processamento interrompido;
- RPCs executáveis somente por `service_role` e com `search_path` fixado.

O backend tenta o comprovante logo após persistir o orçamento e mantém um worker diário
para recuperar falhas. A solicitação nunca é perdida porque um provedor está indisponível.
Sem credenciais válidas, a fila permanece pendente e a interface não afirma que houve
entrega. O e-mail usa chave de idempotência por solicitação; WhatsApp usa template
transacional aprovado e opt-in próprio.

## Evidências locais de aceite

- Node contratado `22.13.1`: 180 testes Vitest aprovados após o ajuste final de fuso.
- Playwright Chromium: 72 aprovados e 4 ignorados por projeto/viewport.
- Playwright Firefox + WebKit: 66 aprovados e 10 ignorados por projeto/viewport.
- Supabase local recriado do zero: 15 migrations aplicadas; 118 testes pgTAP aprovados.
- Build compatível com Vercel: aprovado.
- Orçamento de assets: CSS 157,5 KiB; JS total 818,0 KiB; entrada 354,1 KiB.
- `npm audit`, produção e desenvolvimento: zero vulnerabilidades reportadas.
- Graphify: 1.099 nós, 2.416 relações; validação e seis testes aprovados.

## Dependências externas que não devem ser apresentadas como concluídas

Entrega real de mensagens ainda depende de remetente/domínio verificado no Resend e,
para WhatsApp, número, token e template aprovado na Meta. Testes locais usam provedores
simulados e não enviam mensagens a pessoas. Pesquisa com compradores, conteúdo
fotográfico/cases autorizados, medições de campo e operação comercial ponta a ponta
continuam sendo aceites humanos ou externos; código não pode fabricar essas provas.
