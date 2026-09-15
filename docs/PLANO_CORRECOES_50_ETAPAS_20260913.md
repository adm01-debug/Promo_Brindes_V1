# Plano de melhorias e correções — 50 etapas — 13/09/2026

## Escopo e método

Plano de engenharia derivado de inspeção direta do commit `f20df4452f0d70f295154b0ba8bd9af8f8be64dd`, confrontado com a [revisão de fechamento de 12/09](REVISAO_FECHAMENTO_PLANOS_20260912.md).

Cada etapa declara **evidência** (arquivo:linha verificado), **entrega**, **aceite** e **verificação executável**. Nenhuma etapa é concluída por inspeção: exige teste que falha antes e passa depois.

Três achados desta rodada **não constavam** da revisão anterior e estão marcados `[NOVO]`: E04 (backend sem `strict`), E24 (`maxDuration` ausente na Vercel) e E03 (supressões de ESLint órfãs).

### Sequenciamento

As fases são ordenadas por dependência técnica, não por esforço. A Fase 0 é pré-requisito das demais porque nenhuma correção posterior tem rede de proteção sem ela. As Fases 2 e 3 devem ser concluídas **antes** de configurar credenciais reais de Resend/Meta — ativar provedores sobre a fila atual produz reenvio duplicado ao cliente final.

| Fase | Etapas | Tema | Bloqueia |
|---|---|---|---|
| 0 | 1–8 | Rede de proteção | Todas as demais |
| 1 | 9–13 | Sessão e dados pessoais (R08) | Nada; risco ativo em produção |
| 2 | 14–23 | Integridade da fila (R01–R04) | Ativação de provedores |
| 3 | 24–31 | Capacidade e entrega (R05–R07) | Ativação de provedores |
| 4 | 32–37 | Performance | Nada |
| 5 | 38–42 | Observabilidade | Aceite operacional |
| 6 | 43–47 | Qualidade e dependências | Nada |
| 7 | 48–50 | Dívida estrutural e governança | Nada |

---

## Fase 0 — Rede de proteção (etapas 1–8)

> Sem linter, sem `strict` no backend e sem cobertura, qualquer correção das fases seguintes é aplicada às cegas. Esta fase não altera comportamento de produto.

### Etapa 1 — Versionar os artefatos de auditoria pendentes

**Evidência:** oito arquivos não rastreados: `docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv`, `docs/REVISAO_FECHAMENTO_PLANOS_20260912.md` e `docs/audits/closure-review-20260912/` (6 arquivos). Nenhuma regra do `.gitignore` os cobre — nunca foram adicionados.

**Entrega:** commit dos oito arquivos. Varredura prévia confirmou que não há credencial real: o único match é o placeholder `sb_secret_${'x'.repeat(40)}` em `notifications.mjs:26`.

**Aceite:** `git status --porcelain` vazio; a matriz de 230 referências passa a ter histórico versionado.

**Verificação:** `git status --porcelain | wc -l` retorna `0`.

---

### Etapa 2 — Introduzir ESLint 9 com flat config

**Evidência:** não existe `eslint.config.js`, `.eslintrc*`, `biome.json` nem script `lint` em `package.json`. O projeto tem 11.658 linhas de TS/TSX sem análise estática além do compilador.

**Entrega:** `eslint.config.js` com `typescript-eslint` (type-aware, `projectService`), `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` e `eslint-plugin-jsx-a11y`. Regras iniciais como `error`: `no-floating-promises`, `no-misused-promises`, `await-thenable`, `react-hooks/exhaustive-deps`, `react-hooks/rules-of-hooks`.

**Aceite:** `npm run lint` executa sobre `src`, `api`, `scripts`, `tests`, `e2e`. Violações pré-existentes são corrigidas, não silenciadas por `ignorePatterns`.

**Verificação:** `npm run lint` sai com código 0.

**Risco:** `no-floating-promises` provavelmente acusará os `void import(...)` em `CustomerAuthContext.tsx:29` e `:41`. São intencionais — manter o `void` satisfaz a regra sem mudar comportamento.

---

### Etapa 3 — Reativar as três supressões órfãs de `exhaustive-deps` `[NOVO]`

**Evidência:** existem três `// eslint-disable-next-line react-hooks/exhaustive-deps` em `src/pages/CommemorativeDatesPage.tsx:196`, `src/components/QuoteDrawer.tsx:35` e `src/pages/CatalogPage.tsx:98` — **sem ESLint instalado**. São comentários mortos: suprimem uma regra que nunca rodou. As dependências desses três efeitos nunca foram validadas por ferramenta alguma.

**Entrega:** com a Etapa 2 ativa, cada supressão é reavaliada individualmente. Para cada uma: corrigir o array de dependências, ou manter a supressão **com comentário justificando por que a dependência omitida é deliberada**.

**Aceite:** zero supressões sem justificativa escrita. Toda supressão remanescente aponta o motivo e o efeito colateral evitado.

**Verificação:** `grep -rn 'eslint-disable' src/ api/` — cada ocorrência tem comentário adjacente explicando a exceção.

**Observação:** este é o achado de maior risco latente da Fase 0. Um `useEffect` com dependências incorretas em `CatalogPage` (a maior página do projeto, 552 linhas) pode produzir estado obsoleto em filtros, e nunca houve verificação automática.

---

### Etapa 4 — Ativar `strict` no `tsconfig.node.json` `[NOVO]`

**Evidência:** `tsconfig.app.json:11` declara `"strict": true`. O `tsconfig.node.json` **não declara `strict`** — confirmado por `tsc --showConfig`, que não emite a flag. Esse projeto cobre `api/**/*.ts`, `tests/api/**/*.ts`, `e2e/**/*.ts`, `vite.config.ts` e `playwright.config.ts`.

**Consequência:** todo o backend serverless — sete endpoints públicos e sete módulos em `api/_lib/` — compila com `strictNullChecks` desligado. `null` e `undefined` são atribuíveis a qualquer tipo, e parâmetros implícitos ganham `any`. O código que valida payloads de clientes anônimos é justamente o que tem a garantia de tipos mais fraca.

**Entrega:** adicionar `"strict": true` a `tsconfig.node.json` e corrigir os erros resultantes. Correção real, não `as` nem `!`.

**Aceite:** `npm run typecheck` aprovado com `strict` ativo nos dois projetos.

**Verificação:**
```bash
npx tsc -p tsconfig.node.json --showConfig | grep '"strict"'   # deve retornar true
npm run typecheck
```

**Risco:** esta é a etapa de maior volume de correções da fase. Executar isoladamente, em commit próprio, antes de qualquer mudança de comportamento no backend — caso contrário os erros de tipo se misturam aos defeitos funcionais das Fases 2 e 3.

---

### Etapa 5 — Endurecer os dois tsconfig — **concluída parcialmente em 14/09, com desvio registrado**

**Evidência:** nenhum dos dois tsconfig tinha `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` nem `noUncheckedIndexedAccess`.

**Desvio 1 — `noUnusedLocals`/`noUnusedParameters` não adotadas:** a Etapa 2 já configurou `@typescript-eslint/no-unused-vars` com `argsIgnorePattern`/`varsIgnorePattern: '^_'` cobrindo exatamente essa checagem, com suporte à convenção de descarte intencional que o compilador não reconheceria da mesma forma. Ativar as duas flags do `tsc` também criaria dois mecanismos concorrentes reportando a mesma classe de problema com regras de exceção diferentes. Decisão: ESLint é a única autoridade sobre variável não utilizada; as flags do compilador ficam de fora deliberadamente.

**Entrega efetivamente aplicada:** `noFallthroughCasesInSwitch: true` nos dois tsconfig. Testado: zero erros novos.

**`noUncheckedIndexedAccess` — medida e adiada, não pulada:** aplicada temporariamente nos dois projetos para medir o impacto real antes de decidir. Resultado: **61 erros em 19 arquivos** (destaque: `tests/api/lead-requests.test.ts` 8, `src/components/CampaignFinder.tsx` 8, `src/lib/search.ts` 7, `CatalogPage.tsx` 4, `QuoteDrawer.tsx` 4). Confirma a suspeita original — `api/notifications.ts:139` e `api/_lib/leadHandler.ts:60`, citados como exemplo, estão dentro desse universo. Revertida nesta rodada; fica como etapa própria, com o volume real já conhecido em vez de estimado, evitando descobrir o tamanho do trabalho apenas ao começá-lo.

