# Plano de fechamento da implantação em 100 etapas

Data: 01/10/2026. Projeto: Promo Brindes V1. Estado: **planejado, não executado por este documento**. Destinatários: responsável pelo produto, engenharia, marketing e operação comercial.

Este plano organiza o trabalho necessário para concluir e comprovar as entregas dos planos anteriores. Parte da auditoria de 01/10 e da base `cfb33e4d0ee2f88a0294f5f3f314de997b8d995d`. Não reinicia funcionalidades prontas, não apaga pendências externas e não transforma publicação ou teste aprovado em aceite comercial. A criação e o commit deste plano não executam suas etapas.

## Base de evidência e fontes

Na revisão imediatamente anterior a este planejamento, código local e main remota estavam no mesmo SHA; passaram 430 testes Vitest, dois probes históricos de favoritos, lint, TypeScript, quatro testes de URL de release e seis testes do validador do ledger. O smoke passou no domínio principal e no alias git-main. São evidências da revisão anterior, não 100 etapas executadas nem uma nova auditoria completa do banco.

O release [36758683827](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/36758683827) estava aprovado. As falhas antigas de favoritos, Analytics 404 e release não devem ser reabertas sem reprodução nova. Persistem lacunas de encaminhamento comercial, limitação antes de consultas ao catálogo, classificação de sucesso do CI, configuração de segurança, conteúdo e homologação operacional.

Fontes de rastreabilidade, conservadas como histórico:

- [Índice e matriz canônica de produto](MATRIZ_INDEX.md) e [CSV de 230 referências](MATRIZ_FECHAMENTO_PLANOS_20260912.csv).
- [Revisão de produto UX100 LK50 GR50 AC30](REVISAO_PRODUTO_230_20260928.md).
- [Revisão dos planos técnicos de 13, 16 e 17 de setembro](REVISAO_PLANOS_20260923_ANEXO_TECNICO.md).
- [Revisão e correspondência dos planos de 23 e 24 de setembro](REVISAO_50_ETAPAS_20260928.md).
- [Plano técnico de 24 de setembro](PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260924.md).
- [Plano de 100 etapas de workflows](PLANO_WORKFLOWS_100_ETAPAS_20260927.md) e [sua revisão](REVISAO_WORKFLOWS_100_20260928.md).

Essas fontes contêm 580 referências sobrepostas, não 580 funcionalidades independentes. Os documentos antigos possuem conclusões superadas; cada aceite deve apontar para evidência datada. Planos autônomos antigos de catálogos e calendário não localizados não serão reconstruídos por suposição: a cobertura identificável está nas referências UX81–90 e LK15/36, até recuperação dos originais.

## Limites e decisões que permanecem válidos

- Implementação somente no site e, quando expressamente autorizada, no banco isolado `xlzmclcjdncjfdrjxclt`. Não alterar Promo Gifts V4 nem `doufsxqlfjyuvxuezpln`. Verificações do contrato de origem serão somente leitura autorizada e com volume limitado.
- Não há checkout ou venda online. Preservar solicitação de orçamento sem cadastro obrigatório, catálogo sem exigência de estoque positivo e quantidades desconhecidas como a confirmar. Não inventar preços, disponibilidade, prazo, múltiplos ou capacidade de personalização.
- Preservar Tendências, aliases antigos, badge único, quatro frases da marca, kits, alternativas, biblioteca, calendário, conta e campanhas. Manter as decisões arquiteturais documentadas até eventual mudança explicitamente aprovada.
- Resend, WhatsApp, webhooks, alertas e `SITE_SUPABASE_SERVICE_JWT` permanecem adiados. As etapas correspondentes ficam condicionadas a nova liberação; encontrar uma chave não é autorização para usá-la.
- Materiais aprovados existem segundo o usuário. Sua localização, direitos por canal e correspondência com produtos precisam ser registrados. Não fabricar cases, pessoas, resultados ou depoimentos.
- Nunca versionar segredos, bases de clientes, backups ou dados pessoais. Evidências devem ser sanitizadas. Git contém código, migrations e contratos; não é espelho das linhas operacionais do banco.
- Não executar repair de migrations, DDL, revogação de permissões, restore sobre produção, mudanças de proteção ou contratação de serviços para tornar um indicador verde. Cada alteração remota exige escopo, revisão, recuperação e autorização próprios.
- Antes de implementar mudanças Supabase, conferir documentação/changelog atuais, comandos disponíveis e política vigente do repositório. A sequência de migration deve ser versionada, testada localmente, revisada, aplicada pelo fluxo aprovado e comprovada por ledger e schema; nunca por uma promessa deste documento.

## Como executar e aceitar

Cada etapa começa em **planejada**. Estados futuros: em execução, bloqueada com motivo, tecnicamente validada, publicada quando aplicável e homologada. Decisão de não executar ou de aceitar alternativa é registrada separadamente; não equivale a implementação literal.

P1 indica segurança, integridade, operação essencial ou bloqueio de fechamento. P2 indica qualidade e maturidade. S, M e L representam esforço relativo, não prazo prometido. Responsáveis são funções propostas, a designar nominalmente na etapa 04. Toda etapa também depende das regras deste documento. Dependências numeradas são pré-requisitos de conclusão, não proibição de preparar trabalhos independentes.

Para concluir uma etapa, registrar: requisito original, mudança ou evidência que dispensa mudança, teste e resultado, SHA, ambiente, publicação quando aplicável, limitações, responsável e aceite. Falha reproduzida ganha teste antes da correção. Testes devem usar fixtures/sandbox; testes reais exigem contas e destinatários controlados e autorização. Sem aceite necessário, a etapa continua aberta.

Reversão padrão: PR pequeno, compatibilidade preservada, recurso desligável quando adequado e retorno ao artefato conhecido. Migrações adotam expansão e contração em revisões separadas; não presumir que rollback de código desfaz dados. Antes de mudança de segurança, testar também negações legítimas. Nunca enfraquecer gates para liberar o próprio trabalho.

## Bloco 1 Rastreabilidade e governança

### Etapa 001 Congelar a base de comparação

P1 · S · Engenharia e QA · Depende de: nenhuma.

- **Entrega:** registrar SHA local/remoto, worktree, PRs abertos, aliases, runtime e última evidência de banco, separando leitura atual de resultado histórico.
- **Cenários:** branch atrasada, alteração não commitada, deployment de outro SHA e artefato indisponível.
- **Aceite:** base reproduzível, sem sobrescrever trabalho alheio; divergências viram itens rastreáveis antes da implementação.

### Etapa 002 Relacionar todos os requisitos anteriores

P1 · M · Produto e QA · Depende de: 001.

- **Entrega:** mapear cada uma das 580 referências às etapas deste plano, com relação muitos para muitos, fonte, critério original e justificativa para alternativa ou escopo protegido.
- **Cenários:** IDs duplicados, requisito sem destino, fonte inexistente, critérios contraditórios e planos não localizados.
- **Aceite:** nenhuma referência conhecida órfã; sobreposições não contam como entregas extras; lacunas documentais permanecem explícitas.

### Etapa 003 Reconciliar o estado real da matriz

P1 · M · QA e Engenharia · Depende de: 002.

- **Entrega:** corrigir notas vencidas sobre favoritos, categorias, ranking, Analytics, release e runtime, preservando histórico; incluir os planos técnicos e de workflows na validação de rastreabilidade.
- **Cenários:** fonte presente sem implementação, teste passando com critério ausente e evidência de outro SHA.
- **Aceite:** estados não promovidos automaticamente; fonte, teste, publicação e homologação são campos distintos.

### Etapa 004 Designar responsáveis e marcos

P1 · S · Responsável pelo produto · Depende de: 002.

- **Entrega:** nomear titular e substituto por frente, capacidade disponível, revisores, sequência de lotes e datas de decisão; estimar duração somente após conhecer capacidade e dependências.
- **Cenários:** responsável ausente, material atrasado, decisão comercial conflitante e revisão sem pessoa elegível.
- **Aceite:** cada etapa tem dono e próximo passo; marcos técnicos e homologação externa não compartilham uma data fictícia.

### Etapa 005 Registrar liberações e bloqueios externos

P1 · S · Produto e Segurança · Depende de: 004.

- **Entrega:** registro de decisões para canais adiados, preview, infraestrutura, CRM, contas técnicas, regras comerciais e sistema interno; incluir custo e risco quando aplicáveis.
- **Cenários:** credencial encontrada sem liberação, autorização vencida e pedido que amplia o alvo.
- **Aceite:** ativação depende de autorização identificável; bloqueio não impede trabalho local independente nem desaparece dos relatórios.

### Etapa 006 Tornar a revisão de PR sustentável

