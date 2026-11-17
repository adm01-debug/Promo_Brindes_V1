# Verificação das pendências de engenharia — 17/11/2026

Estado, **em 17/11/2026**, dos 58 itens de `docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md` cuja coluna "quem destrava" é exatamente `ENG`. A auditoria é de 11/10/2026 e a `main` andou cinco semanas desde então, por isso o estado precisava ser reconferido item a item em vez de assumido. Resultado: 4 dos 58 já estavam fechados sem a auditoria registrar, **3 foram fechados e incorporados à `main` nesta sessão** (PF-27, PF-80, PF-112), 24 seguem sem nenhum começo e 27 estão pela metade (PF-85 entre eles: o alerta de resíduo entrou, a drenagem do lote não). Dos 51 que continuam abertos, 24 dependem de credencial ou endereço que só o dono tem e 27 não dependem.

Os outros 70 itens da auditoria não entram aqui porque quem destrava é o dono (45), conteúdo comercial (9), pessoas (5) ou uma combinação.

## Como ler, sem ser dev

- **AINDA ABERTO**: ninguém começou, ou o que existia foi desfeito.
- **PARCIAL HOJE**: outro agente começou e parou no meio; a coluna "o que falta" diz exatamente onde.
- **JÁ FEITO**: alguém fechou depois de 11/10 e a auditoria não foi atualizada.
- **Depende de segredo**: só anda depois que uma credencial ou endereço for configurado na Vercel — isso é seu, não meu.

## Confiança desta verificação — leia antes de decidir por ela

Cada item foi conferido contra o código de hoje por um agente em leitura pura, e cada veredito cita `arquivo:linha` ou uma busca negativa reproduzível. Três ressalvas honestas:

1. **Eu conferi pessoalmente, linha por linha, apenas quatro itens** — os que fechei nesta sessão: PF-27, PF-80, PF-85 e PF-112. Nos outros 54 a evidência vem da verificação paralela e **não foi reconferida por mim**. Ela é reproduzível: todo comando citado pode ser rodado de novo.
2. **Três itens vieram com classificação divergente da auditoria** (PF-103, PF-114, PF-123 foram marcados DIVERGÊNCIA pelo lote mas a auditoria registra outro estado). Onde notei, anotei no próprio item.
3. **Vinte e três comandos vinham com `|` sem `-E`** e foram corrigidos aqui. Em `grep` básico o `|` sem barra é literal, então aquelas buscas não provavam a ausência que afirmavam (as 26 que usam `\|` sempre estiveram corretas: em BRE a barra invertida é o operador de alternância). Reexecutei as 23 com `-E` e confiro o que mudou: nos casos decisivos que inspecionei — `max_age|age_cutoff` para PF-11, `suppression|supress` e `reprocess|requeue|reenfileir` para PF-12 — o resultado no escopo real continua negativo, então aqueles vereditos se sustentam. Nos demais, trate o comando corrigido como a fonte, não a contagem antiga. Depois disso validei a sintaxe de **todos** os padrões `-E` do documento executando cada um: só um era inválido — o de PF-85 trazia `for (let` com parêntese sem fechar, e em ERE isso faz o `grep` abortar com `Unmatched ( or \(` (rc=2) em vez de devolver zero ocorrência. Corrigido para `for \(let` e reexecutado: rc=1, zero ocorrência no escopo real, então o veredito de PF-85 se sustenta. Depois disso estendi a varredura aos `grep` **sem aspas**, que a primeira passagem não cobria: apareceu mais um, no bloco de PF-112 (`grep -n CATALOG|PUBLISHABLE .env.example`), forma em que o shell tenta executar `PUBLISHABLE` como comando em vez de buscar a alternância. Corrigido para `grep -nE` com aspas. Depois dessas duas rodadas, nenhum comando do documento tem alternância que não funcione como escrito.
4. **A chamada aos agentes foi degradada**: 54 dos 58 itens foram enviados com título genérico ("item 44") em vez do texto real da auditoria. Os agentes recuperaram o conteúdo lendo o documento original — as evidências provam isso —, mas uma releitura do documento é o caminho certo para qualquer item que você queira executar.

## Fechados nesta sessão

