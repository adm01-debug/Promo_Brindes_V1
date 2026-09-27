# Plano de correções — Promo Brindes V1

**PLANO COMPLETO COM 22 ETAPAS — o sistema não sustenta 100 correções reais**

Data: 24/09/2026. Esta contagem se refere aos achados comprovados nesta auditoria, não a uma garantia de inexistência de outros problemas. Base: `AUDITORIA.md`, A-001 a A-022. Nenhuma etapa foi executada.

Escopo: `/home/joaquim_ataides/projetos/Promo_Brindes_V1`, APIs/site e Supabase isolado `xlzmclcjdncjfdrjxclt`. Promo Gifts e seu banco canônico permanecem protegidos. E-021 exige decisão específica do responsável, não autorização presumida.

Ordem: P1 primeiro; correções pequenas e de isolamento antes de alterações maiores de concorrência; P2 depois; P3 ao final. Dependências sempre apontam para etapas anteriores. Estimativas de diff são de planejamento, não medidas de produtividade. Testes de regressão específicos fazem parte de cada unidade; não foram desmembrados para inflar a contagem.

Provedores/segredos adiados pelo usuário não serão ativados incidentalmente: Resend, WhatsApp, webhooks, alertas e SITE_SUPABASE_SERVICE_JWT continuam dependências externas. Testes com mensagens, banco ou uploads só devem ocorrer em ambiente de teste explicitamente autorizado e sem clientes reais. Nenhuma migration antiga deve ser reescrita para “igualar” o ledger.

### E-001 · [P1] · segurança/frontend — Respeitar o proprietário do cache legado
Corrige: A-007.
Onde: `src/lib/useOccasionFavorites.ts` · `src/lib/useOccasionFavorites.test.tsx`.
Ação: Verificar FAVORITES_OWNER_KEY antes de interpretar a chave legada como anônima; permitir migração somente para o titular correspondente.
Preservar cache legítimo da própria conta e cache realmente anônimo. Não apagar indiscriminadamente favoritos de todos os titulares.
Incluir o cenário account-old → account-new reproduzido na auditoria, com zero RPC de promoção de dados alheios.
Diff estimado: ~60–90 linhas · hook e teste.
Depende de: —.
Verificação: montar hook com chave v1 pertencente a outro usuário; UI deve permanecer vazia e setMyOccasionFavorite não deve receber aquelas datas. Repetir para proprietário correto e anônimo.
Risco: perder migração legítima de cache antigo; manter casos separados de owner ausente, anonymous, conta atual e conta diferente.

### E-002 · [P1] · acessibilidade — Corrigir semântica da galeria de fotos
Corrige: A-015.
Onde: `src/pages/ProductPage.tsx:189` · `e2e/smoke.spec.ts`.
Ação: Substituir a falsa lista por grupo de controles com nome acessível, preservando botões, aria-pressed e navegação por Tab.
Acrescentar fixture com duas imagens e executar axe na rota de produto, não apenas nas sete rotas atuais.
Diff estimado: ~25–40 linhas · 2 arquivos.
Depende de: —.
Verificação: galeria com 1, 2 e 8 imagens; nenhuma aria-required-children; teclado troca imagem e o botão ativo é anunciado. Revalidar 390 e 1440 px.
Risco: alterar foco ou nome dos controles; não substituir botões por elementos sem interação nativa.

### E-003 · [P1] · frontend — Eliminar reutilização da revisão de favoritos
Corrige: A-003.
Onde: `src/lib/useOccasionFavorites.ts` · `src/lib/useOccasionFavorites.test.tsx`.
Ação: Separar contador monotônico de identidade de mutação do registro de trabalho pendente; concluir promise não pode reiniciar a numeração.
Invalidar ambos no limite correto de sessão/conta, sem aceitar rollback de geração anterior.
Codificar salvar1 → remover2 → confirmar2 → salvar3 → rejeitar1 como regressão determinística.
Diff estimado: ~60–100 linhas · 2 arquivos.
Depende de: E-001.
Verificação: ao rejeitar a primeira promise, UI e intenção continuam salvas pela terceira; contador nunca é reutilizado enquanto existir callback antigo.
Risco: mapa crescer durante sessão longa; limitar o conjunto por datas conhecidas e limpar apenas na troca de contexto, sem reiniciar identidades em voo.

