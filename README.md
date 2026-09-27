# Site Promo Brindes

[![Quality gate](https://github.com/adm01-debug/Promo_Brindes_V1/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/adm01-debug/Promo_Brindes_V1/actions/workflows/quality.yml)
[![Database](https://github.com/adm01-debug/Promo_Brindes_V1/actions/workflows/database.yml/badge.svg?branch=main)](https://github.com/adm01-debug/Promo_Brindes_V1/actions/workflows/database.yml)
[![Release](https://github.com/adm01-debug/Promo_Brindes_V1/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/adm01-debug/Promo_Brindes_V1/actions/workflows/release.yml)
[![Graphify](https://github.com/adm01-debug/Promo_Brindes_V1/actions/workflows/graphify.yml/badge.svg?branch=main)](https://github.com/adm01-debug/Promo_Brindes_V1/actions/workflows/graphify.yml)
[![CodeQL](https://github.com/adm01-debug/Promo_Brindes_V1/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/adm01-debug/Promo_Brindes_V1/actions/workflows/codeql.yml)

Site público B2B da Promo Brindes para descoberta de produtos e solicitação de orçamento. Não é uma loja virtual: não exibe preço, não cobra e não cria pedidos. O visitante pesquisa o catálogo, reúne produtos em uma seleção persistente e envia um briefing comercial.

Este projeto é independente do sistema interno `Promo_Gifts_V4`. Ele apenas lê o catálogo público do mesmo projeto Supabase canônico (`doufsxqlfjyuvxuezpln`). O contrato público mínimo foi aplicado em 08/09/2026 após autorização explícita, sem duplicar dados nem alterar tabelas do sistema interno.

## Rodar localmente

Requer Node.js 24.15.0 e npm 11.17.0 (veja `.nvmrc` e `package.json`).

```bash
npm install
cp .env.example .env.local
npm run dev
```

A URL do catálogo é fixada defensivamente no projeto canônico. A chave publicável deve ser declarada no ambiente local e na hospedagem conforme `.env.example`; nenhuma credencial, mesmo publicável, fica gravada no código-fonte.

## Verificações
