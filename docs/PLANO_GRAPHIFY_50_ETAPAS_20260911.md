# Plano de integração Graphify — Promo_Brindes_V1

Data: 11/09/2026. Estado: execução concluída para a camada estrutural local e de CI. Evidências, simulações e limites estão em [GRAPHIFY_IMPLEMENTATION_20260911.md](GRAPHIFY_IMPLEMENTATION_20260911.md). O passe semântico de documentos permanece opt-in por privacidade e exige uma seleção explícita de fontes.

## Objetivo e escopo

Integrar Graphify ao desenvolvimento do site para consultar dependências, avaliar impacto e manter memória técnica verificável. O projeto-alvo é /home/joaquim_ataides/projetos/Promo_Brindes_V1. Promo_Gifts_V4 permanece protegido contra alterações. Esta integração não exige migrations, leitura de registros de clientes, novo banco vetorial ou instalação no frontend público.

## Diagnóstico observado

- HEAD local: 84847d5; árvore limpa antes deste documento.
- Graphify instalado: 0.9.48; CLI consultada localmente.
- Grafo existente: graphify-out/graph.json, 501 nós, 797 relações, directed=false; modificado em 08/09/2026.
- O relatório existente descreve 53 arquivos e 36 comunidades; é uma fotografia histórica, não cobertura atual.
- Hooks post-commit/post-checkout ausentes; nenhum merge driver registrado pelo Graphify.
- package.json não possui scripts graph:*; quality.yml não possui job específico de Graphify.
- graphify-out/ já está ignorado pelo Git; nenhum arquivo desse diretório é versionado.
- Consulta de orientação: quote cart catalog request supabase test config, termos existentes no grafo; saída limitada a aproximadamente 1.100 tokens. Não é auditoria completa de dependências.
- O relatório antigo informa zero tokens semânticos. Isso não comprova custo zero da sessão original; medições indisponíveis serão indicadas como desconhecidas.

## Decisões propostas

A primeira entrega usa extração estrutural local. Documentação é enriquecida em rotina separada; atualização automática não chama provedores de IA. Grafo completo e memória permanecem fora do Git, com artefatos controlados por commit quando as permissões permitirem. Instruções e relatórios são dados de apoio: código, testes e implantação verificada prevalecem sobre inferências. Capacidades descritas na documentação mais recente serão testadas contra a versão efetivamente fixada antes de virar automação.

Os nomes graph:* abaixo são comandos propostos do projeto, não comandos já disponíveis. Papéis indicam responsabilidades funcionais e não agentes ou pessoas alocados. Atualização remota do banco continua uma atividade independente e não é pré-requisito desta integração.

## Plano em 50 etapas

### Lote 1 — Escopo e configuração

1. **Delimitar a integração.** Adotar Promo_Brindes_V1 como raiz explícita e registrar Graphify como ferramenta de engenharia. Impedir que comandos herdem acidentalmente o diretório do Promo Gifts.

   Responsável: Engenharia. **Aceite:** Comandos validam a raiz e recusam destinos externos; nenhuma alteração no projeto interno.

2. **Registrar a linha de base.** Documentar commit, versão do Graphify, arquivos elegíveis, grafo existente e integrações ausentes. Tratar referências de 08/09 como históricas.

   Responsável: Engenharia. **Aceite:** Inventário reproduzível com data, commit e limites de cobertura, sem afirmar que o grafo retrata o código atual.

3. **Definir perguntas de valor.** Selecionar dez tarefas reais: impacto de QuoteItem, persistência de variantes, autenticação, ajustes, busca, filtros, sitemap, seleção compartilhada e isolamento de dados.

   Responsável: Engenharia + QA. **Aceite:** Cada pergunta tem resposta de referência verificada no código e fontes esperadas.

4. **Definir responsabilidades.** Atribuir manutenção técnica, revisão das relações e validação de qualidade a responsáveis do time; documentar como transferir essa responsabilidade.

   Responsável: Responsável pelo projeto. **Aceite:** Papéis e rotina definidos; nomes reais serão registrados quando designados, sem inventar responsáveis.

