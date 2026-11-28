import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { OfflineBanner } from './OfflineBanner';
import { OFFLINE_NOTICE, readConnectionStatus } from '../lib/connection';

/** FE 065 (NOVO-FE-13): o aviso de conexao precisa aparecer e desaparecer sozinho. */
function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value });
}

describe('readConnectionStatus', () => {
  it('so declara offline quando o navegador tem certeza', () => {
    expect(readConnectionStatus({ onLine: false })).toBe(true);
    expect(readConnectionStatus({ onLine: true })).toBe(false);
    expect(readConnectionStatus(undefined)).toBe(false);
  });
});

describe('OfflineBanner', () => {
  afterEach(() => {
    setOnline(true);
  });

  it('nao mostra nada quando o cliente ja abre online', () => {
    setOnline(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('avisa antes do envio quando a conexao cai, e some quando ela volta', () => {
    setOnline(true);
    render(<OfflineBanner />);

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE_NOTICE);

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('mostra o estado da conexao no primeiro render sem esperar um evento', () => {
    setOnline(false);
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE_NOTICE);
  });
});