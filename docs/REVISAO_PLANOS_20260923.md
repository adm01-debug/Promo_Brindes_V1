# Revisão dos planos — Promo Brindes — 23/09/2026

## Parecer

**Os planos ainda não estão integralmente implementados nem integralmente homologados.** A base técnica tem controles e testes relevantes, mas a revisão encontrou **cinco defeitos reproduzíveis em seis simulações**, funcionalidades parcialmente entregues, aceites humanos/operacionais pendentes e documentação que ficou para trás.

Não atribuo nota 10/10 nem percentual de conclusão: os planos se sobrepõem e misturam código, conteúdo, pesquisa, configuração de provedores e rotina operacional. Um gate verde certifica seus testes, não todos os critérios de produto.

Repositório: `adm01-debug/Promo_Brindes_V1`. Base examinada: `11f0d358d86a192a01acc1dedca198e7d4ea8440`, incluindo PRs #32, #33 e #34. Banco do site: `xlzmclcjdncjfdrjxclt`. **Nenhuma alteração no Promo Gifts nem em `doufsxqlfjyuvxuezpln`.**

## 1. Escopo, método e limites

- Inventariei quatro planos de produto (230 referências: UX100, LK50, GR50, AC30) e três planos técnicos de 50 etapas, totalizando **380 referências documentais, não 380 funcionalidades independentes**.
- Cruzei matriz, planos originais, commits, código, migrations, testes e workflows. Usei Graphify apenas para localizar relações estruturais; confirmei os achados no código. O grafo não substitui execução, schema remoto ou leitura de segurança.
- Executei testes locais, seis simulações adicionais sem rede, dry-run administrativo do banco isolado e smoke público. Consultei GitHub e nomes/ambientes das variáveis Vercel sem recuperar seus valores.
- **Não** alterei código da aplicação, schema, credenciais, configurações externas, commits ou releases nesta revisão. Os novos arquivos são documentação e diagnósticos locais.
- Não enviei mensagens reais, não criei clientes/orçamentos em produção, não realizei restore de produção, teste com dispositivos físicos nem pesquisa com compradores.
- Esta rodada não fez um novo diff integral do schema remoto via `pg_catalog`. Ledger alinhado não comprova igualdade de tabelas, funções, policies, grants, triggers, Storage ou dados. Não usei OpenAPI/PostgREST como inventário de schema.
- Os anexos diferenciam evidência nova de conclusão documental herdada. **Não há alegação de 380 testes individuais.** Critério sem evidência atual permanece não certificado.
- As listas autônomas originais de 50 etapas de catálogos e de datas comemorativas não foram localizadas como documentos completos. Seus requisitos existentes estão cobertos pelo plano UX e pelo código; não inventei etapas para completar essas listas.

### Documentos examinados

| Plano | Referências | Leitura atual |
|---|---:|---|
| [UX](PLANO_UX_100_ETAPAS_20260909.md) | 100 | Produto, navegação, busca, seleção, orçamento, conta, biblioteca, datas e qualidade |
| [Benchmark Lukka](LUKKA_BENCHMARK_PLANO_50_ETAPAS_20260909.md) | 50 | Conteúdo, marca, descoberta, composição de kits e conversão |
| [Graphify](PLANO_GRAPHIFY_50_ETAPAS_20260911.md) | 50 | Ferramenta de engenharia, não recurso entregue ao comprador |
| [Portal](CUSTOMER_PORTAL_IMPLEMENTATION_20260909.md) | 30 | Acesso, histórico, autorização, propostas e ajustes |
| [Correções 13/09](PLANO_CORRECOES_50_ETAPAS_20260913.md) | 50 | Regressões, segurança, fila, performance e governança |
| [Correções 16/09](PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md) | 50 | Banco, contratos, concorrência e operação |
| [Correções 17/09](PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md) | 50 | Continuação, qualidade, release e dependências externas |

Rastreabilidade completa: [230 referências de produto](REVISAO_PLANOS_20260923_ANEXO_PRODUTO.md) e [150 referências técnicas](REVISAO_PLANOS_20260923_ANEXO_TECNICO.md).

## 2. Evidência atual de sincronização e qualidade

