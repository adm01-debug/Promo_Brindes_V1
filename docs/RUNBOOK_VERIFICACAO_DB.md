# Runbook — verificação em 5 comandos do banco isolado do site (Etapa 6)

Escopo: projeto isolado `xlzmclcjdncjfdrjxclt`. Sequência mínima para confirmar, a
qualquer momento, que o banco remoto está no estado esperado — sem precisar de acesso
via Studio nem de um conector MCP dedicado. Read-only: nenhum comando abaixo altera
schema ou dados (`db push` só roda com `--dry-run`).

## Pré-requisito: token de acesso

Nenhum comando abaixo funciona sem um `SUPABASE_ACCESS_TOKEN` do CLI com escopo restrito
ao projeto `xlzmclcjdncjfdrjxclt` (Dashboard > Account > Access Tokens; **não** o token
de conta inteira usado para gerenciar outros projetos). Guardar no cofre de segredos do
time — nunca em `.env.local` versionado, nunca colado em chat/issue.

```bash
export SUPABASE_ACCESS_TOKEN='<token de escopo mínimo, do cofre do time>'
```

**Este runbook nunca foi executado contra produção nesta sessão** — token de acesso
real não está disponível neste ambiente. Os 5 comandos abaixo estão prontos para rodar
assim que o token existir; a saída de uma primeira execução deve ser anexada aqui (ou a
um registro equivalente) como evidência, sem incluir o token em si.

## 1. Migrations aplicadas vs. locais

```bash
SUPABASE_WORKDIR=site-supabase supabase migration list --linked
```

Confirma que o remoto tem exatamente as migrations do repositório, sem nenhuma aplicada
manualmente fora do fluxo do CLI (drift) e sem nenhuma pendente.

## 2. Simulação de push (nunca aplica)

```bash
npm run db:site:dry-run
```

Roda `scripts/validate-site-supabase-target.mjs` (confirma que o projeto linkado é
`xlzmclcjdncjfdrjxclt`, nunca o canônico) e depois `supabase db push --dry-run` — mostra
exatamente o que seria aplicado, sem aplicar.

## 3. Lint do schema remoto

```bash
SUPABASE_WORKDIR=site-supabase supabase db lint --linked --level warning --fail-on warning
```

Mesmo lint que roda no CI contra o banco local (Etapa 31), mas contra o remoto —
detecta drift de configuração que só existe em produção (extensões, grants aplicados
manualmente).

## 4. Saúde da fila de notificações

```bash
SUPABASE_WORKDIR=site-supabase supabase db query --linked \
  "select public.site_notification_queue_health();"
```

Retorna `oldestEligibleAgeSeconds` e `exhaustedCount` por canal — o mesmo sinal que
`api/notifications.ts` usa para o alerta operacional (Etapa 42), consultável
manualmente a qualquer momento.

## 5. Contagem por tabela

```bash
SUPABASE_WORKDIR=site-supabase supabase db query --linked "
  select relname, n_live_tup
  from pg_stat_user_tables
  where schemaname = 'site_private'
  order by relname;
"
```

Contagem aproximada (via `pg_stat_user_tables`, sem `count(*)` completo em todas as
tabelas — mais barato e suficiente para detectar uma tabela vazia que deveria ter dados,
ou um crescimento muito fora do esperado). Tabelas atuais (16, `site-supabase/supabase/migrations/`):
`admin_audit_log`, `admin_ddl_log`, `consent_receipts`, `contact_requests`,
`customer_profiles`, `notification_deliveries`, `notification_provider_events`,
`proposal_documents`, `quote_adjustment_requests`, `quote_items`,
`quote_request_events`, `quote_requests`, `rate_limit_buckets`,
`shared_selection_rate_limits`, `shared_selections`, `status_transitions`.

## Security Advisor (após todo deploy de migration, Etapa 31)

`supabase db lint --local --level warning --fail-on warning` já roda na CI e falha o
build (`.github/workflows/database.yml`), mas cobre só o schema em si (índices,
funções sem `search_path`, etc.) — não os achados do Security Advisor do painel do
Supabase, que também olha configuração de projeto (extensões desatualizadas, RLS
desligada em alguma tabela que o lint local não veio a conhecer, chaves expostas).
Depois de todo `supabase db push` para `xlzmclcjdncjfdrjxclt`:

1. Dashboard do projeto > Advisors > Security Advisor.
2. Confirme zero achados de severidade alta/crítica novos desde o deploy anterior.
3. Se houver achado novo, decida antes do próximo deploy: corrigir (nova migration) ou
   registrar como risco aceito com justificativa (mesmo padrão de
   `docs/DATABASE_FUNCTION_CONTRACTS.md`).

**Não ensaiado nesta sessão** — exige acesso ao painel do projeto real, que este
ambiente não tem. Passo documentado, não executado.

## Conector MCP (opcional, não obrigatório)

Se o time adotar um gateway MCP para este projeto, identificá-lo pelo nome do projeto
(`xlzmclcjdncjfdrjxclt` / "site" ou equivalente) na configuração — nunca reaproveitar um
gateway genérico compartilhado com outros projetos Supabase da conta, para não correr o
risco de rodar uma consulta no banco errado por engano. Nenhum dos 5 comandos acima
depende de MCP; são todos CLI puro, que é a via de verificação padrão até essa decisão
ser tomada.
