-- Defesa em profundidade para composições de kit persistidas como JSONB.
-- Protege rascunhos do cliente e links compartilhados mesmo se uma escrita
-- futura contornar as RPCs atuais. Aplicar somente em xlzmclcjdncjfdrjxclt.

create or replace function site_private.enforce_valid_kit_reference_set()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items jsonb := pg_catalog.to_jsonb(new) -> tg_argv[0];
  v_item jsonb;
  v_has_kit boolean;
  v_quantity integer;
  v_kit_quantity integer;
  v_units_per_kit integer;
begin
  if pg_catalog.jsonb_typeof(v_items) <> 'array'
    or pg_catalog.jsonb_array_length(v_items) not between 1 and 50 then
    raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
  end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(v_items)
  loop
    if pg_catalog.jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(v_item ->> 'q', '') !~ '^[1-9][0-9]{0,5}$'
      or (v_item ? 'v' and coalesce(v_item ->> 'v', '') !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$')
      or (v_item ? 'd' and v_item ->> 'd' <> 'alternative') then
      raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
    end if;

    v_quantity := (v_item ->> 'q')::integer;
    if v_quantity not between 1 and 999999 then
      raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
    end if;

    v_has_kit := v_item ?| array['k', 'kn', 'kq', 'ku'];
    if v_has_kit then
      if not (v_item ?& array['k', 'kn', 'kq', 'ku'])
        or coalesce(v_item ->> 'k', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or pg_catalog.length(pg_catalog.btrim(coalesce(v_item ->> 'kn', ''))) not between 1 and 100
        or coalesce(v_item ->> 'kq', '') !~ '^[1-9][0-9]{0,5}$'
        or coalesce(v_item ->> 'ku', '') !~ '^[1-9][0-9]{0,2}$' then
        raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
      end if;

      v_kit_quantity := (v_item ->> 'kq')::integer;
      v_units_per_kit := (v_item ->> 'ku')::integer;
      if v_kit_quantity not between 1 and 999999
        or v_units_per_kit not between 1 and 100
        or v_quantity <> v_kit_quantity * v_units_per_kit then
        raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
      end if;
    end if;
  end loop;

  -- O mesmo produto/variante não pode aparecer como avulso e como componente,
  -- nem ser duplicado entre dois kits diferentes.
  if (
    select pg_catalog.count(*) <> pg_catalog.count(distinct (
      value ->> 'id' || ':' || coalesce(value ->> 'v', '')
    ))
    from pg_catalog.jsonb_array_elements(v_items)
  ) then
    raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
  end if;

  -- Todo grupo precisa representar um kit real (dois ou mais componentes) e
  -- compartilhar nome e quantidade de kits em todos os seus componentes.
  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(v_items) item(value)
    where item.value ? 'k'
    group by item.value ->> 'k'
    having pg_catalog.count(*) < 2
      or pg_catalog.count(distinct pg_catalog.btrim(item.value ->> 'kn')) <> 1
      or pg_catalog.count(distinct item.value ->> 'kq') <> 1
  ) then
    raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
  end if;

  return new;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'invalid_kit_reference_set';
end;
$$;

revoke all on function site_private.enforce_valid_kit_reference_set() from public, anon, authenticated, service_role, site_api;

drop trigger if exists customer_selections_validate_kit_insert on site_private.customer_selections;
create trigger customer_selections_validate_kit_insert
before insert on site_private.customer_selections
for each row execute function site_private.enforce_valid_kit_reference_set('product_references');

drop trigger if exists customer_selections_validate_kit_update on site_private.customer_selections;
create trigger customer_selections_validate_kit_update
before update of product_references on site_private.customer_selections
for each row execute function site_private.enforce_valid_kit_reference_set('product_references');

drop trigger if exists shared_selections_validate_kit_insert on site_private.shared_selections;
create trigger shared_selections_validate_kit_insert
before insert on site_private.shared_selections
for each row execute function site_private.enforce_valid_kit_reference_set('items');

drop trigger if exists shared_selections_validate_kit_update on site_private.shared_selections;
create trigger shared_selections_validate_kit_update
before update of items on site_private.shared_selections
for each row execute function site_private.enforce_valid_kit_reference_set('items');

comment on function site_private.enforce_valid_kit_reference_set() is
  'Trigger privado que impede kits unitários, metadados divergentes, aritmética inválida e colisões de produto/variante em JSONB persistido.';
