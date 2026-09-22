# Contratos das funções do banco do site (Etapas 22 e 23)

Escopo: projeto isolado `xlzmclcjdncjfdrjxclt`. Este documento consolida dois artefatos
que antes só existiam espalhados em comentários de migration:

- **Catálogo de erros** (Etapa 22): toda mensagem `invalid_*`/`*_exceeded`/`*_conflict`
  lançada pelas RPCs, de onde vem, e como (se) o TypeScript trata.
- **Convenção de versionamento de RPC** (Etapa 23): como mudar uma função sem deixar
  órfã no catálogo.

Gerado a partir de uma varredura real das migrations em 16/09/2026
(`grep -rhoE "message = '[a-z_]+'" site-supabase/supabase/migrations/*.sql`), não de
memória — mantenha assim: ao adicionar uma mensagem de erro nova, rode a mesma busca e
atualize a tabela abaixo na mesma migration/PR.

## Catálogo de erros

Todas usam `errcode = '22023'` (invalid_text_representation, reaproveitado como
"entrada inválida" genérica) exceto onde indicado.

| Mensagem | Função(ões) | Tratamento no TypeScript | HTTP |
|---|---|---|---|
| `rate_limit_exceeded` | `site_private.consume_rate_limit` (via `create_site_quote_request`/`create_site_contact_request`) | `api/_lib/siteDatabase.ts` — `.includes('rate_limit_exceeded')` | 429 |
| `client_request_id_conflict` | `create_site_quote_request`, `create_site_contact_request` | `api/_lib/siteDatabase.ts` — `.includes('client_request_id_conflict')` | 409 |
| `shared_selection_rate_limit_exceeded` | `create_site_shared_selection` | `api/_lib/sharedSelections.ts` — `.includes(...)` | ver `sharedSelections.ts` |
| `authentication_required` (`errcode 42501`) | `get_my_quote_request(s)`, `get_my_proposal_document`, `claim_my_quote_requests`, `request_my_quote_adjustment` | **Não mapeada explicitamente** — cai no catch genérico | genérico (503 via caminho padrão) |
| `invalid_quote_payload`, `invalid_contact_payload` | `create_site_quote_request`, `create_site_contact_request` | **Não mapeada** — a validação de `api/_lib/contracts.ts` já deveria ter barrado isso antes da RPC; chegar aqui é defesa em profundidade, não caminho esperado do usuário | genérico |
| `invalid_client_request_id` | `create_site_quote_request`, `create_site_contact_request` | **Não mapeada** — mesma razão acima | genérico |
| `invalid_item_decision_group` | `create_site_quote_request` | **Não mapeada** | genérico |
| `invalid_status_filter` | `get_my_quote_requests` | **Não mapeada** — filtro vem de UI própria, não de input livre do usuário | genérico |
| `adjustment_message_required` | `request_my_quote_adjustment` | **Não mapeada** | genérico |
| `verified_email_required` (`errcode 42501`) | `claim_my_quote_requests` | **Não mapeada** — fluxo interno, não acionável pelo usuário diretamente | genérico |
| `quote_not_found` | `request_my_quote_adjustment` | **Não mapeada** | genérico |
| `invalid_rate_limit_input` | `site_private.consume_rate_limit` | Interno — nunca deveria propagar a um chamador HTTP | n/a |
| `invalid_notification_channel` | `claim_site_quote_notification` | Só chamada pelo backend (`api/notifications.ts`), tratada como falha de infraestrutura | 500 (log + retry pelo cron) |
| `invalid_notification_claim_input` | `claim_site_notification_deliveries` | Idem | 500 |
| `invalid_notification_finalize_input` | `finalize_site_notification_delivery` | Idem | 500 |
| `invalid_notification_acceptance_input` | `record_site_notification_provider_acceptance` | Idem | 500 |
| `invalid_notification_provider_event_input` | `apply_site_notification_provider_event` | `api/notification-events-resend.ts`/`-whatsapp.ts` tratam como payload de webhook malformado | 400 |
| `invalid_retry_attempts`, `invalid_retry_jitter` | `site_private.next_retry_at` | Interno — só chamado por `finalize_site_notification_delivery`, nunca com input de usuário | n/a |
| `invalid_shared_selection_payload`, `invalid_shared_selection_item`, `duplicate_shared_selection_item` | `create_site_shared_selection` | `api/_lib/sharedSelections.ts` | ver arquivo |
| `invalid_shared_selection_management_token` | `revoke_site_shared_selection` | `api/shared-selections.ts` | ver arquivo |
| `invalid_selection_reference_set` | `normalize_selection_references` | fronteira interna; wrappers convertem para o erro público do fluxo | não exposto diretamente |
| `invalid_shared_selection_rate_limit` | `consume_shared_selection_action_limit` | `api/_lib/sharedSelections.ts` | erro de configuração; não expor detalhe |
| `invalid_retention_batch_size`, `invalid_retention_finalize_input` | `get_site_data_retention_candidates`, `finalize_site_data_retention` | Só chamado por `api/retention.ts` (cron), nunca por input de usuário | 500 |
| `invalid_erasure_email` | `erase_customer_data` (Etapa 32) | Só `service_role`, executado manualmente via Studio (`docs/RUNBOOK_PEDIDO_TITULAR.md`) — nunca alcançável pela API pública | n/a |
| `invalid_selection_payload`, `invalid_selection_reference`, `duplicate_selection_reference`, `invalid_selection_version` | `save_my_selection` | Área do Cliente valida antes do envio; a RPC rejeita payload forjado | erro no rascunho |
| `selection_version_conflict`, `selection_limit_reached` (`errcode P0001`) | `save_my_selection`, `set_my_selection_archived`, `delete_my_selection` | Conflito visível com ação para recarregar; limite de 30 seleções, com arquivamento e exclusão | erro no rascunho |
| `invalid_batch_size` | `purge_archived_customer_selections` | Somente cron de retenção; nunca aceita entrada direta do visitante | 503 |
| `invalid_kit_composition` | `create_site_quote_request` | `api/_lib/contracts.ts` valida presença conjunta dos quatro campos e a igualdade `quantity = kitQuantity × unitsPerKit`; a RPC repete a defesa | 400 antes da RPC; genérico se a segunda linha disparar |
| `invalid_kit_reference_set` | `site_private.enforce_valid_kit_reference_set` (triggers de `customer_selections` e `shared_selections`) | A aplicação normaliza a composição antes de persistir; o banco também bloqueia kit unitário, metadados divergentes e colisão do mesmo produto/variante | erro no rascunho ou 400 no link compartilhado |
| `invalid_briefing_asset` | `create_my_briefing_asset` | `src/lib/briefingAssets.ts` valida nome, MIME e tamanho antes do RPC; a RPC impõe os mesmos limites e tipos | erro visível no anexo |
| `briefing_asset_limit_reached` (`errcode P0001`) | `create_my_briefing_asset` | `src/lib/briefingAssets.ts` traduz para o limite combinado de 10 arquivos/50 MB por conta | erro visível no anexo |
| `briefing_asset_not_deletable` (`errcode P0001`) | `delete_my_briefing_asset` | Arquivo já vinculado a pedido não pode ser removido pelo fluxo de rascunho; mensagem específica no frontend | erro visível no anexo |
| `invalid_briefing_asset_attachment` | `attach_my_briefing_assets_to_quote` | O frontend só envia UUIDs retornados pela biblioteca privada; a RPC também exige pedido e lista válidos | erro genérico com opção de tentar vincular novamente |
| `briefing_asset_attachment_conflict` (`errcode P0001`) | `attach_my_briefing_assets_to_quote` | Impede anexar arquivo de outro titular, já vinculado ou incompatível com o e-mail verificado | erro genérico com opção de tentar vincular novamente |
| `briefing_asset_not_verified` (`errcode P0001`) | `site_private.require_verified_briefing_asset_attachment` | O endpoint `api/briefing-assets.ts` precisa validar a assinatura binária antes do vínculo; a interface mantém arquivos não verificados indisponíveis | erro visível no anexo |
| `briefing_asset_verification_conflict` (`errcode P0001`) | `confirm_site_briefing_asset_verification` | Somente `api/briefing-assets.ts`; indica objeto ausente, expirado, já vinculado ou metadado divergente após a inspeção | 503 sem expor detalhe interno |
| `invalid_briefing_asset_verification` | `confirm_site_briefing_asset_verification` | Somente `api/briefing-assets.ts`; defesa para metadado de Storage malformado ou fora da faixa | 503 sem expor detalhe interno |
| `invalid_briefing_asset_retention_input` | `get_briefing_asset_retention_candidates`, `finalize_briefing_asset_retention` | Somente `api/retention.ts`; lote, UUID e resultado são validados no backend do cron | 500 (log; nova tentativa no cron seguinte) |
| `invalid_status_transition: <entity>.<de> -> <para> not allowed for <id>` (`format()`, prefixo fixo) | `site_private.enforce_status_transition` (Etapa 8, reaproveitada por `notification_deliveries` na Etapa 9) | Só dispara em update administrativo direto (Studio/SQL) — nunca alcançável pela API pública | n/a |
| `invalid_notification_delivery_transition: ...` (`format()`, prefixo fixo) | `site_private.enforce_notification_delivery_lease_and_attempts` (Etapa 9) | Idem — só update administrativo direto | n/a |
| `invariant_violated: ...` (`format()`, prefixo fixo, `errcode 23505`/`23514`) | Blocos `do $$ ... $$` de pré-checagem em migrations (Etapas 15, 24) | Só roda durante `db push`, nunca em runtime de request | n/a |