### E-004 · [P1] · frontend — Preservar ações feitas durante importação anônima
Corrige: A-010.
Onde: `src/lib/useOccasionFavorites.ts:140–168` · teste do hook.
Ação: Capturar revisão/contexto antes da promoção e só aplicar sua intenção quando não houver escolha autenticada posterior para aquela data.
No sucesso parcial ou falha de importação, mesclar confirmações e intenções atuais; não restaurar todo o snapshot remoto.
Concluir a marca de promoção somente conforme política explícita de sucesso, permitindo retomada sem duplicar ou ressuscitar escolhas.
Diff estimado: ~90–140 linhas · hook e testes.
Depende de: E-003.
Verificação: importação pendente, remoção confirmada e conclusão tardia devem manter removido; testar falha de um item entre dois e troca de conta durante Promise.all.
Risco: marcar promoção como completa antes de persistir todos os itens; rastrear por item e manter comportamento idempotente.

### E-005 · [P1] · frontend/backend — Ordenar escritas de favoritos por conta e data
Corrige: A-004.
Onde: `src/lib/useOccasionFavorites.ts` · `src/lib/customerOccasionFavorites.ts` · testes correspondentes.
Ação: Serializar a execução por conta/data e compactar intenções pendentes, mantendo UI otimista e última intenção como objetivo.
Encaminhar promoção e cliques pelo mesmo mecanismo para que ambos não concorram sem ordem. Não exigir alteração SQL para corrigir o caso reproduzido de um dispositivo.
Definir explicitamente concorrência entre dispositivos como último commit confirmado, com reconsulta; uma versão global exigiria contrato SQL adicional, não inventado nesta etapa.
Diff estimado: ~100–160 linhas · 2–3 arquivos.
Depende de: E-003, E-004.
Verificação: salvar/remover com atraso invertido deve terminar removido tanto na UI quanto no fake servidor; remover/salvar, falha intermediária, unmount e mudança de titular também.
Risco: fila enviar operação depois da saída da conta; vincular execução a proprietário/época e descartar intenções não iniciadas de contexto invalidado.

### E-006 · [P1] · observabilidade — Restabelecer o script do Web Analytics
Corrige: A-013.
Onde: projeto Vercel `juca1/promo-brindes-v1` · `src/App.tsx` · `scripts/smoke-deployment.mjs`.
Ação: Conferir habilitação do Web Analytics e associação ao deployment, diferenciando esse recurso de Speed Insights; corrigir a configuração específica responsável pelo 404.
Adicionar verificação de disponibilidade do script ao smoke quando Analytics estiver declarado ativo, sem enviar eventos com contato ou tokens.
Não retirar redaction nem considerar a mera montagem do componente como ativação concluída.
Diff estimado: ~15–30 linhas · smoke + configuração externa; alteração do App somente se o diagnóstico exigir.
Depende de: —.
Verificação: GET do script retorna 200 e JavaScript; após publicação autorizada, evento sintético sem PII aparece no painel ou fica explicitamente pendente de validação do painel.
Risco: ativação ter impacto comercial/plano; confirmar disponibilidade antes de contratar recurso. Smoke não deve falhar por coletor deliberadamente desativado sem uma flag de intenção.

### E-007 · [P1] · infra — Corrigir o contexto de acesso do release à Vercel
Corrige: A-001.
Onde: `.github/workflows/release.yml:80–90` · secret GitHub VERCEL_TOKEN · projeto `promo-brindes-v1`.
Ação: Revalidar o token do CI contra os IDs já conferidos, identificando se pertence ao time juca1 e permite leitura/build/deploy desse projeto.
Corrigir somente a credencial ou configuração efetivamente divergente; não remover gates nem reativar deploy Git em paralelo.
Validar a leitura de configurações no contexto do runner, sem promover build nesta unidade; registrar acesso corrigido/deploy ainda não validado.
Diff estimado: 0–15 linhas · configuração externa e, somente se necessário, workflow.
Depende de: —.
Verificação: vercel pull executa no contexto do runner sem erro de Project Settings; projeto e time retornados correspondem aos IDs aprovados. Não imprimir token em log nem declarar publicação concluída.
Risco: token excessivamente amplo ou diagnóstico acionar deploy; escopo mínimo disponível, alvo fixo e checagem sem comando de promoção.

