# Revisão de completude — estado atual do Promo Brindes

Data: 11/09/2026. Repositório: `Promo_Brindes_V1`. Commit base local e `main` remoto: `90761abdd6843923e5b86cef3c363ffb57849cb9`.

## 1. Resposta objetiva

**Não implementamos nem validamos integralmente todas as melhorias dos planos.** Há uma base funcional com testes aprovados, correções publicadas, outro lote somente local, funcionalidades ausentes e dependências operacionais abertas. Foram reproduzidas falhas que a suíte existente não detecta — inclusive a perda silenciosa de 42 referências na abertura de uma seleção de 50 produtos.

Esta revisão não atribui nota 10/10 e não converte contagem de testes ou de etapas em percentual de conclusão do produto.

### Atualização de execução — 12/09/2026

O lote abaixo foi executado depois da revisão que identificou R01–R09. Ele continua **local até o próximo commit/push/deploy**; não altera o Promo Gifts nem o projeto Supabase canônico.

- **R01–R04, corrigidos e cobertos:** a abertura de seleção compartilhada agora pede até 50 produtos, o caminho persistente não herda o teto da URL legada, o armazenamento de chaves de revogação tolera expiração/corrupção sem pular links válidos e a troca para token revogado/indisponível limpa a seleção anterior e bloqueia duplicação.
- **R05, corrigido e ensaiado no runtime Vercel local:** páginas de catálogo, catálogos e datas recebem título/canonical próprios no HTML inicial; rotas privadas recebem `noindex`; uma landing editorial desconhecida devolve `404` real. O build Vercel compilou as rewrites para `api/site-page` e o smoke HTTP local confirmou os seis casos.
- **R08–R09, reforçados:** APIs de lead, proposta e seleção aceitam somente o media type JSON exato (incluindo parâmetros legítimos), o bucket de rate limit não toma `X-Forwarded-For` ou `X-Real-IP` como identidade, e a quantidade no drawer pode ser substituída inteira antes de validar o mínimo no blur.
- **Validações desta execução:** `npm run check` (161 testes unitários em 33 arquivos, build, orçamento e Chromium), testes direcionados de API/estado (78), `npm run db:site:test` (101 asserções pgTAP), `npm audit --audit-level=high` (zero vulnerabilidades) e `npx vercel build --yes` (sucesso; runtime efetivo Node 22.x, conforme engines).
- **Ainda externo, e não declarado concluído:** `npm run db:site:dry-run` continua retornando `403` para a conta do Supabase isolado. Por isso não é seguro reconciliar/aplicar migrations no remoto. Confirmação transacional de orçamento por e-mail/WhatsApp continua dependente de remetente/provedor, consentimento específico e destinatários de teste autorizados; não há alegação de envio automático.

Entregáveis desta rodada:

- Este relatório: diferenças atuais, testes, reproduções, limitações e sequência de fechamento.
- [Matriz de 230 referências, em CSV](MATRIZ_REVISAO_ATUAL_20260911.csv): todos os IDs dos quatro planos disponíveis, classificação anterior, classificação atual, origem da verificação e evidência histórica.
- [Matriz narrativa anterior](REVISAO_INTEGRAL_PLANOS_20260911.md): preservada como histórico, não como retrato atualizado de produção.

## 2. Método e fronteiras

Planos confrontados: [100 etapas UX](PLANO_UX_100_ETAPAS_20260909.md), [50 etapas Lukka](LUKKA_BENCHMARK_PLANO_50_ETAPAS_20260909.md), [50 etapas Graphify](PLANO_GRAPHIFY_50_ETAPAS_20260911.md) e [30 checkpoints do portal](CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md). São **230 referências sobrepostas**, não 230 funcionalidades independentes.

A matriz atual reaproveita a rastreabilidade anterior: **77 referências tiveram observação explicitamente reavaliada nesta rodada; 153 mantêm a classificação da base, com essa limitação indicada linha a linha**. As suítes foram reexecutadas, mas não houve um novo ensaio individual de todos os critérios dessas 153 referências. Não apresento critérios herdados como 230 novos testes completos.

