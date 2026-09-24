# Plano de melhorias e correções — 50 etapas — 24/09/2026

**Estado: execução iniciada em 24/09/2026.** Este documento preserva o plano original; as evidências e os limites do lote executado estão em [EXECUCAO_LOTE_FAVORITOS_20260924.md](EXECUCAO_LOTE_FAVORITOS_20260924.md). Etapas que dependem de decisão comercial, materiais localizados, credenciais ou operação externa continuam pendentes e não são tratadas como concluídas por esta atualização.

## Base e finalidade

Plano derivado da [auditoria de 24/09](REVISAO_PLANOS_20260924.md), sobre o SHA `3bd4c7b0ee01ce7a3e3db040bed83ebdf927f38c`. Reorganiza o trabalho residual dos planos anteriores: corrige falhas demonstradas, completa entregas parciais, explicita decisões e prevê homologação. Não reinicia funcionalidades prontas nem apaga critérios históricos.

Evidência da auditoria anterior, **não reexecutada neste planejamento**: 375 testes de aplicação/API, 539 asserções SQL, lint e TypeScript aprovados; três probes de favoritos falharam. GitHub e código local estavam alinhados; a comparação administrativa anterior registrou 58 migrations alinhadas, mas diferenças de ACL/default privileges ainda sem conclusão. Esses retratos devem ser revalidados quando a execução começar.

Graphify foi consultado somente para orientação: mapa atual, 1.905 nós/3.853 relações; consulta ao hook de favoritos limitada a 39 de 67 nós. Código e testes continuam sendo as fontes de decisão. Não houve reconstrução, extração semântica, teste funcional, migration ou deploy neste pedido. O único novo arquivo é este plano.

## Limites obrigatórios

- Alvo de implementação futura: `Promo_Brindes_V1`; banco próprio do site `xlzmclcjdncjfdrjxclt`.
- Não modificar Promo Gifts V4 nem `doufsxqlfjyuvxuezpln`. Contrato público da origem pode ser verificado somente em leitura autorizada. Achado não autoriza correção no sistema interno.
- Manter catálogo sem corte por estoque positivo. A pessoa solicita orçamento, não compra online. Não inventar preços, disponibilidade, técnica, mínimo, múltiplo ou prazo comercial.
- Preservar identidade, quatro frases aprovadas, badge único, kits, alternativas, seleção, conta, biblioteca e calendário. Ranking, categorias fotográficas e cópia enriquecida de solicitação já existem: completar seus aceites, não recriá-los.
- Resend, WhatsApp, segredos de webhook/alerta e `SITE_SUPABASE_SERVICE_JWT` continuam adiados por decisão do usuário. Encontrar credencial não autoriza ativação ou envio.
- Materiais aprovados foram declarados disponíveis; falta localizar arquivos e autorização específica de publicação. Não criar cases, depoimentos ou fotos de operação fictícios.
- Não copiar dados pessoais/operacionais para Git. Versionar código, migrations, contratos e evidências minimizadas. Segredos permanecem em cofres; nunca em conversa, relatório, fixture ou bundle.
- Não reaplicar migrations registradas, executar repair automático, restaurar sobre produção, revogar grants ou contratar infraestrutura para fazer um indicador ficar verde.
- “10/10” é direção de qualidade, não critério mensurável nem garantia de ausência de defeitos.

## Método de execução futura

**Prioridades:** P1 = integridade, isolamento, segurança ou dependência relevante; P2 = qualidade, maturidade e aceite complementar. Não há incidente P0 confirmado pela auditoria. **Portes:** S/M/L são esforço relativo, não prazo contratado. **Responsáveis:** papéis propostos, a designar, não agentes ou pessoas já mobilizados.

Cada etapa terá cinco dimensões de evidência: implementação, testes, publicação/configuração, operação e aceite humano quando aplicável. Um teste unitário não prova recebimento de mensagem; uma migration não prova autorização correta; uma página publicada não prova compreensão do comprador.

O ledger canônico permanece `MATRIZ_FECHAMENTO_PLANOS_20260912.csv`, com seu índice. Este documento é sequenciamento, não outro banco de estados. Relacionar as 430 referências históricas sobrepostas às etapas sem contá-las como 430 funcionalidades. Quando uma decisão substituir o critério literal, registrar aceite do responsável e preservar o original.

| Bloco | Etapas | Resultado pretendido |
|---|---|---|
| Preparação | 01–05 | Base reproduzível e critérios reconciliados |
| Correções de favoritos | 06–10 | Resolver F24-01/02/03 e concorrência |
| Continuidade e conta | 11–15 | Validar promoção, abas e jornadas privadas |
| Segurança e contratos | 16–20 | Arquivos, privacidade, RPCs e permissões |
| Banco e operação | 21–25 | Contrato público, preview, restore e manutenção |
| Descoberta e escolha | 26–30 | Relevância, dados comerciais e filtros |
| Conteúdo e atendimento | 31–35 | Materiais reais, mensagens e destino comercial |
| Integrações e mensuração | 36–40 | Atendimento rastreável e saídas externas |
| Qualidade de experiência/ferramentas | 41–45 | Acessibilidade, pesquisa, performance e Graphify |
| Liberação e encerramento | 46–50 | Compatibilidade, regressão e aceites verificáveis |

## As 50 etapas

### Etapa 01 — Fixar a nova linha de base e os alvos

**P1 · S · Engenharia/QA · Dependências: nenhuma.** Referências: UX01/98/100; T17-02/03/04.

- **Entrega:** manifesto com SHA, branches/remotos, árvore de trabalho, versões, banco-alvo e evidências herdadas. Identificar artefatos locais da auditoria sem sobrescrevê-los.
- **Validação planejada:** conferir diretório, Git e guardas; distinguir arquivos ignorados, gerados, não versionados e realmente ausentes no remoto. Comparar commits por conteúdo quando houver squash.
- **Aceite:** alvos inequívocos, nenhuma credencial registrada e nenhuma alteração no protegido. Risco: confundir o cwd inicial do Promo Gifts com o site; toda operação usa raiz explícita.

