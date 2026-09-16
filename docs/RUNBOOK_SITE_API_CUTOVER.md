# Runbook — cutover para a role `site_api` (Etapa 25)

Escopo: projeto isolado `xlzmclcjdncjfdrjxclt`. Este runbook é o passo manual,
deliberadamente separado da migration `20260916160000_add_site_api_role.sql`: a
migration só cria a role e os grants (reversível, sem efeito em produção até a Vercel
apontar para o JWT novo). Executar este runbook troca o que `api/_lib/siteDatabase.ts`
usa para autenticar — é o passo que efetivamente reduz o raio de um vazamento de
credencial, mas também o único com potencial de quebrar produção se algo estiver
errado. **Não execute sem primeiro confirmar os pré-requisitos abaixo.**

## Pré-requisitos

- [ ] Migration `20260916160000_add_site_api_role.sql` aplicada no projeto remoto
      (`npm run db:site:dry-run` limpo, depois `SUPABASE_WORKDIR=site-supabase npx
      supabase@latest db push`).
- [ ] `site-supabase/supabase/tests/database/site_api_privileges.test.sql` verde no CI
      da branch que contém essa migration.
- [ ] Legacy JWT Secret do projeto em mãos (Settings > API > JWT Settings no dashboard
      do Supabase) — necessário só para gerar o token, nunca para configurar na Vercel.

## 1. Gerar o JWT de serviço

```bash
SITE_SUPABASE_JWT_SECRET='<legacy jwt secret>' npm run db:site:generate-site-api-jwt
```

Confirme antes de prosseguir (`node -e` com o mesmo código de decodificação, ou
`tests/generate-site-api-jwt.node.mjs` como referência): o payload deve ter
`role: "site_api"` e `ref: "xlzmclcjdncjfdrjxclt"`.

## 2. Validar o token contra o projeto remoto (leitura, sem efeito)

Antes de trocar qualquer variável de produção, confirme que o gateway aceita o token e
que ele só alcança o que deveria:

```bash
# Deve retornar 200 com a saúde da fila (site_api tem execute nesta função):
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "https://xlzmclcjdncjfdrjxclt.supabase.co/rest/v1/rpc/site_notification_queue_health" \
  -H "apikey: <o token gerado>" -H "Authorization: Bearer <o token gerado>"

# Deve retornar 401/403 (site_api não tem select em customer_profiles):
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://xlzmclcjdncjfdrjxclt.supabase.co/rest/v1/customer_profiles?select=user_id&limit=1" \
  -H "apikey: <o token gerado>" -H "Authorization: Bearer <o token gerado>"
```

Se o primeiro não for 200 ou o segundo não for 401/403, **pare aqui** — não configure
nada na Vercel ainda. Alguma coisa no grant ou na migration remota está diferente do que
foi validado localmente.

## 3. Configurar na Vercel (ambiente de produção)

1. Adicione `SITE_SUPABASE_SERVICE_JWT` (server-side, **nunca** prefixo `VITE_`) com o
   token gerado no passo 1.
2. **Não remova `SITE_SUPABASE_SECRET_KEY` ainda** — mantenha as duas variáveis
   configuradas neste momento.
3. `api/_lib/siteDatabase.ts` precisa de uma mudança de código para preferir
   `SITE_SUPABASE_SERVICE_JWT` quando presente, caindo para `SITE_SUPABASE_SECRET_KEY`
   caso contrário — **isso ainda não foi implementado nesta sessão** (fica registrado
   aqui como o próximo passo de código antes deste runbook poder ser executado de
   verdade). Não prossiga para o passo 4 sem essa mudança revisada e mergeada.

## 4. Deploy e observação

1. Deploy normal (a troca de variável por si só não redeploya na Vercel — force um
   redeploy ou aguarde o próximo push).
2. Acompanhe `api/notifications.ts` e os webhooks por pelo menos um ciclo completo do
   cron (15 min) — confirme que a fila continua sendo drenada (via
   `site_notification_queue_health`) e que não há um aumento de erros 401/403 nos logs
   da Vercel.
3. Envie um orçamento de teste real pelo site e confirme que ele chega, é enfileirado e
   entregue — o ciclo completo, não só a inserção.

## 5. Rotação da `service_role`

Só depois do passo 4 estável por pelo menos 24h:

1. Remova `SITE_SUPABASE_SECRET_KEY` das variáveis da Vercel.
2. No dashboard do Supabase, rotacione a `service_role` key (Settings > API). Isso
   invalida qualquer cópia antiga da chave que possa ter vazado — o objetivo original
   desta etapa.
3. Confirme mais um ciclo do cron depois da rotação.

## Rollback

Em qualquer ponto antes do passo 5: reverta a variável da Vercel para
`SITE_SUPABASE_SECRET_KEY` (ela nunca foi removida) e faça redeploy. A role `site_api`
e seus grants continuam existindo no banco sem efeito colateral — não precisa reverter a
migration.

Depois do passo 5 (chave antiga já rotacionada): não há rollback para a chave antiga,
porque ela não existe mais. Gere uma `service_role` key nova no dashboard e reconfigure
`SITE_SUPABASE_SECRET_KEY` como estava, ou gere um novo JWT `site_api` (passo 1) se o
problema for específico do token, não do mecanismo.
