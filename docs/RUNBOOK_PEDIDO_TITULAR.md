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

A função (`site-supabase/supabase/migrations/20260916200000_add_customer_data_erasure.sql`):

- É idempotente — rodar duas vezes com o mesmo e-mail não duplica efeito nem falha.
- Normaliza o e-mail internamente (`site_private.normalize_email`) — não precisa
  garantir maiúsculas/minúsculas ou espaços antes de chamar.
- Anonimiza `quote_requests`, `contact_requests` e `customer_profiles` associados ao
  e-mail (substitui nome/telefone/empresa por um marcador de titular apagado,
  preservando a linha para integridade referencial de pedidos já em andamento).
- Apaga (`delete`) as linhas de `proposal_documents` associadas.
- Devolve `storagePathsToRemove`: os *caminhos* dos PDFs de proposta que existiam no
  banco antes do apagamento.

## 2. Remover os arquivos do Storage

O apagamento no banco **não remove os objetos no bucket** `customer-proposals` — isso é
um passo manual separado, usando a lista `storagePathsToRemove` do retorno do passo 1:

```sql
-- Studio > Storage > customer-proposals, ou via API do Storage com cada caminho da lista.
```

Confirme cada caminho antes de remover — a lista veio de uma consulta ao estado
*anterior* ao apagamento, então precisa ser usada imediatamente após o passo 1, não
guardada para depois.

## 3. Verificação

```sql
-- Confirma que não sobrou nome/telefone/empresa em claro para o e-mail apagado:
select contact_name, company, email, phone
from site_private.quote_requests
where email = site_private.normalize_email('email-do-titular@exemplo.com');
-- Esperado: contact_name/company/phone substituídos pelo marcador de titular apagado.

select count(*) from site_private.proposal_documents pd
join site_private.quote_requests qr on qr.id = pd.quote_request_id
where qr.email = site_private.normalize_email('email-do-titular@exemplo.com');
-- Esperado: 0.
```

## 4. Comunicação e evidência

A função **não registra em nenhum lugar** que o pedido foi atendido além do que você
salvar manualmente — não existe um evento `erased` em `quote_request_events` (avaliado e
não implementado nesta rodada; ver nota no checklist da Etapa 32 no plano de correções).
Guarde, fora do banco (ex.: sistema de tickets do time), como evidência de atendimento:

- Data e canal do pedido original.
- E-mail do titular (o dado, não o pedido em si, para permitir auditoria futura).
- Saída completa do passo 1 (contagens afetadas).
- Confirmação de que os arquivos do Storage (passo 2) foram removidos.
- Resposta enviada ao titular confirmando o atendimento.

## Ensaiado em

Banco local, 16/09/2026 — `site-supabase/supabase/tests/database/customer_data_erasure.test.sql`
(15 testes, incluindo idempotência para `quote_requests`/`contact_requests`; ver nota de
auditoria no plano de correções sobre a cobertura de `customer_profiles`).