### Etapa 02 — Reconciliar o ledger semântico dos planos

**P1 · M · Engenharia/Produto · Depende de: 01.** Referências: UX02/03/35/49/68/88; LK10/37/43/45; T17-48.

- **Entrega:** corrigir notas vencidas sobre categorias fotográficas, ranking, conflitos de campanhas, favoritos e confirmação enriquecida. Registrar F24-01/02/03 e manter critérios parciais explícitos.
- **Validação planejada:** cruzar cada alteração com fonte, teste, commit e aceite; rodar o validador estrutural e revisão humana do diff. Não rebaixar algo entregue só porque outro requisito tem dependência externa.
- **Aceite:** nenhuma ausência fictícia, conclusão sem evidência ou referência perdida. Preservar os relatórios datados; gerar contagens somente após a revisão, sem converter percentuais em nota de qualidade.

### Etapa 03 — Tornar o ambiente local reproduzível

**P1 · S · Engenharia/Infraestrutura · Depende de: 01.** Referências: T13-02/04/07; T17-06/07/08.

- **Entrega:** executar futuros ensaios na versão Node declarada pelo projeto, hoje 22.x, e npm fixado; registrar CLI compatível. Corrigir orientação de ambiente sem trocar runtime global de outros projetos.
- **Validação planejada:** instalação limpa em diretório/ambiente isolado, comparação local/CI e ausência de peers ignorados. Investigar a diferença observada entre Node local 24.x e CI 22.x.
- **Aceite:** comandos reproduzíveis e versões identificadas. Atualização major ou adoção de outra LTS exige avaliação própria, não decisão implícita deste plano.

### Etapa 04 — Consolidar cenários adversariais e evidências

**P1 · M · QA/Engenharia · Depende de: 01, 03.** Referências: UX03/99; AC30; probes F24.

- **Entrega:** matriz de estados e concorrência com promises/relógio controlados, fixtures sintéticas e fronteiras mockadas claramente nomeadas. Preservar probes históricos como reprodução, não como testes esperando bugs.
- **Validação planejada:** reproduzir os três F24 antes da correção; separar renderização confirmada, estado estabilizado, persistência local e estado remoto. Medir falha pela causa correta, não por timeout genérico.
- **Aceite:** cada correção futura terá prova antes/depois e teste permanente. Nenhum ensaio enviará mensagens ou manipulará usuários reais inadvertidamente.

### Etapa 05 — Definir lotes, decisões e responsabilidades

**P1 · S · Produto/Engenharia/Operação · Depende de: 01, 02.** Referências: UX98/100; GOVERNANCA_FECHAMENTO.

- **Entrega:** designar responsáveis/revisores, separar correções locais de liberações externas e definir rollback por lote. Registrar decisões necessárias: comercial, arquivos, preview, restore, curadoria e materiais.
- **Validação planejada:** para cada ação, identificar alvo, autoridade, custo, reversibilidade e pré-requisitos; verificar que a correção urgente não dependa de conteúdo ou credenciais adiadas.
- **Aceite:** escopo e responsável de cada bloqueio conhecidos. Fases 46–50 serão aplicadas ao recorte de cada release, não apenas ao fim de todo o programa.

### Etapa 06 — Formalizar o estado e as invariantes dos favoritos

**P1 · M · Frontend/QA · Depende de: 04, 05.** Referências: UX88; AC10; etapas antigas 06–10.

- **Entrega:** modelo explícito de titular, geração de sessão, revisão monotônica de intenção, snapshot remoto e operações pendentes. Distinguir sincronizando, confirmado, falha e conflito sem duplicar autoridades.
- **Validação planejada:** tabela de transições anônimo→A→B→logout, auth carregando, remount e StrictMode; definir política para leituras iniciadas antes de uma ação local.
- **Aceite:** intenção de adicionar e remover é representável; revisão não é reutilizada ao remover promise concluída. Não exigir migration nova sem demonstrar necessidade no contrato existente.

### Etapa 07 — Corrigir o isolamento síncrono de identidade — F24-03

**P1 · S/M · Frontend/Segurança · Depende de: 06.** Referências: UX79/88; AC10; F24-03.

- **Entrega:** impedir que o hook entregue favoritos de A quando a renderização já pertence a B; tratar também identidade ainda não confirmada. O efeito posterior não será a única barreira.
- **Validação planejada:** capturar commits de renderização com efeito de layout e DOM; trocar contas com consulta pendente, erro, cache legado e auth carregando. Repetir os cenários A02/A03 anteriores.
- **Aceite:** nenhuma projeção confirmada do titular novo contém dados locais do anterior. Não descrever esse achado como quebra de RLS: o defeito demonstrado é de estado local.

### Etapa 08 — Preservar adições diante de leitura atrasada — F24-01

**P1 · M · Frontend/QA · Depende de: 06, 07.** Referências: UX88; F24-01.

- **Entrega:** impedir que snapshot iniciado antes da mutação apague favorito já confirmado. Comparar revisões ou invalidar/reconsultar snapshots obsoletos, mantendo informação após a promise terminar.
- **Validação planejada:** leitura vazia atrasada, escrita confirmada antes/depois da leitura, retry e rede intermitente; verificar UI, cache e reconciliação final com servidor simulado.
- **Aceite:** favorito permanece salvo após confirmação e convergência. Não basta manter união eterna, que impediria remoções legítimas recebidas de outro dispositivo.

### Etapa 09 — Preservar remoções diante de leitura atrasada — F24-02

**P1 · M · Frontend/QA · Depende de: 06, 07, 08.** Referências: UX88; F24-02.

- **Entrega:** representar exclusões por revisão/operação, para que união de conjuntos não ressuscite uma data removida. Definir quando descartar a intenção após confirmação/revalidação consistente.
- **Validação planejada:** remoção pendente/confirmada, leitura antiga contendo o item, falha de escrita e desfazer; executar tanto leitura→escrita quanto escrita→leitura.
- **Aceite:** remoção não é anulada por snapshot antigo; falha restaura apenas o estado pertinente, sem desfazer uma intenção posterior. Evitar tombstones indefinidos que bloqueiem adições futuras legítimas.

