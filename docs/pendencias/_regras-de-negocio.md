# Regras de negocio vigentes (levantamento da Fase 0)

> Fonte: docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md (gerado da main 804efbc, 19:09 UTC) + migrations + auditoria 20/11. Regra humana em manual/ nao existe ainda.

## Pedidos (quote_requests)

- Tipos: orcamento (quote, status new|triaged|in_progress|quoted|closed|spam) e contato (contact). Ajustes: quote_adjustment_requests, limite too_many_pending_adjustments.
- Consentimento obrigatorio (LGPD) por request_kind quote/contact; recibo com notice_version.
- Protocolo PB[0-9]{9} com digito mod 11; e-mail normalizado.
- retention_until = now + 24 meses por padrao.

## Notificacoes (outbox comercial/customer)

- notification_deliveries: unica por (request_kind, request_id, channel, audience); audience = customer | commercial_team; lease com token e expiracao; retry com jitter; status pending->processing->sent|failed|cancelled|exhausted; delivery_state delivered|bounced.
- Aviso ao comercial (PF-01): enfileira para orcamento e contato; cron /api/commercial-alerts entrega por webhook; pedido de ajuste ainda nao enfileira (NOVO-DB-01).
- Sem COMMERCIAL_TEAM_WEBHOOK_URL configurada na Vercel o alerta e silencioso (nao ha medicao - NOVO-PC-03).

## LGPD / titular

- Apagamento via erase_customer_data (service_role, runbook manual); cancela alertas de quote mas nao de contact (NOVO-DB-02).
- Direitos PF-30 (exportacao, correcao, autoexclusao, canal) NAO INICIADO.

## Selecao e carrinho

- save_my_selection: limite 30 selecoes por conta; conflito de versao -> recarregar; compartilhamento com token revogavel; kit exige composicao valida (quantity = kitQuantity x unitsPerKit).
- Rate limit por preflight e por 5 janelas distintas.

## Area do cliente

- Claim de pedidos exige e-mail verificado; identidade apagada (erased) nao reivindica.
- Proposta publicada (proposal_documents) so via RPC; sem UI de back-office (PF-03).

## Fraudes/limites

- 3 ajustes pendentes novos/triados -> impede novo ajuste naquele pedido para aquele solicitante (nao bloqueia o cliente inteiro) (PF-04 DIVERGENCIA: regra existe, sem saida clara na UI).
- Anexos: 10 arquivos / 50 MB por conta; PDF recusado; reencode e remocao de EXIF.

