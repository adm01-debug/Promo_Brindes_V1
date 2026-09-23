# Runbook — pedido de apagamento do titular (LGPD art. 18, Etapa 32)

Escopo: projeto isolado `xlzmclcjdncjfdrjxclt`. Não há painel administrativo neste
projeto — até que exista um, todo pedido de apagamento (chegado por e-mail, WhatsApp ou
qualquer outro canal) é atendido manualmente, seguindo este runbook.

## Pré-condições

- [ ] Identidade do solicitante confirmada como titular dos dados (mesmo e-mail/telefone
      usado na submissão do orçamento/contato) — nunca execute com base só no que o
      solicitante alega, sem confirmar contra o canal original de contato.
- [ ] Acesso ao Studio do projeto `xlzmclcjdncjfdrjxclt` (SQL Editor roda autenticado
      como `service_role` por padrão) ou a uma conexão direta com esse papel.
- [ ] Prazo de resposta combinado com jurídico/atendimento — a LGPD não fixa um prazo
      único para todo pedido de eliminação; trate como urgente e registre a data do
      pedido junto à evidência abaixo para o time de atendimento controlar o prazo.

## 1. Executar o apagamento

```sql
select public.erase_customer_data('email-do-titular@exemplo.com');
```

A função, endurecida pela migration
`20260923120000_audit_security_reliability_hardening.sql`:

- É idempotente — rodar duas vezes com o mesmo e-mail não duplica efeito nem falha.
- Normaliza o e-mail internamente (`site_private.normalize_email`) — não precisa
  garantir maiúsculas/minúsculas ou espaços antes de chamar.
- Anonimiza `quote_requests` e `contact_requests`, inclusive notas e texto livre.
- Remove a conta de `auth.users`; sessões, perfil, seleções, anexos e pedidos de ajuste
  ligados à conta desaparecem pelas FKs. O protocolo não identificável do pedido é
  preservado como evidência operacional.
- Registra somente o SHA-256 do e-mail em `erased_customer_identities`, impedindo que
  uma nova conta com o mesmo e-mail reivindique novamente o histórico apagado.
- Apaga (`delete`) as linhas de `proposal_documents` associadas.
- Enfileira atomicamente os PDFs de proposta e anexos de briefing para remoção pela
  Storage API no cron diário; também devolve `storagePathsToRemove` como evidência.

## 2. Confirmar a remoção assíncrona do Storage

O cron `/api/retention` remove os objetos enfileirados nos buckets
`customer-proposals` e `customer-briefing-assets` e só depois finaliza a fila. Acompanhe
a execução seguinte; a operação é idempotente e trata objeto já ausente como sucesso.

```sql
select bucket, object_path, queued_at
from site_private.storage_deletion_queue
order by queued_at;
-- Esperado após um cron bem-sucedido: nenhum caminho devolvido no passo 1.
```

Se a fila permanecer, não apague seu metadado manualmente. Verifique primeiro a
credencial de Storage e os logs do cron; remover a fila sem confirmação do bucket pode
deixar um blob órfão com dado pessoal.

## 3. Verificação

```sql
-- Não deve existir conta Auth/perfil com o e-mail original.
select count(*) from auth.users
where lower(email) = site_private.normalize_email('email-do-titular@exemplo.com');
-- Esperado: 0.

select count(*) from site_private.proposal_documents pd
join site_private.quote_requests qr on qr.id = pd.quote_request_id
where qr.email = site_private.normalize_email('email-do-titular@exemplo.com');
-- Esperado: 0.
```

## 4. Comunicação e evidência

A tombstone registra o atendimento sem conservar o e-mail em claro, mas não substitui
o ticket jurídico/operacional. Guarde, fora do banco, como evidência de atendimento:

- Data e canal do pedido original.
- E-mail do titular (o dado, não o pedido em si, para permitir auditoria futura).
- Saída completa do passo 1 (contagens afetadas).
- Confirmação de que a fila de Storage (passo 2) foi drenada.
- Resposta enviada ao titular confirmando o atendimento.

## Ensaiado em

Banco local, 23/09/2026 — `customer_data_erasure.test.sql` cobre 28 contratos:
idempotência, texto livre, Auth/perfil, tombstone, dois buckets e bloqueio de nova
reivindicação. O conjunto completo soma 513 contratos pgTAP.
