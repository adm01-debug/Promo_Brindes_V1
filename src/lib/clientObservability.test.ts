import { afterEach, describe, expect, it, vi } from 'vitest';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@vercel/analytics', () => ({ track }));

import { reportClientError } from './clientObservability';

describe('telemetria de erro da interface', () => {
  afterEach(() => track.mockReset());

  it('envia apenas classe do erro e pathname, nunca mensagem ou query pessoal', () => {
    window.history.replaceState({}, '', '/orcamento?email=cliente%40empresa.test');

    reportClientError(new TypeError('E-mail cliente@empresa.test não deve sair do navegador.'));

    expect(track).toHaveBeenCalledWith('frontend_error', {
      error_class: 'TypeError',
      route: '/orcamento',
    });
  });
});