5. **Registrar decisões de arquitetura.** Criar decisão técnica para geração local, uso de artefatos de CI e ausência de dependência em produção. Definir quais entregas exigem código adicional nosso.

   Responsável: Engenharia. **Aceite:** Documento diferencia capacidades nativas, adaptações e recursos futuros; o site continua independente da ferramenta.

6. **Fixar ferramenta e ambiente.** Usar 0.9.48 como versão observada, verificar compatibilidade e fixar a versão escolhida e ambiente Python isolado. Registrar origem do pacote e procedimento de atualização.

   Responsável: Engenharia. **Aceite:** Instalação reproduzível em checkout limpo; nenhum uso de latest em automações.

7. **Criar configuração versionada.** Definir arquivo próprio com raiz, caminhos permitidos, exclusões, saídas, limites de execução e formato de metadados. Validar o arquivo antes de executar.

   Responsável: Engenharia. **Aceite:** Configuração inválida falha com mensagem clara; opções próprias não são apresentadas como flags nativas.

8. **Selecionar o corpus inicial.** Incluir src, api, testes, scripts relevantes e configurações necessárias. Selecionar documentação e migrations em passes próprios, com cobertura explicitada.

   Responsável: Engenharia. **Aceite:** Lista de entradas revisável; cada arquivo é processado, excluído com justificativa ou marcado como não suportado.

9. **Implementar exclusões e proteção de caminhos.** Criar .graphifyignore com exclusões de credenciais, caches, builds, logs, snapshots volumosos e arquivos de terceiros. Rejeitar travessia de diretórios e links simbólicos que saiam da raiz.

   Responsável: Engenharia + QA. **Aceite:** Fixtures com .env, credenciais sintéticas e symlinks externos não entram no corpus nem nos artefatos.

10. **Definir armazenamento e retenção.** Manter caches, memórias e grafo completo fora do Git por padrão, coerente com o .gitignore atual. Versionar configuração, scripts e documentação; definir retenção e acesso dos artefatos de CI.

   Responsável: Engenharia. **Aceite:** Artefatos não aparecem em public, dist ou respostas da Vercel; política compatível com a visibilidade real do repositório.

### Lote 2 — Geração confiável

11. **Criar comando de diagnóstico.** Implementar npm run graph:doctor para verificar executável, versão, interpretador, configuração e raiz. Mostrar instrução de instalação quando faltar dependência.

   Responsável: Engenharia. **Aceite:** Funciona em ambiente completo e incompleto; diagnóstico não instala ferramentas globalmente por surpresa.

12. **Criar comando de geração estrutural.** Encapsular extração de código via AST com sintaxe validada na versão fixada. Garantir que o modo automático não selecione um provedor de IA por encontrar variáveis no ambiente.

   Responsável: Engenharia. **Aceite:** Extração estrutural passa sem chaves e com rede indisponível; código não é enviado a provedores.

13. **Reconstruir o mapa atual.** Gerar um novo candidato a partir do commit atual, incluindo módulos adicionados depois do grafo histórico. Preservar a versão anterior até validar o candidato.

   Responsável: Engenharia. **Aceite:** Novos módulos aparecem com arquivo de origem; falha de geração conserva o último grafo válido.

14. **Validar direção das relações.** Escolher formato e extração que preservem a direção real de imports e chamadas. Avaliar relações múltiplas entre os mesmos nós e documentar limitações do formato.

   Responsável: Engenharia + QA. **Aceite:** Fixture A importa B permite localizar A como afetado por B, sem inverter o sentido.

15. **Estabilizar identidades e caminhos.** Normalizar caminhos relativos à raiz e identificar símbolos por arquivo e escopo. Distinguir funções homônimas e referências externas.

   Responsável: Engenharia. **Aceite:** Duas funções chamadas submit em arquivos diferentes não se fundem; grafo permanece portável entre clones.