**Aceite (revisado):** typecheck aprovado com `noFallthroughCasesInSwitch` nos dois projetos. `noUncheckedIndexedAccess` seguirá com o mesmo aceite (typecheck limpo) quando entrar como etapa dedicada, cada um dos 61 pontos corrigido individualmente — checagem, optional chaining ou asserção justificada, nunca `!` às cegas.

**Verificação:** `npm run typecheck`.

---

### Etapa 6 — `.editorconfig` e `.gitattributes` — **revisada durante a execução**

**Evidência:** nenhum normalizador configurado. O projeto é editado a partir do Windows via `\\wsl.localhost\` sobre um repositório em ext4, com `core.autocrlf=input`.

**Entrega:** `.editorconfig` com `end_of_line = lf` explícito e `.gitattributes` com `* text=auto eol=lf`, fixando a normalização independentemente da máquina.

**Aceite:** nenhum arquivo muda de line ending ao ser editado pelo Windows.

**Verificação:** `git diff --stat` vazio após reabrir arquivos no editor do Windows.

**Desvio registrado em 13/09, com evidência:** a etapa original também previa adotar Prettier com `--check` bloqueante no CI. Testado antes de aplicar — instalação real, `printWidth` elevado a 999 para não forçar quebra de linha, checagem contra a árvore inteira. Resultado: **99 de ~150 arquivos relevantes divergiram mesmo assim.** Inspeção de três amostras (`api/not-found.ts`, `src/pages/SetPasswordPage.tsx`, `api/notifications.ts`) mostrou que a causa não é largura de linha: o código usa um estilo manual deliberado e consistente — interfaces de um membro em uma linha, guards `if (...) { ...; return; }` compactos, JSX inteiro de um componente em uma única linha — que o Prettier reescreve destrutivamente porque ele reimprime pela própria AST e não preserva quebras manuais, independente do `printWidth`.

Adotar Prettier bloqueante exigiria reformatar ~99 arquivos só para introduzir a ferramenta, sem ganho de legibilidade — em alguns casos (ternário quebrado manualmente para leitura, recolhido pelo Prettier em uma linha de 160 caracteres) o resultado é **pior** que o original. É exatamente o retrabalho de baixo valor que este plano deveria evitar. Prettier foi desinstalado; a etapa mantém apenas `.editorconfig`/`.gitattributes`, que resolvem o problema real descrito na evidência (normalização de fim de linha entre Windows e WSL). Adotar um formatador de código no futuro é decisão de estilo da equipe, não uma correção técnica — não deve ser forçada por automação sem esse acordo prévio.

---

### Etapa 7 — Incluir lint no `check` e no CI

**Evidência:** `package.json` define `check` como `typecheck && test && build && check:performance-budget && test:e2e`. Não há lint. O workflow `quality.yml` roda `npm run check`, herdando a lacuna.

**Entrega:** inserir `npm run lint` como **primeiro** passo de `check` (falha em segundos, antes dos ~6 minutos de E2E). Sem `prettier --check` — revertido na Etapa 6.

**Aceite:** PR com violação de lint reprova no Quality gate.

**Verificação:** branch de teste com erro de lint deliberado reprova o check.

---

### Etapa 8 — Configurar cobertura com limiar

**Evidência:** `vite.config.ts:13-18` define o bloco `test` sem `coverage`. São 180 testes Vitest aprovados sem nenhuma medição de cobertura — não se sabe o que os 11.658 linhas realmente exercitam.

**Entrega:** `@vitest/coverage-v8` com provider `v8`, relatórios `text` e `lcov`, e `thresholds` iniciais calibrados **pela medição real** (medir primeiro, fixar o limiar no valor obtido menos uma margem, subir a cada etapa). Cobrir `src/**` e `api/**`.

**Aceite:** `npm run test -- --coverage` publica o relatório e reprova abaixo do limiar. Limiar registrado no PR com o número medido.

**Verificação:** `npm run test -- --coverage` e inspeção de `coverage/lcov-report/index.html`. `coverage` já está no `.gitignore`.

---

## Fase 1 — Sessão e dados pessoais: R08 (etapas 9–13) — **concluída em 14/09/2026**

Implementada integralmente: `src/lib/personalDataReset.ts` (contrato único de storage), `identityEpoch` em `CustomerAuthContext`, efeito de reset em `QuotePage` reagindo a `identityEpoch`, `AbortSignal` externo encadeado por `http.ts` → `quoteRequest.ts` → `QuotePage.tsx` para cancelar envio em andamento.

Verificação real, não apenas por leitura: `docs/audits/closure-review-20260912/logout.mjs` — o diagnóstico que antes reproduzia o defeito (`defectReproduced: true`) agora **falha em sua própria asserção de bug**, porque o e-mail retido é `''` em vez do e-mail do titular anterior. Três novos testes E2E em `e2e/smoke.spec.ts` cobrem logout em outra aba (reprodução direta do R08), saída na mesma aba, e logout durante envio em andamento — os três passaram em desktop e mobile Chromium, sem regressão nos 79 testes E2E pré-existentes nem nos 180 testes unitários.

Um desvio real de execução, registrado por transparência: duas das quatro tentativas iniciais de teste E2E falharam não por defeito no código, mas por dois erros de teste — `page.addInitScript` reexecuta a cada navegação da mesma página (mascarando a limpeza real como se tivesse falhado) e `page.close()` interrompe uma operação assíncrona (`signOut()`) ainda em voo. Ambos diagnosticados com instrumentação real antes de corrigir os testes, não o código de produto.

O cenário (b) do plano original ("troca direta A→B sem logout explícito") não foi implementado como E2E nesta rodada — depende de um comportamento específico do supabase-js (reconhecer uma troca de sessão via evento nativo `storage` sem uma chamada de `signOut()` real) que não foi verificado com confiança suficiente para um teste não-frágil. Fica como acompanhamento pontual, não como lacuna do fix em si — o mecanismo de `identityEpoch` já cobre esse caso pela mesma condição (`sessionUserId.current && sessionUserId.current !== nextUserId`) que dispara o logout comum.

> Risco ativo e sem dependência externa: em navegador compartilhado, dados de contato do titular anterior permanecem no formulário após logout e são regravados no storage.

### Etapa 9 — Contrato único de limpeza de dados pessoais

**Evidência:** hoje a limpeza está dispersa. `CustomerAuthContext.tsx:65-66` chama `clearQuoteDraft()` no `signOut`; `CustomerAuthContext.tsx:41` chama o mesmo em troca de titular; `QuotePage.tsx:94-95` e `:104-105` limpam `clearSubmissionAttempt`. Nenhum ponto limpa o estado React.

**Entrega:** módulo `src/lib/personalDataReset.ts` com uma função que enumera explicitamente tudo que deve ser invalidado em troca de titular: rascunho, tentativa de submissão, contexto de repetição, consentimento e estados React ativos. A seleção anônima é preservada **por contrato explícito e documentado**, não por omissão.

**Aceite:** um único módulo define o conjunto; adicionar um novo campo pessoal exige alterá-lo.

**Verificação:** teste unitário que percorre o contrato e falha se uma chave pessoal conhecida não estiver contemplada.

---

### Etapa 10 — Expor troca de titular como evento no contexto

**Evidência:** `CustomerAuthContext.tsx:37-46` detecta a troca via `onAuthStateChange` comparando `sessionUserId.current`, mas a reação é interna ao provider — importa `quoteDraft` diretamente (linha 41) e nenhum consumidor é notificado. Componentes montados não têm como saber que o titular mudou.

**Entrega:** acrescentar ao `CustomerAuthValue` um contador ou token de identidade (`identityEpoch`) que muda a cada troca de titular ou logout. Consumidores reagem por `useEffect` sobre esse valor.

**Aceite:** qualquer componente pode assinar a troca de titular sem acoplar-se ao storage.

**Verificação:** teste do contexto que simula `onAuthStateChange` A→B e confirma o incremento do epoch.

---

### Etapa 11 — Resetar os estados do QuotePage no logout

**Evidência — causa raiz do R08:** `QuotePage.tsx:55` e `:56-59` inicializam `contact` e `briefing` via `useState(savedDraft.contact)` — lidos **uma única vez** na montagem. `signOut` limpa o storage, mas os estados React permanecem. Em seguida, `QuotePage.tsx:89` (`saveQuoteDraft({ contact, briefing })`, no efeito das linhas 84-90) **regrava** o contato do titular anterior na primeira edição de qualquer campo.

**Entrega:** efeito que observa o `identityEpoch` da Etapa 10 e reinicializa `contact`, `briefing`, `errors`, `briefingErrors`, `website` e `quantityDrafts` para o estado vazio, aplicando o contrato da Etapa 9. Garantir que a reinicialização ocorra **antes** do efeito de gravação, evitando que o reset dispare uma regravação do valor antigo.

**Aceite:** após logout em outra aba, editar o campo empresa não regrava e-mail nem consentimento anteriores. `privacyAccepted` volta a `false` — consentimento nunca é herdado entre titulares.

**Verificação:** reproduzir `docs/audits/closure-review-20260912/logout.mjs`. O diagnóstico deve deixar de reproduzir o defeito e ser convertido em teste de regressão aprovado.

---

### Etapa 12 — Cancelar requisição em andamento no logout

**Evidência:** `QuotePage.tsx:70-71` mantém `submittingRef` e `requestAttemptRef`. Não há `AbortController` para o envio. Se o titular sai da conta durante uma submissão, a requisição conclui carregando os dados do titular anterior.

**Entrega:** `AbortController` no envio, abortado na troca de titular. Estado de UI tratado para o caso abortado — nem sucesso, nem erro de rede genérico.

**Aceite:** logout durante o envio aborta a requisição; o formulário não exibe sucesso de uma submissão de outro titular.

**Verificação:** teste E2E com resposta atrasada e logout no intervalo.

---

### Etapa 13 — Regressões E2E de troca de sessão

**Evidência:** `e2e/smoke.spec.ts` tem 38 testes e cobre axe em duas rotas (linhas 378 e 600), mas nenhum cenário de logout multi-aba. A revisão registra que o caso R08 escapou justamente por isso.

**Entrega:** quatro cenários E2E: (a) logout em outra aba seguido de edição; (b) troca direta A→B; (c) edição após logout na mesma aba; (d) término de requisição em andamento durante logout.

**Aceite:** os quatro cenários rodam nos projetos `desktop-chromium` e `mobile-chromium` e reprovam se a Etapa 11 for revertida.

**Verificação:** `npm run test:e2e`.

---

## Fase 2 — Integridade da fila de notificações: R01–R04 (etapas 14–23) — **concluída em 14/09/2026, com um desvio parcial registrado (Etapa 19)**

Implementada como uma migration aditiva coesa (`20260914120000_fix_notification_outbox_contract.sql`) mais a reescrita de `api/notifications.ts` — as dez etapas são interdependentes o bastante para não fazer sentido como dez migrations separadas.

**R04 (Etapas 15–16):** coluna `lease_token`, gerada a cada `claim_*` e exigida por `finalize_site_notification_delivery` (agora com `p_lease_token` obrigatório). A assinatura antiga foi **dropada explicitamente**, não apenas substituída — `create or replace` com uma assinatura diferente criaria uma segunda função, deixando a antiga órfã no catálogo.

**R03 (Etapas 17–18):** `claim_site_notification_deliveries` agora separa dois ramos antes ilegitimamente unidos pelo mesmo `attempts < 5`: jobs presos em `processing` com tentativas esgotadas são varridos para o novo estado terminal `exhausted`, incondicionalmente; jobs presos com tentativas restantes são genuinamente reclamados (nova tentativa, novo lease). A constraint de `status` foi expandida para incluir `exhausted`.

**R01 (Etapa 14):** `finalize()` agora retorna o boolean real do RPC; `false` (lease divergente ou linha já alterada) nunca é tratado como sucesso.

**R02/R21 (Etapas 19 e 21, unificadas):** nova função `record_site_notification_provider_acceptance`, chamada assim que o provedor aceita a mensagem, **antes** da finalização — persiste `provider`/`provider_message_id` mesmo que a finalização falhe em seguida. Os `claim_*` passam a devolver `existingProvider`/`existingProviderMessageId` quando presentes; `deliverJob` reconcilia (finaliza direto) em vez de reenviar quando os encontra. Isso cobre o WhatsApp mesmo sem uma chave de idempotência nativa da Graph API — a garantia vem do nosso próprio banco, não do provedor.

**Etapa 20:** `boolean` trocado por `DeliveryOutcome = 'delivered' | 'failed' | 'inconclusive'`; o handler e `deliverQuoteConfirmationsNow` foram atualizados para os três estados.

**Desvio registrado (Etapa 19):** a Graph API do WhatsApp não oferece um cabeçalho de idempotência nativo equivalente ao `Idempotency-Key` do Resend (confirmado por leitura da documentação disponível, não testado contra a API real). A garantia efetiva contra reenvio vem inteiramente da reconciliação da Etapa 21 (nosso próprio banco), não de uma chave enviada à Meta. Isso é suficiente para o cenário de retomada reproduzido (aceite → falha de finalização → nova tentativa), mas não é uma garantia simétrica à do e-mail — registrado como limite honesto, não como lacuna escondida.

**Verificação real:** migration aplicada via `supabase db reset` (do zero, igual ao CI) e `db lint` limpo. Suíte pgTAP ampliada de 17 para 29 asserções em `notification_outbox.test.sql` — cobre lease divergente, dupla finalização, job exaurido→exhausted e job recuperável→nova tentativa com novo lease; **130/130 pgTAP aprovados**. `tests/api/notifications.test.ts` ampliado de 6 para 9 testes, cobrindo o boolean falso (R01) e a reconciliação por e-mail e WhatsApp (R02/R19/R21); **183/183 testes unitários aprovados**. Build de produção ok.

Uma armadilha de teste real foi descoberta e corrigida durante a escrita do pgTAP: o trigger `notification_deliveries_set_updated_at` sobrescreve `updated_at` incondicionalmente em todo `UPDATE`, silenciando qualquer tentativa de simular um job "preso há 20 minutos" por SQL direto. A correção usa `alter table ... disable/enable trigger` ao redor do setup do teste — registrado aqui para quem escrever testes pgTAP parecidos depois.

> **Bloqueia a configuração de credenciais reais.** Ativar Resend ou Meta sobre a fila atual produz reenvio duplicado ao cliente final no cenário de retomada.

### Etapa 14 — Validar o retorno booleano da finalização (R01)

**Evidência:** `site-supabase/supabase/migrations/20260912170000_add_quote_notification_outbox.sql:147` retorna `v_updated = 1`. Em `api/notifications.ts:154`, `finalize()` chama `rpc<boolean>(...)` e **descarta o valor**. `deliverJob` (`:170-172`) retorna `true` incondicionalmente após um `finalize` que não lançou. Um `false` — nenhuma linha atualizada — é reportado como `sent`.

**Entrega:** `finalize()` retorna o booleano; `deliverJob` só considera sucesso quando a finalização confirma `true`. Um `false` é classificado como **inconclusivo** (Etapa 20), nunca como sucesso nem como falha simples.

**Aceite:** provedor aceita + RPC retorna `false` ⇒ o resultado **não** é `sent`.

**Verificação:** adaptar `docs/audits/closure-review-20260912/notifications.mjs`, que hoje reproduz o defeito, para teste de regressão em `tests/api/notifications.test.ts`.

---

### Etapa 15 — Emitir token de lease na reivindicação (R04)

**Evidência:** `claim_site_notification_deliveries` (migration, linhas 74-80) faz `attempts = delivery.attempts + 1` e devolve o job em `:81-102` sem qualquer identificador da reivindicação.

**Entrega:** migration **aditiva** que acrescenta `lease_token uuid` à tabela, gerado a cada claim e incluído no JSON retornado. Aplicar também a `claim_site_quote_notification` (migration, linha 151).

**Aceite:** cada reivindicação produz token distinto; o token trafega até o handler.

**Verificação:** pgTAP confirmando que duas reivindicações do mesmo job geram tokens diferentes.

**Restrição:** migration exclusivamente aditiva no Supabase isolado do site (`xlzmclcjdncjfdrjxclt`), conforme a política do repositório. Nenhuma alteração no projeto canônico Promo Gifts.

---

### Etapa 16 — Exigir o lease na finalização (R04)

**Evidência:** `finalize_site_notification_delivery` (migration, linha 145): `where delivery.id = p_delivery_id and delivery.status = 'processing'`. Não há verificação de tentativa. A revisão reproduziu localmente um trabalhador da tentativa 4 finalizando a reivindicação da tentativa 5.

**Entrega:** parâmetro `p_lease_token` obrigatório, comparado na cláusula `where`. Chamada de lease obsoleto retorna `false` sem escrever.

**Aceite:** finalização com token divergente não altera a linha e retorna `false`; o `false` é tratado conforme a Etapa 14.

**Verificação:** `site-supabase/supabase/tests/database/notification_outbox.test.sql`, cenário de retorno tardio. Reexecutar `docs/audits/closure-review-20260912/outbox.sql`.

**Nota:** os timeouts atuais (7s e 20s) são menores que a janela de recuperação de 10 minutos, o que torna o cenário improvável no fluxo usual — mas o contrato do banco não o impede, e a Etapa 24 revela que a função pode ser morta pela plataforma antes de qualquer timeout interno.

---

### Etapa 17 — Separar recuperação de `processing` do limite de tentativas (R03)

**Evidência:** migration, linha 66: `delivery.attempts < 5` aplica-se ao predicado inteiro, incluindo o ramo de recuperação da linha 69 (`status = 'processing' and updated_at <= now() - interval '10 minutes'`). Um job em `processing` com 5 tentativas **nunca** é reavaliado: fica preso indefinidamente, sem estado terminal e sem alerta.

**Entrega:** desmembrar o predicado — o limite de tentativas governa apenas a nova tentativa (`pending`/`failed`); `processing` expirado é sempre elegível a **reconciliação**, ainda que não a novo envio.

**Aceite:** job em `processing` com 5 tentativas e 20 minutos de inatividade é recuperado e atinge estado terminal ou de revisão.

**Verificação:** pgTAP reproduzindo exatamente o cenário descrito na revisão.

---

### Etapa 18 — Estado terminal para tentativa esgotada (R03)

**Evidência:** a tabela suporta `sent`, `failed`, `cancelled` (migration, linha 127). Não há estado que signifique "esgotou as tentativas e requer decisão humana".

**Entrega:** estado `exhausted` (ou `needs_review`), atribuído quando a recuperação da Etapa 17 encontra um job sem tentativas restantes. Jobs nesse estado saem da elegibilidade automática e entram no monitoramento da Etapa 29.

**Aceite:** nenhum job permanece em `processing` por mais de uma janela de recuperação.

**Verificação:** pgTAP mais consulta operacional que retorna zero jobs presos.

---

### Etapa 19 — Chave de idempotência no WhatsApp (R02)

**Evidência:** `api/notifications.ts:102` envia `Idempotency-Key: quote-${job.requestId}-customer-email` ao Resend. O POST à Meta (`:125-137`) **não tem equivalente**. Com aceite da Meta e falha de finalização, o job volta a ser elegível e o mesmo destinatário recebe a mesma mensagem: a revisão observou duas submissões idênticas ao provedor simulado.

**Entrega:** usar o mecanismo de deduplicação suportado pela Graph API para a versão em uso, derivado de `requestId` + canal (determinístico entre tentativas). Se a API não oferecer garantia adequada, a idempotência passa a ser responsabilidade da Etapa 21 e isso deve ser **registrado explicitamente** — não presumido.

**Aceite:** retomada após aceite não produz segunda submissão ao transporte.

**Verificação:** cenário de `notifications.mjs` que hoje observa duas submissões passa a observar uma.

**Limite honesto:** confirmar a janela e as garantias reais de deduplicação de cada provedor antes de anunciar entrega única. A unicidade da linha na fila **não** prova entrega única.

---

### Etapa 20 — Modelar o resultado inconclusivo

**Evidência:** `deliverJob` (`api/notifications.ts:161-178`) tem apenas dois desfechos booleanos. O comentário nas linhas 174-175 reconhece o caso ambíguo — provedor recebeu, finalização falhou — mas o tipo de retorno não o representa, e o `catch` da linha 173 o colapsa em `false`, que significa "falhou".

**Entrega:** trocar o `boolean` por união discriminada: `delivered | failed | inconclusive`, com o `provider_message_id` preservado no caso inconclusivo para permitir reconciliação.

**Aceite:** o caminho inconclusivo é distinguível nos logs e no banco; não realimenta reenvio automático.

**Verificação:** testes de API cobrindo os três desfechos.

---

### Etapa 21 — Reconciliação por identificador do provedor

**Evidência:** `sendEmail` (`:107`) e `sendWhatsApp` (`:141`) retornam o ID do provedor, persistido em `provider_message_id` apenas quando `p_status = 'sent'` (migration, linha 139). No caminho inconclusivo, o ID é **perdido**.

**Entrega:** persistir o ID do provedor assim que ele for conhecido, antes da finalização. A recuperação da Etapa 17, ao encontrar um job com ID de provedor registrado, reconcilia em vez de reenviar.

**Aceite:** job interrompido após aceite do provedor é fechado por reconciliação, sem nova chamada ao transporte.

**Verificação:** pgTAP mais teste de API do ciclo aceite → interrupção → recuperação.

---

### Etapa 22 — Matriz pgTAP de retomadas

**Evidência:** a suíte tem 118 testes pgTAP aprovados, 17 da fila, "sem matriz completa de retomadas" conforme registrado na revisão.

**Entrega:** matriz cobrindo interrupção antes do envio, depois do aceite e durante a finalização; lease obsoleto; tentativa esgotada em `processing`; e concorrência entre dois trabalhadores sobre o mesmo job.

**Aceite:** cada defeito R01–R04 tem ao menos um teste que reprova sem a respectiva correção.

**Verificação:** `npm run db:site:test`.

---

### Etapa 23 — Testes de API dos novos contratos

**Evidência:** `tests/api/notifications.test.ts` existe; a revisão registra seis testes de notificações entre os 180 do Vitest — insuficiente para os contratos das Etapas 14–21.

**Entrega:** ampliar a suíte cobrindo boolean `false` da finalização, lease divergente, os três desfechos da Etapa 20 e o caminho de reconciliação. `fetch` inteiramente simulado, sem provedor real.

**Aceite:** suíte reprova se qualquer correção da Fase 2 for revertida.

**Verificação:** `npm run test`.

---

## Fase 3 — Capacidade e entrega: R05–R07 (etapas 24–31) — **etapas 24, 25, 26, 28 concluídas em 14/09/2026; 27, 29, 30, 31 concluídas em 15/09/2026 (27 e 31 com default provisório) — Fase 3 completa**

**Etapa 24 concluída:** bloco `functions` em `vercel.json` com `maxDuration` explícito por rota, calculado a partir da soma real dos timeouts internos de cada handler (não estimado): `quote-requests` (catalogValidation 5s + siteDatabase 10s + confirmação 7s = 22s) → 30; `notifications` (orçamento total 25s, já contemplando a Etapa 28) → 30; demais rotas (10s ou 8s internos) → 15. Confirmado por `vercel project inspect` que o projeto pertence a um time (não conta pessoal Hobby, que não permite times) — plano Pro ou superior, cujo teto configurável de 300s comporta folgadamente todos os valores escolhidos.

Escrito como teste automatizado permanente (`tests/api/maxDuration.test.ts`), não só como cálculo manual: importa as constantes de timeout reais de cada módulo (exportadas para esse fim) e o `vercel.json`, e reprova se algum timeout interno deixar de caber sob o `maxDuration` declarado. Testado deliberadamente contra uma violação real (reduzi `quote-requests` para 20 e confirmei a falha) antes de aceitar como correto.

**Etapa 25 concluída:** `claim_site_notification_deliveries` agora é chamado com um `p_batch_size` calculado a partir do tempo restante (`remainingMs / MIN_TIME_PER_JOB_MS`), nunca maior que cabe no orçamento — em vez de reivindicar um lote fixo e abortar no meio.

**Etapa 28 concluída:** o handler drena lotes sucessivos em laço enquanto houver orçamento e o lote anterior tiver vindo cheio (sinal de backlog), em vez de se limitar a um único lote de 10 por invocação. Testado com um cenário de dois lotes (primeiro cheio, segundo vazio) confirmando drenagem real.

**Etapa 26 concluída:** `deliverQuoteConfirmationsNow` agora paraleliza os dois canais com `Promise.allSettled`, cada um com seu próprio `AbortController` de 7s — corrigindo o design anterior em que um único controller compartilhado podia zerar o orçamento do segundo canal. Testado provando a propriedade real (não apenas a ausência de erro): o WhatsApp é comprovadamente tentado enquanto o e-mail está deliberadamente bloqueado em um gate controlado pelo teste.

**Verificação:** 195/195 testes unitários (12 só em `notifications.test.ts`, mais 10 em `maxDuration.test.ts`), typecheck e lint limpos, build de produção ok.

**Verificação (etapas 27, 29 e 31, 15/09/2026):** 199/199 testes unitários (15 em `notifications.test.ts`, incluindo 4 novos cobrindo `reportQueueHealth` — fila saudável sem alerta, idade acima do limiar, `exhausted > 0`, e falha da própria consulta de saúde sem derrubar a resposta), 140/140 asserções pgTAP em `notification_outbox.test.sql` (10 novas cobrindo `site_notification_queue_health`, após `npm run db:site:reset` + `npm run db:site:test`), typecheck e lint limpos (`npm run lint`, `npm run typecheck`), build de produção e orçamento de performance ok (`npm run build`, `npm run check:performance-budget`).

**Etapa 27 (frequência do cron) — concluída em 15/09/2026, com default provisório:** o SLA de recuperação formal com o time comercial continua em aberto — esta correção não inventa uma decisão de negócio que não me cabe tomar. O que ela resolve é o defeito puramente técnico que a Etapa 27 também descrevia: a cadência anterior (`15 3 * * *`, uma vez por dia) era incompatível com o próprio backoff em minutos que `api/notifications.ts` já calcula (`retrySeconds`, até 86.400s = 24h no pior caso, mas normalmente muito menor) — um job que ficasse elegível de novo em 20 minutos só seria de fato tentado até 24h depois. Troquei para `*/15 * * * *` (a cada 15 minutos), o valor mínimo que o Vercel Cron aceita e que o plano do projeto (Team/Pro, confirmado por `vercel project inspect`) suporta. **Cálculo documentado (Aceite/Verificação da Etapa 27):** cada invocação já drena múltiplos lotes de 10 enquanto houver backlog e orçamento (Etapa 28), então a capacidade não é mais "10 mensagens por execução" — é "todo o backlog elegível que couber no orçamento de ~25s por execução, repetida a cada 15 min". Isso torna a frequência coerente com o backoff (nenhum job espera mais que ~15-30min para ser reconsiderado, contra até 24h antes) sem exigir conhecer o volume de pico real. **O que permanece pendente de negócio:** se 15 minutos é rápido o suficiente para o SLA que a empresa quer prometer ao cliente — isso é uma decisão de produto/comercial que nenhum cálculo de código resolve sozinho, e deve ser revisitada com o volume de pico real assim que houver dados de produção.

**Etapa 29 (monitoramento de idade da fila) — concluída em 15/09/2026:** nova função `public.site_notification_queue_health()` (`site-supabase/supabase/migrations/20260915090000_add_notification_queue_health.sql`), que devolve, por canal, a idade do job elegível mais antigo (`null` quando não há nenhum, nunca `0` — para não sugerir falsamente "criado agora") e a contagem de `exhausted` (Etapa 18). `api/notifications.ts` chama essa função ao final de cada invocação bem-sucedida (`reportQueueHealth()`, melhor esforço — uma falha aqui nunca derruba a resposta HTTP já concluída) e emite `console.error('site_notifications_queue_alert', ...)` quando a idade ultrapassa `QUEUE_AGE_ALERT_SECONDS` (45min = 3× a cadência da Etapa 27, tolerando até duas execuções perdidas) ou quando há qualquer `exhausted`. A integração com um canal de alerta de fato (PagerDuty, e-mail de oncall etc.) fica para a Etapa 41 — aqui o log de nível `error` já é o sinal ativo, na ausência dessa integração.

**Etapa 30 (webhooks de entrega/devolução) — concluída em 15/09/2026.** Dois endpoints novos (`api/notification-events-resend.ts`, `api/notification-events-whatsapp.ts`), únicos no diretório `api/` a usar o estilo moderno `fetch(request: Request)` da Vercel em vez do clássico `(request, response)` — decisão pesquisada, não assumida: os helpers clássicos (`request.body`/`.query`/`.cookies`) só desligam via `NODEJS_HELPERS=0`, uma env var de **projeto inteiro**, o que quebraria os outros dez endpoints; o estilo moderno convive arquivo a arquivo com o clássico e dá acesso aos bytes brutos do corpo, exigidos pela verificação HMAC de ambos os provedores. Nova migration (`20260915150000_add_notification_delivery_events.sql`) acrescenta `delivery_state`/`delivery_state_at`/`bounce_reason`/`complained_at` a `notification_deliveries` — colunas novas e independentes, não extensão do enum `status` (que já governa a máquina de estados do envio/retry; entrega/devolução é uma dimensão ortogonal, assíncrona, que acontece depois de `status='sent'`) — mais a tabela `notification_provider_events` (deduplicação por `unique (provider, provider_event_id)`) e a RPC `public.apply_site_notification_provider_event`, chamada pelos dois endpoints após a assinatura validar. `delivery_state` só grava se ainda `null` (primeiro evento vence, sem depender de clock do provedor) — um `bounced` atrasado chegando depois de um `delivered` já aplicado é ignorado e a função retorna `applied: false, reason: 'delivery_state_already_set'`, não silenciosamente `applied: true` sem efeito (gap encontrado e corrigido durante a implementação, coberto pelo pgTAP). **Os dois endpoints respondem `500` quando um evento assinado não pôde ser persistido**, para que o provedor possa reentregá-lo; a deduplicação do banco torna essa nova tentativa segura. Isso elimina a assimetria anterior baseada em uma premissa não verificada sobre a Meta.

**Etapa 31 (conteúdo do comprovante) — concluída em 15/09/2026, com default provisório:** a decisão formal de produto (resumo vs. cópia integral do briefing) continua em aberto — não me cabe decidir o escopo de conteúdo futuro. O que esta correção resolve é o defeito que a Etapa 31 também descrevia: a interface usava as palavras "Cópia"/"comprovantes", prometendo uma réplica do briefing que o e-mail e o WhatsApp nunca entregaram (e-mail: nome, protocolo, empresa e itens, sem ação/prazo/verba/observações; WhatsApp: só nome, protocolo e empresa). Troquei o texto da UI (`src/pages/QuotePage.tsx`) para "Confirmação de envio"/"Confirmação [...] registrada para envio", que descreve com precisão o que já é enviado hoje — sem alterar o conteúdo dos canais. **O que permanece pendente de produto:** se o comprovante deve evoluir para cópia integral (exigindo, entre outras coisas, pré-aprovação de um novo template pela Meta para o WhatsApp) ou permanecer resumido — essa escolha de conteúdo/produto continua em aberto e deve ser revisitada formalmente.

### Etapa 24 — Declarar `maxDuration` das funções na Vercel `[NOVO]`

**Evidência:** `vercel.json` **não possui bloco `functions`** — confirmado por inspeção das 84 linhas do arquivo. Portanto todas as funções usam o `maxDuration` padrão da plataforma. Enquanto isso, `api/notifications.ts:6` declara `REQUEST_TIMEOUT_MS = 20_000` e o aplica em `:231`.

**Consequência:** o AbortController de 20 segundos **nunca chega a disparar** se o padrão da plataforma for menor. A plataforma encerra a invocação primeiro, sem executar o `finally` da linha 244 e sem finalizar os jobs já reivindicados. Esses jobs ficam em `processing` — e, ao atingirem a quinta tentativa, tornam-se exatamente os jobs irrecuperáveis do R03.

Este é o elo que fecha o ciclo: o R03 descreve o sintoma no banco; a ausência de `maxDuration` é um dos mecanismos que o produz em produção. A revisão de 12/09 não registrou este ponto.

**Entrega:** bloco `functions` no `vercel.json` declarando `maxDuration` explícito por rota, com folga sobre o timeout interno de cada handler (`api/notifications.ts` é o caso crítico com 20s; `retention`, `customer-proposals` e `siteDatabase` usam 10s; `sitemap` e `publicProductPage`, 8s). Confirmar o teto real permitido pelo plano contratado da Vercel e, se o teto for inferior a 20s, **reduzir o timeout interno** para caber — nunca deixar o interno maior que o da plataforma.

**Aceite:** para todo handler, `timeout interno < maxDuration declarado`. Relação registrada em comentário no `vercel.json`.

**Verificação:** teste que lê `vercel.json` e as constantes de timeout de `api/**` e reprova se algum interno for maior ou igual ao declarado. Confirmar no painel da Vercel que o `maxDuration` aplicado corresponde ao declarado.

---

### Etapa 25 — Orçamento de tempo por job, não por lote

**Evidência:** `api/notifications.ts:230-239` cria **um** `AbortController` para todo o lote e itera sequencialmente sobre até dez jobs (`BATCH_SIZE = 10`, linha 5). Os últimos jobs herdam um sinal possivelmente já abortado — a revisão registra o risco e anota que o esgotamento não foi simulado.

**Entrega:** orçamento de tempo por job, derivado do tempo restante do lote. Job que não couber no orçamento restante **não é reivindicado**, em vez de ser reivindicado e abortado.

**Aceite:** nenhum job é marcado como falha por um sinal abortado que ele nunca teve chance de usar.

**Verificação:** teste com transporte lento que confirma parada limpa em vez de cascata de falhas.

---

### Etapa 26 — Timeout por canal na confirmação imediata

**Evidência:** `deliverQuoteConfirmationsNow` (`:191-192`) cria um `AbortController` de 7 segundos e o compartilha pelo laço sequencial das linhas 194-202, que percorre até dois canais. Se o e-mail consumir 6 segundos, o WhatsApp fica com 1.

**Entrega:** orçamento por canal, ou paralelização com `Promise.allSettled` sob orçamento individual. O caminho síncrono não pode degradar o segundo canal por lentidão do primeiro.

**Aceite:** lentidão do e-mail não converte o WhatsApp em `pending` por falta de tempo.

**Verificação:** teste com e-mail lento e WhatsApp rápido, confirmando ambos como `sent`.

**Contexto:** o valor de 7s precisa caber no `maxDuration` de `/api/quote-requests` (Etapa 24), pois `deliverQuoteConfirmationsNow` é chamada de forma síncrona a partir de `api/_lib/leadHandler.ts:112`, dentro da requisição do cliente.

---

### Etapa 27 — Frequência do cron compatível com o SLA

**Evidência:** `vercel.json:5` agenda `/api/notifications` em `15 3 * * *` — uma vez por dia. Com `BATCH_SIZE = 10` e sem drenagem, cem mensagens acumuladas exigem dez dias. O backoff de `api/notifications.ts:153` calcula elegibilidade em minutos, mas não existe agendamento em minutos que a honre.

**Entrega:** definir o SLA de recuperação com o negócio e ajustar a frequência. A cadência precisa ser coerente com o backoff — caso contrário o cálculo de `retrySeconds` é decorativo.

**Aceite:** SLA escrito; frequência comprovadamente compatível com o pico esperado; nenhuma comunicação promete recuperação mais rápida do que a configuração entrega.

**Verificação:** cálculo documentado (volume de pico × tamanho do lote × frequência) revisado no PR.

**Resolvida em 15/09/2026, com default provisório:** ver detalhamento e cálculo documentado no resumo da Fase 3, no topo desta seção. Resumo: `*/15 * * * *`, o mínimo aceito pelo Vercel Cron no plano do projeto; SLA formal com o comercial continua pendente.

---

### Etapa 28 — Drenagem de múltiplos lotes por invocação

**Evidência:** `:233` reivindica **um** lote e o laço `:236-239` o processa. Não há repetição enquanto houver backlog e tempo.

**Entrega:** laço externo que drena lotes sucessivos enquanto houver orçamento de tempo (Etapa 25) e jobs elegíveis, com teto por invocação.

**Aceite:** invocação única esvazia backlog dentro do orçamento, em vez de limitar-se a dez mensagens.

**Verificação:** teste com 25 jobs pendentes confirmando drenagem em uma invocação.

---

### Etapa 29 — Monitoramento de idade da fila

**Evidência:** `:240` registra `console.info('site_notifications_completed', ...)` com contagens do lote. Não há métrica da **idade** do item mais antigo nem alerta de acúmulo. Com cron diário, um acúmulo passa despercebido por dias.

**Entrega:** métrica de idade do job mais antigo por canal; contagem em `exhausted` (Etapa 18); alerta quando qualquer uma ultrapassar o limite do SLA da Etapa 27. Sem conteúdo pessoal nos logs — o padrão atual da linha 240, que registra apenas contagens e canais, deve ser mantido.

**Aceite:** acúmulo ou job preso gera alerta ativo, não descoberta manual.

**Verificação:** injetar job antigo em ambiente local e confirmar o disparo.

**Concluída em 15/09/2026:** ver detalhamento no resumo da Fase 3, no topo desta seção. Job antigo injetado em teste isolado (pgTAP: job com whatsapp atrasado ~20min e email `exhausted`) confirma o disparo esperado; Vitest confirma o `console.error` correspondente no lado do handler.

---

### Etapa 30 — Webhooks de entrega e devolução (R07)

**Evidência:** o inventário de `api/` tem onze endpoints; **nenhum** é webhook de provedor. Hoje, HTTP aceito com ID (`:106`, `:140`) resulta em `sent`. Não há estado de entregue nem devolvido, e o aceite de bounce do LK45 não é satisfeito.

**Entrega:** endpoint de webhook com **validação de assinatura**, deduplicação e ordenação de eventos; estados distintos de aceite, entrega, devolução e reclamação. Um endpoint sem verificação de assinatura é superfície de abuso e não deve ser publicado.

**Aceite:** ciclo aceite → entrega → devolução refletido no banco e validado com destinatários controlados.

**Verificação:** testes de API com payloads assinados válidos e inválidos; teste com destinatário de devolução controlado.

**Concluída em 15/09/2026:** ver detalhamento no resumo da Fase 3, no topo desta seção. `tests/api/webhookSignature.test.ts` (11 testes) cobre as duas funções de verificação isoladamente com HMACs reais (não simulados): assinatura válida, múltiplas assinaturas `v1,` no header do Svix (rotação de segredo), corpo adulterado, segredo errado, timestamp fora da tolerância de replay, campos ausentes. `tests/api/notification-events-resend.test.ts` (10 testes) e `tests/api/notification-events-whatsapp.test.ts` (10 testes) cobrem cada endpoint com requisições `Request` assinadas de verdade: mapeamento de tipos de evento, tipos fora de interesse ignorados sem tocar o banco, assinatura ausente/inválida rejeitada antes de qualquer chamada ao banco, timestamp velho, falha de RPC com `500` para permitir reentrega segura, handshake `GET` de verificação da Meta. `site-supabase/supabase/tests/database/notification_provider_events.test.sql` (27 asserções pgTAP, novo) cobre a RPC: primeiro evento aplica; reentrega do mesmo `provider_event_id` é no-op; `bounced` após `delivered` já aplicado não regride o estado e retorna motivo explícito; `complained` aplica independentemente do `delivery_state`; `provider_message_id` desconhecido não aplica mas grava o evento (dedup de reentregas futuras); validação de entrada rejeita `provider`/`event_type` fora do conjunto aceito, e campos vazios/longos demais. Resultado: 234/234 testes Vitest, 167/167 asserções pgTAP, `npm run lint` e `npm run typecheck` limpos, `npm run build` + `npm run check:performance-budget` ok. `vercel.json` declara `maxDuration: 15` para os dois endpoints novos (não 10, como o rascunho inicial previa) — `SITE_DATABASE_TIMEOUT_MS` já é 10s, e o teste de orçamento do projeto (Etapa 24) exige margem estrita acima do timeout interno, não igualdade. **O que permanece pendente, fora do alcance deste código:** o critério de aceite original pede validação "com destinatários controlados", que exige credenciais reais de provedor e uma URL de callback publicamente acessível configurada nos painéis do Resend e da Meta — um passo operacional de deploy, não algo que a suíte de testes deste ambiente de desenvolvimento possa satisfazer sozinha.

---

### Etapa 31 — Definir o conteúdo do comprovante (R06)

**Evidência:** `:92-99` monta e-mail com nome, empresa, protocolo, itens, quantidades e cores — **sem** ação, prazo, verba, observações e contexto. `:132-134` envia ao template da Meta apenas nome, protocolo e empresa; a lista de produtos não integra o payload. A interface, porém, sugere confirmação do briefing.

**Entrega:** decidir formalmente entre comprovante resumido e cópia integral. Escolhido o resumo, **ajustar o texto da interface** para corresponder. Escolhida a cópia, incluir os campos acordados ou oferecer acesso autenticado ao conteúdo, com privacidade e versionamento.

**Aceite:** o que a interface promete é o que o cliente recebe, por canal.

**Verificação:** revisão conjunta de produto e conteúdo; teste que compara os campos prometidos na UI com os efetivamente enviados.

**Resolvida em 15/09/2026, com default provisório:** ver detalhamento no resumo da Fase 3, no topo desta seção. A revisão conjunta de produto/conteúdo sobre resumo vs. cópia integral continua pendente; o que foi corrigido é a promessa desalinhada da palavra "Cópia" com o conteúdo real hoje entregue.

---

## Fase 4 — Performance (etapas 32–37)

### Etapa 32 — Carregar GSAP sob demanda

**Evidência:** `gsap` está no bundle de entrada — `dist/assets/index-COB8q88v.js` contém a biblioteca. É usada **exclusivamente** por `src/components/FoldText.tsx` (linhas 2, 124, 125, 128, 154), um efeito tipográfico decorativo. Todo visitante baixa a biblioteca de animação no caminho crítico, inclusive quem nunca vê o componente.

**Entrega:** importar GSAP dinamicamente dentro de `FoldText`, com fallback estático sem animação enquanto carrega — e permanentemente sob `prefers-reduced-motion`.

**Aceite:** GSAP sai do chunk de entrada; a página renderiza o texto legível antes de a animação carregar.

**Verificação:** `npm run build && grep -l gsap dist/assets/index-*.js` não retorna resultado.

---

### Etapa 33 — Recuperar folga no bundle de entrada

**Evidência:** o bundle de entrada tem **362.565 bytes** contra um orçamento de 380 KiB (`scripts/check-performance-budget.mjs:29`) — folga de 4,6%. Qualquer funcionalidade nova reprova o orçamento. O chunk `createLucideIcon-9-Lt1dDQ.js` soma 41.409 bytes.

**Entrega:** após a Etapa 32, analisar a composição do chunk de entrada e mover o que não for crítico para carregamento por rota. Meta: folga mínima de 20%.

**Aceite:** entrada abaixo de 300 KiB brutos, com orçamento reduzido na mesma medida para travar o ganho.

**Verificação:** `npm run build && npm run check:performance-budget`.

---

### Etapa 34 — Medir o orçamento em bytes comprimidos

**Evidência:** `scripts/check-performance-budget.mjs:10` usa `stat().size` — bytes **brutos**. O navegador transfere Brotli. O orçamento mede uma grandeza que ninguém baixa, superestimando o peso real e mascarando regressões de compressibilidade.

**Entrega:** medir também o tamanho Brotli de cada asset e aplicar orçamentos separados para bruto (custo de parse) e comprimido (custo de rede).

**Aceite:** o script informa e limita as duas grandezas.

**Verificação:** `npm run check:performance-budget` exibe ambas.

---

### Etapa 35 — Revisar o peso do CSS

**Evidência:** `dist/assets/index-CdAS_n0j.css` tem **161.237 bytes** contra orçamento de 180 KiB (`:27`) — folga de 10%. Todo o CSS vem de um único `src/styles.css`, apesar de `cssCodeSplit: true` em `vite.config.ts:11`.

**Entrega:** identificar regras não utilizadas e avaliar divisão do CSS por rota, aproveitando o `cssCodeSplit` já ativo.

**Aceite:** CSS crítico reduzido sem regressão visual nos quatro projetos Playwright.

**Verificação:** `npm run test:e2e && npm run test:e2e:cross-browser`.

---

### Etapa 36 — Verificar o tree-shaking do lucide-react

**Evidência:** `lucide-react` está fixado em `1.23.0` (exato, sem `^` — único caso no `package.json`) e produz um chunk de 41.409 bytes. Convém confirmar se apenas os ícones usados entram no bundle.

**Entrega:** auditar os pontos de importação; garantir importação nomeada por ícone. Documentar o motivo da fixação exata — se for defeito conhecido da versão, registrar no `package.json`; se for arbitrária, alinhar ao `^` das demais dependências.

**Aceite:** o chunk contém apenas ícones efetivamente referenciados; a fixação tem justificativa escrita.

**Verificação:** inspeção do chunk após build.

---

### Etapa 37 — Métricas de campo (Core Web Vitals)

**Evidência:** `@vercel/analytics` está nas dependências e `scripts/check-performance-budget.mjs:26` afirma explicitamente que o orçamento "não substitui Core Web Vitals reais". A revisão confirma ausência de medição de campo.

**Entrega:** ativar a coleta de Web Vitals reais e estabelecer linha de base de LCP, INP e CLS antes das Etapas 32–35, para que o ganho seja demonstrável.

**Aceite:** painel com série histórica; ganhos das etapas anteriores visíveis em dados de campo.

**Verificação:** comparação antes/depois no painel.

---

## Fase 5 — Observabilidade (etapas 38–42)

### Etapa 38 — Erro 500 deixa de ser silencioso

**Evidência:** `api/_lib/leadHandler.ts:118-124` — o `catch` final devolve `500 internal_error` **sem nenhum log**. Um erro não previsto no fluxo de captação de leads não deixa rastro algum. Este é o endpoint que recebe todos os orçamentos do site.

**Entrega:** log estruturado antes de responder 500, com classe do erro, rota, timestamp e identificador de correlação — **sem dados pessoais**, seguindo o padrão já adotado em `api/notifications.ts:240`.

**Aceite:** todo 500 produz exatamente uma entrada de log correlacionável à resposta.

**Verificação:** teste de API que força erro inesperado e confirma a emissão do log.

---

### Etapa 39 — Instrumentar os `catch` silenciosos

**Evidência:** vários blocos descartam o erro sem registro: `api/notifications.ts:167` (`catch { /* processing expirará */ }`), `:173-177`, `:203-205` (`catch { }` que engole toda falha da confirmação imediata) e `src/context/CustomerAuthContext.tsx:48`.

**Entrega:** cada `catch` silencioso passa a registrar em nível apropriado. A decisão de **não propagar** o erro é preservada — o que muda é deixar de perder a informação.

**Aceite:** nenhum `catch` descarta erro sem log ou métrica.

**Verificação:** regra de lint (`no-empty`, com `allowEmptyCatch: false`) mais revisão manual dos comentários justificativos.

---

### Etapa 40 — Identificador de correlação fim a fim

**Evidência:** `api/_lib/leadHandler.ts:97` já lê o header `idempotency-key` e `normalizedPayload.clientRequestId`. Não há, porém, um identificador de correlação que atravesse requisição, persistência e fila de notificações.

**Entrega:** propagar um identificador de correlação da requisição até os logs da fila, permitindo reconstruir o ciclo completo de um orçamento.

**Aceite:** dado um protocolo, é possível recuperar toda a cadeia nos logs.

**Verificação:** exercício de rastreamento em ambiente local.

---

### Etapa 41 — Alertas do cron

**Evidência:** `vercel.json:3-6` define dois crons (`/api/retention` e `/api/notifications`). O handler devolve `503 notification_delivery_unavailable` (`api/notifications.ts:243`) em falha, mas nada alerta quando o cron falha repetidamente ou deixa de executar. A revisão aponta que o histórico de execução ainda precisa ser verificado.

**Entrega:** alerta para falha consecutiva e para ausência de execução na janela esperada, cobrindo os dois crons.

**Aceite:** cron que para de executar gera alerta em uma janela, não na auditoria seguinte.

**Verificação:** simular falha e confirmar o disparo.

---

### Etapa 42 — Relato de erros do frontend

**Evidência:** `src/components/AppErrorBoundary.tsx:19` faz apenas `console.error`. Erro em produção fica no console do visitante e nunca chega à equipe.

**Entrega:** encaminhar exceções capturadas a um coletor, com amostragem e **sem dados pessoais**. Respeitar o CSP vigente (`vercel.json:64`): o `connect-src` está restrito a três origens e precisará incluir explicitamente o coletor escolhido.

**Aceite:** erro de interface em produção gera evento consultável.

**Verificação:** erro deliberado em preview aparece no painel; CSP não bloqueia o envio.

---

## Fase 6 — Qualidade e dependências (etapas 43–47)

### Etapa 43 — Atualização escalonada de dependências

**Evidência:** `npm audit` reporta **zero vulnerabilidades** — a postura de segurança está boa. Há, porém, defasagem relevante: `typescript` 5.9.3 → 7.0.2 (duas majors), `vitest` 4.1.11 → 5.0.0, `jsdom` 29.1.1 → 30.0.1, `lucide-react` 1.23.0 → 1.45.0, `@testing-library/jest-dom` 6.9.1 → 7.0.1, `react`/`react-dom` 19.2.8 → 19.3.0, `vite` 8.2.2 → 8.3.0.

**Entrega:** três ondas, cada uma em PR próprio: (a) patches e minors — React 19.3, Vite 8.3, `@types/*`; (b) majors de ferramenta de teste — Vitest 5, jsdom 30, jest-dom 7; (c) TypeScript 7, isoladamente, após a Etapa 4, pois `strict` no backend altera o conjunto de erros.

**Aceite:** cada onda passa `npm run check` completo antes da seguinte.

**Verificação:** `npm run check` por onda.

**Ordem obrigatória:** TypeScript 7 **depois** da Etapa 4. Ativar `strict` e trocar de major simultaneamente torna impossível atribuir cada erro à sua causa.

---

### Etapa 44 — Atualização automatizada de dependências

**Evidência:** não há `.github/dependabot.yml` nem configuração de Renovate. As três defasagens de major indicam ausência de processo contínuo.

**Entrega:** Dependabot para `npm` e `github-actions`, agrupando patches e minors, com majors em PR individual. O agrupamento evita ruído sem esconder mudanças que exigem leitura.

**Aceite:** PRs automáticos com CI verde; nenhuma major entra sem revisão.

**Verificação:** primeiro ciclo semanal abre PRs corretamente agrupados.

---

### Etapa 45 — Análise estática de segurança no CI

**Evidência:** `quality.yml` já faz o essencial — actions fixadas por SHA, `permissions: contents: read`, `npm audit --audit-level=high` e rejeição de sourcemaps em produção. Falta análise de código e revisão de dependências em PR.

**Entrega:** CodeQL para JavaScript/TypeScript e `dependency-review-action` nos PRs. Acrescentar `concurrency` a `database.yml` e `graphify.yml`, que hoje não o têm — apenas `quality.yml` o declara, e sem isso pushes seguidos desperdiçam execuções.

**Aceite:** PR com dependência vulnerável ou padrão inseguro reprova antes do merge.

**Verificação:** PR de teste com dependência vulnerável conhecida reprova.

---

### Etapa 46 — Resolver o check Supabase Preview

**Evidência:** a revisão de 12/09 registra que `validate`, `cross-browser`, `Migrations and pgTAP` e Graphify estão aprovados, mas **Supabase Preview falhou**, com causa atual não resolvida. Confirmei que os três workflows do repositório estão verdes no HEAD — logo, o check que falha é da integração externa, fora de `.github/workflows/`.

**Entrega:** diagnosticar a causa na integração Supabase↔GitHub e corrigi-la na origem.

**Aceite:** check aprovado por execução real.

**Verificação:** `gh pr checks` em PR novo.

**Restrição:** a revisão anterior é explícita — não alterar ledger de migrations para fabricar aprovação. Um check verde obtido por manipulação de histórico é pior que um check vermelho honesto.

---

### Etapa 47 — Acessibilidade além do axe

**Evidência:** `e2e/smoke.spec.ts` aplica `AxeBuilder` com `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` e `wcag22aa` em duas rotas (linhas 378 e 600). A revisão registra ausência de leitores de tela e dispositivos físicos. Varredura automática cobre parte do WCAG, não a experiência real.

**Entrega:** estender o axe às rotas ainda não cobertas e executar roteiro manual com NVDA ou VoiceOver nos fluxos de orçamento, login e seleção compartilhada. Adicionar `eslint-plugin-jsx-a11y` (Etapa 2) para detecção em tempo de edição.

**Aceite:** roteiro manual documentado com achados e correções; rotas principais cobertas por axe.

**Verificação:** `npm run test:e2e` mais relatório do roteiro manual.

---

## Fase 7 — Dívida estrutural e governança (etapas 48–50)

### Etapa 48 — Decompor os módulos de maior superfície

**Evidência:** `src/pages/CatalogPage.tsx` tem **552 linhas** e concentra uma das três supressões órfãs de `exhaustive-deps` (linha 98). Seguem `src/lib/catalog.ts` (492), `api/_lib/contracts.ts` (374) e `src/pages/CommemorativeDatesPage.tsx` (340, também com supressão na linha 196).

**Entrega:** extrair lógica de estado e filtragem de `CatalogPage` para hooks testáveis isoladamente. Decomposição orientada por testabilidade — a justificativa de cada extração é permitir um teste que hoje não é possível escrever.

**Aceite:** nenhuma página acima de 300 linhas; lógica extraída com cobertura própria; comportamento idêntico verificado por E2E.

**Verificação:** `npm run test && npm run test:e2e`.

**Nota:** fazer **depois** da Etapa 3. Refatorar um efeito cujas dependências nunca foram validadas é reescrever sobre terreno não verificado.

---

### Etapa 49 — Fechar as 12 referências ausentes por lotes coerentes

**Evidência:** a revisão classifica 12 referências como ausentes, agrupadas em 11 linhas (UX65 e LK43 tratam do mesmo upload). Onze outras dependem de material, pesquisa ou operação externa.

**Entrega:** três lotes por afinidade técnica, não por plano de origem:
- **Upload privado** (UX65/LK43): tipo, tamanho, upload autorizado, vínculo ao pedido, remoção e retenção — deve reusar a política de retenção já existente em `20260911130000_add_site_data_retention.sql`.
- **Composição de kits** (LK27/LK28/LK29): componentes, configurador e aritmética (100 kits × 2 cadernos = 200 cadernos), com contratos próprios de validação.
- **Continuidade e sincronização** (UX59/UX60): propriedade por conta, versões, conflitos e arquivar/restaurar.

UX34 (conjunto julgado de busca), UX84, LK10, GR40 e GR44 dependem de curadoria ou benchmark e seguem trilha separada.

**Aceite:** cada lote entrega código, testes, ativação e evidência operacional. Nenhum item é declarado pronto sem os quatro.

**Verificação:** atualização da matriz de 230 referências com evidência por linha.

---

### Etapa 50 — Governança do ledger de fechamento

**Evidência:** o repositório acumula planos sobrepostos — UX 100, Lukka 50, Graphify 50, Área do Cliente 30 — e a revisão registra que as listas literais de 50 etapas de catálogos e de datas comemorativas **não foram recuperadas no repositório**. A revisão também alerta contra calcular percentual global de produto pronto a partir de 230 referências com sobreposição.

**Entrega:** consolidar a matriz como fonte única de estado, com atualização obrigatória no PR que altera o estado de uma referência. Registrar formalmente a decisão sobre os quatro desvios do Graphify (GR14 não direcionado, GR24 vizinhança em vez de dependentes direcionais, GR26 reconstrução total, GR30 hooks não instalados): ou a alternativa é aceita e documentada como especificação vigente, ou a especificação original entra no backlog. Deixá-los como "alternativa" indefinidamente mantém dívida sem dono.

**Aceite:** estado de qualquer referência consultável na matriz sem reabrir auditoria completa; os quatro desvios com decisão registrada e datada.

**Verificação:** revisão trimestral confirmando que a matriz corresponde ao código.

---

## Resumo executivo

| Prioridade | Etapas | Justificativa |
|---|---|---|
| **Imediata** | 1–8 | Sem linter, `strict` no backend e cobertura, toda correção subsequente é feita às cegas |
| **Imediata** | 9–13 | R08 é exposição de dados pessoais ativa em navegador compartilhado, sem dependência externa |
| **Antes dos provedores** | 14–31 | Ativar Resend/Meta sobre a fila atual gera reenvio duplicado ao cliente final |
| **Contínua** | 32–47 | Performance, observabilidade e qualidade, sem bloqueio mútuo |
| **Planejada** | 48–50 | Dívida estrutural e governança do estado do produto |

### Três achados novos desta rodada

1. **Etapa 4** — todo o backend serverless compila sem `strict`. O código que valida entrada de clientes anônimos é o que tem a garantia de tipos mais fraca do projeto.
2. **Etapa 24** — `maxDuration` não declarado na Vercel contra um timeout interno de 20s. Fecha o ciclo causal do R03: explica **como** jobs chegam ao estado `processing` irrecuperável em produção.
3. **Etapa 3** — três supressões de `exhaustive-deps` ativas sobre um linter inexistente. As dependências desses efeitos nunca foram verificadas por ferramenta alguma.

### O que este plano não faz

Não substitui pesquisa com compradores (UX20/91, LK02), não produz material autorizado (UX26/28, LK03/31–34/40), não configura credenciais de provedores e não demonstra recebimento real de mensagens. Essas dependências são externas ao código e permanecem conforme registrado na revisão de 12/09. Mesmo após resolvê-las, as entregas ausentes da Etapa 49 continuam pendentes.

Nenhuma etapa deste plano foi executada. Este documento é um plano, não um relatório de execução.
