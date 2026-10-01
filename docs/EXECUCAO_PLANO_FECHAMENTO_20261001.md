# Execução controlada do plano de fechamento — 01/10/2026

Este registro separa **código implementado**, **validação local**, **revisão
remota**, **publicação** e **homologação**. Ele não converte plano em entrega e
não marca uma etapa concluída apenas porque um teste relacionado passou.

Base inicial: `cfb33e4d0ee2f88a0294f5f3f314de997b8d995d`. Plano: PR
[#81](https://github.com/adm01-debug/Promo_Brindes_V1/pull/81). Promo Gifts e
o projeto Supabase canônico `doufsxqlfjyuvxuezpln` permaneceram sem escrita.

## Lote técnico implementado

| Etapa | Estado em 01/10 | Evidência | Limite para conclusão |
|---|---|---|---|
| 010 | Em revisão | PR [#82](https://github.com/adm01-debug/Promo_Brindes_V1/pull/82): sucesso é contado explicitamente; cancelado, neutro, ignorado e pendente ficam inconclusivos; timeout e falhas formam o denominador terminal. Cinco testes Node, incluindo CLI sem caminho arbitrário. | PR aprovado e comportamento observado na execução agendada após merge. |
| 011 | Em revisão | PR #82: RPC distribuído antes de `reconcileQuoteItems`, buckets separados, hash da origem, oito orçamentos/doze contatos por quinze minutos e limite transacional final preservado. | Migration revisada, aplicada pelo fluxo do Supabase isolado e comprovada no ledger/schema remoto. |
| 012 | Tecnicamente validada no recorte alterado | PR #82: timeout de 2,5 s, recusa antes do catálogo, idempotência, resposta 429, limpeza de timer em 405 e regressões de API. | Auditoria das demais rotas e publicação do mesmo SHA; não confundir esta correção com homologação integral de toda API. |
| 022 | Em revisão | PR [#83](https://github.com/adm01-debug/Promo_Brindes_V1/pull/83): sonda viva somente-leitura das 36 colunas de `v_site_products_public`, tipos essenciais, swatches e ausência de preço/estoque/fornecedor/variante interna; seis mutações negativas. | PR aprovado e primeira execução agendada na `main`; a sonda REST não substitui auditoria de schema por `pg_catalog`. |
| 023 | Parcial em revisão | PR #82 regenera tipos, dicionário e contratos da nova RPC e mantém catálogo de erros. | Inventário integral das estruturas JSON manuais e política de depreciação continuam pendentes. |
| 024 | Parcial em revisão | PR #82 prova `site_api` executando o preflight de ponta a ponta e nega EXECUTE a `anon`/`authenticated`; função usa invoker e `search_path` vazio. | Cutover da credencial `SITE_SUPABASE_SERVICE_JWT` continua adiado por decisão do usuário. |
| 026 | Revalidada, não encerrada | Três cenários reais com conexões concorrentes da fila passaram; 570 asserções pgTAP passaram no lote #82. | Metas e ensaio de carga representativo do portal/paginação ainda requerem ambiente e critérios aprovados. |
| 076 | Atualizada no recorte | As regressões de preflight, timeout, hash, privilégio, métricas e path traversal foram incorporadas permanentemente. | A matriz individual das 580 referências é trabalho próprio da etapa 002; não foi inferida pela contagem de testes. |
| 093 | Bateria parcial aprovada | No PR #82: 433 Vitest, 570 pgTAP, 3 concorrência, lint SQL, TypeScript, build, performance e 96 E2E Chromium; quatro skips condicionais. No PR #83: 430 Vitest, 6 testes Node do contrato e os mesmos 96 E2E. | Não é a bateria final do programa: faltam conteúdos, integrações, homologações, navegador cruzado do candidato e etapas predecessoras. |

## Falhas encontradas e resolvidas durante a execução

1. O pgTAP inicial usava um helper inexistente; a asserção foi trocada por uma
   expressão compatível e toda a suíte do banco passou.
2. O lint remoto dos workflows detectou sete gravações separadas em
   `GITHUB_OUTPUT`; a escrita foi agrupada e o gate voltou a passar.
3. O Sonar apontou path traversal porque o utilitário do CI aceitava um caminho
   arbitrário. O argumento foi eliminado: o JSON agora entra somente por
   `stdin`, com regressão que recusa inclusive `/etc/passwd` sem ler o arquivo.

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