**Leitura honesta desta tabela**: a maioria das mensagens `invalid_*` de `create_site_*`
não tem tratamento HTTP específico porque **não deveriam ser alcançáveis** — a validação
de `api/_lib/contracts.ts` roda antes e é mais estrita. Elas existem como a segunda
linha de defesa (a RPC nunca confia cegamente no chamador), não como contrato de erro
para o frontend. Só `rate_limit_exceeded`, `client_request_id_conflict` e as de
`shared_selections`/`webhook` têm tratamento dedicado porque são cenários que a
validação de entrada não consegue prevenir (dependem de estado do banco, não só do
payload).

## Decisão registrada — retaguarda pg_cron, adiada (Etapa 34)

Avaliado e adiado, não implementado como meia-medida. `pg_cron` + `pg_net` estão
disponíveis no projeto (confirmado em `pg_available_extensions`) mas não instalados.
Implementar isto direito exige, além de agendar os dois jobs:

1. **Lock advisory compartilhado** com o caminho da Vercel, para as duas origens nunca
   rodarem ao mesmo tempo — sem isso, a "retaguarda" pode duplicar entregas em vez de
   só cobrir uma falha real.
2. **Réplica da lógica de negócio em SQL** (o job do `pg_cron` chamaria as mesmas RPCs,
   mas via `pg_net` teria que reautenticar como `site_api`/`service_role` de dentro do
   banco — gerenciar essa credencial dentro de uma configuração de `cron.job` é uma
   superfície nova de exposição de segredo, não trivial).
