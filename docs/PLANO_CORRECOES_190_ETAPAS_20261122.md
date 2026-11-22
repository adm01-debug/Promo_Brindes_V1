# Plano de correções e melhorias em 190 etapas — Promo Brindes V1

Data: 22/11/2026. Base: `main` em `18eebb5704943b58c162630bb9a18a6c0e805948`. Autor: auditoria front-end sênior conduzida nesta sessão.
Estado: **planejado. Nenhuma etapa deste documento foi executada.** Criar e commitar este plano não executa nada.

## O que esta auditoria realmente fez

Dez dimensões foram auditadas por agentes independentes que leram o código-fonte (não a documentação): acessibilidade, performance web, SEO e renderização no servidor, bugs de front-end, segurança das funções serverless, cobertura de testes e contratos, UX e responsividade, arquitetura e manutenibilidade, CI/CD e build, conteúdo e LGPD na interface. Cada achado exigiu arquivo, linha e trecho literal do código como prova; depois, um segundo agente tentou refutar cada achado lendo o mesmo código. O que não se sustentou foi descartado e não entrou neste plano.

Números da auditoria: 739 arquivos no repositório, 298 de código, 58.944 linhas, 34 rotas, 15 funções serverless, 26 tabelas no banco isolado, 154 arquivos de teste. A suíte `npx vitest run tests/api` passou: 21 arquivos, 232 testes, 0 falhas em 4,07 s. Esse é o ponto de partida, não um atestado de cobertura.

**Correção de premissa do pedido.** O pedido fala em "Edge Functions". Este projeto não tem nenhuma: o backend são 15 funções serverless da Vercel em `api/*.ts`, e `docs/contexto/codigo/INDEX.md` registra `edge_functions: 0`. O Supabase isolado expõe RPCs em SQL, não Edge Functions. Onde o pedido diz "Edge Functions", este plano trata as 15 funções serverless e as RPCs que elas chamam. Nenhum endpoint fica sem validação por causa dessa troca de nome.

**Webhooks existentes.** Entrada: `api/notification-events-resend.ts` e `api/notification-events-whatsapp.ts` (assinatura verificada em `api/_lib/webhookSignature.ts`). Saída: envelope comercial em `api/_lib/commercialTeamAlerts.ts` e alertas operacionais em `api/_lib/operationalAlerts.ts`. Os quatro entram no versionamento previsto nos blocos 1 e 2.

## Limites que este plano respeita

- Supabase canônico `doufsxqlfjyuvxuezpln` (catálogo) permanece somente leitura. Nenhuma etapa escreve nele nem altera `Promo_Gifts_V4`.
- Migrations só no projeto isolado `xlzmclcjdncjfdrjxclt`, aditivas, pelo fluxo de `release.yml`. Nenhuma etapa deste plano exige DDL destrutivo.
- Resend, WhatsApp, webhooks de provedor e `SITE_SUPABASE_SERVICE_JWT` continuam dependências externas. Etapas que os tocam valem para código e teste; ativar provedor é decisão de negócio.
- Mudança visual exige mockup aprovado antes do código (`docs/agentes/aprovacao-visual-design.md`). As etapas marcadas com **[mockup]** não começam pelo código.
- `allowed_actions: all` e `sha_pinning_required: true` nas permissões de Actions não são alterados por nenhuma etapa.
- Segredo nenhum entra em código, commit ou documento.

## Como ler cada etapa

`E-NNN · [prioridade] · área — título`, seguido de onde mexer (arquivo:linha), a ação, como verificar e o tamanho estimado do diff.

P1 = bug, falha de segurança ou perda de dado que afeta usuário hoje. P2 = degrada experiência, SEO, operação ou manutenção. P3 = melhoria de qualidade. S/M/L são tamanhos relativos de diff, não prazo.

Uma etapa = uma branch = uma PR, na ordem do bloco. Dependências apontam para etapas anteriores. Antes de cada PR: `npm run lint`, `npm run typecheck` e os testes dos arquivos tocados. Só erro introduzido pela etapa conta.

## Índice dos blocos

| Bloco | Etapas | Tema |
|---|---|---|
| 1 | E-001 a E-045 | Contratos de API: schemas Zod, erro 422 único, testes de contrato, versionamento v1/v2 |
| 2 | E-046 a E-063 | Segurança e robustez das funções serverless |
| 3 | E-064 a E-089 | Bugs de front-end, estado e efeitos |
| 4 | E-090 a E-109 | Acessibilidade (WCAG 2.2 AA) |
| 5 | E-110 a E-127 | Performance web (LCP, CLS, INP, bytes) |
| 6 | E-128 a E-143 | SEO e renderização no servidor |
| 7 | E-144 a E-161 | UX, responsividade e consistência |
| 8 | E-162 a E-176 | Arquitetura e manutenibilidade |
| 9 | E-177 a E-190 | CI/CD, build, conteúdo e LGPD na interface |

---

# Bloco 1 — Contratos de API: schemas, erro único, testes e versionamento (E-001 a E-045)

Este bloco responde ao pedido explícito: schema para todos os endpoints e webhooks, formato único de erro de validação, casos de contrato para campo ausente, tipo incorreto e valor vazio, e versionamento v1/v2 com compatibilidade retroativa.

## Diagnóstico que justifica o bloco

Hoje a validação é manual e espalhada. `api/_lib/contracts.ts` tem 416 linhas de validadores escritos à mão (`object()`, `text()`, `boolean()`, `email()`, `phone()`, `isoInstant()`), e cada endpoint fora do fluxo de lead repete sua própria checagem. Consequências medidas no código:

- **Um erro por resposta e sem identificação de campo.** `RequestValidationError` (`api/_lib/contracts.ts:72-76`) carrega `message`, `status` e `code`, mas não o campo. O cliente recebe `{ error, message }` e precisa ler a frase em português para saber onde está o problema. `src/lib/http.ts:96` só repassa `body.error` como código.
- **400 e 422 misturados para a mesma classe de erro.** Campo de formato inválido responde 400 em `contracts.ts:85-94` e 422 em `contracts.ts:282` e `:383`.
- **Três formatos de erro conviventes**, mais texto puro: `{ error, message }` em `leadHandler.ts:158`, `{ error }` em `api/notifications.ts:656`, `{ revoked: false }` sem envelope em `api/shared-selections.ts:70`, e `Method Not Allowed` em texto nos quatro handlers de HTML.
- **30 linhas de regra nunca executadas por teste** em `contracts.ts` (linhas 80, 91, 111, 119, 123, 169, 172, 178-183, 205-208, 215, 234, 237, 258, 266, 274, 282, 285, 290, 297, 314, 368, 392): consentimento recusado, tipos incorretos, limites de tamanho, ocasião, kit e briefing.
- **Um handler sem teste nenhum**: `api/commercial-alerts.ts:52-128`, 3,07% de cobertura.
- **405 sem teste em 7 dos 15 endpoints** e sem header `Allow` nos webhooks.
- **Zod não é dependência direta.** `package.json` não o lista; aparece apenas transitivamente em `package-lock.json`. Adotá-lo é adicionar uma dependência, e isso vai declarado na PR.

### E-001 · [P2] · contratos — Adicionar Zod como dependência direta e fixar a política de uso
Onde: `package.json` (dependencies).
Ação: adicionar `zod` na versão major já presente no lockfile, sem bump de outras dependências. Registrar na PR por que entra: substituir 416 linhas de validadores manuais por schemas declarativos reaproveitáveis em teste. Nenhum código passa a usá-lo nesta etapa.
Verificação: `npm run typecheck` e `npm run build` passam; `npm ls zod` mostra a versão direta.
Diff: ~4 linhas · 2 arquivos (package.json, package-lock.json). Depende de: —.

### E-002 · [P2] · contratos — Criar o envelope único de erro de API
Onde: novo `api/_lib/apiError.ts`.
Ação: classe `ApiError { status, code, message, fields?: Array<{ field: string; code: string; message: string }> }` e função `sendApiError(response, error)` que escreve `{ error: code, message, fields }` com `Cache-Control: no-store`. Para os handlers no estilo Web API (webhooks), exportar `jsonApiError(status, code, message, fields?)` que devolve `Response`. Nenhum handler é alterado nesta etapa.
Verificação: teste novo `tests/api/contracts/api-error.test.ts` cobrindo com e sem `fields`, e a presença do header.
Diff: ~70 linhas · 2 arquivos. Depende de: —.

### E-003 · [P1] · contratos — Dar campo e código ao erro de validação do fluxo de lead
Onde: `api/_lib/contracts.ts:72-76` e `api/_lib/leadHandler.ts:156-169`.
Ação: acrescentar `field?: string` e `fieldCode?: string` a `RequestValidationError` e passar o nome do campo em cada chamada de `object()`, `text()`, `boolean()`, `email()`, `phone()`, `isoInstant()`. No handler, serializar via `sendApiError` com `fields: [{ field, code, message }]`. Mensagem em português permanece idêntica para não quebrar a UI.
Verificação: `tests/api/lead-requests.test.ts` passa sem alteração de expectativa; um teste novo exige `fields[0].field === 'e-mail'` para e-mail inválido.
Diff: ~90 linhas · 2 arquivos. Depende de: E-002.

### E-004 · [P1] · contratos — Separar 400 (forma) de 422 (regra de campo)
Onde: `api/_lib/contracts.ts:85-94, 282, 383`.
Ação: 400 apenas para corpo ausente, JSON inválido, tipo raiz errado e `content-type` incompatível. 422 com `code: 'validation_failed'` para todo erro de campo. Atualizar as expectativas de status nos testes que hoje cobram 400 para campo inválido, uma a uma, com o motivo no diff.
Verificação: a matriz de E-014 exige 422 para campo inválido e 400 para JSON inválido em todos os endpoints POST.
Diff: ~60 linhas · 3 arquivos. Depende de: E-003.

### E-005 · [P2] · contratos — Acumular todos os erros de campo em uma resposta
Onde: `api/_lib/contracts.ts` (normalizadores) e `api/_lib/apiError.ts`.
Ação: trocar o lançamento imediato por um acumulador `issues[]` nos normalizadores de objeto, emitindo `ValidationFailedError(issues)` ao fim da validação de cada bloco (contato, itens, consentimento, briefing). Um payload com três campos errados devolve três entradas em `fields`.
Verificação: teste com nome vazio, e-mail inválido e quantidade zero espera `fields.length === 3` e 422.
Diff: ~120 linhas · 3 arquivos. Depende de: E-004.

### E-006 · [P2] · contratos — Schema Zod do payload de orçamento
Onde: novo `api/_lib/schemas/lead.ts`; consumido por `api/_lib/contracts.ts`.
Ação: declarar `quotePayloadSchema` espelhando exatamente as regras atuais de `NormalizedQuotePayload` (contato, itens com `quantity`/`minQuantity`, `decisionGroup`, kit, campanha, briefing, `notificationPreferences`, consentimento com versão fixa). `normalizeLeadPayload` passa a delegar o parse e traduzir `ZodError` em `issues[]`. As mensagens em português continuam vindo de um mapa de códigos, não do Zod.
Verificação: `tests/api/lead-requests.test.ts` inteiro passa sem mudança de mensagem; teste de paridade compara o resultado do schema com o do normalizador antigo para 10 payloads fixos.
Diff: ~260 linhas · 3 arquivos. Depende de: E-005.

### E-007 · [P2] · contratos — Schema Zod do payload de contato
Onde: `api/_lib/schemas/lead.ts` (`contactPayloadSchema`).
Ação: mesmo tratamento para `NormalizedContactPayload`, incluindo `responseChannel` opcional e o consentimento obrigatório.
Verificação: casos de contato em `tests/api/lead-requests.test.ts` passam; novo caso exige 422 com `fields[0].field === 'mensagem'` para mensagem vazia.
Diff: ~90 linhas · 2 arquivos. Depende de: E-006.

### E-008 · [P2] · contratos — Schema Zod das referências de seleção compartilhada
Onde: novo `api/_lib/schemas/sharedSelection.ts`; consumido por `api/_lib/sharedSelections.ts:49-58`.
Ação: `z.object({ id: uuid, q: int().min(1).max(999_999), v: regex do padrão de variante opcional, c: string max 100 opcional, d: literal('alternative') opcional, k: uuid opcional, kn: string max 100 opcional })` sem coerção. Hoje `q: true` vira 1 e `q: '5'` vira 5 (`sharedSelections.ts:49-58`).
Verificação: teste com `q: true`, `q: '5'`, `q: 0`, `q: 1e6` e `id: 'abc'` espera 422 em todos.
Diff: ~80 linhas · 3 arquivos. Depende de: E-002.

### E-009 · [P2] · contratos — Schema Zod do pedido de ativo de briefing
Onde: novo `api/_lib/schemas/briefingAsset.ts`; consumido por `api/briefing-assets.ts:31-42`.
Ação: schema do corpo (`assetId` como caminho seguro, `contentType` na lista permitida, `size` com teto) e mapeamento para 415, 413 e 422 conforme a falha, no formato de `api/customer-proposals.ts:21-34`.
Verificação: `tests/api/briefing-assets.test.ts` ganha casos para `assetId: '../objeto'` (422), `content-type` errado (415) e corpo grande (413) com `toBe` no status.
Diff: ~110 linhas · 3 arquivos. Depende de: E-002.

### E-010 · [P2] · contratos — Schema Zod do pedido de proposta do cliente
Onde: novo `api/_lib/schemas/customerProposal.ts`; consumido por `api/customer-proposals.ts`.
Ação: schema de `quoteId` (uuid), ação e campos opcionais; erros passam pelo envelope único em vez do mapeamento ad hoc atual.
Verificação: `tests/api/customer-proposals.test.ts` troca a asserção `status >= 400` por status e código exatos.
Diff: ~90 linhas · 3 arquivos. Depende de: E-002.

### E-011 · [P1] · contratos — Schema Zod do webhook do Resend
Onde: novo `api/_lib/schemas/resendEvent.ts`; consumido por `api/notification-events-resend.ts:36-50`.
Ação: `z.object({ type: z.string(), created_at: z.string().datetime().optional(), data: z.object({ email_id: z.string().optional(), bounce: z.object({ type: z.string().optional() }).optional() }).optional() })`. O `parsePayload` manual sai. Tipo desconhecido continua respondendo 200 com `applied: false` (o provedor não deve reentregar).
Verificação: casos de tipo incorreto em cada campo esperam 400 `invalid_payload`; tipo desconhecido espera 200.
Diff: ~90 linhas · 3 arquivos. Depende de: E-002.

### E-012 · [P1] · contratos — Schema Zod do webhook do WhatsApp
Onde: novo `api/_lib/schemas/whatsappEvent.ts`; consumido por `api/notification-events-whatsapp.ts:51, 95, 115`.
Ação: validar cada status da lista: `id` string obrigatória, `status` e `timestamp` strings opcionais, `errors` como array de objetos com `title`/`code` opcionais. Hoje um `errors[0].title` não-string gera `TypeError`, 500 e reentrega infinita da Meta.
Verificação: teste com `errors: [{ title: 42 }]` espera 400 `invalid_payload` e nenhuma RPC chamada; teste com lista mista espera que o status válido seja aplicado.
Diff: ~110 linhas · 3 arquivos. Depende de: E-011.