P1 · M · Administração GitHub e Segurança · Depende de: 004, 005.

- **Entrega:** revisar colaboradores e CODEOWNERS para obter revisão elegível, sem autoaprovação; definir regra para último push, administradores e mudanças sensíveis.
- **Cenários:** PR do único owner, reviewer indisponível, código alterado após aprovação e tentativa de bypass.
- **Aceite:** um PR representativo consegue revisão legítima; não reduzir aprovações temporariamente para efetuar merges.

### Etapa 007 Formalizar proteção da main

P1 · M · Administração GitHub e DevOps · Depende de: 006.

- **Entrega:** propor e aplicar, após aprovação, ruleset ou proteção equivalente com checks estáveis, atualização exigida, política de merge e histórico; tratar squash, atualização e exclusão de branches explicitamente.
- **Cenários:** gate ausente, branch atrasada, PR documental e migração de regra sem janela desprotegida.
- **Aceite:** configurações lidas novamente pela API; escolha arquitetural documentada quando diferir do plano antigo.

### Etapa 008 Ativar as camadas preventivas de segurança

P1 · M · Segurança e Administração GitHub · Depende de: 005, 006.

- **Entrega:** verificar elegibilidade e ativar secret scanning, push protection e security updates; restringir Actions e exigir pinning por SHA conforme política aprovada.
- **Cenários:** recurso indisponível no plano, falso positivo, action legítima bloqueada e segredo sintético de teste.
- **Aceite:** configuração efetiva comprovada; indisponibilidade gera alternativa aprovada e risco residual, não falso status concluído.

### Etapa 009 Isolar segredos e privilégios por ambiente

P1 · M · DevOps e Segurança · Depende de: 005, 007.

- **Entrega:** alinhar Environments, branches autorizadas e permissões por job; usar identidades técnicas restritas quando liberadas, desabilitar persistência de credenciais desnecessária e limpar artefatos sensíveis.
- **Cenários:** fork, branch não autorizada, variável ausente e colisão entre segredo de repositório e Environment.
- **Aceite:** preview não herda segredos produtivos; inventário registra apenas nomes, donos, escopo e rotação.

### Etapa 010 Corrigir a medição de saúde do CI

P1 · S · DevOps e QA · Depende de: 001.

- **Entrega:** contar success explicitamente, distinguir failure, cancelled, timed_out, skipped e pendente; definir janela temporal, amostra e ausência de dados.
- **Cenários:** cinco runs com um sucesso, reruns, paginação, zero runs e execução ainda ativa.
- **Aceite:** fixture com um sucesso não informa quatro; resumo expõe denominador e não mascara estado inconclusivo.

## Bloco 2 Segurança da API e continuidade do cliente

### Etapa 011 Limitar abuso antes da consulta ao catálogo

P1 · M · Backend e Segurança · Depende de: 001, 005.

- **Entrega:** desenhar e implementar limitação distribuída antes de reconcileQuoteItems, mantendo o limite transacional e identidade confiável de origem; evitar memória local como única proteção.
- **Cenários:** rajada concorrente, IP falsificado, NAT compartilhado, retries idempotentes e limitador indisponível.
- **Aceite:** requisição excedente não consulta catálogo; política de falha e recuperação documentada, sem bloquear silenciosamente uso legítimo.

### Etapa 012 Fechar os contratos de entrada e tempo limite

P1 · M · Backend e QA · Depende de: 011.

- **Entrega:** revisar método, origem, tamanho, tipo, campos, idempotência, cancelamento e limpeza de timers em todas as saídas da API; centralizar contratos e erros compatíveis.
- **Cenários:** JSON inválido, corpo grande, 405, conflito de chave, timeout e conclusão tardia.
- **Aceite:** códigos e mensagens estáveis; recursos liberados; nenhuma resposta de sucesso após falha de persistência.

### Etapa 013 Certificar favoritos e troca de identidade

P1 · M · Frontend e QA · Depende de: 001.

- **Entrega:** preservar as correções existentes e completar matriz de titular, épocas, fila, snapshot confirmado e projeção de IDs válidos.
- **Cenários:** A→B→A, logout, lista atrasada, adicionar/remover com dupla falha, evento storage e reordenação de datas.
- **Aceite:** testes permanentes passam sem alterar expectativas; intenção de A não é despachada com sessão de B.

### Etapa 014 Homologar favoritos anônimos e entre dispositivos

P1 · M · Frontend e QA · Depende de: 013, 005.

- **Entrega:** testar promoção após login, limite de 100, conflitos entre abas, offline e retomada em duas sessões controladas.
- **Cenários:** limite atingido, storage indisponível, falha parcial, evento duplicado e catálogo com data removida.
- **Aceite:** convergência para estado confirmado, feedback recuperável e nenhuma perda silenciosa; ensaio remoto somente com contas autorizadas.

### Etapa 015 Concluir continuidade das campanhas

P1 · M · Frontend e QA · Depende de: 013.

- **Entrega:** homologar salvar, abrir, arquivar, restaurar e resolver conflito de campanhas; declarar que biblioteca explícita não é sincronização automática do carrinho.
- **Cenários:** edições simultâneas, campanha excluída, versão obsoleta, manter ambas e substituir conscientemente.
- **Aceite:** versão otimista impede sobrescrita inadvertida; nova sincronização automática só mediante decisão de produto, sem reinterpretar o aceite anterior.

### Etapa 016 Homologar o ciclo real de autenticação

P1 · M · Backend e QA · Depende de: 005, 009.

- **Entrega:** validar cadastro, confirmação, senha, código/link, refresh, logout e recuperação em contas controladas, mantendo o primeiro orçamento sem cadastro.
- **Cenários:** token expirado, reuso, redirect externo, troca de e-mail, múltiplas abas e sessão revogada.
- **Aceite:** autorização deriva da identidade confiável; ciclo de e-mail realmente recebido documentado, sem segredos ou tokens nos artefatos.

### Etapa 017 Homologar orçamento privado e propostas

P1 · M · Backend e QA · Depende de: 016, 021.

- **Entrega:** testar associação por e-mail confirmado, lista, detalhe, histórico, versões de proposta e link assinado; distinguir snapshot de catálogo atual.
- **Cenários:** outro titular, visitante, versão vencida, arquivo removido, acesso direto e expiração da URL.
- **Aceite:** documento só abre para titular permitido; teste operacional com PDF autorizado comprova publicação e vencimento.

### Etapa 018 Certificar compartilhamento e repetição

P1 · M · Frontend e Backend · Depende de: 015, 017.

- **Entrega:** ensaiar criar, abrir, expirar e revogar links, repetir campanha e imprimir seleção com 50 itens, kits e alternativas.
- **Cenários:** produto removido, variante ambígua, seleção já preenchida, segredo de revogação errado e acesso após expiração.
- **Aceite:** substituição exige confirmação; bloqueios ficam visíveis; PDF não corta itens nem revela dados privados indevidos.

### Etapa 019 Completar saneamento dos anexos

P1 · L · Segurança e Backend · Depende de: 005, 012.

- **Entrega:** definir formatos e limites, decodificar/reencodar imagens quando apropriado, limitar dimensões e metadados, limpar órfãos; decidir suporte PDF com pipeline seguro antes de habilitá-lo.
- **Cenários:** MIME falso, políglota, imagem comprimida hostil, SVG ativo, arquivo truncado e upload interrompido.
- **Aceite:** assinatura não é tratada como saneamento completo; formatos sem tratamento aprovado continuam recusados com mensagem clara.

### Etapa 020 Homologar direitos do titular e privacidade

P1 · M · Produto, Segurança e Operação · Depende de: 016, 019, 025.

- **Entrega:** executar acesso, correção, exportação e apagamento em identidades sintéticas; revisar retenção, logs, preferências e texto de privacidade com responsável competente.
- **Cenários:** exclusão com sessão ativa, fila pendente, Storage órfão, pedido sem prova de identidade e falha parcial.
- **Aceite:** sequência revoga acesso conforme política e remove dados abrangidos; exceções de retenção ficam justificadas, sem declarar conformidade jurídica automática.

## Bloco 3 Banco isolado e recuperação

### Etapa 021 Revalidar ledger e schema do site

P1 · M · DBA e QA · Depende de: 001, 005.

- **Entrega:** comparar versões locais/remotas e, por pg_catalog, tabelas, views, funções, triggers, índices, constraints, políticas e grants do escopo do site.
- **Cenários:** mesma versão com SQL diferente, DDL fora de migration, ACL divergente e objeto ausente.
- **Aceite:** relatório sanitizado separa ledger de schema; divergência recebe investigação e migration legítima, nunca repair às cegas.

### Etapa 022 Automatizar o contrato público da origem

