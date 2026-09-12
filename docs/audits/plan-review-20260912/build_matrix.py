"""Materializa a revisão manual das 230 referências; não infere conclusão pelo grafo."""
import csv
import json
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[3]
sources = {
    'BASE': 'docs/PLANO_UX_100_ETAPAS_20260909.md; docs/RELATORIO_EXPERIENCIA_MARKETING_GEN_Z_20260909.md; docs/audits/plan-review-20260912/http-production.json',
    'QA': 'e2e/smoke.spec.ts; playwright.config.ts; .github/workflows/quality.yml; docs/audits/plan-review-20260912/simulations.json',
    'NAV': 'src/components/Layout.tsx; src/App.tsx; e2e/smoke.spec.ts',
    'HOME': 'src/pages/HomePage.tsx; src/styles.css; e2e/smoke.spec.ts',
    'CAT': 'src/lib/catalog.ts; src/lib/search.ts; src/pages/CatalogPage.tsx; src/components/CatalogFilterPanel.tsx; src/lib/catalog.test.ts; src/lib/search.test.ts',
    'CUR': 'src/lib/campaignPresets.ts; src/lib/ideaLandings.ts; src/lib/catalogLibrary.ts; src/components/CampaignFinder.tsx',
    'PROD': 'src/pages/ProductPage.tsx; src/components/ProductCard.tsx; src/lib/productBadges.ts; api/_lib/catalogValidation.ts; docs/audits/plan-review-20260912/simulations.json',
    'CART': 'src/context/QuoteCartContext.tsx; src/components/QuoteDrawer.tsx; src/lib/quoteItems.ts; src/lib/catalogComparison.ts; src/context/QuoteCartContext.test.ts',
    'QUOTE': 'src/pages/QuotePage.tsx; src/lib/quoteDraft.ts; src/lib/quoteBriefing.ts; src/lib/http.ts; api/_lib/contracts.ts; tests/api/lead-requests.test.ts; docs/audits/plan-review-20260912/simulations.json',
    'SHARE': 'src/lib/sharedSelection.ts; src/pages/SharedSelectionPage.tsx; api/shared-selections.ts; tests/api/shared-selections.test.ts; src/lib/sharedSelection.test.ts',
    'AUTH': 'src/context/CustomerAuthContext.tsx; src/lib/siteSupabaseConfig.ts; src/pages/CustomerLoginPage.tsx; src/pages/AuthConfirmPage.tsx; src/pages/SetPasswordPage.tsx',
    'ACCOUNT': 'src/pages/CustomerAccountPage.tsx; src/pages/CustomerQuotePage.tsx; src/lib/customerAccount.ts; api/customer-proposals.ts; tests/api/customer-proposals.test.ts',
    'DB': 'site-supabase/supabase/migrations; site-supabase/supabase/tests/database/customer_portal.test.sql; site-supabase/supabase/tests/database/lead_storage.test.sql; docs/audits/plan-review-20260912/database-readonly.json',
    'LIB': 'src/lib/catalogLibrary.ts; src/pages/CatalogsPage.tsx; src/lib/catalogLibrary.test.ts',
    'DATE': 'src/lib/commemorativeDates.ts; src/pages/CommemorativeDatesPage.tsx; src/lib/commemorativeDates.test.ts',
    'METRIC': 'src/lib/analytics.ts; src/lib/analytics.test.ts; scripts/check-performance-budget.mjs; src/App.tsx',
    'SEO': 'api/site-page.ts; api/product-page.ts; api/_lib/publicProductPage.ts; api/sitemap.ts; vercel.json; docs/audits/plan-review-20260912/http-production.json',
    'GRAPH': 'scripts/graphify.mjs; .graphify.project.json; .github/workflows/graphify.yml; tests/graphify-tools.node.mjs; docs/GRAPHIFY.md',
    'OPS': 'README.md; api/_lib/siteDatabase.ts; src/pages/AboutPage.tsx; src/pages/ContactPage.tsx; src/pages/PrivacyPage.tsx',
}

