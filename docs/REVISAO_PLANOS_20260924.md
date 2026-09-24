# Revisão dos planos — 24/09/2026

## Parecer

**Não estão implementados e homologados todos os critérios dos planos.** Há entregas efetivas publicadas, documentação desatualizada, funcionalidades parciais, dependências externas e três falhas residuais reproduzidas nesta revisão. CI verde e ledger de migrations alinhado não encerram esses critérios.

Esta é uma auditoria, não uma execução de correções. Nenhum código da aplicação, migration, configuração de produção ou dado de cliente foi alterado. Foram criados este parecer e probes locais reproduzíveis. Não houve commit, push ou deploy desta revisão.

## Base, abrangência e limites

- Projeto: `Promo_Brindes_V1`; SHA auditado: `3bd4c7b0ee01ce7a3e3db040bed83ebdf927f38c`.
- `HEAD` e `main` remota conferidos iguais nesta rodada. Árvore inicialmente limpa; ao final há apenas os artefatos desta revisão.
- Banco do site: `xlzmclcjdncjfdrjxclt`. Promo Gifts e `doufsxqlfjyuvxuezpln` não foram modificados.
- Inventário: UX100 + LK50 + GR50 + AC30 = 230 referências de produto; T13/T16/T17 = 150 referências técnicas; plano de 23/09 = mais 50 etapas. São **430 referências documentais sobrepostas**, não 430 funcionalidades independentes.
- As 230 linhas da matriz foram lidas, junto aos 150 registros do anexo técnico anterior e às 50 etapas mais recentes. A revisão confrontou esse inventário com código, alterações desde `11f0d35`, testes e CI. Não significa 430 ensaios independentes nem homologação de todos os serviços externos.
- Os antigos planos autônomos de 50 etapas de catálogos/calendário mencionados na conversa não foram localizados como documentos separados. Seus requisitos localizáveis estão em UX81–90 e LK15/36. Não se inventou uma lista histórica ausente.
- Graphify: mapa estrutural existente, 1.905 nós/3.853 relações. Consulta de `useOccasionFavorites` localizou hook, página e RPCs; retornou 39 de 67 nós pelo limite de contexto. Leitura direta e testes prevaleceram. Nenhuma extração semântica, reconstrução ou chamada de IA externa foi feita. Não há contabilização isolada de tokens da consulta disponível.
- Ambiente local: Node `24.19.0`, npm `11.17.0`; projeto declara Node `22.x` e CI configura `22.13.1`. Os testes locais abaixo não substituem a validação na versão declarada; o CI do mesmo SHA também passou. CLI local Supabase `2.115.0`; a auditoria administrativa anterior do mesmo dia usou `2.117.0` após falha de autenticação na antiga.

### Evidência nova nesta revisão

| Verificação | Resultado | Alcance |
|---|---|---|
| `npm run ledger:check` | 230 IDs válidos; 6 testes aprovados | Integridade estrutural, não verdade semântica dos estados |
| Recorte favoritos/ranking/contratos/notificações/propostas/retenção | 59 testes em 7 arquivos aprovados | Testes existentes, incluídos também na suíte completa; não somar duas vezes |
| `npm test` | **375 testes, 57 arquivos, aprovados** | Unitários/componentes/API locais; não inclui probes diagnósticos |
| `npm run typecheck` | Aprovado | Compilação TypeScript |
| `npm run lint` | Aprovado | Análise estática |
| `npm run db:site:test` | **539 asserções, 27 arquivos, aprovados** | PostgreSQL local; fixtures transacionais, não produção |
| Probes novos de favoritos | **3 falhas em 3 testes** | Expectativa correta violada; detalhes abaixo |
| Consulta GitHub por SHA | 5 workflows concluídos com sucesso | Quality, database, Graphify, CodeQL e release |

Os testes SQL emitiram avisos de privilégio em funções de extensões durante fixtures de auditoria; a suíte terminou `Result: PASS`. Não foram interpretados como ausência universal de problemas de permissões.