P1 · M · DBA e Backend · Depende de: 005, 021.

- **Entrega:** criar check somente leitura do contrato consumido, com colunas, tipos, permissões esperadas e compatibilidade de dados, sem alteração no Promo Gifts.
- **Cenários:** coluna removida, tipo incompatível, permissão revogada, timeout e resposta inesperada.
- **Aceite:** teste falha com causa específica; usa acesso mínimo e fixtures negativas; não confunde PostgREST com auditoria completa de schema.

### Etapa 023 Completar tipos e contratos de RPC

P1 · M · Backend e DBA · Depende de: 021, 022.

- **Entrega:** inventariar JSON e estruturas manuais, unir contratos de request/response, tipos gerados e catálogo de erros; documentar compatibilidade e depreciação.
- **Cenários:** campo adicional, campo obrigatório ausente, null, versão antiga e serialização de kit adulterada.
- **Aceite:** desvios falham no CI com diff útil; tipos, dicionário e diagrama são gerados a partir de fonte verificável.

### Etapa 024 Preparar e validar privilégio mínimo

P1 · M · DBA e Segurança · Depende de: 005, 009, 021, 023.

- **Entrega:** testar role site_api, RLS/FORCE RLS, views e funções privilegiadas; preparar comparação paralela e reversão do cutover da credencial restrita.
- **Cenários:** anon, authenticated de outro titular, role limitada, search_path hostil e EXECUTE herdado de PUBLIC.
- **Aceite:** matriz positiva/negativa aprovada; ativação produtiva permanece bloqueada até liberação explícita da variável adiada.

### Etapa 025 Validar retenção e trilha administrativa

P1 · M · DBA e Segurança · Depende de: 021.

- **Entrega:** revisar políticas por tabela, purga em lotes, tombstones e limpeza Storage; separar auditoria de escrita/DDL de auditoria de leitura e definir cobertura necessária.
- **Cenários:** FK impede exclusão, lease em processamento, repetição de purga, relógio de fronteira e falha após exclusão parcial.
- **Aceite:** processamento recuperável e evidência minimizada; não afirmar rastreamento de SELECT que não esteja implantado.

### Etapa 026 Exercitar concorrência e carga do banco

P1 · M · DBA e QA · Depende de: 021, 023.

- **Entrega:** ampliar fixtures representativas para filas, consultas do portal e paginação; medir planos, locks, throughput e recursos em ambiente isolado.
- **Cenários:** consumidores concorrentes, lease esgotado, backlog, índices ausentes e estatística defasada.
- **Aceite:** metas aprovadas antes do ensaio; sem perda/duplicação lógica; índices novos só com benefício medido, nunca por proibir todo Seq Scan indiscriminadamente.

### Etapa 027 Implantar rotina de manutenção verificável

P2 · M · DBA e Operação · Depende de: 026.

- **Entrega:** agenda com dono para estatísticas, índices, autovacuum, advisor, retenção e capacidade; registrar primeira execução e próxima revisão.
- **Cenários:** crescimento inesperado, índice sem uso, tabela de alta rotatividade e falha do job de inspeção.
- **Aceite:** evidência operacional com tendências e ações; runbook não é contabilizado como manutenção realizada.

### Etapa 028 Provisionar homologação isolada

P1 · L · DevOps e DBA · Depende de: 005, 009, 021.

- **Entrega:** definir preview/sandbox com dados sintéticos, Auth, Storage, URLs e CSP próprios; avaliar custo, ciclo de vida e destruição controlada.
- **Cenários:** PR de fork, segredo ausente, preview apontando para produção, limpeza incompleta e migration incompatível.
- **Aceite:** guarda recusa alvo produtivo; orçamento, conta e uploads testáveis sem atingir clientes ou origem protegida.

### Etapa 029 Executar recuperação medida

P1 · L · DBA e Operação · Depende de: 028, 025.

- **Entrega:** verificar cobertura real de backups/PITR e restaurar em destino descartável autorizado; incluir blobs, Auth e configurações que não constem do backup SQL.
- **Cenários:** backup indisponível, objeto Storage ausente, segredo não recuperável e restauração incompleta.
- **Aceite:** RPO e RTO medidos contra metas aprovadas, conferência funcional e revisão por outra pessoa; nunca restaurar sobre produção como teste.

### Etapa 030 Detectar silêncio dos jobs operacionais

P1 · M · Operação e Backend · Depende de: 005, 025, 026.

- **Entrega:** heartbeat e observador independente para crons, retenção e fila, com atraso tolerado, escalonamento e deduplicação; não instalar pg_cron contra decisão anterior.
- **Cenários:** job nunca invocado, observador parado, fila vazia, lease preso e alerta repetido.
- **Aceite:** simulação detecta ausência sem depender do job ausente; canal real depende da liberação registrada, com destinatário confirmado.

## Bloco 4 Atendimento comercial e comunicações

### Etapa 031 Definir destino e contrato comercial

P1 · M · Produto e Comercial · Depende de: 004, 005.

- **Entrega:** escolher CRM/fila/destino, dono do atendimento, campos mínimos, protocolo, confirmação de recebimento e tratamento de contatos e ajustes.
- **Cenários:** destino inexistente, destinatário errado, equipe indisponível e dados em excesso.
- **Aceite:** decisão comercial aprovada; persistência no banco e cópia ao cliente não são aceites de recebimento comercial; nenhuma integração implícita com Promo Gifts.

### Etapa 032 Projetar a fila de encaminhamento comercial

P1 · M · Backend e DBA · Depende de: 023, 031.

- **Entrega:** modelar evento/outbox separado de audience=customer, chave idempotente, estado de recebimento, tentativas, lease e reconciliação.
- **Cenários:** transação abortada, solicitação duplicada, alteração de destino e evento sem pedido correspondente.
- **Aceite:** contrato e migration revisados; registro e enfileiramento atômicos quando no mesmo banco; nenhuma promessa de exactly-once externo.

### Etapa 033 Implementar o adaptador do destino aprovado

P1 · L · Backend e Integrações · Depende de: 012, 028, 032.

- **Entrega:** consumidor com autenticação mínima, timeout, backoff, observabilidade e reconciliação de aceite; tratamento separado de indisponibilidade e rejeição definitiva.
- **Cenários:** 429, 5xx, timeout após aceite, replay, webhook fora de ordem e reprocessamento manual.
- **Aceite:** contrato testado com destino simulado e homologado; duplicata identificável não cria atendimento independente; envio real só após liberação.

### Etapa 034 Encaminhar ajustes e contatos

P1 · M · Backend e Comercial · Depende de: 033, 017.

- **Entrega:** associar contato, pedido de ajuste e nova solicitação ao atendimento correto, preservando histórico e minimização de dados.
- **Cenários:** orçamento encerrado, ajuste repetido, titular diferente e falha entre gravação e envio.
- **Aceite:** percurso rastreável até recebimento; não marcar entregue por apenas gravar no site; falhas oferecem recuperação sem apagar conteúdo.

### Etapa 035 Definir responsabilidade e prazo público

P1 · M · Comercial e Produto · Depende de: 031, 034.

- **Entrega:** estados, atribuição, transferência, horários, feriados e metas de resposta; mostrar ao cliente somente fatos públicos e próximo passo sustentado.
- **Cenários:** pedido sem responsável, atraso, reabertura, transferência e evento fora de ordem.
- **Aceite:** timeline coerente; prazo aprovado e mensurável; recebido, analisado e proposta entregue continuam estados distintos.

### Etapa 036 Aprovar conteúdo das confirmações

P1 · M · Marketing e Backend · Depende de: 023, 031.

- **Entrega:** revisar HTML, texto e template WhatsApp com protocolo, variantes, kits, alternativas, campanha, verba e datas; declarar omissões intencionais e proteção do detalhe privado.
- **Cenários:** 50 itens, texto malicioso, acentos, snapshot antigo, verba ausente e kit extenso.
- **Aceite:** mensagem corresponde ao snapshot e não promete preço final; layout e linguagem aprovados por canal.

### Etapa 037 Homologar e ativar e-mail quando liberado

P1 · M · Integrações e Operação · Depende de: 005, 009, 028, 036.

- **Entrega:** conferir remetente/domínio e configurar Resend no cofre; enviar somente para destinatários controlados antes de habilitar tráfego real.
- **Cenários:** bounce, rejeição, timeout após aceite, idempotência, limite do provedor e HTML/texto em clientes distintos.
- **Aceite:** protocolo correlacionado a recebimento real e callback; chave de desligamento e procedimento de reconciliação ensaiados. Continua bloqueada enquanto adiada.

### Etapa 038 Homologar e ativar WhatsApp quando liberado