3. **`site_notification_queue_health` ganhar `lastRunAt` por origem**, para o alerta
   (Etapa 42) saber diferenciar "cron da Vercel silencioso, retaguarda cobrindo" de
   "as duas origens paradas".

Dado o estágio atual do site (volume baixo, Vercel Cron é a origem primária e
confiável), o retorno de implementar isso agora não compensa o risco de uma
implementação apressada de lock/reautenticação — exatamente o tipo de atalho que este
plano evita em outras etapas (ex.: Etapa 27). Fica como item de backlog explícito, não
como um `cron.schedule` silenciosamente incompleto.

## Atendimento a pedido de apagamento do titular (Etapa 32)

Não há painel administrativo neste projeto. Até que exista um, um pedido de
apagamento (LGPD art. 18) chegado por qualquer canal (e-mail, WhatsApp) é atendido
manualmente:

```sql
select public.erase_customer_data('email-do-titular@exemplo.com');
```

Rodar autenticado como `service_role` (Studio > SQL Editor já roda dessa forma). A
função devolve `storagePathsToRemove` — os PDFs de proposta associados foram apagados do
banco, mas os objetos no bucket `customer-proposals` do Storage precisam ser removidos
manualmente a partir dessa lista (`storage.buckets`, via Studio ou pela API do Storage).
Guarde a saída da função como evidência de que o pedido foi atendido (data, e-mail,
contagens) — ela não fica registrada em nenhum lugar além do que você salvar.