CI confirmado: [Quality](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35940484548), [banco](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35940484394), [Graphify](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35940484479), [CodeQL](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35940484396), [release](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35940484391). Browser/build/coverage do lote são evidência desse CI; não foram todos reexecutados localmente nesta revisão.

### Evidência administrativa reaproveitada da auditoria anterior de 24/09

Não foi feita uma segunda exportação completa do banco nesta revisão. A auditoria anterior deste mesmo atendimento constatou:

- 58 versões de migrations locais e remotas coincidentes; última `20260923200000_enrich_quote_confirmation_contract.sql`; dry-run sem pendências.
- Metadados de schema comparados administrativamente: 21 tabelas privadas, 67 rotinas, 36 triggers de linha não internos, 66 índices; 21 tabelas com RLS habilitada/forçada. Ausência de policies nessas tabelas é compatível com acesso mediado por funções, não demonstra exposição por si só.
- Corpos/estrutura do schema comparado iguais após retirar ACLs, mas **permissões não integralmente iguais**: remoto possui grants adicionais de `service_role` nas duas RPCs de favoritos e default privileges mais amplos para esse papel. Não houve diferença de ACL de `anon`/`authenticated` no dump comparado. Causa e necessidade dos grants extras não foram concluídas; não revogar automaticamente.
- Buckets privados equivalentes. Contagens operacionais diferem por ambiente, como esperado. Dados de clientes/segredos não pertencem ao GitHub.
- Smoke público e leitura do catálogo funcionaram; nenhum pedido real foi criado, nenhuma mensagem foi enviada e nenhuma proposta privada foi publicada como teste.

Consequência: o bloqueio histórico “falta aplicar migration/falta autenticação administrativa” não descreve o estado verificado. O trabalho restante inclui permissões e operação, não reaplicar migrations já registradas.

## Achados reproduzidos — favoritos

Código: [useOccasionFavorites.ts](../src/lib/useOccasionFavorites.ts). Página consumidora: [CommemorativeDatesPage.tsx](../src/pages/CommemorativeDatesPage.tsx). Probes: [favorites.probe.tsx](audits/plan-review-20260924/favorites.probe.tsx).

### F24-01 — Leitura atrasada apaga uma adição confirmada — P2

1. A consulta inicial da conta fica pendente, com snapshot vazio.
2. A pessoa salva uma data; a RPC de escrita confirma.
3. O `finally` remove a entrada de `mutationEpochRef`.
4. A consulta antiga chega vazia. Linhas 142–146 já não veem mutação pendente e substituem a seleção por esse snapshot antigo.

Resultado observado: favorito desaparece da projeção local depois de ter sido salvo. A simulação não prova exclusão no banco; a RPC foi mockada na fronteira. Viola preservação de intenção/sincronização, UX88 e etapas 06/09/10.

Correção a planejar: manter revisão de intenção além da duração da promise; descartar/reconciliar leitura anterior a qualquer mutação pertinente, seguida de revalidação consistente.

### F24-02 — Leitura atrasada restaura uma remoção pendente — P2

1. Cache da conta contém uma data; leitura remota fica pendente.
2. A pessoa remove a data; escrita continua em andamento.
3. A leitura retorna o snapshot antigo contendo a data.
4. A união de `merged` com `favoritesRef.current` nas linhas 143–144 não representa exclusões; a data retorna à lista.

Resultado observado: UI contradiz a remoção. É outro caso, não duplicata de F24-01: exige preservar intenção negativa/tombstone, não simplesmente unir conjuntos.

Correção a planejar: reconciliação por operação/revisão, representando adições **e remoções**. Cobrir conclusão, rejeição e respostas em ordem invertida.

### F24-03 — Troca de conta entrega estado anterior a uma renderização confirmada — P1

O hook retorna `favorites` sem condicionar a projeção ao titular atual (linha 198). A troca de proprietário/limpeza ocorre apenas no efeito. Na transição A→B, um `useLayoutEffect` do consumidor capturou uma renderização confirmada com titular B e favoritos de A; depois o efeito corrigiu o estado.