P1 · M · Integrações e Comercial · Depende de: 005, 009, 028, 036.

- **Entrega:** conferir conta, template, idioma, consentimento e telefone; ativar após teste controlado e custo aprovado.
- **Cenários:** ausência de opt-in, template recusado, número inválido, timeout inconclusivo, duplicação e revogação da preferência.
- **Aceite:** entrega observada sem inferir leitura ou atendimento; nenhum envio promocional implícito. Continua bloqueada enquanto adiada.

### Etapa 039 Certificar callbacks e reconciliação

P1 · M · Segurança e Integrações · Depende de: 037, 038.

- **Entrega:** homologar assinaturas, janela temporal, eventos deduplicados e precedência; procedimento para estado inconclusivo sem retry cego.
- **Cenários:** assinatura incorreta, replay, devolução posterior, duplicata e entrega antes do registro de aceite.
- **Aceite:** estado converge sem regressão indevida; eventos reais sanitizados vinculam tentativa, provedor e destinatário controlado.

### Etapa 040 Ensaiar atendimento ponta a ponta

P1 · L · Comercial, Operação e QA · Depende de: 030, 035, 039.

- **Entrega:** percorrer briefing, persistência, cópias autorizadas, recebimento comercial, atribuição, proposta e ajuste; incluir contingência manual documentada.
- **Cenários:** perda do provedor, fila atrasada, destinatário indisponível e operador substituto.
- **Aceite:** jornada com protocolo único e tempos medidos; canais adiados mantêm este aceite integral aberto, mesmo se o fluxo básico funcionar.

## Bloco 5 Busca produtos e composição

### Etapa 041 Construir corpus comercial de relevância

P2 · M · Marketing e Produto · Depende de: 004, 022.

- **Entrega:** pelo menos 30 intenções reais com SKUs/IDs julgados, conjunto de validação separado e explicação do resultado esperado; manter testes lexicais como camada distinta.
- **Cenários:** código, sinônimo, erro, ocasião, quantidade, intenção ambígua e nenhum resultado pertinente.
- **Aceite:** baseline e limiares de precisão/relevância aprovados por pessoas antes de ajustar o ranking.

### Etapa 042 Completar busca e sugestões recuperáveis

P2 · M · Frontend e QA · Depende de: 041.

- **Entrega:** ajustar expansão, autocomplete e correções com base no corpus, preservando códigos e consultas antigas.
- **Cenários:** teclado, composição de texto, termos curtos, acentos, resposta fora de ordem, Escape e busca sem resultado.
- **Aceite:** não degrada corpus de validação; pessoa entende sugestão e consegue manter a consulta original.

### Etapa 043 Decidir e validar alcance da curadoria

P2 · M · Arquitetura e Produto · Depende de: 041, 022.

- **Entrega:** formalizar ranking restrito à página ou evolução global autorizada; preservar Nome/Mais recentes e estabilidade de paginação.
- **Cenários:** melhor candidato fora da página 1, empate, repetição, troca de filtro e retorno por URL.
- **Aceite:** interface não promete ordenação global sem implementá-la; não baixar todo o catálogo nem alterar a origem protegida para satisfazer esse critério.

### Etapa 044 Homologar briefing coleções e relacionados

P2 · M · Produto e Marketing · Depende de: 042, 043.

- **Entrega:** julgar pertinência e diversidade de cada intenção, coleção e recomendação; separar onboarding, SKU de kit e composição criada pelo visitante.
- **Cenários:** intenção sem produtos, famílias repetidas, dado incompleto e sugestão comercial inadequada.
- **Aceite:** resultados têm justificativa compreensível e fallback honesto; não se atribui inteligência sem evidência de relevância.

### Etapa 045 Auditar qualidade dos dados exibidos

P1 · M · Produto e QA · Depende de: 022, 041.

- **Entrega:** amostra estratificada por família/fornecedor de descrições, imagens, unidades, variantes e mínimos, com origem e data da informação.
- **Cenários:** zero versus desconhecido, unidade incompatível, imagem alternativa, duplicata e produto sem variante estável.
- **Aceite:** problema de origem vira encaminhamento, não escrita no Promo Gifts; desconhecido permanece explícito e catálogo não é filtrado por estoque positivo.

### Etapa 046 Formalizar mínimos múltiplos e telefone

P1 · M · Comercial e Backend · Depende de: 045, 005.

- **Entrega:** contrato comercial aprovado para mínimos, múltiplos e quantidades máximas; país/DDI e formato telefônico explícitos quando necessários.
- **Cenários:** mínimo desconhecido, múltiplo quebrado, zero, decimal, limite excedido e número internacional ambíguo.
- **Aceite:** frontend, API e banco concordam; regras sem fonte ficam a confirmar, sem inferência arbitrária de DDI.

### Etapa 047 Concluir técnica e personalização por família

P2 · M · Comercial e Conteúdo · Depende de: 045, 051.

- **Entrega:** matriz verificável de técnica, área, material, cores e restrições, com exemplos autorizados e FAQ correspondente.
- **Cenários:** técnica incompatível, área não informada, produto alterado e imagem meramente ilustrativa.
- **Aceite:** cada afirmação tem fonte e dono; simulação visual identificada como simulação, não garantia de produção.

### Etapa 048 Homologar modelos comerciais de kits

P1 · M · Comercial e Produto · Depende de: 044, 046.

- **Entrega:** aprovar estruturas por intenção, substituições, embalagem e viabilidade; manter estruturas neutras até aprovação dos modelos comerciais.
- **Cenários:** componente removido, combinação inviável, embalagem insuficiente e quantidade mínima divergente.
- **Aceite:** nada é ofertado como viável por mera soma de componentes; restrições e alternativas são explicadas.

### Etapa 049 Certificar integridade do kit em toda a jornada

P1 · M · QA e Backend · Depende de: 018, 023, 048.

- **Entrega:** testar número de kits × unidades, limites, alternativas e identificadores em rascunho, conta, link, envio, histórico e confirmação.
- **Cenários:** truncamento, colisão de IDs, componente faltante, kit unitário e alteração maliciosa de um item.
- **Aceite:** nenhuma etapa desmembra silenciosamente o grupo; snapshot e mensagens mantêm composição e totais.

### Etapa 050 Homologar catálogo e filtros móveis

P2 · M · Design e QA · Depende de: 042, 043, 046.

- **Entrega:** validar modelo de aplicação de filtros, chips, contagem, busca interna, limpar/cancelar, URL, paginação e restauração de posição.
- **Cenários:** latência, zero resultados, back/refresh, teclado, fechar sem aplicar e menu em viewport estreita.
- **Aceite:** estado provisório/aplicado não é ambíguo; escolha e foco são preservados; não mudar o modelo atual sem benefício demonstrado.

## Bloco 6 Conteúdo marca e biblioteca

### Etapa 051 Localizar e inventariar o acervo aprovado

P2 · M · Marketing · Depende de: 004, 005.

- **Entrega:** reunir localização, proprietário, versão, autorização por canal, validade, identificação de pessoas/clientes e destino de PDFs, fotos e cases.
- **Cenários:** arquivo duplicado, link privado, autorização insuficiente, material vencido e imagem com informação sensível.
- **Aceite:** cada ativo tem procedência verificável; material não localizado é pendência de acesso, não convite à fabricação.

### Etapa 052 Preparar ativos acessíveis e eficientes

P2 · M · Design e Frontend · Depende de: 019, 051.

- **Entrega:** derivados otimizados, dimensões reservadas, descrição alternativa, metadados editoriais, cache e fallback; manter originais em local autorizado.
- **Cenários:** rede lenta, imagem quebrada, recorte móvel, texto na imagem e substituição de versão.
- **Aceite:** conteúdo legível, sem exposição de metadados privados; peso e qualidade atendem orçamento aprovado.

### Etapa 053 Refinar home e categorias fotográficas

P2 · M · Design e Produto · Depende de: 044, 052.

- **Entrega:** homologar hierarquia, repertório, categorias e caminhos por tarefa, preservando vitrine antecipada e manifesto.
- **Cenários:** categoria vazia, fotos repetidas, fallback, tela pequena e compreensão sem animação.
- **Aceite:** produto, foto, rótulo e destino coerentes; refinamento será validado com compradores, não por preferência isolada.

### Etapa 054 Publicar catálogos PDF reais

P2 · M · Conteúdo e Frontend · Depende de: 051, 052.

- **Entrega:** inserir PDFs autorizados com capa, versão, data, tamanho, responsável, download e alternativa ao visualizador.
- **Cenários:** arquivo grande, link quebrado, atualização, dispositivo móvel e PDF privado usado por engano.
- **Aceite:** formato anunciado corresponde ao arquivo; documentos comerciais privados jamais se tornam catálogo público.

