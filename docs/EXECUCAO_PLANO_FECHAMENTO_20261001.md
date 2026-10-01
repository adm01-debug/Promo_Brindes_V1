# Execução controlada do plano de fechamento — 01/10/2026

Este registro separa **código implementado**, **validação local**, **revisão
remota**, **publicação** e **homologação**. Ele não converte plano em entrega e
não marca uma etapa concluída apenas porque um teste relacionado passou.

Base inicial: `cfb33e4d0ee2f88a0294f5f3f314de997b8d995d`. Plano: PR
[#81](https://github.com/adm01-debug/Promo_Brindes_V1/pull/81). Promo Gifts e
o projeto Supabase canônico `doufsxqlfjyuvxuezpln` permaneceram sem escrita.

Heads vinculados às evidências: o ciclo integral do PR #82 passou em
`68d0d413f3c42029ab7b72a53cae227d074ab143`; no head incremental
`b78a57a2547c4caeabc8db4285578d492c6b210f`, passaram 7 testes Node de
métricas, reset local, 574 asserções pgTAP e lint SQL. O ciclo integral do PR
#83 passou em `322685fda4f4a79e241948753d32cce1282426c7`; no head incremental
`0f582eea5c57529f5960dfe6e7c77f386bdf53fc`, passaram os 7 testes Node do
contrato, lint, TypeScript e a sonda viva de 36 colunas/5 produtos. Os checks
remotos dos heads incrementais permanecem a fonte final antes do merge.

## Lote técnico implementado

| Etapa | Estado em 01/10 | Evidência | Limite para conclusão |
|---|---|---|---|
| 010 | Em revisão | PR [#82](https://github.com/adm01-debug/Promo_Brindes_V1/pull/82): sucesso é contado explicitamente; cancelado, neutro, ignorado e pendente ficam inconclusivos; timeout e falhas formam o denominador terminal. Seis testes Node, incluindo CLI sem caminho arbitrário, razão exata no limiar e soma determinística de 100%. | PR aprovado e comportamento observado na execução agendada após merge. |
| 011 | Em revisão | PR #82: RPC distribuído antes de `reconcileQuoteItems`, buckets separados, hash da origem, oito orçamentos/doze contatos por quinze minutos e limite transacional final preservado. Repetições idempotentes também consomem o preflight, fechando o bypass por `client_request_id`. | Migration revisada, aplicada pelo fluxo do Supabase isolado e comprovada no ledger/schema remoto. |
| 012 | Tecnicamente validada no recorte alterado | PR #82: timeout integral de 2,5 s para cabeçalhos e corpo, recusa antes do catálogo, idempotência, resposta 429, validação do envelope, limpeza de timer em 405 e 37 regressões focadas de API. | Auditoria das demais rotas e publicação do mesmo SHA; não confundir esta correção com homologação integral de toda API. |
| 022 | Em revisão | PR [#83](https://github.com/adm01-debug/Promo_Brindes_V1/pull/83): sonda viva somente-leitura das 36 colunas de `v_site_products_public`, tipos essenciais, swatches e ausência de preço/estoque/fornecedor/variante interna; sete mutações negativas. O job usa apenas variáveis públicas do GitHub e rejeita chaves secretas ou JWT `service_role`. | PR aprovado e primeira execução agendada na `main`; a sonda REST não substitui auditoria de schema por `pg_catalog`. |
| 023 | Parcial em revisão | PR #82 regenera tipos, dicionário e contratos da nova RPC e mantém catálogo de erros. | Inventário integral das estruturas JSON manuais e política de depreciação continuam pendentes. |
| 024 | Parcial em revisão | PR #82 prova `site_api` executando o preflight de ponta a ponta e nega EXECUTE a `anon`/`authenticated`; função usa invoker e `search_path` vazio. | Cutover da credencial `SITE_SUPABASE_SERVICE_JWT` continua adiado por decisão do usuário. |
| 026 | Revalidada, não encerrada | Três cenários reais com conexões concorrentes da fila passaram; 574 asserções pgTAP passaram no head incremental do lote #82. | Metas e ensaio de carga representativo do portal/paginação ainda requerem ambiente e critérios aprovados. |
| 076 | Atualizada no recorte | As regressões de preflight, timeout, hash, privilégio, métricas e path traversal foram adicionadas e aprovadas no head revisado do PR #82. Elas só se tornam permanentes após o merge e uma nova validação na `main`. | A matriz individual das 580 referências é trabalho próprio da etapa 002; não foi inferida pela contagem de testes. |
| 093 | Bateria parcial aprovada | No ciclo integral do PR #82: 434 Vitest, 572 pgTAP, 3 concorrência, 6 testes Node de métricas, 37 regressões focadas de API, lint SQL, TypeScript, build, performance e 96 E2E Chromium; quatro skips condicionais. O head incremental ampliou métricas para 7 testes e pgTAP para 574. No PR #83: 430 Vitest, 7 testes Node do contrato e os mesmos 96 E2E; o head incremental também passou a sonda viva. SonarCloud aprovou os ciclos integrais sem novos issues ou hotspots. | Não é a bateria final do programa: faltam conteúdos, integrações, homologações e etapas predecessoras. |

## Falhas encontradas e resolvidas durante a execução

1. O pgTAP inicial usava um helper inexistente; a asserção foi trocada por uma
   expressão compatível e toda a suíte do banco passou.
2. O lint remoto dos workflows detectou sete gravações separadas em
   `GITHUB_OUTPUT`; a escrita foi agrupada e o gate voltou a passar.
3. O Sonar apontou path traversal porque o utilitário do CI aceitava um caminho
   arbitrário. O argumento foi eliminado: o JSON agora entra somente por
   `stdin`, com regressão que recusa inclusive `/etc/passwd` sem ler o arquivo.
4. A revisão Cubic encontrou bypass do preflight por identificador já persistido,
   timeout limitado aos cabeçalhos, teste de hash pouco restritivo, arredondamento
   incorreto no limiar de 30% e percentuais que não fechavam em 100%. Todos os
   cinco contratos foram corrigidos e cobertos por regressão.
5. No monitor do catálogo, as revisões detectaram validação incompleta de cores,
   aceitação potencial de JWT privilegiado, ambiente de teste não hermético,
   despacho manual silenciosamente ignorado e exposição desnecessária ao baixar
   todo o ambiente da Vercel. O job passou a usar somente variáveis públicas do
   GitHub, falhar visivelmente fora da `main` e rejeitar credenciais privilegiadas.

Nenhum gate foi desabilitado, convertido em opcional ou silenciado para liberar
os PRs.

## Dependências que impedem declarar as 100 etapas concluídas

- **Revisão:** os PRs #81, #82 e #83 exigem revisão elegível; autoaprovação ou
  bypass de proteção não são aceites do plano.
- **Banco isolado:** a migration de preflight só pode ser aplicada após revisão
  e merge pelo fluxo integrado. Não foi executado DDL direto no remoto.
- **Decisões do responsável:** donos, substitutos, CRM/fila comercial, SLA,
  preview isolado, custos e regras comerciais não podem ser inventados pela
  engenharia.
- **Canais adiados:** Resend, WhatsApp, webhooks, alertas e
  `SITE_SUPABASE_SERVICE_JWT` continuam bloqueados pela decisão registrada.
- **Materiais e direitos:** PDFs, revistas, três cases, bastidores, fotografias,
  autorizações e modelos comerciais precisam ser localizados e relacionados a
  direitos de publicação antes de entrar no site.
- **Homologação humana:** compradores, marketing, comercial, leitor de tela,
  dispositivos físicos, clientes de calendário e operação real são evidências
  externas; automação não pode falsificá-las.
- **Recuperação e observação:** restore descartável, RPO/RTO, janela operacional,
  métricas de campo e rollback controlado exigem ambiente, pessoas e janela
  aprovados.

Assim, o resultado desta execução é **lote técnico implementado e submetido a
revisão**, não “100/100”. O fechamento integral somente pode ser declarado após
resolver as dependências acima e registrar os aceites exigidos nas etapas 094 a
100.
