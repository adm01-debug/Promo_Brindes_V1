# Anexo — revisão das 150 referências dos planos técnicos

Base: `11f0d35`, 23/09/2026. Leia o [parecer, achados e evidências](REVISAO_PLANOS_20260923.md). Os planos de 16 e 17/09 reabrem ou estendem os anteriores: **não somar as linhas como funcionalidades independentes**.

## Critério de leitura

- **T — entrega técnica evidenciada:** código/configuração/SQL e testes existentes sustentam a entrega no recorte descrito. Não significa todos os checkboxes históricos, homologação humana ou novo teste individual.
- **P — parcial/não certificado integralmente:** há entrega, mas falta critério literal, evidência operacional ou correção.
- **N — entrega não localizada:** não encontrada a entrega indicada, sem concluir que inexiste fora deste repositório.
- **D — decisão/alternativa documentada:** desvio deliberado; não converter em omissão ou implementar automaticamente.
- **X — depende do Promo Gifts protegido:** fora do escopo de alteração e sem recertificação de seu banco nesta rodada.

Títulos foram extraídos dos planos; anotações de “concluída” que permaneçam no título são históricas. A coluna Revisão, com seus limites, prevalece neste anexo. `T17-NN` aponta uma etapa sobreposta, não nova dependência criada por esta revisão.

Evidências comuns: suíte atual 348 testes Vitest e 533 asserções SQL locais; workflows main atuais aprovados; fontes mais específicas e defeitos A01–A05 no parecer. Não foi aberto PR experimental com falha deliberada nem realizado restore/ensaio de provedor real.

## T13 — [Plano 13/09](PLANO_CORRECOES_50_ETAPAS_20260913.md)