### Etapa 10 — Serializar ou reconciliar mutações concorrentes

**P1 · M · Frontend/Backend/QA · Depende de: 08, 09.** Referências: UX88/99; AC10.

- **Entrega:** definir política por titular/data para salvar-remover-salvar, inclusive callbacks de sucesso, erro, toast e rollback. Evitar reutilização de revisão e resultados remotos finais em ordem errada.
- **Validação planejada:** respostas invertidas, falha da primeira após sucesso da terceira, logout durante envio e remount. Se a API não garantir última intenção, avaliar serialização/coalescência antes de alterar SQL.
- **Aceite:** UI/cache e backend convergem para a intenção efetivamente confirmada; erro antigo não modifica intenção nova nem outra sessão. Registrar limites de operação offline.

### Etapa 11 — Completar promoção anônima e limites

**P1 · M · Frontend/Backend · Depende de: 10.** Referências: UX88; AC10.

- **Entrega:** concluir união idempotente de favoritos anônimos com a conta sem atribuir cache de autoria incerta; preservar possibilidade de retomar promoção parcial e sinalizar excesso ao limite atual de 100.
- **Validação planejada:** conta vazia/preenchida, duplicatas, falha no meio, resposta inválida, limite atingido, novo login e tentativa repetida. Testar storage indisponível/corrompido.
- **Aceite:** nenhuma perda/truncamento silencioso nem importação entre contas. Marcar promoção concluída somente depois das confirmações pertinentes; não confundir intenção anônima legítima com cache antigo de outra pessoa.

### Etapa 12 — Homologar múltiplas abas e retomada

**P1 · M · Frontend/QA · Depende de: 10, 11.** Referências: UX59/79/88; T13-13.

- **Entrega:** política documentada de atualização entre abas e dispositivos, com revalidação no retorno quando adequada e tratamento de eventos de storage/auth. Não anunciar sincronização instantânea que o sistema não oferece.
- **Validação planejada:** duas abas da mesma conta, troca de conta em uma delas, offline→online, aba suspensa e edição concorrente. Não transmitir dados pessoais indevidos em mensagens entre abas.
- **Aceite:** ausência de estado cruzado e convergência verificável; diferenças temporárias têm estado/recuperação claros. E2E mockado e sessão real sintética serão registrados separadamente.

### Etapa 13 — Homologar autenticação e recuperação

**P1 · M · Frontend/Backend/QA · Depende de: 07, 10.** Referências: UX71–79; AC04/06/07/10.

- **Entrega:** fechar ciclo de confirmação, senha, recuperação, callback inválido, expiração, refresh e logout em todos os módulos que usam identidade. Manter pedido como visitante.
- **Validação planejada:** contas sintéticas, redirecionamento externo recusado, link usado/expirado, rede perdida e identidade alterada durante ação. E-mail Auth será testado separadamente do Resend comercial.
- **Aceite:** nenhuma sessão obsoleta governa ação nova e recuperação não perde intenção desnecessariamente. Recebimento real depende de ambiente e destinatário controlados autorizados; mock não fecha esse subcritério.

### Etapa 14 — Completar seleções, links e propostas privadas

**P1 · M · Frontend/Backend/QA · Depende de: 13.** Referências: UX53–60/74–78; LK30/37/38; AC18/24–27.

- **Entrega:** homologar conflito guiado já existente, kits/alternativas serializados, repetir campanha, link opaco revogável e proposta PDF versionada com URL curta assinada.
- **Validação planejada:** criar→abrir→revogar com dados sintéticos; duas contas, versão concorrente, produto removido, link expirado, path malformado e recuperação de proposta vencida.
- **Aceite:** não sobrescrever trabalho sem decisão, não vazar anexo/contato no compartilhamento e não assinar caminho não autorizado. Publicação comercial real continua separada do ensaio técnico.

### Etapa 15 — Encerrar o lote corretivo de favoritos

**P1 · M · QA/Release · Depende de: 07–10; subaceites ampliados: 11–14.** Referências: F24; UX88/99; AC30.

- **Entrega:** incorporar os três probes corrigidos à suíte permanente; consolidar os cenários adicionais e atualizar a matriz somente no alcance comprovado.
- **Validação planejada:** executar unitários, componentes, SQL pertinente e navegadores configurados; distinguir o hotfix 07–10 do pacote completo de conta/múltiplas abas.
- **Aceite:** F24-01/02/03 deixam de reproduzir e regressões A01–A05 continuam aprovadas. Publicação do hotfix segue 46–49 por recorte, sem esperar homologações externas de 13/14.

### Etapa 16 — Definir política de segurança dos anexos

**P1 · M · Segurança/Produto/Backend · Depende de: 05.** Referências: UX65; LK43; etapa antiga 23.

- **Entrega:** escolher rejeição, quarentena ou sanitização para PDFs ativos/malformados e estabelecer formatos, tamanhos, cotas, tempo/CPU/memória e regras de acesso. Definir significado exato de “verificado”.
- **Validação planejada:** modelo de ameaças para MIME falso, polyglot, arquivo truncado, conteúdo ativo, bomba de recursos e substituição durante verificação.
- **Aceite:** política aprovada que vai além de magic bytes, com falha fechada e alternativa ao cliente. Não contratar serviço ou enviar arquivos a terceiros sem decisão específica.

### Etapa 17 — Implementar inspeção e ciclo seguro de arquivos

**P1 · L · Backend/Segurança/QA · Depende de: 16, 19.** Referências: UX65; LK43; AC25.

- **Entrega:** aplicar a política ao upload, verificação, vínculo e acesso; tornar estados pendente/rejeitado/aprovado inequívocos. Versionar a validação para não confiar indefinidamente em aprovação antiga de objeto substituído.
- **Validação planejada:** fixtures inertes benignas/adversariais, timeout, quota, falha no storage, troca de sessão e limpeza de órfãos; nunca executar conteúdo ativo nos testes.
- **Aceite:** arquivo não aprovado não é apresentado como seguro nem vinculado indevidamente; limites e recuperação testados. Formato recusado preserva a possibilidade de solicitar orçamento sem anexo.