| Verificação | Resultado observado | Limite da evidência |
|---|---|---|
| HEAD local, origin/main e main consultada no GitHub | Mesmo SHA `11f0d35` | Novos arquivos desta auditoria são locais, ainda não publicados |
| Quality, database, Graphify, CodeQL e release em main | Todos concluídos com sucesso no SHA auditado | Sucesso não cobre cenários ausentes |
| Vitest existente | **53 arquivos / 348 testes aprovados** | Não detectava A01–A05 |
| ESLint e TypeScript | **Lint e typecheck aprovados** | Não demonstram correção de regras de negócio |
| pgTAP local | **27 arquivos / 533 asserções aprovadas** | Banco local; não ensaio de dados reais nem novo diff remoto |
| Diagnósticos adicionais | **6/6 reproduziram os defeitos esperados** | PASS aqui significa defeito confirmado, não correção |
| Ferramentas Graphify | **11 testes aprovados; benchmark estrutural 10/10** | Não mede precisão semântica nem entendimento humano |
| Validador de matriz | **230 IDs/fontes válidos; 6 testes do validador aprovados** | Validade estrutural não confirma que o texto ainda descreve o produto |
| Supabase isolado: dry-run | `upToDate: true`; nenhuma migration, seed ou role pendente | Não reaplicou SQL; igualdade do ledger não é igualdade integral do schema |
| Smoke do deployment | Rotas conhecidas 200, inexistente 404, cron sem autenticação 401, headers de segurança presentes | Não percorre envio autenticado e operação completa |
| Novos artefatos de auditoria | 230 IDs de produto + 150 técnicos únicos; links locais válidos; Gitleaks sem achados | Scanner não equivale a prova absoluta de ausência de segredo |

A suíte SQL emitiu notices/avisos de GRANT em funções auxiliares do ambiente local; o resultado pgTAP foi aprovado. Não foi apresentado como execução sem avisos.

