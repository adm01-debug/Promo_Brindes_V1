# Auditoria da matriz de fechamento (230 requisitos) contra o código atual

Data da auditoria: 11/10/2026. Repositório: `/home/user/Promo_Brindes_V1`, HEAD `3f82233` (06/10/2026). Trabalho somente leitura: nenhum arquivo do repositório foi alterado e nenhum commit foi feito.

## 1. Escopo e método

- **Ledger auditado:** `docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv`, lido com o próprio `parseCsv` de `scripts/validate-closure-ledger.mjs`. Também foram lidos `docs/MATRIZ_INDEX.md`, `docs/GOVERNANCA_FECHAMENTO.md` e o validador, além dos relatórios posteriores (`EXECUCAO_LOTE_FAVORITOS_20260924.md`, `REVISAO_PLANOS_20260928.md`, `REVISAO_PRODUTO_230_20260928.md`, `EXECUCAO_PLANO_FECHAMENTO_20261001.md`, `GRAPHIFY_0968_EVALUATION_20261005.md` e `UX_AUDIT_REPORT.md`). Esses relatórios serviram só como pistas: toda conclusão abaixo foi conferida no código.
- **Distribuição na matriz:** 118 I, 100 P, 1 N, 11 E e 0 A, total 230. Por frente: UX 50 I, 46 P e 4 E; LK 19 I, 23 P, 1 N e 7 E; GR 26 I e 24 P; AC 23 I e 7 P. **Total não-I: 112.**
- **Verificação:** cada linha não-I foi conferida com grep e leitura dos arquivos citados em `fontes` e dos arquivos que os commits posteriores a 22/09 tocaram (104 commits, de `911605c` a `3f82233`).
- **Graphify:** `npm run graph:status` falhou neste clone (`Cannot find package 'typescript'`, porque não há `node_modules`). Para não modificar o ambiente, o grafo não foi instalado nem reconstruído e a auditoria usou leitura direta.
- **Limite:** o estado remoto (Vercel, Supabase, GitHub, provedores) não foi consultado. Afirmações sobre ele vêm dos relatórios e estão marcadas como tal.

### Critério de classificação

| Classificação | Significado nesta auditoria |
|---|---|
| **JÁ RESOLVIDO** | O que a matriz diz faltar já existe no código, com teste. A linha está desatualizada, embora possa restar aceite humano que a própria linha não menciona. |
| **NÃO INICIADO** | Não há código para a entrega descrita. |
| **PARCIAL-CÓDIGO** | Existe parte, mas ainda falta código ou modelagem verificável no repositório. |
| **PARCIAL-VALIDAÇÃO** | O código existe. Falta teste específico, homologação, pesquisa com compradores, aceite humano ou ensaio em produção. |
| **BLOQUEADO-EXTERNO** | O avanço depende de credencial, conteúdo ou material autorizado, dados comerciais, decisão do dono ou operação fora do repositório. Inclui os adiamentos explícitos do usuário. |

## 2. Contagens finais (linhas não-I)

| Frente | Não-I na matriz | JÁ RESOLVIDO | NÃO INICIADO | PARCIAL-CÓDIGO | PARCIAL-VALIDAÇÃO | BLOQUEADO-EXTERNO |
|---|---|---|---|---|---|---|
| UX | 50 | 3 | 0 | 4 | 31 | 12 |
| LK | 31 | 1 | 1 | 2 | 15 | 12 |
| GR | 24 | 0 | 2 | 9 | 11 | 2 |
| AC | 7 | 0 | 0 | 0 | 6 | 1 |
| **Total** | **112** | **4** | **3** | **15** | **63** | **27** |


Leitura das contagens:

- Das 27 linhas BLOQUEADO-EXTERNO, **11 são E na matriz e 16 estão marcadas P**: UX06, UX67, UX68, UX69, UX75, UX76, UX84, UX98, LK06, LK22, LK27, LK35, LK45, GR04, GR42 e AC24. Nessas 16 linhas a engenharia não consegue avançar sem insumo externo.
- **Só 18 linhas (15 PARCIAL-CÓDIGO e 3 NÃO INICIADO) dependem de código** que pode ser escrito agora. Algumas também dependem de dados ou de decisão.
- As **63 linhas PARCIAL-VALIDAÇÃO** já têm código. O que falta é teste, homologação ou aceite humano.
- As **4 linhas JÁ RESOLVIDO** (LK10, UX35, UX49 e UX88) deveriam ser reescritas no ledger.

### Distribuição de estados se o ledger fosse reconciliado (sugestão, não aplicada)

| Mudança sugerida | Efeito |
|---|---|
| LK10 de N para P: código entregue; faltam curadoria das fotos e homologação | −1 N, +1 P |
| LK44 de P para N: não há link de WhatsApp iniciado pelo visitante | −1 P, +1 N |
| UX83 e LK15 de I para P: metadados editoriais genéricos, aceite editorial pendente | −2 I, +2 P |
| UX35, UX49 e UX88 continuam P, com nova natureza `validacao_*` e novo texto | sem efeito na contagem |
| **Resultado** | **116 I, 102 P, 1 N, 11 E** (230) |

### Por natureza declarada na matriz × classificação verificada

| Natureza (matriz) | Linhas | JÁ RESOLVIDO | NÃO INICIADO | PARCIAL-CÓDIGO | PARCIAL-VALIDAÇÃO | BLOQUEADO-EXTERNO |
|---|---|---|---|---|---|---|
| validacao_operacao | 56 | 1 | 1 | 3 | 44 | 7 |
| codigo_validacao | 14 | 2 | 2 | 8 | 2 | 0 |
| material_pesquisa_operacao | 11 | 0 | 0 | 0 | 0 | 11 |
| pesquisa_compradores | 5 | 0 | 0 | 0 | 5 | 0 |
| adiado_usuario | 3 | 0 | 0 | 0 | 0 | 3 |
| operacao_validacao | 3 | 0 | 0 | 1 | 0 | 2 |
| codigo_operacao | 2 | 0 | 0 | 1 | 1 | 0 |
| aceite_privacidade | 2 | 0 | 0 | 0 | 2 | 0 |
| aceite_integral | 2 | 0 | 0 | 0 | 2 | 0 |
| aceite_editorial | 1 | 0 | 0 | 0 | 1 | 0 |
| validacao_assistiva | 1 | 0 | 0 | 0 | 1 | 0 |
| dados_validacao | 1 | 0 | 0 | 0 | 1 | 0 |
| aceite_operacao | 1 | 0 | 0 | 0 | 0 | 1 |
| operacao | 1 | 0 | 0 | 0 | 0 | 1 |
| material_editorial | 1 | 0 | 0 | 0 | 0 | 1 |
| dispositivos_fisicos | 1 | 0 | 0 | 0 | 1 | 0 |
| ensaio_restore | 1 | 0 | 0 | 0 | 0 | 1 |
| entrega_ausente | 1 | 1 | 0 | 0 | 0 | 0 |
| dados_codigo | 1 | 0 | 0 | 1 | 0 | 0 |
| escopo_documental | 1 | 0 | 0 | 1 | 0 | 0 |
| validacao | 1 | 0 | 0 | 0 | 1 | 0 |
| validacao_semantica | 1 | 0 | 0 | 0 | 1 | 0 |
| escopo_validacao | 1 | 0 | 0 | 0 | 1 | 0 |