| ID | Etapa original | Revisão | Situação e aceite restante |
|---|---|---|---|
| T13-01 | Versionar os artefatos de auditoria pendentes | T | Artefatos históricos foram versionados, inclusive PR34. Novos arquivos desta auditoria são deliberadamente locais, sem commit. |
| T13-02 | Introduzir ESLint 9 com flat config | T | ESLint flat config com checagens de tipos/React/a11y existe; lint local aprovado. |
| T13-03 | Reativar as três supressões órfãs de `exhaustive-deps` `[NOVO]` | T | Supressões agora submetidas ao linter e acompanhadas de justificativas; isto não prova correção de todo ciclo de efeitos (A01–A03). |
| T13-04 | Ativar `strict` no `tsconfig.node.json` `[NOVO]` | T | strict ativo nos projetos frontend/backend; typecheck local aprovado. |
| T13-05 | Endurecer os dois tsconfig — **concluída parcialmente em 14/09, com desvio registrado** | D | noUncheckedIndexedAccess já foi ativado; flags de unused substituídas deliberadamente por ESLint. Não reabrir escolha duplicada de lint. |
| T13-06 | `.editorconfig` e `.gitattributes` — **revisada durante a execução** | P | EditorConfig/gitattributes presentes; decisão de não adotar Prettier documentada. Ensaio literal de editar/reabrir no Windows não executado nesta rodada. |
| T13-07 | Incluir lint no `check` e no CI | T | Lint integra check/CI. Não criado PR defeituoso artificial nesta auditoria. |
| T13-08 | Configurar cobertura com limiar | T | Cobertura e thresholds configurados no gate; não significa cobertura total de requisitos. A01–A05 são contraprovas de completude. |
| T13-09 | Contrato único de limpeza de dados pessoais | P | Contrato de limpeza do orçamento/contato entregue. Estado novo de favoritos mostra A02/A03, então isolamento global de toda a experiência não está fechado. |
| T13-10 | Expor troca de titular como evento no contexto | T | identityEpoch e proteção geral de sessão implementados; precisam ser corretamente consumidos também pelas novas mutações de favoritos. |
| T13-11 | Resetar os estados do QuotePage no logout | T | Formulário de orçamento reage à identidade; regressões existentes do lote antigo preservadas. |
| T13-12 | Cancelar requisição em andamento no logout | T | AbortSignal encadeado para envio em andamento; proteção não equivale à invalidação de todas as promises do site. |
| T13-13 | Regressões E2E de troca de sessão | P | E2E de logout entre abas/envio existem. Troca direta A→B e favoritos autenticados ainda não têm matriz permanente completa; probes desta revisão não substituem essa suíte. |
| T13-14 | Validar o retorno booleano da finalização (R01) | T | Finalização false não é tratada como sucesso; contratos de API/SQL testados. |
| T13-15 | Emitir token de lease na reivindicação (R04) | T | Token de lease acompanha finalização; testes de posse existem. |
| T13-16 | Exigir o lease na finalização (R04) | T | Finalização exige lease vigente/correspondente; cobertura local aprovada. |
| T13-17 | Separar recuperação de `processing` do limite de tentativas (R03) | T | Recuperação de leases esgotados implementada/testada. |
| T13-18 | Estado terminal para tentativa esgotada (R03) | T | Estado terminal de tentativas esgotadas implementado/testado. |
| T13-19 | Chave de idempotência no WhatsApp (R02) | P | WhatsApp tem marcação dispatch_started e bloqueio de repetição no estado inconclusivo. Não há prova de exactly-once externo; ensaio real adiado. |
| T13-20 | Modelar o resultado inconclusivo | T | Aceite inconclusivo tem tratamento distinto de falha segura para retry; contratos locais presentes. |
| T13-21 | Reconciliação por identificador do provedor | T | Registro/reconciliação de provider_message_id implementados/testados. |
| T13-22 | Matriz pgTAP de retomadas | T | pgTAP de claims/posse/recuperação presente; suíte local de banco passou. |
| T13-23 | Testes de API dos novos contratos | T | Testes de contratos da API presentes; envio real continua critério separado. |
| T13-24 | Declarar `maxDuration` das funções na Vercel `[NOVO]` | T | maxDuration/orçamento de execução serverless configurados. |
| T13-25 | Orçamento de tempo por job, não por lote | T | Orçamento de tempo do processamento da fila implementado/testado. |
| T13-26 | Timeout por canal na confirmação imediata | T | Timeout por canal implementado; cancelamento local não garante cancelamento no provedor. |
| T13-27 | Frequência do cron compatível com o SLA | P | Cadência de cron existe. SLA/comportamento sob tráfego real e detecção independente de silêncio ainda sem aceite. |
| T13-28 | Drenagem de múltiplos lotes por invocação | T | Processamento de lotes dentro do budget implementado/testado. |
| T13-29 | Monitoramento de idade da fila | P | Idade/saúde da fila disponíveis. Canal de alerta e limiar/SLA homologados em produção não entregues. |
| T13-30 | Webhooks de entrega e devolução (R07) | P | Callbacks assinados e reconciliação presentes, mas ciclo real com destinatário controlado adiado. |
| T13-31 | Definir o conteúdo do comprovante (R06) | P | Conteúdo da cópia continua parcial: itens/protocolo/contato sem briefing integral, datas/verba e estrutura de kits. Falta contrato/template e aprovação de conteúdo. |
| T13-32 | Carregar GSAP sob demanda | T | Carregamento lazy de animação presente; budget atual aprovado. |
| T13-33 | Recuperar folga no bundle de entrada | T | Budget de entrada bloqueante e medição no Quality gate aprovados. |
| T13-34 | Medir o orçamento em bytes comprimidos | T | Limites de assets/compressão fazem parte do controle técnico; campo p75 permanece separado. |
| T13-35 | Revisar o peso do CSS | P | CSS ainda concentrado; não demonstrada redução/decomposição completa com comparação antes/depois de todos os critérios literais. |
| T13-36 | Verificar o tree-shaking do lucide-react | P | Imports seletivos presentes. Auditoria integral de bundle/tree-shaking e aceite de todos os critérios não refeitos nesta rodada. |
| T13-37 | Métricas de campo (Core Web Vitals) | P | Não há CWV p75 real e baseline comparável documentados como aceite concluído. |
| T13-38 | Erro 500 deixa de ser silencioso | T | Tratamento/redação de logs de erro implementado; sem anexar PII real nesta auditoria. |
| T13-39 | Instrumentar os `catch` silenciosos | P | Capturas intencionais e degradação segura existem. Nem todo catch foi recertificado individualmente; callbacks tardios de favoritos têm falha confirmada. |
| T13-40 | Identificador de correlação fim a fim | P | Correlação existe na entrada/logs. Percurso completo até provedor, destinatário e comercial sem ensaio real ponta a ponta. |
| T13-41 | Alertas do cron | P | Código de alertas presente; variáveis/canal real adiados pelo usuário. |
| T13-42 | Relato de erros do frontend | P | Redação/minimização de erros do cliente implementada. Recepção, deduplicação e interpretação em ferramenta real não certificadas. |
| T13-43 | Atualização escalonada de dependências | P | Atualizações compatíveis entregues e testadas. Avaliações isoladas de majors e aceite documental completo pendentes. |
| T13-44 | Atualização automatizada de dependências | T | Automação de atualização de dependências versionada. |
| T13-45 | Análise estática de segurança no CI | T | CodeQL ativo, run do SHA atual aprovado; não certificado de ausência de falhas. |
| T13-46 | Resolver o check Supabase Preview | P | Gates/guardas de preview existem. Check ignorado em PR só documental não é falha nem prova de preview autenticado isolado funcional. |
| T13-47 | Acessibilidade além do axe | P | Automação de acessibilidade e teclado presente; leitor de tela/dispositivo físico ainda sem homologação completa. |
| T13-48 | Decompor os módulos de maior superfície | P | CatalogPage decomposto. HomePage, CommemorativeDatesPage, QuotePage e CatalogsPage ainda excedem o alvo literal de 300 linhas; não é erro funcional por si. |
| T13-49 | Fechar as 12 referências ausentes por lotes coerentes | P | Diversas lacunas antigas já receberam código. A01–A05, conteúdo/integração/comercial e critérios dos anexos impedem fechamento global. |
| T13-50 | Governança do ledger de fechamento | P | Matriz e governança existem, mas notas e rótulos não acompanham #33. Validador estrutural não valida semântica; atualizar com correções. |

