# Relatório de implementação — Supabase exclusivo do site

Data: 08/09/2026

## Resultado

A separação aprovada foi implementada sem alterar o projeto `Promo_Gifts_V4` e sem executar DDL no Supabase canônico `doufsxqlfjyuvxuezpln`.

O catálogo permanece no banco canônico em modo público de leitura. O novo domínio de leads foi preparado em `site-supabase/`, com backend próprio em `api/`. A criação e o vínculo do novo projeto remoto continuam pendentes porque exigem um project ref novo e uma secret key criada pelo proprietário.

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
| Vitest | 55/55 |
| pgTAP | 14/14 |
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

## Estado operacional

O preview segue disponível em `http://localhost:4180`. Enquanto o novo Supabase não for criado, os endpoints públicos permanecem desativados por configuração e os formulários usam o fallback por e-mail. Isso evita uma dependência parcial ou uma gravação acidental no banco errado.

O próximo passo autorizado é exclusivamente de provisionamento: criar o segundo projeto, vincular `site-supabase`, revisar `db push --dry-run`, aplicar a migration e inserir as quatro variáveis server-side na Vercel. O runbook está em `docs/SITE_SUPABASE_SETUP.md`.

## Referências técnicas

- Supabase API keys: <https://supabase.com/docs/guides/getting-started/api-keys>
- Supabase Database Functions: <https://supabase.com/docs/guides/database/functions>
- Supabase Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase Database Testing: <https://supabase.com/docs/guides/database/testing>
- Supabase migrations: <https://supabase.com/docs/guides/deployment/database-migrations>
- Vercel Node.js Functions: <https://vercel.com/docs/functions/runtimes/node-js>