Evidências remotas: [Quality](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35892776685), [database](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35892776565), [Graphify](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35892776556), [CodeQL](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35892776532), [release](https://github.com/adm01-debug/Promo_Brindes_V1/actions/runs/35892776844).

**Correção de entendimento sobre deploy:** embora `vercel.json` desative o deploy nativo por integração Git, `.github/workflows/release.yml` executa release controlado em push de main, depois das verificações de qualidade e banco. O run de release do SHA atual está aprovado. Não é correto dizer que só há publicação manual.

## 3. Defeitos confirmados e critérios de correção

### A01 — P1 — Favoritos anônimos se perdem no login

**Fonte:** [CommemorativeDatesPage.tsx](../src/pages/CommemorativeDatesPage.tsx), efeitos a partir das linhas 182 e 193.

**Cenário:** visitante salva Dia do Cliente; a conta que entra não tem datas remotas. O efeito de persistência troca o proprietário do cache para o usuário antes de o efeito de sincronização verificar se deve promover os favoritos anônimos. A promoção é ignorada; a lista remota vazia substitui a local. A simulação confirmou lista final vazia e nenhuma chamada de gravação de favorito.

**Impacto:** intenção de planejamento descartada justamente no momento de adesão à conta.

**Aceite necessário:** capturar a origem do cache antes de gravar proprietário; política explícita de promoção; preservar intenção em falha; testar login com lista remota vazia/preenchida, promoção repetida e falha parcial. A correção não deve importar favoritos de outra conta.

### A02 — P1 — Falha de sincronização deixa favoritos da conta anterior

**Fonte:** mesmo componente, inicialização em torno da linha 154 e efeitos de persistência/sincronização.

**Cenário:** cache pertence à conta A; conta B abre a página; a leitura remota de B falha. A interface continua mostrando a data de A e o cache recebe proprietário B. Reproduzido com duas identidades fictícias e rejeição controlada da RPC.

**Impacto:** quebra de separação de estado no navegador compartilhado e confusão de autoria. **Não demonstrou leitura cruzada no banco**: a autorização SQL é distinta e seus testes passaram.

**Aceite necessário:** particionar ou validar cache por titular antes de renderizar; limpar estado na mudança de identidade; não reaproveitar dados da conta anterior como fallback; testar A→B com falha, timeout, offline, logout e múltiplas abas.

### A03 — P1 — Reversão tardia de uma operação da conta A altera a conta B

**Fonte:** `setFavorite`, a partir da linha 301 do mesmo componente.

**Cenário:** conta A remove favorito; a gravação fica pendente; entra B e carrega lista vazia; a gravação antiga falha. A reversão otimista reinsere o favorito de A na interface/cache de B. O contador da mutação é por ocasião e não valida a identidade capturada.

**Aceite necessário:** vincular sucesso, falha e rollback à geração da identidade e da operação; invalidar operações antigas na troca de usuário; provar que nenhuma resposta tardia de A modifica B. Não basta proteger apenas a leitura da lista.

### A04 — P2 — Relacionados perdem a diversidade na ordenação final

**Fonte:** [catalogRanking.ts](../src/lib/catalogRanking.ts), `rankRelatedProducts`, linha 112.

**Cenário:** quatro candidatos da mesma categoria; três de aço e um de bambu. A primeira etapa diversifica; a segunda ordenação por afinidade/nome recoloca os três de aço no início. A intenção de diversidade não sobrevive à composição das etapas.

**Aceite necessário:** uma única estratégia de score e desempate, aplicando diversidade no momento correto; fixtures com categorias, materiais, flags, empates e exclusão do produto atual; avaliar resultados comerciais, não apenas a presença da função.

### A05 — P2 — Curadoria sobrescreve “Nome” e “Mais recentes”

**Fonte:** [useCatalogPageState.ts](../src/lib/useCatalogPageState.ts), linhas 98–114.

**Cenário:** a API devolve A antes de B na ordem explicitamente solicitada; o hook aplica `rankCatalogProducts` incondicionalmente e B, destacado, passa à frente. Duas simulações confirmam o comportamento para `nome` e `recentes`.

**Aceite necessário:** aplicar curadoria apenas no modo apropriado; preservar a ordenação explícita e sua consistência entre páginas; cobrir trocas por URL/UI. Separadamente, definir se relevância será global: hoje o reranking ocorre sobre a página recebida, não sobre todo o conjunto encontrado.

### Reprodução

[Diagnósticos](audits/plan-review-20260923/findings.probe.tsx), usando os componentes/hooks reais com autenticação/RPC/dados simulados:

```bash
npx vitest run --config docs/audits/plan-review-20260923/vitest.config.ts --reporter=verbose
```

Os arquivos `.probe.tsx` não entram na suíte padrão. Servem como evidência reproduzível do estado defeituoso; depois da correção, criar regressões permanentes que exijam o comportamento correto. Não transformar “esperar o bug” em gate de qualidade.

## 4. O que já existe e não deve ser reconstruído

- Catálogo público sem obrigar estoque positivo, busca e sinônimos, superfiltro, badge único, mínimo quando disponível, galeria, comparação e FAQ.
- Carrinho de solicitação, briefing sem checkout, contexto de campanha, alternativas, compartilhamento/revogação, impressão e composição de kits com validação de grupo.
- Conta opcional, histórico por titular, detalhe, versões de proposta, repetição com validação do catálogo e biblioteca de campanhas.
- Reconciliação guiada de versões de campanha: usar versão remota, preservar ambas ou substituir conscientemente. A nota antiga “falta diálogo de conflitos” está vencida.
- Biblioteca de dez coleções online com governança editorial; agenda comemorativa, exportação ICS e conexão ao briefing.
- Upload privado com autorização, inspeção de assinatura binária e proteção contra resultado tardio após troca de sessão.
- Outbox, leases, tentativas, reconciliação de aceite, callbacks e testes locais de Resend/WhatsApp. Isso não significa mensagens entregues em produção.
- Tipos gerados e cliente Supabase tipado, migrations protegidas, SQL/CI, release controlado e Graphify estrutural.
- Novidades de #33: imagens de produtos reais nas entradas de categorias, ranking e RPCs de favoritos por conta. **Existem**, embora favoritos/ranking tenham os defeitos acima.

Essas constatações não substituem o aceite particular de cada item. Fotografias de catálogo não são prova de operação própria; esquema implementado não é operação comercial homologada.

## 5. Funcionalidades que ainda precisam de engenharia

| Tema | Entregue | Falta para encerrar |
|---|---|---|
| Favoritos por conta | RPCs, RLS, cliente e interface | A01–A03, regressões de identidade e retomada real |
| Relevância/curadoria | Sinônimos, flags, score e diversificação local | A04–A05, ranking global definido, conjunto de consultas com produtos julgados; a home ainda usa destaques do backend |
| Cópia de solicitação | E-mail com protocolo, contato/empresa, lista de produtos e acesso à conta | Payload/template não incluem o briefing integral: campanha, verba, datas, notas, alternativas e estrutura de kits; revisar minimização e conteúdo antes de ativar |
| Passagem ao atendimento | Pedido persistido e histórico | Fila é `audience=customer`; faltam encaminhamento ao comercial, responsável e acompanhamento de prazo |
| Catálogos PDF/revistas | Tipos e biblioteca online | Ingestão/publicação de materiais aprovados reais e governança dos arquivos; dez coleções online não equivalem a dez PDFs |
| Regras comerciais | Mínimo, variantes, conjunto de kits | Múltiplos confirmados, técnicas/áreas e curadoria de kits por propósito dependem de dados comerciais |
| Contratos de tipos | Tipos SQL gerados, cliente tipado e validação runtime | Adoção completa no contrato de API ainda parcial; JSON genérico não elimina normalização manual |
| Uploads | Assinatura binária e isolamento | Requisito literal de barrar conteúdo ativo de PDF não foi demonstrado; magic bytes não são sanitização/antimalware |
| Integração de contratos | Testes locais e mocks | Não localizado workflow de contrato cross-projeto que verifique as 36 colunas e permissões na origem |
| Preview isolado | Guardas, runbook e separação de segredos Production | Provisionamento completo por PR, URL/chaves/CSP e percurso autenticado com dados sintéticos ainda sem certificação |
| Graphify | Busca/path/explain, CI, benchmark estrutural | Pass documental/semântico, requisitos→grafo, precisão de relações e ensaios adversariais completos |
| Estrutura/observabilidade | Decomposição parcial, correlação/redação, budgets | Páginas ainda excedem o alvo literal de 300 linhas; CSS/refino; cobertura ponta a ponta de métricas; detecção independente de cron silencioso |

Não há exploração de PDF comprovada nesta revisão; trata-se de **aceite de segurança não demonstrado**, distinto dos cinco defeitos reproduzidos. Não ativar scanner externo nem transferir arquivos de clientes sem decisão específica.

## 6. Pendências operacionais, conteúdo e aceites humanos

### Mantidas adiadas por decisão do usuário

Configuração de Resend, WhatsApp, segredos dos webhooks, alertas operacionais e `SITE_SUPABASE_SERVICE_JWT`. O inventário atual não mostrou essas variáveis. Não configurei, não publiquei chaves e não solicito novos segredos nesta revisão.

Separar dois estados: “provedor pronto na conta do usuário” e “integração do deployment configurada e homologada”. A declaração de disponibilidade não é prova de recebimento real.

### Conteúdo aprovado mas ainda não identificado no repositório

O usuário informou possuir materiais aprovados. Não concluo que eles não existem; falta localizar e vincular PDFs, fotografias, cases, direitos de uso e regras de composição ao fluxo de publicação. Sem arquivos concretos, não é possível validar tamanho, revisão, autoria, licenças, links ou qualidade.

### Não encerrados por teste automatizado

- Compradores reais: tarefas, compreensão de linguagem, hierarquia da home, formulário e alternativas.
- Acessibilidade manual: leitores de tela, zoom/reflow e dispositivo físico; emulação/axe não substituem.
- CWV p75 de campo, indexação real e prévias em redes.
- Importação/reimportação ICS em calendários reais.
- Ciclo autenticado real de senha/expiração, proposta privada e ajuste comercial.
- Restore/PITR verificado, exercício com RPO/RTO medidos, revisão recorrente de estatísticas e rotação executada.
- Auditoria administrativa de leitura e revisão recorrente: trilhas de escrita/DDL não equivalem à auditoria de todos os SELECTs.

O runbook de restore **já existe**. O de rotação **já recomenda 90 dias**. O que falta não é redigir esses documentos do zero, mas executar, atribuir responsável e registrar os ensaios.

### Dependências do Promo Gifts protegido

Há etapas antigas sobre contrato público, Fase B, funções privilegiadas, GraphQL, índices e policies do banco interno. Foram separadas no anexo técnico como **X — fora do escopo autorizado do site**.

Não reapresentei vulnerabilidades históricas daquele banco como confirmadas hoje, não executei SQL e não tratei aprovação genérica de plano como licença para modificá-lo. Eventual atuação precisa de intenção explícita do responsável e verificação atual via `pg_catalog`.

## 7. A matriz está estruturalmente válida, mas semanticamente atrasada

O CSV vigente contém **118 I, 100 P, 1 N e 11 E**. Esses são rótulos registrados — não uma nova certificação desta auditoria e não uma taxa de prontidão.

Correções documentais propostas:

| Referência | Registro ultrapassado | Situação auditada |
|---|---|---|
| UX02 | Falta reconciliação guiada | Diálogo já entregue; métricas/ensaio real continuam abertos |
| UX03 | R01–R08 ainda sem correções | Há correções posteriores; A01–A05 são novos achados distintos |
| UX35, UX49 | Ranking não demonstrado | Código entregue em #33; há falhas de composição/ordem |
| UX88 | Sincronização por conta ausente | Entregue parcialmente, com três falhas reproduzidas |
| LK10 | Categorias só iconográficas, N | Imagens reais e fallback presentes; aceite editorial/UX não concluído |
| LK37 | Falta contrato de composição no link | Contrato implementado/testado; ciclo real no deployment permanece distinto |
| UX98 | 441 testes e migrations até 22/09 | 533 asserções locais; migration mais nova `20260923130000` |
| UX100, LK50 | Base publicada `91653ab` | main/release atual `11f0d35` |
| GR08, GR13 | Grafos antigos e contagens divergentes | Status CURRENT: 1.825 nós / 3.643 relações; base estrutural `abd74e6` |
| Plano 17/09 | main 9 commits atrás, token bloqueado, índice ausente e PR antigo pendente | Essas descrições não retratam o estado atual verificado |

Também há **I técnico com aceite humano aberto**, como UX22: texto implementado não prova compreensão pelo público. LK43 atende isolamento e assinatura binária, mas não demonstra todo o requisito literal sobre conteúdo ativo. Não fechar esses aceites por herança de rótulo.

A governança exige acompanhar mudanças com atualização da matriz. A entrega #33 não foi refletida nesses itens. O validador verifica IDs, fontes e commits: não detecta conclusões vencidas. Mantive o CSV histórico intacto; os anexos registram a revisão e propostas sem reescrever a história.

## 8. Ordem recomendada para concluir, sem reabrir trabalho entregue

1. **Corrigir identidade de favoritos (A01–A03)**, com cache por titular e invalidação das mutações antigas. Aceite: testes corretivos + sessão A/B/visitante + nenhuma perda ou mistura.
2. **Corrigir ordenação (A04–A05)** e definir alcance do ranking. Aceite: ordem escolhida preservada e diversidade mantida com fixtures comerciais.
3. **Atualizar matriz/índice e testes permanentes** no mesmo PR das correções; preservar o relatório de diagnóstico.
4. **Completar cópia de briefing e passagem ao comercial** em contratos/código, sem depender de ativar os provedores agora.
5. **Localizar e publicar o acervo autorizado**, testar PDFs/revistas e aplicar regras comerciais aprovadas, sem inventar evidências.
6. **Fechar lacunas técnicas do anexo**: contratos, preview, uploads, Graphify e testes de falha. Registrar explicitamente opções que o produto decidir não adotar.
7. **Executar homologação humana/operacional** com responsáveis e evidências, incluindo acessibilidade, pesquisa, restore e métricas.
8. **Só então encerrar cada referência** pelo seu critério de aceite. As integrações adiadas continuam pendências explícitas, sem bloquear correções independentes.

Esta é uma sequência de execução proposta, não um novo plano que substitui os anteriores. Nada foi corrigido automaticamente porque o pedido atual é de revisão.

## 9. Reproduzir a validação sem ações destrutivas

```bash
git status --short
git rev-parse HEAD
git ls-remote origin refs/heads/main
npm run ledger:check
npm run test -- --reporter=dot
npm run db:site:test
npm run test:graphify
npm run graph:status
npm run graph:benchmark
npx vitest run --config docs/audits/plan-review-20260923/vitest.config.ts --reporter=verbose
npm run db:site:dry-run
SMOKE_BASE_URL=https://promo-brindes-v1.vercel.app npm run smoke:deployment
```

Os comandos de banco requerem ambiente apropriado: `db:site:test` usa o banco local; `db:site:dry-run` faz consulta administrativa do projeto isolado, sem aplicar migrations. Não colar segredos no terminal/chat nem anexar saídas contendo valores de variáveis.

**Conclusão:** há progresso real e publicação saudável no recorte testado. Há também defeitos novos e escopo aberto. A revisão não sustenta “todas as melhorias implementadas”; sustenta uma lista rastreável do que existe, do que falhou, do que depende de execução e do que ainda não foi certificado.
