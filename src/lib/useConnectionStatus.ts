import { useEffect, useState } from 'react';

import { type ConnectionStatus, readConnectionStatus } from './connection';

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    readConnectionStatus(typeof navigator === 'undefined' ? undefined : navigator));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setStatus(readConnectionStatus(navigator));
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return status;
}