### Etapa 055 Publicar revistas e governar a biblioteca

P2 · M · Conteúdo e Frontend · Depende de: 054.

- **Entrega:** completar formato revista/digital quando houver material, revisão editorial, expiração, retirada e navegação; preservar as dez coleções online já existentes.
- **Cenários:** rascunho, publicação futura, revista sem páginas, retirada com cache e fallback do leitor.
- **Aceite:** sitemap e previews excluem conteúdo não publicável; impossibilidade de recolher downloads anteriores é documentada.

### Etapa 056 Publicar três cases verificáveis

P2 · M · Marketing e Comercial · Depende de: 051, 052.

- **Entrega:** chegar ao critério histórico de três cases autorizados, com contexto, desafio, solução e resultado sustentado por fonte.
- **Cenários:** resultado sem prova, cliente sem autorização, produto descontinuado e retirada solicitada.
- **Aceite:** não usar métricas ou depoimentos inventados; se só houver dois materiais suficientes, a etapa continua parcial.

### Etapa 057 Publicar bastidores e provas de execução

P2 · M · Marketing e Comercial · Depende de: 047, 051, 052.

- **Entrega:** fotos próprias/autorizadas, time, processo e exemplos peça-base/simulação/produção, distinguindo fornecedor de operação própria.
- **Cenários:** pessoa sem consentimento, imagem ilustrativa confundida com fábrica e prazo/capacidade não comprovados.
- **Aceite:** alegações sobre qualidade, ambiente e execução têm lastro e revisão; direitos de imagem registrados.

### Etapa 058 Fechar linguagem e identidade da marca

P2 · S · Marketing e QA · Depende de: 053, 056, 057.

- **Entrega:** revisar todas as rotas para Tendências, nosso time de especialistas, badge único, CTAs e as quatro frases aprovadas; preservar aliases técnicos.
- **Cenários:** plural/concordância, resultado de busca, card com kit/novidade, texto longo e reduced motion.
- **Aceite:** testes protegem Entender para atender, Excelência em cada detalhe, Conectando Marcas e Pessoas e Encantar pessoas, somos bons nisso!; posição do manifesto adicional exige decisão editorial própria.

### Etapa 059 Completar guias e canais oficiais

P2 · M · Marketing e Comercial · Depende de: 047, 051.

- **Entrega:** aprofundar guias por ocasião/objetivo, validar redes sociais, destinatários de contato, horários e serviço de projeto especial antes de anunciá-lo.
- **Cenários:** link social incorreto, canal sem atendimento, guia vencido e promessa de serviço não oferecido.
- **Aceite:** autoria, revisão e responsável visíveis na governança; telefone/WhatsApp levam ao destino confirmado, não inferido.

### Etapa 060 Homologar datas e exportação de calendário

P2 · M · Conteúdo e QA · Depende de: 014, 044.

- **Entrega:** conferir fontes, datas móveis, virada de ano, filtros, ocasião→briefing e importar/reimportar ICS em dois clientes reais.
- **Cenários:** ano bissexto, fuso, dia inteiro, caracteres escapados, UID repetido e prazo orientativo inviável.
- **Aceite:** sem deslocamento/duplicação indevida; calendário não promete viabilidade de produção ou entrega.

## Bloco 7 Experiência acessibilidade e mensuração

### Etapa 061 Planejar pesquisa com compradores

P2 · M · Pesquisa e Produto · Depende de: 004, 044, 053.

- **Entrega:** roteiro de tarefas e recrutamento proposto de 5–8 profissionais de marketing, incluindo público jovem sem presumir preferências por estereótipo geracional.
- **Cenários:** diferentes experiências, necessidades assistivas, compra por campanha e aprovação por terceiros.
- **Aceite:** consentimento, objetivos, critérios de sucesso e tratamento dos registros definidos antes das sessões; amostra formativa não representa todo o mercado.

### Etapa 062 Executar pesquisa e corrigir fricções

P2 · L · Pesquisa, Design e Frontend · Depende de: 050, 055, 061.

- **Entrega:** observar encontrar, comparar, montar kit, solicitar, compartilhar e retomar; priorizar dificuldades e testar novamente os ajustes.
- **Cenários:** participante não entende Salvar, confunde orçamento com compra, abandona formulário ou não encontra histórico.
- **Aceite:** achados com evidência, gravidade e reteste; não anunciar ganho de conversão a partir de opinião qualitativa.

### Etapa 063 Homologar teclado e leitor de tela

P1 · L · QA de acessibilidade e Frontend · Depende de: 050, 055, 060.

- **Entrega:** matriz manual por rota e estado dinâmico com combinação navegador/leitor registrada; testar landmarks, nomes, foco, diálogos e anúncios.
- **Cenários:** erro no formulário, lista carregando, autocomplete, drawer, kit e mudança de rota.
- **Aceite:** bloqueios críticos corrigidos e retestados; axe aprovado não é declarado como conformidade integral.

### Etapa 064 Homologar reflow e dispositivos físicos

P1 · M · Design e QA · Depende de: 063.

- **Entrega:** testar zoom 200%/400%, largura de 320px, texto ampliado, contraste, movimento reduzido, iOS/Safari e Android físicos.
- **Cenários:** teclado virtual cobre CTA, hover inexistente, orientação alterada, safe area e diálogo longo.
- **Aceite:** tarefas essenciais executáveis sem perda de conteúdo; documentar limitações de combinações não ensaiadas.

### Etapa 065 Fechar estados de erro e recuperação

P1 · M · Frontend e QA · Depende de: 012, 015, 018, 049.

- **Entrega:** revisar loading, vazio, offline, retry e manutenção em cada módulo; decompor módulos extensos em mudanças comportamentalmente neutras quando isso reduzir risco.
- **Cenários:** rota lazy falha, timeout após envio, navegação durante resposta, catálogo indisponível e armazenamento bloqueado.
- **Aceite:** rascunhos preservados quando necessário, sem sucesso falso ou spinner infinito; limite de linhas não vira refatoração sem benefício.

### Etapa 066 Formalizar o contrato de eventos do funil

P2 · M · Produto e Segurança · Depende de: 020, 035.

- **Entrega:** catálogo de eventos, propriedades permitidas, retenção, preferências e distinção entre tentativa, persistência, entrega e atendimento.
- **Cenários:** URL privada, UUID do pedido, briefing livre, telefone, e-mail e evento duplicado.
- **Aceite:** payloads não carregam dados proibidos; identificadores e métricas têm finalidade definida, sem coleta adicional por conveniência.

### Etapa 067 Provar recepção e qualidade das métricas

P2 · M · Analytics e QA · Depende de: 066, 005.

- **Entrega:** conferir no destino eventos sintéticos autorizados, deduplicação, navegação SPA e redação de erros; verificar script disponível separadamente de dados recebidos.
- **Cenários:** bloqueador, retry, reload, offline, coletor indisponível e eventos fora de ordem.
- **Aceite:** funil interpretável e contagens reconciliáveis; solicitar orçamento funciona mesmo sem Analytics.

### Etapa 068 Medir desempenho técnico por jornada

P2 · M · Frontend e QA · Depende de: 052, 065.

- **Entrega:** medir entrada e rotas, CSS, animação lazy, ícones, imagens e caches; comparar antes/depois em dispositivo/rede controlados.
- **Cenários:** cache frio/quente, produto sem imagem, catálogo grande e asset lento.
- **Aceite:** budgets e Lighthouse com configuração reproduzível; investigar tree-shaking e CSS por bytes efetivos, não apenas por imports seletivos.

### Etapa 069 Acompanhar desempenho em campo

P2 · M · Produto e Operação · Depende de: 067, 068.

- **Entrega:** estabelecer janela e amostra para Core Web Vitals p75 e falhas por jornada, com segmentação útil e privacidade preservada.
- **Cenários:** tráfego insuficiente, campanha atípica, dispositivo lento e regressão após release.
- **Aceite:** baseline comparável e limites aprovados; ausência de amostra é inconclusiva, não performance excelente.

### Etapa 070 Homologar SEO e previews externos

P2 · M · Conteúdo e QA · Depende de: 055, 058, 060.

- **Entrega:** conferir HTML sem JS, canonical, 200/404/noindex, sitemap, aliases, previews por conteúdo e indexação acompanhada em ferramenta autorizada.
- **Cenários:** página privada, conteúdo retirado, link antigo, cache de rede social e imagem social genérica.
- **Aceite:** metadados coerentes e privacidade mantida; imagem específica ou alternativa aprovada; não prometer indexação por apenas publicar sitemap.

## Bloco 8 Graphify e qualidade reproduzível

