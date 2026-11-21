CREATE OR REPLACE FUNCTION public.delete_my_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_email text := site_private.current_titular_verified_email();
begin
  -- Trilha efemera: a linha some pelo cascade do auth.users dentro de
  -- erase_customer_data. A trilha persistente do pedido e o tombstone SHA-256
  -- gravado na mesma transacao. Registrar antes nao muda o resultado, mas deixa
  -- explicito no codigo que o direito foi exercido por autoexclusao (nao por
  -- apagamento administrativo).
  insert into site_private.subject_right_requests (subject_user_id, right_type)
  values (v_user_id, 'delete');

  return public.erase_customer_data(v_email, v_user_id);
end;
$function$
