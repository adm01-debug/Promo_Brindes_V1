# Pendências de integração — Promo Brindes V1

Atualizado em 28/10/2026. Idioma: pt-BR.

O conflito de dependências do [PR #99](https://github.com/adm01-debug/Promo_Brindes_V1/pull/99) foi corrigido com um plugin de acessibilidade compatível com ESLint 10. A causa, a comparação das regras e os testes estão registrados em `RELATORIO_CI.md`. Esta seção deixa de ser uma pendência após o merge do PR.

## Revisão automática do Copilot — limite externo

- **Exemplo recente:** [check do PR #94](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40577026144/job/122446096607).
- **Erro observado:** HTTP 402 — “You've reached your additional usage limit for your plan.”
- **Escopo:** serviço de revisão opcional. Os checks obrigatórios de integração são avaliados separadamente; o PR #106 já foi mesclado com esses checks verdes.
- **Ação do responsável pela conta:** verificar o uso e limite do Copilot nas configurações de cobrança do GitHub, se quiser restabelecer essa revisão automática. Nenhum segredo ou acesso ao banco é necessário para corrigir o código do site.

## Nova ocorrência na `main` — 28/10/2026

- **Workflow/job:** `Running Copilot Code Review` / `copilot-pull-request-reviewer`, etapa `Processing Request (Linux)`.
- **Execução:** [run 40621337165](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40621337165), [job 122595844377](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/40621337165/job/122595844377).
- **Commit:** `b49f7fcfd2a282b4de41ba0df60ed06cf4555bb3` (`main`).
- **Status/conclusão:** `completed` / `failure`.
- **Causa primária exata:** a API do Copilot retornou HTTP `402`, `errorType: quota`: “You've reached your additional usage limit for your plan.” A falha não é reproduzível por correção no código do site; o workflow é dinâmico e não está versionado neste repositório.
- **Ação necessária do responsável pela conta:** revisar o consumo e liberar/aumentar o limite de uso adicional do Copilot em <https://github.com/settings/copilot/features>. Depois, solicitar nova execução/revisão.
- **Aviso secundário observado:** o log informa que a firewall do agente bloqueou acesso HTTP a `api.github.com`. Após resolver a quota, se o bloqueio persistir, revisar a allowlist do agente conforme <https://gh.io/copilot/firewall-config>.
- **Tratamento:** não desativei o workflow, não usei `continue-on-error` e não alterei sua falha para sucesso. Não há correção local segura para quota ou política de firewall da conta; a execução permanece pendente de ação externa.
