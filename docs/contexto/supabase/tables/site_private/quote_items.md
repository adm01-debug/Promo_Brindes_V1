# site_private.quote_items

> Snapshot do produto no instante do briefing; sem FK entre projetos Supabase.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | sim |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `quote_request_id` | `uuid` | não |  |  |  |
| 3 | `position` | `smallint` | não |  |  |  |
| 4 | `source_product_id` | `text` | não |  |  |  |
| 5 | `item_key` | `text` | não |  |  |  |
| 6 | `product_slug` | `text` | não |  |  |  |
| 7 | `product_name_snapshot` | `text` | não |  |  |  |
| 8 | `sku_snapshot` | `text` | não |  |  |  |
| 9 | `image_url_snapshot` | `text` | sim |  |  |  |
| 10 | `quantity` | `integer` | não |  |  |  |
| 11 | `minimum_quantity_snapshot` | `integer` | não |  |  |  |
| 12 | `color_name_snapshot` | `text` | sim |  |  |  |
| 13 | `color_hex_snapshot` | `text` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `variant_id_snapshot` | `text` | sim |  |  | Identificador publicado da variante selecionada, preservado no retrato do briefing. |
| 16 | `decision_group_snapshot` | `text` | não | `'primary'::text` |  | Indica se a referência foi enviada como principal ou alternativa; preserva a intenção no retrato do briefing. |
| 17 | `kit_group_id` | `uuid` | sim |  |  | Identificador do kit configurado pelo cliente; agrupa componentes no snapshot do briefing. |
| 18 | `kit_name_snapshot` | `text` | sim |  |  |  |
| 19 | `kit_quantity_snapshot` | `integer` | sim |  |  | Quantidade de kits usada na aritmética do componente. |
| 20 | `units_per_kit_snapshot` | `integer` | sim |  |  | Unidades deste componente por kit; quantity deve ser o produto dos dois campos. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_items_check | CHECK | `CHECK (quantity >= minimum_quantity_snapshot)` |  |  | sim |
| quote_items_color_hex_snapshot_check | CHECK | `CHECK (color_hex_snapshot IS NULL OR length(color_hex_snapshot) <= 32)` |  |  | sim |
| quote_items_color_name_snapshot_check | CHECK | `CHECK (color_name_snapshot IS NULL OR length(color_name_snapshot) <= 120)` |  |  | sim |
| quote_items_decision_group_snapshot_check | CHECK | `CHECK (decision_group_snapshot = ANY (ARRAY['primary'::text, 'alternative'::text]))` |  |  | sim |
| quote_items_image_url_snapshot_check | CHECK | `CHECK (image_url_snapshot IS NULL OR length(image_url_snapshot) <= 1000)` |  |  | sim |
| quote_items_item_key_check | CHECK | `CHECK (length(item_key) >= 1 AND length(item_key) <= 220)` |  |  | sim |
| quote_items_kit_composition_check | CHECK | `CHECK (kit_group_id IS NULL AND kit_name_snapshot IS NULL AND kit_quantity_snapshot IS NULL AND units_per_kit_snapshot IS NULL OR kit_group_id IS NOT NULL AND kit_name_snapshot IS NOT NULL AND kit_quantity_snapshot IS NOT NULL AND units_per_kit_snapshot IS NOT NULL AND quantity = (kit_quantity_snapshot * units_per_kit_snapshot))` |  |  | sim |
| quote_items_kit_name_snapshot_check | CHECK | `CHECK (kit_name_snapshot IS NULL OR length(kit_name_snapshot) >= 1 AND length(kit_name_snapshot) <= 100)` |  |  | sim |
| quote_items_kit_quantity_snapshot_check | CHECK | `CHECK (kit_quantity_snapshot IS NULL OR kit_quantity_snapshot >= 1 AND kit_quantity_snapshot <= 999999)` |  |  | sim |
| quote_items_minimum_quantity_snapshot_check | CHECK | `CHECK (minimum_quantity_snapshot >= 1 AND minimum_quantity_snapshot <= 999999)` |  |  | sim |
| quote_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_items_position_check | CHECK | `CHECK ("position" >= 1 AND "position" <= 50)` |  |  | sim |
| quote_items_product_name_snapshot_check | CHECK | `CHECK (length(product_name_snapshot) >= 1 AND length(product_name_snapshot) <= 240)` |  |  | sim |
| quote_items_product_slug_check | CHECK | `CHECK (length(product_slug) >= 1 AND length(product_slug) <= 180)` |  |  | sim |
| quote_items_quantity_check | CHECK | `CHECK (quantity >= 1 AND quantity <= 999999)` |  |  | sim |
| quote_items_quote_request_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_request_id) REFERENCES site_private.quote_requests(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_items_quote_request_id_position_key | UNIQUE | `UNIQUE (quote_request_id, "position")` |  |  | sim |
| quote_items_sku_snapshot_check | CHECK | `CHECK (length(sku_snapshot) >= 1 AND length(sku_snapshot) <= 120)` |  |  | sim |
| quote_items_source_product_id_check | CHECK | `CHECK (length(source_product_id) >= 8 AND length(source_product_id) <= 100)` |  |  | sim |
| quote_items_units_per_kit_snapshot_check | CHECK | `CHECK (units_per_kit_snapshot IS NULL OR units_per_kit_snapshot >= 1 AND units_per_kit_snapshot <= 100)` |  |  | sim |
| quote_items_variant_id_snapshot_check | CHECK | `CHECK (variant_id_snapshot IS NULL OR variant_id_snapshot ~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$'::text)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| quote_items_kit_group_idx | btree | quote_request_id, kit_group_id, position | não | sim | `(kit_group_id IS NOT NULL)` | `CREATE INDEX quote_items_kit_group_idx ON site_private.quote_items USING btree (quote_request_id, kit_group_id, "position") WHERE (kit_group_id IS NOT NULL)` |
| quote_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_items_pkey ON site_private.quote_items USING btree (id)` |
| quote_items_product_id_idx | btree | source_product_id | não | sim |  | `CREATE INDEX quote_items_product_id_idx ON site_private.quote_items USING btree (source_product_id)` |
| quote_items_quote_request_id_position_key | btree | quote_request_id, position | sim | sim |  | `CREATE UNIQUE INDEX quote_items_quote_request_id_position_key ON site_private.quote_items USING btree (quote_request_id, "position")` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| quote_items_log_admin_write | AFTER | INSERT OR DELETE OR UPDATE | ROW | disabled | site_private.log_admin_write |


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, SELECT, UPDATE |
| site_api | INSERT, SELECT |
