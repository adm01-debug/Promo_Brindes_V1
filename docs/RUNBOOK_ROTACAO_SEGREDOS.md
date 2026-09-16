# Runbook — rotação de segredos (Etapa 29)

Escopo: variáveis server-side da Vercel do projeto `Promo_Brindes_V1`. Frequência
recomendada: 90 dias, ou imediatamente após qualquer suspeita de vazamento (ex.: um
segredo colado num canal não confiável, um log que capturou um header por engano).

## Garantia já em vigor

Toda comparação de segredo neste código usa `crypto.timingSafeEqual` (direto ou via um
dos quatro helpers equivalentes: `matchesSecret`, `matchesCronSecret`,
`timingSafeStringEqual`, `safeCompare`) — confirmado por auditoria de código em
16/09/2026 e travado por `tests/timing-safe-secret-comparisons.node.mjs` (`npm run
test:timing-safe-secrets`), que falha se uma rota nova comparar um segredo com `===`.

## Ordem segura de rotação (nunca ao contrário: gerar → configurar → validar → revogar)

Cada segredo abaixo tem exatamente um consumidor; rotacionar um não afeta os outros.

1. **`CRON_SECRET`** — gere um valor novo (≥ 32 caracteres aleatórios). Configure na
   Vercel. A Vercel Cron usa a variável de ambiente atual automaticamente na próxima
   invocação — não precisa de redeploy. Confirme no próximo ciclo do cron
   (`/api/notifications`, 15 min) que não houve 401 nos logs.
2. **`SITE_REQUEST_HASH_SALT`** — gere um valor novo. **Atenção**: isto muda o hash de
   IP usado no rate limit (`site_private.rate_limit_buckets`, que já é `UNLOGGED` desde
   a Etapa 30 — perder o estado na troca é aceitável, só reseta janelas de rate limit
   em andamento). Configure e faça redeploy.
3. **`RESEND_WEBHOOK_SECRET`** — gere um par novo no painel do Resend (Webhooks),
   configure na Vercel, faça redeploy, **então** revogue o segredo antigo no painel do
   Resend. Confirme com um evento de teste (Resend permite reenviar um webhook de
   teste) que `api/notification-events-resend.ts` aceita a assinatura nova.
4. **`WHATSAPP_APP_SECRET`** — gerar um novo exige rotacionar o App Secret da Meta
   (painel do app > Configurações básicas), que também invalida tokens de outras
   integrações que usem o mesmo app — coordenar antes de rotacionar isoladamente.
5. **`WHATSAPP_WEBHOOK_VERIFY_TOKEN`** — gere um valor novo, configure na Vercel e
   faça redeploy **antes** de atualizar no painel da Meta (o handshake de verificação
   do webhook falha se o valor não bater nos dois lados ao mesmo tempo — janela curta
   de sincronização necessária).
6. **Credencial de serviço do Supabase** (`SITE_SUPABASE_SECRET_KEY` ou
   `SITE_SUPABASE_SERVICE_JWT`) — ver `docs/RUNBOOK_SITE_API_CUTOVER.md`, que já cobre
   a rotação como parte do próprio cutover da Etapa 25.

## O que este runbook não cobre

- Rotação de `VITE_*` (chaves públicas): não são segredos — não vazam ao rotacionar,
  mas também não precisam de rotação por rotina, só se o projeto Supabase inteiro for
  comprometido.
- `VERCEL_OIDC_TOKEN`: gerenciado automaticamente pela Vercel CLI, não é uma credencial
  de longa duração desta aplicação.