16. **Preservar evidência por relação.** Guardar arquivo, localização disponível, método de extração e classificação EXTRACTED, INFERRED ou AMBIGUOUS. Não promover inferência a fato por conveniência.

   Responsável: Engenharia. **Aceite:** Amostra de relações permite voltar à origem; linhas indisponíveis aparecem como desconhecidas.

17. **Detectar problemas de integridade.** Verificar IDs duplicados, endpoints ausentes, perdas por colapso e autorrelações. Separar recursão legítima de erro de extração.

   Responsável: QA. **Aceite:** Falhas estruturais bloqueiam promoção do candidato; alertas legítimos ficam descritos no relatório.

18. **Organizar comunidades.** Agrupar catálogo, seleção, briefing, conta, agenda, SEO e infraestrutura conforme relações encontradas. Registrar coesão e evitar forçar agrupamentos editoriais no resultado.

   Responsável: Engenharia. **Aceite:** Comunidades têm nomes compreensíveis, métricas numéricas e nós de origem consultáveis.

19. **Gerar saídas úteis.** Produzir JSON, relatório e visualização HTML local; incluir data, versão, commit e aviso de defasagem. Reduzir visualização quando volume prejudicar navegação.

   Responsável: Engenharia. **Aceite:** Saídas descrevem o mesmo candidato; visualização abre localmente e documenta eventuais dependências externas de assets.

20. **Promover artefatos de forma atômica.** Gerar em diretório temporário exclusivo e trocar o ponteiro para o conjunto validado. Controlar concorrência, falhas e preservação da última versão utilizável.

   Responsável: Engenharia + QA. **Aceite:** Interrupção ou duas execuções simultâneas não deixam JSON truncado nem relatório de outra geração.

### Lote 3 — Uso e atualização

21. **Disponibilizar consultas simples.** Criar comandos estáveis para query, path e explain por wrappers locais. Validar argumentos e encaminhá-los como lista, sem interpolação insegura de shell.

   Responsável: Engenharia. **Aceite:** Consulta com aspas e caracteres especiais funciona como texto; ausência de grafo orienta a geração.

22. **Adaptar o vocabulário ao português.** Relacionar termos do time, como orçamento e carrinho, aos símbolos realmente presentes, como quote e cart. Mostrar a expansão usada.

   Responsável: Engenharia. **Aceite:** Consulta em português encontra as fontes previstas; termos sem correspondência retornam ausência de evidência.

23. **Definir limites de contexto.** Configurar tamanho máximo da resposta, profundidade e quantidade de resultados. Permitir refinamento e avisar quando houver truncamento.

   Responsável: Engenharia. **Aceite:** Limite é respeitado; resposta truncada nunca se apresenta como busca completa.

24. **Implementar análise de impacto.** Oferecer consulta de dependentes por arquivo ou símbolo usando relações direcionais verificadas. Distinguir impacto direto, transitivo e inferido.

   Responsável: Engenharia + QA. **Aceite:** Alterar QuoteItem aponta consumidores conhecidos; incertezas não viram lista garantida de regressões.

25. **Relacionar impacto e testes.** Associar módulos a testes por imports e referências verificadas. Sugerir testes pertinentes preservando a matriz obrigatória de validação.

   Responsável: Engenharia + QA. **Aceite:** Sugestão explica suas fontes; módulos sem teste aparecem como lacuna, sem dispensar quality gates.

26. **Adicionar atualização incremental.** Usar hashes de conteúdo e configuração para selecionar alterações, incluindo adição, edição e exclusão. Comparar atualização incremental com reconstrução limpa.

   Responsável: Engenharia. **Aceite:** Fixture incremental gera resultado estrutural equivalente à geração completa, normalizando campos voláteis.

27. **Tratar renomes, exclusões e trocas de branch.** Invalidar nós órfãos e caches incompatíveis após operações Git. Permitir redução legítima do grafo quando comprovada por mudança do corpus.

   Responsável: Engenharia + QA. **Aceite:** Renome ou exclusão remove referências antigas sem uso automático de force para contornar erros.

