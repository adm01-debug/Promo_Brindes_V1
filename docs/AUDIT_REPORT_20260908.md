# Auditoria técnica consolidada — 08/09/2026

## Escopo e método

O site público foi revisado com cinco frentes especializadas: banco/segurança, catálogo/superfiltro, orçamento/formulários, acessibilidade/responsividade e produção/SEO. O sistema interno `Promo_Gifts_V4` foi usado somente como referência e não foi alterado.

Foram combinados testes unitários, build de produção, Playwright em Chromium desktop e Pixel 7, Axe WCAG A/AA, consultas anônimas reais ao Supabase, paginação repetida, entradas adversariais e inspeção do domínio público.

## Evidência final local

- TypeScript: aprovado.
- Vitest: 45/45 testes aprovados em 9 arquivos.
- Playwright sobre build + preview: 18 testes aprovados, 2 skips condicionais esperados e 0 falhas.
- Axe: 0 violações automáticas WCAG A/AA nas rotas principais auditadas.
- Dependências: 0 vulnerabilidades conhecidas em 153 dependências (`npm audit`).
- Build: sem sourcemaps de produção; chunk principal próximo de 80 kB gzip.
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
- Idempotência: cada solicitação leva `clientRequestId` estável durante retries e o header `Idempotency-Key`; o receptor ainda precisa aplicar a garantia no servidor.
- Datas: mínimo calculado no calendário local e prazo passado rejeitado pela validação própria.
- Acessibilidade: Escape/foco no menu, foco após navegação SPA, foco do drawer vazio, associação de erros ao consentimento e cinco contrastes corrigidos.
- SEO/rotas: erros de produto recebem `noindex`; rewrites locais foram restritos às rotas conhecidas; robots permite rastrear a rota marcada como `noindex`.
- Sitemap: limite total de 50 mil URLs, deduplicação, ordem estável, fallback apenas em 404, falha fechada 503, timeout por consulta e HEAD sem varrer o catálogo.
- Produção: sourcemaps desativados por padrão, preload global removido, HSTS adicionado, cache de imagens estáveis tornado revalidável e Error Boundary global criado.
- Governança: engine Node corrigida, `.nvmrc` criado e quality gate de CI adicionado para quando o diretório for versionado.

## Bloqueios externos e decisões necessárias

### P0 — permissões legadas do banco compartilhado

A chave anônima ainda consegue consultar recursos antigos que revelam preços/estoque/referências e dados de variantes. A view mínima não elimina essa superfície global. Além disso, `brand`, `sku` e domínios de mídia permitem inferir fornecedor.

Nenhum `REVOKE`, DDL adicional ou proxy de imagens foi executado: a view nova ainda depende da legada e os consumidores internos precisam ser inventariados primeiro. O corte exige autorização explícita, plano transacional e teste de regressão do Promo Gifts.

### P0 — domínio não aponta para o build auditado

Na verificação de 08/09/2026, `www.promobrindes.com.br` respondeu 403 pela Cloudflare, enquanto o domínio sem `www` serviu o WordPress antigo. Robots e sitemap públicos também não estavam disponíveis. É necessário publicar o projeto, escolher um host canônico e configurar o redirecionamento permanente do outro.

### P1 — receptor de leads e privacidade

Não existe backend de leads neste repositório. Rate limit, antispam, validação server-side, persistência do consentimento, retenção e idempotência só podem ser comprovados quando o endpoint definitivo for fornecido. O aviso de privacidade precisa de dados oficiais da pessoa jurídica, bases/finalidades, retenção, compartilhamentos e canal do titular, com aprovação jurídica.

### P1 — SSOT de migrations

A migration aprovada existe no projeto novo e no ledger do Supabase, mas não no repositório canônico de schema. O PO precisa definir a incorporação no histórico oficial sem executar novamente o SQL.

### P1 — SEO server-side e publicação

Metadados específicos ainda dependem de JavaScript. SSR/prerender é necessário para previews sociais completos, metadata inicial correta e 404 real para produto inexistente. O sitemap único atual funciona para 7.524 URLs, mas deve virar índice particionado antes de se aproximar do limite operacional de resposta da hospedagem.

### P2 — CSP e ativos

A CSP deve começar em modo Report-Only depois que os hosts definitivos de formulários e mídia forem conhecidos. Há cerca de 2,1 MB de imagens antigas não referenciadas e um PNG fallback grande; removê-los/otimizá-los reduz o artefato de deploy, embora eles não sejam baixados nas rotas onde não são usados.

## Conclusão

O checkpoint local está consistente e com gates verdes. A classificação ainda não é “10/10 de produção” porque os bloqueios P0/P1 acima pertencem a infraestrutura, governança do banco, backend e jurídico. Fechá-los exige dados e autorização do PO, não apenas alterações de frontend.