# ID | estado técnico | fontes | conclusão revista e aceite ainda necessário.
review = """
UX01|I|BASE|Inventário e planos localizados; esta revisão atualiza evidências e distingue simulações de produção.
UX02|P|CART,METRIC|Persistência local e eventos existem; faltam métricas operacionais e resolução de conflitos entre campanhas/dispositivos.
UX03|P|QA|Regressões anteriores cobertas; B01-B06 e instabilidade WebKit B07 ainda não integram os gates permanentes.
UX04|I|CAT,QA|Novidades consultáveis em produção e lógica coberta; catálogo não exige estoque positivo.
UX05|I|CAT,QA|Autocomplete fechado não intercepta atalhos; teclado e aria-activedescendant cobertos.
UX06|P|QUOTE,ACCOUNT|Recuperação existe; mínimo desconhecido gera mensagem incorreta B02 e erro com detalhe anterior é ocultado B04.
UX07|P|QUOTE|Rascunho de 24h existe; após sucesso o efeito o recria com contato e consentimento B01.
UX08|I|CART,CAT|Comparação em sessão revalida IDs e avisa sobre remoção ou fallback; não é sincronização entre dispositivos.
UX09|I|CUR,QUOTE|Contexto estruturado acompanha descoberta e briefing; duplicação de link limpa contexto anterior.
UX10|P|QA|Correções anteriores publicadas; novos defeitos e execução WebKit com falha impedem encerrar estabilização.
UX11|P|NAV|Destinos por tarefa implementados; testes de localização com compradores ainda ausentes.
UX12|P|NAV,QUOTE|Nomes principais padronizados; Abrir radar ainda é CTA funcional no orçamento vazio e falta aceite de compreensão.
UX13|P|HOME,OPS|Referências visíveis ao atendimento seguem o vocabulário aprovado; guia com exemplos e governança ainda incompleto.
UX14|I|HOME,NAV|Tokens e componentes compartilhados presentes; não equivale à certificação manual de acessibilidade.
UX15|I|NAV,QA|Cabeçalho oferece catálogo busca seleção e conta; percursos desktop/mobile automatizados.
UX16|I|NAV,QA|Busca e menu móvel funcionam na cobertura automatizada; dispositivos físicos ficam em UX95.
UX17|P|NAV,ACCOUNT|Diálogos possuem foco/Escape; confirmação de repetição não bloqueia scroll como compartilhamento e falta revisão assistiva completa.
UX18|P|NAV,CAT|ScrollManager mantém posições por chave; retorno com carregamento assíncrono ainda sem matriz completa.
UX19|I|SEO,QA|Rotas inválidas retornam 404 com shell próprio; estados vazio e recuperação presentes.
UX20|E|BASE|Não há sessões documentadas com compradores reais; auditoria técnica é evidência distinta.
UX21|P|HOME|Home reorganizada; ainda falta demonstrar eficácia da ordem com tarefas do público.
UX22|I|HOME,QUOTE|Promessa e ausência de pagamento explícitas; compreensão por público real não certificada.
UX23|P|HOME,CUR|Produtos reais aparecem; seleção editorial responsável e revisão de diversidade não demonstradas.
UX24|P|CUR,CAT|Onboarding não impõe mais kits; diferenciar resultados por intenção e validar pertinência ainda pendente.
UX25|I|HOME,QA|Quatro frases exatas presentes no manifesto e verificadas pelos testes.
UX26|E|HOME,OPS|Modelo completo de case com material autorizado e resultado documentado não localizado.
UX27|P|HOME,OPS|Processo apresentado; etapas de arte produção e entrega dependem de validação comercial.
UX28|E|OPS|Fotos próprias autorizadas e capacidades/prazos operacionais precisam confirmação.
UX29|I|OPS,QUOTE|Contato inclui mensagem e preferência de canal; persistência não equivale a notificação.
UX30|P|NAV,OPS|Quatro redes e links acessíveis presentes; titularidade horários e atendimento real não revalidados.
UX31|P|CAT,CUR|Taxonomia implementada; sem avaliação comercial sistemática dos rótulos editoriais.
UX32|P|CAT,CUR|Sinônimos e onboarding separados de kit; ausência de conjunto julgado limita aceite de relevância.
UX33|I|CAT|Correção sugerida de digitação e preservação de códigos cobertas por testes.
UX34|N|CAT,BASE|Não há dataset de consultas com julgamentos comerciais e resultados esperados.
UX35|P|CAT,CUR|Ordenação por flags existe; ranking por intenção e diversidade não comprovado.
UX36|I|PROD,QA|Badge único com prioridade novidade-kit-personalização e janela temporal testados.
UX37|I|CAT,QA|Grupos filtros por IDs chips e busca interna implementados/testados.
UX38|I|CAT,QA|Painel móvel combina filtros preserva URL e retorna foco.
UX39|P|CAT,NAV|Paginação e URL existem; posição exata após navegação/carga e todos os estados não certificadas.
UX40|P|CAT,CUR|Filtros e vazios explicáveis; pertinência comercial de recomendações ainda sem aceite.
UX41|P|PROD,CAT|Amostra pública desta rodada limitada; inconsistência de mínimo nulo no servidor B02 exige correção e amostra estratificada.
UX42|I|PROD|Resumo e descrição completa separados na ficha; não implica qualidade factual de todo cadastro.
UX43|P|PROD|Ausências e unidades apresentadas; comparabilidade por família exige revisão dos dados.
UX44|I|PROD,QA|Miniaturas zoom Escape e fallback implementados; testes aprovados nos recortes de galeria.
UX45|P|PROD,SHARE|Compartilhamento preserva variantes removidas; reconciliação de orçamento ainda aceita variante inexistente B03.
UX46|P|PROD,QUOTE|Digitação com rascunho corrigida nos três pontos; mínimo nulo B02 e instabilidade WebKit B07 permanecem.
UX47|P|PROD,OPS|FAQ orienta personalização; matriz de técnicas/áreas e exemplos reais por família ausentes.
UX48|I|PROD,QUOTE|FAQ contextual centralizada no catálogo produto e briefing; cobertura existente aprovada.
UX49|P|PROD,CUR|Relacionados por categoria excluem produto atual; ranking/diversidade por campanha não demonstrados.
UX50|I|CART,CAT|Comparação de até três referências com dimensões material capacidade e ausências implementada.
UX51|I|CART,QA|Salvar atualizar contador e limite de cinquenta possuem feedback e testes.
UX52|I|CART,SHARE|Desfazer remoção/limpeza e confirmar substituição estão implementados; antigos gaps de duplicação encerrados.
UX53|P|CART|Uma seleção pode ser nomeada; não há várias campanhas independentes.
UX54|P|CART,SHARE|Principal/alternativa existe; contrato compartilhado omite grupo decisório e falta teste de compreensão.
UX55|P|QUOTE|Impressão disponível; PDF extenso imagens ausentes observações e paginação não retestados nesta rodada.
UX56|I|SHARE,DB|Modelo opaco revogável com segredo separado e prazo definido implementado; links antigos têm contrato distinto.
UX57|P|SHARE,DB|Leitura e revogação implementadas com limite 50 aplicado; falta novo ciclo real criar-abrir-revogar no deployment.
UX58|P|SEO|Shell e metadados públicos corrigidos; prévia específica de cada coleção/data por parâmetros ainda incompleta.
UX59|N|CART,ACCOUNT|Histórico de pedidos não sincroniza rascunhos; biblioteca remota de seleções por conta ausente.
UX60|N|CART|StorageEvent substitui estado sem resolver concorrência; faltam arquivamento restauração e versões de campanhas.
UX61|I|CUR,QUOTE|Resumo editável de nome ocasião intenção e briefing presente.
UX62|I|QUOTE|Verba opcional exige escopo quando definida; sem preço comercial calculado.
UX63|P|QUOTE|Recebimento e evento separados; UI deixa data de evento passada sair ao servidor B05 e fuso usa regras distintas.
UX64|P|QUOTE|Labels validações e rascunho existem; B01 B02 B05 e reteste integral do formulário impedem aceite.
UX65|N|QUOTE,DB|Estado da identidade visual é apenas select; upload privado de logo/referência não implementado.
UX66|I|QUOTE,DB|Identidade da tentativa e transação idempotente no fluxo principal testadas; entrega de mensagens é requisito separado.
UX67|P|QUOTE,OPS|Protocolo e confirmação existem; limpeza falha B01 e não há comprovação de recebimento pelo responsável comercial.
UX68|N|OPS,DB|Sem outbox alimentada worker provedor retries e prova de entrega de cópia do orçamento por e-mail.
UX69|N|OPS,DB|WhatsApp iniciado pelo visitante existe; cópia automática e respectiva cadeia de entrega ausentes.
UX70|P|OPS,ACCOUNT|Pedido armazenado; encaminhamento responsável SLA e ciclo comercial ainda não demonstrados.
UX71|I|AUTH|Login opcional com escolhas de método; visitante consegue solicitar sem conta.
UX72|I|AUTH,QA|Campos validação mostrar senha e mensagens implementados/testados.
UX73|P|AUTH|Callback e recuperação implementados; e-mail real expiração reenvio e redefinição não reexecutados nesta revisão.
UX74|I|ACCOUNT,DB|Lista por titular com busca filtros paginação e nome de ação implementada.
UX75|P|ACCOUNT,OPS|Eventos persistidos apresentados; falta responsabilidade/encaminhamento operacional e recuperação do detalhe B04.
UX76|P|ACCOUNT|Versões e link privado existem; proposta vencida continua com destaque Versão atual sem estado Expirada B06.
UX77|P|ACCOUNT,DB|Ajuste idempotente corrigido; entrega comercial não comprovada e erro na releitura pode ser ocultado B04.
UX78|P|ACCOUNT,PROD|Repetição confirma troca e copia snapshot; não revalida variantes/mínimos na interface antes de repor B03.
UX79|P|AUTH,DB,QUOTE|Tabelas privadas protegidas e testes cruzados locais; B01 e ciclo de estado em memória/logoff não encerrados.
UX80|P|QUOTE,DB,OPS|Retenção aplicada; rascunho reaparece após sucesso e autosserviço de preferências/exclusão não completo.
UX81|I|LIB|Tipos online PDF digital distintos; dez publicações atuais são explicitamente online.
UX82|I|LIB|Capas consultam produtos reais com carregamento e fallback.
UX83|P|LIB,CUR|Dez coleções online; onboarding corrigido; responsável e revisão editorial ainda não demonstrados.
UX84|N|LIB|Sem biblioteca operacional PDF/revista com publicação revisão expiração e controle de arquivo.
UX85|I|DATE|Próximas oportunidades priorizadas sem esconder passadas; virada de ano coberta.
UX86|P|DATE,OPS|Janelas são orientativas; viabilidade comercial não comprovada por esses cálculos.
UX87|I|DATE,QA|Lista calendário filtros e detalhes móveis presentes/testados.
UX88|P|DATE|Favoritos locais por ocasião e desfazer presentes; sincronização por conta ainda ausente.
UX89|P|DATE|ICS com datas móveis escape e UID testado; importação/reimportação em calendários reais pendente.
UX90|I|DATE,CUR,QUOTE|Contexto de ocasião segue até o briefing e pode ser revisado.
UX91|E|BASE|Sem pesquisa documentada com participantes reais.
UX92|P|METRIC|Parâmetros e UUID privado redigidos; recebimento deduplicação e suporte do plano para eventos não certificados.
UX93|P|METRIC,QA|Budget de assets aprovado; sem evidência de CWV p75 em campo ou baseline comparável.
UX94|P|QA|Axe nos templates e testes de teclado passam; leitor de tela zoom e reflow completos não avaliados.
UX95|P|QA|Chromium aprovado; WebKit falhou uma vez e passou em três repetições; faltam dispositivos físicos.
UX96|I|HOME,QA|Fold/Glitch pontuais com movimento reduzido coberto; conteúdo textual preservado.
UX97|P|SEO|Metadados e 404 atuais corretos na amostra; coleções/datas específicas e rastreamento de indexação pendentes.
UX98|P|DB|14 migrations iguais ao remoto e privilégios conferidos; execução do cron/recuperação de backup ainda sem ensaio atual.
UX99|P|QA|Suítes amplas aprovadas salvo B07; novos cenários revelam falhas e não há gate de envio real pós-deploy.
UX100|P|QA,SEO,DB|Código sincronizado e rotas saudáveis; check Preview histórico vermelho e aceites operacionais ainda abertos.
LK01|I|BASE|Linha de base atualizada com commit HTTP browser e pg_catalog separados.
LK02|E|BASE|Sessões com compradores não localizadas.
LK03|E|OPS|Inventário de material autorizado e direitos de uso não encontrado.
LK04|I|HOME,PROD|Tokens frases e badge único presentes; validação humana do redesign é separada.
LK05|P|BASE,NAV|Interface construída; protótipos e aceite prévios com público não comprovados.
LK06|P|HOME,OPS|Hero ilustrativo próprio existe; acervo real de execução autorizada ainda pendente.
LK07|I|HOME,QA|Hero com texto HTML e recortes responsivos; motion reduzido testado.
LK08|I|HOME,QA|Quatro frases reunidas e cobertas em desktop/mobile.
LK09|P|HOME|Hierarquia evoluiu; redução de repetição ainda sem observação com compradores.
LK10|N|HOME|Categorias principais continuam iconográficas; entradas fotográficas não entregues.
LK11|I|NAV|Cabeçalho por tarefas disponível.
LK12|P|NAV,CAT|Menu e agrupamentos acessíveis; dimensão fotográfica e teste de localização pendentes.
LK13|I|NAV,QA|Busca seleção e filtros móveis cobertos.
LK14|P|CUR|Coleções existem; onboarding corrigido; pertinência/distinção comercial não certificada.
LK15|P|LIB,CUR|Coleções em código; não há ciclo editorial com responsável data de revisão e expiração.
LK16|I|PROD,LIB|Dimensões carregamento e fallback implementados; amostra tinha fotos principais ausentes com alternativas.
LK17|P|CUR,CAT|Produtos públicos reais; curadoria por propósito/diversidade ainda sem julgamento comercial.
LK18|I|PROD,QA|Um badge por card testado em todas as combinações previstas.
LK19|I|PROD|Mínimo cores e resumo visíveis; inconsistência de envio do mínimo fica em LK23.
LK20|P|CAT|Busca semântica leve e correções existem; falta amostra real julgada.
LK21|I|PROD,QA|Galeria miniaturas zoom e fallback implementados.
LK22|P|PROD,OPS|Ficha e FAQ disponíveis; lastro de personalização e revisão por família incompletos.
LK23|P|PROD,QUOTE|Mínimo nulo recusado B02; múltiplos comerciais não modelados; WebKit instável B07.
LK24|I|CART,CAT|Até três produtos comparáveis com persistência em sessão.
LK25|P|PROD,CUR|Compartilhar/relacionados presentes; diversidade por intenção e todos os cancelamentos nativos sem aceite.
LK26|P|PROD,CART|Kit como SKU identificado; kit como composição de componentes ainda ausente.
LK27|N|CUR,CART|Não há templates substituíveis de componentes reais.
LK28|N|CART|Não há configurador de composição com substituição de componentes.
LK29|N|QUOTE|Não há aritmética número de kits multiplicado pelas unidades de cada componente.
LK30|P|CART,QUOTE|Grupos principal/alternativa não representam composição versionada de kits.
LK31|E|OPS|Prova social autorizada depende de acervo e validação.
LK32|E|HOME,OPS|Três cases reais verificáveis não publicados.
LK33|E|PROD,OPS|Fotos correspondentes de peça-base simulação e produção real precisam material autorizado.
LK34|E|HOME,OPS|Bastidores e pessoas reais precisam conteúdo e autorização de imagem.
LK35|P|OPS,PROD|Linguagem cautelosa existe; lastro documental de alegações não integralmente demonstrado.
LK36|P|LIB,CUR|Coleções online nativas funcionam; revisão editorial e curadoria ainda parciais.
LK37|P|SHARE,DB|Link persistente com 50 itens e revogação implementados; falta novo ciclo real no deployment e contrato de composição.
LK38|P|QUOTE|Impressão disponível; PDF longo e kit composto não validados.
LK39|P|CUR,OPS|Landings explicativas presentes; autoria revisão e profundidade prática ainda pendentes.
LK40|E|OPS|Jornada de desenvolvimento especial depende de confirmação comercial do serviço.
LK41|I|CART,QUOTE|Salvar e solicitar diferenciados; tela de sucesso exige protocolo do endpoint quando habilitado.
LK42|P|QUOTE|Formulário enxuto e rascunho; B01 e B05 impedem aceite integral.
LK43|N|QUOTE,DB|Upload privado do cliente não implementado.
LK44|P|NAV,OPS|WhatsApp iniciado pelo visitante existe; operação/destinatário oficial precisam validação.
LK45|N|OPS,DB|Cópia do orçamento por e-mail não tem worker/outbox/provedor operacional.
LK46|P|QA|Automação e padrões existem; revisão assistiva e física pendente.
LK47|P|METRIC|Budget aprovado; CWV e comparação de uso real ausentes.
LK48|P|SEO|Shell corrigido e sem ofertas fictícias; prévias específicas/indexação fina não encerradas.
LK49|P|METRIC|Redação de URLs corrigida; entrega deduplicação e interpretação do funil pendentes.
LK50|P|QA,DB|Publicado e banco reconciliado; Preview histórico vermelho e recuperação operacional sem aceite.
GR01|I|GRAPH|Wrapper fixa raiz e corpus do site.
GR02|I|GRAPH|Metadados fingerprint e commit de origem registrados; status atual no corpus técnico.
GR03|P|GRAPH|Temas de perguntas documentados; dez respostas julgadas e benchmark reproduzível não entregues.
GR04|P|GRAPH|Papéis técnicos definidos; responsável nominal e transferência não registrados.
GR05|I|GRAPH|Ferramenta de engenharia local/CI sem dependência do runtime.
GR06|I|GRAPH|Graphify 0.9.48 fixado em configuração e CI.
GR07|I|GRAPH|Configuração versionada e validada pelo wrapper.
GR08|P|GRAPH|142 arquivos representados incluindo 17 SQL; docs ausentes e cobertura por símbolo não certificada.
GR09|I|GRAPH|Raiz extensões exclusões e symlinks controlados no wrapper; teste hostil integral fica em GR45.
GR10|I|GRAPH|Grafo ignorado no Git e artefatos CI com retenção de 14 dias.
GR11|I|GRAPH|Doctor disponível com diagnóstico de versão/raiz.
GR12|I|GRAPH|Extração estrutural code-only sem uso de chaves de IA ou Supabase.
GR13|I|GRAPH|Mapa atual possui 1052 nós e 2311 relações.
GR14|A|GRAPH|Formato não direcionado documentado; requisito literal de direção não atendido.
GR15|P|GRAPH|Caminhos normalizados; homônimos aliases e chamadas indiretas ainda sem amostra completa.
GR16|P|GRAPH|Nó mostra fonte/linha; auditabilidade e classificação por relação não integralmente validadas.
GR17|I|GRAPH|IDs endpoints e caminhos inválidos bloqueados por validadores/testes.
GR18|P|GRAPH|Comunidades automáticas com nomes genéricos; curadoria de nomes/coesão não concluída.
GR19|I|GRAPH|JSON HTML e relatório gerados no mesmo processo.
GR20|P|GRAPH|Candidato e lock existem; ausência de teste integral de interrupção/disco cheio.
GR21|P|GRAPH|Query disponível; comandos estáveis path/explain do wrapper ausentes.
GR22|I|GRAPH|Aliases em português e expansão textual implementados/testados.
GR23|I|GRAPH|Consulta limitada a 1200 tokens e truncamento explicitado.
GR24|A|GRAPH|Impact fornece vizinhança não direcional; não cumpre análise causal de dependentes.
GR25|P|GRAPH|Navegação até testes possível; seleção de testes afetados não validada por benchmark.
GR26|A|GRAPH|Update chama rebuild completo; fingerprint não equivale a extração incremental.
GR27|P|GRAPH|Rebuild/status tratam corpus; matriz de renome branch e exclusão incompleta.
GR28|I|GRAPH|Status/check por fingerprint disponíveis e executados.
GR29|I|GRAPH|AGENTS do site orienta consulta e conferência nas fontes.
GR30|A|GRAPH|Hooks locais foram adiados; fluxo manual/CI não cumpre automação por commit/checkout.
GR31|P|GRAPH|Pass de documentação previsto; nenhum .md representado no grafo atual.
GR32|P|GRAPH|Automação estrutural isolada; pass semântico separado não entregue.
GR33|P|GRAPH,DB|SQL está no grafo; cadeia completa payload-handler-RPC-migration ainda não validada.
GR34|P|GRAPH,DB|Guardas nos arquivos; mapa direcional de fronteiras não entregue.
GR35|P|GRAPH,DB|Flags/migrations/ativação diferenciadas em docs; representação de evidências de deploy no grafo incompleta.
GR36|P|BASE,GRAPH|230 referências auditadas manualmente; integração mantida requisito-grafo ainda ausente.
GR37|P|GRAPH|Memória orientada por documentação; ciclo revisado de correções e fontes não demonstrado.
GR38|I|GRAPH|Runbook com instalação comandos limitações e recuperação disponível.
GR39|P|GRAPH|HTML local existe; acessibilidade filtros e segurança visual não retestados integralmente.
GR40|N|GRAPH|Sem benchmark equivalente de dez perguntas comparando grafo e busca direta.
GR41|I|GRAPH,QA|Workflow dedicado com versão fixa e check aprovado no commit.
GR42|P|GRAPH|Permissões/retencão/scanner existem; revisão de visibilidade e escopo completo de segredos pendente.
GR43|P|GRAPH|Cache npm existe; gatilhos por caminhos e cache de grafo por corpus ausentes.
GR44|N|GRAPH|Workflow não compara estrutura base/head nem emite impacto por commit.
GR45|P|GRAPH|Seis testes incluem scanner sintético; HTML hostil comentários e symlinks não têm matriz completa.
GR46|P|GRAPH|Lock e validadores existem; parser timeout disco e interrupção ainda sem simulações completas.
GR47|P|GRAPH|Consultas demonstram utilidade; precisão das dez perguntas/direção/aliases não certificada.
GR48|P|GRAPH|Geração operacional; medição controlada completa/incremental/fixture grande ausente.
GR49|P|GRAPH|Procedimento de candidato existe; restauração e upgrade ainda sem ensaio completo.
GR50|P|GRAPH,QA|Ferramenta integrada ao CI; benchmark aceites e recuperação impedem conclusão literal das 50 etapas.
AC01|I|QUOTE|Primeiro orçamento continua sem cadastro obrigatório.
AC02|I|NAV|Entradas Meus orçamentos presentes na navegação.
AC03|I|AUTH,QA|Tela de login responsiva observada e testada.
AC04|P|AUTH|Código/link suportado; entrega real de autenticação não reexecutada nesta rodada.
AC05|I|AUTH,QA|Login por senha implementado e contratos cobertos.
AC06|P|AUTH|Criação/confirmacão existem; e-mail real e ciclo de senha precisam aceite atual.
AC07|P|AUTH|Recuperação/redefinição existem; expiração e recebimento reais não retestados.
AC08|I|AUTH|Redirecionamento restringido a destinos internos testados.
AC09|I|AUTH,QA|Callback inválido gera recuperação sem indexação.
AC10|P|AUTH,QUOTE|Sessão SDK persistente; limpeza em memória e rascunho B01 ainda não encerradas.
AC11|I|AUTH,DB|Cliente recusa credencial secreta; guardas e testes passam.
AC12|I|AUTH,DB|Auth do site aponta para projeto isolado confirmado.
AC13|I|DB|Titular opcional preserva pedidos de visitantes.
AC14|I|DB|Associação limitada a e-mail confirmado e identidade; pgTAP aprovado.
AC15|I|DB|Reivindicação idempotente sem transferência entre titulares testada.
AC16|I|ACCOUNT,DB|RPC lista apenas pedidos da identidade e valida filtros/paginação.
AC17|I|ACCOUNT,DB|Servidor controla detalhe por auth.uid; B04 é estado da UI e não leitura cruzada do banco.
AC18|I|ACCOUNT,DB|Snapshot original preservado; repetição cria nova intenção.
AC19|I|ACCOUNT,DB|Eventos públicos separados dos internos.
AC20|I|DB|Eventos associados a transições persistidas; operação humana não comprovada por isso.
AC21|I|ACCOUNT,QA|Busca filtros paginação recuperação e vazio na lista cobertos.
AC22|P|ACCOUNT|Detalhe possui os campos esperados; B04 pode mostrar pedido anterior sob nova URL.
AC23|P|ACCOUNT,PROD|Repetição confirma substituição; revalidação integral de referência atual/variantes ausente.
AC24|P|ACCOUNT,DB|Propostas publicadas e versões modeladas; B06 e publicação comercial real ainda pendentes.
AC25|I|DB|Bucket privado PDF/20MB e negação cruzada cobertos localmente; sem upload real nesta revisão.
AC26|I|ACCOUNT,DB|URL assinada de 60s exige autorização antes de assinar; testes negativos aprovados.
AC27|I|ACCOUNT,DB|Origem UUID bucket e host controlados pelos testes da API.
AC28|I|SEO,METRIC|Noindex na resposta inicial e UUID de orçamento redigido em analytics; antigo achado corrigido.
AC29|P|OPS,QUOTE|Aviso existe mas promete apagar após sucesso; comportamento B01 contradiz texto.
AC30|P|QA|Cobertura ampla; simulações novas e instabilidade WebKit mantêm aceite integral aberto.
"""