### E-008 · [P2] · infra — Unificar Node com os requisitos do lockfile
Corrige: A-002.
Onde: `package.json` · `.github/workflows/quality.yml`, `database.yml`, `release.yml`, `graphify.yml` · referências de runtime existentes.
Ação: Inventariar os pins atuais e escolher uma versão 22.x que satisfaça todas as engines instaladas, incluindo jsdom e undici.
Aplicar o mesmo pin aos jobs que executam a aplicação/testes; alinhar a configuração Vercel e o ambiente de desenvolvimento sem trocar majors das dependências por impulso.
Diff estimado: ~10–25 linhas · arquivos com pins efetivamente presentes.
Depende de: E-007.
Verificação: npm ci no runtime escolhido sem EBADENGINE; typecheck, suíte de API, build e browser gates no mesmo major suportado. Na liberação autorizada, confirmar build/deploy/smoke do SHA aprovado com o acesso corrigido em E-007.
Risco: mudança de runtime alterar resolução/DOM dos testes; validar em branch antes da liberação, sem atualizar snapshots em massa para esconder regressão.

### E-009 · [P2] · frontend — Normalizar e reconciliar paginação do histórico
Corrige: A-008.
Onde: `src/pages/CustomerAccountPage.tsx:24–42,75–77` · `src/lib/customerAccount.ts:64–78` · testes do histórico.
Ação: Aceitar apenas páginas inteiras finitas, aplicar limite compatível com p_offset do RPC e canonicalizar o parâmetro inválido.
Após obter total/offset, recuperar página além do fim com retorno claro à primeira/última página válida; não mostrar “primeiro briefing” por offset errado.
Diff estimado: ~60–100 linhas · página/helper/testes.
Depende de: —.
Verificação: page=1.1, NaN, Infinity, negativo, 999, resultado vazio verdadeiro e exclusão do último item da última página; nenhum offset fracionário enviado.
Risco: loop de atualização de searchParams; substituir URL apenas quando o valor normalizado for diferente.

### E-010 · [P2] · frontend/UX — Tornar atualização de senha uma operação única
Corrige: A-009.
Onde: `src/pages/SetPasswordPage.tsx` · teste de componente a criar nesse diretório.
Ação: Introduzir pending e guarda síncrona contra reentrada; desabilitar envio enquanto autenticação ou atualização estiverem em curso.
Tratar erro retornado e promise rejeitada, anunciar progresso e impedir navegação tardia após troca de titular.
Diff estimado: ~70–110 linhas · componente e teste.
Depende de: —.
Verificação: dois submits no mesmo tick geram uma chamada; rejeição libera retry com erro visível; logout/troca de conta antes da resposta não conclui no contexto novo.
Risco: bloqueio permanente por exceção; liberar pending em finally e comparar identidade/contexto antes de atualizar estado.

### E-011 · [P2] · backend — Validar shape dos webhooks após autenticar o corpo
Corrige: A-012.
Onde: `api/notification-events-resend.ts` · `api/notification-events-whatsapp.ts` · testes homônimos em `tests/api/`.
Ação: Validar objeto raiz, arrays entry/changes/statuses e campos usados antes de acessar propriedades ou aplicar slice/flatMap.
Preservar assinatura sobre bytes originais, limites de corpo/eventos e distinção entre evento suportado, ignorado e malformado.
Responder 400 estruturado a payload inválido; manter 500 para falha transitória de persistência que precisa de reentrega.
Diff estimado: ~100–150 linhas · 2 handlers e testes.
Depende de: —.
Verificação: null, array raiz, entry objeto, status null, bounce.type não-string, JSON quebrado e evento válido; dados inválidos não chamam RPC, assinatura inválida continua 401.
Risco: rejeitar evento válido que tenha campos adicionais; validar apenas estrutura necessária, sem schema fechado que impeça evolução do provedor.