## T16 — [Plano 16/09](PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md)

| ID | Etapa original | Revisão | Situação e aceite restante |
|---|---|---|---|
| T16-01 | Confirmar reconciliação do ledger remoto de migrations | T | Mesmo escopo de T17-03. Dry-run administrativo do site sem migrations pendentes; release consulta igualdade exata de versões. Não é diff integral de schema/dados. |
| T16-02 | Commitar, publicar e abrir PR do branch `fix/supabase-ledger-ordering` | T | Mesmo escopo de T17-02. HEAD, origin/main e main remota iguais a 11f0d35. Diagnóstico de nove commits de atraso não vale para esta rodada. |
| T16-03 | Normalizar a migration do contrato canônico em coordenação com `Promo_Gifts_V4` | X | Mesmo escopo de T17-05. Coordenação/registro do contrato no Promo Gifts não certificados. Não alterar o repositório ou banco protegido a partir deste plano do site. |
| T16-04 | Guardrail de nome e ordem de migrations no CI | T | Mesmo escopo de T17-10. Guarda de nomes/ordem das migrations integrada ao CI e testes. |
| T16-05 | Higiene de branches locais e `main` | P | main atual sincronizada; higiene completa de branches/remoção de branches antigas não certificada. Não apagar branches como efeito colateral de auditoria. |
| T16-06 | Conector operacional e runbook de verificação em 5 comandos | T | Runbook de verificação existe e acesso administrativo de leitura funcionou. Não persistir token de chat nem tratá-lo como proprietário nominal permanente. |
| T16-07 | Sequência monotônica em `quote_request_events` | T | Mesmo escopo de T17-11. Sequência monotônica de eventos implementada em migrations e exercitada no pgTAP. |
| T16-08 | Máquina de estados de `quote_requests.status` por trigger | T | Mesmo escopo de T17-12. Transições de estado protegidas por trigger e testes SQL. |
| T16-09 | Máquina de estados de `notification_deliveries.status` por trigger | T | Máquina de estados de notification_deliveries implementada/testada. |
| T16-10 | `lease_expires_at` e `claimed_at` explícitos na fila | T | Mesmo escopo de T17-13. Campos de lease/claimed_at e proteção de posse presentes, com testes. |
| T16-11 | Backoff exponencial com jitter calculado no servidor | T | Mesmo escopo de T17-14. Backoff, jitter e tratamento de Retry-After implementados/testados; provedor real ainda distinto. |
| T16-12 | Política única da fila (`site_private.notification_policy()`) | T | Mesmo escopo de T17-15. Política de fila centralizada; testes verificam limites/contratos. |
| T16-13 | Índice alinhado à ordem de reivindicação da fila | D | Mesmo escopo de T17-16. Índice literal alternativo foi avaliado; decisão de manter estrutura conforme medição não deve ser reaberta só por checkbox antigo. |
| T16-14 | Índice de recuperação de lease em `processing` | T | Mesmo escopo de T17-17. Índice para recuperação de processing/lease existe e tem validação SQL. |
| T16-15 | Índice único de reconciliação `(provider, provider_message_id)` | T | Unicidade de provider/provider_message_id implementada/testada. |
| T16-16 | Índices de FK e de filtros do portal do cliente | T | Índices de FK/filtros do portal presentes e testes locais aprovados. |
| T16-17 | Testes de plano de execução | P | Mesmo escopo de T17-18. Testes de plano existem: cinco consultas, onze asserções, fixture de 6.000 linhas. Não provam escala/estatística de produção nem todo volume originalmente desejado. |
| T16-18 | Revisão mensal de `pg_stat_statements` e índices sem uso | P | Mesmo escopo de T17-19. Runbook de revisão mensal existe. Não localizado ciclo recorrente com tráfego real, responsável e comparação de estatísticas. |
| T16-19 | Protocolo humano persistido e único | T | Mesmo escopo de T17-21. Protocolo humano único persistido e testado. |
| T16-20 | Precedência semântica de eventos de provedor | T | Mesmo escopo de T17-22. Precedência semântica de eventos implementada e testada; recebimento real/callback autenticado em produção não homologado aqui. |
| T16-21 | Tipos TypeScript gerados do schema e diffados no CI | P | Mesmo escopo de T17-23. Tipos gerados/diff e SupabaseClient<Database> existem. Contratos normalizados da API ainda têm estruturas manuais/JSON; aceite literal de adoção integral parcial. |
| T16-22 | Catálogo único de erros das RPCs | T | Catálogo de erros e contratos entre API/SQL presentes. |
| T16-23 | Convenção formal de versionamento de RPC | T | Mesmo escopo de T17-24. Convenção de RPC versionada presente; monitorar futuras alterações pelo contrato. |
| T16-24 | Normalização canônica de e-mail e telefone | P | Normalização de e-mail existe; telefone E.164 completo depende de contrato/decisão explícita. Não inferir DDI de todos os números por heurística. |
| T16-25 | Role `site_api` com privilégio mínimo no lugar de `service_role` | P | Mesmo escopo de T17-25. Role/grants/runbook/código preparados. Corte de produção por SITE_SUPABASE_SERVICE_JWT adiado pelo usuário; não dizer privilégio mínimo ativo só pela migration. |
| T16-26 | `force row level security` e teste que varre todas as tabelas | T | Mesmo escopo de T17-26. FORCE RLS e varredura SQL local presentes. Novo inventário integral de policies/grants remoto não executado nesta rodada. |
| T16-27 | PII em repouso: hash para busca e mascaramento nas funções `get_my_*` | D | Mesmo escopo de T17-27. Escopo de criptografia/PII foi objeto de decisão documentada. Hash para busca não equivale a criptografia; não anunciar proteção que não existe. |
| T16-28 | Revisão da exposição do token público de seleção compartilhada | D | Mesmo escopo de T17-28. Token público opaco/revogável por desenho, segredo de revogação separado; revisão resultou em alternativa adotada, não tarefa de hash indiscriminado. |
| T16-29 | Rotação programada de segredos e comparação em tempo constante | P | Mesmo escopo de T17-29. Comparação em tempo constante e runbook existem; periodicidade de 90 dias já consta. Falta execução programada, responsável e evidência de rotação. |
| T16-30 | Rate limit em duas camadas e `rate_limit_buckets` UNLOGGED | T | Rate limit em camadas e armazenamento UNLOGGED presentes; testes locais aprovados. |
| T16-31 | `db lint --fail-on warning` e Security Advisor no CI | P | db lint bloqueante integrado ao CI. Security Advisor remoto recorrente não se confunde com lint local e não foi recertificado nesta rodada. |
| T16-32 | RPC de apagamento LGPD (`erase_customer_data`) | P | Apagamento reforçado com auth/tombstone/fila de Storage. Evento literal erased em timeline e exercício operacional de titular não comprovados; tombstone não é esse evento. |
| T16-33 | Purga em lotes com índice parcial em `retention_until` e teste de falha parcial | T | Retenção tolerante a falhas parciais e proteção contra FK/cascade implementadas/testadas. |
| T16-34 | `pg_cron` como retaguarda dos crons da Vercel | D | Mesmo escopo de T17-30. Retaguarda pg_cron adiada por decisão registrada; não instalar automaticamente. Detecção independente de cron silencioso permanece pendência de operação. |
| T16-35 | Política de retenção por tabela e dicionário de dados gerado | P | Mesmo escopo de T17-31. Migrations de retenção/cascade e dicionário foram atualizados, inclusive lote #32; execução regular e política operacional por tabela ainda exigem evidência. |
| T16-36 | Trilha de auditoria de acesso administrativo direto | P | Mesmo escopo de T17-32. Trilha de escrita/DDL presente. Não comprova auditoria de todos os acessos SELECT nem revisão administrativa periódica. |
| T16-37 | Teste de concorrência real da fila | T | Teste de concorrência real com duas sessões SQL consta do CI; não apenas duas promises mockadas. |
| T16-38 | Soak test da fila e calibração dos limiares de alerta | P | Há soak histórico com 1.000 tarefas simuladas/polling. Não representa cron+provedores reais sob carga; calibração operacional de limiares não certificada. |
| T16-39 | Backups: PITR confirmado e drill de restore trimestral | P | Mesmo escopo de T17-33. RUNBOOK_RESTORE_SITE.md existe. PITR/backup atual e drill com RPO/RTO medidos não certificados; não executar restore destrutivo como teste. |
| T16-40 | Autovacuum e `fillfactor` para tabelas de alta rotatividade | T | Mesmo escopo de T17-20. Configurações de fillfactor/autovacuum e validações implementadas; acompanhamento operacional é separado. |
| T16-41 | Timeouts por role | T | Mesmo escopo de T17-34. Timeouts por role implementados/testados. |
| T16-42 | Saúde da fila integrada aos alertas operacionais com SLA | P | Mesmo escopo de T17-35. Integração de alerta existe. Canal real adiado; alerta independente de cron silencioso não entregue; SLA não homologado. |
| T16-43 | Fase B do contrato público | X | Mesmo escopo de T17-36. Revogação da view legada/Fase B afeta consumidores do Promo Gifts; depende de inventário e autorização específicos. |
| T16-44 | Cache de borda para catálogo, página de produto e sitemap | P | Headers/cache público implementados; confirmar alcance de catálogo e produto, pois consultas diretas do cliente não ganham cache de borda automaticamente. |
| T16-45 | Incorporar o contrato ao SSOT e definir destino de `supabase/` | X | Espelho de contrato foi separado como documentação somente leitura. Incorporação/estado no SSOT do Promo Gifts não certificados; não mexer no protegido. |
| T16-46 | Teste de contrato cross-projeto no CI | N | Mesmo escopo de T17-37. Não localizado workflow real cross-projeto que compare as 36 colunas/permissões da origem. Mocks locais não substituem esse aceite. |
| T16-47 | Supabase Branching por PR com dados sintéticos | P | Mesmo escopo de T17-38. Guarda fail-closed e runbook de preview existem. Branching/ambiente sintético, URL/chaves/CSP e jornada autenticada por PR ainda não certificados. |
| T16-48 | ERD e `DATABASE_SCHEMA.md` gerados; drift `db diff` vazio | P | ERD/dicionário/tipos gerados existem. Dry-run de migrations não substitui db diff integral remoto vazio, não executado nesta rodada. |
| T16-49 | Runbooks de incidente | P | Mesmo escopo de T17-49. Runbooks existem, inclusive restore e rotação. Revisão por pares/ensaios e evidências operacionais não localizados como concluídos. |
| T16-50 | Encerramento | P | Mesmo escopo de T17-50. PRs anteriores foram integrados e release 11f0d35 aprovado. Fechamento integral e todos os critérios de tag/revisão/homologação não comprovados; nota antiga de PR14 aberto está vencida. |