rows = list(csv.DictReader((root / 'docs/MATRIZ_REVISAO_ATUAL_20260912.csv').open()))
by_id = {r['id']: r for r in rows}
output = []
seen = set()
for line in review.strip().splitlines():
    item_id, status, groups, conclusion = line.split('|', 3)
    assert item_id in by_id and item_id not in seen, item_id
    seen.add(item_id)
    old = by_id[item_id]
    evidence = '; '.join(dict.fromkeys(p for g in groups.split(',') for p in sources[g].split('; ')))
    for p in evidence.split('; '):
        assert (root / p).exists(), p
    output.append({'id': item_id, 'entrega': old['entrega'], 'estado_anterior': old['status_20260912'], 'estado_revisado': status, 'fontes': evidence, 'conclusao_e_aceite_restante': conclusion, 'metodo': 'Inspeção de fontes e evidências por módulo; não significa teste individual completo do aceite.', 'commit': 'b789e45f3171ce56a9e5eff4f8bbb3d6acc145c7'})
assert seen == set(by_id) and len(output) == 230
destination = root / 'docs/MATRIZ_POS_MIGRATIONS_20260912.csv'
with destination.open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=output[0].keys())
    writer.writeheader()
    writer.writerows(output)
summary = {'references': len(output), 'states': dict(Counter(r['estado_revisado'] for r in output)), 'plans': {p: dict(Counter(r['estado_revisado'] for r in output if r['id'].startswith(p))) for p in ['UX', 'LK', 'GR', 'AC']}, 'changes': [{k: r[k] for k in ['id', 'estado_anterior', 'estado_revisado']} for r in output if r['estado_anterior'] != r['estado_revisado']]}
(Path(__file__).parent / 'matrix-summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False)+'\n')
print(json.dumps(summary, ensure_ascii=False))