Não foram localizados documentos autônomos contendo os 50 itens originais de catálogos e os 50 de datas citados na conversa. Seus módulos e os requisitos nos planos disponíveis entram na revisão; listas originais ausentes não podem ser certificadas. O texto institucional cujo posicionamento foi adiado não é tratado como entrega obrigatória concluída.

Usei a skill Graphify conforme as instruções do projeto: status, reconstrução estrutural local pelo wrapper e consulta. Resultado: **1.022 nós, 2.246 relações, 139 arquivos de código**; grafo não direcionado. A consulta avisou truncamento e foi complementada por leitura de código. O mapa ajudou a localizar fontes, não foi usado como prova de autorização, execução de SQL ou comportamento em produção.

Não alterei o repositório interno Promo Gifts nem seu banco `doufsxqlfjyuvxuezpln`. Não fiz commit, push, deploy, configuração remota, envio de mensagens, criação de clientes reais ou aplicação de migration. Escritas dos testes de banco ocorreram somente no container local do site, em transações com rollback. Os cenários adicionais usaram produtos sintéticos e APIs interceptadas.

### Classificação da matriz

- **I:** implementação identificada no recorte documentado; não certifica operação remota nem todos os critérios humanos.
- **P:** implementação parcial, defeito aberto ou aceite sem evidência suficiente.
- **N:** implementação correspondente não localizada.
- **E:** depende de conteúdo, decisão, configuração ou operação externa; pode também faltar código.
- **A:** alternativa técnica adotada que não cumpre literalmente o plano; precisa decisão explícita de escopo.

| Plano | I | P | N | E | A | Total |
|---|---:|---:|---:|---:|---:|---:|
| UX | 34 | 55 | 5 | 6 | 0 | 100 |
| Lukka | 12 | 25 | 5 | 8 | 0 | 50 |
| Graphify | 18 | 26 | 2 | 0 | 4 | 50 |
| Portal | 21 | 9 | 0 | 0 | 0 | 30 |

Essas contagens incluem classificações herdadas explicitamente identificadas no CSV. **I não significa “publicado e integralmente aceito”.** Não somar as colunas para calcular progresso comercial.

## 3. Validações executadas agora

| Validação | Resultado | Limite |
|---|---|---|
| `npm run check` | Aprovado, código de saída 0 | Inclui tipos, unitários, build, assets e Chromium |
| Vitest | 155 testes, 31 arquivos, aprovados | Não cobriam os novos casos R01–R04 |
| Chromium desktop/mobile | 64 aprovados, 4 exclusões condicionais | Não são 68 testes aprovados |
| Firefox + WebKit desktop | 58 aprovados, 10 exclusões condicionais | Não são dispositivos físicos; clipboard simulado conforme configuração |
| Acessibilidade automatizada | Cenário axe aprovado nos templates Chromium | O cenário axe é excluído nos dois outros motores; não é certificação WCAG |
| Banco local | 101 asserções pgTAP, 2 arquivos, aprovadas | Não valida execução remota da retenção |
| `pg_catalog` local | 12 tabelas privadas com RLS, sem DML direto para `anon`/`authenticated` | Não confundir ausência de acesso direto com inexistência de RPC autorizado |
| Ledger local | 14 migrations, última `20260911190000` | Estado remoto não confirmado |
| Graphify | 6 testes aprovados e reconstrução concluída | Não cobre toda a matriz de falhas da ferramenta |
| Assets da build E2E | CSS 156,3 KiB; JS 814,8 KiB; entrada 354,5 KiB | Build com flags de teste; não é CWV em campo |
| Dependências | `npm audit --audit-level=high`: zero vulnerabilidades reportadas | Fotografia do serviço na consulta, não garantia futura |
| `git diff --check` | Aprovado | Não comprova requisitos funcionais |

