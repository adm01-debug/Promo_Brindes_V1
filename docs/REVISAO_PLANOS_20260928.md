# Revisão dos planos — 28/09/2026

## Parecer

**Os planos não estão integralmente implementados e homologados.** Há entregas técnicas efetivas, documentação atrasada, implementação parcial, funções não entregues e decisões externas adiadas. Esta revisão reproduziu **dois defeitos novos nos favoritos**, mesmo com os **399 testes existentes aprovados**. Não é justificável declarar “100% concluído” ou “10/10”.

Também não é correto repetir bloqueios já resolvidos: o token Vercel foi usado com sucesso pelo release atual; a produção acompanha a `main`; o dry-run do Supabase isolado não tem migrations pendentes. O release continua vermelho por **Web Analytics desabilitado/script 404**, não pela antiga falha do token.

Pedido atendido como auditoria: somente leitura dos serviços, testes locais com fixtures e novos documentos/probes. **Nenhuma correção de aplicação, migration, alteração de proteção, envio de mensagem, commit, push ou deploy foi feito nesta revisão.** Promo Gifts V4 e seu banco não foram modificados.

## 1. Base, método e abrangência

| Elemento | Evidência atual |
|---|---|
| Projeto auditado | `/home/joaquim_ataides/projetos/Promo_Brindes_V1` |
| HEAD / branch | `2b53b855be3d50d40eceec37dcf7b80005159fea` / `fix/production-drift-active-alias-20260928` |
| Main remota | `40e05abd8c511de686f615e35880f614d7d7fafe` |
| Diferença HEAD contra main | Apenas `.github/workflows/production-drift.yml`, antes dos novos artefatos desta auditoria |
| PR67 | Aberto; `BLOCKED`, `REVIEW_REQUIRED`; checks de CI aprovados |
| Produção | Alias `promo-brindes-v1.vercel.app`, deployment `dpl_FGPHjeQhyZCMewCCmsYQNxwPWSuP`, `READY` |
| SHA do alias ativo | `40e05abd8c511de686f615e35880f614d7d7fafe`, confirmado na API REST da Vercel |
| Supabase do site | `xlzmclcjdncjfdrjxclt`, 62 migrations locais; dry-run remoto sem pendências |
| Runtime | Local Node24.19/npm11.17; engines>=24.15<25; CI24.15; projeto Vercel ainda22.x |

Usei Graphify conforme as instruções do projeto: status atual e consulta estrutural para orientar leitura. Mapa1950 nós/3915 relações. A consulta foi truncada pelo limite de contexto; os arquivos e testes, não o grafo, fundamentam o parecer. Não foi feita extração semântica/IA externa.

O inventário contém **580 referências documentais sobrepostas**, não 580 funcionalidades independentes:

| Conjunto | Quantidade | Rastreabilidade |
|---|---:|---|
| UX100, LK50, GR50, AC30 | 230 | [Anexo por referência](REVISAO_PRODUTO_230_20260928.md); 23 notas atualizadas nesta revisão |
| Técnicos13/16/17 de setembro | 150 | [Anexo histórico individual](REVISAO_PLANOS_20260923_ANEXO_TECNICO.md), com ressalvas atuais na seção6 abaixo |
| Plano23/09 | 50 | Correspondência completa T23→T24 no [anexo de50 etapas](REVISAO_50_ETAPAS_20260928.md) |
| Plano24/09 | 50 | [Revisão individual atual](REVISAO_50_ETAPAS_20260928.md) |
| Workflows27/09 | 100 | [Revisão individual atual](REVISAO_WORKFLOWS_100_20260928.md) |

Os documentos autônomos antigos de50 etapas de catálogos/calendário mencionados na conversa não foram localizados; cobertura identificável permanece UX81–90/LK15/36. Não reconstruí listas históricas por suposição.

**Limite:** não houve580 testes independentes nem recertificação individual de todo requisito. O anexo de230 linhas distingue evidência histórica das conferências atuais. As150 linhas técnicas históricas não foram promovidas automaticamente a aceites novos. Leitura, testes automatizados, configuração ativa e aceite humano são dimensões diferentes.

### Contagens corretamente interpretadas

- Matriz histórica de produto:118I,100P,1N,11E. **Não é um retrato semântico atualizado**: o único N (LK10) já possui código, por exemplo. O validador valida estrutura/fontes no SHA registrado, não a realidade funcional atual.
- Plano24/09:5 entregas técnicas no recorte,32 parciais,2 entregas não localizadas e11 dependências externas.
- Workflows27/09:11 entregas técnicas no recorte,38 parciais,43 não implementadas/ativadas,6 dependências externas e2 condicionais/opcionais.
- Não somar contagens de planos sobrepostos e não converter esses números em nota de qualidade ou percentual comercial de conclusão.