### E-013 · [P2] · contratos — Schema Zod dos parâmetros das rotas de HTML
Onde: novo `api/_lib/schemas/pages.ts`; consumido por `api/site-page.ts:30-90`, `api/product-page.ts:77-79`, `api/sitemap.ts`.
Ação: validar `page`, `topic`, `data`, `ano`, `colecao` e `identifier` por enum ou padrão, com teto de tamanho. Valor fora do contrato cai no 404 do shell em vez de virar página 200 com canonical quebrado.
Verificação: `page=constructor`, `topic=__proto__`, `ano=99999` e identificador de 5.000 caracteres esperam 404 e `noindex`.
Diff: ~120 linhas · 4 arquivos. Depende de: E-002.

### E-014 · [P1] · testes-de-contrato — Matriz table-driven de validação por endpoint
Onde: novo `tests/api/contracts/validation-matrix.contract.test.ts` e `tests/fixtures/api/*.json`.
Ação: um payload canônico por endpoint em fixture e um `it.each` que aplica as mutações **campo ausente**, **tipo incorreto**, **valor vazio**, **valor fora do limite** e **campo extra desconhecido** a cada campo do contrato, exigindo status, `error` e `fields[].field` exatos. Cobre os 8 endpoints POST e os 2 webhooks.
Verificação: a matriz falha se qualquer endpoint responder status ou código diferente do declarado; cobertura de `contracts.ts` sobe das 30 linhas hoje não executadas.
Diff: ~420 linhas · 12 arquivos. Depende de: E-006, E-007, E-008, E-009, E-010, E-011, E-012.

### E-015 · [P1] · testes-de-contrato — Casos de campo ausente em todos os blocos obrigatórios
Onde: `tests/api/contracts/validation-matrix.contract.test.ts`.
Ação: remover, um por vez, `contact`, `items`, `consent`, `submittedAt`, `clientRequestId`, `notificationPreferences` e cada campo interno obrigatório, exigindo 422 e o campo correto em `fields`.
Verificação: 25 casos, todos com `fetchMock` não chamado (nada chega ao banco).
Diff: ~140 linhas · 1 arquivo. Depende de: E-014.

### E-016 · [P1] · testes-de-contrato — Casos de tipo incorreto por campo
Onde: `tests/api/contracts/validation-matrix.contract.test.ts`.
Ação: para cada campo, trocar o tipo (string→número, número→string, objeto→array, booleano→string) e exigir 422 com `code: 'invalid_type'` em `fields`.
Verificação: 30 casos; nenhum devolve 500.
Diff: ~150 linhas · 1 arquivo. Depende de: E-015.

### E-017 · [P1] · testes-de-contrato — Casos de valor vazio e só espaços
Onde: `tests/api/contracts/validation-matrix.contract.test.ts`.
Ação: `''`, `'   '`, `[]` para `items`, `{}` para `contact` e `null` em campos obrigatórios, exigindo 422 e `code: 'required'`. Fixa a regra de que `text()` normaliza espaços antes de medir o tamanho.
Verificação: 20 casos; a mensagem em português continua a mesma de hoje.
Diff: ~120 linhas · 1 arquivo. Depende de: E-016.

### E-018 · [P2] · testes-de-contrato — Caso do consentimento recusado (422 `consent_required`)
Onde: `tests/api/contracts/validation-matrix.contract.test.ts` e `api/_lib/contracts.ts:282`.
Ação: cobrir `consent.accepted: false`, versão de aviso divergente e `acceptedAt` fora da janela. Linha 282 nunca foi executada por teste.
Verificação: três casos, todos 422 com `fields[0].field === 'consent'`.
Diff: ~40 linhas · 1 arquivo. Depende de: E-017.

### E-019 · [P2] · testes-de-contrato — Caso do item duplicado e do limite de itens
Onde: `tests/api/contracts/validation-matrix.contract.test.ts`.
Ação: dois itens com a mesma chave (hoje 422 `duplicate_quote_item`, `lead-requests.test.ts:547`) e lista acima do teto, exigindo o mesmo envelope com `fields`.
Verificação: dois casos; `fields[0].field === 'items[1]'`.
Diff: ~35 linhas · 1 arquivo. Depende de: E-018.

### E-020 · [P2] · testes-de-contrato — Caso de `pageUrl` hostil que hoje não é exercitado
Onde: `tests/api/lead-requests.test.ts:552-566` e `api/_lib/contracts.ts:140-160`.
Ação: o teste atual diz "rejeita prazo, URL e imagem hostis" mas não envia `pageUrl`, então a validação nunca roda. Acrescentar `pageUrl: 'https://evil.test/'` e `pageUrl: 'javascript:alert(1)'` exigindo 422 e `fetchMock` não chamado.
Verificação: a validação de `pageUrl` passa a aparecer na cobertura.
Diff: ~20 linhas · 1 arquivo. Depende de: E-014.

### E-021 · [P2] · testes-de-contrato — Caso de JSON inválido em todos os POST
Onde: novo `tests/api/contracts/invalid-json.contract.test.ts`.
Ação: corpo `'{invalido'`, corpo vazio, corpo `'null'` e corpo `'[]'` para cada endpoint POST, exigindo 400 com `error: 'invalid_json'` ou `invalid_request` conforme o caso, nunca 500.
Verificação: 32 casos (8 endpoints × 4 corpos).
Diff: ~110 linhas · 1 arquivo. Depende de: E-004.

### E-022 · [P2] · testes-de-contrato — Caso de método não permitido com header `Allow`
Onde: novo `tests/api/contracts/method-not-allowed.contract.test.ts`; handlers em `api/*.ts`.
Ação: `it.each` com `[handler, métodoProibido, allowEsperado]` para os 11 handlers JSON e os 4 de HTML. Acrescentar o header `Allow` onde falta, em especial nos webhooks (`notification-events-resend.ts:50`, `notification-events-whatsapp.ts:57`).
Verificação: 405 em todos, com `Allow` presente e `Cache-Control: no-store`.
Diff: ~130 linhas · 12 arquivos. Depende de: E-002.

### E-023 · [P2] · testes-de-contrato — Caso de `content-type` incompatível (415)
Onde: novo `tests/api/contracts/media-type.contract.test.ts`.
Ação: `text/plain`, `application/x-www-form-urlencoded` e ausência de `content-type` em cada POST, exigindo 415 uniforme. Hoje `api/briefing-assets.ts:31-42` responde 400 onde `customer-proposals.ts` responde 415.
Verificação: 24 casos; `briefing-assets` passa a responder 415.
Diff: ~90 linhas · 3 arquivos. Depende de: E-009.

### E-024 · [P2] · testes-de-contrato — Caso de corpo acima do limite (413) com pré-checagem
Onde: novo `tests/api/contracts/payload-size.contract.test.ts`; `api/_lib/httpRequest.ts` (criado em E-049).
Ação: corpo acima de `MAX_WEBHOOK_BODY_BYTES` e acima do limite de lead, exigindo 413 antes de qualquer parse. Hoje os webhooks leem o corpo inteiro na memória antes de medir (`notification-events-resend.ts:61-64`).
Verificação: 10 casos; o `rawBody` não é lido quando `content-length` já excede.
Diff: ~80 linhas · 4 arquivos. Depende de: E-049.

### E-025 · [P1] · testes-de-contrato — Caso de assinatura inválida nos dois webhooks
Onde: `tests/api/notification-events-resend.test.ts`, `tests/api/notification-events-whatsapp.test.ts`.
Ação: assinatura ausente, assinatura de outro segredo, timestamp fora da janela, assinatura com tamanho diferente (caminho de comparação em tempo constante) e corpo alterado após assinar. Exigir 401 e nenhuma RPC.
Verificação: 10 casos; `tests/timing-safe-secret-comparisons.node.mjs` continua passando.
Diff: ~120 linhas · 2 arquivos. Depende de: E-011, E-012.

### E-026 · [P2] · testes-de-contrato — Relógio fixo na verificação de assinatura
Onde: `tests/api/webhookSignature.test.ts:16, 42`.
Ação: passar `now` fixo em vez de usar o relógio real, e `vi.setSystemTime` no teste do handler do Resend, que não expõe `now`. O timestamp hoje é calculado na coleta do `describe`, o que torna o teste sensível a execução lenta.
Verificação: a suíte passa com `TZ=UTC` e com `TZ=America/Sao_Paulo`.
Diff: ~25 linhas · 3 arquivos. Depende de: E-025.

### E-027 · [P1] · testes-de-contrato — Testes do handler sem cobertura nenhuma (`commercial-alerts`)
Onde: novo `tests/api/commercial-alerts.test.ts`; handler em `api/commercial-alerts.ts:52-128`.
Ação: espelhar `tests/api/cron-watchdog.test.ts:67-118` com cinco cenários: GET sem `Authorization` → 401; POST → 405 com `Allow: GET`; sem webhook configurado → 503; lote vazio → 200 sem chamada externa; falha do provedor → o alerta operacional dispara.
Verificação: cobertura do arquivo sai de 3,07%; a suíte continua verde.
Diff: ~180 linhas · 1 arquivo. Depende de: E-022.

### E-028 · [P2] · testes-de-contrato — Casos faltantes do webhook do Resend
Onde: `tests/api/notification-events-resend.test.ts`.
Ação: JSON inválido → 400 `invalid_json`; `created_at` válido propagado como `p_occurred_at`; `it.each` de tipos incorretos → 400; `type: 'constructor'` → 200 com `applied: false`.
Verificação: 8 casos; nenhum 500.
Diff: ~90 linhas · 1 arquivo. Depende de: E-011.

### E-029 · [P2] · testes-de-contrato — Casos faltantes de `shared-selections`
Onde: `tests/api/shared-selections.test.ts` e `api/shared-selections.ts:35-85`.
Ação: GET → 405; corpo `[]` → 422; `action: 'delete'` → 422; erro inesperado → 500 com log; e o 404 de `revoke` passando a usar o envelope `{ error, message }` em vez de `{ revoked: false }`.
Verificação: 7 casos; o 404 deixa de ser o único sem `error`.
Diff: ~110 linhas · 2 arquivos. Depende de: E-002, E-008.

### E-030 · [P2] · testes-de-contrato — Asserções exatas onde hoje se aceita `status >= 400`
Onde: `tests/api/briefing-assets.test.ts:131-145`, `tests/api/customer-proposals.test.ts`.
Ação: trocar o laço por `it.each` com status e código exatos (403 `origin_not_allowed`, 401 `authentication_required`, 422 `invalid_briefing_asset`). A asserção atual não distingue 401 de 400 e ignora o código.
Verificação: os casos falham se o status mudar de classe.
Diff: ~70 linhas · 2 arquivos. Depende de: E-009, E-010.

### E-031 · [P2] · testes-de-contrato — Cobrir os 503 do fluxo de lead
Onde: `tests/api/lead-requests.test.ts` e `api/_lib/leadHandler.ts:77, 161-166`.
Ação: sem `SITE_PUBLIC_ORIGIN` → 503 `origin_not_configured`; `fetch` que só resolve após o orçamento de tempo → 503 `request_deadline_exceeded`, usando os fake timers já ativos no arquivo.
Verificação: dois casos; nenhum depende de espera real.
Diff: ~60 linhas · 1 arquivo. Depende de: E-014.

### E-032 · [P2] · testes-de-contrato — Teste golden do shape de resposta de sucesso e de erro
Onde: novo `tests/api/contracts/response-shapes.contract.test.ts`.
Ação: para cada endpoint, um `toEqual` estrito do corpo de sucesso e do corpo de erro, de forma que qualquer campo novo ou removido quebre o teste de propósito. Serve de contrato publicado para o front.
Verificação: 30 asserções; quebra proposital ao renomear um campo.
Diff: ~200 linhas · 1 arquivo. Depende de: E-014.

### E-033 · [P2] · contratos — Consumir `fields` no cliente HTTP do front
Onde: `src/lib/http.ts:61-108`.
Ação: `ClientRequestError` passa a carregar `fields`; `postJson` lê `body.fields` quando presente. Nenhuma tela muda de comportamento nesta etapa.
Verificação: `src/lib/http.test.ts` ganha casos de erro (hoje só cobre o caminho felz): `body.message`, `body.error`, 429, 409 e protocolo inválido.
Diff: ~70 linhas · 2 arquivos. Depende de: E-005.

### E-034 · [P2] · contratos — Marcar o campo com erro no formulário de orçamento a partir de `fields`
Onde: `src/pages/QuotePage.tsx:538-548`.
Ação: mapear `fields[].field` para os `id` dos inputs, aplicar `aria-invalid`, `aria-describedby` e mover o foco para o primeiro campo com erro. Hoje o erro do servidor aparece só como texto no fim do formulário.
Verificação: teste de componente com resposta 422 de dois campos espera dois `aria-invalid` e foco no primeiro.
Diff: ~90 linhas · 2 arquivos. Depende de: E-033.

### E-035 · [P2] · contratos — Marcar o campo com erro no formulário de contato
Onde: `src/components/ConversationForm.tsx:87-140`.
Ação: mesmo tratamento, reaproveitando o utilitário criado em E-034.
Verificação: teste de componente equivalente para contato.
Diff: ~60 linhas · 2 arquivos. Depende de: E-034.

### E-036 · [P2] · versionamento — Definir a política de versão dos contratos
Onde: novo `docs/CONTRATOS_API.md`; referência em `docs/agentes/regras-dominio.md`.
Ação: registrar que requisições de entrada aceitam `v1` e `v2` por cabeçalho `X-Contract-Version` (padrão `v1` quando ausente), que `v2` é o envelope com `fields`, que a remoção de `v1` exige aviso e data, e que todo webhook de saída carrega `version` no corpo. Documento, sem código.
Verificação: `npm run refs:orfaos` não acusa referência quebrada.
Diff: ~120 linhas · 2 arquivos. Depende de: E-005.

### E-037 · [P2] · versionamento — Resolver a versão do contrato por requisição
Onde: novo `api/_lib/contractVersion.ts`.
Ação: `resolveContractVersion(request): 'v1' | 'v2'` lendo `X-Contract-Version`, com `v1` como padrão e 400 `unsupported_contract_version` para valor desconhecido.
Verificação: teste com cabeçalho ausente, `v1`, `v2`, `v3` e valor vazio.
Diff: ~60 linhas · 2 arquivos. Depende de: E-036.

### E-038 · [P2] · versionamento — `v1` continua com um erro por resposta
Onde: `api/_lib/apiError.ts`, `api/_lib/leadHandler.ts`.
Ação: quando a versão resolvida for `v1`, emitir exatamente o corpo de hoje (`{ error, message }`, sem `fields`) a partir do mesmo `issues[]`. Garante que nenhum cliente existente mude de comportamento.
Verificação: teste de retrocompatibilidade compara byte a byte o corpo de erro `v1` com o fixture gravado antes do bloco 1.
Diff: ~70 linhas · 3 arquivos. Depende de: E-037.