## Decisão registrada — PII em repouso, adiada (Etapa 27)

O plano original previa "hash para busca + mascaramento nas funções `get_my_*`" como
subconjunto seguro da etapa, deixando criptografia completa (pgsodium) como spike à
parte. Ao detalhar a implementação, essa divisão não sobrevive ao exame:

1. **Mascarar nas funções `get_my_*` não faz sentido** — essas funções retornam os
   dados do próprio titular autenticado (`auth.uid()`); mascarar o e-mail/telefone de
   alguém para ele mesmo não reduz exposição nenhuma, só piora a experiência.
2. **Hash para busca não substitui o valor em claro** — `site_api` (Etapa 25) e o
   worker de notificações (`api/notifications.ts`) **precisam** do e-mail/telefone reais
   para enviar a confirmação; um hash ao lado não impede que a coluna original continue
   em texto puro, então não reduz a exposição num backup/dump.
3. A mitigação real seria criptografia de coluna (pgsodium) com gerenciamento de chave
   — exatamente o que o plano original já qualificava como "spike separado, com revisão
   de design dedicada", não algo para decidir no meio de um lote de 50 etapas.

**Decisão: etapa 27 fica formalmente adiada**, não implementada como meia-medida. Se
isto voltar à pauta, o ponto de partida é pgsodium com chave no Vault do Supabase,
avaliando separadamente: rotação de chave, custo de decriptar em toda leitura do
backend, e se o valor supera o de simplesmente reduzir ainda mais quem tem acesso de
leitura a essas colunas (já bem mais restrito depois da Etapa 25).

## Decisão registrada — exposição do token de seleção compartilhada (Etapa 28)

`site_private.shared_selections.token uuid primary key` é o próprio token de acesso
público ao link (não um identificador interno) — quem lê a tabela (backup, Studio, ou
`site_api`, que precisa de `select` nela para `get_site_shared_selection`) vê todos os
links ativos, ao contrário de `management_token_hash`, que já é armazenado como hash.

**Decisão: aceitar o risco, não implementar `token_hash` como chave.** Razões:

1. O token tem 122 bits de aleatoriedade (UUID v4), expira em até 31 dias
   (`check (expires_at <= created_at + interval '31 days')`) e não carrega PII — o pior
   cenário de exposição é alguém enumerar links de seleção de produtos ainda válidos,
   não dados pessoais.
2. O acesso a essa tabela já está bem mais restrito depois da Etapa 25: só `site_api`
   (via JWT que não chega ao navegador) e `service_role` a alcançam — não é mais
   `service_role` sozinho com acesso a tudo.
3. Migrar para `token_hash` exigiria period de compatibilidade dupla (tokens já emitidos
   continuam existindo por até 31 dias) e mudar `create_site_shared_selection`,
   `get_site_shared_selection` e `revoke_site_shared_selection` simultaneamente — custo
   de implementação e de revisão desproporcional ao ganho, dado o ponto 1.

Reavaliar se algum dia o conteúdo de uma seleção compartilhada passar a incluir dado
pessoal (hoje só tem `id`/`q`/`v` de produto — ver `create_site_shared_selection` em
`docs/DATABASE_FUNCTION_CONTRACTS.md`), ou se o prazo de expiração for estendido.

## Decisão registrada — normalização de telefone, adiada (Etapa 24)

O plano original previa normalização canônica de e-mail **e** telefone (E.164) direto no
banco. Ao implementar (`20260916150000_add_email_normalization.sql`), o escopo foi
revisado: e-mail é seguro de normalizar em SQL puro (`trim` + `lower`, sem ambiguidade);
telefone para E.164 de verdade exige inferir código de país, tratar números já
formatados de jeitos diferentes, e uma biblioteca de parsing decente
(`libphonenumber` ou equivalente) — que não existe hoje nem no TypeScript
(`api/_lib/contracts.ts` guarda o telefone como veio, só valida formato). Implementar
uma versão simplificada em PL/pgSQL sem essa garantia seria pior que não normalizar:
criaria uma falsa sensação de dado limpo, e uma constraint baseada nela poderia
rejeitar números legítimos.