O runtime dos comandos locais foi **Node v24.19.0**. O CI versionado usa 22.13.1; a nova árvore local ainda não foi validada pelo CI remoto. A versão do Node da CLI local não comprova a versão do build na Vercel.

### Publicação e banco remoto

- `git ls-remote` confirmou `main` no mesmo SHA do HEAD: `90761ab…`.
- Já havia **19 arquivos modificados e 4 novos não rastreados** antes desta revisão. Portanto, essas 23 alterações não estão no SHA remoto; os artefatos desta auditoria se somam a elas.
- Checks atuais do SHA: `validate`, `Migrations and pgTAP` e `Build structural Graphify map` com sucesso; status Vercel com sucesso.
- **Supabase Preview permanece em failure**, com mensagem: `Remote migration versions not found in local migrations directory.`
- `npm run db:site:dry-run` confirmou o alvo `xlzmclcjdncjfdrjxclt`, mas terminou em **403**, na inicialização do login role, por privilégios insuficientes no endpoint.
- Não foi possível confirmar o ledger remoto nesta rodada. Não atribuir a causa do Preview definitivamente ao diretório, nem executar `migration repair`, apagar versões ou marcar migrations como aplicadas por hipótese.
- A migration `20260911180000_expand_shared_selection_retention.sql` está no Git; `20260911190000_harden_retention_metadata.sql` existe somente localmente. Ambas estão no banco local. **Aplicação remota das duas não comprovada** nesta revisão; a segunda não poderia ser entregue pela integração Git a partir do SHA atual.

