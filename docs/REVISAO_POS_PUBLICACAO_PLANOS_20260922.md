# Revisão dos planos após publicação — 22/09/2026

> **Registro histórico.** Esta revisão preserva a evidência observada em 22/09/2026;
> não descreve automaticamente o estado atual do produto. O diagnóstico reproduzível
> foi substituído por uma verificação de regressão em
> `docs/audits/plan-review-20260922/reproduce.mjs` após as correções posteriores.

## Parecer

**Não implementamos integralmente todos os planos.** Há uma base técnica publicada e validada, mas ainda existem funcionalidades ausentes, entregas parciais, aceites operacionais e decisões de arquitetura que não equivalem a implementar a proposta original.

O plano de 50 etapas de 17/09, confrontado com os critérios herdados de 16/09, fica nesta revisão: **18 entregas técnicas confirmadas, 25 parciais, 3 não entregues e 4 alternativas/adiamentos documentados**. Isso não é um percentual de prontidão do produto: as etapas têm tamanhos e riscos diferentes e algumas pertencem ao sistema interno protegido.

A matriz dos quatro planos de produto contém 230 referências, não 230 funcionalidades independentes. Seus estados registrados são **100 I / 109 P / 10 N / 11 E**, mas o conteúdo está desatualizado. Esses números são uma leitura do ledger, **não uma nova certificação de 100 entregas**.

## Escopo, versão e método

- Repositório auditado: `Promo_Brindes_V1`; SHA local e `origin/main`: `b211c2ba11b47c212166db7786a9703e2cfd0329`.
- Deployment Production `6593341242`: mesmo SHA, estado `success`.
- Banco do site: exclusivamente `xlzmclcjdncjfdrjxclt` nas consultas administrativas desta rodada.
- O Promo Gifts e o banco principal não foram alterados nem reavaliados administrativamente nesta rodada. Achados antigos sobre eles continuam históricos, não conclusões atuais certificadas.
- Fontes: planos de 13/09, 16/09 e 17/09, ledger dos 230 requisitos, governança, código, migrations, testes, CI, configuração da Vercel e consultas administrativas somente leitura.
- Graphify foi usado para localizar relações estruturais; os arquivos e o estado remoto foram conferidos diretamente. O grafo não comprova aplicação de migrations nem operação comercial.
- Revisão documental por requisito e técnica por área/risco; não houve nova homologação humana individual dos 230 IDs nem envio de mensagens a clientes reais.
- Não houve correção de código, alteração de configuração remota, aplicação de migration, commit ou deploy nesta rodada de revisão. Experimentos de banco ficaram no PostgreSQL local e transacionais.

## O que está comprovadamente atualizado

1. **Código publicado:** local, GitHub e deployment de produção apontam ao mesmo SHA acima. PRs #14 e #21 já foram incorporados; a descrição de PR #14 aguardando merge está obsoleta.
2. **Migrations:** 44 locais e 44 remotas, zero pendentes e zero versões somente remotas. A antiga pendência de reconciliação não é o bloqueador atual.
3. **Integridade no remoto:** `notification_provider_events.delivery_id` usa `ON DELETE CASCADE`; a referência inversa `delivery_state_source_event_id` usa `ON DELETE SET NULL`.
4. **RLS:** `pg_catalog` confirmou 16 tabelas privadas e nenhuma sem FORCE RLS. Isso não limita roles com BYPASSRLS.
5. **Role:** `site_api` existe, com BYPASSRLS e timeouts `8s/2s/10s`; não tem USAGE em `storage` nem DELETE em `storage.objects`.
6. **Correções anteriores presentes:** limpeza de repetição no logout, normalização compartilhada de rotas de telemetria, Retry-After, concorrência real da fila, housekeeping com SKIP LOCKED e separação da credencial de exclusão do Storage.
7. **CI do SHA atual:** Quality gate, banco isolado, Graphify e CodeQL aprovados. No PR #21, Dependency Review e Supabase Preview também aprovaram.
8. **Marca:** as quatro frases continuam no manifesto em `src/pages/HomePage.tsx`. As ocorrências de “equipe” localizadas em `src/lib/search.ts` são vocabulário interno de busca, não texto de atendimento visível.