### E-039 · [P2] · versionamento — `v2` emite `fields` e 422 consistente
Onde: `api/_lib/apiError.ts`.
Ação: `v2` devolve `{ error: 'validation_failed', message, fields: [...] }` com 422 para erro de campo. O front passa a enviar `X-Contract-Version: v2` em `src/lib/http.ts`.
Verificação: a matriz de E-014 roda duas vezes, uma por versão, exigindo o shape de cada uma.
Diff: ~80 linhas · 4 arquivos. Depende de: E-038.

### E-040 · [P1] · versionamento — Versão no envelope do webhook comercial de saída
Onde: `api/_lib/commercialTeamAlerts.ts:181-197`.
Ação: acrescentar `version: 'v1'` ao corpo enviado, sem alterar os campos existentes, e registrar o contrato em `docs/CONTRATOS_API.md`. Consumidor que ignora campo novo continua funcionando.
Verificação: `tests/api/commercial-team-alerts.test.ts` exige `version` e mantém as asserções atuais dos demais campos.
Diff: ~30 linhas · 3 arquivos. Depende de: E-036.

### E-041 · [P1] · versionamento — Versão no envelope dos alertas operacionais
Onde: `api/_lib/operationalAlerts.ts:32-60`.
Ação: mesmo acréscimo de `version: 'v1'`, com o contrato documentado.
Verificação: `tests/api/operationalAlerts.test.ts` exige `version`.
Diff: ~25 linhas · 3 arquivos. Depende de: E-040.

### E-042 · [P2] · versionamento — Despacho por versão nos webhooks de entrada
Onde: `api/notification-events-resend.ts`, `api/notification-events-whatsapp.ts`.
Ação: extrair o corpo do handler para `applyResendEvent(payload, version)` e `applyWhatsAppEvent(payload, version)`, com a versão vinda do schema (`v1` para o formato atual). Abre caminho para um `v2` do provedor sem duplicar o handler.
Verificação: os testes existentes passam sem alteração; teste novo exige que versão desconhecida responda 400 e não chame RPC.
Diff: ~140 linhas · 4 arquivos. Depende de: E-011, E-012.

### E-043 · [P2] · versionamento — Teste de compatibilidade retroativa com fixtures congelados
Onde: novo `tests/api/contracts/backward-compatibility.contract.test.ts` e `tests/fixtures/api/v1/*.json`.
Ação: gravar os payloads e as respostas de hoje como fixtures `v1` imutáveis e exigir que eles continuem aceitos e com a mesma resposta depois de todo o bloco 1. Qualquer quebra aparece como diferença de fixture, não como erro vago.
Verificação: 20 pares payload/resposta; o teste falha se `v1` mudar.
Diff: ~180 linhas · 22 arquivos. Depende de: E-039, E-042.

### E-044 · [P2] · versionamento — Marcar `v1` como em descontinuação sem desligar
Onde: `api/_lib/apiError.ts`, `api/_lib/contractVersion.ts`.
Ação: responder `Deprecation: true` e `Sunset` com a data acordada quando a requisição usar `v1`, e registrar um contador em `api/_lib/observability.ts` para medir quanto tráfego ainda usa `v1`. Nada é desligado; a decisão de desligar é do dono.
Verificação: teste exige os cabeçalhos em `v1` e a ausência deles em `v2`.
Diff: ~60 linhas · 4 arquivos. Depende de: E-043.

### E-045 · [P2] · contratos — Projeto Vitest `node` para `tests/` e resumo de cobertura por endpoint
Onde: `vite.config.ts:36-40`, `.github/workflows/quality.yml`.
Ação: separar `projects` em `api` (ambiente `node`, `tests/**`) e `ui` (ambiente `jsdom`, `src/**`). Hoje 21 ambientes de navegador são criados para código Node, e isso consome a maior parte do tempo da suíte. Acrescentar ao resumo do job a cobertura por arquivo de `api/`.
Verificação: `npx vitest run` passa nos dois projetos; o tempo da suíte de `tests/api` cai.
Diff: ~60 linhas · 3 arquivos. Depende de: E-014.

---

# Bloco 2 — Segurança e robustez das funções serverless (E-046 a E-063)

### E-046 · [P2] · robustez — Chave de prototype na URL deixa de virar página 200
Onde: `api/site-page.ts:67, 80, 87`.
Ação: trocar o acesso direto ao mapa por verificação de propriedade própria, como já faz `shared/catalogEditorial.ts:42`. Hoje `?page=constructor`, `?topic=__proto__` e `?data=toString` devolvem HTML 200 cacheável com canonical quebrado, porque o valor herdado do prototype é tratado como página válida.
Verificação: teste com as três chaves espera 404 e `noindex`; `npm run test -- tests/api/site-page.test.ts` verde.
Diff: ~30 linhas · 2 arquivos. Depende de: E-013.

### E-047 · [P3] · segurança-upload — Assinatura de arquivo não pode vir do prototype
Onde: `api/_lib/fileSignatures.ts:22-24`.
Ação: usar `Object.hasOwn` antes de ler o mapa de assinaturas. Hoje `mimeType: 'valueOf'` devolve uma função do prototype, que é tratada como verificador válido.
Verificação: `expect(matchesDeclaredFileSignature('valueOf', bytes)).toBe(false)` e o mesmo para `toString` e `constructor`.
Diff: ~12 linhas · 2 arquivos. Depende de: —.

### E-048 · [P3] · robustez-webhook — Tipo de evento do Resend não pode vir do prototype
Onde: `api/notification-events-resend.ts:21-25, 81`.
Ação: trocar o objeto literal por `Map` com `.get()`, ou `Object.hasOwn` antes do acesso. Hoje `type: 'constructor'` monta uma RPC inválida e o endpoint passa a devolver 500 de forma permanente para aquele evento, o que faz o provedor reentregar.
Verificação: `type: 'constructor'` espera 200 com `applied: false` e nenhuma RPC.
Diff: ~15 linhas · 2 arquivos. Depende de: E-011.

### E-049 · [P2] · duplicação — Helpers HTTP compartilhados para os handlers
Onde: novo `api/_lib/httpRequest.ts`; cópias em `api/_lib/leadHandler.ts:27`, `api/briefing-assets.ts:26`, `api/commercial-alerts.ts:20`, `api/cron-watchdog.ts:10`, `api/customer-proposals.ts:12`, `api/notifications.ts:95`, `api/retention.ts:28`, `api/shared-selections.ts:10`.
Ação: extrair `header()`, `requestIp()`, `matchesBearerSecret()`, `requireCronAuth()` e `rejectOversizedBody(request, maxBytes)` para um módulo só, e substituir as oito cópias por import. `matchesBearerSecret` mantém a comparação em tempo constante já usada hoje.
Verificação: `npm run test:timing-safe-secrets` e a suíte de `tests/api` passam sem alteração de expectativa.
Diff: ~140 linhas · 10 arquivos. Depende de: —.

### E-050 · [P3] · robustez-dos — Rejeitar corpo grande antes de lê-lo
Onde: `api/notification-events-resend.ts:61-64`, `api/notification-events-whatsapp.ts:135-138`.
Ação: checar `content-length` contra `MAX_WEBHOOK_BODY_BYTES` antes de `request.text()`, mantendo a medição real do corpo depois (o cabeçalho pode mentir).
Verificação: caso com `content-length` acima do teto espera 413 sem ler o corpo; caso com cabeçalho mentiroso ainda espera 413 após a leitura.
Diff: ~25 linhas · 3 arquivos. Depende de: E-049.

### E-051 · [P2] · robustez-timeout — Orçamento de tempo do cron de notificações estoura o limite da função
Onde: `api/notifications.ts:18-26, 706-708, 723-724`; `vercel.json` (`maxDuration: 30`).
Ação: o pior caso real soma lote, heartbeat, verificação de saúde da fila e dois alertas operacionais, e passa de 30 s. Exportar `TOTAL_TIME_BUDGET_MS` somando todos os passos e reduzir o orçamento do lote para que o total fique abaixo do `maxDuration`.
Verificação: `tests/api/maxDuration.test.ts` passa a cobrar `TOTAL_TIME_BUDGET_MS < maxDuration`, e falha se alguém aumentar um dos timeouts.
Diff: ~40 linhas · 2 arquivos. Depende de: —.

### E-052 · [P2] · robustez-timeout — Cron de retenção sem folga
Onde: `api/retention.ts:18, 283-290`.
Ação: 12 s de orçamento + 2 s de heartbeat + 1 s de alerta dão exatamente os 15 s do `maxDuration`, sem margem para latência de rede. Reduzir o orçamento do lote e exportar o total.
Verificação: o mesmo gate de E-053.
Diff: ~30 linhas · 2 arquivos. Depende de: E-051.

### E-053 · [P2] · ci-gate — Gate de `maxDuration` somando o pior caso dos quatro crons
Onde: `tests/api/maxDuration.test.ts:79-93`.
Ação: para `notifications`, `retention`, `commercial-alerts` e `cron-watchdog`, somar orçamento do lote + heartbeat + saúde da fila + alertas e exigir folga contra o `maxDuration` declarado em `vercel.json`. Hoje o teste só compara o orçamento do lote.
Verificação: aumentar qualquer timeout sem ajustar o `maxDuration` quebra o teste.
Diff: ~60 linhas · 1 arquivo. Depende de: E-052.

### E-054 · [P2] · observabilidade — Erro 500 de seleção compartilhada sem nenhum registro
Onde: `api/shared-selections.ts:79-85`.
Ação: registrar `logServerError('shared_selection_request_failed', { errorClass })` antes de responder 500, usando `api/_lib/observability.ts`. Hoje a falha é invisível no log.
Verificação: teste que faz `createSharedSelection` lançar `TypeError` espera `console.error` chamado uma vez com o nome do evento.
Diff: ~20 linhas · 2 arquivos. Depende de: —.

### E-055 · [P3] · observabilidade-pii — Log de webhook não pode carregar mensagem de erro
Onde: `api/notification-events-resend.ts:115`, `api/notification-events-whatsapp.ts:124`.
Ação: trocar `error.message` por `errorClass(error)`, conforme a política já implementada em `api/_lib/observability.ts`. Mensagem de erro de provedor pode conter endereço de e-mail ou telefone.
Verificação: teste exige que o objeto logado não tenha a chave `message`.
Diff: ~15 linhas · 3 arquivos. Depende de: —.

### E-056 · [P3] · http — `Cache-Control: no-store` em toda resposta de API
Onde: `api/_lib/apiError.ts`, `api/notification-events-resend.ts:56`, `api/notification-events-whatsapp.ts:167`, demais handlers JSON.
Ação: centralizar o header na função de resposta e aplicá-lo também nas respostas de sucesso dos endpoints autenticados, para que nenhum intermediário guarde dado de lead ou de cliente.
Verificação: teste verifica o header em sucesso e em erro nos 11 handlers JSON.
Diff: ~50 linhas · 12 arquivos. Depende de: E-002.

### E-057 · [P3] · capacidade — Limitar a concorrência de RPC do webhook do WhatsApp
Onde: `api/notification-events-whatsapp.ts:14, 155-158`.
Ação: processar os status em fatias de concorrência limitada em vez de disparar até 100 RPCs simultâneas contra o banco isolado. O orçamento de tempo por chamada já existe e permanece.
Verificação: teste com 40 status espera no máximo 10 chamadas simultâneas (contador no stub de `fetch`).
Diff: ~35 linhas · 2 arquivos. Depende de: E-012.

### E-058 · [P3] · status-code — Dado corrompido do banco não é erro do cliente
Onde: `api/_lib/sharedSelections.ts:130-140`.
Ação: ao falhar a normalização da resposta do banco, lançar `SiteDatabaseError` com 502 em vez de deixar virar 400. Hoje uma linha corrompida faz o visitante receber "pedido inválido".
Verificação: teste com resposta corrompida espera 502 e log do evento.
Diff: ~20 linhas · 2 arquivos. Depende de: E-054.

### E-059 · [P3] · validação-resposta — Status desconhecido de heartbeat não pode passar por saudável
Onde: `api/_lib/cronHeartbeats.ts:79-93`.
Ação: validar `name` e `status` contra o conjunto conhecido e lançar quando divergir; o handler já converte exceção em 503 com alerta.
Verificação: teste com `status: 'weird'` espera 503 e alerta `cron_watchdog_failed`.
Diff: ~25 linhas · 2 arquivos. Depende de: —.

### E-060 · [P3] · menor-privilégio — Chamada "como usuário" não deve levar credencial de serviço
Onde: `api/briefing-assets.ts:48-50, 117-118`, `api/customer-proposals.ts:103-105`.
Ação: usar a chave publicável do projeto isolado como `apikey` nas chamadas feitas com o JWT do cliente, reservando a credencial de serviço para as chamadas administrativas. Hoje as duas viajam juntas na mesma requisição.
Verificação: teste verifica que o header `apikey` da chamada autenticada não é a credencial de serviço.
Diff: ~40 linhas · 4 arquivos. Depende de: —.

### E-061 · [P3] · cors — Preview por URL de branch recebe 403 nos formulários
Onde: `api/_lib/siteOrigin.ts:2-7`.
Ação: aceitar também `VERCEL_BRANCH_URL`, com a mesma validação de host `*.vercel.app` já aplicada a `VERCEL_URL`. Hoje só a URL de deployment é permitida, então testar um preview pela URL de branch falha em todo envio.
Verificação: teste com as duas variáveis definidas espera as duas origens permitidas; host fora do padrão continua rejeitado.
Diff: ~25 linhas · 2 arquivos. Depende de: —.

### E-062 · [P3] · robustez-entrada — Canonical do 404 de produto não reflete a entrada
Onde: `api/product-page.ts:77-79`.
Ação: quando o identificador não casa com o padrão válido, usar `/produto` como canonical em vez de ecoar o valor recebido sem limite de tamanho.
Verificação: identificador de 5.000 caracteres espera canonical `/produto` e 404.
Diff: ~15 linhas · 2 arquivos. Depende de: E-013.

### E-063 · [P3] · configuração — Sitemap passa a usar a origem validada
Onde: `api/sitemap.ts:135, 138, 267`.
Ação: usar `configuredSiteOrigin()` em vez de ler `VITE_PUBLIC_URL` cru, removendo o fallback duplicado. Hoje o `<loc>` do sitemap pode divergir do canonical das páginas.
Verificação: teste com `VITE_PUBLIC_URL` sem esquema espera o mesmo comportamento do canonical das páginas.
Diff: ~25 linhas · 2 arquivos. Depende de: —.

---

# Bloco 3 — Bugs de front-end, estado e efeitos (E-064 a E-089)

### E-064 · [P2] · estado — Campo "Nome da campanha" descarta o espaço digitado
Onde: `src/components/QuoteDrawer.tsx:213`, `src/context/quoteCartReducer.ts:114-117`.
Ação: guardar o texto bruto no input e normalizar só ao persistir. Hoje o reducer aplica `trim` a cada tecla em um input controlado, então o usuário não consegue digitar duas palavras.
Verificação: teste de componente digita "Kit de " e espera o espaço preservado no valor exibido.
Diff: ~30 linhas · 3 arquivos. Depende de: —.

