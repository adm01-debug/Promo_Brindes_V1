# Matriz risco → camada de teste — 18/11/2026

Para que serve: dizer, por risco de negócio, **qual camada de teste o cobre e
onde não há cobertura nenhuma**. A contagem de testes não responde isso — 53
arquivos de unitário não cobrem um fluxo que atravessa cinco páginas, e 3
arquivos de e2e podem cobrir o que mais importa. Os vazios desta tabela são o
que decide onde vale investir teste.

Camadas que existem hoje no repositório:

| Camada | O que roda | Volume |
| --- | --- | --- |
| Unitário (Vitest) | `src/**/*.test.ts(x)` — lógica de componente, hook, biblioteca | 53 arquivos |
| Função serverless (Vitest) | `tests/api/*.test.ts` — handler com `fetch` interceptado | 20 arquivos |
| Ferramenta (`node --test`) | `tests/*.node.mjs` — scripts, grafo, contratos de automação | 23 arquivos |
| Banco (pgTAP) | `site-supabase/supabase/tests/database/*.sql` — RPC, RLS, trigger, plano | 29 arquivos |
| Navegador (Playwright) | `e2e/*.spec.ts` — Chromium desktop e celular; Firefox e WebKit só no CI | 3 arquivos |
| Produção (gate de release) | `npm run test:smoke-deployment`, `test:catalog-contract`, `test:performance-budget` | 26 scripts `test:*` |

## Riscos e cobertura

| Risco de negócio | Camada que cobre | Evidência | Vazio |
| --- | --- | --- | --- |
| Lead/orçamento gravado duas vezes ou perdido | banco + serverless | `lead_storage.test.sql`, `quote_protocol.test.sql`, `tests/api/lead-requests.test.ts` | — |
| Rate limit de lead deixa passar ou bloqueia cliente real | banco | `lead_preflight_rate_limit.test.sql` | — |
| Fila de notificação travada sem ninguém saber | banco + serverless | `notification_queue_policy.test.sql`, `notification_outbox.test.sql`, `tests/api/notifications.test.ts`, `tests/api/operationalAlerts.test.ts` | alerta real depende de webhook configurado na Vercel; sem a variável, a notificação não sai e nenhum teste pega isso |
| Entrega/devolução de e-mail e WhatsApp aplicada fora de ordem | banco + serverless | `notification_delivery_status_machine.test.sql`, `notification_provider_events.test.sql`, `tests/api/notification-events-*.test.ts` | — |
| Assinatura de webhook aceita de quem não deveria | serverless | `tests/api/webhookSignature.test.ts` | — |
| Cliente vê orçamento de outro cliente | banco | `customer_portal.test.sql`, `force_rls_hygiene.test.sql`, `site_api_privileges.test.sql`, `default_privileges.test.sql` | — |
| Dado pessoal não apagado no prazo | banco + serverless | `customer_data_erasure.test.sql`, `tests/api/retention.test.ts` | — |
| Seleção compartilhada vazando ou perdendo item | banco + serverless | `customer_selections.test.sql`, `shared_selection_priorities.test.sql`, `selection_asset_integrity.test.sql`, `tests/api/shared-selections.test.ts` | — |
| Anexo do briefing aceito com conteúdo que não é o declarado | serverless + banco | `tests/api/briefing-assets.test.ts`, `briefing_assets.test.sql` | **nenhum e2e**: `grep -rlniE 'upload\|anexo\|briefing-asset' e2e/` → zero arquivos. O caminho real do cliente — escolher arquivo em `src/components/BriefingAssetUploader.tsx:75`, subir, ver o estado de verificação — nunca roda em navegador |
| Catálogo público muda de contrato e o site quebra | gate de release | `scripts/check-catalog-public-contract.mjs`, `tests/catalog-public-contract.node.mjs` | — |
| Seleção se perde ao trocar de página | navegador | `e2e/journey.spec.ts` (PR #199) | até #199 entrar, nenhum teste atravessa a jornada |
| Cliente com duas abas ou dois aparelhos perde a seleção | navegador | `e2e/concurrency.spec.ts` (PR #201), `e2e/favorites.spec.ts` | até #201 entrar, nenhum cenário de concorrência |
| Site quebra em Firefox ou WebKit | navegador (só no CI) | check `cross-browser` | não roda em nenhuma máquina local: este contêiner só tem Chromium. Um erro específico desses dois motores só aparece no CI, depois do push |
| Deploy sobe quebrado | produção | `test:smoke-deployment`, `test:performance-budget`, `release.yml` | — |
| Kit montado perde composição | banco | `kit_composition.test.sql`, `kit_persistence_guards.test.sql` | nenhum e2e de `/montar-kit` fora do smoke |
| Login e primeira senha do cliente | unitário | `src/pages/CustomerLoginPage.test.tsx`, `src/pages/AuthConfirmPage.test.tsx` | o fluxo autenticado em navegador existe só dentro de `e2e/smoke.spec.ts`; não há caso dedicado para `/minha-conta` |

## Leitura honesta dos vazios

Três vazios, em ordem de risco:

1. **Anexo do briefing sem teste em navegador.** É o único fluxo em que o
   cliente entrega um arquivo, e o caminho de ponta a ponta — seleção do
   arquivo, envio, verificação server-side, estado na tela — nunca roda em
   navegador. Os testes que existem cobrem o handler e o banco, não a tela.
2. **Firefox e WebKit sem execução local.** O contêiner de agente só tem
   Chromium, então toda afirmação sobre esses dois motores depende do CI. Hoje
   o check `cross-browser` é também o mais frágil do repositório.
3. **Alerta de fila sem destino configurado.** `OPERATIONS_ALERT_WEBHOOK_URL` e
   `COMMERCIAL_TEAM_WEBHOOK_URL` não estão definidas; o código avisa, mas não há
   para onde avisar, e nenhum teste pode suprir isso.

Os demais riscos têm cobertura em pelo menos uma camada adequada ao risco —
banco para integridade e isolamento, serverless para contrato de resposta,
navegador para continuidade entre páginas.