Ledger alinhado não significa igualdade completa de todos os objetos SQL ou dados. Esta rodada verificou o ledger e invariantes selecionados do catálogo PostgreSQL; não certificou um diff integral de todos os schemas, políticas, extensões e configurações remotas.

## Achados prioritários ainda abertos

### P1 — Preview não está isolado ponta a ponta

O check Supabase Preview do PR #21 criou/validou a branch `unkaeotwziynruktxizp`. Entretanto, as entradas atuais `SITE_SUPABASE_URL` e `VITE_SITE_SUPABASE_URL` da Vercel têm alvos **Production e Preview**, sem restrição de branch, e ambas apontam para `xlzmclcjdncjfdrjxclt.supabase.co`. A entrada `SITE_SUPABASE_SECRET_KEY` também é compartilhada nesses dois ambientes; seu valor não foi exposto.

Além disso, `src/lib/siteSupabaseConfig.ts` e `api/_lib/siteDatabase.ts` aceitam somente esse host fixo. Portanto, criar a branch no Supabase não basta para conectar o runtime do Preview a ela. Injetar outra URL, sem uma solução segura para a validação de destino, seria rejeitado pelo código atual.

`api/_lib/leadHandler.ts` também valida a origem exata. Isso pode bloquear formulários em previews, mas **não deve ser tratado como isolamento de banco**. Não foi enviado formulário real para testar escrita. Não foi provado que todos os deployments antigos têm os mesmos valores incorporados.

**Aceite:** credenciais/destinos e origem específicos de preview, allowlist segura que continue proibindo o banco interno, dados sintéticos e teste autenticado demonstrando que o preview não lê/escreve dados de produção. Não remover a guarda existente às cegas.

### P1 — Cópias de orçamento e atendimento ainda não homologados

Os handlers, outbox, consentimento, recuperação, webhooks e estados existem. Porém, o inventário atual da Vercel não contém as variáveis de Resend/remetente nem as de WhatsApp/template/callback. `configuredChannels()` em `api/notifications.ts` não habilita esses canais sem configuração.

**Não é correto afirmar que o cliente já recebe automaticamente uma cópia no e-mail ou WhatsApp em produção.** O registro do orçamento no banco é uma entrega diferente do recebimento da mensagem. A fila automática de confirmação tem público cliente; a passagem ao especialista, responsável e SLA também precisa de aceite operacional.

**Aceite:** domínio/remetente, templates, consentimento, callbacks, conteúdo aprovado e ensaio com destinatário autorizado: aceito, entregue, rejeitado, timeout, repetição e recuperação. Confirmar o recebimento/tratamento pelo comercial. Não prometer exactly-once absoluto do WhatsApp na janela de aceite externo seguido de falha de persistência.

### P1 — Privilégio mínimo ainda não ativado integralmente

`SITE_SUPABASE_SERVICE_JWT` não consta nas variáveis de produção. A implementação prefere essa credencial quando disponível, mas hoje recorre à chave ampla. A separação da credencial de Storage evita uma falha conhecida no cutover; **não elimina o privilégio amplo**.

**Aceite:** ativar a role limitada para RPC, validar acesso/negação, definir o caminho mínimo de Storage e comprovar o ciclo completo antes de retirar a chave ampla. Role criada e testes pgTAP não substituem esse corte operacional.

### P1 — Backup não equivale a recuperação comprovada

Consulta atual retornou oito backups `COMPLETED`, `walg_enabled=true` e `pitr_enabled=false`. Não há evidência de restauração ensaiada com RPO/RTO medidos. O runbook de restore permanece faltante no conjunto planejado.

**Aceite:** definir RPO/RTO, decidir necessidade/custo de PITR e restaurar em destino isolado com verificação e registro. Escrever o procedimento é trabalho possível antes de contratar PITR; não classificar toda a pendência como impossibilidade técnica externa.

### P1 — Gates podem ser contornados por administrador