Escopo da prova: dados locais do calendário, em teste do hook real com duas identidades sintéticas. **Não demonstra quebra de RLS, leitura remota indevida, exposição de orçamentos nem duração visual perceptível em um navegador físico.** Ainda assim viola o aceite explícito “nem por um frame” da etapa 08.

Correção a planejar: projeção síncrona condicionada a identidade/proprietário e estado de autenticação, mantendo isolamento também durante carregamento. Testar efeitos de layout e DOM, não apenas estado estabilizado após `waitFor`.

### Relação com os achados A01–A05 anteriores

As regressões permanentes de promoção anônima, cache de outra conta após falha e rollback tardio de outra sessão passam. A04/A05 (diversidade e ordenação explícita) também têm testes corretivos aprovados. F24-01/02 ampliam a matriz de concorrência; F24-03 revela que o aceite completo de isolamento de renderização continuou parcial. Não declarar todos os favoritos concluídos nem apagar as melhorias já entregues.

Reprodução, sem rede e sem gravação em produção:

```sh
npx vitest run --config docs/audits/plan-review-20260924/vitest.config.ts
```

Saída esperada **no SHA auditado**: três falhas. Os probes esperam comportamento correto; não foram invertidos para esperar bugs. O padrão `.probe.tsx` os mantém fora da suíte normal até a correção e incorporação deliberada das regressões.

## Revisão das 50 etapas mais recentes

Fonte: [plano de 23/09](PLANO_MELHORIAS_CORRECOES_50_ETAPAS_20260923.md). Legenda: **T** = entrega técnica principal verificada no recorte indicado; **P** = parcial/aceite restante; **N** = componente principal não localizado; **E** = depende de participação/material externo. T não significa homologação de todos os subcenários, dependências ou operação.