### E-065 · [P2] · estado — Quantidade de kits não aceita apagar nem valor intermediário
Onde: `src/pages/QuotePage.tsx:486`, `src/pages/KitBuilderPage.tsx:95, 105`, `src/context/quoteCartReducer.ts:86`.
Ação: aplicar o padrão de rascunho já usado nos itens avulsos: manter string no `onChange` e confirmar no `blur` ou `Enter`. Hoje o valor é limitado a cada tecla, o que impede digitar 150 (o 1 vira o mínimo imediatamente).
Verificação: teste digita "150" em campo com mínimo 50 e espera 150 ao sair do campo.
Diff: ~70 linhas · 4 arquivos. Depende de: —.

### E-066 · [P2] · efeitos — Sucesso do pedido de ajuste é apagado no mesmo instante
Onde: `src/pages/CustomerQuotePage.tsx:219-221, 64-75, 229`.
Ação: recarregar apenas o orçamento em vez de reiniciar a chave de contexto, que hoje devolve a página inteira ao estado "Carregando solicitação…" e apaga a mensagem de sucesso que o cliente acabou de receber.
Verificação: teste de componente envia o ajuste e espera a mensagem de sucesso visível após a recarga.
Diff: ~45 linhas · 2 arquivos. Depende de: —.

### E-067 · [P2] · mensagem-de-erro — Mensagem técnica da RPC chega crua ao cliente
Onde: `src/lib/customerAccount.ts:90-92`, `src/pages/CustomerQuotePage.tsx:225`.
Ação: mapear apenas os códigos conhecidos para frases em português e usar uma frase genérica para o resto. Hoje o cliente pode ver o identificador de erro do banco.
Verificação: teste com erro desconhecido espera a frase genérica; com o limite de ajustes pendentes espera a frase específica.
Diff: ~35 linhas · 3 arquivos. Depende de: —.

### E-068 · [P3] · mensagem-de-erro — Validação local do ajuste mostra erro de rede
Onde: `src/pages/CustomerQuotePage.tsx:201-204, 246`.
Ação: definir a mensagem de validação antes do `return`, em vez de deixar a tela com o texto de falha de conexão.
Verificação: teste com mensagem de 1 caractere espera o texto de validação.
Diff: ~10 linhas · 2 arquivos. Depende de: E-067.

### E-069 · [P2] · sessão — "Sair" ignora o erro e deixa a sessão ativa
Onde: `src/context/CustomerAuthContext.tsx:100`, `src/pages/CustomerAccountPage.tsx:81`.
Ação: tratar o erro de `signOut`, tentar o encerramento local como segunda tentativa e avisar o cliente quando nem isso funcionar. Hoje o botão aparenta sucesso com a sessão ainda válida, em computador compartilhado.
Verificação: teste com `signOut` falhando espera a chamada local e a mensagem de erro na tela.
Diff: ~35 linhas · 3 arquivos. Depende de: —.

### E-070 · [P2] · race — "Preparando link…" pode ficar para sempre
Onde: `src/lib/sharedSelection.ts:236`, `src/components/QuoteDrawer.tsx:113-116, 216`.
Ação: aceitar `signal` na chamada e aplicar o mesmo timeout usado em `postJson`, caindo em estado de erro quando esgotar. Hoje a requisição de compartilhamento não tem limite de tempo.
Verificação: teste com `fetch` que nunca resolve espera o estado de erro após o timeout com timers simulados.
Diff: ~45 linhas · 3 arquivos. Depende de: —.

### E-071 · [P2] · compatibilidade — Envio falha com erro cru em Safari antigo
Onde: `src/lib/http.ts:69-74`.
Ação: combinar os sinais de abortar manualmente em vez de usar a API que não existe em Safari anterior ao 17.4. Hoje o visitante nesses navegadores vê um erro de tipo em vez da mensagem de falha de envio.
Verificação: teste que remove a API global espera a mensagem tratada e não um erro de tipo.
Diff: ~30 linhas · 2 arquivos. Depende de: —.

### E-072 · [P3] · estado-de-erro — Falha de ação no back-office apaga o pedido inteiro
Onde: `src/pages/BackofficePage.tsx:495, 513, 532, 243-250`.
Ação: separar o erro de ação do erro de carregamento e mostrá-lo como aviso acima do conteúdo, mantendo o pedido na tela.
Verificação: teste com falha de mudança de estágio espera o pedido ainda visível e o aviso presente.
Diff: ~40 linhas · 2 arquivos. Depende de: —.

### E-073 · [P3] · efeitos — Rascunho de proposta é zerado a cada recarga do detalhe
Onde: `src/pages/BackofficePage.tsx:233-239`.
Ação: depender do identificador do pedido em vez do objeto inteiro, para que uma revalidação não apague o texto que o operador está escrevendo.
Verificação: teste revalida o detalhe e espera o rascunho preservado.
Diff: ~20 linhas · 2 arquivos. Depende de: E-072.

### E-074 · [P3] · estado-obsoleto — "Link copiado" permanece depois de a seleção mudar
Onde: `src/components/QuoteDrawer.tsx:126-129, 216`.
Ação: voltar o botão ao estado inicial quando os itens mudarem, e desabilitar o botão de revogar enquanto a revogação está em curso. Hoje o cliente pode compartilhar um link que não corresponde mais à seleção.
Verificação: teste adiciona item após copiar e espera o rótulo de volta a "Compartilhar".
Diff: ~30 linhas · 2 arquivos. Depende de: —.

### E-075 · [P3] · estados — Área do cliente mostra "Carregando…" e erro ao mesmo tempo
Onde: `src/pages/CustomerAccountPage.tsx:117-129, 194`.
Ação: estado de carregamento próprio para o bloco de dados e direitos, com botão de nova tentativa no erro.
Verificação: teste com falha espera o botão e, ao clicar, nova chamada.
Diff: ~40 linhas · 2 arquivos. Depende de: —.

### E-076 · [P2] · efeitos — Histórico refaz uma RPC de escrita a cada filtro e a cada mudança de sessão
Onde: `src/pages/CustomerAccountPage.tsx:42-52`.
Ação: separar a reivindicação do histórico (uma vez por identidade) da listagem (por filtro e página). Hoje trocar de página dispara de novo a RPC de escrita e o evento de analytics.
Verificação: teste muda de página três vezes e espera uma única chamada da RPC de reivindicação.
Diff: ~45 linhas · 2 arquivos. Depende de: —.

### E-077 · [P3] · fuso — Validade da proposta usa o fuso do dispositivo
Onde: `src/lib/customerAccount.ts:54-63`.
Ação: reutilizar o utilitário de data local já usado no calendário, para que a proposta não apareça expirada um dia antes para quem está em outro fuso.
Verificação: teste com `TZ=Pacific/Kiritimati` e `TZ=Etc/GMT+12` espera o mesmo resultado.
Diff: ~15 linhas · 2 arquivos. Depende de: —.

### E-078 · [P3] · estados — Nova tentativa de categorias não volta ao carregamento
Onde: `src/lib/hooks.ts:57-69, 71-83`.
Ação: marcar carregamento e limpar o erro no início de cada efeito, para que a nova tentativa não mantenha a mensagem antiga na tela.
Verificação: teste espera `loading: true` e `error: null` imediatamente após a nova tentativa.
Diff: ~15 linhas · 2 arquivos. Depende de: —.

### E-079 · [P3] · estado-inconsistente — "Apagar rascunho" não apaga o nome da seleção
Onde: `src/pages/QuotePage.tsx:238-245, 73-77`.
Ação: limpar também o nome da seleção, ou declarar que o nome pertence à seleção e não ao rascunho, mantendo um único comportamento. Hoje o nome volta sozinho depois de apagar.
Verificação: teste apaga o rascunho e espera o campo de nome vazio.
Diff: ~15 linhas · 2 arquivos. Depende de: —.

### E-080 · [P3] · robustez — Data inválida derruba a página do cliente
Onde: `src/pages/CustomerAccountPage.tsx:14-16`, `src/pages/CustomerQuotePage.tsx:19-21`, `src/components/SavedSelections.tsx:7-9`.
Ação: replicar a guarda já usada no back-office, devolvendo um travessão quando a data não é válida, em vez de deixar a formatação lançar e quebrar a árvore.
Verificação: teste com `'não-é-data'` espera o travessão nos três pontos.
Diff: ~20 linhas · 4 arquivos. Depende de: —.

### E-081 · [P3] · compatibilidade — Montar kit usa API de identificador sem alternativa
Onde: `src/pages/KitBuilderPage.tsx:76`.
Ação: reutilizar o gerador de identificador já existente no cliente HTTP, que tem alternativa para navegador antigo, e envolver em tratamento de erro com mensagem ao usuário.
Verificação: teste sem a API global espera a composição criada e nenhuma exceção.
Diff: ~20 linhas · 2 arquivos. Depende de: —.

### E-082 · [P3] · imagem — Seleção compartilhada e orçamento histórico sem imagem de reserva
Onde: `src/pages/SharedSelectionPage.tsx:202`, `src/pages/CustomerQuotePage.tsx:243`.
Ação: usar o tratador de imagem quebrada já existente em `src/lib/images.ts` nos dois pontos.
Verificação: teste dispara o erro da imagem e espera a troca pela imagem de reserva.
Diff: ~12 linhas · 2 arquivos. Depende de: —.

### E-083 · [P3] · validação — Confirmação de exclusão de conta é sensível a maiúsculas
Onde: `src/pages/CustomerAccountPage.tsx:218`.
Ação: comparar os e-mails normalizados. Hoje quem digita o próprio e-mail com maiúscula não consegue concluir a exclusão prevista na política de privacidade.
Verificação: teste com e-mail em maiúsculas espera a exclusão habilitada.
Diff: ~8 linhas · 2 arquivos. Depende de: —.

### E-084 · [P3] · paginação — Back-office aceita página além do total
Onde: `src/pages/BackofficePage.tsx:437, 219-228`.
Ação: limitar a página ao total após a carga, corrigindo a URL em vez de exibir intervalo inválido com lista vazia.
Verificação: teste com página 50 em uma fila de 12 pedidos espera a correção para a última página válida.
Diff: ~25 linhas · 2 arquivos. Depende de: —.

### E-085 · [P3] · efeitos — Gravação do rascunho a cada tecla e a cada aviso
Onde: `src/pages/QuotePage.tsx:177-189`.
Ação: remover o aviso das dependências e aplicar um pequeno atraso antes de gravar, em vez de escrever no armazenamento da sessão a cada caractere.
Verificação: teste digita 10 caracteres e espera uma única gravação.
Diff: ~25 linhas · 2 arquivos. Depende de: —.

### E-086 · [P3] · limpeza — Rascunhos de quantidade não são limpos ao remover item
Onde: `src/pages/QuotePage.tsx` e `src/components/QuoteDrawer.tsx` (mapa `quantityDrafts`).
Ação: apagar a entrada correspondente ao remover o item e ao limpar a seleção, para que um item re-adicionado não volte com a quantidade digitada antes.
Verificação: teste remove, re-adiciona e espera a quantidade mínima.
Diff: ~25 linhas · 3 arquivos. Depende de: E-065.

### E-087 · [P3] · navegação — Proposta assinada abre em nova aba em vez de sair da aplicação
Onde: `src/pages/CustomerQuotePage.tsx:184`.
Ação: abrir a URL assinada em nova aba ou disparar o download, em vez de navegar a página atual para fora da aplicação e perder o contexto do orçamento.
Verificação: teste espera `window.open` com a URL e a página do orçamento ainda montada.
Diff: ~20 linhas · 2 arquivos. Depende de: —.

### E-088 · [P3] · recuperação — Nova tentativa da seleção compartilhada recarrega a página inteira
Onde: `src/pages/SharedSelectionPage.tsx:200`.
Ação: refazer apenas a requisição, como já fazem as outras telas, em vez de recarregar o documento.
Verificação: teste clica em tentar novamente e espera nova chamada sem recarga.
Diff: ~20 linhas · 2 arquivos. Depende de: —.

### E-089 · [P3] · busca — Monte seu kit mostra 12 resultados sem "carregar mais"
Onde: `src/pages/KitBuilderPage.tsx:27`.
Ação: expor paginação ou botão de carregar mais, informando quantos resultados existem. Hoje quem busca um termo comum não alcança o produto que quer.
Verificação: teste com 30 resultados espera o botão e a segunda página carregada ao clicar.
Diff: ~60 linhas · 2 arquivos. Depende de: —.

---

# Bloco 4 — Acessibilidade, WCAG 2.2 AA (E-090 a E-109)

### E-090 · [P2] · nome-acessível — Título da home é lido duas vezes pelo leitor de tela
Onde: `src/components/GlitchText.css:10-19` (uso em `src/pages/HomePage.tsx:221`).
Ação: usar a sintaxe de texto alternativo vazio nos pseudo-elementos, que mantém o efeito visual e tira a duplicata da árvore de acessibilidade. Alternativa: mover o efeito para um elemento irmão marcado como decorativo. **[mockup]** não é necessário: o visual não muda.
Verificação: `e2e/smoke.spec.ts` passa a exigir um único nó com o texto do título na árvore de acessibilidade da home.
Diff: ~12 linhas · 2 arquivos. Depende de: —.

### E-091 · [P2] · aria — Atributo de nome proibido em 14 elementos sem papel
Onde: `src/components/QuoteDrawer.tsx:237`, `src/pages/CatalogPage.tsx:43, 65`, `src/pages/CatalogsPage.tsx:212, 229, 256`, `src/pages/CommemorativeDatesPage.tsx:80, 322`, `src/pages/CustomerAccountPage.tsx:95`, `src/pages/CustomerLoginPage.tsx:118`, `src/pages/QuotePage.tsx:505`, `src/components/CampaignFinder.tsx:183`, `src/components/ProductCard.tsx:47`.
Ação: dar a cada elemento um papel que aceite nome (`group`, `nav`, `region`) ou trocar o elemento. O verificador automático classifica esses casos como indeterminados, e os testes atuais só olham violações, então eles passam sem serem corrigidos.
Verificação: E-108 passa a falhar o teste quando aparecer um caso indeterminado desse tipo.
Diff: ~40 linhas · 10 arquivos. Depende de: —.

### E-092 · [P2] · foco — Campo de arquivo oculto continua na ordem de tabulação
Onde: `src/components/BriefingAssetUploader.tsx:125-126`.
Ação: tirar o campo nativo da sequência de tabulação e marcá-lo como oculto para a tecnologia assistiva, deixando o botão como único acionador. Hoje a tabulação para em um controle invisível e sem indicador de foco.
Verificação: teste de teclado espera o foco indo do botão direto para o próximo controle.
Diff: ~8 linhas · 2 arquivos. Depende de: —.

### E-093 · [P2] · foco — Alerta de indisponibilidade recebe foco sem indicador visível
Onde: `src/styles.css:2917` (foco programático em `src/pages/QuotePage.tsx:261, 480`).
Ação: o contorno usa um token de cor que não existe no projeto, então nenhuma borda aparece. Trocar pelo token azul já definido. Mesmo achado aparece em E-146 pelo lado visual.
Verificação: teste visual de foco no alerta espera contorno com largura maior que zero.
Diff: ~5 linhas · 1 arquivo. Depende de: —.

