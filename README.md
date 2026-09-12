# Site Promo Brindes

Site público B2B da Promo Brindes para descoberta de produtos e solicitação de orçamento. Não é uma loja virtual: não exibe preço, não cobra e não cria pedidos. O visitante pesquisa o catálogo, reúne produtos em uma seleção persistente e envia um briefing comercial.

Este projeto é independente do sistema interno `Promo_Gifts_V4`. Ele apenas lê o catálogo público do mesmo projeto Supabase canônico (`doufsxqlfjyuvxuezpln`). O contrato público mínimo foi aplicado em 08/09/2026 após autorização explícita, sem duplicar dados nem alterar tabelas do sistema interno.

## Rodar localmente

Requer Node.js 22.13+ e npm 11.17.0 (veja `.nvmrc` e `package.json`).

```bash
npm install
cp .env.example .env.local
npm run dev
```

A URL do catálogo é fixada defensivamente no projeto canônico. A chave publicável deve ser declarada no ambiente local e na hospedagem conforme `.env.example`; nenhuma credencial, mesmo publicável, fica gravada no código-fonte.

## Verificações

```bash
npm run typecheck
npm run test
npm run build
npm run check:performance-budget
npx playwright install chromium
npm run test:e2e
```

## Mapa técnico Graphify

O repositório mantém um mapa estrutural local para apoiar revisão e investigação de dependências. Ele não é publicado com o site e não acessa nenhum banco de dados.

```bash
npm run graph:doctor
npm run graph:build
npm run graph:query -- "como funciona o orçamento?"
```

Veja o procedimento, os limites de interpretação e a recuperação em [docs/GRAPHIFY.md](docs/GRAPHIFY.md).

## Integração de dados

- Origem pública de produtos: `public.v_site_products_public` (contrato mínimo aplicado em 08/09/2026).
- Origem de categorias: `public.categories` (árvore ativa completa no catálogo e raízes na home).
- Acesso: chave pública/anon e políticas RLS já existentes.
- O frontend não solicita preço, estoque, `supplier_id`, URL do fornecedor ou margem. Uma auditoria semântica encontrou, porém, origem comercial inferível em `brand`, `sku` e domínios de imagem; veja o relatório de validação.
- O ID canônico é validado no cliente; uma URL externa incorreta não é aceita silenciosamente.

O site não deve consumir tabelas Bronze/Silver, usar `service_role` no navegador nem importar o client do sistema interno. O superfiltro combina categorias hierárquicas, cores, materiais, personalização e embalagem; não usa estoque, preço ou fornecedor. A camada “Ache pelo briefing” converte momento, público, escala e clima apenas em filtros sustentados pelo contrato público. A busca expande um dicionário curado de sinônimos, sem IA externa nem envio do texto digitado. Consulte [docs/UX_STRATEGY.md](docs/UX_STRATEGY.md), [docs/GEN_Z_RESEARCH.md](docs/GEN_Z_RESEARCH.md), [docs/FREESHOP_BENCHMARK_20260909.md](docs/FREESHOP_BENCHMARK_20260909.md) e [docs/DATABASE_PUBLIC_CONTRACT.md](docs/DATABASE_PUBLIC_CONTRACT.md).

## Entrega de solicitações

A arquitetura aprovada separa responsabilidades:

- catálogo e categorias: Supabase canônico `doufsxqlfjyuvxuezpln`, somente leitura;
- contatos, briefings, itens, consentimentos e auditoria: novo Supabase exclusivo do site;
- gravação: Functions da Vercel com secret key server-side, jamais enviada ao navegador;
- integração entre projetos: ID canônico + snapshot do produto, sem FK e sem duplicar o catálogo.

As rotas `/api/quote-requests` e `/api/contact-requests` validam origem, conteúdo, tamanho e idempotência, aplicam rate limit usando hash HMAC do IP e chamam RPCs transacionais. A API contém uma guarda explícita que bloqueia qualquer tentativa de usar o projeto canônico como destino de gravação.

Links de seleção usam somente referências públicas. A versão persistente e revogável está protegida por `VITE_PERSISTENT_SHARED_SELECTIONS_ENABLED`: ela só deve ser ativada após a migration `20260911170000_add_revocable_shared_selections.sql` estar aplicada e auditada no Supabase isolado. Até isso, o compartilhamento permanece no formato local sem dados de contato ou briefing.