A proteção de `main` exige `validate`, `Build structural Graphify map` e `Migrations and pgTAP`, com atualização estrita; `enforce_admins=false`. `cross-browser` roda, mas não está na lista obrigatória retornada pela proteção.

**Aceite:** política de bypass/revisão explícita e compatibilidade de upgrades antes de merge. O histórico recente de dependências incompatíveis foi corrigido; não comprova prevenção de recorrência. O status “pass” do CodeRabbit contém “review skipped” e não é revisão independente realizada.

### P2 — Governança e documentação de conclusão estão defasadas

`docs/GOVERNANCA_FECHAMENTO.md` define `MATRIZ_FECHAMENTO_PLANOS_20260912.csv` como fonte única e exige atualização por PR. Existem linhas que ainda citam R08 não corrigido, ausência de webhooks e evidências de versões anteriores. O plano de 17/09 ainda descreve problemas de token/merge que já foram resolvidos.

O validador `ledger:check` verifica quantidade, IDs, estados e campos preenchidos. **Não valida cumprimento dos critérios, atualidade do SHA nem existência de cada arquivo citado.** Seu sucesso não fecha requisitos.

**Aceite:** atualizar o ledger vigente por evidência e responsabilidade, manter revisões históricas intactas e não promover P/E a I apenas porque o código foi publicado. Este relatório é uma auditoria, não uma substituição silenciosa do ledger.

## Matriz revista — todas as 50 etapas de 17/09

Legenda: **T** entrega técnica confirmada no escopo indicado; **P** parcial, incluindo aceite/validação restante; **N** entrega não localizada/comprovada; **D** alternativa ou adiamento documentado, sem implementação literal. T não certifica o produto inteiro; D não significa funcionalidade entregue.

