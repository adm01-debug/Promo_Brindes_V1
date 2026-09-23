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
`role: "site_api"`, `ref: "xlzmclcjdncjfdrjxclt"`, `jti` único e validade padrão de
30 dias. O gerador recusa validade acima de 90 dias; para uma janela menor use
`SITE_SUPABASE_JWT_TTL_DAYS=7`. Registre expiração e rotação antes do corte.

## 2. Validar o token contra o projeto remoto (leitura, sem efeito)

Antes de trocar qualquer variável de produção, confirme que o gateway aceita o token e
que ele alcança a RPC permitida:

```bash
# Deve retornar 200 com a saúde da fila (site_api tem execute nesta função):
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "https://xlzmclcjdncjfdrjxclt.supabase.co/rest/v1/rpc/site_notification_queue_health" \
  -H "apikey: <o token gerado>" -H "Authorization: Bearer <o token gerado>"

```

Um 404 em `customer_profiles` não prova falta de privilégios: a tabela pode não estar
no schema exposto pela API. Confira o grant negativo diretamente no catálogo SQL do
projeto isolado, com acesso administrativo de leitura:

```sql
select has_function_privilege(
  'site_api', 'public.get_my_quote_requests(integer,integer,text,text)', 'execute'
) as deve_ser_false;
```

Se a RPC permitida não retornar 200 ou o grant negativo for `true`, interrompa o
cutover e confira a migration. Não use um endpoint inexistente como teste de negação.

## 3. Configurar na Vercel (ambiente de produção)

1. Adicione `SITE_SUPABASE_SERVICE_JWT` (server-side, **nunca** prefixo `VITE_`) com o
   token gerado no passo 1.
2. Mantenha `SITE_SUPABASE_SECRET_KEY`: `api/retention.ts` ainda precisa dela para
   excluir objetos privados na Storage API. A role `site_api` não tem acesso ao schema
   `storage`, por design. O código prefere o JWT novo nas RPCs e usa a chave secret
   exclusivamente para apagar blobs de propostas. Se houver blobs e a chave faltar,
   a retenção falha sem apagar os metadados.
3. Valide separadamente leitura da RPC, operação de Storage no bucket autorizado e
   negação fora desse escopo antes de classificar o cutover como concluído.
4. Agende rotação antes do `exp`; nunca trate esse JWT como credencial de longa duração.

## 4. Deploy e observação

1. Deploy normal (a troca de variável por si só não redeploya na Vercel — force um
   redeploy ou aguarde o próximo push).
2. Acompanhe `api/notifications.ts` e os webhooks por pelo menos um ciclo completo do
   cron (15 min) — confirme que a fila continua sendo drenada (via
   `site_notification_queue_health`) e que não há um aumento de erros 401/403 nos logs
   da Vercel.
3. Envie um orçamento de teste real pelo site e confirme que ele chega, é enfileirado e
   entregue — o ciclo completo, não só a inserção.

## 5. Rotação da chave secret

O cutover das RPCs **não** encerra o uso da chave secret: a retenção ainda depende da
Storage API. Portanto, não remova nem rotacione a chave sem configurar e validar uma
credencial substituta com escopo apropriado para Storage. Depois disso:

1. Confirme que propostas antigas ainda são removidas e que as demais RPCs usam o JWT
   limitado por pelo menos 24 horas de operação observada.
2. Só após a substituição da credencial de Storage, remova a chave secret da Vercel e
   coordene sua rotação no painel do Supabase.
3. Confirme novamente a retenção e um ciclo do cron após a rotação.

## Rollback

Antes da rotação: remova `SITE_SUPABASE_SERVICE_JWT` e redeploy para voltar às RPCs com
`SITE_SUPABASE_SECRET_KEY`. A role e seus grants podem permanecer no banco. Depois da
rotação, use somente uma nova credencial emitida pelo projeto isolado; a antiga não
volta a funcionar.