### Etapa 18 — Fechar privacidade, retenção e apagamento

**P1 · L · Backend/Operação/Responsável por privacidade · Depende de: 13, 16, 19.** Referências: UX80/98; AC29; T16-32/33/35/36.

- **Entrega:** inventário de dados/fluxos, retenção por finalidade, procedimento de acesso/apagamento, auth/tombstone/Storage/outbox/logs e responsáveis. Revisar a necessidade de evento público de apagamento, sem expor dados apagados.
- **Validação planejada:** exclusivamente identidades sintéticas: falha parcial, callback tardio, FK, reexecução e retomada da fila de deleção; verificar que paths inválidos não ampliam o alvo.
- **Aceite:** operação retomável, minimizada e aprovada, sem alegação jurídica automática. Não apagar clientes reais ou replicar dados privados para repositório/testes.

### Etapa 19 — Completar contratos entre SQL, API e interface

**P1 · M/L · Backend/Frontend · Depende de: 03, 04.** Referências: T16-21/22/23; T17-23/24; AC18.

- **Entrega:** inventariar fronteiras JSON ainda manuais, conectar tipos gerados onde aplicável e manter parsers runtime estritos; definir evolução compatível para snapshots antigos e catálogo de erros.
- **Validação planejada:** campos ausentes/extras, tipos incorretos, null, limites, payloads históricos e respostas escalares malformadas. Verificar diff dos tipos sem suprimir erros com casts amplos.
- **Aceite:** mudança incompatível quebra compilação ou contrato antes da publicação; erro externo falha com recuperação clara. Tipagem estática não substitui validação de entrada.

### Etapa 20 — Reconciliar permissões do Supabase isolado

**P1 · M · Banco de dados/Segurança · Depende de: 01, 05, 19.** Referências: T16-26/48; T17-26; diferença de ACL de 24/09.

- **Entrega:** retrato via `pg_catalog` de grants, default privileges, roles, funções, triggers, RLS/policies e jobs; explicar os grants extras de service_role nas RPCs de favoritos e privilégios futuros.
- **Validação planejada:** comparar baseline limpo e remoto, separar diferenças de plataforma de mudanças do site, testar consumidores antes de propor qualquer revogação. Storage/Auth exigem inventário específico adicional.
- **Aceite:** cada diferença tem causa ou investigação explícita, risco e decisão aprovada. Se correção for necessária, migration mínima, ensaio local e verificação posterior; nunca repair cego ou escrita no Promo Gifts.

### Etapa 21 — Criar verificação real do contrato público de produtos

**P1 · M · Backend/QA/Responsável pela origem · Depende de: 19, 20.** Referências: T16-46; T17-37.

- **Entrega:** snapshot versionado de campos/tipos e teste somente leitura do contrato público consumido pelo site; verificar permissões administrativas apenas quando houver acesso apropriado autorizado.
- **Validação planejada:** fixture removendo/renomeando campo, resposta incompatível, indisponibilidade e consulta real controlada. Separar falha de disponibilidade de quebra de contrato.
- **Aceite:** drift crítico detectado no CI sem segredos da origem expostos a PRs não confiáveis. PostgREST pode validar consumo, não certificar triggers/RLS/grants: schema exige `pg_catalog`.

### Etapa 22 — Completar preview autenticado realmente isolado

**P1 · L · Infraestrutura/Backend/QA · Depende de: 05, 19, 20.** Referências: T16-47; T17-38; AC12.

- **Entrega:** decidir infraestrutura/custo e automatizar, após aprovação, criar-validar-expirar preview com banco, fixtures, chaves, callbacks e CSP próprios. Manter fail-closed quando faltar configuração.
- **Validação planejada:** dois previews simultâneos, fork externo, ref incorreto, variável ausente, callback inválido e cleanup direcionado.
- **Aceite:** jornada autenticada funcional sem alcançar dados privados de produção; destruição só de recursos temporários identificados. Guardrail existente não será confundido com ambiente provisionado.

### Etapa 23 — Demonstrar backup e restauração

**P1 · L · Banco de dados/Operação · Depende de: 20, 22.** Referências: T16-39; T17-33/49.

- **Entrega:** confirmar plano contratado e cobertura de banco, Storage, Auth e configuração; acordar objetivos de perda/tempo de recuperação e destino descartável autorizado.
- **Validação planejada:** restaurar conjunto controlado em isolamento, impedir crons/mensagens externas, medir tempos e testar permissões/arquivos/vínculos. Planejar descarte recuperável dos artefatos sensíveis.
- **Aceite:** evidência de restore, limites de cobertura e RPO/RTO medidos; runbook revisado por outro responsável. Não restaurar sobre produção nem assumir que backup SQL inclui blobs/configuração.

### Etapa 24 — Detectar falhas operacionais e cron silencioso

**P1 · M/L · Operação/Backend · Depende de: 05, 19.** Referências: T13-27/29/41; T16-42; T17-35.

- **Entrega:** desenhar sinal de execução/atraso da fila e observador independente do cron monitorado, com limiares, destinatários e escalonamento. Avaliar custo antes de provisionar monitor externo.
- **Validação planejada:** cron ausente, heartbeat atrasado, lease preso, fila vazia, burst legítimo, observador indisponível e alerta duplicado; usar relógio e webhooks simulados.
- **Aceite:** falha silenciosa detectável sem depender da invocação que deixou de ocorrer. Canal real permanece adiado; não instalar pg_cron automaticamente contra a decisão anterior.

### Etapa 25 — Operacionalizar manutenção e privilégio mínimo

**P1 · M · Banco de dados/Segurança/Operação · Depende de: 20, 23, 24.** Referências: T16-18/25/29/31/35/36; T17-19/25/29/31/32.

- **Entrega:** agenda e responsáveis para estatísticas, índices, retenção, advisor remoto e rotação; distinguir auditoria de escrita/DDL de auditoria de leitura. Preparar cutover site_api, sem ativá-lo agora.
- **Validação planejada:** revisar planos sob carga sintética representativa, ensaiar rotação sobreposta e rollback em sandbox, conferir custos/volume de logs e incidentes sem PII.
- **Aceite:** primeira execução registrada e próximo responsável/data definidos. Cutover, alertas e segredos exigem retomada explícita das decisões adiadas; runbook sozinho é preparação, não operação concluída.