### Etapa 071 Governar corpus e evidências do grafo

P2 · M · Arquitetura e Segurança · Depende de: 002, 003.

- **Entrega:** definir responsáveis, fontes, retenção, exclusões, atualidade e limites de inferência; preservar wrapper local sem acesso ao Promo Gifts ou APIs externas.
- **Cenários:** caminho externo, segredo em documento, fonte removida e grafo de outro commit.
- **Aceite:** corpus aprovado e rastreável; relações não direcionadas não viram afirmações causais; alternativa arquitetural histórica preservada.

### Etapa 072 Adicionar rastreabilidade documental

P2 · L · Arquitetura e Engenharia · Depende de: 003, 071.

- **Entrega:** relacionar requisitos, decisões, código, RPC, migration e testes por evidência; separar extração documental/semântica do AST e manter processamento local autorizado.
- **Cenários:** requisito sem fonte, arquivo renomeado, evidência vencida e relação ambígua.
- **Aceite:** cada vínculo cita fonte e validade; documentos não provam deploy; serviço externo/IA não é ativado implicitamente.

### Etapa 073 Validar consultas e precisão do grafo

P2 · M · Engenharia e QA · Depende de: 072.

- **Entrega:** ampliar benchmark com português, aliases, homônimos, chamadas indiretas e impacto→testes; revisar comunidades e classificar relações.
- **Cenários:** caminho inexistente, símbolo repetido, falso positivo e resposta truncada.
- **Aceite:** precisão/recuperação medidas contra conjunto revisado; saída informa limitações e não inventa ligação para preencher resposta.

### Etapa 074 Ensaiar falhas e segurança do Graphify

P2 · M · Segurança e QA · Depende de: 071.

- **Entrega:** fixtures de symlink, HTML hostil, comentário com instrução, parser lento, lock, disco cheio e interrupção durante promoção do grafo.
- **Cenários:** duas atualizações concorrentes, candidato inválido, render inseguro e tentativa de sair da raiz.
- **Aceite:** último grafo válido preservado; visualização não executa conteúdo não confiável; erros recuperáveis e sem segredos em artefatos.

### Etapa 075 Fechar desempenho e recuperação do grafo

P2 · M · Engenharia e QA · Depende de: 073, 074.

- **Entrega:** medir rebuild, comparação base/head, branch, renome/exclusão, upgrade e restauração; avaliar dependências Python travadas e cache por corpus.
- **Cenários:** versão incompatível, base sem grafo, arquivo retirado e memória técnica corrigida.
- **Aceite:** reprodução em clone limpo; fonte-base ausente não é silenciosamente substituída; rebuild completo continua alternativa válida se justificado.

### Etapa 076 Consolidar a matriz de regressão

P1 · M · QA e Engenharia · Depende de: 003, 012, 013.

- **Entrega:** relacionar requisito e risco a unitário, API, SQL, navegador ou aceite humano; integrar probes úteis e documentar skips individualmente.
- **Cenários:** teste verde sem asserção relevante, snapshot cosmético e falha conhecida escondida por skip.
- **Aceite:** falhas corrigidas têm regressão permanente; quantidade de testes não é usada como percentual de funcionalidades concluídas.

### Etapa 077 Automatizar cenários adversos de ponta a ponta

P1 · L · QA e Backend · Depende de: 028, 049, 065, 076.

- **Entrega:** fixtures consistentes de atraso, falha parcial, reordenação, identidade, duplicação e limite; executar sem chamar destinatários reais.
- **Cenários:** persistiu mas perdeu resposta, token expirou durante upload e dois dispositivos alteraram campanha.
- **Aceite:** invariantes de segurança e recuperação mantidas; teste falha pela causa esperada antes da correção, não por ambiente quebrado.

### Etapa 078 Entregar execução local equivalente ao CI

P2 · M · DevOps e Engenharia · Depende de: 076.

- **Entrega:** comando ci:local com dependências e escopo explícitos, checks críticos incluídos e diagnóstico de ferramentas; decidir hook leve opt-in sem substituir CI.
- **Cenários:** clone limpo, Windows/WSL, versão errada, sem Docker e segredos ausentes.
- **Aceite:** saída distingue falha, indisponibilidade e skip; nenhuma ação remota/destrutiva implícita no comando local.

### Etapa 079 Validar toolchain e upgrades isoladamente

P2 · M · Engenharia e DevOps · Depende de: 078.

- **Entrega:** alinhar runtime, engines, npm e política engine-strict; examinar lockfiles, changelogs e peers antes de upgrades, com avaliação separada de majors.
- **Cenários:** Node incompatível, instalação não reprodutível, TypeScript/ESLint novos quebrando plugins e rollback de pacote.
- **Aceite:** clone reproduz o ambiente; manter versão compatível com decisão documentada é válido, sem atualizar major apenas por checkbox antigo.

### Etapa 080 Reavaliar superfície de segurança e suprimentos

P1 · M · Segurança e Engenharia · Depende de: 019, 024, 079.

- **Entrega:** threat model por fronteira, revisão de dependências, scanner de segredos e limitações de logs/artefatos; inventariar licenças npm/Python e exceções aprovadas.
- **Cenários:** acesso horizontal, arquivo hostil, pacote comprometido, licença não permitida e token em bundle.
- **Aceite:** riscos classificados com dono; nenhuma correção crítica dispensada por scanners verdes; evidência sanitizada e verificável.

## Bloco 9 Integração contínua e ambientes

### Etapa 081 Endurecer execução dos workflows

P1 · M · DevOps e Segurança · Depende de: 008, 009.

- **Entrega:** revisar shell/pipefail, permissões mínimas por job, runner fixo, timeouts de rede, checkout sem credenciais e limpeza; adicionar actionlint/Zizmor e avaliar controle de egress.
- **Cenários:** pipe mascara falha, saída malformada, comando injetado por input, ferramenta adulterada e acesso externo inesperado.
- **Aceite:** ferramentas pinadas/verificadas, lint reproduzível; restrição de egress testada em observação antes de bloquear tráfego legítimo.

### Etapa 082 Tornar gates e eventos de release confiáveis

P1 · M · DevOps e QA · Depende de: 007, 081.

- **Entrega:** contrato único dos nomes de checks, app emissor e SHA; paginação/ordenação de reruns e estados explícitos; decidir polling versus workflow_run com análise de segurança.
- **Cenários:** mais de 100 checks, skipped/neutral/stale, workflow de fork e run antigo com nome idêntico.
- **Aceite:** somente evidência do commit e emissor esperados libera; alternativa de orquestração aprovada sem executar código não confiável com segredos.

### Etapa 083 Unificar preparação e cache de ferramentas

P2 · M · DevOps · Depende de: 075, 079, 081.

- **Entrega:** adotar preparação reutilizável para Node/npm, versões fixas de CLI Supabase e Python, hashes de dependências quando suportados e caches identificados por versões/lockfiles.
- **Cenários:** cache envenenado/obsoleto, CLI incompatível, instalação sem hash e divergência de runtime Vercel.
- **Aceite:** cache não guarda segredos nem muda resultado; instalação limpa e instalação com cache produzem checks equivalentes.

### Etapa 084 Reduzir duplicação sem perder cobertura

P2 · M · DevOps e QA · Depende de: 076, 083.

- **Entrega:** evitar Vitest duplicado, compartilhar build íntegro por SHA, separar Chromium quando útil e cachear browsers; avaliar sharding com medição e concorrência segura.
- **Cenários:** artefato de outro commit, cancelamento de PR, release concorrente e mudança apenas documental.
- **Aceite:** ganhos medidos com os mesmos testes; required checks continuam reportados em docs-only; sharding sem benefício pode ser dispensado por decisão registrada.

### Etapa 085 Fortalecer o pipeline de banco

P1 · M · DBA e DevOps · Depende de: 021, 023, 028, 081.

- **Entrega:** obter porta da configuração, usar ordenação determinística, preservar causa raiz e publicar diffs sanitizados de tipos/dicionário/schema; validar ordem nova contra ledger por leitura autorizada.
- **Cenários:** migration retroativa, versão remota desconhecida, erro de autenticação e artefato falhando após pgTAP.
- **Aceite:** nenhum apply em PR; dry-run autorizado não escreve; decisão de autofix explícita, sem corrigir drift remoto automaticamente.

### Etapa 086 Completar a cadeia de suprimentos no CI

P1 · M · Segurança e DevOps · Depende de: 008, 080, 081.