**Decisão: etapa 24 fica formalmente adiada quanto a telefone** (e-mail foi
implementado por completo — `site_private.normalize_email`, constraint aplicada,
`create_site_*` normalizam antes de gravar). Encontrada como gap de documentação numa
auditoria em 16/09/2026: a decisão já estava correta e registrada no cabeçalho da
migration, mas o texto do plano nunca foi atualizado para refletir o descope, dando a
impressão de etapa 100% completa. Se isto voltar à pauta, o ponto de partida é escolher
uma biblioteca de parsing (TypeScript, chamada antes da escrita — não PL/pgSQL) e
decidir a suposição de país padrão para números sem DDI.

## Decisão registrada — rate limit de borda, adiada (Etapa 30)

O plano original previa duas camadas: uma regra de borda (Vercel Firewall/rate limit
por IP/rota) como primeira linha, e a camada de banco (`rate_limit_buckets`) como
segunda. Só a camada de banco foi implementada
(`20260916180000_tune_high_churn_tables.sql`: `unlogged`, autovacuum agressivo; a purga
por retenção já existia). A regra de borda nunca foi configurada nem documentada.

**Decisão: etapa 30 fica formalmente adiada quanto à camada de borda.** Motivo
encontrado numa auditoria em 16/09/2026 (não documentado antes): configurar Vercel
Firewall é uma mudança de infraestrutura de produção (afeta todo o tráfego do domínio,
não só este banco) que não deveria ser feita por uma sessão focada em banco de dados
sem revisão de alguém com visão do tráfego real do site — limiares errados bloqueiam
usuários legítimos, não é um `--dry-run` reversível como as migrations. A camada de
banco sozinha já absorve o custo de um ataque melhor que nada (a tabela é `unlogged`,
efêmera, com autovacuum agressivo), mas não impede que ele chegue ao banco. Também não
implementado: teste de carga (`autocannon` ou equivalente) validando latência estável
sob a camada de banco isolada — o soak test da Etapa 38 mede a fila de notificações,
não o rate limit especificamente. Se isto voltar à pauta, o ponto de partida é a
configuração de Firewall da Vercel com limiares baseados em tráfego real observado, não
um chute.

## Convenção de versionamento de RPC

1. **Assinatura igual, comportamento diferente**: `create or replace function`. É o caso
   comum (a maioria das migrations deste plano).
2. **Assinatura diferente** (parâmetro novo, removido, ou tipo mudado):
   `create or replace function` com uma assinatura diferente cria uma **segunda**
   função em vez de substituir a original — a antiga fica órfã no catálogo, ainda
   executável se algum grant sobrevivesse. Sempre precedido de
   `drop function if exists nome_antigo(tipos_antigos);` na mesma migration
   (exemplo real: `20260914120000_fix_notification_outbox_contract.sql`, ao inserir
   `p_lease_token` em `finalize_site_notification_delivery`).
3. **Mudança de semântica incompatível sem mudar assinatura** (raro — evitar): preferir
   criar `nome_v2` e manter a original por um ciclo de deploy, documentando a
   descontinuação, em vez de trocar o comportamento por baixo do mesmo nome/assinatura.
4. Toda função pública (schema `public`) exposta a `anon`/`authenticated`/`service_role`
   termina a migration com `revoke all ... from public, anon, authenticated` seguido do
   `grant execute` explícito só para quem precisa — nunca depender do grant implícito de
   `create function`.
5. Teste automatizado (`tests/database/status_state_machine.test.sql`, exemplo já
   presente): `select proname, count(*) from pg_proc where pronamespace='public'::regnamespace group by proname having count(*) > 1` deve retornar zero linhas — nenhuma função
   pública pode ter duas assinaturas simultâneas (indicaria um `drop` esquecido).