### Etapa 26 — Construir corpus de relevância por produto

**P2 · M · Produto/Marketing/QA · Depende de: 02, 05.** Referências: UX31/32/34/35/49; LK14/17/20.

- **Entrega:** ao menos 30 intenções propostas com SKUs/IDs julgados por humanos: sinônimo, erro, código, campanha, quantidade e vazio. Preservar os 20 testes atuais de expansão lexical como outra camada.
- **Validação planejada:** separar desenvolvimento/validação, avaliar precisão dos primeiros resultados e nDCG quando aplicável; registrar divergência entre avaliadores e retirada legítima de produto.
- **Aceite:** baseline e limiares aprovados antes de otimizar. Não anunciar “busca relevante” apenas porque a palavra foi normalizada corretamente.

### Etapa 27 — Formalizar curadoria, ordenação e paginação

**P2 · M · Frontend/Arquitetura/Produto · Depende de: 26.** Referências: UX24/35/39/40/49.

- **Entrega:** decidir alcance da curadoria local à página, explicar limites e preservar ordem explícita Nome/Mais recentes. Evolução global só por contrato autorizado; não baixar todo o catálogo nem alterar origem protegida.
- **Validação planejada:** melhor candidato fora da primeira página, empate, duplicação, filtro, refresh, URL compartilhada e navegação anterior. Proteger as correções A04/A05.
- **Aceite:** nenhuma promessa de ranking global sem implementação; ordem estável e sem omissões artificiais. Alternativa aprovada fica registrada como tal, não como cumprimento literal de outra arquitetura.

### Etapa 28 — Formalizar dados comerciais e composição de kits

**P1 · L · Produto/Comercial/Backend · Depende de: 19, 26.** Referências: UX41/43/46/47; LK22/23/27/29/30.

- **Entrega:** amostra estratificada e procedência de mínimo, múltiplo, técnica, área, embalagem e componentes. Definir E.164/país quando telefone for necessário, sem presumir DDI por heurística ambígua.
- **Validação planejada:** mínimo desconhecido/zero, múltiplo confirmado, kit incompleto, componente alterado, teto global e payload adulterado; verificar UI, API e SQL.
- **Aceite:** regra aplicada somente com fonte aprovada; desconhecido continua “a confirmar”. Kit × unidades permanece consistente, sem preço, estoque ou viabilidade inventados.

### Etapa 29 — Homologar home, fotografias e repertório

**P2 · M · Design/Marketing/Frontend · Depende de: 26, 27.** Referências: UX21/23; LK06/09/10/12/17.

- **Entrega:** refinar seleção de produtos e categorias fotográficas já implementadas, com proveniência, diversidade pertinente e caminho claro ao catálogo. Manter manifesto/identidade.
- **Validação planejada:** categoria vazia, imagem ausente/indisponível, família repetida, conexão lenta, dimensões/reserva de espaço e legibilidade sem hover.
- **Aceite:** foto, rótulo e destino coerentes; fallback mantém compreensão. Não usar foto de fornecedor como prova de produção própria; sucesso de descoberta será observado na etapa 42.

### Etapa 30 — Homologar filtros e navegação móvel

**P2 · M · Design/Frontend/QA · Depende de: 27.** Referências: UX11/15–18/37–39; LK11–13.

- **Entrega:** escolher formalmente aplicação imediata ou rascunho+Aplicar, com contagem consistente, limpar/cancelar e distinção entre estado provisório/aplicado quando existir.
- **Validação planejada:** Escape, teclado, foco restaurado, scroll, back/refresh, zero resultado, latência e conexão perdida; preservar seleção e URL compartilhável.
- **Aceite:** fechar painel não causa mudança inesperada nem dois estados contraditórios. Manter modelo atual se comprovadamente adequado; não introduzir complexidade só para cumprir texto antigo.

### Etapa 31 — Catalogar materiais aprovados e direitos de uso

**P2 · M · Marketing/Conteúdo · Depende de: 05.** Referências: UX26/28/84; LK03/31–34.

- **Entrega:** obter localização do acervo já declarado aprovado e registrar proprietário, autorização por canal, versão, validade, metadados, descrição acessível e destino editorial.
- **Validação planejada:** duplicatas, links, resolução, informações sensíveis, autorização de clientes/pessoas e expiração. Material permanece em rascunho se faltar comprovação específica.
- **Aceite:** cada ativo publicável tem responsável e origem verificáveis. Não recriar o acervo com conteúdo fictício nem declarar ausente material apenas porque ainda não foi disponibilizado ao projeto.

### Etapa 32 — Publicar PDFs e revistas reais na biblioteca

**P2 · L · Conteúdo/Frontend/Backend · Depende de: 16, 17, 31.** Referências: UX81–84; LK15/36.

- **Entrega:** completar publicações autorizadas nos formatos já modelados, incluindo capa, data, tamanho, versão, download/fallback, revisão e retirada. Manter dez coleções online corretamente rotuladas.
- **Validação planejada:** abrir/baixar no mobile, falha do visualizador, arquivo grande, substituição, expiração, cache e exclusão de rascunho/retirado no sitemap/preview.
- **Aceite:** formato anunciado corresponde ao conteúdo; proposta privada nunca vira catálogo público. Estratégia de retirada considera cache e impossibilidade de recolher cópias já baixadas.

### Etapa 33 — Publicar cases e personalização comprováveis

**P2 · M/L · Marketing/Design/Comercial · Depende de: 28, 31.** Referências: UX26–28/47; LK31–35/39/40.

- **Entrega:** até atingir o critério histórico de três cases, publicar somente materiais autorizados suficientes, com contexto, solução e resultado verificável; diferenciar peça-base, simulação e produção real.
- **Validação planejada:** revisão factual, direitos, capacidade comercial, métricas/depoimentos e alegações ambientais; incluir retirada e produto descontinuado.
- **Aceite:** cada afirmação tem lastro e responsável editorial. Quantidade insuficiente permanece pendência; projeto especial não será ofertado sem confirmação do serviço.

