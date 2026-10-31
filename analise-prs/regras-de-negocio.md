# Regras de negócio — Promo Brindes V1

Data: 2026-10-31  
Fonte primária: AUDITORIA.md (24/09/2026, SHA da9f55c4) + docs/AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md (11/10/2026)  
Validação: código em main SHA b1931198 (31/10/2026)

---

## 1. Modelo de negócio

- Sistema de catálogo B2B público para seleção de brindes e solicitação de orçamento
- **Sem checkout**: não há pagamento online; fluxo termina em solicitação de orçamento
- Clientes B2B (empresas compradoras de brindes corporativos)
- Time comercial da Promo Brindes recebe leads e elabora propostas manualmente
- Produtos do catálogo gerenciados no sistema interno **Promo Gifts** (banco canônico separado, somente leitura para este site)

## 2. Fluxos principais

### 2.1 Descoberta e catálogo
- Catálogo público sem autenticação
- Produtos filtráveis por categoria, ocasião, verba e marca
- View pública `v_site_products_public` no banco canônico (somente leitura)
- Preços **não exibidos** no catálogo: cliente solicita orçamento

### 2.2 Seleção e briefing
- Cliente monta seleção de produtos (carrinho local em localStorage)
- Briefing captura: campanha, ocasião, verba, quantidade, prazo, dados do solicitante
- Intenção declarada é usada como filtro de produtos
- Seleções podem ser compartilhadas via link (com expiração e revogação)

### 2.3 Solicitação de orçamento
- Formulário de briefing + seleção enviados via `POST /api/quote-requests`
- Criação atômica via RPC `create_site_quote_request` (banco isolado)
- Rate limit: máximo de orçamentos por IP/usuário num período
- Validação de catálogo: produtos da seleção verificados contra catálogo canônico no momento do envio
- Consentimento LGPD capturado (`consent_lgpd`, `opt_in_whatsapp_copy`)
- Notificação ao cliente: **BLOQUEADO** (Resend/WhatsApp sem credenciais em produção)
- Notificação ao time comercial: **NÃO IMPLEMENTADO**

### 2.4 Portal do cliente (pós-autenticação)
- Autenticação via Supabase Auth (e-mail + magic link)
- Histórico de orçamentos solicitados
- Acompanhamento de status (`new → triaged → quoted → accepted/rejected`)
- Visualização de propostas (PDF em Storage)
- Solicitação de ajustes (máximo 3 pendentes simultâneos — regra de negócio hardcoded)
- **Status nunca atualizado por ferramenta**: apenas por SQL manual

### 2.5 Favoritos por ocasião
- Autenticado: favoritos por ocasião salvos no banco via RPC `set_my_occasion_favorites`
- Não autenticado: favoritos em localStorage (sem sincronização)
- Isolamento por titular (tenant): cada cliente vê apenas seus favoritos
- **A-003 (REINTRODUZIDO)**: possível mistura entre titulares investigada mas não confirmada

---

## 3. Regras de autorização e tenant

| Recurso | Autenticado | Não autenticado |
|---------|------------|-----------------|
| Catálogo | Leitura | Leitura |
| Solicitar orçamento | Sim (vinculado a perfil) | Não (somente como visitante) |
| Ver histórico | Sim (apenas os seus) | Não |
| Favoritos | Banco (isolado por titular) | localStorage |
| Propostas | Apenas as suas (signed URL) | Não |
| Shared selections | Criar + revogar as suas | Acessar com token |

**RLS ativo**: todas as tabelas em `site_private` têm Row Level Security. Políticas isolam por `auth.uid()`.

---

## 4. Limites e restrições operacionais

| Limite | Valor | Fonte |
|--------|-------|-------|
| Ajustes pendentes por orçamento | 3 simultâneos | `20260923120000:202-205` |
| Rate limit de orçamentos | Configurável (tabela) | `rate_limits` migration |
| Retenção de dados de contato | 24 meses | `20260908230000:66` |
| Notificação delivery: tentativas máximas | Configurável | `notification_deliveries` |
| Seleções compartilhadas: expiração | Configurável | `shared_selections` |

---

## 5. Integrações externas

| Serviço | Função | Estado em produção |
|---------|--------|-------------------|
| Supabase (isolado: xlzmclcjdncjfdrjxclt) | Auth, banco, Storage do site | Ativo |
| Supabase (canônico: doufsxqlfjyuvxuezpln) | Catálogo somente leitura | Ativo |
| Vercel | Hosting, Edge Functions (API Routes) | Ativo |
| Resend | E-mail transacional | **SEM CREDENCIAIS** |
| Meta WhatsApp Cloud API | WhatsApp transacional | **SEM CREDENCIAIS** |
| Vercel Analytics | Métricas de uso | **INDISPONÍVEL** (erro 403 na API) |
| Promo Gifts (sistema interno) | Gestão do catálogo canônico | Ativo (somente leitura) |

---

## 6. Achados com impacto em regras de negócio

### A-001/F-02 — VERCEL_TOKEN inválido (CONFIRMADO E PENDENTE)
- Release workflow falha no job de deploy por token expirado
- Impacto: PRs com migrations ficam em espera de deploy manual

### A-003 — Regressão em favoritos por ocasião (REINTRODUZIDO POR REGRESSÃO)
- `useOccasionFavorites.ts` possivelmente mistura favoritos entre titulares
- Impacto: cliente A pode ver favoritos do cliente B

### PF-01 — Outbox comercial ausente (CONFIRMADO E PENDENTE)
- Regra de negócio: orçamento deve notificar time comercial
- Impacto: leads chegam ao banco sem ninguém ser avisado

### PF-04 — Bloqueio permanente após 3 ajustes (BUG LATENTE)
- Regra: máximo 3 ajustes pendentes simultâneos
- Bug: status de ajuste nunca muda de `new/triaged` para `resolved/closed`
- Impacto: na 4ª tentativa o cliente recebe `too_many_pending_adjustments` para sempre

---

## 7. Decisões de produto registradas

| Decisão | Registrada em | Status |
|---------|--------------|--------|
| Adiamento de e-mail/WhatsApp até decisão de credenciais | EXECUCAO_PLANO_FECHAMENTO_20261001.md:65-66 | VIGENTE |
| Destino do lead comercial indefinido (Bitrix24 via N8N recomendado) | AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md §1 | PENDENTE (DONO) |
| Domínio oficial não definido | AUDITORIA_FUNCIONALIDADES_PENDENTES_20261011.md PF-59 | PENDENTE (DONO) |
| Restore/backup: meta e custo não definidos | PF-86 | PENDENTE (DONO) |