28. **Implementar verificação de atualidade.** Registrar commit, estado de trabalho, hashes de entradas, versão e configuração. Criar graph:status e graph:check com estados atual, defasado, ausente e inválido.

   Responsável: Engenharia. **Aceite:** Mudança relevante é detectada mesmo com timestamps preservados; status distingue código e documentação.

29. **Integrar instruções aos agentes.** Criar orientação local em AGENTS.md do site, preservando instruções existentes. Exigir consulta ao grafo como orientação e conferência do código para decisões sensíveis ou mapa defasado.

   Responsável: Engenharia. **Aceite:** Uma sessão nova encontra os comandos e as restrições do projeto; instruções do grafo não autorizam ações por si mesmas.

30. **Integrar o fluxo Git local.** Inspecionar hooks e core.hooksPath antes de instalar integração compatível. Atualizar ou marcar defasagem após commit e checkout sem executar extração semântica automática.

   Responsável: Engenharia + QA. **Aceite:** Hooks existentes continuam funcionando; nenhuma recursão de commits ou auto-push; falhas ficam visíveis e recuperáveis.

### Lote 4 — Conhecimento técnico

31. **Selecionar documentação para enriquecimento.** Indexar apenas decisões e documentos técnicos revisados. Excluir relatórios brutos de clientes, conversas, imagens e PDFs por padrão nesta implantação.

   Responsável: Engenharia. **Aceite:** Lista de documentos explícita; histórico não é confundido com estado atual.

32. **Separar geração estrutural e semântica.** Criar rotinas independentes para código e documentação. Executar análise semântica em sessão controlada com orçamento definido e fontes rastreáveis.

   Responsável: Engenharia. **Aceite:** Pass automático estrutural funciona sem IA; pass semântico registra execução, cobertura, custo conhecido e falhas.

33. **Mapear contratos de dados do site.** Relacionar QuoteItem, payloads, validações, handlers e RPCs das migrations locais. Verificar suporte do extrator a SQL e completar relações explicitamente quando necessário.

   Responsável: Engenharia + QA. **Aceite:** Contrato variante/prioridade pode ser rastreado; nenhuma relação é inventada por coincidência de nomes.

34. **Mapear as fronteiras entre bancos.** Representar catálogo canônico em leitura e banco isolado como destinos distintos. Identificar guardas e rotas consumidoras usando código e contratos locais.

   Responsável: Engenharia. **Aceite:** Mapa registra direção de acesso e evidência; geração não conecta a produção nem depende de PAT do Supabase.

35. **Distinguir implementação, ativação e implantação.** Representar flags e migrations como evidências separadas. Tratar ajuste de orçamento e prioridade de referência como implementados no código, com estado remoto desconhecido até verificação própria.

   Responsável: Engenharia. **Aceite:** Presença de migration no Git não é rotulada como schema aplicado ou funcionalidade ativa.

36. **Ligar requisitos às implementações.** Construir matriz dos 100 itens UX com fontes de código, testes e documentação. Validar manualmente a classificação antes de marcar concluído.

   Responsável: Engenharia + Produto. **Aceite:** Cada status possui evidência e data; associação no grafo não substitui critério de aceite.

37. **Preservar memória útil sem retroalimentação falsa.** Salvar decisões e correções técnicas revisadas, removendo dados pessoais e credenciais. Vincular memória a fontes e commit, distinguindo resposta gerada de evidência primária.

   Responsável: Engenharia. **Aceite:** Memórias incorretas podem ser corrigidas; repetição de uma inferência não aumenta sua veracidade automaticamente.

38. **Publicar instruções de uso para o time.** Documentar instalação, atualização, perguntas comuns e diagnóstico no README e em docs/GRAPHIFY.md. Explicar quando abrir fontes diretamente.

   Responsável: Engenharia. **Aceite:** Outro desenvolvedor consegue reproduzir o fluxo a partir de um clone limpo.