### Etapa 34 — Homologar conteúdo da cópia de solicitação

**P1 · M · Backend/Marketing/QA · Depende de: 19, 28.** Referências: UX61–69; LK45; T13-31.

- **Entrega:** aprovar o contrato já enriquecido: protocolo, itens/variantes, kits, alternativas, verba/escopo, campanha e datas. Confirmar exclusões de notas livres/contatos da mensagem e acesso privado correspondente.
- **Validação planejada:** visitante/conta, 50 itens, kits longos, acentos, texto malicioso, ausência de verba/data e snapshot antigo; HTML, texto simples e template WhatsApp separadamente.
- **Aceite:** mensagem não diverge do snapshot e não promete orçamento final/pagamento. Não chamar resumo de cópia integral sem declarar o que foi omitido; entrega real permanece condicionada à etapa 38.

### Etapa 35 — Definir destino e contrato do atendimento comercial

**P1 · M · Produto/Operação/Arquitetura · Depende de: 05, 34.** Referências: UX70/75/77; T17-47.

- **Entrega:** escolher fila/CRM/destino aprovado, titular da operação, campos mínimos, identificador de deduplicação e evento de recebimento. Incluir solicitações novas e pedidos de ajuste.
- **Validação planejada:** examinar indisponibilidade, transferência, destinatário inválido, duplicata e aceite sem resposta; determinar o que o cliente pode ver e o que é interno.
- **Aceite:** decisão explícita com responsável; persistir no banco não equivale a entregar ao comercial. Não integrar implicitamente Promo Gifts nem enviar a endereços inferidos.

### Etapa 36 — Implementar encaminhamento comercial idempotente

**P1 · L · Backend/Integrações/QA · Depende de: 19, 35.** Referências: UX70/77.

- **Entrega:** adaptador/outbox específico para o destino aprovado, sem sobrecarregar semanticamente a fila `audience=customer`; separar confirmação ao cliente de recebimento comercial.
- **Validação planejada:** mock do destino com timeout, 429, 5xx, duplicata, replay, aceite sem resposta e retry; definir mecanismo de reconciliação e intervenção segura.
- **Aceite:** rastreabilidade e deduplicação operacional demonstradas, sem promessa de exactly-once externo. Ensaio real exige destino controlado autorizado; ausência de integração nunca vira status “entregue”.

### Etapa 37 — Definir responsável, estados e prazo de atendimento

**P1 · M · Produto/Operação/Backend · Depende de: 35, 36.** Referências: UX67/70/75/77.

- **Entrega:** estender o fluxo existente somente quando necessário para atribuição, próximo passo, transferência, ajuste e metas de atendimento aprovadas; registrar fuso/horário/feriados.
- **Validação planejada:** pedido sem responsável, transição inválida, evento fora de ordem, atraso, mudança de responsável e reabertura; preservar sequência monotônica de eventos.
- **Aceite:** timeline reflete fatos públicos, não notas internas; prazo público somente se sustentado pela operação. “Recebido” não pode significar “analisado” ou “proposta entregue”.

### Etapa 38 — Preparar e homologar canais sob liberação explícita

**P1 · M/L · Backend/QA/Operação · Depende de: 24, 34; fluxo comercial: 36, 37.** Referências: UX06/68/69/70; T13-19/20/29/30.

- **Entrega:** checklist por canal para remetente/template, segredo, consentimento, destinatário de teste e rollback. Enquanto adiado, concluir apenas contratos e testes locais/sandbox autorizado.
- **Validação planejada:** assinatura/replay de webhook, duplicação, reordenação, lease expirado, rate limit e resultado inconclusivo; futuramente protocolo→outbox→provedor→callback→destinatário.
- **Aceite:** estados aceito/entregue/lido/atendido separados. Habilitação real exige nova liberação e evidência; credenciais serão configuradas nos cofres, não solicitadas em texto aberto.

### Etapa 39 — Completar instrumentação segura do funil

**P2 · M · Produto/Frontend/Backend · Depende de: 18, 30, 34.** Referências: UX02/92; LK49; T13-38–42.

- **Entrega:** catálogo de eventos/propriedades permitidos, identificadores opacos, deduplicação e distinção de tentativa, persistência e entrega; mapear destino, retenção e preferências de coleta.
- **Validação planejada:** navegação SPA, retry, reload, bloqueador, offline, falha do coletor e tráfego sintético; inspecionar payloads sem e-mail, telefone, briefing ou URL privada.
- **Aceite:** orçamento funciona se analytics falhar; painel/recepção só são considerados prontos após prova real. Definir metas e baseline antes de interpretar conversão ou fazer alegações de melhora.

### Etapa 40 — Consolidar marca, SEO, compartilhamento e calendário

**P2 · M · Conteúdo/Frontend/QA · Depende de: 29, 30, 32, 33.** Referências: UX13/25/30/58/85–90/96/97; LK04/08/18/48.

- **Entrega:** checklist por rota das quatro frases, “nosso time de especialistas”, badge único, CTAs, redes oficiais, metadados e movimento reduzido. Conferir preview por conteúdo e calendário ICS.
- **Validação planejada:** crawler sem JS, 200/404/canonical/noindex, retirada de conteúdo, canais sociais controlados e importação/reimportação ICS em dois clientes; ano, fuso, UID e data móvel.
- **Aceite:** página privada não indexável, preview coerente e datas sem alteração/duplicação indevida. Não prometer indexação, prazo comercial ou compreensão por aparência visual.

### Etapa 41 — Homologar acessibilidade manual

**P1 · L · Design/QA especializado · Depende de: 15, 30; conteúdo novo: 32, 33.** Referências: UX17/94/95/96; LK46.