Achados por natureza:

- A natureza `codigo_validacao` (14 linhas) é a mais desatualizada: UX35 e UX49 já foram resolvidas, e várias linhas da frente GR continuam com falta real de código.
- Na natureza `validacao_operacao` (56 linhas), 4 linhas na verdade exigem código: UX58 (imagem social por página), GR18 (nomes de comunidades) e GR48 (cronometria), classificadas como PARCIAL-CÓDIGO, e LK44 (link de WhatsApp), classificada como NÃO INICIADO. Já LK12 (menu visual) e GR43 (gatilhos e cache) estão declaradas como `codigo_validacao`.

## 3. Linhas não-I por frente (todas as 112)

### UX — Plano UX 100 (50 linhas não-I)

| ID | Entrega | Estado matriz | Classificação verificada | O que falta (concreto) | Evidência (arquivo:linha) |
|---|---|---|---|---|---|
| UX02 | Continuidade e métricas | P (codigo_operacao) | **PARCIAL-VALIDAÇÃO** — _parcialmente desatualizada_ | Reconciliação guiada entre dispositivos JÁ existe; resta medir o funil em produção (recepção dos eventos) e decidir se haverá sync automático do carrinho (hoje inexistente por desenho). | src/components/SavedSelections.tsx:108-114,216-225 (diálogo de conflito de versão); src/lib/analytics.ts:4-35 (35 eventos de funil); src/context/QuoteCartContext.tsx sem import de customerSelections |
| UX06 | Erros com recuperação útil | P (validacao_operacao) | **BLOQUEADO-EXTERNO** | Homologar Resend/WhatsApp reais (credenciais adiadas pelo usuário). Código de retry/recuperação presente. | api/notifications.ts:293 (RESEND_API_KEY), :337-340 (WHATSAPP_*); src/pages/QuotePage.tsx:332 (retryAssetAttachment) |
| UX11 | Arquitetura da informação | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Teste de localização/tree-test com compradores reais. | src/components/Layout.tsx:154 (nav principal), src/App.tsx:110-127 (rotas); nenhum registro de sessão com compradores em docs/ |
| UX13 | Guia de voz | P (aceite_editorial) | **PARCIAL-VALIDAÇÃO** — _matriz otimista: "revisão por PR implementado" não está no template_ | Aceite editorial de marketing dos exemplos; incluir a nova assinatura "Gift Lovers by Promo" no guia; o template de PR não contém item de revisão de voz. | docs/GUIA_DE_VOZ.md:38-42; .github/pull_request_template.md (sem item de voz/copy); src/components/GiftLoversSignature.tsx (copy nova, 0 ocorrências em GUIA_DE_VOZ.md) |
| UX17 | Painéis e diálogos | P (validacao_assistiva) | **PARCIAL-VALIDAÇÃO** | Revisão assistiva manual (leitor de tela) dos diálogos; teclado/Escape já cobertos. | src/components/SavedSelections.tsx:53 (Escape), :217 (role=alertdialog aria-modal); src/components/ProductGallery.tsx:31-62 (dialog com trap de foco) |
| UX20 | Testar navegação com tarefas | E (material_pesquisa_operacao) | **BLOQUEADO-EXTERNO** | Sessões de tarefa com compradores reais (recrutamento, roteiro, registro). | Nenhum artefato de pesquisa em docs/ (grep "entrevist\|participante\|teste de usabilidade" só retorna planos) |
| UX21 | Ordem da home por intenção | P (pesquisa_compradores) | **PARCIAL-VALIDAÇÃO** | Avaliar a hierarquia da home com compradores. | src/pages/HomePage.tsx:299-318 (ordem de seções); sem pesquisa registrada |
| UX23 | Produtos que mostrem repertório | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Curadoria editorial responsável e revisão de diversidade da vitrine. Observação: a vitrine da home usa só a ordenação por flags do servidor, sem a diversificação de catalogRanking. | src/pages/HomePage.tsx:105 (useCatalog featured/curated); src/lib/catalog.ts:413 (order is_featured,is_bestseller,name); HomePage não importa rankCatalogProducts |
| UX24 | Campanhas distintas | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** — _parcialmente desatualizada_ | Validar pertinência comercial dos resultados por intenção; o código de diferenciação por intenção já existe. | src/lib/catalogRanking.ts:37-50 (campaignScore por moment/audience/scale/mood); src/lib/useCatalogPageState.ts:112-115 |
| UX26 | Case comercial real | E (material_pesquisa_operacao) | **BLOQUEADO-EXTERNO** | Case completo com material autorizado e resultado documentado. | Nenhum case/depoimento em src/pages e src/components (único "case" é kicker em src/components/ConversationForm.tsx:91) |
| UX27 | Como funciona | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Validação comercial das etapas arte→produção→entrega. | src/pages/AboutPage.tsx, src/pages/HomePage.tsx (processo); sem registro de aceite comercial |
| UX28 | Operação e limites | E (material_pesquisa_operacao) | **BLOQUEADO-EXTERNO** | Fotos próprias autorizadas e capacidades/prazos operacionais confirmados. | public/images contém só hero-gen-z-v2*.webp e product-placeholder.svg; nenhuma foto de operação |
| UX30 | Redes e atendimento oficial | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Confirmar titularidade das 4 redes, horário e canal de atendimento oficial. | src/components/Layout.tsx:23-26 (4 redes), :230-231 (tel/mailto); nenhum horário de atendimento em ContactPage/Layout |
| UX31 | Taxonomia de campanhas | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Avaliação comercial sistemática dos rótulos da taxonomia. | src/lib/campaignPresets.ts; src/lib/catalog.ts; sem julgamento comercial registrado |
| UX32 | Sinônimos por intenção | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Conjunto julgado de consultas reais para aceite de relevância dos sinônimos. | src/lib/search.ts; src/lib/searchRelevance.ts:16+ (corpus técnico) |
| UX34 | Amostra de relevância | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Homologação comercial com consultas e resultados reais; os 20 julgamentos atuais são de conceito (query→conceito), não de produtos retornados. | src/lib/searchRelevance.ts:16-45 (20 julgamentos, campo expectedConcepts) |
| UX35 | Ordenação editorial | P (codigo_validacao) | **JÁ RESOLVIDO** — _matriz desatualizada_ | O que a matriz diz faltar (ranking por intenção e diversidade) foi entregue em 23/09 (abd74e6). Resta: julgamento comercial e diversidade global — a diversificação é aplicada só dentro da página corrente; a ordem global entre páginas continua por flags. | src/lib/catalogRanking.ts:68-112 (diversify), :37-50 (intenção); src/lib/useCatalogPageState.ts:112-115; src/lib/catalog.ts:413; src/lib/catalogRanking.test.ts |
| UX40 | Explicar recomendações e vazios | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Aceite comercial da pertinência das recomendações. | src/lib/catalogRanking.ts; src/pages/CatalogPage.tsx (vazios explicáveis) |
| UX41 | Qualidade dos dados | P (dados_validacao) | **PARCIAL-VALIDAÇÃO** | Amostra estratificada de completude/consistência do catálogo inteiro. Avanço: monitor do contrato público (36 colunas, tipos, colunas proibidas) entrou em 01/10, mas valida schema, não completude. | scripts/check-catalog-public-contract.mjs; .github/workflows/catalog-contract.yml; UX_AUDIT_REPORT.md #F06 (2 swatches sem nome, 84 duplicados na origem) |
| UX43 | Especificações e unidades | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Revisão de dados por família para comparabilidade de especificações. | src/lib/catalog.ts:83-89 (dimensions, width/height/length, capacity, weight); dados vêm do catálogo canônico somente leitura |
| UX47 | Personalização comprovada | P (codigo_validacao) | **PARCIAL-CÓDIGO** | Modelar matriz de técnicas/áreas de personalização e exemplos reais por família; o contrato do catálogo só expõe o booleano allows_personalization. Depende também de dados comerciais. | src/lib/catalog.ts:58-92 (select sem técnica/área); src/pages/ProductPage.tsx:186 ("Pode receber sua marca") |
| UX49 | Relacionados relevantes | P (codigo_validacao) | **JÁ RESOLVIDO** — _matriz desatualizada_ | O que a matriz diz faltar (ranking/diversidade dos relacionados) foi entregue em 23/09. Resta julgamento comercial por campanha. | src/lib/catalogRanking.ts:123-137 (rankRelatedProducts); src/pages/ProductPage.tsx:25,32 |
| UX54 | Alternativas de decisão | P (pesquisa_compradores) | **PARCIAL-VALIDAÇÃO** | Teste de compreensão das alternativas com compradores. | api/_lib/sharedSelections.ts:70 (d: alternative); site-supabase/supabase/tests/database/shared_selection_priorities.test.sql |
| UX57 | Link de leitura | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Ciclo real criar→abrir→revogar no deployment. | api/_lib/sharedSelections.ts:8 (MAX 50), :117-127 (token + managementToken + expiresAt); api/shared-selections.ts:73-75 (revoke) |
| UX58 | Prévia de links por conteúdo | P (validacao_operacao) | **PARCIAL-CÓDIGO** | Imagem social específica por coleção/data (hoje única para todas); validar renderização nos canais reais (o og:image é WebP). | api/site-page.ts:18,86,96 (heroImage único); api/_lib/curatedPagePreviews.ts (sem campo de imagem) |
| UX59 | Sincronização após login | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Homologar retomada autenticada em dispositivos físicos. Sync automático do carrinho não existe (decisão de produto pendente). | src/lib/customerSelections.ts:98-145 (versão otimista); src/components/SavedSelections.tsx; QuoteCartContext sem sync remoto |
| UX64 | Formulário com menos esforço | P (pesquisa_compradores) | **PARCIAL-VALIDAÇÃO** | Medir esforço/compreensão do formulário com compradores. | src/pages/QuotePage.tsx; e2e/smoke.spec.ts (regressões R08) |
| UX67 | Confirmação e próximo passo | P (aceite_operacao) | **BLOQUEADO-EXTERNO** | Prazo de resposta, responsável e recebimento pelo atendimento dependem de decisão operacional. A tela de sucesso não informa prazo. Comentário em QuotePage diverge do conteúdo real do e-mail. | src/pages/QuotePage.tsx:355 (texto genérico, sem prazo), :357-364 (comentário diz "sem ação/prazo/verba") vs api/notifications.ts:262-280 (e-mail inclui ação, verba, prazo) |
| UX68 | Cópia por e-mail | P (adiado_usuario) | **BLOQUEADO-EXTERNO** | Credenciais Resend, domínio autenticado e ensaio de recebimento (adiados pelo usuário); aceite editorial do conteúdo. | api/notifications.ts:292-300 (sendEmail exige RESEND_API_KEY/SITE_EMAIL_FROM); api/notification-events-resend.ts |
| UX69 | WhatsApp opcional automático | P (adiado_usuario) | **BLOQUEADO-EXTERNO** | Configuração Meta (token, phone id, template aprovado) e homologação real (adiados). | api/notifications.ts:336-341; api/notification-events-whatsapp.ts |
| UX70 | Passagem ao atendimento | P (codigo_operacao) | **PARCIAL-CÓDIGO** | Não existe produtor de notificação ao comercial: a audiência commercial_team só aparece no CHECK da tabela; o outbox gera apenas audience=customer. Também faltam destino/CRM, responsável e SLA (decisão do dono). | site-supabase/supabase/migrations/20260908230000_create_site_lead_storage.sql:89 (CHECK com commercial_team, única ocorrência no repo); 20260912170000_add_quote_notification_outbox.sql:22,29 (só customer) |
| UX73 | Recuperação e expiração | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Reexecutar recebimento real de e-mail, expiração, reenvio e redefinição. | src/pages/CustomerLoginPage.tsx:52-89 (verifyOtp, signInWithOtp, signUp, resetPasswordForEmail); src/pages/SetPasswordPage.tsx:28 |
| UX75 | Timeline acionável | P (operacao) | **BLOQUEADO-EXTERNO** | Definir responsável e SLA por etapa (decisão operacional); a timeline não tem campos de responsável/prazo; status só muda por escrita administrativa direta (não há back-office). | src/pages/CustomerQuotePage.tsx:228 (status + protocolo, sem responsável/SLA); migrations: record_quote_status_event/enforce_status_transition acionados por UPDATE direto |
| UX76 | Versões de proposta | P (operacao_validacao) | **BLOQUEADO-EXTERNO** | Não há ferramenta de publicação de proposta no repositório: inserts em site_private.proposal_documents só existem em pgTAP. Publicação real de PDF, titular, expiração e recuperação dependem de operação externa. | grep "insert into site_private.proposal_documents": só site-supabase/supabase/tests/database/{lead_storage,customer_portal,customer_data_erasure}.test.sql; api/customer-proposals.ts:125 (URL assinada 60s) |
| UX77 | Pedidos de ajuste | P (operacao_validacao) | **PARCIAL-CÓDIGO** | O pedido de ajuste é persistido como evento, mas não é roteado a um responsável (mesma ausência de commercial_team de UX70); falta operação real. | site-supabase/supabase/migrations/20260910130000_customer_adjustments_and_preferences.sql:86; nenhum produtor de notificação interna |
| UX79 | Isolamento e compartilhamento | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Os bloqueios F28-01/F28-02 citados em 28/09 foram corrigidos com regressões permanentes. Resta homologação de sessão em produção e ensaio assistivo. | src/lib/useOccasionFavorites.test.tsx:255 (F28-01), :407 (F28-02), 24 testes; src/components/BriefingAssetUploader.test.tsx |
| UX80 | Dados e preferências | P (aceite_privacidade) | **PARCIAL-VALIDAÇÃO** | Homologação operacional de acesso/apagamento/preferências do titular. | docs/RUNBOOK_PEDIDO_TITULAR.md; site-supabase/supabase/tests/database/customer_data_erasure.test.sql; src/pages/PrivacyPage.tsx:12 |
| UX84 | Governar publicações/downloads | P (material_editorial) | **BLOQUEADO-EXTERNO** | Localizar PDFs/revistas aprovados, direitos e controle de arquivo; as 10 coleções são online. | src/lib/catalogLibrary.ts:42,54,65,76,87,101,113,124,135,146 (todas format online) |
| UX86 | Proximidade e viabilidade | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Viabilidade comercial das janelas orientativas. | src/lib/commemorativeDates.ts |
| UX88 | Favoritos no planejamento | P (validacao_operacao) | **JÁ RESOLVIDO** — _matriz desatualizada_ | A "sincronização por conta ainda ausente" foi entregue (23/09) e endurecida (24/09, 27/09, 28/09). Resta homologar duas sessões reais. | src/pages/CommemorativeDatesPage.tsx:9,156; src/lib/customerOccasionFavorites.ts:31-39 (RPC list/set); migrations 20260923130000, 20260927103000, 20260928174000; src/lib/useOccasionFavorites.test.tsx (24 testes, inclui storage entre abas :150-217) |
| UX89 | Exportação de calendário | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Importar/reimportar o ICS em Google/Outlook/Apple reais. | src/lib/commemorativeDates.ts:332 (VEVENT/UID) |
| UX91 | Compradores reais | E (material_pesquisa_operacao) | **BLOQUEADO-EXTERNO** | Pesquisa com participantes reais. | Nenhum artefato de pesquisa em docs/ |
| UX92 | Funil com minimização | P (codigo_validacao) | **PARCIAL-VALIDAÇÃO** | Certificar recepção e deduplicação dos eventos no Vercel Analytics (habilitado via API em 28/09, segundo o relatório). | src/App.tsx:103 (Analytics com beforeSend redigido); scripts/smoke-deployment.mjs:47 (exige /_vercel/insights/script.js) |
| UX93 | Orçamento de desempenho | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Ler CWV p75 de campo; a coleta já está instrumentada (Speed Insights), a matriz não a cita. | src/App.tsx:3,104 (SpeedInsights); package.json:72; scripts/check-performance-budget.mjs |
| UX94 | Acessibilidade manual | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Leitor de tela, zoom 200/400% e reflow completos. | e2e/smoke.spec.ts (axe); package.json:80 (@axe-core/playwright) |
| UX95 | Dispositivos/navegadores reais | P (dispositivos_fisicos) | **PARCIAL-VALIDAÇÃO** | Safari/iOS e Android físicos, teclado virtual. | playwright.config.ts (emulação) |
| UX97 | SEO técnico | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Acompanhar indexação em ferramenta externa e validar prévias nos canais. Bloqueio adicional: domínio oficial indefinido — canonical, sitemap e robots apontam para promo-brindes-v1.vercel.app. | api/sitemap.ts:28-37 (coleções, datas, ideias); public/robots.txt (Sitemap vercel.app); src/components/Seo.tsx:35; UX_AUDIT_REPORT.md #F08 (decisão de domínio pendente) |
| UX98 | Dados seguros/reversíveis | P (ensaio_restore) | **BLOQUEADO-EXTERNO** | Drill de restore com RPO/RTO medidos exige responsável, janela e custo aprovados; não há registro de ensaio. | docs/RUNBOOK_RESTORE_SITE.md:3,7,14 (pré-requisitos de decisão); nenhum workflow de restore em .github/workflows |
| UX99 | Matriz ponta a ponta/resiliência | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Entrega real de provedores e falhas operacionais extremas; os probes F28 já viraram regressões. | src/lib/useOccasionFavorites.test.tsx:255,407; tests/api/notifications.test.ts |
| UX100 | Publicar e reavaliar | P (aceite_integral) | **PARCIAL-VALIDAÇÃO** | Aceite integral: conteúdo, pesquisa, operação e reconciliação semântica do ledger (sem atualização desde 22/09). | git log docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv: último commit dafd3d9 (22/09); 104 commits posteriores |

