# Diagnósticos do fechamento dos planos

Commit auditado: `f20df4452f0d70f295154b0ba8bd9af8f8be64dd` (12/09/2026).

Estes scripts são evidências de revisão, não correções. Não carregam credenciais reais, enviam mensagens ou executam SQL remoto. O código da aplicação permanece intacto.

## Notificações — transporte simulado

Na raiz do projeto:

```sh
node docs/audits/closure-review-20260912/notifications.mjs
```

Executa a implementação real de notificações após transpilar TypeScript, substituindo todo `fetch`. O ambiente é preenchido com valores sintéticos. Resultados observados:

- R01: RPC de finalização responde `false`; função devolve `email: sent`.
- R02: aceite do primeiro envio simulado seguido de erro na finalização; nova elegibilidade simulada produz segundo POST idêntico de WhatsApp.
- R06: template recebe três parâmetros; não recebe a lista de produtos.

O teste R02 simula a elegibilidade da segunda reivindicação; não testa uma entrega real da Meta nem a espera de dez minutos no banco.

## Outbox — banco local com rollback

Pré-requisito: container local `supabase_db_site-promo-brindes` existente e migrations do commit aplicadas. Não substitua por endereço remoto. Não é necessário resetar o banco.

```sh
docker exec -i supabase_db_site-promo-brindes psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -At < docs/audits/closure-review-20260912/outbox.sql
```

O script cria fixtures com IDs exatos dentro de uma transação. Ao terminar, executa `ROLLBACK`; encerramento da conexão também reverte a transação em caso de erro. A reivindicação de lote pode tocar registros locais preexistentes dentro dessa transação, mas não persiste alterações e não chama o provedor.

Resultados observados:

```json
{"id":"R03","status":"processing","claimed":false,"attempts":5,"scenario":"fifth_attempt_crash"}
{"id":"R04","scenario":"old_worker_can_finalize_new_claim","newAttempt":5,"oldCallAccepted":true}
```

## Logout — navegador local com Auth simulado

Pré-requisitos: Chromium do Playwright e build `dist` da aplicação auditada. Para uma nova reprodução, gerar com as flags de teste explicitadas em `playwright.config.ts`, incluindo Auth público sintético do projeto isolado. O diagnóstico não recompila automaticamente nem lê `.env`.

```sh
node docs/audits/closure-review-20260912/logout.mjs
```

O script abre seu próprio preview na porta local 4193 com `strictPort`, duas abas e interceptação de todos os hosts externos; usa o logout do SDK. Não há conta real nem backend real.

Resultado observado:

```json
{"id":"R08","environment":"local-browser-mocked-auth","loggedOut":true,"draftWasCleared":true,"emailRemainsInForm":true,"consentRemainsInForm":true,"oldContactRepersistedAfterEditing":true,"defectReproduced":true}
```

O build utilizado foi o build de teste da validação imediatamente anterior do mesmo commit, com flags habilitadas. Não substitui reprodução em conta real de cliente.

## Matriz

```sh
node docs/audits/closure-review-20260912/build-matrix.mjs
```

Preserva os 230 IDs da matriz histórica, verifica unicidade, exige o commit auditado e aplica conclusões revisadas explicitamente. Gera a matriz CSV e `matrix-summary.json`. Não avalia critérios por simples contagem de palavras, não marca automaticamente arquivos existentes como funcionalidades prontas e não altera o relatório histórico.

Resultado: UX 41 I / 50 P / 5 N / 4 E; Lukka 12 I / 26 P / 5 N / 7 E; Graphify 18 I / 26 P / 2 N / 4 A; Área do Cliente 23 I / 7 P. Total 94 I / 109 P / 12 N / 11 E / 4 A.

Suítes amplas e deploy referidos no relatório foram reusados da validação anterior do mesmo commit. Nesta rodada foram executadas as novas reproduções acima e verificações documentais/remotas de leitura. Um diagnóstico que reproduz um defeito termina com sucesso de execução, não com aprovação funcional do produto.
