# Relatório de implementação — Supabase exclusivo do site

Data inicial: 08/09/2026 · validação de produção: 09/09/2026

## Resultado

A separação aprovada foi implementada sem alterar o projeto `Promo_Gifts_V4` e sem executar DDL no Supabase canônico `doufsxqlfjyuvxuezpln`.

O catálogo permanece no banco canônico em modo público de leitura. O domínio de leads foi provisionado no projeto isolado `xlzmclcjdncjfdrjxclt`, com backend próprio em `api/`, e está ativo na Vercel. Nenhuma tabela do site foi criada no Supabase canônico.

## Controles implementados

- `site_private` fora dos schemas expostos pela Data API;
- seis tabelas: orçamentos, itens snapshot, contatos, consentimentos, auditoria de notificações e rate limit;
- RLS em todas as tabelas, sem policies públicas;
- ausência de grants para `anon` e `authenticated`;
- RPCs transacionais `security invoker`, com `search_path` vazio e nomes qualificados;
- execução dos RPCs somente por `service_role`/secret key;
- validação duplicada na API e no banco;
- limite de 50 produtos e 64 KiB por request;
- idempotência por `clientRequestId` e SHA-256 do payload normalizado;
- rate limit atômico por HMAC-SHA256 do IP, sem persistir IP bruto;
- bloqueio explícito do project ref canônico;
- allowlist de host `^[a-z0-9]{20}.supabase.co$`, impedindo exfiltração da secret key por URL mal configurada;
- origem web configurável e same-origin como desenho de produção;
- nenhum envio de WhatsApp habilitado sem consentimento específico.

## Evidências de validação

| Camada | Resultado |
|---|---:|
| TypeScript | aprovado |
| Vitest | 56/56 |
| pgTAP | 16/16 |
| Supabase `db lint` | zero erros |
| Reset limpo + reaplicação da migration | aprovado |
| RPC real via PostgREST com secret key local | HTTP 200 + protocolo |
| RPC real via PostgREST com publishable/anon key | HTTP 401 |
| Repetição idempotente | mesma solicitação, sem duplicar item/consentimento |
| Corpo diferente com mesma chave | conflito detectado |
| Item inválido | transação integralmente revertida |
| Rate limit de contato | nona solicitação bloqueada |
| Build Vite | aprovado |
| Playwright desktop/mobile | 18 aprovados, 2 skips deliberados por projeto |
| Axe WCAG A/AA | zero violações automáticas nos templates cobertos |
| `npm audit` | zero vulnerabilidades |
| Sourcemaps de produção | nenhum arquivo `.map` |
| Advisors remotos | 0 erros e 0 avisos |
| Serviços remotos | DB, Auth, REST, Realtime e Storage saudáveis |
| E2E sintético em produção | contato HTTP 201; orçamento HTTP 201; repetição idempotente HTTP 200/`duplicate: true` |
| Limpeza pós-teste | zero registros sintéticos remanescentes |

## Estado operacional

O site está publicado em <https://promo-brindes-v1.vercel.app>. Os endpoints `/api/quote-requests` e `/api/contact-requests` estão ativos e usam exclusivamente o Supabase isolado. O preview local pode ser iniciado com `npm run dev` ou `npm run preview` depois do build.

As próximas integrações opcionais são os provedores de e-mail e WhatsApp. Elas não devem ser ativadas sem credenciais server-side, templates aprovados, política de retries e opt-in específico para WhatsApp. O runbook do banco está em `docs/SITE_SUPABASE_SETUP.md`.

## Referências técnicas

- Supabase API keys: <https://supabase.com/docs/guides/getting-started/api-keys>
- Supabase Database Functions: <https://supabase.com/docs/guides/database/functions>
- Supabase Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase Database Testing: <https://supabase.com/docs/guides/database/testing>
- Supabase migrations: <https://supabase.com/docs/guides/deployment/database-migrations>
- Vercel Node.js Functions: <https://vercel.com/docs/functions/runtimes/node-js>