## T17 — [Plano 17/09](PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md)

| ID | Etapa original | Revisão | Situação e aceite restante |
|---|---|---|---|
| T17-01 | Corrigir a regressão do orçamento de performance | T | Budget técnico corrigido; Quality gate atual aprovado. Sem certificação de CWV em campo. |
| T17-02 | Sincronizar `main` local e mergear o PR #13 | T | HEAD, origin/main e main remota iguais a 11f0d35. Diagnóstico de nove commits de atraso não vale para esta rodada. |
| T17-03 | Confirmar reconciliação do ledger remoto de migrations do site | T | Dry-run administrativo do site sem migrations pendentes; release consulta igualdade exata de versões. Não é diff integral de schema/dados. |
| T17-04 | Provisionar token/conector com acesso real ao projeto do site | T | Acesso administrativo de leitura funcionou no dry-run. Bloqueio histórico por falta de token não se confirmou agora; segredos não foram expostos. |
| T17-05 | Normalizar a migration do contrato canônico com `Promo_Gifts_V4` | X | Coordenação/registro do contrato no Promo Gifts não certificados. Não alterar o repositório ou banco protegido a partir deste plano do site. |
| T17-06 | Atualizar dependências menores | P | Versões-alvo menores estão instaladas e CI passa; o próprio plano registra falta de revisão de changelog. Aceite documental completo não comprovado. |
| T17-07 | Plano de migração isolado para ESLint 9→10 | P | Há evidência histórica de incompatibilidade de peers e restauração da versão compatível em 22/09. Falta matriz de compatibilidade/decisão isolada completa; manter ESLint 9 não é defeito por si. |
| T17-08 | Plano de migração isolado para TypeScript 5.9→7.0 | P | Há evidência histórica de incompatibilidade de tooling e restauração da versão compatível em 22/09. Falta avaliação isolada completa de erros e tempos; não atualizar major automaticamente. Não foi feita consulta de versões de mercado nesta rodada. |
| T17-09 | `npm audit` como gate obrigatório no CI | T | npm audit integra o gate; workflow vigente aprovado. Não equivale a ausência universal de vulnerabilidades. |
| T17-10 | Guardrail de nome/ordem de migrations no CI | T | Guarda de nomes/ordem das migrations integrada ao CI e testes. |
| T17-11 | Sequência monotônica em `quote_request_events` | T | Sequência monotônica de eventos implementada em migrations e exercitada no pgTAP. |
| T17-12 | Máquina de estados de `quote_requests.status` por trigger | T | Transições de estado protegidas por trigger e testes SQL. |
| T17-13 | `lease_expires_at`/`claimed_at` explícitos na fila | T | Campos de lease/claimed_at e proteção de posse presentes, com testes. |
| T17-14 | Backoff exponencial com jitter calculado no servidor | T | Backoff, jitter e tratamento de Retry-After implementados/testados; provedor real ainda distinto. |
| T17-15 | Política única da fila `site_private.notification_policy()` | T | Política de fila centralizada; testes verificam limites/contratos. |
| T17-16 | Índice alinhado à ordem de reivindicação da fila | D | Índice literal alternativo foi avaliado; decisão de manter estrutura conforme medição não deve ser reaberta só por checkbox antigo. |
| T17-17 | Índice de recuperação de lease em `processing` | T | Índice para recuperação de processing/lease existe e tem validação SQL. |
| T17-18 | Testes de plano de execução (sem Seq Scan nas rotas quentes) | P | Testes de plano existem: cinco consultas, onze asserções, fixture de 6.000 linhas. Não provam escala/estatística de produção nem todo volume originalmente desejado. |
| T17-19 | Revisão mensal de `pg_stat_statements` e índices sem uso — permanece aberta | P | Runbook de revisão mensal existe. Não localizado ciclo recorrente com tráfego real, responsável e comparação de estatísticas. |
| T17-20 | Concluir `fillfactor`/autovacuum nas tabelas de alta rotatividade | T | Configurações de fillfactor/autovacuum e validações implementadas; acompanhamento operacional é separado. |
| T17-21 | Protocolo humano persistido e único | T | Protocolo humano único persistido e testado. |
| T17-22 | Precedência semântica de eventos de provedor | T | Precedência semântica de eventos implementada e testada; recebimento real/callback autenticado em produção não homologado aqui. |
| T17-23 | Tipos TypeScript gerados do schema e diffados no CI | P | Tipos gerados/diff e SupabaseClient<Database> existem. Contratos normalizados da API ainda têm estruturas manuais/JSON; aceite literal de adoção integral parcial. |
| T17-24 | Convenção formal de versionamento de RPC | T | Convenção de RPC versionada presente; monitorar futuras alterações pelo contrato. |
| T17-25 | Role `site_api` com privilégio mínimo no lugar de `service_role` — 🟡 IMPLEMENTADA, corte de produção pendente | P | Role/grants/runbook/código preparados. Corte de produção por SITE_SUPABASE_SERVICE_JWT adiado pelo usuário; não dizer privilégio mínimo ativo só pela migration. |
| T17-26 | `force row level security` + teste que varre todas as tabelas | T | FORCE RLS e varredura SQL local presentes. Novo inventário integral de policies/grants remoto não executado nesta rodada. |
| T17-27 | PII em repouso: hash para busca e mascaramento em `get_my_*` | D | Escopo de criptografia/PII foi objeto de decisão documentada. Hash para busca não equivale a criptografia; não anunciar proteção que não existe. |
| T17-28 | Revisão da exposição do token de seleção compartilhada | D | Token público opaco/revogável por desenho, segredo de revogação separado; revisão resultou em alternativa adotada, não tarefa de hash indiscriminado. |
| T17-29 | Rotação programada de segredos + comparação em tempo constante — parcialmente aberta | P | Comparação em tempo constante e runbook existem; periodicidade de 90 dias já consta. Falta execução programada, responsável e evidência de rotação. |
| T17-30 | `pg_cron` como retaguarda dos crons da Vercel | D | Retaguarda pg_cron adiada por decisão registrada; não instalar automaticamente. Detecção independente de cron silencioso permanece pendência de operação. |
| T17-31 | Política de retenção por tabela + dicionário gerado — parcialmente aberta (dado real, não suposição) | P | Migrations de retenção/cascade e dicionário foram atualizados, inclusive lote #32; execução regular e política operacional por tabela ainda exigem evidência. |
| T17-32 | Trilha de auditoria de acesso administrativo direto | P | Trilha de escrita/DDL presente. Não comprova auditoria de todos os acessos SELECT nem revisão administrativa periódica. |
| T17-33 | Backups: PITR confirmado + drill de restore trimestral — permanece aberta | P | RUNBOOK_RESTORE_SITE.md existe. PITR/backup atual e drill com RPO/RTO medidos não certificados; não executar restore destrutivo como teste. |
| T17-34 | Timeouts por role | T | Timeouts por role implementados/testados. |
| T17-35 | Concluir saúde da fila integrada a alertas com SLA — parcialmente aberta | P | Integração de alerta existe. Canal real adiado; alerta independente de cron silencioso não entregue; SLA não homologado. |
| T17-36 | Fase B do contrato público: revogar `anon` na view legada — permanece aberta | X | Revogação da view legada/Fase B afeta consumidores do Promo Gifts; depende de inventário e autorização específicos. |
| T17-37 | Teste de contrato cross-projeto no CI — permanece aberta | N | Não localizado workflow real cross-projeto que compare as 36 colunas/permissões da origem. Mocks locais não substituem esse aceite. |
| T17-38 | Supabase Branching por PR com dados sintéticos — permanece aberta | P | Guarda fail-closed e runbook de preview existem. Branching/ambiente sintético, URL/chaves/CSP e jornada autenticada por PR ainda não certificados. |
| T17-39 | Auditar as funções `SECURITY DEFINER` executáveis por anon/authenticated — 🔴 ACHADO CRÍTICO (ampliado em 20/09/2026) | X | Achados de SECURITY DEFINER do banco interno são históricos; não revalidados nesta rodada. SQL sugerido no plano não autoriza aplicação. |
| T17-40 | Decidir o destino da extensão `pg_graphql` — SQL pronto, decisão de escopo pendente | X | Decisão sobre pg_graphql do banco interno depende dos consumidores e do responsável; não alterado. |
| T17-41 | Indexar as 4 FKs sem cobertura | X | Índices de FKs no banco interno fora do escopo autorizado; SQL em documentação não significa aplicado. |
| T17-42 | Resolver a política RLS redundante em `system_settings` | X | Policy de system_settings interna exige revisão de equivalência e autorização; não alterada. |
| T17-43 | Inventário mínimo de schema do banco principal | X | Há inventário histórico do banco principal, mas não retrato atual completo certificado nesta revisão. Não inferir estado atual dos números antigos. |
| T17-44 | `db lint`/Security Advisor do projeto principal no CI | X | Advisor/CI do banco interno não certificado nem configurado nesta auditoria do site. |
| T17-45 | Runbook de reconciliação para o projeto principal | T | Runbook do banco principal está documentado; não significa autorização nem execução no banco protegido. |
| T17-46 | Fechar a instabilidade WebKit/Firefox | T | B01–B07 têm correções e gates atuais. A01–A05 são novos achados; não apagar o fechamento do lote antigo nem dizer que toda regressão está coberta. |
| T17-47 | Métricas operacionais e resolução de conflito no carrinho de orçamento | P | Conflito guiado de campanhas entregue. Métricas operacionais e ensaio real continuam abertos; favoritos têm defeitos independentes A01–A03. |
| T17-48 | Matrizes de revisão: não são duplicatas, são um rastro de revisões — diagnóstico corrigido | P | MATRIZ_INDEX e validador existem. #33 não foi refletido em UX35/49/88 e LK10; falta atualização semântica, não criação do índice do zero. |
| T17-49 | Runbook de restore + revisão por pares dos runbooks existentes | P | Runbooks existem, inclusive restore e rotação. Revisão por pares/ensaios e evidências operacionais não localizados como concluídos. |
| T17-50 | Encerramento: checklist mestre, merge do PR #14, tag de release | P | PRs anteriores foram integrados e release 11f0d35 aprovado. Fechamento integral e todos os critérios de tag/revisão/homologação não comprovados; nota antiga de PR14 aberto está vencida. |

## Fechamento

O melhor próximo passo técnico é corrigir A01–A05 e seus testes, sem ativar provedores adiados. Depois reconciliar os estados documentais com entregas comprovadas. Rotinas operacionais, pesquisa e dependências externas devem ter responsável, evidência e data própria. Não existe justificativa nesta auditoria para executar SQL no banco interno, migrar majors automaticamente, apagar branches ou declarar todos os planos encerrados.