| Etapa | Entrega | Estado | Evidência e aceite restante |
|---|---|---|---|
| 1 | Bundle/performance | T | Home lazy, orçamento de bundle e CI aprovados; versão publicada. CWV de campo é aceite separado. |
| 2 | Sincronização/merge | P | Local/main remoto e deploy alinhados; PRs fechados. Falta registrar disciplina recorrente exigida pelo plano. |
| 3 | Ledger de migrations | T | 44/44, zero divergências; não há migration pendente nesta consulta. |
| 4 | Acesso administrativo | P | CLI administrativa funciona. Mapa de responsáveis, escopo/cofre e runbook ainda precisam de registro operacional. |
| 5 | Contrato no SSOT | P | Referência SQL existe; ownership e reconciliação com o repositório interno não certificados. Não duplicar SSOT. |
| 6 | Dependências menores | P | Versões/testes/publicação confirmados; revisão de changelog exigida não tem registro de aceite. |
| 7 | Avaliar ESLint 10 | P | Incompatibilidade de plugins identificada e versão compatível restaurada. Falta matriz completa e decisão acompanhável. |
| 8 | Avaliar TypeScript 7 | P | Versão compatível restaurada após incompatibilidade de tooling. Falta avaliação isolada dos erros/breaking changes e tempos. |
| 9 | Gate npm audit | T | Obrigatório em `quality.yml`; CI atual aprovado. Não é auditoria total da aplicação. |
| 10 | Nomes/ordem de migrations | T | Validador, testes e gate anteriores ao banco presentes. |
| 11 | Sequência de eventos | T | Migration aplicada e contratos de estado/portal aprovados. |
| 12 | Máquina de estados | T | Trigger/transições e testes positivos/negativos presentes. |
| 13 | Lease da fila | T | Campos, recuperação e contratos SQL implementados. |
| 14 | Backoff/jitter/Retry-After | T | Política SQL e interpretação HTTP de Retry-After implementadas e testadas. |
| 15 | Política central da fila | T | Função e uso consistentes; SLA comercial real é separado. |
| 16 | Novo índice de claim | D | Alternativa medida/documentada; não contabilizar como criação do índice originalmente proposto. |
| 17 | Índice de lease | T | Índice parcial versionado/aplicado e testes presentes. |
| 18 | Planos de execução | T | Cinco consultas quentes e seis pré-condições: 11 asserções no teste JSON, fixture de 6.000 pedidos e notificações associadas. |
| 19 | Revisão mensal | P | Runbook existe; recorrência, responsável e ciclo com tráfego real não comprovados. |
| 20 | Tuning/autovacuum | P | Configuração/testes concluídos; observação operacional periódica herdada ainda sem evidência. |
| 21 | Protocolo humano | T | Persistência, geração, unicidade e testes presentes, migration aplicada. |
| 22 | Precedência de provedor | T | Máquina de eventos e testes concluídos; recebimento real permanece aberto. |
| 23 | Tipos do banco | P | Geração/diff no CI concluídos. Cliente usa `SupabaseClient` sem tipo Database; adoção em contratos/RPCs herdada não concluída. |
| 24 | Versionamento de RPC | T | Convenção formal e higiene de catálogo; não exige inventar v2 sem quebra. |
| 25 | Privilégio mínimo | P | Role/timeouts/grants presentes. Falta cutover e solução integral de Storage descritos acima. |
| 26 | FORCE RLS | T | 16/16 tabelas privadas confirmadas no remoto; testes de higiene presentes. |
| 27 | Proteção de PII proposta | D | Adiamento de criptografia de coluna fundamentado; hash/mascaramento não foram falsamente apresentados como proteção equivalente. |
| 28 | Token compartilhado | D | Risco do token público UUID aceito/documentado; token de gestão é hasheado. Nem todo token fica hasheado. |
| 29 | Rotação de segredos | P | Comparação em tempo constante testada; agenda/dono e execução de rotação não comprovados. |
| 30 | Retaguarda pg_cron | D | Adiada com pré-condições. Não há heartbeat independente entregue. |
| 31 | Retenção/dicionário | P | FKs e orquestração corrigidas/publicadas; comentários por tabela e políticas de logs/auditoria ainda incompletos. |
| 32 | Auditoria administrativa | P | Escritas/DDL registrados. Falta retenção/revisão operacional; não confundir com auditoria de SELECT. |
| 33 | Backup/PITR/restore | P | Oito backups concluídos; PITR desativado; sem drill/RPO/RTO certificados. |
| 34 | Timeouts por role | T | 8s/2s/10s confirmados no remoto e cobertos por pgTAP. |
| 35 | Saúde/alertas | P | Consulta e emissor existem; URL de alerta ausente, sem ensaio real nem monitoramento do cron silencioso. |
| 36 | Fase B do catálogo | N | Mudança no banco interno não comprovada. Exige inventário de consumidores e escopo próprio; não executar pelo site. |
| 37 | Contrato cross-projeto no CI | N | Workflow operacional correspondente não localizado; secrets GitHub retornam lista vazia. Mocks não substituem contrato remoto. |
| 38 | Branching por PR | P | Supabase Preview passou e provisionou branch; runtime Vercel continua configurado para o banco de produção do site. |
| 39 | SECURITY DEFINER interno | P | Inventário/propostas históricos não são auditoria integral nem correção. Não revalidado no banco protegido nesta rodada. |
| 40 | GraphQL interno | P | Proposta/decisão pendentes por consumidores; ausência de uso neste site não autoriza remoção no sistema interno. |
| 41 | FKs dos kits internos | P | SQL proposto não é prova de índices aplicados. Não certificados nesta rodada. |
| 42 | RLS de system_settings | P | Proposta existe; equivalência/aplicação não certificadas. Duas policies não significam automaticamente vulnerabilidade. |
| 43 | Inventário interno | P | Inventário resumido existe; reconciliar responsabilidade com o SSOT interno, não copiar toda a governança para o site. |
| 44 | Advisor interno no CI | N | Não existe rotina operacional correspondente no repositório do site; pertence a escopo interno separado. |
| 45 | Runbook do banco interno | T | Documento de leitura/escalonamento presente. Não concede autorização de escrita. |
| 46 | Regressões/logout/navegadores | T | Correções presentes, reset de repetição testado e CI cruzado aprovado. Não equivale a teste em dispositivos físicos. |
| 47 | Campanhas/conflitos/métricas | P | Persistência local e eventos presentes; ausência de versões/sincronização e resolução de conflito. |
| 48 | Governança das matrizes | P | Fonte única definida, mas linhas e conclusões estão desatualizadas frente aos PRs publicados. |
| 49 | Runbooks/drills/revisão | P | Procedimentos parciais; faltam restore, revisão independente registrada e ensaios completos de incidente. |
| 50 | Encerramento/release | P | Merges/publicação ocorreram. Não há aceite integral dos planos; deployment verde não fecha requisitos pendentes. |

