-- Contrato público mínimo do Site Promo Brindes.
-- Projeto-alvo canônico: doufsxqlfjyuvxuezpln
--
-- IMPORTANTE: revisar e aplicar com uma identidade administrativa autorizada.
-- Esta migração não revoga a view legada: esse corte exige primeiro o inventário de
-- dependências por pg_catalog descrito em docs/DATABASE_PUBLIC_CONTRACT.md.

create or replace view public.v_site_products_public
with (security_invoker = true, security_barrier = true)
as
select
  p.id,
  p.name,
  p.sku,
  p.slug,
  p.primary_image_url,
  p.primary_image_fallback_url,
  p.set_image_url,
  p.og_image_url,
  p.images,
  p.category_id,
  p.main_category_id,
  p.short_description,
  p.description,
  p.ai_title,
  p.ai_summary,
  p.ai_description,
  p.brand,
  p.min_quantity,
  p.is_new,
  p.is_featured,
  p.is_bestseller,
  p.is_kit,
  p.allows_personalization,
  p.has_commercial_packaging,
  p.has_gift_box,
  p.colors,
  p.materials,
  p.dimensions,
  p.width_cm,
  p.height_cm,
  p.length_cm,
  p.capacity_ml,
  p.weight_g,
  p.created_at,
  p.is_active,
  case
    when jsonb_typeof(coalesce(p.color_swatches::jsonb, '[]'::jsonb)) = 'array' then (
      select coalesce(
        jsonb_agg(
          jsonb_strip_nulls(
            jsonb_build_object(
              'color_name', swatch ->> 'color_name',
              'color_hex', swatch ->> 'color_hex',
              'image_url', swatch ->> 'image_url'
            )
          )
        ),
        '[]'::jsonb
      )
      from jsonb_array_elements(p.color_swatches::jsonb) as swatch
    )
    else '[]'::jsonb
  end as color_swatches
from public.v_products_public as p
where p.is_active is true;

comment on view public.v_site_products_public is
  'Contrato mínimo do catálogo cliente-final. Não expõe preço, estoque, fornecedor, URLs operacionais ou identificadores de variantes.';

revoke all on public.v_site_products_public from public;
revoke all on public.v_site_products_public from anon;
revoke all on public.v_site_products_public from authenticated;
grant select on public.v_site_products_public to anon, authenticated;

-- Validações pós-aplicação (somente leitura; executar separadamente):
--
-- select a.attname
-- from pg_catalog.pg_attribute a
-- where a.attrelid = 'public.v_site_products_public'::regclass
--   and a.attnum > 0
--   and not a.attisdropped
--   and a.attname = any (array[
--     'cost_price', 'sale_price', 'stock_quantity', 'supplier_id',
--     'supplier_product_url', 'variant_id'
--   ]);
-- Esperado: zero linhas.
--
-- select
--   pg_catalog.has_table_privilege('anon', 'public.v_site_products_public', 'select') as anon_can_read,
--   pg_catalog.has_table_privilege('authenticated', 'public.v_site_products_public', 'select') as authenticated_can_read;
-- Esperado: true / true.
