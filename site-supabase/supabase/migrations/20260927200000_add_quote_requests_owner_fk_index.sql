-- Cobertura da FK quote_requests.customer_user_id incluindo registros spam.
-- O índice de histórico deliberadamente ignora spam por ser otimizado para a
-- Área do Cliente; esta estrutura menor cobre a integridade/referência sem
-- alterar dados, políticas ou o comportamento do histórico.
create index if not exists quote_requests_customer_owner_idx
  on site_private.quote_requests (customer_user_id)
  where customer_user_id is not null;

comment on index site_private.quote_requests_customer_owner_idx is
  'Cobertura de customer_user_id para FK, inclusive registros spam; separado do índice de histórico do portal.';
