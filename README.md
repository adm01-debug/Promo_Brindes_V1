# Site Promo Brindes

Site público B2B da Promo Brindes para descoberta de produtos e solicitação de orçamento. Não é uma loja virtual: não exibe preço, não cobra e não cria pedidos. O visitante pesquisa o catálogo, reúne produtos em uma seleção persistente e envia um briefing comercial.

Este projeto é independente do sistema interno `Promo_Gifts_V4`. Ele apenas lê o catálogo público do mesmo projeto Supabase canônico (`doufsxqlfjyuvxuezpln`). O contrato público mínimo foi aplicado em 08/09/2026 após autorização explícita, sem duplicar dados nem alterar tabelas do sistema interno.

## Rodar localmente

Requer Node.js 20.19+ ou 22.12+.

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
npx playwright install chromium
npm run test:e2e
```

## Integração de dados

- Origem pública de produtos: `public.v_site_products_public` (contrato mínimo aplicado em 08/09/2026).
- Origem de categorias: `public.categories` (árvore ativa completa no catálogo e raízes na home).
- Acesso: chave pública/anon e políticas RLS já existentes.
- O frontend não solicita preço, estoque, `supplier_id`, URL do fornecedor ou margem. Uma auditoria semântica encontrou, porém, origem comercial inferível em `brand`, `sku` e domínios de imagem; veja o relatório de validação.
- O ID canônico é validado no cliente; uma URL externa incorreta não é aceita silenciosamente.

O site não deve consumir tabelas Bronze/Silver, usar `service_role` no navegador nem importar o client do sistema interno. O superfiltro combina categorias hierárquicas, cores, materiais, personalização e embalagem; não usa estoque, preço ou fornecedor. Consulte [docs/UX_STRATEGY.md](docs/UX_STRATEGY.md), [docs/GEN_Z_RESEARCH.md](docs/GEN_Z_RESEARCH.md) e [docs/DATABASE_PUBLIC_CONTRACT.md](docs/DATABASE_PUBLIC_CONTRACT.md).

## Entrega de solicitações

A arquitetura aprovada separa responsabilidades:

- catálogo e categorias: Supabase canônico `doufsxqlfjyuvxuezpln`, somente leitura;
- contatos, briefings, itens, consentimentos e auditoria: novo Supabase exclusivo do site;
- gravação: Functions da Vercel com secret key server-side, jamais enviada ao navegador;
- integração entre projetos: ID canônico + snapshot do produto, sem FK e sem duplicar o catálogo.

As rotas `/api/quote-requests` e `/api/contact-requests` validam origem, conteúdo, tamanho e idempotência, aplicam rate limit usando hash HMAC do IP e chamam RPCs transacionais. A API contém uma guarda explícita que bloqueia qualquer tentativa de usar o projeto canônico como destino de gravação.

Até o projeto novo ser criado e configurado, mantenha `VITE_QUOTE_REQUEST_ENDPOINT` e `VITE_CONTACT_REQUEST_ENDPOINT` vazias; os formulários continuam usando o fallback por e-mail. O procedimento completo está em [docs/SITE_SUPABASE_SETUP.md](docs/SITE_SUPABASE_SETUP.md).

## Deploy

O projeto inclui configuração para Vercel:

- fallback de SPA;
- cabeçalhos básicos de segurança;
- cache longo para imagens;
- `/sitemap.xml` gerado dinamicamente com produtos públicos.

Antes de publicar em `www.promobrindes.com.br`, confirme DNS/domínio, destinatário comercial, texto jurídico de privacidade, analytics consentido e o endpoint definitivo de orçamento.

O estado detalhado da auditoria e das simulações está em [docs/AUDIT_REPORT_20260908.md](docs/AUDIT_REPORT_20260908.md). A implementação do banco isolado e suas evidências estão em [docs/SITE_SUPABASE_IMPLEMENTATION_REPORT_20260908.md](docs/SITE_SUPABASE_IMPLEMENTATION_REPORT_20260908.md).

## Estrutura

```text
api/                 sitemap e recebimento server-side de solicitações
e2e/                 smoke tests Playwright
public/              marca e imagens otimizadas
src/components/      layout, cards, SEO e drawer da seleção
src/context/         estado persistente da seleção
src/lib/             catálogo público e envio do briefing
src/pages/           home, catálogo, produto, orçamento e institucionais
docs/                estratégia e critérios de aceite
supabase/migrations/  contrato do catálogo canônico (somente leitura)
site-supabase/        migrations exclusivas do novo banco de leads do site
```