### E-094 · [P2] · contraste — Passo futuro do briefing com contraste abaixo do mínimo
Onde: `src/styles.css:2739-2748` (markup em `src/pages/QuotePage.tsx:466`).
Ação: usar o token de texto secundário, que atinge contraste suficiente sobre o fundo claro. O texto tem 0,7 rem e hoje fica em 2,75:1.
Verificação: a varredura automática de contraste na rota de orçamento passa a não reportar o elemento.
Diff: ~4 linhas · 1 arquivo. Depende de: —.

### E-095 · [P3] · uso-de-cor — Diferença na tabela de comparação indicada só por cor
Onde: `src/components/CatalogComparisonTray.tsx:61`, `src/styles.css:1225`.
Ação: acrescentar um texto só para leitor de tela, ou um marcador visível, além do fundo colorido.
Verificação: teste espera o texto "(difere)" na célula divergente.
Diff: ~15 linhas · 2 arquivos. Depende de: —.

### E-096 · [P3] · nome-acessível — Chips de filtro não dizem que removem o filtro
Onde: `src/pages/CatalogPage.tsx:66-72`.
Ação: incluir o verbo no nome acessível mantendo o rótulo visual curto.
Verificação: teste espera o nome "Remover filtro Busca: …".
Diff: ~12 linhas · 2 arquivos. Depende de: —.

### E-097 · [P3] · região-viva — Avisos montados já com conteúdo não são anunciados
Onde: `src/components/Layout.tsx:266, 273`, `src/components/QuoteDrawer.tsx:206`, `src/components/CampaignFinder.tsx:199, 225`.
Ação: manter um único contêiner de aviso sempre presente e trocar apenas o texto, em vez de montar o contêiner junto com a mensagem. Região viva criada no mesmo instante da mensagem não é anunciada de forma confiável.
Verificação: teste espera o contêiner presente desde a montagem e o texto mudando.
Diff: ~35 linhas · 5 arquivos. Depende de: —.

### E-098 · [P3] · movimento — Rolagem suave ignora a preferência por menos movimento
Onde: `src/lib/useCatalogPageState.ts:267`.
Ação: consultar a preferência do sistema e usar rolagem instantânea quando ela estiver ativa.
Verificação: teste com a consulta de mídia simulada espera comportamento instantâneo.
Diff: ~12 linhas · 2 arquivos. Depende de: —.

### E-099 · [P3] · feedback — Botão de comparar desabilitado esconde o motivo
Onde: `src/components/ProductCard.tsx:72-76`.
Ação: manter o botão acionável e explicar o limite ao clicar, em vez de desabilitar com o motivo apenas no atributo de dica, que não chega ao teclado nem ao leitor de tela.
Verificação: teste clica no quarto produto e espera o aviso do limite anunciado.
Diff: ~25 linhas · 2 arquivos. Depende de: —.

### E-100 · [P3] · estrutura — Calendário de datas sem nome completo e com tipo só por cor
Onde: `src/pages/CommemorativeDatesPage.tsx:80-93`, `src/styles.css:6555-6558`.
Ação: devolver os dias da semana à árvore de acessibilidade e enriquecer o nome de cada evento com dia e tipo.
Verificação: teste espera o nome "…, dia 12, data comercial".
Diff: ~30 linhas · 2 arquivos. Depende de: —.

### E-101 · [P3] · formulários — Erro de e-mail no login sem marcação nem foco
Onde: `src/pages/CustomerLoginPage.tsx:42-44, 121`.
Ação: marcar o campo como inválido, ligá-lo à mensagem e mover o foco para ele ao falhar.
Verificação: teste submete e-mail inválido e espera foco no campo e a mensagem associada.
Diff: ~25 linhas · 2 arquivos. Depende de: —.

### E-102 · [P3] · região-viva — Estados de carregamento não são anunciados
Onde: `src/components/CatalogFilterPanel.tsx:170`, `src/pages/ProductPage.tsx:127`, `src/pages/HomePage.tsx:319`.
Ação: marcar os três blocos como região de status e indicar ocupado durante a carga.
Verificação: teste espera o anúncio "Carregando categorias…" nos três pontos.
Diff: ~25 linhas · 4 arquivos. Depende de: E-097.

### E-103 · [P3] · foco — Envio de arquivo desabilita o conjunto e derruba o foco
Onde: `src/components/BriefingAssetUploader.tsx:119, 126`.
Ação: trocar o bloqueio do conjunto por indicação de ocupado e guarda no acionador, anunciando o resultado. Hoje o foco do botão é perdido no meio do envio.
Verificação: teste espera o foco preservado durante o envio e o anúncio de conclusão.
Diff: ~30 linhas · 2 arquivos. Depende de: E-092.

### E-104 · [P3] · idioma — Rótulos em inglês sem marcação de idioma
Onde: `src/pages/HomePage.tsx:354-357, 369-371`.
Ação: marcar o idioma das partes em inglês para que o leitor de tela não as pronuncie em português.
Verificação: teste espera o atributo de idioma nos quatro rótulos.
Diff: ~8 linhas · 1 arquivo. Depende de: —.

### E-105 · [P3] · aria — Estado da cor é anunciado duas vezes
Onde: `src/components/CatalogFilterPanel.tsx:199-200`.
Ação: remover ", selecionada" do nome acessível, já que o estado de pressionado comunica isso.
Verificação: teste espera o nome "Cor Azul" e o estado pressionado.
Diff: ~4 linhas · 1 arquivo. Depende de: —.

### E-106 · [P3] · contraste-não-textual — Bordas de controles abaixo de 3:1
Onde: `src/styles.css:90, 1584, 5275, 5886`.
Ação: elevar a cor da borda dos controles sem preenchimento para atingir o mínimo de contraste contra o fundo. **[mockup]** se o dono considerar mudança visual perceptível.
Verificação: medição de contraste das bordas nos quatro grupos de controle.
Diff: ~10 linhas · 1 arquivo. Depende de: —.

### E-107 · [P3] · forced-colors — Estado "ativo" desaparece no modo de alto contraste
Onde: `src/styles.css` (controles ativos em 90, 1186-1187, 1584, 2151, 5818-5820); nenhum bloco de cores forçadas existe hoje.
Ação: acrescentar um bloco para o modo de cores forçadas que marque selecionado e ativo com contorno ou borda, já que o navegador descarta o preenchimento nesse modo.
Verificação: inspeção com cores forçadas ativas nos filtros, na comparação e nas sugestões de busca.
Diff: ~30 linhas · 1 arquivo. Depende de: —.

### E-108 · [P2] · testes-a11y — Varredura automática não cobre tamanho de alvo nem casos indeterminados
Onde: `e2e/smoke.spec.ts:187-188`.
Ação: habilitar explicitamente a regra de tamanho de alvo (desligada por padrão na versão do verificador em uso) e passar a falhar, ou ao menos registrar, os casos indeterminados do tipo "atributo de nome proibido". Hoje o selo de conformidade dos testes não cobre esses dois pontos.
Verificação: a regra aparece na lista executada e os casos de E-091 falham antes da correção.
Diff: ~25 linhas · 1 arquivo. Depende de: —.

### E-109 · [P2] · testes-a11y — Varredura em sobreposições e nas rotas hoje ignoradas
Onde: `e2e/smoke.spec.ts:174-180, 393, 639, 1085, 1145, 1186`.
Ação: rodar a varredura com a seleção aberta, com o menu móvel aberto, com o painel de filtros aberto, com a comparação expandida e com as sugestões de busca visíveis; e acrescentar as rotas sem varredura hoje: área do cliente, detalhe do orçamento, seleção compartilhada, ideias, definir senha, confirmação de acesso, 404 e back-office.
Verificação: 13 varreduras novas; a suíte continua verde após os blocos 4 e 7.
Diff: ~120 linhas · 2 arquivos. Depende de: E-108.

---

# Bloco 5 — Performance web (E-110 a E-127)

### E-110 · [P1] · rede — Home dispara até oito consultas ao catálogo para usar só a imagem
Onde: `src/pages/HomePage.tsx:42-51, 75-79, 321-323`.
Ação: montar cada prévia de categoria somente quando o cartão entra na área visível, reaproveitando o observador já usado em `src/pages/CatalogsPage.tsx:38-48`, e reduzir as colunas pedidas. Hoje são oito requisições com contagem exata e 34 colunas, concorrendo com a imagem principal da home.
Verificação: teste de rede no navegador espera no máximo duas consultas antes da primeira rolagem.
Diff: ~60 linhas · 3 arquivos. Depende de: —.

### E-111 · [P2] · maior-conteúdo — Script bloqueante no topo de todas as rotas para agir só na home
Onde: `index.html:19`, `api/_lib/pageShell.ts:44`.
Ação: trocar o script síncrono por uma marcação de pré-carregamento da imagem principal, estática no documento, e removê-la no shell das páginas que não são a home.
Verificação: o documento das rotas internas deixa de conter o script; a métrica de maior conteúdo da home não piora.
Diff: ~35 linhas · 3 arquivos. Depende de: —.

### E-112 · [P2] · fontes — Fontes dos títulos sem pré-carregamento
Onde: `src/styles.css:2-7, 217-233`, `index.html`.
Ação: servir os arquivos de fonte com nome estável a partir da pasta pública e pré-carregar os dois pesos usados nos títulos. Hoje a primeira visita quase sempre renderiza com a fonte de reserva.
Verificação: o documento passa a ter as duas marcações; o orçamento de performance continua dentro do teto.
Diff: ~40 linhas · 4 arquivos. Depende de: —.

### E-113 · [P2] · bytes — Folha de estilo única de 183 KB entregue em toda rota
Onde: `src/main.tsx:4`, `src/styles.css` (6.838 linhas).
Ação: mover os blocos exclusivos de rota para arquivos de estilo importados pela própria página carregada sob demanda. A divisão por chunk já está habilitada no empacotador, então cada rota passa a receber só o seu estilo.
Verificação: o estilo do pacote inicial cai; nenhuma rota perde regra (comparação visual das sete rotas cobertas pelos testes).
Diff: ~400 linhas movidas · 8 arquivos. Depende de: —.

### E-114 · [P2] · rede — Tabela de categorias buscada três vezes na home
Onde: `src/lib/hooks.ts:57-83`, `src/lib/catalog.ts`.
Ação: guardar a promessa de categorias no módulo e derivar a lista de pais da lista completa, em vez de duas consultas independentes na home e outra no catálogo e na ficha.
Verificação: teste espera uma única consulta de categorias por carga de página.
Diff: ~50 linhas · 3 arquivos. Depende de: —.

### E-115 · [P2] · rede — Contagem exata pedida em toda consulta, inclusive nas de um item
Onde: `src/lib/catalog.ts:278-287, 436, 441`.
Ação: tornar o cabeçalho de contagem opcional e pedi-lo só na listagem paginada. A ficha de produto, a busca por identificadores e as prévias de um item não precisam do total, e a contagem exata é a parte mais cara da consulta.
Verificação: teste espera o cabeçalho ausente nas três chamadas e presente na listagem.
Diff: ~30 linhas · 2 arquivos. Depende de: —.

### E-116 · [P2] · maior-conteúdo — Ficha de produto não pré-carrega a imagem que o servidor já conhece
Onde: `api/product-page.ts:112-115`, `api/_lib/pageShell.ts:41`.
Ação: inserir a marcação de pré-carregamento da imagem principal no shell, já que o servidor busca a linha do produto antes de responder. Hoje a imagem só começa a baixar depois de documento, script, chunk e consulta.
Verificação: o documento da ficha passa a conter a marcação; a métrica de maior conteúdo melhora na rota de produto.
Diff: ~25 linhas · 3 arquivos. Depende de: —.

### E-117 · [P2] · rede — Relacionados buscam 24 produtos para mostrar quatro
Onde: `src/pages/ProductPage.tsx:30-35`.
Ação: reduzir a página pedida e adiar a montagem da seção até ela entrar na área visível.
Verificação: teste espera a consulta de relacionados só após a rolagem.
Diff: ~30 linhas · 2 arquivos. Depende de: E-110.

### E-118 · [P3] · bytes — Painel de seleção entra no pacote inicial sem ser usado
Onde: `src/components/Layout.tsx:9, 264`.
Ação: carregar o painel sob demanda. Ele tem 286 linhas mais a lógica de compartilhamento e não renderiza nada até ser aberto; o pacote de entrada está a 13 KiB do teto do orçamento.
Verificação: o orçamento de performance registra a queda; abrir o painel continua funcionando nos testes de ponta a ponta.
Diff: ~20 linhas · 2 arquivos. Depende de: —.

### E-119 · [P3] · rede — Sem conexão antecipada ao host do catálogo
Onde: `index.html:17-19`.
Ação: acrescentar a conexão antecipada ao host do catálogo, que já está liberado na política de segurança de conteúdo. Hoje toda consulta paga resolução de nome e handshake depois do script.
Verificação: o documento passa a conter a marcação; a primeira consulta inicia mais cedo.
Diff: ~6 linhas · 1 arquivo. Depende de: —.

### E-120 · [P3] · imagens — Mesma imagem original servida para quatro tamanhos diferentes
Onde: `src/components/ProductCard.tsx:31-42`, `src/lib/images.ts`.
Ação: criar um utilitário que peça a imagem já redimensionada ao serviço de armazenamento quando a URL for dele, e usar conjuntos de origem com dois ou três tamanhos nos pontos de 560, 130, 90 e 72 pixels. **NÃO VERIFICADO**: se o projeto canônico do catálogo expõe o endpoint de transformação; confirmar antes de implementar, e manter a URL original como reserva.
Verificação: teste do utilitário com URL do armazenamento e com URL externa; inspeção visual dos cartões.
Diff: ~80 linhas · 4 arquivos. Depende de: —.

### E-121 · [P3] · imagens — Listas longas sem carregamento adiado
Onde: `src/pages/SharedSelectionPage.tsx:202`, `src/pages/CustomerQuotePage.tsx:243`, `src/pages/KitBuilderPage.tsx`, `src/pages/QuotePage.tsx`.
Ação: marcar as imagens dessas listas para carregamento adiado e decodificação assíncrona. A seleção compartilhada pode ter até 50 itens.
Verificação: teste espera o atributo nas quatro listas.
Diff: ~12 linhas · 4 arquivos. Depende de: —.

### E-122 · [P3] · estabilidade-visual — Imagem ampliada sem dimensão reservada
Onde: `src/components/ProductGallery.tsx:89`.
Ação: declarar largura e altura, ou proporção no estilo, espelhando a imagem principal.
Verificação: medição de deslocamento de layout dentro do diálogo de zoom.
Diff: ~6 linhas · 1 arquivo. Depende de: —.

### E-123 · [P3] · imagens — Logotipo de 800 por 420 pixels servido em tamanho pequeno
Onde: `src/components/Layout.tsx:153`.
Ação: gerar uma versão menor e usar conjunto de origem com tamanhos, mantendo as dimensões declaradas. São 35 KB em toda página para exibir 180 pixels de largura.
Verificação: o orçamento de performance registra a queda; o cabeçalho continua idêntico.
Diff: ~15 linhas · 2 arquivos. Depende de: —.