### E-012 · [P2] · privacidade — Sanitizar também URLs do Speed Insights
Corrige: A-014.
Onde: `src/App.tsx:95` · `src/lib/analytics.ts` · testes de analytics · `src/pages/PrivacyPage.tsx` se necessário para refletir o coletor.
Ação: Adaptar a função de redaction ao tipo efetivo do beforeSend de Speed Insights e reutilizar a mesma política de caminhos permitidos.
Remover query/hash e substituir IDs privados, sem alterar dados de medição ou enviar texto de erro/contato. Não fazer cast cego entre contratos dos dois SDKs.
Diff estimado: ~40–70 linhas · 3–4 arquivos.
Depende de: —.
Verificação: capturar e abortar requests sintéticos no navegador; URLs com protocolo, ID de orçamento, token de compartilhamento e parâmetro arbitrário não devem sair sem redaction.
Risco: quebrar tipagem ou descartar toda telemetria; testar no SDK instalado e preservar retorno válido dos eventos públicos.

### E-013 · [P2] · banco — Fixar ACL explícita das RPCs de favoritos
Corrige: A-016.
Onde: nova migration em `site-supabase/supabase/migrations/` · funções public.list_my_occasion_favorites e public.set_my_occasion_favorite · testes SQL existentes do site.
Classe (só banco): aditiva — nova migration de permissões, sem mudança de dados/schema destrutiva.
Ação: Estabelecer ACL pretendida das duas funções com revogações explícitas dos roles não autorizados e grant somente aos consumidores previstos.
Cobrir instalação sobre defaults locais e defaults remotos; não reescrever a migration 20260923130000 nem modificar defaults de schemas da plataforma indiscriminadamente.
Diff estimado: ~40–70 linhas · 1 migration e teste de permissões.
Depende de: —.
Verificação: has_function_privilege por anon/authenticated/service_role/site_api e comparação semântica de ACL local/remota; corpos e ledger preservados.
Risco: haver consumidor administrativo legítimo; inventariar antes da revogação. Rollback de ACL deve restaurar somente grant comprovadamente necessário, nunca PUBLIC indiscriminado.

### E-014 · [P2] · banco — Cobrir a FK de titular incluindo registros spam
Corrige: A-017.
Onde: `site_private.quote_requests` · nova migration isolada · testes de índices da base do site.
Classe (só banco): aditiva.
Ação: Criar índice com customer_user_id como primeira coluna, completo ou parcial apenas por IS NOT NULL, sem excluir status spam.
Manter o índice do histórico, que atende outro padrão de ordenação. Conferir volume e plano antes de criar; para tabela grande usar CREATE INDEX CONCURRENTLY em execução compatível, fora de transação que o proíba.
Diff estimado: ~15–30 linhas · migration/contrato de índice.
Depende de: —.
Verificação: consulta de cobertura das FKs considera o predicado correto; EXPLAIN em fixture autorizada com spam e não-spam usa caminho indexável. Contagem remota observada foi zero, não premissa permanente.
Risco: custo adicional de escrita/armazenamento e lock de criação; recontar no momento da implantação e escolher estratégia proporcional, sem apagar índices por idx_scan=0.

### E-015 · [P2] · backend — Reconciliar cores pelo contrato público disponível
Corrige: A-021.
Onde: `api/_lib/catalogValidation.ts` · `tests/api/lead-requests.test.ts` · contrato público de swatches.
Ação: Tratar explicitamente swatches públicos sem variant_id, correspondendo nome normalizado e canonicalizando cor/hex/imagem quando a correspondência for inequívoca.
Rejeitar cor não publicada com erro recuperável; distinguir “a definir” de referência obsoleta. Manter suporte a IDs somente quando a fonte autorizada realmente os fornece.
Diff estimado: ~70–110 linhas · validador e testes.
Depende de: —.
Verificação: payload com cor inexistente não é persistido; cor válida sem ID preserva metadados públicos; nomes duplicados/acentos/case e variante removida recebem tratamento explícito.
Risco: quebrar seleções antigas com grafias distintas; normalização limitada e mensagem de revisão, sem mapear ambiguidades por suposição nem expor IDs internos.

### E-016 · [P2] · frontend/backend — Manter deadline durante consumo do corpo
Corrige: A-006.
Onde: `src/lib/http.ts` · `api/_lib/catalogValidation.ts` · `api/_lib/siteDatabase.ts` · `api/_lib/publicProductPage.ts` · `api/sitemap.ts` · respectivos testes.
Ação: Manter timer/controller ativos até json/text terminar, incluindo tratamento de erro e cancelamento do corpo.
Corrigir cada ocorrência do mesmo padrão, sem reescrever toda a camada HTTP; preservar mensagens/status e sinal de cancelamento de sessão.
Diff estimado: ~80–140 linhas · handlers/helpers e testes direcionados.
Depende de: —.
Verificação: headers imediatos + stream de corpo que nunca termina deve abortar dentro do limite; JSON inválido, corpo vazio, 429 e cancelamento externo continuam distinguíveis.
Risco: converter abort legítimo em erro genérico ou deixar reader pendurado; testar encerramento do stream e timer em sucesso/falha.