O projeto isolado `xlzmclcjdncjfdrjxclt` está provisionado e as rotas de produção estão ativas. Os formulários persistem contatos e briefings no Supabase exclusivo do site, com protocolo e idempotência; não gravam no banco canônico do Promo Gifts. O runbook e os controles de recuperação estão em [docs/SITE_SUPABASE_SETUP.md](docs/SITE_SUPABASE_SETUP.md).

Comprovantes de orçamento usam uma fila transacional no Supabase isolado. E-mail é solicitado para todo briefing persistido; WhatsApp só entra na fila após o checkbox específico. O worker `/api/notifications` usa `CRON_SECRET`, Resend e/ou Meta WhatsApp Cloud exclusivamente no backend, com no máximo cinco tentativas e backoff. Sem credenciais válidas, os jobs permanecem pendentes e o orçamento continua salvo; não anuncie entrega efetiva antes de configurar domínio/remetente, template aprovado e validar um ciclo real.

## Área do Cliente

A Área do Cliente mantém a solicitação inicial sem cadastro obrigatório e oferece continuidade depois da verificação do e-mail. O cliente pode entrar por link/código ou senha, consultar somente os próprios briefings, acompanhar a linha do tempo, abrir propostas publicadas e reaproveitar produtos e quantidades em uma nova solicitação.

O histórico fica no Supabase exclusivo `xlzmclcjdncjfdrjxclt`. A associação retroativa compara o e-mail normalizado apenas depois de o Supabase confirmar a identidade; todas as leituras usam `auth.uid()` em RPCs protegidos. PDFs ficam em bucket privado e são entregues por URL assinada de 60 segundos através de `/api/customer-proposals`. O catálogo canônico continua somente leitura e não recebe contas ou históricos.

Para desenvolvimento, configure também `VITE_SITE_SUPABASE_URL` e `VITE_SITE_SUPABASE_PUBLISHABLE_KEY` conforme `.env.example`. O runbook de Auth, redirects, migration e ativação está em [docs/CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md](docs/CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md).

## Deploy

O projeto inclui configuração para Vercel:

- fallback de SPA;
- cabeçalhos básicos de segurança;
- cache longo para imagens;
- `/sitemap.xml` gerado dinamicamente com produtos públicos.

Produção atual: <https://promo-brindes-v1.vercel.app>. O domínio próprio ainda exige configuração de DNS, associação na Vercel e redirecionamento canônico. Ao trocar o domínio, atualize `VITE_PUBLIC_URL`, `SITE_PUBLIC_ORIGIN`, `index.html` e `public/robots.txt` no mesmo deploy.

O Vercel Web Analytics registra pageviews anonimizadas e sem cookies. O middleware do site remove query strings e fragmentos das URLs; eventos personalizados seguem uma allowlist sem PII. Pageviews estão disponíveis em todos os planos da Vercel, enquanto eventos personalizados dependem de plano Pro ou Enterprise. Antes da divulgação ampla, confirme o destinatário comercial e a revisão jurídica final do aviso de privacidade.

O CI também bloqueia regressões grosseiras de peso dos assets compilados. Essa proteção não substitui a medição de Core Web Vitals em campo: LCP, INP e CLS precisam ser acompanhados no percentil 75 depois que houver tráfego suficiente.

O estado detalhado da auditoria e das simulações está em [docs/AUDIT_REPORT_20260908.md](docs/AUDIT_REPORT_20260908.md). A implementação do banco isolado e suas evidências estão em [docs/SITE_SUPABASE_IMPLEMENTATION_REPORT_20260908.md](docs/SITE_SUPABASE_IMPLEMENTATION_REPORT_20260908.md).

## Estrutura

```text
api/                 sitemap e recebimento server-side de solicitações
e2e/                 smoke tests Playwright
public/              marca e imagens otimizadas
src/components/      layout, cards, SEO e drawer da seleção
src/context/         estado persistente da seleção
src/lib/             catálogo público e envio do briefing
src/pages/           home, catálogo, produto, orçamento, Área do Cliente e institucionais
docs/                estratégia e critérios de aceite
supabase/migrations/  contrato do catálogo canônico (somente leitura)
site-supabase/        migrations exclusivas do novo banco de leads do site
```