### LK — Benchmark Lukka 50 (31 linhas não-I)

| ID | Entrega | Estado matriz | Classificação verificada | O que falta (concreto) | Evidência (arquivo:linha) |
|---|---|---|---|---|---|
| LK02 | Tarefas com compradores | E (material_pesquisa_operacao) | **BLOQUEADO-EXTERNO** | Sessões de tarefa com compradores. | Nenhum artefato de pesquisa em docs/ |
| LK03 | Acervo autorizado | E (material_pesquisa_operacao) | **BLOQUEADO-EXTERNO** | Inventário de acervo autorizado com direitos de uso. | public/images sem acervo próprio; nenhum inventário em docs/ |
| LK05 | Protótipo antes do desenvolvimento | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Protótipos com aceite do público não comprovados. Desde 05/10 AGENTS.md exige proposta visual aprovada antes de mudanças de design (vale para frente, não retroage). | AGENTS.md (seção "Aprovação visual"); docs/audits/marketing-20260909/*.png (capturas, não protótipos testados) |
| LK06 | Hero fotográfico próprio | P (validacao_operacao) | **BLOQUEADO-EXTERNO** | Acervo fotográfico real autorizado para o hero; hoje é ilustração. | src/pages/HomePage.tsx:132-140 (hero-gen-z-v2.webp); public/images |
| LK09 | Reduzir repetição da home | P (pesquisa_compradores) | **PARCIAL-VALIDAÇÃO** | Observar descoberta/redundância da home com compradores. | src/pages/HomePage.tsx:262-292 (manifesto mantido) |
| LK10 | Categorias fotográficas | N (entrega_ausente) | **JÁ RESOLVIDO** — _matriz desatualizada (N incorreto)_ | Categorias fotográficas entregues em 23/09 (abd74e6): cards com foto de produto publicado da categoria. Ressalva: a foto é o primeiro produto da categoria, não fotografia curada. | src/pages/HomePage.tsx:60-93 (CategoryPhotoCard, img :87), :313 (uso no grid); src/styles.css (category-card--photo) |
| LK12 | Menu visual de categorias | P (codigo_validacao) | **PARCIAL-CÓDIGO** | O menu do cabeçalho é textual; a dimensão fotográfica só existe nos cards da home. Falta também teste de localização. Qualquer mudança visual exige mockup aprovado (AGENTS.md). | src/components/Layout.tsx:154-158 (desktop-nav só com links de texto), :191-197 (mobile) |
| LK14 | Coleções por campanha | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Certificar pertinência/distinção comercial das coleções. | src/lib/campaignPresets.ts; src/lib/catalogLibrary.ts |
| LK17 | Curadoria real | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Julgamento comercial da curadoria por propósito/diversidade. | src/lib/catalogRanking.ts; src/lib/catalogLibrary.ts |
| LK20 | Busca aprofundada | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Amostra real julgada de buscas. | src/lib/search.ts; src/lib/searchRelevance.ts |
| LK22 | Técnica/personalização | P (validacao_operacao) | **BLOQUEADO-EXTERNO** | Lastro de personalização por família (técnicas, áreas, exemplos) depende de dados comerciais; contrato atual não tem esses campos. | src/lib/catalog.ts:58-92; src/pages/ProductPage.tsx:157,186 |
| LK23 | Mínimo/múltiplo/estimativa | P (dados_codigo) | **PARCIAL-CÓDIGO** | Modelar múltiplo de compra e diferenciar mínimo/múltiplo/estimativa; só existe min_quantity. Depende de levantamento comercial. | src/lib/catalog.ts:76,226 (min_quantity); src/types.ts:20 (sem campo de múltiplo) |
| LK25 | Relacionados/compartilhar produto | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** — _parcialmente desatualizada_ | Aceite em dispositivos reais; os cancelamentos nativos (AbortError) já são tratados nos 4 pontos de share. Diversidade por intenção dos relacionados existe (rankRelatedProducts). | src/pages/ProductPage.tsx:121; src/components/QuoteDrawer.tsx:133; src/pages/CatalogsPage.tsx:166; src/pages/CommemorativeDatesPage.tsx:261 |
| LK27 | Modelos de composição | P (validacao_operacao) | **BLOQUEADO-EXTERNO** | Sugestões comerciais por intenção dependem de curadoria aprovada; estruturas neutras existem. | src/lib/kitBuilder.ts:10-14 (templates neutros); src/pages/KitBuilderPage.tsx |
| LK31 | Prova social autorizada | E (material_pesquisa_operacao) | **BLOQUEADO-EXTERNO** | Prova social autorizada. | Nenhum depoimento/logo de cliente em src/ |
| LK32 | Três cases reais | E (material_pesquisa_operacao) | **BLOQUEADO-EXTERNO** | Três cases reais verificáveis. | Nenhum case em src/pages |
| LK33 | Personalização em detalhe | E (material_pesquisa_operacao) | **BLOQUEADO-EXTERNO** | Fotos peça-base, simulação e produção real autorizadas. | public/images sem esse material |
| LK34 | Time e bastidores | E (material_pesquisa_operacao) | **BLOQUEADO-EXTERNO** | Fotos de time/bastidores com autorização de imagem. | public/images; src/components/Layout.tsx:237 promete "bastidores" só nas redes |
| LK35 | Qualidade/ambiente comprovados | P (validacao_operacao) | **BLOQUEADO-EXTERNO** | Lastro documental das alegações de qualidade/ambiente (certificados, laudos). | src/pages/AboutPage.tsx (linguagem cautelosa); sem documentos comprobatórios no repo |
| LK36 | Catálogo editorial nativo | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Revisão editorial e curadoria humanas das coleções. | src/lib/catalogLibrary.ts; shared/catalogEditorial.ts:14-20 (metadados idênticos para as 10) |
| LK37 | Compartilhar seleção inteira | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** — _parcialmente desatualizada_ | Ciclo real no deployment. O "contrato de composição" citado como pendente já existe (kits k/kn/kq/ku no link compartilhado). | api/_lib/sharedSelections.ts:52-70 (validação de composição de kit); api/shared-selections.ts:73 |
| LK39 | Guias úteis | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Autoria, revisão e profundidade prática dos guias. | src/lib/ideaLandings.ts; src/pages/IdeaLandingPage.tsx |
| LK40 | Projeto especial | E (material_pesquisa_operacao) | **BLOQUEADO-EXTERNO** | Confirmação comercial do serviço de projeto especial. | Nenhuma rota/página de projeto especial em src/App.tsx:110-127 |
| LK42 | Formulário enxuto | P (pesquisa_compradores) | **PARCIAL-VALIDAÇÃO** | Medir esforço e linguagem do formulário com compradores. | src/pages/QuotePage.tsx; docs/GUIA_DE_VOZ.md |
| LK44 | WhatsApp iniciado pelo visitante | P (validacao_operacao) | **NÃO INICIADO** — _matriz incorreta: afirma que existe_ | Não existe link de WhatsApp iniciado pelo visitante (wa.me/api.whatsapp) em nenhuma parte do código; existe apenas a preferência de canal no formulário. Falta também número comercial validado. | grep "wa\.me\|api\.whatsapp\.com\|whatsapp://" em src/ api/ e2e/: 0 ocorrências; src/components/ConversationForm.tsx:13 (opção de canal); src/components/Layout.tsx:146,230 (só tel:/mailto:) |
| LK45 | E-mail auditável | P (adiado_usuario) | **BLOQUEADO-EXTERNO** | Configuração Resend e recebimento real (adiados); revisão comercial do conteúdo. | api/notifications.ts:292-300; api/notification-events-resend.ts |
| LK46 | Acessibilidade contínua | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Revisão assistiva e física. | e2e/smoke.spec.ts; .github/workflows/quality.yml |
| LK47 | Desempenho real | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | CWV de campo e comparação de uso real (coleta Speed Insights já instrumentada). | src/App.tsx:104 |
| LK48 | SEO sem checkout | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Indexação em ferramenta externa e prévias reais; imagem social única; domínio oficial ainda indefinido (canonical e sitemap apontam para vercel.app). | public/robots.txt (Sitemap promo-brindes-v1.vercel.app); src/components/Seo.tsx:35; api/site-page.ts:18; UX_AUDIT_REPORT.md #F08 |
| LK49 | Medir funil seguro | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Entrega, deduplicação e interpretação do funil. | src/lib/analytics.ts:92-117; src/App.tsx:103 |
| LK50 | Publicar com reversão | P (aceite_integral) | **PARCIAL-VALIDAÇÃO** | Aceite integral com critérios humanos e reconciliação do ledger. | docs/MATRIZ_INDEX.md; release.yml com candidato→smoke→promote→rollback (mudança de 28/09) |

### GR — Graphify 50 (24 linhas não-I)

| ID | Entrega | Estado matriz | Classificação verificada | O que falta (concreto) | Evidência (arquivo:linha) |
|---|---|---|---|---|---|
| GR04 | Responsabilidades | P (validacao_operacao) | **BLOQUEADO-EXTERNO** | Responsável nominal de manutenção/revisão e procedimento de transferência (decisão de pessoas). Só há CODEOWNERS com um único revisor. | .github/CODEOWNERS (* @adm01-debug); docs/GRAPHIFY.md sem responsável nominal |
| GR08 | Corpus inicial | P (escopo_documental) | **PARCIAL-CÓDIGO** — _parcialmente desatualizada_ | Passe documental não implementado. Avanço: migrations/pgTAP passaram a corpus próprio em 06/10. Números da matriz (259 arquivos, 1647 nós) estão superados. | .graphify.project.json:9-23 (sourceRoots sem docs; databaseSourceRoots); docs/GRAPHIFY.md (seção "Dois mapas"); commit 8ca1228 |
| GR15 | Identidades/caminhos | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Amostra completa de homônimos, aliases e chamadas indiretas. Avanço: ambiguidade é recusada e tipos TS foram enriquecidos. | tests/graphify-tools.node.mjs:52,174 (ambiguidade); :134 (type_reference) |
| GR16 | Evidência por relação | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Classificação EXTRACTED/INFERRED/AMBIGUOUS por relação e auditabilidade integral. | tests/graphify-tools.node.mjs:44 (explain preserva fonte e confiança) |
| GR18 | Comunidades | P (validacao_operacao) | **PARCIAL-CÓDIGO** | Curadoria de nomes e medida de coesão das comunidades; o wrapper só agrupa por id numérico. | scripts/graphify-quality.mjs:305-311 (agrupa por node.community, sem rótulo) |
| GR20 | Promoção atômica | P (codigo_validacao) | **PARCIAL-VALIDAÇÃO** | Teste de interrupção e disco cheio na promoção atômica; lock e staging existem. | scripts/graphify.mjs:341-361 (lock), tests/graphify-tools.node.mjs:72 (staging); nenhum teste ENOSPC/SIGINT |
| GR25 | Impacto→testes | P (codigo_validacao) | **PARCIAL-CÓDIGO** | Seleção de testes afetados a partir do impacto e benchmark dessa seleção. | scripts/graphify.mjs (graph:impact só vizinhança); nenhum comando de seleção de testes |
| GR27 | Renomes/exclusões/branches | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Matriz de renome/branch/exclusão; fingerprint cobre mudança de conteúdo. | tests/graphify-tools.node.mjs:61 (fingerprint) |
| GR31 | Documentos selecionados | P (codigo_validacao) | **NÃO INICIADO** | Nenhum .md no grafo; passe documental fora da automação por decisão de privacidade. | .graphify.project.json:9-18; docs/GRAPHIFY.md (última seção: passe semântico é tarefa separada) |
| GR32 | Pass semântico separado | P (codigo_validacao) | **NÃO INICIADO** | Passe semântico separado não existe. | .graphify.project.json:26-31 (usesAiProvider false, mode code-only) |
| GR33 | Contratos até RPC/SQL | P (codigo_validacao) | **PARCIAL-CÓDIGO** | Cadeia payload→handler→RPC→migration; com o SQL movido para um mapa separado (06/10), a cadeia agora atravessa dois grafos sem ligação entre eles. | docs/GRAPHIFY.md ("Dois mapas"); tests/graphify-tools.node.mjs:239 (impede mistura) |
| GR34 | Fronteiras dos bancos | P (codigo_validacao) | **PARCIAL-CÓDIGO** | Representar catálogo canônico (leitura) e banco isolado como destinos distintos no grafo; os guardas existem só no código. | src/lib/siteSupabaseConfig.ts:1-2; scripts/validate-site-supabase-target.mjs:3; sem nós/rótulos de fronteira no wrapper |
| GR35 | Código/flag/migration/deploy | P (codigo_validacao) | **PARCIAL-CÓDIGO** | Representar flags, migrations e evidências de deploy como camadas distintas no grafo. | scripts/graphify.mjs (sem modelagem de flag/deploy) |
| GR36 | Requisitos→implementação | P (codigo_validacao) | **PARCIAL-CÓDIGO** | Vínculo mantido requisito→fonte→teste (ledger ↔ grafo). | scripts/validate-closure-ledger.mjs (validação só estrutural); nenhum consumo do ledger em scripts/graphify*.mjs |
| GR37 | Memória técnica revisável | P (validacao) | **PARCIAL-VALIDAÇÃO** | Ensaio do ciclo de correção de memória errada, validade e atualização por commit. | docs/GRAPHIFY.md; sem procedimento de memória versionado |
| GR39 | Visualização local | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Retestar acessibilidade, filtros e segurança visual do HTML local. | docs/GRAPHIFY.md (graph.html, GRAPH_TREE.html) |
| GR42 | Permissões/artefatos | P (validacao_operacao) | **BLOQUEADO-EXTERNO** | Ativar secret scanning/push protection e restringir Actions/Environments (configuração do repositório pelo dono). | docs/REVISAO_PLANOS_20260928.md seção 4 (APIs GitHub: desativados); .github/workflows/graphify.yml:80 (retention-days 14) |
| GR43 | Gatilhos/cache específicos | P (codigo_validacao) | **PARCIAL-CÓDIGO** | Gatilhos por caminho e cache do grafo por corpus; o workflow roda em todo PR/push e só faz cache de npm/pip. | .github/workflows/graphify.yml:3-6 (sem paths:), :33-39 (cache npm/pip) |
| GR45 | Conteúdo hostil | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Matriz hostil completa (HTML em labels, instruções em comentários, symlinks); hoje há varredura de tokens e caminhos fora da raiz. | tests/graphify-tools.node.mjs:92,256,269 |
| GR46 | Falhas e concorrência | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Simular parser indisponível, timeout, disco cheio e interrupção. | tests/graphify-tools.node.mjs (17 testes, nenhum de timeout/ENOSPC/SIGINT) |
| GR47 | Cobertura/precisão | P (validacao_semantica) | **PARCIAL-VALIDAÇÃO** | Certificar precisão semântica, aliases e relações indiretas. | docs/graphify-benchmark.json (10 perguntas estruturais); docs/GRAPHIFY_0968_EVALUATION_20261005.md |
| GR48 | Desempenho/regressões | P (validacao_operacao) | **PARCIAL-CÓDIGO** | Medir tempo de geração completa, consulta e fixture grande; a comparação de 05/10 mede contagens, não tempo. | scripts/graphify.mjs (sem cronometria); docs/GRAPHIFY_0968_EVALUATION_20261005.md (só contagens) |
| GR49 | Recuperação/upgrade | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** — _parcialmente desatualizada_ | Ensaio de restauração do último snapshot. Avanço: upgrade validado em candidato isolado (0.9.68, 05/10) sem trocar o pin. | docs/GRAPHIFY_0968_EVALUATION_20261005.md; requirements-graphify.txt |
| GR50 | Publicar/acompanhar | P (escopo_validacao) | **PARCIAL-VALIDAÇÃO** | Passe documental, recuperação adversarial e revisão de utilidade após ciclo real. | .github/workflows/graphify.yml; docs/graphify-benchmark.json |

### AC — Área do Cliente 30 (7 linhas não-I)

| ID | Entrega | Estado matriz | Classificação verificada | O que falta (concreto) | Evidência (arquivo:linha) |
|---|---|---|---|---|---|
| AC04 | Link/código por e-mail | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Reexecutar entrega real de código/link por e-mail. | src/pages/CustomerLoginPage.tsx:52,59 |
| AC06 | Criar senha/confirmar e-mail | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Aceite atual de e-mail real e ciclo de criação de senha. | src/pages/CustomerLoginPage.tsx:76; src/pages/SetPasswordPage.tsx:28 |
| AC07 | Recuperar/redefinir senha | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Testar expiração e recebimento reais de recuperação. | src/pages/CustomerLoginPage.tsx:89 |
| AC10 | Sessão persistente/refresh | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Ensaio autenticado ponta a ponta de refresh/expiração; o despacho após troca de sessão (F28-01) foi corrigido e a inicialização da autenticação ficou recuperável em 06/10. | src/lib/useOccasionFavorites.test.tsx:255,273; src/context/CustomerAuthContext.test.tsx (commit 3f82233) |
| AC24 | Versões publicadas | P (operacao_validacao) | **BLOQUEADO-EXTERNO** | Não existe ferramenta de publicação de proposta no site (somente pgTAP insere documentos). O ciclo publicação→acesso→ajuste depende de operação externa. | grep "insert into site_private.proposal_documents": só tests/database; api/customer-proposals.ts:125 |
| AC29 | Aviso de privacidade | P (aceite_privacidade) | **PARCIAL-VALIDAÇÃO** | Validação operacional do atendimento de direitos do titular. | docs/RUNBOOK_PEDIDO_TITULAR.md; src/pages/PrivacyPage.tsx |
| AC30 | Cobertura automatizada completa | P (validacao_operacao) | **PARCIAL-VALIDAÇÃO** | Certificação de entrega de e-mail, expiração real e operação comercial; as lacunas F28 foram fechadas por regressões. | src/lib/useOccasionFavorites.test.tsx:255,407; e2e/smoke.spec.ts |


## 4. Amostragem crítica de linhas marcadas I (33 linhas)

| ID(s) | Entrega | Verificação | Resultado |
|---|---|---|---|
| UX44, LK21 | Galeria com ampliação | A galeria foi reescrita em 06/10 (`f7022c4`). `src/components/ProductGallery.tsx:31-62` tem `<dialog>` modal, Escape, clique no fundo e trap de foco; `e2e/product-detail.spec.ts` foi criado | Confirmado |
| UX55, LK38 | Impressão/PDF | `src/styles.css:6762` (`@media print`); `src/pages/QuotePage.tsx:400` (`window.print`) | Confirmado |
| UX56 | Compartilhamento opaco e revogável | `api/_lib/sharedSelections.ts:117-127` (token, hash do management token, `expiresAt`), `:143` (revoke) | Confirmado |
| UX65, LK43 | Anexos protegidos | `api/_lib/fileSignatures.ts:4-7`: só *magic bytes* de PNG, JPEG e WebP. PDF retirado do bucket em `20260927161243_harden_briefing_assets_and_audits.sql:11-14` | Confirmado no escopo técnico, com ressalva: verificar a assinatura do arquivo não equivale a sanitizá-lo |
| UX50, LK24 | Comparar três | `src/lib/catalogComparison.ts:4,28` (`MAX_COMPARISON_ITEMS = 3`) | Confirmado |
| UX53, UX60 | Campanhas e conflitos | `src/components/SavedSelections.tsx:108-130,216-225`; `src/lib/customerSelections.ts:98-145` | Confirmado |
| **UX83, LK15** | Editorial com responsável, revisão e validade | `shared/catalogEditorial.ts:14-20`: **um único objeto `commonGovernance`** (owner "Marketing Promo Brindes", `reviewedAt: 2026-09-22`, `reviewDueAt: 2027-09-22`) é aplicado às 10 coleções. O mecanismo de publicação, retirada e expiração existe (`:60-70`), mas os metadados foram declarados pela engenharia e não registram uma revisão real. A própria LK36 (P) diz que a "revisão editorial" está pendente | **Questionável: deveria ser P** |
| LK26, LK28, LK29 | Kits | `src/lib/kitBuilder.ts:10-31`; `site-supabase/supabase/tests/database/kit_composition.test.sql` (9 asserções); `api/_lib/sharedSelections.ts:52-70` | Confirmado |
| UX96 | Movimento intencional | `src/components/FoldText.tsx`, `GlitchText.tsx`; 8 blocos `prefers-reduced-motion` em `src/styles.css` | Confirmado |
| UX25, LK08 | Quatro frases da marca | `src/pages/HomePage.tsx:267,275,281,288`; `e2e/smoke.spec.ts:239-242` | Confirmado |
| UX05 | Autocomplete | `src/components/SearchAutocomplete.tsx:109` (`aria-activedescendant`) | Confirmado |
| AC11, AC12 | Secret fora do bundle e Auth isolado | `src/lib/siteSupabaseConfig.ts:1-2,26` (recusa `sb_secret_`, projeto `xlzmclcjdncjfdrjxclt`) | Confirmado |
| AC25, AC26 | Bucket PDF de 20 MB e URL de 60 s | `20260909180000_create_customer_quote_portal.sql:41-47`; `api/customer-proposals.ts:125` | Confirmado. Ressalva: o bucket existe, mas nada no repositório publica PDFs nele (ver divergência D2) |
| AC14 | Associação a e-mail confirmado | `20260923120000_audit_security_reliability_hardening.sql:344` (`email_confirmed_at is not null`) | Confirmado |
| UX78, AC23 | Repetir sem perda | `src/pages/CustomerQuotePage.tsx:133` (`fetchProductsByIds` antes de substituir) | Confirmado |
| UX46 | Mínimo conferido no servidor | `api/_lib/catalogValidation.ts:81,106` | Confirmado |
| UX45 | Cores e variantes | O código trata ambiguidade, mas a origem tem 2 swatches sem nome e 84 nomes duplicados (`UX_AUDIT_REPORT.md` #F06) | Confirmado no código; problema de dados é externo |
| UX81 | Online, PDF e revista distintos | Só os tipos existem (`src/lib/catalogLibrary.ts:5`); as 10 publicações são online | Confirmado no escopo declarado; nenhuma publicação não-online existe (ver UX84) |
| AC20 | Eventos reais de status | Trigger `record_quote_status_event`/`enforce_status_transition` | Confirmado no escopo técnico. Ressalva: não há back-office; o status só muda por UPDATE administrativo direto |
| GR13 | Reconstruir mapa | A evidência "1099 nós / 2416 relações a partir de f20df44" está vencida: a avaliação de 05/10 registra 2.028 nós e 4.056 relações. O `graph:status` não roda neste clone sem dependências | Confirmado (I técnico), mas a evidência citada é obsoleta |
| GR29, GR44 | Instruções aos agentes e relatório base/head | `AGENTS.md` (seção Graphify); `.github/workflows/graphify.yml:57-70` | Confirmado |

**Resultado da amostragem:** das 33 linhas I verificadas, 31 se sustentam. **UX83 e LK15 são, na prática, parciais.** Seis linhas se sustentam com ressalvas relevantes (UX65/LK43, UX45, AC20, AC25/AC26 e UX81), e GR13 cita uma evidência numérica vencida.

## 5. Divergências matriz × código

### Linhas em que a matriz está errada ou desatualizada

| # | Gravidade | Divergência | Evidência |
|---|---|---|---|
| D1 | **Alta** | **LK44 afirma que "WhatsApp iniciado pelo visitante existe", mas não existe.** Não há `wa.me`, `api.whatsapp.com` nem `whatsapp://` em `src/`, `api/` ou `e2e/`. O que existe é só a opção "Por WhatsApp" como canal preferido no formulário, e o cabeçalho e o rodapé oferecem apenas `tel:` e `mailto:`. | `src/components/ConversationForm.tsx:13`; `src/components/Layout.tsx:146,230-231`; grep com 0 ocorrências |
| D2 | **Alta** | **Falta a passagem ao comercial e a ferramenta de operação.** O portal do cliente exibe dados que nada no repositório produz, exceto SQL direto: (a) a audiência `commercial_team` só aparece no CHECK da tabela de entregas e não há produtor; (b) o outbox gera apenas `audience='customer'`; (c) `site_private.proposal_documents` só recebe inserts em pgTAP; (d) os status mudam por UPDATE administrativo. UX70, UX75, UX76, UX77 e AC24 estão classificadas como "operação/validação", mas falta código ou um sistema externo identificado. Hoje um briefing chega ao banco e ninguém é notificado. | `20260908230000_create_site_lead_storage.sql:89`; `20260912170000_add_quote_notification_outbox.sql:22,29`; inserts em `proposal_documents` apenas em `tests/database/*.test.sql` |
| D3 | Média | **LK10 (o único N) já foi entregue** em 23/09 (`abd74e6`) com `CategoryPhotoCard`. | `src/pages/HomePage.tsx:60-93,313` |
| D4 | Média | **UX35 e UX49** ainda dizem que o ranking por intenção e diversidade "não está comprovado". `catalogRanking.ts` existe e é usado no catálogo e nos relacionados. | `src/lib/catalogRanking.ts:37-137`; `src/lib/useCatalogPageState.ts:112-115`; `src/pages/ProductPage.tsx:32` |
| D5 | Média | **UX88** ainda diz "sincronização por conta ausente". RPCs, migrations e 24 testes do hook já existem. | `src/lib/customerOccasionFavorites.ts:31-39`; `src/lib/useOccasionFavorites.test.tsx` |
| D6 | Média | **UX83 e LK15 (I)** usam metadados editoriais sintéticos e idênticos para as 10 coleções, o que contradiz LK36 (P). | `shared/catalogEditorial.ts:14-20` |
| D7 | Baixa | Linhas parcialmente desatualizadas, com pendência citada já resolvida: **UX02** (reconciliação guiada existe), **UX24** (diferenciação por intenção existe), **LK25** (os 4 cancelamentos nativos tratam AbortError), **LK37** (o contrato de composição de kit existe no link compartilhado), **GR08** (o SQL ganhou corpus próprio; os números de 259 arquivos e 1647 nós estão superados) e **GR49** (upgrade validado em candidato isolado em 05/10). | Ver as tabelas da seção 3 |
| D8 | Baixa | **UX13** diz "revisão por PR implementado", mas `.github/pull_request_template.md` não tem item de voz ou copy. A nova assinatura "Gift Lovers by Promo" (`77f0ff1`, 06/10) não consta do `GUIA_DE_VOZ.md`. | Template de PR; `src/components/GiftLoversSignature.tsx` |
| D9 | Baixa | **UX93 e LK47** dizem que não há CWV de campo, mas a coleta já está instrumentada (`SpeedInsights`). Falta só ler e aceitar o p75. | `src/App.tsx:3,104` |

### Problemas de governança do próprio ledger

| # | Gravidade | Divergência | Evidência |
|---|---|---|---|
| G1 | **Alta** | **O ledger está congelado desde 22/09** (último commit `dafd3d9`), embora tenham entrado 104 commits depois: favoritos por conta, ranking e diversidade, categorias fotográficas, preflight anti-abuso, monitor do contrato do catálogo, release candidato→smoke→promote→rollback, dois corpora Graphify, nova ficha de produto e assinatura de marca. O `MATRIZ_INDEX.md` ainda chama 118/100/1/11 de "Distribuição vigente", enquanto o próprio relatório de 28/09 admite notas vencidas. | `git log -- docs/MATRIZ_FECHAMENTO_PLANOS_20260912.csv` |
| G2 | Média | **229 das 230 linhas apontam `commit_auditado` anterior a 22/09.** São 171 linhas em `f20df44…` e 58 em outros 6 SHAs, nenhum disponível neste clone raso. Só UX77, com `05f0a06` (22/09), está presente. Por isso `npm run ledger:check` falha em clones rasos ("fonte … não existe no commit auditado de UX01"). No CI o checkout usa `fetch-depth: 0` e não falha. É uma questão de ambiente, mas mostra que o validador garante só estrutura e histórico, não atualidade. | `node scripts/validate-closure-ledger.mjs` neste clone; `.github/workflows/quality.yml:24-26` |
| G3 | Média | **16 linhas P são, de fato, bloqueios externos** (lista na seção 2). Marcá-las como P mistura "falta trabalho de engenharia" com "falta decisão ou insumo" e infla a percepção de backlog técnico. | Seção 2 |

### Lacunas transversais observadas no código

| # | Gravidade | Divergência | Evidência |
|---|---|---|---|
| X1 | Média | **SEO e prévias sem domínio oficial.** Canonical, sitemap e robots apontam para `promo-brindes-v1.vercel.app`, e a escolha do domínio está pendente. A imagem social é única para todas as coleções e datas e está em WebP, o que pode não renderizar em alguns canais. Afeta UX58, UX97 e LK48. | `public/robots.txt`; `src/components/Seo.tsx:35`; `api/site-page.ts:18,86,96`; `UX_AUDIT_REPORT.md` #F08 |
| X2 | Baixa | O comentário em `QuotePage.tsx:357-364` diz que o e-mail vai "sem ação/prazo/verba", mas `api/notifications.ts:262-280` inclui ação, verba, prazo, data especial e kits. A documentação está desalinhada com o comportamento (UX67/UX68). | Arquivos citados |
| X3 | Baixa | A vitrine da home não usa a diversificação: ordena só por `is_featured`/`is_bestseller`. A diversificação do catálogo vale apenas dentro da página corrente (UX23/UX35). | `src/pages/HomePage.tsx:105`; `src/lib/catalog.ts:413` |
| X4 | Info | Desde 05/10, `AGENTS.md` exige proposta visual aprovada antes de qualquer mudança de design. Isso condiciona o fechamento de LK12, UX58 (imagem) e de outras linhas que mexem no layout: o próximo passo é um mockup, não código. | `AGENTS.md` |

## 6. Próximos passos sugeridos para reconciliar o ledger

1. Atualizar LK10, UX35, UX49 e UX88 (texto, natureza e `commit_auditado` no HEAD atual) e as seis linhas parcialmente desatualizadas da D7.
2. Corrigir LK44 para N, ou implementar o link contextual com número validado, e rebaixar UX83 e LK15 para P até haver revisão editorial real.
3. Registrar como lacuna de código (ou dependência de um sistema externo nomeado) a ausência de roteamento ao comercial e de publicação de propostas (D2).
4. Mudar a natureza das 16 linhas P bloqueadas para uma categoria externa, mantendo-as visíveis como dependência, para que o backlog técnico real (18 linhas) fique claro.
5. Atualizar `MATRIZ_INDEX.md` para não chamar de "vigente" uma contagem que não reflete o HEAD.