### E-124 · [P3] · fontes — Fonte carregada em toda página para uma assinatura do rodapé
Onde: `src/components/GiftLoversSignature.css:2-8`.
Ação: alinhar a política de exibição à do resto do site para eliminar o reflow e, para cortar os 24 KB, carregar a fonte apenas na home ou gerar um subconjunto com os glifos da frase.
Verificação: o orçamento registra a queda; a assinatura continua com a mesma forma na home.
Diff: ~15 linhas · 2 arquivos. Depende de: —.

### E-125 · [P3] · interatividade — 24 cartões re-renderizam a cada tecla digitada na busca
Onde: `src/pages/CatalogPage.tsx:35, 78`, `src/components/ProductCard.tsx`.
Ação: manter o texto digitado dentro do componente de busca, sincronizando com a URL só quando o termo muda, e memoizar o cartão e os manipuladores. Nenhum componente usa memoização hoje.
Verificação: teste de digitação espera que o cartão não re-renderize (contador de render no teste).
Diff: ~70 linhas · 3 arquivos. Depende de: —.

### E-126 · [P3] · navegação — Voltar ao catálogo refaz a consulta e mostra esqueleto
Onde: `src/lib/hooks.ts:16-23, 36-38`.
Ação: guardar os resultados por chave de consulta em um mapa limitado no módulo, usar o valor guardado como estado inicial e revalidar em segundo plano. Hoje voltar da ficha quebra a restauração de rolagem porque a lista volta vazia antes de carregar.
Verificação: teste de ponta a ponta volta da ficha e espera a lista já preenchida e a rolagem restaurada.
Diff: ~70 linhas · 2 arquivos. Depende de: E-114.

### E-127 · [P2] · ci — Medir o que o usuário sente, não só os bytes
Onde: `.github/workflows/quality.yml`, `scripts/check-performance-budget.mjs`.
Ação: acrescentar uma medição das métricas de carregamento e interatividade contra a prévia local em três rotas fixas (home, catálogo e uma ficha de produto), com teto declarado. O gate atual só mede tamanho de pacote, então uma regressão de maior conteúdo passa.
Verificação: o job falha quando a métrica passa do teto; o resultado aparece no resumo do job.
Diff: ~120 linhas · 3 arquivos. Depende de: E-110, E-111, E-116.

---

# Bloco 6 — SEO e renderização no servidor (E-128 a E-143)

### E-128 · [P1] · metadados — Título e descrição do servidor divergem do que o cliente grava
Onde: `api/site-page.ts:30-36`; páginas em `src/pages/CatalogPage.tsx:28`, `AboutPage.tsx:8`, `ContactPage.tsx:11`, `PrivacyPage.tsx:9`, `KitBuilderPage.tsx:87`.
Ação: criar uma fonte única de metadados por rota em `shared/`, como já existe para as landings de ideias, e consumi-la nos dois lados. Hoje cinco rotas indexáveis mudam de título e descrição depois da hidratação, o que o rastreador pode ler como conteúdo instável.
Verificação: teste de paridade compara o título e a descrição do shell com os da página para cada rota.
Diff: ~140 linhas · 8 arquivos. Depende de: —.

### E-129 · [P2] · metadados — Sufixo do título de coleção difere entre servidor e cliente
Onde: `api/site-page.ts:73`.
Ação: usar a constante de nome do site já importada no arquivo, igualando o formato ao da página.
Verificação: o teste de paridade de E-128 cobre a rota de coleções.
Diff: ~5 linhas · 1 arquivo. Depende de: E-128.

### E-130 · [P2] · metadados — Descrição das páginas de data difere entre servidor e cliente
Onde: `api/_lib/curatedPagePreviews.ts:42`.
Ação: derivar as prévias de uma fonte compartilhada com os dados das datas comemorativas, ou, no mínimo, ampliar o teste para comparar título e descrição por identificador, não só a lista de chaves.
Verificação: teste compara os dois lados para todas as datas publicadas.
Diff: ~70 linhas · 4 arquivos. Depende de: E-128.

### E-131 · [P2] · dados-estruturados — Dado estruturado do produto piora na hidratação
Onde: `src/pages/ProductPage.tsx:99-106`, `api/_lib/publicProductPage.ts:140-149`.
Ação: incluir URL e marca no dado gerado no cliente e usar a mesma regra de descrição do servidor. Hoje o cliente substitui o dado do servidor por uma versão mais pobre.
Verificação: teste compara os dois objetos campo a campo.
Diff: ~30 linhas · 3 arquivos. Depende de: E-132.

### E-132 · [P2] · metadados — Descrição do produto cortada em tamanhos diferentes
Onde: `api/_lib/publicProductPage.ts:131-132`, `src/pages/ProductPage.tsx:138`.
Ação: extrair uma função compartilhada que normalize espaços e corte na última palavra inteira dentro do limite, e usá-la nos dois lados. Hoje são 300 caracteres no servidor e 155 ou nenhum corte no cliente.
Verificação: teste da função com texto curto, longo e com espaços múltiplos; paridade entre os lados.
Diff: ~50 linhas · 4 arquivos. Depende de: —.

### E-133 · [P2] · dados-estruturados — Trilha de navegação não é publicada
Onde: `api/_lib/publicProductPage.ts:140-149`, `src/components/Seo.tsx`.
Ação: emitir a trilha como dado estruturado na ficha de produto, nas landings de ideias e nas coleções, no mesmo bloco do produto.
Verificação: teste espera o tipo de trilha presente e com os itens na ordem correta.
Diff: ~80 linhas · 4 arquivos. Depende de: E-131.

### E-134 · [P2] · sitemap — Produtos sem data de última modificação
Onde: `api/sitemap.ts:227, 311`.
Ação: trazer a data da linha do produto e passá-la na entrada do sitemap, que já aceita o campo.
Verificação: teste espera a data presente em todas as entradas de produto.
Diff: ~25 linhas · 2 arquivos. Depende de: —.

### E-135 · [P2] · status-http — URL com barra no fim responde 404 enquanto a página aparece
Onde: `vercel.json:427-444`.
Ação: declarar a política de barra final na configuração, para que a variante redirecione em vez de cair no catch-all que responde 404 com marcação de não indexar enquanto a aplicação renderiza a página normal.
Verificação: teste que lê a configuração exige a chave; verificação manual de uma rota com barra no fim após o deploy.
Diff: ~10 linhas · 2 arquivos. Depende de: —.

### E-136 · [P3] · sitemap — Landings de ideias listadas à mão
Onde: `api/sitemap.ts:166-169`.
Ação: derivar a lista dos identificadores já exportados em `shared/ideaLandingPages.ts`, para que uma landing nova entre no sitemap sem edição manual.
Verificação: teste adiciona uma landing fictícia e espera a entrada no sitemap.
Diff: ~10 linhas · 2 arquivos. Depende de: —.

### E-137 · [P3] · robots — Caminho das funções não é bloqueado para rastreadores
Onde: `public/robots.txt:1-4`.
Ação: bloquear o caminho das funções, já que as rotas de HTML servidas por elas respondem 200 também quando chamadas diretamente, criando conteúdo duplicado. A rewrite não é afetada: as rotas públicas continuam rastreáveis.
Verificação: teste que lê o arquivo exige a regra; verificação de que `/catalogo` continua liberado.
Diff: ~4 linhas · 2 arquivos. Depende de: —.

### E-138 · [P3] · conteúdo-duplicado — Ano futuro das datas indexável sem estar no sitemap
Onde: `api/site-page.ts:78-85`, `src/pages/CommemorativeDatesPage.tsx:282`.
Ação: escolher uma política e aplicá-la nos dois lados: canonical sempre para o ano corrente (consolida) ou os dois anos no sitemap. Recomendado: consolidar no ano corrente.
Verificação: teste espera o canonical do ano corrente para qualquer ano pedido.
Diff: ~25 linhas · 3 arquivos. Depende de: E-128.

### E-139 · [P3] · dados-estruturados — Dado da organização só existe no cliente
Onde: `src/pages/HomePage.tsx:120-128`, `src/pages/CommemorativeDatesPage.tsx:275`.
Ação: colocar o dado da organização estático no documento, com logotipo, perfis sociais e ponto de contato, e trocar a URL fixa de produção pela constante de origem na agenda de datas.
Verificação: teste espera o dado presente no documento servido e a URL derivada da configuração.
Diff: ~40 linhas · 3 arquivos. Depende de: —.

### E-140 · [P3] · compartilhamento — Metadados de compartilhamento incompletos
Onde: `api/_lib/pageShell.ts:45-52`, `index.html`, `src/components/Seo.tsx`.
Ação: declarar largura, altura e texto alternativo da imagem de compartilhamento, o tipo correto nas fichas de produto e os campos equivalentes da outra rede social.
Verificação: teste espera os campos presentes no shell de produto e no documento base.
Diff: ~45 linhas · 4 arquivos. Depende de: —.

### E-141 · [P3] · canonical — Página não indexável publica canonical para si mesma
Onde: `api/not-found.ts:130`, `api/_lib/pageShell.ts`, `src/components/Seo.tsx`.
Ação: remover canonical e URL de compartilhamento quando a página é marcada como não indexável, em vez de reescrevê-los apontando para a própria URL inválida.
Verificação: teste espera a ausência das marcações na resposta de 404.
Diff: ~30 linhas · 4 arquivos. Depende de: —.

### E-142 · [P2] · conteúdo-servido — Shell do servidor não tem texto nenhum no corpo
Onde: `api/_lib/pageShell.ts:44-58`, `index.html:23`.
Ação: incluir no corpo do shell um título de primeiro nível, a descrição da rota e um link para o catálogo, como já faz o shell de reserva. Hoje o corpo servido é apenas o contêiner vazio da aplicação, então um rastreador sem execução de script vê uma página sem conteúdo.
Verificação: teste espera o título e o link no corpo das rotas públicas; a hidratação continua substituindo o conteúdo sem piscar (verificar nos testes de ponta a ponta).
Diff: ~90 linhas · 3 arquivos. Depende de: E-128.

### E-143 · [P2] · indexação-de-filtros — Política explícita para o catálogo com parâmetros
Onde: `api/site-page.ts:30`, `src/pages/CatalogPage.tsx:28`, `src/components/Layout.tsx:220`.
Ação: declarar quais combinações de parâmetros são indexáveis com canonical próprio e quais consolidam no catálogo sem parâmetros, e aplicar a regra nos dois lados. Hoje o canonical é sempre o catálogo puro, mas os links internos levam a variantes com parâmetro.
Verificação: teste cobre busca, perfil, categoria e momento, exigindo o canonical declarado para cada caso.
Diff: ~70 linhas · 4 arquivos. Depende de: E-128.

---

# Bloco 7 — UX, responsividade e consistência (E-144 a E-161)

### E-144 · [P1] · responsividade — Menu móvel não rola e esconde os últimos links
Onde: `src/styles.css:734-751`, `src/components/Layout.tsx:100-103`.
Ação: limitar a altura do menu à janela visível e permitir rolagem interna. Em telas baixas (celular na horizontal, telas pequenas) os últimos itens ficam inalcançáveis.
Verificação: teste de ponta a ponta em 360 por 500 pixels espera o último item do menu clicável.
Diff: ~8 linhas · 1 arquivo. Depende de: —.

### E-145 · [P2] · responsividade — Campos com fonte pequena fazem o iOS dar zoom
Onde: `src/styles.css:675, 1681, 2248, 2456, 2551, 5175`.
Ação: forçar 16 pixels nesses campos dentro do bloco de tela pequena. Abaixo disso o Safari amplia a página ao focar o campo e o visitante perde o contexto.
Verificação: inspeção nos seis campos em largura de 390 pixels.
Diff: ~15 linhas · 1 arquivo. Depende de: —.

### E-146 · [P2] · responsividade — Botão flutuante cobre o aviso de desfazer
Onde: `src/styles.css:2656-2660, 3201-3205, 3892, 3954`.
Ação: mover a regra de posição do aviso para o mesmo ponto de quebra que exibe o botão flutuante. Entre 561 e 760 pixels os dois ocupam o mesmo canto e o aviso de desfazer fica inacessível.
Verificação: teste em 600 pixels remove um item e espera o botão de desfazer clicável.
Diff: ~6 linhas · 1 arquivo. Depende de: —.

### E-147 · [P2] · responsividade — Botão flutuante cobre as ações da comparação
Onde: `src/styles.css:1194-1197, 1262-1263, 2658`.
Ação: reservar espaço no cabeçalho da bandeja de comparação, ou elevar o botão flutuante quando a bandeja está presente.
Verificação: teste em 390 pixels com três produtos em comparação espera as ações clicáveis.
Diff: ~8 linhas · 1 arquivo. Depende de: E-146.

### E-148 · [P2] · formulário — Indicador de etapas do briefing perde os rótulos no celular
Onde: `src/styles.css:3896-3897`, `src/pages/QuotePage.tsx:466`.
Ação: empilhar os rótulos em vez de zerar o tamanho da fonte. Hoje o visitante no celular vê apenas círculos sem nome e não sabe em que etapa está. **[mockup]** o dono aprova o empilhamento antes do código.
Verificação: teste em 390 pixels espera o texto da etapa atual visível.
Diff: ~12 linhas · 1 arquivo. Depende de: —.

### E-149 · [P2] · consistência — "Limpar seleção" apaga sem confirmar em uma das telas
Onde: `src/pages/QuotePage.tsx:479` (o painel confirma, em `src/components/QuoteDrawer.tsx:209, 274-281`).
Ação: extrair o diálogo de confirmação do painel para um componente e usá-lo também na página de orçamento. Hoje a mesma ação tem duas consequências diferentes dependendo de onde o visitante clica.
Verificação: teste clica em limpar na página e espera o diálogo, não o esvaziamento imediato.
Diff: ~70 linhas · 3 arquivos. Depende de: —.

### E-150 · [P2] · formulário — Quantidade abaixo do mínimo é corrigida em silêncio
Onde: `src/context/quoteCartReducer.ts:79`, `src/components/QuoteDrawer.tsx:237-252`, `src/pages/QuotePage.tsx:486`.
Ação: mostrar o mínimo no painel, como já aparece na página, e avisar quando o valor digitado foi elevado ao mínimo.
Verificação: teste digita 5 em item com mínimo 50 e espera o aviso e o valor 50.
Diff: ~45 linhas · 3 arquivos. Depende de: E-065.

### E-151 · [P2] · terminologia — Cinco nomes para a mesma coisa
Onde: `src/components/Layout.tsx:147, 198, 221, 255`, `src/pages/QuotePage.tsx:404, 457, 460, 463, 549`, `src/components/QuoteDrawer.tsx:267`.
Ação: fixar um glossário (seleção = a lista; briefing = o formulário; orçamento = o que o cliente recebe) e alinhar todos os rótulos a ele. Hoje "orçamento", "briefing", "cotação", "proposta" e "solicitação" aparecem como sinônimos na mesma jornada.
Verificação: teste de ponta a ponta percorre a jornada e confere os rótulos esperados por tela.
Diff: ~60 linhas · 6 arquivos. Depende de: —.