## Planos de produto — 230 referências

### Estados registrados no ledger, não nova certificação

| Plano | Referências | I | P | N | E |
|---|---:|---:|---:|---:|---:|
| UX | 100 | 41 | 50 | 5 | 4 |
| Inspiração Lukka | 50 | 12 | 26 | 5 | 7 |
| Graphify | 50 | 24 | 26 | 0 | 0 |
| Área do cliente | 30 | 23 | 7 | 0 | 0 |
| Total | 230 | 100 | 109 | 10 | 11 |

### Todas as dez referências registradas como não implementadas

| ID | Falta real | Como comprovar conclusão |
|---|---|---|
| UX34 | Dataset de relevância da busca com julgamentos comerciais | Consultas representativas, resultados julgados, métrica e limiar de regressão. Sinônimos/testes unitários não bastam. |
| UX59 | Seleções/rascunhos sincronizados após login | Salvar em A, abrir em B autenticado e recuperar; isolamento entre titulares. Histórico de pedidos enviados é diferente. |
| UX60 | Versões/conflitos/arquivo de campanhas | Edição concorrente, detecção/resolução sem perda, arquivar/restaurar. `storage` hoje substitui estado local. |
| UX65 | Upload privado de logo/referência | Upload real com limites, autorização por titular, política de expiração/exclusão e rejeição de arquivo inválido. Hoje há um select de estado da marca. |
| UX84 | Publicação operacional PDF/revista | Arquivo real, revisão, validade, publicação/retirada e controle de download. As dez coleções atuais são online. |
| LK10 | Categorias fotográficas | Acervo autorizado e entradas fotográficas responsivas. Categorias iconográficas não entregam a proposta literal. |
| LK27 | Templates de composição de kits | Modelo com componentes reais e alternativas substituíveis. Um SKU marcado kit não é composição. |
| LK28 | Configurador/substituição de componentes | Alterar componente mantendo seleção, validade e resumo consistente. |
| LK29 | Aritmética de kits | Quantidade de kits × unidades de cada componente, mínimos e snapshots corretos no pedido. |
| LK43 | Logo/referências privadas | Mesmo recurso de UX65: não contar duas implementações independentes. |

Esses itens não são apenas “pendências externas”. Sincronização, composição, upload e governança editorial têm trabalho de engenharia faltante. Conteúdo/autorização comercial e decisões de comportamento são dependências específicas, não justificativa para declarar a função pronta.

### Entregas parciais por jornada e aceite restante