| Etapa | Estado | Entregue, lacuna e condição de fechamento |
|---|---|---|
| 01 — Base e fronteiras | T | SHA/remoto, ambiente e alvo identificados. Artefatos desta auditoria são locais; Promo Gifts preservado. |
| 02 — Reconciliar requisitos | P | 230 linhas estruturalmente válidas; notas/estados desatualizados continuam na matriz. Este parecer registra correções, não reescreve o histórico. |
| 03 — Regressões A01–A05 | T | Testes corretivos permanentes aprovados nos módulos de favoritos/ranking/hook de catálogo. Novos F24-01/02/03 exigem outro lote; red/green histórico não foi reconstruído em checkout antigo nesta rodada. |
| 04 — Invariantes de dados | P | Regras sem checkout/sem corte por estoque e contratos de kits/mínimo existem; regras comerciais faltantes não podem ser inferidas. Aprovação integral não comprovada. |
| 05 — Lotes e rollback | P | PRs #35–43 pequenos e publicados; runbooks/gates existem. Matriz completa de falha de deploy e reversão observada não certificada. |
| 06 — Estado de favoritos | P | Hook extraído em #36, cache por titular e épocas existem; F24-01/02/03 contradizem a autoridade/projeção plenamente consistente. |
| 07 — Promoção anônima | P | Cenário básico corrigido e aprovado. Limite, falha parcial, repetição e intenção concorrente ainda não têm toda a homologação exigida. |
| 08 — Cache entre contas | P | Cache particionado; falha da conta B não usa cache persistido de A. Falta isolamento síncrono de renderização: F24-03. |
| 09 — Respostas antigas | P | Rollback de outra sessão protegido e testado. Leitura atrasada ainda sobrepõe intenção: F24-01/02; matriz salvar-remover-salvar não integralmente demonstrada. |
| 10 — E2E de favoritos | P | SQL e testes de componente existem; faltam os três novos cenários e homologação autenticada/múltiplas abas exigida. |
| 11 — Ordem do comprador | T | `useCatalogPageState` só aplica ranking em curadoria; modos Nome/Mais recentes preservados e testes aprovados. Ensaio real multipágina permanece distinto. |
| 12 — Relacionados | T | `catalogRanking` combina afinidade/diversidade numa só estratégia; regressão de segundo sort corrigida. Julgamento humano fica em 14. |
| 13 — Alcance da relevância | P | Ranking reorganiza os resultados da página recebida; não há relevância global homologada. Falta decisão/aceite explícito do limite e corpus multipágina. |
| 14 — Conjunto julgado | P | `searchRelevance.ts` contém 20 casos de expansão de conceitos. Não são 30 intenções com IDs/SKUs julgados e P@5/nDCG aprovados. |
| 15 — Home/categorias | P | `CategoryPhotoCard` usa produto real e destino por categoria. Vitrine usa seleção da API; diversidade editorial e tarefa com compradores não homologadas. |
| 16 — Cópia da solicitação | P | #37/migration `20260923200000` levam campanha, verba, datas, kits e alternativas ao template. Notas livres/contatos ficam na área privada por regra explícita. Restam aceite editorial e todas as fixtures máximas exigidas. |
| 17 — Templates | P | HTML escapado, texto simples e CTA de acompanhamento implementados/testados. WhatsApp é template próprio, não cópia integral; leitura móvel em clientes reais e aprovação final não comprovadas. |
| 18 — Encaminhar ao comercial | N | Persistência/outbox do cliente existem, mas não localizado adaptador/fila comercial com destino e deduplicação próprios. Definir destino antes de integrar; não conectar implicitamente o sistema interno. |
| 19 — Responsável/SLA | P | Máquina de estados/timeline existentes. Sem responsável operacional, meta aprovada e ciclo de atendimento demonstrados. |
| 20 — Provedores | P | Lease, callbacks, replay, retries e resultado inconclusivo têm testes. Ativação/recebimento real continuam adiados por decisão do usuário; isso não bloqueia correções locais. |
| 21 — Tipos e contratos | P | Tipos gerados e parsers mais estritos em portal/leads/webhooks/notificações/propostas/retenção (#38–43). Nem toda fronteira JSON adota contrato gerado/validação equivalente; não declarar adoção integral. |
| 22 — Dados comerciais/kits | P | Composição, alternativas e aritmética preservadas/testadas. Múltiplos, técnicas/áreas e curadoria dependem de dados aprovados e amostra estratificada. |
| 23 — Segurança de arquivos | P | Privacidade, limite, titularidade, retenção e assinatura binária existem. `fileSignatures.ts` lê prefixo; não sanitiza nem detecta todo conteúdo ativo de PDF. Falta política/validação além de magic bytes. |
| 24 — Conta/sessão | P | Login opcional, callback, portal e URLs assinadas existem. Falta ensaio real completo de e-mail/expiração e eliminar F24-03. E-mail Auth não é Resend transacional. |
| 25 — Privacidade/apagamento | P | Tombstone, auth, fila de remoção e testes SQL; #43 endureceu paths. Falta ciclo operacional aprovado e prova completa de retomada após falha, sem dados reais. |
| 26 — Acervo autorizado | E | Usuário confirmou materiais disponíveis; caminhos, arquivos, titularidade e autorização específica ainda não localizados. Não dizer que o acervo não existe. |
| 27 — PDFs/revistas | P | Tipos/governança/biblioteca existem; as dez publicações cadastradas são online. PDFs/revistas reais não publicados no catálogo verificado. |
| 28 — Cases e personalização | E | Sem três cases verificáveis publicados nem conjunto autorizado de fotos de execução localizado. Depende de 26 e validação comercial. |
| 29 — Filtros/mobile | P | Aplicação imediata, URL, chips e foco existentes. Falta decisão/aceite documentado frente ao rascunho+Aplicar; não substituir comportamento só para cumprir checkbox. |
| 30 — Linguagem/marca | P | Quatro frases presentes na home, badge único e estados de recuperação existentes. Revisão editorial integral/redes oficiais/coerência dos canais não homologadas. |
| 31 — Acessibilidade manual | P | Axe/teclado no CI; leitor de tela, zoom/reflow e jornadas dinâmicas ainda sem evidência completa. |
| 32 — Compradores/dispositivos | E | Sem sessões documentadas com 5–8 profissionais nem homologação iOS/Android físicos. Emulação não substitui esse aceite. |
| 33 — Performance/decomposição | P | Budgets e lazy loading presentes. Home 365, calendário 350, orçamento 412 e biblioteca 301 linhas; CSS 6.785. Não é defeito só pelo tamanho, mas meta literal/refatoração e CWV de campo não fechadas. |
| 34 — Funil seguro | P | Eventos tipados/allowlist e redação existem. Recepção, dedupe, painel, correlação comercial e medição real não comprovados. |
| 35 — SEO/prévias/ICS | P | HTML inicial/canonical/noindex/sitemap e ICS testados tecnicamente. Preview nos canais e importação/reimportação em dois calendários reais ainda pendentes. |
| 36 — Schema além do ledger | P | Auditoria administrativa anterior do dia comparou estrutura/ACLs. Diferenças de service_role/default privileges ainda precisam justificativa e decisão; não afirmar identidade integral de segurança/configuração. |
| 37 — Preview isolado | P | Guardas fail-closed e runbook existem. Não comprovado criar-validar-expirar dois bancos de preview e jornada autenticada por PR. |
| 38 — Backup/restore | P | Runbook existe. Backup/PITR contratado, restauração autorizada, cobertura Storage/configuração e RPO/RTO medidos não certificados. |
| 39 — Operação/segredos | P | Retenção, saúde da fila, logs e limites técnicos implementados. Falta rotina com responsável e monitor independente de cron silencioso; alertas/cutover site_api adiados. |
| 40 — Contrato entre projetos | N | Não localizado CI live de campos/tipos/permissões da origem pública. Testes mockados e contratos documentados não satisfazem esse requisito. Leitura somente; alterações internas continuam fora do escopo. |
| 41 — Documentação no Graphify | P | Mapa AST do código operacional; corpus documental e vínculos mantidos requisito→fonte→teste ainda não entregues. |
| 42 — Precisão das relações | P | Query/path/explain e fontes existem; amostra de aliases/homônimos/cadeia RPC/SQL e revisão de comunidades insuficientes. Não reabrir grafo não direcionado já deliberado. |
| 43 — Falhas hostis do Graphify | P | Lock/candidato/validadores/scanner e testes existem. Faltam ensaios completos de timeout, interrupção, disco cheio simulado, concorrência e HTML hostil. |
| 44 — Utilidade/custo do grafo | P | Benchmark estrutural de dez consultas existe; não mede precisão semântica, conjunto documental ou corpus maior com memória/tempo controlados. |
| 45 — Artefatos/cache/upgrades | P | Saída ignorada, retenção CI e comparação base/head presentes. Recuperação/upgrade e visibilidade não integralmente homologados; cache não é obrigação se rebuild for decisão aprovada. |
| 46 — Regressão integrada | P | 375 testes e 539 asserções SQL aprovados; browser no CI do SHA. Três probes novos falham; integrações/conta reais não homologadas integralmente. |
| 47 — Compatibilidade/gates | P | Gates verdes e versões declaradas; falta fechar decisões documentais de majors e alinhar runtime local 24.x ao 22.x declarado antes de alegar reprodução idêntica. Não atualizar majors automaticamente. |
| 48 — Publicação compatível | T | PRs #35–43 publicados, release do SHA aprovado, ledger alinhado na auditoria administrativa. Não equivale a todos os ensaios de falha/reversão do plano. |
| 49 — Observação publicada | P | Release/CI e smoke anterior do dia confirmados. Falta janela operacional acordada, fluxo autenticado/controlado e filas/canais reais observados. |
| 50 — Fechamento por evidências | P | Este parecer enumera 50/50 etapas; matriz histórica ainda precisa reconciliação semântica e há lacunas acima. Não declarar plano integralmente concluído. |

## Correções necessárias na leitura dos planos anteriores

A matriz canônica [MATRIZ_FECHAMENTO_PLANOS_20260912.csv](MATRIZ_FECHAMENTO_PLANOS_20260912.csv) registra **118 I, 100 P, 11 E e 1 N**. São os rótulos armazenados, não uma nova medição de conclusão. O validador confirma forma/fontes/commits; não sabe se o texto descreve o código atual.

| Referências | Interpretação corrigida |
|---|---|
| UX02 / UX60 / T17-47 | Reconciliação guiada de campanhas já existe em `SavedSelections.tsx`: conta, preservar duas e substituição consciente. Não listar como ausente; métricas e homologação multidispositivo permanecem parciais. |
| UX03 | Nota “R01–R08 ainda sem correções” está vencida e conflita com outras linhas. Preservar fechamentos históricos, registrar F24 como novos cenários. |
| UX35 / UX49 / LK17 / LK25 | Ranking por intenção/diversidade existe; A04/A05 corrigidos. Parcialidade atual é alcance/relevância julgada, não ausência do algoritmo. |
| UX88 / GR08 / GR13 | Sincronização de favoritos existe, mas incompleta pelos F24. Números/commit antigos do grafo não são o retrato atual. |
| LK10 | Rótulo N está incorreto: categorias fotográficas foram implementadas. Reclassificação conservadora: P até homologar correspondência/falha de imagem e aceite editorial completos; não “não implementado”. |
| UX68 / LK45 / T13-31 | Cópia foi enriquecida em #37; não falta mais toda a estrutura de campanha/verba/kits. Permanecem aprovação e entrega real; notas livres privadas são exclusão deliberada, não perda silenciosa. |
| LK37 / LK30 / LK38 | Composição de kits e alternativas acompanha compartilhamento. Remover “contrato de composição ausente”; preservar o aceite pendente de ciclo real criar/abrir/revogar. |
| UX65 / LK43 | Proteção de acesso/assinatura está presente. LK43 exige literalmente bloquear conteúdo ativo indevido: assinatura de prefixo não satisfaz todo esse aceite. I técnico não pode ser usado como certificação integral. |
| LK29 / LK23 | Aritmética de kits implementada; múltiplos comerciais comprovados ainda não são modelados integralmente. Não confundir mínimo com múltiplo nem inventar regra para fechar linha. |
| UX98 / UX100 / LK50 / T16-01/02 / T17-02/03 | SHA, número de migrations e testes antigos ficaram para trás. Atual: 3bd4c7b, 58 migrations verificadas na auditoria anterior do dia, 539 asserções locais nesta revisão. |
| T13-09/13/39 / AC10 / UX79 | Isolamentos antigos melhoraram e passam nos cenários cobertos; F24-03 mantém uma lacuna real de sessão. Não estender conclusão dos testes de formulário a todo novo hook. |
| T16-21 / T17-23 | Parsers runtime receberam #38–43. Tipagem/validação avançaram; adoção integral ainda não provada. |
| T16-26/48 / T17-26 / etapa 36 | Houve comparação administrativa nesta data, mas ACLs diferem. Substituir “nunca comparado” por diferença especificada, não por “schema 100% igual”. |
| T13-50 / T17-48 | Problema é atualização semântica; índice/validador já existem. Criar outro índice sem reconciliar linhas repetiria trabalho. |

### Lacunas de produto que permanecem, agrupadas sem perder referência

- Pesquisa/IA de navegação/compreensão: UX11/20/21/22/54/64/91/95; LK02/05/09/42. Interface pronta não prova entendimento por compradores.
- Editorial/provas de execução: UX13/23/26/27/28/30/47/84; LK03/06/12/22/31–36/39/40. Separar material declarado disponível de material efetivamente localizado/publicável.
- Descoberta/dados: UX24/31/32/34/35/40/41/43/47/49; LK14/17/20/22/23/25/27. Faltam julgamento por produto, dados comerciais confiáveis e alcance global aprovado.
- Jornadas autenticadas/comerciais: UX57/59/67–70/73/75–80/88; LK37/44/45; AC04/06/07/10/24/29/30. Alguns subcontratos estão prontos; testes reais e atendimento continuam distintos.
- Saídas externas/qualidade de uso: UX17/58/86/89/92–95/97–100; LK46–50. Sem certificação assistiva física, CWV real, canais sociais/calendários reais ou aceites operacionais integrais.
- Graphify: GR04/08/15/16/18/20/25/27/31–37/39/42/43/45–50. Estrutural útil e entregue; documental, precisão, adversarial e governança humana parciais.

As demais linhas I da matriz têm entregas técnicas identificadas e não foram reclassificadas por falta de homologações pertencentes a outro requisito. Não se transformou esta revisão em promessa de ausência de defeitos em cada linha.

### Lacunas técnicas e decisões que não devem ser confundidas

- **Implementação/verificação ainda faltante:** T16-46/T17-37 (CI cross-projeto); T16-47/T17-38 (preview autenticado realmente isolado); T16-42/T17-35 (monitor independente de cron); T16-21/T17-23 (contratos integrais); T13-35/36/48 (CSS/componentes e medição).
- **Operação ainda não homologada:** T13-19/27/29/30/37/40–42/46/47; T16-18/24/29/31/32/35/36/38/39/42/49/50; T17-18/19/29/31/32/33/35/47/49/50. Inclui E.164 por contrato, advisor remoto recorrente, rotação, tratamento de dados, mensuração/alerta, restore e atendimento.
- **Governança/compatibilidade:** T13-06/43/49/50; T16-05/48; T17-06/07/08/48. Branches antigas não são prova de código perdido: a auditoria anterior conferiu entregas por squash de #22/#33. Não apagar backups como efeito colateral.
- **Adiado pelo usuário:** T16-25/T17-25, provedores, segredos/webhooks e canais de alerta. Preparação existe; corte de produção para `site_api` não deve ser anunciado como ativo sem configuração comprovada.
- **Alternativas deliberadas, não tarefas para reimplementar:** T13-05 (unused via ESLint), T16-13/T17-16 (índice por medição), T16-27/28 e T17-27/28 (decisões de PII/token), T16-34/T17-30 (não instalar pg_cron automaticamente), GR14/24/26/30 (grafo não direcionado, impacto como vizinhança, rebuild completo, sem hooks). Manter os limites das decisões; hash não equivale a criptografia.
- **Fora do escopo do site/protegido:** T16-03/43/45; T17-05/36/39–44. Alterações de funções, GraphQL, FKs, policies e infraestrutura do Promo Gifts exigem autorização própria. Os achados históricos daquele banco não foram recertificados nesta revisão.

Rastreabilidade histórica completa, preservada sem sobrescrever conclusões datadas: [anexo de 230 referências](REVISAO_PLANOS_20260923_ANEXO_PRODUTO.md), [anexo de 150 referências](REVISAO_PLANOS_20260923_ANEXO_TECNICO.md), [matriz/índice](MATRIZ_INDEX.md). Aplicar os deltas deste parecer ao interpretar esses documentos.

## Ordem recomendada para a próxima execução autorizada

1. Corrigir F24-03 (isolamento síncrono) e F24-01/02 (reconciliação por intenção), promovendo os probes a regressões permanentes; ampliar duas contas, auth carregando e respostas fora de ordem.
2. Reconciliar matriz/índice com evidências atuais; manter P quando faltar parte do aceite, mesmo havendo código publicado.
3. Fechar política de anexos além da assinatura, sem mandar arquivos de clientes a terceiros nem prometer antimalware inexistente.
4. Implementar/verificar contrato público cross-projeto somente leitura e resolver a diferença de ACL do site por causa/necessidade comprovadas, sem repair ou revogação cega.
5. Formalizar limite da curadoria, corpus julgado e regras comerciais; concluir fontes de dados e conteúdo aprovados sem inventá-los.
6. Definir destino/responsável do atendimento; só então implementar passagem ao comercial e metas operacionais.
7. Prosseguir preview, restauração isolada, pesquisa/acessibilidade/medição e Graphify por critérios explícitos. Provedores e segredos continuam adiados conforme decisão vigente.

Conclusão: há uma base técnica publicada com extensa cobertura, mas **não cabe encerrar o plano, declarar todas as funções completas ou atribuir 10/10**. O próximo lote prioritário é delimitado e reproduzível; as dependências externas estão separadas de falhas que podem ser corrigidas no código do site.