- **Entrega:** revisar CodeQL/dependency review, licenças, auditoria de assinaturas, SBOM por release e Gitleaks por evento; regular Dependabot com grupos, cooldown e carga aceitável.
- **Cenários:** dependência indireta vulnerável, pacote sem atestação, licença desconhecida, major agrupada indevidamente e histórico insuficiente para scanner.
- **Aceite:** política de bloqueio/advisory explícita; CodeQL/checks requeridos avaliam o SHA correto; auto-merge só se aprovado, nunca presumido.

### Etapa 087 Tornar relatórios de CI acionáveis

P2 · M · DevOps e QA · Depende de: 010, 082, 084.

- **Entrega:** summaries por check, Playwright legível, cobertura/delta válido, duração p50/p95, falhas por causa, janela e SLO; padronizar retenção por sensibilidade/evento.
- **Cenários:** baseline indisponível, teste ignorado, amostra pequena, job timeout e rerun bem-sucedido após falha.
- **Aceite:** resumo não usa job.status como prova de cada etapa; métricas não transformam cancelamento em sucesso; limiares têm dono.

### Etapa 088 Testar previews sem dados produtivos

P1 · L · DevOps e QA · Depende de: 028, 084, 085.

- **Entrega:** preview por PR autorizado, smoke e Playwright de jornada contra a URL exata, incluindo autenticação sintética; status com URL e limpeza após encerramento.
- **Cenários:** fork, URL protegida, preview expirado, secret ausente e PR documental.
- **Aceite:** dados e segredos isolados; preview indisponível aparece como tal; nenhum ajuste automático da proteção Vercel para facilitar teste.

### Etapa 089 Validar o contrato de publicação Vercel

P1 · M · DevOps e QA · Depende de: 079, 081.

- **Entrega:** ampliar testes de vercel.json, rewrites, headers, crons, duração, runtime e shell por função; distinguir endpoints API de páginas que precisam HTML.
- **Cenários:** rota privada indexável, rewrite amplo demais, shell ausente, cron sem autenticação e configuração incompatível.
- **Aceite:** PR rejeita regressões; contrato versionado corresponde ao artefato e configuração efetiva, não apenas ao JSON válido.

### Etapa 090 Completar rotinas e runbooks de CI

P2 · M · DevOps e Operação · Depende de: 087, 005.

- **Entrega:** issues de release/CI com resolução automática correta, templates/labels, badges, relatórios de branches e rotinas sem commit; revisão por pares de runbooks e rotação.
- **Cenários:** incidente repetido, falso verde, issue duplicada, branch ativa classificada órfã e alerta sem destinatário.
- **Aceite:** ações não destrutivas por padrão; branches não são apagadas pelo relatório; lembrete de rotação não significa segredo rotacionado.

## Bloco 10 Liberação controlada e encerramento

### Etapa 091 Certificar novamente o release já existente

P1 · M · DevOps e QA · Depende de: 082, 089.

- **Entrega:** preservar e testar preflight, build com ambiente correto, URL normalizada, candidato imutável, smoke antes da promoção, SHA e atualização dos dois aliases.
- **Cenários:** branch diferente de main, credencial sem escopo, timeout, Analytics ausente e alias preso na versão anterior.
- **Aceite:** testes de contrato aprovados; nenhuma reconstrução desnecessária do mecanismo que já funciona; falha não promove candidato inválido.

### Etapa 092 Liberar alterações de banco com compatibilidade

P1 · M · DBA e DevOps · Depende de: 021, 024, 029, 085, 091.

- **Entrega:** para cada migration nova legítima, revisar expansão/contração, aplicar pelo fluxo autorizado do site e comparar ledger/schema antes do código dependente.
- **Cenários:** migration parcialmente tentada, código antigo com schema novo, ledger divergente e rollback de aplicação.
- **Aceite:** recibo por versão, sem repair arbitrário nem DDL no sistema interno; se não houver migration necessária, comprovar isso sem criar uma artificial.

### Etapa 093 Executar a bateria final de regressão

P1 · L · QA e Engenharia · Depende de: 077, 080, 084, 085, 086, 088, 092.

- **Entrega:** lint, tipos, unitários, APIs, pgTAP, concorrência, build, budgets, navegadores e contratos de segurança contra o mesmo candidato.
- **Cenários:** todas as jornadas públicas/privadas e falhas catalogadas, incluindo kits, anexos, favoritos e isolamento.
- **Aceite:** artefatos por SHA, skips justificados individualmente, nenhum bloqueio crítico/alto sem resolução; não somar recortes à suíte para inflar contagens.

### Etapa 094 Obter aceite editorial e de experiência

P2 · M · Produto, Marketing e QA · Depende de: 056, 057, 058, 059, 060, 062, 064, 070.

- **Entrega:** revisar cada página, módulo e estado com checklist editorial/comercial/assistivo; registrar correções e responsáveis pela manutenção futura.
- **Cenários:** CTA inconsistente, conteúdo vencido, regra comercial sem fonte e fricção apontada por comprador ainda aberta.
- **Aceite:** aprovações explícitas; pesquisa, acervo e acessibilidade não são substituídos por screenshot bonito ou teste automatizado.

### Etapa 095 Confirmar prontidão operacional e liberações

P1 · M · Produto e Operação · Depende de: 020, 027, 029, 030, 031, 032, 033, 034, 035, 090.

- **Entrega:** reunião de prontidão com destinos, responsáveis, recuperação, privacidade, escala e canais; separar escopo tecnicamente pronto de integrações ainda adiadas. Quando os canais externos forem liberados, 040 também se torna pré-requisito; enquanto permanecerem formalmente adiados, registrar a decisão e homologar o fluxo básico sem fingir a entrega integral dos canais.
- **Cenários:** segredo não liberado, operador ausente, canal indisponível e restore não comprovado.
- **Aceite:** checklist assinado pelo responsável; sem liberação dos itens externos, pode haver lote parcial aprovado, mas não encerramento integral.

### Etapa 096 Publicar o lote final de forma controlada

P1 · M · DevOps e QA · Depende de: 093, 094, 095, 097.

- **Entrega:** aprovar PR, publicar artefato identificado, conferir ambos os aliases e executar smoke; ativar somente recursos liberados, com observação inicial.
- **Cenários:** ambiente divergente, erro no primeiro acesso, migration incompatível e alias com cache antigo.
- **Aceite:** GitHub, artefato e URLs correspondem ao SHA aprovado; qualquer correção decorrente dos aceites 094–095 ou do ensaio 097 obriga reexecutar 093 no novo SHA antes da publicação; dados operacionais não são copiados para o Git nem entre bancos para simular igualdade.

### Etapa 097 Ensaiar reversão e resposta a incidentes antes da publicação

P1 · M · Operação, DevOps e DBA · Depende de: 029, 091, 093.

- **Entrega:** antes da publicação real, simular em ambiente controlado uma falha pós-promoção, exercitar rollback dos aliases e compatibilidade de dados; revisar runbook com pessoa diferente da autora.
- **Cenários:** alias parcialmente revertido, job de rollback falha, fila em andamento e versão anterior incompatível.
- **Aceite:** tempo medido e ação manual de contingência testada; rollback produtivo real somente em incidente ou exercício expressamente autorizado.

### Etapa 098 Observar a operação por janela acordada

P1 · M · Operação e Produto · Depende de: 069, 087, 096, 097.

- **Entrega:** propor janela inicial de sete dias após publicação e ampliar conforme volume; acompanhar erros, filas, cron, atendimento, drift e métricas de campo.
- **Cenários:** período sem tráfego, pico de campanha, atraso de fornecedor de mensagens e regressão intermitente.
- **Aceite:** janela/amostra aprovadas, incidentes resolvidos e resultados documentados; sete dias sem usuários não comprovam estabilidade sob carga.

### Etapa 099 Reconciliar todas as evidências de fechamento

P1 · M · QA e Produto · Depende de: 003, 075, 098.

- **Entrega:** revisar as 580 referências e as 100 etapas com SHA, testes, configuração e aceites; atualizar índice, ledger e runbooks sem reescrever o histórico.
- **Cenários:** requisito órfão, prova de versão antiga, etapa externa marcada concluída e decisão usada para esconder entrega ausente.
- **Aceite:** zero requisito sem disposição explícita; pendências, alternativas aprovadas e exclusões de escopo têm dono e justificativa; evidências acessíveis no repositório.

### Etapa 100 Formalizar o encerramento e a manutenção

P1 · S · Responsável pelo produto e líderes das frentes · Depende de: 099.

- **Entrega:** parecer final com escopo entregue, riscos residuais, materiais, contratos, operação, manutenção e próximo ciclo; registrar release/tag conforme política aprovada.
- **Cenários:** item essencial ainda bloqueado, aceite ausente e promessa de garantia absoluta.
- **Aceite:** todas as etapas aplicáveis homologadas e todas as decisões externas resolvidas; se houver adiamentos, declarar fechamento parcial. Não usar 10/10 como substituto da evidência nem prometer ausência de bugs.