### E-017 · [P2] · frontend — Adicionar deadline às consultas públicas do catálogo
Corrige: A-011.
Onde: `src/lib/catalog.ts:276–310` · `src/lib/hooks.ts` · testes de catálogo/hooks.
Ação: Compor sinal do chamador com deadline de leitura; definir um orçamento total que inclua retry e consumo do corpo.
Exibir erro recuperável ao atingir o prazo, mantendo cancelamento por navegação silencioso; reutilizar a correção de lifetime do timer de E-016.
Diff estimado: ~60–100 linhas · helpers e testes.
Depende de: E-016.
Verificação: fetch que nunca resolve e body que trava saem de loading; retry não dobra indefinidamente o prazo; mudar filtro/rota não mostra erro de requisição anterior.
Risco: abortar conexões legitimamente lentas; escolher limite explícito, medir depois em campo e manter botão de retry.

### E-018 · [P2] · backend/frontend — Compatibilizar o prazo total do orçamento
Corrige: A-019.
Onde: `api/_lib/leadHandler.ts` · `api/notifications.ts` · `src/lib/http.ts` · `tests/api/maxDuration.test.ts` e testes de envio.
Ação: Definir deadline ponta a ponta com margem de resposta, propagado às consultas e à tentativa imediata de notificação.
Se o protocolo já estiver persistido e não houver margem para confirmação, retornar sucesso com confirmações pending; deixar a outbox para worker posterior, sem promise solta em função serverless.
Diff estimado: ~80–130 linhas · fluxo de envio e contratos de tempo.
Depende de: E-016.
Verificação: relógio controlado com catálogo/persistência lentos e provedor configurado; responder com protocolo antes do prazo do cliente, sem reenviar mensagens ou perder a outbox.
Risco: reduzir tentativas imediatas aumentar entrega posterior; explicitar pending na UI e não ativar provedores adiados para testar.

### E-019 · [P2] · infra — Vincular shell HTML ao próprio deployment
Corrige: A-018.
Onde: `api/_lib/publicProductPage.ts` · `api/site-page.ts` · `api/product-page.ts` · `api/not-found.ts` · testes de shell.
Ação: Separar origem canônica de SEO da origem/artefato que contém index.html; preferir shell empacotado com a mesma revisão quando suportado pelo build atual.
Se houver fetch interno, restringi-lo ao próprio deployment com validação de HTML e autenticação suportada, nunca encaminhando segredos a host arbitrário.
Conservar canonical/OG de produção sem utilizar essa URL para localizar assets de um preview.
Diff estimado: ~70–130 linhas · helper, empacotamento mínimo e testes.
Depende de: —.
Verificação: dois builds com nomes de chunk diferentes; root e deep link de cada deployment devem referenciar assets do mesmo build, todos 200, inclusive preview protegido.
Risco: incluir shell antes de o build gerá-lo ou introduzir SSRF; validar caminho/manifest e recusar HTML de login/proteção em vez de servi-lo como aplicativo.

### E-020 · [P2] · backend — Diferenciar assinatura de formato de validação integral de PDF
Corrige: A-005.
Onde: `api/_lib/fileSignatures.ts` · `api/briefing-assets.ts` · `tests/api/briefing-assets.test.ts` · contrato de arquivos do site.
Ação: Definir política restrita de PDF e validar estrutura integral com biblioteca compatível com o runtime, limites de bytes/tempo/memória e rejeição de conteúdo ativo proibido.
Manter bloqueio de vínculo e limpeza durável quando a validação falhar. Assinatura PNG/JPEG/WebP continua detecção de formato, não promessa de antimalware.
Caso validação integral não caiba no ambiente serverless, propor quarentena assíncrona com aprovação própria; não prometer segurança integral com uma regex maior.
Diff estimado: ~100–180 linhas · validador, endpoint, fixtures sintéticas e dependência avaliada; arquitetura assíncrona fica fora desse diff.
Depende de: E-008, E-016.
Verificação: PDF íntegro, truncado, criptografado não suportado, JavaScript/ação embutida, arquivo no limite de 10 MB e timeout. Nenhum caso rejeitado recebe status de verificado ou vínculo.
Risco: rejeitar arquivo legítimo ou exceder memória/duração; política comunicada, fixtures e limites medidos. Não abrir anexos reais para executar conteúdo ativo.

