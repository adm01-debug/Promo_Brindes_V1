/** Texto do aviso de conexao, num lugar so para o teste conferir. */
export const OFFLINE_NOTICE = 'Sem conexão. Algumas ações ficam indisponíveis até a internet voltar.';

/**
 * Estado de conexao lido diretamente do navegador.
 *
 * Funcao pura de proposito: recebe o objeto `navigator` (ou o que o teste quiser
 * injetar) e nao toca em `window` nem em rede. Sem isso o banner offline nao
 * teria como ser testado em jsdom, onde o navegador nunca fica offline.
 */
export function readConnectionStatus(nav: Pick<Navigator, 'onLine'> | undefined): boolean {
  return nav?.onLine === false;
}