| Área / referências principais | Presente | Aceite ainda faltante |
|---|---|---|
| Navegação — UX11–18, LK05/09/12 | Cabeçalho, busca móvel, estados e padrões visuais | Pesquisa por tarefas, hierarquia/handoffs, revisão de diálogos e rótulos com usuários. |
| Marca/home — UX21/23/24, LK06/14/17 | Quatro frases, animação, campanhas e vitrines | Fotografia própria autorizada, curadoria diversa e validação da ordem por intenção. |
| Busca — UX31/32/34/35/39/40, LK20 | Briefing, sinônimos, tolerância, URL/filtros | Dataset julgado, ranking comercial, diversidade e pertinência das recomendações/vazios. |
| Produto — UX41/43/47/49, LK22/23/25 | Badge único, mínimos, galeria, variantes e FAQ | Qualidade por família, múltiplos, técnicas/áreas verificadas e relacionados por intenção. Estoque não deve esconder produtos. |
| Seleção — UX53–60, LK26–30/37/38 | Carrinho local, comparação, links e impressão | Conta/dispositivos, conflitos, ciclo de campanhas, composição e PDF extenso mantendo semântica. |
| Briefing — UX06/07/64/65/67, LK42/43 | Validação, rascunho, idempotência e reset | Upload privado, revisão de esforço e confirmação/encaminhamento operacional. |
| Confirmações — UX68/69, LK45 | Outbox, leases, recuperação, webhooks e precedência | Configuração e entrega real; conteúdo e consentimento homologados; tratamento de falhas externas. |
| Atendimento — UX70/75/77 | Histórico, timeline e solicitação de ajuste | Recebimento pelo comercial, responsável/SLA e ciclo pedido→proposta→ajuste operado. |
| Conta — AC04/06/07/10/24/29/30, UX73/76/79/80 | Auth, titularidade, histórico, proposta privada, URL assinada | E-mail Auth real, refresh e fluxos completos com usuários autorizados, publicação/retirada de PDF e revisão de privacidade. |
| Catálogos — UX83/84, LK14/15/36 | Dez coleções online e filtros | PDF/revista reais, responsável editorial, validade/revisão e diferenciação de acervo. |
| Datas — UX86/88/89 | Lista/calendário, favoritos locais e ICS | Calendários reais, reimportação, viabilidade comercial e continuidade por conta. |
| Marketing — UX26/28/30, LK03/31–35/39/40 | Contato, redes, textos e processo | Cases/fotos autorizados, canais oficiais, horários e comprovação das capacidades divulgadas. |
| Métricas/SEO — UX92/93/97, LK47–49 | Eventos com minimização corrigida, metadados, 404 e budgets | Recepção/deduplicação real, métricas acionáveis, CWV de campo e previews por coleção/data. |
| Qualidade — UX94/95/98/99/100, LK46/50 | Testes automatizados, axe, SQL, build e publicação | Leitor de tela, dispositivos físicos, restore, resiliência operacional e aceite pós-publicação. |
| Graphify — GR03/08/18/21/25/31–37/42–50 | Extração AST, wrappers, benchmark e base/head | `path/explain` no wrapper, pass documental/semântico separado, requisito→deploy e matriz completa de conteúdo hostil/falhas/recuperação/precisão. |

As onze linhas externas são UX20/26/28/91 e LK02/03/31/32/33/34/40. Não foram convertidas em conclusão automática por existirem telas ou testes. As alternativas GR14/24/26/30 foram formalmente adotadas em `GOVERNANCA_FECHAMENTO.md`; não devem ser reabertas como bugs apenas por diferirem do plano literal.

## Critérios herdados que não podem desaparecer na revisão

- **Tipos (16/09, etapa 21):** gerar e comparar não encerra a adoção em `contracts.ts`/cliente. O critério estava explícito no plano original.
- **Apagamento (16/09, etapa 32):** a RPC retorna caminhos para limpeza do Storage e não grava o evento `erased` previsto. Seu comentário também explicita limite de cobertura de texto livre. Não confundir com a retenção automática corrigida.
- **Telefone (16/09, etapa 24):** E.164 foi formalmente adiado; normalização de e-mail está implementada. É decisão registrada, não esquecimento a corrigir às cegas.
- **Soak:** cenário com provedor simulado/polling local não comprova tempo de entrega sob o cron/limites reais da Vercel.
- **Planos SQL:** agora cobrem as cinco consultas. A fixture usa 6.000 pedidos e notificações associadas, não a quantidade literal de 10 mil por tabela citada anteriormente; isso não invalida o teste de seletividade, mas não é benchmark de escala de produção.
- **Cobertura:** gate de coverage passou a integrar CI. A antiga afirmação de execução somente manual está obsoleta. Cobertura agregada não significa 100% de regras ou UI.
- **Graphify:** parser SQL e benchmark foram corrigidos. Isso não entrega o pass semântico de documentação nem transforma grafo não direcionado em dependência causal.
- **Arquitetura:** o limite literal de 300 linhas em páginas não foi uniformemente cumprido. Refatorar apenas por contagem não deve substituir teste de responsabilidade/coerência; registrar alternativa se o critério mudar.
- **Banco interno:** ausência das migrations internas no repositório do site não prova ausência de SSOT. Não importar automaticamente o schema interno nem executar SQL proposto para “fechar” o plano.