### E-021 · [P2] · arquitetura/segurança — Resolver a decisão sobre acesso legado do catálogo
Corrige: A-022, condicionado à decisão e implantação pelo responsável do canônico.
Onde: `docs/DATABASE_PUBLIC_CONTRACT.md` · coordenação do contrato public.v_site_products_public/public.v_products_public em `doufsxqlfjyuvxuezpln`.
Ação: Apresentar os quatro campos acessíveis confirmados, dependências via pg_depend/pg_rewrite e consumidores reais ao PO do Promo Gifts, com aprovação específica solicitada antes de qualquer alteração.
Escolher formalmente entre aceitar a exposição comercial ou implantar uma fronteira pública mínima que não dependa de SELECT anônimo na view legada; planejar migração dos consumidores antes da retirada de privilégio.
Registrar responsável e verificação de corte. Esta etapa não autoriza DDL no Promo Gifts, nem declara A-022 resolvido apenas por produzir documentação.
Diff estimado: ~40–80 linhas no contrato/registro de decisão; DDL e consumidores só podem ser estimados depois do inventário autorizado.
Depende de: —.
Verificação: decisão explícita com campos aprovados; se escolhida restrição, teste anônimo deve ler catálogo mínimo e ser recusado nos campos legados, sem quebrar consumidores internos. Enquanto não ocorrer, manter pendência externa aberta.
Risco: REVOKE isolado quebrar a view security_invoker e sistemas compartilhados. Proibição de alterar o Promo Gifts permanece; execução externa é condicionada, não contornada com credencial disponível.

### E-022 · [P3] · UX — Dar contexto ao estado vazio das páginas de ideias
Corrige: A-020.
Onde: `src/pages/IdeaLandingPage.tsx:21` · `e2e/smoke.spec.ts`.
Ação: Renderizar mensagem explícita quando a consulta concluir com zero produtos, mantendo saída para catálogo e conversa com especialistas.
Não inventar referências, preço ou disponibilidade; preservar a distinção de loading, falha de serviço e tópico inexistente.
Diff estimado: ~30–50 linhas · página e teste.
Depende de: —.
Verificação: mock de [] mostra estado vazio legível; erro mantém retry; resultados reais mantêm grid; âncora referências aponta para conteúdo útil também no vazio.
Risco: duplicação de CTA ou confusão entre filtro vazio e serviço fora do ar; cobrir separadamente quatro estados da consulta.

## Fechamento e critérios de execução futura

Cobertura: A-001→E-007; A-002→E-008; A-003→E-003; A-004→E-005; A-005→E-020; A-006→E-016; A-007→E-001; A-008→E-009; A-009→E-010; A-010→E-004; A-011→E-017; A-012→E-011; A-013→E-006; A-014→E-012; A-015→E-002; A-016→E-013; A-017→E-014; A-018→E-019; A-019→E-018; A-020→E-022; A-021→E-015; A-022→E-021.

Antes de implementar, reconferir branch/SHA e alterações de terceiros. Cada unidade deve comprovar sua reprodução antes/depois; remover um alerta ou passar typecheck não basta. E-007 encerra somente o problema de acesso; E-008 integra runtime e validação da liberação, dependendo explicitamente daquele acesso. Não publicar isoladamente alterações incompatíveis com código ou schema em produção.

Não há migration destrutiva planejada para o banco isolado: as duas propostas são ACL e índice. Se a implementação futura exigir renomear/remover coluna, mudar tipo ou adicionar NOT NULL sobre dados existentes, interromper essa unidade e desenhar expand-contract, contagem de impacto, backfill em lotes e rollback; isso não está implicitamente autorizado aqui.

Itens não verificados na auditoria (restore, dispositivos físicos, clientes reais, mensagens e crons reais) não foram transformados em correções inventadas. Continuam critérios externos de validação. O plano não certifica que uma execução parcial, documentação de decisão ou um CI verde encerre todas as pendências.