- **Entrega:** matriz manual de teclado, foco, diálogo, leitor de tela, contraste, zoom/reflow e anúncios de status, incluindo estados dinâmicos de kits, anexos, conta, favoritos e filtros.
- **Validação planejada:** zoom 200%/400%, texto longo, erro, loading, rota lazy, movimento reduzido e recuperação; documentar combinação navegador/tecnologia assistiva.
- **Aceite:** nenhum bloqueio crítico nas jornadas homologadas, com reprodução e reteste de cada achado. Axe verde não será declaração de conformidade integral nem substituto de revisão humana.

### Etapa 42 — Testar tarefas com compradores e dispositivos reais

**P2 · L · Pesquisa/Produto/QA · Depende de: 29, 30, 41.** Referências: UX20/22/54/64/91/95; LK02/05/09/42.

- **Entrega:** rodada formativa proposta com 5–8 profissionais de marketing, diversidade de experiência e público jovem relevante; encontrar, comparar, montar kit, solicitar e retomar orçamento.
- **Validação planejada:** metas definidas antes das sessões, sucesso sem ajuda, tempo, erros e compreensão de que não há venda; iOS/Android físicos, teclado virtual e rede instável.
- **Aceite:** evidência minimizada/consentida e correção/reteste dos bloqueios. Amostra qualitativa não prova comportamento de toda a geração Z; recrutamento/participação são dependências reais.

### Etapa 43 — Reduzir dívida de componentes e custo de navegação

**P2 · L · Frontend/QA · Depende de: 15, 29, 30; novas mídias: 32.** Referências: UX93; LK47; T13-32–37/48.

- **Entrega:** medir por rota, separar responsabilidades em páginas longas, revisar CSS, imagens, ícones/imports e lazy loading. Avaliar alvo histórico de 300 linhas sem fragmentação artificial.
- **Validação planejada:** comparar baseline e candidato com mesma rede/dispositivo/corpus, budgets bruto/comprimido, layout/foco e loading; verificar tree-shaking por artefato, não por aparência dos imports.
- **Aceite:** sem regressão nos budgets ou jornadas; melhoria demonstrada. CWV de campo exige coleta aprovada e amostra suficiente, não pode ser inferido do build ou emulação.

### Etapa 44 — Conectar requisitos ao Graphify com procedência

**P2 · L · Ferramentas/Engenharia/QA · Depende de: 02, 19.** Referências: GR04/08/15/16/18/25/31–37/47.

- **Entrega:** corpus documental allowlist separado do AST, vínculo requisito→fonte→teste→contrato com commit/validade, distinção extraído/inferido/ambíguo e responsáveis; preservar mapa fora do runtime.
- **Validação planejada:** documento obsoleto, símbolo removido, aliases/homônimos, relação contraditória e cadeia RPC/SQL; amostra julgada para precisão e recuperação de testes afetados.
- **Aceite:** afirmação rastreável e incerteza explícita; documento não autoriza ação nem migration prova deploy. Manter decisões de grafo não direcionado/rebuild/sem hooks; extração com provedor externo requer decisão própria.

### Etapa 45 — Homologar resiliência e governança do Graphify

**P2 · M/L · Ferramentas/Segurança/QA · Depende de: 44.** Referências: GR20/27/39/42/43/45/46/48–50.

- **Entrega:** ensaios de candidato/lock/recuperação, segurança de HTML, upgrade/restauração, retenção/visibilidade de artefatos e custo em corpus atual/ampliado. Cache só se medição justificar.
- **Validação planejada:** parser inválido, timeout, interrupção, lock órfão, concorrência, disco cheio por injeção, symlink externo, nome hostil, renome/branch e cache stale em diretório temporário isolado.
- **Aceite:** último grafo válido preservado e nenhum corpus executado ou exposto; fingerprints incluem configuração/versão se houver cache. Benchmark estrutural não equivale à precisão semântica nem a nota do site.

### Etapa 46 — Consolidar compatibilidade e gates bloqueantes

**P1 · M · Engenharia/Infraestrutura · Depende de: 03; aplicado por lote.** Referências: T13-02/04/07/08/43–45; T17-06–10.

- **Entrega:** documentar matriz de dependências/peers e decisões sobre majors, com consulta à documentação oficial vigente na futura avaliação. Preservar lint, tipos, cobertura, segurança, nomes de migrations e budgets.
- **Validação planejada:** instalação limpa e CI reproduzível; majors apenas em branch isolada, sem reduzir limiares ou usar continue-on-error em gates obrigatórios.
- **Aceite:** combinação suportada e justificativa de adiar/avançar registrada. Não executar atualização de dependências neste planejamento nem atrelar hotfix a major sem necessidade.

### Etapa 47 — Executar regressão integrada por risco

**P1 · L · QA/Engenharia · Depende de: 04, 46 e etapas do lote selecionado.** Referências: UX99; AC30.

- **Entrega:** matriz visitante/conta da descoberta ao histórico: kits, alternativas, anexos, seleção compartilhada, ajustes e retornos de erro. Preservar exclusões externas explicitamente.
- **Validação planejada:** suítes unitárias/API, pgTAP, concorrência real SQL e projetos Playwright existentes; 429, timeout, rede, replay, sessão expirada, mutação concorrente e troca de titular.
- **Aceite:** nenhum F24 ou defeito crítico conhecido no escopo liberado; resultados com SHA/ambiente. Não somar recortes já incluídos na suíte para inflar quantidade de testes.

### Etapa 48 — Publicar lotes com compatibilidade e reversão

**P1 · M · Release/Backend · Depende de: 05, 46, 47; alteração SQL: 20.** Referências: UX98/100; LK50; T17-50.

- **Entrega futura condicionada:** PR revisado, migrations mínimas quando necessárias, código compatível com expansão de schema, SHA testado e release controlado. Este documento não executa nem autoriza publicação agora.
- **Validação planejada:** código antigo/schema novo, código novo/schema anterior, migration atrasada, falha parcial e deploy concorrente; ledger/dry-run e teste de rollback de configuração/código.
- **Aceite:** gates aprovados, artefatos sem segredos, mudança publicada correspondente ao SHA validado. Não apagar dados ou reescrever migrations para reverter; preferir correção progressiva segura quando rollback não for viável.

### Etapa 49 — Observar produção e confirmar efeitos reais

