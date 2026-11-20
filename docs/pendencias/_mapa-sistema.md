# Mapa do sistema — estado real (Fase 0 do GOAL)

> Levantado em 2026-11-20 contra main 804efbc + contexto 7a799ec. Escrever na Fase 1: docs/pendencias/<ID>-<slug>.md.

## Visão de negócio

Site publico B2B de catalogo e orcamento (sem preco/pedido). Visitante: pesquisa, monta selecao persistente, envia briefing comercial. Ciclo comercial apos envio e manual; nenhuma proposta jamais publicada (PF-03/04/05/23).

## Arquitetura

- Front: React 19 + Vite + TS, supabase-js, React Router. Pasta src/, paginas em src/pages/, hooks em src/context e src/lib.
- Backend: funcoes serverless Vercel em api/*.ts (sem Edge Functions). Pasta shared/ para codigo compartilhado front/api.
- Banco: Supabase isolado do site xlzmclcjdncjfdrjxclt (site_private), migrations em site-supabase/supabase/migrations (69). Catalogo canonico doufsxqlfjyuvxuezpln = somente leitura via views v_site_products_public/v_products_public.
- CI/CD: quality.yml (validate + cross-browser), database.yml (Migrations e pgTAP), graphify.yml, release.yml (ledger -> build -> promocao + smoke + rollback), codeql.yml, automation-local.yml. Deploy Git da Vercel desligado; merge em main = producao via release.
- Vercel: projeto juca1/promo-brindes-v1, envs conforme .env.example.

## Tabelas principais (site_private, conforme regras da Fase 0)

- quote_requests, quote_items, contact_requests, consent_receipts, notification_deliveries, notification_provider_events, quote_adjustment_requests, quote_request_events, status_transitions, proposal_documents, customer_profiles, customer_briefing_assets, customer_selections, customer_occasion_favorites, shared_selections, shared_selection_rate_limits, rate_limit_buckets, erased_customer_identities, admin_audit_log, admin_ddl_log, storage_deletion_queue.

## Fluxos críticos (estado)

| Fluxo | Estado | Responsável |
| --- | --- | --- |
| Coleta do briefing/budget | Pronto (PF-38/39/41 em main; promessas honestas #215) | ENG |
| Alerta ao comercial | PARCIAL: orcamento e contato enfileiram; ajuste nao; sem webhook configurado, silencioso | DONO (D1) + ENG |
| Confirmação por e-mail/WhatsApp | BLOQUEADO (credenciais na Vercel nao verificaveis; PF-14 corrigido em UI) | DONO (D2) |
| Back-office (publicar proposta, status, ajustes) | NÃO INICIADO (PF-03/04/05) | ENG apos D1 |
| Portal do cliente | Lê/cl-aim de pedidos, selecoes, ajustes; sem preferencias (PF-125), sem anexos no detalhe (PF-124) | ENG |
| LGPD | Apagar OK (#161); exportacao/correcao/autoexclusao faltam (PF-30); auditoria de leitura PII (PF-34) NAO INICIADO | ENG + juridico |
| Catalog/Produto/Selecao | Itens da auditoria 11/10 F-xx: varios PARCIAL/NÃO INICIADO (PF-40,45,47,119,120,121) | ENG + mockup |