### E-152 · [P2] · bug-ux — Lista de canais mostra "Sem preferência" duas vezes
Onde: `src/components/ConversationForm.tsx:15, 122-124`.
Ação: remover a opção duplicada, mantendo a opção vazia como instrução de escolha.
Verificação: teste espera quatro opções distintas no seletor.
Diff: ~5 linhas · 1 arquivo. Depende de: —.

### E-153 · [P2] · alvo-de-toque — Controles frequentes abaixo de 44 pixels
Onde: `src/styles.css:678-680, 1219, 2257, 3221-3233, 3951, 4252, 4975, 5178-5180, 6174`.
Ação: elevar a altura e a largura dos controles de quantidade, busca, comparação e paginação ao mínimo recomendado, removendo as reduções específicas de tela pequena. **[mockup]** o dono aprova o novo tamanho dos controles de quantidade.
Verificação: a regra de tamanho de alvo habilitada em E-108 passa a não reportar os nove grupos.
Diff: ~30 linhas · 1 arquivo. Depende de: E-108.

### E-154 · [P3] · legibilidade — Textos de apoio abaixo de 10 pixels
Onde: `src/styles.css:1218, 2377, 2458, 2535, 2949, 3081, 3117, 4300, 5132, 5627`.
Ação: definir um piso de tamanho para texto informativo, mantendo o tratamento decorativo apenas nos rótulos de seção. **[mockup]**.
Verificação: inspeção dos dez pontos em 390 e 1440 pixels.
Diff: ~15 linhas · 1 arquivo. Depende de: —.

### E-155 · [P3] · formulários-móveis — Campos de busca sem o teclado e o tipo adequados
Onde: `src/components/SearchAutocomplete.tsx:98-109`, `src/components/Layout.tsx:190`, `src/components/CatalogFilterPanel.tsx:161-166`.
Ação: declarar o tipo de busca, a dica de tecla de ação e desligar correção automática nos três campos.
Verificação: teste espera os atributos nos três campos.
Diff: ~10 linhas · 3 arquivos. Depende de: —.

### E-156 · [P3] · recuperação — Login desabilita o envio sem explicar e não permite reenviar
Onde: `src/pages/CustomerLoginPage.tsx:19, 65, 123, 126`.
Ação: deixar o envio habilitado e mostrar o erro ao submeter; após o envio do código, oferecer reenvio com intervalo mínimo entre tentativas.
Verificação: teste submete vazio e espera a mensagem; teste espera o botão de reenvio com contagem.
Diff: ~60 linhas · 2 arquivos. Depende de: E-101.

### E-157 · [P3] · recuperação — Definir senha mistura três causas de erro e manda pedir novo link sem link
Onde: `src/pages/SetPasswordPage.tsx:266, 273, 276`.
Ação: separar as mensagens de senhas diferentes, senha curta e link inválido, e incluir o link para pedir um novo acesso.
Verificação: teste cobre as três causas e espera o link presente na terceira.
Diff: ~35 linhas · 2 arquivos. Depende de: —.

### E-158 · [P3] · validação — Canal escolhido sem o dado de contato correspondente
Onde: `src/components/ConversationForm.tsx:30, 116-125`.
Ação: exigir telefone quando o canal escolhido for telefone ou mensagem, com mensagem no próprio campo.
Verificação: teste escolhe o canal sem telefone e espera o erro no campo.
Diff: ~15 linhas · 2 arquivos. Depende de: E-035.

### E-159 · [P3] · recuperação — Erro de envio mostra texto cru e não oferece outro canal
Onde: `src/components/ConversationForm.tsx:87, 140`, `src/pages/QuotePage.tsx:373, 548`.
Ação: mapear os erros por classe (limite de tentativas, falha de rede, falha do servidor) e oferecer o contato por mensagem como alternativa no bloco de erro.
Verificação: teste com limite de tentativas espera a frase específica e o link alternativo.
Diff: ~50 linhas · 4 arquivos. Depende de: E-033.

### E-160 · [P3] · estados — 404 sem busca e com uma única saída
Onde: `src/pages/NotFoundPage.tsx`, `src/styles.css` (bloco de página não encontrada).
Ação: incluir o campo de busca já existente no projeto e links para home e contato, além do catálogo.
Verificação: teste na rota inexistente espera o campo de busca e três saídas.
Diff: ~45 linhas · 3 arquivos. Depende de: —.

### E-161 · [P2] · testes-ux — Nenhum teste cobre estouro horizontal nas rotas de conversão
Onde: `e2e/smoke.spec.ts:255-263`.
Ação: acrescentar casos em 360 pixels para catálogo com bandeja de comparação, orçamento com itens, painel de seleção aberto e detalhe do orçamento, exigindo largura do documento igual à da janela. Hoje só a assinatura do rodapé é verificada em 320 pixels.
Verificação: quatro casos novos; falham antes das correções de E-144 a E-147.
Diff: ~80 linhas · 1 arquivo. Depende de: E-147.

---

# Bloco 8 — Arquitetura e manutenibilidade (E-162 a E-176)

### E-162 · [P1] · arquitetura — Dependência circular entre o tratador de lead e o cron de notificações
Onde: `api/_lib/leadHandler.ts:4`, `api/notifications.ts:3`.
Ação: mover os tipos de requisição e resposta para um módulo próprio e importá-los nos nove handlers, e mover a entrega imediata de confirmação para um módulo de notificações sem voltar a importar o tratador. Ciclo de importação em código serverless produz módulo parcialmente inicializado em borda, com falha difícil de reproduzir.
Verificação: `npm run graph:query` deixa de reportar o ciclo; a suíte de `tests/api` passa sem alteração.
Diff: ~120 linhas · 11 arquivos. Depende de: —.

### E-163 · [P2] · duplicação — Quatro implementações diferentes de chamada ao banco isolado
Onde: `api/_lib/sharedSelections.ts:88`, `api/_lib/commercialTeamAlerts.ts:101`, `api/notifications.ts:223`, `api/retention.ts:59`.
Ação: extrair uma única função tipada pelo contrato de RPC, com sinal de cancelamento e tempo limite, e fazer as quatro delegarem para ela. Uma delas hoje não aceita sinal externo, então não respeita o orçamento de tempo do cron.
Verificação: a suíte passa; teste novo exige que todas respeitem o cancelamento.
Diff: ~140 linhas · 6 arquivos. Depende de: E-049.

### E-164 · [P2] · contrato-tipado — Duas chamadas de RPC fora do contrato tipado
Onde: `api/_lib/commercialTeamAlerts.ts:101`, `api/_lib/sharedSelections.ts:88`.
Ação: tipar o nome e os argumentos pelo contrato gerado do banco, como já fazem os outros módulos. Hoje um nome de RPC renomeado no banco só apareceria em produção, como 503.
Verificação: `npm run typecheck` falha ao digitar um nome inexistente.
Diff: ~30 linhas · 3 arquivos. Depende de: E-163.

### E-165 · [P2] · duplicação — Padrão de identificador redefinido em cinco arquivos com duas formas
Onde: `api/_lib/sharedSelections.ts:4`, `api/_lib/publicProductPage.ts:9`, `api/notifications.ts:38`, `api/customer-proposals.ts:10`, `api/briefing-assets.ts:11`.
Ação: mover um único padrão para um módulo de validação e importar nos cinco pontos, escolhendo a variante mais restrita.
Verificação: teste do padrão com identificadores válidos e inválidos; a suíte passa.
Diff: ~25 linhas · 6 arquivos. Depende de: —.

### E-166 · [P2] · duplicação — Validação de contato duplicada entre front e funções
Onde: `src/pages/QuotePage.tsx:32-45`, `src/components/ConversationForm.tsx:18-30`, `src/lib/customerAccount.ts:39`, `api/_lib/contracts.ts:110`.
Ação: criar em `shared/` o padrão de e-mail e as funções de telefone, e importar nos quatro pontos, mantendo a regra idêntica dos dois lados. Hoje o front pode aceitar o que a função rejeita.
Verificação: teste de paridade roda os mesmos 20 casos nas duas camadas.
Diff: ~90 linhas · 6 arquivos. Depende de: E-006.

### E-167 · [P2] · configuração — Origem pública fixa em oito arquivos, dois ignorando a variável
Onde: `src/components/Seo.tsx:35`, `src/pages/HomePage.tsx:40`, `src/pages/ProductPage.tsx:104`, `src/pages/CommemorativeDatesPage.tsx:274`, `src/lib/customerAuthRedirect.ts:1`, `src/lib/sharedSelection.ts:145`, `api/_lib/publicProductPage.ts:7`, `api/sitemap.ts:6`.
Ação: uma constante de reserva em `shared/` e um único acessor no front que leia a variável de ambiente uma vez; substituir as oito ocorrências. Hoje em ambiente de prévia dois pontos geram URL de produção.
Verificação: teste com a variável definida espera a origem derivada nos oito pontos.
Diff: ~70 linhas · 10 arquivos. Depende de: —.

### E-168 · [P2] · configuração — Variáveis de ambiente lidas em dez módulos do front
Onde: `src/lib/siteSupabase.ts:5-7` e mais nove módulos.
Ação: concentrar a leitura em um módulo que exporte os valores já resolvidos, e reutilizar a derivação do identificador do projeto em vez de refazê-la.
Verificação: `npm run typecheck` e a suíte passam; teste espera erro claro quando a variável obrigatória falta.
Diff: ~90 linhas · 11 arquivos. Depende de: E-167.

### E-169 · [P2] · configuração — Chave do catálogo resolvida de três formas diferentes
Onde: `api/_lib/catalogValidation.ts:66`, `api/_lib/publicProductPage.ts:63, 84, 95`, `api/sitemap.ts:135, 138, 139`, `src/lib/catalog.ts:6-7, 23-45`.
Ação: um módulo compartilhado com a ordem única de resolução da chave, do recurso e da origem, usado pelas duas camadas. Hoje a mesma chave tem três ordens de precedência, e um ambiente mal configurado funciona em um ponto e falha em outro.
Verificação: teste cobre as três ordens antigas e exige o mesmo resultado da nova.
Diff: ~110 linhas · 7 arquivos. Depende de: E-167.

### E-170 · [P3] · duplicação — Versão do aviso de privacidade literal em seis pontos
Onde: `api/_lib/contracts.ts:26, 284, 292`, `src/types.ts:165`, `src/lib/quoteRequest.ts:40`, `src/lib/contactRequest.ts:16`.
Ação: uma constante compartilhada, com o tipo derivado dela. Trocar a versão do aviso hoje exige seis edições coordenadas, e esquecer uma causa recusa de consentimento em produção.
Verificação: teste espera a mesma versão nos seis pontos; `npm run test:error-catalog` continua passando.
Diff: ~25 linhas · 7 arquivos. Depende de: —.

### E-171 · [P3] · duplicação — Chaves de armazenamento local espalhadas em onze arquivos
Onde: `src/pages/QuotePage.tsx:100-340` (nove ocorrências da mesma chave) e mais dez arquivos.
Ação: um módulo com todas as chaves como constantes e uma lista das que contêm dado pessoal, usada pela rotina de apagamento. Hoje a rotina de apagamento pode não cobrir uma chave nova.
Verificação: teste exige que a rotina apague todas as chaves da lista; `npm run test` passa.
Diff: ~60 linhas · 12 arquivos. Depende de: —.

### E-172 · [P2] · resiliência — Erro de uma página derruba o cabeçalho e a navegação
Onde: `src/App.tsx:107-109`.
Ação: mover a barreira de erro para dentro do layout, envolvendo apenas o conteúdo da rota, e manter uma barreira externa simples para falhas do próprio layout. Hoje qualquer erro de render deixa o visitante sem menu e sem saída.
Verificação: teste força erro em uma rota e espera o cabeçalho ainda presente.
Diff: ~30 linhas · 2 arquivos. Depende de: —.

### E-173 · [P2] · gate — Gate de qualidade enumera 25 testes à mão e esquece cinco suítes
Onde: `package.json` (script `check`), `tests/session-start-hook.node.mjs`.
Ação: trocar a enumeração por um único alvo que rode todos os testes do diretório, e incluir as cinco suítes hoje fora do gate. Uma delas não tem script nenhum, então nunca roda.
Verificação: `npm run check` executa as 30 suítes; o número aparece no resumo do job.
Diff: ~25 linhas · 2 arquivos. Depende de: —.

### E-174 · [P3] · observabilidade — Registro direto no console em 16 pontos das funções
Onde: `api/_lib/observability.ts:17-23` e 16 pontos em `api/*.ts`; `src/components/AppErrorBoundary.tsx`.
Ação: acrescentar a função de registro informativo ao módulo de observabilidade e trocar os registros diretos, para que a política de não registrar dado pessoal valha em um só lugar. Na barreira de erro do front, remover o registro duplicado.
Verificação: teste exige que nenhum arquivo de `api/` chame o console diretamente (verificação por padrão de texto no próprio teste).
Diff: ~70 linhas · 18 arquivos. Depende de: E-055.

### E-175 · [P3] · arquitetura — Camada de funções importa tipos do front
Onde: `api/_lib/siteRpcContract.ts:1`.
Ação: gerar os tipos do banco em `shared/` e atualizar os três pontos de importação, removendo a dependência das funções para a pasta do front.
Verificação: `npm run db:site:types` grava no novo caminho; `npm run typecheck` passa nos dois projetos.
Diff: ~40 linhas · 5 arquivos. Depende de: —.

### E-176 · [P3] · manutenibilidade — Quatro arquivos acima de 500 linhas concentram responsabilidades distintas
Onde: `api/notifications.ts` (733), `src/pages/BackofficePage.tsx` (617), `src/pages/QuotePage.tsx` (557), `src/lib/catalog.ts` (511).
Ação: extrair por responsabilidade, sem mudar comportamento: provedores de envio e entrega de confirmação para fora do cron; lista, detalhe e formulário de proposta para componentes próprios no back-office; o formulário e a confirmação para fora da página de orçamento; acesso ao catálogo separado da normalização de linha. Uma PR por arquivo.
Verificação: a suíte passa sem alteração de expectativa em cada PR; `npm run graph:status` registra a nova divisão.
Diff: ~700 linhas movidas · 4 PRs. Depende de: E-162, E-163.

---

# Bloco 9 — CI/CD, build, conteúdo e LGPD na interface (E-177 a E-190)

Etapas marcadas **[regra 8]** tocam CI, workflows ou segredos: a PR fica aberta aguardando o dono, conforme `AGENTS.md`.

### E-177 · [P1] · ci — Navegadores de teste baixados do zero em toda execução **[regra 8]**
Onde: `.github/workflows/quality.yml:68-83, 169-172`.
Ação: guardar o diretório de navegadores do Playwright em cache por chave do arquivo de dependências, e instalar sem as bibliotecas do sistema quando o cache existir. Esta é uma causa já comprovada de PR reprovada sem relação com o diff: o download acontece duas vezes por execução e falha por rede.
Verificação: a execução seguinte registra acerto de cache; o tempo do job de navegador cai.
Diff: ~30 linhas · 1 arquivo. Depende de: —.