## 2. Evidências executadas e limites dos testes

| Verificação nesta revisão | Resultado | O que comprova |
|---|---|---|
| `npm test` |399 testes/59 arquivos aprovados | Suíte unitária/componentes/API existente, na base atual |
| Recorte favoritos/ranking/analytics/anexos |35 testes/4 arquivos aprovados | Parte da mesma suíte; não somar399+35 |
| `npm run lint` e `npm run typecheck` |Aprovados nesta revisão | Análise estática, incluindo os artefatos aplicáveis; não substitui os probes |
| `npm run ledger:check` |230 referências válidas;6 testes do validador aprovados | IDs/fontes/commits/estrutura; não aceite funcional |
| Probes F28 |2 testes falharam por asserção correta | Contraprovas concretas de isolamento/rollback de favoritos |
| `npm run db:site:dry-run` |`upToDate:true`, migrations/seeds/roles vazios | Sem aplicação pendente segundo CLI; nenhuma migration aplicada |
| `SMOKE_BASE_URL=https://promo-brindes-v1.vercel.app npm run smoke:deployment` |Falha: Analytics esperado200, recebido404 | Smoke completo não aprovado; não prova que todas as rotas estão quebradas |
| APIs GitHub/Vercel |Estados registrados neste relatório | Main/produção, PR, proteção, Environments e configuração atuais |
| Integridade dos novos anexos |230 IDs de produto,100 WF,50 T24+50 correspondências T23, únicos; links locais existentes | Rastreabilidade documental, não testes funcionais adicionais |
| Simulação da fórmula ci-health |80% pela fórmula atual versus30% de sucessos efetivos no conjunto sintético | Confirma o erro de classificação sem alterar runs reais |

