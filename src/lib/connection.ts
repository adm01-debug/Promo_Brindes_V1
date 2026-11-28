/**
 * FE 065 (NOVO-FE-13): estado de conexao explicito.
 *
 * Antes desta versao o site so avisava o cliente DEPOIS de uma tentativa de envio
 * falhar ("Verifique sua conexao"). O cliente preenchia o formulario inteiro para
 * descobrir no fim que estava sem rede. A regra aqui e conservadora: so anunciamos
 * offline quando o navegador tem certeza (navigator.onLine === false). Sinal
 * ambiguo nunca vira alarme falso.
 */
export type ConnectionStatus = 'online' | 'offline';

export const OFFLINE_NOTICE =
  'Voc\u00ea est\u00e1 sem conex\u00e3o. O conte\u00fado j\u00e1 carregado continua dispon\u00edvel, mas envios e p\u00e1ginas novas v\u00e3o falhar at\u00e9 a internet voltar.';

export const ONLINE_NOTICE = 'Conex\u00e3o restabelecida.';

export function readConnectionStatus(nav: Pick<Navigator, 'onLine'> | undefined): ConnectionStatus {
  return nav?.onLine === false ? 'offline' : 'online';
}