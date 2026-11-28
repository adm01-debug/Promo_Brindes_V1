import { useEffect, useRef, useState } from 'react';

import { ONLINE_NOTICE, OFFLINE_NOTICE } from '../lib/connection';
import { useConnectionStatus } from '../lib/useConnectionStatus';
import './OfflineBanner.css';

/**
 * FE 065 (NOVO-FE-13). Dois estados anunciados por aria-live="polite":
 * 1. offline enquanto o navegador tiver certeza da queda (avisa ANTES do cliente
 *    preencher o formulario e falhar no envio);
 * 2. "conexao restabelecida" por 4s, apenas quando houve queda real — quem abre
 *    o site ja online nunca ve aviso nenhum.
 */
export function OfflineBanner() {
  const status = useConnectionStatus();
  const [showRecovery, setShowRecovery] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (status === 'offline') {
      wasOffline.current = true;
      setShowRecovery(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setShowRecovery(true);
    const timer = window.setTimeout(() => setShowRecovery(false), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (status === 'offline') {
    return (
      <div className="offline-banner offline-banner--offline" role="status" aria-live="polite">
        <span aria-hidden="true">&#9888;</span>
        <span>{OFFLINE_NOTICE}</span>
      </div>
    );
  }

  if (!showRecovery) return null;
  return (
    <div className="offline-banner offline-banner--recovered" role="status" aria-live="polite">
      <span>{ONLINE_NOTICE}</span>
    </div>
  );
}