**P1 · M · QA/Operação · Depende de: 48.** Referências: UX67/97–100; LK50.

- **Entrega:** janela e limiares de observação acordados, smoke de rotas/headers e acompanhamento dos fluxos efetivamente ativados; correlação sem dados pessoais.
- **Validação planejada:** 200/404/401, catálogo, assets, rota privada e fluxos autenticados controlados quando autorizados; comparar erros/filas/latência com baseline. Teste de escrita/envio separado e explicitamente delimitado.
- **Aceite:** estabilidade no período definido e plano de resposta a regressão; 200 da home não vale como prova do orçamento completo. Não marcar canal adiado como homologado.

### Etapa 50 — Encerrar por requisito, não por percepção

**P1 · M · Produto/Engenharia/Operação · Depende de: 02, 49 e aceites do lote; fechamento integral: todas as etapas aplicáveis.** Referências: matriz canônica e todos os planos anteriores.

- **Entrega:** ledger/índice atualizados com implementação, testes, SHA, configuração, operação e aceite humano; inventário explícito de parciais, adiados, dependências e alternativas aprovadas.
- **Validação planejada:** 50 IDs únicos, cobertura das referências históricas, links/fontes válidos, revisão humana da semântica e conferência de evidências remotas pertinentes.
- **Aceite:** nenhum requisito descartado silenciosamente ou encerrado por mera existência de arquivo. Entrega técnica, publicação e homologação têm estados distintos; assinatura de encerramento pelo responsável, sem promessa de perfeição.

## Simulação preventiva do plano — análise, não testes executados

| Cenário | Falha antecipada | Resposta prevista | Etapas |
|---|---|---|---|
| B assume sessão antes dos efeitos | Renderização usa favoritos de A | Projeção síncrona por titular e testes de commit/DOM | 06–07 |
| Adição termina antes da leitura antiga | Remoção da promise apaga revisão da intenção | Revisão monotônica e revalidação | 08/10 |
| Remoção disputa com snapshot antigo | União de conjuntos ressuscita item | Intenção negativa versionada e reconciliação | 09/10 |
| Terceira ação termina antes da primeira | Rollback antigo desfaz ação nova | Revisão não reutilizada e ordem consistente de escrita | 10 |
| Promoção excede limite ou falha parcialmente | Truncamento ou marcação de sucesso antecipada | Confirmação por operação e intenção recuperável | 11 |
| Arquivo tem cabeçalho válido e corpo indevido | Prefixo é confundido com validação completa | Política, inspeção limitada e falha fechada | 16–17 |
| Grants remotos são diferentes por plataforma | Revogação indiscriminada quebra serviço | Causa/consumidores/ensaio antes da decisão | 20 |
| Preview herda segredo real | Envio/leitura indevida em ambiente de teste | Guardas, isolamento e allowlist de destino | 22/38 |
| Restore reativa rotinas externas | Envio acidental a clientes | Destino descartável e integrações inativas | 23 |
| Cron deixa de ser chamado | Nunca executa seu próprio alerta | Observador independente | 24 |
| Ranking local é apresentado como global | Melhor produto está fora da página | Decisão de alcance e corpus multipágina | 26–27 |
| Comercial recebe duas vezes após timeout | Retrabalho/contato duplicado | Identificador idempotente e reconciliação | 35–37 |
| Material aprovado é de outro canal | Publicação sem direito específico | Inventário e aceite por ativo/destino | 31–33 |
| Grafo falha no meio da geração | Candidato parcial substitui mapa válido | Promoção atômica e ensaios adversariais | 44–45 |
| CI passa mas usuário não recebe mensagem | Implementação é confundida com ativação | Critérios independentes e homologação observada | 38/47–50 |

## Lotes e caminho de execução sugeridos

- **A — Hotfix de estado:** preparação mínima 01/03/04/05; modelo 06 e correções 07–10; regressões 15; recorte de 46–50. Reconciliação 02 acompanha a entrega. Não aguardar conteúdo, pesquisa ou provedores.
- **B — Continuidade/segurança:** 11–14, 16–21, 28 e contratos associados, por PRs separados. Mudanças de banco só se necessárias e aprovadas.
- **C — Descoberta/conteúdo:** 26–34 e 40–43 conforme disponibilidade do acervo e participantes. Não publicar materiais provisórios como reais.
- **D — Operação/integração:** 22–25 e 35–39, respeitando escolha de destino, custos e adiamentos. Contratos locais podem avançar antes da ativação externa.
- **E — Ferramentas:** 44–45 em trilha própria, sem bloquear hotfix ou inflar o bundle público.
- **F — Encerramento:** 46–50 em cada lote; fechamento integral só quando critérios restantes forem atendidos ou substituídos por decisão explícita.

Números de etapa não impõem uma fila rígida: por exemplo, contratos da etapa 19 precedem a implementação de arquivos da 17. As dependências declaradas, não a posição do título, governam a execução. Trabalhos independentes podem progredir em paralelo quando houver autorização e responsáveis.

## Evidência mínima futura por etapa

```text
ID: P50-20260924-NN
Requisitos históricos relacionados:
Escopo entregue e limites:
Arquivos / contrato / migration / SHA:
Cenários e resultados antes/depois:
Ambiente: local / CI / preview / produção
Configuração e ativação necessárias:
Aceite humano / responsável / data:
Riscos residuais e reversão:
Estado: proposto / em execução / parcial / tecnicamente entregue / homologado / adiado
Próxima dependência específica:
```

## Decisões externas ainda necessárias na futura execução

1. Localização e direitos específicos dos PDFs, fotografias e cases já aprovados.
2. Destino comercial, responsáveis e metas sustentáveis de atendimento.
3. Política de arquivos e eventual infraestrutura adicional, com custo/privacidade explícitos.
4. Infraestrutura autorizada de preview/restore e metas de recuperação.
5. Participantes e recursos para testes assistivos e dispositivos físicos.
6. Eventual retomada da ativação de provedores, alertas e credenciais adiadas.

Essas decisões não impedem o hotfix local de favoritos nem autorizam ações externas automaticamente. **Neste pedido, somente este plano foi criado.**