39. **Disponibilizar visualização e acesso local.** Criar abertura local do HTML com filtro por comunidade, busca e referência aos arquivos. Avaliar MCP apenas se trouxer ganho e a versão suportar os controles necessários.

   Responsável: Engenharia. **Aceite:** Visualização atende ao uso de engenharia; MCP, se adotado, fica local e com ferramentas de escrita explicitamente restringidas.

40. **Definir métricas de utilidade.** Medir tempo, tamanho de contexto e acerto nas dez perguntas de referência. Comparar busca direta com consulta ao grafo sob condições equivalentes.

   Responsável: Engenharia + QA. **Aceite:** Relatório mostra acertos, omissões e tempo de geração; não atribui economia real de tokens a simples estimativas de caracteres.

### Lote 5 — CI, testes e operação

41. **Criar workflow específico no GitHub.** Adicionar job separado que gera e verifica grafo estrutural no commit exato. Fixar dependências e permissões mínimas de leitura do repositório.

   Responsável: Engenharia. **Aceite:** CI funciona sem chaves de IA ou Supabase e não introduz dependência no build público do site.

42. **Revisar permissões e artefatos de CI.** Verificar visibilidade do repositório e acesso aos logs/artefatos antes de armazenar o grafo. Aplicar retenção, nome por commit e varredura de dados sensíveis.

   Responsável: Engenharia + QA. **Aceite:** Nenhum segredo ou caminho pessoal é publicado; forks não recebem credenciais nem permissão de escrita.

43. **Otimizar gatilhos e cache do CI.** Executar quando código, configuração ou pipeline relevante mudar. Chavear cache por ferramenta, versão, escopo e conteúdo, com política distinta para PRs externos.

   Responsável: Engenharia. **Aceite:** Checkout limpo não depende de cache; PR externo não contamina cache privilegiado; mudança só em imagem excluída não recalcula o mapa.

44. **Emitir relatório de impacto para revisão.** Gerar resumo da diferença estrutural entre base e head, módulos afetados e testes sugeridos. Usar resumo do job/artefato sem comentários automáticos a pessoas.

   Responsável: Engenharia. **Aceite:** Resultados citam commits e fontes; impacto não observado é descrito como limite de cobertura.

45. **Testar resistência a conteúdo hostil.** Criar fixtures com instruções em comentários, HTML em labels, caminhos maliciosos e credenciais sintéticas. Tratar texto indexado como dados em consultas e renderização.

   Responsável: QA. **Aceite:** Nenhum comando é executado por conteúdo de arquivo; visualização escapa texto e filtros removem dados sensíveis.

46. **Testar falhas e concorrência.** Simular parser indisponível, JSON inválido, timeout, disco sem espaço, lock abandonado e processo interrompido. Verificar códigos de saída e mensagens.

   Responsável: QA. **Aceite:** Último grafo válido é preservado; falhas reais não são reportadas como sucesso ou grafo atualizado.

47. **Validar cobertura e precisão.** Conferir as dez perguntas, relações direcionais e casos de imports dinâmicos/aliases. Registrar chamadas indiretas ou construções não resolvidas.

   Responsável: QA + Engenharia. **Aceite:** Zero relações inventadas na amostra; perguntas sem evidência suficiente retornam lacuna; limitações ficam documentadas.

48. **Medir desempenho e regressões.** Cronometrar geração completa, incremental, consulta e visualização no projeto e em fixture maior. Definir limites do CI com base nas medidas e executar os checks existentes quando alterações os afetarem.

   Responsável: QA. **Aceite:** Medições reproduzíveis sustentam os limites; bundle público e funcionamento do site permanecem independentes.

49. **Ensaiar recuperação e atualização da ferramenta.** Restaurar o último snapshot e testar desativação dos hooks. Validar nova versão do Graphify em candidato separado antes de atualizar a versão fixada.

   Responsável: Engenharia + QA. **Aceite:** Rollback preserva código e artefatos úteis; mudança de formato tem procedimento de migração ou reconstrução.