| Item | O que mudou | PR |
| --- | --- | --- |
| PF-27 | estouro do limite parava de virar "proposta não encontrada" para o cliente | [#183](https://github.com/adm01-debug/Promo_Brindes_V1/pull/183) |
| PF-85 | resíduo de dado pessoal não apagado deixou de ser invisível | [#184](https://github.com/adm01-debug/Promo_Brindes_V1/pull/184) |
| PF-80 | documentação do banco deixou de descrever função que não existe | [#185](https://github.com/adm01-debug/Promo_Brindes_V1/pull/185) |
| PF-112 | variável de produção não documentada, com guard para não repetir | [#186](https://github.com/adm01-debug/Promo_Brindes_V1/pull/186) (parte de configuração) |

As quatro foram **mergeadas na `main`** em 17/11/2026: #183 em `108b0b2`, #184 em `e4a904f`, #185 em `fbd51d9`, #186 em `092d5c6`. Os blocos de evidência de PF-27, PF-80, PF-85 e PF-112 mais abaixo descrevem o estado **anterior** à correção e cada um traz, no fim, a reconciliação com o código desta árvore.

## Já fechados antes desta sessão, sem a auditoria registrar

PF-31, PF-49 e PF-66 — a auditoria de 11/10 os lista como pendentes (PARCIAL, PARCIAL e NÃO INICIADO, linhas 133, 156 e 183); a verificação de hoje encontrou o trabalho feito.

**Correção:** PF-128 também veio do lote como JÁ FEITO, mas a auditoria **já o registrava como RESOLVIDO** (linha 243: "Corrigido em `main` pela #103 … mantido aqui como registro histórico"). Ele não era uma pendência não registrada, e não deveria ter entrado nesta lista nem na contagem de 58.

Os quatro vieram do lote sem bloco de evidência próprio, diferente dos 54 abertos. Quem for conferir precisa relê-los no código; eu não os reconferi.

## Onde cada item restante trava

- **Depende de credencial/endereço seu (24 itens)**: PF-03, PF-05, PF-11, PF-12, PF-23, PF-24, PF-25, PF-29, PF-34, PF-51, PF-67, PF-68, PF-78, PF-81, PF-87, PF-90, PF-92, PF-93, PF-94, PF-100, PF-101, PF-107, PF-120, PF-125.
- **Exige mockup aprovado por você** (muda o que aparece na tela): PF-43, PF-44, PF-114, PF-122, PF-123, PF-124.
- **Regra 8 — CI, workflow, segredo ou custo**: PF-70, PF-74, PF-95, PF-96, PF-97, PF-98, PF-99.
- **Não verificável neste contêiner**: PF-82 (os testes de RLS do Storage exigem a stack local do Supabase, que precisa de Docker; escrever teste de segurança sem poder executá-lo seria pior do que não escrever).
- **Refatoração ampla que ninguém pediu**: PF-113 (decomposição de `src/styles.css`, 6.793 linhas, e das páginas grandes).

## Tabela de estado

| Item | Estado | Esforço | Depende de segredo |
| --- | --- | --- | --- |
| PF-03 | AINDA ABERTO | GRANDE | sim |
| PF-05 | AINDA ABERTO | GRANDE | sim |
| PF-10 | AINDA ABERTO | PEQUENO | não |
| PF-11 | PARCIAL HOJE | MEDIO | sim |
| PF-12 | AINDA ABERTO | MEDIO | sim |
| PF-23 | PARCIAL HOJE | GRANDE | sim |
| PF-24 | PARCIAL HOJE | MEDIO | sim |
| PF-25 | PARCIAL HOJE | GRANDE | sim |
| PF-27 | FECHADO HOJE (#183) | PEQUENO | não |
| PF-29 | PARCIAL HOJE | PEQUENO | sim |
| PF-34 | AINDA ABERTO | GRANDE | sim |
| PF-35 | AINDA ABERTO | GRANDE | não |
| PF-43 | PARCIAL HOJE | PEQUENO | não |
| PF-44 | PARCIAL HOJE | MEDIO | não |
| PF-51 | PARCIAL HOJE | PEQUENO | sim |
| PF-53 | PARCIAL HOJE | MEDIO | não |
| PF-67 | PARCIAL HOJE | PEQUENO | sim |
| PF-68 | AINDA ABERTO | MEDIO | sim |
| PF-70 | PARCIAL HOJE | PEQUENO | não |
| PF-74 | PARCIAL HOJE | MEDIO | não |
| PF-75 | AINDA ABERTO | PEQUENO | não |
| PF-78 | PARCIAL HOJE | MEDIO | sim |
| PF-79 | PARCIAL HOJE | MEDIO | não |
| PF-80 | FECHADO HOJE (#185) | PEQUENO | não |
| PF-81 | AINDA ABERTO | PEQUENO | sim |
| PF-82 | AINDA ABERTO | MEDIO | não |
| PF-85 | PARCIAL HOJE (alerta fechado em #184; drenagem aberta) | MEDIO | não |
| PF-87 | AINDA ABERTO | MEDIO | sim |
| PF-90 | AINDA ABERTO | PEQUENO | sim |
| PF-92 | PARCIAL HOJE | MEDIO | sim |
| PF-93 | AINDA ABERTO | MEDIO | sim |
| PF-94 | PARCIAL HOJE | MEDIO | sim |
| PF-95 | AINDA ABERTO | MEDIO | não |
| PF-96 | PARCIAL HOJE | MEDIO | não |
| PF-97 | PARCIAL HOJE | MEDIO | não |
| PF-98 | AINDA ABERTO | MEDIO | não |
| PF-99 | AINDA ABERTO | PEQUENO | não |
| PF-100 | PARCIAL HOJE | GRANDE | sim |
| PF-101 | PARCIAL HOJE | MEDIO | sim |
| PF-102 | PARCIAL HOJE | MEDIO | não |
| PF-103 | AINDA ABERTO | GRANDE | não |
| PF-106 | PARCIAL HOJE | MEDIO | não |
| PF-107 | AINDA ABERTO | GRANDE | sim |
| PF-108 | PARCIAL HOJE | MEDIO | não |
| PF-109 | AINDA ABERTO | GRANDE | não |
| PF-111 | AINDA ABERTO | MEDIO | não |
| PF-112 | PARCIAL HOJE (parte de configuração fechada em #186) | PEQUENO | não |
| PF-113 | AINDA ABERTO | GRANDE | não |
| PF-114 | PARCIAL HOJE | PEQUENO | não |
| PF-120 | AINDA ABERTO | MEDIO | sim |
| PF-122 | PARCIAL HOJE | PEQUENO | não |
| PF-123 | PARCIAL HOJE | PEQUENO | não |
| PF-124 | AINDA ABERTO | MEDIO | não |
| PF-125 | AINDA ABERTO | GRANDE | sim |

## Evidência por item

Cada bloco abaixo é o que a verificação encontrou no código de hoje. Onde há busca negativa (`grep ... = 0`), o comando pode ser repetido para confirmar.

### PF-03 — AINDA ABERTO

Esforço: GRANDE · Depende de segredo: sim

Busca negativa reproduzível: `grep -rn "insert into site_private.proposal_documents" site-supabase/` só acha pgTAP (site-supabase/supabase/tests/database/lead_storage.test.sql:257,300; customer_portal.test.sql:95; customer_data_erasure.test.sql:60) — nenhuma migration/RPC/endpoint publica proposta. `grep -rnE "update_site_quote_status|set_quote_status|change_status|triage_" --include=*.sql --include=*.ts --include=*.tsx .` (fora de docs/) = zero linhas: status só muda por UPDATE direto, cujo gatilho de linha do tempo segue em site-supabase/supabase/migrations/20260909180000_create_customer_quote_portal.sql:112. Nenhuma função atualiza site_private.quote_adjustment_requests.status para resolved/closed (`grep -rn "quote_adjustment_requests" migrations` só retorna o limite de 3 pendentes em 20260923120000_audit_security_reliability_hardening.sql:204 e as anonimizações LGPD em 20260923120000:290 e 20261117030000:186). `ls src/pages/` não tem página de back-office/admin e `grep -rlnE "admin|back-office|triagem" api/*.ts` = zero.

### PF-05 — AINDA ABERTO

Esforço: GRANDE · Depende de segredo: sim

Busca negativa reproduzível: `grep -rn "proposal_published" --include=*.sql --include=*.ts --include=*.tsx .` (fora de docs/) retorna só os dois CHECK — site-supabase/supabase/migrations/20260909180000_create_customer_quote_portal.sql:30 e 20260910130000_customer_adjustments_and_preferences.sql:33; nenhum trigger/RPC insere evento 'message' nem 'proposal_published' (os únicos produtores de evento são 'received'/'status_changed' em 20260909180000:112 e 'adjustment_requested' em 20260910130000:89,98 e 20260923120000_audit_security_reliability_hardening.sql:216-217). `grep -nE "message|proposal_published|eventType" src/lib/customerQuoteContract.ts` = zero: o cliente nem distingue tipo de evento. Sem canal de mensagem da equipe ao cliente em api/ (nenhum endpoint de mensagem em `ls api/`).

### PF-10 — AINDA ABERTO

Esforço: PEQUENO · Depende de segredo: não

api/notifications.ts:643-646 — sem provedor configurado (`configuredChannels()` vazio) o handler responde 503 'notification_provider_not_configured' e retorna, antes do `await reportQueueHealth()` que só existe no caminho de sucesso, em api/notifications.ts:689. O teste atual fixa esse comportamento: tests/api/notifications.test.ts:56-65 ('não reivindica a fila enquanto nenhum provedor estiver configurado') afirma `expect(fetchMock).not.toHaveBeenCalled()`, isto é, nenhuma chamada a site_notification_queue_health. Busca negativa: `grep -rn "queue_health" .github/workflows/*.yml` = zero linhas e `grep -nE "queue|health" api/commercial-alerts.ts` = zero — nenhum outro cron ou workflow mede a fila. O cron */15 segue declarado em vercel.json:7.

### PF-11 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: sim

Feito depois da auditoria (commit 8ea1273, #161): site-supabase/supabase/migrations/20261117030000_complete_customer_data_erasure.sql:205-209 cancela toda entrega ainda reivindicável ('pending','failed','processing') do titular apagado, e :59-60 acrescenta as transições pending→cancelled e failed→cancelled à matriz (reparo retroativo em 20261117030100_repair_incomplete_customer_data_erasure.sql:38) — logo 'cancelled' deixou de ser inalcançável e o titular apagado não recebe mais. FALTA: (a) corte de idade — a definição vigente de claim_site_notification_deliveries (site-supabase/supabase/migrations/20260923200000_enrich_quote_confirmation_contract.sql:94-116, a última; `grep -ln "create or replace function public.claim_site_notification_deliveries" migrations/*.sql | sort | tail -1`) filtra só por attempts/next_attempt_at/lease, sem nenhuma condição sobre created_at, e `grep -rnE "max_age|age_cutoff" migrations/` = zero; (b) filtro de pedido 'spam' — o claim nem faz join com site_private.quote_requests, e `grep -rn "'spam'" migrations/ | grep -iE "notification|delivery|claim"` = zero; (c) ferramenta de cancelamento de backlog para o operador (só a RPC de apagamento cancela; nenhum endpoint/RPC genérico).

### PF-12 — AINDA ABERTO

Esforço: MEDIO · Depende de segredo: sim

Os quatro entregáveis seguem ausentes. (1) Lista de supressão: `grep -rnE "suppression|supress" --include=*.sql site-supabase/` = zero; 'bounce'/'complained' só existem como estado da entrega (20260915150000_add_notification_delivery_events.sql:13,40) e nada bloqueia envio futuro ao endereço. (2) Reprocessamento exhausted→pending: a transição existe só como regra de dados (20260916220000_add_notification_delivery_status_machine.sql:48,94 e o comentário :26 que remete ao RUNBOOK como procedimento manual); `grep -rnE "reprocess|requeue|reenfileir" site-supabase/ api/` não acha nenhuma função/endpoint, e `ls scripts/maintenance` / scripts/soak-test-notification-queue.mjs não contêm ferramenta de reabertura. (3) Re-vínculo de evento que chega antes do aceite: site-supabase/supabase/migrations/20260916140000_add_provider_event_precedence.sql:56-67 ainda grava o evento com delivery_id nulo e devolve 'delivery_not_found', sem nenhum caminho posterior que o religue. (4) Purga de órfãos: `grep -rln "notification_provider_events" site-supabase/supabase/migrations/` lista 8 arquivos, nenhum de retenção/purga (20260911130000_add_site_data_retention.sql e 20260923120000 não mencionam a tabela).

### PF-23 — PARCIAL HOJE

Esforço: GRANDE · Depende de segredo: sim

Lado de leitura presente e inalterado: tabela versionada em site-supabase/supabase/migrations/20260909180000_create_customer_quote_portal.sql:54-71 (version 1..999, unique(quote_request_id, version), índice por published_at desc), listagem com version/isCurrent em :327-335, get_my_proposal_document em :357-378; URL assinada de 60 s em api/customer-proposals.ts:126 (expiresIn: 60); contrato do cliente em src/lib/customerQuoteContract.ts:61,227,242 e render em src/pages/CustomerQuotePage.tsx. FALTA o produtor: `grep -rn "insert into site_private.proposal_documents" site-supabase/` só acha pgTAP (tests/database/lead_storage.test.sql:257,300; customer_portal.test.sql:95; customer_data_erasure.test.sql:60) e `grep -rn "publish_proposal" .` (fora de docs/) = zero — nenhuma proposta pode ser publicada sem SQL manual, logo a versão 2+ no portal nunca aparece. Depende de PF-03.

### PF-24 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: sim

Existe: coluna em site-supabase/supabase/migrations/20260909180000_create_customer_quote_portal.sql:19-20 (display_name, company) e gravação de display_name no claim em 20260923120000_audit_security_reliability_hardening.sql:350-353. Falta: nenhuma RPC de leitura/edição de perfil — `grep -rn "\.rpc(" src/lib/*.ts` lista 16 RPCs e nenhuma de perfil (só claim/quote/assets/favoritos/seleções); `grep -rn "my_profile\|update_profile\|save_my_profile" site-supabase/supabase/migrations/ src/ api/` = 0 ocorrências; `grep -rn "insert into site_private.customer_profiles\|update site_private.customer_profiles" site-supabase/supabase/migrations/*.sql` devolve 5 linhas, e a única que escreve `company` é o apagamento LGPD (20261117030000_complete_customer_data_erasure.sql:243-244, company = null). O `company` exibido na conta vem de quote_requests (src/lib/customerQuoteContract.ts:14,49), não do perfil. Sem UI: CustomerAccountPage.tsx não tem seção de perfil/edição.

### PF-25 — PARCIAL HOJE

Esforço: GRANDE · Depende de segredo: sim

Existe: UI em src/pages/CustomerQuotePage.tsx:234 e RPC public.request_my_quote_adjustment em site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql:162-215, com o bloqueio de 3 pendentes em :205-208 (too_many_pending_adjustments). Falta (3 coisas): (1) continua atrás de flag desligada — src/lib/siteFeatureFlags.ts:6 e .env.example:25 `VITE_CUSTOMER_ADJUSTMENTS_ENABLED=false`; (2) não roteado ao comercial — os alertas novos cobrem só quote e contact (20261106150448_add_commercial_team_quote_alert.sql:86,107 e 20261117010000_add_commercial_team_contact_alert.sql:116,161), o CHECK de request_kind aceita só ('quote','contact') em 20260908230000_create_site_lead_storage.sql:70,86,103, e `grep -rn "quote_adjustment" site-supabase/supabase/migrations/*.sql | grep -i "notification_deliveries\|enqueue"` = 0; (3) o bug latente de PF-04 persiste: nada move o status para resolved/closed (`grep -rn "quote_adjustment_requests" .../migrations/*.sql | grep -i update` só acha os dois updates de anonimização, 20260923120000:290 e 20261117030000:186), então a 4ª tentativa fica bloqueada para sempre; (4) sem e2e — `grep -rln "adjustment\|ajustar" e2e/ tests/` só casa e2e/smoke.spec.ts, e `grep -n adjustment e2e/smoke.spec.ts` = 0 linhas.

### PF-27 — FECHADO HOJE (#183) — **conferido por mim, linha por linha**

Esforço: PEQUENO · Depende de segredo: não

`grep -c 429 api/customer-proposals.ts api/briefing-assets.ts` → 0 e 0. O estouro continua virando 404: a RPC levanta P0001 'rate_limit_exceeded' (site_private.consume_rate_limit em 20260927161243_harden_briefing_assets_and_audits.sql:112-114, consumido por get_my_proposal_document em :166-171 e get_my_briefing_asset_verification em :129-134), e os dois handlers colapsam qualquer resposta não-ok num 404 genérico: api/customer-proposals.ts:114-116 ('proposal_not_found') e api/briefing-assets.ts:126-130 ('briefing_asset_not_found'). Nenhum dos dois inspeciona o código/mensagem do erro. O 429 existe só em outros caminhos (api/_lib/siteDatabase.ts:196,248; api/_lib/sharedSelections.ts:102).

**Reconciliação com esta árvore:** fechado. `api/customer-proposals.ts:119` e `api/briefing-assets.ts:129` respondem 429 com `proposal_download_rate_limited` / `briefing_asset_rate_limited` e a mensagem "Muitas tentativas em pouco tempo. Aguarde alguns minutos." (#183, `108b0b2`). A busca negativa acima descreve o estado antes do merge.

### PF-29 — PARCIAL HOJE

Esforço: PEQUENO · Depende de segredo: sim

Existe: a linha do tempo renderiza os eventos em src/pages/CustomerQuotePage.tsx:236 (com estado vazio). Falta: o fallback de status desconhecido segue intacto em src/lib/customerAccount.ts:36-38 ('Em acompanhamento' para qualquer status fora dos 5 de customerStatusOptions:27-34), e não há próximo passo por status — `grep -rni "próximo passo\|proximo passo\|o que acontece agora\|nextStep\|next_step" src/ shared/ api/` devolve uma única linha, src/pages/QuotePage.tsx:381, que é o bloco pós-envio do formulário público, não o portal.

### PF-34 — AINDA ABERTO

Esforço: GRANDE · Depende de segredo: sim

Continua existindo só auditoria de escrita e DDL: site_private.admin_audit_log tem `operation text not null check (operation in ('INSERT','UPDATE','DELETE'))` em site-supabase/supabase/migrations/20260916210000_add_admin_write_audit.sql:18, alimentado por log_admin_write (:23+, triggers after insert/update/delete) e pelo event trigger de DDL (20260927161243_harden_briefing_assets_and_audits.sql:212+). Buscas negativas: `grep -rni "read_audit\|select_audit\|log_admin_read\|pii_read\|auditoria de leitura\|log_read" site-supabase/ src/ api/ docs/agentes/` = 0 ocorrências; `grep -rniE "audit.*(select|leitura)|(select|read).*audit" site-supabase/supabase/migrations/` só casa um `select id from site_private.admin_audit_log` (20260923120000:105) e o grant de leitura da própria tabela (20260916210000:31). Nenhuma extensão de auditoria (pgaudit) nas migrations.

### PF-35 — AINDA ABERTO

Esforço: GRANDE · Depende de segredo: não

Entregável (reencode, remoção de EXIF, limite de dimensões, PDF) não existe: `grep -rn "exif\|reencode\|maxWidth\|maxHeight\|createImageBitmap\|sharp(" --include=*.ts --include=*.tsx --include=*.sql --include=*.mjs --include=*.yml .` (fora de node_modules) = 0 ocorrências; package.json sem sharp/jimp. A validação segue só assinatura em 1 KiB: /home/user/Promo_Brindes_V1/api/_lib/fileSignatures.ts:3-8 e 26 (limit=1024), /home/user/Promo_Brindes_V1/api/briefing-assets.ts:68-71 (Range bytes=0-1023). PDF continua em quarentena permanente: /home/user/Promo_Brindes_V1/api/briefing-assets.ts:78-81 (`return 'invalid'`). Único limite é de bytes, não de dimensões: api/briefing-assets.ts:9 (MAX_ASSET_BYTES).

### PF-43 — PARCIAL HOJE

Esforço: PEQUENO · Depende de segredo: não

O clamp silencioso permanece exatamente onde a auditoria apontou: /home/user/Promo_Brindes_V1/src/lib/quoteItems.ts:174 (`quantity: clampQuoteQuantity(item.quantity, product.minQuantity)`) — o item reconciliado não carrega nenhuma marca de ajuste. Busca negativa: `grep -rn "quantityAdjusted\|ajustada\|ajustamos\|minimumAdjust\|quantityChanged" src/ --include=*.ts --include=*.tsx` = 0 ocorrências (só src/context/QuoteCartContext.test.ts:25 fala de mínimo). O que existe hoje: confirmação antes de substituir a seleção (/home/user/Promo_Brindes_V1/src/pages/CustomerQuotePage.tsx:152-160) e aviso de indisponibilidade de produto/cor (/home/user/Promo_Brindes_V1/src/pages/QuotePage.tsx:450). Falta: propagar o ajuste de quantidade do reconcile até a tela como aviso explícito.

### PF-44 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: não

Nada mudou desde a auditoria nos três pontos. (a) "Limpar seleção" na página segue sem confirmação: /home/user/Promo_Brindes_V1/src/pages/QuotePage.tsx:449 (`onClick={cart.clear}`), código inalterado desde e4e1c9b (2026-09-08). (b) "Apagar rascunho" segue sem confirmação prévia, só aviso posterior: QuotePage.tsx:466 (`onClick={discardDraft}`) → QuotePage.tsx:208-215 (`setDraftNotice`), introduzido em 84847d5 (2026-09-10, antes da auditoria). (c) Adicionar continua só abrindo o drawer, sem retorno próprio: /home/user/Promo_Brindes_V1/src/context/QuoteCartContext.tsx:113 (`setDrawerOpen(true)` encerra `addProduct`). Parte existente: confirmação real (alertdialog) apenas no drawer — /home/user/Promo_Brindes_V1/src/components/QuoteDrawer.tsx:209 e 274-276 — e desfazer pós-limpeza em /home/user/Promo_Brindes_V1/src/components/Layout.tsx:262-269 (27ddcf7, 2026-09-15). Falta: confirmação na página e no rascunho (consistência com o drawer) e confirmação de inclusão ao adicionar.

### PF-51 — PARCIAL HOJE

Esforço: PEQUENO · Depende de segredo: sim

Dois sub-itens foram fechados em fa7365b (#156, 2026-11-16): flags agora tipadas em /home/user/Promo_Brindes_V1/src/vite-env.d.ts:11-13, e o selo deixou de vazar na impressão — /home/user/Promo_Brindes_V1/src/pages/QuotePage.tsx:455 tem o `<span className="quote-item__print-decision">` dentro do guard `quoteDecisionGroupsEnabled &&`. O que permanece: as duas funcionalidades continuam atrás de flags de build em /home/user/Promo_Brindes_V1/src/lib/siteFeatureFlags.ts:5,7, consumidas em QuotePage.tsx:455 e /home/user/Promo_Brindes_V1/src/components/QuoteDrawer.tsx:216 (revogação de link). Se as flags estão ligadas em produção não é verificável daqui (env var na Vercel, estado remoto). Falta: confirmar/ligar VITE_QUOTE_DECISION_GROUPS_ENABLED e VITE_PERSISTENT_SHARED_SELECTIONS_ENABLED no ambiente de produção.

### PF-53 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: não

Inalterado desde a auditoria. Lógica e testes unitários existem: /home/user/Promo_Brindes_V1/src/lib/useOccasionFavorites.test.tsx com 24 casos (`grep -c "it("` = 24) e limite de 100 tratado em /home/user/Promo_Brindes_V1/src/lib/useOccasionFavorites.ts:400 e /home/user/Promo_Brindes_V1/src/lib/customerOccasionFavorites.ts:20. Buscas negativas: `grep -rli "favorit" e2e/` não retorna arquivo (e2e/ só tem product-detail.spec.ts e smoke.spec.ts); `grep -rn "navigator.onLine\|'offline'" src/ --include=*.ts --include=*.tsx` = 0 ocorrências. Falta: e2e Playwright de favoritos (inclusive multi-aba e o limite de 100 na promoção anônimo→conta) e tratamento offline.

### PF-67 — PARCIAL HOJE

Esforço: PEQUENO · Depende de segredo: sim

Feito: github_get_repo → "dependabot_security_updates":{"status":"enabled"}; github_get_actions_permissions → {"enabled":true,"allowed_actions":"all","sha_pinning_required":true} (em 11/10 era sha_pinning_required:false e security fixes off — docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md:184). Falta: allowed_actions continua "all" em vez de "selected" — e isso é decisão explícita do dono registrada em AGENTS.md (seção Serviços, GitHub/CI): "manter allowed_actions: all + sha_pinning_required: true; nunca local_only nem selected — em 14–16/11/2026 isso impediu o GitHub de criar qualquer run". Ou seja, a única parte aberta do item foi rejeitada por decisão documentada; não há entregável pendente de engenharia.

### PF-68 — AINDA ABERTO

Esforço: MEDIO · Depende de segredo: sim

Busca negativa reproduzível: `grep -rn "^[[:space:]]*environment:" /home/user/Promo_Brindes_V1/.github/workflows/` → zero linhas (os 16 workflows não declaram environment: em nenhum job; as únicas occorrências de "environment" são flags da CLI da Vercel em release.yml:195 e release.yml:333). Estado remoto lido hoje: github_list_environments → Production/Preview/copilot todos com "protection_rules":[] e "deployment_branch_policy":null; github_list_environment_secrets(Production) → {"total_count":0}. Idêntico ao diagnóstico de 11/10 (docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md:185). Falta tudo: mover os segredos do nível do repositório para o Environment, declarar environment: nos jobs que usam segredo (release.yml, database.yml) e configurar deployment_branch_policy.

### PF-70 — PARCIAL HOJE

Esforço: PEQUENO · Depende de segredo: não

Feito (leitura hoje): github_get_branch_protection main → "required_status_checks":{"strict":true,...} (era false em 11/10, docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md:187), "required_conversation_resolution":{"enabled":true}, "enforce_admins":{"enabled":true}, allow_force_pushes e allow_deletions desligados; github_get_repo → "delete_branch_on_merge":true e "allow_update_branch":true. Falta: (a) github_list_rulesets → [] (nenhum ruleset criado); (b) "required_linear_history":{"enabled":false}; (c) CodeQL e dependency review não são checks obrigatórios — os contexts exigidos são apenas ["Build structural Graphify map","Migrations and pgTAP","validate","cross-browser"], embora .github/workflows/codeql.yml e .github/workflows/dependency-review.yml existam.

### PF-74 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: não

Feito: npm audit signatures é passo bloqueante, sem continue-on-error, em .github/workflows/quality.yml:42-44; persist-credentials:false em 16 dos 18 checkouts (quality.yml:27,137; database.yml:27; ci-health.yml:27; graphify.yml:31; contexto.yml:91,132,194,286,317; inventario-estado-semanal.yml:54; release.yml:159; workflows-lint.yml:28; automation-local.yml:31; catalog-contract.yml:36; codeql.yml:39); todos os 16 workflows declaram bloco permissions: no topo (ex.: quality.yml:16, release.yml:16). Falta: (a) harden-runner — `grep -rni harden-runner /home/user/Promo_Brindes_V1/.github/ scripts/ package.json` → zero linhas; (b) zizmor não é executado em nenhum lugar — só existem comentários `# zizmor: ignore[excessive-permissions]` em contexto.yml:311 e inventario-estado-semanal.yml:46, e workflows-lint.yml:36 roda apenas actionlint; (c) SBOM — `grep -rni "sbom\|cyclonedx\|syft" .github/ scripts/ package.json` → zero linhas; (d) persist-credentials ainda é true em stale-branches.yml:24 e está ausente (default true) no checkout de release.yml:47; (e) permissions por job só existe em contexto.yml:311 e inventario-estado-semanal.yml:46.

### PF-75 — AINDA ABERTO

Esforço: PEQUENO · Depende de segredo: não

Busca negativa reproduzível: `grep -rn "assertSafeSiteDatabaseConfiguration" /home/user/Promo_Brindes_V1 --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=graphify-out` → única ocorrência em código é a própria definição em api/_lib/siteDatabase.ts:264-267 (`export function assertSafeSiteDatabaseConfiguration(): boolean { getSiteDatabaseConfig(); return true; }`); os demais hits são documentos (docs/audits/pending-features-20261011/08-codigo-e-graphify.md:62,136; docs/contexto/codigo/logica.json:355; analise-prs/funcionalidades.csv:76). Nenhum chamador em api/, src/, tests/ ou e2e/ — a função continua código morto e não existe preflight de configuração no boot; a validação só ocorre quando cada requisição chama getSiteDatabaseConfig().

### PF-78 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: sim

Existe hoje: inspeção remota recorrente do projeto isolado — .github/workflows/inventario-estado-semanal.yml:27 (cron semanal) + :65 ("Inventário do banco (somente leitura)") e scripts/inventario/gerar-banco.mjs:318-325 (alertas tabela_sem_rls e rls_sem_policy). FALTA: (a) diff integral de schema/ACL remoto — `grep -rn "db diff" scripts/ .github/ package.json` só retorna scripts/generate-database-schema-doc.mjs:81, que declara por escrito que o CI "não executa db diff nem comprova paridade com o Supabase remoto"; `grep -nE "grant|acl|has_table_privilege" scripts/inventario/gerar-banco.mjs` → 0 (o inventário não compara ACL/grants); (b) Security Advisor recorrente — `grep -rlnE "get_advisors|Security Advisor|security advisor" scripts/ .github/ package.json docs/agentes/` → 0 ocorrências; (c) lint continua só local: .github/workflows/database.yml:48 e package.json script db:site:lint usam `--local`.

### PF-79 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: não

Existe hoje: tipos gerados versionados (src/types/site-database.types.ts) com guarda de drift no CI (.github/workflows/database.yml:50-57). FALTA: a API continua sem usar os tipos — `grep -rn "site-database.types" api/` → 0 ocorrências (só src/lib/siteSupabase.ts:2 e src/lib/customerSelections.ts:2); contagem no bloco Functions de src/types/site-database.types.ts: 44 RPCs, 30 ainda com `Returns: Json` (era 42/28 em 11/10), portanto parsers manuais seguem sem contrato tipado; nenhum inventário de contratos JSON das RPCs (docs/DATABASE_FUNCTION_CONTRACTS.md cataloga códigos de erro, não o shape dos retornos Json).

### PF-80 — FECHADO HOJE (#185) — **conferido por mim, linha por linha**

Esforço: PEQUENO · Depende de segredo: não

As 6 divergências continuam idênticas: (1) docs/DATABASE_FUNCTION_CONTRACTS.md:50 cita `purge_site_admin_audit_log`, mas o nome real é `purge_site_admin_audit_logs` (api/retention.ts:167); (2) docs/DATABASE_FUNCTION_CONTRACTS.md:51 cita `get_site_storage_retention_candidates` — `grep -rn "get_site_storage_retention_candidates" site-supabase/ api/ src/types/site-database.types.ts` → 0 ocorrências (função não existe); (3) docs/DATABASE_FUNCTION_CONTRACTS.md:66 descreve a legada `finalize_briefing_asset_retention` como usada por api/retention.ts, que chama `finalize_site_storage_retention` (api/retention.ts:160); (4) contrato documenta 400 para `invalid_notification_provider_event_input` (DATABASE_FUNCTION_CONTRACTS.md:43) mas o caminho de erro da RPC responde 500 (api/notification-events-resend.ts:116); (5) docs/SITE_SUPABASE_SETUP.md:28 ainda afirma "as 18 versões batem entre local e remoto" (hoje há 69 arquivos em site-supabase/supabase/migrations/) e :116 afirma que "os únicos RPCs públicos usam security invoker ... concedidos somente a service_role", contrariado por grants a `authenticated` em site-supabase/supabase/tests/database/briefing_assets.test.sql:19-31; (6) docs/CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md:58 afirma que "nenhum cliente recebe política direta em storage.objects", mas briefing_assets.test.sql:33-35 exige 3 policies `customer_briefing_assets_%` em storage.objects.

**Reconciliação com esta árvore:** fechado. `docs/DATABASE_FUNCTION_CONTRACTS.md:50` cita `purge_site_admin_audit_logs` (nome real), a função inexistente saiu, a legada deixou de ser descrita como a usada pelo cron, e as três linhas de retenção dizem `503 (retention_unavailable, api/retention.ts:213)` (#185, `fbd51d9`). As divergências acima descrevem o estado antes do merge.

### PF-81 — AINDA ABERTO

Esforço: PEQUENO · Depende de segredo: sim

A função legada não foi removida: `grep -rn "drop function" site-supabase/supabase/migrations/` retorna 5 ocorrências, nenhuma de `finalize_briefing_asset_retention`; ela segue no catálogo real (src/types/site-database.types.ts:94, arquivo regerado do banco e com guarda de drift no CI) e com o GRANT de site-supabase/supabase/migrations/20260922150000_add_private_briefing_assets.sql:327 nunca revogado. O pgTAP continua exercitando a legada (site-supabase/supabase/tests/database/briefing_assets.test.sql:170) e a vigente segue sem teste de banco: `grep -rn "finalize_site_storage_retention" site-supabase/supabase/tests/` → exit 1, 0 ocorrências (usada em produção por api/retention.ts:160).

### PF-82 — AINDA ABERTO

Esforço: MEDIO · Depende de segredo: não

Os três entregáveis continuam ausentes: (a) policies de Storage ainda só contadas, não exercitadas com role cruzada — site-supabase/supabase/tests/database/briefing_assets.test.sql:33-35 faz apenas `count(*) ... polrelid='storage.objects'` = 3, e `grep -rn "role authenticated" site-supabase/supabase/tests/` → 0 ocorrências (os únicos `set local role` são site_api/postgres: admin_write_audit.test.sql:53, default_privileges.test.sql:14, lead_preflight_rate_limit.test.sql:85, site_api_privileges.test.sql:28), ou seja a RLS de storage.objects nunca roda sob `authenticated`; (b) captura real de DDL continua não verificada — admin_write_audit.test.sql:90-94 só faz `lives_ok` com o comentário "só confirma que o event trigger não quebra", e `grep -rnE "admin_ddl_log|command_tag|event_trigger" site-supabase/supabase/tests/database/*.sql` só acha a linha 75, que é um INSERT de fixture para a retenção, não uma asserção de DDL capturado; (c) estouro do rate limit de seleção compartilhada sem teste — `grep -rn "shared_selection_rate_limit_exceeded" site-supabase/supabase/tests/ tests/` → 0 (só api/_lib/sharedSelections.ts:101); os testes só conferem consumo de bucket (selection_asset_integrity.test.sql:45-46). Nota: existe teste de estouro para outro limite (briefing_assets.test.sql, 19 tentativas → rate_limit_exceeded), que não é o da seleção compartilhada.

### PF-85 — PARCIAL HOJE (alerta fechado em #184) — **conferido por mim, linha por linha**

Esforço: MEDIO · Depende de segredo: não

A retenção existe e roda, mas sem drenagem — exatamente o quadro de 11/10: api/retention.ts:7 `REQUEST_TIMEOUT_MS = 10_000` e :8 `RETENTION_BATCH_SIZE = 100` seguem fixos, o handler faz uma única passada sequencial (api/retention.ts:119-170) e `grep -rnE "backlog|remaining|while|for \(let|drain|pending" api/retention.ts` → 0 ocorrências (nenhum laço de drenagem, nenhuma métrica de resíduo); o cron continua diário em vercel.json:7 (`0 3 * * *`). FALTA: repetir o lote até esvaziar (ou medir e alertar o backlog remanescente) e um orçamento de tempo por passada em vez do timeout único de 10 s compartilhado por todas as 6 RPCs da execução.

**Reconciliação com esta árvore:** metade fechada. A medição e o alerta entraram — `api/retention.ts:178-208` monta `backlogSaturated` com as seis frentes de lote independente (orçamentos, contatos, seleções arquivadas, anexos e os dois logs de auditoria) e dispara alerta operacional quando qualquer uma satura (#184, `e4a904f`). **Continuam abertos** os outros dois pedidos do item: repetir o lote até esvaziar e um orçamento de tempo por passada — `REQUEST_TIMEOUT_MS = 10_000` e a passada única sequencial seguem como descrito acima.

### PF-87 — AINDA ABERTO

Esforço: MEDIO · Depende de segredo: sim

Busca negativa: `grep -rni "heartbeat\|lastRunAt\|last_run_at\|watchdog" api/ src/ scripts/ site-supabase/ .github/ shared/ tests/ vercel.json` → zero ocorrências ligadas aos crons; os únicos hits são de 'heartbeat' do snapshot de docs (scripts/supabase_snapshot/test_snapshot.py:622). Os 3 crons seguem declarados em vercel.json:6-9 sem registro de última execução, e o único alerta existente é disparado DENTRO da própria invocação (api/notifications.ts:693, api/retention.ts:185, api/commercial-alerts.ts:116) — não detecta cron que parou de ser chamado. Nenhum workflow agendado vigia liveness: `grep -rn "notification_queue_health\|queue_health" .github/workflows/*.yml` → nada.

### PF-90 — AINDA ABERTO

Esforço: PEQUENO · Depende de segredo: sim

O defeito apontado persiste: docs/RUNBOOK_REVISAO_MENSAL_BANCO.md:51 ainda tem `last_autovacuum, last_autovacuum` (coluna duplicada). A tabela 'Histórico' no fim do mesmo arquivo continua com uma única linha, de 16/09/2026, explicitamente marcada 'ambiente local, sem tráfego real' — nenhuma revisão nova registrada. Nenhuma automação executa a revisão: `grep -rn "REVISAO_MENSAL\|revisao-mensal" .github/workflows/` → nada. A execução em si depende de acesso autenticado ao projeto isolado xlzmclcjdncjfdrjxclt (sem MCP próprio), que não posso ler daqui.

### PF-92 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: sim

Existe hoje: contrato tipado com 35 eventos em src/lib/analytics.ts:4-38, já cobrindo landing (`idea_landing_viewed`, analytics.ts:36, adicionado em d539fb2 após a auditoria), login (`customer_access_requested`, analytics.ts:24, usado em src/pages/CustomerLoginPage.tsx) e seleção salva (`product_saved`, analytics.ts:9); coleta instalada em src/App.tsx:103-104. FALTA: (1) evento de contato — src/components/ConversationForm.tsx faz o submit em 67-85 e `grep -n trackFunnelEvent src/components/ConversationForm.tsx` → zero; (2) evento de upload — `grep -n trackFunnelEvent src/components/BriefingAssetUploader.tsx` → zero; (3) `frontend_error` segue fora do contrato tipado, chamando o `track` cru do @vercel/analytics em src/lib/clientObservability.ts:1,12 em vez de trackFunnelEvent; (4) homologação de recepção e baseline de CWV p75 só existe no painel da Vercel — não verificável daqui.

### PF-93 — AINDA ABERTO

Esforço: MEDIO · Depende de segredo: sim

O passo de rollback existe (.github/workflows/release.yml:164 captura o deployment ativo; 297-317 promove o anterior e confirma os dois aliases), mas nada indica ensaio. Busca negativa: `grep -rni "ensaio\|rehears\|drill\|simula.*rollback" docs/RUNBOOK_RELEASE.md .github/workflows/release.yml` → zero (o único hit no repo é o próprio plano, docs/PLANO_FECHAMENTO_100_ETAPAS_20261001.md:837, que pede o ensaio). docs/RUNBOOK_RELEASE.md tem a seção '## Falha e rollback' (linha 29) sem histórico de execução. O único teste que toca o assunto é estático sobre o YAML (tests/scripts/release-workflow.test.ts:15-46: lê o arquivo e confere a ordem/variáveis), não exercita o caminho. Se houve rollback real em produção, isso está no histórico de runs da Vercel/GitHub, que não posso ler.

### PF-94 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: sim

O script foi endurecido depois da auditoria (parseSoakConfig em scripts/soak-test-notification-queue.mjs:41-54, tratamento de erro do psql em 55-73, isTerminalDelivery em 87-89, coberto por tests/soak-test-notification-queue.node.mjs dentro de `npm run check`, package.json:43), mas a representatividade apontada não mudou: segue só local (DB_URL fixo `postgresql://postgres:postgres@127.0.0.1:56322/postgres`, linha 23, sem override por env), polling de 3 s (POLL_INTERVAL_MS = 3_000, linha 32) e sem simular a cadência de 15 min do cron (linha 242 só documenta o fator 3x; `grep -n "15 \* \|cadência" scripts/soak-test-notification-queue.mjs` não traz nenhuma espera de janela). Último relatório segue o de 16/09 contra banco local (docs/RELATORIO_SOAK_TEST_FILA_20260916.md:3) e o script não está em nenhum workflow.

### PF-95 — AINDA ABERTO

Esforço: MEDIO · Depende de segredo: não

Os quatro pontos continuam. Vitest 2×: .github/workflows/quality.yml:74 roda `npm run check`, que inclui `npm run test` (= `vitest run`, package.json:28 e 17), e quality.yml:77 roda `npm run test:coverage` (= `vitest run --coverage`). Build 3×: `npm run check` já chama `npm run build` (package.json:28), o `npm run test:e2e` do mesmo check sobe webServer com `npm run build` (playwright.config.ts:21) e quality.yml:93 roda `npm run build` outra vez. Sem cache de browsers: `grep -rn "ms-playwright\|actions/cache" .github/workflows/` → zero (instalação crua em quality.yml:56-71 e 145-146). Composite órfão: .github/actions/setup-node-project/action.yml existe e `grep -rn "uses: ./.github/actions" .github/workflows/` → zero. PR só de docs roda tudo: `grep -n "paths-ignore\|paths:\|dorny/paths-filter" .github/workflows/quality.yml` → zero, gatilho é `pull_request` puro (quality.yml:3-6).

### PF-96 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: não

Release ainda é por push e não por evento: .github/workflows/release.yml:3-6 (`on: push` + `workflow_dispatch`, sem `workflow_run`) e :54-76 (laço `for attempt in $(seq 1 90)` com `sleep 20` fixo). Ordenação de check-runs segue sem filtro de app e sem paginação real: :55 (`check-runs?per_page=100`, só emite `::warning::` em :58-60) e :63 (`sort_by(.started_at) | last`). Sem LC_ALL: `grep -rn "LC_ALL" .github/` → nenhuma ocorrência. Sem backoff: :75 `sleep 20` e :132 `sleep 15` constantes. Sem timeout por passo: `grep -n "timeout-minutes" .github/workflows/release.yml` → só nível de job (25, 43, 150). Sem issue automática de release quebrado: `grep -rn "gh issue create" .github/ scripts/` → nenhuma ocorrência. Já existe (parte feita): rollback dos dois aliases (:289-319), smoke do candidato antes da promoção (:217-223), guard do ref isolado (:91-101) e espera do ledger (:104-133). Falta: gatilho `workflow_run`, filtro por app + paginação dos check-runs, `LC_ALL=C` nas comparações/ordenações, backoff crescente, `timeout-minutes` por passo e abertura automática de issue quando o release falha.

### PF-97 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: não

A parte do resumo foi feita: .github/workflows/quality.yml:97-115 monta tabela com o `outcome` de cada passo (audit, audit signatures, check, coverage, performance) em vez de repetir só `job.status` (commit 1d017c9 'o resumo do quality gate para de acusar falha em passo que passou'). Continua faltando métrica e SLO: `grep -rn "p95\|p50\|SLO" .github/ scripts/ci-health-metrics.mjs package.json` só acha percentis em scripts/soak-test-notification-queue.mjs:197-198 (fila de notificação, não CI); scripts/ci-health-metrics.mjs não tem duração nem percentil (`grep -n "duration\|percentile" scripts/ci-health-metrics.mjs` → vazio); .github/workflows/ci-health.yml:40-81 reporta só total/sucesso/falha e :83-114 alerta em >30% de falha, sem p50/p95 de duração e sem SLO declarado; `grep -rn "coverage-diff\|delta" ` em .github/ e scripts/ não acha delta de cobertura. Falta: p50/p95 de duração dos runs, delta de cobertura por PR e SLO explícito de CI.

### PF-98 — AINDA ABERTO

Esforço: MEDIO · Depende de segredo: não

Nenhum dos cinco entregáveis existe hoje: `grep -n "ci:local" package.json` → nenhuma ocorrência (scripts vão de package.json:11 a :66+ sem alvo agregador local); `ls -a /home/user/Promo_Brindes_V1/.npmrc` → arquivo não existe, logo sem `engine-strict` (engines só declarado em package.json:7-9); `grep -rn "lighthouse\|lhci" package.json .github/` → nenhuma ocorrência; `grep -n "ignore" .github/dependabot.yml` → nenhuma ocorrência no arquivo de 40 linhas (só groups minor/patch em :12-14, :26-28); `grep -rn "ESLint 10\|eslint@10\|TypeScript 7\|política de majors" docs/agentes/ package.json` → nenhuma ocorrência.

### PF-99 — AINDA ABERTO

Esforço: PEQUENO · Depende de segredo: não

`git ls-remote --tags origin` devolve apenas backup/computador-local-261117, backup/recovered-eslint-20260914 e backup/recovered-wip-20260915 — nenhuma tag de release (vX.Y.Z ou equivalente). `grep -rn "git tag\|refs/tags\|create_release\|createRelease" .github/workflows/` → nenhuma ocorrência, inclusive em .github/workflows/release.yml (que termina em :336-358 só subindo artefatos, sem criar tag nem release).

### PF-100 — PARCIAL HOJE

Esforço: GRANDE · Depende de segredo: sim

Parte das 12 jornadas ganhou e2e: landings /ideias em e2e/smoke.spec.ts:406 (`toHaveURL(/\/ideias\/onboarding$/)`), :416-449 (todas as entradas editoriais e card de eventos → /ideias/onboarding, /ideias/eventos, /ideias/clientes-vip, /ideias/sustentaveis); /sobre em :1151 e /sobre + /privacidade na varredura axe de :1113. A suíte cresceu de 56 para 58 testes em e2e/smoke.spec.ts (e/product-detail.spec.ts segue com 8). Seguem sem e2e (busca negativa: `grep -rn "setInputFiles\|api/contact\|mailto\|revoke\|revoga\|arquivar\|restaurar\|/404\|esqueci\|signup" e2e/` → NENHUMA OCORRENCIA): troca de senha e 'esqueci a senha' (e2e/smoke.spec.ts:1166-1176 só confere autocomplete e botão 'Mostrar senha'), criação de conta e login real, envio do contato via API (:1030-1040 só valida campos em /contato, sem submit), upload/remoção de anexos (:734-778 apenas mocka a RPC attach_my_briefing_assets_to_quote), pedido de ajuste, revogação de link, arquivar/restaurar/excluir seleção, 404 genérico de rota (o único 404 é mock de API em :1294), fallback mailto e execução com flags desligadas.

### PF-101 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: sim

Nada do 'falta' mudou. playwright.config.ts:21 ainda constrói o e2e com as três flags ligadas (`VITE_CUSTOMER_ADJUSTMENTS_ENABLED=true VITE_QUOTE_DECISION_GROUPS_ENABLED=true VITE_PERSISTENT_SHARED_SELECTIONS_ENABLED=true`) e :20-26 sobe só `npm run build && npm run preview` (Vite), sem `vercel dev` — logo as funções de api/*.ts nunca rodam no e2e; os quatro projects (:27-32) são apenas navegadores, sem variante com flags desligadas (`grep -rn "ENABLED" e2e/ playwright.config.ts` só acha a linha 21). As APIs continuam simuladas no teste: e2e/smoke.spec.ts:52-73 (mockCatalog roteia categories e v_site_products_public) e :104-107 (route de **/api/quote-requests). Existe hoje apenas a base realista de navegador/viewport (desktop+mobile chromium, firefox, webkit) e retries no CI (:12). Falta: execução e2e com flags desligadas e pelo menos um fluxo contra as funções serverless reais (api/quote-requests, api/notifications) em vez de route.fulfill.

### PF-102 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: não

Existem os trechos: e2e/smoke.spec.ts tem ~60 testes por rota (e2e/smoke.spec.ts:134,464,550,628,734) e e2e/product-detail.spec.ts:1-155. Falta a jornada única e os dois modificadores: `grep -rnE "jornada|rede lenta|storage bloqueado|setOffline|throttl" e2e/ tests/` → 0 linhas; `awk` contando page.goto por teste em e2e/smoke.spec.ts → nenhum teste passa de 3 rotas (o máximo é 'biblioteca de catálogos'); playwright.config.ts:27-32 tem 4 projetos sem perfil de rede lenta; a única simulação próxima é um envio lento em rota única (e2e/smoke.spec.ts:628).

### PF-103 — AINDA ABERTO

Esforço: GRANDE · Depende de segredo: não

Nenhuma matriz requisito/risco→camada de teste no repo: `grep -rlnE "camada de teste|matriz de teste|requisito/risco" docs/ tests/ e2e/ src/` só acha o próprio texto de auditoria e planos (docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md, docs/audits/pending-features-20261011/02-plano-fechamento-100.md, docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md) — nenhum artefato novo desde 11/10 (`git log --since=2026-10-11 --name-only` não lista nada do tipo). Cenários adversos também ausentes: `grep -rinE "duas máquinas|dois dispositivos|concorrência|concurrent" e2e/ tests/api/ src/lib/*.test.ts` → 0 linhas; `grep -rlnE "upload|anexo" e2e/` → 0 arquivos; tests/api/briefing-assets.test.ts não tem caso de token expirando durante o upload (`grep -rnE "expirad|vencid|expired" tests/api/*.ts` só acha lease de fila em tests/api/notifications.test.ts:123).

### PF-106 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: não

Feito: o passo de instalação está documentado/automatizado — .claude/hooks/session-start.sh:5 e :78-80 (instala `requirements-graphify.txt` via uv/pip) e docs/agentes/mapa-repo.md:57-63. Falta (1) independência de node_modules: scripts/graphify.mjs:8-15 importa estaticamente ./graphify-quality.mjs, que faz `import ts from 'typescript'` em scripts/graphify-quality.mjs:3 — logo todo `graph:*`, inclusive `graph:status` (package.json:65), ainda quebra em clone sem `npm ci`; (2) hashes: requirements-graphify.txt:4-5 são pins simples sem `--hash`, e o comentário da linha 2 cita `requirements-graphify.in`, que não existe (`ls requirements-graphify.in` → No such file or directory); (3) `doctor` (scripts/graphify.mjs:833-845) checa só versão do CLI, sidecar histórico e hook status — `grep -n "tree_sitter" scripts/graphify.mjs` só acha a mensagem de erro da linha 129, nenhuma checagem de Python/tree_sitter_sql.

### PF-107 — AINDA ABERTO

Esforço: GRANDE · Depende de segredo: sim

.graphify.project.json:1 segue `"mode":"code-only"` com `automation.usesAiProvider:false` e `limitations.impactAnalysis:"neighborhood-only"`; docs/GRAPHIFY.md:88 declara que o passe semântico de documentação não faz parte da automação atual. Passe documental ausente: scripts/graphify.mjs:31 (`CODE_EXTENSIONS`) não inclui `.md` e os `sourceRoots` de .graphify.project.json não têm `docs/`. Memória técnica ausente: `grep -rinE "memória técnica|memoria tecnica|memor" scripts/ docs/GRAPHIFY.md .graphify.project.json` → 0 linhas. Único avanço parcial é a fronteira dos bancos por guarda (validateSeparatedCorpora em scripts/graphify-quality.mjs, descrito em docs/GRAPHIFY.md:22), que a auditoria já contava como guarda, não como mapa direcional.

### PF-108 — PARCIAL HOJE

Esforço: MEDIO · Depende de segredo: não

Feito: benchmark versionado com 10 casos (docs/graphify-benchmark.json, `cases` = 10, de GR40-01 a GR40-10) e comparação base/head (scripts/graphify.mjs:669-693). Falta (1) `.graphifyignore` lido pela automação: ele entra só na impressão digital (scripts/graphify.mjs:32-37 e :217) — listSourceFiles (scripts/graphify.mjs:168-186) filtra apenas por `sourceRoots` e `CODE_EXTENSIONS` sobre `git ls-files`, sem ler os padrões do arquivo; (2) scanner: SENSITIVE_PATTERNS (scripts/graphify.mjs:57-65) não cobre `sb_secret_`, `re_`, `whsec_` nem JWT — `grep -nE "sb_secret_|whsec_|eyJ" scripts/graphify.mjs` → 0 linhas; (3) benchmark mede só acerto de recuperação, declarado no próprio relatório (scripts/graphify.mjs:683); (4) sem filtro `paths:` no workflow: `grep -n "paths" .github/workflows/graphify.yml` → 0 linhas, o gatilho é `push: branches:[main]` + `pull_request` (.github/workflows/graphify.yml:3-6). Nomeação de comunidades fica a cargo do CLI (`grep -nE "communit|comunidade" scripts/graphify.mjs` → 0 linhas), sem evidência local de curadoria.

### PF-109 — AINDA ABERTO

Esforço: GRANDE · Depende de segredo: não

Busca negativa: `git log --oneline --since=2026-10-11 -- docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv docs/MATRIZ_INDEX.md` → saída vazia. Último commit da matriz: `git log -1 --format="%ad %H" -- docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv` → Tue Sep 22 2026, dafd3d9 (mesmo SHA citado pela auditoria). docs/MATRIZ_INDEX.md:15 ainda chama o CSV de 12/09 de "Fonte vigente dos 230 requisitos" e docs/MATRIZ_INDEX.md:19 ainda declara "Distribuição vigente: 118 I / 100 P / 1 N / 11 E". Nenhum documento novo de reconciliação em docs/ (`ls docs/ | grep -i matriz|reconcil` só devolve os CSVs de 11/09, 12/09 e o RUNBOOK_RECONCILIACAO_LEDGER.md, que trata do ledger de migrations, não dos 230 requisitos).

### PF-111 — AINDA ABERTO

Esforço: MEDIO · Depende de segredo: não

As cinco contradições citadas persistem, e `git log --oneline --since=2026-10-11 -- docs/PLANO_CORRECOES_50_ETAPAS_20260913.md docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md PLANO_100.md plano-50-etapas.html vite.config.ts` → saída vazia (nenhum arquivo tocado desde a auditoria). (1) vite.config.ts:56 ainda diz "pelos 72 testes E2E do Playwright", mas `grep -rhn "^\s*test(" e2e/*.spec.ts | wc -l` = 66 (product-detail 8 + smoke 58). (2) docs/PLANO_CORRECOES_50_ETAPAS_20260913.md:100 ainda diz `noUncheckedIndexedAccess` "Revertida nesta rodada", enquanto tsconfig.app.json:11 e tsconfig.node.json:6 têm `"noUncheckedIndexedAccess": true`. (3) docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md:500 "Fase 3 — Índices e desempenho (site DB) — ✅ integralmente fechada" contra a linha 513 do mesmo arquivo: "Etapa 19 — Revisão mensal de pg_stat_statements e índices sem uso — permanece aberta". (4) PLANO_100.md:5 ainda afirma "Nenhuma etapa foi executada." (5) plano-50-etapas.html:1055 ainda afirma "Nenhuma etapa deste plano foi executada." (6) docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md segue com 103 checkboxes `[ ]` (ex.: linhas 131-134, 151-154).

### PF-112 — PARCIAL HOJE (configuração fechada em #186) — **conferido por mim, linha por linha**

Esforço: PEQUENO · Depende de segredo: não

Dois dos oito achados foram fechados; seis seguem vivos. FECHADOS: (a) scripts/sql/verify-shared-selection-contract.sql deixou de ser órfão — tests/verify-shared-selection-contract.node.mjs:14 o lê (`fs.readFileSync(path.join(ROOT, 'scripts', 'sql', 'verify-shared-selection-contract.sql'))`) e o script `test:shared-selection-sql` (package.json:44) está dentro do gate `check` (package.json:28), via commit 223e655; (b) VERCEL_PROJECT_ID e VERCEL_SCOPE agora são definidos e consumidos em .github/workflows/release.yml:153-154 e usados em :194-196, :202, :234, :258, :299. AINDA ABERTOS: `catalogConfig` em src/lib/catalog.ts:501-505 sem nenhum consumidor (`grep -rn catalogConfig src/ --include=*.ts --include=*.tsx` só devolve a própria definição; o hit em scripts/check-catalog-public-contract.mjs:249 é uma função local homônima); `siteAuthConfigured` em src/lib/siteSupabase.ts:20 sem consumidor; `validateQuoteBriefing` em src/lib/quoteBriefing.ts:120 usado só em src/lib/quoteBriefing.test.ts:43-51; `hydrateSharedSelection` em src/lib/sharedSelection.ts:329 usado só em src/lib/sharedSelection.test.ts:86 (o que a produção usa é `hydrateSharedSelectionDetails`, src/lib/customerSelections.ts:157); public/brand/promo-brindes-logo-v1-360.webp sem referência (`grep -rn logo-v1-360 src/ api/ public/ index.html scripts/ .github/` → vazio); `CATALOG_SUPABASE_PUBLISHABLE_KEY` estava fora do .env.example (`grep -nE 'CATALOG|PUBLISHABLE' .env.example` devolvia só VITE_SUPABASE_PUBLISHABLE_KEY:3, VITE_PRODUCT_CATALOG_RESOURCE:7 e VITE_SITE_SUPABASE_PUBLISHABLE_KEY:20 — o comando foi publicado sem `-E` e sem aspas, forma em que o shell tenta executar `PUBLISHABLE` como comando; corrigido aqui).

**Reconciliação com esta árvore:** a parte de configuração está fechada — `.env.example:8` declara `CATALOG_SUPABASE_PUBLISHABLE_KEY` e `scripts/validate-env-example.mjs` reprova o gate se a API ler variável que o exemplo não declara (#186, `092d5c6`). Os cinco achados de código morto seguem abertos.

### PF-113 — AINDA ABERTO

Esforço: GRANDE · Depende de segredo: não

Nenhuma decomposição: as métricas pioraram. `wc -l` hoje: src/pages/QuotePage.tsx 502 (a auditoria media 467), src/pages/HomePage.tsx 379 (era 370), src/pages/CommemorativeDatesPage.tsx 350, src/pages/CatalogsPage.tsx 303. CSS segue monolítico: `wc -l src/styles.css` = 6793 linhas, 216.256 bytes (era 6.783 / 213 KB), importado inteiro em src/main.tsx:4 (`import './styles.css';`), e `ls src/styles/` → "No such file or directory" (nenhuma divisão por rota).

### PF-114 — PARCIAL HOJE

Esforço: PEQUENO · Depende de segredo: não

Metade existe: src/pages/ProductPage.tsx:133 (ramo `if (!product)`) já entrega texto próprio — `<Seo title="Produto não encontrado" ... noIndex />` + mensagem "Não encontramos este produto. Ele pode ter saído do catálogo ou o endereço está incompleto." + link "Voltar ao catálogo" — e é um ramo distinto do `productState.error` em :131. Falta: esse ramo reusa o componente `CatalogError`, cujo cabeçalho fixo em src/components/CatalogFeedback.tsx:25 continua `<h2>O catálogo fez uma pausa.</h2>` com `role="alert"` (CatalogFeedback.tsx:23), ou seja, o título lido na tela e pelo leitor de tela é o mesmo da falha temporária. Não há componente dedicado (`grep -rnE "ProductNotFound|CatalogNotFound" src/components/ src/pages/` → só src/pages/NotFoundPage.tsx:5, que é o 404 de rota). Ambas as linhas vêm de e4e1c9b (08/09/2026) e `git log --since=2026-10-10 -- src/components/CatalogFeedback.tsx src/pages/ProductPage.tsx` só traz fb534ed (deps e rótulos acessíveis), sem mexer no texto. Falta, exatamente: cabeçalho e semântica próprios de "não encontrado" (ex.: prop de título em CatalogError ou componente separado, sem `role="alert"`).

### PF-120 — AINDA ABERTO

Esforço: MEDIO · Depende de segredo: sim

Busca negativa: `grep -rnoE "product_removed|selection_cleared|selection_removed|shared_selection_opened|whatsapp_opened|whatsapp_click|quote_field_abandoned|time_to_first_selection|search_empty" src/ api/ tests/` → saída vazia. src/lib/analytics.ts:4-38 (FunnelEventMap) não declara nenhum dos seis eventos prometidos: `comparison_changed` (analytics.ts:12) cobre só a bandeja de comparação (`added|removed|cleared`), não a remoção/limpeza da seleção de orçamento — o handler em src/components/QuoteDrawer.tsx:255 chama `cart.removeItem` sem nenhum `trackFunnelEvent`; não há evento de abertura de seleção compartilhada, de abandono por campo, de tempo até a primeira seleção, nem de abertura de WhatsApp (`grep -rn "wa.me" src/` não aparece junto de trackFunnelEvent); `catalog_result_viewed` (analytics.ts:7) segue com apenas result_count/page/active_filters/campaign, sem `has_query`, logo busca vazia não se distingue de filtro vazio (o `has_query` existente está só em `catalog_library_filtered`:13 e `occasion_filtered`:30). Único commit em analytics.ts desde a auditoria: d539fb2, que adicionou `idea_landing_viewed`/`idea_catalog_opened`, não os eventos de funil. A parte "dashboards de funil" é NAO_VERIFICAVEL daqui: depende do console do Vercel Analytics.

### PF-122 — PARCIAL HOJE

Esforço: PEQUENO · Depende de segredo: não

Nada mudou desde a auditoria: `git log -1 -- src/components/QuoteDrawer.tsx` = 2026-09-22 (ef97fc7) e `-- src/components/SavedSelections.tsx` = 2026-10-06 (3f82233), ambos anteriores a 11/10. Continua existindo só a explicação fora do fluxo: src/pages/PrivacyPage.tsx:11 ("armazenamento local do navegador") e src/components/SavedSelections.tsx:183 ("Nome para a seleção deste navegador") + :178 ("retome o briefing em outro dispositivo"). FALTA o aviso no próprio fluxo da seleção: o rodapé do drawer (src/components/QuoteDrawer.tsx:261-266, "Zero checkout. Zero compromisso.") e o restante do componente não dizem onde a seleção fica guardada — `grep -c "navegador" src/components/QuoteDrawer.tsx` = 0 e `grep -c "conta" src/components/QuoteDrawer.tsx` = 0 (a única menção a dispositivo é sobre o link compartilhado, linha 216). Também não há nota no fluxo em src/pages/QuotePage.tsx (só :214, sobre o rascunho apagado).

### PF-123 — PARCIAL HOJE

Esforço: PEQUENO · Depende de segredo: não

src/pages/CustomerLoginPage.tsx inalterada desde 2026-10-06 (3f82233, antes da auditoria). O campo de código aparece em :123 e o reenvio continua só pelo mesmo botão de submit (:126, rótulo "Enviar acesso por e-mail"); os links de apoio em :129-132 são apenas "Prefiro criar uma senha", "Esqueci minha senha" e "Voltar ao acesso por e-mail". FALTAM as duas affordances pedidas: `grep -ic reenviar src/pages/CustomerLoginPage.tsx` = 0 (e 0 no teste CustomerLoginPage.test.tsx) e `grep -rn "outro e-mail" src/` não retorna nada — não existe "Reenviar código" nem "Usar outro e-mail" em nenhum ponto do app (trocar o e-mail só é possível reescrevendo o campo :122). Observação: o lote classificou PF-123 como DIVERGÊNCIA; a auditoria de 11/10 (docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md:278) registra PARCIAL.

### PF-124 — AINDA ABERTO

Esforço: MEDIO · Depende de segredo: não

src/pages/CustomerQuotePage.tsx inalterada desde 2026-09-23 (87aad97). A seção "Briefing original" (src/pages/CustomerQuotePage.tsx:232) segue com contato, local/recebimento, direção de curadoria e contexto, sem anexos; nenhuma outra seção os mostra (:231 produtos, :233 propostas, :234 ajuste). Buscas negativas: `grep -ric "anexo\|asset" src/pages/CustomerQuotePage.tsx` = 0 e `grep -ic anexo src/lib/customerQuoteContract.ts src/lib/customerAccount.ts` = 0. O contrato também não traz anexos: a última definição de public.get_my_quote_request está em site-supabase/supabase/migrations/20260922160000_preserve_kit_composition.sql:145-200 e `grep -c asset` nesse trecho = 0 (os anexos só existem no caminho de upload, src/lib/briefingAssets.ts:81 `list_my_briefing_assets`, usado pelo BriefingAssetUploader, não pelo detalhe do orçamento).

### PF-125 — AINDA ABERTO

Esforço: GRANDE · Depende de segredo: sim

src/pages/CustomerAccountPage.tsx inalterada desde 2026-09-27 (73db8b2). A conta (src/pages/CustomerAccountPage.tsx:77-99) tem hero com "Sair" (:81), seleções salvas (:83) e histórico de orçamentos (:84-97) — nenhuma seção de preferências ou de exclusão de dados; `grep -ic "preferências da conta\|excluir minha conta\|apagar meus dados" src/pages/CustomerAccountPage.tsx` = 0 e não existe rota de preferências em src/App.tsx:110-127. O apagamento continua operação manual do dono: docs/RUNBOOK_PEDIDO_TITULAR.md:21 (`select public.erase_customer_data(...)`), e a função é negada ao cliente autenticado — site-supabase/supabase/migrations/20260923120000_audit_security_reliability_hardening.sql:609-610 revoga de anon/authenticated/site_api e concede só a service_role (as migrations novas de 17/11, 20261117030000_complete_customer_data_erasure.sql:138, só reforçam o corpo da função; não criam caminho self-service).

## Por que nada disso está em produção ainda

Em 17/11/2026 as seis PRs abertas (#181 a #186) têm todos os checks verdes menos um: o `validate` morre no passo `npm audit --audit-level=high`. O advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) cobre `picomatch <=4.0.7` e **4.0.7 é a última versão publicada** — não existe versão corrigida para fixar por `overrides`. As 14 vulnerabilidades são todas de ferramenta de build: `npm audit --audit-level=high --omit=dev` devolve `found 0 vulnerabilities`, ou seja o que vai ao ar está limpo.

Isso tem duas saídas, e as duas são decisão do dono (regra 8): o gate passar a medir só o escopo de produção, ou esperar o `picomatch` publicar correção. Enquanto nenhuma das duas acontecer, nenhuma correção chega ao site.
