# Execução — lote de favoritos — 24/09/2026

## Escopo efetivamente executado

Este lote executa as etapas 01, 04 e 06–10 do plano de 50 etapas, no que é verificável apenas no repositório e no ambiente local. O alvo é exclusivamente o site `Promo_Brindes_V1`; não houve alteração no Promo Gifts, no catálogo canônico nem no Supabase remoto isolado.

## Correções

- A projeção entregue pelo hook passa a ser vazia enquanto a identidade está em carregamento ou quando o titular do estado ainda não corresponde à identidade da renderização. Isso elimina a janela de renderização em que a conta B recebia favoritos da conta A (F24-03).
- Intenções locais por data são preservadas sobre snapshots remotos iniciados antes da escrita. Assim, uma leitura antiga não apaga adição confirmada (F24-01) nem ressuscita remoção confirmada (F24-02).
- A intenção mais recente vence respostas de escrita fora de ordem; um erro tardio não desfaz uma operação posterior.
- As intenções são descartadas ao mudar de sessão. Callbacks da sessão anterior continuam invalidados pelos epochs já existentes.
- Abas da mesma conta passam a sincronizar via evento `storage`; eventos de outra conta são descartados e uma intenção local pendente continua prevalecendo até revalidação remota.
- A rejeição de um anexo que muda entre a primeira e a segunda inspeção agora remove o metadado por RPC server-side e enfileira o blob privado para exclusão. Antes, esse caso podia deixar metadado verificado apontando para objeto já removido.
- A tela de datas comemorativas substituiu três ícones de toolbar por símbolos textuais acessíveis, mantendo o texto explícito dos controles. A redução preserva o orçamento de JavaScript sem aumentar o limite.

## Provas automatizadas adicionadas

`src/lib/useOccasionFavorites.test.tsx` fixa oito regressões:

1. Adição confirmada diante de leitura antiga vazia.
2. Remoção diante de leitura antiga que ainda contém a data.
3. Escritas com respostas fora de ordem.
4. Identidade em carregamento e ação após troca para outra conta.
5. Captura por `useLayoutEffect` que confirma não haver frame da conta B com dados da conta A.
6. Atualização da mesma conta recebida de outra aba.
7. Descarte de atualização pertencente a outra conta.
8. Conflito entre atualização de outra aba e intenção local pendente.

Os três probes históricos foram preservados em `docs/audits/plan-review-20260924/` e agora também aprovam. Eles continuam separados da suíte de produto por serem artefatos de auditoria/reprodução.

## Validação executada

| Comando | Resultado |
| --- | --- |
| `npx vitest run src/lib/useOccasionFavorites.test.tsx src/pages/CommemorativeDatesPage.test.tsx` | 9 testes aprovados |
| `npm run lint` | aprovado |
| `npm run typecheck` | aprovado |
| `npm test` | 58 arquivos / 384 testes aprovados |
| `npm run db:site:test` | 27 arquivos / 546 asserções aprovadas no Supabase local |
| `npx vitest run --config docs/audits/plan-review-20260924/vitest.config.ts` | 3 probes F24 aprovados |
| `npm run build` | aprovado |
| `npm run check:performance-budget` | aprovado: 260,8 KiB Brotli de JavaScript, teto de 261 KiB |
| `npm run test:e2e` | 96 cenários desktop/mobile aprovados |
| `npm run test:coverage` | 58 arquivos / 384 testes aprovados; limiares configurados aprovados |
| `npm run ledger:check` | 230 referências estruturais válidas |
| `npm run graph:update && npm run graph:check` | mapa estrutural atualizado: 1.912 nós / 3.862 relações |

Os avisos de privilégio de extensões (`pg_cron`/`pg_net`) exibidos por fixtures locais são esperados pelas próprias verificações e não causaram falha.

## Deliberadamente não executado neste lote

- Política e inspeção completa de PDFs/conteúdo ativo: falta a decisão de produto e segurança entre rejeição, quarentena ou sanitização (etapas 16–17).
- Dados comerciais, kits, múltiplos, técnicas e área de personalização: não foram inferidos (etapas 26–30).
- Encaminhamento comercial, SLA, envio real por Resend/WhatsApp, webhooks e alertas: dependem de destino, segredos e homologação operacional (etapas 31–40).
- Banco de preview, restore/PITR, operação monitorada, pesquisa com compradores, dispositivos físicos, acessibilidade assistiva e Core Web Vitals de campo: exigem ambiente/participantes/medição externos (etapas 21–25, 41–50).
- Contrato vivo de leitura com o catálogo canônico: requer chave de leitura e governança de CI próprias; não altera o sistema interno (etapa 40).

Essas pendências permanecem explícitas. Aprovação de testes locais não é evidência de recebimento real de e-mail/WhatsApp, nem de atendimento comercial, nem de homologação com clientes.