CI atual da main: [Quality](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/36416240106), [banco](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/36416240029), [Graphify](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/36416240282) e [CodeQL](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/36416240285) aprovados. [Release](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/36416239921): ledger/build/deploy aprovados; smoke falhou. [PR67](https://github.com/adm01-debug/Promo_Brindes_V1/pull/67): SQL, qualidade, cross-browser, Graphify, segurança e actionlint aprovados.

Build completo e navegadores foram aprovados na execução imediatamente anterior sobre o mesmo código de aplicação; não os contabilizei como novos ensaios desta revisão. Lint e TypeScript foram reexecutados e aprovados após gerar os artefatos. O CI valida SQL local, não uma homologação completa de dados/ACLs de produção. Não houve pedidos reais, clientes de teste em produção, recebimento de mensagens, restauração nem teste assistivo/físico nesta rodada.

## 3. Defeitos novos reproduzidos

### F28-01 — ação enfileirada de A é despachada após mudança para B — P1

Fonte: [useOccasionFavorites.ts](../src/lib/useOccasionFavorites.ts), `enqueueRemoteWrite` (linhas123–131), limpeza da fila (155); [customerOccasionFavorites.ts](../src/lib/customerOccasionFavorites.ts), RPC usa cliente da sessão atual.

1. A possui uma gravação ainda pendente.
2. Uma segunda intenção para a mesma data é enfileirada.
3. A interface muda para B; os efeitos limpam os Maps e protegem a renderização.
4. A primeira promise resolve. O callback já registrado despacha a segunda intenção de A mesmo após a troca.

**Prova:** esperado somente1 despacho; observado2. Limpar `writeChainsRef` não cancela callbacks existentes. As guardas no `catch` evitam um rollback local tardio, mas não impedem a chamada remota iniciada pelo `then`.

**Alcance:** demonstrado no hook real, com RPC simulada e identidades sintéticas. Pela implementação do cliente, existe risco de despacho com a sessão então ativa; não foi feita gravação real na conta B e não se afirma quebra de RLS ou vazamento de orçamentos. RLS baseada em `auth.uid()` não identifica que a intenção nasceu na conta anterior.

**Correção a executar em pedido próprio:** validar identidade/geração antes do despacho, invalidar operações ainda não iniciadas no logout/troca e proteger também o vínculo de identidade na fronteira da RPC. Testar A→B, A→logout, A→B→A, fila da promoção anônima e requisições já em voo. Não basta adicionar guarda de apresentação.

### F28-02 — duas gravações recusadas restauram estado nunca confirmado — P2

Fonte: mesmo hook, `previouslySaved` (233) e rollback (248–254).

1. Servidor/cache confirmado não contém a data.
2. Pessoa adiciona e remove antes da primeira resposta.
3. As duas gravações são rejeitadas.
4. O segundo rollback usa o estado otimista capturado após a adição, não o último confirmado; o favorito reaparece.

**Prova:** esperado `false`, observado `true`. A UI/cache divergem do estado confirmado. A simulação não prova escrita no servidor; ambas as RPCs foram recusadas no mock.

**Correção a executar:** separar snapshot confirmado de intenções pendentes, reconciliar falha em sequência e revalidar estado quando o resultado for inconclusivo. Cobrir rejeição/rejeição, sucesso/falha, falha/sucesso, limite de100, tentativas e troca de identidade.

Reprodução segura, sem rede:

```sh
npx vitest run --config docs/audits/plan-review-20260928/vitest.config.ts
```

Os [probes](audits/plan-review-20260928/favorites.probe.tsx) têm expectativas seguras e permanecem vermelhos no código atual. São artefatos de diagnóstico separados da suíte normal; não ajustei expectativas para ocultar bugs. Após correção, devem virar regressões permanentes. F24-01/02/03 continuam corrigidos; os novos achados não invalidam aquelas entregas específicas, mas impedem fechar T24-06/10/15, UX79/88/99 e AC10/30 integralmente.

### Remediação posterior à auditoria

Os dois probes F28 foram corrigidos depois da reprodução acima e incorporados à suíte permanente em `src/lib/useOccasionFavorites.test.tsx`. A fila agora verifica titular e época **no instante em que cada operação será despachada**; uma operação que ficou esperando a anterior não atravessa logout ou troca de conta. O hook também separa estado confirmado de intenção otimista: uma falha retira somente a intenção correspondente e a UI é recomposta do último estado confirmado. A intenção confirmada localmente permanece até uma lista/evento remoto confirmar o mesmo valor, protegendo contra snapshot iniciado antes da gravação.

Um hardening adicional durante o review fechou janelas mais estreitas: a identidade commitada passou a integrar a guarda de despacho em `useLayoutEffect`, sem vazar de renders concorrentes abandonados; época de sessão e época de leitura do catálogo foram separadas, para uma reordenação de datas não cancelar escritas legítimas; e uma leitura iniciada antes das interações não pode mais confirmar/remover uma intenção ainda pendente nem substituir sua base de rollback. Cada intenção agora distingue escrita pendente de escrita concluída, preservando a escolha mais recente quando adicionar→remover ocorre durante uma lista obsoleta.

Validação posterior: 18 testes do hook, 4 testes de integração da página e 2 probes históricos passaram com RPCs simuladas. O aceite continua técnico nesta linha de trabalho até revisão, integração na `main` e ensaio autenticado controlado; a correção não autoriza escrita em dados reais nem substitui homologação operacional.

## 4. Publicação, segurança e observabilidade

### P1 — produção é promovida antes do smoke

[release.yml](../.github/workflows/release.yml) usa `vercel deploy --prebuilt --prod` antes de `smoke:deployment`, sem rollback automático e sem comparar metadata SHA no pós-deploy. A falha atual do smoke já ocorre com o alias promovido. WF06/07/92 não implementados.

Futuro aceite: candidato com configuração **de produção**, URL imutável validada antes da promoção, SHA comprovado e rollback controlado. Não construir como Preview e depois promover presumindo equivalência de variáveis; a estratégia deve preservar o ambiente correto.

### P1 — proteção de revisão inviável com único revisor

GitHub exige1 aprovação de code-owner e aplica a regra também a administradores. `.github/CODEOWNERS` contém `* @adm01-debug`; lista de colaboradores retorna somente `adm01-debug`, também autor do PR67. Resultado atual: PR bloqueado apesar do CI aprovado. Não removi proteção nem tentei autoaprovação. Solução exige revisor elegível/CODEOWNER adicional ou decisão explícita de governança; não é erro do token.

### P1 — camadas preventivas de segurança não ativadas

API do GitHub: secret scanning/push protection e Dependabot security updates desabilitados; allowed_actions=all; sha_pinning_required=false. Production tem zero secrets e jobs não usam Environment; restrições de branches dos Environments ausentes. Actions pinadas/Gitleaks/npm audit existem, mas não substituem essas camadas. Credenciais anteriormente compartilhadas em conversa merecem rotação controlada; nenhum valor é reproduzido aqui.

### P2 — Analytics e runtime ainda divergentes

API Vercel retorna `features.webAnalytics=false`, `nodeVersion=22.x`. O script de Analytics retorna404 e o smoke bloqueia corretamente. Código/testes usam Node24. Não diagnosticar como token inválido e não remover a asserção para simular sucesso. Habilitação/custo/coleta e alinhamento do runtime precisam decisão/configuração e nova validação.

### P2 — detector corrigido apenas no branch

Main ainda contém detector que falhou no [run36391431073](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/36391431073). PR67 corrige consulta pelo alias ativo/team ID, SHA inválido e summary incompleto. Como não foi integrado, **estar no GitHub em um branch não significa estar ativo em produção**. O texto do alerta ainda recomenda release manual, mas release não tem `workflow_dispatch` (WF08): requisito permanece.

### Remediação posterior: candidato antes da promoção

Nesta linha de trabalho, `release.yml` passou a construir com contexto Production, criar deployment com `--skip-domain`, gravar `id`/URL/metadados, validar o SHA do candidato via API Vercel e executar smoke usando a URL imutável. Somente depois do smoke o workflow chama `vercel promote`; então consulta o alias público e exige que ele aponte para o SHA do run. Também adiciona disparo manual restrito explicitamente a `refs/heads/main`, shell bash, runner fixo, margem coerente para o timeout e limpeza de `.vercel` no runner.

Em 28/09/2026, Web Analytics foi habilitado pela API no projeto Vercel isolado e confirmado por `features.webAnalytics=true`. A nova rota só passa a existir após o próximo deployment; por isso o smoke do candidato continua sendo a prova final antes da promoção. A mudança ainda aguarda revisão/merge para atingir `main`.

### P2 — relatórios de CI podem induzir interpretação errada

- `ci-health.yml` usa `SUCCESS=TOTAL-FAILED`: cancelado, pulado e ainda em andamento entram como sucesso. Exemplo lógico10 runs,2 falhas,3 sucessos,5 cancelados mostra80%, embora apenas3 sejam sucessos. É simulação da fórmula, não medição do histórico real.
- `quality.yml` repete `job.status` em cada linha do summary; uma falha opcional de assinaturas pode aparecer como sucesso agregado. Usar outcomes reais por step.
- verify-db tem35 minutos para loops que podem consumir aproximadamente45, além de rede. Split de jobs corrigiu parte, não toda a aritmética.
- Rotação/health/templates usam labels não cadastradas. A existência dos workflows não comprova disparo/entrega/idempotência dos alertas; não abri issues artificiais para testar.

## 5. Produto: entregue, parcial e não entregue

### Entregas que não devem ser refeitas por documentação vencida

Categorias fotográficas em HomePage; busca e ranking por intenção/diversidade; favoritos por conta/entre abas; biblioteca de campanhas com conflitos; kits/alternativas; quatro frases aprovadas; badge único; texto Tendências; catálogo de datas/ICS; biblioteca editorial com revisão/validade; cópia de solicitação enriquecida; área de cliente, histórico e propostas privadas; guardas de anexos; Graphify estrutural.

O alias técnico `novos-drops` em `shared/catalogEditorial.ts` preserva URLs antigas, não é texto comercial novo. A palavra `equipe` no normalizador de busca preserva consultas do comprador; substituição cega prejudicaria compatibilidade. As quatro frases foram localizadas no JSX, inclusive quando divididas por tags.

### Funções com código, mas aceite incompleto

- Favoritos: novos F28 precisam correção; não basta sincronização existir.
- E-mail/WhatsApp: outbox, consentimento, adapters e callbacks existem; variáveis/ativação e recebimento real continuam adiados por decisão do usuário. “Serviços prontos” declarado anteriormente não é ensaio de entrega.
- Conta/propostas: falta ciclo real controlado de confirmação/recuperação/refresh/publicação de PDF/ajuste recebido pelo comercial.
- Anexos: PDF atualmente recusado; PNG/JPEG/WebP têm checagens de assinatura e isolamento, não certificação de sanitização integral.
- Relevância: testes de ranking/lexicais não substituem corpus de produtos julgado por marketing, dados comerciais e diversidade global multipágina.
- Performance/acessibilidade: budget, axe, teclado e navegadores simulados não demonstram CWV p75, leitores de tela e aparelhos físicos.
- SEO/calendário: metadados/ICS testados, mas indexação, prévia social e importação real em calendários não certificados.
- Graphify: AST, comandos e benchmark estrutural entregues; corpus documental/semântico, rastreabilidade requisito→fonte→teste e matriz adversarial completa ainda abertos. Alternativas aprovadas de grafo não direcionado/rebuild/sem hooks devem ser preservadas.

### Ausências/dependências explícitas

- Encaminhamento comercial idempotente, destino/CRM, responsável e SLA: guardar solicitação não significa que um vendedor recebeu.
- PDFs/revistas reais na biblioteca: dez coleções atuais são `format:'online'`; modelar outros formatos não os publica. O usuário declarou acervo aprovado, mas sua localização/direitos por arquivo precisam ser estabelecidos.
- Três cases, bastidores e personalização comprovável: conteúdo autorizado identificável ainda não localizado; não inventar prova social.
- Preview autenticado com banco sintético realmente separado; contrato público vivo cross-projeto no CI; observador independente de cron silencioso.
- Restore com RPO/RTO medidos, manutenção recorrente, rotação executada e operação de direitos de titulares.

## 6. Banco e planos técnicos históricos

O dry-run atual resolveu novamente a dúvida de migrations pendentes. **Não é um diff integral de schema/ACL/dados.** Não exportei dados de clientes e não fiz reconciliação automática do ledger. Auditoria completa de schema exigiria `pg_catalog` e comparação de funções/triggers/policies/grants/default privileges, separando diferenças da plataforma; PostgREST não substitui isso.

A migration `20260927103000_harden_occasion_favorites_rpc_acl.sql` agora revoga permissões amplas nas duas RPCs de favoritos e concede somente a `authenticated`; a versão está entre as migrations alinhadas. Não repetir o achado antigo de ACL como se não houvesse remediação. Entretanto, aplicação registrada não substitui novo retrato integral dos privilégios atuais/default privileges; esse aceite permanece parcial.

Ressalvas que atualizam o [anexo técnico de150 linhas](REVISAO_PLANOS_20260923_ANEXO_TECNICO.md):

| Referências históricas | Posição atual que prevalece |
|---|---|
| T13-09/13; T17-47 | F24 corrigidos, mas F28 reabre isolamento de despacho/rollback; homologação integral não fechada |
| T13-31 | Contrato enriquecido de cópia implementado; aceite editorial/recebimento real ainda pendentes |
| T13-19/27/29/30/40/41; T16-38/42; T17-35 | Provedores/alertas/SLA adiados; suíte não comprova operação |
| T16-01/02/06; T17-02/03/04 | Acesso/ledger/main verificados; não repetir falta de autenticação ou PRs antigos abertos |
| T16-25; T17-25 | Role limitada preparada, corte via SERVICE_JWT adiado |
| T16-26/48; T17-26 | ACL específica de favoritos recebeu migration posterior; diff integral atual não executado |
| T16-29; T17-29 | Lembrete trimestral existe; execução efetiva de rotação continua não certificada |
| T16-39; T17-33/49 | Runbook existe; drill de restore não demonstrado |
| T16-46/47; T17-37/38 | Contrato vivo no CI e preview autenticado isolado não concluídos |
| T13-48/50; T17-48/50 | Componentes/matriz/encerramento continuam parciais; atualização semântica precisa seguir evidências |
| T16-03/43/45; T17-05/36/39–44 | Afetam Promo Gifts protegido: não executados, não autorizados por documento do site |

As demais linhas históricas mantêm seus próprios limites; não receberam recertificação individual nesta rodada. As quatro alternativas Graphify e decisões sobre índice, PII, token público e pg_cron não devem virar implementação automática apenas para apagar checkboxes.

## 7. Ordem de fechamento recomendada

1. Corrigir F28-01/02 e incorporar probes à suíte; testar troca de identidade e falhas combinadas antes de qualquer aceite de favoritos.
2. Resolver governança do PR67 sem bypass silencioso; integrar correção do detector e validar execução real.
3. Corrigir estratégia de release: preflight cedo, candidato de produção, SHA, smoke antes de alias e resposta a falha; alinhar runtime e resolver Analytics por decisão explícita.
4. Ativar/revisar camadas de segurança do GitHub, menor privilégio de Actions/Environments e métricas/alertas com resultados reais por etapa.
5. Reconciliar semanticamente ledger e planos com os SHAs/aceites corretos, mantendo alternativas e adiamentos; não usar validador estrutural como carimbo funcional.
6. Entregar contrato público de leitura/preview isolado/observador de cron e aprofundar inspeção de anexos conforme decisão de segurança.
7. Localizar acervo aprovado e homologar curadoria/dados comerciais; definir destino/responsável do atendimento antes de integrar.
8. Quando forem retomados os itens adiados, ensaiar mensagens, Auth, propostas, restore e operação com destinatários/dados controlados.
9. Fechar pesquisa, acessibilidade assistiva, dispositivos, métricas de campo e Graphify avançado por critérios próprios.

**Critério final:** requisito + fonte + teste + SHA + ativação + evidência operacional/humana quando aplicável. Ausência de falhas na suíte não substitui essas dimensões. Esta auditoria entrega o diagnóstico e a rastreabilidade; não declara implementadas as correções que apenas recomenda.
