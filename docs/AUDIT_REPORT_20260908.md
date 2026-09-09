# Auditoria técnica consolidada — 08–09/09/2026

## Escopo e método

O site público foi revisado com cinco frentes especializadas: banco/segurança, catálogo/superfiltro, orçamento/formulários, acessibilidade/responsividade e produção/SEO. O sistema interno `Promo_Gifts_V4` foi usado somente como referência e não foi alterado.

Foram combinados testes unitários, build de produção, Playwright em Chromium desktop e Pixel 7, Axe WCAG A/AA, consultas anônimas reais ao Supabase, paginação repetida, entradas adversariais e inspeção do domínio público.

## Evidência final local

- TypeScript: aprovado.
- Vitest: 57/57 testes aprovados em 10 arquivos.
- Playwright sobre build + preview: 18 testes aprovados, 2 skips condicionais esperados e 0 falhas.
- Axe: 0 violações automáticas WCAG A/AA nas rotas principais auditadas.
- Dependências: 0 vulnerabilidades conhecidas em 128 pacotes auditados (`npm audit`).
- Build: sem sourcemaps de produção; entrada principal com a home crítica incluída em aproximadamente 106 kB gzip e demais rotas sob demanda.
- Dados: 7.519/7.519 produtos ativos únicos; 0 IDs/slugs duplicados, registros sem nome/SKU, JSON malformado ou swatches com chaves proibidas.
- Categorias: 413 registros retornados, sem IDs duplicados nem pais órfãos. Há 20 produtos ativos associados a categoria inativa, um problema de qualidade da origem a acompanhar.

## Falhas encontradas e corrigidas

- Paginação instável: todos os modos de ordenação agora usam `id` como desempate. Simulação de 240 itens por modo terminou sem repetição ou sobreposição.
- Materiais com parênteses: expressões JSONB agora são escapadas corretamente. Plástico (1.410), couro sintético (496) e a combinação OR (1.902) responderam HTTP 206.
- Categorias-raiz incompletas: o filtro agora expande descendentes e consulta `category_id`, que é completo. Papelaria passou de 82 para 2.282 produtos, com 69 IDs únicos e URL de 3.376 bytes.
- Taxonomia do superfiltro: as famílias foram reconciliadas com 113 cores e 64 materiais observados. A cobertura saiu de 1.010 produtos somente com cores não mapeadas e 792 somente com materiais não mapeados para 0/7.519 em ambos os casos.
- Busca adversarial: NUL e operadores não atravessam a expressão PostgREST; identificadores de produto são limitados e validados; URL Supabase exige hostname exato.
- Busca por códigos pontuados: a tokenização segura recupera SKUs como `P@02040` e `P$BRINQ230` sem reabrir a injeção lógica.
- Estados de recuperação: páginas fora do total recuam para a última página válida; limpar a busca também limpa a URL; produto, categorias e destaques permitem retry após falha transitória.
- Carrinho: desserialização estrita, deduplicação, limite de 50 itens, clamps de quantidade, sincronização entre abas e limpeza real do `localStorage`.
- Formulários: bloqueio síncrono de envio duplo, timeout de 15 s, mensagens amigáveis, endpoint HTTPS válido, limites de tamanho e consentimento versionado com instante de aceite.
- Borda HTTP: corpos JSON malformados, binários ou não serializáveis são normalizados para erro 400 e nunca chegam ao banco.
- Idempotência: cada solicitação leva `clientRequestId` estável durante retries e o header `Idempotency-Key`; o receptor aplica a garantia transacional no servidor.
- Datas: mínimo calculado no calendário local e prazo passado rejeitado pela validação própria.
- Acessibilidade: Escape/foco no menu, foco após navegação SPA, foco do drawer vazio, associação de erros ao consentimento e cinco contrastes corrigidos.
- SEO/rotas: erros de produto recebem `noindex`; rewrites locais foram restritos às rotas conhecidas; robots permite rastrear a rota marcada como `noindex`.
- Sitemap: limite total de 50 mil URLs, deduplicação, ordem estável, fallback apenas em 404, falha fechada 503, timeout por consulta e HEAD sem varrer o catálogo.
- Produção: sourcemaps desativados por padrão, preload global removido, HSTS adicionado, cache imutável para imagens versionadas e Error Boundary global criado.
- Governança: engine Node corrigida, `.nvmrc` criado e quality gate de CI adicionado para quando o diretório for versionado.
- Banco isolado: o projeto `xlzmclcjdncjfdrjxclt` foi provisionado, protegido por RLS e RPCs service-only, conectado à Vercel e validado com requests sintéticos idempotentes. Os dados de teste foram removidos por identificador exato.
- Publicação: GitHub privado, Vercel, sitemap e APIs estão operacionais em `https://promo-brindes-v1.vercel.app`.
- Performance: hero responsivo em 640/828/1024/1672 px e logo redimensionado eliminam transferência desperdiçada; a home crítica carrega com o shell para impedir o salto causado pelo fallback de rota. Lighthouse móvel frio do build final: performance 96, acessibilidade 100, boas práticas 100, SEO 100, LCP 2,3 s, TBT 30 ms e CLS 0.
- SEO inicial: canonical, Open Graph, JSON-LD, robots e sitemap passaram a usar o mesmo host realmente publicado, inclusive antes da hidratação React.

