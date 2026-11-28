import { useEffect, useState } from 'react';
import { OFFLINE_NOTICE, readConnectionStatus } from '../lib/connection';
import './OfflineBanner.css';

/**
 * Aviso explicito de conexao (NOVO-FE-13).
 *
 * Antes so existia a mensagem reativa de `lib/http.ts`, depois que a chamada ja
 * falhou. Aqui o estado aparece antes de o cliente tentar enviar e quebrar.
 * O retorno da conexao nao gera aviso proprio de proposito: quem confirma e o
 * proximo envio, e o banner nao ganha um temporizador para isso.
 */
const sync = () => readConnectionStatus(navigator);

export function OfflineBanner() {
  const [offline, setOffline] = useState(() =>
    readConnectionStatus(typeof navigator === 'undefined' ? undefined : navigator),
  );

  useEffect(() => {
    const handler = () => setOffline(sync());
    window.addEventListener('offline', handler);
    window.addEventListener('online', handler);
    return () => {
      window.removeEventListener('offline', handler);
      window.removeEventListener('online', handler);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      {OFFLINE_NOTICE}
    </div>
  );
}
