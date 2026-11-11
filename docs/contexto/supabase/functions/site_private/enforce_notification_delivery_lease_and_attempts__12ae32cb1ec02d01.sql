CREATE OR REPLACE FUNCTION site_private.enforce_notification_delivery_lease_and_attempts()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.status is not distinct from old.status and new.attempts is not distinct from old.attempts then
    return new;
  end if;

  if new.status = 'processing' and new.lease_token is null then
    raise exception using errcode = '22023',
      message = format('invalid_notification_delivery_transition: lease_token obrigatório ao entrar em processing (id=%s)', old.id);
  end if;

  if old.status = 'processing' and new.status <> 'processing' and new.lease_token is not null then
    raise exception using errcode = '22023',
      message = format('invalid_notification_delivery_transition: lease_token deve ser zerado ao sair de processing para %s (id=%s)', new.status, old.id);
  end if;

  if new.status = 'processing' then
    if new.attempts is distinct from old.attempts + 1 then
      raise exception using errcode = '22023',
        message = format('invalid_notification_delivery_transition: attempts deve incrementar em exatamente 1 ao entrar em processing (id=%s, old=%s, new=%s)', old.id, old.attempts, new.attempts);
    end if;
  elsif old.status = 'exhausted' and new.status = 'pending' then
    if new.attempts <> 0 then
      raise exception using errcode = '22023',
        message = format('invalid_notification_delivery_transition: reabertura de exhausted exige attempts = 0 (id=%s, new=%s)', old.id, new.attempts);
    end if;
  elsif new.attempts is distinct from old.attempts then
    raise exception using errcode = '22023',
      message = format('invalid_notification_delivery_transition: attempts só muda ao entrar em processing ou ao reabrir de exhausted (id=%s)', old.id);
  end if;

  return new;
end;
$function$