### E-178 · [P2] · deploy — Verificação pós-deploy não cobre a rota de produto **[regra 8]**
Onde: `scripts/smoke-deployment.mjs:72`.
Ação: incluir uma ficha de produto com identificador conhecido e a rota de montar kit na lista verificada, exigindo status 200 na ficha e não apenas a presença dos cabeçalhos. A ficha é a única rota de HTML que depende do catálogo externo e do shell empacotado, ou seja, a mais provável de quebrar sem aviso.
Verificação: `npm run test:smoke-deployment` cobre o caso; o smoke falha quando a ficha responde 404.
Diff: ~40 linhas · 2 arquivos. Depende de: —.

### E-179 · [P2] · segredos — Segredos usados no release não aparecem no arquivo de exemplo **[regra 8]**
Onde: `.env.example`, `scripts/validate-env-example.mjs:16`.
Ação: documentar os segredos consumidos apenas pelo release em uma seção própria, com valor marcado como "colar somente no GitHub Actions", e estender o verificador para varrer também os workflows. Hoje ele só varre a pasta das funções, então a divergência passa. Nenhum valor real entra no repositório.
Verificação: `npm run env:example:check` falha se um segredo novo aparecer em workflow sem estar documentado.
Diff: ~60 linhas · 3 arquivos. Depende de: —.

### E-180 · [P2] · cadeia-de-suprimentos — Binário de lint de workflow instalado sem conferir integridade **[regra 8]**
Onde: `.github/workflows/workflows-lint.yml:31-35`.
Ação: baixar para arquivo, conferir contra uma soma fixada no próprio workflow e só então extrair. Hoje o binário vem por tubo direto para execução, sem verificação.
Verificação: alterar um byte da soma esperada faz o job falhar.
Diff: ~20 linhas · 1 arquivo. Depende de: —.

### E-181 · [P2] · ci-segurança — Um job persiste o token do Actions no repositório clonado **[regra 8]**
Onde: `.github/workflows/release.yml:47`.
Ação: desligar a persistência de credencial nesse checkout. É o único do repositório que a mantém, e o job autentica por variável de ambiente própria, então nada deixa de funcionar.
Verificação: o job continua verde; o arquivo de configuração do git clonado não contém token.
Diff: ~2 linhas · 1 arquivo. Depende de: —.

### E-182 · [P2] · cadeia-de-suprimentos — Bloqueio de licença nunca é aplicado **[regra 8]**
Onde: `.github/workflows/dependency-review.yml:19`.
Ação: habilitar o workflow pelo mesmo padrão já usado na análise de código (condição por visibilidade do repositório ou variável explícita) e documentar a variável no mesmo lugar. Hoje a regra existe no arquivo mas não há como ela rodar neste repositório, então a verificação de licença e de vulnerabilidade de dependência não acontece em PR.
Verificação: a execução aparece na PR seguinte; uma dependência com licença bloqueada reprova o job.
Diff: ~10 linhas · 2 arquivos. Depende de: —.

### E-183 · [P2] · ci-custo — Build do empacotador roda três vezes e a suíte roda duas **[regra 8]**
Onde: `package.json:28`, `.github/workflows/quality.yml:84-89`.
Ação: reaproveitar o resultado de build que o servidor de teste de ponta a ponta já produz com as mesmas variáveis, em vez de um terceiro build só para medir o pior caso; e rodar a suíte uma única vez, com cobertura. O gate obrigatório fica mais rápido e mais barato sem perder verificação.
Verificação: o job continua cobrindo os mesmos passos; o tempo total cai e o resumo registra uma execução de cada.
Diff: ~30 linhas · 2 arquivos. Depende de: E-045.

### E-184 · [P2] · erro-exposto — Mensagem do servidor com nome técnico de campo chega ao visitante
Onde: `src/lib/http.ts:95`, `api/_lib/leadHandler.ts:158`, `api/_lib/contracts.ts:131-135`, `src/pages/QuotePage.tsx:548`.
Ação: usar a mensagem do servidor apenas quando o código de erro estiver em uma lista curta de códigos com texto aprovado, e manter o texto genérico nos demais casos. Com o envelope de E-039, o campo correto passa a ser marcado no formulário em vez de aparecer como frase técnica. Hoje 13 lançamentos interpolam o nome interno do campo na mensagem.
Verificação: teste com código desconhecido espera o texto genérico; teste com `consent_required` espera o texto aprovado.
Diff: ~45 linhas · 3 arquivos. Depende de: E-033, E-034.

### E-185 · [P2] · erro-exposto — Erro bruto do banco e erro de configuração renderizados como texto da interface
Onde: `src/lib/catalog.ts:311`, `src/lib/http.ts:25, 67, 74`.
Ação: descartar o detalhe técnico do banco na mensagem exibida, mantendo-o apenas na causa registrada; e mover a validação de endereço do endpoint para dentro do bloco tratado, para que uma configuração errada apareça como indisponibilidade e não como erro de biblioteca no formulário.
Verificação: teste com erro do banco espera o texto único; teste com endpoint inválido espera o texto de indisponibilidade.
Diff: ~35 linhas · 3 arquivos. Depende de: —.

### E-186 · [P2] · lgpd — Aviso de privacidade não nomeia controlador, encarregado nem base legal
Onde: `src/pages/PrivacyPage.tsx:13-22`.
Ação: acrescentar o controlador com razão social e inscrição fiscal, o canal nominal do encarregado, a menção à autoridade nacional e a base legal de cada tratamento descrito nas seções de coleta. O texto final é decisão do dono; a etapa entrega a estrutura e os campos a preencher.
Verificação: teste espera os quatro elementos presentes na página; revisão do dono antes do merge.
Diff: ~70 linhas · 2 arquivos. Depende de: —.

### E-187 · [P2] · lgpd — Transferência internacional de dados não é informada
Onde: `src/pages/PrivacyPage.tsx:19`.
Ação: nomear as categorias de operadores e declarar a transferência internacional com a salvaguarda adotada, alinhando com a seção que já cita a plataforma de hospedagem pelo nome. Texto sujeito à aprovação do dono.
Verificação: teste espera a declaração presente; revisão do dono.
Diff: ~30 linhas · 2 arquivos. Depende de: E-186.

### E-188 · [P2] · lgpd — Recibo de consentimento datado pelo relógio do visitante
Onde: `api/_lib/contracts.ts:132-135, 287-291`.
Ação: gravar o instante do aceite com a hora do servidor, mantendo o valor enviado pelo cliente apenas como campo informativo. Hoje a janela aceita retroação de até sete dias, o que fragiliza o recibo como prova.
Verificação: teste com `acceptedAt` de três dias atrás espera o registro com a hora do servidor; o recibo continua sendo criado.
Diff: ~35 linhas · 3 arquivos. Depende de: E-006.

### E-189 · [P2] · lgpd — Ponto de coleta sem link do aviso e sem informar a vinculação de histórico
Onde: `src/pages/CustomerLoginPage.tsx:117-122`, `src/pages/SetPasswordPage.tsx`, `src/components/BriefingAssetUploader.tsx`.
Ação: incluir o link para o aviso de privacidade sob os três formulários que coletam dado pessoal e uma linha curta explicando que solicitações enviadas com o mesmo e-mail passam a aparecer no histórico da conta. Acrescentar um teste que exija o link em todo ponto de coleta, para a regra não se perder em telas futuras.
Verificação: teste percorre os pontos de coleta e exige o link; `npm run test` passa.
Diff: ~50 linhas · 5 arquivos. Depende de: E-170.

### E-190 · [P2] · formatação-local — Data em formato técnico no e-mail, agenda no fuso do navegador e arquivo de calendário incompleto
Onde: `src/lib/quoteRequest.ts:65`, `src/lib/commemorativeDates.ts:290, 300, 330-334`, `src/pages/CommemorativeDatesPage.tsx:32`.
Ação: usar o formatador de data em português já existente no corpo do e-mail, derivar o dia de referência da agenda do fuso de São Paulo em vez do fuso do dispositivo, e incluir no arquivo de calendário o campo de instante de geração exigido pelo formato. Acrescentar teste do corpo do e-mail e do arquivo gerado.
Verificação: teste com dois fusos diferentes espera a mesma data na agenda; validação do arquivo de calendário.
Diff: ~60 linhas · 6 arquivos. Depende de: E-077.

---

# Anexo A — Achados verificados que não entraram nas 190 etapas

Cabem em uma etapa cada, caso o dono queira ampliar o plano. Ficam registrados para não se perderem.

## CI/CD e build

| Onde | Achado |
|---|---|
| `.github/workflows/release.yml:197` | O verificador do artefato de deploy só roda depois do merge; a parte estática do contrato poderia ser verificada na PR. |
| `.github/workflows/quality.yml:3-6`, `database.yml`, `graphify.yml` | PR que só toca documentação dispara o gate completo, incluindo banco local e grafo. |
| `scripts/check-performance-budget.mjs:140-173` | Comentários que justificam o orçamento citam tetos que o código já não usa. |
| `.github/workflows/graphify.yml:23` | Teto de 10 minutos para duas instalações completas e dois builds de grafo, em um check obrigatório. |
| `.github/workflows/automation-local.yml:25, 33-35` | Runner, action e versão do Node divergentes do padrão do repositório. |
| `.github/actions/setup-node-project/action.yml:15` | Action composta órfã, com pin mais antigo que o dos workflows; usar nos cinco jobs que repetem o preparo ou remover. |
| `.github/workflows/workflows-lint.yml:6-7, 37` | O lint é disparado por mudanças nos arquivos de action, mas não analisa esses arquivos. |
| `.github/workflows/contexto.yml:311` | Anotações de supressão de um analisador que não roda em lugar algum. |
| `.github/workflows/stale-branches.yml:13-14, 24` | Pede permissão de escrita e persiste credencial em um job que só lê. |
| `.github/workflows/secrets-rotation-reminder.yml:3-7` e mais três | Sem controle de concorrência; dois deles abrem issue e aceitam disparo manual. |
| `package.json:13, 15, 48, 49` | Quatro scripts de verificação não são executados por nenhum gate. |
| `.github/workflows/release.yml:37-78` | O job de verificação do banco instala a ferramenta sem fixar a versão do Node. |
| `api/site-page.ts:123`, `api/product-page.ts:114` | Nada verifica o cabeçalho de cache das rotas de HTML servidas por função. |
| `vercel.json:92` | A política de segurança libera imagem de qualquer host seguro, sem inventário dos hosts reais do catálogo, e não há relatório de violação. |
| `vercel.json:29-49` | A configuração não é validada contra o conjunto real de rotas e de funções. |
| `.github/workflows/release.yml:217-288` | Não há verificação automatizada de deployment de prévia. |
| `.github/workflows/ci-health.yml:40-53` | A saúde do CI mede sucesso e falha, mas não duração, então não há série histórica para decidir cache e tetos. |

## Conteúdo, textos e LGPD

| Onde | Achado |
|---|---|
| `src/lib/contactRequest.ts:24-39, 46-49` | O envio de contato por e-mail como alternativa descarta o registro de consentimento. |
| `src/lib/contactRequest.ts:33` | Canal de contato preferido sai como identificador técnico no e-mail. |
| `src/lib/whatsappContact.ts:10-13` | Número configurável aceito sem código de país; telefone exibido fixo em duas páginas. |
| `src/pages/QuotePage.tsx:497` | Aviso de rascunho concatena frase fora de contexto ("este campo" sem campo). |
| `src/lib/quoteConfirmation.ts:11-16` | Rótulos dos quatro estados de entrega com concordância inconsistente. |
| `src/pages/QuotePage.tsx:545` | Link do aviso de privacidade sem atributo de segurança, divergente do de contato. |
| `src/components/ConversationForm.tsx:107, 112, 131`, `src/pages/QuotePage.tsx:529-543` | Contador de caracteres não associado ao campo; limites de 100, 150 e 160 nunca comunicados. |
| `shared/catalogEditorial.ts:19, 86` | Governança editorial das coleções só é verificada dentro de um teste com relógio real. |
| `src/pages/QuotePage.tsx:549`, `docs/GUIA_DE_VOZ.md:12, 15` | Rótulo do botão final e exemplo de concordância divergem do guia de voz. |
| `src/pages/ContactPage.tsx:20-24` | O mesmo espaço serve de rótulo em quatro cartões e de frase no quinto. |
| `src/pages/PrivacyPage.tsx:9` | A página do aviso herda a descrição comercial do site. |
| `src/pages/PrivacyPage.test.tsx` | Nenhum teste liga a versão do aviso ao texto exibido; o teste atual cobre uma seção. |
| `src/lib/quoteRequest.ts:49-70`, `src/lib/contactRequest.ts:24-39` | O corpo dos e-mails não tem teste de formatação em português. |
| `src/lib/commemorativeDates.ts:323-335` | Nenhuma validação do arquivo de calendário gerado. |
| `package.json` | Nenhuma verificação de ortografia e acentuação em texto visível. |
| `src/pages/QuotePage.tsx:422-428` | Nenhum teste cobre a tela de confirmação com os quatro estados de entrega. |

## Outras dimensões

| Onde | Achado |
|---|---|
| `src/styles.css:172, 1256, 3802-6664` | Onze pontos de quebra distintos no mesmo arquivo; consolidar em quatro. |
| `src/styles.css:249, 4007` | Dois blocos de variáveis redefinem os mesmos tokens; anéis de foco usam o azul antigo fixo. |
| `src/styles.css:1040-1050` | Modo de mesclagem por imagem força uma camada de composição por cartão do grid. |
| `src/styles.css:1117-1128` | Código do produto truncado no cartão por causa da ordem do texto. |
| `src/pages/HomePage.tsx:198-200, 223` | Chips da home mostram um rótulo e buscam outro termo; um CTA se confunde com a seleção. |
| `src/pages/CatalogPage.tsx:49-72` | Rótulos do painel de filtros e das ações de limpar variam no mesmo fluxo. |
| `src/pages/QuotePage.tsx:505-518` | Estilos escritos no próprio elemento no editor de contexto da campanha. |
| `src/styles.css:1186-1190, 1595-1600, 4995-5000, 5290-5295` | Estado de passagem do mouse idêntico ao estado ativo em botões de alternância. |
| `src/styles.css:3066-3068`, `src/styles.css:5633-5646` | Seletores com erro não recebem borda de erro; seletor do formulário de conversa sem estilo próprio. |
| `src/styles.css:3880-3881` | Paginação vira ícone sem texto no celular, sem nome acessível. |
| `src/lib/hooks.ts`, `src/lib/useCatalogPageState.ts` e mais 11 pontos | Treze supressões da regra de dependências de efeito pelo mesmo padrão de chave derivada. |
| `package.json` (`@types/node`) | Tipos do Node em versão à frente do runtime fixado em engines e no CI. |
| `src/lib/whatsappContact.ts`, `src/lib/customerAccount.ts:174` e mais três | Cinco símbolos exportados sem uso externo. |
| `src/pages/CommemorativeDatesPage.tsx:347` e mais nove | Linhas de marcação de até 2.932 caracteres; projeto sem formatador e sem regra de comprimento. |
| `src/lib/messages.ts` (não existe) | Mensagens de erro do front escritas em 14 arquivos, sem catálogo único. |
| `e2e/` | Nenhum teste de acessibilidade por componente na suíte rápida; a verificação só existe no navegador. |