## Evidência de validação e limites

| Evidência | Resultado | Interpretação correta |
|---|---|---|
| Reexecução Vitest dirigida nesta revisão | 5 arquivos, 34 testes aprovados | Repetição, analytics, observabilidade, notificações e retenção; HTTP/provedores simulados. |
| `ledger:check` nesta revisão | 230 IDs únicos, aprovado | Validade estrutural; não completude semântica. |
| Consulta do ledger remoto nesta revisão | 44/44; zero pendentes/remote-only | Conciliação de versões, não diff integral de schema/dados. |
| `pg_catalog` remoto nesta revisão | 16/16 FORCE RLS; FKs corrigidas; role/timeouts confirmados | Invariantes selecionados, sem mutação no remoto. |
| Inventário Vercel nesta revisão | URLs Production/Preview compartilhadas; providers/alerta/JWT limitado ausentes | Nenhum valor secreto registrado; recebimento de mensagens não homologado. |
| Backup nesta revisão | 8 completos, PITR false | Restauração não executada. |
| CI do SHA atual | Quality, banco, Graphify e CodeQL aprovados | Evidência do commit, não novo teste manual de cada requisito. |
| Suíte da publicação anterior, reconsultada via CI | 247 Vitest; 33 contratos Node; 357 pgTAP; 3 testes de concorrência | Contagens da validação completa já realizada, não execução integral repetida nesta revisão. |
| Navegadores da publicação | Chromium 80 aprovados/4 skips; Firefox/WebKit 74/10 | Skips por viewport/motor e execução axe só no Chromium; não equivalem a falhas ou dispositivos físicos. |

A validação HTTP da publicação (11 rotas 200, rota desconhecida 404) continua evidência de disponibilidade, não de envio de orçamento, e-mail, login ou operação comercial completa.

### Experimento adversarial adicional no banco local

O teste de planos SQL passou suas 11 asserções no cenário base. Remover transacionalmente o índice de histórico fez falhar a asserção específica de histórico: há evidência de sensibilidade a essa regressão, não apenas um teste sempre verde.

As variantes adicionais de remoção dos índices de retenção, lease e webhook ficaram **inconclusivas por timeout**. A primeira abordagem removia o índice antes de montar a fixture e interferiu no próprio preparo; as sessões locais pertencentes ao experimento foram canceladas. A segunda colocou a remoção após o preparo e usou limites explícitos de statement/lock, mas também não completou dentro do limite. Não contar esses ensaios como aprovados nem como prova de defeito do produto. Os cinco planos continuam cobertos pela execução base/CI; a sensibilidade adversarial completa ainda não foi demonstrada.

Verificação final de limpeza: os quatro índices usados nos experimentos existem e há zero pedidos com `client_request_id` da fixture `query-plan-fixture-%`. Nenhuma dessas mutações foi executada no Supabase remoto.

## Ordem recomendada de fechamento

1. Isolar efetivamente Preview/Produção sem enfraquecer as guardas de banco.
2. Homologar confirmações e encaminhamento comercial com provedores reais e destinatários controlados.
3. Concluir privilégio mínimo, alertas/heartbeat e recuperação/restore com responsabilidades e critérios claros.
4. Corrigir o ledger vigente e a disciplina de proteção/upgrade para impedir conclusões e merges inconsistentes.
5. Desenvolver sincronização/campanhas, uploads, kits compostos e biblioteca editorial — cada um com contrato/testes próprios.
6. Fechar aceites de curadoria, relevância, conteúdo autorizado, acessibilidade manual e métricas de campo.
7. Tratar itens do Promo Gifts em escopo separado; propostas locais não autorizam alterações naquele sistema.

**Conclusão:** a publicação e o ledger de migrations estão em dia; a execução total dos planos ainda não. Não há fundamento para declarar “10/10”, “só falta uma migration” ou “restam apenas tarefas externas”.