## Mapa de cobertura e preservação dos planos anteriores

Esta tabela é o roteamento inicial por frente, não a afirmação de que 580 critérios foram recertificados. A etapa 002 produz o vínculo individual e a 099 impede o fechamento com órfãos. Uma referência pode exigir várias etapas e uma etapa pode completar várias referências.

| Referências históricas | Destino principal neste plano |
|---|---|
| UX01–10 | 001–003, 011–015, 065, 076–077 |
| UX11–20 | 050, 061–065, 094 |
| UX21–30 | 051–059, 061–062, 094 |
| UX31–40 | 041–044, 050 |
| UX41–50 | 045–050, 063–065 |
| UX51–60 | 015, 018, 049, 065, 070 |
| UX61–70 | 012, 019, 031–040, 062, 066–067 |
| UX71–80 | 013–020, 024–025, 034–035 |
| UX81–90 | 014, 051–055, 060, 070 |
| UX91–100 | 061–070, 093–100 |
| LK01–10 | 001–003, 051–053, 058, 061–062 |
| LK11–20 | 041–045, 050, 053, 055, 058 |
| LK21–30 | 018, 045–049 |
| LK31–40 | 018, 047, 051–059 |
| LK41–50 | 012, 019, 031–040, 063–070, 091–100 |
| GR01–50 | 071–075; 008–009, 080–084 para CI/segurança; 002–003 e 099 para requisitos |
| AC01–30 | 013–020, 023–025, 034–035, 063–065, 076–077 |
| T13-01–13 | 001–003, 013–016, 065, 076–079 |
| T13-14–31 | 012, 026, 030–040, 077 |
| T13-32–50 | 063–069, 076–090, 099 |
| T16-01–25 | 001–009, 021–027, 036–039, 085, 092 |
| T16-26–50 | 020–030, 068, 080, 085, 088, 092, 097–100; itens internos conforme ressalva abaixo |
| T17-01–25 | 001–009, 021–027, 068, 079, 085, 092 |
| T17-26–50 | 015, 020–030, 065, 076–080, 088, 097–100; itens internos conforme ressalva abaixo |
| T23-01–50 e T24-01–50 | Correspondência detalhada no quadro seguinte |
| WF01–100 | Correspondência detalhada no quadro de workflows |

### Correspondência do plano técnico de 24 de setembro

As 50 etapas de 23/09 conservam sua correspondência histórica T23→T24 no [anexo](REVISAO_50_ETAPAS_20260928.md); este quadro completa a ligação T24→plano atual. Não se presume que números iguais entre planos tenham o mesmo significado.

| T24 | Etapas atuais | T24 | Etapas atuais |
|---|---|---|---|
| 01 | 001 | 26 | 041–042 |
| 02 | 002–003, 099 | 27 | 043–044 |
| 03 | 079, 083 | 28 | 045–049 |
| 04 | 011–014, 076–077 | 29 | 051–053, 061–062 |
| 05 | 004–009 | 30 | 050, 063–064 |
| 06 | 013 | 31 | 051–052 |
| 07 | 013 | 32 | 054–055 |
| 08 | 013–014 | 33 | 047, 056–059 |
| 09 | 013–014 | 34 | 036 |
| 10 | 013–014 | 35 | 031 |
| 11 | 014–015 | 36 | 032–034 |
| 12 | 014–015 | 37 | 035 |
| 13 | 016 | 38 | 037–040 |
| 14 | 017–018 | 39 | 066–067 |
| 15 | 013–018, 076 | 40 | 058–060, 070 |
| 16 | 019 | 41 | 063–064 |
| 17 | 019 | 42 | 061–062, 064 |
| 18 | 020, 025 | 43 | 068–069 |
| 19 | 012, 023 | 44 | 071–073 |
| 20 | 021, 024 | 45 | 074–075 |
| 21 | 022 | 46 | 079–086 |
| 22 | 028, 088 | 47 | 076–078, 093 |
| 23 | 029, 097 | 48 | 091–092, 096–097 |
| 24 | 030 | 49 | 098 |
| 25 | 024–027, 090 | 50 | 099–100 |

### Correspondência do plano de workflows

Itens já entregues seguem para certificação, não reconstrução. Itens marcados como decisão nos planos anteriores exigem aprovação; solução equivalente exige justificativa e não pode apagar o critério original.

| WF | Etapas atuais | WF | Etapas atuais |
|---|---|---|---|
| 01–02 | 009, 091 | 51–54 | 079, 083 |
| 03–05 | 081, 091 | 55–56 | 084 |
| 06–09 | 091, 096–097 | 57–59 | 083, 085–086 |
| 10–11 | 087, 090–091, 098 | 60–62 | 084 |
| 12–14 | 082 | 63 | 087 |
| 15–19 | 085 | 64–66 | 079, 081–083, 091 |
| 20 | 005, 085 | 67–70 | 010, 087 |
| 21–23 | 074–075, 083 | 71–73 | 005, 090 |
| 24–27 | 084, 086 | 74–78 | 006–007 |
| 28–30 | 081, 086 | 79–81 | 007, 082, 086 |
| 31–34 | 008 | 82–85 | 006, 088, 090–091 |
| 35–36 | 081 | 86–87 | 028, 088 |
| 37–40 | 005–006, 009, 024 | 88 | 068, 088 |
| 41–44 | 009, 081, 090 | 89–90 | 005, 085 |
| 45–48 | 005, 086 | 91–92 | 089, 091, 096 |
| 49–50 | 080, 086 | 93–94 | 087, 090 |
| 95–96 | 078 | 97–100 | 002–003, 080, 086–087, 099–100 |

### Itens do sistema interno protegido

T16-03/43/45 e T17-05/36/39–44 tratam de coordenação, contrato, permissões, extensão, índices, policies ou inventário do Promo Gifts. A etapa 005 registra o responsável e a necessidade de projeto separado; a 022 cobre somente o contrato lido pelo site. Este plano não autoriza aplicar essas mudanças internas nem classificá-las como implementadas. O fechamento global exige entrega autorizada em frente própria ou exclusão de escopo explicitamente aceita e registrada; o parecer final deve declarar qual ocorreu.

## Sequência de lotes e critérios de passagem

| Lote | Trabalho principal | Condição para avançar |
|---|---|---|
| Base | 001–010 | Rastreabilidade, responsáveis e prioridades verificáveis |
| Integridade | 011–030 | Segurança, contratos e ambiente de ensaio adequados |
| Operação | 031–040 | Destino e recebimento reais homologados; canais liberados |
| Produto | 041–060 | Dados e materiais aprovados; recursos sem promessas inventadas |
| Experiência | 061–070 | Pesquisa, acessibilidade e métricas com limites explícitos |
| Engenharia | 071–090 | Grafo, testes e pipelines reproduzíveis e seguros |
| Fechamento | 091–100 | Mesmo SHA validado, operação observada e aceites completos |

Os lotes não impõem uma execução linear artificial: acervo (051), sandbox (028), corpus comercial (041) e decisão de atendimento (031) podem ser preparados em paralelo após seus pré-requisitos. Dependências cruzadas nos itens prevalecem sobre a ordem dos blocos. Nenhum prazo final deve ser prometido enquanto responsáveis, materiais, custos e liberações estiverem abertos.

## Registro obrigatório por etapa

Ao executar, registrar no controle de fechamento vinculado ao ledger: ID desta etapa; IDs históricos; estado; titular; commit/PR; ambiente; cenário e comando/procedimento; resultado esperado/observado; evidência sanitizada; data; aprovação; risco residual; reversão; próximo passo. Fonte documental comprova planejamento, não implementação. Resultado com mock comprova contrato, não provedor real. Publicação comprova disponibilidade, não adequação comercial.

## Verificação deste documento

Antes do commit: conferir exatamente 100 etapas únicas, dependências existentes e sem ciclos, três campos de execução por etapa, links locais válidos, nenhuma credencial e diff restrito à documentação. Conferir a cobertura numérica T24 e WF sem lacunas. A implementação futura deve executar a etapa 002 para validar o vínculo individual dos demais requisitos e seus critérios literais. Não chamar a verificação estrutural deste plano de homologação do sistema.

Conferência documental realizada em 01/10/2026: 100 IDs únicos e consecutivos; dependências válidas e sem ciclos; entrega, cenários e aceite presentes nas 100 etapas; links locais existentes; correspondência numérica T24 com 50 de 50 IDs e WF com 100 de 100 IDs, sem duplicação. Verificação de whitespace aprovada. Esses resultados validam a estrutura do documento, não executam as melhorias descritas.
