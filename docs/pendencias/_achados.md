# Achados do levantamento (Fase 0) — base para priorizar a Fase 1

## Criticos que travam o ciclo comercial

1. PF-01/NOVO-DB-01: ajuste nao enfileira alerta comercial; sem webhook na Vercel o alerta e silencioso (NOVO-PC-03). Destrava: D1 + eng.
2. PF-03/04/05: nenhuma proposta publicada jamais; cliente trava apos 3 ajustes sem saida (PF-04 DIVERGENCIA real). Depende de D1.
3. PF-07/08/09: e-mail/WhatsApp bloqueados por credenciais; PF-14/15 corrigidos em UI na #215/#181.

## Engenharia pura (sem decisao de dono) — candidatas a primeira onda

- PF-24 perfil do cliente editavel (PARCIAL; company nunca escrita; sem RPC read/edit) — FRONT+DB, sem decisao.
- PF-29 linha do tempo com proximo passo por status (PARCIAL).
- PF-34 auditoria de leitura de PII (NAO INICIADO) — DB.
- PF-82 pgTAP de Storage/policies (NAO INICIADO) — DB tests.
- PF-87 vigia dos crons (NAO INICIADO) — infra.
- PF-75 verificacao de config de banco no boot (codigo morto em main, NAO INICIADO).
- PF-120 eventos de funil faltantes (analytics) — front.
- PF-123 'Reenviar codigo'/'Usar outro e-mail' (PARCIAL) — front.
- PF-125 preferencias e exclusao de dados na conta (NAO INICIADO) — front+db.
- PF-109 reconciliar matriz de 230 requisitos (NAO INICIADO) — docs.

## Regra de prioridade (economia de tokens)

Fase 1 deve listar primeiro os itens de maior impacto sem bloqueio (onda 1 da auditoria 11/10: PF-10,11,09,27,31,81,82,80,87,75,43,44,49,114,120,123,124,95,106,109,112). Verificar no codigo antes de classificar (auditoria de 11/10 baseada em 3f82233 defasou; auditoria 20/11 em 40f6420).

## Sem regressao

- Baseline 538/538 testes, lint/typecheck OK, build 950.3KiB (CI mede menor).
- Nao ha PR aberta nem branch alheia pendente; trabalho de outros agentes incorporado na main.