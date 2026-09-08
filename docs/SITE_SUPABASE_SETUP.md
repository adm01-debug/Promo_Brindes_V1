# Supabase exclusivo do Site Promo Brindes

## Decisão arquitetural

O catálogo continua sendo lido do projeto canônico `doufsxqlfjyuvxuezpln`. Leads, briefings, itens selecionados, recibos de consentimento, rate limit e auditoria de notificações pertencem a um **segundo projeto Supabase**. Não há FK entre projetos: cada item de orçamento guarda o ID canônico e um snapshot dos campos apresentados ao visitante.

A migration deste diretório nunca deve ser aplicada ao banco canônico. Há duas barreiras adicionais:

1. `scripts/validate-site-supabase-target.mjs` bloqueia o project ref canônico antes do dry-run;
2. a API rejeita em runtime `SITE_SUPABASE_URL` quando ela aponta para o projeto canônico.

## O que já está pronto

- Migration isolada em `site-supabase/supabase/migrations`;
- tabelas privadas, RLS ativo e nenhum grant para `anon` ou `authenticated`;
- RPCs transacionais `create_site_quote_request` e `create_site_contact_request`;
- idempotência por `clientRequestId` + hash do conteúdo;
- rate limit atômico por hash HMAC do IP — o IP bruto não é persistido;
- endpoints Vercel `/api/quote-requests` e `/api/contact-requests`;
- validação de origem, método, tipo, tamanho e conteúdo;
- tabela de auditoria preparada para e-mail/WhatsApp. Nenhum WhatsApp deve ser disparado sem opt-in específico.

## Criação e vinculação — ação manual do proprietário

1. Crie um projeto novo em <https://supabase.com/dashboard/new>. Use um nome inequívoco, por exemplo `site-promo-brindes-prod`, e prefira a mesma região operacional do site.
2. Guarde o novo `project ref` e a senha do banco. Confirme visualmente que o ref **não** é `doufsxqlfjyuvxuezpln`.
3. Gere/obtenha uma **secret key** `sb_secret_...` no painel do projeto novo. Ela vai somente para as variáveis server-side da Vercel; nunca deve ser enviada por chat, commitada ou prefixada com `VITE_`.
4. Faça login e vincule este workdir isolado:

```bash
npx supabase@latest login
SUPABASE_WORKDIR=site-supabase npx supabase@latest link --project-ref NOVO_PROJECT_REF
npm run db:site:guard
```

5. Revise primeiro o dry-run:

```bash
npm run db:site:dry-run
```

6. Somente após conferir o destino exibido e aprovar a saída, aplique:

```bash
SUPABASE_WORKDIR=site-supabase npx supabase@latest db push
```

Nunca use `db reset --linked`: esse comando é destrutivo em banco remoto.

## Variáveis da Vercel

Configure como secrets no ambiente de produção:

```dotenv
SITE_SUPABASE_URL=https://NOVO_PROJECT_REF.supabase.co
SITE_SUPABASE_SECRET_KEY=sb_secret_...
SITE_REQUEST_HASH_SALT=valor_aleatorio_de_32_ou_mais_caracteres
SITE_PUBLIC_ORIGIN=https://www.promobrindes.com.br
```

Depois configure as duas variáveis públicas de rota e faça um novo build:

```dotenv
VITE_QUOTE_REQUEST_ENDPOINT=/api/quote-requests
VITE_CONTACT_REQUEST_ENDPOINT=/api/contact-requests
```

Enquanto essas duas variáveis estiverem vazias, os formulários mantêm o fallback por e-mail; isso evita quebrar o preview antes de o novo projeto existir.

## Validação pós-deploy

1. Envie um contato e um orçamento de teste.
2. Confirme protocolo na interface e linhas em `site_private.contact_requests` / `site_private.quote_requests`.
3. Repita exatamente o mesmo request com a mesma chave e confirme `duplicate: true`, sem itens duplicados.
4. Troque o corpo mantendo a chave e confirme HTTP 409.
5. Confirme que `anon` e `authenticated` não conseguem consultar nem inserir nas tabelas.
6. Confirme que o catálogo público continua consultando exclusivamente `doufsxqlfjyuvxuezpln`.

As secret keys modernas bypassam RLS e, por isso, ficam exclusivamente nas Functions server-side. A política de menor privilégio é reforçada mantendo as tabelas no schema `site_private`, fora dos schemas expostos pela Data API; os únicos RPCs públicos usam `security invoker`, são revogados de `public`/`anon`/`authenticated` e concedidos somente a `service_role`.