## Bloqueios externos e decisões necessárias

### P0 — permissões legadas do banco compartilhado

A chave anônima ainda consegue consultar recursos antigos que revelam preços/estoque/referências e dados de variantes. A view mínima não elimina essa superfície global. Além disso, `brand`, `sku` e domínios de mídia permitem inferir fornecedor.

Nenhum `REVOKE`, DDL adicional ou proxy de imagens foi executado: a view nova ainda depende da legada e os consumidores internos precisam ser inventariados primeiro. O corte exige autorização explícita, plano transacional e teste de regressão do Promo Gifts.

### P1 — domínio próprio

O build auditado está público no alias da Vercel. `promobrindes.com.br` e `www.promobrindes.com.br` ainda não foram associados a ele; a troca exige acesso ao DNS e escolha do host canônico. Até isso ocorrer, todos os sinais de indexação apontam para o alias real, evitando canonical quebrado.

### P1 — privacidade e notificações

O backend de leads, rate limit, validação server-side, consentimento e idempotência está ativo. O aviso de privacidade ainda precisa dos dados oficiais da pessoa jurídica, bases/finalidades, retenção, compartilhamentos e canal do titular, com aprovação jurídica. Confirmações automáticas por e-mail/WhatsApp dependem de provedor, credenciais e templates; WhatsApp exige opt-in próprio.

### P1 — SSOT de migrations

A migration aprovada existe no projeto novo e no ledger do Supabase, mas não no repositório canônico de schema. O PO precisa definir a incorporação no histórico oficial sem executar novamente o SQL.

### P2 — SEO server-side

A home possui metadata inicial completa. Metadados específicos de catálogo/produto ainda dependem de JavaScript; SSR/prerender seria necessário para previews sociais individuais e status HTTP 404 real para produto inexistente. O sitemap único opera com cerca de 7,5 mil URLs dinâmicas e já impõe o limite normativo de 50 mil; particionamento só passa a ser necessário ao se aproximar desse patamar ou do limite de resposta da hospedagem.

### P2 — CSP

A CSP deve começar em modo Report-Only depois de inventariar os hosts efetivamente usados pelas imagens do catálogo. Aplicar uma allowlist incompleta agora poderia esconder produtos de fornecedores; os demais cabeçalhos defensivos já estão ativos.

## Conclusão

O produto está funcional, publicado e protegido pelos gates automatizados. A implementação técnica sob controle deste repositório foi concluída; domínio próprio, endurecimento do legado compartilhado, dados jurídicos e provedores de notificação continuam sendo dependências externas que exigem decisões ou credenciais do proprietário.