Evidências remotas: [quality gate](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/34637436711), [pgTAP no CI](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/34637436681), [Graphify no CI](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/34637436868), [deployment associado ao status](https://vercel.com/juca1/promo-brindes-v1/8apwkSMuiSjFq7U4YdkaxrDqhU2g).

## 4. Defeitos reproduzidos e gaps prioritários

### R01 — Seleção de 50 produtos abre com apenas oito

**P1: integridade da seleção; implementado parcialmente. UX57/99, LK37.**

O contrato de compartilhamento foi ampliado para 50, mas [fetchProductsByIds](../src/lib/catalog.ts:438) ainda calcula `Math.min(8, maxItems)` e corta os identificadores. [SharedSelectionPage](../src/pages/SharedSelectionPage.tsx:63) passa o total do payload, mas esse total não supera o teto do helper.

Simulação de navegador com 50 UUIDs distintos e API persistente retornando as 50 referências:

```text
returnedByAPI:       50
requestedFromCatalog: 8
displayed:           8
summary: 8 REFERÊNCIAS / 80 unidades estimadas
```

Não houve aviso de perda dos demais itens. É independente do problema de autorização administrativa: mesmo uma resposta remota perfeita com 50 itens é truncada pelo cliente. A confirmação de substituição passa a operar sobre essa seleção incompleta.

**Aceite:** permitir 50 referências no caminho de compartilhamento, preservando o limite específico da comparação; testar 8/9/49/50 itens distintos, várias variantes do mesmo produto e produtos removidos. Nunca descartar referências silenciosamente.

### R02 — Payload válido excede o limite do próprio decoder

**P2: falha de compartilhamento no limite permitido. UX57, LK37.**

[sharedSelection.ts](../src/lib/sharedSelection.ts:70) aceita variantes com até 100 caracteres e 50 itens, mas recusa payload codificado acima de 8.000 caracteres. `toReferences()` e a leitura persistente reutilizam o codec destinado à URL.

Reprodução com as funções reais, transpiladas em memória, sem chamadas externas:

| 50 referências | Tamanho codificado | Referências decodificadas |
|---|---:|---:|
| Sem variante | 3.551 | 50 |
| Variante de 36 caracteres | 6.418 | 50 |
| Variante válida de 100 caracteres | 10.684 | 0 |

`createPersistentSharedSelection()` rejeitou o último caso com “Não há referências válidas para compartilhar”, antes de chamar a API.

**Aceite:** separar validação do contrato persistente do limite da URL legada; testar comprimentos máximos reais e manter proteção contra cargas abusivas. Não resolver removendo limites indiscriminadamente.

### R03 — Expiração ou corrupção oculta links ainda válidos

**P2: gestão de revogação inconsistente. UX56/57/79, LK37.**

[managedSharedSelectionTokens](../src/lib/sharedSelection.ts:140) percorre `localStorage` por índice e remove entradas durante a iteração. Ao remover a primeira entrada expirada, a segunda muda de índice e é pulada. Um JSON inválido também encerra toda a leitura porque o `try/catch` envolve o laço inteiro.

Reproduções com armazenamento sintético, sem usar chaves reais:

```text
[expirado, válido] → lista retornada [] (esperado: o válido)
[JSON corrompido, válido] → lista retornada [] (esperado: o válido)
```

Isso não apaga o registro válido nem prova acesso indevido; faz o botão de gestão desaparecer. O caso expirado pode reaparecer na próxima leitura, mas continua sendo uma falha no estado apresentado.

**Aceite:** percorrer fotografia das chaves, isolar erro por registro e testar múltiplos expirados, corrupção, formato legado, storage bloqueado e fallback em memória.

### R04 — Trocar para link revogado mantém duplicação do link anterior

**P2: conteúdo obsoleto acionável após erro. UX06/52/57/99.**

[SharedSelectionPage](../src/pages/SharedSelectionPage.tsx:31) não limpa `items` ao iniciar outro token ou receber payload vazio persistente. O botão considera `loading` e quantidade, mas não `error` nem a identidade do token que originou os itens.

Simulação Chromium: carregar seleção A válida, navegar por mudança de URL/estado SPA para B revogada, aguardar o erro e clicar “Duplicar e ajustar”. Resultado:

```text
erro: Este link expirou ou foi revogado.
duplicateEnabled: true
seleção duplicada: Produto QA anterior
```

Não é evidência de vazamento de dados de outro cliente: o conteúdo reproduzido já estava no navegador. É uma quebra de continuidade e correspondência entre URL, estado e ação.

**Aceite:** representar token, consulta e hidratação em estados coerentes; invalidar ações com dados antigos; testar A→B lento, A→revogado, A→erro, navegação de histórico e respostas fora de ordem. A correção anterior cobriu a abertura inicial lenta, não todo o ciclo.

### R05 — SEO inicial e HTTP ainda incompletos

**P2: indexação e identidade documental. UX19/58/97, LK48, AC28.**

Leitura HTTP do alias público, sem executar JavaScript:

| Rota | HTTP | Resultado inicial |
|---|---:|---|
| `/` | 200 | Título/canonical da home, esperado |
| `/catalogo`, `/catalogos`, `/datas-comemorativas` | 200 | Ainda título e canonical da home |
| `/minha-conta` | 200 | Meta `index,follow`; sem `X-Robots-Tag` |
| `/minha-conta/orcamentos/<UUID sintético>` | 200 | Header `noindex, nofollow, noarchive`; shell genérico |
| `/entrar`, `/auth/confirm`, `/definir-senha`, `/orcamento`, `/selecoes/compartilhada` | 200 | Header `noindex, nofollow, noarchive` presente |
| `/ideias/revisao-inexistente-20260911` | 200 | Subrota editorial inexistente aceita como 200 |
| `/revisao-rota-inexistente-20260911` | 404 | Página não encontrada da marca |
| `/produto/revisao-inexistente-20260911` | 404 | Produto não encontrado |

O [vercel.json local](../vercel.json) já adiciona header para `/minha-conta` exato, mas ainda não foi publicado. Header `noindex` presente nas outras rotas não deve ser ignorado por existir meta genérica no shell. Não foi observado conteúdo privado no HTML; o problema não equivale a quebra de autenticação.

**Aceite:** smoke do HTML inicial por tipo de rota e validação de inexistência editorial no servidor. Não confundir `<Seo>` após hidratação com metadados entregues ao robô de prévia. HTTP 404 para uma rota realmente inexistente é o comportamento correto, não indisponibilidade do site inteiro.

### R06 — Retenção local reforçada; reconciliação remota aberta

**Prioridade de liberação: alta. UX80/98/100.**

A [migration local nova](../site-supabase/supabase/migrations/20260911190000_harden_retention_metadata.sql) exige que o orçamento pai tenha prazo de retenção vencido antes de apagar metadados de proposta. As duas asserções novas de proteção do orçamento/documento vigente passaram. Isso é defesa adicional de função administrativa, não uma falha de autorização de usuário comum.

O dry-run remoto falhou com 403 e o Preview falha por divergência de versões. Ter 101 asserções verdes localmente não comprova schema, grants, cron ou retenção em produção. Não executei o cron real para testar, pois ele elimina registros vencidos.

**Aceite:** autenticação administrativa válida; consulta do ledger e `pg_catalog`; confronto das versões exatas; aplicação autorizada no banco isolado, sem reparar histórico por hipótese; validação da operação e observabilidade sem criar ou eliminar dados reais de clientes como teste.

### R07 — Cópia automática e passagem comercial não estão fechadas

**UX68–70/75–77; LK45; AC24.**

O [README](../README.md:67) informa expressamente que confirmações automáticas por e-mail e WhatsApp não estão habilitadas. [persistLead](../api/_lib/siteDatabase.ts:59) registra a solicitação e devolve o protocolo; não envia uma cópia transacional. A tabela `notification_deliveries` é uma estrutura de auditoria, não evidência de outbox populada, worker, provedor, retries e tratamento de falhas completos.

Login por e-mail do Supabase, link `mailto:`, botão que abre WhatsApp e cópia automática do orçamento são quatro funções diferentes. Também não foi comprovada nesta rodada a cadeia comercial publicar proposta→cliente abrir→pedir ajuste→responsável receber.

**Aceite:** escolher/configurar remetente e provedores, implementar cadeia de entrega com idempotência e retry, usar destinatários de teste autorizados e comprovar estados de aceitação/entrega/falha. Não anunciar “e-mail enviado” só porque o pedido foi salvo.

### R08 — Lote local precisa revisão de configuração antes de publicar

**Parcial; não assumir que hardening local já protege produção.**

- Auth: callbacks foram fixados no alias canônico e o TOML local removeu redirects legados. É necessário confirmar a configuração remota e se os destinos removidos ainda atendem alguma integração. Editar TOML não atualiza Auth automaticamente.
- API: propostas e compartilhamentos ganharam limites de corpo e rejeição de mídia inadequada, com testes. A comparação usa prefixo `startsWith('application/json')`, não validação exata do media type; o limite é aplicado após acesso/serialização de `body`. Não apresentar isso como limite de streaming pré-parser nem proteção total contra abuso.
- Node: a mudança local de `>=22.13.0 <23` para `22.x` admite versões anteriores ao mínimo do Vite travado (`^20.19.0 || >=22.12.0`). Restaurar contrato mínimo coerente e validar no Node do CI; não justificar mudança apenas pela versão da CLI local.
- CSP/preload: script inline foi extraído; o novo `/hero-preload.js` usa nome fixo com cache de um ano/immutable. Falta estratégia de versionamento/revalidação para futuras mudanças. A precedência de arquivo estático versus rewrite na Vercel não foi reproduzida: **não classifico o script como 404 confirmado** com base somente na expressão do catch-all.
- HSTS: expansão para `includeSubDomains` só deve ser encerrada após confirmar o domínio efetivo e seus subdomínios; não é prova automática de melhoria em todos os ambientes.
- Diálogo compartilhado: Tab/Escape/devolução de foco passaram; ainda não há bloqueio de rolagem no efeito específico dessa confirmação.
- CI: job Firefox/WebKit adicionado somente localmente. O CI verde de `90761ab` não comprova que esse job novo já executou no GitHub.

### R09 — Curadoria, quantidade e acabamento funcional continuam parciais

- O finder não restringe mais automaticamente onboarding/colaboradores a kits, mas a [coleção onboarding](../src/lib/catalogLibrary.ts:38) mantém `perfil=kits`. Falta validar a intenção de cada entrada e uma amostra julgada de consultas/produtos reais.
- [ProductPage](../src/pages/ProductPage.tsx:201) e [QuoteDrawer](../src/components/QuoteDrawer.tsx:214) normalizam a quantidade a cada tecla; o requisito de digitação natural com mínimo conhecido ainda não está encerrado.
- Grupos “principal/alternativa” existem na seleção/orçamento, mas compartilhamento serializa só `id`, `q`, `v`. Decidir se o compartilhamento deve preservar grupos sem introduzir dados privados.
- Comparação, variantes e FAQ existem; isso não comprova qualidade de todas as especificações, recomendações por campanha e técnicas reais de personalização.
- Biblioteca tem dez coleções online. O tipo suporta `pdf`/`digital`, mas tipo declarado não é revista publicada nem download governado.
- Agenda e ICS têm testes; importação/reimportação real nos calendários-alvo, dispositivos físicos e contratos de favoritos/recorrência permanecem sem comprovação integral.

## 5. O que foi efetivamente melhorado desde a base anterior

Não manter como abertos defeitos que já receberam correção específica, nem ampliar a conclusão além do cenário testado:

| Correção | Situação atual |
|---|---|
| Espera inicial do link persistente | Teste com resposta atrasada passou; ciclo de troca de token ainda falha em R04 |
| Confirmação antes de substituir seleção | Implementada; metadados anteriores são limpos; foco/Tab/Escape adicionais estão no lote local |
| Revogação recuperável após recarga | Modelo/lista existem; R03 impede encerrar todos os casos de storage |
| UUID de orçamento em analytics | Sanitizador atual usa template `:id`; testes aprovados; recebimento real das métricas ainda não validado |
| Ajuste com identidade de tentativa | ID reutilizado até sucesso e edição bloqueada durante envio; falta cenário browser de resposta perdida |
| Verba e ordem das datas | Escopo de verba e recebimento antes do evento validados; demais critérios de datas seguem abertos |
| Rascunho ao trocar conta | Limpeza implementada; não equivale a múltiplas campanhas sincronizadas por usuário |
| Autocomplete após blur | Correção local e teste específico aprovados; publicação pendente |
| Retenção de proposta vigente | Migration/testes locais aprovados; ativação remota não comprovada |
| Cabeçalho `noindex` privado | Presente em várias rotas publicadas; exato `/minha-conta` corrigido apenas localmente |

### Correções na própria avaliação anterior

1. No fluxo normal **limpar→desfazer**, o reducer já preservava o título com `{ ...state, items: [] }`. A afirmação genérica de que esse fluxo perdia o nome não se sustenta. A restauração atômica local é um reforço, não prova retroativa daquele bug.
2. `.env.local` ignorado contendo segredos server-side não é, por si só, vazamento. Exposição em Git, bundle, logs ou canais indevidos exige evidência própria. Não reproduzi valores de credenciais.
3. Redirects do TOML não provam a allowlist efetiva remota. Da mesma forma, uma configuração no painel ou o Node da CLI não prova o runtime do build implantado.
4. Headers de uma página de SSO/proteção da Vercel não validam os headers da aplicação. O smoke desta rodada usou o alias público.
5. Exclusões condicionais de Playwright são exclusões, não testes aprovados; constam separadamente nos números acima.

## 6. Funcionalidades sugeridas ainda ausentes

| Entrega | Referências | O que falta |
|---|---|---|
| Construtor de kits | LK26–30 | Componentes substituíveis, quantidade de conjuntos × unidades, composição versionada e briefing coerente |
| Anexos do cliente | UX65/LK43 | Upload privado, tipos/tamanho, autorização, remoção, inspeção e retenção; proposta PDF não substitui logo/referência |
| Várias seleções por conta | UX53/59/60 | Sincronização entre dispositivos, versões, conflitos, arquivamento e recuperação; `storage` entre abas é apenas replicação local |
| Amostra de relevância | UX34/35, LK20 | Consultas julgadas com comercial, relevância dos primeiros resultados e regressão detectável |
| Publicações PDF/revista | UX84 | Arquivos reais, permissão, edição, revisão, retirada e download governados |
| Categorias fotográficas | LK10 | Entradas editoriais próprias em lugar da predominância iconográfica |
| Cases/bastidores/prova social | UX26/28, LK03/31–34 | Material real, fontes e autorizações; não usar trabalho de concorrente como nosso |
| Pesquisa com compradores | UX20/91, LK02 | Sessões reais e decisões documentadas; simulação de persona não substitui participantes |
| Parte avançada do Graphify | GR14/21/24/26/30/32/40/44 | Direção de dependências, path/explain estáveis, incremental, hooks, passe semântico opt-in, benchmark de utilidade e diff base/head |

Graphify entrega a camada estrutural local/CI. O grafo não direcionado, rebuild integral e ausência de hooks são alternativas/parcialidades declaradas, não cumprimento literal dos requisitos originais. Não ativar passe semântico automático ou enviar o repositório a provedores só para completar uma lista.

## 7. Sequência de fechamento e cenários de aceite

| Ordem | Entrega | Cenários que devem bloquear encerramento |
|---|---|---|
| 1 | Compartilhamento íntegro | 9/50 produtos, variante longa, item removido, grupos, leitura e duplicação sem perdas |
| 2 | Estado e revogação | Expirado antes de válido; JSON corrompido; storage bloqueado; A→B lento/revogado/erro; respostas fora de ordem |
| 3 | Lote de hardening | Média de corpo exata, limite real, callbacks aprovados, Node compatível, preload/cache, foco e scroll |
| 4 | Git/Vercel/DB coerentes | Revisão do diff, CI do SHA a publicar, ledger remoto via acesso administrativo, schema via pg_catalog, smoke no alias correto |
| 5 | Envio e comercial | Clique duplo, resposta perdida após salvar, retry com mesmo ID, proposta privada, ajuste entregue ao responsável |
| 6 | Cópias transacionais | Provedor/opt-in aprovados, outbox/retry, deduplicação, entrega e falha registradas com destinatários autorizados |
| 7 | Busca, curadoria e quantidade | Consultas julgadas, campanhas distintas, digitação parcial sem clamp prematuro, técnicas comprovadas |
| 8 | Expansões ausentes | Contratos próprios para kits/anexos/seleções remotas; isolamento por duas contas e recuperação |
| 9 | Aceite humano e operacional | Compradores reais, leitores de tela, Safari/iOS/Android físicos, calendário real e PDF longo |
| 10 | Encerramento por lote | Código + teste + commit + publicação/flag + migration quando aplicável + evidência operacional, sem esconder pendências |

Esta é uma sequência proposta a partir da revisão, não um registro de correções já executadas. Os quatro primeiros blocos tratam riscos conhecidos antes de ampliar recursos. Conteúdo autorizado e decisões de provedores podem avançar em paralelo mediante coordenação humana.

## 8. Conclusão

**A base tem cobertura automatizada relevante, mas o plano não está concluído.** O bloqueio não é apenas “aplicar uma migration”: existem falhas de cliente reproduzidas, entregas locais não publicadas, integração remota sem reconciliação comprovada, automações não habilitadas e funcionalidades ainda não construídas.

Esta rodada entrega diagnóstico e rastreabilidade; não alterou a implementação para corrigir R01–R09. Para encerrar uma linha do plano, exigir a evidência do critério correspondente, distinguindo simulação local, observação remota, dependência externa e teste humano.