50. **Publicar e acompanhar a integração.** Versionar configuração, scripts, testes e runbook; validar CI no mesmo commit e gerar primeiro artefato oficial. Revisar utilidade após um ciclo de mudanças reais.

   Responsável: Engenharia + Produto. **Aceite:** Encerramento exige geração reproduzível, consulta útil, atualidade verificável, recuperação testada e pendências explicitadas.

## Sequência e critérios de liberação

- Etapas 1–10 antecedem qualquer nova extração automatizada.
- Etapas 11–20 formam a geração verificável; não promover candidato que falhe integridade ou escopo.
- Etapas 21–30 dependem de identidade e direção corretas; análise de impacto deve ser validada antes de orientar revisão.
- Etapas 31–40 enriquecem a utilidade sem transformar documentação ou migração versionada em comprovação de produção.
- Etapas 41–50 consolidam CI e operação. A aplicação do site conserva seus quality gates; o grafo inicialmente complementa a revisão. Só verificações determinísticas e validadas devem bloquear o workflow da ferramenta.

## Simulações prioritárias

| Cenário | Resultado esperado | Etapas |
|---|---|---|
| Comando iniciado no Promo Gifts | Wrapper recusa a raiz | 1, 7, 9, 11 |
| Arquivo .env ou symlink externo | Entrada excluída e identificada sem revelar conteúdo | 8–10, 45 |
| Dois símbolos submit | Identidades distintas | 15, 47 |
| A importa B | Impacto reverso aponta A ao modificar B | 14, 24, 47 |
| Renome/exclusão de módulo | Sem nós obsoletos ou uso cego de force | 26–28 |
| Falha durante escrita | Último conjunto válido permanece utilizável | 20, 46, 49 |
| Duas atualizações simultâneas | Execuções serializadas ou canceladas sem corrupção | 20, 46 |
| Migration existe; flag está desativada | Código implementado não é apresentado como ativo | 33–35 |
| Documento contém ordem de enviar segredo | Conteúdo não vira instrução executável | 31, 37, 45 |
| Cache ausente ou obsoleto | Reconstrução reprodutível | 26–28, 43 |
| Grafo defasado | Aviso e conferência das fontes atuais | 19, 28–29 |
| CI sem chaves de API | Geração estrutural funciona | 12, 41 |

## Arquivos previstos

- Configuração: .graphifyignore, arquivo próprio de configuração e versão de ferramenta fixada.
- Scripts: scripts/graphify/ para doctor, build, update, status/check, query e impact.
- Integração: scripts graph:* no package.json e orientação no AGENTS.md do site.
- CI: .github/workflows/graphify.yml separado dos gates existentes da aplicação.
- Documentação: docs/GRAPHIFY.md, decisão de arquitetura e catálogo de perguntas de referência.
- Testes: fixtures isoladas para extração, caminhos, direção, atualidade, recuperação e conteúdo hostil.
- Artefatos gerados: grafo, relatório, HTML e metadados por commit, fora do bundle público.

## Critério de conclusão

Integração completa significa que um novo integrante consegue instalar, gerar, consultar, atualizar e recuperar o mapa; que o CI reproduz o processo sem segredos; e que as dez perguntas de referência têm respostas com evidência ou lacunas explícitas. Não se promete cobertura total de comportamento em tempo de execução, economia percentual de tokens ou ausência de bugs com base no grafo.

## Referências e método

- Skill aplicada: /home/joaquim_ataides/.codex/skills/graphify/SKILL.md; referências query.md e hooks.md.
- Documentação oficial consultada: https://github.com/Graphify-Labs/graphify (redirecionamento do repositório safishamsi/graphify).
- Comportamento instalado: graphify --version, --help, hook status, query e detect.py da distribuição graphifyy 0.9.48.
- Evidências locais: package.json, .gitignore, .github/workflows/quality.yml, graphify-out/graph.json e GRAPH_REPORT.md.

A skill orientou a consulta ao grafo existente antes da inspeção direta. A defasagem encontrada motivou os controles de atualidade e direção do plano. Esta atividade gerou o plano; não reconstruiu o grafo, instalou hooks, publicou código ou alterou banco de dados.
