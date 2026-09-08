# Contrato público de dados do Site Promo Brindes

## Objetivo

O site cliente-final precisa consultar os mesmos produtos do Promo Gifts sem transformar o banco interno em uma API operacional. O contrato público deve expor somente o necessário para descoberta, detalhe do produto e solicitação de orçamento.

O frontend e o sitemap usam `v_site_products_public` por padrão desde 08/09/2026. A variável `VITE_PRODUCT_CATALOG_RESOURCE` continua disponível para configuração explícita. O recuo temporário para `v_products_public` ocorre apenas se o novo recurso não existir (`404`); outros erros, inclusive falhas de permissão, não acionam o fallback.

## Campos autorizados

- Identidade pública: `id`, `name`, `sku`, `slug`, marca e descrições editoriais.
- Mídia: imagens públicas do produto.
- Navegação: categorias, cores e materiais.
- Briefing: quantidade mínima, dimensões, personalização, embalagem e sinais editoriais (`novo`, `destaque`, `kit`, `mais vendido`).
- Operação técnica: `is_active` e `created_at`, necessários para filtro e ordenação.

Ficam fora do contrato: preço de custo ou venda, estoque, fornecedor, URL do fornecedor, códigos internos de integração, quantidade por variante e identificadores de variantes.

### Risco semântico conhecido

Embora os campos explícitos acima não existam na view mínima, a auditoria de 08/09/2026 encontrou equivalências de origem: `brand` coincide com fornecedor, `sku` coincide com referências de fornecedor e parte das imagens usa domínios identificáveis. Portanto, “campo ausente” não significa anonimização comercial completa. Ocultar essa origem exige uma decisão de produto e um pipeline de normalização/proxy de mídia; não foi feita uma alteração silenciosa porque isso muda o conteúdo público e pode quebrar referências comerciais.

A chave anônima também continua alcançando contratos legados mais amplos (`v_products_public`, `product_variants` e `v_variant_sale_prices_public`). A view nova reduz o que este frontend pede, mas não revoga permissões antigas do projeto compartilhado.

## Rollout seguro

A fase A foi concluída em 08/09/2026 com a migration `supabase/migrations/20260908_190000_create_site_products_public_contract.sql`. A validação por `pg_catalog` e pela API anônima confirmou:

- 36 colunas no contrato e zero campos proibidos;
- 7.519 produtos ativos, com 7.519 IDs distintos;
- `security_invoker=true` e `security_barrier=true`;
- `SELECT` apenas para `anon` e `authenticated`, sem grant para `public`;
- swatches limitados a `color_name`, `color_hex` e `image_url`;
- preço, estoque, fornecedor e variante rejeitados pela API.

O frontend, o catálogo e o sitemap passaram a usar a view mínima. A fase B é um endurecimento futuro e independente: inventariar todos os consumidores da view legada antes de qualquer revogação.

```sql
select
  dependent_ns.nspname as dependent_schema,
  dependent.relname as dependent_object,
  dependent.relkind
from pg_catalog.pg_depend d
join pg_catalog.pg_rewrite r on r.oid = d.objid
join pg_catalog.pg_class dependent on dependent.oid = r.ev_class
join pg_catalog.pg_namespace dependent_ns on dependent_ns.oid = dependent.relnamespace
where d.refobjid = 'public.v_products_public'::regclass
order by 1, 2;
```

Antes de retirar o acesso legado, será necessário substituir a origem de `v_site_products_public` por relações-base protegidas por RLS ou por outra fronteira de privilégio revisada. A view de transição usa `security_invoker` sobre a view legada; portanto, ainda depende da permissão de leitura nela.

O arquivo aprovado está versionado neste projeto novo, mas ainda não consta no histórico de migrations do repositório canônico `Promo_Gifts_V4`, responsável pelo restante do schema. Para evitar drift em restore/db-push, a incorporação ao SSOT canônico deve ser decidida pelo PO e feita sem reaplicar a migration já registrada no banco.

Na mesma transação do corte futuro, será preciso retirar `anon` da view legada, comprovar que a view mínima continua legível e só então efetivar o `commit`.

```sql
begin;
revoke select on public.v_products_public from anon;
-- smoke test autorizado de v_site_products_public aqui
-- commit somente se o teste passar; caso contrário: rollback;
```

Esse `REVOKE` não faz parte da migration aplicada. A auditoria por `pg_catalog` confirmou que executá-lo isoladamente quebraria a view de transição e poderia afetar consumidores ainda não inventariados.

## Semântica do catálogo

- Todo produto ativo aparece, independentemente do estoque informado pelo fornecedor.
- Cores e materiais usam correspondência `jsonb` e combinam alternativas da mesma dimensão com `OR`.
- Dimensões diferentes — busca, categoria, cor, material e recursos — combinam-se com `AND`.
- Categorias selecionadas incluem seus descendentes.
- O estado do filtro fica na URL para compartilhamento e recuperação.
