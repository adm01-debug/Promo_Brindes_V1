# Pendências de integração — Promo Brindes V1

Atualizado em 27/10/2026. Idioma: pt-BR.

## PR #99 — ESLint 10 bloqueado por dependência incompatível

- **PR:** [#99 — bump eslint de 9.39.5 para 10.13.0](https://github.com/adm01-debug/Promo_Brindes_V1/pull/99).
- **Checks com falha:** [Quality gate](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40575238174) e [Graphify structural map](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40575238036).
- **Erro reproduzido:** `npm ci` retorna `ERESOLVE`: `eslint-plugin-jsx-a11y@6.10.2` declara `peer eslint="^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9"`, incompatível com `eslint@10.13.0`.
- **Consequência:** a instalação falha antes de lint, build e testes. O PR permanece aberto; não há evidência de integração segura para mesclá-lo.
- **Para destravar:** aguardar uma versão publicada do plugin que suporte ESLint 10, ou revisar uma alternativa compatível que preserve as regras de acessibilidade e passe por toda a suíte. Não usar `--force`, `--legacy-peer-deps` nem retirar o plugin apenas para satisfazer a instalação.

## Revisão automática do Copilot — limite externo

- **Exemplo recente:** [check do PR #94](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40577026144/job/122446096607).
- **Erro observado:** HTTP 402 — “You've reached your additional usage limit for your plan.”
- **Escopo:** serviço de revisão opcional. Os checks obrigatórios de integração são avaliados separadamente; o PR #106 já foi mesclado com esses checks verdes.
- **Ação do responsável pela conta:** verificar o uso e limite do Copilot nas configurações de cobrança do GitHub, se quiser restabelecer essa revisão automática. Nenhum segredo ou acesso ao banco é necessário para corrigir o código do site.
